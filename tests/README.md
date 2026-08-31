# 测试目录

后续测试至少覆盖：

- 首页、导航、影集目录、暗房故事、审片模式和影集详情关键路径。
- 桌面、平板和手机视口。
- 鼠标、键盘和触屏操作。
- `prefers-reduced-motion`。
- 图片加载失败和慢速网络。
- 原片同步后的最新三张排序、EXIF 字段与 GPS 隐私覆盖。
- 无 JavaScript 的基础内容访问。
- 无障碍自动检查与人工焦点检查。
- Core Web Vitals 和图片传输量。
- Preview 与 Production 的索引和环境隔离。

当前已落地：

```bash
npm run typecheck
npm run lint
npm test
# GitHub Pages 静态发布验收（需要设置 GITHUB_REPOSITORY）
GITHUB_PAGES=true GITHUB_REPOSITORY=用户名/用户名.github.io npm run build:github
```

`npm test` 会构建 Vinext，并验证首页、影集目录、影集详情、单张照片稳定网址、404 和 API/Studio 边界源码。D1/R2 的实际读写链路需在本地开发服务器中使用 owner 认证头做冒烟测试；完整人工设备验收仍在上线前进行。
