---
name: dev-conductor
description: Use when continuing a project after initialization, resuming interrupted work, or implementing an approved feature, fix or architecture change.
---

# 按设计持续演进的开发入口

本技能连接项目默认e2e，不创建另一套生命周期。读取AGENTS→宪法→短HANDOVER→系统设计/域索引→所属域与事实资产；路径可从project.documents定位，但配置/任务状态不是设计权威。

普通存量仓没有.harness/assembly.json时，先用init-code-repo的adopt inspect/plan/check/apply认领已有设计与实际模块；不能直接套新仓装配或虚构旧模板基线。已有设计路径通过documents/domains映射复用，整改缺口在原owner补全，不按任务新建平行规格。

## 定位与变化

先读现有域/实现/调用方/环境，明确来源、目标/非目标、风险、受影响域和公共不变量。已有域修订同一spec；只有独立职责才新增域。新仓先建立实际系统与功能域设计，不默认给所有项目建治理域。T0只读直接报告。

读取project.documents.e2e指向的实际正文执行（新仓默认docs/skills/e2e-dev-flow/SKILL.md，存量以实际映射为准）：Spec Kit组织规格/计划/任务/分析/实施及实现缺口评估，superpowers承担探索/TDD/debug/review/verification；本仓继续承担裁决和长期owner回刷。原生converge不会改写spec/plan，两者共用工件须核对真实版本和路径。没有外部方法时按正文同等步骤执行并如实报告，不伪造调用。

## 正式设计与过程

提议批准前本地；获批目标进入原活spec并标待实现/待验证。过程plan/tasks/implement默认所属域忽略区，长期结构/决策/验收分别回原owner，不永久保存每轮任务设计档。发现实现违背设计，明确裁决修实现或改目标，不刷golden造绿。

首次建仓引导填实系统和至少实际相关域；后续变化只改有影响的内容，不无条件重建脚手架或扩架构。测试设计先于行为实现，需求与测试双重对照，一致性分析后TDD；代码/设计/图/契约/环境证据分别验收。

## 续接与完成

HANDOVER保存当前目标/已接受决定/全部未闭环/证据和下一步；新会话依靠正式设计，不遍历旧任务库。换机缺本地细稿要明确重建，不假设未共享内容已在Git。相同授权持续有效，无需逐阶段重复确认。

可选task助手使用.harness/local/tasks，只辅助本次执行；不用UUID协议仍执行同样的e2e义务。若采用助手：

```bash
node scripts/harness/task-cli.mjs create --title <变化> --domain <域索引中的实际设计路径>
node scripts/harness/task-cli.mjs show --task <ID>
node scripts/harness/task-cli.mjs advance --task <ID> --stage <下一阶段> --expected <digest> --note <实际阶段依据>
node scripts/harness/check.mjs --profile ci --task <ID> --intent complete
```

直接按e2e执行可用`node scripts/harness/check.mjs --profile ci`获得仓库覆盖结论，再结合真实SC/系统不变量/语义审查结案；exit0不是自动完成授权。助手也必须有真实域来源和convergence审查/owner去向，不能凭note、hash或政策检查结束。stdout JSON的evidencePath定位本机记录，taskReady只表示其覆盖的完整验证条件，不能证明语义。

converge对照内容/行为，更新原系统/域、共享契约、测试/沿革和台账，阻断偏差解决后才交接/结束。变更内容使旧验证失效；缺工具/必要L2/L3/安全复审如实阻断，不能以子集绿放行。

临时脚本/截图/报告先用assets-cli.mjs workspace取得工作目录；不使用taskCLI也可按工作标识维护。活跃/失败/租约/引用保持保护，工作关闭前转正长期资产并导出核验必要证据。统一check报告自动登记为run资产；完成凭据受保护，local-only不能称为共享。资产CLI plan/apply/restore/run-due、调度和CI用法见实际生成的asset-lifecycle指南；既有策略范围内自动维护不反复请批，未知历史不擅自删除。

提交、推送、tag、发布、部署和安装工具/hook仍按实际授权；资产GC仅在已启用的受管策略范围执行。报告实际通过/未运行/阻断、语义结论、遗留、资产证据与工作区；所有回应中文。
