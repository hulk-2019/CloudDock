/// <reference types="vite/client" />

// 声明 CSS 模块类型
declare module '*.css' {
  const content: string;
  export default content;
}

// 声明 inline CSS 导入类型
declare module '*.css?inline' {
  const content: string;
  export default content;
}

// 声明图片等资源类型
declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}
