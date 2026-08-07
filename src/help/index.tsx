import { createRoot } from 'react-dom/client';
import { useEffect } from 'react';
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
import LanguageSwitcher from '@/content/LanguageSwitcher';
import { I18nProvider, useI18n, type TranslationKey } from '@/i18n';
import { ThemeProvider } from '@/theme/ThemeProvider';
import './styles.css';

const providers = [
  'provider.aliyunOss',
  'provider.tencentCos',
  'provider.awsS3',
] satisfies TranslationKey[];
const iconProps = { size: 19, strokeWidth: 2, 'aria-hidden': true } as const;

function StepItem({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 rounded border border-border bg-bg p-3 text-sm leading-6 text-content">
      <span className="mt-0.5 text-primary">{icon}</span>
      <span>{children}</span>
    </li>
  );
}

function ShortcutCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
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
  return (
    <kbd className="rounded border border-border bg-bg px-2 py-1 font-mono text-xs text-content shadow">
      {children}
    </kbd>
  );
}

function Help() {
  const { t } = useI18n();

  useEffect(() => {
    document.title = t('help.pageTitle');
  }, [t]);

  return (
    <main className="min-h-screen bg-bg px-5 py-8 font-sans text-content backdrop-blur sm:px-8 lg:px-12">
      <div className="mx-auto max-w-5xl space-y-6">
        <section
          className="relative flex flex-col gap-5 rounded border border-border bg-surface p-6 shadow sm:flex-row sm:items-center sm:p-8"
          aria-labelledby="help-title"
        >
          <div className="absolute right-4 top-4">
            <LanguageSwitcher showLabel />
          </div>
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded border border-border bg-bg text-primary shadow">
            <Cloud size={36} strokeWidth={2} aria-hidden />
          </span>
          <div className="pr-16">
            <Tag color="blue" bordered={false}>
              {t('help.heading')}
            </Tag>
            <h1
              id="help-title"
              className="mb-2 mt-3 text-3xl font-bold tracking-tight text-content sm:text-4xl"
            >
              {t('help.keepCloudFilesWithinReach')}
            </h1>
            <p className="m-0 max-w-2xl text-base leading-7 text-content-secondary">
              {t('help.introduction')}
            </p>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2" aria-label={t('help.quickStart')}>
          <Card
            className="border-border bg-surface shadow"
            title={
              <div className="flex items-center gap-3 py-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-bg font-bold text-primary shadow">
                  01
                </span>
                <div>
                  <h2 className="m-0 text-lg text-content">{t('help.addAStorageConfiguration')}</h2>
                  <p className="m-0 text-xs font-normal text-content-secondary">
                    {t('help.yourFirstStep')}
                  </p>
                </div>
              </div>
            }
          >
            <ol className="m-0 space-y-3 p-0 [list-style:none]">
              <StepItem icon={<SlidersHorizontal {...iconProps} />}>
                {t('help.openCloudDockOnAWebpageAndSelectGoToConfiguration')}
              </StepItem>
              <StepItem icon={<LockKeyhole {...iconProps} />}>
                {t('help.enterTheProviderRegionBucketAndAccessCredentials')}
              </StepItem>
              <StepItem icon={<CheckCircle2 {...iconProps} />}>
                {t('help.configurationAutoLoadInstruction')}
              </StepItem>
            </ol>
          </Card>

          <Card
            className="border-border bg-surface shadow"
            title={
              <div className="flex items-center gap-3 py-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-bg font-bold text-primary shadow">
                  02
                </span>
                <div>
                  <h2 className="m-0 text-lg text-content">{t('help.uploadAndManageFiles')}</h2>
                  <p className="m-0 text-xs font-normal text-content-secondary">
                    {t('help.useTheWorkflowThatSuitsYou')}
                  </p>
                </div>
              </div>
            }
          >
            <ul className="m-0 space-y-3 p-0 [list-style:none]">
              <StepItem icon={<Upload {...iconProps} />}>
                {t('help.dragUploadInstruction')}
              </StepItem>
              <StepItem icon={<Image {...iconProps} />}>
                {t('help.copyAnImageThenPressCtrlCommandVInThePanel')}
              </StepItem>
              <StepItem icon={<FolderOpen {...iconProps} />}>
                {t('help.createFoldersCopyLinksDragToMoveOrDeleteFiles')}
              </StepItem>
            </ul>
          </Card>
        </section>

        <section aria-labelledby="shortcuts-title">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded border border-border bg-surface text-primary shadow">
              <Keyboard size={20} strokeWidth={2} aria-hidden />
            </span>
            <div>
              <h2 id="shortcuts-title" className="m-0 text-xl font-semibold text-content">
                {t('help.shortcuts')}
              </h2>
              <p className="m-0 text-sm text-content-secondary">
                {t('help.withoutLeavingTheCurrentWebpage')}
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <ShortcutCard
              icon={<MousePointer2 {...iconProps} />}
              title={t('common.floatingButton')}
            >
              {t('help.clickToOpenTheDriveOrDragTheButtonToRepositionIt')}
            </ShortcutCard>
            <ShortcutCard icon={<Command {...iconProps} />} title={t('help.openClosePanel')}>
              <div className="flex flex-wrap items-center gap-2">
                <Key>Alt / ⌥</Key>
                <span>+</span>
                <Key>Shift</Key>
                <span>+</span>
                <Key>D</Key>
              </div>
            </ShortcutCard>
            <ShortcutCard icon={<Image {...iconProps} />} title={t('common.captureAndUpload')}>
              <div className="flex flex-wrap items-center gap-2">
                <Key>Ctrl / ⌘</Key>
                <span>+</span>
                <Key>Shift</Key>
                <span>+</span>
                <Key>U</Key>
              </div>
            </ShortcutCard>
          </div>
        </section>

        <Card
          className="border-border bg-surface shadow"
          title={<span className="text-content">{t('help.supportedStorageProviders')}</span>}
        >
          <div className="flex flex-wrap gap-3">
            {providers.map((provider) => (
              <Tag key={provider} color="blue" className="px-3 py-1 text-sm">
                {t(provider)}
              </Tag>
            ))}
          </div>
        </Card>

        <Alert
          type="info"
          showIcon
          message={t('help.securityAndConnectionTips')}
          description={t('help.securityConnectionDescription')}
        />
      </div>
    </main>
  );
}

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <I18nProvider>
      <ThemeProvider slug="modern-glass" density="middle" popupContainer={container}>
        <Help />
      </ThemeProvider>
    </I18nProvider>
  );
}
