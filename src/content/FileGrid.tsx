import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Button, Card, Empty, Spin, Tooltip } from 'antd';
import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  FolderOpen,
  Link,
  PlayCircle,
  Trash2,
} from 'lucide-react';
import { useI18n } from '@/i18n';
import type { FileItem, FileViewMode } from '@/types';
import { formatDate, formatFileSize, isImageFile, isVideoFile } from '@/utils/file';
import { cn } from '@/lib/utils';

const INTERNAL_DRAG_TYPE = 'application/x-clouddock-move';

function extension(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

function fileIcon(name: string, size = 42): ReactNode {
  const iconProps = { size, strokeWidth: 2 } as const;
  const ext = extension(name);
  if (isImageFile(name)) return <FileImage {...iconProps} />;
  if (isVideoFile(name)) return <FileVideo {...iconProps} />;
  if (['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'].includes(ext))
    return <FileAudio {...iconProps} />;
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) return <FileArchive {...iconProps} />;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet {...iconProps} />;
  if (['txt', 'md', 'pdf', 'doc', 'docx', 'ppt', 'pptx'].includes(ext))
    return <FileText {...iconProps} />;
  if (
    ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'go', 'rs', 'html', 'css', 'json', 'yaml'].includes(
      ext
    )
  ) {
    return <FileCode {...iconProps} />;
  }
  return <File {...iconProps} />;
}

function FilePreview({ file, compact = false }: { file: FileItem; compact?: boolean }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [file.url]);

  if (file.type === 'folder') {
    return <FolderOpen size={compact ? 22 : 58} strokeWidth={1.8} className="text-primary" />;
  }

  if (isImageFile(file.name) && file.url && !failed) {
    return (
      <img
        src={file.url}
        alt=""
        loading="lazy"
        className="h-full w-full rounded object-cover"
        onError={() => setFailed(true)}
      />
    );
  }

  if (isVideoFile(file.name) && file.url && !failed) {
    return (
      <div className="relative h-full w-full overflow-hidden rounded">
        <video
          src={file.url}
          muted
          playsInline
          // metadata：仅拉取元数据，封面帧由下方 seek 按需加载，避免列表里所有视频全量下载。
          preload="metadata"
          className="h-full w-full object-cover"
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            if (Number.isFinite(video.duration) && video.duration > 0) {
              video.currentTime = Math.min(0.1, video.duration / 2);
            }
          }}
          onError={() => setFailed(true)}
        />
        <span className="absolute inset-0 flex items-center justify-center">
          <span
            className={cn(
              'flex items-center justify-center rounded-full border border-border bg-surface text-primary shadow',
              compact ? 'h-5 w-5' : 'h-11 w-11'
            )}
          >
            <PlayCircle size={compact ? 13 : 27} strokeWidth={2} />
          </span>
        </span>
      </div>
    );
  }

  return <span className="text-content-secondary">{fileIcon(file.name, compact ? 20 : 42)}</span>;
}

interface FileGridProps {
  files: FileItem[];
  loading: boolean;
  draggingFile: FileItem | null;
  dragOverFolder: string | null;
  viewMode: FileViewMode;
  /** 承载列表的滚动容器（抽屉内容区），虚拟化基于它计算可视窗口。 */
  scrollRef: RefObject<HTMLDivElement>;
  onOpen: (file: FileItem) => void;
  onCopyLink: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
  onDragStart: (event: DragEvent, file: FileItem) => void;
  onDragEnd: () => void;
  onFolderDragOver: (event: DragEvent, folderPath: string) => void;
  onFolderDragLeave: () => void;
  onFolderDrop: (event: DragEvent, folderPath: string) => void;
}

/** 卡片模式每行 2 张卡片，约 176px + 行距 16px；表格模式每行 1 条，约 58px + 行距 8px。实际高度由 measureElement 动态修正。 */
const VIEW_MODE_LAYOUT: Record<FileViewMode, { columns: number; estimatedRowHeight: number }> = {
  grid: { columns: 2, estimatedRowHeight: 192 },
  list: { columns: 1, estimatedRowHeight: 66 },
};

export function FileGrid({
  files,
  loading,
  draggingFile,
  dragOverFolder,
  viewMode,
  scrollRef,
  onOpen,
  onCopyLink,
  onDelete,
  onDragStart,
  onDragEnd,
  onFolderDragOver,
  onFolderDragLeave,
  onFolderDrop,
}: FileGridProps) {
  const { t, locale } = useI18n();
  const { columns, estimatedRowHeight } = VIEW_MODE_LAYOUT[viewMode];
  const listRef = useRef<HTMLDivElement>(null);
  // 列表上方可能有错误提示等内容，行位置需要加上列表在滚动容器内的偏移。
  const [scrollMargin, setScrollMargin] = useState(0);
  useLayoutEffect(() => {
    setScrollMargin(listRef.current?.offsetTop ?? 0);
  });

  const rows = useMemo(() => {
    const result: FileItem[][] = [];
    for (let index = 0; index < files.length; index += columns) {
      result.push(files.slice(index, index + columns));
    }
    return result;
  }, [columns, files]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: viewMode === 'grid' ? 4 : 10,
    scrollMargin,
  });

  // 切换视图模式后行高完全不同，旧的测量缓存必须丢弃。
  useEffect(() => {
    virtualizer.measure();
  }, [viewMode, virtualizer]);

  const handleKeyDown = (event: KeyboardEvent, file: FileItem) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen(file);
    }
  };

  if (loading && files.length === 0) {
    return (
      <div className="flex min-h-56 items-center justify-center">
        <Spin tip={t('files.loadingCloudFiles')} />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex min-h-56 items-center justify-center rounded border border-dashed border-border bg-surface p-6">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('files.thisFolderIsEmptyDropFilesHereToUpload')}
        />
      </div>
    );
  }

  const renderCard = (file: FileItem) => {
    const isDropTarget = file.type === 'folder' && dragOverFolder === file.path;
    const isDragging = draggingFile?.path === file.path;
    return (
      <Card
        key={file.path}
        hoverable
        role="button"
        tabIndex={0}
        draggable
        aria-label={`${t(file.type === 'folder' ? 'files.folder' : 'files.file')} ${file.name}`}
        className={cn(
          'group cursor-pointer border-border bg-surface shadow transition-all duration-300 hover:-translate-y-1 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
          isDropTarget && 'border-primary ring-2 ring-primary',
          isDragging && 'opacity-50'
        )}
        styles={{ body: { padding: 12 } }}
        onClick={() => onOpen(file)}
        onKeyDown={(event) => handleKeyDown(event, file)}
        onDragStart={(event) => onDragStart(event, file)}
        onDragEnd={onDragEnd}
        onDragOver={
          file.type === 'folder' ? (event) => onFolderDragOver(event, file.path) : undefined
        }
        onDragLeave={file.type === 'folder' ? onFolderDragLeave : undefined}
        onDrop={file.type === 'folder' ? (event) => onFolderDrop(event, file.path) : undefined}
      >
        <div className="relative mb-3 flex h-24 items-center justify-center rounded border border-border bg-bg">
          <FilePreview file={file} />
          <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
            {file.type === 'file' && (
              <Tooltip title={t('files.copyLink')}>
                <Button
                  size="small"
                  shape="circle"
                  aria-label={t('files.copyLinkForName', { name: file.name })}
                  className="border-border bg-surface text-content shadow"
                  icon={<Link size={14} strokeWidth={2} />}
                  onClick={(event) => {
                    event.stopPropagation();
                    onCopyLink(file);
                  }}
                />
              </Tooltip>
            )}
            <Tooltip title={t('config.delete')}>
              <Button
                danger
                size="small"
                shape="circle"
                aria-label={t('config.deleteName2', { name: file.name })}
                className="bg-surface shadow"
                icon={<Trash2 size={14} strokeWidth={2} />}
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(file);
                }}
              />
            </Tooltip>
          </div>
        </div>
        <div className="truncate text-sm font-semibold text-content" title={file.name}>
          {file.name}
        </div>
        <div className="mt-1 truncate text-xs text-content-secondary">
          {file.type === 'file' ? `${formatFileSize(file.size)} · ` : ''}
          {formatDate(file.lastModified, locale)}
        </div>
      </Card>
    );
  };

  const renderListRow = (file: FileItem) => {
    const isDropTarget = file.type === 'folder' && dragOverFolder === file.path;
    const isDragging = draggingFile?.path === file.path;
    return (
      <div
        key={file.path}
        role="button"
        tabIndex={0}
        draggable
        aria-label={`${t(file.type === 'folder' ? 'files.folder' : 'files.file')} ${file.name}`}
        className={cn(
          'group flex cursor-pointer items-center gap-3 rounded border border-border bg-surface px-3 py-2 shadow-sm transition hover:border-primary/50 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
          isDropTarget && 'border-primary ring-2 ring-primary',
          isDragging && 'opacity-50'
        )}
        onClick={() => onOpen(file)}
        onKeyDown={(event) => handleKeyDown(event, file)}
        onDragStart={(event) => onDragStart(event, file)}
        onDragEnd={onDragEnd}
        onDragOver={
          file.type === 'folder' ? (event) => onFolderDragOver(event, file.path) : undefined
        }
        onDragLeave={file.type === 'folder' ? onFolderDragLeave : undefined}
        onDrop={file.type === 'folder' ? (event) => onFolderDrop(event, file.path) : undefined}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-bg">
          <FilePreview file={file} compact />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-content" title={file.name}>
            {file.name}
          </span>
          <span className="block truncate text-xs text-content-secondary">
            {file.type === 'file' ? `${formatFileSize(file.size)} · ` : ''}
            {formatDate(file.lastModified, locale)}
          </span>
        </span>
        <span className="flex shrink-0 gap-1 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
          {file.type === 'file' && (
            <Tooltip title={t('files.copyLink')}>
              <Button
                size="small"
                type="text"
                aria-label={t('files.copyLinkForName', { name: file.name })}
                icon={<Link size={14} strokeWidth={2} />}
                onClick={(event) => {
                  event.stopPropagation();
                  onCopyLink(file);
                }}
              />
            </Tooltip>
          )}
          <Tooltip title={t('config.delete')}>
            <Button
              danger
              size="small"
              type="text"
              aria-label={t('config.deleteName2', { name: file.name })}
              icon={<Trash2 size={14} strokeWidth={2} />}
              onClick={(event) => {
                event.stopPropagation();
                onDelete(file);
              }}
            />
          </Tooltip>
        </span>
      </div>
    );
  };

  return (
    <div ref={listRef} className="relative" style={{ height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map((virtualRow) => (
        <div
          key={virtualRow.key}
          ref={virtualizer.measureElement}
          data-index={virtualRow.index}
          className={cn(
            'absolute left-0 top-0 w-full',
            viewMode === 'grid' ? 'grid grid-cols-2 gap-x-4 pb-4' : 'pb-2'
          )}
          style={{ transform: `translateY(${virtualRow.start - scrollMargin}px)` }}
        >
          {rows[virtualRow.index]?.map(viewMode === 'grid' ? renderCard : renderListRow)}
        </div>
      ))}
    </div>
  );
}

export { INTERNAL_DRAG_TYPE };
