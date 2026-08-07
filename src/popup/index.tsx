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
import LanguageSwitcher from '@/content/LanguageSwitcher';
import { I18nProvider, useI18n } from '@/i18n';
import { useConfigStore } from '@/store/config';
import { ThemeProvider } from '@/theme/ThemeProvider';
import './styles.css';

async function sendToActiveTab(message: Record<string, unknown>) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) await chrome.tabs.sendMessage(tab.id, message);
  } catch {
    // Protected browser pages do not accept content-script messages.
  }
}

function Popup() {
  const { message } = App.useApp();
  const { t } = useI18n();
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
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) return;
      await chrome.tabs.sendMessage(tab.id, { action: 'toggleDrawer' });
      window.close();
    } catch {
      message.warning(t('popup.unsupportedPage'));
    }
  };

  const handleFloatingButtonChange = (enabled: boolean) => {
    setFloatingButtonEnabled(enabled);
    void sendToActiveTab({ action: 'setFloatingButtonEnabled', enabled });
  };

  const resetFloatingButtonPosition = () => {
    setFloatingButtonPosition(null);
    void sendToActiveTab({ action: 'resetFloatingButtonPosition' });
    message.success(t('popup.floatingButtonReset'));
  };

  return (
    <main className="min-h-screen w-[360px] bg-bg p-5 font-sans text-content backdrop-blur">
      <header className="mb-5 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded border border-border bg-surface text-primary shadow">
          <Cloud size={24} strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="m-0 text-xl font-bold tracking-tight">CloudDock</h1>
            <Tag color="blue" bordered={false}>
              v{chrome.runtime.getManifest().version}
            </Tag>
          </div>
          <p className="m-0 text-sm text-content-secondary">{t('common.tagline')}</p>
        </div>
        <LanguageSwitcher />
      </header>

      <section className="space-y-3" aria-label={t('popup.actions')}>
        <Card className="border-border bg-surface shadow" styles={{ body: { padding: 12 } }}>
          <Button
            type="primary"
            size="large"
            block
            className="h-auto min-h-16 justify-start overflow-hidden shadow active:translate-y-px active:shadow-none"
            icon={<FolderOpen size={20} strokeWidth={2} aria-hidden />}
            onClick={toggleDrawer}
          >
            <span className="flex min-w-0 flex-1 flex-col items-start overflow-hidden px-1 text-left">
              <strong className="block max-w-full truncate">{t('common.openCloudDrive')}</strong>
              <small
                className="block max-w-full truncate font-normal opacity-80"
                title={t('popup.browseUploadAndManageCloudFiles')}
              >
                {t('popup.browseUploadAndManageCloudFiles')}
              </small>
            </span>
            <ArrowRight className="shrink-0" size={17} strokeWidth={2} aria-hidden />
          </Button>
        </Card>

        <Card
          className="border-border bg-surface shadow"
          title={<span className="text-sm text-content">{t('common.floatingButton')}</span>}
          styles={{ body: { padding: 12 } }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-border bg-bg text-primary">
                <MousePointer2 size={17} strokeWidth={1.8} aria-hidden />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-content">{t('popup.showOnWebpages')}</div>
                <p className="m-0 mt-1 text-xs text-content-secondary">
                  {t('popup.youCanStillOpenCloudDockFromTheExtensionIcon')}
                </p>
              </div>
            </div>
            <Switch
              aria-label={t('popup.showTheFloatingButtonOnWebpages')}
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
              icon={<LocateFixed size={15} strokeWidth={1.8} aria-hidden />}
              onClick={resetFloatingButtonPosition}
            >
              {t('popup.resetPosition')}
            </Button>
          </div>
        </Card>

        <Card className="border-border bg-surface shadow" styles={{ body: { padding: 12 } }}>
          <Button
            size="large"
            block
            className="h-auto min-h-16 justify-start border-border bg-surface text-content shadow active:translate-y-px active:shadow-none"
            icon={<HelpCircle size={20} strokeWidth={2} className="text-primary" aria-hidden />}
            onClick={() => chrome.runtime.openOptionsPage()}
          >
            <span className="flex min-w-0 flex-1 flex-col items-start px-1 text-left">
              <strong>{t('common.help')}</strong>
              <small className="font-normal text-content-secondary">
                {t('popup.viewSetupStepsAndShortcuts')}
              </small>
            </span>
            <ArrowRight size={17} strokeWidth={2} aria-hidden />
          </Button>
        </Card>
      </section>

      <footer className="mt-5 flex items-center justify-center gap-2 text-xs text-content-secondary">
        <span className="h-2 w-2 rounded-full bg-success shadow" aria-hidden="true" />
        {t('popup.extensionReady')}
      </footer>
    </main>
  );
}

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <I18nProvider>
      <ThemeProvider slug="modern-glass" density="middle" popupContainer={container}>
        <Popup />
      </ThemeProvider>
    </I18nProvider>
  );
}
