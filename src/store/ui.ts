import { create } from 'zustand';
import type { UploadTask } from '@/types';

interface UIState {
  drawerVisible: boolean;
  uploadQueue: UploadTask[];
  /** 清空队列时递增，批量上传循环据此中止尚未开始的任务（清空即取消）。 */
  uploadCancelToken: number;

  setDrawerVisible: (visible: boolean) => void;
  toggleDrawer: () => void;
  addUpload: (upload: UploadTask) => void;
  updateUpload: (fileName: string, updates: Partial<UploadTask>) => void;
  removeUpload: (fileName: string) => void;
  clearUploads: () => void;
}

/**
 * UI 状态管理
 */
export const useUIStore = create<UIState>((set, get) => ({
  drawerVisible: false,
  uploadQueue: [],
  uploadCancelToken: 0,

  setDrawerVisible: (visible) => set({ drawerVisible: visible }),

  toggleDrawer: () => set((state) => ({ drawerVisible: !state.drawerVisible })),

  addUpload: (upload) => {
    // 队列以 fileName 作为标识，同名任务原位替换旧记录：既避免重复进度条，
    // 也保证任务从“等待中”转入“上传中”时不会跳到队列末尾。
    set((state) => {
      const exists = state.uploadQueue.some((item) => item.fileName === upload.fileName);
      return {
        uploadQueue: exists
          ? state.uploadQueue.map((item) => (item.fileName === upload.fileName ? upload : item))
          : [...state.uploadQueue, upload],
      };
    });
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

  clearUploads: () =>
    set((state) => ({ uploadQueue: [], uploadCancelToken: state.uploadCancelToken + 1 })),
}));
