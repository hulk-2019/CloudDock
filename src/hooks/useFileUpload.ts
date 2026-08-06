import { useState, useCallback } from 'react';
import { useCloudStorage } from './useCloudStorage';
import { useUIStore } from '@/store/ui';
import { useConfigStore } from '@/store/config';
import type { UploadProgress } from '@/types';

/**
 * 文件上传 Hook
 */
export function useFileUpload() {
  const { provider } = useCloudStorage();
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
        await provider.uploadFile(file, currentPath, activeConfig.bucket, (percent) => {
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
    [provider, getActiveConfig, currentPath, addUpload, updateUpload, removeUpload]
  );

  /**
   * 批量上传文件
   */
  const uploadFiles = useCallback(
    async (files: File[]) => {
      const results = await Promise.allSettled(files.map((file) => uploadFile(file)));

      const failed = results.filter((r) => r.status === 'rejected').length;
      const success = results.filter((r) => r.status === 'fulfilled').length;

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
