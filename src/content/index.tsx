import { useEffect, useLayoutEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useUIStore } from '@/store/ui';
import { useConfigStore } from '@/store/config';
import { ThemeProvider } from '@/theme/ThemeProvider';
import FloatingButton from './FloatingButton';
import DrawerPanel from './DrawerPanel';
import styleText from './styles.css?inline';

const PANEL_WIDTH = 460;

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
      const width = Math.min(PANEL_WIDTH, window.innerWidth);
      host.style.setProperty('width', drawerVisible ? `${width}px` : '0px', 'important');

      if (!drawerVisible) return;
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
  }, [drawerVisible]);

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
        setDrawerVisible(true);
        window.dispatchEvent(new Event('clouddock:screenshot-upload'));
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [setDrawerVisible, setFloatingButtonEnabled, setFloatingButtonPosition, toggleDrawer]);

  const requestScreenshot = () => {
    setDrawerVisible(true);
    window.dispatchEvent(new Event('clouddock:screenshot-upload'));
  };

  return (
    <>
      {configReady && floatingButtonEnabled && (
        <FloatingButton onClick={toggleDrawer} onScreenshot={requestScreenshot} />
      )}
      <DrawerPanel visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
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
    width: '100%',
    height: '100%',
    pointerEvents: 'auto',
  });
  shadowRoot.appendChild(appContainer);

  createRoot(appContainer).render(
    <ThemeProvider
      slug="minimal"
      density="small"
      styleContainer={shadowRoot}
      popupContainer={appContainer}
      themeRoot={appContainer}
    >
      <App />
    </ThemeProvider>
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
