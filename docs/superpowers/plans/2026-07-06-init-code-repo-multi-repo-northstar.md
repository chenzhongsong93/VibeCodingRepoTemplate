# init-code-repo Plan A: 多仓模式 + 北极星拆分 + 模板修正

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement task-by-task.

**Goal:** 加多仓组织模式（三档角色：单仓/组件仓/中央 docs 仓）+ 北极星拆分（独立 north-star.md，SADS 降桥梁层）+ 六层模型修正。

**Architecture:** 引擎扩展 `extraConds` 加 `multi-repo-component`/`central-docs` cond（按 `repoRole`）。`repoRole=central-docs` 时额外 walk `templates/central-docs/` overlay。AGENTS.md/guardrails 用 `<!--IF:central-docs-->`/`<!--IF:multi-repo-component-->` 条件段处理角色差异。component.yaml 在 core/ 下 `<!--require:multi-repo-component-->`。

**Tech Stack:** Node.js 22，ESM，零依赖。
**Prerequisite:** init-code-repo v1 已合并 main（28/28 测试）。

---

## Task 1: 北极星拆分 — north-star.md + 六层模型修正

**Files:**
- Create: `skills/init-code-repo/templates/core/docs/02-design/north-star.md.tmpl`
- Modify: `skills/init-code-repo/templates/core/AGENTS.md.tmpl`

- [ ] **Step 1: Create `north-star.md.tmpl`** (require:product-docs)

```
<!--require:product-docs-->
# 北极星 — 技术能力终点

> 目标层（北极星）：本产品最终要达到的技术能力终点。**永不废弃**，允许领先于现实。
> 与 [system-architecture.md](system-architecture.md)（桥梁层：当前架构设计）区分：本文件描述"要去哪"，SADS 描述"现在怎么走向那"。

## 终态愿景
（TODO/fill：技术能力终点的 aspirational 描述。从一句话定位与 charter 推导。）

## 不变量（永不废弃的核心承诺）
（TODO/fill：无论怎么演进都不放弃的核心能力/约束。）

## 允许领先现实的部分
（TODO/fill：当前未实现但已写入终态的部分。标注"领先现实"。）
```

- [ ] **Step 2: Fix AGENTS.md.tmpl six-layer section**

In `AGENTS.md.tmpl`, find the `<!--IF:product-docs-->` 六层真理源模型 table. It currently maps:
```
| 目标层 | `02-design/system-architecture.md` | 技术能力终点 |
| 现实层 | 实测代码 | 当前所在，以实测为准 |
| 桥梁层 | `HANDOVER.md` + `02-design/` | 如何从现实走向目标 |
```
Replace the 目标层 and 桥梁层 rows with:
```
| 目标层（北极星）| `02-design/north-star.md` | 技术能力终点，永不废弃·允许领先现实 |
| 现实层 | 实测代码 | 当前所在，以实测为准 |
| 桥梁层 | `02-design/system-architecture.md` + `HANDOVER.md` | 当前架构设计 + 交接，如何走向目标 |
```

- [ ] **Step 3: Verify**

```bash
node --input-type=module -e "
import { assemble } from './skills/init-code-repo/assemble.mjs';
import { readFileSync, rmSync } from 'node:fs';
const cfg = { projectName:'P', oneLine:'L', year:'2026', stacks:[], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:['product-docs'] };
rmSync('/tmp/ns',{recursive:true,force:true});
assemble('/tmp/ns', cfg);
import { fileTree } from './tests/lib/tree.mjs';
console.log('has north-star:', fileTree('/tmp/ns').includes('docs/02-design/north-star.md'));
const a = readFileSync('/tmp/ns/AGENTS.md','utf8');
console.log('AGENTS 目标层 maps to north-star:', a.includes('north-star.md'));
console.log('leftover markers:', /<!--IF:|<!--\/IF:/.test(a));
"
```
Expected: has north-star: true; AGENTS maps to north-star: true; leftover markers: false.

- [ ] **Step 4: Run suite + regenerate full-product golden**

`npm test` — full-product golden stale (adds north-star.md). Regenerate:
```bash
rm -rf /tmp/regen-fp
node --input-type=module -e "
import { assemble } from './skills/init-code-repo/assemble.mjs';
import { readFileSync } from 'node:fs';
assemble('/tmp/regen-fp', JSON.parse(readFileSync('tests/scenarios/full-product/config.json','utf8')));
"
node --input-type=module -e "
import { fileTree } from './tests/lib/tree.mjs';
import { writeFileSync } from 'node:fs';
writeFileSync('tests/golden/full-product/expected-tree.json', JSON.stringify(fileTree('/tmp/regen-fp'), null, 2) + '\n');
"
```
Inspect: full-product now includes `docs/02-design/north-star.md`. Re-run `npm test` → all green.

- [ ] **Step 5: Commit**

```bash
git add skills/init-code-repo/templates/core/docs/02-design/north-star.md.tmpl skills/init-code-repo/templates/core/AGENTS.md.tmpl tests/golden/full-product/expected-tree.json
git commit -m "feat(init-code-repo): 北极星拆分（north-star.md 独立，SADS 降桥梁层）"
```

---

## Task 2: 多仓组件仓 — component.yaml + AGENTS 跨仓段 + 引擎 cond

**Files:**
- Create: `skills/init-code-repo/templates/core/doc/component.yaml.tmpl`
- Modify: `skills/init-code-repo/templates/core/AGENTS.md.tmpl`
- Modify: `skills/init-code-repo/assemble.mjs`

- [ ] **Step 1: Create `doc/component.yaml.tmpl`** (require:multi-repo-component)

Path is `doc/` (not `docs/`), matching BaiWang convention.

```
<!--require:multi-repo-component-->
# component.yaml — 本组件仓的自描述清单，供中央 docs 仓聚合
# 修改后须通知中央 docs 仓刷新（或中央仓 aggregate 脚本自动拉取）。
name: {{PROJECT_NAME}}
type: self              # self / fork / upstream
one-line: {{ONE_LINE}}
repo: ""                # TODO: 填本仓 repo URL（agent 阶段 4 跑 `git remote get-url origin`）
layer: ""               # 所属架构层（按本组织分层约定，如 L3）
depends-on: []          # 依赖的其他组件 name 列表
exposes: []             # 对外暴露接口，如 [{kind: http, path: /api/v1/...}, {kind: mcp, name: ...}]
consumes: []            # 消费的其他组件接口，如 [{from: <name>, kind: http, path: /api/...}]
single-repo-docs:
  charter: docs/00-charter/
  architecture: docs/02-design/system-architecture.md
  deploy: infra/docker/
```

- [ ] **Step 2: Add cross-repo section to AGENTS.md.tmpl**

At the TOP of AGENTS.md.tmpl (after the title block, before "## 项目一句话"), add:

```
<!--IF:multi-repo-component-->
## 跨仓文档

本仓是多仓组织的组件仓。跨仓文档（架构总图/ADR/契约/总部署）见中央 docs 仓。
改本仓 `doc/component.yaml` 后，须通知中央 docs 仓刷新（或中央仓 aggregate 脚本自动拉取）。

<!--/IF:multi-repo-component-->
```

- [ ] **Step 3: Extend assemble.mjs extraConds for repoRole**

In `assemble.mjs` `extraConds`, add before `return conds`:
```javascript
  if (config.repoRole === 'component') conds.push('multi-repo-component');
  if (config.repoRole === 'central-docs') conds.push('central-docs');
```

- [ ] **Step 4: Verify component role**

```bash
node --input-type=module -e "
import { assemble } from './skills/init-code-repo/assemble.mjs';
import { readFileSync, rmSync } from 'node:fs';
const cfg = { projectName:'comp', oneLine:'L', year:'2026', stacks:[], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:[], repoRole:'component' };
rmSync('/tmp/cr',{recursive:true,force:true});
assemble('/tmp/cr', cfg);
import { fileTree } from './tests/lib/tree.mjs';
console.log('has doc/component.yaml:', fileTree('/tmp/cr').includes('doc/component.yaml'));
const a = readFileSync('/tmp/cr/AGENTS.md','utf8');
console.log('AGENTS has 跨仓文档段:', a.includes('## 跨仓文档'));
console.log('leftover markers:', /<!--IF:|<!--\/IF:/.test(a));
"
```
Expected: all true (leftover false). Confirm lightweight (no repoRole) does NOT have component.yaml or 跨仓段.

- [ ] **Step 5: Run suite + commit**

`npm test` → existing count (no regression; existing scenarios have no repoRole).

```bash
git add skills/init-code-repo/templates/core/doc/component.yaml.tmpl skills/init-code-repo/templates/core/AGENTS.md.tmpl skills/init-code-repo/assemble.mjs
git commit -m "feat(init-code-repo): 多仓组件仓（component.yaml + AGENTS 跨仓段 + repoRole cond）"
```

---

## Task 3: 中央 docs 仓 — registry + aggregate 脚本 + 跨仓视图模板

**Files:**
- Create: `skills/init-code-repo/templates/central-docs/docs/components/registry.yaml.tmpl`
- Create: `skills/init-code-repo/templates/central-docs/scripts/aggregate.mjs.tmpl`
- Create: `skills/init-code-repo/templates/central-docs/docs/adr/.gitkeep`
- Create: `skills/init-code-repo/templates/central-docs/docs/deployment-overview.md.tmpl`
- Create: `skills/init-code-repo/templates/central-docs/docs/architecture-overview.md.tmpl`
- Modify: `skills/init-code-repo/assemble.mjs` — walk central-docs overlay when repoRole=central-docs
- Modify: `skills/init-code-repo/templates/core/AGENTS.md.tmpl` — add `<!--IF:central-docs-->` 段

- [ ] **Step 1: Create `central-docs/docs/components/registry.yaml.tmpl`**

```
<!--require:central-docs-->
# registry.yaml — 中央 docs 仓的组件注册表（手工维护）
# 列出本组织所有组件仓的 repo URL。aggregate 脚本据此 clone 各仓、读其 doc/component.yaml、
# 聚合生成 architecture-overview.md 与 contracts 矩阵。
# 新增组件仓时在此追加一条；删除组件仓时移除对应条目。
components:
  # - name: <component-name>          # 与组件仓 component.yaml 的 name 一致
  #   repo: <repo-url>
  #   branch: main
```

- [ ] **Step 2: Create `central-docs/scripts/aggregate.mjs.tmpl`**

Uses `execFileSync` (safe, no shell) for git clone. Content:

```javascript
<!--require:central-docs-->
// aggregate.mjs — 中央 docs 仓聚合脚本
// 读 docs/components/registry.yaml → 浅克隆各仓 → 读各仓 doc/component.yaml →
// 生成 docs/architecture-overview.md（Mermaid 图按 layer 分组）+ contracts 矩阵。
// 运行：node scripts/aggregate.mjs（需 git 凭证访问私有仓；公开仓无需）
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const REGISTRY = join(ROOT, 'docs/components/registry.yaml');
const TMP = '/tmp/central-docs-aggregate';

function parseRegistry(text) {
  // 极简 YAML 解析（避免依赖）；仅识别 name/repo/branch 列表项
  const comps = [];
  let cur = null;
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*-\s+name:\s*(.+)$/);
    if (m) { cur = { name: m[1].trim() }; comps.push(cur); continue; }
    const r = line.match(/^\s*repo:\s*(.+)$/); if (r && cur) cur.repo = r[1].trim();
    const b = line.match(/^\s*branch:\s*(.+)$/); if (b && cur) cur.branch = b[1].trim();
  }
  return comps.filter(c => c.name && c.repo);
}

function cloneShallow(comp) {
  const dir = join(TMP, comp.name);
  rmSync(dir, { recursive: true, force: true });
  const branch = comp.branch || 'main';
  // execFileSync: no shell, args as array — safe against injection
  execFileSync('git', ['clone', '--depth', '1', '--branch', branch, comp.repo, dir], { stdio: 'pipe' });
  return dir;
}

function readComponentYaml(dir) {
  const p = join(dir, 'doc/component.yaml');
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf8');
}

function field(yaml, key) {
  const m = yaml.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return m ? m[1].trim() : '';
}

const registry = parseRegistry(readFileSync(REGISTRY, 'utf8'));
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

const comps = [];
for (const c of registry) {
  try {
    const dir = cloneShallow(c);
    const y = readComponentYaml(dir);
    if (y) comps.push({ name: c.name, layer: field(y, 'layer'), oneLine: field(y, 'one-line'), yaml: y });
  } catch (e) { console.error(`skip ${c.name}: ${e.message}`); }
}

let md = '# 架构总览（聚合生成，勿手改）\n\n> 由 scripts/aggregate.mjs 从各仓 doc/component.yaml 聚合。改组件改其 component.yaml，重跑本脚本。\n\n';
const byLayer = {};
for (const c of comps) { const l = c.layer || '未分层'; (byLayer[l] = byLayer[l] || []).push(c); }
md += '```mermaid\nflowchart TB\n';
for (const [layer, cs] of Object.entries(byLayer)) {
  md += `  subgraph ${layer.replace(/[^A-Za-z0-9]/g, '_')}["${layer}"]\n`;
  for (const c of cs) md += `    ${c.name.replace(/[^A-Za-z0-9]/g, '_')}["${c.name}<br/>${c.oneLine}"]\n`;
  md += '  end\n';
}
md += '```\n\n## 组件清单\n\n| 名称 | 层 | 一句话 |\n|---|---|---|\n';
for (const c of comps) md += `| ${c.name} | ${c.layer || '-'} | ${c.oneLine} |\n`;
writeFileSync(join(ROOT, 'docs/architecture-overview.md'), md);
console.log(`aggregated ${comps.length} components → docs/architecture-overview.md`);
rmSync(TMP, { recursive: true, force: true });
```

- [ ] **Step 3: Create `central-docs/docs/adr/.gitkeep`** (empty)

- [ ] **Step 4: Create `central-docs/docs/deployment-overview.md.tmpl`**

```
<!--require:central-docs-->
# 总部署指南

> 跨仓总部署。各组件仓的部署细节见其 `infra/` 或 `doc/deploy/`。

## 部署拓扑
（TODO/fill：组装各组件的总部署拓扑。Mermaid 部署图。）

## 组件启动顺序
（TODO/fill：依赖关系决定的启动顺序。）

## 环境变量
（TODO/fill：跨组件的环境变量，可从各组件 component.yaml 的 exposes/consumes 推导。）
```

- [ ] **Step 5: Create `central-docs/docs/architecture-overview.md.tmpl`** (placeholder; real one generated)

```
<!--require:central-docs-->
# 架构总览

> 占位。运行 `node scripts/aggregate.mjs` 后本文件被聚合内容覆盖（视图，非源，勿手改）。
```

- [ ] **Step 6: Extend assemble.mjs to walk central-docs overlay**

In `assemble.mjs`, after the `writeTree(join(root, 'core'), ...)` call, add:
```javascript
  if (config.repoRole === 'central-docs') {
    writeTree(join(root, 'central-docs'), targetDir, ctx, activeSet);
  }
```

- [ ] **Step 7: Add central-docs section to AGENTS.md.tmpl**

At the TOP of AGENTS.md.tmpl (alongside the multi-repo-component block), add:

```
<!--IF:central-docs-->
## 跨仓文档（中央 docs 仓）

本仓是多仓组织的中央 docs 仓。**视图非源**：架构总图/契约矩阵由 `scripts/aggregate.mjs` 从各组件仓 `doc/component.yaml` 聚合生成，不手工维护。
新增/删除组件仓 → 改 `docs/components/registry.yaml` → 重跑 `node scripts/aggregate.mjs`。

<!--/IF:central-docs-->
```

- [ ] **Step 8: Verify central-docs role**

```bash
node --input-type=module -e "
import { assemble } from './skills/init-code-repo/assemble.mjs';
import { readFileSync, rmSync } from 'node:fs';
const cfg = { projectName:'org-docs', oneLine:'L', year:'2026', stacks:[], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:[], repoRole:'central-docs' };
rmSync('/tmp/cd',{recursive:true,force:true});
assemble('/tmp/cd', cfg);
import { fileTree } from './tests/lib/tree.mjs';
const t = fileTree('/tmp/cd');
console.log('has registry:', t.includes('docs/components/registry.yaml'));
console.log('has aggregate.mjs:', t.includes('scripts/aggregate.mjs'));
console.log('has adr/.gitkeep:', t.includes('docs/adr/.gitkeep'));
console.log('has deployment-overview:', t.includes('docs/deployment-overview.md'));
const a = readFileSync('/tmp/cd/AGENTS.md','utf8');
console.log('AGENTS has 中央 docs 仓段:', a.includes('中央 docs 仓'));
console.log('leftover markers:', /<!--IF:|<!--\/IF:|<!--require:/.test(a));
const ag = readFileSync('/tmp/cd/scripts/aggregate.mjs','utf8');
console.log('aggregate.mjs leftover require:', ag.includes('<!--require:'));
"
```
Expected: all true (leftover false). Confirm single/component roles do NOT have central-docs files.

- [ ] **Step 9: Run suite + commit**

`npm test` → existing count (no new scenario; existing scenarios have no repoRole → goldens unchanged).

```bash
git add skills/init-code-repo/templates/central-docs/ skills/init-code-repo/assemble.mjs skills/init-code-repo/templates/core/AGENTS.md.tmpl
git commit -m "feat(init-code-repo): 中央 docs 仓（registry + aggregate 脚本 + 跨仓视图模板）"
```

---

## Task 4: SKILL.md 阶段 1 加仓角色问

**Files:**
- Modify: `skills/init-code-repo/SKILL.md`

- [ ] **Step 1: Add repoRole to 阶段 1 录取表**

In SKILL.md 阶段 1 表格, add a row after "仓形态":
```
| 仓角色 | 单仓 / 组件仓 / 中央 docs 仓 | 决定多仓模式：单仓=自包含；组件仓=带 component.yaml + 跨仓引用；中央 docs 仓=聚合脚本 + 跨仓视图 |
```
And add a note after the table: "选组件仓时追问中央 docs 仓 URL；选中央 docs 仓时追问初始组件仓列表（写入 registry.yaml）。"

- [ ] **Step 2: Commit**

```bash
git add skills/init-code-repo/SKILL.md
git commit -m "docs(init-code-repo): SKILL.md 阶段 1 加仓角色问"
```

---

## Task 5: 多仓场景测试

**Files:**
- Create: `tests/scenarios/component/config.json`
- Create: `tests/scenarios/central-docs/config.json`
- Create: `tests/golden/component/expected-tree.json`
- Create: `tests/golden/central-docs/expected-tree.json`
- Modify: `tests/run_tests.mjs`

- [ ] **Step 1: Create `component/config.json`**

```json
{
  "projectName": "comp-svc",
  "oneLine": "组件服务",
  "year": "2026",
  "stacks": ["node"],
  "repoShape": "single",
  "runtimes": [],
  "remote": "github",
  "commitGate": { "mode": "default" },
  "components": ["agent-conduct", "api-docs"],
  "repoRole": "component"
}
```

- [ ] **Step 2: Create `central-docs/config.json`**

```json
{
  "projectName": "org-docs",
  "oneLine": "中央 docs 仓",
  "year": "2026",
  "stacks": [],
  "repoShape": "single",
  "runtimes": [],
  "remote": "none",
  "commitGate": { "mode": "default" },
  "components": [],
  "repoRole": "central-docs"
}
```

- [ ] **Step 3: Generate expected-tree.json for both**

```bash
for s in component central-docs; do
  mkdir -p tests/golden/$s
  rm -rf /tmp/gen-$s
  node --input-type=module -e "
import { assemble } from './skills/init-code-repo/assemble.mjs';
import { readFileSync } from 'node:fs';
assemble('/tmp/gen-$s', JSON.parse(readFileSync('tests/scenarios/$s/config.json','utf8')));
"
  node --input-type=module -e "
import { fileTree } from './tests/lib/tree.mjs';
import { writeFileSync } from 'node:fs';
writeFileSync('tests/golden/$s/expected-tree.json', JSON.stringify(fileTree('/tmp/gen-$s'), null, 2) + '\n');
"
done
```

Inspect: component has `doc/component.yaml` + AGENTS 跨仓段 + node package.json; central-docs has `docs/components/registry.yaml` + `scripts/aggregate.mjs` + `docs/adr/.gitkeep` + `docs/deployment-overview.md` + `docs/architecture-overview.md`.

- [ ] **Step 4: Add tests to `tests/run_tests.mjs`**

Append:
```javascript
for (const name of ['component', 'central-docs']) {
  test(`${name}: file tree matches golden`, () => {
    const tmp = `/tmp/init-code-repo-test-${name}`;
    rmSync(tmp, { recursive: true, force: true });
    assemble(tmp, JSON.parse(readFileSync(`tests/scenarios/${name}/config.json`, 'utf8')));
    assertTreeEqual(fileTree(tmp), JSON.parse(readFileSync(`tests/golden/${name}/expected-tree.json`, 'utf8')), `${name} tree`);
  });

  test(`${name}: role-specific content`, () => {
    const tmp = `/tmp/init-code-repo-test-${name}-content`;
    rmSync(tmp, { recursive: true, force: true });
    assemble(tmp, JSON.parse(readFileSync(`tests/scenarios/${name}/config.json`, 'utf8')));
    const a = readFileSync(`${tmp}/AGENTS.md`, 'utf8');
    if (name === 'component') {
      assertOk(a.includes('## 跨仓文档'), 'component AGENTS has 跨仓段');
      assertOk(!a.includes('中央 docs 仓'), 'component AGENTS no central-docs段');
      const cy = readFileSync(`${tmp}/doc/component.yaml`, 'utf8');
      assertOk(cy.includes('name: comp-svc'), 'component.yaml has name');
      assertClean(cy, 'component.yaml');
    } else {
      assertOk(a.includes('中央 docs 仓'), 'central-docs AGENTS has central段');
      assertOk(readFileSync(`${tmp}/docs/components/registry.yaml`, 'utf8').includes('registry'), 'registry present');
      assertOk(readFileSync(`${tmp}/scripts/aggregate.mjs`, 'utf8').includes('aggregate'), 'aggregate.mjs present');
    }
    assertClean(a, `${name} AGENTS`);
  });
}
```

The universal dead-link test auto-covers these scenarios.

- [ ] **Step 5: Run full suite**

`npm test` → existing + 4 new. Confirm dead-link test passes for both.

- [ ] **Step 6: Commit**

```bash
git add tests/scenarios/component/config.json tests/scenarios/central-docs/config.json tests/golden/component/expected-tree.json tests/golden/central-docs/expected-tree.json tests/run_tests.mjs
git commit -m "test(init-code-repo): 多仓场景测试（组件仓 + 中央 docs 仓）"
```

---

## Task 6: Final verification + review

- [ ] `npm test` → all green.
- [ ] Dispatch final code reviewer for Plan A diff. Verify: north-star 目标层, SADS 桥梁层; component.yaml + 跨仓段 for component role; central-docs overlay; no regression.

---

## Self-Review

**Spec coverage:** §3 多仓模式 → Tasks 2,3,4,5. §5 北极星 → Task 1. ✓
**Cond consistency:** multi-repo-component, central-docs from repoRole via extraConds. product-docs (north-star) from components. ✓
**Security:** aggregate.mjs uses `execFileSync('git', [...args])` (no shell, args array) — safe against injection; passed the security hook.

---

## Execution Handoff

Plan saved to `docs/superpowers/plans/2026-07-06-init-code-repo-multi-repo-northstar.md`. Subagent-driven (recommended) or inline.
