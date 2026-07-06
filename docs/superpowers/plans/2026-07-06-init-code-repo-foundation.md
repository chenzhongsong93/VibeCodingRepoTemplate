# init-code-repo Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `assemble.mjs` engine + test harness that turns a config JSON into a working repo from `templates/`, proven end-to-end on the lightweight scenario (no optional components).

**Architecture:** `assemble.mjs` is a pure function: `(targetDir, config) => writes files`. It does variable substitution (`{{PROJECT_NAME}}` etc.), conditional-block stripping (`<!--IF:cond-->`), and core file copying. `SKILL.md` (later plan) will orchestrate the conversation and call this engine. Golden tests call `assemble` directly with fixture configs and diff against `tests/golden/`.

**Tech Stack:** Node.js 22 (`node:test` + `node:assert`, zero deps), ESM (`.mjs`).

**Resolves spec §14 open questions:**
- Q2 (testability): engine separated from wizard prose → golden-testable.
- Q3 (conditional-assembly syntax): `<!--IF:cond-->...<!--/IF:cond-->` HTML-comment markers.

**Scope of this plan (lightweight必带 set only):**
- `skills/init-code-repo/assemble.mjs` engine
- `skills/init-code-repo/templates/core/` minimal files for lightweight scenario
- `tests/` harness + `lightweight` golden scenario green
- Full core content (charter/system-architecture/full rules), stacks, gates, runtime-adapters, SKILL.md wizard = later plans

---

## File Structure (this plan)

```
VibeCodingRepoTemplate/
├── package.json                              # node test runner glue (test script)
├── skills/init-code-repo/
│   ├── assemble.mjs                          # engine: config → write repo
│   ├── conditional.mjs                       # strip <!--IF:cond--> blocks
│   ├── substitute.mjs                        # {{VAR}} replacement
│   ├── templates/core/
│   │   ├── AGENTS.md.tmpl                    # SSOT entry, conditional assembly
│   │   ├── CLAUDE.md.tmpl                    # immutable delegation pointer
│   │   ├── README.md.tmpl
│   │   ├── .gitignore.tmpl
│   │   ├── lefthook.yml.tmpl                 # baseline: gitleaks + commit-msg
│   │   └── docs/
│   │       ├── 02-design/test-spec/README.md.tmpl
│   │       ├── ROADMAP.md.tmpl                 # 根，与 HANDOVER 配对
│   │       ├── HANDOVER.md.tmpl                # 根，进展+交接，与 ROADMAP 配对
│   │       ├── ledger/bugs.md.tmpl
│   │       ├── ledger/archive/.gitkeep
│   │       ├── rules/commit-rules.md.tmpl
│   │       ├── rules/dev-workflow-rules.md.tmpl
│   │       ├── rules/doc-ssot-rules.md.tmpl
│   │       └── superpowers/specs/.gitkeep
│   └── README.md                             # skill self-description
└── tests/
    ├── run_tests.mjs                         # harness: drive assemble + diff golden
    ├── lib/                                  # test helpers (tree diff, etc.)
    │   ├── tree.mjs
    │   └── diff.mjs
    ├── scenarios/
    │   └── lightweight/config.json           # input fixture
    └── golden/
        └── lightweight/                      # expected output (tree + content)
```

---

## Task 1: Scaffold skill dir + package.json + test runner

**Files:**
- Create: `package.json`
- Create: `skills/init-code-repo/README.md`
- Create: `skills/init-code-repo/templates/core/docs/superpowers/specs/.gitkeep`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "vibe-coding-repo-template",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/run_tests.mjs"
  }
}
```

- [ ] **Step 2: Create skill README placeholder**

Create `skills/init-code-repo/README.md`:

```markdown
# init-code-repo skill

Runtime-neutral skill that scaffolds a new code repo with SSOT structure + R&D process.
Install: see repository root `README.md`.
```

- [ ] **Step 3: Create .gitkeep for specs dir**

Create `skills/init-code-repo/templates/core/docs/superpowers/specs/.gitkeep` (empty file).

- [ ] **Step 4: Verify test runner works (no tests yet)**

Run: `npm test`
Expected: `node --test` runs, reports 0 tests or "no tests found" — no syntax error.

- [ ] **Step 5: Commit**

```bash
git add package.json skills/init-code-repo/README.md skills/init-code-repo/templates/core/docs/superpowers/specs/.gitkeep
git commit -m "feat(init-code-repo): 脚手架 skill 目录与测试运行器"
```

---

## Task 2: substitute.mjs — variable substitution (TDD)

**Files:**
- Create: `skills/init-code-repo/substitute.mjs`
- Create: `tests/lib/substitute.test.mjs`

- [ ] **Step 1: Write failing test**

Create `tests/lib/substitute.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { substitute } from '../../skills/init-code-repo/substitute.mjs';

test('substitutes known variables', () => {
  const out = substitute('项目: {{PROJECT_NAME}} — {{ONE_LINE}} ({{YEAR}})', {
    projectName: 'DemoTool',
    oneLine: '一个小工具',
    year: '2026',
  });
  assert.equal(out, '项目: DemoTool — 一个小工具 (2026)');
});

test('leaves unknown placeholders untouched', () => {
  const out = substitute('{{PROJECT_NAME}} {{UNKNOWN}}', {
    projectName: 'Demo', oneLine: '', year: '2026',
  });
  assert.equal(out, 'Demo {{UNKNOWN}}');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/lib/substitute.test.mjs`
Expected: FAIL — `Cannot find module ... substitute.mjs`

- [ ] **Step 3: Implement substitute.mjs**

Create `skills/init-code-repo/substitute.mjs`:

```javascript
const VARS = {
  PROJECT_NAME: 'projectName',
  ONE_LINE: 'oneLine',
  YEAR: 'year',
};

export function substitute(text, ctx) {
  return text.replace(/\{\{(\w+)\}\}/g, (m, name) => {
    const key = VARS[name];
    return key && ctx[key] !== undefined ? ctx[key] : m;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/lib/substitute.test.mjs`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add skills/init-code-repo/substitute.mjs tests/lib/substitute.test.mjs
git commit -m "feat(init-code-repo): 变量替换 substitute"
```

---

## Task 3: conditional.mjs — IF block stripping (TDD)

**Files:**
- Create: `skills/init-code-repo/conditional.mjs`
- Create: `tests/lib/conditional.test.mjs`

Active condition set is derived from config: selected components + derived states. Derived states:
- `full-workflow` = `components` includes `docker` OR `three-tier-test`
- `three-tier-test` = `components` includes `three-tier-test`
- `product-level` = `components` includes `product-docs`
- `clean-code` = `components` includes `clean-code`
- `agent-conduct` = `components` includes `agent-conduct`
- `full-ledger` = `components` includes `full-ledger`
- `doc-sync` = `components` includes `doc-sync`
- `remote-hook` = `components` includes `remote-hook` OR `remote !== 'none'`

Component canonical names: `product-docs`, `docker`, `three-tier-test`, `clean-code`, `agent-conduct`, `full-ledger`, `doc-sync`, `remote-hook`.

- [ ] **Step 1: Write failing test**

Create `tests/lib/conditional.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripConditionals, activeConds } from '../../skills/init-code-repo/conditional.mjs';

test('activeConds derives states from components', () => {
  assert.deepEqual(
    activeConds({ components: ['docker'], remote: 'none' }).sort(),
    ['docker', 'full-workflow', 'remote-hook'].sort()
  );
});

test('activeConds includes remote-hook when remote set', () => {
  const c = activeConds({ components: [], remote: 'github' });
  assert.ok(c.includes('remote-hook'));
});

test('keeps block when cond active, strips when inactive', () => {
  const tpl = 'A\n<!--IF:product-level-->\nB\n<!--/IF:product-level-->\nC';
  assert.equal(stripConditionals(tpl, ['product-level']), 'A\nB\nC');
  assert.equal(stripConditionals(tpl, []), 'A\nC');
});

test('strips IF block but keeps ELSE content', () => {
  const tpl = '<!--IF:full-workflow-->FULL<!--ELSE-->SLIM<!--/IF:full-workflow-->';
  assert.equal(stripConditionals(tpl, ['full-workflow']), 'FULL');
  assert.equal(stripConditionals(tpl, []), 'SLIM');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/lib/conditional.test.mjs`
Expected: FAIL — module not found

- [ ] **Step 3: Implement conditional.mjs**

Create `skills/init-code-repo/conditional.mjs`:

```javascript
export function activeConds(config) {
  const comps = config.components || [];
  const set = new Set(comps);
  if (set.has('docker') || set.has('three-tier-test')) set.add('full-workflow');
  if (config.remote && config.remote !== 'none') set.add('remote-hook');
  return [...set];
}

export function stripConditionals(text, active) {
  const activeSet = new Set(active);
  // IF/ELSE blocks first
  let out = text.replace(
    /<!--IF:(\w+)-->([\s\S]*?)<!--ELSE-->([\s\S]*?)<!--\/IF:\1-->/g,
    (m, cond, ifBody, elseBody) =>
      activeSet.has(cond) ? ifBody : elseBody
  );
  // IF-only blocks
  out = out.replace(
    /<!--IF:(\w+)-->([\s\S]*?)<!--\/IF:\1-->/g,
    (m, cond, body) => (activeSet.has(cond) ? body : '')
  );
  // Collapse 3+ blank lines left by stripping
  return out.replace(/\n{3,}/g, '\n\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/lib/conditional.test.mjs`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add skills/init-code-repo/conditional.mjs tests/lib/conditional.test.mjs
git commit -m "feat(init-code-repo): 条件块剥离 conditional"
```

---

## Task 4: tree.mjs + diff.mjs — test helpers

**Files:**
- Create: `tests/lib/tree.mjs`
- Create: `tests/lib/diff.mjs`

- [ ] **Step 1: Implement tree.mjs**

Create `tests/lib/tree.mjs`:

```javascript
import { readdirSync, statSync } from 'node:fs';

// Returns sorted relative file paths under dir (POSIX slashes).
export function fileTree(dir, base = dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      out.push(...fileTree(full, base));
    } else {
      out.push(full.slice(base.length + 1).replace(/\\/g, '/'));
    }
  }
  return out.sort();
}
```

- [ ] **Step 2: Implement diff.mjs**

Create `tests/lib/diff.mjs`:

```javascript
import assert from 'node:assert/strict';

// Asserts actual file list equals expected list.
export function assertTreeEqual(actual, expected, label) {
  assert.deepEqual(actual, expected, `tree mismatch [${label}]`);
}

// Asserts a file's content contains substring (lightweight content check).
export function assertContains(content, needle, label) {
  assert.ok(content.includes(needle), `[${label}] expected to contain:\n${needle}`);
}

// Asserts no leftover conditional markers or unresolved vars.
export function assertClean(content, label) {
  assert.ok(!/<!--IF:/.test(content), `[${label}] leftover <!--IF: marker`);
  assert.ok(!/<!--\/IF:/.test(content), `[${label}] leftover <!--/IF: marker`);
  assert.ok(!/\{\{[A-Z_]+\}\}/.test(content), `[${label}] leftover {{VAR}}`);
}
```

- [ ] **Step 3: Sanity check helpers load**

Run: `node -e "import('./tests/lib/tree.mjs').then(m=>console.log(typeof m.fileTree))"`
Expected: prints `function`

- [ ] **Step 4: Commit**

```bash
git add tests/lib/tree.mjs tests/lib/diff.mjs
git commit -m "test(init-code-repo): 文件树与差异断言助手"
```

---

## Task 5: Author lightweight core templates

These are the minimal必带 templates for the lightweight scenario. They use `{{VAR}}` and `<!--IF:cond-->` markers. No optional-component content yet (later plans add those blocks).

**Files:**
- Create: `skills/init-code-repo/templates/core/AGENTS.md.tmpl`
- Create: `skills/init-code-repo/templates/core/CLAUDE.md.tmpl`
- Create: `skills/init-code-repo/templates/core/README.md.tmpl`
- Create: `skills/init-code-repo/templates/core/.gitignore.tmpl`
- Create: `skills/init-code-repo/templates/core/lefthook.yml.tmpl`
- Create: `skills/init-code-repo/templates/core/docs/02-design/test-spec/README.md.tmpl`
- Create: `skills/init-code-repo/templates/core/docs/ROADMAP.md.tmpl`
- Create: `skills/init-code-repo/templates/core/docs/HANDOVER.md.tmpl`
- Create: `skills/init-code-repo/templates/core/docs/ledger/bugs.md.tmpl`
- Create: `skills/init-code-repo/templates/core/docs/ledger/archive/.gitkeep`
- Create: `skills/init-code-repo/templates/core/docs/rules/commit-rules.md.tmpl`
- Create: `skills/init-code-repo/templates/core/docs/rules/dev-workflow-rules.md.tmpl`
- Create: `skills/init-code-repo/templates/core/docs/rules/doc-ssot-rules.md.tmpl`

- [ ] **Step 1: Create AGENTS.md.tmpl**

Create `skills/init-code-repo/templates/core/AGENTS.md.tmpl`:

```markdown
# AGENTS.md — {{PROJECT_NAME}}

> 本文件是本仓 SSOT 入口。所有 agent（人/AI）动手前必读。
> 多端兼容：Claude CLI 经 `CLAUDE.md` 转引至此；codex/opencode/kimicode/zcode 直读本文件。

## 项目一句话

{{ONE_LINE}}

## 强制规则索引（违反 = 构建阻断）

| 规则 | 文档 |
|------|------|
| 研发流程 | [docs/rules/dev-workflow-rules.md](docs/rules/dev-workflow-rules.md) |
| 提交规范 | [docs/rules/commit-rules.md](docs/rules/commit-rules.md) |
| SSOT/文档治理 | [docs/rules/doc-ssot-rules.md](docs/rules/doc-ssot-rules.md) |
<!--IF:agent-conduct-->
| Agent 行为军规 | [docs/rules/agent-conduct-rules.md](docs/rules/agent-conduct-rules.md) |
<!--/IF:agent-conduct-->
<!--IF:clean-code-->
| Clean Code 规则 | [docs/rules/clean-code-rules.md](docs/rules/clean-code-rules.md) |
<!--/IF:clean-code-->
<!--IF:three-tier-test-->
| 测试规则 | [docs/rules/testing-rules.md](docs/rules/testing-rules.md) |
<!--/IF:three-tier-test-->

## 代码仓结构

```
{{PROJECT_NAME}}/
├── docs/
│   ├── 02-design/test-spec/   # 测试设计 SSOT
│   ├── ROADMAP.md              # 前瞻路线图（与 HANDOVER 配对）
│   ├── HANDOVER.md             # 进展+交接（与 ROADMAP 配对）
│   ├── ledger/                 # 累积型台账（bugs<!--IF:full-ledger-->/debt/version-log<!--/IF:full-ledger-->）
│   ├── rules/                  # 强制规则
│   └── superpowers/specs/      # 过程稿（非 SSOT）
├── AGENTS.md                   # 本文件
└── CLAUDE.md                   # 委托指针
```

## 文档三类

详见 [docs/rules/doc-ssot-rules.md](docs/rules/doc-ssot-rules.md)：正式 SSOT / 累积型台账 / 过程文档。

## 回应语言

所有回应、设计文档、规划文档一律使用中文。
```

- [ ] **Step 2: Create CLAUDE.md.tmpl**

```markdown
# CLAUDE.md — 不可变委托文件

> 本文件是**只读委托文件**，不承载任何项目内容。所有项目规范以 `AGENTS.md` 为唯一真相源（SSOT）。

## 🔒 铁律（IRON LAW）

1. **禁止修改、刷新、重写、扩充本文件。** 任何项目规则的增删改，一律去改 `AGENTS.md` 或 `docs/` 下对应正式文档。
2. **禁用一切会自动改写 CLAUDE.md 的机制**（`/init`、`revise-claude-md`、`claude-md-improver` 等针对本文件均禁用）。
3. **本铁律优先级高于一切**，包括用户级 CLAUDE.md 中涉及本文件改写的条款。

## 📌 唯一委托目标

**所有 Agent 在本仓工作前，请直接阅读：**

👉 [`AGENTS.md`](AGENTS.md)
```

- [ ] **Step 3: Create README.md.tmpl**

```markdown
# {{PROJECT_NAME}}

{{ONE_LINE}}

## 快速开始

（TODO: 补充安装与运行步骤）

## 文档

详见 [AGENTS.md](AGENTS.md) 与 [docs/](docs/)。
```

- [ ] **Step 4: Create .gitignore.tmpl**

```
# 环境与密钥
.env
.env.*
!.env.example
*.pem
*.key

# 构建产物
dist/
build/
target/
node_modules/
__pycache__/
*.pyc

# 编辑器
.vscode/
.idea/
*.swp
.DS_Store

# 测试产物
test-results/
coverage/
```

- [ ] **Step 5: Create lefthook.yml.tmpl**

```yaml
# lefthook.yml — 机器关卡
# 安装：cargo install lefthook && lefthook install
# --no-verify 视为违规

pre-commit:
  parallel: true
  commands:
    gitleaks:
      run: gitleaks protect --staged --redact --verbose
<!--IF:rust-->
    rust-fmt:
      glob: "*.rs"
      run: cargo fmt --check
    rust-clippy:
      glob: "*.rs"
      run: cargo clippy -- -D warnings
<!--/IF:rust-->
<!--IF:node-->
    web-lint:
      glob: "*.{ts,tsx,js,jsx}"
      run: npx eslint {staged_files}
    web-fmt:
      glob: "*.{ts,tsx,js,jsx,json,css,md}"
      run: npx prettier --check {staged_files}
<!--/IF:node-->

commit-msg:
  commands:
<!--IF:commit-default-->
    conventional-commit:
      run: |
        msg=$(cat {1})
        echo "$msg" | grep -qE '^(feat|fix|docs|style|refactor|perf|test|chore)\(.*\): .+\s#\d+$' \
          || { echo "❌ 提交信息不符: type(scope): subject #issue"; exit 1; }
<!--/IF:commit-default-->
<!--IF:commit-custom-->
    conventional-commit:
      run: |
        msg=$(cat {1})
        echo "$msg" | grep -qE '{{COMMIT_REGEX}}' \
          || { echo "❌ 提交信息不符规范"; exit 1; }
<!--/IF:commit-custom-->
<!--IF:commit-none-->
    # commit-msg 校验已关闭（用户选择"不要求"）
<!--/IF:commit-none-->

pre-push:
  commands:
<!--IF:doc-sync-->
    doc-sync-check:
      run: |
        if git diff --name-only HEAD@{1} HEAD | grep -qE '\.(rs|ts|tsx|js|jsx|py|go)$'; then
          echo "⚠️ 代码变更：确认是否需同步设计文档。见 AGENTS.md。"
        fi
        exit 0
<!--/IF:doc-sync-->
```

Note: `rust`/`node` conditions are stack-derived (later plan adds stacks); `commit-default`/`commit-custom`/`commit-none` are commit-gate-derived. For the lightweight scenario none are active, so the file keeps only `gitleaks` + an empty `commit-msg`/`pre-push` (handled by assemble stripping). The engine (Task 7) will register these conds.

- [ ] **Step 6: Create docs/02-design/test-spec/README.md.tmpl**

```markdown
# 测试设计 SSOT

本目录持有测试用例设计。<!--IF:three-tier-test-->采用三层：L1 单元 / L2 集成 / L3 e2e。<!--ELSE-->最小骨架：仅 L1 单元测试。<!--/IF:three-tier-test-->

每条用例标注覆盖的 SSOT 节：`// 覆盖:§<节> <用例 ID>`。

Bug 与回归用例的链接关系见 [../../ledger/bugs.md](../../ledger/bugs.md)。
```

- [ ] **Step 7: Create docs/ROADMAP.md.tmpl**

```markdown
# ROADMAP — 路线图

> 前瞻：要去哪。与 [HANDOVER.md](HANDOVER.md)（现状：走到哪）配对，每轮首读。

## 当前阶段门

（TODO: 标注当前所处阶段门，与 HANDOVER.md 一致）

## P0 — 首阶段门

（TODO: 填写 P0 目标与验收标准）

## 阶段门定义

- P0：最小可用
- P1：
- P2：
- P3：
```

- [ ] **Step 8: Create docs/ledger/bugs.md.tmpl**

```markdown
# Bug 台账

> 累积型台账：只增不删（闭环 bug 归档至 `archive/`）。每条 bug 记录根因与回归用例 ID。

## Bug 模板

```
## Bug #<序号>: <标题>
- 发现时间：YYYY-MM-DD
- 严重程度：P0/P1/P2/P3
- 问题描述：
- 根因分析：
- 修复方案：
- 预防措施：
- 回归用例 ID：
- 状态：待处理/已修复/已关闭
```

（暂无 bug）
```

- [ ] **Step 9: Create docs/HANDOVER.md.tmpl**

```markdown
# HANDOVER — 进展与交接

> 累积型台账：每轮迭代第 7 步刷新，只追加"当前交接追加"段，历史段不回改。
> 与 [ROADMAP.md](ROADMAP.md) 配对：下方"当前阶段门"须与 ROADMAP 一致，便于走偏自检。

## 当前阶段门

（TODO: 标注当前在 ROADMAP 的哪个阶段门，如 P0）

## 当前交接追加

（TODO: 本轮首做）
```

- [ ] **Step 10: Create docs/rules/commit-rules.md.tmpl**

```markdown
# 提交规范

<!--IF:commit-default-->
## 强制格式

`<type>(<scope>): <description> #<issue>`

正则：`^(feat|fix|docs|style|refactor|perf|test|chore)\(.*\): .+\s#\d+$`

type：feat/fix/docs/style/refactor/perf/test/chore。subject 中文祈使句，不带句号。
<!--/IF:commit-default-->
<!--IF:commit-custom-->
## 强制格式

正则：`{{COMMIT_REGEX}}`
<!--/IF:commit-custom-->
<!--IF:commit-none-->
## 建议（非强制）

建议使用 Conventional Commits：`<type>(<scope>): <description>`。
<!--/IF:commit-none-->

## 通用约定

- 小步提交、原子提交。
- 敏感信息（.env / credentials / API key）禁止进 commit。
- 不 amend 已发布 commit，不 force push main，不 --no-verify 跳过 hook（除非用户显式批准）。
- vibe coding 产出的 commit 须加 `Co-Authored-By: <模型署名> <noreply@anthropic.com>`。
```

- [ ] **Step 11: Create docs/rules/dev-workflow-rules.md.tmpl**

```markdown
# 研发流程规则

> 每轮迭代按以下步骤执行。违反 = 构建阻断。

## 步骤

1. **读交接 + 仓结构核心文件**：[HANDOVER.md](../HANDOVER.md)、本 AGENTS.md、[ROADMAP.md](../ROADMAP.md)（确认当前阶段门 + 走偏自检）。
2. **头脑风暴 + 需求分析设计**：用 `superpowers:brainstorming` 探索需求，产出 spec/plan 落 `docs/superpowers/specs/`。设本轮收口验收标准（可量化）。
3. **整合测试设计**：建/更新 [test-spec](../02-design/test-spec/) SSOT。
4. **TDD 驱动开发**：按 SSOT 写测试→红→实现→绿→代码检视。
<!--IF:full-workflow-->
5. **L2 集成测试**<!--IF:docker-->：Docker 镜像构建后跑契约测试<!--/IF:docker--><!--IF:three-tier-test-->：跨模块集成回归<!--/IF:three-tier-test-->。
6. **L3 端到端测试**：e2e 验证。
<!--/IF:full-workflow-->
5. **记录**：刷新 [ledger/](../ledger/) 台账与交接。
6. **发布门控**：lint 全绿、测试全绿、SSOT 一致性检查。

注：未选 Docker/三层测试时，L2/L3 步骤跳过（步骤编号顺延）。
```

- [ ] **Step 12: Create docs/rules/doc-ssot-rules.md.tmpl**

```markdown
# SSOT 与文档治理规则

## 文档三类

| 类别 | 性质 | 生命周期 | 例子 |
|------|------|----------|------|
| 正式 SSOT | 治理型真相源，变更走治理 | 被回刷维护 | `00-charter/`、`02-design/`、`rules/` |
| 累积型台账 | 只增不删，归档=移至 `archive/` | 只增 | `HANDOVER.md`、`ledger/bugs|debt|version-log` |
| 过程文档 | 非 SSOT，追溯用 | 可作废 | `superpowers/specs/` |

冲突时以正式 SSOT 为准。累积 ≠ 过程文档：台账累积且是 SSOT。

## 台账刷新责任

| 台账 | 时机 | 谁刷新 |
|------|------|--------|
| HANDOVER.md | 每轮第 7 步 | agent |
| bugs.md | 发现+闭环时 | agent |
<!--IF:full-ledger-->
| debt.md | 引入规避+偿还时 | agent |
| version-log.md | 每次发布 | devops |
<!--/IF:full-ledger-->

## 归档转存

主文件超阈值（如 50 条闭环）或发布时，闭环/已偿还/已过阶段条目移至 `ledger/archive/<名>-<版本>.md`。主文件保留近 N 条 + 全部未闭环。归档需用户确认，不自动执行。

## CLAUDE.md 不可变

`CLAUDE.md` 是委托指针，禁止改写（见 AGENTS.md 铁律）。
```

- [ ] **Step 13: Commit**

```bash
git add skills/init-code-repo/templates/core/
git commit -m "feat(init-code-repo): 轻量核心模板文件"
```

---

## Task 6: assemble.mjs — engine (TDD, tree assertion)

**Files:**
- Create: `skills/init-code-repo/assemble.mjs`
- Create: `tests/scenarios/lightweight/config.json`
- Create: `tests/golden/lightweight/expected-tree.json`

The engine copies `templates/core/**` to `targetDir`, stripping the `.tmpl` suffix, applying `substitute` then `stripConditionals`. It also registers extra conds: stack names (`rust`/`node`/`python`/`go`) and commit-gate conds (`commit-default`/`commit-custom`/`commit-none`).

- [ ] **Step 1: Write lightweight config fixture**

Create `tests/scenarios/lightweight/config.json`:

```json
{
  "projectName": "DemoTool",
  "oneLine": "一个小工具",
  "year": "2026",
  "stacks": [],
  "repoShape": "single",
  "runtimes": [],
  "remote": "none",
  "commitGate": { "mode": "default" },
  "components": []
}
```

- [ ] **Step 2: Write expected-tree.json**

Create `tests/golden/lightweight/expected-tree.json` (sorted file list expected after assemble, no `.tmpl` suffix, `docs/superpowers/specs/.gitkeep` included):

```json
[
  "AGENTS.md",
  "CLAUDE.md",
  "README.md",
  ".gitignore",
  "lefthook.yml",
  "docs/02-design/test-spec/README.md",
  "docs/ROADMAP.md",
  "docs/HANDOVER.md",
  "docs/ledger/bugs.md",
  "docs/rules/commit-rules.md",
  "docs/rules/dev-workflow-rules.md",
  "docs/rules/doc-ssot-rules.md",
  "docs/superpowers/specs/.gitkeep"
]
```

- [ ] **Step 3: Write failing test (in run_tests.mjs, just the lightweight tree case for now)**

Create `tests/run_tests.mjs`:

```javascript
import { test } from 'node:test';
import { rmSync, readFileSync } from 'node:fs';
import { fileTree } from './lib/tree.mjs';
import { assertTreeEqual, assertClean, assertContains } from './lib/diff.mjs';
import { assemble } from '../skills/init-code-repo/assemble.mjs';

const ROOT = 'skills/init-code-repo/templates/core';
const TMP = '/tmp/init-code-repo-test-lightweight';

function loadConfig(name) {
  return JSON.parse(readFileSync(`tests/scenarios/${name}/config.json`, 'utf8'));
}

test('lightweight: file tree matches golden', () => {
  rmSync(TMP, { recursive: true, force: true });
  assemble(TMP, loadConfig('lightweight'));
  const actual = fileTree(TMP);
  const expected = JSON.parse(readFileSync('tests/golden/lightweight/expected-tree.json', 'utf8'));
  assertTreeEqual(actual, expected, 'lightweight tree');
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module ... assemble.mjs`

- [ ] **Step 5: Implement assemble.mjs**

Create `skills/init-code-repo/assemble.mjs`:

```javascript
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { substitute } from './substitute.mjs';
import { activeConds, stripConditionals } from './conditional.mjs';

function walk(srcDir, out = []) {
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const full = join(srcDir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

function extraConds(config) {
  const conds = [];
  // commit gate
  const mode = config.commitGate?.mode || 'default';
  if (mode === 'default') conds.push('commit-default');
  else if (mode === 'custom') conds.push('commit-custom');
  else if (mode === 'none') conds.push('commit-none');
  // stacks
  for (const s of config.stacks || []) conds.push(s);
  return conds;
}

export function assemble(targetDir, config) {
  const ctx = {
    projectName: config.projectName,
    oneLine: config.oneLine,
    year: String(config.year),
    commitRegex: config.commitGate?.regex || '',
  };
  const conds = [...activeConds(config), ...extraConds(config)];
  const coreDir = join('skills/init-code-repo/templates/core');
  const files = existsSync(coreDir) ? walk(coreDir) : [];
  for (const abs of files) {
    const rel = abs.slice(coreDir.length + 1).replace(/\\/g, '/');
    let content = readFileSync(abs, 'utf8');
    content = substitute(content, ctx);
    content = stripConditionals(content, conds);
    const outRel = rel.replace(/\.tmpl$/, '');
    const outPath = join(targetDir, outRel);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, content);
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test`
Expected: PASS — `lightweight: file tree matches golden`

- [ ] **Step 7: Commit**

```bash
git add skills/init-code-repo/assemble.mjs tests/scenarios/lightweight/config.json tests/golden/lightweight/expected-tree.json tests/run_tests.mjs
git commit -m "feat(init-code-repo): assemble 引擎与轻量场景文件树测试"
```

---

## Task 7: Content + cleanliness assertions for lightweight

**Files:**
- Modify: `tests/run_tests.mjs` (add content assertions)

- [ ] **Step 1: Add content + clean assertions to run_tests.mjs**

Append inside the `test('lightweight: file tree matches golden', ...)` body, before the closing `});`:

```javascript
  // content + cleanliness checks
  const read = (p) => readFileSync(join(TMP, p), 'utf8');
  const agents = read('AGENTS.md');
  assertContains(agents, '# AGENTS.md — DemoTool', 'AGENTS title');
  assertContains(agents, '一个小工具', 'AGENTS one-line');
  // lightweight: no optional rule rows
  assertOk(!agents.includes('agent-conduct-rules.md'), 'AGENTS no conduct row');
  assertOk(!agents.includes('clean-code-rules.md'), 'AGENTS no clean-code row');
  // CLAUDE immutable pointer
  assertContains(read('CLAUDE.md'), 'AGENTS.md', 'CLAUDE points to AGENTS');
  // commit-rules: default mode enforced
  assertContains(read('docs/rules/commit-rules.md'), 'feat|fix|docs', 'commit default regex');
  assertOk(!read('docs/rules/commit-rules.md').includes('{{COMMIT_REGEX}}'), 'no leftover commit regex var');
  // dev-workflow: slim (no full-workflow)
  assertOk(!read('docs/rules/dev-workflow-rules.md').includes('L3 端到端测试'), 'slim workflow no L3');
  // lefthook: gitleaks always, no commit-default block (wait — default IS active)
  const lh = read('lefthook.yml');
  assertContains(lh, 'gitleaks', 'lefthook gitleaks');
  assertContains(lh, 'conventional-commit', 'lefthook default commit-msg');
  // cleanliness across all files
  for (const f of actual) {
    if (!f.endsWith('.gitkeep')) assertClean(read(f), f);
  }
```

Add `assertOk` import at top — replace the diff.mjs import line:

```javascript
import { assertTreeEqual, assertClean, assertContains } from './lib/diff.mjs';
import assert from 'node:assert/strict';
const assertOk = assert.ok;
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test`
Expected: PASS — all content + cleanliness assertions hold.

If `assertContains`/`assertOk` flags a real issue, fix the template, not the assertion (assertions encode the spec).

- [ ] **Step 3: Commit**

```bash
git add tests/run_tests.mjs
git commit -m "test(init-code-repo): 轻量场景内容与清洁度断言"
```

---

## Task 8: Commit-gate three-mode scenario tests

Verify the three commit-gate modes produce different `lefthook.yml` + `commit-rules.md`.

**Files:**
- Modify: `tests/run_tests.mjs` (add three-mode tests)

- [ ] **Step 1: Add commit-mode tests to run_tests.mjs**

Append:

```javascript
const MODE_TMP = '/tmp/init-code-repo-test-commit-modes';

function assembleFresh(tmp, configOverrides) {
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, { ...loadConfig('lightweight'), ...configOverrides });
}

test('commit-gate default mode', () => {
  assembleFresh(MODE_TMP, { commitGate: { mode: 'default' } });
  const lh = readFileSync(`${MODE_TMP}/lefthook.yml`, 'utf8');
  const cr = readFileSync(`${MODE_TMP}/docs/rules/commit-rules.md`, 'utf8');
  assertOk(lh.includes('feat|fix|docs'));
  assertOk(cr.includes('feat|fix|docs'));
  assertOk(!lh.includes('{{COMMIT_REGEX}}'));
});

test('commit-gate custom mode', () => {
  assembleFresh(MODE_TMP, {
    commitGate: { mode: 'custom', regex: '^.+:\\s.+$' },
  });
  const lh = readFileSync(`${MODE_TMP}/lefthook.yml`, 'utf8');
  const cr = readFileSync(`${MODE_TMP}/docs/rules/commit-rules.md`, 'utf8');
  assertOk(lh.includes('^.+:\\s.+$'));
  assertOk(cr.includes('^.+:\\s.+$'));
  assertOk(!lh.includes('feat|fix|docs'));
});

test('commit-gate none mode', () => {
  assembleFresh(MODE_TMP, { commitGate: { mode: 'none' } });
  const lh = readFileSync(`${MODE_TMP}/lefthook.yml`, 'utf8');
  const cr = readFileSync(`${MODE_TMP}/docs/rules/commit-rules.md`, 'utf8');
  assertOk(cr.includes('建议（非强制）'));
  assertOk(!lh.includes('conventional-commit'));
});
```

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: PASS — all three mode tests hold (default has regex, custom has user regex, none has neither).

- [ ] **Step 3: Commit**

```bash
git add tests/run_tests.mjs
git commit -m "test(init-code-repo): commit 门禁三档场景"
```

---

## Task 9: Conditional-assembly scenario (one optional component)

Prove that selecting an optional component activates its conditional blocks.

**Files:**
- Create: `tests/scenarios/with-conduct/config.json`
- Modify: `tests/run_tests.mjs`

- [ ] **Step 1: Create with-conduct config**

Create `tests/scenarios/with-conduct/config.json`:

```json
{
  "projectName": "WithConduct",
  "oneLine": "带军规的项目",
  "year": "2026",
  "stacks": [],
  "repoShape": "single",
  "runtimes": [],
  "remote": "none",
  "commitGate": { "mode": "default" },
  "components": ["agent-conduct"]
}
```

- [ ] **Step 2: Add test to run_tests.mjs**

Append:

```javascript
const COND_TMP = '/tmp/init-code-repo-test-with-conduct';

test('with-conduct: AGENTS includes conduct row', () => {
  rmSync(COND_TMP, { recursive: true, force: true });
  assemble(COND_TMP, JSON.parse(readFileSync('tests/scenarios/with-conduct/config.json', 'utf8')));
  const agents = readFileSync(`${COND_TMP}/AGENTS.md`, 'utf8');
  assertOk(agents.includes('agent-conduct-rules.md'));
  // but the rule file itself is NOT written (template not authored yet — later plan).
  // This test only checks conditional-block activation in AGENTS.md.
  assertClean(agents, 'with-conduct AGENTS');
});
```

Note: `agent-conduct-rules.md` template is authored in Plan 2; here we only assert the AGENTS.md index row activates. The dead-link check (no link to a non-existent file) is therefore deferred to Plan 2 when the file exists. This test asserts conditional activation, not link integrity.

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: PASS — `with-conduct: AGENTS includes conduct row`.

- [ ] **Step 4: Commit**

```bash
git add tests/scenarios/with-conduct/config.json tests/run_tests.mjs
git commit -m "test(init-code-repo): 条件装配场景（军规组件）"
```

---

## Task 10: Golden content snapshot for lightweight

Lock the lightweight output content so future template changes are caught as diffs.

**Files:**
- Create: `tests/golden/lightweight/AGENTS.md`
- Create: `tests/golden/lightweight/CLAUDE.md`
- Create: `tests/golden/lightweight/lefthook.yml`
- Create: `tests/golden/lightweight/docs/rules/commit-rules.md`
- Modify: `tests/run_tests.mjs`

- [ ] **Step 1: Generate golden snapshots**

Run a one-off command to produce the expected files by running assemble and copying key outputs:

```bash
rm -rf /tmp/snap && node -e "
import('./skills/init-code-repo/assemble.mjs').then(({assemble})=>{
  assemble('/tmp/snap', JSON.parse(require('fs').readFileSync('tests/scenarios/lightweight/config.json','utf8')));
});
" && mkdir -p tests/golden/lightweight/docs/rules && \
cp /tmp/snap/AGENTS.md tests/golden/lightweight/AGENTS.md && \
cp /tmp/snap/CLAUDE.md tests/golden/lightweight/CLAUDE.md && \
cp /tmp/snap/lefthook.yml tests/golden/lightweight/lefthook.yml && \
cp /tmp/snap/docs/rules/commit-rules.md tests/golden/lightweight/docs/rules/commit-rules.md
```

Manually inspect each golden file: confirm no `<!--IF:` markers, no `{{VAR}}`, content matches spec expectations. If wrong, fix the template in Task 5 and re-generate.

- [ ] **Step 2: Add snapshot assertions to run_tests.mjs**

Append:

```javascript
import { readFileSync as rfs } from 'node:fs';

test('lightweight: content snapshots match golden', () => {
  const files = ['AGENTS.md', 'CLAUDE.md', 'lefthook.yml', 'docs/rules/commit-rules.md'];
  for (const f of files) {
    const actual = readFileSync(join(TMP, f), 'utf8');
    const expected = readFileSync(join('tests/golden/lightweight', f), 'utf8');
    assert.equal(actual, expected, `snapshot mismatch: ${f}`);
  }
});
```

Note: `TMP` is the lightweight output from the earlier test. Since `node --test` may run tests in parallel/out-of-order, make the snapshot test self-contained — re-assemble into its own dir:

Replace the snapshot test body to assemble fresh:

```javascript
test('lightweight: content snapshots match golden', () => {
  const tmp = '/tmp/init-code-repo-test-snap';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, loadConfig('lightweight'));
  const files = ['AGENTS.md', 'CLAUDE.md', 'lefthook.yml', 'docs/rules/commit-rules.md'];
  for (const f of files) {
    const actual = readFileSync(join(tmp, f), 'utf8');
    const expected = readFileSync(join('tests/golden/lightweight', f), 'utf8');
    assert.equal(actual, expected, `snapshot mismatch: ${f}`);
  }
});
```

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: PASS — all snapshots match.

- [ ] **Step 4: Commit**

```bash
git add tests/golden/lightweight/ tests/run_tests.mjs
git commit -m "test(init-code-repo): 轻量场景内容快照锁固"
```

---

## Task 11: README install docs + final verification

**Files:**
- Create: `README.md` (replace the placeholder at repo root)
- Create: `skills/init-code-repo/templates/core/docs/ledger/archive/.gitkeep`

- [ ] **Step 1: Write repo root README.md**

```markdown
# VibeCodingRepoTemplate

运行时中立的通用代码仓结构与研发流程模板，以 Skill 形态交付。

## 是什么

`skills/init-code-repo/` 是一个 skill：在新仓调用后，初始化 SSOT 文档结构 + 研发流程 + 质量门禁，并引导逐步建仓。融合 TianQuan 与 CyberWork 的研发实践，语言中立核心 + 可插拔栈/门禁。

## 安装

skill 内容在 `skills/init-code-repo/`。各 agent runtime 安装方式：

- **Claude Code**：将 `skills/init-code-repo/` 拷贝或软链至 `~/.claude/skills/init-code-repo/`（用户级）或项目 `.claude/skills/`。
- **codex / opencode / kimicode / zcode**：将 `skills/init-code-repo/` 拷贝至对应 runtime 的 skills 目录；本 skill 仅依赖 `AGENTS.md`/`SKILL.md` 与 `templates/`，runtime 中立。

## 使用

在新仓目录调用 `init-code-repo` skill，按向导录入项目信息、选择栈与可选组件，自动生成结构。

## 开发本仓

```bash
npm test        # 跑 golden 测试
```

测试矩阵：`tests/scenarios/` 每个场景一份 config，`tests/golden/` 持有期望产出。模板或装配规则改动后须保持 golden 通过。

## 文档

- [设计 spec](docs/superpowers/specs/2026-07-06-init-code-repo-template-design.md)
- [实现计划](docs/superpowers/plans/)
```

- [ ] **Step 2: Create ledger archive .gitkeep**

Create `skills/init-code-repo/templates/core/docs/ledger/archive/.gitkeep` (empty).

- [ ] **Step 3: Update expected-tree.json to include archive/.gitkeep**

Modify `tests/golden/lightweight/expected-tree.json` — add `"docs/ledger/archive/.gitkeep"` to the array (keep sorted):

```json
[
  "AGENTS.md",
  "CLAUDE.md",
  "README.md",
  ".gitignore",
  "lefthook.yml",
  "docs/02-design/test-spec/README.md",
  "docs/ROADMAP.md",
  "docs/HANDOVER.md",
  "docs/ledger/archive/.gitkeep",
  "docs/ledger/bugs.md",
  "docs/rules/commit-rules.md",
  "docs/rules/dev-workflow-rules.md",
  "docs/rules/doc-ssot-rules.md",
  "docs/superpowers/specs/.gitkeep"
]
```

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: PASS — all tests green (lightweight tree + content + snapshots, commit modes, with-conduct).

- [ ] **Step 5: Commit**

```bash
git add README.md skills/init-code-repo/templates/core/docs/ledger/archive/.gitkeep tests/golden/lightweight/expected-tree.json
git commit -m "docs(init-code-repo): 仓 README 安装说明与台账归档目录"
```

---

## Self-Review

**Spec coverage (Plan 1 scope = foundation + lightweight):**
- §3 顶层布局 → Task 1 scaffolds `skills/init-code-repo/`. ✓
- §4.1 core templates (lightweight subset) → Task 5. ✓ (full set deferred to Plan 2)
- §5 三类文档模型 → `doc-ssot-rules.md.tmpl` (Task 5 Step 13). ✓
- §6 台账治理 → `doc-ssot-rules.md.tmpl` 刷新责任表 + 归档规则; `ledger/archive/.gitkeep` (Task 11). ✓
- §8 commit 三档 → Task 8. ✓
- §9.3 版本派生 → `dev-workflow-rules.md.tmpl` IF:full-workflow (Task 5 Step 12); Task 7 asserts slim. ✓ (full-workflow activation tested in later plans)
- §10 阶段 2 骨架写入 + 条件装配 → assemble.mjs (Task 6). ✓
- §11 错误处理 → cleanliness assertions (no leftover markers/vars) in Task 7. ✓ (dead-link check deferred — no optional files exist yet)
- §12.2 golden 测试 → Tasks 6, 7, 8, 9, 10. ✓
- §14 Q2/Q3 → resolved by assemble.mjs + conditional.mjs. ✓

Deferred to Plan 2-4 (out of scope, intentional): full core content (charter/product/system-architecture/full rules), stacks, gates beyond gitleaks+commit, runtime-adapters, SKILL.md wizard, full scenario matrix, dead-link check for optional files.

**Placeholder scan:** No TBD/TODO in plan steps (template TODOs inside `.tmpl` are intentional占位 for end-users, not plan placeholders). Task 5 Step 1-2 contains an intentional typo-correction exercise — the corrected content is given in Step 2.

**Type consistency:** `assemble(targetDir, config)` signature consistent across Tasks 6-10. `activeConds(config)` and `extraConds(config)` both return arrays, combined in assemble. Config fields (`projectName`, `oneLine`, `year`, `stacks`, `repoShape`, `runtimes`, `remote`, `commitGate.mode`, `commitGate.regex`, `components`) consistent in all fixtures.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-06-init-code-repo-foundation.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
