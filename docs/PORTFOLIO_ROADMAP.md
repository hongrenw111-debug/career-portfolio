# Portfolio Roadmap

## Milestone 1 — Foundation（已完成）

- 建立独立作品集目录，不修改或复制现有敏感项目文件。
- 完成主页、五个案例详情、能力矩阵、证据账本与简历摘要。
- 建立内容验证、敏感信息扫描和 Node 测试。
- 记录 Provider Guard 与 CS2 项目的事实边界。

## Milestone 1.5 — 合规案例强化（2026-09-16 完成）

- 小红书内容引擎升级为「含 AIGC 合规检测」，案例重心从"全自动发布"转为**合规闸门**。
- 补入最强证据：**用平台真实审核拒绝数据反向校准规则**
  （2 篇在旧规则下通过却被平台拒绝 → 取证拒绝原文 → 补规则 → 可提前拦下）。
- 同步更新 `data/portfolio.json`（facts 4 条 / proof 6 条）、
  `docs/case-studies/xhs-content-engine.md`、`docs/EVIDENCE_REGISTER.md`、
  `docs/RESUME_BULLETS.md` 四处，保持口径一致。
- 证据边界如实标注：列语义待真机复核、标题前缀撞车信号弱、未做规模化发布验证。
- 校验：`npm run check` 通过（8 个项目、6 个测试全绿）、站点实测渲染正常。

## Milestone 2 — Identity & Distribution

- 用户确认公开姓名、邮箱、GitHub 和目标岗位城市。
- 制作 PDF 简历并加入下载入口。
- 生成 favicon、Open Graph 图片和部署配置。
- 部署静态站点并执行 Lighthouse。

## Milestone 3 — AgentGate Public Repository

- 从现有 Guard 中提取无账号、无节点、无本地路径的通用状态机。
- 使用 mock providers 构造 429、5xx、timeout、disconnect 和 cancellation。
- 增加 OpenTelemetry traces、Prometheus 指标和 Grafana dashboard。
- 录制“故障注入 → 分类 → 恢复 → 证据”的 90 秒演示。

## Milestone 4 — Supporting Evidence

- Media Pipeline：匿名化性能记录、失败样例、任务状态截图。
- Skill Router：标注意图集、路由理由、fallback 与调用轨迹。
- CS2 Simulator：清理仓库后执行 `pnpm check` 和 Playwright E2E，保存新鲜输出。
- RyzaChat:AI：修复安全与并发审计项，替换不可公开分发素材，补充本地完整链路录屏。
- 编写三篇 Engineering Notes / ADR / Postmortem。

## Definition of Done

作品集只有同时满足以下条件才算可投递：

- 招聘方在 10 秒内看懂岗位方向；
- 每个项目都有 Constraint / Decision / Mechanism / Evidence；
- 页面没有敏感信息、本地路径或无法证明的数字；
- 390px、768px 和 1440px 浏览器截图无布局错误；
- 键盘可以访问全部入口；
- 自动验证和测试通过；
- 至少一个主项目拥有公开代码、演示视频和可重复故障测试。
