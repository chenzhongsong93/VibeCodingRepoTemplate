---
name: init-code-repo
description: Use when initializing a new repository, retrofitting an existing codebase, planning adoption across multiple repositories, or upgrading installed engineering tooling while preserving project assets.
---

# 初始化、存量整改与升级代码仓

先查Git状态、用户目标、已有文件和授权。空白新仓走assemble；普通存量仓无receipt走adopt；已有模板receipt走upgrade。新仓、认领整改和工具升级是不同操作，不把“实现/升级”解释为允许覆盖手改、提交或发布。

## 录取

收集projectName、oneLine、stacks、repoShape(single/monorepo)、repoRole(single/component/central-docs)、runtimes、remote、commitGate、components、naming(en/zh/custom)。可选preset为minimal/standard/product，展开为同一能力集；用户已有答案不重复询问。

commitGate是对象：`{"mode":"default"}`、`{"mode":"none"}`或`{"mode":"custom","regex":"正则表达式"}`；省略时为default。runtimes/components/stacks均为数组，不以off等自由文本代替契约值。

支持栈、能力、预设及文件owner见[本地定义](contracts/definitions.json)。monorepo使用stackRoots明确每栈目录；Node前后端只有不同根才可组合，deployment-gates+编程栈仍拒绝。未知能力、重复输出、路径逃逸、symlink或未裁决同名工具冲突在写入前拒绝。

宪法、系统设计骨架、长期域索引/完整模板、默认e2e和本地检查始终存在；产品、扩展方法入口、三层测试、PI、上游、文档视图、多仓和worktree按选择装配。minimal可简写内容但不能关闭设计权威；新项目先识别实际功能域，不强塞治理业务域。

## 新仓

1. 检查目标目录与配置；列出将生成的文件。已有文件不覆盖；即使仅有README/LICENSE，遇到同名输出也需明确合并方案。
2. 推荐使用已随技能提供的本地Node >=22参考入口（相对路径以本技能安装目录为准）：

```bash
node <本技能目录>/assemble.mjs --config <录取配置.json> --root <目标仓> --plan
node <本技能目录>/assemble.mjs --config <录取配置.json> --root <目标仓>
```

3. 校验生成文件、命名路径、启用技能索引和公共入口：

```bash
node scripts/harness/check.mjs --profile fast
```

4. 指向AGENTS、宪法、系统/域索引及默认e2e；报告文件范围、未填设计、验证结果/未运行、工作区和下一步，交给dev-conductor。初始化不自动开始开发、安装hook或提交。

Agent可离线读取模板装配，但必须遵循assemble.mjs/project.mjs的同一契约：变量替换→命名映射→条件剥离，先在内存求全量文件owner/冲突，再写入；从definitions的supersedes显式替换旧输入，不靠后写覆盖。JSON配置由project.mjs解析生成，不手写另一套推导。不能证明输出一致时使用参考入口；无Node时机器验证为blocked，不声称零运行时全绿。

## 普通存量仓：认领与整改

没有`.harness/assembly.json`且不是已知v1模板基线时，用随技能提供的adopt入口。inspect只给文件/Markdown候选，不自动判断哪份设计正确。将配置和计划放在目标仓外，避免生成计划本身使仓内来源快照过期：

```bash
node <本技能目录>/adopt.mjs inspect --root <目标仓>
node <本技能目录>/adopt.mjs plan --root <目标仓> --config <仓外录取配置.json> --out <仓外整改计划.json>
node <本技能目录>/adopt.mjs check --root <目标仓> --plan <仓外整改计划.json>
node <本技能目录>/adopt.mjs apply --root <目标仓> --plan <已审阅整改计划.json>
```

在原录取字段上增加明确职责映射，保持现有正文：

```json
{
  "projectName": "ExistingApp",
  "oneLine": "已有业务系统",
  "stacks": ["python", "node-frontend"],
  "repoShape": "monorepo",
  "stackRoots": {"python": "services/api", "node-frontend": "web"},
  "documents": {"systemDesign": "docs/architecture.md", "domainIndex": "docs/domains.md"},
  "domains": [{"id": "orders", "path": "docs/design/orders.md", "description": "订单当前行为及边界"}]
}
```

角色还包括constitution/domainModel/handover/workflow/e2e等；仅映射真实已有权威，不为了满足默认路径再复制一份设计。实际命令以checks的argv/cwd/inputs声明，补真实L2/L3；ci.bootstrap配置明确的工具/依赖准备argv。缺失的项目内容由plan.remediation列出；在原文中修正结构、验收和状态，不把骨架或安全接线成功当完整整改。

checks命令的完整例子：`{"id":"orders.test","kind":"command","argv":["node","--test","tests/orders.test.mjs"],"cwd":"modules/orders","inputs":["src","tests"],"profiles":["fast","ci"],"required":true,"layer":"L1","timeoutSeconds":60,"effect":"local-validation"}`。effect只能是local-validation或real-e2e；后者属于另有实际授权的真实环境验证。timeoutSeconds须大于0；不要从工具名推断已安装或已运行。

adopt保留README、包/构建配置、已有CI、源码和设计正文；AGENTS/CLAUDE/域索引/ignore仅有界追加入口。未知工具碰撞保持conflict，来源变化后重新plan。用户已授权当前整改范围且check无冲突时继续apply，不重复请批；未明确的历史删除、职责重划或语义冲突先给具体处置方案。

多仓使用`node <本技能目录>/adopt.mjs batch-plan --roots <仓外清单.json> --out <仓外批量计划.json>`；清单为`[{"root":"/绝对仓路径","config":{...}}]`，config也可指向录取JSON文件。只处理明确列出的仓，批量动作只生成计划，分别核对并应用每仓方案，不扫描并重写相邻项目。

## 已有模板仓升级：plan/check/apply

禁止对已有仓调用新仓写入路径。先提供录取配置；v2用.harness/assembly.json中的原始hash识别人改，v1必须用户提供准确旧配置作为基线，不根据当前文件猜测。

```bash
node <本技能目录>/upgrade.mjs plan --root <目标仓> --config <新配置.json> --out <方案.json>
# v1额外提供 --from-config <旧配置.json>
node <本技能目录>/upgrade.mjs check --root <目标仓> --plan <方案.json>
node <本技能目录>/upgrade.mjs apply --root <目标仓> --plan <已审阅方案.json>
```

plan给出每文件add/update/unchanged/retain/conflict、基线/当前/目标hash和内容。receipt区分project-owned正文/实际配置与template-owned工具；前者保留用户维护内容，后者手改拒绝覆盖。升级继承当前职责映射，不能通过新默认配置生成第二套权威。用户已经授权具体升级范围且无冲突时继续apply，不重复请批。未知归属、计划后变化、symlink或指纹不符均拒绝；apply暂存/备份并保留逆向清单，不自动删除退役文件或改Git。

## 临时资产与实际工程入口

默认装配assets-cli、maintenance和ci入口及资产保留策略。通过`node scripts/harness/assets-cli.mjs workspace --work <变化标识> --kind work --producer agent`取得受管临时输出目录；实际报告自动登记。结束前长期结论回原owner、必要证据导出核验、明确处置后关闭。保留规则启用后run-due在该范围内自动执行，无需逐次确认；未知历史不清理。详见生成仓的docs/guides/asset-lifecycle.md（按实际命名映射定位）。

`maintenance.mjs render --platform systemd|launchd|windows`只生成调度配置，实际安装/运行分别报告。`ci.mjs render --provider github|gitlab`生成真实workflow，已有pipeline不同则显式接同一prepare/check命令。其他平台使用通用入口，不能声称已有专用适配。新仓和存量仓都应验证真实cwd、工具/依赖和命令，而不只查文件存在。

## 完成边界

fast只说明本次子集检查。设计占位/空节、域结构与过程稿边界由最小检查处理；真正完成还须对照所属长期spec、系统不变量、真实验收和语义审查，converge更新原owner并HANDOVER。可选本地task助手的`--task ID --intent complete`必须有真实域来源及收敛记录，不能以政策/阶段note放行；它不是所有开发的强制平台。Spec Kit规范链+superpowers方法链在默认e2e明确调用与同一落点；已安装时实际使用，缺失按同等步骤执行并如实报告，不能把文案中的命令当已验证集成。

所有回应中文。工具许可、状态字段和“验收通过”都不授予提交、推送、发布或清场权限。

## 填实参考

随技能分发的[两域样本](examples/README.md)提供系统设计、共享模型、两份长期spec和可运行纯Node行为，不自动写入用户项目；它与维护仓连续演进验收共用同一份正文。
