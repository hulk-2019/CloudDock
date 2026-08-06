// 云存储厂商类型
export type CloudProvider = 'aliyun' | 'tencent' | 'qiniu' | 'aws';

// 云存储配置
export interface CloudConfig {
  provider: CloudProvider;
  accessKeyId: string;
  accessKeySecret: string;
  region: string;
  bucket: string;
  endpoint?: string;
}

// 云存储配置项（带别名和 ID）
export interface CloudConfigItem {
  id: string; // 唯一标识
  name: string; // 别名，如"公司阿里云"、"个人腾讯云"
  provider: CloudProvider;
  region: string;
  bucket: string;
  createdAt: number; // 创建时间戳
  updatedAt: number; // 更新时间戳
}

// 文件项
export interface FileItem {
  name: string;
  path: string;
  size: number;
  type: 'file' | 'folder';
  lastModified: Date;
  url?: string;
  mimeType?: string;
}

// Bucket 信息
export interface BucketInfo {
  name: string;
  region: string;
  creationDate: Date;
}

// 上传结果
export interface UploadResult {
  url: string;
  name: string;
  size: number;
  path: string;
}

// 上传进度
export interface UploadProgress {
  fileName: string;
  percent: number;
  loaded: number;
  total: number;
  status: 'uploading' | 'success' | 'error';
}

// 存储的凭证（加密后）- 现在按配置 ID 存储
export interface EncryptedCredentials {
  ak: string; // 加密后的 AccessKeyId
  sk: string; // 加密后的 AccessKeySecret
}

// 用户配置（简化版，只保存当前激活的配置 ID 和路径）
export interface UserConfig {
  activeConfigId: string | null; // 当前激活的配置 ID
  currentPath: string;
  floatingButtonPosition?: { x: number; y: number };
}

// 面包屑项
export interface BreadcrumbItem {
  name: string;
  path: string;
}

// 面包屑项
export interface BreadcrumbItem {
  name: string;
  path: string;
}
