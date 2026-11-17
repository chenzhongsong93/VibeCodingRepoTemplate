# AGENTS.md — VibeCodingRepoTemplate

本文件治理模板维护仓。生成项目的政策来自templates；不能把生成项目的分支、构建栈或产品规则反套本仓。

## 授权与现场

修改前检查git status/diff；保护已有改动。实现授权不包含git add/commit/push/tag/merge、发布、外部消息、历史迁移或清场；这些动作分别需要明确授权。已有任务授权持续有效，无需逐阶段重复请批。用户当前指令优先于仓内和技能规则。

## 当前设计权威

[项目宪法](.specify/memory/constitution.md)定义治理不变量；[系统总体设计](docs/00-system/system-design.md)定义公共边界；[域索引](specs/README.md)定位装配、开发治理、验证三份长期特性设计。需求/结构/流程/决策在所属域就地维护，研究/旧实施报告不是另一套当前设计。

新过程细稿放所属域忽略的plan/tasks/implement；本轮沿用已有纠偏进度文件，长期结论回刷上述owner，不再开新报告目录。

## 实际入口与职责

- `skills/init-code-repo/SKILL.md`：初始化/升级的使用契约。
- `skills/init-code-repo/assemble.mjs`：默认v2，预检后写入新仓；`assemble-v1.mjs`是显式v1回归入口。
- `skills/init-code-repo/contracts/`：版本、能力、互斥、文件替换owner与schema。
- `skills/init-code-repo/templates/v2/`：v2公共规则、续接、检查器和薄适配；原core/stacks等仍是v1资产与v2复用输入，不静默修改历史语义。
- `skills/dev-conductor/SKILL.md`：引导和续接同一项目生命周期。
- `skills/init-code-repo/upgrade.mjs`：显式plan/check/apply，不自动升级、删除或提交。

## 开发与验证

行为改动先写能失败的测试，再实现；不通过更新golden掩盖行为回归。v1原场景与v2行为测试分别保留。修改涉及入口/文档、能力/命名、检查/状态、升级时同步对应契约与测试。

- `npm test`：v1及v2全部本地测试；不安装依赖、不执行Git写操作。
- `npm run check`：全部场景装配、残留变量/文件语法和契约检查。
- `git diff --check`：差异格式检查。

本地验证需Node >=22，无新增npm依赖或第三方服务。Linux结果不替代macOS/Git Bash/WSL或真实Agent加载验证。结构检查通过不证明部署或业务效果。

## 续接

先读`docs/HANDOVER.md`和上述系统/域设计，再按活跃变化读取`docs/implementation/design-authority-correction/PROGRESS.md`及PLAN。原工具实施目录`docs/implementation/agent-harness-v2/`与研究包`docs/research/2026-11-16-agent-harness/`保留历史与出处；不是当前设计正文。研究证据行号固定在调查HEAD，不把后续修改后的工作树行号当旧证据。
