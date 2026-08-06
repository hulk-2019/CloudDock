import CryptoJS from 'crypto-js';
import type { EncryptedCredentials } from '@/types';

// 加密密钥（实际生产环境应该使用更安全的密钥管理方案）
const ENCRYPTION_KEY = 'clouddock-secret-key-v1-2026';

/**
 * 安全存储管理类
 * 负责加密存储和读取敏感信息
 */
export class SecureStorage {
  /**
   * 加密并存储凭证（按配置 ID）
   */
  static async setCredentials(
    configId: string,
    accessKeyId: string,
    accessKeySecret: string
  ): Promise<void> {
    const encrypted: EncryptedCredentials = {
      ak: CryptoJS.AES.encrypt(accessKeyId, ENCRYPTION_KEY).toString(),
      sk: CryptoJS.AES.encrypt(accessKeySecret, ENCRYPTION_KEY).toString(),
    };

    await chrome.storage.local.set({
      [`credentials_${configId}`]: encrypted,
    });
  }

  /**
   * 读取并解密凭证（按配置 ID）
   */
  static async getCredentials(
    configId: string
  ): Promise<{ ak: string; sk: string } | null> {
    const result = await chrome.storage.local.get(`credentials_${configId}`);
    const encrypted = result[`credentials_${configId}`] as EncryptedCredentials | undefined;

    if (!encrypted) return null;

    try {
      const ak = CryptoJS.AES.decrypt(encrypted.ak, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
      const sk = CryptoJS.AES.decrypt(encrypted.sk, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);

      return { ak, sk };
    } catch (error) {
      console.error('Failed to decrypt credentials:', error);
      return null;
    }
  }

  /**
   * 删除凭证（按配置 ID）
   */
  static async removeCredentials(configId: string): Promise<void> {
    await chrome.storage.local.remove(`credentials_${configId}`);
  }

  /**
   * 检查是否已配置凭证
   */
  static async hasCredentials(configId: string): Promise<boolean> {
    const credentials = await this.getCredentials(configId);
    return credentials !== null;
  }
}

/**
 * 用户配置管理
 */
export class ConfigStorage {
  /**
   * 保存用户配置
   */
  static async setConfig(key: string, value: any): Promise<void> {
    await chrome.storage.local.set({ [key]: value });
  }

  /**
   * 读取用户配置
   */
  static async getConfig<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    const result = await chrome.storage.local.get(key);
    return result[key] !== undefined ? result[key] : defaultValue;
  }

  /**
   * 删除配置
   */
  static async removeConfig(key: string): Promise<void> {
    await chrome.storage.local.remove(key);
  }

  /**
   * 清空所有配置
   */
  static async clearAll(): Promise<void> {
    await chrome.storage.local.clear();
  }
}
