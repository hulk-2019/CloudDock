import { useState, useCallback } from 'react';
import { useCloudStorage } from './useCloudStorage';
import { useUIStore } from '@/store/ui';
import { useConfigStore } from '@/store/config';
import { uploadProgress } from '@/lib/uploadProgress';
import { isImageFile, isVideoFile, normalizeDirectoryPath } from '@/utils/file';

/**
 * 文件上传 Hook
 */
export function useFileUpload() {
  const { provider, refreshUntilVisible } = useCloudStorage();
  const { getActiveConfig } = useConfigStore();
  const { addUpload, updateUpload, removeUpload } = useUIStore();
  const [uploading, setUploading] = useState(false);

  /**
   * 上传单个文件到指定目录（目录在提交时锁定，不随后续浏览路径变化）
   */
  const uploadFile = useCallback(
    async (file: File, targetDir: string) => {
      const activeConfig = getActiveConfig();

      if (!provider || !activeConfig) {
        throw new Error('云存储服务未初始化');
      }

      uploadProgress.publish(file.name, 0);
      addUpload({ fileName: file.name, status: 'uploading' });
      setUploading(true);

      try {
        const result = await provider.uploadFile(file, targetDir, activeConfig.bucket, (percent) => {
          // 进度 tick 高频且只关乎单个任务，走进度总线而不是全局 store。
          uploadProgress.publish(file.name, percent);
        });

        uploadProgress.publish(file.name, 100);
        updateUpload(file.name, { status: 'success' });

        let previewUrl = result.url;
        if (isImageFile(file.name) || isVideoFile(file.name)) {
          try {
            previewUrl = await provider.getFileUrl(result.path, activeConfig.bucket);
          } catch (previewError) {
            console.warn('Failed to create uploaded media preview URL:', result.path, previewError);
          }
        }

        // 上传期间用户可能已浏览到其他目录：只有仍停留在目标目录时才做写后刷新，
        // 否则乐观项会被插入到当前展示的另一目录的列表里。
        const browsingPath = normalizeDirectoryPath(useConfigStore.getState().currentPath);
        if (browsingPath === normalizeDirectoryPath(targetDir)) {
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
        }

        // 2秒后移除成功的上传记录
        setTimeout(() => {
          removeUpload(file.name);
          uploadProgress.reset(file.name);
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
    [provider, getActiveConfig, addUpload, updateUpload, removeUpload, refreshUntilVisible]
  );

  /**
   * 批量上传文件
   */
  const uploadFiles = useCallback(
    async (files: File[]) => {
      // 目标目录在提交时刻锁定：上传过程中切换文件夹不影响本批文件的落点。
      const targetDir = normalizeDirectoryPath(useConfigStore.getState().currentPath);
      // 记录提交时刻的取消标记：用户点击“清空所有任务”后标记递增，本批剩余任务立即中止。
      const cancelToken = useUIStore.getState().uploadCancelToken;
      let success = 0;
      let failed = 0;

      // 整批文件在提交时刻全部入队为“等待中”，而不是轮到才追加，
      // 让用户一眼看到全部任务及队列规模。
      for (const file of files) {
        uploadProgress.publish(file.name, 0);
        addUpload({ fileName: file.name, status: 'pending' });
      }

      // 顺序提交可避免多个写后刷新互相覆盖乐观列表。
      for (const file of files) {
        if (useUIStore.getState().uploadCancelToken !== cancelToken) break;
        try {
          await uploadFile(file, targetDir);
          success += 1;
        } catch {
          failed += 1;
        }
      }

      return { success, failed, total: files.length };
    },
    [addUpload, uploadFile]
  );

  return {
    uploading,
    uploadFile,
    uploadFiles,
  };
}
