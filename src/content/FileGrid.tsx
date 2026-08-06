import { useEffect, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
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
import type { FileItem } from '@/types';
import { formatDate, formatFileSize, isImageFile, isVideoFile } from '@/utils/file';
import { cn } from '@/lib/utils';

const INTERNAL_DRAG_TYPE = 'application/x-clouddock-move';
const iconProps = { size: 42, strokeWidth: 2 } as const;
const folderIconProps = { size: 58, strokeWidth: 1.8 } as const;

function extension(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

function fileIcon(name: string): ReactNode {
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

function FilePreview({ file }: { file: FileItem }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [file.url]);

  if (file.type === 'folder') {
    return <FolderOpen {...folderIconProps} className="text-primary" />;
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
          preload="auto"
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
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-primary shadow">
            <PlayCircle size={27} strokeWidth={2} />
          </span>
        </span>
      </div>
    );
  }

  return <span className="text-content-secondary">{fileIcon(file.name)}</span>;
}

interface FileGridProps {
  files: FileItem[];
  loading: boolean;
  draggingFile: FileItem | null;
  dragOverFolder: string | null;
  onOpen: (file: FileItem) => void;
  onCopyLink: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
  onDragStart: (event: DragEvent, file: FileItem) => void;
  onDragEnd: () => void;
  onFolderDragOver: (event: DragEvent, folderPath: string) => void;
  onFolderDragLeave: () => void;
  onFolderDrop: (event: DragEvent, folderPath: string) => void;
}

export function FileGrid({
  files,
  loading,
  draggingFile,
  dragOverFolder,
  onOpen,
  onCopyLink,
  onDelete,
  onDragStart,
  onDragEnd,
  onFolderDragOver,
  onFolderDragLeave,
  onFolderDrop,
}: FileGridProps) {
  const handleKeyDown = (event: KeyboardEvent, file: FileItem) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen(file);
    }
  };

  if (loading && files.length === 0) {
    return (
      <div className="flex min-h-56 items-center justify-center">
        <Spin tip="正在读取云端文件" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex min-h-56 items-center justify-center rounded border border-dashed border-border bg-surface p-6">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="此文件夹为空，拖入文件即可上传" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {files.map((file) => {
        const isDropTarget = file.type === 'folder' && dragOverFolder === file.path;
        const isDragging = draggingFile?.path === file.path;
        return (
          <Card
            key={file.path}
            hoverable
            role="button"
            tabIndex={0}
            draggable
            aria-label={`${file.type === 'folder' ? '文件夹' : '文件'} ${file.name}`}
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
              {file.type === 'file' && (
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                  <Tooltip title="复制链接">
                    <Button
                      size="small"
                      shape="circle"
                      aria-label={`复制 ${file.name} 的链接`}
                      className="border-border bg-surface text-content shadow"
                      icon={<Link size={14} strokeWidth={2} />}
                      onClick={(event) => {
                        event.stopPropagation();
                        onCopyLink(file);
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="删除">
                    <Button
                      danger
                      size="small"
                      shape="circle"
                      aria-label={`删除 ${file.name}`}
                      className="bg-surface shadow"
                      icon={<Trash2 size={14} strokeWidth={2} />}
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(file);
                      }}
                    />
                  </Tooltip>
                </div>
              )}
            </div>
            <div className="truncate text-sm font-semibold text-content" title={file.name}>
              {file.name}
            </div>
            <div className="mt-1 truncate text-xs text-content-secondary">
              {file.type === 'file' ? `${formatFileSize(file.size)} · ` : ''}
              {formatDate(file.lastModified)}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export { INTERNAL_DRAG_TYPE };
