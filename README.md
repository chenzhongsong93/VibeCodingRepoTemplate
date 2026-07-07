# VibeCodingRepoTemplate

运行时中立的通用代码仓结构与研发流程模板，以 Skill 形态交付。

## 是什么

`skills/init-code-repo/` 是一个 skill：在新仓调用后，初始化 SSOT 文档结构 + 研发流程 + 质量门禁，并引导逐步建仓。融合 TianQuan、CyberWork、AWB 三仓的研发实践，语言中立核心 + 可插拔栈/门禁。

## 使用（end user，零运行时依赖）

1. 将 `skills/init-code-repo/` 安装到你的 agent runtime 的 skills 目录（见下）。
2. 在新仓目录调用 `init-code-repo` skill，按向导录入项目信息、选择栈与可选组件。
3. agent 按 `SKILL.md` 的装配规则，自己读模板→替换变量→剥离条件块→写文件。**无需 Node.js 或任何运行时。**

## 安装

skill 安装内容 = `skills/init-code-repo/`（`SKILL.md` + `templates/`）。各 agent runtime：

- **Claude Code**：将 `skills/init-code-repo/` 拷贝或软链至 `~/.claude/skills/init-code-repo/`（用户级）或项目 `.claude/skills/`。
- **codex / opencode / kimicode / zcode**：将 `skills/init-code-repo/` 拷贝至对应 runtime 的 skills 目录。skill 仅依赖 `SKILL.md` 与 `templates/`，runtime 中立。

调用时 agent 读 `SKILL.md`，按"手动装配规则"从 `templates/` 装配，零运行时依赖。选 Claude Code runtime 时附带 `.claude/settings.json`；其他 runtime 直读 `AGENTS.md`，无额外文件。

配套 skills（与 init-code-repo 一起装）：
- `dev-conductor`：按骨架+规范驱动 superpowers 走完"设计→落地"（brainstorming 填文档 + writing-plans/executing-plans/TDD 写代码）。

## 开发本仓（维护者，需 Node.js 22）

```bash
npm test        # 跑 golden 测试（15 用例）
```

测试矩阵：`tests/scenarios/` 每个场景一份 config，`tests/golden/` 持有期望产出。模板或装配规则改动后须保持 golden 通过。`assemble.mjs` 是装配的确定性参考实现——end user 的 agent 按 `SKILL.md` 同样的规则装配，二者输出一致。

## 文档

- [设计 spec](docs/superpowers/specs/2026-07-06-init-code-repo-template-design.md)
- [实现计划](docs/superpowers/plans/2026-07-06-init-code-repo-foundation.md)
