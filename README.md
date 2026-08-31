# Personal Website

个人网站的唯一项目根目录。后续与网站有关的需求、设计、素材、内容、代码、测试、部署文件和历史归档均应保存在本目录内，不在工作目录中平铺散落文件。

## 当前状态

- 阶段：V2 照片内容发布基础设施已完成本地实现
- 方案版本：v0.1
- 最近更新：2026-08-31
- 当前技术栈：vinext（Next.js App Router 兼容）+ TypeScript + React + 原生 CSS + Drizzle ORM + Cloudflare D1/R2
- 当前部署建议：先用 GitHub Pages 发布静态展示版；需要照片上传和 EXIF 管理时，再切换到 Cloudflare Sites + D1（元数据）+ R2（原片与网页版本）
- 已确认约束：首页不展示照片；影集使用真实高清素材；整体避免模板化和明显的 AI 生成感；交互体验是核心竞争力。

## 文档入口

- [完整总体方案](docs/00-master-plan.md)
- [照片发布与存储操作说明](docs/02-photo-publishing.md)
- [未完成需求与后续实现清单](docs/01-unfinished-requirements.md)
- [决策记录](docs/decisions/README.md)
- [素材与许可登记表](assets/licenses/asset-register.csv)
- [影集内容模板](content/albums/album-template.md)

## 目录职责

```text
personal-website/
├── README.md                 # 项目入口与当前状态
├── AGENTS.md                 # 后续开发与协作约束
├── docs/                     # 总体方案、决策、运行和维护文档
│   └── decisions/            # 架构决策记录 ADR
├── design/                   # 视觉参考、线框图和交互原型
│   ├── references/
│   ├── wireframes/
│   └── prototypes/
├── assets/                   # 真实图片及其网页版本与许可
│   ├── originals/
│   ├── web/
│   └── licenses/
├── content/                  # 影集、随笔和项目内容源文件
│   ├── albums/
│   ├── notes/
│   └── projects/
├── app/                      # vinext/Next 页面、布局、组件和样式
├── src/                      # 预留给共享源码与非路由模块
├── public/                   # 可直接公开访问的静态文件
├── scripts/                  # 图片处理、校验、构建和维护脚本
├── deployment/               # 部署配置、迁移和恢复资料
├── tests/                    # 自动化、性能、无障碍和浏览器测试
└── archive/                  # 已废弃但需要保留的历史文件
```

## 文件管理规则

1. 所有网站文件必须位于本目录内。
2. 原始照片进入 `assets/originals/`，网页优化版本进入 `assets/web/`。
3. 外部素材必须先登记许可和来源，再进入正式页面。
4. 设计参考不能直接当成成品复制；应记录借鉴点和排除项。
5. 重要技术、设计或部署变化必须新增决策记录，并同步更新总体方案。
6. 密钥、令牌和生产环境变量不得写入仓库。
7. 大文件、构建产物和本机缓存不纳入版本控制。

## 当前进度

已完成：无照片首页、影集目录、故事/审片双模式、筛选、胶片索引、灯箱与键盘交互、真实高清原型素材、响应式布局。

已完成增强：独立影集与照片稳定网址、D1/R2 照片发布链路、owner-only Studio、浏览器端 EXIF/GPS 校对、原片/网页版本分离、最新三张动态合并和 404/空状态。

静态发布：已加入 `.github/workflows/deploy-github-pages.yml`，推送 `master` 或 `main` 后会自动构建 `dist/client` 并发布到 GitHub Pages。详细步骤见 [部署说明](deployment/README.md)。

下一阶段：先完成 GitHub 仓库与 Pages 设置并接入自有域名；需要照片上传和 EXIF 管理时，再在真实 Cloudflare 项目完成 D1/R2 绑定和 owner 登录验收。
