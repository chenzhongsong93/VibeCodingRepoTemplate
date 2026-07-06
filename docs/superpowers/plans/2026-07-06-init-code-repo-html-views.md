# init-code-repo Plan B: HTML 视图（docs-site + design-views）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** 加两个 HTML 相关可选组件：`docs-site`（VitePress 生成站）+ `design-views`（手写 HTML 视觉资产）。dead-link 检查扩展扫描 `.html`。

**Architecture:** markdown 持续为 SSOT；HTML 是视图/资产（非 SSOT）。docs-site 用 VitePress 把 `docs/` 渲染成静态站（维护者侧 `npx vitepress build`）。design-views 放手写 HTML 视觉页。dead-link 检查扩展扫 `.html` 内 `<a href>`。

**Tech Stack:** Node.js 22（维护者侧 VitePress 构建），ESM。
**Prerequisite:** Plan A 合并 main（32/32 测试）。

---

## Task 1: docs-site 组件（VitePress 配置）

**Files:**
- Create: `skills/init-code-repo/templates/core/docs/.vitepress/config.ts.tmpl`
- Modify: `skills/init-code-repo/templates/core/AGENTS.md.tmpl`
- Modify: `skills/init-code-repo/SKILL.md`

- [ ] **Step 1: Create `.vitepress/config.ts.tmpl`** (require:docs-site)

```typescript
<!--require:docs-site-->
// VitePress 配置 — 把 docs/ 渲染成静态 HTML 站点。
// 构建：npx vitepress build docs（需 Node.js；产物在 docs/.vitepress/dist，非 SSOT，不进 git）
// 本地预览：npx vitepress dev docs
import { defineConfig } from 'vitepress';

export default defineConfig({
  title: '{{PROJECT_NAME}}',
  description: '{{ONE_LINE}}',
  srcDir: '.',
  base: '/',
  lang: 'zh-CN',
  markdown: { lineNumbers: true },
  nav: [
    { text: '章程', link: '/00-charter/readme' },
    { text: '设计', link: '/02-design/system-architecture' },
    { text: '规则', link: '/rules/dev-workflow-rules' },
  ],
  sidebar: {
    '/': [
      { text: '顶层', items: [{ text: 'ROADMAP', link: '/ROADMAP' }, { text: 'HANDOVER', link: '/HANDOVER' }] },
      { text: '章程', items: [{ text: '概念', link: '/00-charter/concept' }] },
      { text: '设计', items: [
        { text: '系统架构', link: '/02-design/system-architecture' },
        { text: '北极星', link: '/02-design/north-star' },
        { text: '文档治理', link: '/02-design/doc-governance' },
      ]},
      { text: '规则', items: [
        { text: '研发流程', link: '/rules/dev-workflow-rules' },
        { text: '提交规范', link: '/rules/commit-rules' },
        { text: 'SSOT 治理', link: '/rules/doc-ssot-rules' },
      ]},
    ],
  },
});
```

- [ ] **Step 2: Add docs-site index row to AGENTS.md.tmpl**

In the rule-index table, after the `<!--IF:api-docs-->` row block, add:
```
<!--IF:docs-site-->
| 文档站点 | `docs/.vitepress/config.ts`（npx vitepress build 构建 HTML 站） |
<!--/IF:docs-site-->
```

- [ ] **Step 3: Add docs-site to SKILL.md 可选组件表**

Add row:
```
| 文档站点（HTML 生成站） | docs-site | docs/.vitepress/config.ts | 维护者侧 npx vitepress build 生成 HTML 站，markdown 为源 |
```

- [ ] **Step 4: Verify + run suite + commit**

```bash
node --input-type=module -e "
import { assemble } from './skills/init-code-repo/assemble.mjs';
import { readFileSync, rmSync } from 'node:fs';
const cfg = { projectName:'D', oneLine:'L', year:'2026', stacks:[], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:['docs-site'] };
rmSync('/tmp/ds',{recursive:true,force:true});
assemble('/tmp/ds', cfg);
import { fileTree } from './tests/lib/tree.mjs';
console.log('has vitepress config:', fileTree('/tmp/ds').includes('docs/.vitepress/config.ts'));
const c = readFileSync('/tmp/ds/docs/.vitepress/config.ts','utf8');
console.log('title substituted:', c.includes(\"title: 'D'\"));
console.log('leftover require:', c.includes('<!--require:'));
"
```
Expected: all true (leftover false). `npm test` → 32/32.

```bash
git add skills/init-code-repo/templates/core/docs/.vitepress/config.ts.tmpl skills/init-code-repo/templates/core/AGENTS.md.tmpl skills/init-code-repo/SKILL.md
git commit -m "feat(init-code-repo): docs-site 组件（VitePress 配置）"
```

---

## Task 2: design-views 组件 + doc-governance HTML 非 SSOT 标注

**Files:**
- Create: `skills/init-code-repo/templates/core/docs/02-design/views/README.md.tmpl`
- Modify: `skills/init-code-repo/templates/core/docs/02-design/doc-governance.md.tmpl`
- Modify: `skills/init-code-repo/templates/core/AGENTS.md.tmpl`
- Modify: `skills/init-code-repo/SKILL.md`

- [ ] **Step 1: Create `views/README.md.tmpl`** (require:design-views)

IMPORTANT: the example reference must be inline code (not a markdown link), else it self-dead-links.

```
<!--require:design-views-->
# 设计视觉资产（views/）

本目录放手写 HTML 视觉页：交互式架构图、UI mockup、SVG 流程图等 markdown/Mermaid 表达不了的视觉资产。

## 性质：非 SSOT
本目录 HTML 文件是**视觉资产，非 SSOT**。文字 SSOT 在对应 markdown 文档（如 `system-architecture.md`）；HTML 是视觉补充。冲突时以 markdown 为准。

## 用法
从 markdown 文档链接引用，如：详见 `views/architecture.html`（写成 markdown 链接 `[架构图](views/architecture.html)` 引用本目录文件）。
```

- [ ] **Step 2: Add HTML 非 SSOT 段 to doc-governance.md.tmpl**

Before "## 设计图优先级", insert:
```
## HTML 视图（非 SSOT）
<!--IF:docs-site-->- `docs/.vitepress/` 生成的 HTML 站是**视图**（markdown 为源），产物不进 git。<!--/IF:docs-site-->
<!--IF:design-views-->- `docs/02-design/views/*.html` 手写视觉资产是**非 SSOT**（文字 SSOT 在 markdown），冲突以 markdown 为准。<!--/IF:design-views-->
```

- [ ] **Step 3: Add design-views index row to AGENTS.md.tmpl**

After the `<!--IF:docs-site-->` row, add:
```
<!--IF:design-views-->
| 设计视觉资产 | [docs/02-design/views/](docs/02-design/views/)（手写 HTML，非 SSOT） |
<!--/IF:design-views-->
```

- [ ] **Step 4: Add design-views to SKILL.md 可选组件表**

```
| 设计视觉资产（手写 HTML） | design-views | docs/02-design/views/ | HTML 非 SSOT，冲突以 markdown 为准 |
```

- [ ] **Step 5: Verify + run suite + commit**

```bash
node --input-type=module -e "
import { assemble } from './skills/init-code-repo/assemble.mjs';
import { readFileSync, rmSync } from 'node:fs';
const cfg = { projectName:'D', oneLine:'L', year:'2026', stacks:[], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:['design-views','docs-site'] };
rmSync('/tmp/dv',{recursive:true,force:true});
assemble('/tmp/dv', cfg);
import { fileTree } from './tests/lib/tree.mjs';
console.log('has views/README:', fileTree('/tmp/dv').includes('docs/02-design/views/README.md'));
const dg = readFileSync('/tmp/dv/docs/02-design/doc-governance.md','utf8');
console.log('governance has HTML 非 SSOT 段:', dg.includes('HTML 视图（非 SSOT）'));
console.log('governance leftover markers:', /<!--IF:|<!--\/IF:/.test(dg));
"
```
Expected: all true (leftover false). `npm test` → 32/32 (existing scenarios don't select these components; doc-governance content change doesn't break tree test; cleanliness holds).

```bash
git add skills/init-code-repo/templates/core/docs/02-design/views/ skills/init-code-repo/templates/core/docs/02-design/doc-governance.md.tmpl skills/init-code-repo/templates/core/AGENTS.md.tmpl skills/init-code-repo/SKILL.md
git commit -m "feat(init-code-repo): design-views 组件 + doc-governance HTML 非 SSOT 标注"
```

---

## Task 3: dead-link 检查扩展扫描 .html（用 matchAll，避开 .exec 误报）

**Files:**
- Modify: `tests/lib/links.mjs`

- [ ] **Step 1: Replace links.mjs with .html-aware version**

```javascript
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const MD_LINK_RE = /\[[^\]]*\]\(([^)]+)\)/g;
const HTML_LINK_RE = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;

// Collect dead markdown + HTML links in a generated dir.
// Returns array of { file, link, target } for links whose target does not exist.
// Ignores external (http/https/mailto) and anchor-only (#) links.
export function deadLinks(rootDir) {
  const dead = [];
  for (const file of listLinkFiles(rootDir)) {
    const rel = file.slice(rootDir.length + 1).replace(/\\/g, '/');
    const text = readFileSync(file, 'utf8');
    const targets = new Set();
    const re = rel.endsWith('.html') ? HTML_LINK_RE : MD_LINK_RE;
    for (const m of text.matchAll(re)) targets.add(m[1]);
    for (const target of targets) {
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      const cleanTarget = target.split('#')[0].split('?')[0];
      if (!cleanTarget) continue;
      const abs = resolve(dirname(file), cleanTarget);
      if (!existsSync(abs)) dead.push({ file: rel, link: target, target: cleanTarget });
    }
  }
  return dead;
}

function listLinkFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) listLinkFiles(full, out);
    else if (entry.name.endsWith('.md') || entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}
```

- [ ] **Step 2: Sanity + suite + commit**

```bash
node -e "import('./tests/lib/links.mjs').then(m=>console.log(typeof m.deadLinks))"
```
Expected: function. `npm test` → 32/32 (existing scenarios have no .html).

```bash
git add tests/lib/links.mjs
git commit -m "test(init-code-repo): 死链检查扩展扫描 .html 文件"
```

---

## Task 4: html-views 场景 + .html 死链单测

**Files:**
- Create: `tests/scenarios/html-views/config.json`
- Create: `tests/golden/html-views/expected-tree.json`
- Modify: `tests/run_tests.mjs`

- [ ] **Step 1: Create `html-views/config.json`**

```json
{
  "projectName": "HtmlViews",
  "oneLine": "带 HTML 视图的项目",
  "year": "2026",
  "stacks": [],
  "repoShape": "single",
  "runtimes": [],
  "remote": "none",
  "commitGate": { "mode": "default" },
  "components": ["docs-site", "design-views", "product-docs"]
}
```

- [ ] **Step 2: Generate expected-tree.json**

```bash
mkdir -p tests/golden/html-views
rm -rf /tmp/gen-hv
node --input-type=module -e "
import { assemble } from './skills/init-code-repo/assemble.mjs';
import { readFileSync } from 'node:fs';
assemble('/tmp/gen-hv', JSON.parse(readFileSync('tests/scenarios/html-views/config.json','utf8')));
"
node --input-type=module -e "
import { fileTree } from './tests/lib/tree.mjs';
import { writeFileSync } from 'node:fs';
writeFileSync('tests/golden/html-views/expected-tree.json', JSON.stringify(fileTree('/tmp/gen-hv'), null, 2) + '\n');
"
```
Inspect: includes `docs/.vitepress/config.ts` + `docs/02-design/views/README.md` + product-docs files (charter, north-star, system-architecture, etc.).

- [ ] **Step 3: Add tests to `tests/run_tests.mjs`**

Ensure `mkdirSync, writeFileSync` are in the `node:fs` import (add if missing). `deadLinks` already imported. Append:

```javascript
test('html-views: tree + content', () => {
  const tmp = '/tmp/init-code-repo-test-html-views';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, JSON.parse(readFileSync('tests/scenarios/html-views/config.json', 'utf8')));
  const tree = fileTree(tmp);
  const expected = JSON.parse(readFileSync('tests/golden/html-views/expected-tree.json', 'utf8'));
  assertTreeEqual(tree, expected, 'html-views tree');
  assertOk(tree.includes('docs/.vitepress/config.ts'), 'vitepress config present');
  assertOk(tree.includes('docs/02-design/views/README.md'), 'views README present');
  const c = readFileSync(`${tmp}/docs/.vitepress/config.ts`, 'utf8');
  assertOk(c.includes(\"title: 'HtmlViews'\"), 'vitepress title substituted');
  assertClean(c, 'vitepress config');
  const dg = readFileSync(`${tmp}/docs/02-design/doc-governance.md`, 'utf8');
  assertOk(dg.includes('HTML 视图（非 SSOT）'), 'governance has HTML section');
  assertClean(dg, 'governance');
});

test('deadLinks: scans .html <a href>', () => {
  const tmp = '/tmp/init-code-repo-test-html-deadlink';
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(`${tmp}/docs`, { recursive: true });
  writeFileSync(`${tmp}/docs/page.html`,
    '<a href="good.html">good</a> <a href="missing.html">missing</a> <a href="https://ext.com">ext</a> <a href="#anchor">anchor</a>');
  writeFileSync(`${tmp}/docs/good.html`, '<p>exists</p>');
  const dead = deadLinks(tmp);
  assertOk(dead.some(d => d.target === 'missing.html'), 'missing.html flagged');
  assertOk(!dead.some(d => d.target === 'good.html'), 'good.html not flagged');
  assertOk(!dead.some(d => d.link.startsWith('https://') || d.link.startsWith('#')), 'ext/anchor ignored');
});
```

- [ ] **Step 4: Run full suite**

`npm test` → 32 + 2 = 34. The universal dead-link test covers html-views scenario (views/README.md uses inline code for the example, no dead link). Confirm.

- [ ] **Step 5: Commit**

```bash
git add tests/scenarios/html-views/config.json tests/golden/html-views/expected-tree.json tests/run_tests.mjs
git commit -m "test(init-code-repo): html-views 场景 + .html 死链单测"
```

---

## Task 5: Final verification + review

- [ ] `npm test` → 34/34.
- [ ] Dispatch final reviewer for Plan B diff.

---

## Self-Review

**Spec coverage:** §4 HTML 视图 → Tasks 1,2. dead-link .html → Task 3. ✓
**Note:** views/README.md example uses inline code (not markdown link) to avoid self-dead-link. links.mjs uses `matchAll` (not `.exec()`) to avoid security-hook false positive AND be cleaner.
**Security:** VitePress config is static TS; links.mjs uses regex matchAll, no child_process.

---

## Execution Handoff

Plan saved. Subagent-driven or inline.
