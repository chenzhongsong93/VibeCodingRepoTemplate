# 下沉 BaiWang 后续治理能力 — 设计

> 日期：2026-07-22
> 主题：把 BaiWang_dev_mvp 的 4 项后续治理能力（上游 vendoring 治理 / 错误记忆台账 / worktree 生命周期 / 部署门禁）下沉为 VibeCodingRepoTemplate 的通用可选组件
> 状态：Spec（待审）
> 前序：2026-07-21 下沉了三层组件（agent-policy/dev-flow-skills/pi-cadence），见 `docs/superpowers/specs/2026-07-21-sinkback-dev-governance-design.md`

## 1. 背景与目标

上一轮下沉了三层研发治理（节奏/流程/执行，3 组件 + 机制扩展，62 测试通过，tag `release-sinkback-dev-governance`）。本轮下沉 memory `baiwang-sinkback-plan.md` 记录的其余 HIGH 价值候选（agent-governance 自动同步继续 YAGNI）。

**目标**：把 4 项后续能力做成 init-code-repo 的 4 个独立可选组件（has-upstream / error-log / worktree-tooling / deployment-gates），复用上轮装配机制，**零机制类型改动**（conditional.mjs 不动），向后兼容（13 个现有 golden 不变）。

**非目标**：agent-governance 自动同步/哈希锁（YAGNI，两个迭代后再评估）；check-k8s.mjs 独立脚本；worktree install 自动检测栈；UPSTREAM-SYNC 自动 diff 脚本；deployment-gates 与编程栈同仓的 Makefile 合并。

## 2. 已定决策（brainstorming 共识）

1. **4 项一份大 spec**，agent-governance 自动同步继续 YAGNI。
2. **ERROR_LOG 独立组件**（不归 full-ledger）——过程错误 vs 产品缺陷/债务，不同维度。
3. **deployment-gates 新组件**（非 stack）——deployment 仓无编程栈，作为组件装配 Makefile 到仓根，避免"主栈"语义冲突。
4. **4 组件全独立无依赖**——conditional.mjs 不改，只 substitute/assemble 加变量。
5. **装配方案 A**：每组件独立 `<!--require:cond-->` 文件级 gate + `{{VAR}}` 变量替换。

## 3. 总体架构

4 个独立可选组件，复用上轮装配机制（`<!--IF:-->`/`<!--require:-->`/`{{VAR}}`），零新机制类型。与上轮 3 组件正交可叠加。

| 组件 | cond | 类型 | 依赖 | 建议同装 |
|---|---|---|---|---|
| 上游 vendoring 治理 | has-upstream | 文档 | 无 | — |
| 错误记忆台账 | error-log | 文档 | 无 | full-ledger |
| worktree 生命周期 | worktree-tooling | 脚本+配置 | 无 | — |
| 部署门禁 | deployment-gates | Makefile | 无（agent-policy 条件复用） | agent-policy |

组件依赖：全部独立，无派生态（conditional.mjs 不改）。deployment-gates 与 agent-policy 是条件复用（Makefile 内 `<!--IF:agent-policy-->` 注入 policy-check），非强制依赖。

## 4. has-upstream 组件

**cond**：`has-upstream`。**依赖**：无。

### 4.1 文件清单

| 文件 | 路径（模板） | 条件 | 内容 |
|---|---|---|---|
| 上游同步说明 | `core/UPSTREAM-SYNC.md.tmpl` | `<!--require:has-upstream-->` | 来源/基线/许可证/收编范围表/回归 diff/同步流程 |
| Attribution | `core/NOTICE.tmpl` | `<!--require:has-upstream-->` | 上游许可证 attribution 骨架 |

> BaiWang 放 `infra/UPSTREAM-SYNC.md`；模板放仓根（更通用，不假设 infra/ 目录）。放仓根的 UPSTREAM-SYNC.md 与 README.md/AGENTS.md 平级。

### 4.2 UPSTREAM-SYNC.md.tmpl 内容（源+替换表）

源：BaiWang `baiwang-deployment/infra/UPSTREAM-SYNC.md`。应用替换表：

| 搜索 | 替换 |
|---|---|
| `octo-deployment` / `octo` | `{{UPSTREAM_REPO}}` |
| 基线 commit hash `b718fbbc...` | `{{UPSTREAM_BASELINE}}` |
| `Apache License 2.0` | `{{UPSTREAM_LICENSE}}` |
| `LICENSE.octo` / `NOTICE.octo` | `LICENSE.upstream` / `NOTICE.upstream` |
| `*.baiwang.*` / `values-baiwang.yaml` / `baiwang-base` / `overlays/baiwang` | `*.overlay.*` / `values-overlay.yaml` / `overlay-base` / `overlays/overlay`（泛化 overlay 命名） |
| BaiWang 收编范围表具体行 | TODO 占位行（上游路径→本仓路径→改动，用户填） |
| `/root/code_repo/octo/octo-deployment/` 本地路径 | `{{UPSTREAM_REPO}}` 仓名（不写本地绝对路径） |

保留：来源段 / 收编范围表结构 / 回归基线 diff 流程（3 条 `diff -r` 骨架，排除 overlay 文件）/ 同步上游更新流程（pull→diff→合入→更新基线→提交）/ overlay-only 承诺。

### 4.3 NOTICE.tmpl 内容

Attribution 骨架：
```
本仓部分内容收编自 {{UPSTREAM_REPO}}（许可证：{{UPSTREAM_LICENSE}}）。
上游许可证与声明见 LICENSE.upstream + NOTICE.upstream。
```

### 4.4 变量

| 占位符 | 默认 | 来源 |
|---|---|---|
| `{{UPSTREAM_REPO}}` | `（TODO: 填上游仓名）` | 阶段1录取（has-upstream 激活时追问） |
| `{{UPSTREAM_BASELINE}}` | `（TODO: 填上游基线 commit）` | 阶段1录取 |
| `{{UPSTREAM_LICENSE}}` | `（TODO: 填上游许可证，如 Apache-2.0）` | 阶段1录取 |

默认 TODO 占位（用户未填时文档显式标 TODO 而非留空）。

### 4.5 naming

UPSTREAM-SYNC.md / NOTICE 恒英文文件名（不进 ZH 映射）。理由：工具契约文件（与 README.md/AGENTS.md 平级的治理文件），且 UPSTREAM-SYNC.md 是上游 sync 约定文件，引用多。

## 5. error-log 组件

**cond**：`error-log`。**依赖**：无。

### 5.1 文件清单

| 文件 | 路径 | 条件 | 内容 |
|---|---|---|---|
| 错误记忆台账 | `core/ERROR_LOG.md.tmpl` | `<!--require:error-log-->` | 结构化过程错误台账 |

### 5.2 ERROR_LOG.md.tmpl 内容（源+替换表）

源：BaiWang `baiwang-deployment/ERROR_LOG.md`。应用替换表：

| 搜索 | 替换 |
|---|---|
| BaiWang ERR #1 / ERR #2 具体条目 | 删除（只留条目模板 + 1 个 TODO 示例） |
| `docs/rules/commit-rules.md` 链接 | `{{FNAME:docs/rules/commit-rules.md}}` + `{{FILE:docs/rules/commit-rules.md}}`（naming-aware） |
| BaiWang 业务引用（Bug #16/部署规划指导书等） | 删除 |

保留结构：
- 头部：跨会话感知说明 + 规则来源指针（`{{FNAME:docs/rules/commit-rules.md}}`）
- 记录时机说明：犯过 2 次以上的错或高频痛点；与 bugs（产品缺陷）/debt（债务）区分——过程错误
- 条目模板（1 个 TODO 示例 + 结构说明）：
  ```
  ## ERR #N: <标题>
  - 时间：
  - 现象：
  - 根因：
  - 为什么会出现：
  - 如何预防/修复：
  - 关联：
  - 教训：
  ```

### 5.3 与 full-ledger 关系

独立组件（不归 full-ledger）。full-ledger 的 bugs/debt/version-log 是产物台账；error-log 是过程错误记忆。两者可同装（full-ledger + error-log）或独立。不强制绑定。

### 5.4 naming

`ERROR_LOG.md` 已在 naming.mjs ZH 映射（`错误日志.md`，上轮已存在）。zh 命名场景自动映射。✓

## 6. worktree-tooling 组件

**cond**：`worktree-tooling`。**依赖**：无。

### 6.1 文件清单

| 文件 | 路径 | 条件 | 内容 |
|---|---|---|---|
| 建 worktree 脚本 | `core/scripts/new-worktree.sh.tmpl` | `<!--require:worktree-tooling-->` | 建-worktree + symlinks + install |
| 清理 worktree 脚本 | `core/scripts/cleanup-worktree.sh.tmpl` | `<!--require:worktree-tooling-->` | 删 worktree + 分支 + 可选远端 |
| committed 配置 | `core/AGENTS.config.json.tmpl` | `<!--require:worktree-tooling-->` | 团队默认（defaultBase/types/parent/installCmd） |
| local 配置范本 | `core/AGENTS.config.local.json.example.tmpl` | `<!--require:worktree-tooling-->` | 机器本地覆盖范本 |
| .gitignore 追加 | `core/.gitignore.tmpl` | `<!--IF:worktree-tooling-->` 段 | 加 `AGENTS.config.local.json` |

### 6.2 new-worktree.sh.tmpl（源+替换表）

源：BaiWang `baiwang-web/scripts/new-worktree.sh`。应用替换表：

| 搜索 | 替换 |
|---|---|
| `origin/develop`（DEFAULT_BASE） | `origin/{{MAIN_BRANCH}}` |
| `pnpm install --frozen-lockfile \|\| pnpm install` | 读 `AGENTS.config.worktree.installCmd`，默认空=不自动 install |
| BaiWang 分支类型 `feat/sosoclaw/...` 示例 | 泛化示例 `feat/your-team/add-feature` |
| `pnpm new:worktree` 用法说明 | 泛化为 `./scripts/new-worktree.sh`（不绑 pnpm） |

保留：`read_json`（python3，通用）/ 分支类型校验（`branch.types`）/ worktree 路径（`worktree.parent`）/ symlinks 复制 / `--yes` 确认 / 已存在检查。

**install 泛化**（关键）：BaiWang 硬编码 `pnpm install`。模板改为读 `AGENTS.config.worktree.installCmd`：
- 默认空 → 不自动 install（通用，不绑栈）
- node 仓配 `pnpm install --frozen-lockfile`
- rust 仓配 `cargo build`
- 其他仓按需配

### 6.3 cleanup-worktree.sh.tmpl（源+替换表）

源：BaiWang `baiwang-web/scripts/cleanup-worktree.sh`（读实际内容对齐）。泛化：
- 删 worktree + 本地分支 + 可选远端分支（`--remote` flag）
- 从 `AGENTS.config.local.json` 读 `worktree.parent`
- 安全检查：不删主分支（`{{MAIN_BRANCH}}`/`{{DEV_BRANCH}}`）、确认门
- 去除 pnpm 特定引用

### 6.4 AGENTS.config.json.tmpl（committed defaults）

```json
{
  "branch": {
    "defaultBase": "origin/{{MAIN_BRANCH}}",
    "types": ["feat", "fix", "chore", "docs", "refactor"]
  },
  "worktree": {
    "parent": "..",
    "symlinks": [],
    "installCmd": ""
  }
}
```

`{{MAIN_BRANCH}}` 在装配时替换（assemble.mjs ctx 始终派生分支变量，不依赖 agent-policy 激活）。✓

### 6.5 AGENTS.config.local.json.example.tmpl

机器本地覆盖范本（gitignored）：
```json
{
  "worktree": {
    "parent": "/path/to/your/worktree-parent",
    "symlinks": ["node_modules"]
  },
  "remote": "origin"
}
```

### 6.6 .gitignore 追加

`core/.gitignore.tmpl` 加 `<!--IF:worktree-tooling-->` 段：`AGENTS.config.local.json`。

### 6.7 变量

无新变量（用 `{{MAIN_BRANCH}}`/`{{DEV_BRANCH}}` 在脚本/config 内替换，已注册）。assemble.mjs ctx 始终派生分支变量（不依赖 agent-policy）。

### 6.8 naming

`AGENTS.config.json`/`AGENTS.config.local.json`/`new-worktree.sh`/`cleanup-worktree.sh` 工具契约/脚本文件，恒英文不映射。

## 7. deployment-gates 组件

**cond**：`deployment-gates`。**依赖**：无（agent-policy 条件复用）。

### 7.1 文件清单

| 文件 | 路径 | 条件 | 内容 |
|---|---|---|---|
| 部署 Makefile | `core/Makefile.tmpl` | `<!--require:deployment-gates-->` | deployment 专属 verify 目标 |

### 7.2 约束

deployment-gates 用于**纯部署仓**（`stacks:[]`，无编程栈）。与编程栈同仓会冲突（stacks Makefile 覆盖 core Makefile）。SKILL.md 组件表标注此约束。

### 7.3 Makefile.tmpl 内容（源+替换表）

源：BaiWang `baiwang-deployment/Makefile`。分层泛化：

**通用部分（不依赖项目特定路径，开箱即用）：**
```makefile
SHELL := /bin/sh
.DEFAULT_GOAL := help

.PHONY: help verify-fast verify-ci verify-k8s verify-release

help:
	@echo "verify-fast     快速静态门禁"
	@echo "verify-ci       全量静态解析与脚本语法检查"
	@echo "verify-k8s      helm chart lint + 渲染"
	@echo "verify-release  显式授权后运行 E2E"

verify-fast:
	@git diff HEAD --check
<!--IF:agent-policy-->
	@node scripts/check-agent-policy.mjs .
<!--/IF:agent-policy-->
	@[ -d infra ] && find infra -type f -name '*.sh' -exec bash -n {} + || true
	@[ -d infra ] && find infra -type f -name '*.json' -exec python3 -m json.tool {} >/dev/null \; || true
	@echo "[verify-fast] OK"
```

**项目特定部分（TODO 占位，用户填路径）：**
```makefile
# TODO: 填 kustomize 目标，如 infra/kustomize/overlays/dev
KUSTOMIZE_TARGETS :=
# TODO: 填 helm chart 路径，如 infra/helm/<chart>
HELM_CHARTS :=

verify-ci: verify-fast
	@# TODO: for target in $(KUSTOMIZE_TARGETS); do kubectl kustomize "$$target" >/dev/null; done
	@echo "[verify-ci] OK"

verify-k8s:
	@command -v helm >/dev/null || { echo "[verify-k8s] helm 未安装，跳过（非阻断）"; exit 0; }
	@# TODO: helm lint + helm template $(HELM_CHARTS)
	@echo "[verify-k8s] OK"

verify-release: verify-ci
	@test "$${ALLOW_REAL_E2E:-}" = "1" || { echo "需 ALLOW_REAL_E2E=1"; exit 2; }
	@# TODO: e2e 脚本
```

**关键设计：** 通用部分（whitespace + policy-check + shell bash -n + JSON validate）开箱即用且不依赖项目特定路径；kustomize/helm/compose 部分用 TODO 占位。verify-k8s 的 helm 未装跳过（非阻断，与 BaiWang 一致）。

**去 BaiWang：** 删除 `COMPOSE_FILES`/`OCTO_CI_SECRETS`/`KUSTOMIZE_CI_TARGETS` 具体值（用 TODO 占位）；删除 octo/baiwang 所有引用。

### 7.4 与 agent-policy 关系

`<!--IF:agent-policy-->` 注入 policy-check 到 verify-fast（deployment 仓装 agent-policy 时复用策略校验）。不强制依赖（deployment-gates 可单装，verify-fast 无 policy-check）。

### 7.5 变量

无新变量（Makefile 静态 + TODO 占位）。

### 7.6 naming

Makefile 恒英文（工具契约文件）。不映射。

## 8. 装配机制改动

### 8.1 substitute.mjs VARS +3

```js
UPSTREAM_REPO: 'upstreamRepo',
UPSTREAM_BASELINE: 'upstreamBaseline',
UPSTREAM_LICENSE: 'upstreamLicense',
```

### 8.2 assemble.mjs ctx +3 派生

```js
const up = config.upstream || {};
const upstreamRepo = up.repo || '（TODO: 填上游仓名）';
const upstreamBaseline = up.baseline || '（TODO: 填上游基线 commit）';
const upstreamLicense = up.license || '（TODO: 填上游许可证，如 Apache-2.0）';
```
ctx 加 `upstreamRepo, upstreamBaseline, upstreamLicense`。

### 8.3 conditional.mjs 无改

4 组件全独立无依赖，不需要派生态。

### 8.4 SKILL.md

- 阶段1录取新增 1 项：「上游来源」（has-upstream 激活时追问上游仓名/基线/许可证，默认 TODO）
- 可选组件表 +4 行（has-upstream/error-log/worktree-tooling/deployment-gates）
- 组件直传枚举 +4
- 变量表 +3（UPSTREAM_REPO/UPSTREAM_BASELINE/UPSTREAM_LICENSE）
- deployment-gates 行标注约束："用于纯部署仓（stacks:[]，无编程栈）"

### 8.5 naming.mjs 无改

`ERROR_LOG.md` 已在 ZH 映射（上轮）。其余新文件恒英文。

### 8.6 .gitignore

`core/.gitignore.tmpl` 加 `<!--IF:worktree-tooling-->` 段：`AGENTS.config.local.json`。

## 9. 测试

### 9.1 新增 5 场景

| 场景 | components | 验证 |
|---|---|---|
| `has-upstream` | has-upstream | UPSTREAM-SYNC.md + NOTICE 存在，{{UPSTREAM_*}} 替换，无 octo/baiwang，回归 diff 流程 + overlay 约定 |
| `error-log` | error-log | ERROR_LOG.md 存在，条目模板结构，naming-aware 链接 |
| `worktree-tooling` | worktree-tooling | 2 脚本 + AGENTS.config.json + .local.example，{{MAIN_BRANCH}} 替换为 main，installCmd 配置化（非硬编码 pnpm），.gitignore 含 local |
| `deployment-gates` | deployment-gates | Makefile 存在，verify-fast/ci/k8s/release 目标，通用部分开箱即用（shell bash -n + JSON validate），kustomize/helm 部分 TODO，helm 未装跳过 |
| `full-followups` | 4 项 + agent-policy + dev-flow-skills，stacks:[]（纯部署仓） | 4 组件 + 上轮组件集成，deployment-gates Makefile 含 policy-check（agent-policy 条件注入） |

### 9.2 回归红线

13 个现有 golden（9 existing + 上轮 4：agent-policy/dev-flow-skills/pi-cadence/full-governance）expected-tree.json **全部不变**。

### 9.3 关键断言

- has-upstream：UPSTREAM-SYNC.md 含 `diff -r` 回归流程 + overlay 约定；`{{UPSTREAM_REPO}}` 等替换无残留；无 octo/baiwang
- error-log：ERROR_LOG.md 含条目模板 8 字段（时间/现象/根因/为什么/预防/关联/教训 + 标题）；naming-aware 链接
- worktree-tooling：new-worktree.sh 含 `origin/main`（{{MAIN_BRANCH}} 替换）；`installCmd` 配置读取（非 `pnpm install` 硬编码）；.gitignore 含 `AGENTS.config.local.json`
- deployment-gates：Makefile verify-fast 含 `bash -n` + `json.tool`（通用部分）；`KUSTOMIZE_TARGETS`/`HELM_CHARTS` 含 TODO；`<!--IF:agent-policy-->` policy-check（full-followups 场景验证含 `check-agent-policy.mjs`）
- 全场景死链 + assertClean

## 10. YAGNI（不做）

- agent-governance 自动同步/哈希锁（人工同步已够，两个迭代后再评估）
- check-k8s.mjs 独立脚本（Makefile 直接调 kubectl/helm）
- worktree install 自动检测栈（用 installCmd 配置）
- UPSTREAM-SYNC 自动 diff 脚本（文档说明 diff 命令）
- deployment-gates 与编程栈同仓的 Makefile 合并（限纯部署仓）

## 11. 实施顺序（供 writing-plans）

1. 机制扩展（substitute +3 / assemble ctx +3 / SKILL.md / .gitignore）
2. has-upstream（UPSTREAM-SYNC.md + NOTICE）
3. error-log（ERROR_LOG.md）
4. worktree-tooling（new-worktree.sh + cleanup-worktree.sh + AGENTS.config.json + .local.example）
5. deployment-gates（Makefile）
6. 5 测试场景 + golden + 回归

## 12. 与上轮的关系

- 复用上轮装配机制（`<!--IF:-->`/`<!--require:-->`/`{{VAR}}`/conditional 栈解析器）
- 复用上轮变量（`{{MAIN_BRANCH}}`/`{{DEV_BRANCH}}`/`{{POLICY_ID}}`/`{{VERIFY_FAST_CMD}}`）
- 新增 3 变量（`{{UPSTREAM_*}}`）
- 与上轮 3 组件正交可叠加（full-followups 场景验证集成）
- 零机制类型改动（conditional.mjs 不动，区别于上轮的栈解析器重写）
- 回归红线从 9 扩到 13（含上轮 4 golden），证明两轮叠加向后兼容
