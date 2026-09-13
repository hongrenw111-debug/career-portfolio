# Case Study 04 — CS2 Arbitrage Simulator

> SIMULATION ONLY — 不提交平台订单，不宣称真实收益。

## Constraint

跨市场机会需要同时处理订单簿深度、费用版本、行情时效、金额精度、余额变化、历史导入和失败恢复，无法用一个价差公式表达。

## Decision

- 领域模型与服务端、持久化和采集边界分离。
- 金额使用最小货币单位，比例使用定点表达。
- 数据不完整或策略过期时失败关闭，返回明确拒绝码。
- 交易事实写入追加式账本，通过重放重建余额和利润。
- 恢复演练只操作副本，绝不覆盖主库。

## Mechanism

```text
Whitelisted read-only capture
→ Review / checkpoint
→ Order-book simulation
→ Qualified opportunity
→ Batch review
→ Event ledger / replay / reconciliation
```

## Evidence

当前源码审计确认分层 monorepo、23 个 HTTP 路由、54 个测试或 E2E spec 文件，以及订单簿、领域评估、事件账本、恢复和采集安全机制。

本轮没有执行质量门，因此不能写“当前所有测试通过”。
