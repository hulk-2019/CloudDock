import { Button, Tooltip } from 'antd';
import { Languages } from 'lucide-react';
import { useI18n } from '@/i18n';

interface LanguageSwitcherProps {
  showLabel?: boolean;
}

export default function LanguageSwitcher({ showLabel = false }: LanguageSwitcherProps) {
  const { locale, toggleLocale, t } = useI18n();
  const targetLabel = locale === 'zh-CN' ? 'EN' : '中文';
  const accessibleLabel = t(
    locale === 'zh-CN' ? 'language.switchToEnglish' : 'language.switchToChinese'
  );

  return (
    <Tooltip title={accessibleLabel}>
      <Button
        type="text"
        aria-label={accessibleLabel}
        icon={<Languages size={17} strokeWidth={1.8} aria-hidden />}
        onClick={() => void toggleLocale()}
      >
        {showLabel ? targetLabel : null}
      </Button>
    </Tooltip>
  );
}
