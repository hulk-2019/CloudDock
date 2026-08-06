import { useState, useCallback } from 'react';
import { useCloudStorage } from './useCloudStorage';
import { useUIStore } from '@/store/ui';
import { useConfigStore } from '@/store/config';
import type { UploadProgress } from '@/types';
import { isImageFile, isVideoFile } from '@/utils/file';

/**
 * 文件上传 Hook
 */
export function useFileUpload() {
  const { provider, refreshUntilVisible } = useCloudStorage();
  const { getActiveConfig, currentPath } = useConfigStore();
  const { addUpload, updateUpload, removeUpload } = useUIStore();
  const [uploading, setUploading] = useState(false);

  /**
   * 上传单个文件
   */
  const uploadFile = useCallback(
    async (file: File) => {
      const activeConfig = getActiveConfig();

      if (!provider || !activeConfig) {
        throw new Error('云存储服务未初始化');
      }

      const uploadProgress: UploadProgress = {
        fileName: file.name,
        percent: 0,
        loaded: 0,
        total: file.size,
        status: 'uploading',
      };

      addUpload(uploadProgress);
      setUploading(true);

      try {
        const result = await provider.uploadFile(file, currentPath, activeConfig.bucket, (percent) => {
          updateUpload(file.name, {
            percent,
            loaded: Math.floor((percent / 100) * file.size),
          });
        });

        updateUpload(file.name, {
          percent: 100,
          loaded: file.size,
          status: 'success',
        });

        let previewUrl = result.url;
        if (isImageFile(file.name) || isVideoFile(file.name)) {
          try {
            previewUrl = await provider.getFileUrl(result.path, activeConfig.bucket);
          } catch (previewError) {
            console.warn('Failed to create uploaded media preview URL:', result.path, previewError);
          }
        }

        // 写入后保留带预览地址的乐观项并重试云端列表，避免对象存储短暂返回旧结果。
        await refreshUntilVisible(result.path, {
          name: result.name,
          path: result.path,
          size: result.size,
          type: 'file',
          lastModified: new Date(),
          url: previewUrl,
          mimeType: file.type,
        });

        // 2秒后移除成功的上传记录
        setTimeout(() => {
          removeUpload(file.name);
        }, 2000);

        return true;
      } catch (error) {
        updateUpload(file.name, {
          status: 'error',
        });

        console.error('Upload failed:', error);
        throw error;
      } finally {
        setUploading(false);
      }
    },
    [provider, getActiveConfig, currentPath, addUpload, updateUpload, removeUpload, refreshUntilVisible]
  );

  /**
   * 批量上传文件
   */
  const uploadFiles = useCallback(
    async (files: File[]) => {
      let success = 0;
      let failed = 0;

      // 顺序提交可避免多个写后刷新互相覆盖乐观列表。
      for (const file of files) {
        try {
          await uploadFile(file);
          success += 1;
        } catch {
          failed += 1;
        }
      }

      return { success, failed, total: files.length };
    },
    [uploadFile]
  );

  return {
    uploading,
    uploadFile,
    uploadFiles,
  };
}
