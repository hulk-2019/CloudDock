import type { CloudProvider } from '@/types';

const IP_ADDRESS_PATTERN = /^(?:\d{1,3}\.){3}\d{1,3}$/;

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

const invalid = (message: string): ValidationResult => ({ valid: false, message });
const valid = (): ValidationResult => ({ valid: true });

/**
 * Validate the Bucket field before the cloud SDK is initialized.
 * The form expects a Bucket name, not a console URL or endpoint.
 */
export function validateBucketName(provider: CloudProvider, rawBucket: string): ValidationResult {
  const bucket = rawBucket.trim();

  if (!bucket) {
    return invalid('请输入 Bucket 名称');
  }

  if (/^https?:\/\//i.test(bucket) || bucket.includes('/') || bucket.includes('\\')) {
    return invalid('请只填写 Bucket 名称，不要填写 URL、Endpoint 或路径');
  }

  switch (provider) {
    case 'aliyun':
      if (bucket.length < 3 || bucket.length > 63) {
        return invalid('阿里云 OSS Bucket 名称长度必须为 3–63 个字符');
      }
      if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(bucket)) {
        return invalid('仅支持小写字母、数字和连字符（-），且必须以字母或数字开头和结尾');
      }
      return valid();

    case 'tencent': {
      const separatorIndex = bucket.lastIndexOf('-');
      const bucketName = bucket.slice(0, separatorIndex);
      const appId = bucket.slice(separatorIndex + 1);

      if (separatorIndex <= 0 || !/^\d+$/.test(appId)) {
        return invalid('腾讯云 COS Bucket 需填写完整名称，例如 my-bucket-1250000000');
      }
      if (bucketName.length > 50 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(bucketName)) {
        return invalid('BucketName 仅支持小写字母、数字和连字符，长度不能超过 50 个字符');
      }
      return valid();
    }

    case 'aws':
      if (bucket.length < 3 || bucket.length > 63) {
        return invalid('AWS S3 Bucket 名称长度必须为 3–63 个字符');
      }
      if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(bucket)) {
        return invalid('仅支持小写字母、数字、点（.）和连字符（-），且必须以字母或数字开头和结尾');
      }
      if (bucket.includes('..') || IP_ADDRESS_PATTERN.test(bucket)) {
        return invalid('AWS S3 Bucket 名称不能包含连续的点，也不能使用 IP 地址格式');
      }
      return valid();

    case 'qiniu':
      if (bucket.length < 3 || bucket.length > 63) {
        return invalid('七牛云空间名称长度必须为 3–63 个字符');
      }
      if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(bucket)) {
        return invalid('空间名称仅支持小写字母、数字和连字符（-），且必须以字母或数字开头和结尾');
      }
      return valid();
  }
}

export function getBucketPlaceholder(provider: CloudProvider): string {
  const placeholders: Record<CloudProvider, string> = {
    aliyun: '例如：my-assets',
    tencent: '例如：my-assets-1250000000',
    qiniu: '例如：my-assets',
    aws: '例如：my-assets',
  };

  return placeholders[provider];
}

export function getBucketHelp(provider: CloudProvider): string {
  const help: Record<CloudProvider, string> = {
    aliyun: '填写 OSS 控制台中的 Bucket 名称，不要填写访问域名。',
    tencent: '需包含数字 APPID 后缀，不要填写 cos 域名。',
    qiniu: '填写对象存储空间名称，不要填写 CDN 域名。',
    aws: '填写 S3 Bucket 名称，不要填写 ARN 或访问地址。',
  };

  return help[provider];
}
