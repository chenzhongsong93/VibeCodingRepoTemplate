# VibeCodingRepoTemplate

> A runtime-neutral code-repo template, delivered as composable agent skills.
>
> 通用代码仓结构与研发流程模板，以 Skill 形态交付：新仓调用 `init-code-repo` → 录取项目信息/选栈与组件 → 装配 SSOT 文档 + 研发流程 + 质量门禁 → `dev-conductor` 驱动 superpowers 走完"设计→落地"。融合 TianQuan、CyberWork、AWB 三仓研发实践，语言中立核心 + 可插拔栈/门禁。

> ⚠️ **装配一致性门**：模板或装配规则改动须保持 19 个 golden 场景全绿；`assemble.mjs` 是装配的确定性参考实现——end user 的 agent 按 `SKILL.md` 同样的规则装配，二者输出须一致。

![license](https://img.shields.io/badge/license-Apache--2.0-blue)
![tests](https://img.shields.io/badge/tests-passing-green)
![npx](https://img.shields.io/badge/npx-skills-blue)
![runtime](https://img.shields.io/badge/runtime-Claude%20Code%7Ccodex%7Copencode%7Ckimicode%7Czcode-blue)
![node](https://img.shields.io/badge/node-22%2B-maintainer-blue)

## 目录

- [架构](#架构)
- [✨ 特性](#-特性)
- [🚀 快速开始](#-快速开始)
- [📦 仓库结构](#-仓库结构)
- [🧪 测试](#-测试)
- [⚙️ 关键约束](#-关键约束)
- [🤝 贡献](#-贡献)
- [📄 License](#-license)

## 架构

两个可组合 skill，分层调用：`init-code-repo` 给骨架+规范（宪法+地图），`dev-conductor` 是指挥，调度 superpowers 这群乐手实际执行。`SKILL.md` + `templates/` 是 init-code-repo 的唯一装配契约：

```mermaid
flowchart TD
    A[init-code-repo<br/>骨架+规范：SSOT 文档结构 / 研发流程 / 质量门禁]
    A -->|装好骨架后调用| B[dev-conductor<br/>指挥：读完整性门控逐项驱动]
    B -->|Stage 设计| C[superpowers:brainstorming<br/>填设计文档]
    B -->|Stage 落地| D[superpowers:writing-plans → executing-plans → TDD<br/>写代码并红→绿]
    A -.SKILL.md + templates/ 装配契约.-> A
```

## ✨ 特性

- 🧠 **运行时中立**：核心模板与语言无关，一套装配规则适配 Claude Code / codex / opencode / kimicode / zcode，选 runtime 时叠加对应 `runtime-adapters/`。
- 🚫 **零运行时依赖**：agent 自己读 `SKILL.md` → 替换变量 → 剥离条件块 → 写文件，**无需 Node.js / Python / 任何运行时**。`assemble.mjs` 仅维护者跑测试用。
- 🎚️ **双路径**：选 Claude Code 时附带 `.claude/settings.json`；其他 runtime 直读 `AGENTS.md`，无额外文件。
- 🧩 **条件装配**：5 类模板（`core` / `stacks` / `gates` / `runtime-adapters` / `central-docs`）按录取选项剥离，未选组件不落盘。
- 🔌 **可插拔栈与门禁**：主栈（rust / node / python / go / 多栈）+ 仓角色（单仓 / 组件仓 / 中央 docs 仓）+ commit 门禁档 + 分支模型，全部按需叠加。
- 🧪 **golden 确定性**：19 个场景 config → 期望产出，模板/装配规则改动后须保持 golden 通过；`assemble.mjs` 与 agent 装配规则同源，输出一致。

## 🚀 快速开始

### 1. npx 一行装两 skill（推荐）

```bash
# GitHub 仓（主仓，推荐，走已配的 ssh key 免密）
npx skills add git@github.com:chenzhongsong93/VibeCodingRepoTemplate.git
# https 备选（git 交互提示输入凭据）
npx skills add https://github.com/chenzhongsong93/VibeCodingRepoTemplate.git
# 只装一个：--skill init-code-repo / dev-conductor
```

`npx skills`（[vercel-labs/skills](https://github.com/vercel-labs/skills)）自动探测已装 agent（Claude Code / codex / opencode…），symlink 到对应 skills 目录。

### 2. 手动安装（零运行时依赖）

skill 安装内容 = `skills/init-code-repo/`（`SKILL.md` + `templates/`）+ `skills/dev-conductor/`。

- **Claude Code**：拷贝或软链至 `~/.claude/skills/`（用户级）或项目 `.claude/skills/`。
- **codex / opencode / kimicode / zcode**：拷贝至对应 runtime 的 skills 目录。skill 仅依赖 `SKILL.md` 与 `templates/`，runtime 中立。

### 3. 使用

安装后，在新仓目录对你的 agent 说：

> 用 init-code-repo skill 初始化这个仓。

Agent 自动：5 阶段向导（前置检查 → 录取项目信息/选栈与组件 → 装配 SSOT 文档+研发流程+质量门禁 → 校验 → 引导逐步建仓）。骨架就位后，`dev-conductor` 接力驱动 superpowers 走完设计与落地。

## 📦 仓库结构

```
VibeCodingRepoTemplate/
├── skills/
│   ├── init-code-repo/            # 骨架+规范：5 阶段向导 + 变量替换 + 条件装配
│   │   ├── SKILL.md               # 装配契约（agent 读此文件自装配）
│   │   └── templates/             # core / stacks / gates / runtime-adapters / central-docs
│   └── dev-conductor/             # 指挥：驱动 superpowers 走 设计→落地
├── tests/
│   ├── scenarios/                 # 19 个场景 config（录取选项 → 期望产出）
│   ├── golden/                    # 期望产出（golden）
│   └── run_tests.mjs              # 测试入口
├── assemble.mjs                   # 装配的确定性参考实现（维护者用）
├── docs/superpowers/              # 设计 spec + 实现计划
└── package.json                   # 维护者测试脚本（非运行时依赖）
```

## 🧪 测试

```bash
npm test                 # 跑 golden 测试（19 场景）
node --test tests/run_tests.mjs
```

L1 装配一致性：每个 `tests/scenarios/` config 经 `assemble.mjs` 装配，与 `tests/golden/` 期望产出逐文件比对。模板或装配规则改动后须保持 19 场景全绿——这是 end-user agent 装配正确性的保证（`assemble.mjs` 与 agent 按 `SKILL.md` 装配同源，二者输出须一致）。

## ⚙️ 关键约束

- **Mock 不冒充完成**：发布验收以 Real 为准；Mock 闭环 / 单测 / 占位 stub 不得作为"可发布"判据（透传自 `CLAUDE.md` 发布验收铁律）。
- **装配一致性门**：模板或装配规则改动须保持 19 个 golden 场景全绿；`assemble.mjs` 与 `SKILL.md` 装配规则同源。
- **零硬编码**：项目信息全走变量替换（`{{PROJECT_NAME}}` 等）+ 条件装配，未选组件不落盘。
- **小步原子提交**：改动遵循 TDD（红→绿→提交），提交前自检。

详见 [`skills/init-code-repo/SKILL.md`](./skills/init-code-repo/SKILL.md) 与 [`CLAUDE.md`](./CLAUDE.md)。

## 🤝 贡献

设计文档见 `docs/superpowers/specs/`，实现计划见 `docs/superpowers/plans/`。改动遵循 TDD（红→绿→提交），小步原子提交，模板/装配规则改动后保持 golden 全绿。

## 📄 License

Apache License 2.0 — 见 [LICENSE](./LICENSE)。
