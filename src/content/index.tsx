import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import FloatingButton from './FloatingButton';
import DrawerPanel from './DrawerPanel';
import { useUIStore } from '@/store/ui';
import { useConfigStore } from '@/store/config';
// 以文本形式导入样式，注入到 Shadow DOM 内部（否则会被 Shadow DOM 隔离）
import styleText from './styles.css?inline';

/**
 * Content Script 主入口
 * 注入到每个网页中
 */
function App() {
  const { drawerVisible, toggleDrawer } = useUIStore();
  const { loadConfig } = useConfigStore();

  // 初始化：加载配置
  useEffect(() => {
    console.log('CloudDock App mounted, drawerVisible:', drawerVisible);
    loadConfig().then(() => {
      console.log('Config loaded');
    }).catch(err => {
      console.error('Failed to load config:', err);
    });
  }, []);

  useEffect(() => {
    console.log('drawerVisible changed to:', drawerVisible);
  }, [drawerVisible]);

  // 抽屉打开时，挤压页面内容
  useEffect(() => {
    const drawerWidth = 450; // 抽屉宽度（px）

    if (drawerVisible) {
      // 方案：同时设置 margin-right 和缩小宽度
      const hostBody = document.body;
      const hostHtml = document.documentElement;

      hostBody.style.marginRight = `${drawerWidth}px`;
      hostBody.style.transition = 'margin-right 0.3s ease';

      // 同时给 html 和 body 设置，确保生效
      hostHtml.style.marginRight = `${drawerWidth}px`;
      hostHtml.style.transition = 'margin-right 0.3s ease';

      console.log('Page squeezed, margin-right:', hostBody.style.marginRight);
    } else {
      // 恢复页面
      const hostBody = document.body;
      const hostHtml = document.documentElement;

      hostBody.style.marginRight = '0';
      hostHtml.style.marginRight = '0';
      console.log('Page restored');
    }

    // 清理函数
    return () => {
      document.body.style.marginRight = '0';
      document.documentElement.style.marginRight = '0';
    };
  }, [drawerVisible]);

  // 监听来自 background 的消息
  useEffect(() => {
    const handleMessage = (message: any) => {
      console.log('Content script received message:', message);
      if (message.action === 'toggleDrawer') {
        console.log('Toggling drawer...');
        toggleDrawer();
      } else if (message.action === 'screenshotUpload') {
        // 触发截图上传
        // 这里会在 DrawerPanel 中处理
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [toggleDrawer]);

  return (
    <>
      <FloatingButton onClick={toggleDrawer} />
      <DrawerPanel visible={drawerVisible} onClose={() => toggleDrawer()} />
    </>
  );
}

// 创建容器并挂载
function init() {
  // 检查是否已经注入
  if (document.getElementById('clouddock-root')) {
    return;
  }

  // 创建 Shadow DOM 容器，避免样式冲突
  const container = document.createElement('div');
  container.id = 'clouddock-root';
  document.body.appendChild(container);

  // 使用 Shadow DOM
  const shadowRoot = container.attachShadow({ mode: 'open' });

  // 在 Shadow DOM 内部注入样式
  const style = document.createElement('style');
  style.textContent = styleText;
  shadowRoot.appendChild(style);

  // 创建 React 根容器
  const appContainer = document.createElement('div');
  shadowRoot.appendChild(appContainer);

  // 挂载 React 应用
  const root = createRoot(appContainer);
  root.render(<App />);

  console.log('CloudDock content script loaded! 🚀');
}

// 等待 DOM 加载完成
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
