# 架构与设计决策记录

本目录保存 Architecture Decision Records（ADR）。它不仅记录技术架构，也记录会长期影响网站的产品、视觉、内容、部署和成本选择。

## 何时需要新增 ADR

- 更换主框架、动效库、内容模型或托管平台。
- 改变“首页不展示照片”等核心产品约束。
- 引入数据库、CMS、账号、私密影集或第三方分析。
- 引入 WebGL、声音、地图等影响体验和性能的能力。
- 改变图片存储、版权处理、备份或公开范围。
- 作出明显增加长期成本或平台锁定的选择。

## 文件命名

```text
ADR-0001-short-decision-title.md
ADR-0002-another-decision.md
```

编号永久保留。被替代的 ADR 不删除，状态改为 `Superseded` 并链接新决策。

## 状态

- `Proposed`：讨论中。
- `Accepted`：已确认并执行。
- `Rejected`：评估后不采用。
- `Superseded`：被更新决策取代。
- `Deprecated`：仍存在但计划退出。

新建决策时复制 [ADR 模板](ADR-template.md)。

