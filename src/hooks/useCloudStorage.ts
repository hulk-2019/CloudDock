import { useState, useEffect, useCallback } from 'react';
import { CloudStorageFactory } from '@/services/base';
import type { ICloudStorageProvider } from '@/services/base';
import type { CloudConfig, FileItem, BucketInfo } from '@/types';
import { useConfigStore } from '@/store/config';
import { useFileStore } from '@/store/files';
import { validateBucketName } from '@/utils/configValidation';

/**
 * 云存储服务 Hook
 */
export function useCloudStorage() {
  const [provider, setProvider] = useState<ICloudStorageProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { getActiveConfig, currentPath, setCurrentPath, activeConfigId } = useConfigStore();
  const { files, loading, setFiles, setLoading } = useFileStore();

  // 初始化云存储服务
  const initProvider = useCallback(async () => {
    const activeConfig = getActiveConfig();

    // 未配置时不报错，静默等待用户配置
    if (!activeConfig) {
      setError(null);
      setProvider(null);
      return;
    }

    try {
      const bucketValidation = validateBucketName(activeConfig.provider, activeConfig.bucket);
      if (!bucketValidation.valid) {
        throw new Error(bucketValidation.message || 'Bucket 名称不符合云厂商规范');
      }

      // 获取凭证（按配置 ID）
      const response = await chrome.runtime.sendMessage({
        action: 'getCredentials',
        configId: activeConfig.id,
      });

      if (!response.success || !response.data) {
        setError('未找到云存储凭证，请先配置 AccessKey');
        return;
      }

      const { ak, sk } = response.data;

      const config: CloudConfig = {
        provider: activeConfig.provider,
        accessKeyId: ak,
        accessKeySecret: sk,
        region: activeConfig.region,
        bucket: activeConfig.bucket,
      };

      const providerInstance = await CloudStorageFactory.create(config);
      setProvider(providerInstance);
      setError(null);
      console.log('Cloud provider initialized:', activeConfig.provider, activeConfig.name);
    } catch (err) {
      setError((err as Error).message);
      console.error('Failed to init provider:', err);
    }
  }, [getActiveConfig, activeConfigId]);

  // 加载文件列表
  const loadFiles = useCallback(async () => {
    const activeConfig = getActiveConfig();
    if (!provider || !activeConfig) return;

    setLoading(true);
    try {
      const fileList = await provider.listFiles(currentPath, activeConfig.bucket);
      setFiles(fileList);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      console.error('Failed to load files:', err);
    } finally {
      setLoading(false);
    }
  }, [provider, getActiveConfig, currentPath, setFiles, setLoading]);

  // 导航到目录
  const navigate = useCallback(
    async (path: string) => {
      setCurrentPath(path);
    },
    [setCurrentPath]
  );

  // 刷新文件列表
  const refresh = useCallback(async () => {
    await loadFiles();
  }, [loadFiles]);

  // 删除文件
  const deleteFile = useCallback(
    async (path: string) => {
      const activeConfig = getActiveConfig();
      if (!provider || !activeConfig) return;

      try {
        await provider.deleteFile(path, activeConfig.bucket);
        await refresh();
      } catch (err) {
        throw new Error(`删除失败: ${(err as Error).message}`);
      }
    },
    [provider, getActiveConfig, refresh]
  );

  // 移动文件
  const moveFile = useCallback(
    async (sourcePath: string, targetPath: string) => {
      const activeConfig = getActiveConfig();
      if (!provider || !activeConfig) return;

      try {
        await provider.moveFile(sourcePath, targetPath, activeConfig.bucket);
        await refresh();
      } catch (err) {
        throw new Error(`移动失败: ${(err as Error).message}`);
      }
    },
    [provider, getActiveConfig, refresh]
  );

  // 获取文件链接
  const getFileUrl = useCallback(
    async (path: string) => {
      const activeConfig = getActiveConfig();
      if (!provider || !activeConfig) return '';

      try {
        return await provider.getFileUrl(path, activeConfig.bucket);
      } catch (err) {
        throw new Error(`获取链接失败: ${(err as Error).message}`);
      }
    },
    [provider, getActiveConfig]
  );

  // 创建文件夹
  const createFolder = useCallback(
    async (folderName: string) => {
      const activeConfig = getActiveConfig();
      if (!provider || !activeConfig) return;

      try {
        const folderPath = currentPath === '/' ? folderName : `${currentPath}/${folderName}`;
        await provider.createFolder(folderPath, activeConfig.bucket);
        await refresh();
      } catch (err) {
        throw new Error(`创建文件夹失败: ${(err as Error).message}`);
      }
    },
    [provider, getActiveConfig, currentPath, refresh]
  );

  // 初始化时加载
  useEffect(() => {
    initProvider();
  }, [initProvider]);

  // provider 变化时加载文件
  useEffect(() => {
    if (provider) {
      loadFiles();
    }
  }, [provider, currentPath, loadFiles]);

  return {
    provider,
    files,
    loading,
    error,
    currentPath,
    navigate,
    refresh,
    deleteFile,
    moveFile,
    getFileUrl,
    createFolder,
  };
}
