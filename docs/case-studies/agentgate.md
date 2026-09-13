# Case Study 01 — Provider Guard / AgentGate

## 结论

当前完成的是**本地运行的 Gemini 双账号可靠性层**；AgentGate 是从它抽取出的公开通用版本目标，不把两者混写成同一个已完成产品。

## Constraint

一次失败可能来自网络出口、地区限制、上游 5xx、本地 Provider 后端、模型目录、配额或鉴权。通用 retry 无法判断是否应该切换节点，反而可能重复计费或掩盖根因。

## Decision

- 两个账号使用分离后端、listener、节点组、任务和无重叠节点池，但共享同一个 Clash 进程。
- 只有一个 Guard 拥有共享网络组件的恢复权。
- Provider 后端关闭自己的重试，恢复由 Guard 统一控制。
- 响应头或任意响应字节已经发送给下游后，禁止自动重放。

## Mechanism

```text
Client request
→ Failure classifier
→ Provider lane
→ Backend health / model catalog
→ Egress probe
→ Replayable recovery OR final classified error
```

## Evidence

2026-08-30 的只读运行检查确认两个 Guard 健康、两个 8 节点池无重叠、任务运行、旧入口退出、目标模型存在且日志未命中本地 API key。

检查后工作区又发生代码变化。因此当前不宣称“最新工作区已经部署”，新 cooldown 修复必须重新执行部署与回归。
