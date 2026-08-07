import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  ListBucketsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import { S3_MIN_PART_SIZE_BYTES, UPLOAD_PARALLEL_LIMIT, UPLOAD_PART_SIZE_BYTES } from './base';
import type { ICloudStorageProvider } from './base';
import type { CloudConfig, FileItem, BucketInfo, UploadResult } from '@/types';
import { joinPath } from '@/utils/file';

/**
 * AWS S3 服务实现
 */
export class AWSS3Service implements ICloudStorageProvider {
  private client: S3Client | null = null;
  private config: CloudConfig | null = null;

  async init(config: CloudConfig): Promise<void> {
    this.config = config;
    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.accessKeySecret,
      },
    });
  }

  async listFiles(path: string, bucket: string): Promise<FileItem[]> {
    if (!this.client) throw new Error('Client not initialized');

    const prefix = path === '/' || path === '' ? '' : path.endsWith('/') ? path : `${path}/`;

    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      Delimiter: '/',
      MaxKeys: 1000,
    });

    const response = await this.client.send(command);
    const files: FileItem[] = [];

    // 处理文件夹
    if (response.CommonPrefixes) {
      for (const item of response.CommonPrefixes) {
        if (!item.Prefix) continue;

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
    if (response.Contents) {
      for (const item of response.Contents) {
        if (item.Key === prefix || !item.Key) continue;

        files.push({
          name: item.Key.replace(prefix, ''),
          path: item.Key,
          size: item.Size || 0,
          type: 'file',
          lastModified: item.LastModified || new Date(),
        });
      }
    }

    return files;
  }

  async uploadFile(
    file: File,
    path: string,
    bucket: string,
    onProgress?: (percent: number) => void
  ): Promise<UploadResult> {
    if (!this.client) throw new Error('Client not initialized');

    const fullPath = joinPath(path, file.name);

    // lib-storage 的 Upload 对大文件自动走 multipart，小文件退化为单次 PUT，
    // 且提供真实的上传进度事件（PutObjectCommand 做不到）。
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: bucket,
        Key: fullPath,
        Body: file,
        ContentType: file.type,
      },
      partSize: Math.max(UPLOAD_PART_SIZE_BYTES, S3_MIN_PART_SIZE_BYTES),
      queueSize: UPLOAD_PARALLEL_LIMIT,
      leavePartsOnError: false,
    });

    upload.on('httpUploadProgress', ({ loaded, total }) => {
      if (onProgress && loaded !== undefined && total) {
        onProgress(Math.round((loaded / total) * 100));
      }
    });

    await upload.done();

    return {
      url: `https://${bucket}.s3.${this.config!.region}.amazonaws.com/${fullPath}`,
      name: file.name,
      size: file.size,
      path: fullPath,
    };
  }

  async deleteFile(path: string, bucket: string): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: path,
    });

    await this.client.send(command);
  }

  async copyFile(sourcePath: string, targetPath: string, bucket: string): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    // CopySource 要求 URL 编码的对象键，否则中文/特殊字符文件名会复制失败。
    const encodedSource = sourcePath.split('/').map(encodeURIComponent).join('/');
    const command = new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${encodedSource}`,
      Key: targetPath,
    });

    await this.client.send(command);
  }

  async moveFile(sourcePath: string, targetPath: string, bucket: string): Promise<void> {
    await this.copyFile(sourcePath, targetPath, bucket);
    await this.deleteFile(sourcePath, bucket);
  }

  async getFileUrl(path: string, bucket: string, expiresIn: number = 3600): Promise<string> {
    if (!this.client) throw new Error('Client not initialized');

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: path,
    });

    return await getSignedUrl(this.client, command, { expiresIn });
  }

  async listBuckets(): Promise<BucketInfo[]> {
    if (!this.client) throw new Error('Client not initialized');

    const command = new ListBucketsCommand({});
    const response = await this.client.send(command);

    return (response.Buckets || []).map((bucket) => ({
      name: bucket.Name || '',
      region: '', // AWS 不在列表响应中返回 region
      creationDate: bucket.CreationDate || new Date(),
    }));
  }

  async createFolder(path: string, bucket: string): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    const folderPath = path.endsWith('/') ? path : `${path}/`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: folderPath,
      Body: new Uint8Array(0),
    });

    await this.client.send(command);
  }
}
