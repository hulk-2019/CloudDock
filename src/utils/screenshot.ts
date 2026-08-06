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
  const files: File[] = [];

  if (!event.dataTransfer) return files;

  // 检查是否有 HTML 内容
  const html = event.dataTransfer.getData('text/html');
  if (html) {
    // 解析 HTML，提取图片和视频 URL
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 提取图片
    const images = doc.querySelectorAll('img');
    for (const img of Array.from(images)) {
      const url = img.src;
      if (url && url.startsWith('http')) {
        try {
          const file = await downloadUrlAsFile(url, img.alt || 'image');
          if (file) files.push(file);
        } catch (error) {
          console.error('Failed to download image:', error);
        }
      }
    }

    // 提取视频
    const videos = doc.querySelectorAll('video');
    for (const video of Array.from(videos)) {
      const url = video.src;
      if (url && url.startsWith('http')) {
        try {
          const file = await downloadUrlAsFile(url, 'video');
          if (file) files.push(file);
        } catch (error) {
          console.error('Failed to download video:', error);
        }
      }
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

    const timestamp = Date.now();
    const filename = `${baseName}-${timestamp}${ext ? '.' + ext : ''}`;

    return new File([blob], filename, { type: contentType });
  } catch (error) {
    console.error('Download failed:', error);
    return null;
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
