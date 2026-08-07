import { Button, Dropdown, Tooltip, type MenuProps } from 'antd';
import {
  ChevronRight,
  Folder,
  FolderPlus,
  Home,
  LayoutGrid,
  List,
  MoreHorizontal,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { useI18n } from '@/i18n';
import type { FileViewMode } from '@/types';
import { cn } from '@/lib/utils';

interface BreadcrumbToolbarProps {
  currentPath: string;
  loading: boolean;
  viewMode: FileViewMode;
  onNavigate: (path: string) => void;
  onRefresh: () => void;
  onSelectFiles: () => void;
  onCreateFolder: () => void;
  onToggleViewMode: () => void;
}

interface CrumbItem {
  name: string;
  path: string;
  root: boolean;
}

const MAX_VISIBLE_CRUMBS = 4;

function buildCrumbs(currentPath: string, rootName: string): CrumbItem[] {
  const parts = currentPath.split('/').filter(Boolean);
  let accumulatedPath = '';
  return [
    { name: rootName, path: '/', root: true },
    ...parts.map((part) => {
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;
      return { name: part, path: accumulatedPath, root: false };
    }),
  ];
}

function CrumbButton({
  crumb,
  current,
  onNavigate,
}: {
  crumb: CrumbItem;
  current: boolean;
  onNavigate: (path: string) => void;
}) {
  return (
    <button
      type="button"
      aria-current={current ? 'page' : undefined}
      title={crumb.name}
      className={cn(
        'flex max-w-32 items-center gap-1.5 rounded border-0 bg-transparent px-2 py-1 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
        current
          ? 'bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface))] font-semibold text-content'
          : 'cursor-pointer text-content-secondary hover:bg-bg hover:text-content'
      )}
      onClick={() => onNavigate(crumb.path)}
    >
      {crumb.root && <Home aria-hidden size={14} strokeWidth={1.8} />}
      <span className="truncate">{crumb.name}</span>
    </button>
  );
}

export function BreadcrumbToolbar({
  currentPath,
  loading,
  viewMode,
  onNavigate,
  onRefresh,
  onSelectFiles,
  onCreateFolder,
  onToggleViewMode,
}: BreadcrumbToolbarProps) {
  const { t } = useI18n();
  const crumbs = buildCrumbs(currentPath, t('files.root'));
  const shouldCollapse = crumbs.length > MAX_VISIBLE_CRUMBS;
  const hiddenCrumbs = shouldCollapse ? crumbs.slice(1, -2) : [];
  const visibleCrumbs = shouldCollapse ? [crumbs[0], ...crumbs.slice(-2)] : crumbs;
  const hiddenMenu: MenuProps = {
    items: hiddenCrumbs.map((crumb) => ({
      key: crumb.path,
      icon: <Folder aria-hidden size={15} strokeWidth={1.8} />,
      label: (
        <span className="flex max-w-64 flex-col py-1" title={crumb.path}>
          <span className="truncate text-sm text-content">{crumb.name}</span>
          <span className="truncate text-xs text-content-secondary">/{crumb.path}</span>
        </span>
      ),
    })),
    onClick: ({ key }) => onNavigate(key),
  };

  return (
    <div className="flex min-h-11 items-center gap-2 border-b border-border pb-3">
      <nav
        aria-label={t('files.currentFilePath')}
        className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <ol className="m-0 flex min-w-max items-center gap-1 p-0 [list-style:none]">
          {visibleCrumbs.map((crumb, index) => {
            const current = crumb.path === crumbs[crumbs.length - 1]?.path;
            const showCollapsedMenu = shouldCollapse && index === 1;
            return (
              <li key={crumb.path} className="flex items-center gap-1">
                {index > 0 && (
                  <ChevronRight
                    aria-hidden
                    size={13}
                    strokeWidth={1.8}
                    className="shrink-0 text-content-secondary"
                  />
                )}
                {showCollapsedMenu && (
                  <>
                    <Dropdown
                      menu={hiddenMenu}
                      trigger={['hover', 'click']}
                      placement="bottomLeft"
                      mouseEnterDelay={0.05}
                      mouseLeaveDelay={0.2}
                    >
                      <button
                        type="button"
                        aria-label={t('files.viewCountHiddenPathLevels', {
                          count: hiddenCrumbs.length,
                        })}
                        title={t('files.viewHiddenPath')}
                        className="flex cursor-pointer items-center rounded border-0 bg-transparent px-2 py-1 text-content-secondary transition hover:bg-bg hover:text-content focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        <MoreHorizontal aria-hidden size={17} strokeWidth={1.8} />
                      </button>
                    </Dropdown>
                    <ChevronRight
                      aria-hidden
                      size={13}
                      strokeWidth={1.8}
                      className="shrink-0 text-content-secondary"
                    />
                  </>
                )}
                <CrumbButton crumb={crumb} current={current} onNavigate={onNavigate} />
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex shrink-0 items-center gap-1 border-l border-border pl-2">
        <Tooltip title={t('files.refreshFileList')}>
          <Button
            type="text"
            aria-label={t('files.refreshFileList')}
            icon={
              <RefreshCw size={16} strokeWidth={1.8} className={loading ? 'animate-spin' : ''} />
            }
            onClick={onRefresh}
            disabled={loading}
          />
        </Tooltip>
        <Tooltip title={t('files.uploadFilesMultipleSelectionSupported')}>
          <Button
            type="text"
            aria-label={t('files.selectFilesToUpload')}
            className="text-primary"
            icon={<Upload size={16} strokeWidth={1.8} />}
            onClick={onSelectFiles}
          />
        </Tooltip>
        <Tooltip title={t('files.newFolder')}>
          <Button
            type="text"
            aria-label={t('files.newFolder')}
            className="text-primary"
            icon={<FolderPlus size={17} strokeWidth={1.8} />}
            onClick={onCreateFolder}
          />
        </Tooltip>
        <Tooltip
          title={t(viewMode === 'grid' ? 'files.switchToListView' : 'files.switchToGridView')}
        >
          <Button
            type="text"
            aria-label={t(
              viewMode === 'grid' ? 'files.switchToListView' : 'files.switchToGridView'
            )}
            icon={
              viewMode === 'grid' ? (
                <List size={17} strokeWidth={1.8} />
              ) : (
                <LayoutGrid size={17} strokeWidth={1.8} />
              )
            }
            onClick={onToggleViewMode}
          />
        </Tooltip>
      </div>
    </div>
  );
}
