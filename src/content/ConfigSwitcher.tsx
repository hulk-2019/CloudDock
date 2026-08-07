import { Select, Tag } from 'antd';
import { Check, ChevronDown, Cloud } from 'lucide-react';
import { useI18n, type TranslationKey } from '@/i18n';
import { useConfigStore } from '@/store/config';

const providerLabels = {
  aliyun: 'provider.aliyunOss',
  tencent: 'provider.tencentCos',
  qiniu: 'provider.qiniuKodo',
  aws: 'provider.awsS3',
} as const satisfies Record<string, TranslationKey>;

interface ConfigSwitcherProps {
  compact?: boolean;
}

export function ConfigSwitcher({ compact = false }: ConfigSwitcherProps) {
  const { t } = useI18n();
  const { configs, activeConfigId, setActiveConfig } = useConfigStore();

  return (
    <Select
      aria-label={t('config.selectAStorageConfiguration')}
      className="w-full"
      value={activeConfigId ?? undefined}
      placeholder={t(compact ? 'config.selectConfiguration' : 'config.selectAStorageConfiguration')}
      suffixIcon={<ChevronDown className="text-content-secondary" size={16} strokeWidth={2} />}
      onChange={setActiveConfig}
      notFoundContent={
        <span className="text-content-secondary">{t('config.noConfigurationsYet')}</span>
      }
      optionLabelProp="label"
      options={configs.map((config) => ({
        value: config.id,
        label: config.name,
        searchText: `${config.name} ${config.bucket} ${config.region}`,
        config,
      }))}
      optionRender={(option) => {
        const config = option.data.config;
        return (
          <div className="flex min-w-0 items-center gap-3 py-1">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-primary shadow">
              <Cloud size={15} strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-content">{config.name}</span>
              <span className="block truncate text-xs text-content-secondary">
                {t(providerLabels[config.provider])} · {config.bucket}
              </span>
            </span>
            {config.id === activeConfigId && (
              <Tag color="blue" bordered={false} icon={<Check size={12} strokeWidth={2} />}>
                {t('config.active')}
              </Tag>
            )}
          </div>
        );
      }}
      showSearch
      filterOption={(input, option) =>
        String(option?.searchText ?? '')
          .toLowerCase()
          .includes(input.toLowerCase())
      }
    />
  );
}
