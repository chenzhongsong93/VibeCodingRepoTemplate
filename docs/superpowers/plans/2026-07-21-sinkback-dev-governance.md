# 下沉 BaiWang 研发治理能力 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 BaiWang_dev_mvp 的三层研发治理能力下沉为 VibeCodingRepoTemplate 的 3 个可选组件（agent-policy / dev-flow-skills / pi-cadence），零新机制类型，向后兼容。

**Architecture:** 三层正交组件，按 `<!--IF:cond-->`/`<!--require:cond-->` 装配。SSOT 走 `templates/core/docs/skills/`（工具中立），薄入口走 `templates/runtime-adapters/claude-code/.claude/skills/`。组件依赖：dev-flow-skills 自动激活 agent-policy。向后兼容靠 `<!--IF:agent-policy-->...<!--ELSE-->现有<!--/IF:agent-policy-->` 条件分支，现有 9 个 golden 场景不变。

**Tech Stack:** Node.js（assemble.mjs 装配引擎 + node:test 测试）、模板条件装配机制。

**Spec:** `docs/superpowers/specs/2026-07-21-sinkback-dev-governance-design.md`

**BaiWang 源仓:** `/root/code_repo/BaiWang_dev_mvp`（泛化来源，不直接复制业务内容）

**测试命令:** `npm test`（跑 `node --test tests/run_tests.mjs`）

**约定：** 标注「源+替换表」的模板文件 = 读 BaiWang 源文件 + 应用替换表 + 加条件标记后写入目标 `.tmpl`。替换表每行 `搜索 → 替换`。所有 `.tmpl` 文件首行按需加 `<!--require:cond-->` 控制文件级包含。

---

## File Structure

### 机制文件（修改）
- `skills/init-code-repo/conditional.mjs` — activeConds 加 dev-flow-skills→agent-policy 依赖
- `skills/init-code-repo/substitute.mjs` — VARS 注册 8 个新变量
- `skills/init-code-repo/assemble.mjs` — ctx 派生新变量（分支模型/POLICY_ID/PI_FORMAT/PI_FIRST/VERIFY_FAST_CMD）
- `skills/init-code-repo/SKILL.md` — 阶段 1 录取新增 3 项 + 组件表新增 3 行 + 激活集推导说明

### agent-policy 组件（新建/修改）
- `templates/core/docs/rules/dev-workflow-rules.md.tmpl` — **修改**：加 `<!--IF:agent-policy-->` 治理版 / `<!--ELSE-->` 现有线性版
- `templates/core/CLAUDE.md.tmpl` — **修改**：加 `<!--IF:agent-policy-->` 单行 `@AGENTS.md` / `<!--ELSE-->` 现有 16 行
- `templates/core/AGENTS.md.tmpl` — **修改**：加 `<!--IF:agent-policy-->` Policy 段 + `<!--IF:pi-cadence-->` PI 段
- `templates/core/lefthook.yml.tmpl` — **修改**：加 `<!--IF:agent-policy-->` verify-fast hook
- `templates/runtime-adapters/claude-code/.claude/settings.json.tmpl` — **修改**：重写为 allow/ask/deny
- `templates/core/scripts/check-agent-policy.mjs.tmpl` — **新建**
- `templates/core/docs/02-design/agent-governance/{policy,risk-levels,compatibility-matrix,validation-cases}.md.tmpl` — **新建**
- `templates/stacks/rust/Makefile.tmpl` — **修改**：加 verify 目标
- `templates/stacks/node/package.json.tmpl` — **修改**：加 verify scripts
- `templates/stacks/go/Makefile.tmpl` — **修改**：加 verify 目标
- `templates/stacks/python/` — **修改**：加 verify 脚本（见 Task 2f）

### dev-flow-skills 组件（新建）
- `templates/core/docs/skills/{dev-flow,test-spec,design-review}.md.tmpl` — SSOT
- `templates/core/scripts/check-test-spec-consistency.mjs.tmpl` — 一致性校验
- `templates/runtime-adapters/claude-code/.claude/skills/{dev-flow,test-spec,design-review}/SKILL.md.tmpl` — 薄入口

### pi-cadence 组件（修改）
- `templates/core/docs/ROADMAP.md.tmpl` — 加 `<!--IF:pi-cadence-->` PI 段
- `templates/core/docs/HANDOVER.md.tmpl` — 加 `<!--IF:pi-cadence-->` 当前 PI 字段

### 测试（新建）
- `tests/scenarios/{agent-policy,dev-flow-skills,pi-cadence,full-governance}/config.json` + `tests/golden/.../expected-tree.json`
- `tests/run_tests.mjs` — 加 4 场景用例

---

## Task 1: 机制地基

**Files:**
- Modify: `skills/init-code-repo/conditional.mjs`
- Modify: `skills/init-code-repo/substitute.mjs`
- Modify: `skills/init-code-repo/assemble.mjs`
- Modify: `skills/init-code-repo/SKILL.md`

- [ ] **Step 1.1: conditional.mjs 加组件依赖**

修改 `skills/init-code-repo/conditional.mjs`，在 `activeConds` 函数 `return` 前加一行：

```js
export function activeConds(config) {
  const comps = config.components || [];
  const set = new Set(comps);
  if (set.has('docker') || set.has('three-tier-test')) set.add('full-workflow');
  if (config.remote && config.remote !== 'none') set.add('remote-hook');
  if (set.has('dev-flow-skills')) set.add('agent-policy');
  return [...set];
}
```

- [ ] **Step 1.2: substitute.mjs 注册新变量**

修改 `skills/init-code-repo/substitute.mjs`，扩展 VARS：

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
};
```

- [ ] **Step 1.3: assemble.mjs ctx 派生新变量**

修改 `skills/init-code-repo/assemble.mjs` 的 `assemble` 函数 ctx 块（替换第 56-61 行）：

```js
  const bm = config.branchModel || {};
  const devBranch = bm.dev || 'dev';
  const mainBranch = bm.main || 'main';
  const fixBranch = bm.fix || 'fix';
  const releasePrefix = bm.release || 'release/v';
  const policyId = config.policyId || `${config.projectName}-Agent-Policy: 1.0`;
  const piFormat = config.piFormat || 'YYYY-PI<N>';
  const piFirst = piFormat.replace('YYYY', String(config.year)).replace('<N>', '1');
  const stacks = config.stacks || [];
  const verifyFastCmd = stacks.length === 1 && stacks[0] === 'node'
    ? 'npm run verify:fast' : 'make verify-fast';
  const ctx = {
    projectName: config.projectName,
    oneLine: config.oneLine,
    year: String(config.year),
    commitRegex: config.commitGate?.regex || '',
    devBranch, mainBranch, fixBranch, releasePrefix,
    policyId, piFormat, piFirst, verifyFastCmd,
  };
```

> `VERIFY_FAST_CMD` 派生规则——仅 node 单栈时用 `npm run verify:fast`，否则（含多栈/rust/go/python）用 `make verify-fast`。

- [ ] **Step 1.4: SKILL.md 阶段 1 录取新增项**

修改 `skills/init-code-repo/SKILL.md` 阶段 1 录取表，在「Commit 门禁档」行后、「文档命名」行前插入 3 行：

```markdown
| 分支模型 | 默认(dev/main/fix/release/v) / 自定义 | agent-policy 激活时填入 {{DEV_BRANCH}}/{{MAIN_BRANCH}}/{{FIX_BRANCH}}/{{RELEASE_PREFIX}} |
| Policy 标记 | 默认 `{{PROJECT_NAME}}-Agent-Policy: 1.0` / 自定义 | agent-policy 激活时填入 {{POLICY_ID}} |
| PI 命名格式 | 默认 `YYYY-PI<N>` / 自定义 | pi-cadence 激活时填入 {{PI_FORMAT}} |
```

在「可选组件（多选）」表末尾追加 3 行：

```markdown
| Agent 策略与执行门禁 | agent-policy | dev-workflow-rules 治理段 + agent-governance 4 文档 + check-agent-policy.mjs + settings.json 重写 + 各 stack verify 目标 + AGENTS Policy 段 + lefthook verify-fast | 自动被 dev-flow-skills 激活 |
| 研发流程 skill 三层 | dev-flow-skills | docs/skills/{dev-flow,test-spec,design-review}.md + .claude/skills/ 薄入口 + check-test-spec-consistency.mjs | 自动激活 agent-policy |
| 研发迭代(PI)体系 | pi-cadence | ROADMAP/AGENTS/HANDOVER 的 PI 段 | 独立 |
```

在「### 4. 激活集推导」的「派生态」段追加：

```markdown
- `agent-policy` = components 含 `dev-flow-skills`（流程层依赖执行层）。
```

在「### 1. 变量替换」表追加 8 行（DEV_BRANCH/MAIN_BRANCH/FIX_BRANCH/RELEASE_PREFIX/POLICY_ID/PI_FORMAT/PI_FIRST/VERIFY_FAST_CMD，来源标注"阶段 1 录取 / 派生"）。

- [ ] **Step 1.5: 跑现有测试验证回归**

Run: `npm test`
Expected: 全部现有用例 PASS（此步只改机制，新组件模板还没写，但未装配新组件不影响现有场景）。若 FAIL，检查 VARS/ctx 改动是否误伤现有变量。

- [ ] **Step 1.6: Commit**

```bash
git add skills/init-code-repo/conditional.mjs skills/init-code-repo/substitute.mjs skills/init-code-repo/assemble.mjs skills/init-code-repo/SKILL.md
git commit -m "feat(init-code-repo): 装配机制扩展支持 agent-policy/dev-flow-skills/pi-cadence 组件

- conditional: dev-flow-skills 自动激活 agent-policy
- substitute: VARS 注册 8 个新变量
- assemble: ctx 派生分支模型/POLICY_ID/PI_FORMAT/VERIFY_FAST_CMD
- SKILL: 阶段1录取新增3项 + 组件表新增3行"
```

---

## Task 2: agent-policy 组件

### Task 2a: dev-workflow-rules 治理版条件分支

**Files:**
- Modify: `templates/core/docs/rules/dev-workflow-rules.md.tmpl`
- Source: `/root/code_repo/BaiWang_dev_mvp/baiwang-apiserver/docs/rules/dev-workflow-rules.md`

- [ ] **Step 2a.1: 包裹现有内容为 ELSE 分支**

读 `templates/core/docs/rules/dev-workflow-rules.md.tmpl` 现有全部内容，改为：

```
<!--IF:agent-policy-->
（治理版正文，见 2a.2）
<!--ELSE-->
（现有线性 8 步正文，原样保留含其内部 full-workflow 子条件）
<!--/IF:agent-policy-->
```

- [ ] **Step 2a.2: 写治理版正文（源+替换表）**

从 BaiWang 源 `/root/code_repo/BaiWang_dev_mvp/baiwang-apiserver/docs/rules/dev-workflow-rules.md` 复制全文作为治理版正文（`<!--IF:agent-policy-->` 与 `<!--ELSE-->` 之间），应用替换表：

| 搜索 | 替换 |
|---|---|
| `BaiWang-Agent-Policy: 1.0` | `{{POLICY_ID}}` |
| `dev_mvp` | `{{DEV_BRANCH}}` |
| `` `main` `` | `` `{{MAIN_BRANCH}}` `` |
| `fix_bug` | `{{FIX_BRANCH}}` |
| `release/v<version>-<component>` | `{{RELEASE_PREFIX}}<version>-<component>` |
| `release/v<version>` | `{{RELEASE_PREFIX}}<version>` |
| `release/*` | `{{RELEASE_PREFIX}}*` |
| `make verify-fast` | `{{VERIFY_FAST_CMD}}` |

泛化业务特定句（Octo/Neo4j → "外部服务/持久化"；"7 个 bug" → "多个 bug"）。

- [ ] **Step 2a.3: 处理 testing-rules.md 引用的死链**

治理版正文引用 `testing-rules.md`（由 three-tier-test 组件提供）。agent-policy 单装时此文件不存在 → 死链。将该引用用 `<!--IF:three-tier-test-->` 包裹，ELSE 给内联摘要：

```markdown
**L2 禁止 mock(mockito)**：必须基于真实启动的服务验证<!--IF:three-tier-test-->（见 [{{FNAME:docs/rules/testing-rules.md}}]({{FILE:testing-rules.md}})「L2 禁 mock」）<!--ELSE-->（mock 是多个 bug 被掩盖的根因）。<!--/IF:three-tier-test-->
```

- [ ] **Step 2a.4: 写测试断言**

在 `tests/run_tests.mjs` 加：

```js
test('agent-policy: dev-workflow-rules governance vs slim', () => {
  const baseCfg = { projectName:'P', oneLine:'L', year:'2026', stacks:[], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:[] };
  const tmpSlim = '/tmp/init-code-repo-test-ap-slim';
  rmSync(tmpSlim, { recursive: true, force: true });
  assemble(tmpSlim, baseCfg);
  const dwSlim = readFileSync(`${tmpSlim}/docs/rules/dev-workflow-rules.md`, 'utf8');
  assertOk(!dwSlim.includes('T0–T3 公共风险分级'), 'slim no T0-T3 table');
  assertClean(dwSlim, 'slim dev-workflow');

  const tmpGov = '/tmp/init-code-repo-test-ap-gov';
  rmSync(tmpGov, { recursive: true, force: true });
  assemble(tmpGov, { ...baseCfg, components:['agent-policy'], branchModel:{dev:'dev_mvp'} });
  const dwGov = readFileSync(`${tmpGov}/docs/rules/dev-workflow-rules.md`, 'utf8');
  assertOk(dwGov.includes('T0–T3 公共风险分级'), 'gov has T0-T3 table');
  assertOk(!dwGov.includes('{{DEV_BRANCH}}'), 'DEV_BRANCH substituted');
  assertOk(dwGov.includes('dev_mvp'), 'branch var substituted to dev_mvp');
  assertClean(dwGov, 'gov dev-workflow');
});
```

- [ ] **Step 2a.5: 跑测试**

Run: `npm test` → 新用例 PASS + 现有回归 PASS。

- [ ] **Step 2a.6: Commit**

```bash
git add templates/core/docs/rules/dev-workflow-rules.md.tmpl tests/run_tests.mjs
git commit -m "feat(agent-policy): dev-workflow-rules 治理版条件分支

agent-policy 激活→治理规则集(T0-T3/分支模型/阻断分类)；ELSE 保留线性8步版。"
```

### Task 2b: CLAUDE.md 单行条件分支

**Files:**
- Modify: `templates/core/CLAUDE.md.tmpl`

- [ ] **Step 2b.1: 加条件分支**

读现有 `templates/core/CLAUDE.md.tmpl`（16 行铁律版）。改为：

```
<!--IF:agent-policy-->
@AGENTS.md
<!--ELSE-->
（现有 16 行铁律版原文）
<!--/IF:agent-policy-->
```

- [ ] **Step 2b.2: 测试断言**

```js
test('agent-policy: CLAUDE.md single-line when active', () => {
  const baseCfg = { projectName:'P', oneLine:'L', year:'2026', stacks:[], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:[] };
  const tmpNo = '/tmp/init-code-repo-test-claude-no';
  rmSync(tmpNo, { recursive: true, force: true });
  assemble(tmpNo, baseCfg);
  assertOk(readFileSync(`${tmpNo}/CLAUDE.md`,'utf8').split('\n').filter(l=>l.trim()).length > 1, 'no agent-policy: multi-line CLAUDE');

  const tmpYes = '/tmp/init-code-repo-test-claude-yes';
  rmSync(tmpYes, { recursive: true, force: true });
  assemble(tmpYes, { ...baseCfg, components:['agent-policy'] });
  assert.equal(readFileSync(`${tmpYes}/CLAUDE.md`,'utf8').trim(), '@AGENTS.md', 'agent-policy: CLAUDE.md is single @AGENTS.md');
});
```

- [ ] **Step 2b.3: 跑测试 + Commit**

Run: `npm test` → PASS。Commit:

```bash
git add templates/core/CLAUDE.md.tmpl tests/run_tests.mjs
git commit -m "feat(agent-policy): CLAUDE.md 单行 @AGENTS.md 条件分支"
```

### Task 2c: settings.json 权限模型重写

**Files:**
- Modify: `templates/runtime-adapters/claude-code/.claude/settings.json.tmpl`
- Source: BaiWang `/root/code_repo/BaiWang_dev_mvp/baiwang-apiserver/.claude/settings.json`

- [ ] **Step 2c.1: 重写 settings.json.tmpl**

完整内容（首行 require 标记使此文件仅 agent-policy 激活时装配）：

```json
<!--require:agent-policy-->
{
  "permissions": {
    "allow": [
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git show:*)",
      "Bash(git branch:*)",
      "Bash({{VERIFY_FAST_CMD}})"
    ],
    "ask": [
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(git push:*)",
      "Bash(git tag:*)",
      "Bash(git merge:*)",
      "Bash(git rebase:*)",
      "Bash(git cherry-pick:*)",
      "Bash(git checkout:*)",
      "Bash(git switch:*)",
      "Bash(git reset:*)",
      "Bash(git stash:*)"
    ],
    "deny": [
      "Bash(git reset --hard:*)",
      "Bash(git clean -f:*)",
      "Bash(git checkout --:*)",
      "Bash(git restore:*)",
      "Bash(git branch -D:*)",
      "Bash(git stash drop:*)",
      "Bash(git stash clear:*)",
      "Bash(git push --force:*)",
      "Bash(git push -f:*)"
    ]
  },
  "worktree": {
    "baseRef": "head"
  }
}
```

- [ ] **Step 2c.2: 修复现有 runtime-adapters 测试**

现有测试 `runtime adapters: claude-code produces .claude/settings.json`（run_tests.mjs:296）用 `components:[]`。现 settings.json 加了 `<!--require:agent-policy-->`，该 config 不再生成 settings.json → 测试失败。修改其 claude-code config 加 `components:['agent-policy']`，并补权限模型断言：

```js
assemble(tmpC, { projectName:'D', oneLine:'L', year:'2026', stacks:[], repoShape:'single', runtimes:['claude-code'], remote:'none', commitGate:{mode:'default'}, components:['agent-policy'] });
// ... 现有 README 断言保留 ...
const sj = JSON.parse(readFileSync(`${tmpC}/.claude/settings.json`, 'utf8'));
assertOk(sj.permissions.allow.some(p => p.includes('verify')), 'allow has verify');
assertOk(sj.permissions.ask.some(p => p.includes('git commit')), 'ask has git commit');
assertOk(sj.permissions.deny.some(p => p.includes('reset --hard')), 'deny has reset --hard');
assertOk(!JSON.stringify(sj).includes('{{VERIFY_FAST_CMD}}'), 'VERIFY_FAST_CMD substituted');
```

> `stacks:[]` 时 `VERIFY_FAST_CMD` 派生为 `make verify-fast`（Step 1.3 规则：非 node 单栈均 make）。

- [ ] **Step 2c.3: 跑测试 + Commit**

Run: `npm test` → PASS。Commit:

```bash
git add templates/runtime-adapters/claude-code/.claude/settings.json.tmpl tests/run_tests.mjs
git commit -m "feat(agent-policy): settings.json allow/ask/deny 权限模型

修复 git commit/push 在 allow 的安全漏洞；git 写入 ask、破坏性 git deny。"
```

### Task 2d: check-agent-policy.mjs 校验脚本

**Files:**
- Create: `templates/core/scripts/check-agent-policy.mjs.tmpl`
- Source: BaiWang `/root/code_repo/BaiWang_dev_mvp/baiwang-web/scripts/check-agent-policy.mjs`

- [ ] **Step 2d.1: 写脚本（完整代码）**

首行 `<!--require:agent-policy-->`。完整内容（纯 Node，无 shell 调用）：

```js
<!--require:agent-policy-->
#!/usr/bin/env node
// check-agent-policy.mjs — 断言 agent-policy 不变量。挂到 Makefile policy-check 目标。
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] || '.';
const POLICY_ID = '{{POLICY_ID}}';
let fail = 0;
const check = (cond, msg) => { if (!cond) { console.error(`✗ ${msg}`); fail++; } else { console.log(`✓ ${msg}`); } };

// 1. CLAUDE.md 恰为一行 @AGENTS.md
const claude = existsSync(join(root, 'CLAUDE.md')) ? readFileSync(join(root, 'CLAUDE.md'), 'utf8').trim() : '';
check(claude === '@AGENTS.md', 'CLAUDE.md is single line @AGENTS.md');

// 2. AGENTS.md 含 Policy 标记
const agents = existsSync(join(root, 'AGENTS.md')) ? readFileSync(join(root, 'AGENTS.md'), 'utf8') : '';
check(agents.includes(POLICY_ID), `AGENTS.md contains ${POLICY_ID}`);

// 3. .claude/settings.json 合法 JSON + verify 在 allow + git 写在 ask
const sjPath = join(root, '.claude/settings.json');
if (existsSync(sjPath)) {
  try {
    const sj = JSON.parse(readFileSync(sjPath, 'utf8'));
    const allow = (sj.permissions?.allow || []).join(' ');
    const ask = (sj.permissions?.ask || []).join(' ');
    check(allow.includes('verify'), 'settings.json allow has verify');
    check(ask.includes('git commit') && ask.includes('git push'), 'settings.json ask has git commit/push');
    check(!allow.includes('git commit') && !allow.includes('git push'), 'settings.json allow has NO git write');
  } catch (e) { check(false, `settings.json valid JSON: ${e.message}`); }
} else {
  check(false, '.claude/settings.json exists');
}

// 4. agent-governance 4 文档存在
for (const f of ['policy.md', 'risk-levels.md', 'compatibility-matrix.md', 'validation-cases.md']) {
  check(existsSync(join(root, 'docs/02-design/agent-governance', f)), `agent-governance/${f} exists`);
}

// 5. dev-workflow-rules 含 T0-T3 表
const dw = existsSync(join(root, 'docs/rules/dev-workflow-rules.md')) ? readFileSync(join(root, 'docs/rules/dev-workflow-rules.md'), 'utf8') : '';
check(dw.includes('T0–T3 公共风险分级'), 'dev-workflow-rules has T0-T3 table');

process.exit(fail ? 1 : 0);
```

> `{{POLICY_ID}}` 装配时替换。脚本用固定英文路径（agent-governance 文件名恒英文，见 2e.1）。

- [ ] **Step 2d.2: 测试断言**

```js
test('agent-policy: check-agent-policy.mjs shipped + runs', () => {
  const tmp = '/tmp/init-code-repo-test-check-policy';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, { projectName:'P', oneLine:'L', year:'2026', stacks:['rust'], repoShape:'single', runtimes:['claude-code'], remote:'none', commitGate:{mode:'default'}, components:['agent-policy'] });
  assertOk(fileTree(tmp).includes('scripts/check-agent-policy.mjs'), 'check-agent-policy shipped');
  assertOk(!readFileSync(`${tmp}/scripts/check-agent-policy.mjs`,'utf8').includes('{{POLICY_ID}}'), 'POLICY_ID substituted');
  const r = spawnSync('node', [`${tmp}/scripts/check-agent-policy.mjs`, tmp]);
  assert.equal(r.status, 0, `check-agent-policy exits 0; stderr: ${String(r.stderr)}`);
});
```

> 依赖 Task 2e（agent-governance 4 文档存在）。执行时先做 2e 再跑此测试，或暂跳断言④。

- [ ] **Step 2d.3: 跑测试 + Commit**

Run: `npm test` → PASS（需 2e 已完成）。Commit:

```bash
git add templates/core/scripts/check-agent-policy.mjs.tmpl tests/run_tests.mjs
git commit -m "feat(agent-policy): check-agent-policy.mjs 策略不变量校验脚本"
```

### Task 2e: agent-governance 4 文档

**Files:**
- Create: `templates/core/docs/02-design/agent-governance/{policy,risk-levels,compatibility-matrix,validation-cases}.md.tmpl`
- Source: BaiWang `/root/code_repo/BaiWang_dev_mvp/baiwang-docs/docs/02-design/agent-governance/`

- [ ] **Step 2e.1: 创建 4 文件（源+替换表）**

每个文件首行 `<!--require:agent-policy-->`。从 BaiWang 源对应文件复制，应用统一替换表：

| 搜索 | 替换 |
|---|---|
| `BaiWang-Agent-Policy: 1.0` | `{{POLICY_ID}}` |
| `dev_mvp` | `{{DEV_BRANCH}}` |
| `fix_bug` | `{{FIX_BRANCH}}` |
| `release/*` | `{{RELEASE_PREFIX}}*` |
| BaiWang 业务服务名（Octo/Neo4j 等） | 泛化为"外部服务"/"持久化" |
| `baiwang-docs` 仓引用 | 泛化为"中央 docs 仓"（`<!--IF:central-docs-->`）/ "本仓"（ELSE） |

4 文件职责：policy.md（三层模型+授权边界+T0-T3+事实/目标纪律）、risk-levels.md（T0-T3 详表）、compatibility-matrix.md（Claude/Codex/OpenCode/zcode × 门禁映射）、validation-cases.md（策略验收用例）。

> naming：agent-governance 4 文件**不进 ZH 映射**（恒英文文件名），因 check-agent-policy 用固定英文路径断言，且规则文件引用多。确认 naming.mjs 不误加。zh 场景不装 agent-policy 时这些文件不存在，无冲突。

- [ ] **Step 2e.2: 多仓/单仓快照标注**

在 `policy.md.tmpl` 顶部（`<!--require:agent-policy-->` 之后）加：

```
<!--IF:central-docs-->
> 本文件是 SSOT，位于中央 docs 仓。组件仓保存可独立使用的快照，第一版人工同步。
<!--ELSE-->
> 本仓为单仓模式，本文件即 SSOT。
<!--/IF:central-docs-->
```

- [ ] **Step 2e.3: 死链校验**

agent-governance 文档间相互引用用同目录相对链接。确认 deadLinks 通过。

- [ ] **Step 2e.4: 跑测试 + Commit**

Run: `npm test` → Task 2d 测试现在 PASS。Commit:

```bash
git add templates/core/docs/02-design/agent-governance/
git commit -m "feat(agent-policy): agent-governance 4 文档（policy/risk-levels/compatibility/validation）"
```

### Task 2f: 各 stack verify 门禁目标

**Files:**
- Modify: `templates/stacks/rust/Makefile.tmpl`
- Modify: `templates/stacks/node/package.json.tmpl`
- Modify: `templates/stacks/go/Makefile.tmpl`
- Modify: `templates/stacks/python/`
- Source: BaiWang `baiwang-apiserver/Makefile`、`baiwang-web/package.json`

- [ ] **Step 2f.1: rust Makefile 加 verify 目标**

在 `templates/stacks/rust/Makefile.tmpl` 现有 `lint/test/build` 目标后加：

```makefile
<!--IF:agent-policy-->
.PHONY: policy-check verify-fast verify-ci verify-release
policy-check:
	@node scripts/check-agent-policy.mjs .

verify-fast: policy-check
	@git diff HEAD --check
	@cargo fmt --check
	@cargo clippy -D warnings
	@cargo test --lib

verify-ci: verify-fast
	@cargo test

verify-release:
	@if [ "$$ALLOW_REAL_E2E" != "1" ]; then echo "需 ALLOW_REAL_E2E=1"; exit 2; fi
	@$(MAKE) verify-ci
	@cargo build --release
<!--/IF:agent-policy-->
```

- [ ] **Step 2f.2: node package.json 加 verify scripts**

在 `templates/stacks/node/package.json.tmpl` 的 `scripts` 对象内，用 `<!--IF:agent-policy-->...<!--ELSE-->...<!--/IF:agent-policy-->` 包裹（现有 scripts 进 ELSE 分支，agent-policy 激活时替换为含 verify 的版本）。agent-policy 分支 scripts：

```json
    "verify:fast": "node scripts/check-agent-policy.mjs . && git diff HEAD --check && eslint . && vitest run --quick",
    "verify:ci": "npm run verify:fast && vitest run",
    "verify:release": "test \"$ALLOW_REAL_E2E\" = \"1\" && npm run verify:ci && npm run build || (echo 需 ALLOW_REAL_E2E=1 && exit 2)",
```

> 具体 lint/test 工具名（eslint/vitest）执行时读现有 package.json.tmpl 对齐。确认 stripConditionals 剥离注释后 JSON 合法（无残留空行）。

- [ ] **Step 2f.3: go/python 同 rust 模式**

`templates/stacks/go/Makefile.tmpl` 加 `<!--IF:agent-policy-->` verify 目标（`go vet`/`go test ./...`）。python 现为 `pyproject.toml.tmpl`：在 `[tool.scripts]` 或新建 `Makefile.tmpl` 加 verify 目标（`ruff check`/`pytest -q`）。执行时读各栈现有命令对齐。

- [ ] **Step 2f.4: 测试断言**

```js
test('agent-policy: rust Makefile verify targets', () => {
  const tmp = '/tmp/init-code-repo-test-verify-rust';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, { projectName:'P', oneLine:'L', year:'2026', stacks:['rust'], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:['agent-policy'] });
  const mk = readFileSync(`${tmp}/Makefile`, 'utf8');
  assertOk(mk.includes('verify-fast:'), 'rust Makefile has verify-fast');
  assertOk(mk.includes('verify-release:'), 'rust Makefile has verify-release');
  assertOk(mk.includes('ALLOW_REAL_E2E'), 'rust Makefile has ALLOW_REAL_E2E guard');
  assertClean(mk, 'rust Makefile');
  const tmp2 = '/tmp/init-code-repo-test-verify-rust-no';
  rmSync(tmp2, { recursive: true, force: true });
  assemble(tmp2, { projectName:'P', oneLine:'L', year:'2026', stacks:['rust'], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:[] });
  assertOk(!readFileSync(`${tmp2}/Makefile`,'utf8').includes('verify-fast:'), 'no verify-fast without agent-policy');
});
```

- [ ] **Step 2f.5: 跑测试 + Commit**

Run: `npm test` → PASS。Commit:

```bash
git add templates/stacks/
git commit -m "feat(agent-policy): 各 stack verify-fast/ci/release 门禁目标 + ALLOW_REAL_E2E 授权闸"
```

### Task 2g: AGENTS.md Policy 段 + lefthook verify-fast + commit 正则

**Files:**
- Modify: `templates/core/AGENTS.md.tmpl`
- Modify: `templates/core/lefthook.yml.tmpl`
- Modify: `templates/gates/pre-receive-remote/pre-receive.tmpl`
- Source: BaiWang 各 `AGENTS.md` Policy 段、`lefthook.yml`

- [ ] **Step 2g.1: AGENTS.md 加 Policy 段（源+替换表）**

在 `templates/core/AGENTS.md.tmpl` 顶部标题段后加 `<!--IF:agent-policy-->`。从 BaiWang `baiwang-apiserver/AGENTS.md` 复制 Policy 1.0 摘要段（授权边界 + T0-T3 摘要 + 会话读序），应用替换表（`BaiWang-Agent-Policy: 1.0`→`{{POLICY_ID}}`、分支名→`{{*_BRANCH}}`、`make verify-fast`→`{{VERIFY_FAST_CMD}}`）。跨仓路由段用 `<!--IF:multi-repo-component-->` 包裹。

- [ ] **Step 2g.2: lefthook 加 verify-fast hook**

在 `templates/core/lefthook.yml.tmpl` 的 pre-commit 和 pre-push 段加：

```yaml
<!--IF:agent-policy-->
      - name: verify-fast
        run: {{VERIFY_FAST_CMD}}
<!--/IF:agent-policy-->
```

（缩进对齐现有 hooks 段）

- [ ] **Step 2g.3: commit-msg 正则收紧**

将 `lefthook.yml.tmpl` 和 `gates/pre-receive-remote/pre-receive.tmpl` 的 commit-msg 正则 `\(.*\)` → `\([^)]+\)`（要求非空 scope）。两处同步。

- [ ] **Step 2g.4: 测试断言**

```js
test('agent-policy: AGENTS Policy段 + lefthook verify-fast', () => {
  const tmp = '/tmp/init-code-repo-test-agents-policy';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, { projectName:'P', oneLine:'L', year:'2026', stacks:['rust'], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:['agent-policy'] });
  const a = readFileSync(`${tmp}/AGENTS.md`, 'utf8');
  assertOk(a.includes('P-Agent-Policy: 1.0'), 'AGENTS has POLICY_ID substituted');
  assertOk(a.includes('T0'), 'AGENTS has T0-T3 summary');
  assertClean(a, 'AGENTS');
  const lh = readFileSync(`${tmp}/lefthook.yml`, 'utf8');
  assertOk(lh.includes('verify-fast'), 'lefthook has verify-fast');
  assertOk(lh.includes('make verify-fast'), 'lefthook verify-fast cmd substituted');
  assertOk(!lh.includes('{{VERIFY_FAST_CMD}}'), 'no leftover var');
  assertClean(lh, 'lefthook');
});
```

- [ ] **Step 2g.5: 跑测试 + Commit**

Run: `npm test` → PASS。Commit:

```bash
git add templates/core/AGENTS.md.tmpl templates/core/lefthook.yml.tmpl templates/gates/pre-receive-remote/pre-receive.tmpl tests/run_tests.mjs
git commit -m "feat(agent-policy): AGENTS Policy段 + lefthook verify-fast + commit正则收紧

\(.*\)→\([^)]+\) 要求非空scope，lefthook与pre-receive同步。"
```

---

## Task 3: dev-flow-skills 组件

### Task 3a: 三 skill SSOT 文档

**Files:**
- Create: `templates/core/docs/skills/{dev-flow,test-spec,design-review}.md.tmpl`
- Source: BaiWang `baiwang-docs/docs/skills/baiwang-dev-flow/SKILL.md`、`baiwang-test-spec/SKILL.md`、`baiwang-docs/docs/02-design/design-review-methodology.md`

- [ ] **Step 3a.1: dev-flow.md.tmpl（源+替换表）**

每个 SSOT 文件首行 `<!--IF:dev-flow-skills-->`，末行 `<!--/IF:dev-flow-skills-->`。

`dev-flow.md.tmpl`：从 BaiWang `baiwang-dev-flow/SKILL.md` 复制正文，替换 `baiwang-dev-flow`→`dev-flow`、`百望开发流程入口`→`项目开发流程入口`、`百望`→`项目`、`make verify-fast`→`{{VERIFY_FAST_CMD}}`、frontmatter `name`/`description` 去 baiwang/百望。保留 10 步结构、Done 清单、铁律。

- [ ] **Step 3a.2: test-spec.md.tmpl（源+替换表）**

从 BaiWang `baiwang-test-spec/SKILL.md` 复制，替换 `baiwang-test-spec`→`test-spec`、`百望`泛化、Octo/Neo4j→"外部服务/持久化"、`make verify-fast`→`{{VERIFY_FAST_CMD}}`。保留六步方法论、1:1 铁律、L1/L2/L3、L2 禁 mock、一致性校验命令。

> test-spec.md 引用 `docs/rules/testing-rules.md`（three-tier-test 组件）用 `<!--IF:three-tier-test-->` 包裹（同 2a.3 模式）避免死链；`docs/rules/dev-workflow-rules.md` 引用恒存在。

- [ ] **Step 3a.3: design-review.md.tmpl（源+替换表）**

从 BaiWang `baiwang-docs/docs/02-design/design-review-methodology.md` 复制（SSOT，非薄入口）。替换 `百望`泛化、BaiWang 锚点→泛化或删除。保留三铁律、7 维度×4 层框架、流程、红旗。

- [ ] **Step 3a.4: 测试断言**

```js
test('dev-flow-skills: three SSOT + agent-policy auto-activated', () => {
  const tmp = '/tmp/init-code-repo-test-devflow-skills';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, { projectName:'P', oneLine:'L', year:'2026', stacks:['rust'], repoShape:'single', runtimes:['claude-code'], remote:'none', commitGate:{mode:'default'}, components:['dev-flow-skills'] });
  const tree = fileTree(tmp);
  assertOk(tree.includes('docs/skills/dev-flow.md'), 'dev-flow SSOT');
  assertOk(tree.includes('docs/skills/test-spec.md'), 'test-spec SSOT');
  assertOk(tree.includes('docs/skills/design-review.md'), 'design-review SSOT');
  assertOk(tree.includes('docs/02-design/agent-governance/policy.md'), 'agent-policy auto-activated');
  assertOk(tree.includes('scripts/check-agent-policy.mjs'), 'check-agent-policy present');
  const df = readFileSync(`${tmp}/docs/skills/dev-flow.md`, 'utf8');
  assertOk(!df.includes('baiwang'), 'no baiwang leftover');
  assertOk(!df.includes('{{VERIFY_FAST_CMD}}'), 'VERIFY_FAST_CMD substituted');
  assertClean(df, 'dev-flow SSOT');
});
```

- [ ] **Step 3a.5: 跑测试 + Commit**

Run: `npm test` → PASS。Commit:

```bash
git add templates/core/docs/skills/ tests/run_tests.mjs
git commit -m "feat(dev-flow-skills): dev-flow/test-spec/design-review 三 SSOT 文档"
```

### Task 3b: 三 skill 薄入口

**Files:**
- Create: `templates/runtime-adapters/claude-code/.claude/skills/{dev-flow,test-spec,design-review}/SKILL.md.tmpl`
- Source: BaiWang `baiwang-docs/.claude/skills/design-review/SKILL.md`（薄入口范本）

- [ ] **Step 3b.1: 三个薄入口文件**

每个文件首行 `<!--require:dev-flow-skills-->`。薄入口只含 frontmatter + 触发说明 + 指向 SSOT 的指针 + "不做什么"约束，不复制正文。

`dev-flow/SKILL.md.tmpl`：

```markdown
<!--require:dev-flow-skills-->
---
name: dev-flow
description: 项目开发流程入口。接到任何开发任务（创建功能/修bug/改行为/重构）时使用。编排 T0-T3 风险分级→brainstorming→test-spec 设计先行→writing-plans→TDD→verification→台账→code-review→提交→SSOT 同步。
---

# dev-flow（Claude Code 入口适配器）

> 本 skill 是 Claude Code 最薄入口。**方法论 SSOT 见** [docs/skills/dev-flow.md](../../../docs/skills/dev-flow.md)，触发后先读它再执行。本文件不复制正文（避免漂移）。
> Codex/OpenCode/zcode 等不经本 skill，直接经 AGENTS.md 指针读同一 SSOT。

## 触发后

1. 读 SSOT：`docs/skills/dev-flow.md`（10 步 + Done 清单）。
2. 按 SSOT 执行。

## 不做什么

- 不复制 SSOT 正文到本文件（改 SSOT 即可，本文件无需同步）。
```

`test-spec/SKILL.md.tmpl`、`design-review/SKILL.md.tmpl`：同模式，分别指向 `docs/skills/test-spec.md`、`docs/skills/design-review.md`，description 泛化自 BaiWang（去百望）。design-review 可直接从 BaiWang `baiwang-docs/.claude/skills/design-review/SKILL.md` 复制泛化。

- [ ] **Step 3b.2: 测试断言**

```js
test('dev-flow-skills: thin adapters under .claude/skills', () => {
  const tmp = '/tmp/init-code-repo-test-thin-adapters';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, { projectName:'P', oneLine:'L', year:'2026', stacks:['rust'], repoShape:'single', runtimes:['claude-code'], remote:'none', commitGate:{mode:'default'}, components:['dev-flow-skills'] });
  const tree = fileTree(tmp);
  assertOk(tree.includes('.claude/skills/dev-flow/SKILL.md'), 'dev-flow thin adapter');
  assertOk(tree.includes('.claude/skills/test-spec/SKILL.md'), 'test-spec thin adapter');
  assertOk(tree.includes('.claude/skills/design-review/SKILL.md'), 'design-review thin adapter');
  const t = readFileSync(`${tmp}/.claude/skills/dev-flow/SKILL.md`, 'utf8');
  assertOk(t.includes('docs/skills/dev-flow.md'), 'thin adapter points to SSOT');
  assertClean(t, 'thin adapter');
  const tmp2 = '/tmp/init-code-repo-test-thin-no-cc';
  rmSync(tmp2, { recursive: true, force: true });
  assemble(tmp2, { projectName:'P', oneLine:'L', year:'2026', stacks:['rust'], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:['dev-flow-skills'] });
  assertOk(!fileTree(tmp2).some(f => f.startsWith('.claude/skills/')), 'no thin adapter without claude-code runtime');
});
```

- [ ] **Step 3b.3: 跑测试 + Commit**

Run: `npm test` → PASS。Commit:

```bash
git add templates/runtime-adapters/claude-code/.claude/skills/ tests/run_tests.mjs
git commit -m "feat(dev-flow-skills): 三 skill 薄入口适配器（.claude/skills）"
```

### Task 3c: check-test-spec-consistency.mjs

**Files:**
- Create: `templates/core/scripts/check-test-spec-consistency.mjs.tmpl`
- Source: BaiWang `baiwang-test-spec/SKILL.md` 末尾一致性校验

- [ ] **Step 3c.1: 写脚本（纯 Node，无 shell）**

首行 `<!--require:dev-flow-skills-->`。完整内容：

```js
<!--require:dev-flow-skills-->
#!/usr/bin/env node
// check-test-spec-consistency.mjs — SSOT 用例ID集合 vs 代码标签集合，1:1 零差异。
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] || '.';
const specDir = join(root, 'docs/02-design/test-spec');
if (!existsSync(specDir)) { console.log('skip: no test-spec dir'); process.exit(0); }

const idRe = /L[12]-[A-Z0-9]+-[0-9]+/g;
const codeExts = ['.rs', '.ts', '.tsx', '.js', '.jsx', '.go', '.py'];

function collectIds(dir, exts) {
  const ids = new Set();
  if (!existsSync(dir)) return ids;
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (exts.some(ext => e.name.endsWith(ext))) {
        const m = readFileSync(full, 'utf8').match(idRe) || [];
        m.forEach(x => ids.add(x));
      }
    }
  };
  walk(dir);
  return ids;
}

const specIds = collectIds(specDir, ['.md']);
const codeIds = new Set();
for (const d of ['tests', 'src']) for (const id of collectIds(join(root, d), codeExts)) codeIds.add(id);

const specArr = [...specIds].sort();
const codeArr = [...codeIds].sort();
const same = specArr.length === codeArr.length && specArr.every((v, i) => v === codeArr[i]);
if (same) { console.log('✓ 1:1 零差异'); process.exit(0); }
console.error('✌ 不一致，构建阻断');
console.error('--- SSOT ---\n' + specArr.join('\n'));
console.error('--- 代码 ---\n' + codeArr.join('\n'));
process.exit(1);
```

- [ ] **Step 3c.2: 测试断言**

```js
test('dev-flow-skills: check-test-spec-consistency shipped', () => {
  const tmp = '/tmp/init-code-repo-test-tspec-consistency';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, { projectName:'P', oneLine:'L', year:'2026', stacks:['rust'], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:['dev-flow-skills'] });
  assertOk(fileTree(tmp).includes('scripts/check-test-spec-consistency.mjs'), 'consistency script shipped');
  const r = spawnSync('node', [`${tmp}/scripts/check-test-spec-consistency.mjs`, tmp]);
  assert.equal(r.status, 0, 'skip when no test-spec dir');
});
```

- [ ] **Step 3c.3: 跑测试 + Commit**

Run: `npm test` → PASS。Commit:

```bash
git add templates/core/scripts/check-test-spec-consistency.mjs.tmpl tests/run_tests.mjs
git commit -m "feat(dev-flow-skills): test-spec 1:1 一致性校验脚本"
```

---

## Task 4: pi-cadence 组件

**Files:**
- Modify: `templates/core/docs/ROADMAP.md.tmpl`
- Modify: `templates/core/AGENTS.md.tmpl`（PI 段，与 Task 2g Policy 段同文件不同条件块）
- Modify: `templates/core/docs/HANDOVER.md.tmpl`

- [ ] **Step 4.1: ROADMAP 加 PI 段**

读 `templates/core/docs/ROADMAP.md.tmpl`，在顶部「前瞻」段后加 `<!--IF:pi-cadence-->` PI 体系段（正文用 spec §6.3 完整骨架，变量 `{{PI_FORMAT}}`/`{{PI_FIRST}}`/`{{DEV_BRANCH}}` 等已在 Task 1 注册）。

- [ ] **Step 4.2: AGENTS.md 加 PI 段**

在 AGENTS.md（Policy 段之后）加 `<!--IF:pi-cadence-->`：

```markdown
<!--IF:pi-cadence-->
## 迭代（PI）体系

交付节奏统一用迭代（PI）话术，避免与各仓内部切片编号冲突。`MVP/M1/M2/M3` 等降为跨 PI 的能力成熟度维度参考，不作迭代编号。完整定义见 [{{FNAME:docs/ROADMAP.md}}]({{FILE:../ROADMAP.md}})「迭代（PI）体系」。
<!--/IF:pi-cadence-->
```

- [ ] **Step 4.3: HANDOVER 加当前 PI 字段**

读 `templates/core/docs/HANDOVER.md.tmpl`，在顶部「当前阶段门」字段旁加：

```markdown
<!--IF:pi-cadence-->
- **当前 PI**：（TODO: 填当前 PI 编号，如 {{PI_FIRST}}）
<!--/IF:pi-cadence-->
```

- [ ] **Step 4.4: 测试断言**

```js
test('pi-cadence: ROADMAP/AGENTS/HANDOVER PI段', () => {
  const tmp = '/tmp/init-code-repo-test-pi';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, { projectName:'P', oneLine:'L', year:'2026', stacks:[], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:['pi-cadence'] });
  const rm = readFileSync(`${tmp}/docs/ROADMAP.md`, 'utf8');
  assertOk(rm.includes('迭代（PI）体系'), 'ROADMAP has PI section');
  assertOk(rm.includes('2026-PI1'), 'PI_FIRST substituted');
  assertOk(rm.includes('YYYY-PI<N>'), 'PI_FORMAT shown');
  assertOk(!rm.includes('{{PI_FIRST}}') && !rm.includes('{{PI_FORMAT}}'), 'no leftover PI vars');
  assertClean(rm, 'ROADMAP');
  assertOk(readFileSync(`${tmp}/AGENTS.md`,'utf8').includes('迭代（PI）体系'), 'AGENTS has PI section');
  assertOk(readFileSync(`${tmp}/docs/HANDOVER.md`,'utf8').includes('当前 PI'), 'HANDOVER has 当前 PI');
});
```

- [ ] **Step 4.5: 跑测试 + Commit**

Run: `npm test` → PASS。Commit:

```bash
git add templates/core/docs/ROADMAP.md.tmpl templates/core/AGENTS.md.tmpl templates/core/docs/HANDOVER.md.tmpl tests/run_tests.mjs
git commit -m "feat(pi-cadence): ROADMAP/AGENTS/HANDOVER PI 体系段"
```

---

## Task 5: 测试场景 + golden

**Files:**
- Create: `tests/scenarios/{agent-policy,dev-flow-skills,pi-cadence,full-governance}/config.json`
- Create: `tests/golden/{agent-policy,dev-flow-skills,pi-cadence,full-governance}/expected-tree.json`
- Modify: `tests/run_tests.mjs`

- [ ] **Step 5.1: 4 场景 config**

`tests/scenarios/agent-policy/config.json`:
```json
{
  "projectName": "AgentPolicyApp",
  "oneLine": "带 agent 策略的应用",
  "year": "2026",
  "stacks": ["rust"],
  "repoShape": "single",
  "runtimes": ["claude-code"],
  "remote": "github",
  "commitGate": { "mode": "default" },
  "components": ["agent-policy"],
  "branchModel": { "dev": "dev", "main": "main", "fix": "fix", "release": "release/v" }
}
```

`tests/scenarios/dev-flow-skills/config.json`: components `["dev-flow-skills"]`，stacks `["rust"]`，runtimes `["claude-code"]`，remote `"github"`。

`tests/scenarios/pi-cadence/config.json`: components `["pi-cadence"]`，stacks `[]`，runtimes `[]`，remote `"none"`。

`tests/scenarios/full-governance/config.json`: components `["agent-policy","dev-flow-skills","pi-cadence","full-ledger","api-docs"]`，stacks `["rust","node"]`，runtimes `["claude-code"]`，remote `"github"`。

- [ ] **Step 5.2: 生成 golden expected-tree**

对每场景装配后用 `fileTree` 导出。临时 Node 脚本（纯 Node，无 shell）：

```bash
node --input-type=module -e "
import { fileTree } from './tests/lib/tree.mjs';
import { assemble } from './skills/init-code-repo/assemble.mjs';
import { rmSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
for (const name of ['agent-policy','dev-flow-skills','pi-cadence','full-governance']) {
  const cfg = JSON.parse(readFileSync('tests/scenarios/'+name+'/config.json','utf8'));
  const tmp = '/tmp/gen-'+name; rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, cfg);
  mkdirSync('tests/golden/'+name, { recursive: true });
  writeFileSync('tests/golden/'+name+'/expected-tree.json', JSON.stringify(fileTree(tmp), null, 2)+'\n');
  console.log(name+': '+fileTree(tmp).length+' files');
}
"
```

人工核对每 expected-tree.json：agent-policy 场景含 agent-governance 4 文档 + check-agent-policy + verify 目标；dev-flow-skills 额外含三 skill SSOT + 薄入口；full-governance 全套。

- [ ] **Step 5.3: run_tests.mjs 加场景循环**

```js
const GOV_SCENARIOS = ['agent-policy', 'dev-flow-skills', 'pi-cadence', 'full-governance'];

for (const name of GOV_SCENARIOS) {
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

- [ ] **Step 5.4: 跑全量测试**

Run: `npm test`
Expected: 全部 PASS（4 新场景 tree+deadlink+clean + 各 Task 断言 + 现有 9 场景回归）。

- [ ] **Step 5.5: 回归红线确认**

确认现有 9 个 golden 场景（lightweight/standard/full-product/multi-stack/component/central-docs/html-views/zh-naming/with-conduct）expected-tree.json **未改动**（git diff 无变化）。若变化，回查 Task 2a/2b 的 `<!--ELSE-->` 分支。

- [ ] **Step 5.6: Commit**

```bash
git add tests/scenarios/ tests/golden/ tests/run_tests.mjs
git commit -m "test: 4 新治理场景 + golden（agent-policy/dev-flow-skills/pi-cadence/full-governance）"
```

---

## Task 6: 死链校验全组合 + 收尾

- [ ] **Step 6.1: 全场景死链校验**

`tests/run_tests.mjs` 已有 `all scenarios: no dead markdown links` 用例（遍历 tests/scenarios 所有目录），4 新场景自动纳入。Run: `npm test` → 该用例 PASS。

- [ ] **Step 6.2: 关键组合人工死链核查**

重点核查易死链组合：
- agent-policy 单装（无 three-tier-test）：dev-workflow-rules 引用 testing-rules 是否被 `<!--IF:three-tier-test-->` 正确剥离
- dev-flow-skills 装（含 agent-policy，无 three-tier-test）：三 skill SSOT 对 testing-rules 的引用
- pi-cadence 单装：AGENTS PI 段 → ROADMAP 链接（`{{FILE:../ROADMAP.md}}`）

若死链，补 `<!--IF:-->` 包裹或修链接。

- [ ] **Step 6.3: 跑全量 + 最终回归**

Run: `npm test` → 全绿。

- [ ] **Step 6.4: 最终 Commit**

```bash
git add -A
git commit -m "test: 死链校验全组合通过 + 收尾"
```

---

## Self-Review

**1. Spec coverage:**
- §3 三层架构 + skill 边界 → Task 1 + Task 2/3/4 ✓
- §4 agent-policy（4.1-4.6）→ Task 2a-2g ✓（dev-workflow-rules 2a、settings.json 2c、check-agent-policy 2d、agent-governance 4 文档 2e、verify 门禁 2f、AGENTS Policy 2g、lefthook 2g）
- §4.4 settings.json → Task 2c ✓
- §4.6 agent-governance 多仓/单仓 → Task 2e.2 ✓
- §5 dev-flow-skills（5.1-5.5）→ Task 3a-3c ✓
- §5.5 与 three-tier-test 关系 → Task 3a.2 testing-rules 引用条件化 ✓
- §6 pi-cadence → Task 4 ✓
- §7 装配机制（7.1-7.6）→ Task 1（7.1-7.4）+ Task 2a（7.5）+ Task 2b（7.6）✓
- §8 测试 → Task 5 + Task 6 ✓
- §9 YAGNI → 未实施自动同步/codex 适配器/PI 实例/worktree ✓

**2. Placeholder scan:** 无 TBD/TODO（HANDOVER 的 TODO 是设计内占位）。模板文档用"源+替换表"（具体源路径+具体替换表），非占位。

**3. Type consistency:**
- `{{VERIFY_FAST_CMD}}` 全程一致（substitute VARS、assemble ctx、settings.json、lefthook、dev-flow SSOT）✓
- `{{POLICY_ID}}` 一致（substitute、assemble ctx、AGENTS、check-agent-policy、agent-governance）✓
- 分支变量 `{{DEV_BRANCH}}` 等一致 ✓
- `{{PI_FORMAT}}`/`{{PI_FIRST}}` 一致 ✓
- 组件 cond 名一致：`agent-policy`/`dev-flow-skills`/`pi-cadence`（conditional、require、IF、组件表、测试 config 同名）✓
- check-agent-policy 与 check-test-spec-consistency 的 require 标记分别 `agent-policy`/`dev-flow-skills` ✓

**潜在风险（执行时注意）：**
- Task 2c 改了现有 runtime-adapters 测试 config（加 components:['agent-policy']）——漏改会 FAIL
- Task 2d 依赖 Task 2e（check-agent-policy 断言 agent-governance 4 文档存在）——执行顺序 2e 先于 2d，或 2d 暂跳断言④
- node package.json 内嵌 `<!--IF:-->` 在 JSON 中——stripConditionals 对任意文本工作，但需确认剥离后 JSON 合法（无残留空行）——Task 2f.2 用 ELSE 分支处理
- naming.mjs 不应误加 agent-governance/docs/skills 的 ZH 映射——Task 2e.1 已声明不映射
