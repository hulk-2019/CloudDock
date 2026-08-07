# CloudDock

<div align="center">

**云端存储，随手可得。**

一款将对象存储带到任意网页侧边栏的 Chrome 扩展。

[English](../README.md) | **简体中文**

</div>

## 项目简介

CloudDock 让你无需离开当前网页，即可浏览、上传、预览、整理和分享对象存储 Bucket 中的文件。项目基于 Manifest V3 开发，目前完整支持阿里云 OSS、腾讯云 COS 和 AWS S3。

> [!IMPORTANT]
> CloudDock 目前需要通过源码安装；本仓库暂未提供官方 Chrome Web Store 上架地址。

## 功能特性

- **多云配置**：可保存多个云存储配置，并在抽屉中快速切换。
- **网页内抽屉**：通过悬浮按钮、扩展弹窗或快捷键随时打开 CloudDock。
- **多种上传方式**：支持选择本地文件、拖拽本地文件或网页媒体、粘贴剪贴板图片，以及截取当前可见页面后上传。
- **上传队列**：可查看上传进度并取消进行中的任务。
- **文件管理**：支持浏览目录、新建文件夹、删除对象、复制访问链接，以及拖拽文件到文件夹进行移动。
- **媒体预览**：可在抽屉中预览支持的图片和视频。
- **网格与列表视图**：浏览目录时可按需切换布局。
- **本地保存配置**：访问凭证加密后存储在 `chrome.storage.local` 中。

## 云厂商支持情况

| 云厂商 | 状态 | 浏览 | 上传 | 文件操作 | 签名链接 |
| --- | --- | :---: | :---: | :---: | :---: |
| 阿里云 OSS | 已支持 | 是 | 是 | 是 | 是 |
| 腾讯云 COS | 已支持 | 是 | 是 | 是 | 是 |
| AWS S3 | 已支持 | 是 | 是 | 是 | 是 |
| 七牛云 Kodo | 仅保留适配器框架 | 否 | 否 | 否 | 否 |

七牛云浏览器 SDK 无法提供 CloudDock 所需的全部管理接口，上传也依赖服务端生成 Token。因此，代码中虽然保留了后续集成所需的适配器，但配置界面暂不开放七牛云选项。

## 环境要求

- Chrome 或其他兼容的 Chromium 浏览器
- Node.js 22 或更高版本
- npm
- 对象存储 Bucket，以及遵循最小权限原则创建的访问密钥

## 从源码安装

```bash
git clone https://github.com/hulk-2019/CloudDock.git
cd CloudDock
npm ci
npm run build
```

然后在 Chrome 中加载扩展：

1. 打开 `chrome://extensions/`。
2. 开启右上角的**开发者模式**。
3. 点击**加载已解压的扩展程序**。
4. 选择构建生成的 `dist/` 目录。

重新构建后，请回到 `chrome://extensions/` 刷新 CloudDock，使改动生效。

## 快速开始

1. 打开一个普通网页。`chrome://extensions/` 等浏览器内置页面不允许 CloudDock 内容脚本运行。
2. 点击浏览器工具栏中的 CloudDock 图标并选择**打开云盘**，或点击网页中的悬浮按钮。
3. 在抽屉中点击**前往配置**。
4. 添加配置名称、云厂商、Region、Bucket、Access Key ID 和 Access Key Secret。
5. 保存并选中该配置，CloudDock 会自动加载 Bucket 内容。

### 常用操作

- **上传文件**：点击上传按钮、将文件拖入抽屉，或使用 `Ctrl/Command + V` 粘贴已复制的图片。
- **截图上传**：使用悬浮按钮中的截图操作，或通过截图快捷键上传当前标签页的可见区域。
- **打开目录**：点击文件夹，或使用顶部面包屑导航跳转。
- **预览媒体**：点击支持的图片或视频文件。
- **复制链接**：通过文件操作生成并复制访问地址。
- **移动文件**：将文件拖拽到目标文件夹。
- **新建或删除**：使用工具栏和文件操作菜单完成。

## 快捷键

| 操作 | Windows / Linux | macOS |
| --- | --- | --- |
| 打开或关闭抽屉 | `Alt + Shift + D` | `Option + Shift + D` |
| 截取当前可见页面并上传 | `Ctrl + Shift + U` | `Command + Shift + U` |
| 将图片粘贴到当前目录 | `Ctrl + V` | `Command + V` |

可在 `chrome://extensions/shortcuts` 中查看或修改扩展快捷键。

## 开发指南

```bash
# 启动 Vite 开发进程
npm run dev

# 执行 TypeScript 类型检查
npm run type-check

# 创建生产构建
npm run build

# 预览 Vite 构建结果
npm run preview
```

### 技术栈

- React 18 与 TypeScript
- Ant Design、Tailwind CSS 与 Lucide React
- Zustand
- Vite 与 CRXJS
- 阿里云 OSS SDK、腾讯云 COS SDK、AWS SDK for JavaScript

### 项目结构

```text
CloudDock/
├── public/                 # 扩展图标与打包使用的静态文档
├── src/
│   ├── background/         # Manifest V3 Service Worker 与本地存储工具
│   ├── constants/          # 公共布局常量
│   ├── content/            # 注入网页的抽屉、配置、文件浏览与预览组件
│   ├── help/               # 扩展帮助页面
│   ├── hooks/              # 云存储与上传相关 Hooks
│   ├── lib/                # 公共运行时工具
│   ├── popup/              # 浏览器工具栏弹窗
│   ├── preview/            # 独立媒体预览页面
│   ├── services/           # 云厂商适配层
│   ├── store/              # Zustand 状态存储
│   ├── theme/              # 设计 Token 与主题 Provider
│   ├── types/              # 公共 TypeScript 类型
│   ├── utils/              # 校验、文件与截图工具
│   └── manifest.json       # Chrome 扩展清单
├── docs/                   # 仓库文档
├── package.json
└── vite.config.ts
```

## 安全与权限说明

CloudDock 会直接连接你配置的云厂商。访问凭证先在扩展中加密，再保存到 `chrome.storage.local`；创建云存储客户端时，凭证仅在本地解密使用。

客户端加密不能替代云端权限控制。请为 CloudDock 创建仅允许访问目标 Bucket 和必要操作的独立密钥，定期轮换密钥，切勿使用账号所有者或管理员凭证。

扩展需要访问普通网页，以便注入抽屉、接收从网页拖入的媒体，并截取当前标签页。若需要审计权限，请在安装前查看 `src/manifest.json`。

## 常见问题

### 抽屉无法打开

CloudDock 无法在受保护的浏览器页面中运行，包括大多数 `chrome://` 页面和 Chrome Web Store。请切换到普通网页后重试。

### 无法加载 Bucket

请检查云厂商、Region、Bucket 名称、访问密钥和密钥权限。CloudDock 通常通过扩展的主机权限访问云存储，不依赖宿主网页的 CORS。如果浏览器明确报告跨域错误，请参阅 [CORS 配置指南](./CORS.zh-CN.md)。

### 复制的链接失效

私有对象使用云厂商生成的临时签名 URL。链接过期属于正常行为，请重新生成访问链接。

## 参与贡献

欢迎提交 Issue 和 Pull Request。

1. Fork 本仓库。
2. 为改动创建独立分支。
3. 运行 `npm run type-check` 和 `npm run build`。
4. 提交 Pull Request，并说明改动行为与验证步骤。

## 开源协议

CloudDock 基于 [MIT License](../LICENSE) 开源。
