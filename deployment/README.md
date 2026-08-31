# 部署与运行资料

本目录未来保存：

- 环境说明与部署拓扑。
- Cloudflare 或腾讯云配置说明。
- 域名、DNS 和 HTTPS 检查清单。
- 发布、回滚、迁移和灾难恢复步骤。
- 环境变量名称清单（仅名称与用途，不保存密钥值）。
- 费用提醒和配额说明。

生产凭据不得写入本目录或 Git。实际值保存在密码管理工具和托管平台的安全环境变量中。

## 本地运行

在项目目录执行：

```bash
npm install
npm run dev
```

开发服务器默认使用 `http://localhost:3000/`。正式构建与验证：

```bash
npm run build
npm test
npm run lint
```

## 当前托管

项目已接入 Sites 托管配置，项目标识保存在 `.openai/hosting.json`。后续发布应使用经过 `npm test` 验证的源码状态。当前 `public/photos/` 使用用户提供的个人照片网页版本；原始照片不进入公开目录，素材来源和处理状态登记在 `assets/licenses/asset-register.csv`。

照片发布工作台使用 `.openai/hosting.json` 中的 `DB`（D1）和 `PHOTOS`（R2）逻辑绑定。首次请求会以幂等方式初始化本地/Preview 表结构；生产发布仍应执行 `drizzle/0000_gifted_trish_tilby.sql`，并确认 owner 身份头已由托管平台注入。具体上传、回退和隐私边界见 `docs/02-photo-publishing.md`。

## GitHub Pages 静态版

当前页面也可以先用 GitHub Pages 托管，适合作为不带管理后台的公开展示版：

1. 将仓库推送到 GitHub 的 `master` 或 `main` 分支。
2. `.github/workflows/deploy-github-pages.yml` 会自动安装依赖、执行 `npm run build:github`，并把 `dist/client` 发布到 GitHub Pages。
3. 在 GitHub 仓库的 **Settings → Pages** 中将 Source 设为 **GitHub Actions**。

仓库名决定访问路径：如果仓库名是 `用户名.github.io`，站点从域名根路径访问；如果是普通仓库（例如 `personal-website`），访问路径会自动带上 `/personal-website/`。构建后的路由同时生成目录式 `index.html`，可直接支持影集和照片详情的无扩展名链接。

GitHub Pages 版本只包含静态首页和公开影集页面，不提供 Studio、D1/R2 API 或照片上传能力；这些能力保留给 Cloudflare 版本。若要绑定自有域名，可在仓库 Variables 中新增 `GITHUB_PAGES_CNAME`，值为域名（不带协议），并在域名服务商处按 GitHub Pages 的提示配置 DNS。

## 自有域名接入清单

1. 在托管平台的站点设置中添加自己的域名。
2. 按平台给出的 DNS 记录，在域名服务商处添加 CNAME 或验证记录。
3. 等待 HTTPS 证书签发，确认根域名和 `www`（如需要）均能访问。
4. 用无痕窗口检查首页、影集、灯箱和移动端布局。
5. 不要把 DNS API Token、部署 Token 或数据库密钥写入仓库。
