# init-code-repo 通用代码仓模板 Skill 设计

> **状态**：设计已与用户逐段确认通过，待写入实现计划。
> **日期**：2026-07-06
> **性质**：过程文档（非 SSOT），仅留追溯。本仓正式 SSOT 文档待 `init-code-repo` skill 落地后用自身格式重写。

---

## 1. 背景与目标

### 1.1 问题

Vibe Coding 时代，AI 产出大量代码与文档产物，代码仓面临：

- **单一真相源失守**：`CLAUDE.md` 被持续填充直到失去 SSOT 地位。
- **文档分层分类凌乱**：编号/语义/过程稿混杂，"从哪读起"无解。
- **研发流程混乱**：每轮迭代无固定步骤，质量门禁缺失或被绕过。
- **两仓分化**：`TianQuan` 与 `CyberWork` 各自演进，规则与结构出现分化，维护成本翻倍。

### 1.2 目标

建立一个**运行时中立的通用代码仓结构与研发流程模板**，以 Skill 形态交付：

- 新建代码仓时调用 skill，初始化模板、填充仓信息、引导逐步建仓。
- 融合 `TianQuan`（研发流程 + 强制规则索引 + cargo/npm 门禁）与 `CyberWork`（不可变 CLAUDE.md 委托铁律 + 编号文档阅读顺序 + lefthook 机器门禁 + arc42 设计方法论）的精华。
- 语言中立核心 + 可插拔栈/门禁，覆盖从小工具到产品级全谱。

### 1.3 非目标

- 不绑定特定 agent runtime（Claude Code / codex / opencode / kimicode / zcode 各自安装）。
- 不替用户决定技术栈，只提供模块化选项。
- 不内置业务领域规则（领域规则由各仓自行追加）。

---

## 2. 关键决策（与用户确认）

| # | 决策 | 选择 |
|---|---|---|
| 1 | 交付机制 | 本仓即 Skill 仓，内嵌模板文件，运行时中立，README 提供各 runtime 安装方式 |
| 2 | 技术栈立场 | 语言中立核心 + 可插拔栈模块 |
| 3 | 文档分类法 | 混合：编号叙事（00-charter…02-design）+ 根级 `ROADMAP/HANDOVER` 配对 + `rules/` 铁律 + `ledger/` 台账 + `superpowers/specs/` 过程稿 |
| 4 | 执行形态 | 方案 A：交互式向导 + 模块化文件布局（吸收方案 C） |
| 5 | Bug 清单性质 | 累积型台账（非过程文档、非普通 SSOT），入 `ledger/bugs.md`，关联回归用例 ID |
| 6 | 研发流程 | TianQuan 8 步流程为干 + CyberWork 军规 A–J 为"Agent 行为铁律"（正交双轴） |
| 7 | Commit 门禁 | 三档可配：默认正则 / 自定义正则 / 不要求 |
| 8 | 组件粒度 | 去三档，核心必带 + 8 项可选组件多选；版本由组件选择派生 |

---

## 3. 本仓总体架构

### 3.1 定位

`VibeCodingRepoTemplate` 本身是一个运行时中立的 Skill 仓：既是模板真源，也是可被各 agent runtime 安装的 skill。`skills/init-code-repo/` 是安装单元；本仓的 `README.md`、`docs/`、`examples/` 是元文档，不属于安装内容。

### 3.2 顶层布局

```
VibeCodingRepoTemplate/
├── README.md                      # 本仓说明：是什么、如何安装 skill、如何使用
├── LICENSE
├── skills/
│   └── init-code-repo/            # ← skill 安装单元（统一入口）
│       ├── SKILL.md               # 向导流程指令（运行时中立）
│       └── templates/             # 内嵌模板真源
│           ├── core/              # 语言中立核心
│           ├── stacks/            # 可插拔栈模块
│           ├── gates/             # 可插拔门禁模块
│           └── runtime-adapters/  # 各 runtime 安装适配片段
├── docs/                          # 本仓自身文档（设计 spec、决策记录、使用说明）
└── examples/                      # 已填充示例（供查阅，非运行态）
```

### 3.3 关键边界

- `SKILL.md` 只含流程指令（问什么、写什么、验什么），不含模板正文——正文全在 `templates/`，模板更新与流程更新解耦。
- `templates/core/` 与 `stacks/`、`gates/` 分离，对应"语言中立 + 可插拔栈"决策。
- `runtime-adapters/` 收纳 runtime 专属产物，让核心保持中立。
- 本仓 `docs/` 用 `init-code-repo` 自身格式组织（dogfooding）。

### 3.4 双路径架构（消除 end user 运行时依赖）

skill 的使用成本必须低：end user 建仓**零外部运行时依赖**（不要求 Node/Python/任何运行时）。通过拆分两条路径实现：

| 路径 | 谁用 | 依赖 | 作用 |
|---|---|---|---|
| **Agent 驱动装配**（默认） | end user 建仓 | **零依赖** | `SKILL.md` 给精确装配规则（变量替换表 + 条件剥离规则），agent 自己读模板→替换→剥离→写文件。agent 本身就是运行时。 |
| **引擎驱动装配**（可选） | 本仓维护者 | Node.js 22 | `skills/init-code-repo/assemble.mjs` 作为**确定性参考实现**+ golden 测试的**预言机**，验证模板与装配规则在演进中始终一致。end user 永不运行它。 |

**一致性保证**：`SKILL.md` 的手动装配规则是 SSOT，`assemble.mjs` 实现同一规则，agent 也实现同一规则。golden 测试验证引擎输出符合预期，从而间接保证 agent 按规则装配的输出正确。`assemble.mjs` 与 `tests/` 不进入 end user 的 skill 安装内容（仅 `SKILL.md` + `templates/` + `runtime-adapters/` 安装）。

**`SKILL.md` 必须包含"手动装配规则"段**（Plan 4 落地）：变量替换表（`{{PROJECT_NAME}}`/`{{ONE_LINE}}`/`{{YEAR}}`/`{{COMMIT_REGEX}}` → ctx 字段）+ 条件剥离规则（`<!--IF:cond-->` 语义、cond 派生表、嵌套处理、未匹配块整段移除）。让 agent 离线装配，输出与引擎一致。

---

## 4. `templates/` 内部结构

### 4.1 `templates/core/` — 语言中立核心

```
templates/core/
├── AGENTS.md.tmpl                 # SSOT 入口（条件装配：铁律 + 强制规则索引 + 仓布局 + 流程指向）
├── CLAUDE.md.tmpl                 # 不可变委托指针（CyberWork 铁律版，指向 AGENTS.md）
├── README.md.tmpl                 # 项目自述（占位待填）
├── .gitignore.tmpl
├── ERROR_LOG.md.tmpl              # 跨会话错误记忆（根目录，对应用户级规范）
├── REVIEW.md.tmpl                 # 复盘记录
├── lefthook.yml.tmpl              # 门禁基线（conventional-commits + gitleaks，语言中立部分）
├── docs/
│   ├── 00-charter/                # 顶层定义：愿景/战略/产品/护栏（可选组件）
│   │   ├── README.md.tmpl
│   │   └── guardrails.md.tmpl
│   ├── 01-product/                # 产品定义（可选组件）
│   │   └── README.md.tmpl
│   ├── 02-design/                 # 设计文档
│   │   ├── system-architecture.md.tmpl   # arc42+4+1+DDD 骨架（可选组件）
│   │   ├── doc-governance.md.tmpl        # 文档治理 + 三类文档分类 + 台账刷新责任表
│   │   ├── api/                          # API 文档（可选组件 api-docs）
│   │   │   └── api-reference.md.tmpl     # AWB 级：changelog+通用约定+通用 filter+每接口骨架
│   │   └── test-spec/                    # 测试设计 SSOT
│   │       ├── README.md.tmpl            # 精简骨架 / 完整三层格式（按派生）
│   │       └── bugs.md.tmpl              # → 实际落 ledger/bugs.md，此处仅为占位说明
│   ├── ROADMAP.md.tmpl            # 前瞻路线图（根，与 HANDOVER.md 配对）
│   ├── HANDOVER.md.tmpl           # 进展 + 交接（根，累积台账，与 ROADMAP 配对）
│   ├── ledger/                    # 累积型台账统一处
│   │   ├── bugs.md.tmpl           # Bug 台账（累积，根因/预防/回归用例 ID）
│   │   ├── debt.md.tmpl           # 技术债务台账（可选组件）
│   │   ├── version-log.md.tmpl    # 版本记录（可选组件）
│   │   └── archive/               # 归档区：按版本/周期切片
│   ├── rules/                     # 强制规则（铁律）
│   │   ├── dev-workflow-rules.md.tmpl   # 8 步研发流程（精简/完整按派生）
│   │   ├── commit-rules.md.tmpl         # 提交规范 + Co-Authored-By（按 commit 档）
│   │   ├── testing-rules.md.tmpl        # 三层测试规则（可选组件，未选不存在）
│   │   ├── clean-code-rules.md.tmpl     # Clean Code 规则（可选组件）
│   │   ├── agent-conduct-rules.md.tmpl  # Agent 行为军规 A–J（可选组件）
│   │   └── doc-ssot-rules.md.tmpl       # SSOT/三类文档/归档规则
│   └── superpowers/
│       └── specs/.gitkeep          # 过程稿（非 SSOT）
└── .claude/
    └── settings.json.tmpl          # Claude runtime 权限/环境基线（runtime-adapters 可覆盖）
```

注：`bugs.md` 实际落位 `docs/ledger/bugs.md`；`02-design/test-spec/` 下 `bugs.md.tmpl` 仅为说明 bug↔回归用例链接关系的占位，装配时移除，台账本体在 `ledger/`。

### 4.2 `templates/stacks/` — 可插拔栈模块

```
templates/stacks/
├── rust/
│   ├── gate-fragment.yml.tmpl     # 注入 lefthook 的 rust-fmt/clippy/test 片段
│   ├── Makefile.tmpl              # cargo 门禁命令封装
│   └── README.md.tmpl
├── node/
│   ├── gate-fragment.yml.tmpl     # eslint/prettier/vitest 片段
│   ├── package.json.tmpl
│   └── README.md.tmpl
├── python/
│   ├── gate-fragment.yml.tmpl     # ruff/mypy/pytest 片段
│   └── README.md.tmpl
└── go/
    ├── gate-fragment.yml.tmpl     # gofmt/go vet/test 片段
    └── README.md.tmpl
```

每个栈的 `gate-fragment.yml.tmpl` 是**片段**，装配时合并进 `lefthook.yml`（非覆盖），command 名按栈名前缀隔离（`rust-fmt`/`web-fmt`），支持多栈 monorepo。

### 4.3 `templates/gates/` — 可插拔门禁模块（与栈正交）

```
templates/gates/
├── conventional-commits/          # commit-msg 校验（已在 core 基线，可强化）
├── gitleaks/                      # 机密泄露检测（核心必带）
├── doc-sync-check/                # 代码改动提醒同步设计文档（可选组件）
└── pre-receive-remote/            # 远端 hook（gitcode pre-receive 正则，可选组件）
```

### 4.4 `templates/runtime-adapters/` — 各 runtime 适配片段

```
templates/runtime-adapters/
├── claude-code/                   # .claude/settings.json 权限/env、CLAUDE.md 指向 AGENTS.md
├── codex/                         # AGENTS.md 直接读
├── opencode/
├── kimicode/
└── zcode/
```

### 4.5 API 文档模板结构（AWB 级，可选组件 `api-docs`）

`02-design/api/api-reference.md.tmpl` 采用 AWB `api-reference.md` 结构（约定层前置 + 每接口骨架），不平铺：

1. **头部**：标题 + 版本 + 更新日期 + 破坏性变更说明 + 基础路径。
2. **接口更新点（Changelog）**：按版本记录接口层变更（数据迁移见 CHANGELOG）。
3. **通用约定**（前置，所有接口共享）：
   - 响应包装 `ApiResponse<T>`（success/data/message + 字段表 + 错误响应示例）
   - 分页 `PageResponse<T>`（content/page/size/totalElements/totalPages/empty/first/last + 字段表）
   - 认证（GET 免认证；写操作 `X-Internal-API-Key` / `Authorization: Bearer`）
   - 通用 filter 参数（URL-encoded JSON）+ 操作符表（eq/ne/like/in/nin/gt/gte/lt/lte + 示例）
   - 错误码表
4. **每接口段落**（§一、§二…，按业务域分组）：
   - 接口说明（一句话用途 + 破坏性变更注）
   - 方法 + 路径（`GET /api/v1/...`）
   - 请求参数表（path / query / body，含字段/类型/必填/说明）
   - 响应字段表（字段/类型/说明，嵌套结构展开）
   - 请求示例（curl 或 JSON）
   - 响应示例（成功 + 失败 JSON）
   - 错误场景

**与 CyberWork `http.md` 的差异**：CyberWork 的 http.md 内容稀疏；本模板强制"通用约定层 + 每接口六要素"，达到 AWB 丰满度。

---

## 5. 文档分类模型

### 5.1 三类文档

| 类别 | 性质 | 生命周期 | 例子 |
|---|---|---|---|
| **正式 SSOT 文档** | 治理型真相源，须保持准确，变更走治理 | 长期，被回刷维护 | `00-charter/`、`02-design/`、`rules/` |
| **累积型台账（ledger）** | 只增不删（归档=移至 archive，不删），是各自域 SSOT | 只增不删，不归零 | `bugs`、`debt`、`progress`、`version-log` |
| **过程文档** | 非 SSOT，追溯用，被正式文档替代后以正式文档为准 | 累积但可被替代/作废 | `superpowers/specs/`、`plans/` |

关键区分：累积 ≠ 过程文档。specs/plans 累积但非 SSOT；台账累积且是 SSOT。

### 5.2 分类法落地

- **编号叙事层**（`00-charter` → `02-design`）：编号即阅读顺序。`ROADMAP.md`/`HANDOVER.md` 升至 `docs/` 根，作为"前瞻/现状"导航配对，agent 每轮首读。
- **`rules/` 铁律层**：独立于编号，违反 = 构建阻断。`AGENTS.md` 顶部强制规则索引逐条指向。
- **`ledger/` 台账层**：累积型台账统一处。
- **`superpowers/specs/` 过程层**：非 SSOT。
- **六层真理源模型**（TianQuan）：在 `00-charter/guardrails.md` 与 `rules/doc-ssot-rules.md` 落地（仅选了产品级组件时装配）。

---

## 6. 台账治理

### 6.1 台账刷新责任表（写入 `doc-governance.md`）

| 台账 | 文件 | 刷新时机 | 谁刷新 | 刷新内容 |
|---|---|---|---|---|
| 进展/交接 | `HANDOVER.md`（docs 根） | 每轮迭代第 7 步 | agent | 顶部"当前交接追加"+下轮首做；与 `ROADMAP.md` 配对，标注当前所处阶段门 |
| Bug | `ledger/bugs.md` | 发现 bug 时 + 闭环时 | agent | 新增/状态变更+根因+回归用例 ID |
| 债务 | `ledger/debt.md` | 引入临时规避时 + 偿还时 | agent | 新增/标记偿还 |
| 版本 | `ledger/version-log.md` | 每次发布 | devops/agent | 版本号+变更摘要 |

### 6.2 交接刷新边界

`HANDOVER.md`（含 handover）刷新**只发生在每轮迭代第 7 步**，不在其他步骤随意改；只追加"当前交接追加"段，历史段不回改（台账只增原则）。`HANDOVER.md` 顶部须标注当前在 `ROADMAP.md` 的哪个阶段门，便于"走偏自检"。

### 6.3 归档转存机制

```
docs/ledger/
├── bugs.md                 # 主文件：未闭环 + 近期闭环（近 N 条，如 30）
├── debt.md                 # 主文件：未偿还 + 近期偿还
├── version-log.md          # 主文件：近几个版本
└── archive/                # 归档区：按版本/周期切片
    ├── bugs-2026-Q2.md
    ├── debt-2026-Q2.md
    ├── handover-P0.md      # HANDOVER.md 按阶段门归档
    └── version-log-2026.md
```

- **触发**：发布时（devops 触发）+ 阈值提醒（agent 检测主文件超阈值如 50 条闭环 bug 时，提示用户归档）。
- **切片维度**：bugs/debt 按发布版本或季度；HANDOVER 按阶段门（P0/P1…）；version-log 按年。
- **归档动作**：闭环/已偿还/已过阶段 条目移入 `archive/<名>-<版本>.md`，主文件保留近 N 条 + 全部未闭环。
- **不删只移**：归档 = 从主文件移至 archive，仍可检索，永不删。
- **根因提炼**：归档时同步审视根因模式，高频根因提炼成 `rules/` 预防规则。
- **agent 行为**：归档由 devops 在发布流程触发，或 agent 在阈值提醒时**征得用户同意**后执行——不自动静默归档。

---

## 7. 研发流程（双轴融合）

### 7.1 流程轴：TianQuan 8 步（`rules/dev-workflow-rules.md`）

每轮迭代强制 8 步：

1. 读交接 + 仓结构核心文件
2. 头脑风暴 + 需求分析设计（`/goal` 设收口验收标准）
3. 整合三层测试设计（建/更新 test-spec SSOT）
4. TDD 驱动开发 + 代码检视
5. 构建部署 Docker 镜像 + L2 测试验证（选 Docker 时激活）
6. L3 端到端测试验证（选三层测试时激活）
7. 记录（刷新台账/交接）
8. 发布门控

### 7.2 铁律轴：CyberWork 军规 A–J（`rules/agent-conduct-rules.md`）

- A. 先文档后代码
- A0. 建模方法论
- B. 过程文档不冒充基线
- C. ADR 只追加
- D. 代码质量关卡不可绕过
- E. 安全相关人审
- F. 一致性
- G. 可视化（图表规范）
- H. 技术债务（临时规避必登记）
- I. 接口/DB/实体回刷（SSOT 一致性）
- J. 变更即审视回刷（总一致性规则）

两轴正交：流程定顺序，铁律定规矩。流程可按组件裁剪（无 Docker 跳 L2），铁律不可裁剪。

---

## 8. Commit 门禁三档

| 档位 | 行为 |
|---|---|
| **默认正则** | `^(feat\|fix\|docs\|style\|refactor\|perf\|test\|chore)\(.*\): .+\s#\d+$` |
| **自定义正则** | 用户提供正则 |
| **不要求** | 不写 commit-msg 段，`commit-rules.md` 仅留建议 |

所选档位同时反映到 `lefthook.yml`（机器门控）与 `rules/commit-rules.md`（人/agent 规则）。`AGENTS.md` 索引按档标注"强制/建议"。

---

## 9. 组件模型

### 9.1 核心必带（不问）

`AGENTS.md` 瘦版 + `CLAUDE.md` 指针 + `README` + `.gitignore` + `ERROR_LOG.md` + `REVIEW.md` + `rules/commit-rules.md`（按档）+ `rules/dev-workflow-rules.md`（精简）+ `rules/doc-ssot-rules.md` + `02-design/test-spec/`（骨架）+ `02-design/doc-governance.md` + `ROADMAP.md` + `HANDOVER.md` + `ledger/bugs.md` + `ledger/archive/` + `superpowers/specs/` + 所选栈门禁 + `gitleaks`。

### 9.2 可选组件（一道多选）

| 可选组件 | 直接新增 | 版本副作用（升级核心文档） |
|---|---|---|
| 产品级设计文档组 | `00-charter/`+`01-product/`+`02-design/system-architecture.md` | `AGENTS.md` 加入"六层真理源模型"段 + 战略对齐自检段；`doc-governance.md`（核心必带）追加"六层真理源模型"治理段 |
| Docker 构建基础设施 | `infra/docker/` | `dev-workflow-rules.md` 第 5 步 L2 激活为强制 |
| 三层测试规则 | `rules/testing-rules.md` | `test-spec/` 升级完整格式 + `dev-workflow-rules.md` 第 6 步 L3 激活 |
| Clean Code 严格门禁 | `rules/clean-code-rules.md` | 所选栈 `gate-fragment` 的 lint 段从"建议"升为"强制 `-D warnings`" |
| Agent 行为军规 | `rules/agent-conduct-rules.md` | `AGENTS.md` 强制规则索引加入军规行 |
| 完整台账 | `ledger/debt.md`+`version-log.md` | `doc-governance.md` 台账刷新责任表加入对应行 |
| 代码-文档同步检查 | `gates/doc-sync-check` 片段 | `lefthook.yml` pre-push 段加入 doc-sync |
| 远端 pre-receive hook | `gates/pre-receive-remote/` | `commit-rules.md` 标注"远端强控" |
| API 文档 | `02-design/api/api-reference.md.tmpl` | `AGENTS.md` 文档体系表加入 api-reference 行 |

### 9.3 版本派生规则（非独立开关）

| 文档 | 精简版（默认） | 完整版（何时升级） |
|---|---|---|
| `dev-workflow-rules.md` | 8 步但 L2/L3 步标注"按需/可选" | 选了 Docker 或 三层测试 → L2/L3 激活强制 |
| `test-spec/` | 仅骨架 README + bugs 链接说明 | 选了三层测试 → 完整三层格式 |
| `testing-rules.md` | 不存在 | 选了三层测试 → 写入完整 L1/L2/L3 |
| `AGENTS.md` | 总是按已选组件条件装配 | 同左，无版本概念 |

---

## 10. 向导执行流（`SKILL.md`）

`SKILL.md` 在目标空仓被调用时，按 5 阶段顺序驱动：**问 → 等用户答 → 写文件 → 校验 → 进入下一阶段**。

### 阶段 0 · 前置检查

- 确认当前目录是空仓或仅含 `.git`/`README`/`LICENSE`。
- 含冲突文件（已有 `AGENTS.md` 等）：停下询问，不静默改。
- 未 `git init`：提示用户初始化，不替用户 init（除非同意）。

### 阶段 1 · 录入

一道题收集（多选优先）：

| 项 | 选项 | 用途 |
|---|---|---|
| 项目名 | 自由文本 | 填入 AGENTS/README/package |
| 一句话定位 | 自由文本 | 填入 AGENTS 顶部 |
| 主栈 | 无/rust/node/python/go/多栈 | 决定叠加哪些 `stacks/` |
| 仓形态 | 单 app/monorepo | 决定 `apps/` 布局 |
| 目标 runtime | claude-code/codex/opencode/kimicode/zcode/多端 | 决定叠加哪些 `runtime-adapters/` |
| 远端托管 | gitcode/github/gitlab/无 | 决定是否带 `pre-receive-remote` |
| Commit 门禁档 | 默认正则/自定义/不要求 | 决定 `lefthook.yml` commit-msg 段 |
| 可选组件 | 8 项多选 | 决定装配范围与版本派生 |

校验：必答项齐全；主栈与仓形态自洽。

### 阶段 2 · 骨架写入

写入 `templates/core/` 全部必带文件，变量替换 `{{PROJECT_NAME}}`/`{{ONE_LINE}}`/`{{YEAR}}` 等。`AGENTS.md` 按已选组件条件装配。

校验：`find` 核对目录树；`AGENTS.md` 内链接路径全部存在（grep 死链）。

### 阶段 3 · 栈与门禁叠加

- `gate-fragment` 合并进 `lefthook.yml`（非覆盖，多栈多片段共存，command 名按栈名前缀隔离）。
- 胶水文件：rust→`Makefile`、node→`package.json`、python→`pyproject.toml`。
- runtime 适配：写入所选 `runtime-adapters/<runtime>/`。
- 远端 hook：附 `pre-receive-remote/` 安装说明。

校验：`lefthook check`（若装了）；片段无 key 冲突；未装工具的栈片段优雅降级（注释化 + `skip: true` + README 注明安装命令）。

### 阶段 4 · 填充引导

逐节带用户填占位，每节给检查清单 + 校验：

1. `00-charter/`（若选）：愿景/战略/护栏
2. `02-design/system-architecture.md`（若选）：技术栈/架构骨架
3. `ROADMAP.md`：P0 首阶段门
4. `AGENTS.md` 仓库布局段：按所选栈形态填实际目录树
5. `HANDOVER.md` 首条交接：本轮首做 + 当前阶段门标注

每节可跳过（留 TODO）。校验：占位符残留扫描；AGENTS.md 布局段与实际 `find` 目录一致。

### 阶段 5 · 验收

- 门禁 dry-run：`lefthook run pre-commit --all`（或手动跑已装栈 lint）。
- SSOT 一致性：`AGENTS.md` 索引文件全部存在；三类文档分类在 `doc-governance.md` 已写明；死链扫描。
- 打印完成清单：已写文件树、未填占位列表、下一步建议。
- **不自动 commit/push**（除非用户显式要求）。

### 数据流

```
用户调 skill → 阶段0 前置检查 → 阶段1 录入(变量+组件)
  → 阶段2 写 core(变量替换+条件装配) → 阶段3 合并 stacks/gates/adapters
  → 阶段4 逐节引导填充 → 阶段5 dry-run 校验 + 完成清单
templates/ 全程只读引用；目标仓只写一次（阶段2-3），阶段4 仅编辑已写文件
```

---

## 11. 错误处理与优雅降级

原则：**显式优于静默，降级优于阻断，但 SSOT 一致性绝不降级。**

### 11.1 SSOT 一致性失败（硬阻断）

- 条件装配后 `AGENTS.md` 出现死链 → 阻断，自动移除指向不存在文件的索引行，重新校验。
- 索引与实际文件不符、三类文档分类错位 → 阻断修正。
- 多栈片段 YAML key 冲突 → 阻断，报告并人工裁定。
- `lefthook check` 语法失败 → 阻断，修正后重试。

### 11.2 工具/环境失败（软降级）

- 所选栈工具未安装 → 门禁片段注释化 + `skip: true` + README 注明安装命令，不阻断。
- `lefthook` 未安装 → `lefthook.yml` 仍写入，README 注明安装命令，不阻断。
- 门禁 dry-run 失败 → 不阻断，列为"待修复"项。

### 11.3 操作类失败

- 目标目录非空且含冲突文件 → 停下询问逐文件确认，不静默改。
- 文件写入中途失败 → 回滚已写文件，报告已写清单，不留半成品。
- 未 `git init` → 提示用户，不替用户 init。

### 11.4 内容类失败

- 变量替换后残留 `{{...}}` → 列清单提示，不阻断（留 TODO 可接受）。
- 用户跳过某节 → 允许，留 TODO，不强填虚假内容（虚假 SSOT 比缺失更糟）。
- 用户填入与已选组件矛盾 → 提示矛盾，建议补选，不强改。

### 11.5 跨阶段原则

- SSOT 一致性是硬阻断线，工具缺失是软降级。
- 删除/覆盖类操作必确认（覆盖已有文件、归档台账、自动 commit）。
- 不静默成功：每阶段结束打印"已写文件清单 + 校验结果 + 待办"。

---

## 12. 测试策略

### 12.1 模板产出的测试约定（写入目标仓）

由"三层测试规则"可选组件驱动：

- **L1 单元**：栈原生（cargo test / vitest / pytest / go test）。
- **L2 集成**：选 Docker 时激活（容器构建后跑契约测试）。
- **L3 e2e**：选三层测试时激活（playwright 等）。
- **测试 SSOT**：`02-design/test-spec/` 持有用例设计，代码用例标注 `// 覆盖:§<节> <用例 ID>` 反向链接。
- **bug ↔ 回归用例**：`ledger/bugs.md` 每条 bug 记录对应回归用例 ID，闭环 bug 必有回归测试落地。

### 12.2 Skill 自身的测试（本仓 `tests/`，维护者 QA）

> golden 测试是**维护者路径**（需 Node.js 22），不进入 end user 安装内容。end user 走 agent 驱动装配（零依赖，见 §3.4）。引擎作为测试预言机验证模板与装配规则一致。

golden-repo 快照测试：

```
tests/
├── scenarios/
│   ├── lightweight/            # 小工具：无任何可选组件
│   ├── full-product/           # 全选
│   ├── multi-stack/            # rust + node monorepo
│   ├── custom-commit-regex/    # 自定义 commit 正则
│   └── no-commit-gate/         # 不要求 commit 规范
├── golden/                     # 每场景期望产出（文件树 + 关键文件内容快照）
└── run_tests.mjs               # 驱动脚本：模拟输入→跑装配→diff golden
```

断言矩阵：

| 断言 | 说明 |
|---|---|
| 文件树完整 | `find` 输出与 golden 一致（已选组件存在，未选不存在） |
| 条件装配正确 | 未选组件不出现在 `AGENTS.md` 索引 |
| 无死链 | `AGENTS.md` 所有 markdown 链接指向实际存在文件 |
| 变量替换无残留 | 无 `{{...}}` 占位（除显式 TODO） |
| 版本派生正确 | 选 Docker → dev-workflow 第 5 步激活；未选三层测试 → 无 testing-rules.md |
| commit 档位正确 | 三档各自写入对应 `lefthook.yml` 段与 `commit-rules.md` |
| 多栈片段合并 | rust+node 场景 `lefthook.yml` 含两栈片段且无 key 冲突 |
| 台账刷新表一致 | `doc-governance.md` 台账刷新责任表只列已选台账 |

回归机制：场景即回归集，模板/派生规则改动后跑 `run_tests.mjs`，golden diff 即装配回归。

### 12.3 dogfooding

本仓 `docs/` 用 `init-code-repo` 自身产出的格式组织（产品级档），`tests/` 用 golden 测试。

---

## 13. 与两个典范的映射

| 元素 | 来源 | 落地 |
|---|---|---|
| AGENTS.md 多端 SSOT | TianQuan + CyberWork | `core/AGENTS.md.tmpl` |
| 不可变 CLAUDE.md 委托铁律 | CyberWork | `core/CLAUDE.md.tmpl`（IRON LAW 版） |
| 8 步研发流程 | TianQuan | `rules/dev-workflow-rules.md` |
| 军规 A–J | CyberWork | `rules/agent-conduct-rules.md` |
| 强制规则索引 | TianQuan | `AGENTS.md` 顶部索引表 |
| 编号文档阅读顺序 | CyberWork | `docs/00-charter…02-design/` + 根级 `ROADMAP/HANDOVER` |
| HANDOVER/ROADMAP 配对命名 | AWB + TianQuan | `docs/HANDOVER.md` + `docs/ROADMAP.md`（根，导航配对） |
| API 文档（changelog+通用约定+每接口骨架） | AWB | `02-design/api/api-reference.md.tmpl`（可选组件） |
| `rules/` 语义铁律 | TianQuan | `docs/rules/` |
| lefthook 机器门禁 | CyberWork | `core/lefthook.yml.tmpl` + `gates/` |
| cargo/npm 门禁 | TianQuan | `stacks/*/gate-fragment.yml.tmpl` |
| 三层测试 SSOT | TianQuan | `02-design/test-spec/` + `rules/testing-rules.md` |
| 台账（debt/version-log/handover） | 两者 | `docs/ledger/`（统一，含归档） |
| 文档变更治理/建模方法论 | CyberWork | `02-design/doc-governance.md` |
| 远端 pre-receive hook | TianQuan | `gates/pre-receive-remote/` |
| arc42+4+1+DDD 设计方法论 | CyberWork | `02-design/system-architecture.md`（可选） |

---

## 14. 开放问题（实现阶段决定）

1. `SKILL.md` 的 frontmatter `description` 措辞——需用 `skill-creator` eval 优化触发准确度。
2. golden 测试驱动脚本 `run_tests.mjs` 如何模拟"交互式向导"输入——可能需把向导的"录入"阶段抽成纯函数（输入 JSON → 装配），便于测试调用。
3. 条件装配的标记语法（`<!--IF:FULL-->` 还是 YAML frontmatter 声明组件清单）——实现时选其一并文档化。
4. 各 runtime 安装方式的具体命令——需核实 codex/opencode/kimicode/zcode 的 skill 安装机制。

---

## 15. 后续

本 spec 通过用户审阅后，进入 `superpowers:writing-plans` 制定实现计划，按计划落地 `skills/init-code-repo/`。
