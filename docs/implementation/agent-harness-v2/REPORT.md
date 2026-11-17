# Agent Harness v2 实施交付

> **完成口径更正：此前“H01–13通用机制已落入”的结论撤回。以下记录的是工具层实现及其143项验证，不证明中大型系统的设计治理已完成。用户本轮要求Astra整体重审，新主方案已替换旧方向；核心模型尚未实施，代码暂停。**
本轮用户“同意，请继续”批准研究路线B并授权实施。基线与当前HEAD均为`main@e96e0c8bb7b30e15b79455cff81bc949367fcf73`；所有结果留在工作区，未提交、推送、发布、安装hook或清理。源仓未修改，仍`spec_clean@597080942e0ce677ccf3fc2c6ff8b35522adb523`。

## 已实现

| 能力 | 实现证据 | 本地验证 |
|---|---|---|
| v2配置/能力/路径/唯一owner/预检 | [project.mjs](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/project.mjs)、[assemble.mjs](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/assemble.mjs)、[contracts](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/contracts/definitions.json) | ASM-01–07，非法组合/已有文件/路径别名拒绝，21既有场景生成v2 |
| v1兼容 | [assemble-v1.mjs](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/assemble-v1.mjs)、原templates/golden | 92项原回归保持；仅两项旧skill文案断言按已批准新契约更新，部署样本不再Git提交 |
| 统一机器门禁/真实命令包装 | [runner](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/v2/scripts/harness/runner.mjs)、[checks](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/v2/scripts/harness/checks.mjs) | CHK/RUN/REV：fail/blocked/skipped/N/A，0/1/2，缺工具/超时/非法输入不能假绿 |
| 固定生命周期与共享任务 | [task](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/v2/scripts/harness/task.mjs)、[model](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/v2/scripts/harness/model.mjs)、[conductor](/root/code_repo/VibeCodingRepoTemplate/skills/dev-conductor/SKILL.md) | TASK-01–07：UUID/风险与影响/阶段/旧指纹/交接/完整正例；fast不完成 |
| 文档/技能/上下文 | [v2入口](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/v2/AGENTS.md.tmpl)、[短交接](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/v2/docs/HANDOVER.md.tmpl)、[域模板](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/v2/specs/domain-template.md.tmpl) | 可选组件/中文路径/非Claude发现；同场景技能基线→改写复核；无外部skill也有步骤 |
| 平台/多仓/worktree | [v2目录](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/v2/lefthook.yml.tmpl)、[worktree](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/v2/scripts/harness/worktree.mjs)、[聚合](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/templates/v2/scripts/aggregate.mjs.tmpl) | PLAT/REV：外置hook、LF、只读清理预览、本地快照聚合、缺组件/非法输出阻断 |
| 显式升级 | [upgrade.mjs](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/upgrade.mjs)、[init入口](/root/code_repo/VibeCodingRepoTemplate/skills/init-code-repo/SKILL.md) | UPG/REV：v1准确配置基线、plan/check/apply、手改/途中改动拒绝、备份/逆向清单/保留历史 |

## 验收范围

AC01–10、AC12–15的仓内机制有对应ASM/CHK/RUN/TASK/UPG/REV行为覆盖；AC11只验证当前Linux/Node22环境及静态薄适配，不能声称其他OS/Agent已实测。AC09仅实现按项目权威源回刷与派生检查的本地扩展契约，不携入AWB业务/API/数据库实现，也不能机械证明自然语言设计充分性。

此前按旧方案归类的H01–13只获得了下述局部工具/文案支持，不能认定全部核心机制已吸纳：统一入口/风险/生命周期、可选域规格、回刷职责、短续接、机器检查/派生扩展、外置hook/LF、测试追溯、技能工具分工和完成报告。业务脚本、算子规则、数据库/API文档及平台扫描服务没有迁入。

## 最终验证

运行命令、数量、退出状态与工作区范围见[VALIDATION.json](VALIDATION.json)。完整测试含真实生成文件/Node CLI/本地进程/升级文件操作，既有v1与新增v2分别保留；没有通过改golden吞掉差异。独立审阅发现及修复见[REVIEW.md](REVIEW.md)。

## 设计取舍与兼容风险

- 新仓默认v2；旧版显式assembleV1保留。原模板作为v1资产与v2复用输入，v2替换owner在definitions.supersedes列明，不能靠层叠静默覆盖。
- templateRevision使用模板内容SHA-256，避免未提交/分发包没有可用Git commit时误指同一个版本；这是相对方案“源commit”的取舍。内容digest稳定可复核，但不等于发布版本或Git来源证明。
- 本地机器检查明确需要Node >=22。外部方法论可选；栈工具仍由项目显式提供，缺失blocked，不自动下载。
- fingerprintScope明确本仓输入与声明的生成产物排除；symlink输入不支持并阻断；外部系统/数据变化需项目另设真实边界验证，不能由本仓hash证明。
- 测试声明适配是保守词法支持，不是各语言完整编译器；不支持的语法/词法须补适配或标明未验证。映射成立不证明测试执行或断言质量。
- 升级逐文件复查并保护观察到的竞争写入；普通文件系统无法提供跨全仓的原子compare-and-swap。apply需独占编辑窗口，非配合写入发生在最后检查与rename之间仍有竞态；备份/逆向清单保留以便审阅恢复，不宣称分布式锁。
- 新旧worktree配置冲突明确阻断。清理只提供预览，实际删除仍由用户另行授权；不保留原脚本的默认force和远端删除行为。
- 退役/未选文件升级时retain，可能需要后续人工整合旧入口或重复配置。工具不自动归档/删除，也不强行用新文件覆盖手改。
- JSON批准引用只做追溯，不是防篡改授权凭证；自然语言目标/安全复审、真实平台加载与部署仍需相应证据。

## 工作区与后续

现有研究/历史文档保留；新增v2代码、契约、测试和实施记录，修改维护入口、默认装配器与两技能。没有对真实已有业务仓执行升级。可先审阅新仓生成结果和逐文件差异，再在明确授权的项目用upgrade plan/check/apply；本轮不创建提交或PR。
