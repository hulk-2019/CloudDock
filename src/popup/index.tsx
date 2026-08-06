import React from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, Cloud, FolderOpen, HelpCircle } from 'lucide-react';
import './styles.css';

const Popup: React.FC = () => {
  const toggleDrawer = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'toggleDrawer' });
      window.close();
    }
  };

  const openHelp = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <main className="popup-container">
      <header className="popup-header">
        <div className="popup-logo" aria-hidden="true">
          <Cloud size={23} />
        </div>
        <div>
          <h1>CloudDock</h1>
          <p>云端存储，随手可得</p>
        </div>
      </header>

      <section className="popup-actions" aria-label="CloudDock 操作">
        <button className="action-button action-button-primary" onClick={toggleDrawer}>
          <span className="action-icon">
            <FolderOpen size={20} aria-hidden="true" />
          </span>
          <span className="action-copy">
            <strong>打开云盘</strong>
            <small>浏览、上传和管理云端文件</small>
          </span>
          <ArrowRight size={17} aria-hidden="true" />
        </button>

        <button className="action-button" onClick={openHelp}>
          <span className="action-icon">
            <HelpCircle size={20} aria-hidden="true" />
          </span>
          <span className="action-copy">
            <strong>使用帮助</strong>
            <small>查看配置步骤与快捷操作</small>
          </span>
          <ArrowRight size={17} aria-hidden="true" />
        </button>
      </section>

      <footer className="popup-footer">
        <span className="status-dot" aria-hidden="true" />
        CloudDock v{chrome.runtime.getManifest().version}
      </footer>
    </main>
  );
};

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<Popup />);
}
