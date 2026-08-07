import type { Config } from 'tailwindcss';

/**
 * Tailwind 侧引用同一批 CSS 变量，做到 antd / Tailwind / CSS 三处消费同一套令牌。
 *
 * preflight 必须关掉：它会把 button 背景重置成 transparent，导致 antd 按钮掉色。
 * 关掉后自己补一份最小化 reset（见 index.css），但仍要保留 @tailwind base，
 * 否则 shadow 等 utility 依赖的 --tw-* 变量会缺失。
 */

/**
 * 布局间距由 --space-unit 驱动，于是「留白松紧」跟着风格走而不是散落在各组件里。
 *
 * 只覆盖 ≥ 4 的档位（默认刻度下 ≥ 16px）：这些是面板内边距、区块间隙这类**布局**间距。
 * 更小的档位留给 Tailwind 默认值 —— 图标与文字、标签与数值之间的成组间距一旦跟着放大，
 * 本该抱团的元素就散开了，观感反而更差。
 *
 * --space-unit: 4px 时算出来的值与 Tailwind 默认刻度逐个相等，所以现有类名
 * （p-5、gap-4）无需改动即变成令牌驱动。
 */
const layoutSpacing = Object.fromEntries(
  [4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 32].map((n) => [
    String(n),
    `calc(var(--space-unit) * ${n})`,
  ])
);

/**
 * 内容脚本运行在任意站点中，rem 会读取宿主页面的 html 根字号（常见有 10px、14px、18px），
 * 导致同一组 Tailwind 类在不同网站呈现不同尺寸。基础刻度改成等价 px，彻底解除这层耦合。
 */
const pixelSpacing = {
  0: '0px',
  px: '1px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  3.5: '14px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  11: '44px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
  28: '112px',
  32: '128px',
  36: '144px',
  40: '160px',
  44: '176px',
  48: '192px',
  52: '208px',
  56: '224px',
  60: '240px',
  64: '256px',
  72: '288px',
  80: '320px',
  96: '384px',
};

const pixelFontSize = {
  xs: ['12px', { lineHeight: '16px' }],
  sm: ['14px', { lineHeight: '20px' }],
  base: ['16px', { lineHeight: '24px' }],
  lg: ['18px', { lineHeight: '28px' }],
  xl: ['20px', { lineHeight: '28px' }],
  '2xl': ['24px', { lineHeight: '32px' }],
  '3xl': ['30px', { lineHeight: '36px' }],
  '4xl': ['36px', { lineHeight: '40px' }],
  '5xl': ['48px', { lineHeight: '48px' }],
  '6xl': ['60px', { lineHeight: '60px' }],
};

const pixelLineHeight = {
  none: '1',
  tight: '1.25',
  snug: '1.375',
  normal: '1.5',
  relaxed: '1.625',
  loose: '2',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
};

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    spacing: pixelSpacing,
    fontSize: pixelFontSize,
    lineHeight: pixelLineHeight,
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        bg: 'var(--color-bg)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          elevated: 'var(--color-surface-elevated)',
        },
        border: 'var(--color-border)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
        content: {
          DEFAULT: 'var(--color-text)',
          secondary: 'var(--color-text-secondary)',
        },
      },
      borderRadius: { DEFAULT: 'var(--radius)' },
      boxShadow: { DEFAULT: 'var(--shadow)' },
      backdropBlur: { DEFAULT: 'var(--blur)' },
      backgroundImage: { backdrop: 'var(--backdrop)' },
      // 布局类继续走主题间距令牌；w-* / h-* 使用上面的固定 px 基础刻度。
      padding: layoutSpacing,
      margin: layoutSpacing,
      gap: layoutSpacing,
      space: layoutSpacing,
      minHeight: { control: 'var(--control-height)' },
      maxWidth: {
        xs: '320px',
        sm: '384px',
        md: '448px',
        lg: '512px',
        xl: '576px',
        '2xl': '672px',
        '3xl': '768px',
        '4xl': '896px',
        '5xl': '1024px',
      },
    },
  },
} satisfies Config;
