import { useCallback, useEffect, useState } from 'react';
import Draggable, { type DraggableData, type DraggableEvent } from 'react-draggable';
import { Button } from 'antd';
import { Camera, CloudUpload, FolderOpen, HelpCircle } from 'lucide-react';
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
          aria-label="打开 CloudDock"
          aria-expanded={showMenu}
          title="打开 CloudDock；右键查看更多操作"
          className="clouddock-drag-handle flex h-12 w-12 cursor-grab items-center justify-center border border-border shadow transition active:cursor-grabbing active:translate-y-px active:shadow-none"
          icon={<CloudUpload size={23} strokeWidth={2} />}
          onClick={onClick}
          onContextMenu={(event) => {
            event.preventDefault();
            setShowMenu((value) => !value);
          }}
        />

        {showMenu && (
          <div className="clouddock-no-drag pointer-events-auto absolute bottom-16 right-0 flex w-44 flex-col gap-1 rounded border border-border bg-surface p-2 shadow">
            <Button
              type="text"
              className="justify-start text-content"
              icon={<FolderOpen {...iconProps} />}
              onClick={() => {
                setShowMenu(false);
                onClick();
              }}
            >
              打开云盘
            </Button>
            <Button
              type="text"
              className="justify-start text-content"
              icon={<Camera {...iconProps} />}
              onClick={() => {
                setShowMenu(false);
                onScreenshot?.();
              }}
            >
              截图上传
            </Button>
            <Button
              type="text"
              className="justify-start text-content"
              icon={<HelpCircle {...iconProps} />}
              onClick={() => {
                setShowMenu(false);
                chrome.runtime.openOptionsPage();
              }}
            >
              使用帮助
            </Button>
          </div>
        )}
      </div>
    </Draggable>
  );
};

export default FloatingButton;
