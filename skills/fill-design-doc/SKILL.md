---
name: fill-design-doc
description: Fill a specific design document section-by-section via guided Q&A. Use after init-code-repo has scaffolded a repo with TODO placeholders, when the user wants to actually fill in a design doc (charter/architecture/entity-model/api/ui/etc.). Reads the doc structure + context, asks concrete questions per section, drafts content from user answers, writes back, then re-runs completeness check.
---

# fill-design-doc — 设计文档逐节填充

把 init-code-repo 留下的 TODO 占位逐节消灭。不写空白——逐节追问，把用户口述转成文档内容。

## 流程

1. **定位目标**：用户提供文档路径（如 `docs/02-design/system-architecture.md`），或自然语言指定（"帮我填架构文档"）。读目标文档章节结构 + 已有内容。
2. **读上下文**：读 AGENTS.md（项目一句话+栈+组件）、north-star.md（若存在）、component.yaml（若存在）、相关代码结构。建立填充上下文。
3. **逐节追问**：对每个 TODO/空节，提 1-2 个**具体**问题（不是"请填写"，而是"本组件对外暴露哪些接口？列出方法+路径+用途"）。一次一节，等用户答。
4. **起草该节**：用户口述 → agent 起草该节内容（结构化、可读）→ 展示给用户确认/修正 → 写回文档。
5. **循环**：进入下一节，直到该文档所有 TODO 消灭或用户叫停。
6. **收尾**：刷新 `docs/HANDOVER.md`（记录"填充了 X 文档 Y 节"）+ 触发完整性门控重扫（按 design-completeness-rules.md 的映射，报当前阶段门剩余未填）。

## 与 init-code-repo 的关系

init-code-repo 起草初稿 + 标 TODO；本 skill 逐节消灭 TODO。两者共享同一套文档结构与完整性门控规则。init-code-repo 阶段 5 末尾会主动引导调用本 skill。

## 起草原则

- 不留空白：用户口述后必起草内容，不回退到 TODO。
- 结构化：用表格/列表/章节组织，而非流水文本。
- 与上下文一致：起草内容须与 AGENTS.md/north-star/已有文档不矛盾；矛盾时停下确认。
- 可量化：验收标准、接口契约等用可验证表述。

## 回应语言

所有回应、文档内容一律使用中文。
