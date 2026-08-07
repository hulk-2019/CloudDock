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

interface ProviderBinding {
  provider: ICloudStorageProvider;
  configId: string;
  /** 创建实例时配置行的 updatedAt：配置被编辑后旧实例立即失效。 */
  configVersion: number;
}

export function useCloudStorage() {
  const [binding, setBinding] = useState<ProviderBinding | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { getActiveConfig, currentPath, setCurrentPath, activeConfigId } = useConfigStore();
  // 编辑配置不改变 activeConfigId，必须同时订阅配置内容的版本（updatedAt），
  // 否则修正错误配置后 provider 不会重建，刷新仍用旧客户端报错。
  const activeConfigVersion = useConfigStore(
    (state) => state.configs.find((item) => item.id === state.activeConfigId)?.updatedAt ?? null
  );
  const { files, loading, setFiles, setLoading, upsertFile } = useFileStore();
  const normalizedCurrentPath = normalizeDirectoryPath(currentPath);

  // provider 与创建它的配置绑定；切换/编辑配置后、新实例就绪前，旧实例一律视为不可用，
  // 否则加载列表的 effect 会在同一次渲染里拿着旧配置的客户端把旧列表再拉一遍。
  const provider =
    binding && binding.configId === activeConfigId && binding.configVersion === activeConfigVersion
      ? binding.provider
      : null;

  const initProvider = useCallback(async () => {
    const activeConfig = getActiveConfig();

    if (!activeConfig) {
      setError(null);
      setBinding(null);
      setFiles([]);
      return;
    }

    // 切换配置后立即清空旧列表；若新配置初始化失败，界面应显示错误而不是上一配置的文件。
    setFiles([]);

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
        setBinding(null);
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
      // 等待期间用户可能又切换或再次编辑了配置，过期实例直接丢弃。
      const latest = useConfigStore.getState().getActiveConfig();
      if (!latest || latest.id !== activeConfig.id || latest.updatedAt !== activeConfig.updatedAt) {
        return;
      }
      setBinding({
        provider: providerInstance,
        configId: activeConfig.id,
        configVersion: activeConfig.updatedAt,
      });
      setError(null);
    } catch (initError) {
      setBinding(null);
      setError((initError as Error).message);
      console.error('Failed to init provider:', initError);
    }
  }, [activeConfigId, activeConfigVersion, getActiveConfig, setFiles]);

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
    const activeConfig = getActiveConfig();
    if (!provider || !activeConfig) return null;

    setLoading(true);
    try {
      const fileList = await fetchFiles();
      // 请求在途时配置可能已切换，过期结果不能写进列表。
      if (useConfigStore.getState().activeConfigId !== activeConfig.id) return null;
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
      const activeConfig = getActiveConfig();
      if (!provider || !activeConfig) return false;

      upsertFile(optimisticItem);
      setLoading(true);
      try {
        for (const delay of REFRESH_RETRY_DELAYS) {
          if (delay > 0) await wait(delay);
          if (useConfigStore.getState().activeConfigId !== activeConfig.id) return false;

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

  /** 删除文件或文件夹（以 / 结尾视为文件夹，会递归删除全部内容）。 */
  const deleteFile = useCallback(
    async (path: string) => {
      const activeConfig = getActiveConfig();
      if (!provider || !activeConfig) return;
      const bucket = activeConfig.bucket;

      const removePath = async (targetPath: string): Promise<void> => {
        if (!targetPath.endsWith('/')) {
          await provider.deleteFile(targetPath, bucket);
          return;
        }
        const children = await provider.listFiles(targetPath, bucket);
        for (const child of children) {
          await removePath(child.path);
        }
        // 删除不存在的占位对象各厂商都返回成功，这里失败属于真实错误，需要暴露出来。
        await provider.deleteFile(targetPath, bucket);
      };

      try {
        await removePath(path);
        await refresh();
      } catch (deleteError) {
        throw new Error(`删除失败: ${(deleteError as Error).message}`);
      }
    },
    [getActiveConfig, provider, refresh]
  );

  /** 列出任意目录内容，不改动全局文件列表状态（用于移动前的同名检测）。 */
  const listDirectory = useCallback(
    async (path: string): Promise<FileItem[]> => {
      const activeConfig = getActiveConfig();
      if (!provider || !activeConfig) return [];
      return provider.listFiles(normalizeDirectoryPath(path), activeConfig.bucket);
    },
    [getActiveConfig, provider]
  );

  /**
   * 移动文件或文件夹（以 / 结尾视为文件夹）。
   * 对象存储没有文件夹的原子移动语义：文件夹是前缀 + 可选的 0 字节占位对象，
   * 必须逐层把子项复制到新前缀再删除源，否则只会搬走占位对象、丢下全部内容。
   */
  const moveFile = useCallback(
    async (sourcePath: string, targetPath: string) => {
      const activeConfig = getActiveConfig();
      if (!provider || !activeConfig) return;
      const bucket = activeConfig.bucket;

      const moveFolderRecursive = async (sourceDir: string, targetDir: string): Promise<void> => {
        try {
          await provider.createFolder(targetDir, bucket);
        } catch {
          // 部分厂商没有文件夹占位对象（纯前缀），创建失败不影响子项迁移。
        }

        // 单次列举最多返回 1000 项，循环分批迁移直到源目录清空；
        // 若已处理的子项在下一轮列举中仍然存在，说明迁移未生效，必须报错而不是留下半移动状态。
        let children = await provider.listFiles(sourceDir, bucket);
        while (children.length > 0) {
          for (const child of children) {
            try {
              if (child.type === 'folder') {
                await moveFolderRecursive(child.path, `${targetDir}${child.name}/`);
              } else {
                await provider.moveFile(child.path, `${targetDir}${child.name}`, bucket);
              }
            } catch (childError) {
              throw new Error(`迁移「${child.path}」失败: ${(childError as Error).message}`);
            }
          }

          const remaining = await provider.listFiles(sourceDir, bucket);
          const stuck = remaining.find((item) =>
            children.some((child) => child.path === item.path)
          );
          if (stuck) {
            throw new Error(`「${stuck.path}」迁移后仍存在于源目录，已中止以避免数据不一致`);
          }
          children = remaining;
        }

        // 删除不存在的 key 各厂商都返回成功，这里失败属于真实错误（如权限不足），不能静默吞掉。
        try {
          await provider.deleteFile(sourceDir, bucket);
        } catch (placeholderError) {
          throw new Error(
            `删除源目录「${sourceDir}」失败: ${(placeholderError as Error).message}`
          );
        }
      };

      try {
        if (sourcePath.endsWith('/')) {
          const targetDir = targetPath.endsWith('/') ? targetPath : `${targetPath}/`;
          if (targetDir === sourcePath) return;
          if (targetDir.startsWith(sourcePath)) {
            throw new Error('不能将文件夹移动到自身或其子目录中');
          }
          await moveFolderRecursive(sourcePath, targetDir);
        } else {
          await provider.moveFile(sourcePath, targetPath, bucket);
        }
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
    listDirectory,
    getFileUrl,
    createFolder,
  };
}
