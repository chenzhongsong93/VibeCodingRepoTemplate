# 证据索引与调查边界

调查日期：2026-11-16。S=源仓事实，T=目标仓事实，P=本轮离线复现，N=本轮方案建议（不是已实现能力）。行号对应下述 HEAD 的文件；链接跳转起始行，表中给出完整取证范围。

## 基线与取证方法

| 对象 | 本地状态 | 证据与边界 |
|---|---|---|
| 源仓 | `/root/code_repo/AWB/OperatorMapService`；`spec_clean`；`597080942e0ce677ccf3fc2c6ff8b35522adb523`；初始工作区干净 | `git status --short`、`git branch --show-current`、`git rev-parse HEAD`、`git branch -vv`；本地跟踪 origin/spec_clean，未 fetch，不推断服务器最新状态 |
| 目标仓 | `/root/code_repo/VibeCodingRepoTemplate`；`main`；`e96e0c8bb7b30e15b79455cff81bc949367fcf73`；初始工作区干净 | 同上；本地跟踪 origin/main；没有根 AGENTS.md/CLAUDE.md，golden 样本不构成本仓有效规则 |
| 研究包 | `/root/code_repo/AWB/OperatorMapService-research/spec-clean-agent-harness/` | 已完整读取 README/AUDIT/EVIDENCE；源 HEAD 未变，但仍直接复核关键文件，不把研究包当独立第二份实测证据 |
| 规则范围 | 检查两仓及 `/root/code_repo/`、`/root/`、源仓父目录等祖先 AGENTS.md | 源仓存在根 AGENTS.md，无更深 AGENTS.md；目标只有 tests/golden/lightweight/AGENTS.md。本轮遵循用户直接提供的 AGENTS 指令；未将 `.tmpl` 中规则当作本仓已生效规则 |
| 检索 | 两仓根均无 `.codegraph/` | 按用户指令跳过 CodeGraph；使用 rg 文件清单、定向文本搜索及带行号原文读取 |
| 验证 | 源仓仅静态读；目标做临时装配和指定检查器的离线反例 | 未安装依赖、联网调用服务、运行应用、部署、安装或触发 hooks；未运行完整 npm test/Maven。生成器测试包含临时 Git add/commit（T14），本轮没有调用它们 |

研究包入口：[README](/root/code_repo/AWB/OperatorMapService-research/spec-clean-agent-harness/README.md:5)（5–22）、[AUDIT](/root/code_repo/AWB/OperatorMapService-research/spec-clean-agent-harness/AUDIT.md:106)（106–122）、[EVIDENCE](/root/code_repo/AWB/OperatorMapService-research/spec-clean-agent-harness/EVIDENCE.md:145)（145–149）。

## 源仓证据

### S01

[AGENTS.md](/root/code_repo/AWB/OperatorMapService/AGENTS.md:3)，3–5（入口与优先级）、11–36（授权/T 级）、38–64（流程/续接）、74–108（验证与地图）。[CLAUDE.md](/root/code_repo/AWB/OperatorMapService/CLAUDE.md:1)，1：单行 `@AGENTS.md`。

### S02

[constitution.md](/root/code_repo/AWB/OperatorMapService/.specify/memory/constitution.md:8)，8–19（文档分层/机器门禁）、21–39（测试/追溯/风险/上下文）、41–45（治理）。只证明规则有定义，不证明执行效果。

### S03

[e2e-dev-flow/SKILL.md](/root/code_repo/AWB/OperatorMapService/.claude/skills/e2e-dev-flow/SKILL.md:8)，8–18（落点/阶段确认）、28–67（规格/计划/analyze）、69–117（实现/验证/收敛/发布/交接）、119–143（API 旧指引/集成依赖）。

### S04

[dev-workflow-rules.md](/root/code_repo/AWB/OperatorMapService/docs/rules/dev-workflow-rules.md:5)，5–27（流程顺序/回刷）、29–61（风险/验证/阻断）。

### S05

[doc-ssot-rules.md](/root/code_repo/AWB/OperatorMapService/docs/rules/doc-ssot-rules.md:5)，5–26（正式/过程/事实目标）、28–42（归档/短交接/引用）。

### S06

[specs/README.md](/root/code_repo/AWB/OperatorMapService/specs/README.md:3)，3–7（域活规格）、9–30（域索引/结构）、32–38（现状及历史叙述）。[living-spec-template.md](/root/code_repo/AWB/OperatorMapService/docs/guides/living-spec-template.md:7)，7–31：需求、架构、流程、数据/部署指针、决策、红线、开放项。模板在14–17行仍规定 Mermaid；specs 索引35行规定部分图由 PlantUML 承担，两者也需裁决，不能原样全收。

### S07

[HANDOVER.md](/root/code_repo/AWB/OperatorMapService/docs/HANDOVER.md:5)，5–23（短交接/活跃域/门禁声称）、25–38（待办）、42–54（治理历史叙述）、63–74（地图）。[feature.json](/root/code_repo/AWB/OperatorMapService/.specify/feature.json:1)，1：仍指向 `specs\\001-repo-governance`；与 HANDOVER18行“无进行中域”存在语义待核差异。`git ls-files .specify` 仅列此文件及 constitution；没有跟踪 Spec Kit 命令实现。

### S08

[Makefile](/root/code_repo/AWB/OperatorMapService/Makefile:29)，29–55（policy/OpenAPI/派生文档命令）、57–80（扫描降级/fast/ci）、82–110（构建与部署）。全文件无 verify-release target；`rg -n verify-release Makefile scripts` 未命中实现。

### S09

[policy-check.sh](/root/code_repo/AWB/OperatorMapService/scripts/policy-check.sh:1)，1–18（头注释/聚合）、20–107（检查1–5）、109–197（检查6–10）、198–229（检查11）、230–279（检查12）、281–400（检查13–17）、402–409（退出）。有17个顶层编号，部分含子项；不是“17项均在本机执行并通过”。缺依赖分支见300、329、339、351、368、376、388–399；例如最后汇总可在有降级跳过时仍打印“全部通过”。检查6只粗查控制器 base path，检查8只比表名集合，检查11不逐域强制存在 spec.md；不能据此声称完整语义一致。

### S10

[lefthook.yml](/root/code_repo/AWB/OperatorMapService/lefthook.yml:1)，1–26（安装、gitleaks skip、实际 hook 命令）。[pre-push-reminder.sh](/root/code_repo/AWB/OperatorMapService/scripts/hooks/pre-push-reminder.sh:2)，2–10：外置脚本、非阻断提醒、HEAD reflog 比较范围。

### S11

[.gitattributes](/root/code_repo/AWB/OperatorMapService/.gitattributes:1)，1–17（指定文本 LF/二进制）；[python-run.sh](/root/code_repo/AWB/OperatorMapService/scripts/python-run.sh:1)，1–25（发现链/依赖/探测）、29–51（WSL 转参）、75–99（缓存/返回码）；[.gitignore](/root/code_repo/AWB/OperatorMapService/.gitignore:44)，44–66（索引/本地过程工件/缓存）。平台机制有文件证据，Windows 实际成功只见历史描述，本轮未实测。

### S12

[operator-sync/SKILL.md](/root/code_repo/AWB/OperatorMapService/.claude/skills/operator-sync/SKILL.md:8)，8–10、22–62、74（Agent判断/确定性脚本/缓存校验）；[import-profiling/SKILL.md](/root/code_repo/AWB/OperatorMapService/.claude/skills/import-profiling/SKILL.md:6)，6–24、86–120（触发/歧义参数/大文件交给工具）。业务例子，仅抽象契约形态，不收业务实现和数据。

## 目标仓证据

下述 T02–T13 中 `templates/` 内文件是**生成器输入**；不能据其存在认定目标仓自身已安装对应门禁，亦不能认定所有装配组合有效。

### T01

[README.md](/root/code_repo/VibeCodingRepoTemplate/README.md:3)，3–7、26–45（两技能/零运行时/19场景声称）、63–74（入口）、78–110（目录/测试/根 CLAUDE 链接）；[package.json](/root/code_repo/VibeCodingRepoTemplate/package.json:5)，5–8（测试及 check:completeness 命令）。README89行根 assemble.mjs、110行根 CLAUDE.md，以及 package7行根 scripts/check-completeness.mjs 对应文件当前不存在。实际 assemble 在 T03。

### T02

[init-code-repo/SKILL.md](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/SKILL.md:14)，14–75（已有仓冲突/录取/建仓/验收）、80–167（装配规则/命名）、171–198（组件）。27行明示 Node 前后端互斥；198行明示 deployment-gates 用于 stacks为空的部署仓。这些限制目前只写在指引，机器装配未拒绝非法组合。

### T03

[assemble.mjs](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/assemble.mjs:18)，18–31（派生条件）、34–55（直接覆盖写入）、58–103（ctx/层叠顺序）；[conditional.mjs](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/conditional.mjs:1)，1–7（dev-flow激活policy）；[naming.mjs](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/naming.mjs:4)，4–46、78–100（中英文/自定义映射）。未见配置 schema 校验、输出路径冲突拒绝、版本化升级入口。

### T04

[AGENTS.md.tmpl](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/core/AGENTS.md.tmpl:5)，5–71（可选 policy、授权、事实目标、风险、四步续接）、95–139（索引/手写目录树）、142–153（产品分层）。文件全文未提供 docs/skills 入口。[CLAUDE.md.tmpl](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/core/CLAUDE.md.tmpl:1)，1–19：policy档单行导入，其他档是声明“不可变”的指针文档；12行还有本地规则高于用户级规则的过度声称，不应迁入新政策。

### T05

[dev-conductor/SKILL.md](/root/code_repo/VibeCodingRepoTemplate/skills/dev-conductor/SKILL.md:16)，16–39（初建仓与完整性）、41–73（原生脚手架/逐模块实现/目录回刷）、75–84（交接/门控达标可发布）。主要面向建仓后填充与落地；80行将阶段门达标推到“可发布”，证据不充分。

### T06

[dev-workflow-rules.md.tmpl](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/core/docs/rules/dev-workflow-rules.md.tmpl:6)，6–66（policy档四步/风险/测试/阻断）、67–89（旧线性流程）；[docs/skills/dev-flow/SKILL.md.tmpl](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/core/docs/skills/dev-flow/SKILL.md.tmpl:15)，15–57（十步、提交后才同步SSOT）、59–70（Done）。生成技能依赖外部 superpowers；T0验证前后也有不同描述，完整台账未选时仍要求 debt/version-log。

### T07

[doc-ssot-rules.md.tmpl](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/core/docs/rules/doc-ssot-rules.md.tmpl:5)，5–25；[doc-governance.md.tmpl](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/core/docs/02-design/doc-governance.md.tmpl:3)，3–29；[HANDOVER.md.tmpl](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/core/docs/HANDOVER.md.tmpl:1)，1–15。已有正式/台账/过程分类，但 HANDOVER 以追加为主，没有源仓式短交接结构。[agent-conduct-rules.md.tmpl](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/core/docs/rules/agent-conduct-rules.md.tmpl:24)，24–37：直接按代码回刷与 policy档“目标/事实冲突须裁决”不一致。

### T08

[design-completeness-rules.md.tmpl](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/core/docs/rules/design-completeness-rules.md.tmpl:5)，5–29；[check-completeness.mjs.tmpl](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/core/scripts/check-completeness.mjs.tmpl:9)，9–53。实现未按组件裁剪 MAPPING，未校验 stage 枚举，只检查特定中文括号 TODO，没有实现空节识别或 ROADMAP覆盖映射。

### T09

[check-agent-policy.mjs.tmpl](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/core/scripts/check-agent-policy.mjs.tmpl:12)，12–44：导入/标记/设置字段/文档存在/风险标题，属于结构断言；35–42使用固定英文路径。[check-test-spec-consistency.mjs.tmpl](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/core/scripts/check-test-spec-consistency.mjs.tmpl:8)，8–42：只识别 L1/L2，扩展名无Java，Set丢重复，不定位真实测试函数。[test-spec/SKILL.md.tmpl](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/core/docs/skills/test-spec/SKILL.md.tmpl:43)，43–82却要求全层1:1零重复。当前 Makefile/npm/hook未调用一致性脚本，主要由技能指导手工运行。

### T10

[core/Makefile.tmpl](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/core/Makefile.tmpl:18)，18–43：部署档，shell/JSON检查后接 `|| true`，release E2E只有TODO；[shared/Makefile.tmpl](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/shared/Makefile.tmpl:6)，6–27（栈lint）、94–168（policy条件下验证target）。Go的 `cmd && lint || fallback` 同时接收“未安装”和“lint已检出问题”；gofmt -l只列文件不主动失败。release做CI/构建不等于真实E2E。[node-backend/package.json.tmpl](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/stacks/node-backend/package.json.tmpl:7)，7–15：npm verify含外部栈工具；release末尾 `||` 把不同失败归并成授权提示。未安装工具实跑，不判定各工具版本参数兼容性。

### T11

[lefthook.yml.tmpl](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/core/lefthook.yml.tmpl:1)，1–91：本地工具、栈命令、条件verify和非阻断同步提醒；[pre-receive.tmpl](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/gates/pre-receive-remote/pre-receive.tmpl:7)，7–23：服务端安装模板、固定默认regex，不随custom/none自动变化。文件存在不等于远端已安装或托管平台支持。

### T12

[compatibility-matrix.md.tmpl](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/core/docs/02-design/agent-governance/compatibility-matrix.md.tmpl:4)，4–15（预期入口及验证建议）；[Claude dev-flow adapter](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/runtime-adapters/claude-code/.claude/skills/dev-flow/SKILL.md.tmpl:7)，7–15（指向共享技能）；[settings.json.tmpl](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/runtime-adapters/claude-code/.claude/settings.json.tmpl:3)，3–47（权限适配）。跨平台加载属于待实测；能力矩阵缺 kimicode行，不能以README徽章证明支持。

### T13

[AGENTS.config.json.tmpl](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/core/AGENTS.config.json.tmpl:1)，1–12（仅worktree配置）；[new-worktree.sh.tmpl](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/core/scripts/new-worktree.sh.tmpl:14)，14–56（Python依赖与配置）、121–149（fetch/建树/安装）；[cleanup-worktree.sh.tmpl](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/core/scripts/cleanup-worktree.sh.tmpl:83)，83–121（强制移树/未合并分支强删/远端删除）。没有运行这些脚本；风险由可达源码分支证明。[central aggregate](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/central-docs/scripts/aggregate.mjs.tmpl:26)，26–55、58–70：clone/跳过失败/生成架构图与组件清单，未实现注释声称的完整契约矩阵；[install-skills](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/central-docs/scripts/install-skills.sh.tmpl:18)，18–42：用户级链接，有既有真实目录保护，仍会写用户目录，非默认可执行动作。

### T14

[tests/run_tests.mjs](/root/code_repo/VibeCodingRepoTemplate/tests/run_tests.mjs:22)，22–74（树/字符串）、129–138（有限内容快照）、312–338（runtime装配）、645–651（一致性脚本空集合通过）、672–705（中文场景）、722–755（组合树/链接）、844–871（部署场景及临时git提交）；[tests/lib/links.mjs](/root/code_repo/VibeCodingRepoTemplate/tests/lib/links.mjs:4)，4–36：只校验 Markdown/HTML 链接路径存在，不校验锚点语义、inline code路径或真实Agent加载。[tests/scenarios/agent-policy/config.json](/root/code_repo/VibeCodingRepoTemplate/tests/scenarios/agent-policy/config.json:5)，5–11：现有policy场景带Rust，未覆盖无栈policy样本。现有21个scenario是目录实数（P01），不是全组合覆盖数；golden通过也不能证明人工装配等价。

## 本轮离线反例

原始结果：[PROBES.txt](/root/code_repo/VibeCodingRepoTemplate/docs/research/2026-11-16-agent-harness/PROBES.txt:1)，每条JSON一行，不省略退出码/输出。方法：[PROBE-METHOD.md](PROBE-METHOD.md)。所有装配样本独立于工作区，临时目录保留，便于复查。

| ID | 结果行 | 观察；能证明的范围 |
|---|---|---|
| P01 | [3](/root/code_repo/VibeCodingRepoTemplate/docs/research/2026-11-16-agent-harness/PROBES.txt:3) | 21个scenario；根AGENTS/CLAUDE/完整性脚本不存在 |
| P02 | [4](/root/code_repo/VibeCodingRepoTemplate/docs/research/2026-11-16-agent-harness/PROBES.txt:4) | lightweight P0 将未启用的产品文档报missing，同时也报真实ROADMAP TODO；不能把整个失败都归因于可选组件 |
| P03 | [5](/root/code_repo/VibeCodingRepoTemplate/docs/research/2026-11-16-agent-harness/PROBES.txt:5) | `--stage garbage`：exit0且0份检查 |
| P04 | [6](/root/code_repo/VibeCodingRepoTemplate/docs/research/2026-11-16-agent-harness/PROBES.txt:6) | 五份必填文档只有标题/空节：exit0 |
| P05 | [7](/root/code_repo/VibeCodingRepoTemplate/docs/research/2026-11-16-agent-harness/PROBES.txt:7) | 无栈+agent-policy：hook调用make，但未生成Makefile |
| P06 | [8](/root/code_repo/VibeCodingRepoTemplate/docs/research/2026-11-16-agent-harness/PROBES.txt:8) | Java+deployment-gates：共享Makefile覆盖部署target；按T02这是文档已排除的组合，证实的是配置未拒绝非法组合，不把它误报为支持组合的回归 |
| P07 | [9](/root/code_repo/VibeCodingRepoTemplate/docs/research/2026-11-16-agent-harness/PROBES.txt:9) | dev-flow正文已生成，但AGENTS无docs/skills入口 |
| P08 | [10](/root/code_repo/VibeCodingRepoTemplate/docs/research/2026-11-16-agent-harness/PROBES.txt:10) | 两个TS函数同ID：一致性脚本exit0；不是完整函数解析测试 |
| P09 | [11](/root/code_repo/VibeCodingRepoTemplate/docs/research/2026-11-16-agent-harness/PROBES.txt:11) | spec与Java注释同ID：Java未收集，exit1 |
| P10 | [12](/root/code_repo/VibeCodingRepoTemplate/docs/research/2026-11-16-agent-harness/PROBES.txt:12) | spec有L3、代码无：exit0（两边都未识别） |
| P11 | [13](/root/code_repo/VibeCodingRepoTemplate/docs/research/2026-11-16-agent-harness/PROBES.txt:13) | zh+policy：生成中文流程文件，检查器硬读英文名，exit1 |
| P12 | [14](/root/code_repo/VibeCodingRepoTemplate/docs/research/2026-11-16-agent-harness/PROBES.txt:14) | Node前后端互斥组合仍装配成功，根package由backend覆盖；属于未拒绝非法组合 |

离线反例说明检查器边界与装配行为，不代表真实应用性能、全量测试结果、Windows兼容性或平台运行授权有效性。

## Astra整体重审补充（2026-11-16）

两位独立gpt-6-astra/xhigh分别从源机制和目标方案重新审计，源仓只读且仍干净；目标复审只在内存调用buildFiles查看实际输出，没有落盘或运行测试。此前的S/T/P证据保留原调查语义，不能把后续工作树行号冒充旧HEAD行号。

### 源机制与新增覆盖缺口

- [系统总体设计](/root/code_repo/AWB/OperatorMapService/docs/00-system/system-design.md:3)：3及52行起，系统/域分层与边界。
- [测试规则](/root/code_repo/AWB/OperatorMapService/docs/rules/testing-rules.md:13)：13–20行追溯和真实环境；39行起影响/环境勘察。
- [门禁的结构范围](/root/code_repo/AWB/OperatorMapService/scripts/policy-check.sh:209)：209–218行只检查过程工件跟踪及已找到spec的两个节名；不能证明每域必有完整spec。项5在94行起只查test-spec文件命名。
- [异常返回分支](/root/code_repo/AWB/OperatorMapService/scripts/policy-check.sh:294)：只将退出1当语法失败，其他分支可报PASS；[检查器](/root/code_repo/AWB/OperatorMapService/scripts/mermaid-check/mermaid_check.py:143)对读取异常WARN后继续。此为静态分支结论，未故障注入。
- [CI入口](/root/code_repo/AWB/OperatorMapService/.cloudbuild/build.yml:24)：24–26调用build.sh；[build.sh](/root/code_repo/AWB/OperatorMapService/build.sh:38)跳过测试。未在该链看到verify-ci/policy调用，不推断外部CI没有其他验证。
- [提交检查](/root/code_repo/AWB/OperatorMapService/scripts/hooks/commit-msg-check.sh:5)：数字regex与7行#BUG示例不一致；保留为漂移，不以外部Issue平台作为通用依赖。

### 当前v2核心未完成的直接反例

- [project.mjs](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/project.mjs:36)：documents/完整性集未把系统/域设计作为默认来源；[presets](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/contracts/definitions.json:52)中living-specs仅product配置。内存生成minimal/standard均无系统设计/spec，product也无域spec必填。
- [TASK-06](/root/code_repo/VibeCodingRepoTemplate/tests/v2/tasks.test.mjs:42)与[默认fixture](/root/code_repo/VibeCodingRepoTemplate/tests/v2/helpers.mjs:6)：无域设计，用core.policy、阶段note和HANDOVER完成生命周期。没有重跑，之前143测试记录包含该通过例。
- [validateTask](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/v2/scripts/harness/model.mjs:55)允许domainRefs空数组；[finish](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/v2/scripts/harness/task.mjs:41)没有长期设计内容收敛的义务。
- 这说明既有实现符合了偏离目标的工具契约，不能以原实现审阅或143项测试宣称完成深度吸纳。新的主方案和吸纳清单已整体替换旧方向；本次未修改这些代码来让反例“重新变绿”。
