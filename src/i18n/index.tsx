import { useEffect, type ReactNode } from 'react';
import { create } from 'zustand';

import enUSMessages from './locales/en-US.json';
import zhCNMessages from './locales/zh-CN.json';

export type AppLocale = 'zh-CN' | 'en-US';
export type TranslationKey = keyof typeof zhCNMessages;
type TranslationParams = Record<string, string | number>;

const STORAGE_KEY = 'appLocale';

const messages: Record<AppLocale, Record<TranslationKey, string>> = {
  'zh-CN': zhCNMessages,
  'en-US': enUSMessages,
};

function detectLocale(): AppLocale {
  const language =
    (typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage?.()) ||
    (typeof navigator !== 'undefined' ? navigator.language : 'zh-CN');
  return language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US';
}

function interpolate(message: string, params?: TranslationParams) {
  if (!params) return message;
  return message.replace(/\{(\w+)\}/g, (placeholder, key: string) =>
    params[key] === undefined ? placeholder : String(params[key])
  );
}

interface LocaleState {
  locale: AppLocale;
  loaded: boolean;
  loadLocale: () => Promise<void>;
  setLocale: (locale: AppLocale) => Promise<void>;
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: detectLocale(),
  loaded: false,
  loadLocale: async () => {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      const locale = result[STORAGE_KEY];
      set({
        locale: locale === 'zh-CN' || locale === 'en-US' ? locale : detectLocale(),
        loaded: true,
      });
    } catch {
      set({ locale: detectLocale(), loaded: true });
    }
  },
  setLocale: async (locale) => {
    set({ locale, loaded: true });
    await chrome.storage.local.set({ [STORAGE_KEY]: locale });
  },
}));

export function translate(
  key: TranslationKey,
  params?: TranslationParams,
  locale = useLocaleStore.getState().locale
) {
  return interpolate(messages[locale][key], params);
}

export function useI18n() {
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  return {
    locale,
    setLocale,
    toggleLocale: () => setLocale(locale === 'zh-CN' ? 'en-US' : 'zh-CN'),
    t: (key: TranslationKey, params?: TranslationParams) => translate(key, params, locale),
  };
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const loadLocale = useLocaleStore((state) => state.loadLocale);
  const locale = useLocaleStore((state) => state.locale);

  useEffect(() => {
    void loadLocale();
    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
      const next = changes[STORAGE_KEY]?.newValue;
      if (area === 'local' && (next === 'zh-CN' || next === 'en-US')) {
        useLocaleStore.setState({ locale: next, loaded: true });
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [loadLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return children;
}
