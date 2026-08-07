import { useEffect, useMemo, useState } from 'react';
import Lightbox, { type Slide } from 'yet-another-react-lightbox';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import Video from 'yet-another-react-lightbox/plugins/video';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import { useI18n } from '@/i18n';
import type { FileItem } from '@/types';
import { formatFileSize, isVideoFile } from '@/utils/file';

interface MediaPreviewProps {
  files: FileItem[];
  currentFile: FileItem | null;
  open: boolean;
  onClose: () => void;
  onChange: (file: FileItem) => void;
  getFileUrl: (path: string) => Promise<string>;
  getContainer?: () => HTMLElement;
}

const VIDEO_MIME_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  ogv: 'video/ogg',
  mov: 'video/quicktime',
};

function videoMimeType(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return VIDEO_MIME_TYPES[ext] ?? 'video/mp4';
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
  const { t } = useI18n();
  // 列表返回的预签名 URL 可能已临近过期，打开预览时为当前文件换取新链接。
  const [freshUrls, setFreshUrls] = useState<Record<string, string>>({});

  const currentIndex = useMemo(
    () => files.findIndex((file) => file.path === currentFile?.path),
    [currentFile?.path, files]
  );

  useEffect(() => {
    if (!open || !currentFile) return;

    let cancelled = false;
    void getFileUrl(currentFile.path)
      .then((url) => {
        if (cancelled || !url) return;
        setFreshUrls((previous) =>
          previous[currentFile.path] === url ? previous : { ...previous, [currentFile.path]: url }
        );
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [currentFile, getFileUrl, open]);

  const slides = useMemo<Slide[]>(
    () =>
      files.map((file) => {
        const url = freshUrls[file.path] ?? file.url ?? '';
        const meta = {
          title: file.name,
          description: formatFileSize(file.size),
        };

        if (isVideoFile(file.name)) {
          return {
            ...meta,
            type: 'video' as const,
            controls: true,
            playsInline: true,
            preload: 'metadata',
            sources: [{ src: url, type: videoMimeType(file.name) }],
          };
        }

        return { ...meta, src: url };
      }),
    [files, freshUrls]
  );

  return (
    <Lightbox
      open={open && currentIndex >= 0}
      close={onClose}
      index={Math.max(currentIndex, 0)}
      slides={slides}
      plugins={[Captions, Counter, Video, Zoom]}
      labels={{
        Previous: t('preview.previous'),
        Next: t('preview.next'),
        Close: t('preview.closePreview'),
        Slide: t('preview.media'),
        Carousel: t('preview.mediaPreview'),
        Lightbox: t('preview.mediaPreview'),
        'Photo gallery': t('preview.mediaGallery'),
        'Zoom in': t('preview.zoomIn'),
        'Zoom out': t('preview.zoomOut'),
        Caption: t('preview.caption'),
        'Show captions': t('preview.showCaptions'),
        'Hide captions': t('preview.hideCaptions'),
      }}
      portal={{ root: getContainer }}
      carousel={{ finite: files.length <= 1 }}
      controller={{ closeOnBackdropClick: true }}
      captions={{ descriptionTextAlign: 'center' }}
      counter={{ container: { style: { top: 'unset', bottom: 0 } } }}
      zoom={{ maxZoomPixelRatio: 3 }}
      on={{
        view: ({ index }) => {
          const file = files[index];
          if (file && file.path !== currentFile?.path) onChange(file);
        },
      }}
      styles={{
        container: { backgroundColor: 'rgba(0, 0, 0, 0.9)', backdropFilter: 'blur(8px)' },
      }}
    />
  );
}
