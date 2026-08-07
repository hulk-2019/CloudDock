# CloudDock CORS 配置指南

<div align="center">

[English](../CORS.md) | **简体中文**

</div>

## CloudDock 是否需要配置 CORS？

通常**不需要**。

CloudDock 会在扩展自身的 iframe 页面中运行云存储 SDK，该页面的来源为 `chrome-extension://<extension-id>`。对已支持云厂商的请求由扩展清单中的 `host_permissions` 授权，因此不依赖显示抽屉的宿主网页所配置的 CORS 策略。

以下情况仍可能需要检查 CORS：

- 云厂商、自定义 Endpoint、CDN、代理或网关额外限制了请求来源；
- Bucket 策略会显式检查请求 Origin；
- 你正在扩展页面之外开发自定义云厂商适配器；
- 媒体或 API 请求明确出现浏览器 CORS 错误。

> [!NOTE]
> CORS 只控制哪些浏览器来源可以读取响应，不能替代身份认证、Bucket 策略或遵循最小权限原则配置的访问密钥。

## 获取扩展来源

1. 打开 `chrome://extensions/`。
2. 开启**开发者模式**。
3. 找到 CloudDock 并复制扩展 ID。
4. 按以下格式组成扩展来源：

```text
chrome-extension://<extension-id>
```

通过“加载已解压的扩展程序”安装时，不同设备或不同安装环境中的扩展 ID 可能不同。扩展 ID 发生变化后，请重新确认 CORS 配置。

## 推荐规则

如果云厂商允许填写 Chrome 扩展来源，建议配置 CloudDock 的准确来源，而不是使用通配符：

```text
允许来源：chrome-extension://<extension-id>
允许方法：GET, POST, PUT, DELETE, HEAD
允许请求头：*
暴露响应头：ETag 和云厂商的请求 ID 响应头
缓存时间：600 秒
```

`*` 仅建议用于临时排查。如果使用通配符后请求恢复正常，请改为云厂商支持的最小来源范围，并继续通过 Bucket 策略和受限凭证实施访问控制。

## 云厂商配置示例

控制台的具体菜单名称可能发生变化。请进入目标 Bucket，找到 CORS 或跨域资源共享设置。

### 阿里云 OSS

建议规则：

```text
来源（Allowed Origins）：chrome-extension://<extension-id>
允许方法（Allowed Methods）：GET, POST, PUT, DELETE, HEAD
允许请求头（Allowed Headers）：*
暴露响应头（Expose Headers）：ETag, x-oss-request-id
缓存时间（Max Age）：600
```

如果控制台不接受 `chrome-extension://` 来源，可以临时使用 `*` 确认问题是否由 CORS 引起，然后改用当前 OSS 环境支持的最小来源范围。

### 腾讯云 COS

建议规则：

```text
来源（Origin）：chrome-extension://<extension-id>
操作（Methods）：GET, POST, PUT, DELETE, HEAD
Allow-Headers：*
Expose-Headers：ETag, x-cos-request-id
Max-Age：600
```

如果控制台拒绝扩展来源，可使用上面相同的方法进行临时排查，同时保持严格的 COS 访问权限。

### AWS S3

进入 Bucket 后选择 **Permissions**，找到 **Cross-origin resource sharing (CORS)**，并使用类似以下的规则：

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "POST", "PUT", "DELETE", "HEAD"],
    "AllowedOrigins": ["chrome-extension://<extension-id>"],
    "ExposeHeaders": ["ETag", "x-amz-request-id"],
    "MaxAgeSeconds": 600
  }
]
```

如果 S3 拒绝扩展协议，或请求仍然失败，可以暂时将 `AllowedOrigins` 改为 `["*"]`，用于判断问题是否由 CORS 引起。不要将 CORS 当作授权边界；IAM 身份和 Bucket 策略仍应保持最小权限。

## 验证配置

1. 保存云厂商侧的规则，并等待配置生效。
2. 在 `chrome://extensions/` 中刷新 CloudDock。
3. 刷新已打开 CloudDock 的网页。
4. 重新执行失败的操作。
5. 打开开发者工具，确认不再出现 CORS 错误。

检查失败请求时，请确认它的 Origin 是 CloudDock 扩展来源，而不是当前宿主网页的来源。

## 常见问题

### 添加规则后请求仍然失败

扩大 CORS 范围之前，请检查：

1. 云厂商、Region、Bucket 名称和自定义 Endpoint 是否正确。
2. 访问密钥是否有效，并拥有当前操作所需权限。
3. CORS 中配置的扩展 ID 是否与当前加载的 CloudDock 一致。
4. 当前请求使用的方法和请求头是否已被允许。
5. CDN、反向代理、企业网关或 Bucket 策略是否覆盖了响应。
6. 当前错误是否确实为 CORS 错误，而不是认证、签名、系统时间偏差或网络错误。

### 是否应该直接允许所有来源 `*`？

只建议用于短时间排查。通配符范围大于 CloudDock 的实际需求；在其他安全条件允许时，它可能让无关来源的脚本读取响应。云厂商支持时，应优先使用准确来源。

### 配置 CORS 会让私有 Bucket 变成公开吗？

不会。CORS 本身不会授予对象访问权限，私有请求仍然需要有效授权。但过于宽松的 CORS 与公开对象、宽松的 Bucket 策略或泄露的凭证组合使用时，会增加安全风险。

## 安全建议

- 为 CloudDock 创建独立访问密钥。
- 将权限限制在必要的 Bucket 和操作范围内。
- 切勿使用账号所有者、Root 或管理员凭证。
- 除非确实需要公开访问，否则保持 Bucket 私有。
- 定期轮换凭证，并删除不再使用的配置。
- 除排查已确认的 CORS 问题外，避免使用通配符来源。

## 参考文档

- [阿里云 OSS CORS](https://help.aliyun.com/document_detail/31870.html)
- [腾讯云 COS CORS](https://cloud.tencent.com/document/product/436/13318)
- [AWS S3 CORS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html)
