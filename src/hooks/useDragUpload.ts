import { useEffect, useCallback } from 'react';
import { useFileUpload } from './useFileUpload';
import { extractFilesFromDragEvent, extractMediaFromDragEvent } from '@/utils/screenshot';

/**
 * 拖拽上传 Hook
 */
export function useDragUpload(ref: React.RefObject<HTMLElement>) {
  const { uploadFiles } = useFileUpload();

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 添加拖拽样式
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.add('drag-over');
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 移除拖拽样式
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.remove('drag-over');
    }
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      // 内部文件移动拖拽，交给 DrawerPanel 的文件夹放置逻辑处理，不做上传
      if (e.dataTransfer?.types.includes('application/x-clouddock-move')) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      // 移除拖拽样式
      if (e.currentTarget instanceof HTMLElement) {
        e.currentTarget.classList.remove('drag-over');
      }

      try {
        // 提取本地文件
        const localFiles = extractFilesFromDragEvent(e);

        // 提取网页图片/视频
        const mediaFiles = await extractMediaFromDragEvent(e);

        const allFiles = [...localFiles, ...mediaFiles];

        if (allFiles.length > 0) {
          await uploadFiles(allFiles);
        }
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
}
