import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { useConfigStore } from '@/store/config';
import type { CloudProvider, CloudConfigItem } from '@/types';
import { getBucketHelp, getBucketPlaceholder, validateBucketName } from '@/utils/configValidation';

interface ConfigPanelProps {
  onBack: () => void;
}

/**
 * 配置管理面板（在抽屉内显示）
 */
export const ConfigPanel: React.FC<ConfigPanelProps> = ({ onBack }) => {
  const { configs, addConfig, updateConfig, deleteConfig, getActiveConfig } = useConfigStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [bucketError, setBucketError] = useState('');

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    provider: 'aliyun' as CloudProvider,
    region: '',
    bucket: '',
    accessKeyId: '',
    accessKeySecret: '',
  });

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: '',
      provider: 'aliyun',
      region: '',
      bucket: '',
      accessKeyId: '',
      accessKeySecret: '',
    });
    setEditingId(null);
    setShowNewForm(false);
    setBucketError('');
  };

  // 开始编辑
  const startEdit = async (config: CloudConfigItem) => {
    // 加载凭证
    const response = await chrome.runtime.sendMessage({
      action: 'getCredentials',
      configId: config.id,
    });

    setFormData({
      name: config.name,
      provider: config.provider,
      region: config.region,
      bucket: config.bucket,
      accessKeyId: response.data?.ak || '',
      accessKeySecret: response.data?.sk || '',
    });
    setEditingId(config.id);
    setShowNewForm(false);
    setBucketError('');
  };

  // 保存配置
  const handleSave = async () => {
    if (!formData.name || !formData.region || !formData.bucket) {
      alert('请填写完整信息');
      return;
    }

    if (!formData.accessKeyId || !formData.accessKeySecret) {
      alert('请填写 AccessKey');
      return;
    }

    const normalizedBucket = formData.bucket.trim();
    const bucketValidation = validateBucketName(formData.provider, normalizedBucket);
    if (!bucketValidation.valid) {
      setBucketError(bucketValidation.message || 'Bucket 名称不符合规范');
      return;
    }

    setBucketError('');

    try {
      let configId: string;

      if (editingId) {
        // 更新现有配置
        updateConfig(editingId, {
          name: formData.name,
          provider: formData.provider,
          region: formData.region,
          bucket: normalizedBucket,
        });
        configId = editingId;
      } else {
        // 新增配置
        configId = addConfig({
          name: formData.name,
          provider: formData.provider,
          region: formData.region,
          bucket: normalizedBucket,
        });
      }

      // 保存凭证
      await chrome.runtime.sendMessage({
        action: 'setCredentials',
        configId,
        accessKeyId: formData.accessKeyId,
        accessKeySecret: formData.accessKeySecret,
      });

      resetForm();
      alert('保存成功！');
    } catch (err) {
      alert('保存失败：' + (err as Error).message);
    }
  };

  // 删除配置
  const handleDelete = async (configId: string) => {
    if (!confirm('确定删除此配置？')) return;

    try {
      // 删除凭证
      await chrome.runtime.sendMessage({
        action: 'removeCredentials',
        configId,
      });

      // 删除配置
      deleteConfig(configId);
    } catch (err) {
      alert('删除失败：' + (err as Error).message);
    }
  };

  return (
    <div className="config-panel">
      <div className="config-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={20} />
          返回
        </button>
        <h2>配置管理</h2>
      </div>

      <div className="config-content">
        {/* 配置列表 */}
        {!showNewForm && !editingId && (
          <>
            <div className="config-list">
              {configs.map((config) => (
                <div key={config.id} className="config-item">
                  <div className="config-item-info">
                    <h4>{config.name}</h4>
                    <p>
                      {config.provider} · {config.region} · {config.bucket}
                    </p>
                  </div>
                  <div className="config-item-actions">
                    <button onClick={() => startEdit(config)} title="编辑">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(config.id)} title="删除">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {configs.length === 0 && (
                <div className="empty-hint">
                  <p>暂无配置，点击下方按钮添加</p>
                </div>
              )}
            </div>

            <button className="add-config-button" onClick={() => setShowNewForm(true)}>
              <Plus size={20} />
              添加新配置
            </button>
          </>
        )}

        {/* 新增/编辑表单 */}
        {(showNewForm || editingId) && (
          <div className="config-form">
            <div className="form-group">
              <label>配置名称</label>
              <input
                type="text"
                placeholder="如：公司阿里云、个人腾讯云"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>云厂商</label>
              <select
                value={formData.provider}
                onChange={(e) => {
                  setFormData({ ...formData, provider: e.target.value as CloudProvider });
                  setBucketError('');
                }}
              >
                <option value="aliyun">阿里云 OSS</option>
                <option value="tencent">腾讯云 COS</option>
                <option value="qiniu">七牛云 Kodo</option>
                <option value="aws">AWS S3</option>
              </select>
            </div>

            <div className="form-group">
              <label>Region（地域）</label>
              <input
                type="text"
                placeholder="如：oss-cn-hangzhou"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Bucket 名称</label>
              <input
                type="text"
                placeholder={getBucketPlaceholder(formData.provider)}
                value={formData.bucket}
                aria-invalid={Boolean(bucketError)}
                aria-describedby="bucket-help bucket-error"
                onChange={(e) => {
                  const bucket = e.target.value;
                  setFormData({ ...formData, bucket });
                  if (bucketError) {
                    const result = validateBucketName(formData.provider, bucket);
                    setBucketError(result.valid ? '' : result.message || 'Bucket 名称不符合规范');
                  }
                }}
                onBlur={() => {
                  if (!formData.bucket.trim()) return;
                  const result = validateBucketName(formData.provider, formData.bucket);
                  setBucketError(result.valid ? '' : result.message || 'Bucket 名称不符合规范');
                }}
              />
              <small id="bucket-help" className="field-hint">
                {getBucketHelp(formData.provider)}
              </small>
              {bucketError && (
                <small id="bucket-error" className="field-error" role="alert">
                  {bucketError}
                </small>
              )}
            </div>

            <div className="form-group">
              <label>Access Key ID</label>
              <input
                type="text"
                placeholder="请输入 AccessKeyId"
                value={formData.accessKeyId}
                onChange={(e) => setFormData({ ...formData, accessKeyId: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Access Key Secret</label>
              <input
                type="password"
                placeholder="请输入 AccessKeySecret"
                value={formData.accessKeySecret}
                onChange={(e) => setFormData({ ...formData, accessKeySecret: e.target.value })}
              />
            </div>

            <div className="form-actions">
              <button className="btn-cancel" onClick={resetForm}>
                <X size={16} />
                取消
              </button>
              <button className="btn-save" onClick={handleSave}>
                <Check size={16} />
                保存
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
