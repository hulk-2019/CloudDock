import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Modal, Spin, Tooltip } from 'antd';
import { ChevronLeft, ChevronRight, Image as ImageIcon, Video } from 'lucide-react';
import type { FileItem } from '@/types';
import { formatFileSize, isImageFile, isVideoFile } from '@/utils/file';

interface MediaPreviewProps {
  files: FileItem[];
  currentFile: FileItem | null;
  open: boolean;
  onClose: () => void;
  onChange: (file: FileItem) => void;
  getFileUrl: (path: string) => Promise<string>;
  getContainer?: () => HTMLElement;
}

export function MediaPreview({
  files,
  currentFile,
  open,
  onClose,
  onChange,
  getFileUrl,
  getContainer,
}: MediaPreviewProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentIndex = useMemo(
    () => files.findIndex((file) => file.path === currentFile?.path),
    [currentFile?.path, files]
  );
  const hasMultiple = files.length > 1;

  useEffect(() => {
    if (!open || !currentFile) {
      setUrl('');
      setError(null);
      return;
    }

    let cancelled = false;
    setUrl(currentFile.url ?? '');
    setError(null);
    setLoading(true);

    void getFileUrl(currentFile.path)
      .then((freshUrl) => {
        if (!cancelled && freshUrl) setUrl(freshUrl);
      })
      .catch((previewError) => {
        if (!cancelled && !currentFile.url) {
          setError((previewError as Error).message || '无法加载媒体文件');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentFile, getFileUrl, open]);

  const showAt = (index: number) => {
    if (!files.length) return;
    const nextIndex = (index + files.length) % files.length;
    onChange(files[nextIndex]);
  };

  useEffect(() => {
    if (!open || currentIndex < 0) return;

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && hasMultiple) {
        event.preventDefault();
        showAt(currentIndex - 1);
      }
      if (event.key === 'ArrowRight' && hasMultiple) {
        event.preventDefault();
        showAt(currentIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, files, hasMultiple, open]);

  const isVideo = currentFile ? isVideoFile(currentFile.name) : false;

  return (
    <Modal
      open={open && Boolean(currentFile)}
      width="min(960px, calc(100vw - 48px))"
      footer={null}
      centered
      destroyOnClose
      getContainer={getContainer}
      title={
        currentFile ? (
          <div className="flex min-w-0 items-center gap-2 pr-8">
            {isVideo ? (
              <Video size={17} strokeWidth={2} className="shrink-0 text-primary" />
            ) : (
              <ImageIcon size={17} strokeWidth={2} className="shrink-0 text-primary" />
            )}
            <span className="min-w-0 flex-1 truncate" title={currentFile.name}>
              {currentFile.name}
            </span>
            <span className="shrink-0 text-xs font-normal text-content-secondary">
              {currentIndex + 1} / {files.length}
            </span>
          </div>
        ) : null
      }
      onCancel={onClose}
      styles={{ body: { padding: 0 } }}
    >
      <div className="relative flex h-[72vh] min-h-80 items-center justify-center overflow-hidden rounded border border-border bg-bg">
        {loading && !url && <Spin tip="正在加载预览" />}
        {error && !url && (
          <Alert className="max-w-md" type="error" showIcon message="预览加载失败" description={error} />
        )}
        {currentFile && url && isImageFile(currentFile.name) && (
          <img src={url} alt={currentFile.name} className="max-h-full max-w-full object-contain" />
        )}
        {currentFile && url && isVideo && (
          <video
            key={url}
            src={url}
            controls
            autoPlay
            playsInline
            preload="metadata"
            className="max-h-full max-w-full bg-black object-contain"
          >
            当前浏览器不支持视频预览。
          </video>
        )}

        {hasMultiple && (
          <>
            <Tooltip title="上一个（←）">
              <Button
                shape="circle"
                size="large"
                aria-label="预览上一个媒体文件"
                className="absolute left-4 border-border bg-surface text-content shadow"
                icon={<ChevronLeft size={22} strokeWidth={2} />}
                onClick={() => showAt(currentIndex - 1)}
              />
            </Tooltip>
            <Tooltip title="下一个（→）">
              <Button
                shape="circle"
                size="large"
                aria-label="预览下一个媒体文件"
                className="absolute right-4 border-border bg-surface text-content shadow"
                icon={<ChevronRight size={22} strokeWidth={2} />}
                onClick={() => showAt(currentIndex + 1)}
              />
            </Tooltip>
          </>
        )}
      </div>
      {currentFile && (
        <div className="flex items-center justify-between gap-3 px-1 pt-3 text-xs text-content-secondary">
          <span className="truncate">当前目录中的图片与视频可使用方向键连续预览</span>
          <span className="shrink-0">{formatFileSize(currentFile.size)}</span>
        </div>
      )}
    </Modal>
  );
}
