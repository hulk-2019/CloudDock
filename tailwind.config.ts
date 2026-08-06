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
  ]),
);

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
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
      // 只覆盖这四个键：w-* / h-* 仍走 Tailwind 默认刻度，
      // 否则 h-4 w-4 的图标会跟着留白一起放大。
      padding: layoutSpacing,
      margin: layoutSpacing,
      gap: layoutSpacing,
      space: layoutSpacing,
      minHeight: { control: 'var(--control-height)' },
    },
  },
} satisfies Config;
