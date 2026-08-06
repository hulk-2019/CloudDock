import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useConfigStore } from '@/store/config';

/**
 * 配置切换器（下拉选择）
 */
export const ConfigSwitcher: React.FC = () => {
  const { configs, activeConfigId, setActiveConfig, getActiveConfig } = useConfigStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeConfig = getActiveConfig();

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (configId: string) => {
    setActiveConfig(configId);
    setIsOpen(false);
  };

  if (configs.length === 0) {
    return null;
  }

  return (
    <div className="config-switcher" ref={dropdownRef}>
      <button className="config-switcher-trigger" onClick={() => setIsOpen(!isOpen)}>
        <span className="config-name">{activeConfig?.name || '未选择配置'}</span>
        <ChevronDown size={16} className={isOpen ? 'rotate' : ''} />
      </button>

      {isOpen && (
        <div className="config-switcher-dropdown">
          {configs.map((config) => (
            <div
              key={config.id}
              className={`config-option ${config.id === activeConfigId ? 'active' : ''}`}
              onClick={() => handleSelect(config.id)}
            >
              <div className="config-option-info">
                <div className="config-option-name">{config.name}</div>
                <div className="config-option-meta">
                  {config.provider} · {config.bucket}
                </div>
              </div>
              {config.id === activeConfigId && <Check size={16} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
