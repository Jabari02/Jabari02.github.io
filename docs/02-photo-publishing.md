# 照片发布与存储操作说明

## 目的

照片发布分成“原片、网页版本、结构化元数据”三层：原片和网页版本进入 R2，标题、影集、EXIF 和公开状态进入 D1。公开页面永远不直接暴露原片对象。

## 本地运行

```bash
npm install
npm run dev
```

打开 <http://localhost:3000/studio>。本地 Vinext 会给 `/studio` 注入 owner 工作台，并由本地 `DB` / `PHOTOS` binding 持久化在项目 `.wrangler/` 目录。这个目录已被 Git 忽略。

发布步骤：

1. 拖入 JPEG、PNG 或 WebP，可多选。
2. 等待读取 EXIF 和浏览器端网页版本生成。
3. 校对标题、替代文字、影集标识和地点。
4. 选择 GPS：精确、模糊或隐藏。默认读取到 GPS 时为精确，没有 GPS 时为隐藏。
5. 点击“发布这张照片”。系统依次创建 D1 草稿、上传 R2 原片、上传去元数据 JPEG、再将状态改为 `published`。

发布完成后：

- 首页 `/` 会在客户端刷新 `/api/photos`，把已发布照片按发布时间合并到本地清单，最新三张进入顶部。
- 影集目录为 `/photos`，影集详情为 `/photos/[album-slug]`，单张稳定地址为 `/photos/[album-slug]/[photo-slug]`。
- 网页版本由 `/media/photos/[id]` 提供；该路由只允许 `published` 照片，使用 R2 的网页版本 key。

## 数据边界

| 数据 | 位置 | 是否公开 |
| --- | --- | --- |
| 原始 JPEG/PNG/WebP | R2 `photos/{id}/original/...` | 否 |
| 去元数据网页 JPEG | R2 `photos/{id}/web` | 已发布照片可读 |
| 标题、替代文字、影集、状态 | D1 `photos` / `albums` | 已发布字段公开 |
| 精确 GPS | D1 `photos.latitude/longitude` | 按 `gpsVisibility` 脱敏 |

## 生产部署前检查

1. `.openai/hosting.json` 保持逻辑绑定名 `DB` 与 `PHOTOS`，不要写入密钥。
2. 在托管平台创建或绑定 D1、R2，并执行仓库中的 Drizzle migration。
3. 确认生产环境能读取托管身份头；不要把本地 `x-local-studio-owner` 头带入生产客户端。
4. 用不含敏感信息的测试照片完成一次：上传 → EXIF → R2 → 发布 → 公开 URL → 撤回。
5. 验证原片 key 无公开路由、GPS 隐藏照片不输出坐标、`Cache-Control` 和 `ETag` 正常。
6. 备份 D1 导出和 R2 对象清单，记录恢复步骤。

## 当前限制

- 自动新建的影集先使用影集 slug 作为标题，正式运营前应在 Studio 增加影集编辑字段。
- 本地回退目录仍来自 `content/photos/photos.generated.json`；云端记录为空时这是预期行为。
- 网页版本生成在浏览器端完成，暂未引入 Cloudflare Images 的多尺寸变体或服务端重编码。
