import React, { useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import { CloudUpload, HelpCircle, FolderOpen, Camera } from 'lucide-react';
import { useConfigStore } from '@/store/config';

interface FloatingButtonProps {
  onClick: () => void;
}

/**
 * 悬浮按钮组件
 */
const FloatingButton: React.FC<FloatingButtonProps> = ({ onClick }) => {
  const { floatingButtonPosition, setFloatingButtonPosition } = useConfigStore();
  const [showMenu, setShowMenu] = useState(false);
  const [position, setPosition] = useState(floatingButtonPosition);

  useEffect(() => {
    setPosition(floatingButtonPosition);
  }, [floatingButtonPosition]);

  const handleStop = (_e: any, data: any) => {
    const newPosition = { x: data.x, y: data.y };
    setPosition(newPosition);
    setFloatingButtonPosition(newPosition);
  };

  const handleScreenshot = async () => {
    setShowMenu(false);
    // 触发截图上传逻辑
    // 这里会触发 DrawerPanel 中的截图处理
  };

  const handleHelp = () => {
    setShowMenu(false);
    chrome.runtime.openOptionsPage();
  };

  return (
    <Draggable position={position} onStop={handleStop} handle=".drag-handle" cancel=".no-drag">
      <div className="clouddock-floating-button">
        <button
          type="button"
          className="floating-btn drag-handle"
          aria-label="打开 CloudDock"
          title="打开 CloudDock；右键查看更多操作"
          onClick={() => {
            console.log('Floating button clicked!');
            onClick();
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setShowMenu(!showMenu);
          }}
        >
          <CloudUpload size={24} aria-hidden="true" />
        </button>

        {showMenu && (
          <div className="floating-menu">
            <button
              onClick={(e) => {
                console.log('Menu open cloud clicked!');
                onClick();
              }}
              className="menu-item"
            >
              <FolderOpen size={16} />
              <span>打开云盘</span>
            </button>
            <button onClick={handleScreenshot} className="menu-item">
              <Camera size={16} />
              <span>截图上传</span>
            </button>
            <button onClick={handleHelp} className="menu-item">
              <HelpCircle size={16} />
              <span>使用帮助</span>
            </button>
          </div>
        )}
      </div>
    </Draggable>
  );
};

export default FloatingButton;
