# 以权威设计闭环纠正v2的吸纳偏差

> 状态：被Astra整体重审替代的补丁草稿，保留现场，不实施。当前主方案为docs/research/2026-11-16-agent-harness/REDESIGN-PROPOSAL.md。
本轮用户反馈是目标澄清和对已授权实施的纠偏。原研究的“通用化”过度削弱了源核心机制。机器任务工具是支撑，不能代替设计权威体系。

## 源事实与缺口

| 源机制 | 源路径与行 | 当前v2缺口 | 本轮纠正 |
|---|---|---|---|
| 项目宪法、统一政策入口、有限续接 | 源`.specify/memory/constitution.md:8–39`；`AGENTS.md:3–5,38–64` | 无宪法，AGENTS主要是通用安全摘要 | 默认宪法；AGENTS是政策与权威地图入口，不是设计正文或计数仓库 |
| Spec Kit管规范、superpowers管方法与实现 | 源`.claude/skills/e2e-dev-flow/SKILL.md:28–78,93–117,138–143` | 两者仅被写成“可选辅助”；无明确调用和落点 | 默认e2e编排正文，逐阶段映射真实工具调用、输入/产物/退出；缺工具显式同契约替代，不降低门禁 |
| 系统级/域级/事实账本/台账唯一归宿 | 源`docs/rules/doc-ssot-rules.md:5–26`；`specs/README.md:3–7` | 泛称accepted设计，没有唯一系统/域权威；域是可选 | 默认系统设计、域规格、事实账本/台账分层，机器定位表只存路径/职责，不冒充设计内容 |
| 复用域活spec而非每变更新建设计 | 源e2e:10–14,45–51；宪法:8–18 | task/domain模板可各自长期长出设计；无域绑定 | 开工绑定已注册域并记录基线；新域先裁决职责和注册，不自动为每任务立域 |
| converge回刷与机器完成门 | 源`docs/rules/dev-workflow-rules.md:15–27`；policy项11等 | 完成凭据不检查权威设计回刷 | 设计来源/重复权威检查；完整验证须有每个受影响权威/事实资产的回刷或“不需修改”依据 |

源流程顺序、API回刷、检查数量和verify-release漂移继续保留未裁决。模板采用既有8阶段，明确设计阶段含plan/tasks/test-design、实施前analyze和实施后验收复核；这是模板选择，不宣布源哪份正确。

## 取舍

A仅扩写现有文档不能阻止新副本膨胀或缺回刷仍完成，不采用。B将权威设计和e2e编排提升为默认底座，并补可证伪完成门，采用。C整复制AWB目录/脚本会带入业务和冲突，不采用。

## 默认权威层次与唯一归属

1. 用户/宿主指令优先；仓内宪法只定义项目内部治理优先级。
2. `.specify/memory/constitution.md`规定项目不变量；AGENTS提供公共政策摘要、续接、规则/权威来源索引；rules展开规则。三者不复写业务设计。
3. `docs/00-charter/`、`docs/01-product/`及north-star保留战略/产品/远期目标的独立角色，不能冒充当前详细实现设计。
4. `docs/00-system/system-design.md`唯一系统级设计；`domain-model.md`唯一共享数据模型。域spec只描述域职责/需求验收/结构流程/决策/红线，数据和部署只引用系统权威。已有02-design/system-architecture及entity-model改为指针兼容页，不再维护第二份正文。
5. `specs/<domain>/spec.md`是该域持续维护的权威活规格；默认注册001-repo-governance解释本项目harness本身。新业务先查复用，只有独立域才注册新增。域决定权限/数据边界时仍需人工审阅，不让路径匹配自动裁决架构。
6. `docs/02-design/`持有明确注册的API/测试/其他事实或专门设计资产；每项登记权威职责，不得作为随手新增设计文件的容器。
7. `docs/tasks/<ID>/task.md/task.json`只存变更提议、任务/验收/进度/证据和权威指针；plan/tasks/implement细稿默认本地临时目录。共享执行摘要保留跨机续接所需信息，不能取代域设计。已有历史保留，不默认删除；新任务不得继续向旧superpowers目录堆正式设计。
8. HANDOVER短摘要、ledger累积记录是上下文/追溯；Git历史承载历史版本，不创造多份“当前权威”。本轮没有Git提交授权，不靠创建提交完成收敛。

## 文件与工具

project.design保存constitution/system/domain目录、`authorities[{id,kind,path,role}]`和legacy指针列表。它只定位权威，不承载设计正文。完整性覆盖系统真实文件，旧兼容页不算设计填充。

默认`docs/skills/e2e-dev-flow/SKILL.md`是生命周期方法正文；dev-conductor和dev-flow都导入。Spec Kit提供specify/clarify/plan/tasks/analyze/implement/converge规范动作；superpowers对应brainstorming/writing-plans/TDD/debug/verification/review。已安装时应实际调用并覆盖默认落点；不可用时报告，执行同输入/输出/审核的仓内替代步骤。外部skill及命令实现不谎称随仓提供，不需要平台服务或自动安装。

## 机器闭环

- `core.authority`：检查必需权威文件、域结构/沿革、registry与标记一对一、默认e2e入口可达、兼容页仅转引；新增域未注册/重复权威/过程稿成为活文档依赖应失败。允许存在历史，禁止活权威依赖历史。
- task开工`create --domain <已注册spec路径>`或`bind-domain`绑定域并记录系统/域/受影响事实资产的字节基线。未绑定的orient任务可存在，但不得进入实施或完成验证。
- 完整验证强制`core.design-sync`：按绑定范围与impact要求所有权威/事实资产均给出`updated`或`reviewed-unchanged`结果、理由、验收check引用与当前hash；声明未改而文件已变、声明更新而未变、遗漏域、增加未注册域等应阻断。实际设计变化还须追加沿革并指回当前任务。
- verify阶段先检查实现；converge裁决偏差并回刷；handover前最后complete验证包含上述门禁。门禁通过只证明结构/路径/回刷证据闭合，不能证明自然语言需求或架构语义正确。
- 内容变更使旧完整验证失效。taskContext包含domainRefs、designBaseline、convergence，finish重新核验并要求本轮design-sync真实pass，防止仅填阶段note结束。

## 验收（替换此前以工具为中心的完成口径）

- G01 minimal和无扩展skill配置也生成宪法、系统设计/域规格、e2e正文及权威地图；旧域开关不再移除底座。
- G02 同一系统/域职责只能有一个登记权威；未登记spec、伪副本、活文档依赖archive/superpowers/task过程稿均被发现。
- G03 使用现有域修订可端到端收敛；不能只新增task或新版历史设计绕过回刷。
- G04 未绑定域/漏回刷/虚报未修改/更新未留沿革/缺API或模型资产去向时，已有测试全绿也不得完成。
- G05 Spec Kit+superpowers阶段/产物/落点有逐项映射；缺工具不伪调用，不削弱权威与收敛；既有授权不重复询问。
- G06 中英文命名、全部v1场景和现有v2安全/升级回归仍保留；旧正文兼容路径明确指向新权威，不自动清退历史。
- G07 模板维护仓自身也能明确回答“当前设计权威在哪”；研究/报告不得作为另一套正式设计。
