import { Breadcrumb, Button, Tooltip } from 'antd';
import { ChevronRight, FolderPlus, Home, RefreshCw } from 'lucide-react';

interface BreadcrumbToolbarProps {
  currentPath: string;
  loading: boolean;
  onNavigate: (path: string) => void;
  onRefresh: () => void;
  onCreateFolder: () => void;
}

export function BreadcrumbToolbar({
  currentPath,
  loading,
  onNavigate,
  onRefresh,
  onCreateFolder,
}: BreadcrumbToolbarProps) {
  const parts = currentPath.split('/').filter(Boolean);
  let accumulatedPath = '';
  const items = [
    {
      title: (
        <Button
          type="link"
          size="small"
          className="h-auto px-1 py-0.5 text-content-secondary"
          icon={<Home size={14} strokeWidth={2} />}
          onClick={() => onNavigate('/')}
        >
          根目录
        </Button>
      ),
    },
    ...parts.map((part) => {
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;
      const targetPath = accumulatedPath;
      return {
        title: (
          <Button
            type="link"
            size="small"
            className="h-auto max-w-28 px-1 py-0.5 text-content"
            title={part}
            onClick={() => onNavigate(targetPath)}
          >
            <span className="truncate">{part}</span>
          </Button>
        ),
      };
    }),
  ];

  return (
    <div className="flex min-h-control items-center justify-between gap-3 rounded border border-border bg-surface px-3 py-2 shadow">
      <Breadcrumb
        className="min-w-0 flex-1 overflow-hidden"
        separator={<ChevronRight size={13} strokeWidth={2} className="text-content-secondary" />}
        items={items}
      />
      <div className="flex shrink-0 items-center gap-2">
        <Tooltip title="刷新文件列表">
          <Button
            aria-label="刷新文件列表"
            className="border-border bg-surface text-content shadow active:translate-y-px active:shadow-none"
            icon={<RefreshCw size={16} strokeWidth={2} className={loading ? 'animate-spin' : ''} />}
            onClick={onRefresh}
            disabled={loading}
          />
        </Tooltip>
        <Tooltip title="新建文件夹">
          <Button
            type="primary"
            aria-label="新建文件夹"
            className="shadow active:translate-y-px active:shadow-none"
            icon={<FolderPlus size={16} strokeWidth={2} />}
            onClick={onCreateFolder}
          />
        </Tooltip>
      </div>
    </div>
  );
}
