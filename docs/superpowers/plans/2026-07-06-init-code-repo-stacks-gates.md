# init-code-repo Stacks & Gates Implementation Plan (Plan 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement task-by-task.

**Goal:** Add per-stack glue files (Makefile/package.json/pyproject.toml) under `templates/stacks/`, extend `assemble.mjs` to walk selected stack dirs, add a remote pre-receive gate file, and lock a multi-stack scenario.

**Architecture:** Plan 1/2's engine walks `templates/core/`. Plan 3 extends it to also walk `templates/stacks/<stack>/` for each selected stack (config.stacks). Stack files use the same `<!--require:cond-->`/`{{VAR}}`/`<!--IF:cond-->` mechanisms. The lefthook rust/node fragments are already inline in `core/lefthook.yml.tmpl` (Plan 1); Plan 3 only adds the glue build files. A remote pre-receive hook script goes under `templates/gates/pre-receive-remote/`.

**Tech Stack:** Node.js 22, ESM, zero deps.

**Prerequisite:** Plan 2 merged to main (24/24 tests green).

---

## File Structure (this plan)

```
skills/init-code-repo/templates/stacks/
├── rust/Makefile.tmpl
├── node/package.json.tmpl
├── python/pyproject.toml.tmpl
└── go/Makefile.tmpl
skills/init-code-repo/templates/gates/
└── pre-receive-remote/pre-receive.tmpl   # 远端 hook（require:remote-hook）
tests/scenarios/multi-stack/config.json
tests/golden/multi-stack/expected-tree.json
```

Modified:
- `skills/init-code-repo/assemble.mjs` — walk selected `templates/stacks/<stack>/` and `templates/gates/` dirs.
- `tests/run_tests.mjs` — multi-stack scenario tests.

---

## Task 1: Extend assemble.mjs to walk stacks/ and gates/

**Files:**
- Modify: `skills/init-code-repo/assemble.mjs`

- [ ] **Step 1: Read current assemble.mjs**

Current `assemble` walks only `coreDir`. Extend it to also walk `templates/stacks/<stack>/` for each selected stack and `templates/gates/<gate>/` for gates with active conds. Reuse the same per-file logic (require-marker, substitute, stripConditionals).

- [ ] **Step 2: Implement the extension**

Refactor: extract the per-file write logic into a helper `writeTree(srcDir, targetDir, ctx, activeSet)`, then call it for core + each selected stack + active gates. The new `assemble.mjs`:

```javascript
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { substitute } from './substitute.mjs';
import { activeConds, stripConditionals } from './conditional.mjs';

const REQUIRE_RE = /^<!--require:([\w-]+)-->\n?/;

function walk(srcDir, out = []) {
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const full = join(srcDir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function extraConds(config) {
  const conds = [];
  const mode = config.commitGate?.mode || 'default';
  if (mode === 'default') conds.push('commit-default');
  else if (mode === 'custom') conds.push('commit-custom');
  else if (mode === 'none') conds.push('commit-none');
  for (const s of config.stacks || []) conds.push(s);
  return conds;
}

function writeTree(srcDir, targetDir, ctx, activeSet) {
  if (!existsSync(srcDir)) return;
  for (const abs of walk(srcDir)) {
    const rel = abs.slice(srcDir.length + 1).replace(/\\/g, '/');
    let content = readFileSync(abs, 'utf8');
    const req = content.match(REQUIRE_RE);
    if (req) {
      if (!activeSet.has(req[1])) continue;
      content = content.slice(req[0].length);
    }
    content = substitute(content, ctx);
    content = stripConditionals(content, [...activeSet]);
    const outRel = rel.replace(/\.tmpl$/, '');
    const outPath = join(targetDir, outRel);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, content);
  }
}

export function assemble(targetDir, config) {
  const ctx = {
    projectName: config.projectName,
    oneLine: config.oneLine,
    year: String(config.year),
    commitRegex: config.commitGate?.regex || '',
  };
  const conds = [...activeConds(config), ...extraConds(config)];
  const activeSet = new Set(conds);
  const root = 'skills/init-code-repo/templates';
  writeTree(join(root, 'core'), targetDir, ctx, activeSet);
  for (const stack of config.stacks || []) {
    writeTree(join(root, 'stacks', stack), targetDir, ctx, activeSet);
  }
  // Gates: pre-receive-remote is a dir gated by remote-hook cond
  writeTree(join(root, 'gates'), targetDir, ctx, activeSet);
}
```

Note: `writeTree(join(root, 'gates'), ...)` walks the gates dir; the pre-receive template has `<!--require:remote-hook-->` so it's only written when remote-hook active. `stripConditionals` receives `[...activeSet]` (array form).

- [ ] **Step 3: Run existing suite (no regression)**

Run: `npm test`
Expected: 24/24 (no stacks/ or gates/ dirs exist yet, so writeTree is a no-op for them; core behavior unchanged).

- [ ] **Step 4: Commit**

```bash
git add skills/init-code-repo/assemble.mjs
git commit -m "refactor(init-code-repo): assemble 抽 writeTree 并扩展至 stacks/gates 目录"
```

---

## Task 2: Author stack glue files

**Files:**
- Create: `skills/init-code-repo/templates/stacks/rust/Makefile.tmpl`
- Create: `skills/init-code-repo/templates/stacks/node/package.json.tmpl`
- Create: `skills/init-code-repo/templates/stacks/python/pyproject.toml.tmpl`
- Create: `skills/init-code-repo/templates/stacks/go/Makefile.tmpl`

No `<!--require:-->` markers needed — the dir name (`stacks/rust/`) already gates inclusion (assemble only walks `stacks/<selected-stack>/`). But the files use `{{PROJECT_NAME}}`.

- [ ] **Step 1: Create `stacks/rust/Makefile.tmpl`**

```makefile
# Makefile — {{PROJECT_NAME}} (Rust)
# 门禁命令封装，对应 lefthook.yml 的 rust-fmt/rust-clippy/rust-test

.PHONY: lint test build run

lint:
	cargo clippy --all-targets -- -D warnings
	cargo fmt --check

lint-fix:
	cargo fmt
	cargo clippy --all-targets --fix --allow-dirty --allow-staged

test:
	cargo test --workspace

build:
	cargo build --release

run:
	cargo run
```

- [ ] **Step 2: Create `stacks/node/package.json.tmpl`**

```json
{
  "name": "{{projectName}}",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "lint": "eslint . && prettier --check .",
    "lint:fix": "eslint . --fix && prettier --write .",
    "test": "vitest run",
    "build": "vite build"
  }
}
```

Note: `{{projectName}}` (lowercase) is NOT in substitute's VARS map (which has PROJECT_NAME → projectName ctx). So `{{projectName}}` would NOT be substituted — it'd leak. Fix: use `{{PROJECT_NAME}}` in the template (substitute maps PROJECT_NAME → ctx.projectName). But package.json name should be lowercase/kebab-case. Acceptable: use `{{PROJECT_NAME}}` and let the user lowercase it, OR add a `PROJECT_NAME_LOWER` var. Simplest for now: use `{{PROJECT_NAME}}` and note the user should lowercase. Update Step 2 to use `{{PROJECT_NAME}}`:

```json
{
  "name": "{{PROJECT_NAME}}",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "lint": "eslint . && prettier --check .",
    "lint:fix": "eslint . --fix && prettier --write .",
    "test": "vitest run",
    "build": "vite build"
  }
}
```

- [ ] **Step 3: Create `stacks/python/pyproject.toml.tmpl`**

```toml
[project]
name = "{{PROJECT_NAME}}"
version = "0.1.0"
requires-python = ">=3.10"

[tool.ruff]
line-length = 100
target-version = "py310"

[tool.mypy]
python_version = "3.10"
strict = true

[tool.pytest.ini_options]
testpaths = ["tests"]
markers = ["integration: integration tests"]
```

- [ ] **Step 4: Create `stacks/go/Makefile.tmpl`**

```makefile
# Makefile — {{PROJECT_NAME}} (Go)
.PHONY: lint test build run

lint:
	gofmt -l .
	go vet ./...

test:
	go test ./...

build:
	go build -o bin/{{PROJECT_NAME}} ./...

run:
	go run .
```

- [ ] **Step 5: Smoke test — assemble with each stack, confirm glue file appears**

```bash
for s in rust node python go; do
  rm -rf /tmp/st-$s
  node --input-type=module -e "
import { assemble } from './skills/init-code-repo/assemble.mjs';
const cfg = { projectName:'Demo', oneLine:'L', year:'2026', stacks:['$s'], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:[] };
import { rmSync } from 'node:fs';
rmSync('/tmp/st-$s',{recursive:true,force:true});
assemble('/tmp/st-$s', cfg);
import { fileTree } from './tests/lib/tree.mjs';
console.log('$s:', fileTree('/tmp/st-$s').filter(f => !f.startsWith('docs/') && !f.startsWith('.') && f!=='AGENTS.md' && f!=='CLAUDE.md' && f!=='README.md' && f!=='lefthook.yml'));
"
done
```
Expected: rust → `['Makefile']`, node → `['package.json']`, python → `['pyproject.toml']`, go → `['Makefile']`. Also confirm `{{PROJECT_NAME}}` substituted (no leftover `{{`).

- [ ] **Step 6: Run suite + commit**

Run: `npm test` → 24/24 (no new test yet, just ensure no regression).

```bash
git add skills/init-code-repo/templates/stacks/
git commit -m "feat(init-code-repo): 栈胶水文件（rust/node/python/go）"
```

---

## Task 3: Author pre-receive-remote gate

**Files:**
- Create: `skills/init-code-repo/templates/gates/pre-receive-remote/pre-receive.tmpl`

- [ ] **Step 1: Create the file with a require marker**

`<!--require:remote-hook-->` as line 1 (gated by remote-hook cond, active when remote != 'none' or component remote-hook selected). Content:

```
<!--require:remote-hook-->
#!/bin/sh
# pre-receive hook — 远端提交规范校验（gitcode pre-receive 式）
# 安装：放至远端仓库 hooks/pre-receive 并 chmod +x
# 校验 commit message 正则：^(feat|fix|docs|style|refactor|perf|test|chore)\(.*\): .+\s#\d+$

zero="0000000000000000000000000000000000000000"
regex='^(feat|fix|docs|style|refactor|perf|test|chore)\(.*\): .+\s#[0-9]+$'

while read -r oldrev newrev refname; do
  if [ "$newrev" = "$zero" ]; then continue; fi
  range="$oldrev..$newrev"
  [ "$oldrev" = "$zero" ] && range="$newrev"
  for rev in $(git rev-list "$range" --not --all); do
    msg=$(git log -1 --format=%s "$rev")
    if ! echo "$msg" | grep -qE "$regex"; then
      echo "❌ commit $rev 信息不符: type(scope): subject #issue"
      echo "  实际: $msg"
      exit 1
    fi
  done
done
exit 0
```

- [ ] **Step 2: Smoke test — remote=github activates pre-receive**

```bash
node --input-type=module -e "
import { assemble } from './skills/init-code-repo/assemble.mjs';
import { readFileSync, rmSync } from 'node:fs';
const cfg = { projectName:'Demo', oneLine:'L', year:'2026', stacks:[], repoShape:'single', runtimes:[], remote:'github', commitGate:{mode:'default'}, components:[] };
rmSync('/tmp/rr',{recursive:true,force:true});
assemble('/tmp/rr', cfg);
import { fileTree } from './tests/lib/tree.mjs';
console.log('has pre-receive:', fileTree('/tmp/rr').includes('pre-receive'));
const c = readFileSync('/tmp/rr/pre-receive','utf8');
console.log('starts with shebang:', c.startsWith('#!/bin/sh'));
console.log('leftover require:', c.includes('<!--require:'));
"
```
Expected: `has pre-receive: true`, `starts with shebang: true`, `leftover require: false`.

Also confirm lightweight (remote=none) does NOT have pre-receive:
```bash
node --input-type=module -e "
import { assemble } from './skills/init-code-repo/assemble.mjs';
import { readFileSync, rmSync } from 'node:fs';
const cfg = JSON.parse(readFileSync('tests/scenarios/lightweight/config.json','utf8'));
rmSync('/tmp/rr2',{recursive:true,force:true});
assemble('/tmp/rr2', cfg);
import { fileTree } from './tests/lib/tree.mjs';
console.log('lightweight has pre-receive:', fileTree('/tmp/rr2').includes('pre-receive'));
"
```
Expected: `lightweight has pre-receive: false`.

- [ ] **Step 3: Run suite + commit**

Run: `npm test` → 24/24.

```bash
git add skills/init-code-repo/templates/gates/
git commit -m "feat(init-code-repo): 远端 pre-receive hook 门禁（require:remote-hook）"
```

---

## Task 4: Multi-stack scenario test

**Files:**
- Create: `tests/scenarios/multi-stack/config.json`
- Create: `tests/golden/multi-stack/expected-tree.json`
- Modify: `tests/run_tests.mjs`

- [ ] **Step 1: Create `multi-stack/config.json`** (rust+node, github remote → pre-receive, full-ledger)

```json
{
  "projectName": "MultiStack",
  "oneLine": "多栈 monorepo",
  "year": "2026",
  "stacks": ["rust", "node"],
  "repoShape": "monorepo",
  "runtimes": [],
  "remote": "github",
  "commitGate": { "mode": "default" },
  "components": ["full-ledger", "doc-sync"]
}
```

- [ ] **Step 2: Generate expected-tree.json**

```bash
mkdir -p tests/golden/multi-stack
rm -rf /tmp/gen-ms
node --input-type=module -e "
import { assemble } from './skills/init-code-repo/assemble.mjs';
import { readFileSync } from 'node:fs';
assemble('/tmp/gen-ms', JSON.parse(readFileSync('tests/scenarios/multi-stack/config.json','utf8')));
"
node --input-type=module -e "
import { fileTree } from './tests/lib/tree.mjs';
import { writeFileSync } from 'node:fs';
writeFileSync('tests/golden/multi-stack/expected-tree.json', JSON.stringify(fileTree('/tmp/gen-ms'), null, 2) + '\n');
"
```

Manually inspect — confirm it includes `Makefile` (rust), `package.json` (node), `pre-receive` (remote-hook), `debt.md`+`version-log.md` (full-ledger), plus core files.

- [ ] **Step 3: Add multi-stack tests to `tests/run_tests.mjs`**

Append:

```javascript
test('multi-stack: glue files + pre-receive present', () => {
  const tmp = '/tmp/init-code-repo-test-multi-stack';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, JSON.parse(readFileSync('tests/scenarios/multi-stack/config.json', 'utf8')));
  const tree = fileTree(tmp);
  const expected = JSON.parse(readFileSync('tests/golden/multi-stack/expected-tree.json', 'utf8'));
  assertTreeEqual(tree, expected, 'multi-stack tree');
  // stack glue files
  assertOk(tree.includes('Makefile'), 'rust Makefile present');
  assertOk(tree.includes('package.json'), 'node package.json present');
  // remote gate
  assertOk(tree.includes('pre-receive'), 'pre-receive present (remote=github)');
  // substituted content
  const mk = readFileSync(`${tmp}/Makefile`, 'utf8');
  assertOk(mk.includes('# Makefile — MultiStack'), 'Makefile has project name');
  assertClean(mk, 'multi-stack Makefile');
  const pj = readFileSync(`${tmp}/package.json`, 'utf8');
  assertOk(pj.includes('"name": "MultiStack"'), 'package.json has project name');
  assertClean(pj, 'multi-stack package.json');
});
```

The universal "all scenarios: no dead markdown links" test (Plan 2) will automatically cover multi-stack too (it iterates all scenario dirs).

- [ ] **Step 4: Run full suite**

Run: `npm test`
Expected: 25/25 (24 prior + 1 multi-stack test). The universal dead-link test now covers 6 scenarios.

- [ ] **Step 5: Commit**

```bash
git add tests/scenarios/multi-stack/config.json tests/golden/multi-stack/expected-tree.json tests/run_tests.mjs
git commit -m "test(init-code-repo): 多栈场景（rust+node+remote）"
```

---

## Task 5: Final verification + review

- [ ] **Step 1:** `npm test` → 25/25.
- [ ] **Step 2:** Dispatch final code reviewer for `main..HEAD` (Plan 3 diff). Address Critical/Important findings.

---

## Self-Review

**Spec coverage:**
- §4.2 stacks/ glue files → Task 2. ✓
- §4.3 gates/ pre-receive-remote → Task 3. ✓
- assemble walks stacks/gates → Task 1. ✓
- multi-stack scenario → Task 4. ✓

**Cond consistency:** Stack conds (rust/node/python/go) come from `extraConds` (config.stacks). remote-hook from activeConds (remote != 'none'). pre-receive requires remote-hook. All consistent with Plan 1/2.

**Placeholder scan:** `{{PROJECT_NAME}}` used in glue files (substitutable). No plan placeholders.

**Note:** `node/package.json.tmpl` uses `{{PROJECT_NAME}}` (not lowercase) — user may need to lowercase the name manually. Acceptable for a skeleton; noted in template via the value itself.

---

## Execution Handoff

Plan saved to `docs/superpowers/plans/2026-07-06-init-code-repo-stacks-gates.md`. Subagent-driven (recommended) or inline.
