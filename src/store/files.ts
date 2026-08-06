import { create } from 'zustand';
import type { FileItem } from '@/types';
import { joinPath } from '@/utils/file';

interface FileState {
  files: FileItem[];
  loading: boolean;
  selectedFiles: string[];

  setFiles: (files: FileItem[]) => void;
  upsertFile: (file: FileItem) => void;
  setLoading: (loading: boolean) => void;
  setSelectedFiles: (paths: string[]) => void;
  toggleFileSelection: (path: string) => void;
  clearSelection: () => void;
}

const sameStoragePath = (left: string, right: string) => joinPath(left) === joinPath(right);

export const useFileStore = create<FileState>((set, get) => ({
  files: [],
  loading: false,
  selectedFiles: [],

  setFiles: (files) => set({ files }),
  upsertFile: (file) =>
    set((state) => {
      const existingIndex = state.files.findIndex((item) => sameStoragePath(item.path, file.path));
      if (existingIndex < 0) return { files: [...state.files, file] };

      return {
        files: state.files.map((item, index) => (index === existingIndex ? { ...item, ...file } : item)),
      };
    }),
  setLoading: (loading) => set({ loading }),
  setSelectedFiles: (paths) => set({ selectedFiles: paths }),

  toggleFileSelection: (path) => {
    const { selectedFiles } = get();
    const index = selectedFiles.indexOf(path);

    if (index > -1) {
      set({ selectedFiles: selectedFiles.filter((item) => item !== path) });
    } else {
      set({ selectedFiles: [...selectedFiles, path] });
    }
  },

  clearSelection: () => set({ selectedFiles: [] }),
}));
