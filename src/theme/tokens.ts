/**
 * 令牌唯一来源：1 种风格 × 同一套语义令牌。
 * CSS 变量与 antd token 都从这里派生，不从 DOM 反读样式。
 * key 直接用 CSS 变量名，省掉一层映射。
 *
 * 由 sino-ui-ux-design 的 design-tokens skill 生成（gen-theme.mjs）。
 * 新增风格时补一整套令牌，缺任何一项都会编译不过。
 */

export const THEME_SLUGS = [
  'enterprise-dashboard',
] as const;

export type ThemeSlug = (typeof THEME_SLUGS)[number];

export interface ThemeTokens {
  /** 主色：主按钮、链接、强调、大号指标数字 */
  '--color-primary': string;
  /** 页面底色（容器层，非最外层底衬） */
  '--color-bg': string;
  /** 卡片/面板背景 */
  '--color-surface': string;
  /** 正文文字 */
  '--color-text': string;
  /** 次级文字：标签、说明、辅助信息 */
  '--color-text-secondary': string;
  /** 边框与分割线色 */
  '--color-border': string;
  /** 语义状态色：成功、正向数值 */
  '--color-success': string;
  /** 语义状态色：警告、待处理 */
  '--color-warning': string;
  /** 语义状态色：错误、负向数值 */
  '--color-danger': string;
  /** 圆角（长度值） */
  '--radius': string;
  /** 投影（完整 box-shadow 值，可为 none） */
  '--shadow': string;
  /** 背景模糊半径，玻璃拟态用；其余风格为 0px */
  '--blur': string;
  /** 间距基数，只驱动 ≥16px 的布局档位（面板内边距、区块间隙）；组件内部 ≤14px 的成组间距不跟着变。4px 等于 Tailwind 默认刻度 */
  '--space-unit': string;
  /** 控件标准高度（按钮/输入框/选择器），决定控件的松紧体感；映射 antd controlHeight */
  '--control-height': string;
  /** 描边简写（width style color） */
  '--border': string;
  /** 最外层页面底衬。玻璃拟态必须有彩色/渐变底衬才出效果，其余风格回落为纯色 */
  '--backdrop': string;
}

export interface ThemeMeta {
  label: string;
  /** 该风格是否为暗色底，决定 antd 用 darkAlgorithm。 */
  dark: boolean;
  /** 一句话特征，可展示在 UI 上。 */
  note: string;
}

export const THEME_META: Record<ThemeSlug, ThemeMeta> = {
  'enterprise-dashboard': { label: '企业数据看板 Enterprise Dashboard', dark: false, note: '灰底白卡浮起、饱和蓝主色、高信息密度' },
};

export const THEMES: Record<ThemeSlug, ThemeTokens> = {
  'enterprise-dashboard': {
    '--color-primary': '#165dff',
    // 底色刻意压到明显的浅灰，让白卡片靠明度差浮出来 —— 这是本风格的层级手段，与 minimal（近白底 + 纯描边分层）互为对照
    '--color-bg': '#eff2f7',
    '--color-surface': '#ffffff',
    '--color-text': '#1d2129',
    '--color-text-secondary': '#6b7280',
    '--color-border': '#e5e6eb',
    '--color-success': '#0b7a35',
    '--color-warning': '#a85400',
    '--color-danger': '#d92d20',
    '--radius': '8px',
    // 双层柔投影：1px 贴地一层交代卡片边界，6px 扩散一层做浮起感。整体不超过 8% 不透明度，仍属「极柔」，与 material 的海拔投影（20%）不同量级
    '--shadow': '0 1px 2px rgb(0 0 0 / 5%), 0 6px 16px rgb(0 0 0 / 8%)',
    '--blur': '0px',
    // B 端看板要在一屏内塞下多列指标卡与多张表格，基数取 4px 紧凑档
    '--space-unit': '4px',
    // 控件取 32px 紧凑档（antd 默认值）。全部 9 种风格统一用这一档：宽松/中等/紧凑的尺寸变化由 antd componentSize 三档承担，各风格与本风格表现一致
    '--control-height': '32px',
    '--border': '1px solid var(--color-border)',
    '--backdrop': '#eff2f7',
  },
};
