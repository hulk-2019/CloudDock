import * as qiniu from 'qiniu-js';
import type { ICloudStorageProvider } from './base';
import type { CloudConfig, FileItem, BucketInfo, UploadResult } from '@/types';

/**
 * 七牛云服务实现
 * 注意：七牛云客户端 SDK 功能有限，部分操作需要服务端支持
 */
export class QiniuService implements ICloudStorageProvider {
  private config: CloudConfig | null = null;

  async init(config: CloudConfig): Promise<void> {
    this.config = config;
  }

  async listFiles(path: string, bucket: string): Promise<FileItem[]> {
    // 七牛云的 JS SDK 不支持列举文件，需要通过服务端 API
    // 这里返回空数组，实际使用时需要自建后端 API
    throw new Error('七牛云 JS SDK 不支持文件列举，请使用服务端 API');
  }

  async uploadFile(
    file: File,
    path: string,
    bucket: string,
    onProgress?: (percent: number) => void
  ): Promise<UploadResult> {
    if (!this.config) throw new Error('Client not initialized');

    // 七牛云上传需要 token，这里需要从服务端获取
    // 实际使用时需要实现 getUploadToken 方法
    const token = await this.getUploadToken(bucket);

    const fullPath = path === '/' ? file.name : `${path}/${file.name}`;

    const observable = qiniu.upload(
      file,
      fullPath,
      token,
      {},
      {
        useCdnDomain: true,
        region: qiniu.region.z0, // 根据配置选择区域
      }
    );

    return new Promise((resolve, reject) => {
      const subscription = observable.subscribe({
        next: (result) => {
          if (onProgress && result.total) {
            onProgress((result.total.percent || 0));
          }
        },
        error: (err) => {
          reject(err);
        },
        complete: (result) => {
          resolve({
            url: `https://${this.config!.endpoint}/${result.key}`,
            name: file.name,
            size: file.size,
            path: fullPath,
          });
        },
      });
    });
  }

  private async getUploadToken(bucket: string): Promise<string> {
    // 这里需要从你的后端服务获取上传 token
    // 示例：return await fetch('/api/qiniu/token').then(r => r.text());
    throw new Error('需要实现 getUploadToken 方法从服务端获取上传凭证');
  }

  async deleteFile(path: string, bucket: string): Promise<void> {
    throw new Error('七牛云 JS SDK 不支持删除操作，请使用服务端 API');
  }

  async copyFile(sourcePath: string, targetPath: string, bucket: string): Promise<void> {
    throw new Error('七牛云 JS SDK 不支持复制操作，请使用服务端 API');
  }

  async moveFile(sourcePath: string, targetPath: string, bucket: string): Promise<void> {
    throw new Error('七牛云 JS SDK 不支持移动操作，请使用服务端 API');
  }

  async getFileUrl(path: string, bucket: string, expiresIn?: number): Promise<string> {
    if (!this.config) throw new Error('Client not initialized');
    return `https://${this.config.endpoint}/${path}`;
  }

  async listBuckets(): Promise<BucketInfo[]> {
    throw new Error('七牛云 JS SDK 不支持列举 Bucket，请使用服务端 API');
  }

  async createFolder(path: string, bucket: string): Promise<void> {
    // 七牛云没有文件夹概念，只有带前缀的文件
    // 可以通过上传一个空文件来模拟
    throw new Error('七牛云不支持创建文件夹');
  }
}
