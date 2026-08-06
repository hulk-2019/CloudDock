# ⚠️ CORS 跨域配置指南

## 为什么需要配置 CORS？

CloudDock 是浏览器插件，在网页中直接调用云存储 API。由于浏览器的**同源策略**限制，如果云存储 Bucket 没有配置 CORS（跨域资源共享）规则，浏览器会阻止请求，导致插件无法工作。

**错误提示示例**：
```
Access to XMLHttpRequest at 'https://xxx.oss-cn-xxx.aliyuncs.com/...' 
from origin 'https://www.baidu.com' has been blocked by CORS policy
```

## 如何配置 CORS

### 阿里云 OSS

1. 登录 [阿里云控制台](https://oss.console.aliyun.com/)
2. 找到你的 Bucket，点击进入
3. 左侧菜单选择：**权限管理** → **跨域设置(CORS)**
4. 点击 **设置** → **创建规则**
5. 填写以下配置：

```
来源(AllowedOrigin)：       *
允许 Methods：              GET, POST, PUT, DELETE, HEAD
允许 Headers：              *
暴露 Headers：              ETag, x-oss-request-id
缓存时间(秒)：              600
```

6. 点击 **确定** 保存

### 腾讯云 COS

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/cos)
2. 找到你的 Bucket，点击进入
3. 左侧菜单选择：**安全管理** → **跨域访问CORS设置**
4. 点击 **添加规则**
5. 填写以下配置：

```
来源 Origin：               *
操作 Methods：             GET, POST, PUT, DELETE, HEAD
Allow-Headers：            *
Expose-Headers：           ETag, x-cos-request-id
超时 Max-Age：             600
```

6. 点击 **保存** 

### 七牛云

1. 登录 [七牛云控制台](https://portal.qiniu.com/)
2. 对象存储 → 空间管理 → 选择你的空间
3. 右侧菜单选择：**跨域资源共享(CORS)**
4. 点击 **添加规则**
5. 填写以下配置：

```
AllowedOrigin：            *
AllowedMethod：            GET, POST, PUT, DELETE, HEAD
AllowedHeader：            *
ExposeHeader：             Etag, x-reqid
MaxAgeSeconds：            600
```

6. 点击 **确定**

### AWS S3

1. 登录 [AWS S3 控制台](https://s3.console.aws.amazon.com/)
2. 找到你的 Bucket，点击进入
3. 选择 **Permissions** 标签页
4. 滚动到 **Cross-origin resource sharing (CORS)** 区域
5. 点击 **Edit**，粘贴以下 JSON 配置：

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "POST", "PUT", "DELETE", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag", "x-amz-request-id"],
    "MaxAgeSeconds": 600
  }
]
```

6. 点击 **Save changes**

---

## 安全建议

### 生产环境配置

上面的配置使用 `*` 通配符，允许所有来源访问，**适合测试**。

生产环境建议限制来源：

```
来源(AllowedOrigin)：chrome-extension://*
```

这样只允许 Chrome 插件访问，更安全。

### 更严格的配置

如果只在特定网站使用 CloudDock，可以进一步限制：

```
来源(AllowedOrigin)：
  - https://your-domain.com
  - chrome-extension://*
```

---

## 验证配置是否生效

配置保存后：

1. 刷新插件（chrome://extensions/ → CloudDock → 刷新）
2. 刷新使用 CloudDock 的网页
3. 打开抽屉，查看是否能正常加载文件列表
4. 打开 F12 控制台，确认没有 CORS 错误

---

## 常见问题

### Q: 配置后还是报 CORS 错误？
A: 
1. 检查 Bucket 名称和 Region 是否正确
2. 等待 1-2 分钟，配置可能有延迟
3. 清除浏览器缓存后重试
4. 确认 AllowedOrigin 包含 `*` 或 `chrome-extension://*`

### Q: 为什么桌面客户端不需要配置 CORS？
A: 桌面客户端直接访问云存储 API，不经过浏览器，所以没有同源策略限制。

### Q: CORS 配置会影响 Bucket 安全吗？
A: 
- 使用 `*` 允许所有来源读取公开资源，**私有文件仍需 AccessKey 签名**
- 建议生产环境使用 `chrome-extension://*` 限制来源
- 永远不要在前端暴露有写权限的 AccessKey

---

## 参考文档

- [阿里云 OSS CORS 配置](https://help.aliyun.com/document_detail/31870.html)
- [腾讯云 COS CORS 配置](https://cloud.tencent.com/document/product/436/13318)
- [七牛云 CORS 配置](https://developer.qiniu.com/kodo/manual/3761/cors)
- [AWS S3 CORS 配置](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html)
