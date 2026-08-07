import { useCallback, useEffect, useState } from 'react';
import Draggable, { type DraggableData, type DraggableEvent } from 'react-draggable';
import { Button } from 'antd';
import { Camera, CloudUpload, FolderOpen, HelpCircle } from 'lucide-react';
import { useI18n } from '@/i18n';
import { useConfigStore } from '@/store/config';

interface FloatingButtonProps {
  onClick: () => void;
  onScreenshot?: () => void;
}

const BUTTON_SIZE = 48;
const VIEWPORT_GAP = 24;
const iconProps = { size: 17, strokeWidth: 2 } as const;

function getDefaultPosition() {
  return {
    x: Math.max(VIEWPORT_GAP, window.innerWidth - BUTTON_SIZE - VIEWPORT_GAP),
    y: Math.max(VIEWPORT_GAP, window.innerHeight - BUTTON_SIZE - VIEWPORT_GAP),
  };
}

function clampPosition(position: { x: number; y: number }) {
  const maxX = Math.max(VIEWPORT_GAP, window.innerWidth - BUTTON_SIZE - VIEWPORT_GAP);
  const maxY = Math.max(VIEWPORT_GAP, window.innerHeight - BUTTON_SIZE - VIEWPORT_GAP);
  return {
    x: Math.min(Math.max(position.x, VIEWPORT_GAP), maxX),
    y: Math.min(Math.max(position.y, VIEWPORT_GAP), maxY),
  };
}

const FloatingButton = ({ onClick, onScreenshot }: FloatingButtonProps) => {
  const { t } = useI18n();
  const { floatingButtonPosition, setFloatingButtonPosition } = useConfigStore();
  const [showMenu, setShowMenu] = useState(false);
  const [position, setPosition] = useState(() =>
    clampPosition(floatingButtonPosition ?? getDefaultPosition())
  );

  useEffect(() => {
    setPosition(clampPosition(floatingButtonPosition ?? getDefaultPosition()));
  }, [floatingButtonPosition]);

  const keepInsideViewport = useCallback(() => {
    setPosition((current) =>
      floatingButtonPosition ? clampPosition(current) : getDefaultPosition()
    );
  }, [floatingButtonPosition]);

  useEffect(() => {
    window.addEventListener('resize', keepInsideViewport);
    return () => window.removeEventListener('resize', keepInsideViewport);
  }, [keepInsideViewport]);

  const handleStop = (_event: DraggableEvent, data: DraggableData) => {
    const nextPosition = clampPosition({ x: data.x, y: data.y });
    setPosition(nextPosition);
    setFloatingButtonPosition(nextPosition);
  };

  return (
    <Draggable
      position={position}
      onStop={handleStop}
      handle=".clouddock-drag-handle"
      cancel=".clouddock-no-drag"
    >
      <div className="pointer-events-auto fixed left-0 top-0 z-[2147483646] w-max font-sans text-content">
        <Button
          type="primary"
          shape="circle"
          aria-label={t('common.openCloudDrive')}
          aria-expanded={showMenu}
          title={`${t('content.clickToOpenCloudDock')} · ${t('content.dragToReposition')}`}
          className="clouddock-drag-handle flex !h-12 !w-12 !min-w-[48px] !p-0 cursor-grab items-center justify-center border border-white/20 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl active:cursor-grabbing active:scale-95 active:shadow-md"
          icon={<CloudUpload size={24} strokeWidth={2} />}
          onClick={onClick}
          onContextMenu={(event) => {
            event.preventDefault();
            setShowMenu((value) => !value);
          }}
        />

        {showMenu && (
          <div className="clouddock-no-drag pointer-events-auto absolute bottom-[60px] right-0 flex w-36 flex-col gap-1 rounded-xl border border-border/50 bg-surface/95 p-1.5 shadow-xl backdrop-blur-md">
            <Button
              type="text"
              className="flex w-full items-center justify-start text-sm text-content"
              icon={<FolderOpen {...iconProps} />}
              onClick={() => {
                setShowMenu(false);
                onClick();
              }}
            >
              {t('common.openCloudDrive')}
            </Button>
            <Button
              type="text"
              className="flex w-full items-center justify-start text-sm text-content"
              icon={<Camera {...iconProps} />}
              onClick={() => {
                setShowMenu(false);
                onScreenshot?.();
              }}
            >
              {t('common.captureAndUpload')}
            </Button>
            <Button
              type="text"
              className="flex w-full items-center justify-start text-sm text-content"
              icon={<HelpCircle {...iconProps} />}
              onClick={() => {
                setShowMenu(false);
                chrome.runtime.openOptionsPage();
              }}
            >
              {t('common.help')}
            </Button>
          </div>
        )}
      </div>
    </Draggable>
  );
};

export default FloatingButton;
