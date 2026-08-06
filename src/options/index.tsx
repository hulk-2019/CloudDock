import { createRoot } from 'react-dom/client';
import { Alert, Card, Tag } from 'antd';
import {
  CheckCircle2,
  Cloud,
  Command,
  FolderOpen,
  Image,
  Keyboard,
  LockKeyhole,
  MousePointer2,
  SlidersHorizontal,
  Upload,
} from 'lucide-react';
import { ThemeProvider } from '@/theme/ThemeProvider';
import './styles.css';

const providers = ['阿里云 OSS', '腾讯云 COS', '七牛云 Kodo', 'AWS S3'];
const iconProps = { size: 19, strokeWidth: 2 } as const;

function StepItem({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 rounded border border-border bg-bg p-3 text-sm leading-6 text-content">
      <span className="mt-0.5 text-primary">{icon}</span>
      <span>{children}</span>
    </li>
  );
}

function ShortcutCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card className="h-full border-border bg-surface shadow" styles={{ body: { padding: 18 } }}>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded border border-border bg-bg text-primary shadow">
        {icon}
      </div>
      <h3 className="mb-2 mt-0 text-base font-semibold text-content">{title}</h3>
      <div className="text-sm leading-6 text-content-secondary">{children}</div>
    </Card>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border border-border bg-bg px-2 py-1 font-mono text-xs text-content shadow">{children}</kbd>;
}

function Help() {
  return (
    <main className="min-h-screen bg-bg px-5 py-8 font-sans text-content sm:px-8 lg:px-12">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="flex flex-col gap-5 rounded border border-border bg-surface p-6 shadow sm:flex-row sm:items-center sm:p-8" aria-labelledby="help-title">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded border border-border bg-bg text-primary shadow">
            <Cloud size={36} strokeWidth={2} />
          </span>
          <div>
            <Tag color="blue" bordered={false}>CloudDock 使用帮助</Tag>
            <h1 id="help-title" className="mb-2 mt-3 text-3xl font-bold tracking-tight text-content sm:text-4xl">
              让云端文件触手可及
            </h1>
            <p className="m-0 max-w-2xl text-base leading-7 text-content-secondary">
              在任意网页打开 CloudDock，选择或添加云存储配置后，即可浏览、上传和管理文件。
            </p>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2" aria-label="快速开始">
          <Card
            className="border-border bg-surface shadow"
            title={
              <div className="flex items-center gap-3 py-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-bg font-bold text-primary shadow">01</span>
                <div>
                  <h2 className="m-0 text-lg text-content">添加云存储配置</h2>
                  <p className="m-0 text-xs font-normal text-content-secondary">首次使用的第一步</p>
                </div>
              </div>
            }
          >
            <ol className="m-0 space-y-3 p-0 [list-style:none]">
              <StepItem icon={<SlidersHorizontal {...iconProps} />}>在网页中打开 CloudDock，点击“前往配置”。</StepItem>
              <StepItem icon={<LockKeyhole {...iconProps} />}>填写云厂商、Region、Bucket 与访问密钥。</StepItem>
              <StepItem icon={<CheckCircle2 {...iconProps} />}>保存并选择配置，文件列表会自动加载。</StepItem>
            </ol>
          </Card>

          <Card
            className="border-border bg-surface shadow"
            title={
              <div className="flex items-center gap-3 py-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-bg font-bold text-primary shadow">02</span>
                <div>
                  <h2 className="m-0 text-lg text-content">上传与管理文件</h2>
                  <p className="m-0 text-xs font-normal text-content-secondary">选择最顺手的方式操作</p>
                </div>
              </div>
            }
          >
            <ul className="m-0 space-y-3 p-0 [list-style:none]">
              <StepItem icon={<Upload {...iconProps} />}>将本地文件或网页图片直接拖入文件区域。</StepItem>
              <StepItem icon={<Image {...iconProps} />}>复制图片后，在面板中按 Ctrl / Command + V。</StepItem>
              <StepItem icon={<FolderOpen {...iconProps} />}>新建文件夹、复制链接、拖拽移动或删除文件。</StepItem>
            </ul>
          </Card>
        </section>

        <section aria-labelledby="shortcuts-title">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded border border-border bg-surface text-primary shadow">
              <Keyboard size={20} strokeWidth={2} />
            </span>
            <div>
              <h2 id="shortcuts-title" className="m-0 text-xl font-semibold text-content">快捷操作</h2>
              <p className="m-0 text-sm text-content-secondary">无需离开当前网页</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <ShortcutCard icon={<MousePointer2 {...iconProps} />} title="悬浮按钮">
              单击打开云盘；拖动按钮可调整它在网页中的位置。
            </ShortcutCard>
            <ShortcutCard icon={<Command {...iconProps} />} title="打开 / 关闭面板">
              <div className="flex flex-wrap items-center gap-2"><Key>Ctrl / ⌘</Key><span>+</span><Key>Shift</Key><span>+</span><Key>D</Key></div>
            </ShortcutCard>
            <ShortcutCard icon={<Image {...iconProps} />} title="截图上传">
              <div className="flex flex-wrap items-center gap-2"><Key>Ctrl / ⌘</Key><span>+</span><Key>Shift</Key><span>+</span><Key>U</Key></div>
            </ShortcutCard>
          </div>
        </section>

        <Card className="border-border bg-surface shadow" title={<span className="text-content">支持的云存储</span>}>
          <div className="flex flex-wrap gap-3">
            {providers.map((provider) => <Tag key={provider} color="blue" className="px-3 py-1 text-sm">{provider}</Tag>)}
          </div>
        </Card>

        <Alert
          type="info"
          showIcon
          message="安全与连接提示"
          description="建议使用仅拥有目标 Bucket 所需权限的访问密钥。若连接失败，请检查 Region、Bucket、密钥权限及云服务跨域配置。"
        />
      </div>
    </main>
  );
}

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <ThemeProvider slug="enterprise-dashboard" density="middle" popupContainer={container}>
      <Help />
    </ThemeProvider>
  );
}
