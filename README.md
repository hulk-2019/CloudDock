# CloudDock 🚀

<div align="center">

**云端存储，随手可得**

一款支持多云厂商的浏览器云存储管理插件

[English](./README_EN.md) | 简体中文

</div>

## ✨ 特性

- 🌥️ **多云支持** - 支持阿里云 OSS、腾讯云 COS、七牛云、AWS S3
- 🎯 **侧边抽屉** - 不干扰浏览，随时唤起云盘
- 📤 **多种上传** - 拖拽文件、拖拽网页图片、Ctrl+V 粘贴截图
- 🔐 **安全可靠** - AK/SK 加密存储在本地，数据不离开浏览器
- 🎨 **界面优雅** - 现代化设计，流畅交互
- ⚡ **轻量快速** - 基于 React + TypeScript，性能优异

## 📸 截图

<div align="center">
  <img src="./docs/screenshot-1.png" width="800" alt="主界面" />
  <p><em>侧边抽屉 - 文件浏览</em></p>
</div>

<div align="center">
  <img src="./docs/screenshot-2.png" width="800" alt="配置页面" />
  <p><em>配置页面 - 云厂商设置</em></p>
</div>

## 🚀 快速开始

### 安装

1. **Chrome Web Store（推荐）**
   - 访问 [Chrome Web Store](https://chrome.google.com/webstore) 搜索 "CloudDock"
   - 点击"添加至 Chrome"

2. **本地安装（开发版）**
   ```bash
   # 克隆仓库
   git clone https://github.com/your-username/clouddock.git
   cd clouddock

   # 安装依赖
   pnpm install

   # 构建
   pnpm build

   # 在 Chrome 中加载扩展
   # 1. 打开 chrome://extensions/
   # 2. 开启"开发者模式"
   # 3. 点击"加载已解压的扩展程序"
   # 4. 选择 dist 目录
   ```

### 配置

1. 点击浏览器工具栏的 CloudDock 图标
2. 点击"设置"进入配置页面
3. 选择你的云存储厂商
4. 填写 AccessKey ID 和 Secret
5. 填写 Region 和 Bucket 名称
6. 保存配置

### 使用

1. **打开云盘**
   - 点击右下角悬浮按钮
   - 或点击浏览器工具栏图标 → "打开云盘"

2. **上传文件**
   - 拖拽本地文件到抽屉区域
   - 拖拽网页中的图片/视频到抽屉区域
   - 在抽屉区域按 Ctrl+V 粘贴截图

3. **文件管理**
   - 点击文件夹进入目录
   - 点击文件复制下载链接
   - 右键文件进行删除操作

## 📖 如何获取云厂商 AccessKey

### 阿里云 OSS

1. 登录 [阿里云控制台](https://ram.console.aliyun.com/)
2. 访问 RAM 访问控制 → 用户 → 创建用户
3. 勾选"编程访问"，创建 AccessKey
4. 授予用户 `AliyunOSSFullAccess` 权限
5. 复制 AccessKey ID 和 Secret

📚 [官方文档](https://help.aliyun.com/document_detail/31827.html)

### 腾讯云 COS

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 访问 访问管理 → 访问密钥 → API密钥管理
3. 新建密钥，获取 SecretId 和 SecretKey
4. 在 COS 控制台授予 Bucket 权限

📚 [官方文档](https://cloud.tencent.com/document/product/436/68282)

### 七牛云

1. 登录 [七牛云控制台](https://portal.qiniu.com/)
2. 访问 个人中心 → 密钥管理
3. 复制 AccessKey 和 SecretKey

📚 [官方文档](https://developer.qiniu.com/af/kb/1334/how-to-access-or-locate-the-access-key-and-secret-key)

### AWS S3

1. 登录 [AWS Console](https://console.aws.amazon.com/)
2. 访问 IAM → Users → Security credentials
3. Create access key
4. 下载或复制 Access key ID 和 Secret access key

📚 [官方文档](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html)

## 🛠️ 技术栈

- **前端框架**: React 18 + TypeScript
- **UI 组件**: Ant Design + Lucide Icons
- **状态管理**: Zustand
- **构建工具**: Vite + CRXJS
- **CSS 方案**: TailwindCSS
- **云存储 SDK**:
  - 阿里云: `ali-oss`
  - 腾讯云: `cos-js-sdk-v5`
  - 七牛云: `qiniu-js`
  - AWS: `@aws-sdk/client-s3`

## 📁 项目结构

```
CloudDock/
├── src/
│   ├── background/        # Service Worker
│   ├── content/           # Content Script (注入页面)
│   ├── popup/             # Popup 页面
│   ├── options/           # 配置页面
│   ├── components/        # React 组件
│   ├── services/          # 云存储服务层
│   ├── hooks/             # React Hooks
│   ├── store/             # Zustand 状态管理
│   ├── utils/             # 工具函数
│   ├── types/             # TypeScript 类型
│   └── manifest.json      # Extension 配置
├── public/
│   ├── icons/             # 图标资源
│   └── docs/              # 帮助文档
├── package.json
├── vite.config.ts
└── README.md
```

## 🔐 安全说明

- **本地加密**: AccessKey 使用 AES-256 加密后存储在浏览器本地
- **不联网**: 除了与你配置的云厂商通信外，不向任何第三方发送数据
- **开源透明**: 所有代码开源，欢迎审计

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 📄 开源协议

MIT License - 详见 [LICENSE](./LICENSE) 文件

## 🙏 致谢

- [Vite](https://vitejs.dev/) - 超快的构建工具
- [React](https://react.dev/) - 用于构建用户界面的 JavaScript 库
- [CRXJS](https://crxjs.dev/) - Chrome Extension 的 Vite 插件
- [Lucide Icons](https://lucide.dev/) - 精美的图标库

## 📞 联系方式

- 作者: CloudDock Team
- Email: support@clouddock.io
- GitHub: [@clouddock](https://github.com/clouddock)

---

<div align="center">
  如果这个项目对你有帮助，请给个 ⭐️ Star 支持一下！
</div>
