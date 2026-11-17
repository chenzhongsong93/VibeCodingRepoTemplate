# VibeCodingRepoTemplate

通用代码仓与Agent协作模板。v2覆盖新仓初始化、存量仓认领整改、长期设计维护、实际验证和受管资产生命周期。同域变化修改同一设计；临时脚本、截图、报告和日志有归属、保留、承接及GC入口。核心仅需Node >=22标准库，不依赖新的平台或扫描服务。

模板安装、项目内容整改、实际业务验收和长期效果分别报告。存量仓接入保留原有正文与代码，给出可审阅改动和内容差距；不会自动重写业务设计或清理未知历史。当前实施/验证及平台边界见[交接](docs/HANDOVER.md)。

## 入口

- [init-code-repo](skills/init-code-repo/SKILL.md)：新仓装配、普通存量仓整改认领、多仓计划、工具升级。
- [dev-conductor](skills/dev-conductor/SKILL.md)：建仓后引导设计、开发任务与中断续接。
- [当前系统设计](docs/00-system/system-design.md)、[长期域设计](specs/README.md)、[实施与验证](docs/implementation/design-authority-correction/PROGRESS.md)。研究材料用于溯源，当前设计以原owner为准。

## 使用

手动复制`skills/init-code-repo/`和`skills/dev-conductor/`到所用Agent的技能目录，或直接让Agent读取入口。无需安装外部skill服务。机器装配与检查需本地Node >=22；Agent可以离线阅读模板，但不能把未运行机器门禁说成通过。

示例录取配置（保存在临时文件或项目外）：

```json
{
  "projectName": "ExampleApp",
  "oneLine": "项目的一句话定位",
  "year": "2026",
  "stacks": [],
  "runtimes": ["codex"],
  "remote": "none",
  "preset": "minimal",
  "components": [],
  "commitGate": {"mode": "default"}
}
```

```bash
node skills/init-code-repo/assemble.mjs --config <配置.json> --root <新仓> --plan
node skills/init-code-repo/assemble.mjs --config <配置.json> --root <新仓>
```

未知能力、互斥组合、同名输出、路径逃逸、symlink和已有目标文件在写入前拒绝。支持rust、Node前端/后端、python、go、java；Node前后端须在stackRoots声明不同模块目录，deployment-gates不能与编程栈同选。真实测试/构建工具与业务集成仍需项目填实，不因选monorepo便自动验收。

## 存量仓整改与多个仓接入

普通既有仓没有模板receipt时走adopt，保留README、AGENTS/CLAUDE、包配置、已有CI、源码与设计；职责映射指向现有正文，避免生成另一套架构文档。配置及计划放在目标仓外：

```bash
node skills/init-code-repo/adopt.mjs inspect --root <已有仓>
node skills/init-code-repo/adopt.mjs plan --root <已有仓> --config <仓外配置.json> --out <仓外计划.json>
node skills/init-code-repo/adopt.mjs check --root <已有仓> --plan <仓外计划.json>
node skills/init-code-repo/adopt.mjs apply --root <已有仓> --plan <已审阅计划.json>
```

在基础录取中增加实际映射，例如：

```json
{
  "projectName": "ExistingApp",
  "oneLine": "已有业务系统",
  "repoShape": "monorepo",
  "stacks": ["python", "node-frontend"],
  "stackRoots": {"python": "services/api", "node-frontend": "web"},
  "documents": {"systemDesign": "docs/architecture.md", "domainIndex": "docs/domains.md"},
  "domains": [{"id": "orders", "path": "docs/design/orders.md", "description": "订单职责"}]
}
```

`checks`声明实际argv/cwd/inputs和适用层级，`ci.bootstrap`声明环境准备命令。计划的remediation列出缺失内容、未认领职责、机查结构及真实命令差距；apply只是安全接线，后续按原设计整改并验证。源文件变化、工具碰撞或symlink先阻断，应用保留备份及逆向清单。

多仓清单为`[{"root":"/绝对仓路径","config":"/仓外配置.json"}]`，config也可直接内联对象：

```bash
node skills/init-code-repo/adopt.mjs batch-plan --roots <仓外清单.json> --out <仓外批量计划.json>
node skills/init-code-repo/adopt.mjs check --root <其中一个仓> --plan <仓外批量计划.json>
node skills/init-code-repo/adopt.mjs apply --root <其中一个仓> --plan <仓外批量计划.json>
```

只对明确列出的根生成计划，应用时仍明确选定一个仓。不会自动扫描或修改其他代码仓。

## v2分层

| 资产 | 职责 |
|---|---|
| 宪法 / AGENTS / rules / 平台薄入口 | 治理不变量、政策摘要/设计地图、执行规则和薄适配 |
| `docs/00-system` | 系统边界、公共不变量与共享模型的唯一正文 |
| 域索引登记的实际Markdown设计路径 | 长期需求/验收、结构/流程、决策/红线及实现状态；新仓建议specs/NNN-domain/spec.md，存量仓复用已有路径 |
| 默认 `docs/skills/e2e-dev-flow` | Spec Kit规范链与superpowers方法链共享同一组产物；缺方法时明确执行等价步骤 |
| 专门契约 / 长期测试资产 / 台账 | 字段/接口/回归唯一归宿、缺陷及债务追踪，引用系统与域设计 |
| 短HANDOVER / 域内忽略的plan、tasks、implement | 当前变化和全部未闭环；重型过程稿不持续积入源码 |
| `.harness/project.json` / `scripts/harness` | 能力/路径/命令与最小结构检查；可选task助手在`.harness/local/tasks`，不定义设计权威 |
| `.harness/assets.json` / 受管本地资产 | 工作材料、运行证据、缓存的保护/保留/回收；未知历史不自动认领 |

产品/战略/北极星、三层测试、PI、Docker、API文档、文档站、视觉资产、台账、上游归属、错误记忆、多仓、worktree继续可选。预设只展开为同一能力集，不替代风险判定。

## 验证与任务

生成仓内：

```bash
node scripts/harness/check.mjs --profile fast
node scripts/harness/task-cli.mjs create --title <任务主题> --domain <域索引中的实际路径>
node scripts/harness/check.mjs --profile ci --task <ID> --intent complete
```

先识别真实功能域、填实系统和域设计，再按e2e推进；初始化不强塞治理业务域。task CLI仅为可选助手，使用时填写risk/impact/真实验收来源与检查映射。fast的exit0只表示实际子集通过，taskReady仍false；complete要求真实域来源、受影响owner及内容审查/回刷证据。结构机查不证明设计语义，验收仍须对照真实行为。必需依赖缺失/超时为blocked，检查失败为fail，可选未执行为skipped，不适用为not-applicable。输出退出码0/1/2、命令、工具版本、输入指纹与证据路径。release缺任务/授权引用/回滚/真实L3配置时阻断，不自动发布。

T0只读不落任务文件；T1可短方案；T2重大结构先方案后实施；T3单独授权。状态文件不是防篡改权限系统，批准引用不能代替实际用户授权。跨机器恢复仅覆盖实际收到的共享快照，本机日志丢失须重跑。

## 临时资产、GC与证据

```bash
node scripts/harness/assets-cli.mjs workspace --work order-cancel --kind work --producer agent
node scripts/harness/assets-cli.mjs inventory
node scripts/harness/assets-cli.mjs plan > .harness/local/gc-plan.json
node scripts/harness/assets-cli.mjs apply --plan .harness/local/gc-plan.json
node scripts/harness/assets-cli.mjs restore --id <资产ID>
node scripts/harness/assets-cli.mjs run-due
```

把脚本/截图/报告输出到workspace返回的path。活跃/失败/租约及引用保护优先；长期结论回原owner，必要证据export并核验后，再以明确disposition关闭。清理先隔离后到期删除；源、引用、策略变更会使旧计划失效；承接包丢失/过期时保护唯一源。普通check不会隐式清理。

自动策略默认关闭，项目确认`.harness/assets.json`范围后开启，范围内执行无需逐次请批。`maintenance.mjs run`提供实际周期调用，`render --platform systemd|launchd|windows`生成带仓身份的配置但不自动安装；`ci.mjs render --provider github|gitlab`生成实际workflow，不覆盖既有pipeline，也不自动触发云CI。CI证据过期不能代替发布支持期内的证据保留。

完整命令和边界见生成仓[资产维护指南模板](skills/init-code-repo/templates/v2/docs/guides/asset-lifecycle.md.tmpl)。同机协作锁/恢复日志不等于任意同权限进程间的全仓原子事务；Linux本地运行与其他OS配置生成分开报告。

## 方法与填实样本

[两域样本](skills/init-code-repo/examples/README.md)随技能分发；维护仓连续演进验收复用同一份样本，覆盖同域三轮、跨域违约阻断和无本地草稿的新快照恢复。维护仓自身也按[系统设计](docs/00-system/system-design.md)和[三个长期域](specs/README.md)治理。

已在生成项目独立副本连续两轮应用superpowers 7.0.2指令方法及仓内等价规范链，复用原设计/计划/任务；Spec Kit未安装。默认模板已定义完整方法/产物契约和同等仓内路径，实际外部Spec Kit调用尚未验证，不能据文案声称集成成功。多OS/Agent加载、真实部署及中大型系统长期效果均需另行实测。

## 已有仓升级与兼容

```bash
node skills/init-code-repo/upgrade.mjs plan --root <已有仓> --config <新配置.json> --out <方案.json>
node skills/init-code-repo/upgrade.mjs check --root <已有仓> --plan <方案.json>
node skills/init-code-repo/upgrade.mjs apply --root <已有仓> --plan <已审阅方案.json>
```

v1额外用`--from-config <准确旧配置.json>`建立基线。receipt区分project-owned正文/实际配置和template-owned工具：保留前者的维护内容，后者手改仍冲突；明确的新配置与项目自定义按升级计划核对。计划后变化拒绝，先暂存与备份并保留逆向清单。退役/未选文件保留，不自动迁移、删除、提交或推送。`assembleV1`及原模板/golden保留用于显式v1回归，不把旧项目冒充v2。

worktree清理只提供预览；创建是单独显式命令，不fetch/安装。多仓聚合只读已准备的本地组件快照，缺失则blocked，不自动clone或生成“完整”结果。hooks只有显式安装才生效，服务端模板不代表托管平台已支持。可选gitleaks是本地工具，未安装时明确skipped，不新增扫描服务。

## 维护验证

```bash
npm test
npm run check
git diff --check
```

v1场景保持独立回归，v2覆盖配置交叉因素、真实CLI、检查器坏例、任务续接/证据失效和升级冲突，不靠批量覆盖golden消除失败。Linux本机结果不代表macOS、Git Bash、WSL或所有Agent已实际加载。完整性通过也不代表设计语义充分、真实部署或性能收益。

许可证：[Apache 2.0](LICENSE)。
