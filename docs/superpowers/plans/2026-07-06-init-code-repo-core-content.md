# init-code-repo Core Content Implementation Plan (Plan 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Author the optional-component templates (rule files, ledger files, charter/product/design skeletons, AWB-grade API reference) referenced by Plan 1's conditional blocks, add a dead-link checker, and lock standard + full-product golden scenarios.

**Architecture:** Plan 1's engine + conditional blocks already reference these files via `<!--IF:cond-->` markers (e.g. AGENTS.md.tmpl links `agent-conduct-rules.md` behind `<!--IF:agent-conduct-->`). Plan 2 creates the missing template files so selected components produce no dead links, adds a markdown-link integrity check to the test harness, and adds two scenarios (standard / full-product) that exercise multi-component assembly end-to-end.

**Tech Stack:** Node.js 22 (`node:test`, zero deps), ESM.

**Prerequisite:** Plan 1 merged to main (engine + lightweight templates + 16 tests green).

**IMPORTANT cond-name correction (from self-review):** Plan 1's `activeConds` derives only `full-workflow` and `remote-hook`; component names pass through directly. So the cond for the product-level block must be `<!--IF:product-docs-->` (component name), NOT `<!--IF:product-level-->` (which is never active). Same for api-docs: use `<!--IF:api-docs-->`.

---

## File Structure (this plan)

New template files under `skills/init-code-repo/templates/core/`:
```
docs/00-charter/
├── README.md.tmpl
├── concept.md.tmpl
├── vision-strategy.md.tmpl
└── guardrails.md.tmpl
docs/01-product/
└── README.md.tmpl
docs/02-design/
├── system-architecture.md.tmpl       # arc42+4+1+DDD 骨架
├── doc-governance.md.tmpl            # 从 doc-ssot-rules 拆出
└── api/
    └── api-reference.md.tmpl         # AWB 级骨架
docs/ledger/
├── debt.md.tmpl
└── version-log.md.tmpl
docs/rules/
├── agent-conduct-rules.md.tmpl       # 军规 A–J
├── clean-code-rules.md.tmpl
└── testing-rules.md.tmpl
```

New test infra:
```
tests/lib/links.mjs                       # markdown 死链检查
tests/scenarios/standard/config.json
tests/scenarios/full-product/config.json
tests/golden/standard/expected-tree.json
tests/golden/full-product/expected-tree.json
```

Modified:
- `skills/init-code-repo/templates/core/AGENTS.md.tmpl` — 加 `<!--IF:product-docs-->` 六层模型段 + `<!--IF:api-docs-->` 索引行。
- `skills/init-code-repo/templates/core/docs/rules/doc-ssot-rules.md.tmpl` — 移除已拆至 doc-governance.md 的内容。
- `tests/run_tests.mjs` — 加 standard / full-product / 死链测试。

---

## Task 1: Author missing rule files

**Files:**
- Create: `skills/init-code-repo/templates/core/docs/rules/agent-conduct-rules.md.tmpl`
- Create: `skills/init-code-repo/templates/core/docs/rules/clean-code-rules.md.tmpl`
- Create: `skills/init-code-repo/templates/core/docs/rules/testing-rules.md.tmpl`
- Create: `skills/init-code-repo/templates/core/docs/ledger/debt.md.tmpl`
- Create: `skills/init-code-repo/templates/core/docs/ledger/version-log.md.tmpl`

- [ ] **Step 1: Create `agent-conduct-rules.md.tmpl`**

```markdown
# Agent 行为军规（A–J）

> 任何 Agent 在本仓工作前必读必守。违反军规的产出不予接受。源自 CyberWork 实践。

## A. 先文档后代码
改代码前先看设计文档；无设计文档的改动，先补设计再改码。

## A0. 建模方法论
设计文档采用 arc12 骨架 + 4+1 视图 + DDD 通用语言。用例视图与运行视图受事件风暴驱动。

## B. 过程文档不冒充基线
`superpowers/specs/` 是过程稿，非 SSOT。与正式文档冲突以正式文档为准。不得用过程稿替代基线。

## C. ADR 只追加
架构决策记录（ADR）只追加不删改。新决策推翻旧决策时，新加 ADR 标注"废止 #N"，不回改旧 ADR。

## D. 代码质量关卡不可绕过
lint/test 门禁必须通过。`--no-verify` 跳过 hook 视为违规（除非用户显式批准）。

## E. 安全相关人审
涉及认证、密钥、权限、数据流转的改动，须人工复审，不得仅靠 agent 自验。

## F. 一致性
代码、设计文档、接口文档、实体模型保持一致。不一致时以代码为准并回刷文档。

## G. 可视化
架构图用 Mermaid/PlantUML。复杂流程必配图，图与文字描述一致。

## H. 技术债务（临时规避必登记）
任何临时规避/走捷径，必须在 [ledger/debt.md](../ledger/debt.md) 登记，含原因 + 偿还条件。未登记的债务视为违规。

## I. 接口/DB/实体回刷
接口、DB schema、实体模型变更，必须同步回刷 `02-design/api/`、`02-design/entity-model.md`（若存在）。

## J. 变更即审视回刷（总一致性）
凡需求、代码或文档更新，必须审视是否需回刷：引用路径、设计说明书章节、ADR、功能设计、UI 设计、路线图、术语表。变更提交前完成回刷，不留"回头补"；无法当场回刷的，在变更说明标注"待回刷"。
```

- [ ] **Step 2: Create `clean-code-rules.md.tmpl`**

```markdown
# Clean Code 规则

> 代码质量门控标准。配合栈 lint（clippy/eslint/ruff/golangci-lint）执行，`-D warnings` 强制。

## L1 通用审查

- **单一职责**：一个函数/模块只做一件事。
- **命名达意**：名字说"做什么"而非"怎么做"。
- **无魔法数**：常量具名。
- **函数短小**：建议 ≤ 40 行；超 80 行必有充分理由。
- **复杂度**：圈复杂度建议 ≤ 10。
- **依赖倒置**：依赖抽象不依赖实现。
- **无硬编码**：URL/key/路径不硬编码，走配置。
- **错误处理**：不吞异常，不空 catch，不静默失败。

## L2/L3 栈专项

- Rust：clippy `-D warnings` + `cargo fmt --check`。
- Node：eslint + prettier。
- Python：ruff + mypy。
- Go：gofmt + go vet。

## 基线豁免
旧代码基线豁免须在 `ledger/debt.md` 登记，新代码不豁免。
```

- [ ] **Step 3: Create `testing-rules.md.tmpl`**

```markdown
# 测试规则（三层）

> 与 [dev-workflow-rules.md](dev-workflow-rules.md) 互补：本文件定各层标准，那一份定流程顺序。

## 三层定义

| 层 | 范围 | 工具（按栈） |
|----|------|-------------|
| L1 单元 | 单函数/模块 | cargo test / vitest / pytest / go test |
| L2 集成 | 跨模块契约 | cargo test --tests / vitest integration / pytest -m integration |
| L3 e2e | 端到端用户流 | playwright / Cypress |

## 测试 SSOT

用例设计在 [02-design/test-spec/](../02-design/test-spec/)，按"因子分析→场景矩阵→分支覆盖表→用例清单"组织。每条用例标注覆盖的 SSOT 节：`// 覆盖:§<节> <用例 ID>`。

## 一致性铁律
- SSOT 每格至少一条用例；每用例必有 SSOT 格。
- SSOT 与用例不一致 = 构建阻断。
- 闭环 bug 必有对应回归用例（见 [ledger/bugs.md](../ledger/bugs.md)）。

## 覆盖要求
- 核心逻辑 L1 覆盖。
- 契约端点 L2 覆盖。
- 关键用户流 L3 覆盖。
- 不追求 100%，追求"关键路径必有回归"。
```

- [ ] **Step 4: Create `ledger/debt.md.tmpl`**

```markdown
# 技术债务台账

> 累积型台账：只增不删（已偿还债务归档至 `archive/`）。任何临时规避/走捷径必须在此登记（军规 H）。

## 债务模板

```
## Debt #<序号>: <标题>
- 引入时间：YYYY-MM-DD
- 类型：设计债/实现债/测试债/文档债
- 描述：
- 引入原因（为何走捷径）：
- 偿还条件（何时可还）：
- 影响：
- 状态：未偿还/已偿还
```

（暂无债务）
```

- [ ] **Step 5: Create `ledger/version-log.md.tmpl`**

```markdown
# 版本记录

> 累积型台账：每次发布追加一条。归档按年入 `archive/`。

## v0.1.0 — {{YEAR}}-XX-XX

- 初始建仓（由 init-code-repo skill 生成）。

## 发布模板

```
## v<版本> — YYYY-MM-DD
- <变更摘要>
- <破坏性变更>
- <迁移说明>
```
```

- [ ] **Step 6: Commit**

```bash
git add skills/init-code-repo/templates/core/docs/rules/agent-conduct-rules.md.tmpl skills/init-code-repo/templates/core/docs/rules/clean-code-rules.md.tmpl skills/init-code-repo/templates/core/docs/rules/testing-rules.md.tmpl skills/init-code-repo/templates/core/docs/ledger/debt.md.tmpl skills/init-code-repo/templates/core/docs/ledger/version-log.md.tmpl
git commit -m "feat(init-code-repo): 可选组件规则文件与台账文件"
```

---

## Task 2: Author charter / product / system-architecture skeletons

End-user fill-in templates — section skeletons with `（TODO: ...）` for the user. Legitimate placeholder templates.

**Files:**
- Create: `skills/init-code-repo/templates/core/docs/00-charter/README.md.tmpl`
- Create: `skills/init-code-repo/templates/core/docs/00-charter/concept.md.tmpl`
- Create: `skills/init-code-repo/templates/core/docs/00-charter/vision-strategy.md.tmpl`
- Create: `skills/init-code-repo/templates/core/docs/00-charter/guardrails.md.tmpl`
- Create: `skills/init-code-repo/templates/core/docs/01-product/README.md.tmpl`
- Create: `skills/init-code-repo/templates/core/docs/02-design/system-architecture.md.tmpl`

- [ ] **Step 1: Create `00-charter/README.md.tmpl`**

```markdown
# 00-charter — 顶层定义

本目录持有项目顶层定义：愿景、战略、产品定位、护栏。编号即阅读顺序。

- [concept.md](concept.md) — 概念对齐
- [vision-strategy.md](vision-strategy.md) — 愿景与战略
- [guardrails.md](guardrails.md) — 护栏/红线
```

- [ ] **Step 2: Create `00-charter/concept.md.tmpl`**

```markdown
# 概念对齐

## 一句话定义
{{ONE_LINE}}

## 它是什么
（TODO: 用一段话讲清这个项目到底是什么。）

## 它不是什么
（TODO: 明确边界，列出容易混淆但不在范围内的东西。）

## 核心概念
（TODO: 列出领域核心概念与定义，建立通用语言。）
```

- [ ] **Step 3: Create `00-charter/vision-strategy.md.tmpl`**

```markdown
# 愿景与战略

## 愿景
（TODO: 长期想成为什么。）

## 战略
（TODO: 凭什么赢——护城河/定位/验证手段。）

## 三管赚钱（若适用）
（TODO: 自营标杆 / 平台授权 / API，各管如何赚钱。）

## 阶段门
见 [../ROADMAP.md](../ROADMAP.md)。
```

- [ ] **Step 4: Create `00-charter/guardrails.md.tmpl`**

```markdown
# 护栏/红线

## 红线（不可越）
（TODO: 列出绝对不做的事。）

## 决策准则
（TODO: 取舍时的优先级，如"技术服务产品、产品服务战略、战略服务商业"。）

## 防跑偏检查
（TODO: 每轮自检项——任务能否溯源到 ROADMAP 的某个阶段门？服务哪一管？溯源不到=停下确认。）

## 六层真理源模型
商业层（最高）→ 战略层 → 产品层 → 目标层（北极星）→ 现实层 → 桥梁层。
下层服务上层，上层约束下层。铁律：技术服务产品、产品服务战略、战略服务商业。
判断基准：信实测代码，不信任何文档的自我声明。
```

- [ ] **Step 5: Create `01-product/README.md.tmpl`**

```markdown
# 01-product — 产品定义

## 做成什么产品
（TODO: 产品形态——Web/App/SaaS/API/CLI 等。）

## 交付给谁
（TODO: 目标用户/客户。）

## 核心用户场景
（TODO: 3-5 个关键场景。）

## 不做的事
（TODO: 明确不在产品范围内的功能。）
```

- [ ] **Step 6: Create `02-design/system-architecture.md.tmpl`**

```markdown
# 系统架构设计说明书

> 采用 arc42 骨架 + 4+1 视图模型 + DDD + DFX。用例视图驱动其余视图。

## 1. 引言与目标
（TODO: 系统目标、范围、相关方。）

## 2. 架构约束
（TODO: 技术/业务/标准约束。）

## 3. 上下文与范围
（TODO: 系统边界，外部依赖。Mermaid context 图。）

## 4. 解决方案策略
（TODO: 顶层架构决策、技术选型。）

## 5. 构建块视图（逻辑视图）
（TODO: 模块/分层/组件。Mermaid 组件图。）

## 6. 运行视图
（TODO: 运行时进程/部署单元/交互。Mermaid 序列图。）

## 7. 部署视图
（TODO: 部署拓扑。Mermaid 部署图。）

## 8. 跨切概念（横切）
（TODO: 代码规范、错误处理、日志、安全、国际化。）

## 9. 架构决策（ADR 索引）
（TODO: ADR 列表。ADR 只追加——军规 C。）

## 10. 质量属性（DFX）
（TODO: 性能/可用/安全/可维护/可观测 等质量场景。）

## 11. 领域模型（DDD）
（TODO: 通用语言、限界上下文、聚合。）

## 12. UI 设计
（TODO: UI 规范与关键页面。）
```

- [ ] **Step 7: Commit**

```bash
git add skills/init-code-repo/templates/core/docs/00-charter/ skills/init-code-repo/templates/core/docs/01-product/ skills/init-code-repo/templates/core/docs/02-design/system-architecture.md.tmpl
git commit -m "feat(init-code-repo): charter/product/system-architecture 骨架模板"
```

---

## Task 3: Author AWB-grade API reference skeleton

**Files:**
- Create: `skills/init-code-repo/templates/core/docs/02-design/api/api-reference.md.tmpl`

- [ ] **Step 1: Create `api-reference.md.tmpl`**

```markdown
# {{PROJECT_NAME}} API 接口文档

> 版本: v0.1.0 | 更新日期: {{YEAR}}-XX-XX
> 基础路径: `/api/v1`（TODO: 确认实际前缀）

---

## 接口更新点（Changelog）

> 本节记录接口层变更。

### v0.1.0
- 初始接口定义。

---

## 通用约定

### 响应包装 `ApiResponse<T>`

```json
{ "success": true, "data": { }, "message": null }
```

错误响应：
```json
{ "success": false, "data": null, "message": "错误信息" }
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | true 成功，false 失败 |
| `data` | T | 业务数据；失败时为 null |
| `message` | String | 错误描述（成功时为 null） |

### 分页 `PageResponse<T>`

```json
{ "content": [], "page": 0, "size": 20, "totalElements": 0, "totalPages": 0, "empty": true, "first": true, "last": true }
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `content` | List | 当前页数据 |
| `page` | int | 页码（从 0 起） |
| `size` | int | 每页条数 |
| `totalElements` | long | 总记录数 |
| `totalPages` | int | 总页数 |
| `empty` | boolean | 是否空页 |
| `first` | boolean | 是否首页 |
| `last` | boolean | 是否末页 |

### 认证
- GET 请求：TODO（是否免认证）
- 写操作（POST/PUT/DELETE）：TODO（`X-Internal-API-Key` 或 `Authorization: Bearer`）

### 通用 filter 参数
格式：`filter=<URL-encoded JSON>`。操作符：`eq`/`ne`/`like`/`in`/`nin`/`gt`/`gte`/`lt`/`lte`。多字段 AND 组合。

### 错误码
| 码 | 含义 |
|----|------|
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务端错误 |

---

## 接口列表

### §一 TODO 域

#### `GET /api/v1/todo` — TODO 列表

**说明**：TODO。

**请求参数**：

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| `page` | query | int | 否 | 页码 |

**响应**：`PageResponse<Todo>`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | long | ID |
| `name` | String | 名称 |

**请求示例**：
```bash
curl /api/v1/todo?page=0
```

**响应示例**：
```json
{ "success": true, "data": { "content": [], "page": 0, "size": 20, "totalElements": 0, "totalPages": 0, "empty": true, "first": true, "last": true }, "message": null }
```

**错误场景**：401 未认证。
```

- [ ] **Step 2: Commit**

```bash
git add skills/init-code-repo/templates/core/docs/02-design/api/api-reference.md.tmpl
git commit -m "feat(init-code-repo): AWB 级 API 文档骨架模板"
```

---

## Task 4: Reconcile doc-governance.md vs doc-ssot-rules.md

Split: `doc-governance.md` holds document-change governance + modeling methodology + 三类文档; `doc-ssot-rules.md` holds SSOT rules + 台账刷新 + 归档. Cross-link.

**Files:**
- Create: `skills/init-code-repo/templates/core/docs/02-design/doc-governance.md.tmpl`
- Modify: `skills/init-code-repo/templates/core/docs/rules/doc-ssot-rules.md.tmpl`

- [ ] **Step 1: Create `02-design/doc-governance.md.tmpl`**

```markdown
# 文档治理

## 三类文档

| 类别 | 性质 | 生命周期 | 例子 |
|------|------|----------|------|
| 正式 SSOT | 治理型真相源，变更走治理 | 被回刷维护 | `00-charter/`、`02-design/`、`rules/` |
| 累积型台账 | 只增不删，归档=移至 `archive/` | 只增 | `HANDOVER.md`、`ledger/bugs|debt|version-log` |
| 过程文档 | 非 SSOT，追溯用 | 可作废 | `superpowers/specs/` |

冲突时以正式 SSOT 为准。详见 [rules/doc-ssot-rules.md](../rules/doc-ssot-rules.md)。

## 文档变更治理
- 改 SSOT 前先看现状（读代码 + 现有文档）。
- 改后审视回刷（军规 J）：引用路径、相关章节、ADR、术语表。
- 过程稿落 `superpowers/specs/`，不得冒充基线（军规 B）。

## 建模方法论
- 设计文档：arc42 骨架 + 4+1 视图 + DDD 通用语言。
- 用例视图驱动其余视图；事件风暴驱动用例与运行视图。
- DFX（质量属性）为设计说明书一章，不独立成文。
- 可视化用 Mermaid/PlantUML（军规 G）。

## 设计图优先级
Mermaid > PlantUML > 手绘图（手绘须数字化留存）。
```

- [ ] **Step 2: Modify `doc-ssot-rules.md.tmpl`** — remove the "文档三类" section (now in doc-governance.md) and add cross-link. Replace the file with:

```markdown
# SSOT 与文档治理规则

> 文档三类与变更治理见 [../02-design/doc-governance.md](../02-design/doc-governance.md)。本文件定 SSOT 规则与台账治理。

## SSOT 铁律
- 冲突时以正式 SSOT 为准；过程稿永不冒充基线（军规 B）。
- 累积 ≠ 过程文档：台账累积且是 SSOT；过程稿累积但非 SSOT。
- 信实测代码，不信文档自我声明。

## 台账刷新责任

| 台账 | 时机 | 谁刷新 |
|------|------|--------|
| HANDOVER.md | 每轮第 7 步 | agent |
| bugs.md | 发现+闭环时 | agent |
<!--IF:full-ledger-->
| debt.md | 引入规避+偿还时 | agent |
| version-log.md | 每次发布 | devops |
<!--/IF:full-ledger-->

## 归档转存
主文件超阈值（如 50 条闭环）或发布时，闭环/已偿还/已过阶段条目移至 `ledger/archive/<名>-<版本>.md`。主文件保留近 N 条 + 全部未闭环。归档需用户确认，不自动执行。

## CLAUDE.md 不可变
`CLAUDE.md` 是委托指针，禁止改写（见 AGENTS.md 铁律）。
```

- [ ] **Step 3: Commit**

```bash
git add skills/init-code-repo/templates/core/docs/02-design/doc-governance.md.tmpl skills/init-code-repo/templates/core/docs/rules/doc-ssot-rules.md.tmpl
git commit -m "refactor(init-code-repo): 拆分 doc-governance 与 doc-ssot-rules"
```

---

## Task 5: Update AGENTS.md.tmpl with product-docs + api-docs conditional blocks

Use `<!--IF:product-docs-->` (NOT `product-level`) and `<!--IF:api-docs-->` — component names that pass through `activeConds` directly.

**Files:**
- Modify: `skills/init-code-repo/templates/core/AGENTS.md.tmpl`

- [ ] **Step 1: Add api-docs row to the rule-index table**

In `AGENTS.md.tmpl`, after the existing `<!--IF:three-tier-test-->...<!--/IF:three-tier-test-->` row block, add:

```
<!--IF:api-docs-->
| API 文档 | [docs/02-design/api/api-reference.md](docs/02-design/api/api-reference.md) |
<!--/IF:api-docs-->
```

- [ ] **Step 2: Add product-docs six-layer section**

After the "## 文档三类" section (and before "## 回应语言"), add:

```
<!--IF:product-docs-->
## 六层真理源模型

| 层级 | 文件 | 角色 |
|------|------|------|
| 商业层（最高） | `00-charter/guardrails.md` | 为什么做·怎么活 |
| 战略层 | `00-charter/vision-strategy.md` | 凭什么赢·护城河 |
| 产品层 | `01-product/` | 做成什么·交付给谁 |
| 目标层 | `02-design/system-architecture.md` | 技术能力终点 |
| 现实层 | 实测代码 | 当前所在，以实测为准 |
| 桥梁层 | `HANDOVER.md` + `02-design/` | 如何从现实走向目标 |

铁律：技术服务产品、产品服务战略、战略服务商业。任务前自检：服务哪一管？在 ROADMAP 哪个阶段门？溯源不到=停下确认。
<!--/IF:product-docs-->
```

- [ ] **Step 3: Verify with a manual assemble (product-docs + api-docs active)**

```bash
node --input-type=module -e "
import { assemble } from './skills/init-code-repo/assemble.mjs';
import { readFileSync, rmSync } from 'node:fs';
const cfg = { projectName:'P', oneLine:'L', year:'2026', stacks:[], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:['product-docs','api-docs'] };
rmSync('/tmp/p2',{recursive:true,force:true});
assemble('/tmp/p2', cfg);
const a = readFileSync('/tmp/p2/AGENTS.md','utf8');
console.log('has 六层模型:', a.includes('六层真理源模型'));
console.log('has api row:', a.includes('api-reference.md'));
console.log('leftover markers:', /<!--IF:|<!--\/IF:|<!--ELSE-->/.test(a));
"
```
Expected: `has 六层模型: true`, `has api row: true`, `leftover markers: false`.

- [ ] **Step 4: Run full suite (ensure no regression — lightweight still clean)**

Run: `npm test`
Expected: 16/16.

- [ ] **Step 5: Commit**

```bash
git add skills/init-code-repo/templates/core/AGENTS.md.tmpl
git commit -m "feat(init-code-repo): AGENTS 加 product-docs 六层模型段与 api-docs 索引行"
```

---

## Task 6: Dead-link checker

**Files:**
- Create: `tests/lib/links.mjs`

- [ ] **Step 1: Create `tests/lib/links.mjs`**

```javascript
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const LINK_RE = /\[[^\]]*\]\(([^)]+)\)/g;

// Collect dead markdown links in a generated dir.
// Returns array of { file, link, target } for links whose target does not exist.
// Ignores external links (http/https/mailto) and anchor-only links (#...).
export function deadLinks(rootDir) {
  const dead = [];
  const files = listMdFiles(rootDir);
  for (const file of files) {
    const rel = file.slice(rootDir.length + 1).replace(/\\/g, '/');
    const text = readFileSync(file, 'utf8');
    let m;
    while ((m = LINK_RE.exec(text)) !== null) {
      const target = m[1];
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      const cleanTarget = target.split('#')[0].split('?')[0];
      if (!cleanTarget) continue;
      const abs = resolve(dirname(file), cleanTarget);
      if (!existsSync(abs)) {
        dead.push({ file: rel, link: target, target: cleanTarget });
      }
    }
  }
  return dead;
}

function listMdFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) listMdFiles(full, out);
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}
```

- [ ] **Step 2: Sanity check**

```bash
node -e "import('./tests/lib/links.mjs').then(m=>console.log(typeof m.deadLinks))"
```
Expected: `function`.

- [ ] **Step 3: Commit**

```bash
git add tests/lib/links.mjs
git commit -m "test(init-code-repo): markdown 死链检查助手"
```

---

## Task 7: Standard + full-product scenarios with dead-link check

**Files:**
- Create: `tests/scenarios/standard/config.json`
- Create: `tests/scenarios/full-product/config.json`
- Create: `tests/golden/standard/expected-tree.json`
- Create: `tests/golden/full-product/expected-tree.json`
- Modify: `tests/run_tests.mjs`

- [ ] **Step 1: Create `standard/config.json`** (some components, no docker)

```json
{
  "projectName": "StandardApp",
  "oneLine": "标准服务",
  "year": "2026",
  "stacks": ["node"],
  "repoShape": "single",
  "runtimes": [],
  "remote": "github",
  "commitGate": { "mode": "default" },
  "components": ["agent-conduct", "clean-code", "full-ledger", "doc-sync", "api-docs"]
}
```

- [ ] **Step 2: Create `full-product/config.json`** (all components + rust+node)

```json
{
  "projectName": "FullProduct",
  "oneLine": "产品级项目",
  "year": "2026",
  "stacks": ["rust", "node"],
  "repoShape": "monorepo",
  "runtimes": ["claude-code"],
  "remote": "gitcode",
  "commitGate": { "mode": "default" },
  "components": ["product-docs", "docker", "three-tier-test", "clean-code", "agent-conduct", "full-ledger", "doc-sync", "remote-hook", "api-docs"]
}
```

- [ ] **Step 3: Generate expected-tree.json for each**

```bash
mkdir -p tests/golden/standard tests/golden/full-product
for s in standard full-product; do
  rm -rf /tmp/gen-$s
  node --input-type=module -e "
import { assemble } from './skills/init-code-repo/assemble.mjs';
import { readFileSync } from 'node:fs';
const cfg = JSON.parse(readFileSync('tests/scenarios/$s/config.json','utf8'));
assemble('/tmp/gen-$s', cfg);
"
  node --input-type=module -e "
import { fileTree } from './tests/lib/tree.mjs';
import { writeFileSync } from 'node:fs';
const t = fileTree('/tmp/gen-$s');
writeFileSync('tests/golden/$s/expected-tree.json', JSON.stringify(t, null, 2) + '\n');
"
done
```

Manually inspect both expected-tree.json — confirm full-product includes charter/, product/, system-architecture.md, api/api-reference.md, doc-governance.md, agent-conduct-rules.md, clean-code-rules.md, testing-rules.md, debt.md, version-log.md; standard includes the appropriate subset. If a file is missing, the engine/template is wrong — fix before continuing.

- [ ] **Step 4: Add scenario tests to `tests/run_tests.mjs`**

At the top, add to imports:
```javascript
import { deadLinks } from './lib/links.mjs';
```

Append:

```javascript
const SCENARIOS = ['standard', 'full-product'];

for (const name of SCENARIOS) {
  test(`${name}: file tree matches golden`, () => {
    const tmp = `/tmp/init-code-repo-test-${name}`;
    rmSync(tmp, { recursive: true, force: true });
    assemble(tmp, JSON.parse(readFileSync(`tests/scenarios/${name}/config.json`, 'utf8')));
    const actual = fileTree(tmp);
    const expected = JSON.parse(readFileSync(`tests/golden/${name}/expected-tree.json`, 'utf8'));
    assertTreeEqual(actual, expected, `${name} tree`);
  });

  test(`${name}: no dead markdown links`, () => {
    const tmp = `/tmp/init-code-repo-test-${name}-links`;
    rmSync(tmp, { recursive: true, force: true });
    assemble(tmp, JSON.parse(readFileSync(`tests/scenarios/${name}/config.json`, 'utf8')));
    const dead = deadLinks(tmp);
    assert.equal(dead.length, 0, `${name} dead links:\n${dead.map(d => '  ' + d.file + ' -> ' + d.link).join('\n')}`);
  });

  test(`${name}: cleanliness (no leftover markers/vars)`, () => {
    const tmp = `/tmp/init-code-repo-test-${name}-clean`;
    rmSync(tmp, { recursive: true, force: true });
    assemble(tmp, JSON.parse(readFileSync(`tests/scenarios/${name}/config.json`, 'utf8')));
    for (const f of fileTree(tmp)) {
      if (!f.endsWith('.gitkeep')) assertClean(readFileSync(`${tmp}/${f}`, 'utf8'), `${name}:${f}`);
    }
  });
}
```

- [ ] **Step 5: Run full suite**

Run: `npm test`
Expected: 16 (prior) + 6 (3 per scenario × 2) = 22 tests, all passing.

If the dead-link test fails, investigate each dead link — a template referencing a non-existent file. Fix the template so all links resolve (either create the file or remove/guard the link). Common risk: AGENTS.md or a rule file links `entity-model.md` or `ui-design/` which aren't created in this plan — guard such links behind conditionals or remove them.

If the tree test fails, inspect actual vs expected — fix the engine/template, or regenerate expected-tree and explain.

- [ ] **Step 6: Commit**

```bash
git add tests/scenarios/standard/config.json tests/scenarios/full-product/config.json tests/golden/standard/expected-tree.json tests/golden/full-product/expected-tree.json tests/run_tests.mjs
git commit -m "test(init-code-repo): 标准与全产品场景 + 死链检查"
```

---

## Task 8: Final verification

- [ ] **Step 1: Run full suite**

Run: `npm test`
Expected: 22/22.

- [ ] **Step 2: Verify lightweight AGENTS snapshot unchanged**

The `lightweight: content snapshots match golden` test passing confirms AGENTS.md lightweight output is unchanged (the new product-docs/api-docs conditional blocks were stripped in lightweight). If it failed, the template change leaked into lightweight — fix the conditional guards.

- [ ] **Step 3: Final review dispatch**

Dispatch a final code reviewer for the entire Plan 2 diff (`main..HEAD`) — verify no dead links in any scenario, no leftover markers, no spec drift. Address any Critical/Important findings.

---

## Self-Review

**Spec coverage:**
- §4.1 charter/product/system-architecture/api → Tasks 2, 3. ✓
- §4.1 doc-governance.md split → Task 4. ✓
- §4.1 agent-conduct-rules/clean-code-rules/testing-rules → Task 1. ✓
- §4.1 ledger debt/version-log → Task 1. ✓
- §4.5 AWB-grade api-reference → Task 3. ✓
- §9.2 product-docs + api-docs 副作用 on AGENTS → Task 5. ✓
- §11 dead-link check → Tasks 6, 7. ✓
- §12.2 standard + full-product scenarios → Task 7. ✓

**Placeholder scan:** Template `（TODO: ...）` are end-user fill-in (legitimate). All plan steps have full content.

**Cond-name consistency (critical):** Use `<!--IF:product-docs-->` and `<!--IF:api-docs-->` (component pass-through names), NOT `product-level`. Verified against Plan 1's `activeConds` (only derives `full-workflow`, `remote-hook`; all other conds are component pass-through).

**Type consistency:** `deadLinks(rootDir)` returns `[{file, link, target}]`. Config schema matches Plan 1.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-06-init-code-repo-core-content.md`. Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks.
**2. Inline Execution** — batch with checkpoints.

Which approach?
