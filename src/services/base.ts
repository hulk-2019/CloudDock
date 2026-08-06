import type { CloudConfig, FileItem, BucketInfo, UploadResult } from '@/types';

/**
 * 云存储服务提供商接口
 * 所有云厂商的实现都必须遵循此接口
 */
export interface ICloudStorageProvider {
  /**
   * 初始化云存储客户端
   */
  init(config: CloudConfig): Promise<void>;

  /**
   * 获取文件列表
   * @param path 目录路径
   * @param bucket Bucket 名称
   */
  listFiles(path: string, bucket: string): Promise<FileItem[]>;

  /**
   * 上传文件
   * @param file 文件对象
   * @param path 上传路径
   * @param bucket Bucket 名称
   * @param onProgress 进度回调
   */
  uploadFile(
    file: File,
    path: string,
    bucket: string,
    onProgress?: (percent: number) => void
  ): Promise<UploadResult>;

  /**
   * 删除文件
   * @param path 文件路径
   * @param bucket Bucket 名称
   */
  deleteFile(path: string, bucket: string): Promise<void>;

  /**
   * 复制文件
   * @param sourcePath 源文件路径
   * @param targetPath 目标文件路径
   * @param bucket Bucket 名称
   */
  copyFile(sourcePath: string, targetPath: string, bucket: string): Promise<void>;

  /**
   * 移动文件（复制后删除）
   * @param sourcePath 源文件路径
   * @param targetPath 目标文件路径
   * @param bucket Bucket 名称
   */
  moveFile(sourcePath: string, targetPath: string, bucket: string): Promise<void>;

  /**
   * 获取文件访问 URL
   * @param path 文件路径
   * @param bucket Bucket 名称
   * @param expiresIn 过期时间（秒）
   */
  getFileUrl(path: string, bucket: string, expiresIn?: number): Promise<string>;

  /**
   * 获取 Bucket 列表
   */
  listBuckets(): Promise<BucketInfo[]>;

  /**
   * 创建文件夹
   * @param path 文件夹路径
   * @param bucket Bucket 名称
   */
  createFolder(path: string, bucket: string): Promise<void>;
}

/**
 * 云存储服务工厂
 */
export class CloudStorageFactory {
  private static instances = new Map<string, ICloudStorageProvider>();

  /**
   * 创建云存储服务实例
   */
  static async create(config: CloudConfig): Promise<ICloudStorageProvider> {
    const key = `${config.provider}_${config.bucket}`;

    // 复用已创建的实例
    if (this.instances.has(key)) {
      return this.instances.get(key)!;
    }

    let provider: ICloudStorageProvider;

    switch (config.provider) {
      case 'aliyun': {
        const { AliOSSService } = await import('./aliyun');
        provider = new AliOSSService();
        break;
      }
      case 'tencent': {
        const { TencentCOSService } = await import('./tencent');
        provider = new TencentCOSService();
        break;
      }
      case 'qiniu': {
        const { QiniuService } = await import('./qiniu');
        provider = new QiniuService();
        break;
      }
      case 'aws': {
        const { AWSS3Service } = await import('./aws');
        provider = new AWSS3Service();
        break;
      }
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }

    await provider.init(config);
    this.instances.set(key, provider);

    return provider;
  }

  /**
   * 清除缓存的实例
   */
  static clearCache() {
    this.instances.clear();
  }
}
