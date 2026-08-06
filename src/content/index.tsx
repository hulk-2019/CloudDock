import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { useUIStore } from '@/store/ui';
import { useConfigStore } from '@/store/config';
import { ThemeProvider } from '@/theme/ThemeProvider';
import FloatingButton from './FloatingButton';
import DrawerPanel from './DrawerPanel';
import styleText from './styles.css?inline';

const DRAWER_WIDTH = 460;

function App() {
  const { drawerVisible, setDrawerVisible, toggleDrawer } = useUIStore();
  const { loadConfig } = useConfigStore();

  useEffect(() => {
    void loadConfig().catch((error) => console.error('Failed to load CloudDock config:', error));
  }, [loadConfig]);

  useEffect(() => {
    const body = document.body;
    const previousWidth = body.style.width;
    const previousMaxWidth = body.style.maxWidth;
    const previousTransition = body.style.transition;
    const previousBoxSizing = body.style.boxSizing;

    if (drawerVisible) {
      body.style.boxSizing = 'border-box';
      body.style.width = `calc(100% - ${DRAWER_WIDTH}px)`;
      body.style.maxWidth = `calc(100% - ${DRAWER_WIDTH}px)`;
      body.style.transition = 'width 0.3s ease, max-width 0.3s ease';
    } else {
      body.style.width = previousWidth;
      body.style.maxWidth = previousMaxWidth;
    }

    return () => {
      body.style.width = previousWidth;
      body.style.maxWidth = previousMaxWidth;
      body.style.transition = previousTransition;
      body.style.boxSizing = previousBoxSizing;
    };
  }, [drawerVisible]);

  useEffect(() => {
    const handleMessage = (message: { action?: string }) => {
      if (message.action === 'toggleDrawer') toggleDrawer();
      if (message.action === 'screenshotUpload') {
        setDrawerVisible(true);
        window.dispatchEvent(new Event('clouddock:screenshot-upload'));
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [setDrawerVisible, toggleDrawer]);

  const requestScreenshot = () => {
    setDrawerVisible(true);
    window.dispatchEvent(new Event('clouddock:screenshot-upload'));
  };

  return (
    <>
      <FloatingButton onClick={toggleDrawer} onScreenshot={requestScreenshot} />
      <DrawerPanel visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </>
  );
}

function init() {
  if (document.getElementById('clouddock-root')) return;

  const host = document.createElement('div');
  host.id = 'clouddock-root';
  Object.assign(host.style, {
    position: 'fixed',
    inset: '0',
    width: '100vw',
    height: '100vh',
    zIndex: '2147483647',
    pointerEvents: 'none',
  });
  document.body.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = styleText;
  shadowRoot.appendChild(style);

  const appContainer = document.createElement('div');
  appContainer.id = 'clouddock-app';
  appContainer.style.pointerEvents = 'auto';
  shadowRoot.appendChild(appContainer);

  createRoot(appContainer).render(
    <ThemeProvider
      slug="enterprise-dashboard"
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
