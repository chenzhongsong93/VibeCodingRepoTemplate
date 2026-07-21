# 下沉 BaiWang 研发治理能力回 VibeCodingRepoTemplate — 设计

> 日期：2026-07-21
> 主题：把 BaiWang_dev_mvp 实战演进的研发治理能力下沉为 VibeCodingRepoTemplate 的通用可选组件
> 状态：Spec（待审）

## 1. 背景与目标

BaiWang_dev_mvp（基于 VibeCodingRepoTemplate 创建的 4 仓多仓项目）在实战中演进出三层研发治理体系：节奏层（PI 迭代体系）、流程层（研发流程 skill 三层拆分）、执行层（T0-T3 风险分级 + verify 门禁 + 权限模型）。这些能力工具中立、与百望业务无关，可下沉为模板的通用可选组件。

**目标**：把三层治理能力做成 init-code-repo 的 3 个可选组件（`agent-policy` / `dev-flow-skills` / `pi-cadence`），按层可组合选配，零新装配机制（唯一改动是 conditional.mjs 加一行组件依赖），向后兼容（现有 9 个 golden 场景不变）。

**非目标**：worktree 脚本、UPSTREAM-SYNC、ERROR_LOG、deployment stack 等属后续 spec；agent-governance 自动同步/哈希锁；codex/opencode 等价 skill 适配器；PI 实例填充。

## 2. 已定决策（brainstorming 共识）

1. **一份大 spec 全做**：三层 + dev-workflow-rules 重写 + 执行层全套纳入，一份完整"研发治理平台"spec。
2. **dev-conductor 与 dev-flow 并存分工**：dev-conductor=建仓期一次性（设计填充+代码骨架）；dev-flow=日常迭代期每任务（10 步）。不重叠，按阶段切换。
3. **skill 每仓自带副本**：SSOT 装配进新仓 `docs/skills/`，薄入口进 `.claude/skills/`（Claude Code 专用，其他 runtime 经 AGENTS.md 指针读 SSOT）。
4. **全套执行层纳入**：verify 门禁 + settings.json 权限 + check-agent-policy + agent-governance 4 文档。
5. **按层拆 3 个组件**：agent-policy（执行层）/ dev-flow-skills（流程层）/ pi-cadence（节奏层）。
6. **装配方案 A**：SSOT 走 `core/docs/skills/`（中立），薄入口走 `runtime-adapters/claude-code/.claude/skills/`（runtime 专用）。

## 3. 总体架构

三层正交，互不替代：

```
┌─ 节奏层 pi-cadence ──────── PI 体系（ROADMAP 段 + 话术规范 + 大循环/子循环分层）
├─ 流程层 dev-flow-skills ── dev-flow(日常10步) + test-spec(六步+1:1) + design-review
└─ 执行层 agent-policy ───── T0-T3 + 分支模型 + 阻断分类 + verify 门禁
                              + settings.json(allow/ask/deny) + check-agent-policy
                              + agent-governance 4 文档
```

**skill 体系边界**：

| skill | 住所 | 何时用 | 粒度 |
|---|---|---|---|
| init-code-repo | 模板仓 skills/ | 建仓一次性 | 仓级 |
| dev-conductor | 模板仓 skills/ | 建仓后首次设计填充+代码骨架 | 仓级 |
| dev-flow | 每仓 docs/skills/ + .claude/skills/ | 日常每任务 | 任务级 |
| test-spec | 每仓 docs/skills/ + .claude/skills/ | 写测试代码前 | 任务级 |
| design-review | 每仓 docs/skills/ + .claude/skills/ | 评审设计/Spec/ADR 时 | 任务级 |

init-code-repo 阶段 5 末尾引导 dev-conductor；dev-conductor 收口后引导 dev-flow 作为日常入口。

**组件依赖**：
- `agent-policy`：独立可单装（最小治理）
- `dev-flow-skills`：依赖 agent-policy（选它自动激活 agent-policy）
- `pi-cadence`：独立，建议与 agent-policy 同装

## 4. agent-policy 组件（执行层）

**cond**：`agent-policy`。**依赖**：无。**被依赖**：dev-flow-skills 自动激活。

### 4.1 文件清单

| 文件 | 路径（模板） | 条件 | 内容 |
|---|---|---|---|
| 治理规则集 | `core/docs/rules/dev-workflow-rules.md.tmpl` | `<!--IF:agent-policy-->` 注入治理段（ELSE 现有线性版） | 重写：分支发布流程+T0-T3+4步骨架+TDD触发+L1-L3+阻断分类 |
| 权限模型 | `runtime-adapters/claude-code/.claude/settings.json.tmpl` | `<!--require:agent-policy-->` 重写 | allow/ask/deny 三段 |
| 策略校验脚本 | `core/scripts/check-agent-policy.mjs.tmpl` | `<!--require:agent-policy-->` | 断言不变量 |
| 治理 SSOT 4 文档 | `core/docs/02-design/agent-governance/{policy,risk-levels,compatibility-matrix,validation-cases}.md.tmpl` | `<!--IF:agent-policy-->` | 工具中立治理 |
| verify 门禁 | 各 `stacks/<栈>/Makefile.tmpl` | `<!--IF:agent-policy-->` 注入 | verify-fast/ci/release 目标 |
| AGENTS Policy 段 | `core/AGENTS.md.tmpl` | `<!--IF:agent-policy-->` | Policy 标记+授权边界+T0-T3 摘要+会话读序 |
| lefthook verify-fast | `core/lefthook.yml.tmpl` | `<!--IF:agent-policy-->` 注入 | pre-commit + pre-push 加 verify-fast |

### 4.2 dev-workflow-rules 治理版

分支模型参数化：

| 占位符 | 默认 | BaiWang 实际 |
|---|---|---|
| `{{DEV_BRANCH}}` | `dev` | `dev_mvp` |
| `{{MAIN_BRANCH}}` | `main` | `main` |
| `{{FIX_BRANCH}}` | `fix` | `fix_bug` |
| `{{RELEASE_PREFIX}}` | `release/v` | `release/v` |

阶段 1 录取新增"分支模型"项（默认/自定义）。治理版正文（泛化自 BaiWang）：
- **分支与发布流程**（6 条）：开发线只进 `{{DEV_BRANCH}}`；`{{MAIN_BRANCH}}` 只接收授权集成；`{{FIX_BRANCH}}` 只修已发布版本且基于 `{{RELEASE_PREFIX}}<ver>` Tag；修复回合必须合回 `{{DEV_BRANCH}}`；`{{RELEASE_PREFIX}}*` 与 Tag 不可变；跨仓协同引用同一任务标识
- **T0–T3 公共风险分级表**（定义 + 最低治理与验证）— 明说"是风险描述，不是顺序流程"
- **工具中立执行流程**：4 步骨架（定向 → 分级与设计 → 实施 → 验证交接）— dev-flow skill 展开为 10 步的基线
- **TDD 触发条件** + 豁免
- **L1–L3 测试层级** + L2 禁 mock 铁律（mock 是假绿根因）
- **阻断分类**：构建阻断（格式/lint/L1-L2/secret/契约不一致/删测试制造绿/L2 mock）vs 评审阻断（安全未审/授权未明/L3 证据不可得）；环境不可用记"未验证/评审阻断"不得宣称全绿

### 4.3 verify 门禁（各 stack Makefile 注入）

```
policy-check:  # CLAUDE.md 单行 @AGENTS.md + AGENTS.md 有 Policy 标记 + settings.json 合法 JSON
verify-fast:   # policy-check + git diff HEAD --check + lint + 快测试（无 Docker/外部服务）
verify-ci:     # verify-fast + 全量测试（L2 含 testcontainers/Docker）
verify-release: # 需 ALLOW_REAL_E2E=1（否则 exit 2）+ verify-ci + release 构建
```
- node stack 同步加 `verify:fast`/`verify:ci`/`verify:release` scripts 到 `package.json.tmpl`
- 命令名变量化：`{{VERIFY_FAST_CMD}}`（`make verify-fast` vs `npm run verify:fast`）供 lefthook/AGENTS 引用

### 4.4 settings.json 权限模型（重写，修复安全漏洞）

- `allow`：只读 git（status/diff/log/show/branch）+ `{{VERIFY_FAST_CMD}}`
- `ask`：所有 git 写（add/commit/push/tag/merge/rebase/cherry-pick/checkout/switch/reset/stash）
- `deny`：破坏性 git（`reset --hard`、`clean -f`、`checkout --`、`restore`、`branch -D`、`stash drop/clear`、所有 force-push）
- 加 `"worktree": {"baseRef": "head"}`

> 现有模板把 `git commit/push` 放 allow 是安全漏洞，本组件修复。

### 4.5 check-agent-policy.mjs（断言不变量）

断言：① `CLAUDE.md` 恰为一行 `@AGENTS.md`；② `AGENTS.md` 含 `{{POLICY_ID}}` 标记；③ `.claude/settings.json` 合法 JSON 且 verify-fast 在 allow、git 写在 ask；④ agent-governance 4 文档存在；⑤ `dev-workflow-rules.md` 含 T0-T3 表。挂到 `policy-check` Make 目标。

### 4.6 agent-governance 4 文档（工具中立 SSOT）

- `policy.md`：三层模型（行为规则/工具适配器/机器门禁）+ 授权边界 + T0-T3 + 事实/目标纪律
- `risk-levels.md`：T0-T3 详表
- `compatibility-matrix.md`：Claude/Codex/OpenCode/zcode × 各门禁的适配映射
- `validation-cases.md`：策略验收用例
- **多仓模式**（`central-docs` 激活）：SSOT 在中央 docs 仓，组件仓为快照（模板标注"快照，SSOT 在中央 docs 仓"）
- **单仓模式**：本仓即 SSOT
- **同步**：第一版人工同步（与 BaiWang ADR-011 一致），模板不实现自动生成/哈希锁（YAGNI，两个迭代后再评估）

## 5. dev-flow-skills 组件（流程层）

**cond**：`dev-flow-skills`。**依赖**：自动激活 `agent-policy`。

### 5.1 三 skill 文件清单（双路径）

| skill | SSOT（工具中立） | 薄入口（Claude Code） |
|---|---|---|
| dev-flow | `core/docs/skills/dev-flow.md.tmpl` | `runtime-adapters/claude-code/.claude/skills/dev-flow/SKILL.md.tmpl` |
| test-spec | `core/docs/skills/test-spec.md.tmpl` | `runtime-adapters/claude-code/.claude/skills/test-spec/SKILL.md.tmpl` |
| design-review | `core/docs/skills/design-review.md.tmpl` | `runtime-adapters/claude-code/.claude/skills/design-review/SKILL.md.tmpl` |

SSOT 文件 `<!--IF:dev-flow-skills-->`；薄入口 `<!--require:dev-flow-skills-->`（仅 claude-code runtime）。其他 runtime 经 `AGENTS.md` 指针读 SSOT。

**命名泛化**：BaiWang 的 `baiwang-dev-flow`/`baiwang-test-spec` → 模板去前缀为 `dev-flow`/`test-spec`/`design-review`（避免与用户级 `baiwang-*` skill 冲突；skill description 去掉"百望"，泛化为"项目开发流程入口"）。

### 5.2 dev-flow skill（日常迭代入口，10 步）

SSOT 正文泛化自 BaiWang `baiwang-dev-flow`，引用 `{{POLICY_ID}}`、`{{VERIFY_FAST_CMD}}`：
1. T0-T3 风险分级（引用 dev-workflow-rules 表）
2. brainstorming（调 superpowers:brainstorming，spec 落 `docs/superpowers/specs/`）
3. **test-spec 设计先行**（铁律：步骤 3 先于 4，调 test-spec skill）
4. writing-plans（调 superpowers:writing-plans，plan 落 `docs/superpowers/plans/`）
5. TDD 红→绿（调 superpowers:test-driven-development）
6. verification-before-completion（按 T 级跑 `{{VERIFY_FAST_CMD}}`/verify-ci/verify-release，需实测证据）
7. 台账（bugs/debt/version-log，13 字段 bugs）
8. requesting-code-review
9. 提交（验收通过才 commit/push；commit 正则；lefthook 门禁）
10. SSOT 文档同步（实现与设计不一致反过来刷设计文档）

薄入口只含触发说明 + "先读 docs/skills/dev-flow.md SSOT 再执行" + Done 清单指针，不复制正文。

### 5.3 test-spec skill（六步方法论 + 1:1 铁律）

SSOT `docs/skills/test-spec.md` 泛化自 BaiWang：
- **六步**：因子分析 → 场景矩阵 → 边界值分析 → 异常场景分析 → 分支覆盖表 → 用例清单
- **用例 ID 方案**：`L{层}-{特性}-{序号}`（如 `L2-PROJ-01`）
- **1:1 标签铁律**：每测试函数首行 `// 覆盖:<SSOT节> <用例ID>`；SSOT 用例 ID 集合 = 代码标签集合，零差异零重复，不一致 = 构建阻断
- **L1/L2/L3 定义 + L2 禁 mock 铁律**：引用 dev-workflow-rules 的 L1-L3 段（不重复，避免漂移）；L2 禁 mock 根因说明
- **一致性校验脚本** `core/scripts/check-test-spec-consistency.mjs.tmpl`（`<!--require:dev-flow-skills-->`）：`diff <(grep SSOT ID) <(grep 代码标签)`，挂到 verify-fast

### 5.4 design-review skill（薄入口 defer 到 methodology SSOT）

- SSOT `docs/skills/design-review.md`：三铁律（报问题不报风险 / 长短期非放弃 / 4+1 视图）+ 7 维度 × 4 层框架 + 流程 + 红旗
- 薄入口：触发说明 + "先读 SSOT 再执行" + 输出落 `docs/superpowers/specs/` + "不复制方法论正文、不在检视阶段修复"约束
- 模式：薄入口 defer 到 SSOT，与 CLAUDE.md→AGENTS.md 委托一致

### 5.5 与现有 three-tier-test 组件的关系

- `three-tier-test`（现有）：提供 `testing-rules.md`（L1-L3 实操细则）+ `test-spec/` 骨架目录
- `dev-flow-skills`（新）：提供 test-spec 方法论 skill（六步 + 1:1）+ 一致性校验
- 两者**独立可叠加**：都装时 testing-rules 详版补充 dev-workflow-rules 的 L1-L3 摘要；只装 dev-flow-skills 时 L1-L3 定义来自 dev-workflow-rules（agent-policy 已含），test-spec skill 自洽
- 不让 dev-flow-skills 依赖 three-tier-test（避免强制 Docker/三层测试开销）

## 6. pi-cadence 组件（节奏层）

**cond**：`pi-cadence`。**依赖**：无。**建议**：与 agent-policy 同装。

### 6.1 设计原则

模板只放结构与话术规范 + TODO 占位，不填 PI 实例（遵循 init-code-repo 阶段 4"只定骨架+规范，不起草设计内容"）。PI 编号项目特定，由 dev-conductor 或用户填。

### 6.2 文件清单

| 文件 | 路径 | 条件 | 内容 |
|---|---|---|---|
| ROADMAP PI 段 | `core/docs/ROADMAP.md.tmpl` | `<!--IF:pi-cadence-->` 注入 | 迭代(PI)体系段骨架 |
| AGENTS.md PI 段 | `core/AGENTS.md.tmpl` | `<!--IF:pi-cadence-->` | PI 话术摘要 + 指针引用 ROADMAP |
| HANDOVER PI 标注 | `core/docs/HANDOVER.md.tmpl` | `<!--IF:pi-cadence-->` | 顶部"当前 PI"字段（TODO 占位） |

### 6.3 ROADMAP「迭代（PI）体系」段骨架

装配后含（正文为规范+占位，非实例）：

```
## 迭代（PI）体系（交付节奏）

> 统一迭代话术，避免与各仓内部切片编号冲突。
> 本段是节奏层；流程层见 dev-workflow-rules.md 4 步骨架（dev-flow skill 展开 10 步）；
> 两者不等同：大循环不替代子流程，子流程不承载 PI 级需求收集/排序/拆解。

- **PI 命名格式**：{{PI_FORMAT}}（默认 `YYYY-PI<N>`，可自定义）
- **能力成熟度维度 vs 迭代编号分离**：成熟度维度（如 MVP/M1/M2/M3）标注"哪个 PI 引入哪种能力"，不作为迭代编号或并行交付顺序——避免与各仓内部切片（如 `FE-INTAKE-M0x`）的 M 编号冲突

| PI | 范围 | 当前状态 | 主要验收 |
|---|---|---|---|
| {{PI_FIRST}} | （TODO: 填首个 PI 范围，如 MVP） | （TODO: 状态） | （TODO: 验收标准） |

### PI 大循环（扩展层，团队人员管理范畴）
（TODO: 需求收集 → 需求排序 → 任务拆解 → 方案分析设计评审 → 测试用例设计评审 → 开发 → 转测试 → 发布）

### 子任务循环（流程层，对大循环中每个子任务生效）
dev-workflow-rules.md 4 步骨架（定向 → 分级与设计 → 实施 → 验证交接），由 dev-flow skill 展开为 10 步。

### 分支 ↔ 迭代映射
见 dev-workflow-rules.md「分支与发布流程」：{{DEV_BRANCH}}=开发线 / {{MAIN_BRANCH}}=集成 / {{FIX_BRANCH}}=已发布版本修复 / {{RELEASE_PREFIX}}*=不可变快照。
```

### 6.4 变量

| 占位符 | 默认 | 来源 |
|---|---|---|
| `{{PI_FORMAT}}` | `YYYY-PI<N>` | 阶段 1 录取（pi-cadence 激活时追问，默认即可） |
| `{{PI_FIRST}}` | 首个 PI 占位（如 `2026-PI1`） | 派生：PI_FORMAT 的 `<N>`→1、`YYYY`→{{YEAR}} |

### 6.5 与 dev-workflow-rules 治理版的呼应

- 分支模型规则在 agent-policy 的 dev-workflow-rules，pi-cadence 只在 ROADMAP 补充"分支↔迭代阶段"语义映射说明，不重复规则
- "大循环 vs 子循环分层"说明单点放 ROADMAP，dev-workflow-rules 只引用"4 步骨架是子循环基线"
- SSOT 不重复：节奏规范→ROADMAP，流程规则→dev-workflow-rules，执行门禁→Makefile/settings

## 7. 装配机制集成

### 7.1 装配机制改动

三处改动，均为现有机制的扩展（不引入新机制类型）：

1. **conditional.mjs**：`activeConds` 新增一行 `if (set.has('dev-flow-skills')) set.add('agent-policy');`（流程层依赖执行层）
2. **substitute.mjs**：`VARS` 表新增 `DEV_BRANCH/MAIN_BRANCH/FIX_BRANCH/RELEASE_PREFIX/POLICY_ID/PI_FORMAT/PI_FIRST/VERIFY_FAST_CMD`，ctx 由阶段 1 录取 + 派生填充
3. **ctx 派生**（assemble.mjs 或 SKILL.md 装配规则）：`VERIFY_FAST_CMD` 按主栈派生（rust/go/python→`make verify-fast`，node→`npm run verify:fast`）；`PI_FIRST` 派生自 PI_FORMAT + YEAR（`<N>`→1、`YYYY`→YEAR）

> 注：substitute.mjs 现仅支持 `{{WORD}}`（`\w+`），不支持带参变量。本设计不引入带参变量，所有新变量均为简单 `{{VAR}}`。其余条件装配全复用现有 `<!--IF:-->` / `<!--require:-->` / `{{FILE:}}` / `{{FPATH:}}` 机制。

### 7.2 init-code-repo 阶段 1 录取新增

| 项 | 触发条件 | 选项 | 用途 |
|---|---|---|---|
| 分支模型 | agent-policy 激活 | 默认(dev/main/fix/release/v) / 自定义 | {{DEV_BRANCH}}/{{MAIN_BRANCH}}/{{FIX_BRANCH}}/{{RELEASE_PREFIX}} |
| Policy 标记 | agent-policy 激活 | 默认 `{{PROJECT_NAME}}-Agent-Policy: 1.0` / 自定义 | {{POLICY_ID}}，check-agent-policy 断言 |
| PI 命名格式 | pi-cadence 激活 | 默认 `YYYY-PI<N>` / 自定义 | {{PI_FORMAT}} |
| verify-fast 命令 | agent-policy 激活 | 按主栈派生（不问） | {{VERIFY_FAST_CMD}}：rust/go/python→`make verify-fast`，node→`npm run verify:fast` |

### 7.3 可选组件表新增 3 行

| 组件 | cond | 新增 | 副作用 |
|---|---|---|---|
| Agent 策略与执行门禁 | agent-policy | dev-workflow-rules 治理段 + agent-governance 4 文档 + check-agent-policy.mjs + settings.json 重写 + 各 stack verify 目标 + AGENTS Policy 段 + lefthook verify-fast | 自动被 dev-flow-skills 激活 |
| 研发流程 skill 三层 | dev-flow-skills | docs/skills/{dev-flow,test-spec,design-review}.md + .claude/skills/ 薄入口 + check-test-spec-consistency.mjs | 自动激活 agent-policy |
| 研发迭代(PI)体系 | pi-cadence | ROADMAP/AGENTS/HANDOVER 的 PI 段 | 独立 |

### 7.4 runtime-adapters 扩展

现有：`runtime-adapters/claude-code/.claude/settings.json.tmpl`。新增子树：
```
runtime-adapters/claude-code/.claude/skills/
  dev-flow/SKILL.md.tmpl
  test-spec/SKILL.md.tmpl
  design-review/SKILL.md.tmpl
```
assemble 规则已支持（`runtime-adapters/<rt>/**` → 仓根保留相对路径），薄入口正确落到目标仓 `.claude/skills/<skill>/SKILL.md`。无新机制。

### 7.5 dev-workflow-rules 向后兼容迁移

现有线性 8 步版不删，用条件分支共存：
```
<!--IF:agent-policy-->
... 治理版（分支模型 + T0-T3 + 4步骨架 + 阻断分类）...
<!--ELSE-->
... 现有线性 8 步版（保留 full-workflow 子条件）...
<!--/IF:agent-policy-->
```
- 不装 agent-policy → 线性版（旧场景 golden 不变，向后兼容）
- 装 agent-policy → 治理版

### 7.6 CLAUDE.md 单行化

agent-policy 激活时，`CLAUDE.md.tmpl` 内容为单行 `@AGENTS.md`（条件分支：agent-policy 激活→单行；ELSE→现有 16 行铁律版）。check-agent-policy 断言此不变量。

## 8. 测试

### 8.1 新增场景（tests/scenarios + golden）

| 场景 | 装配 | 验证 |
|---|---|---|
| `agent-policy` | 仅 agent-policy | 治理版 rules + settings.json allow/ask/deny + check-agent-policy + verify 目标 + agent-governance 4 文档；CLAUDE.md 单行 |
| `dev-flow-skills` | dev-flow-skills（自动带 agent-policy） | 三 skill SSOT + 薄入口 + 一致性脚本；agent-policy 全套也在 |
| `pi-cadence` | pi-cadence | ROADMAP PI 段骨架 + TODO 占位（无实例） |
| `full-governance` | 三层全装 | 全套 + PI 段 + 三 skill |

### 8.2 回归红线

现有 9 个 golden 场景 expected-tree.json 必须不变（证明向后兼容：不装新组件时 dev-workflow-rules 仍线性版、CLAUDE.md 仍 16 行）。

### 8.3 死链校验

阶段 5 死链校验覆盖新链接：dev-flow skill → dev-workflow-rules、test-spec skill → dev-workflow-rules L1-L3 段、design-review 薄入口 → docs/skills/design-review.md、AGENTS PI 段 → ROADMAP。所有条件组合下无死链。

## 9. YAGNI（不做）

- agent-governance 自动同步/哈希锁（人工同步，两个迭代后再评估）
- codex/opencode 的 .claude/skills 等价适配器（经 AGENTS.md 指针读 SSOT 即可，需求出现再加）
- PI 实例填充（模板只放结构）
- worktree 脚本 / UPSTREAM-SYNC / ERROR_LOG / deployment stack（后续 spec）

## 10. 实施顺序（供 writing-plans 展开）

1. conditional.mjs 加一行 + 阶段 1 录取新增项 + 组件表新增 3 行（机制地基）
2. agent-policy 组件全部模板文件 + 治理版 dev-workflow-rules 条件分支 + CLAUDE.md 单行条件 + settings.json 重写 + 各 stack verify 目标
3. dev-flow-skills 三 skill SSOT + 薄入口 + 一致性脚本
4. pi-cadence 三处 PI 段
5. 4 个新测试场景 + golden + 回归验证 9 场景不变
6. 死链校验全组合通过
