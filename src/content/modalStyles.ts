import type { ModalProps } from 'antd';

/**
 * 内容脚本里所有弹框（新建文件夹、删除确认等）共用的玻璃质感样式。
 * 主题 surface 令牌是 85% 透明度，弹框下方内容复杂时可读性不足，这里提高到 98%。
 */
export const glassModalStyles: ModalProps['styles'] = {
  mask: { backgroundColor: 'rgba(0, 0, 0, 0.45)', backdropFilter: 'blur(4px)' },
  content: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(16px)',
    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15), 0 0 20px rgba(0,0,0,0.05)',
    border: '1px solid rgba(255,255,255,0.5)',
  },
  header: { backgroundColor: 'transparent' },
};
