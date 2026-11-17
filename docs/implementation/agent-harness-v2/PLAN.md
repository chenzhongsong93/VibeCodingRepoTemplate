# Agent Harness v2 Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans task by task. 用户已批准方案并要求实施；不重复请批。所有提交步骤均省略，保留工作区供审阅。

**Goal:** 落实已批准的分层收敛方案，形成可独立运行、可续接、可安全升级的v2通用模板。
**Architecture:** 保留现有模板作为显式v1输入和回归资产；v2先在内存完成配置/路径/owner求解，再一次写入。公共生命周期和验证契约由本地配置驱动；平台只转引。
**Tech Stack:** Node.js标准库（最低22），JSON、Markdown、现有本地构建工具，无新增npm依赖或平台服务。
**Spec:** ../../research/2026-11-16-agent-harness/REDESIGN-PROPOSAL.md（用户本轮批准）。

## Global Constraints

- 不提交、推送、发布、安装hook、清理工作区或迁移删除历史文件；源仓只读。
- schemaVersion=2，固定8阶段；风险/事实目标/用户授权不由工具配置替代。
- 结果pass/fail/blocked/skipped/not-applicable；退出0/1/2；子集通过不等于taskReady。
- 无第三方平台/扫描服务依赖；Node本地检查不自动下载工具。
- 保留21个v1场景；v2单独行为回归，不批量覆盖旧golden。

## Review Focus

- 命名映射、symlink和..路径不能逃出仓根或造成覆盖（任务2/5）。
- 不可信或缺失风险输入、T2只跑fast不能产生完成凭据（任务3/4）。
- 缺工具、非零、超时、空集合不能制造pass（任务3）。
- 并行任务、失效证据、local-only快照不能冒充跨机恢复（任务4）。
- 升级已手改文件、未知文件、途中变化必须无损拒绝（任务5）。

### Task 1: 计划与基线

Files: 本PLAN、PROGRESS、TEST-SPEC；tests/run_tests.mjs仅替换临时Git写测试。
- [x] 为AC01–15建立场景/用例映射；记录红绿。
- [x] 执行原套件（部署测试改用make -n），确认既有能力基线。

### Task 2: 配置与装配

Files: skills/init-code-repo/{assemble.mjs,assemble-v1.mjs,project.mjs,contracts/*}；templates/v2/；tests/v2/assembly.test.mjs。
Interfaces: assembleV1(target,config)保留旧输出；resolveConfig(config)返回规范输入；buildFiles(config)返回Map<relativePath,content>；assemble(target,config)写入预检后的新仓。
- [x] 先测无栈policy、命名、非法组合、重复owner、遍历/已有文件拒绝；观察失败。
- [x] 实现规范化配置/schema/能力/文档/检查注册、内存渲染及安全新仓写入。
- [x] 测试通过且v1回归不变。

### Task 3: 检查内核

Files: templates/v2/scripts/harness/{model,checks,runner,check}.mjs；tests/v2/checks.test.mjs；runtime.test.mjs。
Interfaces: validateProject(project)；runChecks(root,options)→{exitCode,scope,taskReady,results,fingerprint}；check.mjs CLI为真实入口；旧脚本名为包装。
- [x] 先测P02–P11的坏例、必需/可选依赖、非零/超时、完整/子集退出、release缺配置。
- [x] 实现按能力裁剪完整性、入口/引用/文件卫生、追溯多重性与显式selector映射、检查计划和本地证据。
- [x] Make/npm/hook只调用同一入口；测试各包装范围与退出码。

### Task 4: 生命周期与续接

Files: templates/v2/docs/*；templates/v2/scripts/harness/{task,task-cli}.mjs；tests/v2/tasks.test.mjs；skills/dev-conductor/SKILL.md。
Interfaces: createTask(root,options)→task；read/validate/advance/index；task状态权威、UUID、分支快照、risk/impact、证据指纹与完成前置。
- [x] 先测T0不落盘、缺风险blocked、UUID不冲突、同任务旧指纹拒绝、过期/本机缺证据、T2 fast非完成。
- [x] 提供基础生命周期、短HANDOVER、任务模板/CLI和可选living-specs；统一技能发现链。
- [x] 用无外部skill的生成仓执行完整样本任务与跨目录快照恢复测试。

### Task 5: 平台、安全工具与升级

Files: v2 hook/worktree/聚合工具；skills/init-code-repo/upgrade.mjs；tests/v2/upgrade.test.mjs；platform.test.mjs。
Interfaces: planUpgrade(target,config)→带基线/逐文件hash的计划；checkUpgrade(target,plan)→冲突；applyUpgrade(target,plan)→验证后写入；不删文件。
- [x] 先测用户手改/未知版本/symlink/途中变化/兼容配置冲突/无默认清理。
- [x] 实现plan/check/apply显式CLI与本地逆向备份；LF、外置hook、只读worktree预览、多仓缺失报告。
- [x] 升级失败原文件不变，保留v1与人工资产；不触发网络或Git写入。

### Task 6: 收敛与交付

Files: 根AGENTS、README、package.json；init技能及v2文档；docs/implementation/agent-harness-v2/REPORT.md。
- [x] 对照AC01–15与H01–13记录已实现/边界，更新实际入口和命令。
- [x] 全量npm test、语法/引用/模板残留、Git差异检查；记录平台未实测项。
- [x] 最强可用模型独立只读整体审阅；重要发现先失败测试再修复；报告结果、风险和工作区，不提交或清理。
