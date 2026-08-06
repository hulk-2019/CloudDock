import { useCallback, useEffect, useState, type RefObject } from 'react';
import { useFileUpload } from './useFileUpload';
import { extractFilesFromDragEvent, extractMediaFromDragEvent } from '@/utils/screenshot';

const INTERNAL_DRAG_TYPE = 'application/x-clouddock-move';

/** 管理外部文件/网页媒体拖拽上传，并返回可用于 Tailwind 状态样式的布尔值。 */
export function useDragUpload(ref: RefObject<HTMLElement>) {
  const { uploadFiles } = useFileUpload();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((event: DragEvent) => {
    if (event.dataTransfer?.types.includes(INTERNAL_DRAG_TYPE)) return;
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (event: DragEvent) => {
      if (event.dataTransfer?.types.includes(INTERNAL_DRAG_TYPE)) return;

      event.preventDefault();
      event.stopPropagation();
      setIsDragOver(false);

      try {
        const localFiles = extractFilesFromDragEvent(event);
        const mediaFiles = await extractMediaFromDragEvent(event);
        const files = [...localFiles, ...mediaFiles];
        if (files.length > 0) await uploadFiles(files);
      } catch (error) {
        console.error('Upload failed:', error);
      }
    },
    [uploadFiles]
  );

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('dragover', handleDragOver);
    element.addEventListener('dragleave', handleDragLeave);
    element.addEventListener('drop', handleDrop);

    return () => {
      element.removeEventListener('dragover', handleDragOver);
      element.removeEventListener('dragleave', handleDragLeave);
      element.removeEventListener('drop', handleDrop);
    };
  }, [ref, handleDragOver, handleDragLeave, handleDrop]);

  return { isDragOver };
}
