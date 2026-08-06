import React, { useRef, useEffect, useState } from 'react';
import {
  X,
  FolderOpen,
  File,
  Download,
  Trash2,
  Link,
  ChevronRight,
  Home,
  RefreshCw,
  FolderPlus,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  PlayCircle,
  Settings,
} from 'lucide-react';
import { useCloudStorage } from '@/hooks/useCloudStorage';
import { useDragUpload } from '@/hooks/useDragUpload';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useUIStore } from '@/store/ui';
import { useConfigStore } from '@/store/config';
import { formatFileSize, formatDate, getParentPath, getBasename, joinPath } from '@/utils/file';
import { captureScreenshot, readImageFromClipboard } from '@/utils/screenshot';
import type { FileItem } from '@/types';
import { ConfigPanel } from './ConfigPanel';
import { ConfigSwitcher } from './ConfigSwitcher';

// 内部拖拽标记：区分"文件移动"和"外部文件上传"
const INTERNAL_DRAG_TYPE = 'application/x-clouddock-move';

// 判断是否为图片文件
const isImageFile = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext || '');
};

// 判断是否为视频文件
const isVideoFile = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext || '');
};

// 判断是否为音频文件
const isAudioFile = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'].includes(ext || '');
};

// 判断是否为压缩文件
const isArchiveFile = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext || '');
};

// 判断是否为代码文件
const isCodeFile = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  return [
    'js',
    'ts',
    'jsx',
    'tsx',
    'py',
    'java',
    'cpp',
    'c',
    'go',
    'rs',
    'php',
    'rb',
    'swift',
    'kt',
    'html',
    'css',
    'scss',
    'json',
    'xml',
    'yaml',
    'yml',
  ].includes(ext || '');
};

// 判断是否为文档文件
const isDocFile = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ['txt', 'md', 'pdf', 'doc', 'docx', 'ppt', 'pptx'].includes(ext || '');
};

// 判断是否为表格文件
const isSpreadsheetFile = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ['xls', 'xlsx', 'csv'].includes(ext || '');
};

// 根据文件类型返回图标
const getFileIcon = (filename: string, size: number = 48) => {
  if (isImageFile(filename)) return <FileImage size={size} />;
  if (isVideoFile(filename)) return <FileVideo size={size} />;
  if (isAudioFile(filename)) return <FileAudio size={size} />;
  if (isArchiveFile(filename)) return <FileArchive size={size} />;
  if (isCodeFile(filename)) return <FileCode size={size} />;
  if (isDocFile(filename)) return <FileText size={size} />;
  if (isSpreadsheetFile(filename)) return <FileSpreadsheet size={size} />;
  return <File size={size} />;
};

// 获取文件类型标识（用于 CSS 样式）
const getFileType = (filename: string): string => {
  if (isImageFile(filename)) return 'image';
  if (isVideoFile(filename)) return 'video';
  if (isAudioFile(filename)) return 'audio';
  if (isArchiveFile(filename)) return 'archive';
  if (isCodeFile(filename)) return 'code';
  if (isDocFile(filename)) return 'doc';
  if (isSpreadsheetFile(filename)) return 'spreadsheet';
  return 'file';
};

interface DrawerPanelProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * 侧边抽屉组件
 */
const DrawerPanel: React.FC<DrawerPanelProps> = ({ visible, onClose }) => {
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  // 当前被拖拽悬停的文件夹路径（用于高亮）
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  // 正在拖拽的源文件（内部移动用）
  const [draggingFile, setDraggingFile] = useState<FileItem | null>(null);
  // 视图切换：文件列表或配置管理
  const [currentView, setCurrentView] = useState<'files' | 'config'>('files');

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
    provider,
  } = useCloudStorage();

  const { uploadFile } = useFileUpload();
  const { getActiveConfig } = useConfigStore();
  const { uploadQueue } = useUIStore();

  // 使用拖拽上传 Hook
  useDragUpload(dropZoneRef);

  // 调试：抽屉可见性变化时打印日志
  useEffect(() => {
    console.log('DrawerPanel visible:', visible);
  }, [visible]);

  // 监听粘贴事件（截图粘贴）
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!visible) return;

      const image = await readImageFromClipboard();
      if (image) {
        try {
          await uploadFile(image);
          await refresh();
        } catch (error) {
          console.error('Paste upload failed:', error);
        }
      }
    };

    if (visible) {
      document.addEventListener('paste', handlePaste);
    }

    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [visible, uploadFile, refresh]);

  // 截图上传
  const handleScreenshotUpload = async () => {
    try {
      const screenshot = await captureScreenshot();
      await uploadFile(screenshot);
      await refresh();
    } catch (error) {
      console.error('Screenshot upload failed:', error);
    }
  };

  // 面包屑导航
  const renderBreadcrumb = () => {
    const parts = currentPath.split('/').filter(Boolean);
    const breadcrumbs = [{ name: '根目录', path: '/' }];

    let accPath = '';
    for (const part of parts) {
      accPath += `/${part}`;
      breadcrumbs.push({ name: part, path: accPath });
    }

    return (
      <div className="breadcrumb">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.path}>
            <button className="breadcrumb-item" onClick={() => navigate(crumb.path)}>
              {index === 0 ? <Home size={14} /> : crumb.name}
            </button>
            {index < breadcrumbs.length - 1 && <ChevronRight size={14} />}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // 文件点击
  const handleFileClick = async (file: any) => {
    if (file.type === 'folder') {
      navigate(file.path);
    } else {
      // 文件点击，显示操作菜单
      const url = await getFileUrl(file.path);
      navigator.clipboard.writeText(url);
      alert('文件链接已复制到剪贴板！');
    }
  };

  // 创建文件夹
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      await createFolder(newFolderName);
      setNewFolderName('');
      setShowNewFolderInput(false);
    } catch (error) {
      alert((error as Error).message);
    }
  };

  // ========== 文件拖拽移动 ==========

  // 开始拖拽文件
  const handleFileDragStart = (e: React.DragEvent, file: FileItem) => {
    e.dataTransfer.setData(INTERNAL_DRAG_TYPE, file.path);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingFile(file);
  };

  // 拖拽结束
  const handleFileDragEnd = () => {
    setDraggingFile(null);
    setDragOverFolder(null);
  };

  // 拖拽经过文件夹
  const handleFolderDragOver = (e: React.DragEvent, folderPath: string) => {
    // 仅对内部拖拽响应（外部文件上传由 useDragUpload 处理）
    if (!e.dataTransfer.types.includes(INTERNAL_DRAG_TYPE)) return;
    // 不能拖到自己身上
    if (draggingFile?.path === folderPath) return;

    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolder(folderPath);
  };

  // 离开文件夹
  const handleFolderDragLeave = () => {
    setDragOverFolder(null);
  };

  // 放置到文件夹（执行移动）
  const handleFolderDrop = async (e: React.DragEvent, folderPath: string) => {
    const sourcePath = e.dataTransfer.getData(INTERNAL_DRAG_TYPE);
    if (!sourcePath) return; // 非内部拖拽，交给上传逻辑

    // 阻止冒泡到 dropZone，避免触发上传
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);
    setDraggingFile(null);

    // 目标路径 = 目标文件夹 + 源文件名
    const fileName = getBasename(sourcePath);
    const targetPath = joinPath(folderPath, fileName);

    if (sourcePath === targetPath) return; // 原地不动

    try {
      await moveFile(sourcePath, targetPath);
    } catch (error) {
      alert((error as Error).message);
    }
  };

  if (!visible) return null;

  const activeConfig = getActiveConfig();

  // 显示配置面板
  if (currentView === 'config') {
    return (
      <div className="drawer-panel">
        <ConfigPanel onBack={() => setCurrentView('files')} />
      </div>
    );
  }

  return (
    <div className="drawer-panel">
      <div className="drawer-header">
        <h2>CloudDock</h2>
        <div className="header-actions">
          {activeConfig && (
            <>
              <button onClick={refresh} title="刷新">
                <RefreshCw size={18} />
              </button>
              <button onClick={() => setShowNewFolderInput(true)} title="新建文件夹">
                <FolderPlus size={18} />
              </button>
            </>
          )}
          {activeConfig && (
            <button
              onClick={() => setCurrentView('config')}
              title="配置管理"
              aria-label="打开配置管理"
            >
              <Settings size={18} aria-hidden="true" />
            </button>
          )}
          <button onClick={onClose} title="关闭" aria-label="关闭 CloudDock">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* 配置切换器 */}
      {activeConfig && <ConfigSwitcher />}

      {activeConfig && renderBreadcrumb()}

      <div className="drawer-content" ref={dropZoneRef}>
        {/* 未配置提示 */}
        {!activeConfig && (
          <div className="welcome-state">
            <div className="welcome-icon" aria-hidden="true">
              <FolderOpen size={30} />
            </div>
            <div className="welcome-copy">
              <h3>开始使用 CloudDock</h3>
              <p>添加一个云存储配置，即可在当前页面浏览、上传和管理文件。</p>
            </div>
            <button className="welcome-action" onClick={() => setCurrentView('config')}>
              前往设置
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          </div>
        )}

        {activeConfig && error && <div className="error-message">{error}</div>}

        {activeConfig && showNewFolderInput && (
          <div className="new-folder-input">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="文件夹名称"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') setShowNewFolderInput(false);
              }}
            />
            <button onClick={handleCreateFolder}>创建</button>
            <button onClick={() => setShowNewFolderInput(false)}>取消</button>
          </div>
        )}

        {activeConfig &&
          (loading ? (
            <div className="loading">
              <div className="loading-spinner"></div>
              <p>加载中...</p>
            </div>
          ) : (
            <div className="file-grid">
              {files.map((file) => (
                <div
                  key={file.path}
                  className={`file-card ${file.type} ${dragOverFolder === file.path ? 'drag-over' : ''} ${
                    draggingFile?.path === file.path ? 'dragging' : ''
                  }`}
                  data-filetype={file.type === 'file' ? getFileType(file.name) : 'folder'}
                  draggable={file.type === 'file'}
                  onDragStart={(e) => handleFileDragStart(e, file)}
                  onDragEnd={handleFileDragEnd}
                  onDragOver={
                    file.type === 'folder' ? (e) => handleFolderDragOver(e, file.path) : undefined
                  }
                  onDragLeave={file.type === 'folder' ? handleFolderDragLeave : undefined}
                  onDrop={
                    file.type === 'folder' ? (e) => handleFolderDrop(e, file.path) : undefined
                  }
                  onClick={() => handleFileClick(file)}
                >
                  <div className="file-card-icon">
                    {file.type === 'folder' ? (
                      <FolderOpen size={48} />
                    ) : isImageFile(file.name) || isVideoFile(file.name) ? (
                      <>
                        <img
                          src={file.url || ''}
                          alt={file.name}
                          className="file-thumbnail"
                          onError={(e) => {
                            // 加载失败时显示默认图标
                            (e.target as HTMLImageElement).style.display = 'none';
                            const fallback = (
                              e.target as HTMLImageElement
                            ).parentElement?.querySelector('.fallback-icon');
                            fallback?.classList.remove('hidden');
                          }}
                        />
                        {/* 视频播放按钮 */}
                        {isVideoFile(file.name) && (
                          <div className="video-play-overlay">
                            <PlayCircle size={32} />
                          </div>
                        )}
                        {/* 降级图标 */}
                        <div className="hidden fallback-icon">{getFileIcon(file.name, 48)}</div>
                      </>
                    ) : (
                      getFileIcon(file.name, 48)
                    )}
                  </div>
                  <div className="file-card-info">
                    <div className="file-card-name" title={file.name}>
                      {file.name}
                    </div>
                    <div className="file-card-meta">
                      {file.type === 'file' && formatFileSize(file.size)}{' '}
                      {formatDate(file.lastModified)}
                    </div>
                  </div>
                  {file.type === 'file' && (
                    <div className="file-card-actions">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const url = await getFileUrl(file.path);
                          navigator.clipboard.writeText(url);
                          alert('链接已复制！');
                        }}
                        title="复制链接"
                      >
                        <Link size={16} />
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm(`确定删除 ${file.name}？`)) {
                            await deleteFile(file.path);
                          }
                        }}
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {files.length === 0 && !loading && (
                <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                  <p>此文件夹为空</p>
                  <p className="hint">拖拽文件到这里上传</p>
                </div>
              )}
            </div>
          ))}

        {activeConfig && uploadQueue.length > 0 && (
          <div className="upload-queue">
            <h3>上传队列</h3>
            {uploadQueue.map((upload) => (
              <div key={upload.fileName} className={`upload-item ${upload.status}`}>
                <span className="upload-filename">{upload.fileName}</span>
                <div className="progress-bar">
                  <div
                    className={`progress-fill ${upload.status === 'error' ? 'error' : ''}`}
                    style={{ width: `${upload.percent}%` }}
                  />
                </div>
                <span className="upload-status">
                  {upload.status === 'success' && '✓'}
                  {upload.status === 'error' && <span style={{ color: '#f5222d' }}>❌ 失败</span>}
                  {upload.status === 'uploading' && `${Math.round(upload.percent)}%`}
                </span>
                {upload.status === 'error' && (
                  <button
                    className="upload-remove"
                    onClick={() => {
                      const { removeUpload } = useUIStore.getState();
                      removeUpload(upload.fileName);
                    }}
                    title="移除"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {activeConfig && (
        <div className="drawer-footer">
          <div className="upload-hint">💡 支持拖拽文件、网页图片、Ctrl+V 粘贴截图上传</div>
        </div>
      )}
    </div>
  );
};

export default DrawerPanel;
