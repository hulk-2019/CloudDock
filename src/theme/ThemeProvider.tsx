import { StyleProvider } from '@ant-design/cssinjs';
import { App as AntdApp, ConfigProvider, theme as antdTheme } from 'antd';
import { type ReactNode, useEffect, useMemo } from 'react';

import { THEMES, THEME_META, type ThemeSlug } from './tokens';

interface ThemeProviderProps {
  slug: ThemeSlug;
  density?: 'small' | 'middle' | 'large';
  motion?: boolean;
  /** Ant Design CSS-in-JS 样式注入位置；Shadow DOM 场景必须传入 shadowRoot。 */
  styleContainer?: Element | ShadowRoot;
  /** Select、Modal、Tooltip 等浮层的挂载节点。 */
  popupContainer?: HTMLElement;
  /** CSS 变量作用域，避免内容脚本污染宿主网页。 */
  themeRoot?: HTMLElement;
  children: ReactNode;
}

export function ThemeProvider({
  slug,
  density = 'middle',
  motion = true,
  styleContainer,
  popupContainer,
  themeRoot,
  children,
}: ThemeProviderProps) {
  useEffect(() => {
    const root = themeRoot ?? document.documentElement;
    root.dataset.theme = slug;

    const tokens = THEMES[slug];
    Object.entries(tokens).forEach(([name, value]) => root.style.setProperty(name, value));

    return () => {
      Object.keys(tokens).forEach((name) => root.style.removeProperty(name));
      delete root.dataset.theme;
    };
  }, [slug, themeRoot]);

  const token = useMemo(() => {
    const current = THEMES[slug];
    return {
      colorPrimary: current['--color-primary'],
      colorBgLayout: current['--color-bg'],
      colorBgContainer: current['--color-surface'],
      colorBgElevated: current['--color-surface'],
      colorText: current['--color-text'],
      colorTextSecondary: current['--color-text-secondary'],
      colorBorder: current['--color-border'],
      colorSuccess: current['--color-success'],
      colorWarning: current['--color-warning'],
      colorError: current['--color-danger'],
      borderRadius: Number.parseInt(current['--radius'], 10),
      sizeUnit: Number.parseInt(current['--space-unit'], 10),
      sizeStep: Number.parseInt(current['--space-unit'], 10),
      controlHeight: Number.parseInt(current['--control-height'], 10),
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
      motion,
    };
  }, [slug, motion]);

  const content = (
    <ConfigProvider
      componentSize={density}
      getPopupContainer={popupContainer ? () => popupContainer : undefined}
      theme={{
        token,
        algorithm: THEME_META[slug].dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        components: {
          Button: { primaryShadow: 'none', defaultShadow: 'none' },
          Card: { boxShadowTertiary: 'none' },
          Modal: { contentBg: token.colorBgContainer, headerBg: token.colorBgContainer },
        },
      }}
    >
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );

  return styleContainer ? <StyleProvider container={styleContainer}>{content}</StyleProvider> : content;
}
