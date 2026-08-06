import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { App, Button, Card, Switch, Tag } from 'antd';
import {
  ArrowRight,
  Cloud,
  FolderOpen,
  HelpCircle,
  LocateFixed,
  MousePointer2,
} from 'lucide-react';
import { useConfigStore } from '@/store/config';
import { ThemeProvider } from '@/theme/ThemeProvider';
import './styles.css';

async function sendToActiveTab(message: Record<string, unknown>) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) await chrome.tabs.sendMessage(tab.id, message);
  } catch {
    // chrome://、扩展商店等页面不允许注入内容脚本；设置仍会保存并在下次加载时生效。
  }
}

function Popup() {
  const { message } = App.useApp();
  const {
    loadConfig,
    floatingButtonEnabled,
    floatingButtonPosition,
    setFloatingButtonEnabled,
    setFloatingButtonPosition,
  } = useConfigStore();
  const [settingsReady, setSettingsReady] = useState(false);

  useEffect(() => {
    void loadConfig()
      .catch((error) => console.error('Failed to load CloudDock config:', error))
      .finally(() => setSettingsReady(true));
  }, [loadConfig]);

  const toggleDrawer = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      await chrome.tabs.sendMessage(tab.id, { action: 'toggleDrawer' });
      window.close();
    }
  };

  const handleFloatingButtonChange = (enabled: boolean) => {
    setFloatingButtonEnabled(enabled);
    void sendToActiveTab({ action: 'setFloatingButtonEnabled', enabled });
  };

  const resetFloatingButtonPosition = () => {
    setFloatingButtonPosition(null);
    void sendToActiveTab({ action: 'resetFloatingButtonPosition' });
    message.success('悬浮按钮已恢复到右下角');
  };

  return (
    <main className="w-[360px] min-h-screen bg-bg backdrop-blur p-5 font-sans text-content">
      <header className="mb-5 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded border border-border bg-surface text-primary shadow">
          <Cloud size={24} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="m-0 text-xl font-bold tracking-tight">CloudDock</h1>
            <Tag color="blue" bordered={false}>
              v{chrome.runtime.getManifest().version}
            </Tag>
          </div>
          <p className="m-0 text-sm text-content-secondary">云端存储，随手可得</p>
        </div>
      </header>

      <section className="space-y-3" aria-label="CloudDock 操作">
        <Card className="border-border bg-surface shadow" styles={{ body: { padding: 12 } }}>
          <Button
            type="primary"
            size="large"
            block
            className="h-auto min-h-16 justify-start shadow active:translate-y-px active:shadow-none"
            icon={<FolderOpen size={20} strokeWidth={2} />}
            onClick={toggleDrawer}
          >
            <span className="flex min-w-0 flex-1 flex-col items-start px-1 text-left">
              <strong>打开云盘</strong>
              <small className="font-normal opacity-80">浏览、上传和管理云端文件</small>
            </span>
            <ArrowRight size={17} strokeWidth={2} />
          </Button>
        </Card>

        <Card
          className="border-border bg-surface shadow"
          title={<span className="text-sm text-content">悬浮按钮</span>}
          styles={{ body: { padding: 12 } }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-border bg-bg text-primary">
                <MousePointer2 size={17} strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-content">在网页中显示</div>
                <p className="m-0 mt-1 text-xs text-content-secondary">关闭后仍可从扩展图标打开</p>
              </div>
            </div>
            <Switch
              aria-label="在网页中显示悬浮按钮"
              loading={!settingsReady}
              disabled={!settingsReady}
              checked={settingsReady && floatingButtonEnabled}
              onChange={handleFloatingButtonChange}
            />
          </div>
          <div className="mt-3 border-t border-border pt-3">
            <Button
              type="text"
              size="small"
              disabled={!settingsReady || !floatingButtonPosition}
              icon={<LocateFixed size={15} strokeWidth={1.8} />}
              onClick={resetFloatingButtonPosition}
            >
              恢复默认位置
            </Button>
          </div>
        </Card>

        <Card className="border-border bg-surface shadow" styles={{ body: { padding: 12 } }}>
          <Button
            size="large"
            block
            className="h-auto min-h-16 justify-start border-border bg-surface text-content shadow active:translate-y-px active:shadow-none"
            icon={<HelpCircle size={20} strokeWidth={2} className="text-primary" />}
            onClick={() => chrome.runtime.openOptionsPage()}
          >
            <span className="flex min-w-0 flex-1 flex-col items-start px-1 text-left">
              <strong>使用帮助</strong>
              <small className="font-normal text-content-secondary">查看配置步骤与快捷操作</small>
            </span>
            <ArrowRight size={17} strokeWidth={2} />
          </Button>
        </Card>
      </section>

      <footer className="mt-5 flex items-center justify-center gap-2 text-xs text-content-secondary">
        <span className="h-2 w-2 rounded-full bg-success shadow" aria-hidden="true" />
        扩展已就绪
      </footer>
    </main>
  );
}

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <ThemeProvider slug="modern-glass" density="middle" popupContainer={container}>
      <Popup />
    </ThemeProvider>
  );
}
