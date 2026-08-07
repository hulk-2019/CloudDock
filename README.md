# CloudDock

<div align="center">

**Cloud storage, always within reach.**

A Chrome extension that brings object storage into a side panel on any webpage.

**English** | [简体中文](./docs/README.zh-CN.md)

</div>

## Overview

CloudDock lets you browse, upload, preview, organize, and share files in your object-storage buckets without leaving the page you are viewing. It is built as a Manifest V3 extension and currently provides complete adapters for Aliyun OSS, Tencent Cloud COS, and AWS S3.

> [!IMPORTANT]
> CloudDock is currently installed from source. There is no official Chrome Web Store release linked by this repository.

## Features

- **Multi-cloud configurations** — save multiple storage profiles and switch between them from the drawer.
- **In-page drawer** — open CloudDock from the floating button, the extension popup, or a keyboard shortcut.
- **Flexible uploads** — select local files, drag local files or webpage media, paste clipboard images, or capture the visible tab.
- **Upload queue** — monitor progress and cancel active uploads.
- **File management** — browse folders, create folders, delete objects, copy access links, and move objects by dragging them into folders.
- **Media preview** — preview supported images and videos without leaving the drawer.
- **Grid and list views** — switch layouts while browsing large directories.
- **Local configuration storage** — credentials are encrypted before being stored in `chrome.storage.local`.

## Provider Support

| Provider | Status | Browse | Upload | File operations | Signed links |
| --- | --- | :---: | :---: | :---: | :---: |
| Aliyun OSS | Supported | Yes | Yes | Yes | Yes |
| Tencent Cloud COS | Supported | Yes | Yes | Yes | Yes |
| AWS S3 | Supported | Yes | Yes | Yes | Yes |
| Qiniu Kodo | Adapter scaffold only | No | No | No | No |

The Qiniu browser SDK cannot provide all required management APIs and requires a server-generated upload token. Its adapter remains in the codebase for future integration, but it is intentionally unavailable in the configuration UI.

## Requirements

- Chrome or another compatible Chromium-based browser
- Node.js 22 or later
- npm
- An object-storage bucket and a least-privileged access key

## Install from Source

```bash
git clone https://github.com/hulk-2019/CloudDock.git
cd CloudDock
npm ci
npm run build
```

Then load the extension in Chrome:

1. Open `chrome://extensions/`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the generated `dist/` directory.

After rebuilding, return to `chrome://extensions/` and reload CloudDock to apply the changes.

## Quick Start

1. Open a regular webpage. Browser-internal pages such as `chrome://extensions/` do not allow the CloudDock content script to run.
2. Click the CloudDock extension icon and choose **Open Cloud Drive**, or use the floating button.
3. Select **Go to configuration** in the drawer.
4. Add a configuration with a display name, provider, region, bucket, Access Key ID, and Access Key Secret.
5. Save and select the configuration. CloudDock will load the bucket contents automatically.

### Common Operations

- **Upload files:** use the upload button, drag files into the drawer, or paste a copied image with `Ctrl/Command + V`.
- **Capture and upload:** use the screenshot button on the floating control or the screenshot shortcut.
- **Open folders:** select a folder or use the breadcrumb navigation.
- **Preview media:** select a supported image or video file.
- **Copy a link:** use the file action to generate and copy an access URL.
- **Move a file:** drag it onto a target folder.
- **Create or delete:** use the toolbar and file actions in the drawer.

## Keyboard Shortcuts

| Action | Windows / Linux | macOS |
| --- | --- | --- |
| Toggle the drawer | `Alt + Shift + D` | `Option + Shift + D` |
| Capture the visible tab and upload it | `Ctrl + Shift + U` | `Command + Shift + U` |
| Paste an image into the current folder | `Ctrl + V` | `Command + V` |

Chrome lets you review or customize extension shortcuts at `chrome://extensions/shortcuts`.

## Development

```bash
# Start the Vite development process
npm run dev

# Run TypeScript checks
npm run type-check

# Create a production build
npm run build

# Preview the Vite build
npm run preview
```

### Technology Stack

- React 18 and TypeScript
- Ant Design, Tailwind CSS, and Lucide React
- Zustand
- Vite and CRXJS
- Aliyun OSS SDK, Tencent COS SDK, and AWS SDK for JavaScript

### Project Structure

```text
CloudDock/
├── public/                 # Extension icons and bundled static documentation
├── src/
│   ├── background/         # Manifest V3 service worker and local storage helpers
│   ├── constants/          # Shared layout constants
│   ├── content/            # Injected drawer, configuration, file browser, and previews
│   ├── help/               # Extension help page
│   ├── hooks/              # Cloud storage and upload hooks
│   ├── lib/                # Shared runtime utilities
│   ├── popup/              # Browser action popup
│   ├── preview/            # Standalone media preview page
│   ├── services/           # Cloud provider adapters
│   ├── store/              # Zustand stores
│   ├── theme/              # Design tokens and theme provider
│   ├── types/              # Shared TypeScript types
│   ├── utils/              # Validation, file, and screenshot helpers
│   └── manifest.json       # Chrome extension manifest
├── docs/                   # Repository documentation
├── package.json
└── vite.config.ts
```

## Security and Permissions

CloudDock communicates directly with the configured cloud provider. Access credentials are encrypted in the extension before being saved to `chrome.storage.local`; they are decrypted locally when a provider client is created.

Client-side encryption is not a substitute for cloud-side access control. Use a dedicated key restricted to the required bucket and operations, rotate it regularly, and never use an account owner or administrator credential.

The extension requests access to regular webpages so it can inject the drawer, accept dragged webpage media, and capture the active tab. Review `src/manifest.json` before installing if you need to audit its permissions.

## Troubleshooting

### The drawer does not open

CloudDock cannot run on protected browser pages, including most `chrome://` pages and the Chrome Web Store. Switch to a regular webpage and try again.

### The bucket does not load

Verify the provider, region, bucket name, key pair, and key permissions. Depending on the provider and bucket policy, you may also need to configure CORS for the extension origin.

### A copied link expires

Private objects use provider-generated signed URLs. These links are temporary by design; generate a new link when the previous one expires.

## Contributing

Issues and pull requests are welcome.

1. Fork the repository.
2. Create a branch for your change.
3. Run `npm run type-check` and `npm run build`.
4. Submit a pull request describing the behavior and verification steps.

## License

CloudDock is released under the [MIT License](./LICENSE).
