# 当前交接

更新：2026-11-16。**当前阶段：用户已批准的新仓与存量仓持续治理落地；实现、分项/整体独立审阅及最终验证完成，权威正文已回刷；进入实际项目逐仓接入与长期试点阶段。**

## 目标与权威

本仓交付可供AI Agent持续维护的软件工程模板：同域长期设计就地更新，代码/设计/验收相互约束，临时脚本、截图、报告和日志有归属、保留、转正及受控回收。Spec Kit支持Living Spec；本仓选择域活规格，不能把feature工件概括为一次交付材料。原生Spec Kit converge与本仓设计回刷分开说明。

读取顺序：根AGENTS → [宪法](../.specify/memory/constitution.md) → [系统设计](00-system/system-design.md) → [域索引](../specs/README.md) → 受影响域。装配/存量接入/升级归[001](../specs/001-repo-assembly/spec.md)，方法/资产生命周期归[002](../specs/002-development-governance/spec.md)，来源/完成/验证证据归[003](../specs/003-verification/spec.md)。研究和实施细稿是出处，不是平行当前设计。

## 已实现能力

- 新仓默认v2，保留v1显式回归；默认包含宪法、系统/域设计、e2e方法与分层检查。C01–C09已修复：正式验收来源、实际输入新鲜度、显式影响owner、实质底座、遗留共享去向、命名/组件/registry契约、测试声明映射及历史链接角色。
- 普通既有仓使用adopt inspect/plan/check/apply；documents/domains映射已有设计，stackRoots/checks接入模块命令，保留源码/README/package/CI/正文。batch-plan生成多仓计划，可按单个root消费；接线成功仍可能有项目内容整改阻断。
- 已受管仓使用upgrade；receipt区分项目正文/配置和模板工具，三方合并保留用户增改删，接受明确新配置；手改工具冲突先拒绝。来源快照排除依赖/本地输出，显式owner与检查输入仍校验。
- 受管资产CLI支持workspace、状态/引用/租约/pin、export/verify-export、plan/apply、隔离/restore/recover及run-due。默认自动GC关闭；只管理登记的新bundle，不认领或删除旧历史/过程目录。活跃/blocked、引用、租约和必要证据保护，损坏/丢失导出不作为可删依据。
- 默认Python lint/typecheck以显式规则枚举真实源文件并报告实际argv/集合，空选择阻断；自定义检查的执行契约在升级时整体保留。runner先取得受管输入租约，保存run时转为持久引用，保留期内及被pin的凭据保护必要输入；中断保护可明确恢复。finish先保护最新证据再更新状态，成功后释放旧run任务pin。core.assets检查策略/登记完整性。前台维护周期实际可运行；systemd/launchd/windows及GitHub/GitLab配置可生成，本地prepare执行声明的argv/cwd。
- init-code-repo及dev-conductor已同步真实入口；[README](../README.md)给出新仓、存量、批量计划、升级与资产操作示例。

## 当前验证与边界

四项分项独立审阅均通过。最新全量npm test为251/251通过，零失败/跳过；npm run check为21装配场景、421生成脚本语法检查通过。全量曾发现模板中伪链接示例误阻断24项，修正文案后重跑通过；未放宽链接检查。整体审阅又发现Python默认根输入误拦及受管输入缺少GC保护，两项已补11个先失败后通过的端到端回归并修复，限定复审确认通过；负号前缀输入未绑定内容的F1-R1也已补三项反例修复，独立复现确认修改输入后旧凭据拒绝完成。最终复审通过，无剩余已确认Critical/Important。git diff --check、47个本轮变化文件空白检查及10份实际Markdown中的32个本地链接检查通过。

已有独立fresh agent实际按技能接入普通既有仓，保留15个原文件（入口按约定追加）、执行模块业务检查、生成真实Chrome截图及脚本/报告，导出/隔离/恢复字节一致，升级保留原设计，生成两仓计划；未填ROADMAP被正确阻断。Linux前台两轮周期真实完成隔离/清除；带空格/$/%的systemd配置经本机解析器检查。

未向用户其他真实仓应用、未安装OS调度、未运行远端CI；macOS/Windows/Git Bash/WSL及真实Spec Kit Agent命令未验收。先前原版Spec Kit helper调用只证明路径/正文保留，不能证明完整集成。多轮样本、单次技能试用和结构检查均不证明中大型项目长期维护收益。

既有历史/过程目录仍需显式认领/整改方案；GC不会自动修复设计或架构腐化。latest任务证据保留pin，需明确保留/导出/退役策略后处置，不承诺全部完成材料自动清除。生成项目仍要补真实设计和业务检查；复杂域拆并、同域多Agent并发及长期跨机治理需要项目实证。

## 下一步与恢复材料

1. 本轮模板实施已完成；本地结果为251/251与21场景/421语法检查通过。后续新发现仍须以反例修复及真实项目验收校准，不能从本次通过推断长期效果。
2. 后续选择真实仓，用仓外配置和plan先审阅映射/冲突/整改清单，再按授权逐仓apply与真实业务验收。复杂历史迁移、删除、Git写入、发布与OS安装不从本轮授权推导。
3. 采用固定模型/任务/质量约束做连续变化试点，评价违约检出、误阻断、恢复、设计漂移及维护成本；不以测试数/文档数作收益证明。

[当前进度](implementation/design-authority-correction/PROGRESS.md)记录执行恢复点；忽略的`specs/002-development-governance/plan/implementation.md`和`engineering-asset-lifecycle.md`为本轮执行稿。各域implement中的completion-protection、assets、adoption、integration报告/审阅及skill-application-report记录局部证据，不承诺跨机存在。缺失时从三个正式域、可运行测试与README重建验证，不复制全部过程稿进入长期源码。

实施前快照`/tmp/vibe-implementation-baseline-i7hmek5v`用于本轮差异审阅；Git HEAD不是此次实施的完整基线。工作区main已有大量未提交/未跟踪成果，保护全部现场；无stage/commit/push/merge/tag、发布部署、外部消息或历史清理。所有GC删除/恢复测试均在隔离临时仓。
