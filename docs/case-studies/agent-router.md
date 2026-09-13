# Case Study 03 — Agent Skill Router

## Constraint

工具和专业角色增多后，用户需要记忆大量命令；将全部 Skill 和角色一次性塞入上下文又会降低相关性并增加成本。

## Decision

- 自然语言先进入八域意图矩阵。
- 代码理解、诊断、实现、设计、浏览器和媒体任务分别路由。
- 230+ 角色保留在本地仓库，只加载当前任务需要的角色。
- Codex、ZCode 和 WorkBuddy 通过统一索引共享长期状态。

## Evidence Gap

下一步建立带标准答案的意图数据集，记录路由理由、fallback 和最终执行轨迹；在此之前不宣称路由准确率。
