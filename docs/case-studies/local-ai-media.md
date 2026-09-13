# Case Study 02 — Local AI Media Pipeline

## Constraint

在 Windows、6GB VRAM 和 16GB RAM 约束下运行图生视频模型，同时避免每次依赖手工修改 ComfyUI 节点。

## Decision

- 固定模型、采样器、步数、shift 和画幅，优先保证可复现。
- 关闭不适合当前内存预算的缓存和 pinned-memory 路径。
- 使用模板化后端 Runner 替代纯 GUI 操作。
- 生成与剪辑使用隔离的 Python 环境。

## Mechanism

```text
Input image + prompt
→ ComfyUI API template
→ MiniMax H3 / LightX2V
→ Media assembly
→ JianYing draft
```

## Evidence Gap

当前有固定配置与本地执行记录；公开前仍需匿名化运行耗时、峰值显存、失败样例与输出视频。
