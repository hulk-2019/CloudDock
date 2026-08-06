import { Button, Progress, Tag } from 'antd';
import { CheckCircle2, CircleX, LoaderCircle, X } from 'lucide-react';
import { useUIStore } from '@/store/ui';

export function UploadQueue() {
  const { uploadQueue, removeUpload } = useUIStore();
  if (uploadQueue.length === 0) return null;

  return (
    <section className="rounded border border-border bg-surface p-4 shadow" aria-labelledby="upload-queue-title">
      <div className="mb-3 flex items-center justify-between">
        <h3 id="upload-queue-title" className="m-0 text-sm font-semibold text-content">
          上传队列
        </h3>
        <Tag bordered={false}>{uploadQueue.length} 个任务</Tag>
      </div>
      <div className="flex flex-col gap-3">
        {uploadQueue.map((upload) => (
          <div key={upload.fileName} className="rounded border border-border bg-bg px-3 py-2">
            <div className="mb-1 flex items-center gap-2">
              {upload.status === 'success' && <CheckCircle2 size={16} strokeWidth={2} className="text-success" />}
              {upload.status === 'error' && <CircleX size={16} strokeWidth={2} className="text-danger" />}
              {upload.status === 'uploading' && (
                <LoaderCircle size={16} strokeWidth={2} className="animate-spin text-primary" />
              )}
              <span className="min-w-0 flex-1 truncate text-sm text-content" title={upload.fileName}>
                {upload.fileName}
              </span>
              <span className="text-xs tabular-nums text-content-secondary">
                {upload.status === 'error' ? '失败' : `${Math.round(upload.percent)}%`}
              </span>
              {upload.status === 'error' && (
                <Button
                  type="text"
                  size="small"
                  aria-label={`移除 ${upload.fileName}`}
                  icon={<X size={14} strokeWidth={2} />}
                  onClick={() => removeUpload(upload.fileName)}
                />
              )}
            </div>
            <Progress
              percent={upload.percent}
              showInfo={false}
              size="small"
              status={upload.status === 'error' ? 'exception' : upload.status === 'success' ? 'success' : 'active'}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
