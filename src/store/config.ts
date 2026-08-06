import { create } from 'zustand';
import type { CloudProvider, CloudConfigItem } from '@/types';

interface ConfigState {
  // 所有配置列表
  configs: CloudConfigItem[];
  // 当前激活的配置 ID
  activeConfigId: string | null;
  // 当前路径
  currentPath: string;
  // 悬浮按钮位置
  floatingButtonPosition: { x: number; y: number };

  // 获取当前激活的配置
  getActiveConfig: () => CloudConfigItem | null;

  // 设置激活的配置
  setActiveConfig: (configId: string) => void;

  // 添加新配置
  addConfig: (config: Omit<CloudConfigItem, 'id' | 'createdAt' | 'updatedAt'>) => string;

  // 更新配置
  updateConfig: (configId: string, updates: Partial<Omit<CloudConfigItem, 'id' | 'createdAt' | 'updatedAt'>>) => void;

  // 删除配置
  deleteConfig: (configId: string) => void;

  // 设置当前路径
  setCurrentPath: (path: string) => void;

  // 设置悬浮按钮位置
  setFloatingButtonPosition: (position: { x: number; y: number }) => void;

  // 加载配置
  loadConfig: () => Promise<void>;

  // 保存配置
  saveConfig: () => Promise<void>;
}

/**
 * 配置状态管理
 */
export const useConfigStore = create<ConfigState>((set, get) => ({
  configs: [],
  activeConfigId: null,
  currentPath: '/',
  floatingButtonPosition: { x: 20, y: 100 },

  getActiveConfig: () => {
    const { configs, activeConfigId } = get();
    return configs.find((c) => c.id === activeConfigId) || null;
  },

  setActiveConfig: (configId) => {
    set({ activeConfigId: configId, currentPath: '/' });
    get().saveConfig();
  },

  addConfig: (config) => {
    const id = `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    const newConfig: CloudConfigItem = {
      ...config,
      id,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({
      configs: [...state.configs, newConfig],
      activeConfigId: state.activeConfigId || id, // 如果是第一个配置，自动激活
    }));

    get().saveConfig();
    return id;
  },

  updateConfig: (configId, updates) => {
    set((state) => ({
      configs: state.configs.map((c) =>
        c.id === configId ? { ...c, ...updates, updatedAt: Date.now() } : c
      ),
    }));
    get().saveConfig();
  },

  deleteConfig: (configId) => {
    const state = get();
    const newConfigs = state.configs.filter((c) => c.id !== configId);
    const newActiveId = state.activeConfigId === configId
      ? (newConfigs[0]?.id || null)
      : state.activeConfigId;

    set({
      configs: newConfigs,
      activeConfigId: newActiveId,
    });

    get().saveConfig();
  },

  setCurrentPath: (path) => set({ currentPath: path }),

  setFloatingButtonPosition: (position) => {
    set({ floatingButtonPosition: position });
    get().saveConfig();
  },

  loadConfig: async () => {
    // 加载配置列表
    const configsResponse = await chrome.runtime.sendMessage({
      action: 'getConfig',
      key: 'cloudConfigs',
    });

    // 加载用户配置（激活的配置 ID 等）
    const userConfigResponse = await chrome.runtime.sendMessage({
      action: 'getConfig',
      key: 'userConfig',
    });

    if (configsResponse.success && configsResponse.data) {
      set({
        configs: configsResponse.data,
      });
    }

    if (userConfigResponse.success && userConfigResponse.data) {
      const userConfig = userConfigResponse.data;
      set({
        activeConfigId: userConfig.activeConfigId || null,
        currentPath: userConfig.currentPath || '/',
        floatingButtonPosition: userConfig.floatingButtonPosition || { x: 20, y: 100 },
      });
    }
  },

  saveConfig: async () => {
    const state = get();

    // 保存配置列表
    await chrome.runtime.sendMessage({
      action: 'setConfig',
      key: 'cloudConfigs',
      value: state.configs,
    });

    // 保存用户配置
    await chrome.runtime.sendMessage({
      action: 'setConfig',
      key: 'userConfig',
      value: {
        activeConfigId: state.activeConfigId,
        currentPath: state.currentPath,
        floatingButtonPosition: state.floatingButtonPosition,
      },
    });
  },
}));
