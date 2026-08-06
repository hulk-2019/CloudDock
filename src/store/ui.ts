import { create } from 'zustand';
import type { UploadProgress } from '@/types';

interface UIState {
  drawerVisible: boolean;
  uploadQueue: UploadProgress[];

  setDrawerVisible: (visible: boolean) => void;
  toggleDrawer: () => void;
  addUpload: (upload: UploadProgress) => void;
  updateUpload: (fileName: string, updates: Partial<UploadProgress>) => void;
  removeUpload: (fileName: string) => void;
  clearUploads: () => void;
}

/**
 * UI 状态管理
 */
export const useUIStore = create<UIState>((set, get) => ({
  drawerVisible: false,
  uploadQueue: [],

  setDrawerVisible: (visible) => set({ drawerVisible: visible }),

  toggleDrawer: () => set((state) => ({ drawerVisible: !state.drawerVisible })),

  addUpload: (upload) => {
    // 队列以 fileName 作为标识，同名任务直接替换旧记录，避免出现重复进度条。
    set((state) => ({
      uploadQueue: [
        ...state.uploadQueue.filter((item) => item.fileName !== upload.fileName),
        upload,
      ],
    }));
  },

  updateUpload: (fileName, updates) => {
    set((state) => ({
      uploadQueue: state.uploadQueue.map((upload) =>
        upload.fileName === fileName ? { ...upload, ...updates } : upload
      ),
    }));
  },

  removeUpload: (fileName) => {
    set((state) => ({
      uploadQueue: state.uploadQueue.filter((upload) => upload.fileName !== fileName),
    }));
  },

  clearUploads: () => set({ uploadQueue: [] }),
}));
