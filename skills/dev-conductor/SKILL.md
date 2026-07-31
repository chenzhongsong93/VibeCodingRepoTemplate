---
name: dev-conductor
description: Orchestrate superpowers to drive a project from skeleton to working code, per the template's骨架+规范. Reads the completeness gate to find unfilled design docs, drives superpowers:brainstorming to fill each section; once design is filled, gives code skeleton+gates via native scaffolding (cargo new/npm create/mvn/uv/go mod) and drives superpowers:writing-plans+executing-plans+TDD to implement each module per the system-architecture构建块视图. Use AFTER init-code-repo. The template defines skeleton+norms; this skill conducts superpowers to execute — does not write docs/code itself.
---

# dev-conductor — 开发指挥

按 init-code-repo 的骨架+规范，**驱动 superpowers** 走完"设计→落地"。本 skill 是指挥，不是乐手——不写文档/代码，只编排 superpowers 执行。

## 定位

- init-code-repo：骨架（结构）+ 规范（规则/门禁）。宪法+地图。
- **dev-conductor：指挥。** 读地图调度，按完整性门控逐项驱动 superpowers。
- superpowers / openspec：乐手。brainstorming/writing-plans/executing-plans/TDD 实际执行。

## 前置

init-code-repo 已建仓（文档骨架带 TODO + 门禁 + 完整性门控）。

## 流程

### 1. 读进度：完整性门控

跑 `node scripts/check-completeness.mjs --stage <当前阶段门>`（阶段门从 `docs/HANDOVER.md` 顶部读）。结果给出当前阶段门未填的必填文档清单（含 `（TODO: ...）` 残留）。

- 有未填文档 → 进入步骤 2（驱动设计填充）。
- 设计文档全填（门控过）→ 进入步骤 3（驱动代码落地）。

### 2. 驱动设计填充（superpowers:brainstorming）

对每个未填文档章节：

1. 定位 TODO 章节，读上下文（AGENTS.md 项目一句话+栈、north-star 若存在、相关已有文档）。
2. **驱动 `superpowers:brainstorming`** 对该章节做需求探索+设计——把 TODO 章节作为 brainstorming 的主题，逐节追问用户，产出该章节内容。
3. brainstorming 产出 → 写回文档对应章节。
4. 该文档所有章节填完 → 重跑完整性门控，确认该文档无 TODO 残留。
5. 进入下一未填文档，直到当前阶段门所有必填文档过门控。

> dev-conductor 不自己追问/起草——调 superpowers:brainstorming 做。它只负责"按门控找未填项 → 调 brainstorming 填 → 收口"。

### 3. 驱动代码落地（superpowers:writing-plans + executing-plans + TDD）

设计文档过门控后，按 `docs/02-design/system-architecture.md` 的"构建块视图"落地代码：

#### 3a. 给代码骨架+门禁（原生脚手架）

按构建块视图的模块清单 + 栈 + 项目类型，跑原生脚手架：

| 栈 | 类型 | 命令 |
|---|---|---|
| rust | binary/library | `cargo new [--lib/--bin] <name>` |
| rust | workspace | 各 `cargo new --bin/--lib <name>` + 根 `Cargo.toml [workspace]` |
| node | web-app | `npm create vite@latest <name> -- --template react-ts` |
| node | cli/server | `npm init -y` + `src/index.ts` |
| python | app | `uv init <name>` |
| go | any | `go mod init <module>` + `main.go` |
| java | maven | `mvn archetype:generate -DgroupId={{GROUP_ID}} -DartifactId={{PROJECT_NAME}} -DarchetypeArtifactId=maven-archetype-quickstart -DinteractiveMode=false` |

monorepo 在 `apps/<name>/` 或 `crates/<name>/` 下跑；single 在根。按构建块视图把产物拆到设计位置。`lefthook install` 接门禁。验证 `cargo build`/`npm install`/`go build`/`mvn compile` 可过。

#### 3b. 驱动 superpowers 实现每个模块

对构建块视图的每个模块：

1. **驱动 `superpowers:writing-plans`**——以该模块的设计（构建块视图 + entity-model + api-reference）为输入，产出实现计划。
2. **驱动 `superpowers:executing-plans` + `superpowers:test-driven-development`**——按计划 TDD 实现。
3. 模块实现完 → 跑该栈门禁（lint/test）→ 过则下一模块。

> dev-conductor 不自己写代码——调 superpowers:writing-plans/executing-plans/TDD 做。它只负责"按构建块视图逐模块 → 调 superpowers 实现 → 门禁收口"。

#### 3c. 回刷 AGENTS 仓库布局段

代码落地后，用实际产物回刷 `AGENTS.md` 的"代码仓结构"段（军规 J：变更即审视回刷）。

### 4. 收口

每轮（填完一文档 / 实现一模块）：
- 刷新 `docs/HANDOVER.md`（记录本轮完成项 + 下轮首做 + 当前阶段门）。
- 重跑完整性门控，确认进度。
- 全部过 → 当前阶段门达标，可发布。

## 与 init-code-repo 的关系

init-code-repo 阶段 5 末尾引导调用 dev-conductor：骨架+规范就位后，dev-conductor 接管，驱动 superpowers 把骨架填实、把代码落地。

## 回应语言

所有回应一律使用中文。
