import { useMemo, useState } from 'react';
import { App, Button, Card, Empty, Form, Input, List, Select, Tag, Tooltip } from 'antd';
import { ArrowLeft, Check, Cloud, Edit2, Plus, Save, Trash2, X } from 'lucide-react';
import { useI18n, type TranslationKey } from '@/i18n';
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
  { value: 'aliyun', label: 'provider.aliyunOss' },
  { value: 'tencent', label: 'provider.tencentCos' },
  { value: 'qiniu', label: 'provider.qiniuKodo' },
  { value: 'aws', label: 'provider.awsS3' },
] satisfies Array<{ value: CloudProvider; label: TranslationKey }>;

// 七牛云 JS SDK 能力不完整（列举/删除/凭证均依赖服务端），暂不开放新建入口；
// 标签映射保留全量，已存在的七牛配置仍能正常展示。
const selectableProviderOptions = providerOptions.filter((item) => item.value !== 'qiniu');

const providerLabel = Object.fromEntries(
  providerOptions.map((item) => [item.value, item.label])
) as Record<CloudProvider, TranslationKey>;

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
  const { locale, t } = useI18n();
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
      message.warning(t('config.uploadInProgressSwitchWarning'));
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
      message.error(t('config.failedToReadCredentialsError', { error: (error as Error).message }));
    }
  };

  const handleSave = async (values: ConfigFormValues) => {
    const bucket = values.bucket.trim();
    const bucketValidation = validateBucketName(values.provider, bucket);
    if (!bucketValidation.valid) {
      form.setFields([
        {
          name: 'bucket',
          errors: [t(bucketValidation.message ?? 'config.theBucketNameIsInvalid')],
        },
      ]);
      return;
    }

    setSaving(true);
    try {
      const configFields = {
        name: values.name.trim(),
        provider: values.provider,
        region: values.region.trim(),
        bucket,
      };
      // 新建时先拿到配置 ID 才能存凭证。
      const configId = editingId ?? addConfig(configFields);

      const response = await chrome.runtime.sendMessage({
        action: 'setCredentials',
        configId,
        accessKeyId: values.accessKeyId.trim(),
        accessKeySecret: values.accessKeySecret.trim(),
      });

      if (response?.success === false)
        throw new Error(response.error ?? t('config.failedToSaveCredentials'));

      // 必须在凭证落库之后再更新配置行：updatedAt 变化会触发列表侧重建 provider，
      // 若先更新配置，重建可能读到旧凭证（或新建场景下读不到凭证）。
      updateConfig(configId, configFields);
      message.success(t(editingId ? 'config.configurationUpdated' : 'config.configurationAdded'));
      resetForm();
    } catch (error) {
      message.error(t('config.saveFailedError', { error: (error as Error).message }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (config: CloudConfigItem) => {
    modal.confirm({
      title: t('config.deleteName', { name: config.name }),
      content: t('config.deleteConfigurationWarning'),
      okText: t('config.delete'),
      okButtonProps: { danger: true },
      cancelText: t('config.cancel'),
      centered: true,
      styles: glassModalStyles,
      async onOk() {
        const response = await chrome.runtime.sendMessage({
          action: 'removeCredentials',
          configId: config.id,
        });
        if (response?.success === false)
          throw new Error(response.error ?? t('config.failedToDeleteCredentials'));
        deleteConfig(config.id);
        if (editingId === config.id) resetForm();
        message.success(t('config.configurationDeleted'));
      },
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="text"
            aria-label={t('config.backToFiles')}
            icon={<ArrowLeft size={18} strokeWidth={2} />}
            onClick={onBack}
          />
          <div>
            <h2 className="m-0 text-lg font-semibold text-content">
              {t('config.configurationManagement')}
            </h2>
            <p className="m-0 text-xs text-content-secondary">
              {t('config.manageCloudConnectionsAndSavedConfigurations')}
            </p>
          </div>
        </div>
        <Button type="primary" icon={<Plus size={16} strokeWidth={2} />} onClick={startCreate}>
          {t('config.add')}
        </Button>
      </div>

      <div className="-mr-5 min-h-0 flex-1 space-y-4 overflow-y-auto pb-4 pr-5">
        <Card
          className="border-border/50 bg-surface/80 shadow-sm backdrop-blur-md"
          title={<span className="text-sm text-content">{t('config.savedConfigurations')}</span>}
          extra={<Tag bordered={false}>{t('config.count', { count: configs.length })}</Tag>}
          styles={{
            body: { padding: 12 },
            header: { borderBottom: '1px solid var(--color-border)' },
          }}
        >
          {history.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t('config.noSavedConfigurationsYet')}
            />
          ) : (
            <div role="radiogroup" aria-label={t('config.selectAStorageConfiguration')}>
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
                          <Check
                            size={12}
                            strokeWidth={4}
                            className="absolute -right-3 -top-3 text-white"
                          />
                        </div>
                      )}
                      <div className="flex w-full items-center gap-3">
                        <span
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm transition-colors',
                            active
                              ? 'border-primary/20 bg-primary/10 text-primary'
                              : 'border-border bg-bg text-content-secondary'
                          )}
                        >
                          <Cloud size={20} strokeWidth={2} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <strong
                              className={cn(
                                'truncate text-sm transition-colors',
                                active ? 'text-primary' : 'text-content'
                              )}
                            >
                              {config.name}
                            </strong>
                          </div>
                          <p
                            className="my-1 truncate text-xs text-content-secondary"
                            title={`${config.region} · ${config.bucket}`}
                          >
                            {t(providerLabel[config.provider])} · {config.region} · {config.bucket}
                          </p>
                          <span className="text-[11px] text-content-secondary opacity-70">
                            {t('config.updatedDate', {
                              date: new Date(config.updatedAt).toLocaleString(locale),
                            })}
                          </span>
                        </div>
                        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 xl:opacity-100">
                          <Tooltip title={t('config.edit')}>
                            <Button
                              size="small"
                              type="text"
                              aria-label={t('config.editName', { name: config.name })}
                              icon={<Edit2 size={14} strokeWidth={2} />}
                              onClick={(event) => {
                                event.stopPropagation();
                                void startEdit(config);
                              }}
                            />
                          </Tooltip>
                          <Tooltip title={t('config.delete')}>
                            <Button
                              danger
                              size="small"
                              type="text"
                              aria-label={t('config.deleteName2', { name: config.name })}
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
              <span className="text-sm text-content">
                {t(editingId ? 'config.editConfiguration' : 'config.addConfiguration')}
              </span>
            }
            extra={
              <Button
                type="text"
                size="small"
                aria-label={t('config.closeForm')}
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
                label={t('config.configurationName')}
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: t('config.enterAConfigurationName'),
                  },
                  {
                    validator: (_, value: string) => {
                      const name = value?.trim();
                      if (!name) return Promise.resolve();
                      // 编辑时排除自身，允许保存时名称不变。
                      const duplicated = configs.some(
                        (item) => item.name === name && item.id !== editingId
                      );
                      return duplicated
                        ? Promise.reject(
                            new Error(t('config.aConfigurationWithThisNameAlreadyExists'))
                          )
                        : Promise.resolve();
                    },
                  },
                ]}
              >
                <Input placeholder={t('config.forExampleWorkOss')} autoComplete="off" />
              </Form.Item>
              <Form.Item name="provider" label={t('config.provider')} rules={[{ required: true }]}>
                <Select
                  options={selectableProviderOptions.map((option) => ({
                    ...option,
                    label: t(option.label),
                  }))}
                  onChange={() => form.validateFields(['bucket']).catch(() => undefined)}
                />
              </Form.Item>
              <Form.Item
                name="region"
                label={t('config.region')}
                rules={[{ required: true, whitespace: true, message: t('config.enterARegion') }]}
              >
                <Input placeholder={t('config.forExampleOssCnHangzhou')} autoComplete="off" />
              </Form.Item>
              <Form.Item
                name="bucket"
                label={t('config.bucketName')}
                extra={t(getBucketHelp(provider))}
                validateTrigger={['onBlur', 'onSubmit']}
                rules={[
                  { required: true, whitespace: true, message: t('config.enterABucketName') },
                  {
                    validator: (_, value: string) => {
                      if (!value) return Promise.resolve();
                      const result = validateBucketName(provider, value);
                      return result.valid
                        ? Promise.resolve()
                        : Promise.reject(
                            new Error(t(result.message ?? 'config.theBucketNameIsInvalid'))
                          );
                    },
                  },
                ]}
              >
                <Input placeholder={t(getBucketPlaceholder(provider))} autoComplete="off" />
              </Form.Item>
              <Form.Item
                name="accessKeyId"
                label="Access Key ID"
                rules={[
                  { required: true, whitespace: true, message: t('config.enterAnAccessKeyId') },
                ]}
              >
                <Input placeholder={t('config.enterAccesskeyid')} autoComplete="off" />
              </Form.Item>
              <Form.Item
                name="accessKeySecret"
                label="Access Key Secret"
                rules={[
                  { required: true, whitespace: true, message: t('config.enterAnAccessKeySecret') },
                ]}
              >
                <Input.Password
                  placeholder={t('config.enterAccesskeysecret')}
                  autoComplete="new-password"
                />
              </Form.Item>
              <div className="flex justify-end gap-2">
                <Button icon={<X size={15} strokeWidth={2} />} onClick={resetForm}>
                  {t('config.cancel')}
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={saving}
                  icon={<Save size={15} strokeWidth={2} />}
                >
                  {t(editingId ? 'config.saveChanges' : 'config.saveConfiguration')}
                </Button>
              </div>
            </Form>
          </Card>
        )}
      </div>
    </div>
  );
}
