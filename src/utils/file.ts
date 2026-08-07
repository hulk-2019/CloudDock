/** 单个文件上传大小上限（所有上传入口共用），两个常量须保持一致。 */
export const MAX_UPLOAD_FILE_SIZE_LABEL = '2GB';
export const MAX_UPLOAD_FILE_SIZE_BYTES = 2 * 1024 * 1024 * 1024;

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * 格式化日期
 */
export function formatDate(date: Date, locale: 'zh-CN' | 'en-US' = 'zh-CN'): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const english = locale === 'en-US';

  if (diff < 60 * 1000) return english ? 'Just now' : '刚刚';

  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return english ? `${minutes} min ago` : `${minutes} 分钟前`;
  }

  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return english ? `${hours} hr ago` : `${hours} 小时前`;
  }

  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return english ? `${days} day${days === 1 ? '' : 's'} ago` : `${days} 天前`;
  }

  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

/**
 * 判断是否为图片文件
 */
export function isImageFile(filename: string): boolean {
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
  return imageExts.includes(getFileExtension(filename));
}

/**
 * 判断是否为视频文件
 */
export function isVideoFile(filename: string): boolean {
  const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'];
  return videoExts.includes(getFileExtension(filename));
}

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 路径处理：拼接路径
 */
export function joinPath(...parts: string[]): string {
  return parts.join('/').replace(/\/+/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
}

/** 将目录路径规范为对象存储使用的形式：根目录为 /，其他目录无首尾斜杠。 */
export function normalizeDirectoryPath(path: string): string {
  const normalized = joinPath(path);
  return normalized || '/';
}

/**
 * 路径处理：获取父路径
 */
export function getParentPath(path: string): string {
  if (path === '/' || path === '') return '/';

  const parts = path.split('/').filter(Boolean);
  parts.pop();

  return parts.length > 0 ? '/' + parts.join('/') : '/';
}

/**
 * 路径处理：获取文件/文件夹名
 */
export function getBasename(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : '';
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return function (...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), wait);
    }
  };
}
