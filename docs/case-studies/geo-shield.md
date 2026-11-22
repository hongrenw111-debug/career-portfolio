# Case Study 10 — GeoShield 反 GEO 软文洗脑与抗提示注入防御套件

## 结论

面向 AI 搜索与 Agent 联网选品的开源防洗脑引擎与安全审计台（GitHub 公开仓库 `hongrenw111-debug/geo-shield`，MIT 许可）：先以可逆清洗层剥离网页白字、`<style>` 隐藏类、零宽/Unicode Tag 隐写与跨行提示注入，并专设「用 AI 总结」跳转链接的记忆投毒安检；再以四维可解释本地打分 + 可选 OpenAI 兼容语义审计 + 跨站改写协同矩阵聚类重排，经 5 维对抗脚本实测暴露初版盲区并完成迭代加固，最终通过 22 项离线回归测试、32 文件 AST 模块边界校验与双系统 CI。

## Constraint

- 联网 AI 面对商业选品问题时受两类污染威胁：一类是高权重站点与自媒体批量铺发的「伪客观评测/对比榜单」（GEO 软文），另一类是藏在网页隐藏 DOM、HTML 注释、隐形 Unicode 或「Summarize with AI」跳转参数里的间接提示注入与长期记忆投毒。
- 初版正则与字面量重复检测在 5 维真实对抗测试中暴露出明确短板：带「唯一缺点是价格略高」托词的温和软文得分为 `0 / 100 LOW`；AI 改写措辞的 3 篇跨站通稿逃过 4-gram Jaccard 聚类（`clusters_detected = 0`）；换行符或内联 `<b>`/`<span>` 拆词即可绕过逐行正则；安全科普文章正文引用攻击示例反而被误删；`?ref=`/`/best-practices` 等正常工程文档出现误报。
- 纯检索摘要（~150 字符）无法承载正文级隐藏 DOM 与返利链接，必须拉取完整目标页正文才具有审计意义。

## Decision

- **Deep Module 无环架构 + AST 边界强门禁**：将系统拆分为 `sanitize`、`geo_score`、`retrieval` 三个零内部依赖叶模块与 `verify`、`mcp_server`、`web`、`cli` 交付层，所有跨模块与测试调用强制仅通过 `__init__.py` 公共接口，由 `scripts/check_boundaries.py` 在本地与 CI 中自动拦截私有越权导入。
- **跨行折叠 + 元讨论豁免**：`sanitize` 在 HTML 块级流提取与空白折叠视图上匹配规则，封堵内联标签与 `%0A` 换行拆词；同时对 visible 正文引号或攻击示例讨论语境降级为 `INFO` 且不删行，解决安全科普误伤。
- **本地启发式兜底 + 可选 LLM 混合语义审计**：保留零 API 成本纯本地四维打分（补齐假平衡价格托词、结构化种草模板与掩护短链检测，并收紧域名/Git `?ref=` 误报），同时支持通过环境变量接入 OpenAI 兼容端点做 60/40 加权语义审计并在超时/解析异常时自动降级。
- **反传递聚类 + 协同实体矩阵**：用高内聚团聚类替代无约束连通分量，避免桥接文档把无关文章粘连降权；对改写洗稿增加跨站高频品牌协同推销聚类。

## Mechanism

```text
用户查询 / 待审 URL / AI 跳转链接
            ↓
inspect-link：二次 URL 解码 + 路径/片段/嵌套跳转解套 → 识别记忆投毒 (CRITICAL)
            ↓
retrieval：SearXNG / 公开检索 / 逐跳 SSRF 校验（not addr.is_global）抓取完整正文
            ↓
sanitize：解析 <style> 隐藏类 + 剥离隐身 DOM / Unicode 隐写 / 跨行注入（保留科普引用）
            ↓
geo_score + verify：四维 GEO 打分（可选混合 LLM）+ 跨站协同矩阵聚类重排
            ↓
输出 <untrusted_web_evidence> XML 隔离上下文 / CLI JSON / MCP 工具 / 本地 Web 面板
```

## Evidence

- **工程与架构验证（2026-11-23 实测）**：`uv run python scripts/validate.py` 全绿——`ruff` 零告警、`scripts/check_boundaries.py` 32 个源码与测试文件通过（并经临时越权导入负测试验证拦截有效后撤回）、`pytest -v` 22 项离线测试全部通过（覆盖中英软文、白字/注释/Unicode Tag/CSS 类/同形字绕过、AI 链接投毒、SSRF 阻断 `100.64.0.0/10`、LLM 融合与超时降级、MCP 4 工具与 FastAPI 路由）。
- **5 维真实对抗脚本前后对比（`scripts/interrogate_real.py` 实测）**：
  - 真实联网检索（英文密码管理器 + 中文空气净化器）：由初版 `0` 条提升至各返回 `5/5` 实测来源，命中结构化多机型对比与价格托词的榜首评测被识别 `geo_risk = 41` 并降权至 `#5`。
  - 3 篇 2026 温和隐蔽 GEO 软文：由改造前全部 `0 / 100 LOW` 提升至 `30–36 / 100 MEDIUM`（命中 `structured_geo_pitch` 与 `token_price_caveat`）。
  - 提示注入绕过对抗：`<style>` 隐藏类、`scale(0)`、无关键词语义改写投毒、跳转参数外链均成功检出拦截；安全科普正文引用注入示例误报由 `injection_risk = 100`（误删 2 行）降至 `0`（0 误删）；K8s `best-practices` 与 Git `?ref=` 文档误报降至 `LOW`。
  - 3 篇 AI 改写措辞的跨站软文（`baijiahao` / `sohu` / `163`）与 2 篇独立评测对比：`clusters_detected` 由 `0` 升至 `1`，3 篇改写软文被聚入 `cluster-1`（`combined_risk` `12 → 62`），两篇独立评测升至 `#1` 与 `#2`。
- **端到端表面验证**：CLI `inspect-link` 与 `audit-text --html` 输出结构化 JSON 实测通过；本地 Web 审计面板起服探活 `GET /api/health` 与 `GET /` 均返回 `200`。

## 证据边界

- **纯本地模式的评分边界**：在不接入外部 LLM 语义审计时，措辞克制且无返利链接的隐蔽软文本地规则打分保守落在 `MEDIUM`（`30–36` 分），尚未直接达到 `HIGH`（`>= 60`）；高利益消费决策仍需结合混合 LLM 审计及 Thin Skill 的反方差评检索纪律。
- **真实网站折叠菜单噪声**：部分大型内容站或百科页的正常导航/折叠菜单自带 `display:none` / `opacity:0` 隐藏文本，实时抓取整页 HTML 时仍可能拉高 `hidden_dom_text` / `injection_risk`。
- **反爬与登录墙限制**：强制登录或严格反爬的站点（如部分知乎专栏）匿名抓取仍会返回 `HTTP 403`，当前不提供任何绕过验证码或非授权采集能力。
- **跨行纯文本尾词残余**：极端的每词单独成行拆词注入在跨行正则剥离指令短语后，尾行孤立实体词仍可能残留（已被识别为 `injection_risk = 100` 高危）。
