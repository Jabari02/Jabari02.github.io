# Original Assets

保存不覆盖、不压缩的原始摄影和媒体文件。该目录默认被 Git 忽略，大文件应另有至少一份独立备份。

建议命名：`YYYY-MM-DD_location_subject_sequence.ext`。

## 加入新照片

1. 将 JPG、JPEG、PNG、WebP、TIFF 或 HEIC 原片放入 `user-photos-2026/`。
2. 执行 `npm run photos:sync`；重新启动开发站点或正式构建时也会自动同步。
3. 同步工具会自动生成 2400px 以内的网页 JPEG、移除网页图片中的 EXIF/GPS，并把可展示的拍摄参数写入 `content/photos/photos.generated.json`。
4. 新照片首次同步时间会被保留，最近同步的三张自动出现在影集顶部。
5. 如需修改标题、替代文本、主题、地点或隐藏 GPS，在 `content/photos/photo-overrides.json` 中按原始文件名添加覆盖项；设置 `"hideGps": true` 可停止公开坐标。

原始照片不纳入版本控制。当前个人照片备份位于 `user-photos-2026/`，对应的公开网页版本位于 `public/photos/`。请继续为原片保留至少一份独立备份。
