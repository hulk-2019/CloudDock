import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  CheckCircle2,
  Cloud,
  Command,
  FolderOpen,
  HelpCircle,
  Image,
  Keyboard,
  LockKeyhole,
  MousePointer2,
  Settings2,
  Upload,
} from 'lucide-react';
import './styles.css';

const providers = ['阿里云 OSS', '腾讯云 COS', '七牛云 Kodo', 'AWS S3'];

const Help: React.FC = () => {
  return (
    <main className="help-page">
      <section className="help-hero" aria-labelledby="help-title">
        <div className="brand-mark" aria-hidden="true">
          <Cloud size={32} />
        </div>
        <div>
          <span className="eyebrow">CloudDock 使用帮助</span>
          <h1 id="help-title">让云端文件触手可及</h1>
          <p>在任意网页打开 CloudDock，完成云存储配置后即可浏览、上传和管理文件。</p>
        </div>
      </section>

      <section className="help-grid" aria-label="快速开始">
        <article className="help-card help-card-primary">
          <div className="card-heading">
            <span className="step-number">01</span>
            <div>
              <h2>添加云存储配置</h2>
              <p>这是首次使用 CloudDock 的第一步。</p>
            </div>
          </div>
          <ol className="step-list">
            <li>
              <Settings2 size={18} aria-hidden="true" />
              <span>在网页中打开 CloudDock，点击“前往设置”。</span>
            </li>
            <li>
              <LockKeyhole size={18} aria-hidden="true" />
              <span>填写云厂商、Region、Bucket 与 Access Key。</span>
            </li>
            <li>
              <CheckCircle2 size={18} aria-hidden="true" />
              <span>保存后返回文件页，即可开始使用。</span>
            </li>
          </ol>
        </article>

        <article className="help-card">
          <div className="card-heading">
            <span className="step-number">02</span>
            <div>
              <h2>上传与管理文件</h2>
              <p>选择最顺手的方式操作。</p>
            </div>
          </div>
          <ul className="feature-list">
            <li>
              <Upload size={19} aria-hidden="true" />
              <div>
                <strong>拖拽上传</strong>
                <span>将本地文件或网页图片拖入文件区域。</span>
              </div>
            </li>
            <li>
              <Image size={19} aria-hidden="true" />
              <div>
                <strong>粘贴图片</strong>
                <span>复制图片后，在面板中按 Ctrl / Command + V。</span>
              </div>
            </li>
            <li>
              <FolderOpen size={19} aria-hidden="true" />
              <div>
                <strong>文件管理</strong>
                <span>新建文件夹、复制链接、移动或删除文件。</span>
              </div>
            </li>
          </ul>
        </article>
      </section>

      <section className="help-section">
        <div className="section-title">
          <Keyboard size={20} aria-hidden="true" />
          <div>
            <h2>快捷操作</h2>
            <p>无需离开当前网页。</p>
          </div>
        </div>
        <div className="shortcut-grid">
          <div className="shortcut-item">
            <MousePointer2 size={20} aria-hidden="true" />
            <div>
              <strong>悬浮按钮</strong>
              <span>单击打开云盘，拖动可调整位置。</span>
            </div>
          </div>
          <div className="shortcut-item">
            <Command size={20} aria-hidden="true" />
            <div>
              <strong>打开 / 关闭面板</strong>
              <kbd>Ctrl / ⌘</kbd>
              <span> + </span>
              <kbd>Shift</kbd>
              <span> + </span>
              <kbd>D</kbd>
            </div>
          </div>
          <div className="shortcut-item">
            <Image size={20} aria-hidden="true" />
            <div>
              <strong>截图上传</strong>
              <kbd>Ctrl / ⌘</kbd>
              <span> + </span>
              <kbd>Shift</kbd>
              <span> + </span>
              <kbd>U</kbd>
            </div>
          </div>
        </div>
      </section>

      <section className="help-section provider-section">
        <div className="section-title">
          <Cloud size={20} aria-hidden="true" />
          <div>
            <h2>支持的云存储</h2>
            <p>可以添加多个配置并随时切换。</p>
          </div>
        </div>
        <div className="provider-list">
          {providers.map((provider) => (
            <span key={provider}>{provider}</span>
          ))}
        </div>
      </section>

      <aside className="security-note">
        <HelpCircle size={20} aria-hidden="true" />
        <div>
          <strong>配置提示</strong>
          <p>
            建议使用仅拥有目标 Bucket 所需权限的访问密钥。若连接失败，请检查
            Region、Bucket、密钥权限及云服务的跨域配置。
          </p>
        </div>
      </aside>
    </main>
  );
};

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<Help />);
}
