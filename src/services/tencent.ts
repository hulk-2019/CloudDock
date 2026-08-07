import COS from 'cos-js-sdk-v5';
import { UPLOAD_PART_SIZE_BYTES } from './base';
import type { ICloudStorageProvider } from './base';
import type { CloudConfig, FileItem, BucketInfo, UploadResult } from '@/types';
import { joinPath } from '@/utils/file';

/**
 * 腾讯云 COS 服务实现
 */
export class TencentCOSService implements ICloudStorageProvider {
  private client: COS | null = null;
  private config: CloudConfig | null = null;

  async init(config: CloudConfig): Promise<void> {
    this.config = config;
    this.client = new COS({
      SecretId: config.accessKeyId,
      SecretKey: config.accessKeySecret,
    });
  }

  async listFiles(path: string, bucket: string): Promise<FileItem[]> {
    if (!this.client || !this.config) throw new Error('Client not initialized');

    const prefix = path === '/' || path === '' ? '' : path.endsWith('/') ? path : `${path}/`;

    return new Promise((resolve, reject) => {
      this.client!.getBucket(
        {
          Bucket: bucket,
          Region: this.config!.region,
          Prefix: prefix,
          Delimiter: '/',
          MaxKeys: 1000,
        },
        (err, data) => {
          if (err) return reject(err);

          const files: FileItem[] = [];

          // 处理文件夹
          if (data.CommonPrefixes) {
            for (const item of data.CommonPrefixes) {
              files.push({
                name: item.Prefix.replace(prefix, '').replace(/\/$/, ''),
                path: item.Prefix,
                size: 0,
                type: 'folder',
                lastModified: new Date(),
              });
            }
          }

          // 处理文件
          if (data.Contents) {
            for (const item of data.Contents) {
              if (item.Key === prefix) continue;

              files.push({
                name: item.Key.replace(prefix, ''),
                path: item.Key,
                size: parseInt(item.Size),
                type: 'file',
                lastModified: new Date(item.LastModified),
              });
            }
          }

          resolve(files);
        }
      );
    });
  }

  async uploadFile(
    file: File,
    path: string,
    bucket: string,
    onProgress?: (percent: number) => void
  ): Promise<UploadResult> {
    if (!this.client || !this.config) throw new Error('Client not initialized');

    const fullPath = joinPath(path, file.name);

    return new Promise((resolve, reject) => {
      // uploadFile 会在文件超过 SliceSize 时自动切换为分片上传（sliceUploadFile）。
      this.client!.uploadFile(
        {
          Bucket: bucket,
          Region: this.config!.region,
          Key: fullPath,
          Body: file,
          SliceSize: UPLOAD_PART_SIZE_BYTES,
          onProgress: (progressData) => {
            if (onProgress) {
              onProgress((progressData.percent || 0) * 100);
            }
          },
        },
        (err, data) => {
          if (err) return reject(err);

          resolve({
            url: `https://${data.Location}`,
            name: file.name,
            size: file.size,
            path: fullPath,
          });
        }
      );
    });
  }

  async deleteFile(path: string, bucket: string): Promise<void> {
    if (!this.client || !this.config) throw new Error('Client not initialized');

    return new Promise((resolve, reject) => {
      this.client!.deleteObject(
        {
          Bucket: bucket,
          Region: this.config!.region,
          Key: path,
        },
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  async copyFile(sourcePath: string, targetPath: string, bucket: string): Promise<void> {
    if (!this.client || !this.config) throw new Error('Client not initialized');

    // CopySource 中的对象键必须 URL 编码，否则中文/特殊字符文件名会报 NoSuchKey。
    const encodedSource = sourcePath.split('/').map(encodeURIComponent).join('/');

    return new Promise((resolve, reject) => {
      this.client!.putObjectCopy(
        {
          Bucket: bucket,
          Region: this.config!.region,
          Key: targetPath,
          CopySource: `${bucket}.cos.${this.config!.region}.myqcloud.com/${encodedSource}`,
        },
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  async moveFile(sourcePath: string, targetPath: string, bucket: string): Promise<void> {
    await this.copyFile(sourcePath, targetPath, bucket);
    await this.deleteFile(sourcePath, bucket);
  }

  async getFileUrl(path: string, bucket: string, expiresIn: number = 3600): Promise<string> {
    if (!this.client || !this.config) throw new Error('Client not initialized');

    return new Promise((resolve, reject) => {
      this.client!.getObjectUrl(
        {
          Bucket: bucket,
          Region: this.config!.region,
          Key: path,
          Sign: true,
          Expires: expiresIn,
        },
        (err, data) => {
          if (err) return reject(err);
          resolve(data.Url);
        }
      );
    });
  }

  async listBuckets(): Promise<BucketInfo[]> {
    if (!this.client) throw new Error('Client not initialized');

    return new Promise((resolve, reject) => {
      this.client!.getService((err, data) => {
        if (err) return reject(err);

        const buckets = data.Buckets.map((bucket) => ({
          name: bucket.Name,
          region: bucket.Location,
          creationDate: new Date(bucket.CreationDate),
        }));

        resolve(buckets);
      });
    });
  }

  async createFolder(path: string, bucket: string): Promise<void> {
    if (!this.client || !this.config) throw new Error('Client not initialized');

    const folderPath = path.endsWith('/') ? path : `${path}/`;

    return new Promise((resolve, reject) => {
      this.client!.putObject(
        {
          Bucket: bucket,
          Region: this.config!.region,
          Key: folderPath,
          Body: '',
        },
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }
}
