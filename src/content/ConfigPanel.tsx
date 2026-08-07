import { useMemo, useState } from 'react';
import { App, Button, Card, Empty, Form, Input, List, Select, Tag, Tooltip } from 'antd';
import { ArrowLeft, Check, Cloud, Edit2, Plus, Save, Trash2, X } from 'lucide-react';
import { useConfigStore } from '@/store/config';
import { useUIStore } from '@/store/ui';
import { cn } from '@/lib/utils';
import type { CloudConfigItem, CloudProvider } from '@/types';
import { getBucketHelp, getBucketPlaceholder, validateBucketName } from '@/utils/configValidation';
import { glassModalStyles } from './modalStyles';

interface ConfigPanelProps {
  onBack: () => void;
}

interface ConfigFormValues {
  name: string;
  provider: CloudProvider;
  region: string;
  bucket: string;
  accessKeyId: string;
  accessKeySecret: string;
}

const providerOptions = [
  { value: 'aliyun', label: '阿里云 OSS' },
  { value: 'tencent', label: '腾讯云 COS' },
  { value: 'qiniu', label: '七牛云 Kodo' },
  { value: 'aws', label: 'AWS S3' },
] satisfies Array<{ value: CloudProvider; label: string }>;

const providerLabel = Object.fromEntries(
  providerOptions.map((item) => [item.value, item.label])
) as Record<CloudProvider, string>;

const emptyForm: ConfigFormValues = {
  name: '',
  provider: 'aliyun',
  region: '',
  bucket: '',
  accessKeyId: '',
  accessKeySecret: '',
};

export function ConfigPanel({ onBack }: ConfigPanelProps) {
  const [form] = Form.useForm<ConfigFormValues>();
  const { message, modal } = App.useApp();
  const { configs, activeConfigId, addConfig, updateConfig, deleteConfig, setActiveConfig } =
    useConfigStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const provider = Form.useWatch('provider', form) ?? 'aliyun';

  const history = useMemo(
    () => [...configs].sort((left, right) => right.updatedAt - left.updatedAt),
    [configs]
  );

  const handleSelectConfig = (config: CloudConfigItem) => {
    if (config.id === activeConfigId) return;
    // 切换配置会重建 provider 并重置文件列表，上传中切换会让进行中的任务失去归属。
    const hasActiveUpload = useUIStore
      .getState()
      .uploadQueue.some((upload) => upload.status === 'uploading' || upload.status === 'pending');
    if (hasActiveUpload) {
      message.warning('有文件正在上传，请等待上传完成后再切换配置');
      return;
    }
    setActiveConfig(config.id);
  };

  const resetForm = () => {
    form.resetFields();
    form.setFieldsValue(emptyForm);
    setEditingId(null);
    setFormVisible(false);
  };

  const startCreate = () => {
    form.setFieldsValue(emptyForm);
    setEditingId(null);
    setFormVisible(true);
  };

  const startEdit = async (config: CloudConfigItem) => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getCredentials',
        configId: config.id,
      });

      form.setFieldsValue({
        name: config.name,
        provider: config.provider,
        region: config.region,
        bucket: config.bucket,
        accessKeyId: response.data?.ak ?? '',
        accessKeySecret: response.data?.sk ?? '',
      });
      setEditingId(config.id);
      setFormVisible(true);
    } catch (error) {
      message.error(`读取凭证失败：${(error as Error).message}`);
    }
  };

  const handleSave = async (values: ConfigFormValues) => {
    const bucket = values.bucket.trim();
    const bucketValidation = validateBucketName(values.provider, bucket);
    if (!bucketValidation.valid) {
      form.setFields([
        { name: 'bucket', errors: [bucketValidation.message ?? 'Bucket 名称不符合规范'] },
      ]);
      return;
    }

    setSaving(true);
    try {
      const configId = editingId
        ? editingId
        : addConfig({
            name: values.name.trim(),
            provider: values.provider,
            region: values.region.trim(),
            bucket,
          });

      if (editingId) {
        updateConfig(editingId, {
          name: values.name.trim(),
          provider: values.provider,
          region: values.region.trim(),
          bucket,
        });
      }

      const response = await chrome.runtime.sendMessage({
        action: 'setCredentials',
        configId,
        accessKeyId: values.accessKeyId.trim(),
        accessKeySecret: values.accessKeySecret.trim(),
      });

      if (response?.success === false) throw new Error(response.error ?? '凭证保存失败');
      message.success(editingId ? '配置已更新' : '配置已添加');
      resetForm();
    } catch (error) {
      message.error(`保存失败：${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (config: CloudConfigItem) => {
    modal.confirm({
      title: `删除“${config.name}”？`,
      content: '配置及本地保存的访问凭证将一并移除，此操作无法撤销。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      centered: true,
      styles: glassModalStyles,
      async onOk() {
        const response = await chrome.runtime.sendMessage({
          action: 'removeCredentials',
          configId: config.id,
        });
        if (response?.success === false) throw new Error(response.error ?? '删除凭证失败');
        deleteConfig(config.id);
        if (editingId === config.id) resetForm();
        message.success('配置已删除');
      },
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="text"
            aria-label="返回文件列表"
            icon={<ArrowLeft size={18} strokeWidth={2} />}
            onClick={onBack}
          />
          <div>
            <h2 className="m-0 text-lg font-semibold text-content">配置管理</h2>
            <p className="m-0 text-xs text-content-secondary">管理云存储连接与历史配置</p>
          </div>
        </div>
        <Button type="primary" icon={<Plus size={16} strokeWidth={2} />} onClick={startCreate}>
          添加
        </Button>
      </div>

      <div className="-mr-5 min-h-0 flex-1 space-y-4 overflow-y-auto pb-4 pr-5">
        <Card
          className="border-border/50 bg-surface/80 shadow-sm backdrop-blur-md"
          title={<span className="text-sm text-content">历史配置</span>}
          extra={<Tag bordered={false}>{configs.length} 条</Tag>}
          styles={{ body: { padding: 12 }, header: { borderBottom: '1px solid var(--color-border)' } }}
        >
          {history.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无历史配置" />
          ) : (
            <div role="radiogroup" aria-label="选择云存储配置">
              <List
                split={false}
                dataSource={history}
                renderItem={(config) => {
                  const active = config.id === activeConfigId;
                  return (
                    <List.Item
                      role="radio"
                      aria-checked={active}
                      tabIndex={0}
                      className={cn(
                        'group relative mb-2 cursor-pointer overflow-hidden rounded-sm border bg-surface px-4 py-3 shadow-sm transition-all duration-300 last:mb-0 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
                        active
                          ? 'border-primary ring-1 ring-primary'
                          : 'border-border hover:border-primary/50'
                      )}
                      onClick={() => handleSelectConfig(config)}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleSelectConfig(config);
                        }
                      }}
                    >
                      {active && (
                        <div className="absolute right-0 top-0 flex h-0 w-0 items-start justify-end border-[16px] border-transparent border-r-primary border-t-primary">
                          <Check size={12} strokeWidth={4} className="absolute -right-3 -top-3 text-white" />
                        </div>
                      )}
                      <div className="flex w-full center gap-3">
                        <span className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm transition-colors',
                          active ? 'border-primary/20 bg-primary/10 text-primary' : 'border-border bg-bg text-content-secondary'
                        )}>
                          <Cloud size={20} strokeWidth={2} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <strong className={cn('truncate text-sm transition-colors', active ? 'text-primary' : 'text-content')}>{config.name}</strong>
                          </div>
                          <p
                            className="my-1 truncate text-xs text-content-secondary"
                            title={`${config.region} · ${config.bucket}`}
                          >
                            {providerLabel[config.provider]} · {config.region} · {config.bucket}
                          </p>
                          <span className="text-[11px] text-content-secondary opacity-70">
                            更新于 {new Date(config.updatedAt).toLocaleString('zh-CN')}
                          </span>
                        </div>
                        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 xl:opacity-100">
                          <Tooltip title="编辑">
                            <Button
                              size="small"
                              type="text"
                              aria-label={`编辑 ${config.name}`}
                              icon={<Edit2 size={14} strokeWidth={2} />}
                              onClick={(event) => {
                                event.stopPropagation();
                                void startEdit(config);
                              }}
                            />
                          </Tooltip>
                          <Tooltip title="删除">
                            <Button
                              danger
                              size="small"
                              type="text"
                              aria-label={`删除 ${config.name}`}
                              icon={<Trash2 size={14} strokeWidth={2} />}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDelete(config);
                              }}
                            />
                          </Tooltip>
                        </div>
                      </div>
                    </List.Item>
                  );
                }}
              />
            </div>
          )}
        </Card>

        {formVisible && (
          <Card
            className="border-border/50 bg-surface/80 shadow-sm backdrop-blur-md"
            title={
              <span className="text-sm text-content">{editingId ? '编辑配置' : '添加配置'}</span>
            }
            extra={
              <Button
                type="text"
                size="small"
                aria-label="关闭表单"
                icon={<X size={15} strokeWidth={2} />}
                onClick={resetForm}
              />
            }
            styles={{ header: { borderBottom: '1px solid var(--color-border)' } }}
          >
            <Form<ConfigFormValues>
              form={form}
              layout="vertical"
              initialValues={emptyForm}
              requiredMark={false}
              onFinish={handleSave}
              className="[&_.ant-form-item-label>label]:text-content-secondary"
            >
              <Form.Item
                name="name"
                label="配置名称"
                rules={[
                  { required: true, whitespace: true, message: '请输入配置名称' },
                  {
                    validator: (_, value: string) => {
                      const name = value?.trim();
                      if (!name) return Promise.resolve();
                      // 编辑时排除自身，允许保存时名称不变。
                      const duplicated = configs.some(
                        (item) => item.name === name && item.id !== editingId
                      );
                      return duplicated
                        ? Promise.reject(new Error('已存在同名配置，请更换名称'))
                        : Promise.resolve();
                    },
                  },
                ]}
              >
                <Input placeholder="例如：公司阿里云" autoComplete="off" />
              </Form.Item>
              <Form.Item name="provider" label="云厂商" rules={[{ required: true }]}>
                <Select
                  options={providerOptions}
                  onChange={() => form.validateFields(['bucket']).catch(() => undefined)}
                />
              </Form.Item>
              <Form.Item
                name="region"
                label="Region（地域）"
                rules={[{ required: true, whitespace: true, message: '请输入 Region' }]}
              >
                <Input placeholder="例如：oss-cn-hangzhou" autoComplete="off" />
              </Form.Item>
              <Form.Item
                name="bucket"
                label="Bucket 名称"
                extra={getBucketHelp(provider)}
                validateTrigger={['onBlur', 'onSubmit']}
                rules={[
                  { required: true, whitespace: true, message: '请输入 Bucket 名称' },
                  {
                    validator: (_, value: string) => {
                      if (!value) return Promise.resolve();
                      const result = validateBucketName(provider, value);
                      return result.valid
                        ? Promise.resolve()
                        : Promise.reject(new Error(result.message));
                    },
                  },
                ]}
              >
                <Input placeholder={getBucketPlaceholder(provider)} autoComplete="off" />
              </Form.Item>
              <Form.Item
                name="accessKeyId"
                label="Access Key ID"
                rules={[{ required: true, whitespace: true, message: '请输入 Access Key ID' }]}
              >
                <Input placeholder="请输入 AccessKeyId" autoComplete="off" />
              </Form.Item>
              <Form.Item
                name="accessKeySecret"
                label="Access Key Secret"
                rules={[{ required: true, whitespace: true, message: '请输入 Access Key Secret' }]}
              >
                <Input.Password placeholder="请输入 AccessKeySecret" autoComplete="new-password" />
              </Form.Item>
              <div className="flex justify-end gap-2">
                <Button icon={<X size={15} strokeWidth={2} />} onClick={resetForm}>
                  取消
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={saving}
                  icon={<Save size={15} strokeWidth={2} />}
                >
                  保存配置
                </Button>
              </div>
            </Form>
          </Card>
        )}
      </div>
    </div>
  );
}
