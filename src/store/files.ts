import { create } from 'zustand';
import type { FileItem } from '@/types';

interface FileState {
  files: FileItem[];
  loading: boolean;
  selectedFiles: string[];

  setFiles: (files: FileItem[]) => void;
  setLoading: (loading: boolean) => void;
  setSelectedFiles: (paths: string[]) => void;
  toggleFileSelection: (path: string) => void;
  clearSelection: () => void;
}

/**
 * 文件状态管理
 */
export const useFileStore = create<FileState>((set, get) => ({
  files: [],
  loading: false,
  selectedFiles: [],

  setFiles: (files) => set({ files }),
  setLoading: (loading) => set({ loading }),
  setSelectedFiles: (paths) => set({ selectedFiles: paths }),

  toggleFileSelection: (path) => {
    const { selectedFiles } = get();
    const index = selectedFiles.indexOf(path);

    if (index > -1) {
      set({ selectedFiles: selectedFiles.filter((p) => p !== path) });
    } else {
      set({ selectedFiles: [...selectedFiles, path] });
    }
  },

  clearSelection: () => set({ selectedFiles: [] }),
}));
