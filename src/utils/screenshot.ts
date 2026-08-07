import { isImageFile, isVideoFile } from './file';

/**
 * 截取当前标签页的屏幕截图
 */
export async function captureScreenshot(): Promise<File> {
  // 通过 background script 截取屏幕
  const response = await chrome.runtime.sendMessage({
    action: 'captureScreenshot',
  });

  if (!response.success) {
    throw new Error(response.error || '截图失败');
  }

  // 将 dataURL 转换为 Blob
  const dataUrl = response.data as string;
  const blob = await dataUrlToBlob(dataUrl);

  // 生成文件名
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `screenshot-${timestamp}.png`;

  return new File([blob], filename, { type: 'image/png' });
}

/**
 * DataURL 转 Blob
 */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return await response.blob();
}

/**
 * 从剪贴板读取图片
 */
export async function readImageFromClipboard(): Promise<File | null> {
  try {
    const clipboardItems = await navigator.clipboard.read();

    for (const item of clipboardItems) {
      for (const type of item.types) {
        if (type.startsWith('image/')) {
          const blob = await item.getType(type);
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
          const ext = type.split('/')[1] || 'png';
          const filename = `clipboard-${timestamp}.${ext}`;

          return new File([blob], filename, { type });
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to read clipboard:', error);
    return null;
  }
}

/**
 * 从拖拽事件中提取文件
 */
export function extractFilesFromDragEvent(event: DragEvent): File[] {
  const files: File[] = [];

  if (event.dataTransfer?.files) {
    files.push(...Array.from(event.dataTransfer.files));
  }

  return files;
}

/**
 * 从拖拽事件中提取网页图片/视频 URL
 */
export async function extractMediaFromDragEvent(event: DragEvent): Promise<File[]> {
  if (!event.dataTransfer) return [];
  return extractMediaFromPayload(
    event.dataTransfer.getData('text/html'),
    event.dataTransfer.getData('text/uri-list')
  );
}

/**
 * 从拖拽载荷（HTML 片段 / URI 列表）中解析媒体 URL 并下载为 File。
 * 单独成函数：跨源 iframe 无法直接接收页面拖拽，内容脚本代收后把
 * 原始载荷 postMessage 进抽屉页，由抽屉页调用本函数解析下载。
 */
export async function extractMediaFromPayload(html: string, uriList: string): Promise<File[]> {
  const files: File[] = [];

  // 站点的拖拽载荷里常出现重复节点（懒加载占位图、同一资源的多个引用），
  // 必须按 URL 去重，否则同一资源会被下载并上传多次。
  const mediaUrls = new Map<string, string>();

  if (html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    for (const img of Array.from(doc.querySelectorAll('img'))) {
      if (img.src && img.src.startsWith('http')) mediaUrls.set(img.src, img.alt || 'image');
    }
    for (const video of Array.from(doc.querySelectorAll('video'))) {
      const url = video.src || video.querySelector('source')?.src || '';
      if (url.startsWith('http')) mediaUrls.set(url, 'video');
    }
  }

  // 部分站点（尤其是拖拽 <video> 场景）只提供 text/uri-list，没有 HTML 载荷；
  // 仅当 URL 按扩展名判断确实是媒体资源时才接收，避免把普通链接当文件下载。
  if (mediaUrls.size === 0 && uriList) {
    const url = uriList
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith('#'));
    if (url?.startsWith('http')) {
      const filename = getFilenameFromUrl(url);
      if (isImageFile(filename) || isVideoFile(filename)) mediaUrls.set(url, 'media');
    }
  }

  for (const [url, baseName] of mediaUrls) {
    try {
      const file = await downloadUrlAsFile(url, baseName);
      if (file) files.push(file);
    } catch (error) {
      console.error('Failed to download media:', error);
    }
  }

  return files;
}

/**
 * 从 URL 下载文件
 */
async function downloadUrlAsFile(url: string, baseName: string): Promise<File | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();

    // 从 URL 或 Content-Type 推断文件类型
    const contentType = response.headers.get('content-type') || blob.type;
    const ext = getExtensionFromMimeType(contentType) || getExtensionFromUrl(url);

    // 优先沿用 URL 中的原始文件名：命名稳定，同一资源重复拖入不会产生多个不同名副本。
    const urlFilename = getFilenameFromUrl(url);
    const filename = urlFilename || `${baseName}-${Date.now()}${ext ? '.' + ext : ''}`;

    return new File([blob], filename, { type: contentType });
  } catch (error) {
    console.error('Download failed:', error);
    return null;
  }
}

/**
 * 从 URL 路径中提取带扩展名的文件名；提取不到时返回空串，由调用方回退到时间戳命名。
 */
function getFilenameFromUrl(url: string): string {
  try {
    const basename = decodeURIComponent(new URL(url).pathname.split('/').pop() ?? '');
    return basename.includes('.') ? basename : '';
  } catch {
    return '';
  }
}

/**
 * 从 MIME 类型获取文件扩展名
 */
function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
  };

  return map[mimeType] || '';
}

/**
 * 从 URL 获取文件扩展名
 */
function getExtensionFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  } catch {
    return '';
  }
}
