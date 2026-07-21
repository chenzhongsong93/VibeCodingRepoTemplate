---
name: init-code-repo
description: Scaffold a new code repo with SSOT doc structure + R&D process + quality gates. Use when creating a new project/repository, starting a fresh codebase, or initializing repo structure. Assembles templates with variable substitution and conditional component inclusion, then guides fill-in. Runtime-neutral — works in Claude Code, codex, opencode, kimicode, zcode.
---

# init-code-repo — 通用代码仓模板

在新仓初始化 SSOT 文档结构 + 研发流程 + 质量门禁，并引导逐步建仓。运行时中立，零外部依赖（agent 自己装配，不需要 Node.js/Python/任何运行时）。

## 5 阶段向导流

按顺序执行：**问 → 等用户答 → 写文件 → 校验 → 下一阶段**。

### 阶段 0 · 前置检查

- 确认当前目录是空仓或仅含 `.git`/`README`/`LICENSE`。含冲突文件（已有 `AGENTS.md`/`CLAUDE.md` 等）→ 停下询问，不静默改。
- 未 `git init` → 提示用户初始化，不替用户 init（除非用户同意）。

### 阶段 1 · 录取

向用户收集（多选题优先）：

| 项 | 选项 | 用途 |
|---|---|---|
| 项目名 | 自由文本 | 填入 {{PROJECT_NAME}} |
| 一句话定位 | 自由文本 | 填入 {{ONE_LINE}} |
| 主栈 | 无 / rust / node / python / go / 多栈 | 决定叠加哪些 stacks/ |
| 仓形态 | 单 app / monorepo | 决定布局 |
| 仓角色 | 单仓 / 组件仓 / 中央 docs 仓 | 决定多仓模式：单仓=自包含；组件仓=带 component.yaml + 跨仓引用；中央 docs 仓=聚合脚本 + 跨仓视图 |
| 目标 runtime | claude-code / codex / opencode / kimicode / zcode / 多端 | 决定叠加哪些 runtime-adapters/ |
| 远端托管 | gitcode / github / gitlab / 无 | remote=none 时无 remote-hook；否则有 |
| Commit 门禁档 | 默认正则 / 自定义正则 / 不要求 | 决定 commit-msg 段 |
| 分支模型 | 默认(dev/main/fix/release/v) / 自定义 | agent-policy 激活时填入 {{DEV_BRANCH}}/{{MAIN_BRANCH}}/{{FIX_BRANCH}}/{{RELEASE_PREFIX}} |
| Policy 标记 | 默认 `{{PROJECT_NAME}}-Agent-Policy: 1.0` / 自定义 | agent-policy 激活时填入 {{POLICY_ID}} |
| PI 命名格式 | 默认 `YYYY-PI<N>` / 自定义 | pi-cadence 激活时填入 {{PI_FORMAT}} |
| 文档命名 | 英文 / 中文 / 自定义 | 决定文档文件名风格（工具契约文件 AGENTS.md/CLAUDE.md/README.md/lefthook.yml 等恒英文；docs/ 下文档与 ROADMAP/HANDOVER 等可中文/自定义）|
| 可选组件 | 多选（见下表） | 决定装配范围与版本派生 |

校验：必答项齐全；主栈与仓形态自洽。

选组件仓时追问中央 docs 仓 URL；选中央 docs 仓时追问初始组件仓列表（写入 registry.yaml）。

### 阶段 2 · 骨架写入

按"手动装配规则"（见下）从 `templates/core/` 写入所有必带文件，按已选组件条件装配。

### 阶段 3 · 栈与门禁叠加

- 按 `config.stacks` 从 `templates/stacks/<栈>/` 写入胶水文件。
- 从 `templates/gates/` 写入门禁文件（按 require 标记条件包含）。
- 按目标 runtime 从 `templates/runtime-adapters/<runtime>/` 写入适配片段。

### 阶段 4 · 留 TODO 骨架

本 skill 只定骨架+规范，**不起草设计内容**（设计填充交给 dev-conductor→superpowers）。阶段 4 仅做：

1. 变量替换已由装配完成（{{PROJECT_NAME}} 等）。
2. 各设计文档保留 `（TODO: ...）` 占位，标明"填什么"。
3. `AGENTS.md` 仓库布局段：填所选栈形态的目录树占位（实际产物由 dev-conductor 落地后回刷）。
4. `HANDOVER.md` 首条交接：本轮首做 + 当前阶段门标注（P0）。

校验：占位符 `{{...}}` 残留扫描（应无）；骨架文件齐全。

> 设计文档填充与代码落地不在此 skill 范围——由 dev-conductor 驱动 superpowers 完成。

### 阶段 5 · 验收

- SSOT 一致性：`AGENTS.md` 索引的文件全部存在；三类文档分类在 `doc-governance.md` 已写明；死链扫描（所有 markdown 链接指向实际存在文件）。
- 打印完成清单：已写文件树、未填占位列表、下一步建议。
- 不自动 commit/push（除非用户显式要求）。

**设计完整性门控**：读 HANDOVER.md 顶部"当前阶段门" → 按 [design-completeness-rules.md](docs/rules/design-completeness-rules.md) 的阶段门→必填文档映射 → 扫描必填文档的 `（TODO: ...）` 残留与空节 → 列未填项。有残留=阻断发布门控（除非用户显式跳过并记入 HANDOVER 待办）。

**末尾引导 dev-conductor**：骨架+规范就位后，引导用户调用 `dev-conductor` skill——它按完整性门控逐项驱动 superpowers（brainstorming 填设计文档、writing-plans/executing-plans/TDD 落地代码）。本 skill 只定骨架+规范，设计→落地交 dev-conductor→superpowers。


---

## 手动装配规则（agent 离线装配，输出须与 assemble.mjs 一致）

agent 读 `templates/` 下的 `.tmpl` 文件，按以下规则处理后写入目标仓（`.tmpl` 后缀去掉）。

### 1. 变量替换

替换 `{{VAR}}` 为 ctx 值：

| 占位符 | ctx 字段 | 来源 |
|--------|---------|------|
| `{{PROJECT_NAME}}` | projectName | 阶段 1 项目名 |
| `{{ONE_LINE}}` | oneLine | 阶段 1 一句话定位 |
| `{{YEAR}}` | year | 当前年份（4 位） |
| `{{COMMIT_REGEX}}` | commitRegex | commit 档为 custom 时的用户正则；否则不出现 |
| `{{DEV_BRANCH}}` | devBranch | 阶段1录取（分支模型，默认 dev） |
| `{{MAIN_BRANCH}}` | mainBranch | 阶段1录取（默认 main） |
| `{{FIX_BRANCH}}` | fixBranch | 阶段1录取（默认 fix） |
| `{{RELEASE_PREFIX}}` | releasePrefix | 阶段1录取（默认 release/v） |
| `{{POLICY_ID}}` | policyId | 阶段1录取（默认 {{PROJECT_NAME}}-Agent-Policy: 1.0） |
| `{{PI_FORMAT}}` | piFormat | 阶段1录取（默认 YYYY-PI<N>） |
| `{{PI_FIRST}}` | piFirst | 派生（PI_FORMAT 的 YYYY→YEAR、<N>→1） |
| `{{VERIFY_FAST_CMD}}` | verifyFastCmd | 派生（node 单栈→npm run verify:fast，否则 make verify-fast） |

未知占位符保持不变。

### 1.5 文件名映射（命名风格）

按 `naming`（en/zh/custom）映射文档文件名。工具契约文件（AGENTS.md/CLAUDE.md/README.md/lefthook.yml/package.json/Makefile 等）恒不映射。

- 模板内 markdown 链接 `{{FILE:path}}`：按映射替换为目标文件名，并相对当前文件目录相对化（用于链接）。
- 模板内绝对路径 `{{FPATH:path}}`：按映射替换，不相对化（用于脚本 MAPPING 与 inline code 路径）。
- 输出文件名：模板文件名按映射重命名（如 `dev-workflow-rules.md` → `研发流程规则.md`）。

zh 映射表见 `naming.mjs`。custom = 用户提供 namingCustom（英文路径 → 自定义文件名）覆盖 zh/en 基线。

### 2. 条件块剥离（`<!--IF:cond-->`）

模板内的条件块按 cond 是否在"激活集"中保留或剥离：

- `<!--IF:cond-->...<!--/IF:cond-->`：cond 激活 → 保留内容；否则整段移除。
- `<!--IF:cond-->A<!--ELSE-->B<!--/IF:cond-->`：cond 激活 → 保留 A；否则保留 B。
- 嵌套：外层保留后，内层标记继续按规则处理（循环至稳定）。
- 标记尾换行：剥离标记时连同其尾随换行一并消费，避免留空行；保留内容中的段落空行不动。

### 3. 文件级条件包含（`<!--require:cond-->`）

文件首行若是 `<!--require:cond-->`，则仅当 cond 激活时才写该文件；写入前剥去该首行。无此标记的文件（核心必带）总是写入。

### 4. 激活集推导

激活集 = 选中组件 + 派生态 + commit 档 + 选中栈。

**组件直传**（在 components 列表中即激活）：`product-docs`、`docker`、`three-tier-test`、`clean-code`、`agent-conduct`、`full-ledger`、`doc-sync`、`remote-hook`、`api-docs`、`docs-site`、`design-views`、`multi-repo-component`、`central-docs`。

> 注：`multi-repo-component`/`central-docs` 由 repoRole 派生（非 components 列表），但作为 cond 名会经 activeConds 透传，故一并列出。

**派生态**：
- `full-workflow` = components 含 `docker` 或 `three-tier-test`。
- `remote-hook` = components 含 `remote-hook` 或 `remote !== 'none'`。
- `agent-policy` = components 含 `dev-flow-skills`（流程层依赖执行层）。

**commit 档**（按 commitGate.mode）：
- `default` → `commit-default`
- `custom` → `commit-custom`
- `none` → `commit-none`

**栈**（按 stacks 列表）：`rust` / `node` / `python` / `go`。

### 5. 写入路径

- `templates/core/**` → 目标仓根（保留相对路径）。
- `templates/stacks/<栈>/**` → 目标仓根（每个选中栈）。
- `templates/gates/**` → 目标仓根（按 require 标记条件包含）。
- `templates/runtime-adapters/<runtime>/**` → 目标仓根（每个选中 runtime）。
- `.tmpl` 后缀去掉。

### 6. 版本派生

- `dev-workflow-rules.md`：选了 docker 或 three-tier-test → 8 步全版（L2/L3 激活）；否则精简（L2/L3 跳过，步骤 5-6 = 记录/发布门控）。模板内已用 `<!--IF:full-workflow-->` 处理。
- `test-spec/`：选了 three-tier-test → 完整三层格式；否则骨架。
- `testing-rules.md`：选了 three-tier-test 才存在（require 标记）。
- `AGENTS.md`：按已选组件条件装配（六层模型段在 product-docs 激活时出现；api 索引行在 api-docs 激活时出现）。

---

## 组件清单

### 核心必带（不问）

AGENTS.md、CLAUDE.md、README.md、.gitignore、lefthook.yml、ROADMAP.md、HANDOVER.md、docs/rules/{commit-rules,dev-workflow-rules,doc-ssot-rules}.md、docs/02-design/{test-spec/README,doc-governance}.md、docs/ledger/{bugs,archive/}、docs/superpowers/specs/、gitleaks（lefthook 内）。

### 可选组件（多选）

| 组件 | cond | 新增 | 副作用 |
|------|------|------|--------|
| 产品级设计文档组 | product-docs | 00-charter/、01-product/、02-design/system-architecture.md | AGENTS 加六层模型段 |
| Docker 构建基础设施 | docker | infra/docker/（Dockerfile + docker-compose.yml + .env.example） | dev-workflow L2 激活 |
| 三层测试规则 | three-tier-test | rules/testing-rules.md | test-spec 升级完整 + dev-workflow L3 激活 |
| Clean Code 严格门禁 | clean-code | rules/clean-code-rules.md | 栈 lint 强制 -D warnings |
| Agent 行为军规 | agent-conduct | rules/agent-conduct-rules.md | AGENTS 索引加军规行 |
| 完整台账 | full-ledger | ledger/{debt,version-log}.md | doc-ssot-rules 台账表加行 |
| 代码-文档同步检查 | doc-sync | （lefthook pre-push 片段，已内联） | lefthook pre-push 加 doc-sync |
| 远端 pre-receive hook | remote-hook | gates/pre-receive-remote/ | commit-rules 标注远端强控 |
| API 文档 | api-docs | 02-design/api/api-reference.md | AGENTS 索引加 api 行 |
| 文档站点（HTML 生成站） | docs-site | docs/.vitepress/config.ts | 维护者侧 npx vitepress build 生成 HTML 站，markdown 为源 |
| 设计视觉资产（手写 HTML） | design-views | docs/02-design/views/ | HTML 非 SSOT，冲突以 markdown 为准 |
| Agent 策略与执行门禁 | agent-policy | dev-workflow-rules 治理段 + agent-governance 4 文档 + check-agent-policy.mjs + settings.json 重写 + 各 stack verify 目标 + AGENTS Policy 段 + lefthook verify-fast | 自动被 dev-flow-skills 激活 |
| 研发流程 skill 三层 | dev-flow-skills | docs/skills/{dev-flow,test-spec,design-review}.md + .claude/skills/ 薄入口 + check-test-spec-consistency.mjs | 自动激活 agent-policy |
| 研发迭代(PI)体系 | pi-cadence | ROADMAP/AGENTS/HANDOVER 的 PI 段 | 独立 |

### Commit 门禁三档

- 默认正则：`^(feat|fix|docs|style|refactor|perf|test|chore)\(.*\): .+\s#\d+$`
- 自定义正则：用户提供。
- 不要求：仅建议，非强制。

---

## 阶段 5 死链校验（agent 执行）

扫描所有生成的 `.md` 文件中的 markdown 链接 `[text](relative-path)`，验证目标文件存在。忽略外部链接（http/https/mailto）和锚点链接（#...）。死链 = 阻断，修模板（加 require 守卫或移除链接）至无死链。

---

## 回应语言

所有回应、设计文档、规划文档一律使用中文。
