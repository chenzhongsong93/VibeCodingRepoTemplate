---
name: scaffold-code
description: Scaffold actual code skeleton using language-native tools (cargo new / npm create / mvn / uv init / go mod init), then split modules per the system-architecture design and wire gates. Use AFTER init-code-repo (structure+gates) and fill-design-doc (architecture filled). Reads system-architecture.md构建块视图 to split code into the designed modules. Template orchestrates native commands — does not hand-craft code skeletons.
---

# scaffold-code — 代码骨架脚手架

用各语言原生脚手架生成代码骨架，按 `system-architecture.md` 构建块视图拆分模块，接好门禁。模板只编排命令，不手写骨架——跟进语言生态、产物地道。

## 前置

- init-code-repo 已建仓（文档结构 + 门禁 + 栈胶水文件）。
- fill-design-doc 已填 `docs/02-design/system-architecture.md` 的"构建块视图"（描述 apps/api、apps/web、crates/core 等模块划分）。未填则先跑 fill-design-doc。

## 流程

### 1. 读上下文

读 `AGENTS.md`（栈、repoShape）+ `docs/02-design/system-architecture.md`（构建块视图）+ `doc/component.yaml`（多仓组件仓）。从构建块视图提取模块清单（如 `apps/api(Rust,server)`、`apps/web(Node,web-app)`、`crates/core(Rust,library)`）。

### 2. 定项目类型

对每个模块，确认项目类型（构建块视图已暗示，复核）：

- **binary**：可执行（cargo --bin / go main / python entry）。
- **library**：库（cargo --lib / npm package / python package）。
- **web-app**：前端 SPA（vite/react/vue）。
- **cli**：命令行工具。
- **server**：后端 HTTP 服务。
- **workspace**：多 crate/package monorepo。

类型决定原生命令变体。可自定义命令（如 `--template vue-ts`）。

### 3. 跑原生脚手架（按栈 + 类型）

| 栈 | 类型 | 命令 |
|---|---|---|
| rust | binary | `cargo new <name>` |
| rust | library | `cargo new --lib <name>` |
| rust | workspace | 各 `cargo new --bin/--lib <name>` + 根 `Cargo.toml [workspace]` |
| node | web-app | `npm create vite@latest <name> -- --template react-ts` |
| node | cli/server | `npm init -y` + 建 `src/index.ts` |
| python | app | `uv init <name>`（或 `rye init`） |
| go | any | `go mod init <module>` + `main.go` |
| java | maven | `mvn archetype:generate -DgroupId=... -DartifactId=... -DarchetypeArtifactId=maven-archetype-quickstart` |

- monorepo：每个模块在 `apps/<name>/` 或 `crates/<name>/` 下跑命令。
- single：在仓根跑。
- 命令失败（工具未装）：提示用户装工具，**不静默跳过**。

### 4. 按设计拆模块

按构建块视图把脚手架产物拆/移到设计指定位置。构建块视图说 `apps/api + apps/web + crates/core`，就在对应目录跑脚手架。若设计与脚手架默认结构不一致（如 vite 默认 `<name>/`，设计要 `apps/web/`），移动/重命名产物到设计位置。

### 5. 接门禁

- `lefthook install`（若 lefthook 已装），把 init-code-repo 生成的 `lefthook.yml` 门禁挂到 git hooks。
- 验证构建可过：`cargo build` / `npm install && npm run build` / `go build ./...` / `mvn compile` / `uv sync`。构建不过 = 骨架有问题，修到过。
- 原生脚手架产物与 init-code-repo 胶水文件并存（如 `Cargo.toml` + `Makefile`）—— 互补，不冲突。

### 6. 回刷 AGENTS.md 仓库布局段

用实际脚手架产物刷新 `AGENTS.md` 的"代码仓结构"段（不再用 init-code-repo 模板默认布局）。例：

```
{{PROJECT_NAME}}/
├── apps/
│   ├── api/          # Rust axum 后端（cargo new --bin）
│   └── web/          # React+Vite 前端（npm create vite）
├── crates/core/      # 共享库（cargo new --lib）
├── docs/
├── AGENTS.md
└── ...
```

回刷走军规 J（变更即审视回刷），保证文档与代码不漂移。

## 与 init-code-repo / fill-design-doc 的关系

三 skill 时序链：init-code-repo（结构+门禁）→ fill-design-doc（填设计）→ scaffold-code（代码骨架）。每步输出是下步输入。init-code-repo 阶段 5 末尾会提示"设计填完后用 scaffold-code 生成代码骨架"。

## 回应语言

所有回应一律使用中文。
