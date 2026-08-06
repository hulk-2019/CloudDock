import { useCallback, useEffect, useState } from 'react';
import { CloudStorageFactory } from '@/services/base';
import type { ICloudStorageProvider } from '@/services/base';
import type { CloudConfig, FileItem } from '@/types';
import { useConfigStore } from '@/store/config';
import { useFileStore } from '@/store/files';
import { validateBucketName } from '@/utils/configValidation';
import { isImageFile, isVideoFile, joinPath, normalizeDirectoryPath } from '@/utils/file';

const REFRESH_RETRY_DELAYS = [0, 250, 700];
const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
const sameStoragePath = (left: string, right: string) => joinPath(left) === joinPath(right);

export function useCloudStorage() {
  const [provider, setProvider] = useState<ICloudStorageProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { getActiveConfig, currentPath, setCurrentPath, activeConfigId } = useConfigStore();
  const { files, loading, setFiles, setLoading, upsertFile } = useFileStore();
  const normalizedCurrentPath = normalizeDirectoryPath(currentPath);

  const initProvider = useCallback(async () => {
    const activeConfig = getActiveConfig();

    if (!activeConfig) {
      setError(null);
      setProvider(null);
      setFiles([]);
      return;
    }

    try {
      const bucketValidation = validateBucketName(activeConfig.provider, activeConfig.bucket);
      if (!bucketValidation.valid) {
        throw new Error(bucketValidation.message || 'Bucket 名称不符合云厂商规范');
      }

      const response = await chrome.runtime.sendMessage({
        action: 'getCredentials',
        configId: activeConfig.id,
      });

      if (!response.success || !response.data) {
        setProvider(null);
        setError('未找到云存储凭证，请先配置 AccessKey');
        return;
      }

      const config: CloudConfig = {
        provider: activeConfig.provider,
        accessKeyId: response.data.ak,
        accessKeySecret: response.data.sk,
        region: activeConfig.region,
        bucket: activeConfig.bucket,
      };

      const providerInstance = await CloudStorageFactory.create(config);
      setProvider(providerInstance);
      setError(null);
    } catch (initError) {
      setProvider(null);
      setError((initError as Error).message);
      console.error('Failed to init provider:', initError);
    }
  }, [activeConfigId, getActiveConfig, setFiles]);

  const fetchFiles = useCallback(async (): Promise<FileItem[]> => {
    const activeConfig = getActiveConfig();
    if (!provider || !activeConfig) return [];

    const fileList = await provider.listFiles(normalizedCurrentPath, activeConfig.bucket);
    return Promise.all(
      fileList.map(async (file) => {
        const isMedia =
          file.type === 'file' && (isImageFile(file.name) || isVideoFile(file.name));
        if (!isMedia) return file;

        try {
          const url = await provider.getFileUrl(file.path, activeConfig.bucket);
          return { ...file, url };
        } catch (previewError) {
          console.warn('Failed to create media preview URL:', file.path, previewError);
          return file;
        }
      })
    );
  }, [getActiveConfig, normalizedCurrentPath, provider]);

  const loadFiles = useCallback(async (): Promise<FileItem[] | null> => {
    if (!provider || !getActiveConfig()) return null;

    setLoading(true);
    try {
      const fileList = await fetchFiles();
      setFiles(fileList);
      setError(null);
      return fileList;
    } catch (loadError) {
      setError((loadError as Error).message);
      console.error('Failed to load files:', loadError);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchFiles, getActiveConfig, provider, setFiles, setLoading]);

  const refresh = useCallback(async () => loadFiles(), [loadFiles]);

  /**
   * 对象存储在写入后可能短暂返回旧列表。这里会保留乐观项并进行有限重试，
   * 确保新建文件夹和上传文件在操作完成后立即出现在当前列表中。
   */
  const refreshUntilVisible = useCallback(
    async (expectedPath: string, optimisticItem: FileItem): Promise<boolean> => {
      if (!provider || !getActiveConfig()) return false;

      upsertFile(optimisticItem);
      setLoading(true);
      try {
        for (const delay of REFRESH_RETRY_DELAYS) {
          if (delay > 0) await wait(delay);

          const remoteFiles = await fetchFiles();
          const found = remoteFiles.some((item) => sameStoragePath(item.path, expectedPath));
          const localFiles = useFileStore.getState().files;
          const localOnlyFiles = localFiles.filter(
            (localItem) => !remoteFiles.some((remoteItem) => sameStoragePath(remoteItem.path, localItem.path))
          );
          setFiles([...remoteFiles, ...localOnlyFiles]);

          if (found) {
            setError(null);
            return true;
          }
        }

        return false;
      } catch (refreshError) {
        // 写入已成功时，刷新失败不应把刚写入的项目从界面移除。
        upsertFile(optimisticItem);
        setError((refreshError as Error).message);
        console.error('Failed to refresh files after write:', refreshError);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [fetchFiles, getActiveConfig, provider, setFiles, setLoading, upsertFile]
  );

  const navigate = useCallback(
    async (path: string) => {
      setCurrentPath(normalizeDirectoryPath(path));
    },
    [setCurrentPath]
  );

  const deleteFile = useCallback(
    async (path: string) => {
      const activeConfig = getActiveConfig();
      if (!provider || !activeConfig) return;

      try {
        await provider.deleteFile(path, activeConfig.bucket);
        await refresh();
      } catch (deleteError) {
        throw new Error(`删除失败: ${(deleteError as Error).message}`);
      }
    },
    [getActiveConfig, provider, refresh]
  );

  const moveFile = useCallback(
    async (sourcePath: string, targetPath: string) => {
      const activeConfig = getActiveConfig();
      if (!provider || !activeConfig) return;

      try {
        await provider.moveFile(sourcePath, targetPath, activeConfig.bucket);
        await refresh();
      } catch (moveError) {
        throw new Error(`移动失败: ${(moveError as Error).message}`);
      }
    },
    [getActiveConfig, provider, refresh]
  );

  const getFileUrl = useCallback(
    async (path: string) => {
      const activeConfig = getActiveConfig();
      if (!provider || !activeConfig) return '';

      try {
        return await provider.getFileUrl(path, activeConfig.bucket);
      } catch (urlError) {
        throw new Error(`获取链接失败: ${(urlError as Error).message}`);
      }
    },
    [getActiveConfig, provider]
  );

  const createFolder = useCallback(
    async (folderName: string) => {
      const activeConfig = getActiveConfig();
      if (!provider || !activeConfig) return;

      const folderPath = joinPath(normalizedCurrentPath, folderName);
      try {
        await provider.createFolder(folderPath, activeConfig.bucket);
        await refreshUntilVisible(folderPath, {
          name: folderName,
          path: `${folderPath}/`,
          size: 0,
          type: 'folder',
          lastModified: new Date(),
        });
      } catch (createError) {
        throw new Error(`创建文件夹失败: ${(createError as Error).message}`);
      }
    },
    [getActiveConfig, normalizedCurrentPath, provider, refreshUntilVisible]
  );

  useEffect(() => {
    void initProvider();
  }, [initProvider]);

  useEffect(() => {
    if (provider) void loadFiles();
  }, [loadFiles, provider]);

  return {
    provider,
    files,
    loading,
    error,
    currentPath: normalizedCurrentPath,
    navigate,
    refresh,
    refreshUntilVisible,
    deleteFile,
    moveFile,
    getFileUrl,
    createFolder,
  };
}
