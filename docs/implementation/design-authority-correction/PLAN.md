# 持续设计治理实施计划

> 执行：superpowers:writing-plans → executing-plans + TDD。用户已批准整体重审方案并要求实施；不重复请批，不提交/推送/发布/清场，不迁移删除历史。

Spec：../../research/2026-11-16-agent-harness/REDESIGN-PROPOSAL.md。旧补丁设计不是实施基线。

## 约束与接口

- 先写维护仓真实系统设计与装配、开发治理、验证三个域设计；Accepted目标和Observed实现状态分别说明。
- 默认生成宪法、系统设计骨架、长期域索引/具体模板与e2e正文；新项目域在识别实际职责后创建，不硬塞治理业务域。
- Spec Kit组织specify/clarify/plan/tasks/analyze/implement/converge，superpowers提供探索/计划/TDD/debug/verification/review；共享同一工件。方法不可用明确记录等价步骤与范围。
- 重型过程材料默认域内plan/tasks/implement忽略；可选本地任务助手不作为设计权威，不默认每变更入库两文件。
- 不新建权威注册平台/更多状态机；最小检查消费实际Markdown域索引和设计文件，结构与语义审查分开。
- 安全装配、命名、v1回归和升级保护复用；现有v2 helper回归改为真实设计样本，不降低原断言。

## Review Focus

- 同域多轮变化是否仍只有同一设计正文；未实现目标不能被称为交付。
- 跨域/公共契约影响是否遗漏一个owner；简单注册/hash不能替代审查。
- 没有域设计或没有语义审查，工具绿也不能任务完成。
- 临时产物是否逃回tracked文档；新检出缺草稿是否仍能解释当前设计/未完成工作。
- 外部方法是否实际可用、调用与落点是否如实；不伪造Speckit成功。

## Task 1 系统/域成品与使用样本

Files: .specify/memory/constitution.md、docs/00-system/system-design.md、specs/README.md、specs/{001-repo-assembly,002-development-governance,003-verification}/spec.md；skills/init-code-repo/examples/governed-project/**。
- [x] 写可填实、职责互引的系统与域设计，关联当前代码和计划/观察状态。
- [x] 提供中性两个域样本，明确共享不变量、验收、设计批准与实现状态。

## Task 2 默认模板与方法路由

Files: templates/v2/.specify、docs/00-system、docs/guides、docs/skills/e2e-dev-flow、specs/README；project.mjs/assemble.mjs/contracts；根/生成AGENTS与两技能。
Interfaces: documents.{constitution,systemDesign,domainModel,contracts,domainIndex,e2e}只定位；域index的Markdown链接定位唯一spec；不另建JSON设计源。
- [x] 先写默认minimal设计底座、目录职责/模板、方法链和忽略规则反例，运行RED。
- [x] 默认输出治理底座；产品/栈选项不能关闭它。旧系统设计路径为单一正文的兼容指针。
- [x] 每阶段有输入、方法嵌套关系、唯一产物落点、测试双重对照及退出/回退；用本地可用superpowers，记录Spec Kit缺失。

## Task 3 最小设计/收敛检查

Files: templates/v2/scripts/harness/design.mjs、checks/model/runner/task；tests/v2/design.test.mjs。
Interfaces: designSources(root,project,domainRefs)从Markdown查所属域和公共owner；checkDesign检查结构/引用/过程跟踪；checkConvergence检查验收逐项和明确的语义审查/回刷去向，不宣称自动证明语义。
- [x] 先写无设计、未注册域/重复副本、过程稿依赖、缺owner回刷、语义审查失败但测试绿仍阻断的反例。
- [x] complete须真实域设计及收敛证据；finish拒绝旧的仅policy凭据。可选task草稿进入忽略区，不强制所有人使用UUID引擎。
- [x] 缺方法/工具、缺必要证据如实blocked，不放宽风险或范围。

## Task 4 连续演进验收

Files: tests/v2/evolution.test.mjs、governed-project样本；现有v2 helpers/tests。
- [x] 同域三次真实行为变化，先失败再改代码/同一spec，保留决策取代关系；无三套长期设计。
- [x] 跨域契约/取消语义，两个域和公共不变量都更新；注入普通单测绿但违约的实现，用独立行为断言/语义审查发现。
- [x] 仅复制共享快照到新临时目录，缺本地过程稿时仍能定位设计和未完成条件；不清理真实工作区。
- [x] 域归属/方法应用由fresh Astra读取样本评审，不能仅靠字段断言。

## Task 5 整体验证与收敛

- [x] 更新同一维护域设计与HANDOVER，研究/旧实施报告保留为历史记录而非设计源。
- [x] 全量npm test、npm run check、diff/链接检查；保留v1 golden。
- [x] Astra/xhigh做独立整体审阅，按真实影响修复重要缺口，记录方法/平台/长期规模尚未验证的范围。
