import type { TranslationKey } from '@/i18n';
import type { CloudProvider } from '@/types';

const IP_ADDRESS_PATTERN = /^(?:\d{1,3}\.){3}\d{1,3}$/;

export interface ValidationResult {
  valid: boolean;
  message?: TranslationKey;
}

const invalid = (message: TranslationKey): ValidationResult => ({ valid: false, message });
const valid = (): ValidationResult => ({ valid: true });

/**
 * Validate the Bucket field before the cloud SDK is initialized.
 * The form expects a Bucket name, not a console URL or endpoint.
 */
export function validateBucketName(provider: CloudProvider, rawBucket: string): ValidationResult {
  const bucket = rawBucket.trim();

  if (!bucket) {
    return invalid('config.enterABucketName');
  }

  if (/^https?:\/\//i.test(bucket) || bucket.includes('/') || bucket.includes('\\')) {
    return invalid('config.enterOnlyTheBucketNameNotAUrlEndpointOrPath');
  }

  switch (provider) {
    case 'aliyun':
      if (bucket.length < 3 || bucket.length > 63) {
        return invalid('config.aliyunOssBucketNamesMustContain363Characters');
      }
      if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(bucket)) {
        return invalid('config.bucketLowercaseHyphenRules');
      }
      return valid();

    case 'tencent': {
      const separatorIndex = bucket.lastIndexOf('-');
      const bucketName = bucket.slice(0, separatorIndex);
      const appId = bucket.slice(separatorIndex + 1);

      if (separatorIndex <= 0 || !/^\d+$/.test(appId)) {
        return invalid('config.tencentBucketExample');
      }
      if (bucketName.length > 50 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(bucketName)) {
        return invalid('config.tencentBucketNameRules');
      }
      return valid();
    }

    case 'aws':
      if (bucket.length < 3 || bucket.length > 63) {
        return invalid('config.awsS3BucketNamesMustContain363Characters');
      }
      if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(bucket)) {
        return invalid('config.bucketLowercasePeriodHyphenRules');
      }
      if (bucket.includes('..') || IP_ADDRESS_PATTERN.test(bucket)) {
        return invalid('config.awsBucketInvalidDotsOrIp');
      }
      return valid();

    case 'qiniu':
      if (bucket.length < 3 || bucket.length > 63) {
        return invalid('config.qiniuKodoSpaceNamesMustContain363Characters');
      }
      if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(bucket)) {
        return invalid('config.qiniuBucketNameRules');
      }
      return valid();
  }
}

export function getBucketPlaceholder(provider: CloudProvider): TranslationKey {
  const placeholders: Record<CloudProvider, TranslationKey> = {
    aliyun: 'config.forExampleMyAssets',
    tencent: 'config.forExampleMyAssets1250000000',
    qiniu: 'config.forExampleMyAssets',
    aws: 'config.forExampleMyAssets',
  };

  return placeholders[provider];
}

export function getBucketHelp(provider: CloudProvider): TranslationKey {
  const help: Record<CloudProvider, TranslationKey> = {
    aliyun: 'config.aliyunBucketHelp',
    tencent: 'config.tencentBucketHelp',
    qiniu: 'config.enterTheObjectStorageSpaceNameNotACdnDomain',
    aws: 'config.enterTheS3BucketNameNotAnArnOrAccessUrl',
  };

  return help[provider];
}
