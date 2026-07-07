# ERROR_LOG.md — 跨会话错误记忆

> 超过两次犯同样错误时记录。规则刷新源。高频痛点提炼成规则或 skill。

---

## EL-001：模板范围越界——替用户做设计/落地决策

**发现时间**：2026-07-07
**发现场景**：init-code-repo skill 扩展过程中

### 错误表现

1. **起草非留白**（阶段 4 起草设计内容）：本想治"TODO 腐烂"，让 agent 在阶段 4 起草 system-architecture 构建块视图、north-star 终态愿景等设计内容。**实质是替用户做设计决策**——越界。
2. **fill-design-doc skill**：自建文档逐节填充 skill，与 superpowers:brainstorming / openspec 设计工作流**重复造轮子**。
3. **scaffold-code skill**：自建代码骨架 skill，与 superpowers:executing-plans / openspec 实现工作流**重复造轮子**。

### 根因

模板的定位是"骨架+规范"，但实施时受"治 TODO 腐烂""让 skill 更全能"的诱惑，逐步越界去做设计填充与代码落地——抢了 superpowers/openspec 的活。没有在一开始划清"模板定什么、工作流工具定什么"的边界。

### 预防措施（规则）

**模板范围边界准则**：

| 层 | 职责 | 归属 |
|---|---|---|
| 骨架（结构）+ 规范（规则/门禁） | 定义"是什么+必须满足什么" | 模板（init-code-repo） |
| 指挥调度（按骨架+规范驱动执行） | 读门控→调工作流工具→收口 | 指挥 skill（dev-conductor） |
| 设计→落地（实际填文档/写代码） | brainstorming/writing-plans/executing-plans/TDD | 工作流工具（superpowers/openspec） |

**判别准则**：若一个能力"替用户做设计决策"或"重复造工作流"，则越界。模板只留骨架（带 TODO 标位）+ 规范（门控强制填充）；填充与落地交工作流工具；调度交指挥 skill。

### 如何避免

- 建 skill 前先问：这是骨架/规范，还是设计/落地工作流？后者不建，交 superpowers/openspec。
- "治 TODO 腐烂"的正解是**门控强制 + 指挥 skill 调度工作流工具填**，而非模板替填。
- 指挥 skill（dev-conductor）编排工作流工具，不自己执行——边界清晰。

### 相关

- 合并 fill-design-doc + scaffold-code → dev-conductor（commit `bff5bdc` / merge `60935c3`）。
- init-code-repo 阶段 4 回退为留 TODO 骨架。
- 完整性门控（design-completeness-rules + check-completeness.mjs）保留——它是规范（门控），不是工作流。

---

## EL-002：模板文件路径引用与装配路径不一致

**发现时间**：2026-07-07
**发现场景**：init-code-repo 冒烟测试

### 错误表现

`check-completeness.mjs` 与 `design-completeness-rules.md` 的阶段门→必填文档映射写的是 `ROADMAP.md`（仓根），但实际文件在 `docs/ROADMAP.md`（HANDOVER/ROADMAP 配对在 docs 根）。导致完整性门控误报 `ROADMAP.md: missing`。

### 根因

条件装配/路径重排后，模板内的文件路径引用未与实际装配路径同步。映射写路径时凭印象写"根"，忘了 ROADMAP 已升至 docs 根。

### 预防措施（规则）

- 模板内任何文件路径引用（映射表、markdown 链接、require 标记）必须与实际装配路径一致。
- 装配后跑死链检查 + 完整性门控冒烟测试，捕获路径不一致。
- 路径重排（如文件升至 docs 根）时，grep 全仓引用同步刷新（军规 J：变更即审视回刷）。

### 如何避免

- 改文件位置后，`grep -r <旧路径>` 全仓，同步所有引用。
- golden 测试只测引擎装配正确，测不出"映射路径与实际路径一致"——必须真跑门控脚本冒烟。

### 相关

- 修复 commit `19e1cd6`（ROADMAP 路径根→docs/ROADMAP.md）。

---

## EL-003：命名/路径变更后引用适配分层且易漏 + 自动化改造误伤

**发现时间**：2026-07-07
**发现场景**：用户可选文档命名（en/zh/custom）功能上线后审视

### 错误表现

1. **引用适配分层漏改**：命名功能初版只包裹了 markdown 链接 target（`{{FILE:}}`），漏了 4 类引用：inline code（反引号）、代码块（仓结构图）路径、markdown 链接**文字**、脚本 MAPPING。zh 模式下出现"链接文字英文、target 中文"或"inline code 英文、实际文件中文"的不一致。
2. **自动化 sed 误伤**：用 `sed s/}}')/}})/g` 修 markdown 链接损坏时，误删了 `check-completeness.mjs.tmpl` 里 JS 字符串 `join(root, '{{FPATH:docs/HANDOVER.md}}')` 的闭合引号 → 装配产物语法错误，脚本无法运行。

### 根因

- 引用类型多（链接 target / inline code / 代码块 / 链接文字 / 脚本 MAPPING / 映射表），每类用法不同（相对化与否、basename 与否），凭印象改易漏层。
- 自动化 sed 按文本模式替换，不区分 markdown 链接上下文与 JS 字符串上下文，误伤后者。
- golden 树测试只验文件清单，不验脚本可运行；JS 语法错误测不出。

### 预防措施（规则）

**引用适配分层清单**（命名/路径变更后逐项审计）：

| 引用类型 | 占位符 | 用法 |
|---|---|---|
| Markdown 链接 target | `{{FILE:path}}` | 相对当前文件目录相对化 |
| Inline code（反引号） | `{{FNAME:path}}` | 仅映射 basename，保留目录上下文 |
| 代码块路径 | `{{FNAME:path}}` | 同上 |
| Markdown 链接文字 | `{{FNAME:path}}` | 同上 |
| 脚本 MAPPING（JS 字符串）| `{{FPATH:path}}` | 绝对路径，不相对化 |
| 映射表 inline code | `{{FPATH:path}}` | 同上 |

**自动化改造纪律**：
- sed/正则批量替换后，必须跑全量测试 + **真跑产物脚本**（如 `node <assembled>/scripts/check-completeness.mjs`）验证可运行。
- sed 模式须区分上下文（markdown `}})` vs JS `}}')`）；拿不准时用 node 脚本带上下文判断，而非盲 sed。
- en 模式恒等是纪律线：新占位符在空映射下须输出原值，既有 en 测试零变化。

### 如何避免

- 命名/路径变更后，用审计脚本 grep 全仓可映射文件名，逐类（inline code / 链接文字 / 代码块）核对包裹。
- 自动化改造后必跑：`npm test`（树+内容）+ 真跑产物脚本（验语法+运行）+ zh 模式死链检查（验相对化正确）。
- 三种占位符（`{{FILE:}}`/`{{FPATH:}}`/`{{FNAME:}}`）按"相对化/绝对/basename"分工，不混用。

### 相关

- 修复 commit `1ea5d60`（包裹链接文字 + 修 sed 误伤的 JS 字符串）。
- 三占位符见 `skills/init-code-repo/naming.mjs`。
