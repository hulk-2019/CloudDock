import { memo, useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Badge, Button, Dropdown, Empty, Progress, Tag, Tooltip } from 'antd';
import { Bell, CheckCircle2, CircleX, Clock, LoaderCircle, Trash2, X } from 'lucide-react';
import { useUIStore } from '@/store/ui';
import { uploadProgress } from '@/lib/uploadProgress';
import type { UploadTask } from '@/types';

// 任务项实际高度由 measureElement 校正，这里只需接近真实值以减少首帧跳动。
const ESTIMATED_TASK_HEIGHT = 76;

/** 单个上传任务：进度百分比由组件内部订阅进度总线维护，不经过全局 store。 */
const UploadTaskItem = memo(function UploadTaskItem({
  task,
  onRemove,
}: {
  task: UploadTask;
  onRemove: (fileName: string) => void;
}) {
  const [percent, setPercent] = useState(() => uploadProgress.get(task.fileName));
  useEffect(() => uploadProgress.subscribe(task.fileName, setPercent), [task.fileName]);
  const displayPercent = task.status === 'success' ? 100 : percent;

  return (
    <div className="rounded border border-border bg-bg px-3 py-2">
      <div className="mb-1 flex items-center gap-2">
        {task.status === 'success' && (
          <CheckCircle2 aria-hidden size={16} strokeWidth={2} className="text-success" />
        )}
        {task.status === 'error' && (
          <CircleX aria-hidden size={16} strokeWidth={2} className="text-danger" />
        )}
        {task.status === 'uploading' && (
          <LoaderCircle
            aria-hidden
            size={16}
            strokeWidth={2}
            className="animate-spin text-primary"
          />
        )}
        {task.status === 'pending' && (
          <Clock aria-hidden size={16} strokeWidth={2} className="text-content-secondary" />
        )}
        <span className="min-w-0 flex-1 truncate text-sm text-content" title={task.fileName}>
          {task.fileName}
        </span>
        <span className="text-xs tabular-nums text-content-secondary">
          {task.status === 'error' ? '失败' : task.status === 'pending' ? '等待中' : `${displayPercent}%`}
        </span>
        {task.status === 'error' && (
          <Button
            type="text"
            size="small"
            aria-label={`移除 ${task.fileName}`}
            icon={<X size={14} strokeWidth={2} />}
            onClick={() => onRemove(task.fileName)}
          />
        )}
      </div>
      <Progress
        percent={displayPercent}
        showInfo={false}
        size="small"
        status={
          task.status === 'error'
            ? 'exception'
            : task.status === 'success'
              ? 'success'
              : task.status === 'pending'
                ? 'normal'
                : 'active'
        }
      />
    </div>
  );
});

function UploadQueueList({
  tasks,
  onRemove,
}: {
  tasks: UploadTask[];
  onRemove: (fileName: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_TASK_HEIGHT,
    overscan: 6,
  });

  return (
    <div ref={scrollRef} className="max-h-80 overflow-y-auto">
      <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const task = tasks[virtualRow.index];
          return (
            <div
              key={task.fileName}
              ref={virtualizer.measureElement}
              data-index={virtualRow.index}
              className="absolute left-0 top-0 w-full pb-3"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              <UploadTaskItem task={task} onRemove={onRemove} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 头部铃铛入口：Badge 展示正在上传的任务数，点击以下拉面板展开上传队列。 */
export function UploadQueueBell() {
  const { uploadQueue, removeUpload, clearUploads } = useUIStore();
  // 等待中的任务同样属于“正在进行的上传”，一并计入角标。
  const uploadingCount = uploadQueue.filter(
    (task) => task.status === 'uploading' || task.status === 'pending'
  ).length;

  const handleRemove = (fileName: string) => {
    removeUpload(fileName);
    uploadProgress.reset(fileName);
  };

  const handleClear = () => {
    clearUploads();
    uploadProgress.resetAll();
  };

  const queuePanel = (
    <section
      aria-labelledby="upload-queue-title"
      className="w-80 rounded border border-border bg-surface-elevated p-4 shadow-lg"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 id="upload-queue-title" className="m-0 text-sm font-semibold text-content">
          上传队列
        </h3>
        <div className="flex items-center gap-1">
          <Tag bordered={false} className="m-0">
            {uploadQueue.length} 个任务
          </Tag>
          {uploadQueue.length > 0 && (
            <Tooltip title="清空所有任务">
              <Button
                type="text"
                size="small"
                aria-label="清空所有上传任务"
                icon={<Trash2 size={14} strokeWidth={2} />}
                onClick={handleClear}
              />
            </Tooltip>
          )}
        </div>
      </div>
      {uploadQueue.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无上传任务" />
      ) : (
        <UploadQueueList tasks={uploadQueue} onRemove={handleRemove} />
      )}
    </section>
  );

  return (
    <Dropdown
      trigger={['click']}
      placement="bottomRight"
      // 收起时弹层被置为 display:none，虚拟列表拿到的滚动容器尺寸为 0，
      // 再次展开会渲染成空列表；每次收起销毁弹层，展开时重新挂载并测量。
      destroyOnHidden
      popupRender={() => queuePanel}
    >
      <Badge size="small" count={uploadingCount} offset={[-4, 4]}>
        <Tooltip title="上传任务">
          <Button
            type="text"
            aria-label={
              uploadingCount > 0 ? `查看上传任务，${uploadingCount} 个正在上传` : '查看上传任务'
            }
            icon={<Bell size={18} strokeWidth={1.8} />}
          />
        </Tooltip>
      </Badge>
    </Dropdown>
  );
}
