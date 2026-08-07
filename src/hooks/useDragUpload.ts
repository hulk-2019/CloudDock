import { useCallback, useEffect, useState, type RefObject } from 'react';
import { extractFilesFromDragEvent, extractMediaFromDragEvent } from '@/utils/screenshot';

const INTERNAL_DRAG_TYPE = 'application/x-clouddock-move';

/**
 * 管理外部文件/网页媒体的拖拽热区，并返回可用于 Tailwind 状态样式的布尔值。
 * 拖入的文件通过 onFiles 交给调用方统一处理（文件夹过滤、同名校验、上传）。
 */
export function useDragUpload(
  ref: RefObject<HTMLElement>,
  onFiles: (files: File[]) => void | Promise<void>
) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((event: DragEvent) => {
    if (event.dataTransfer?.types.includes(INTERNAL_DRAG_TYPE)) return;
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(
    (event: DragEvent) => {
      if (event.dataTransfer?.types.includes(INTERNAL_DRAG_TYPE)) return;
      // 在容器内的子元素（文件卡片等）之间移动也会冒泡 dragleave，
      // 只有 relatedTarget 落在容器外时才是真正离开热区。
      const element = ref.current;
      if (element && event.relatedTarget instanceof Node && element.contains(event.relatedTarget)) {
        return;
      }
      setIsDragOver(false);
    },
    [ref]
  );

  const handleDrop = useCallback(
    async (event: DragEvent) => {
      if (event.dataTransfer?.types.includes(INTERNAL_DRAG_TYPE)) return;

      event.preventDefault();
      event.stopPropagation();
      setIsDragOver(false);

      try {
        // 拖拽网页图片时 Chrome 会同时携带 File 与 HTML 两种载荷，
        // 二者只能取其一，否则同一文件会被上传两次。
        const localFiles = extractFilesFromDragEvent(event);
        const files = localFiles.length > 0 ? localFiles : await extractMediaFromDragEvent(event);
        if (files.length > 0) await onFiles(files);
      } catch (error) {
        console.error('Upload failed:', error);
      }
    },
    [onFiles]
  );

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('dragenter', handleDragOver);
    element.addEventListener('dragover', handleDragOver);
    element.addEventListener('dragleave', handleDragLeave);
    element.addEventListener('drop', handleDrop);

    return () => {
      element.removeEventListener('dragenter', handleDragOver);
      element.removeEventListener('dragover', handleDragOver);
      element.removeEventListener('dragleave', handleDragLeave);
      element.removeEventListener('drop', handleDrop);
    };
  }, [ref, handleDragOver, handleDragLeave, handleDrop]);

  return { isDragOver };
}
