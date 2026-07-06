# init-code-repo 扩展设计：多仓模式 + HTML 视图 + 北极星 + 起草 + 完整性门控 + fill skill

> **状态**：设计已与用户逐段确认通过，待写入实现计划。
> **日期**：2026-07-06
> **性质**：过程文档（非 SSOT），仅留追溯。
> **前置**：init-code-repo v1（Plans 1-4 + docker/design 补全）已合并 main，28/28 测试通过。

---

## 1. 背景与目标

init-code-repo v1 解决了"单仓初始化骨架"，但用户验证发现四个盲区：

1. **多仓模式**：BaiWang 是多仓组织（apiserver/web/deployment/docs），单仓 skill 无法表达"组件仓 + 中央 docs 仓"的跨仓文档感知。
2. **TODO 腐烂**：骨架留 `（TODO: ...）`，用户跳过，永驻空白——"虚假 SSOT"温床。
3. **设计诱导缺失**：商业/产品/架构/UI/功能/接口设计怎么诱导用户实际填写？
4. **呈现单薄**：markdown 对架构/UI 的视觉呈现有限，HTML 静态页更强。

另修正一处 v1 的模型错误：`system-architecture.md` 被标为"目标层（北极星）"，实为桥梁层。

### 目标

- 多仓组织模式（三档角色 + component.yaml + 中央仓注册表 + 聚合脚本）。
- HTML 设计视图（生成式站点 + 手写视觉资产），不破坏 SSOT。
- 北极星拆分（独立 north-star.md，SADS 降桥梁层）。
- 起草非留白（阶段 4 agent 起草能起草的）。
- 完整性门控（阶段门→必填文档映射 + TODO 残留扫描阻断）。
- 配套 fill-design-doc skill（逐节消灭 TODO）。

---

## 2. 关键决策（与用户确认）

| # | 决策 | 选择 |
|---|---|---|
| 1 | 组件发现机制 | 中央仓注册表（手工维护 registry.yaml），聚合脚本 clone/pull 各仓 component.yaml |
| 2 | HTML 形态 | 两者都要：docs-site（VitePress 生成站）+ views/*.html（手写视觉资产） |
| 3 | 北极星落地 | 拆分：独立 `02-design/north-star.md`（目标层），SADS 降桥梁层 |
| 4 | 起草策略 | 阶段 4 agent 起草结构性/技术性内容，领域知识留 TODO 交 fill skill |
| 5 | 完整性门控 | 阶段门→必填文档映射（ROADMAP 可配）+ 发布门控扫 TODO 残留阻断 |
| 6 | fill skill | 独立 skill `fill-design-doc`，类 brainstorming 逐节带填 |

---

## 3. 多仓组织模式

### 3.1 三档初始化

skill 阶段 1 新增"仓角色"问：

| 角色 | 装什么 |
|---|---|
| **单仓**（v1 现有）| 完整骨架，自包含 |
| **组件仓**（多仓子仓）| 单仓骨架 + `doc/component.yaml` 自描述 + AGENTS.md 顶部"跨仓文档见 `<central-url>`"段 |
| **中央 docs 仓**（`*-docs`）| 精简骨架 + 聚合脚本 + 跨仓视图模板 + `docs/components/registry.yaml` 注册表 |

### 3.2 `doc/component.yaml` schema（组件仓自描述）

```yaml
name: {{PROJECT_NAME}}
type: self              # self / fork / upstream
one-line: {{ONE_LINE}}
repo: {{REPO_URL}}      # 阶段 4 由 agent 跑 `git remote get-url origin` 填
layer: ""               # 所属架构层（按本组织分层约定）
depends-on: []          # 依赖的其他组件 name 列表
exposes: []             # 对外暴露接口 [{kind, path/name}]
consumes: []            # 消费的其他组件接口 [{from, kind, path}]
single-repo-docs:
  charter: docs/00-charter/
  architecture: docs/02-design/system-architecture.md
  deploy: infra/docker/
```

### 3.3 中央 docs 仓

```
*-docs/
├── docs/
│   ├── components/registry.yaml     # 手工维护：组件仓 URL 列表
│   ├── architecture-overview.md     # 聚合生成（视图，非源）
│   ├── adr/                          # 跨仓 ADR（只追加，军规 C）
│   ├── contracts/                    # 跨仓契约矩阵（聚合 exposes×consumes）
│   └── deployment-overview.md
├── scripts/aggregate.mjs            # 读 registry → clone 各仓 → 读 component.yaml → 生成 architecture-overview.md + contracts 矩阵
└── AGENTS.md                         # 跨仓规则：本仓视图非源
```

`registry.yaml` 模板（注释示例，不写死真实仓）：
```yaml
components:
  # - name: <component-name>
  #   repo: <repo-url>
  #   branch: main
```

### 3.4 跨仓感知机制

- 组件仓 AGENTS.md 顶部（多仓模式时装配）：
  ```
  ## 跨仓文档
  本仓是多仓组织的组件仓。跨仓文档（架构总图/ADR/契约/总部署）见中央 docs 仓：<central-url>。
  改本仓 component.yaml 后，须通知中央 docs 仓刷新（或中央仓 aggregate 脚本自动拉取）。
  ```
- agent 工作时读 AGENTS.md 顶部即知跨仓文档去中央仓查。
- 中央仓 `scripts/aggregate.mjs`：按 registry 浅克隆各仓 → 读 `doc/component.yaml` → 生成 `architecture-overview.md`（Mermaid 图按 layer 分组）+ `contracts/` 矩阵（exposes×consumes 交叉表）。

### 3.5 配置字段

阶段 1 新增：
- `repoRole`: `single` / `component` / `central-docs`
- `centralDocsUrl`（component 角色时问）：中央 docs 仓 URL
- `orgComponents`（central-docs 角色时问）：初始组件仓列表（写入 registry.yaml，可后续手工补）

---

## 4. HTML 设计视图

原则：**markdown 是源，HTML 是视图**。不破坏 SSOT。

### 4.1 形态 A：生成式站点（可选组件 `docs-site`）

- VitePress（markdown-first，原生 Mermaid）把 `docs/` 渲染成静态 HTML 站点。
- 用户继续写 markdown，零额外编写得 HTML 呈现（导航/搜索/Mermaid 渲染/响应式）。
- 构建产物 `dist/` 不进 git（或单独分支），非 SSOT。
- 构建是维护者侧操作（Node.js），不违背 dual-path 的 end-user 零依赖。
- 装配：`docs/.vitepress/config.ts.tmpl` + `package.json` 的 `docs:build` 脚本（require:docs-site）。

### 4.2 形态 B：手写视觉资产（`docs/02-design/views/*.html`）

- 手写 HTML 视觉页：交互式架构图、UI mockup、SVG 流程图等 markdown/Mermaid 表达不了的。
- **资产（非 SSOT）**，从 markdown 文档链接引用；markdown 是文字 SSOT，HTML 是视觉补充。
- `doc-governance.md` 标注：HTML 视图与 markdown 冲突以 markdown 为准。
- dead-link 检查扩展：扫描 `.html` 文件内的 `<a href>` 与 markdown 链接。

### 4.3 可选组件

`docs-site`（生成站）+ `design-views`（views/*.html 目录）作为两个独立可选组件，按需选。

---

## 5. 北极星拆分

### 5.1 模型修正

v1 把 `system-architecture.md` 标为目标层（北极星），错误。修正：

| 层 | 文件 | 角色 |
|---|---|---|
| 目标层（北极星）| `02-design/north-star.md` | 技术能力终点，权威终点·**永不废弃**·允许领先现实 |
| 现实层 | 实测代码 + 当前基线 | 当前所在，以实测为准 |
| 桥梁层 | `02-design/system-architecture.md`（SADS）+ `HANDOVER.md` | 描述如何从现实走向目标 |

- 北极星：aspirational 终点，稳定，永不废弃。
- SADS：当前架构设计，evolving，会随版本演进被新 SDS 替代。

### 5.2 模板

新增 `02-design/north-star.md.tmpl`（require:product-docs）：

```markdown
# 北极星 — 技术能力终点

> 目标层（北极星）：本产品最终要达到的技术能力终点。**永不废弃**，允许领先于现实。
> 与 [system-architecture.md](system-architecture.md)（桥梁层：当前架构设计）区分：本文件描述"要去哪"，SADS 描述"现在怎么走向那"。

## 终态愿景
（TODO/fill：技术能力终点的 aspirational 描述。从一句话定位与 charter 推导。）

## 不变量（永不废弃的核心承诺）
（TODO/fill：无论怎么演进都不放弃的核心能力/约束。）

## 允许领先现实的部分
（TODO/fill：当前未实现但已写入终态的部分。标注"领先现实"。）
```

### 5.3 影响面

- `guardrails.md.tmpl` 六层模型：目标层 → `north-star.md`；桥梁层 → `system-architecture.md` + `HANDOVER.md`。
- `AGENTS.md.tmpl` product-docs 六层段：同步修正。
- `design-completeness-rules.md`：P0 必填含 north-star.md。

---

## 6. 起草非留白

### 6.1 阶段 4 升级

SKILL.md 阶段 4 从"指 TODO"改"起草初稿"。agent 基于已采集信息起草能起草的，留 TODO 只给真正需要用户领域知识的。

### 6.2 起草规则

| 文档 | 可起草（agent 自动） | 需用户领域知识（留 TODO/fill skill）|
|---|---|---|
| `concept.md` | 一句话定义（one-line）、它是什么（one-line 改写）| 核心概念（领域术语）|
| `north-star.md` | 从 one-line + charter 推导 aspirational 终点草稿 | 终态愿景细节、不变量 |
| `system-architecture.md` | 构建块视图（按 stacks+repoShape）、技术栈段（按 stacks）| 领域模型、运行视图时序 |
| `component.yaml` | name、one-line、repo（`git remote get-url origin`）、single-repo-docs 路径 | layer、depends-on、exposes、consumes |
| `api-reference.md` | 通用约定层、错误码（已有）| 接口列表 |
| `entity-model.md` | 实体模板格式 | 实体字段、关系 |

### 6.3 SKILL.md 落地

阶段 4 每节给"可起草内容"提示，agent 先填能填的，再对剩余标 TODO 并提示用 fill-design-doc skill 填。

### 6.4 阶段 5 末尾主动引导 fill-design-doc

init-code-repo 阶段 5（验收）末尾，agent **主动询问用户是否调用 fill-design-doc**：列出当前残留 TODO 清单（按文档归类），提示"是否现在用 fill-design-doc 逐节填充？"。用户同意 → agent 调用 fill-design-doc skill；用户拒绝 → 在 HANDOVER.md 记录"待填充 TODO 列表"作为下轮首做。这闭环了 init→fill 的衔接，避免 TODO 被遗忘。

---

## 7. 完整性门控

### 7.1 阶段门→必填文档映射

新增 `rules/design-completeness-rules.md`（core 必带）。默认映射（在 ROADMAP.md 可配置）：

| 阶段门 | 必填（非 TODO）设计文档 |
|---|---|
| P0 | charter（concept+guardrails+vision-strategy）+ north-star + ROADMAP |
| P1 | + system-architecture（当前态）+ entity-model + api-reference |
| P2 | + ui-design + functional-design + test-spec 完整 |
| P3 | + ADR 审视 + debt 收口 |

### 7.2 检查机制（双路径）

- **agent 路径**（SKILL.md 阶段 5 + dev-workflow 第 8 步）：agent 读 HANDOVER.md 顶部"当前阶段门" → 查映射 → 扫描必填文档 `（TODO: ...）` 残留 + 空节 → 列未填项 → 阻断发布门控。
- **引擎路径**（`scripts/check-completeness.mjs`）：同逻辑，`npm run check:completeness -- --stage P1`，golden 测试覆盖。

### 7.3 与 HANDOVER/ROADMAP 配对

当前阶段门值从 HANDOVER.md 顶部读取（与 ROADMAP 配对）。发布前 agent 读当前阶段门 → 查映射 → 扫残留 → 阻断或放行。

---

## 8. fill-design-doc skill

独立 skill（与 init-code-repo 同级），名 `fill-design-doc`。

### 8.1 触发

`/fill-design-doc <文档路径>` 或自然语言"帮我填 system-architecture"。

### 8.2 流程（类 brainstorming）

1. 读目标文档章节结构 + 已有内容 + 上下文（AGENTS.md、north-star、代码结构、component.yaml）。
2. 逐节追问：对每个 TODO/空节，提 1-2 个具体问题（如"本组件对外暴露哪些接口？列出方法+路径+用途"，而非"请填写"）。
3. 用户口述 → agent 起草该节 → 用户确认/修正 → 写回文档。
4. 完成后刷新 HANDOVER.md（记录"填充了 X 文档 Y 节"）+ 触发完整性门控重扫。

### 8.3 与 init-code-repo 的关系

init-code-repo 起草初稿 + 标 TODO；fill-design-doc 逐节消灭 TODO。两者共享同一套文档结构与完整性门控规则。

### 8.4 安装

与 init-code-repo 一起装到 `~/.claude/skills/`，独立 skill。

---

## 9. 影响面汇总

### 新增模板

- `templates/core/docs/02-design/north-star.md.tmpl`（require:product-docs）
- `templates/core/docs/rules/design-completeness-rules.md.tmpl`（core 必带）
- `templates/core/docs/02-design/views/.gitkeep`（require:design-views）
- `templates/core/docs/.vitepress/config.ts.tmpl` + package.json docs 脚本（require:docs-site）
- `templates/core/doc/component.yaml.tmpl`（require:multi-repo-component）
- `templates/central-docs/`（中央仓专属：registry.yaml.tmpl + aggregate.mjs + 跨仓视图模板）
- `templates/central-docs/scripts/aggregate.mjs`

### 修改模板

- `AGENTS.md.tmpl`：加跨仓文档段（component 角色）+ 六层模型修正（north-star 目标层、SADS 桥梁层）+ design-completeness 索引行 + docs-site/design-views 索引（若选）
- `guardrails.md.tmpl`：六层模型修正
- `SKILL.md`：阶段 1 加仓角色问 + 阶段 4 起草规则 + 阶段 5 完整性门控 + 阶段门映射 + HTML 视图说明
- `dev-workflow-rules.md.tmpl`：第 8 步发布门控加完整性检查
- `doc-governance.md.tmpl`：HTML 视图非 SSOT 标注

### 新增 skill

- `skills/fill-design-doc/SKILL.md`

### 引擎扩展

- `assemble.mjs`：支持 `repoRole` → 装配 component.yaml / central-docs 内容；新 conds：`multi-repo-component`、`central-docs`、`docs-site`、`design-views`。
- `scripts/check-completeness.mjs`：完整性检查预言机。
- dead-link 检查扩展：扫描 `.html`。

### 新增可选组件

- `docs-site`（VitePress 生成站）
- `design-views`（views/*.html 手写资产）

---

## 10. 开放问题（实现阶段决定）

1. `aggregate.mjs` 浅克隆各仓的鉴权（私有仓需 token）——实现时支持 `GIT_TOKEN` 环境变量或 `git config` 凭证。
2. VitePress 版本与 Mermaid 插件选型——实现时定。
3. `check-completeness.mjs` 的"空节"判定阈值——空节 vs 仅含模板标题的节，实现时定。
4. fill-design-doc skill 的上下文窗口策略（大文档逐节读 vs 全读）——实现时定。

---

## 11. 后续

本 spec 通过用户审阅后，进入 `superpowers:writing-plans` 制定实现计划。鉴于扩展较大，拟拆 2-3 个计划：
- 计划 A：多仓模式 + 北极星拆分 + 模板修正（不含 HTML/完整性）。
- 计划 B：HTML 视图（docs-site + design-views）+ dead-link 扩展。
- 计划 C：起草非留白 + 完整性门控 + fill-design-doc skill。
