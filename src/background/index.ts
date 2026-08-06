import { SecureStorage, ConfigStorage } from './storage';

// 监听插件安装/更新事件
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('CloudDock 安装成功！');
  } else if (details.reason === 'update') {
    console.log('CloudDock 已更新到最新版本！');
  }
});

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  (async () => {
    try {
      switch (request.action) {
        case 'getCredentials':
          // 按配置 ID 获取凭证
          const credentials = await SecureStorage.getCredentials(request.configId);
          sendResponse({ success: true, data: credentials });
          break;

        case 'setCredentials':
          // 按配置 ID 保存凭证
          await SecureStorage.setCredentials(
            request.configId,
            request.accessKeyId,
            request.accessKeySecret
          );
          sendResponse({ success: true });
          break;

        case 'removeCredentials':
          // 按配置 ID 删除凭证
          await SecureStorage.removeCredentials(request.configId);
          sendResponse({ success: true });
          break;

        case 'getConfig':
          const config = await ConfigStorage.getConfig(request.key, request.defaultValue);
          sendResponse({ success: true, data: config });
          break;

        case 'setConfig':
          await ConfigStorage.setConfig(request.key, request.value);
          sendResponse({ success: true });
          break;

        case 'captureScreenshot':
          // 截取当前标签页
          const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png' });
          sendResponse({ success: true, data: dataUrl });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Background script error:', error);
      sendResponse({ success: false, error: (error as Error).message });
    }
  })();

  // 返回 true 表示异步响应
  return true;
});

// 快捷键命令监听
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-drawer') {
    // 向当前标签页发送切换抽屉的消息
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleDrawer' });
      }
    });
  } else if (command === 'screenshot-upload') {
    // 截图并上传
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'screenshotUpload' });
      }
    });
  }
});

console.log('CloudDock background service worker is running! 🚀');
