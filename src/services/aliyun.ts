import OSS from 'ali-oss';
import type { ICloudStorageProvider } from './base';
import type { CloudConfig, FileItem, BucketInfo, UploadResult } from '@/types';

/**
 * 阿里云 OSS 服务实现
 */
export class AliOSSService implements ICloudStorageProvider {
  private client: OSS | null = null;
  private config: CloudConfig | null = null;

  async init(config: CloudConfig): Promise<void> {
    this.config = config;

    // 临时禁用控制台警告
    const originalWarn = console.warn;
    console.warn = () => {};

    this.client = new OSS({
      region: config.region,
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      bucket: config.bucket,
      secure: true,
    });

    // 恢复 console.warn
    console.warn = originalWarn;
  }

  async listFiles(path: string, _bucket: string): Promise<FileItem[]> {
    if (!this.client) throw new Error('Client not initialized');

    // 确保路径以 / 结尾（如果不是根目录）
    const prefix = path === '/' || path === '' ? '' : path.endsWith('/') ? path : `${path}/`;

    const result = await this.client.list({
      prefix,
      delimiter: '/',
      'max-keys': 1000,
    }, {});

    const files: FileItem[] = [];

    // 处理文件夹
    if (result.prefixes) {
      for (const prefix of result.prefixes) {
        // 跳过当前目录本身
        if (prefix === path) continue;

        // 提取文件夹名称：移除前缀路径和尾部斜杠
        const folderName = prefix.slice(path.length).replace(/\/$/, '');

        // 跳过空名称和特殊目录
        if (!folderName || folderName === '.' || folderName === '..') continue;

        files.push({
          name: folderName,
          path: prefix,
          size: 0,
          type: 'folder',
          lastModified: new Date(),
        });
      }
    }

    // 处理文件
    if (result.objects) {
      for (const obj of result.objects) {
        // 跳过当前目录本身和文件夹标记文件
        if (obj.name === prefix || obj.name.endsWith('/')) continue;

        // 提取文件名：移除前缀路径
        const fileName = obj.name.slice(prefix.length);

        // 跳过空名称
        if (!fileName) continue;

        // 判断是否为图片或视频，生成签名 URL
        const isMedia = /\.(jpg|jpeg|png|gif|webp|bmp|mp4|webm|ogg|mov|avi)$/i.test(fileName);
        let fileUrl = obj.url;

        if (isMedia && this.client) {
          try {
            // 生成 1 小时有效期的签名 URL
            fileUrl = this.client.signatureUrl(obj.name, { expires: 3600 });
          } catch (err) {
            console.warn('Failed to generate signed URL for', obj.name, err);
          }
        }

        files.push({
          name: fileName,
          path: obj.name,
          size: obj.size,
          type: 'file',
          lastModified: new Date(obj.lastModified),
          url: fileUrl,
        });
      }
    }

    return files;
  }

  async uploadFile(
    file: File,
    path: string,
    _bucket: string,
    onProgress?: (percent: number) => void
  ): Promise<UploadResult> {
    if (!this.client) throw new Error('Client not initialized');

    const fullPath = path === '/' ? file.name : `${path}/${file.name}`;

    const result = await this.client.put(fullPath, file, {
      progress: (p: number) => {
        // OSS SDK 的 progress 参数范围是 0-1，转换为 0-100
        if (onProgress) {
          onProgress(Math.round(p * 100));
        }
      },
      headers: {},
      timeout: 60000,
    } as any);

    return {
      url: result.url,
      name: file.name,
      size: file.size,
      path: fullPath,
    };
  }

  async deleteFile(path: string, _bucket: string): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');
    await this.client.delete(path);
  }

  async copyFile(sourcePath: string, targetPath: string, _bucket: string): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');
    await this.client.copy(targetPath, sourcePath);
  }

  async moveFile(sourcePath: string, targetPath: string, bucket: string): Promise<void> {
    await this.copyFile(sourcePath, targetPath, bucket);
    await this.deleteFile(sourcePath, bucket);
  }

  async getFileUrl(path: string, _bucket: string, expiresIn: number = 3600): Promise<string> {
    if (!this.client) throw new Error('Client not initialized');
    return this.client.signatureUrl(path, { expires: expiresIn });
  }

  async listBuckets(): Promise<BucketInfo[]> {
    if (!this.client) throw new Error('Client not initialized');

    const result: any = await this.client.listBuckets({}, {});

    return ((result.buckets as any[]) || []).map((bucket: any) => ({
      name: bucket.name,
      region: bucket.region,
      creationDate: new Date(bucket.creationDate),
    }));
  }

  async createFolder(path: string, _bucket: string): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    // OSS 通过上传空文件来创建文件夹
    const folderPath = path.endsWith('/') ? path : `${path}/`;
    // 浏览器环境用 Blob 代替 Buffer
    await this.client.put(folderPath, new Blob(['']));
  }
}
