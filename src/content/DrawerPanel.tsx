import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { Alert, App, Button, Input, Modal, Tag, Tooltip } from 'antd';
import { ChevronRight, Cloud, FolderOpen, Settings2, UploadCloud, X } from 'lucide-react';
import { useCloudStorage } from '@/hooks/useCloudStorage';
import { useDragUpload } from '@/hooks/useDragUpload';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useConfigStore } from '@/store/config';
import { getBasename, isImageFile, isVideoFile, joinPath } from '@/utils/file';
import { captureScreenshot, readImageFromClipboard } from '@/utils/screenshot';
import type { FileItem } from '@/types';
import { cn } from '@/lib/utils';
import { BreadcrumbToolbar } from './BreadcrumbToolbar';
import { ConfigPanel } from './ConfigPanel';
import { ConfigSwitcher } from './ConfigSwitcher';
import { FileGrid, INTERNAL_DRAG_TYPE } from './FileGrid';
import { MediaPreview } from './MediaPreview';
import { UploadQueue } from './UploadQueue';

interface DrawerPanelProps {
  visible: boolean;
  onClose: () => void;
}

const DrawerPanel = ({ visible, onClose }: DrawerPanelProps) => {
  const asideRef = useRef<HTMLElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
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
    getFileUrl,
    createFolder,
  } = useCloudStorage();
  const { uploadFile } = useFileUpload();
  const { configs, getActiveConfig } = useConfigStore();
  const { isDragOver } = useDragUpload(dropZoneRef);
  const activeConfig = getActiveConfig();
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
    const handlePaste = async () => {
      if (!visible || currentView !== 'files' || !activeConfig) return;
      const image = await readImageFromClipboard();
      if (!image) return;

      try {
        await uploadFile(image);
        message.success('剪贴板图片已上传');
      } catch (uploadError) {
        message.error(`上传失败：${(uploadError as Error).message}`);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [activeConfig, currentView, message, uploadFile, visible]);

  useEffect(() => {
    const handleScreenshotUpload = async () => {
      if (!activeConfig) {
        message.info('请先添加云存储配置');
        setCurrentView('config');
        return;
      }
      try {
        const screenshot = await captureScreenshot();
        await uploadFile(screenshot);
        message.success('截图已上传');
      } catch (uploadError) {
        message.error(`截图上传失败：${(uploadError as Error).message}`);
      }
    };

    window.addEventListener('clouddock:screenshot-upload', handleScreenshotUpload);
    return () => window.removeEventListener('clouddock:screenshot-upload', handleScreenshotUpload);
  }, [activeConfig, message, uploadFile]);

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
    modal.confirm({
      title: `删除“${file.name}”？`,
      content: '删除后无法从 CloudDock 恢复。',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      async onOk() {
        await deleteFile(file.path);
        message.success('文件已删除');
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
    if (!event.dataTransfer.types.includes(INTERNAL_DRAG_TYPE) || draggingFile?.path === folderPath) return;
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

    const targetPath = joinPath(folderPath, getBasename(sourcePath));
    if (sourcePath === targetPath) return;

    try {
      await moveFile(sourcePath, targetPath);
      message.success('文件已移动');
    } catch (moveError) {
      message.error((moveError as Error).message);
    }
  };

  return (
    <aside
      ref={asideRef}
      aria-label="CloudDock 云盘面板"
      aria-hidden={!visible}
      className={cn(
        'pointer-events-auto fixed bottom-0 right-0 top-0 z-[2147483645] flex w-[460px] flex-col border-l border-border bg-bg p-5 font-sans text-content transition-transform duration-300',
        visible ? 'pointer-events-auto translate-x-0' : 'pointer-events-none translate-x-full'
      )}
    >
      <header className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-border bg-surface text-primary shadow">
            <Cloud size={19} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h1 className="m-0 truncate text-base font-bold tracking-tight text-content">CloudDock</h1>
            <p className="m-0 truncate text-[11px] text-content-secondary">云端存储，随手可得</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {currentView === 'files' && (
            <>
              <div className="w-36">
                <ConfigSwitcher compact />
              </div>
              <Tooltip title="管理配置">
                <Button
                  type="text"
                  aria-label="管理云存储配置"
                  icon={<Settings2 size={17} strokeWidth={2} />}
                  onClick={() => setCurrentView('config')}
                />
              </Tooltip>
            </>
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
            {configs.length > 0 && <Tag className="mt-4">请选择顶部配置后继续</Tag>}
          </div>
        </div>
      ) : (
        <>
          <BreadcrumbToolbar
            currentPath={currentPath}
            loading={loading}
            onNavigate={navigate}
            onRefresh={() => void refresh()}
            onCreateFolder={() => setFolderModalOpen(true)}
          />

          <div
            ref={dropZoneRef}
            className={cn(
              'relative mt-4 min-h-0 flex-1 overflow-y-auto rounded p-1 pr-2 transition',
              isDragOver && 'bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-bg))] ring-2 ring-primary'
            )}
          >
            {isDragOver && (
              <div className="pointer-events-none sticky top-0 z-10 mb-3 flex items-center justify-center gap-2 rounded border border-primary bg-surface p-3 text-sm font-semibold text-primary shadow">
                <UploadCloud size={18} strokeWidth={2} />
                松开即可上传到当前目录
              </div>
            )}

            {error && <Alert className="mb-4" type="error" showIcon message="云存储连接异常" description={error} />}

            <FileGrid
              files={files}
              loading={loading}
              draggingFile={draggingFile}
              dragOverFolder={dragOverFolder}
              onOpen={openFile}
              onCopyLink={copyFileLink}
              onDelete={confirmDelete}
              onDragStart={handleFileDragStart}
              onDragEnd={handleFileDragEnd}
              onFolderDragOver={handleFolderDragOver}
              onFolderDragLeave={() => setDragOverFolder(null)}
              onFolderDrop={handleFolderDrop}
            />

            <div className="mt-4">
              <UploadQueue />
            </div>
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
        confirmLoading={creatingFolder}
        getContainer={getModalContainer}
        onOk={handleCreateFolder}
        onCancel={() => {
          setFolderModalOpen(false);
          setNewFolderName('');
        }}
      >
        <Input
          autoFocus
          value={newFolderName}
          placeholder="请输入文件夹名称，例如 003"
          maxLength={255}
          onChange={(event) => setNewFolderName(event.target.value)}
          onPressEnter={() => void handleCreateFolder()}
        />
        <p className="mb-0 mt-2 text-xs text-content-secondary">名称会按原样保存，不会移除前导零。</p>
      </Modal>
    </aside>
  );
};

export default DrawerPanel;
