# Web Assets

保存由原始素材生成的网页版本。文件应可通过 `scripts/` 中的处理工具重新生成，因此不作为唯一备份。

预期格式：AVIF、WebP 和必要的 JPEG；预期宽度：480、768、1280、1600、2400px。实际参数通过图片测试后确定。

当前 `public/photos/` 中的 JPG 是由用户提供的个人照片生成的网页版本，已在 `assets/licenses/asset-register.csv` 登记为 active。每张图限制在 2400px 以内，并在生成时移除 EXIF/GPS 等元数据；原始文件保存在被忽略的 `assets/originals/user-photos-2026/` 中。
