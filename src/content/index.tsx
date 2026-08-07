import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nProvider } from '@/i18n';
import { useUIStore } from '@/store/ui';
import { useConfigStore } from '@/store/config';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { DRAWER_PANEL_WIDTH } from '@/constants/layout';
import FloatingButton from './FloatingButton';
import styleText from './styles.css?inline';

const DRAWER_PAGE_URL = chrome.runtime.getURL('src/preview/index.html');
const EXTENSION_ORIGIN = new URL(DRAWER_PAGE_URL).origin;

interface InlineStyleSnapshot {
  name: string;
  value: string;
  priority: string;
}

function captureInlineStyles(element: HTMLElement, names: string[]): InlineStyleSnapshot[] {
  return names.map((name) => ({
    name,
    value: element.style.getPropertyValue(name),
    priority: element.style.getPropertyPriority(name),
  }));
}

function restoreInlineStyles(element: HTMLElement, snapshots: InlineStyleSnapshot[]) {
  snapshots.forEach(({ name, value, priority }) => {
    if (value) element.style.setProperty(name, value, priority);
    else element.style.removeProperty(name);
  });
}

function App() {
  const { drawerVisible, setDrawerVisible, toggleDrawer } = useUIStore();
  const { loadConfig, floatingButtonEnabled, setFloatingButtonEnabled, setFloatingButtonPosition } =
    useConfigStore();
  const [configReady, setConfigReady] = useState(false);
  const [drawerReady, setDrawerReady] = useState(false);
  // 媒体预览打开时把 iframe 扩展到整个视口，Lightbox 才能全屏铺开。
  const [overlayActive, setOverlayActive] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 抽屉运行在扩展源的 iframe 页面里（见 src/preview），绕开宿主页面 CSP 对
  // <img>/<video> 加载云存储地址的拦截；内容脚本与其通过 postMessage 通信。
  const postToDrawer = useCallback((message: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(message, EXTENSION_ORIGIN);
  }, []);

  useEffect(() => {
    void loadConfig()
      .catch((error) => console.error('Failed to load CloudDock config:', error))
      .finally(() => setConfigReady(true));
  }, [loadConfig]);

  useLayoutEffect(() => {
    const host = document.getElementById('clouddock-root');
    const body = document.body;
    const documentElement = document.documentElement;
    if (!host) return;

    const bodyStyles = captureInlineStyles(body, ['box-sizing', 'width', 'min-width', 'max-width']);
    const documentStyles = captureInlineStyles(documentElement, ['overflow-x']);

    const updatePanelLayout = () => {
      const width = Math.min(DRAWER_PANEL_WIDTH, window.innerWidth);
      const hostWidth = drawerVisible ? (overlayActive ? '100vw' : `${width}px`) : '0px';
      host.style.setProperty('width', hostWidth, 'important');

      if (!drawerVisible) return;
      // 预览全屏只扩展浮层容器，页面内容维持按面板宽度挤压，避免布局来回抖动。
      body.style.setProperty('box-sizing', 'border-box', 'important');
      body.style.setProperty('width', `calc(100% - ${width}px)`, 'important');
      body.style.setProperty('min-width', '0px', 'important');
      body.style.setProperty('max-width', `calc(100% - ${width}px)`, 'important');
      documentElement.style.setProperty('overflow-x', 'clip', 'important');
    };

    updatePanelLayout();
    window.addEventListener('resize', updatePanelLayout);
    return () => {
      window.removeEventListener('resize', updatePanelLayout);
      host.style.setProperty('width', '0px', 'important');
      restoreInlineStyles(body, bodyStyles);
      restoreInlineStyles(documentElement, documentStyles);
    };
  }, [drawerVisible, overlayActive]);

  // 同步抽屉可见状态；打开时聚焦 iframe，让粘贴上传（paste 事件）落在抽屉文档里。
  useEffect(() => {
    if (!drawerReady) return;
    postToDrawer({ type: 'clouddock:set-visible', visible: drawerVisible });
    if (drawerVisible) iframeRef.current?.focus();
  }, [drawerReady, drawerVisible, postToDrawer]);

  // 接收抽屉页发来的消息（就绪通知、关闭请求、预览全屏）。
  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as { type?: string; active?: boolean } | null;
      if (data?.type === 'clouddock:drawer-ready') setDrawerReady(true);
      if (data?.type === 'clouddock:close') setDrawerVisible(false);
      if (data?.type === 'clouddock:set-overlay') setOverlayActive(Boolean(data.active));
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [setDrawerVisible]);

  const requestScreenshot = useCallback(() => {
    setDrawerVisible(true);
    postToDrawer({ type: 'clouddock:screenshot-upload' });
  }, [postToDrawer, setDrawerVisible]);

  // Chromium 禁止同一标签页内向跨源 iframe 拖放（crbug.com/251718），页面拖拽
  // 的 drop 永远到不了抽屉 iframe。方案：外部拖拽进行时在 iframe 上盖一层透明
  // 接收层（属于宿主文档，不受限制），代收 drop 后把载荷 postMessage 进抽屉。
  const [externalDragDepth, setExternalDragDepth] = useState(0);
  const externalDragActive = externalDragDepth > 0;

  useEffect(() => {
    if (!drawerVisible) {
      setExternalDragDepth(0);
      return;
    }

    const isExternalDrag = (event: globalThis.DragEvent) => {
      const types = event.dataTransfer?.types;
      if (!types) return false;
      return (
        types.includes('Files') || types.includes('text/html') || types.includes('text/uri-list')
      );
    };

    const handleDragEnter = (event: globalThis.DragEvent) => {
      if (isExternalDrag(event)) setExternalDragDepth((depth) => depth + 1);
    };
    const handleDragLeave = (event: globalThis.DragEvent) => {
      if (isExternalDrag(event)) setExternalDragDepth((depth) => Math.max(0, depth - 1));
    };
    // 延迟清零：本监听在捕获阶段先于接收层触发，若同步清零，React 可能在
    // 事件派发中途卸载接收层，导致其 drop 处理丢失（提示常显、上传不触发）。
    const resetDrag = () => {
      setTimeout(() => setExternalDragDepth(0), 0);
    };

    document.addEventListener('dragenter', handleDragEnter, true);
    document.addEventListener('dragleave', handleDragLeave, true);
    document.addEventListener('drop', resetDrag, true);
    document.addEventListener('dragend', resetDrag, true);
    return () => {
      document.removeEventListener('dragenter', handleDragEnter, true);
      document.removeEventListener('dragleave', handleDragLeave, true);
      document.removeEventListener('drop', resetDrag, true);
      document.removeEventListener('dragend', resetDrag, true);
    };
  }, [drawerVisible]);

  const notifyDrawerDragOver = useCallback(
    (active: boolean) => postToDrawer({ type: 'clouddock:external-drag', active }),
    [postToDrawer]
  );

  // 接收层用原生监听器：事件路径在派发开始时冻结，即使浮层在派发中途被卸载，
  // 已挂在元素上的监听仍会执行；React 合成事件挂在根容器上，没有这个保证。
  const overlayRef = useRef<HTMLDivElement>(null);
  const overlayMounted = drawerVisible && externalDragActive;

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const handleDragEnter = (event: globalThis.DragEvent) => {
      event.preventDefault();
      notifyDrawerDragOver(true);
    };
    const handleDragOver = (event: globalThis.DragEvent) => {
      event.preventDefault();
    };
    const handleDragLeave = () => notifyDrawerDragOver(false);
    const handleDrop = (event: globalThis.DragEvent) => {
      event.preventDefault();
      setExternalDragDepth(0);
      notifyDrawerDragOver(false);
      const transfer = event.dataTransfer;
      if (!transfer) return;
      // File 对象支持结构化克隆，postMessage 传递的是句柄而非字节拷贝。
      postToDrawer({
        type: 'clouddock:external-drop',
        files: Array.from(transfer.files),
        html: transfer.getData('text/html'),
        uriList: transfer.getData('text/uri-list'),
      });
    };

    overlay.addEventListener('dragenter', handleDragEnter);
    overlay.addEventListener('dragover', handleDragOver);
    overlay.addEventListener('dragleave', handleDragLeave);
    overlay.addEventListener('drop', handleDrop);
    return () => {
      overlay.removeEventListener('dragenter', handleDragEnter);
      overlay.removeEventListener('dragover', handleDragOver);
      overlay.removeEventListener('dragleave', handleDragLeave);
      overlay.removeEventListener('drop', handleDrop);
    };
  }, [notifyDrawerDragOver, overlayMounted, postToDrawer]);

  useEffect(() => {
    const handleMessage = (message: { action?: string; enabled?: boolean }) => {
      if (message.action === 'toggleDrawer') toggleDrawer();
      if (message.action === 'setFloatingButtonEnabled' && typeof message.enabled === 'boolean') {
        setFloatingButtonEnabled(message.enabled);
      }
      if (message.action === 'resetFloatingButtonPosition') {
        setFloatingButtonPosition(null);
      }
      if (message.action === 'screenshotUpload') {
        requestScreenshot();
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [requestScreenshot, setFloatingButtonEnabled, setFloatingButtonPosition, toggleDrawer]);

  return (
    <>
      {configReady && floatingButtonEnabled && (
        <FloatingButton onClick={toggleDrawer} onScreenshot={requestScreenshot} />
      )}
      <iframe
        ref={iframeRef}
        src={DRAWER_PAGE_URL}
        title="CloudDock"
        allow="clipboard-read; clipboard-write"
        style={{
          display: 'block',
          width: '100%',
          // antd App 组件包了一层无高度的 div，height: 100% 会断链，直接取视口高度。
          height: '100vh',
          border: 'none',
          background: 'transparent',
          colorScheme: 'normal',
        }}
      />
      {overlayMounted && (
        <div ref={overlayRef} style={{ position: 'absolute', inset: 0, zIndex: 1 }} />
      )}
    </>
  );
}

function setImportantStyle(element: HTMLElement, name: string, value: string) {
  element.style.setProperty(name, value, 'important');
}

function init() {
  if (document.getElementById('clouddock-root')) return;

  const host = document.createElement('div');
  host.id = 'clouddock-root';
  setImportantStyle(host, 'position', 'fixed');
  setImportantStyle(host, 'inset', '0 0 0 auto');
  setImportantStyle(host, 'display', 'block');
  setImportantStyle(host, 'width', '0px');
  setImportantStyle(host, 'height', '100vh');
  setImportantStyle(host, 'min-width', '0px');
  setImportantStyle(host, 'max-width', '100vw');
  setImportantStyle(host, 'margin', '0');
  setImportantStyle(host, 'padding', '0');
  setImportantStyle(host, 'border', '0');
  setImportantStyle(host, 'transform', 'none');
  setImportantStyle(host, 'zoom', '1');
  setImportantStyle(host, 'z-index', '2147483647');
  setImportantStyle(host, 'pointer-events', 'none');
  setImportantStyle(host, 'overflow', 'visible');
  setImportantStyle(host, 'isolation', 'isolate');
  // 挂在 html 而不是 body 下，避免网站对 body 设置 transform / zoom / overflow 时
  // 改变 fixed 元素的包含块或裁剪插件。
  document.documentElement.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = styleText;
  shadowRoot.appendChild(style);

  const appContainer = document.createElement('div');
  appContainer.id = 'clouddock-app';
  Object.assign(appContainer.style, {
    // 拖拽代收浮层以本容器为定位边界，只覆盖抽屉区域而不是整个页面。
    position: 'relative',
    width: '100%',
    height: '100%',
    pointerEvents: 'auto',
  });
  shadowRoot.appendChild(appContainer);

  createRoot(appContainer).render(
    <I18nProvider>
      <ThemeProvider
        slug="modern-glass"
        density="middle"
        styleContainer={shadowRoot}
        popupContainer={appContainer}
        themeRoot={appContainer}
      >
        <App />
      </ThemeProvider>
    </I18nProvider>
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
