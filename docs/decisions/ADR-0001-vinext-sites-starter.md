# ADR-0001：采用 Sites 官方 vinext starter 作为第一版前端基线

- 状态：Accepted
- 日期：2026-08-13
- 决策人：网站项目负责人
- 关联方案章节：`docs/00-master-plan.md` 第 10、11、12 节
- 替代或被替代：替代“第一版直接初始化 Astro”这一实施假设

## 背景

网站总体方案以内容优先、局部强交互和 Cloudflare 部署为目标。项目工作区的 `sites-building` skill 要求新站点使用其官方 vinext starter，以获得已经验证的 Sites/Vite/Cloudflare Worker 构建和预览链路。个人网站项目根目录此前已经包含方案文档，不能直接覆盖初始化，因此先在临时目录完成 starter 安装，再将工程文件合并到项目目录。

## 决策

第一版采用：

- vinext（Next.js App Router 兼容结构）。
- React Client Components 实现暗房故事、审片模式、筛选和图片查看器。
- 原生 CSS、TypeScript 和 GSAP 完成视觉与动效。
- 保留 Sites starter 的 `.openai/hosting.json`、Vite 插件和 Worker-compatible 构建。
- 继续遵守静态优先：没有动态数据需求的页面不引入数据库或会话。

## 备选方案

### Astro

- 优点：静态内容优先、局部 hydration 语义清晰。
- 缺点：需要替换官方 starter，增加与 Sites 构建链路的适配工作。

### 标准 Next.js

- 优点：生态完整，服务端能力成熟。
- 缺点：当前项目不需要完整服务端能力，且会偏离已提供的 Sites starter。

### 直接使用 vinext starter

- 优点：构建、预览、Pages/Worker 兼容和基础目录已经准备好；可以立即进入视觉实现。
- 缺点：需要接受 vinext beta 生态，并对静态优先边界自行约束。

## 选择理由

当前任务是立即制作可运行的网站原型，官方 starter 能减少基础设施差异和部署风险。它不改变页面的内容模型、图片存储和局部交互设计，只改变前端工程的实际落地基线。

## 影响

### 正向影响

- 可以直接运行 `npm run dev`、`npm run build` 和 Sites 预览。
- React 与 GSAP 生态可直接使用。
- 后续添加 Cloudflare D1、R2 或 Pages Functions 时有现成配置入口。

### 负向影响

- 总体方案中关于 Astro 的表述需要同步修正。
- vinext 仍处于快速演进状态，需锁定 lockfile 并在升级前验证构建。

### 需要同步修改

- [x] 总体方案
- [x] 根目录 README
- [ ] 代码与配置
- [ ] 部署文档
- [ ] 测试

## 验证方法

- 本地启动开发服务器并访问首页与 `/photos`。
- 运行 `npm run build`。
- 运行项目关键路径测试。
- 检查桌面、手机、键盘、触屏和减少动态效果模式。

## 回退方案

保留官方 starter 的 lockfile 和构建配置；如 vinext 阻塞后续功能，可在新的 ADR 中评估标准 Next.js 或 Astro，并保留现有 `app/` 内容与设计系统。
