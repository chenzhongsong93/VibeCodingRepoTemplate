# 完整工程机制吸纳清单（Astra整体重审版）

状态：**目标契约与差距清单，不是已收纳完成证明。** 本文替换以工具改造为中心的旧清单。两路独立gpt-6-astra/xhigh从源仓与目标方案重新审读，主代理复核核心原文；事实与建议分开。整体方案见[REDESIGN-PROPOSAL.md](REDESIGN-PROPOSAL.md)。

源为`/root/code_repo/AWB/OperatorMapService`的`spec_clean@5970809`。每条来源链接带行号；源规则有定义不代表已被所有平台/CI执行，也不保证其实现覆盖全部语义。下表“目标当前判断”保留整体重审时的差距基线；用户随后已批准实施，最新实现/验证状态以[长期域设计](../../../specs/README.md)和[当前交接](../../HANDOVER.md)为准，不能把旧差距表当当前实现清单。

## 本轮实际落点与验证边界

以下是用户批准后针对模板的新实现，不是声称源仓已经完备实现。源出处/原缺口仍见后表和EVIDENCE。

| 吸纳的工程语义 | 当前模板落点 | 已有证据与未证明范围 |
|---|---|---|
| 宪法、AGENTS政策地图与系统/域设计分层 | [默认AGENTS](../../../skills/init-code-repo/templates/v2/AGENTS.md.tmpl)、[宪法](../../../skills/init-code-repo/templates/v2/.specify/memory/constitution.md.tmpl)、[系统模板](../../../skills/init-code-repo/templates/v2/docs/00-system/system-design.md.tmpl) | DES-01/04/05；默认不能用组件关闭治理；维护仓自身已有三个填实域 |
| Spec Kit规范链和superpowers执行方法共用产物 | [e2e正文](../../../skills/init-code-repo/templates/v2/docs/skills/e2e-dev-flow/SKILL.md.tmpl)、[方法适配](../../../skills/init-code-repo/templates/v2/docs/guides/method-adapters.md.tmpl) | 阶段输入/产物/退出、TEST-DESIGN/DUAL-REVIEW/analyze/converge已定义；独立两轮已应用superpowers 7.0.2和等价规范链并复用原落点，Spec Kit未安装/未调用 |
| specs是长期特性功能设计、同域就地演进和批准/实现状态分开 | [完整活规格模板](../../../skills/init-code-repo/templates/v2/docs/guides/living-spec-template.md.tmpl)、[填实两域样本](../../../skills/init-code-repo/examples/README.md) | EVO-01同域三轮，原spec/决策沿革修订，未新增三套设计；样本不等于中大型系统长期效果 |
| 过程稿反膨胀和共享短交接 | [文档规则](../../../skills/init-code-repo/templates/v2/docs/rules/doc-ssot-rules.md.tmpl)、[HANDOVER模板](../../../skills/init-code-repo/templates/v2/docs/HANDOVER.md.tmpl) | plan/tasks/implement与本地助手忽略；共享副本排除细稿后能读取设计/运行验证；不清理真实历史 |
| 测试先行、需求/覆盖双重对照与真实边界 | e2e与[演进验收](../../../tests/v2/evolution.test.mjs) | 每次行为先RED再GREEN；取消反例普通单测/结构绿、新边界失败；独立Astra实际发现违约 |
| 收敛到原系统/域/专门契约/回归owner | [最小设计支持](../../../skills/init-code-repo/templates/v2/scripts/harness/design.mjs)、[真实坏例](../../../tests/v2/design.test.mjs) | DES-06至11阻断无域、无审查、失败审查、遗漏owner、错误验收ID和过程稿；新增Markdown声明是模板新设计，结构通过不证明语义真实性 |
| 治理自身接受治理、保留兼容与现场 | [维护仓域索引](../../../specs/README.md)、装配/升级既有工具 | v1 golden保留，已验证手改/路径/输入变化拒绝；没有stage/commit/push/发布/历史迁移或清场 |

## 1. 默认治理核心：重审时的源对照与差距基线

| 机制与长期问题 | 源事实/取证位置 | 必须保留的通用语义 | 目标当前判断与下一步 |
|---|---|---|---|
| 政策入口与宪法：防止多端政策分叉、入口膨胀 | [AGENTS](/root/code_repo/AWB/OperatorMapService/AGENTS.md:3)；[宪法](/root/code_repo/AWB/OperatorMapService/.specify/memory/constitution.md:8)，8–18、36–45；[CLAUDE](/root/code_repo/AWB/OperatorMapService/CLAUDE.md:1) | 宪法定义不变量，AGENTS是自足政策摘要/地图，rules展开；平台只导入；不能复制业务设计或自称高于用户/宿主 | 授权/薄入口保留较好，缺宪法及完整设计地图；必须改造，不是再压缩一段摘要 |
| Spec Kit规范链+superpowers方法链：约束AI自由发挥 | [e2e](/root/code_repo/AWB/OperatorMapService/.claude/skills/e2e-dev-flow/SKILL.md:28)，28–78、93–117、138–143 | 明确每阶段读什么、方法角色、动作/产物/落点/退出/回退；两套方法共享同一权威和执行稿 | 当前仅泛化阶段/辅助skill，未深度集成；需真实版本/落点适配和无工具同等路径验证 |
| 系统总体设计↔域详细设计：防止局部正确而整体失控 | [system-design](/root/code_repo/AWB/OperatorMapService/docs/00-system/system-design.md:3)，3、52起；[活规格模板](/root/code_repo/AWB/OperatorMapService/docs/guides/living-spec-template.md:3)，3–22 | 系统边界/共同约束与域内行为/结构分层；向上引用、跨域回刷；不是同一正文复制到多处 | 当前把正式设计压成泛称，minimal/standard无设计来源；重新建立职责体系 |
| 稳定域身份与就地演进：防止每次需求新开一份设计 | [域索引](/root/code_repo/AWB/OperatorMapService/specs/README.md:3)，3–7；[文档规则](/root/code_repo/AWB/OperatorMapService/docs/rules/doc-ssot-rules.md:18) | `specs/NNN-domain/spec.md`是长期特性功能设计；旧域复用，新域有职责判据；域与一次变更身份分开 | 当前域是可关闭的“记忆”，地位错误；应是设计底座，不能靠UUID任务代替 |
| 完整域模板：防止只有需求卡或任务清单 | [模板](/root/code_repo/AWB/OperatorMapService/docs/guides/living-spec-template.md:9)，9–31 | 元信息/目标非目标/约束/上下文/FR-GWT-SC/结构/流程失败语义/共享指针/决策/红线/挂起；解释填写深度与N/A | 现有栏目有局部价值；需与系统设计、specify/plan、评审和收敛连接，并提供填实样本 |
| 知识唯一归宿与目标/事实：防止设计来源无法裁决 | [宪法](/root/code_repo/AWB/OperatorMapService/.specify/memory/constitution.md:8)，8–18；[doc-ssot](/root/code_repo/AWB/OperatorMapService/docs/rules/doc-ssot-rules.md:5)，5–26 | 系统/域/专门契约/事实/台账/过程职责清楚；正文引用owner；偏差选择修实现或治理改目标 | 当前有原则句但没有完整对象关系；JSON路径唯一不能当设计语义唯一 |
| 设计时间语义：防止未实现设计伪装成已交付 | [SPECIFY](/root/code_repo/AWB/OperatorMapService/.claude/skills/e2e-dev-flow/SKILL.md:45)，45–53；[目标/事实](/root/code_repo/AWB/OperatorMapService/docs/rules/doc-ssot-rules.md:22)，22–26 | 明确提议→批准的目标基线→实现/验证状态；批准后进入同一活设计，未实现标清 | 源也有语义缺口；目标“只在converge回刷accepted”会让task临时成设计源，需整体重定义 |
| 过程稿生命周期与知识沉淀：防止源码知识层无限堆积 | [doc-ssot](/root/code_repo/AWB/OperatorMapService/docs/rules/doc-ssot-rules.md:14)，14–18；[gitignore](/root/code_repo/AWB/OperatorMapService/.gitignore:51)，51–57；[policy](/root/code_repo/AWB/OperatorMapService/scripts/policy-check.sh:209)，209–218 | 重型plan/tasks/implement默认本地忽略，长期结论归域/系统/测试资产；短交接承担恢复；不靠事后清场 | 原方案默认永久任务文档和可选计划入库，削弱反膨胀；撤回该默认策略，保留现场后给承接方案 |
| 图与设计共同维护：防止有图却关系错误 | [模板](/root/code_repo/AWB/OperatorMapService/docs/guides/living-spec-template.md:24)，24–30；[图检查](/root/code_repo/AWB/OperatorMapService/scripts/policy-check.sh:230)，230–329 | 区分语法、符号存在、关系语义；变更相关结构/流程时改对应图；目标图与现状图标清 | 不能只补图解析器；需在真实同域/跨域演进样本中验收关系 |
| 双向影响/环境勘察：防止只改定义不改调用方/配置变体 | [e2e](/root/code_repo/AWB/OperatorMapService/.claude/skills/e2e-dev-flow/SKILL.md:43)；[testing-rules](/root/code_repo/AWB/OperatorMapService/docs/rules/testing-rules.md:39) | 读当前实现、调用方、上下游契约、环境profile及既有能力；决定所有受影响域/owner和范围 | 当前scope/impact字段不能证明分析做过；由方法链和语义审查承担，再提炼可机查部分 |
| 测试设计/TDD/追溯：防止测试复述实现而漏需求 | [e2e](/root/code_repo/AWB/OperatorMapService/.claude/skills/e2e-dev-flow/SKILL.md:55)，55–78；[testing-rules](/root/code_repo/AWB/OperatorMapService/docs/rules/testing-rules.md:13) | 因子→场景→边界异常→用例/覆盖矩阵；需求/系统约束和测试双重对照；先失败条件再实现；参数化映射需解释 | 现有检查器可复用，但不证明设计/测试充分；不能以1:1标签代替行为验收 |
| 相称真实证据：防止mock/替代环境冒充真实成功 | [testing-rules](/root/code_repo/AWB/OperatorMapService/docs/rules/testing-rules.md:20)；[阻断](/root/code_repo/AWB/OperatorMapService/docs/rules/dev-workflow-rules.md:57)，57–61 | 风险与测试层分开；必需边界/环境未验证就是缺口；替代检查说明范围，不放宽条件 | 状态分类已有价值；不能把注册layer标签、字段或默认exit0当真实集成 |
| CONVERGE回刷与未完成去向：防止代码交付后设计仍旧 | [路由](/root/code_repo/AWB/OperatorMapService/docs/rules/dev-workflow-rules.md:15)，15–27；[e2e](/root/code_repo/AWB/OperatorMapService/.claude/skills/e2e-dev-flow/SKILL.md:93)，93–103 | 对照SC/不变量判偏差，更新同一域设计/触发的系统设计/契约模型/测试/沿革/台账；遗留有去向 | 当前finish不需要长期设计也能完成；先跑真实内容闭环，不先堆disposition/hash补丁 |
| 续接与边界：防止依赖旧聊天或本地不可得计划 | [AGENTS读序](/root/code_repo/AWB/OperatorMapService/AGENTS.md:56)，56–64；[HANDOVER](/root/code_repo/AWB/OperatorMapService/docs/HANDOVER.md:14)，14–38；[短交接规则](/root/code_repo/AWB/OperatorMapService/docs/rules/doc-ssot-rules.md:34) | 当前态、全部未闭环、批准目标、证据/下一步可找；不复制长期设计；本机、换机、并行分别验收 | 原方案的共享理由合理但永久任务库过重；源本地草稿也有换机缺口，需最小恢复样本验证 |
| 治理自身进入治理链：防止Harness先漂移 | [治理域](/root/code_repo/AWB/OperatorMapService/specs/001-repo-governance/spec.md:8)；[宪法治理](/root/code_repo/AWB/OperatorMapService/.specify/memory/constitution.md:41) | 政策/流程/模板/实现有自身设计、变更来源和验收；事故后审有效性，不只追加红线 | 模板维护仓应先做填实样本；不能默认给每个业务项目强塞治理域来充数 |

## 2. 支撑机制：保留语义，工具按项目适配

| 机制 | 源事实/取证位置 | 吸纳边界与当前处理 |
|---|---|---|
| 派生事实与生成物分类 | [宪法](/root/code_repo/AWB/OperatorMapService/.specify/memory/constitution.md:15)，15–18；[Makefile](/root/code_repo/AWB/OperatorMapService/Makefile:34)，34–55 | 区分手维权威、可丢弃派生物、需入库交付的派生物；后一类确定性再生/漂移检测。吸纳机制，不复制AWB API内容；也不能把OpenAPI机制整体误归为业务而丢掉 |
| 门禁自身可信性 | [宪法](/root/code_repo/AWB/OperatorMapService/.specify/memory/constitution.md:18)；[正反例](/root/code_repo/AWB/OperatorMapService/scripts/mermaid-check/test_mermaid_check.py:16) | 正/负例、空扫描哨兵、坏输入/工具失败/异常退出语义、明确覆盖边界。现有v2工具改进可留，但不能推导设计语义已一致 |
| 统一入口与真实接入 | [Makefile](/root/code_repo/AWB/OperatorMapService/Makefile:69)，69–80；[lefthook](/root/code_repo/AWB/OperatorMapService/lefthook.yml:6)，6–26；[CI](/root/code_repo/AWB/OperatorMapService/.cloudbuild/build.yml:24) | 区分脚本存在/已安装/被调用/本次通过。人工、hook、CI共用实现，但不引新托管/扫描服务，不宣称未实测接入已生效 |
| 跨平台稳定性 | [.gitattributes](/root/code_repo/AWB/OperatorMapService/.gitattributes:1)，1–17；[外置hook](/root/code_repo/AWB/OperatorMapService/scripts/hooks/pre-push-reminder.sh:2)，2–10 | LF/编码、参数、退出和超时、入口真实范围；保留v2本地保护，其他OS和Agent加载仍需分别验证 |
| 问题/债务/错误学习 | [bugs](/root/code_repo/AWB/OperatorMapService/docs/ledger/bugs.md:3)；[debt](/root/code_repo/AWB/OperatorMapService/docs/ledger/debt.md:38)；[errlog](/root/code_repo/AWB/OperatorMapService/docs/ledger/errlog.md:9) | 根因/影响/状态/验证/防复发进入对应owner；可转成测试规则的才转，不无限追加口号或新台账体系 |
| 开发完成与发布分离 | [e2e](/root/code_repo/AWB/OperatorMapService/.claude/skills/e2e-dev-flow/SKILL.md:105)，105–117；[版本台账](/root/code_repo/AWB/OperatorMapService/docs/ledger/version-log.md:3) | 开发/集成/发布/部署分别状态，版本/产物/证据可追溯；外部动作单独授权，不复制pom/镜像/平台 |
| Agent与确定性脚本分工 | [operator-sync](/root/code_repo/AWB/OperatorMapService/.claude/skills/operator-sync/SKILL.md:8)，8–10、28–62、74；[profiling](/root/code_repo/AWB/OperatorMapService/.claude/skills/import-profiling/SKILL.md:19)，19–24 | 抽技能触发/输入/歧义判断/工具/校验/结果的契约；固定机械计算和大文件交给工具；不复制算子、CSV/SQL/API业务实现 |

授权/风险/现场保护是贯穿以上全部机制的底座，源见[AGENTS:11](/root/code_repo/AWB/OperatorMapService/AGENTS.md:11)与[风险:26](/root/code_repo/AWB/OperatorMapService/AGENTS.md:26)。这部分v2吸纳较完整，应保留；它并不授予提交、推送、发布或历史清理权限。

## 3. 明确排除、保留与待核实

- 排除AWB业务内容：算子本体/来源/画像、社区仓清单、采集/profiling脚本和数据、SQL/Flyway/H2/PG、实际API/模型文档、生产配置/密钥/镜像地址。
- 排除新增服务依赖：AgentCenter、codecheck/其他扫描服务、CloudBuild等不是通用核心运行前提。现有本地gitleaks/lefthook/栈工具按实际依赖声明，不把本地工具和平台服务混为一谈。
- 保留目标优势：多栈/角色/命名/产品/PI/上游/多仓等可选资产，安全装配和升级工具；这些不是源仓迁入成果，也不能以保留它们为由弱化设计治理。
- 不照搬源的固定编号起点、行数、图数量/语法、BUG格式、固定分支、≥5文件即TEAM、全部1:1测试函数等具体经验；保留其解决的职责/证据问题。
- 待核实实际Spec Kit/superpowers版本、默认产物和同域复用能力；仓内e2e写了调用不等于工具已经安装或实际正确落盘。
- 源顺序/API回刷/T3/门禁计数/图源/active指针等漂移继续列为事实待裁决，不能任选一份作为全局正确版本。
- 新确认的覆盖缺口：policy项11只检查找到spec的两个节名；用例追溯声明不等于项5文件命名检查；部分错误退出和降级仍可输出通过；源CI链未见完整调用verify-ci/policy。它们支持改进证据契约，不构成“源仓完美”的证明。

## 4. 什么才算完成吸纳

完成必须同时有：填实系统/域设计、真实规范/方法调用或如实等价替代、同域连续变化后的同一权威成品、跨域约束和事实回刷、过程材料收敛、新会话及换机边界、偏差裁决和门禁负例。验收采用主方案A1–A13。

目录/模板/注册表存在、阶段note、文件hash改变、143项工具测试或两位Astra同意，均不能单独满足上述完成定义。当前状态是“工具层部分成果可保留，核心治理待按整体模型实施和验证”。
