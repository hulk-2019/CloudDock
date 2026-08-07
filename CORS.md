# CloudDock CORS Guide

<div align="center">

**English** | [简体中文](./docs/CORS.zh-CN.md)

</div>

## Does CloudDock Require CORS Configuration?

Usually, **no**.

CloudDock runs its storage SDKs inside an extension-owned iframe whose origin is `chrome-extension://<extension-id>`. Requests to supported cloud providers are covered by the extension's `host_permissions`, so they do not depend on the CORS policy of the webpage where the drawer is displayed.

You may still need to inspect CORS when:

- a cloud provider, custom endpoint, CDN, proxy, or gateway applies additional origin restrictions;
- a bucket policy explicitly checks the request origin;
- you are developing a custom provider adapter outside the extension page;
- media or API requests fail with an explicit browser CORS error.

> [!NOTE]
> CORS controls which browser origins may read a response. It does not replace authentication, bucket policies, or least-privilege access-key permissions.

## Identify the Extension Origin

1. Open `chrome://extensions/`.
2. Enable **Developer mode**.
3. Find CloudDock and copy its extension ID.
4. Build the origin in this form:

```text
chrome-extension://<extension-id>
```

For an unpacked extension, the ID may differ between machines or installations. Recheck it whenever the extension ID changes.

## Recommended Rule

If your provider accepts Chrome extension origins, prefer the exact CloudDock origin rather than a wildcard:

```text
Allowed origin:  chrome-extension://<extension-id>
Allowed methods: GET, POST, PUT, DELETE, HEAD
Allowed headers: *
Expose headers:  ETag and the provider request-ID header
Max age:         600 seconds
```

Use `*` only as a temporary diagnostic setting. If a wildcard fixes the request, replace it with the narrowest origin rule supported by your provider and keep access control enforced through bucket policies and restricted credentials.

## Provider Examples

The exact console labels may change. Open the target bucket and locate its CORS or cross-origin resource sharing settings.

### Aliyun OSS

Suggested rule:

```text
Allowed Origins: chrome-extension://<extension-id>
Allowed Methods: GET, POST, PUT, DELETE, HEAD
Allowed Headers: *
Expose Headers:  ETag, x-oss-request-id
Max Age:         600
```

If the console does not accept a `chrome-extension://` origin, use `*` briefly to confirm the cause, then apply the narrowest rule supported by your OSS setup.

### Tencent Cloud COS

Suggested rule:

```text
Origin:          chrome-extension://<extension-id>
Methods:         GET, POST, PUT, DELETE, HEAD
Allow-Headers:   *
Expose-Headers:  ETag, x-cos-request-id
Max-Age:         600
```

If the console rejects the extension origin, use the same diagnostic approach described above and retain strict COS permissions.

### AWS S3

Open the bucket, select **Permissions**, find **Cross-origin resource sharing (CORS)**, and use a rule similar to:

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

If S3 rejects the extension scheme or the request still fails, temporarily change `AllowedOrigins` to `["*"]` to determine whether CORS is the cause. Do not treat CORS as an authorization boundary; continue to restrict the IAM principal and bucket policy.

## Verify the Configuration

1. Save the provider-side rule and allow time for it to propagate.
2. Reload CloudDock from `chrome://extensions/`.
3. Refresh the webpage where CloudDock is open.
4. Retry the failed operation.
5. Inspect DevTools and confirm that no CORS error is reported.

When reviewing the failed request, verify that its origin is the CloudDock extension origin rather than the host webpage.

## Troubleshooting

### The request still fails after adding a rule

Check the following before widening CORS access:

1. The provider, Region, Bucket name, and custom endpoint are correct.
2. The access key is valid and has permission for the attempted operation.
3. The configured extension ID matches the currently loaded CloudDock installation.
4. The required method and request headers are allowed.
5. A CDN, reverse proxy, enterprise gateway, or bucket policy is not overriding the response.
6. The error is actually a CORS error rather than an authentication, signature, clock-skew, or network error.

### Should I allow every origin with `*`?

Only for short-lived diagnosis. A wildcard is broader than CloudDock requires and may let scripts on unrelated origins read responses when other security conditions permit it. Prefer an exact origin whenever the provider supports it.

### Does CORS make a private bucket public?

No. CORS does not grant object permissions by itself. Private requests still require valid authorization. However, overly broad CORS combined with public objects, permissive bucket policies, or exposed credentials increases risk.

## Security Recommendations

- Create a dedicated access key for CloudDock.
- Restrict it to the required buckets and operations.
- Never use an account owner, root, or administrator credential.
- Keep buckets private unless public access is intentional.
- Rotate credentials regularly and remove unused configurations.
- Avoid wildcard origins except while diagnosing a confirmed CORS problem.

## References

- [Aliyun OSS CORS](https://help.aliyun.com/document_detail/31870.html)
- [Tencent Cloud COS CORS](https://cloud.tencent.com/document/product/436/13318)
- [AWS S3 CORS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html)
