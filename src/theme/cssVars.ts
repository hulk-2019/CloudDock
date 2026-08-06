/**
 * 把令牌表渲染成一张静态样式表：每种风格一条 :root[data-theme='<slug>'] 规则。
 * 构建期或应用启动时输出一次即可，SSR 下同样安全（不触碰 document）。
 */

import { THEMES } from './tokens';

export function buildThemeStyleSheet(): string {
  return Object.entries(THEMES)
    .map(([slug, tokens]) => {
      const decls = Object.entries(tokens)
        .map(([name, value]) => `${name}:${value};`)
        .join('');
      return `:root[data-theme='${slug}']{${decls}}`;
    })
    .join('\n');
}
