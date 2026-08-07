import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nProvider } from '@/i18n';
import { useConfigStore } from '@/store/config';
import { ThemeProvider } from '@/theme/ThemeProvider';
import DrawerPanel from '@/content/DrawerPanel';
import './styles.css';

/**
 * 抽屉运行在扩展自己源的 iframe 页面中，而不是注入宿主页面 DOM：
 * 宿主页面的 CSP（img-src / media-src）会拦截 <img>/<video> 加载云存储
 * 预签名地址，而扩展页面遵循扩展自身的 CSP，媒体加载不受宿主站点限制；
 * SDK 请求也改从扩展源发出，配合 host_permissions 不再依赖 Bucket 的 CORS 配置。
 * 与内容脚本之间通过 postMessage 通信（可见状态、关闭、截图上传）。
 */
function DrawerApp() {
  const [visible, setVisible] = useState(false);
  const { loadConfig } = useConfigStore();

  useEffect(() => {
    void loadConfig().catch((error) => console.error('Failed to load CloudDock config:', error));
  }, [loadConfig]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as {
        type?: string;
        visible?: boolean;
        active?: boolean;
        files?: File[];
        html?: string;
        uriList?: string;
      } | null;
      if (!data || typeof data.type !== 'string') return;

      if (data.type === 'clouddock:set-visible' && typeof data.visible === 'boolean') {
        setVisible(data.visible);
      }
      // 以下均转发为窗口事件，DrawerPanel 内部的监听保持组件树无关。
      if (data.type === 'clouddock:screenshot-upload') {
        window.dispatchEvent(new Event('clouddock:screenshot-upload'));
      }
      // 页面拖拽由内容脚本的透明浮层代收（跨源 iframe 收不到 drop），载荷转发进来。
      if (data.type === 'clouddock:external-drag') {
        window.dispatchEvent(
          new CustomEvent('clouddock:external-drag', { detail: Boolean(data.active) })
        );
      }
      if (data.type === 'clouddock:external-drop') {
        window.dispatchEvent(
          new CustomEvent('clouddock:external-drop', {
            detail: {
              files: data.files ?? [],
              html: data.html ?? '',
              uriList: data.uriList ?? '',
            },
          })
        );
      }
    };

    window.addEventListener('message', handleMessage);
    // 通知内容脚本抽屉已就绪，让其同步当前可见状态（iframe 加载晚于首次 postMessage 的场景）。
    window.parent.postMessage({ type: 'clouddock:drawer-ready' }, '*');
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <DrawerPanel
      visible={visible}
      onClose={() => window.parent.postMessage({ type: 'clouddock:close' }, '*')}
      onOverlayChange={(active) =>
        window.parent.postMessage({ type: 'clouddock:set-overlay', active }, '*')
      }
    />
  );
}

createRoot(document.getElementById('root')!).render(
  <I18nProvider>
    <ThemeProvider slug="modern-glass" density="middle">
      <DrawerApp />
    </ThemeProvider>
  </I18nProvider>
);
