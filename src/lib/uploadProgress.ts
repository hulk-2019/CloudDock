/**
 * 上传进度总线：进度百分比高频变化，不写入全局 store（避免整份队列随每个
 * 进度 tick 重渲染），由各任务 item 组件按文件名订阅、在组件内部维护进度状态。
 */

type ProgressListener = (percent: number) => void;

const listenersByFile = new Map<string, Set<ProgressListener>>();
const percentByFile = new Map<string, number>();

export const uploadProgress = {
  publish(fileName: string, percent: number) {
    const rounded = Math.min(100, Math.max(0, Math.round(percent)));
    if (percentByFile.get(fileName) === rounded) return;
    percentByFile.set(fileName, rounded);
    listenersByFile.get(fileName)?.forEach((listener) => listener(rounded));
  },

  subscribe(fileName: string, listener: ProgressListener) {
    let listeners = listenersByFile.get(fileName);
    if (!listeners) {
      listeners = new Set();
      listenersByFile.set(fileName, listeners);
    }
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) listenersByFile.delete(fileName);
    };
  },

  get(fileName: string) {
    return percentByFile.get(fileName) ?? 0;
  },

  reset(fileName: string) {
    percentByFile.delete(fileName);
  },

  resetAll() {
    percentByFile.clear();
  },
};
