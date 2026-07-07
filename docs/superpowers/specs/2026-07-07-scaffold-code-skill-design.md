# scaffold-code skill 设计

> **状态**：设计已与用户确认，待写入实现计划。
> **日期**：2026-07-07
> **性质**：过程文档（非 SSOT），仅留追溯。
> **前置**：init-code-repo + fill-design-doc 已实现（v1 + 扩展 A/B/C，36/36 测试）。

---

## 1. 背景与目标

init-code-repo scaffold 文档结构 + 研发流程 + 门禁；fill-design-doc 填设计文档 TODO。但**代码骨架**无人 scaffold——仓里只有文档 + 构建配置（Makefile/package.json/pyproject.toml），无实际源码（src/main.rs、src/main.tsx、main.go 等）。

目标：新增 `scaffold-code` skill，用各语言**原生脚手架**（cargo new / npm create / mvn / uv init / go mod init）生成代码骨架，按 `system-architecture.md` 构建块视图拆分模块，接好门禁。模板只编排命令，不手写代码骨架。

## 2. 三 skill 时序链

| skill | 职责 | 时机 | 输入 → 输出 |
|---|---|---|---|
| init-code-repo | 文档结构 + 流程 + 门禁 | 建仓第 1 步 | 录入 → 仓骨架 |
| fill-design-doc | 填设计文档 TODO | 第 2 步 | Q&A → design 文档（含 architecture 构建块视图） |
| **scaffold-code** | 跑原生脚手架 + 按设计拆模块 + 接门禁 | 第 3 步 | architecture → 代码骨架 |

## 3. scaffold-code 流程

1. **读上下文**：AGENTS.md（栈、repoShape）+ `docs/02-design/system-architecture.md` 的"构建块视图"（已由 fill-design-doc 填好）+ `doc/component.yaml`（多仓）。
2. **定项目类型**：问用户每个 app 的类型（binary/library/web-app/cli/server），决定原生命令变体。
3. **跑原生脚手架**（按栈 + 项目类型，见 §4 命令表）。
4. **按设计拆模块**：按构建块视图把脚手架产物拆/移到设计指定位置（monorepo：`apps/api`、`apps/web`、`crates/core` 等）。architecture 未填则提示先跑 fill-design-doc。
5. **接门禁**：`lefthook install`（若装了 lefthook）；验证 `cargo build`/`npm install`/`go build`/`mvn compile` 能过。
6. **回刷 AGENTS.md 仓库布局段**：用实际脚手架产物刷新布局描述（军规 J：变更即审视回刷），保持文档与代码一致。

## 4. 原生脚手架命令表

| 栈 | 项目类型 | 原生命令 | 产物 |
|---|---|---|---|
| rust | binary | `cargo new <name>` | `src/main.rs` + `Cargo.toml` |
| rust | library | `cargo new --lib <name>` | `src/lib.rs` + `Cargo.toml` |
| rust | workspace | 各 `cargo new --bin/--lib apps/<name>` + 根 `Cargo.toml [workspace]` | 多 crate |
| node | web-app | `npm create vite@latest <name> -- --template react-ts` | `src/main.tsx` + `index.html` + `vite.config.ts` |
| node | cli/server | `npm init -y` + 建 `src/index.ts` | `package.json` + `src/index.ts` |
| python | app | `uv init <name>`（或 `rye init`） | `src/<name>/__init__.py` + `pyproject.toml` |
| go | any | `go mod init <module>` + `main.go` | `go.mod` + `main.go` |
| java | maven | `mvn archetype:generate -DgroupId=... -DartifactId=... -DarchetypeArtifactId=maven-archetype-quickstart` | `src/main/java/...` |

> 命令须可配/可覆写：用户可用自定义模板（如 `cargo new --template <tmpl>`、`npm create vite -- --template vue-ts`）。skill 问项目类型时附带"自定义命令"选项。

## 5. 项目类型维度

代码骨架相对文档多一个"项目类型"维度（文档模板不区分，代码必须区分）：

- **binary**：可执行（cargo --bin / go main / python entry）。
- **library**：库（cargo --lib / npm package / python package）。
- **web-app**：前端 SPA（vite/react/vue）。
- **cli**：命令行工具。
- **server**：后端服务（HTTP API）。
- **workspace**：多 crate/package monorepo（rust workspace / npm workspace）。

scaffold-code 对每个 app 问类型，按类型选命令变体。

## 6. 与门禁的衔接

- init-code-repo 已生成 `lefthook.yml`（门禁声明）。
- scaffold-code 跑完原生脚手架后，运行 `lefthook install`（若 lefthook 已装）把门禁挂到原生 git hooks。
- 验证构建：跑 `cargo build` / `npm install && npm run build` / `go build` / `mvn compile` / `uv sync`，确认骨架可构建（门禁的 lint/test 才有意义）。
- 若原生脚手架产物与 init-code-repo 的胶水文件冲突（如 `cargo new` 生成 `Cargo.toml` 与模板的 `Makefile` 并存），保留两者——Cargo.toml 是构建配置，Makefile 是门禁命令封装，互补。

## 7. AGENTS.md 仓库布局回刷

scaffold-code 跑完后，AGENTS.md 的"代码仓结构"段须用实际产物刷新（不再用 init-code-repo 的模板默认布局）。例如 monorepo rust+node 跑完后：

```
{{PROJECT_NAME}}/
├── apps/
│   ├── api/          # Rust axum 后端（cargo new --bin）
│   └── web/          # React+Vite 前端（npm create vite）
├── crates/core/      # 共享库（cargo new --lib）—— 按设计构建块视图
├── docs/
├── AGENTS.md
└── ...
```

回刷走军规 J（变更即审视回刷），保证文档与代码不漂移。

## 8. 实现形态

- **scaffold-code 是纯 agent skill**（无引擎/预言机）：SKILL.md 是流程指令，agent 读后跑命令、拆模块、回刷。无 golden 测试（依赖外部命令 cargo/npm/mvn，测试环境未必装）。
- 安装：与 init-code-repo / fill-design-doc 同级，装到 `~/.claude/skills/scaffold-code/`。
- init-code-repo 阶段 5 末尾的引导：除了引导 fill-design-doc，也提示"设计文档填完后，可用 scaffold-code 生成代码骨架"。

## 9. 影响面

### 新增

- `skills/scaffold-code/SKILL.md` — 流程 + 命令表 + 项目类型 + 拆分规则 + 回刷规则。
- `skills/scaffold-code/README.md`。

### 修改

- `skills/init-code-repo/SKILL.md` 阶段 5 — 末尾引导加一句"设计文档填完后可用 scaffold-code 生成代码骨架"。
- `README.md`（模板仓根）— 安装说明加 scaffold-code。

## 10. 开放问题（实现阶段决定）

1. 原生命令失败（如 cargo 未装）的降级——提示用户装工具，不静默跳过。
2. monorepo 多语言 workspace 的依赖协调（rust workspace + npm workspace 并存）——实现时按设计构建块视图处理。
3. 自定义模板命令的参数透传——实现时定 CLI 参数风格。
