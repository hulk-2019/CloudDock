import { createRoot } from 'react-dom/client';
import { Button, Card, Tag } from 'antd';
import { ArrowRight, Cloud, FolderOpen, HelpCircle } from 'lucide-react';
import { ThemeProvider } from '@/theme/ThemeProvider';
import './styles.css';

function Popup() {
  const toggleDrawer = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      await chrome.tabs.sendMessage(tab.id, { action: 'toggleDrawer' });
      window.close();
    }
  };

  return (
    <main className="w-[360px] bg-bg p-5 font-sans text-content">
      <header className="mb-5 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded border border-border bg-surface text-primary shadow">
          <Cloud size={24} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="m-0 text-xl font-bold tracking-tight">CloudDock</h1>
            <Tag color="blue" bordered={false}>v{chrome.runtime.getManifest().version}</Tag>
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
    <ThemeProvider slug="enterprise-dashboard" density="middle" popupContainer={container}>
      <Popup />
    </ThemeProvider>
  );
}
