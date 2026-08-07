import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { Alert, App, Button, Input, Modal, Tag, Tooltip } from 'antd';
import { ChevronRight, Cloud, FolderOpen, Settings, UploadCloud, X } from 'lucide-react';
import { useCloudStorage } from '@/hooks/useCloudStorage';
import { useDragUpload } from '@/hooks/useDragUpload';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useConfigStore } from '@/store/config';
import { getBasename, isImageFile, isVideoFile, joinPath } from '@/utils/file';
import { captureScreenshot, readImageFromClipboard } from '@/utils/screenshot';
import type { FileItem } from '@/types';
import { cn } from '@/lib/utils';
import { BreadcrumbToolbar } from './BreadcrumbToolbar';
import { glassModalStyles } from './modalStyles';
import { ConfigPanel } from './ConfigPanel';
import { FileGrid, INTERNAL_DRAG_TYPE } from './FileGrid';
import { MediaPreview } from './MediaPreview';
import { UploadQueueBell } from './UploadQueue';

interface DrawerPanelProps {
  visible: boolean;
  onClose: () => void;
}

/** 拖拽/粘贴进来的“文件”可能是目录：目录无法读取内容，用读取首字节的方式甄别。 */
const isRealFile = async (file: File): Promise<boolean> => {
  try {
    await file.slice(0, 1).arrayBuffer();
    return true;
  } catch {
    return false;
  }
};

const DrawerPanel = ({ visible, onClose }: DrawerPanelProps) => {
  const asideRef = useRef<HTMLElement>(null);
  const fileScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { message, modal } = App.useApp();
  const [currentView, setCurrentView] = useState<'files' | 'config'>('files');
  const [newFolderName, setNewFolderName] = useState('');
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [draggingFile, setDraggingFile] = useState<FileItem | null>(null);
  const [previewPath, setPreviewPath] = useState<string | null>(null);

  const {
    files,
    loading,
    error,
    currentPath,
    navigate,
    refresh,
    deleteFile,
    moveFile,
    listDirectory,
    getFileUrl,
    createFolder,
  } = useCloudStorage();
  const { uploadFiles } = useFileUpload();
  const { configs, getActiveConfig, fileViewMode, setFileViewMode } = useConfigStore();
  const activeConfig = getActiveConfig();

  /** 所有上传入口（拖拽/粘贴/截图/选择文件）的统一闸口：过滤文件夹 → 同名校验 → 上传。 */
  const submitUploads = useCallback(
    async (candidates: File[]) => {
      if (candidates.length === 0) return;

      const checks = await Promise.all(candidates.map(isRealFile));
      const uploadable = candidates.filter((_, index) => checks[index]);
      const skippedFolders = candidates.length - uploadable.length;
      if (skippedFolders > 0) {
        message.warning(`不支持上传文件夹，已跳过 ${skippedFolders} 项`);
      }
      if (uploadable.length === 0) return;

      const performUpload = async () => {
        const { success, failed } = await uploadFiles(uploadable);
        if (success > 0) message.success(`已上传 ${success} 个文件`);
        if (failed > 0) message.error(`${failed} 个文件上传失败`);
      };

      const existingNames = new Set(files.map((item) => item.name));
      const conflicts = uploadable.filter((file) => existingNames.has(file.name));
      if (conflicts.length > 0) {
        const shownNames = conflicts
          .slice(0, 3)
          .map((file) => `「${file.name}」`)
          .join('、');
        const suffix = conflicts.length > 3 ? ` 等 ${conflicts.length} 项` : '';
        modal.confirm({
          title: '当前目录存在同名内容',
          content: `${shownNames}${suffix}已存在，继续上传将覆盖同名文件。`,
          okText: '覆盖上传',
          cancelText: '取消',
          centered: true,
          styles: glassModalStyles,
          okButtonProps: { danger: true },
          // 上传进度由队列展示，确认后立即关闭弹框。
          onOk: () => void performUpload(),
        });
        return;
      }
      await performUpload();
    },
    [files, message, modal, uploadFiles]
  );

  // 整个抽屉面板都是拖拽上传热区，避免文件列表撑满时头部/工具栏/底栏成为放置死区。
  const { isDragOver } = useDragUpload(asideRef, submitUploads);
  const mediaFiles = useMemo(
    () =>
      files.filter(
        (file) => file.type === 'file' && (isImageFile(file.name) || isVideoFile(file.name))
      ),
    [files]
  );
  const previewFile = mediaFiles.find((file) => file.path === previewPath) ?? null;
  const getModalContainer = () => asideRef.current?.parentElement ?? document.body;

  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      if (!visible || currentView !== 'files' || !activeConfig) return;

      // 复制的桌面文件只出现在 paste 事件的 clipboardData 里，
      // 异步 Clipboard API（navigator.clipboard.read）读不到文件，只能读到图片位图。
      const copiedFiles = Array.from(event.clipboardData?.files ?? []);
      if (copiedFiles.length > 0) {
        await submitUploads(copiedFiles);
        return;
      }

      const image = await readImageFromClipboard();
      if (!image) return;
      await submitUploads([image]);
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [activeConfig, currentView, submitUploads, visible]);

  useEffect(() => {
    const handleScreenshotUpload = async () => {
      if (!activeConfig) {
        message.info('请先添加云存储配置');
        setCurrentView('config');
        return;
      }
      try {
        const screenshot = await captureScreenshot();
        await submitUploads([screenshot]);
      } catch (uploadError) {
        message.error(`截图上传失败：${(uploadError as Error).message}`);
      }
    };

    window.addEventListener('clouddock:screenshot-upload', handleScreenshotUpload);
    return () => window.removeEventListener('clouddock:screenshot-upload', handleScreenshotUpload);
  }, [activeConfig, message, submitUploads]);

  useEffect(() => {
    setPreviewPath(null);
  }, [activeConfig?.id, currentPath]);

  const copyFileLink = async (file: FileItem) => {
    try {
      const url = await getFileUrl(file.path);
      await navigator.clipboard.writeText(url);
      message.success('文件链接已复制');
    } catch (linkError) {
      message.error((linkError as Error).message);
    }
  };

  const openFile = (file: FileItem) => {
    if (file.type === 'folder') {
      navigate(file.path);
      return;
    }
    if (isImageFile(file.name) || isVideoFile(file.name)) {
      setPreviewPath(file.path);
      return;
    }
    void copyFileLink(file);
  };

  const confirmDelete = (file: FileItem) => {
    const isFolder = file.type === 'folder';
    modal.confirm({
      title: `删除“${file.name}”？`,
      content: isFolder ? '将删除该文件夹及其中全部内容，删除后无法恢复。' : '删除后无法从 CloudDock 恢复。',
      okText: '删除',
      cancelText: '取消',
      centered: true,
      styles: glassModalStyles,
      okButtonProps: { danger: true },
      async onOk() {
        try {
          await deleteFile(file.path);
          message.success(isFolder ? '文件夹已删除' : '文件已删除');
        } catch (deleteError) {
          message.error((deleteError as Error).message);
        }
      },
    });
  };

  const handleCreateFolder = async () => {
    const folderName = newFolderName.trim();
    if (!folderName) {
      message.warning('请输入文件夹名称');
      return;
    }
    if (folderName.includes('/') || folderName.includes('\\')) {
      message.warning('文件夹名称不能包含斜杠');
      return;
    }

    setCreatingFolder(true);
    try {
      await createFolder(folderName);
      setNewFolderName('');
      setFolderModalOpen(false);
      message.success(`文件夹“${folderName}”已创建`);
    } catch (createError) {
      message.error((createError as Error).message);
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleFileDragStart = (event: DragEvent, file: FileItem) => {
    event.dataTransfer.setData(INTERNAL_DRAG_TYPE, file.path);
    event.dataTransfer.effectAllowed = 'move';
    setDraggingFile(file);
  };

  const handleFileDragEnd = () => {
    setDraggingFile(null);
    setDragOverFolder(null);
  };

  const handleFolderDragOver = (event: DragEvent, folderPath: string) => {
    if (!event.dataTransfer.types.includes(INTERNAL_DRAG_TYPE) || draggingFile?.path === folderPath)
      return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    setDragOverFolder(folderPath);
  };

  const handleFolderDrop = async (event: DragEvent, folderPath: string) => {
    const sourcePath = event.dataTransfer.getData(INTERNAL_DRAG_TYPE);
    if (!sourcePath) return;

    event.preventDefault();
    event.stopPropagation();
    setDraggingFile(null);
    setDragOverFolder(null);

    // 文件夹路径以 / 结尾，落点必须保留斜杠，否则占位对象会被复制成普通文件。
    const isFolder = sourcePath.endsWith('/');
    const name = getBasename(sourcePath);
    const targetPath = `${joinPath(folderPath, name)}${isFolder ? '/' : ''}`;
    if (sourcePath === targetPath) return;
    if (isFolder && targetPath.startsWith(sourcePath)) {
      message.warning('不能将文件夹移动到自身内部');
      return;
    }

    try {
      const targetChildren = await listDirectory(folderPath);
      // 覆盖前必须先删掉目标里的同名项：对象存储的“覆盖”只对同 key 生效，
      // 类型不一致（如同名文件 vs 文件夹）或文件夹合并残留都会让旧对象留在原地。
      const conflict = targetChildren.find((item) => item.name === name) ?? null;

      const performMove = async () => {
        try {
          if (conflict) await deleteFile(conflict.path);
          await moveFile(sourcePath, targetPath);
          message.success(isFolder ? '文件夹已移动' : '文件已移动');
        } catch (moveError) {
          message.error((moveError as Error).message);
        }
      };

      if (conflict) {
        modal.confirm({
          title: `目标目录已存在「${name}」`,
          content:
            conflict.type === 'folder'
              ? '继续移动将删除目标目录中的同名文件夹及其全部内容，并替换为当前移动项。'
              : '继续移动将覆盖目标目录中的同名文件。',
          okText: '覆盖',
          cancelText: '取消',
          centered: true,
          styles: glassModalStyles,
          okButtonProps: { danger: true },
          onOk: performMove,
        });
        return;
      }
      await performMove();
    } catch (listError) {
      message.error((listError as Error).message);
    }
  };

  return (
    <aside
      ref={asideRef}
      aria-label="CloudDock 云盘面板"
      aria-hidden={!visible}
      className={cn(
        'pointer-events-auto relative z-10 flex h-screen w-full min-w-0 flex-col border-l border-border bg-bg p-5 font-sans text-content shadow-2xl backdrop-blur transition-all duration-300',
        visible ? 'visible translate-x-0 opacity-100' : 'invisible pointer-events-none translate-x-full opacity-0'
      )}
    >
      <header className="relative z-20 mb-4 flex items-center justify-between gap-3 border-b border-border/50 bg-surface/50 pb-4 shadow-sm backdrop-blur-md -mx-5 px-5 -mt-5 pt-5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-border bg-surface text-primary shadow">
            <Cloud size={19} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h1 className="m-0 truncate text-base font-bold tracking-tight text-content">
              CloudDock
            </h1>
            <p className="m-0 max-w-64 truncate text-[11px] text-content-secondary">
              {currentView === 'files' && activeConfig
                ? `${activeConfig.name} · ${activeConfig.bucket}`
                : '云端存储，随手可得'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <UploadQueueBell />
          {currentView === 'files' && (
            <Tooltip title="配置与设置">
              <Button
                type="text"
                aria-label="打开配置与设置"
                icon={<Settings size={18} strokeWidth={1.8} />}
                onClick={() => setCurrentView('config')}
              />
            </Tooltip>
          )}
          <Tooltip title="关闭面板">
            <Button
              type="text"
              aria-label="关闭 CloudDock"
              icon={<X size={19} strokeWidth={2} />}
              onClick={onClose}
            />
          </Tooltip>
        </div>
      </header>

      {currentView === 'config' ? (
        <ConfigPanel onBack={() => setCurrentView('files')} />
      ) : !activeConfig ? (
        <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center">
          <div className="flex max-w-xs flex-col items-center">
            <span className="mb-5 flex h-20 w-20 items-center justify-center rounded border border-border bg-surface text-primary shadow">
              <FolderOpen size={36} strokeWidth={2} />
            </span>
            <h2 className="m-0 text-xl font-semibold text-content">开始使用 CloudDock</h2>
            <p className="mb-6 mt-2 leading-6 text-content-secondary">
              添加一个云存储配置，即可在当前页面浏览、上传和管理文件。
            </p>
            <Button
              type="primary"
              size="large"
              className="shadow active:translate-y-px active:shadow-none"
              onClick={() => setCurrentView('config')}
            >
              前往配置
              <ChevronRight size={17} strokeWidth={2} />
            </Button>
            {configs.length > 0 && <Tag className="mt-4">请前往配置管理选择配置</Tag>}
          </div>
        </div>
      ) : (
        <>
          <BreadcrumbToolbar
            currentPath={currentPath}
            loading={loading}
            viewMode={fileViewMode}
            onNavigate={navigate}
            onRefresh={() => void refresh()}
            onSelectFiles={() => fileInputRef.current?.click()}
            onCreateFolder={() => setFolderModalOpen(true)}
            onToggleViewMode={() => setFileViewMode(fileViewMode === 'grid' ? 'list' : 'grid')}
          />

          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(event) => {
              const selected = Array.from(event.target.files ?? []);
              // 重置 value，保证连续选择同一批文件也能再次触发 change。
              event.target.value = '';
              void submitUploads(selected);
            }}
          />

          <div
            ref={fileScrollRef}
            className={cn(
              'relative -mr-5 mt-4 min-h-0 flex-1 overflow-y-auto rounded p-1 pr-5 transition',
              isDragOver &&
                'bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-bg))] ring-2 ring-primary'
            )}
          >
            {isDragOver && (
              // 零高度 sticky 容器：提示条悬浮在列表上方，不参与布局，
              // 避免拖拽过程中光标下方内容位移引发 dragenter/dragleave 抖动。
              <div className="pointer-events-none sticky top-0 z-10 h-0">
                <div className="flex items-center justify-center gap-2 rounded border border-primary bg-surface/95 p-3 text-sm font-semibold text-primary shadow backdrop-blur-sm">
                  <UploadCloud size={18} strokeWidth={2} />
                  松开即可上传到当前目录
                </div>
              </div>
            )}

            {error && (
              <Alert
                className="mb-4"
                type="error"
                showIcon
                message="云存储连接异常"
                description={error}
              />
            )}

            <FileGrid
              files={files}
              loading={loading}
              draggingFile={draggingFile}
              dragOverFolder={dragOverFolder}
              viewMode={fileViewMode}
              scrollRef={fileScrollRef}
              onOpen={openFile}
              onCopyLink={copyFileLink}
              onDelete={confirmDelete}
              onDragStart={handleFileDragStart}
              onDragEnd={handleFileDragEnd}
              onFolderDragOver={handleFolderDragOver}
              onFolderDragLeave={() => setDragOverFolder(null)}
              onFolderDrop={handleFolderDrop}
            />
          </div>

          <footer className="mt-3 flex items-center justify-center gap-2 text-xs text-content-secondary">
            <UploadCloud size={14} strokeWidth={2} />
            支持拖拽文件、网页图片与 Ctrl / Command + V 粘贴上传
          </footer>
        </>
      )}

      <MediaPreview
        files={mediaFiles}
        currentFile={previewFile}
        open={Boolean(previewPath)}
        getFileUrl={getFileUrl}
        getContainer={getModalContainer}
        onClose={() => setPreviewPath(null)}
        onChange={(file) => setPreviewPath(file.path)}
      />

      <Modal
        title="新建文件夹"
        open={folderModalOpen}
        okText="创建"
        cancelText="取消"
        centered
        confirmLoading={creatingFolder}
        getContainer={getModalContainer}
        onOk={handleCreateFolder}
        onCancel={() => {
          setFolderModalOpen(false);
          setNewFolderName('');
        }}
        styles={glassModalStyles}
      >
        <Input
          autoFocus
          value={newFolderName}
          placeholder="请输入文件夹名称，例如 003"
          maxLength={255}
          onChange={(event) => setNewFolderName(event.target.value)}
          onPressEnter={() => void handleCreateFolder()}
        />
        <p className="mb-0 mt-2 text-xs text-content-secondary">
          名称会按原样保存，不会移除前导零。
        </p>
      </Modal>
    </aside>
  );
};

export default DrawerPanel;
