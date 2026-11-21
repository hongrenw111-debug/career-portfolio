# Portfolio Roadmap

## Milestone 1 — Foundation（已完成）

- 建立独立作品集目录，不修改或复制现有敏感项目文件。
- 完成主页、案例详情、能力矩阵、证据账本与简历摘要。
- 建立内容验证、敏感信息扫描和 Node 测试。
- 记录 Provider Guard 与 `cs2-arb` 项目的事实边界。

## Milestone 1.5 — 合规案例强化（2026-09-16 完成）

- 小红书内容引擎升级为「含 AIGC 合规检测」，案例重心从“全自动发布”转为**合规闸门**。
- 补入最强证据：**用平台真实审核拒绝数据反向校准规则**
  （2 篇在旧规则下通过却被平台拒绝 → 取证拒绝原文 → 补规则 → 可提前拦下）。
- 同步更新 `data/portfolio.json`、`docs/case-studies/xhs-content-engine.md`、`docs/EVIDENCE_REGISTER.md`、`docs/RESUME_BULLETS.md`，保持口径一致。
- 证据边界如实标注：列语义待真机复核、标题前缀撞车信号弱、未做规模化发布验证。

## Milestone 2 — Identity, Distribution & adbench-zh（已完成）

- 确定公开个人身份与 GitHub 主页，制作 2 页 A4 PDF 简历并加入下载入口。
- 重构页面为暖矿石纸底（`#f4f2ec`）+ 深松绿（`#145c46`）出版物档案风，同步更新 Favicon 与 Open Graph 分享图。
- 收录第 9 个核心案例 `adbench-zh`，并将纯静态交互评测看板集成至 `./adbench-zh/`，打通 `npm run build`（`dist/`）与 GitHub Pages 部署流水线。

## Milestone 3 — AgentGate & adbench-zh Public Repositories（进行中）

- 从现有 Provider Guard 中提取无账号、无节点、无本地路径的通用状态机，整理为独立可公开 `AgentGate` 仓库。
- 使用 mock providers 构造 429、5xx、timeout、disconnect 和 cancellation，补充 OpenTelemetry traces 与 90 秒故障演示。
- 脱敏整理 `adbench-zh` 独立公开仓库，扩充商业 Brief 至百条级并完成 50 题双盲标注，补齐有效 Self-Kappa。

## Milestone 4 — Supporting Evidence（进行中）

- Job Apply Agent：真机校准三平台选择器，补充定制前后对比样例与小批次运行记录。
- AIGC 图像量产工作流：整理脱敏后的生成前后对比样例与参数化提示词说明。
- `cs2-arb`：补充离线行情快照回放演示与 ADR 风控探测工程笔记。
- `ego-win`：完成仓库脱敏审查与 20 余条 Windows 专属踩坑文档化。
- `RyzaChat:AI`：作为本地原型保留；若需公开演示则先修复已知安全/并发项并替换可分发占位素材。

## Definition of Done

作品集只有同时满足以下条件才算可投递：

- 招聘方在 10 秒内看懂岗位方向；
- 每个项目都有 Constraint / Decision / Mechanism / Evidence，并显式标明开源/未开源与实测边界；
- 页面与下载 PDF 口径一致，无敏感信息、本地路径或不可证明的夸大词；
- 390px、768px 和 1440px 浏览器截图无布局错误；
- 键盘可以访问全部入口；
- 自动验证和测试通过（`npm run check` & `npm run build`）；
- 至少一个主项目拥有公开代码，并配齐可交互静态看板与可复核证据账本。
