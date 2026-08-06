import { Select, Tag } from 'antd';
import { Check, ChevronDown, Cloud } from 'lucide-react';
import { useConfigStore } from '@/store/config';

const providerLabels = {
  aliyun: '阿里云 OSS',
  tencent: '腾讯云 COS',
  qiniu: '七牛云 Kodo',
  aws: 'AWS S3',
} as const;

interface ConfigSwitcherProps {
  compact?: boolean;
}

export function ConfigSwitcher({ compact = false }: ConfigSwitcherProps) {
  const { configs, activeConfigId, setActiveConfig } = useConfigStore();

  return (
    <Select
      aria-label="选择云存储配置"
      className="w-full"
      value={activeConfigId ?? undefined}
      placeholder={compact ? "选择配置" : "选择一个云存储配置"}
      suffixIcon={<ChevronDown className="text-content-secondary" size={16} strokeWidth={2} />}
      onChange={setActiveConfig}
      notFoundContent={<span className="text-content-secondary">暂无配置</span>}
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
                {providerLabels[config.provider]} · {config.bucket}
              </span>
            </span>
            {config.id === activeConfigId && (
              <Tag color="blue" bordered={false} icon={<Check size={12} strokeWidth={2} />}>
                当前
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
