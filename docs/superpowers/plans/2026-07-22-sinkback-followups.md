# 下沉 BaiWang 后续治理能力 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 BaiWang_dev_mvp 的 4 项后续治理能力下沉为 VibeCodingRepoTemplate 的 4 个独立可选组件（has-upstream / error-log / worktree-tooling / deployment-gates），零机制类型改动，向后兼容。

**Architecture:** 4 个独立可选组件，复用上轮装配机制（`<!--IF:cond-->`/`<!--require:cond-->`/`{{VAR}}`）。conditional.mjs 不改（无组件依赖）。3 新变量（`{{UPSTREAM_*}}`）。向后兼容靠 13 个现有 golden 不变。

**Tech Stack:** Node.js（assemble.mjs + node:test）、模板条件装配机制、bash（worktree 脚本）、Make（deployment Makefile）。

**Spec:** `docs/superpowers/specs/2026-07-22-sinkback-followups-design.md`

**BaiWang 源仓:** `/root/code_repo/BaiWang_dev_mvp`（泛化来源）

**测试命令:** `npm test`（跑 `node --test tests/run_tests.mjs`，当前 62 pass）

**约定：** 标注「源+替换表」的模板文件 = 读 BaiWang 源文件 + 应用替换表 + 加条件标记后写入目标 `.tmpl`。替换表每行 `搜索 → 替换`。所有 `.tmpl` 文件首行按需加 `<!--require:cond-->`。

---

## File Structure

### 机制文件（修改）
- `skills/init-code-repo/substitute.mjs` — VARS +3（UPSTREAM_REPO/UPSTREAM_BASELINE/UPSTREAM_LICENSE）
- `skills/init-code-repo/assemble.mjs` — ctx +3 派生（config.upstream）
- `skills/init-code-repo/SKILL.md` — 阶段1录取 +1 项 + 组件表 +4 行 + 变量表 +3 + 枚举 +4

### has-upstream 组件（新建）
- `templates/core/UPSTREAM-SYNC.md.tmpl`
- `templates/core/NOTICE.tmpl`

### error-log 组件（新建）
- `templates/core/ERROR_LOG.md.tmpl`

### worktree-tooling 组件（新建/修改）
- `templates/core/scripts/new-worktree.sh.tmpl`
- `templates/core/scripts/cleanup-worktree.sh.tmpl`
- `templates/core/AGENTS.config.json.tmpl`
- `templates/core/AGENTS.config.local.json.example.tmpl`
- `templates/core/.gitignore.tmpl` — **修改**：加 `<!--IF:worktree-tooling-->` 段

### deployment-gates 组件（新建）
- `templates/core/Makefile.tmpl`

### 测试（新建）
- `tests/scenarios/{has-upstream,error-log,worktree-tooling,deployment-gates,full-followups}/config.json` + `tests/golden/.../expected-tree.json`
- `tests/run_tests.mjs` — 加 5 场景用例

---

## Task 1: 机制扩展

**Files:**
- Modify: `skills/init-code-repo/substitute.mjs`
- Modify: `skills/init-code-repo/assemble.mjs`
- Modify: `skills/init-code-repo/SKILL.md`

- [ ] **Step 1.1: substitute.mjs VARS +3**

修改 `skills/init-code-repo/substitute.mjs`，VARS 加 3 项（在上轮 12 项基础上）。完整新 VARS：

```js
const VARS = {
  PROJECT_NAME: 'projectName',
  ONE_LINE: 'oneLine',
  YEAR: 'year',
  COMMIT_REGEX: 'commitRegex',
  DEV_BRANCH: 'devBranch',
  MAIN_BRANCH: 'mainBranch',
  FIX_BRANCH: 'fixBranch',
  RELEASE_PREFIX: 'releasePrefix',
  POLICY_ID: 'policyId',
  PI_FORMAT: 'piFormat',
  PI_FIRST: 'piFirst',
  VERIFY_FAST_CMD: 'verifyFastCmd',
  UPSTREAM_REPO: 'upstreamRepo',
  UPSTREAM_BASELINE: 'upstreamBaseline',
  UPSTREAM_LICENSE: 'upstreamLicense',
};
```

- [ ] **Step 1.2: assemble.mjs ctx +3 派生**

修改 `skills/init-code-repo/assemble.mjs` 的 `assemble` 函数，在上轮 ctx 派生块后加 3 行派生 + ctx 加 3 字段。读现有 ctx 块（上轮已含 devBranch/mainBranch/.../verifyFastCmd），在 verifyFastCmd 派生后加：

```js
  const up = config.upstream || {};
  const upstreamRepo = up.repo || '（TODO: 填上游仓名）';
  const upstreamBaseline = up.baseline || '（TODO: 填上游基线 commit）';
  const upstreamLicense = up.license || '（TODO: 填上游许可证，如 Apache-2.0）';
```

ctx 对象加 `upstreamRepo, upstreamBaseline, upstreamLicense`（与现有字段并列）。

- [ ] **Step 1.3: SKILL.md 录取 + 组件表 + 变量表 + 枚举**

修改 `skills/init-code-repo/SKILL.md`：

(a) 阶段1录取表，在「PI 命名格式」行后、「文档命名」行前加 1 行：
```markdown
| 上游来源 | 上游仓名 / 基线 commit / 许可证（默认 TODO 占位） | has-upstream 激活时填入 {{UPSTREAM_REPO}}/{{UPSTREAM_BASELINE}}/{{UPSTREAM_LICENSE}} |
```

(b) 可选组件表末尾加 4 行：
```markdown
| 上游 vendoring 治理 | has-upstream | UPSTREAM-SYNC.md + NOTICE | overlay-only 约定 + 回归 diff |
| 错误记忆台账 | error-log | ERROR_LOG.md | 跨会话过程错误台账 |
| worktree 生命周期 | worktree-tooling | scripts/{new,cleanup}-worktree.sh + AGENTS.config.json + .local.example | .gitignore 加 local config |
| 部署门禁 | deployment-gates | Makefile（deployment 专属 verify 目标） | 用于纯部署仓（stacks:[]，无编程栈） |
```

(c) 组件直传枚举（§4 激活集推导）加 4 个：`has-upstream`、`error-log`、`worktree-tooling`、`deployment-gates`。

(d) 变量表（§1 变量替换）加 3 行：
```markdown
| `{{UPSTREAM_REPO}}` | upstreamRepo | 阶段1录取（上游仓名，默认 TODO 占位） |
| `{{UPSTREAM_BASELINE}}` | upstreamBaseline | 阶段1录取（上游基线 commit，默认 TODO） |
| `{{UPSTREAM_LICENSE}}` | upstreamLicense | 阶段1录取（上游许可证，默认 TODO） |
```

- [ ] **Step 1.4: 跑测试验证回归**

Run: `npm test`
Expected: 62 pass / 0 fail（此步只改机制，新组件模板未写，不影响现有场景）。

- [ ] **Step 1.5: Commit**

```bash
git add skills/init-code-repo/substitute.mjs skills/init-code-repo/assemble.mjs skills/init-code-repo/SKILL.md
git commit -m "feat(init-code-repo): 装配机制扩展支持 has-upstream/error-log/worktree-tooling/deployment-gates

- substitute: VARS +3（UPSTREAM_REPO/BASELINE/LICENSE）
- assemble: ctx 派生 upstream（默认 TODO 占位）
- SKILL: 阶段1录取+1 + 组件表+4 + 变量表+3

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: has-upstream 组件

**Files:**
- Create: `templates/core/UPSTREAM-SYNC.md.tmpl`
- Create: `templates/core/NOTICE.tmpl`
- Source: `/root/code_repo/BaiWang_dev_mvp/baiwang-deployment/infra/UPSTREAM-SYNC.md`

- [ ] **Step 2.1: UPSTREAM-SYNC.md.tmpl（源+替换表）**

首行 `<!--require:has-upstream-->`。从 BaiWang 源 `baiwang-deployment/infra/UPSTREAM-SYNC.md` 复制，应用替换表：

| 搜索 | 替换 |
|---|---|
| `octo-deployment` / `octo`（仓名） | `{{UPSTREAM_REPO}}` |
| 基线 commit `b718fbbc0a7a64b6c2ac04956f40dbbbd3a5675d` | `{{UPSTREAM_BASELINE}}` |
| `Apache License 2.0` | `{{UPSTREAM_LICENSE}}` |
| `LICENSE.octo` / `NOTICE.octo` | `LICENSE.upstream` / `NOTICE.upstream` |
| `*.baiwang.*` / `values-baiwang.yaml` / `baiwang-base` / `overlays/baiwang` | `*.overlay.*` / `values-overlay.yaml` / `overlay-base` / `overlays/overlay` |
| 收编范围表 BaiWang 具体行（docker/helm/kustomize 4 行） | 2 行 TODO 占位（上游路径→本仓路径→改动，用户填） |
| `/root/code_repo/octo/octo-deployment/` 本地绝对路径 | `{{UPSTREAM_REPO}}` 仓名（diff 命令里用 `<upstream-repo-path>` 占位） |

保留：来源段结构 / 收编范围表表头 / 回归基线 diff 流程（3 条 `diff -r` 骨架，排除 overlay 文件，零输出=未偷改）/ 同步上游更新流程（pull→diff→合入→更新基线→提交）/ overlay-only 承诺段。

- [ ] **Step 2.2: NOTICE.tmpl**

首行 `<!--require:has-upstream-->`。完整内容：

```
<!--require:has-upstream-->
# NOTICE

本仓部分内容收编自 {{UPSTREAM_REPO}}（许可证：{{UPSTREAM_LICENSE}}）。
上游许可证与声明见 LICENSE.upstream + NOTICE.upstream。

收编基线：{{UPSTREAM_BASELINE}}
```

- [ ] **Step 2.3: 测试断言**

在 `tests/run_tests.mjs` 加：
```js
test('has-upstream: UPSTREAM-SYNC + NOTICE', () => {
  const tmp = '/tmp/init-code-repo-test-has-upstream';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, { projectName:'P', oneLine:'L', year:'2026', stacks:[], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:['has-upstream'], upstream:{repo:'upstream-foo', baseline:'abc123', license:'MIT'} });
  const tree = fileTree(tmp);
  assertOk(tree.includes('UPSTREAM-SYNC.md'), 'UPSTREAM-SYNC.md present');
  assertOk(tree.includes('NOTICE'), 'NOTICE present');
  const us = readFileSync(`${tmp}/UPSTREAM-SYNC.md`, 'utf8');
  assertOk(us.includes('upstream-foo'), 'UPSTREAM_REPO substituted');
  assertOk(us.includes('abc123'), 'UPSTREAM_BASELINE substituted');
  assertOk(us.includes('MIT'), 'UPSTREAM_LICENSE substituted');
  assertOk(us.includes('diff -r'), 'has regression diff flow');
  assertOk(us.includes('overlay'), 'has overlay convention');
  assertOk(!us.includes('{{UPSTREAM_REPO}}'), 'no leftover var');
  assertOk(!us.includes('octo') && !us.includes('baiwang'), 'no baiwang/octo');
  assertClean(us, 'UPSTREAM-SYNC');
  const nt = readFileSync(`${tmp}/NOTICE`, 'utf8');
  assertOk(nt.includes('upstream-foo') && nt.includes('MIT'), 'NOTICE substituted');
  assertClean(nt, 'NOTICE');
});
```

- [ ] **Step 2.4: 跑测试 + Commit**

Run: `npm test` → 63 pass。Commit:

```bash
git add templates/core/UPSTREAM-SYNC.md.tmpl templates/core/NOTICE.tmpl tests/run_tests.mjs
git commit -m "feat(has-upstream): UPSTREAM-SYNC.md + NOTICE 上游 vendoring 治理

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: error-log 组件

**Files:**
- Create: `templates/core/ERROR_LOG.md.tmpl`
- Source: `/root/code_repo/BaiWang_dev_mvp/baiwang-deployment/ERROR_LOG.md`

- [ ] **Step 3.1: ERROR_LOG.md.tmpl（源+替换表）**

首行 `<!--require:error-log-->`。从 BaiWang 源 `baiwang-deployment/ERROR_LOG.md` 复制结构，应用替换表：

| 搜索 | 替换 |
|---|---|
| ERR #1 / ERR #2 具体条目全文 | 删除（只留条目模板 + 1 个 TODO 示例） |
| `[docs/rules/commit-rules.md](docs/rules/commit-rules.md)` | `[{{FNAME:docs/rules/commit-rules.md}}]({{FILE:docs/rules/commit-rules.md}})` |
| BaiWang 业务引用（Bug #16、部署规划指导书等） | 删除 |

保留 + 重写为模板骨架：
```
<!--require:error-log-->
# ERROR_LOG — 错误记忆台账

> 跨会话感知：记录犯过 2 次以上的错或高频痛点，避免重复踩坑。
> 与 [{{FNAME:docs/ledger/bugs.md}}]({{FILE:docs/ledger/bugs.md}})（产品缺陷）/ [{{FNAME:docs/ledger/debt.md}}]({{FILE:docs/ledger/debt.md}})（债务）区分——本台账记**过程错误**（犯过的错）。
> 规则来源详见 [{{FNAME:docs/rules/commit-rules.md}}]({{FILE:docs/rules/commit-rules.md}})。

## 条目模板

每条按以下结构记录：

## ERR #N: <标题>

- 时间：
- 现象：
- 根因：
- 为什么会出现：
- 如何预防/修复：
- 关联：
- 教训：

## ERR #1: （TODO: 填首条过程错误）

（TODO: 按上述模板填写。犯过 2 次以上的错或高频痛点才记入。）
```

> 注：`docs/ledger/bugs.md` + `docs/ledger/debt.md` 链接——bugs.md 是核心必带（恒存在），debt.md 仅 full-ledger 激活时存在。error-log 单装（无 full-ledger）时 debt.md 死链。用 `<!--IF:full-ledger-->` 包裹 debt.md 链接避免死链：
> ```
> > 与 [{{FNAME:docs/ledger/bugs.md}}]({{FILE:docs/ledger/bugs.md}})（产品缺陷）<!--IF:full-ledger-->/ [{{FNAME:docs/ledger/debt.md}}]({{FILE:docs/ledger/debt.md}})（债务）<!--/IF:full-ledger-->区分——本台账记**过程错误**。
> ```

- [ ] **Step 3.2: 测试断言**

```js
test('error-log: ERROR_LOG structure + naming-aware links', () => {
  const tmp = '/tmp/init-code-repo-test-error-log';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, { projectName:'P', oneLine:'L', year:'2026', stacks:[], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:['error-log'] });
  const tree = fileTree(tmp);
  assertOk(tree.includes('ERROR_LOG.md'), 'ERROR_LOG.md present');
  const el = readFileSync(`${tmp}/ERROR_LOG.md`, 'utf8');
  assertOk(el.includes('ERR #N'), 'has entry template');
  assertOk(el.includes('根因'), 'has root-cause field');
  assertOk(el.includes('教训'), 'has lesson field');
  assertOk(el.includes('过程错误'), 'distinguishes process error');
  assertOk(!el.includes('baiwang') && !el.includes('蓝区'), 'no baiwang business');
  assertClean(el, 'ERROR_LOG');
  // debt.md 链接因无 full-ledger 被剥离（无死链）
  assertOk(!el.includes('debt.md'), 'debt.md link stripped without full-ledger');
  const dead = deadLinks(tmp);
  assert.equal(dead.length, 0, 'no dead links');
});
```

- [ ] **Step 3.3: 跑测试 + Commit**

Run: `npm test` → 64 pass。Commit:

```bash
git add templates/core/ERROR_LOG.md.tmpl tests/run_tests.mjs
git commit -m "feat(error-log): ERROR_LOG.md 跨会话过程错误台账

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: worktree-tooling 组件

**Files:**
- Create: `templates/core/scripts/new-worktree.sh.tmpl`
- Create: `templates/core/scripts/cleanup-worktree.sh.tmpl`
- Create: `templates/core/AGENTS.config.json.tmpl`
- Create: `templates/core/AGENTS.config.local.json.example.tmpl`
- Modify: `templates/core/.gitignore.tmpl`
- Source: `/root/code_repo/BaiWang_dev_mvp/baiwang-web/scripts/{new-worktree.sh,cleanup-worktree.sh}`

- [ ] **Step 4.1: new-worktree.sh.tmpl（源+替换表）**

首行 `<!--require:worktree-tooling-->`。从 BaiWang 源 `baiwang-web/scripts/new-worktree.sh` 复制，应用替换表：

| 搜索 | 替换 |
|---|---|
| `origin/develop`（DEFAULT_BASE 默认） | `origin/{{MAIN_BRANCH}}` |
| `pnpm install --frozen-lockfile 2>/dev/null \|\| pnpm install` | 读 `AGENTS.config.worktree.installCmd`，默认空=不自动 install（见下方 install 泛化） |
| `pnpm new:worktree`（用法说明） | `./scripts/new-worktree.sh` |
| `feat/sosoclaw/add-login`（示例分支） | `feat/your-team/add-feature` |
| `pnpm dev`（结尾提示） | 删除或泛化为 `# 按本栈方式启动` |

保留：`read_json`（python3，通用）/ `REPO_ROOT` 探测 / `AGENTS.config.json` + `AGENTS.config.local.json` 双配置读取 / `branch.defaultBase` / `worktree.parent` / `remote` / `branch.types` 校验 / `--yes` 确认 / symlinks 复制 / worktree 已存在检查。

**install 泛化**（关键）：替换 BaiWang 硬编码 pnpm install 段为：
```bash
# install（按 AGENTS.config.worktree.installCmd，默认空=不自动 install）
INSTALL_CMD=$(read_json "$CONFIG" "worktree.installCmd" "")
if [ -n "$INSTALL_CMD" ]; then
  echo "📦 $INSTALL_CMD..."
  cd "$WORKTREE_DIR"
  $INSTALL_CMD
else
  echo "ℹ️  未配置 installCmd，跳过自动 install"
fi
```

- [ ] **Step 4.2: cleanup-worktree.sh.tmpl（源+替换表）**

首行 `<!--require:worktree-tooling-->`。从 BaiWang 源 `baiwang-web/scripts/cleanup-worktree.sh` 复制（读实际内容对齐），泛化：
- 删 worktree + 本地分支 + 可选远端分支（`--remote` flag，确认门）
- 从 `AGENTS.config.local.json` 读 `worktree.parent`
- 安全检查：不删 `{{MAIN_BRANCH}}`/`{{DEV_BRANCH}}` 主分支（替换 BaiWang 硬编码 main/dev_mvp）
- 去除 pnpm 特定引用
- `read_json` 保留

- [ ] **Step 4.3: AGENTS.config.json.tmpl**

首行 `<!--require:worktree-tooling-->`。完整内容：
```json
<!--require:worktree-tooling-->
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

- [ ] **Step 4.4: AGENTS.config.local.json.example.tmpl**

首行 `<!--require:worktree-tooling-->`。完整内容：
```json
<!--require:worktree-tooling-->
{
  "worktree": {
    "parent": "/path/to/your/worktree-parent",
    "symlinks": ["node_modules"]
  },
  "remote": "origin"
}
```

- [ ] **Step 4.5: .gitignore.tmpl 加 worktree-tooling 段**

读 `templates/core/.gitignore.tmpl` 现有内容，追加：
```
<!--IF:worktree-tooling-->
AGENTS.config.local.json
<!--/IF:worktree-tooling-->
```

- [ ] **Step 4.6: 测试断言**

```js
test('worktree-tooling: scripts + config + gitignore', () => {
  const tmp = '/tmp/init-code-repo-test-worktree';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, { projectName:'P', oneLine:'L', year:'2026', stacks:[], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:['worktree-tooling'] });
  const tree = fileTree(tmp);
  assertOk(tree.includes('scripts/new-worktree.sh'), 'new-worktree.sh present');
  assertOk(tree.includes('scripts/cleanup-worktree.sh'), 'cleanup-worktree.sh present');
  assertOk(tree.includes('AGENTS.config.json'), 'AGENTS.config.json present');
  assertOk(tree.includes('AGENTS.config.local.json.example'), 'local example present');
  const nw = readFileSync(`${tmp}/scripts/new-worktree.sh`, 'utf8');
  assertOk(nw.includes('origin/main'), 'MAIN_BRANCH substituted to origin/main');
  assertOk(!nw.includes('{{MAIN_BRANCH}}'), 'no leftover MAIN_BRANCH var');
  assertOk(nw.includes('installCmd'), 'installCmd config-driven');
  assertOk(!nw.includes('pnpm install'), 'no hardcoded pnpm install');
  assertOk(!nw.includes('sosoclaw'), 'no baiwang-specific branch');
  assertClean(nw, 'new-worktree.sh');
  const cfg = readFileSync(`${tmp}/AGENTS.config.json`, 'utf8');
  assertOk(cfg.includes('origin/main'), 'config MAIN_BRANCH substituted');
  assertOk(JSON.parse(cfg.replace(/<!--.*?-->/g,'').trim()).branch.defaultBase === 'origin/main', 'config valid JSON');
  const gi = readFileSync(`${tmp}/.gitignore`, 'utf8');
  assertOk(gi.includes('AGENTS.config.local.json'), 'gitignore has local config');
  assertClean(gi, 'gitignore');
  // 不装 worktree-tooling → 无这些文件 + gitignore 无 local 行
  const tmp2 = '/tmp/init-code-repo-test-worktree-no';
  rmSync(tmp2, { recursive: true, force: true });
  assemble(tmp2, { projectName:'P', oneLine:'L', year:'2026', stacks:[], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:[] });
  const t2 = fileTree(tmp2);
  assertOk(!t2.includes('scripts/new-worktree.sh'), 'no worktree scripts without component');
  assertOk(!t2.includes('AGENTS.config.json'), 'no AGENTS.config without component');
  assertOk(!readFileSync(`${tmp2}/.gitignore`,'utf8').includes('AGENTS.config.local.json'), 'gitignore no local without component');
});
```

- [ ] **Step 4.7: 跑测试 + Commit**

Run: `npm test` → 65 pass。Commit:

```bash
git add templates/core/scripts/new-worktree.sh.tmpl templates/core/scripts/cleanup-worktree.sh.tmpl templates/core/AGENTS.config.json.tmpl templates/core/AGENTS.config.local.json.example.tmpl templates/core/.gitignore.tmpl tests/run_tests.mjs
git commit -m "feat(worktree-tooling): new/cleanup-worktree.sh + AGENTS.config + gitignore

installCmd 配置化（不绑 node 栈）；{{MAIN_BRANCH}} 替换；local config gitignore。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: deployment-gates 组件

**Files:**
- Create: `templates/core/Makefile.tmpl`
- Source: `/root/code_repo/BaiWang_dev_mvp/baiwang-deployment/Makefile`

- [ ] **Step 5.1: Makefile.tmpl**

首行 `<!--require:deployment-gates-->`。完整内容（泛化自 BaiWang，分层：通用部分开箱即用 + 项目特定 TODO 占位）：

```makefile
<!--require:deployment-gates-->
SHELL := /bin/sh
.DEFAULT_GOAL := help

# TODO: 填 kustomize 目标，如 infra/kustomize/overlays/dev
KUSTOMIZE_TARGETS :=
# TODO: 填 helm chart 路径，如 infra/helm/<chart>
HELM_CHARTS :=

.PHONY: help verify-fast verify-ci verify-k8s verify-release

help:
	@echo "verify-fast     快速静态门禁（whitespace + policy + shell/JSON 语法）"
	@echo "verify-ci       全量静态解析（+ kustomize 渲染）"
	@echo "verify-k8s      helm chart lint + 渲染（helm 未装则跳过）"
	@echo "verify-release  显式授权后运行 E2E"

verify-fast:
	@git diff HEAD --check
<!--IF:agent-policy-->
	@node scripts/check-agent-policy.mjs .
<!--/IF:agent-policy-->
	@[ -d infra ] && find infra -type f -name '*.sh' -exec bash -n {} + || true
	@[ -d infra ] && find infra -type f -name '*.json' -exec python3 -m json.tool {} >/dev/null \; || true
	@echo "[verify-fast] OK"

verify-ci: verify-fast
	@set -eu; for target in $(KUSTOMIZE_TARGETS); do \
		kubectl kustomize "$$target" >/dev/null; \
	done
	@echo "[verify-ci] OK"

verify-k8s:
	@command -v helm >/dev/null || { echo "[verify-k8s] helm 未安装，跳过（非阻断）"; exit 0; }
	@set -eu; for chart in $(HELM_CHARTS); do \
		helm lint "$$chart" >/dev/null; \
		helm template "$$chart" >/dev/null; \
	done
	@echo "[verify-k8s] OK"

verify-release: verify-ci
	@test "$${ALLOW_REAL_E2E:-}" = "1" || { echo "拒绝运行：verify-release 会跑真实 E2E；确认授权后设置 ALLOW_REAL_E2E=1" >&2; exit 2; }
	@# TODO: e2e 脚本（如 cd infra && ./run_e2e.sh）
```

> 关键：`[ -d infra ]` 守卫让 verify-fast 在 infra/ 不存在时跳过（开箱即用）；kustomize/helm 部分用 `KUSTOMIZE_TARGETS`/`HELM_CHARTS` 变量（用户填，默认空→循环不执行）；`<!--IF:agent-policy-->` 注入 policy-check（deployment-gates + agent-policy 同装时）；verify-k8s helm 未装跳过非阻断。Makefile recipe 行用 TAB 缩进。

- [ ] **Step 5.2: 测试断言**

```js
test('deployment-gates: Makefile verify targets', () => {
  const tmp = '/tmp/init-code-repo-test-deployment';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, { projectName:'P', oneLine:'L', year:'2026', stacks:[], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:['deployment-gates'] });
  const tree = fileTree(tmp);
  assertOk(tree.includes('Makefile'), 'Makefile present');
  const mk = readFileSync(`${tmp}/Makefile`, 'utf8');
  assertOk(mk.includes('verify-fast:'), 'has verify-fast');
  assertOk(mk.includes('verify-ci:'), 'has verify-ci');
  assertOk(mk.includes('verify-k8s:'), 'has verify-k8s');
  assertOk(mk.includes('verify-release:'), 'has verify-release');
  assertOk(mk.includes('ALLOW_REAL_E2E'), 'has ALLOW_REAL_E2E guard');
  assertOk(mk.includes('[ -d infra ]'), 'has infra guard');
  assertOk(mk.includes('KUSTOMIZE_TARGETS'), 'has kustomize TODO');
  assertOk(mk.includes('HELM_CHARTS'), 'has helm TODO');
  assertOk(!mk.includes('octo') && !mk.includes('baiwang'), 'no baiwang/octo');
  // 无 agent-policy → 无 policy-check
  assertOk(!mk.includes('check-agent-policy.mjs'), 'no policy-check without agent-policy');
  assertClean(mk, 'deployment Makefile');
  // verify-fast 可跑（infra 不存在，守卫跳过）
  const r = spawnSync('make', ['-C', tmp, 'verify-fast']);
  assert.equal(r.status, 0, `verify-fast exits 0; stderr: ${String(r.stderr)}`);
});

test('deployment-gates + agent-policy: policy-check injected', () => {
  const tmp = '/tmp/init-code-repo-test-deployment-ap';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, { projectName:'P', oneLine:'L', year:'2026', stacks:[], repoShape:'single', runtimes:['claude-code'], remote:'none', commitGate:{mode:'default'}, components:['deployment-gates','agent-policy'] });
  const mk = readFileSync(`${tmp}/Makefile`, 'utf8');
  assertOk(mk.includes('check-agent-policy.mjs'), 'policy-check injected with agent-policy');
  assertClean(mk, 'deployment+agent-policy Makefile');
});
```

- [ ] **Step 5.3: 跑测试 + Commit**

Run: `npm test` → 67 pass。Commit:

```bash
git add templates/core/Makefile.tmpl tests/run_tests.mjs
git commit -m "feat(deployment-gates): 部署仓 Makefile（verify-fast/ci/k8s/release）

通用部分开箱即用（[ -d infra ] 守卫 + shell/JSON 校验）；kustomize/helm TODO 占位；
agent-policy 条件注入 policy-check；helm 未装跳过。

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: 测试场景 + golden + 回归

**Files:**
- Create: `tests/scenarios/{has-upstream,error-log,worktree-tooling,deployment-gates,full-followups}/config.json`
- Create: `tests/golden/{...}/expected-tree.json`
- Modify: `tests/run_tests.mjs`

- [ ] **Step 6.1: 5 场景 config**

`tests/scenarios/has-upstream/config.json`:
```json
{
  "projectName": "HasUpstreamApp",
  "oneLine": "含上游 vendoring 的应用",
  "year": "2026",
  "stacks": [],
  "repoShape": "single",
  "runtimes": [],
  "remote": "none",
  "commitGate": { "mode": "default" },
  "components": ["has-upstream"],
  "upstream": { "repo": "upstream-lib", "baseline": "a1b2c3d", "license": "Apache-2.0" }
}
```

`tests/scenarios/error-log/config.json`: components `["error-log"]`，stacks `[]`，runtimes `[]`，remote `"none"`。

`tests/scenarios/worktree-tooling/config.json`: components `["worktree-tooling"]`，stacks `[]`，runtimes `[]`，remote `"none"`。

`tests/scenarios/deployment-gates/config.json`: components `["deployment-gates"]`，stacks `[]`，runtimes `[]`，remote `"none"`。

`tests/scenarios/full-followups/config.json`: components `["has-upstream","error-log","worktree-tooling","deployment-gates","agent-policy","dev-flow-skills"]`，stacks `[]`（纯部署仓），runtimes `["claude-code"]`，remote `"github"`，upstream `{repo:"upstream-lib",baseline:"a1b2c3d",license:"Apache-2.0"}`，branchModel `{dev:"dev"}`。

- [ ] **Step 6.2: 生成 golden expected-tree**

对每场景装配后用 fileTree 导出。临时 Node 脚本（纯 Node，无 shell）：

```bash
node --input-type=module -e "
import { fileTree } from './tests/lib/tree.mjs';
import { assemble } from './skills/init-code-repo/assemble.mjs';
import { rmSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
for (const name of ['has-upstream','error-log','worktree-tooling','deployment-gates','full-followups']) {
  const cfg = JSON.parse(readFileSync('tests/scenarios/'+name+'/config.json','utf8'));
  const tmp = '/tmp/gen-'+name; rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, cfg);
  mkdirSync('tests/golden/'+name, { recursive: true });
  writeFileSync('tests/golden/'+name+'/expected-tree.json', JSON.stringify(fileTree(tmp), null, 2)+'\n');
  console.log(name+': '+fileTree(tmp).length+' files');
}
"
```

人工核对每 expected-tree.json：
- has-upstream: UPSTREAM-SYNC.md + NOTICE
- error-log: ERROR_LOG.md
- worktree-tooling: scripts/{new,cleanup}-worktree.sh + AGENTS.config.json + AGENTS.config.local.json.example
- deployment-gates: Makefile
- full-followups: 全部 + agent-policy 套件 + dev-flow-skills 套件

- [ ] **Step 6.3: run_tests.mjs 加场景循环**

```js
const FOLLOWUP_SCENARIOS = ['has-upstream', 'error-log', 'worktree-tooling', 'deployment-gates', 'full-followups'];

for (const name of FOLLOWUP_SCENARIOS) {
  test(`${name}: file tree matches golden`, () => {
    const tmp = `/tmp/init-code-repo-test-${name}`;
    rmSync(tmp, { recursive: true, force: true });
    assemble(tmp, JSON.parse(readFileSync(`tests/scenarios/${name}/config.json`, 'utf8')));
    assertTreeEqual(fileTree(tmp), JSON.parse(readFileSync(`tests/golden/${name}/expected-tree.json`, 'utf8')), `${name} tree`);
  });

  test(`${name}: no dead links + clean`, () => {
    const tmp = `/tmp/init-code-repo-test-${name}-clean`;
    rmSync(tmp, { recursive: true, force: true });
    assemble(tmp, JSON.parse(readFileSync(`tests/scenarios/${name}/config.json`, 'utf8')));
    assert.equal(deadLinks(tmp).length, 0, `${name} dead links`);
    for (const f of fileTree(tmp)) if (!f.endsWith('.gitkeep')) assertClean(readFileSync(`${tmp}/${f}`,'utf8'), `${name}:${f}`);
  });
}
```

- [ ] **Step 6.4: 跑全量测试**

Run: `npm test`
Expected: 全部 PASS（67 prior + 10 new = 77）。

- [ ] **Step 6.5: 回归红线确认**

确认 13 个现有 golden（9 existing + 上轮 4：agent-policy/dev-flow-skills/pi-cadence/full-governance）expected-tree.json **未改动**（`git diff` 为空）。若变化，回查条件标记误伤。

- [ ] **Step 6.6: Commit**

```bash
git add tests/scenarios/ tests/golden/ tests/run_tests.mjs
git commit -m "test: 5 新后续场景 + golden（has-upstream/error-log/worktree-tooling/deployment-gates/full-followups）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage:**
- §3 4 组件架构 → Task 1-5 ✓
- §4 has-upstream（UPSTREAM-SYNC + NOTICE + 3 变量）→ Task 2 ✓
- §5 error-log（ERROR_LOG + 条目模板 + full-ledger 死链处理）→ Task 3 ✓
- §6 worktree-tooling（2 脚本 + 2 config + .gitignore + installCmd 泛化）→ Task 4 ✓
- §7 deployment-gates（Makefile + [ -d infra ] 守卫 + agent-policy 条件 + TODO 占位）→ Task 5 ✓
- §8 装配机制（substitute+3 / assemble ctx+3 / SKILL / .gitignore）→ Task 1 + Task 4 ✓
- §9 测试（5 场景 + 13 回归）→ Task 6 ✓
- §10 YAGNI → 未做自动同步/check-k8s.mjs/install 自动检测/diff 脚本/Makefile 合并 ✓

**2. Placeholder scan:** 无 TBD/plan-占位（spec 内的 TODO 是设计内用户填占位）。模板文档用"源+替换表"（具体源+替换），非占位。

**3. Type consistency:**
- `{{UPSTREAM_REPO}}`/`{{UPSTREAM_BASELINE}}`/`{{UPSTREAM_LICENSE}}` 全程一致（substitute VARS、assemble ctx、SKILL 变量表、UPSTREAM-SYNC/NOTICE 模板、测试 config upstream 字段）✓
- 组件 cond 名一致：`has-upstream`/`error-log`/`worktree-tooling`/`deployment-gates`（require 标记、组件表、枚举、测试 config 同名）✓
- `{{MAIN_BRANCH}}` 在 worktree 脚本/AGENTS.config 一致 ✓
- `installCmd` 在 new-worktree.sh + AGENTS.config.json 一致 ✓
- deployment Makefile `KUSTOMIZE_TARGETS`/`HELM_CHARTS` 一致 ✓

**潜在风险（执行时注意）：**
- Task 3 error-log 的 debt.md 链接需 `<!--IF:full-ledger-->` 包裹（避免 error-log 单装时死链）——plan 3.1 已说明
- Task 4 .gitignore.tmpl 现有内容需读对齐（加 worktree-tooling 段不破坏现有）
- Task 5 Makefile recipe 行必须 TAB 缩进（make 要求）
- Task 5 verify-fast 测试跑 `make verify-fast`——需系统有 make + git（CI 环境有）；若 make 不可用，测试 skip 或改断言只查内容不跑 make。执行时确认 make 可用。
- Task 6 full-followups stacks:[]（纯部署仓，避免 Makefile 与编程栈冲突）
