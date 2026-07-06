# init-code-repo Plan C: 起草非留白 + 完整性门控 + fill-design-doc skill

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** (1) SKILL.md 阶段 4 从"指 TODO"改"起草初稿"；(2) 完整性门控（design-completeness-rules + check-completeness.mjs 预言机 + dev-workflow 第 8 步阻断）；(3) 独立 fill-design-doc skill；(4) 阶段 5 末尾主动引导调用 fill-design-doc。

**Architecture:** 起草与 fill 是 agent 行为（SKILL.md 指令）；完整性门控双路径（agent 扫描 + check-completeness.mjs 预言机，同 logic）。fill-design-doc 是独立 skill，与 init-code-repo 同级。

**Tech Stack:** Node.js 22（check-completeness.mjs 预言机），ESM。
**Prerequisite:** Plan B 合并 main（34/34 测试）。

---

## Task 1: design-completeness-rules.md（完整性门控规则）

**Files:**
- Create: `skills/init-code-repo/templates/core/docs/rules/design-completeness-rules.md.tmpl`
- Modify: `skills/init-code-repo/templates/core/AGENTS.md.tmpl`
- Modify: `skills/init-code-repo/templates/core/docs/rules/dev-workflow-rules.md.tmpl`

- [ ] **Step 1: Create `design-completeness-rules.md.tmpl`** (core 必带，无 require)

```markdown
# 设计完整性门控规则

> 发布前必填设计文档的门控。与 [dev-workflow-rules.md](dev-workflow-rules.md) 第 8 步配合：本文件定映射与扫描规则，那一份定流程位置。

## 阶段门→必填文档映射（默认，可在 ROADMAP.md 覆盖）

| 阶段门 | 必填（非 TODO）设计文档 |
|---|---|
| P0 | `00-charter/concept.md`、`00-charter/guardrails.md`、`00-charter/vision-strategy.md`、`02-design/north-star.md`、`ROADMAP.md` |
| P1 | + `02-design/system-architecture.md`、`02-design/entity-model.md`、`02-design/api/api-reference.md` |
| P2 | + `02-design/ui-design/README.md`、`02-design/test-spec/README.md`（完整三层） |
| P3 | + ADR 审视、`ledger/debt.md` 收口 |

> 未选某可选组件时，其对应的必填文档跳过（如未选 product-docs，charter/north-star 不要求）。

## TODO 残留扫描

- 扫描必填文档内的 `（TODO: ...）` 与 `（TODO/fill：...）` 残留。
- 扫描"空节"：节标题下仅有占位文本无实质内容。
- 任一必填文档有 TODO 残留/空节 → 当前阶段门门控失败 → 阻断发布。

## 检查机制（双路径）

- **agent 路径**（SKILL.md 阶段 5 + dev-workflow 第 8 步）：agent 读 HANDOVER.md 顶部"当前阶段门" → 查映射 → 扫描必填文档 → 列未填项 → 阻断或放行。
- **引擎路径**（维护者预言机）：`node scripts/check-completeness.mjs --stage <P0|P1|...>`，同逻辑，golden 测试覆盖。

## 阶段门当前值

从 `HANDOVER.md` 顶部"当前阶段门"读取（与 `ROADMAP.md` 配对）。无值视为 P0。
```

- [ ] **Step 2: Add index row to AGENTS.md.tmpl**

In the rule-index table, after the SSOT/文档治理 row, add (no conditional — core必带):
```
| 设计完整性门控 | [docs/rules/design-completeness-rules.md](docs/rules/design-completeness-rules.md) |
```

- [ ] **Step 3: Update dev-workflow-rules.md.tmpl 发布门控 step**

The发布门控 step (both the full-workflow ELSE branch step 6 and the full-workflow branch step 8) currently ends with "SSOT 一致性检查。". Append to each:
```
、**设计完整性门控**（按 [design-completeness-rules.md](design-completeness-rules.md) 扫当前阶段门必填文档的 TODO 残留，有残留=阻断）
```

- [ ] **Step 4: Verify + regenerate ALL goldens + run suite**

```bash
node --input-type=module -e "
import { assemble } from './skills/init-code-repo/assemble.mjs';
import { readFileSync, rmSync } from 'node:fs';
const cfg = JSON.parse(readFileSync('tests/scenarios/lightweight/config.json','utf8'));
rmSync('/tmp/dc',{recursive:true,force:true});
assemble('/tmp/dc', cfg);
import { fileTree } from './tests/lib/tree.mjs';
console.log('has design-completeness-rules:', fileTree('/tmp/dc').includes('docs/rules/design-completeness-rules.md'));
const a = readFileSync('/tmp/dc/AGENTS.md','utf8');
console.log('AGENTS has 完整性门控 row:', a.includes('design-completeness-rules.md'));
const dw = readFileSync('/tmp/dc/docs/rules/dev-workflow-rules.md','utf8');
console.log('dev-workflow has 完整性门控 clause:', dw.includes('设计完整性门控'));
"
```

The new core file `design-completeness-rules.md` appears in ALL scenarios. Regenerate ALL goldens + lightweight AGENTS snapshot:
```bash
for s in lightweight with-conduct full-workflow standard full-product multi-stack component central-docs html-views; do
  rm -rf /tmp/regen-$s
  node --input-type=module -e "
import { assemble } from './skills/init-code-repo/assemble.mjs';
import { readFileSync } from 'node:fs';
assemble('/tmp/regen-$s', JSON.parse(readFileSync('tests/scenarios/$s/config.json','utf8')));
"
  node --input-type=module -e "
import { fileTree } from './tests/lib/tree.mjs';
import { writeFileSync } from 'node:fs';
writeFileSync('tests/golden/$s/expected-tree.json', JSON.stringify(fileTree('/tmp/regen-$s'), null, 2) + '\n');
"
done
cp /tmp/regen-lightweight/AGENTS.md tests/golden/lightweight/AGENTS.md
```
Inspect lightweight AGENTS snapshot has the 完整性门控 row. `npm test` → 34/34.

```bash
git add skills/init-code-repo/templates/core/docs/rules/design-completeness-rules.md.tmpl skills/init-code-repo/templates/core/AGENTS.md.tmpl skills/init-code-repo/templates/core/docs/rules/dev-workflow-rules.md.tmpl tests/golden/
git commit -m "feat(init-code-repo): 设计完整性门控规则（阶段门→必填文档映射 + TODO 扫描）"
```

---

## Task 2: check-completeness.mjs 维护者预言机（用 matchAll）

**Files:**
- Create: `skills/init-code-repo/scripts/check-completeness.mjs`
- Modify: `package.json`

- [ ] **Step 1: Create `scripts/check-completeness.mjs`**

```javascript
#!/usr/bin/env node
// check-completeness.mjs — 设计完整性门控维护者预言机。
// 用法：node scripts/check-completeness.mjs --stage P1 [--root <repo-root>]
// 扫描当前阶段门必填文档的 TODO 残留/空节，有残留=exit 1。
// 与 SKILL.md 阶段 5 agent 路径同逻辑。
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.argv.includes('--root') ? process.argv[process.argv.indexOf('--root') + 1] : '.';
const stageIdx = process.argv.indexOf('--stage');
const stage = stageIdx >= 0 ? process.argv[stageIdx + 1] : readStageFromHandover(ROOT);

const MAPPING = {
  P0: ['docs/00-charter/concept.md', 'docs/00-charter/guardrails.md', 'docs/00-charter/vision-strategy.md', 'docs/02-design/north-star.md', 'ROADMAP.md'],
  P1: ['docs/02-design/system-architecture.md', 'docs/02-design/entity-model.md', 'docs/02-design/api/api-reference.md'],
  P2: ['docs/02-design/ui-design/README.md', 'docs/02-design/test-spec/README.md'],
  P3: ['docs/ledger/debt.md'],
};

function readStageFromHandover(root) {
  const p = join(root, 'docs/HANDOVER.md');
  if (!existsSync(p)) return 'P0';
  const t = readFileSync(p, 'utf8');
  const m = t.match(/当前阶段门[\s\S]{0,40}(P[0-3])/);
  return m ? m[1] : 'P0';
}

function scanFile(rel) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) return [{ file: rel, issue: 'missing' }];
  const text = readFileSync(p, 'utf8');
  const issues = [];
  const todoRe = /（TODO[:/f|i\sl]*[^）]*）/g;
  for (const m of text.matchAll(todoRe)) issues.push({ file: rel, issue: 'todo', match: m[0] });
  return issues;
}

const required = [];
for (let s = 0; s <= parseInt(stage.slice(1)); s++) {
  required.push(...(MAPPING['P' + s] || []));
}

const allIssues = [];
for (const rel of required) allIssues.push(...scanFile(rel));

if (allIssues.length === 0) {
  console.log(`✓ completeness OK (stage ${stage}, ${required.length} docs checked)`);
  process.exit(0);
} else {
  console.error(`✗ completeness FAIL (stage ${stage}):`);
  for (const i of allIssues) console.error(`  ${i.file}: ${i.issue}${i.match ? ' ' + i.match : ''}`);
  process.exit(1);
}
```

- [ ] **Step 2: Add npm script to `package.json`**

In scripts, add:
```json
    "check:completeness": "node scripts/check-completeness.mjs"
```

- [ ] **Step 3: Smoke test**

```bash
rm -rf /tmp/cc-test && mkdir -p /tmp/cc-test/docs/00-charter /tmp/cc-test/docs/02-design
printf '# concept\n\n（TODO: 填写它是什么）\n' > /tmp/cc-test/docs/00-charter/concept.md
printf '# 护栏\n\n内容已填。\n' > /tmp/cc-test/docs/00-charter/guardrails.md
printf '# 愿景\n\n内容已填。\n' > /tmp/cc-test/docs/00-charter/vision-strategy.md
printf '# 北极星\n\n（TODO/fill：终态愿景）\n' > /tmp/cc-test/docs/02-design/north-star.md
printf '# ROADMAP\n\nP0\n' > /tmp/cc-test/ROADMAP.md
node skills/init-code-repo/scripts/check-completeness.mjs --stage P0 --root /tmp/cc-test; echo "exit=$?"
```
Expected: exit=1, prints concept.md + north-star.md todo issues.

```bash
rm -rf /tmp/cc-fp
node --input-type=module -e "
import { assemble } from './skills/init-code-repo/assemble.mjs';
import { readFileSync } from 'node:fs';
assemble('/tmp/cc-fp', JSON.parse(readFileSync('tests/scenarios/full-product/config.json','utf8')));
"
node skills/init-code-repo/scripts/check-completeness.mjs --stage P0 --root /tmp/cc-fp; echo "exit=$?"
```
Expected: exit=1 (full-product charter/north-star have TODO残留).

- [ ] **Step 4: Run suite + commit**

`npm test` → 34/34.

```bash
git add skills/init-code-repo/scripts/check-completeness.mjs package.json
git commit -m "feat(init-code-repo): check-completeness.mjs 完整性门控预言机"
```

---

## Task 3: SKILL.md 阶段 4 起草规则 + 阶段 5 完整性门控 + 引导 fill

**Files:**
- Modify: `skills/init-code-repo/SKILL.md`

- [ ] **Step 1: Update 阶段 4 — 起草非留白**

In SKILL.md, find 阶段 4 section. Replace its body with:

```
### 阶段 4 · 填充引导（起草非留白）

逐节处理，**先起草能起草的，留 TODO 只给真正需要用户领域知识的**：

1. `00-charter/concept.md`（若选）：起草"一句话定义"（从 one-line）、"它是什么"（one-line 改写）；"核心概念"留 TODO。
2. `02-design/north-star.md`（若选）：从 one-line + charter 起草"终态愿景"草稿；"不变量""允许领先现实"留 TODO。
3. `02-design/system-architecture.md`（若选）：起草构建块视图（按 stacks+repoShape：monorepo→apps/api+apps/web）、技术栈段（按 stacks）；领域模型/运行时序留 TODO。
4. `doc/component.yaml`（组件仓）：填 name、one-line、repo（跑 `git remote get-url origin`）、single-repo-docs 路径；layer/depends-on/exposes/consumes 留 TODO。
5. `02-design/api/api-reference.md`（若选）：通用约定层已有；接口列表留 TODO。
6. `ROADMAP.md`：起草 P0 首阶段门占位。
7. `AGENTS.md` 仓库布局段：按所选栈形态填实际目录树。
8. `HANDOVER.md` 首条交接：本轮首做 + 当前阶段门标注。

每节起草后提示"是否符合"，可跳过（留 TODO）。校验：占位符 `{{...}}` 残留扫描；AGENTS 布局段与实际目录一致。
```

- [ ] **Step 2: Update 阶段 5 — 加完整性门控 + 末尾引导 fill**

In SKILL.md 阶段 5, before the阶段 5 closing (after "不自动 commit/push" line), append:

```

**设计完整性门控**：读 HANDOVER.md 顶部"当前阶段门" → 按 [design-completeness-rules.md](docs/rules/design-completeness-rules.md) 的阶段门→必填文档映射 → 扫描必填文档的 `（TODO: ...）` 残留与空节 → 列未填项。有残留=阻断发布门控（除非用户显式跳过并记入 HANDOVER 待办）。

**末尾主动引导 fill-design-doc**：阶段 5 末尾，列出当前残留 TODO 清单（按文档归类），询问用户"是否现在用 fill-design-doc skill 逐节填充？"。用户同意 → 调用 `fill-design-doc` skill 逐文档处理；用户拒绝 → 在 HANDOVER.md 记录"待填充 TODO 列表"作为下轮首做。这闭环 init→fill，避免 TODO 被遗忘。
```

- [ ] **Step 3: Commit**

```bash
git add skills/init-code-repo/SKILL.md
git commit -m "docs(init-code-repo): SKILL 阶段 4 起草非留白 + 阶段 5 完整性门控与 fill 引导"
```

---

## Task 4: fill-design-doc skill

**Files:**
- Create: `skills/fill-design-doc/SKILL.md`
- Create: `skills/fill-design-doc/README.md`

- [ ] **Step 1: Create `skills/fill-design-doc/SKILL.md`**

```markdown
---
name: fill-design-doc
description: Fill a specific design document section-by-section via guided Q&A. Use after init-code-repo has scaffolded a repo with TODO placeholders, when the user wants to actually fill in a design doc (charter/architecture/entity-model/api/ui/etc.). Reads the doc structure + context, asks concrete questions per section, drafts content from user answers, writes back, then re-runs completeness check.
---

# fill-design-doc — 设计文档逐节填充

把 init-code-repo 留下的 TODO 占位逐节消灭。不写空白——逐节追问，把用户口述转成文档内容。

## 流程

1. **定位目标**：用户提供文档路径（如 `docs/02-design/system-architecture.md`），或自然语言指定（"帮我填架构文档"）。读目标文档章节结构 + 已有内容。
2. **读上下文**：读 AGENTS.md（项目一句话+栈+组件）、north-star.md（若存在）、component.yaml（若存在）、相关代码结构。建立填充上下文。
3. **逐节追问**：对每个 TODO/空节，提 1-2 个**具体**问题（不是"请填写"，而是"本组件对外暴露哪些接口？列出方法+路径+用途"）。一次一节，等用户答。
4. **起草该节**：用户口述 → agent 起草该节内容（结构化、可读）→ 展示给用户确认/修正 → 写回文档。
5. **循环**：进入下一节，直到该文档所有 TODO 消灭或用户叫停。
6. **收尾**：刷新 `docs/HANDOVER.md`（记录"填充了 X 文档 Y 节"）+ 触发完整性门控重扫（按 design-completeness-rules.md 的映射，报当前阶段门剩余未填）。

## 与 init-code-repo 的关系

init-code-repo 起草初稿 + 标 TODO；本 skill 逐节消灭 TODO。两者共享同一套文档结构与完整性门控规则。init-code-repo 阶段 5 末尾会主动引导调用本 skill。

## 起草原则

- 不留空白：用户口述后必起草内容，不回退到 TODO。
- 结构化：用表格/列表/章节组织，而非流水文本。
- 与上下文一致：起草内容须与 AGENTS.md/north-star/已有文档不矛盾；矛盾时停下确认。
- 可量化：验收标准、接口契约等用可验证表述。

## 回应语言

所有回应、文档内容一律使用中文。
```

- [ ] **Step 2: Create `skills/fill-design-doc/README.md`**

```markdown
# fill-design-doc skill

逐节填充 init-code-repo 留下的设计文档 TODO。与 init-code-repo 配套使用。
安装：与 init-code-repo 一起装到 `~/.claude/skills/fill-design-doc/`。
```

- [ ] **Step 3: Commit**

```bash
git add skills/fill-design-doc/
git commit -m "feat(fill-design-doc): 独立 skill 逐节填充设计文档 TODO"
```

---

## Task 5: 测试 + 最终验证

**Files:**
- Modify: `tests/run_tests.mjs`

- [ ] **Step 1: Add imports + tests**

At top of `tests/run_tests.mjs`, add to imports:
```javascript
import { spawnSync } from 'node:child_process';
```

Append:
```javascript
test('fill-design-doc: SKILL.md exists and documents guided fill', () => {
  const skill = readFileSync('skills/fill-design-doc/SKILL.md', 'utf8');
  assertOk(skill.startsWith('---\nname: fill-design-doc'), 'fill skill frontmatter');
  assertOk(skill.includes('逐节追问'), 'fill skill guided Q&A');
  assertOk(skill.includes('起草该节'), 'fill skill drafts from answers');
  assertOk(skill.includes('完整性门控'), 'fill skill triggers completeness');
});

test('check-completeness.mjs: flags TODO residue', () => {
  const tmp = '/tmp/init-code-repo-test-completeness';
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(`${tmp}/docs/00-charter`, { recursive: true });
  mkdirSync(`${tmp}/docs/02-design`, { recursive: true });
  writeFileSync(`${tmp}/docs/00-charter/concept.md`, '# 概念\n\n（TODO: 填写它是什么）\n');
  writeFileSync(`${tmp}/docs/00-charter/guardrails.md`, '# 护栏\n\n内容已填。\n');
  writeFileSync(`${tmp}/docs/00-charter/vision-strategy.md`, '# 愿景\n\n内容已填。\n');
  writeFileSync(`${tmp}/docs/02-design/north-star.md`, '# 北极星\n\n（TODO/fill：终态愿景）\n');
  writeFileSync(`${tmp}/ROADMAP.md`, '# ROADMAP\n\nP0\n');
  const r = spawnSync('node', ['skills/init-code-repo/scripts/check-completeness.mjs', '--stage', 'P0', '--root', tmp]);
  assertOk(r.status === 1, 'check-completeness exits 1 on TODO residue');
  assertOk(String(r.stderr).includes('concept.md'), 'stderr mentions concept.md');
});
```

- [ ] **Step 2: Run full suite**

`npm test` → 34 + 2 = 36.

- [ ] **Step 3: Commit**

```bash
git add tests/run_tests.mjs
git commit -m "test(init-code-repo): fill-design-doc 验收 + check-completeness 预言机测试"
```

- [ ] **Step 4: Final review** — dispatch reviewer for Plan C diff.

---

## Self-Review

**Spec coverage:** §6 起草 → Task 3. §7 完整性门控 → Tasks 1,2. §8 fill skill → Task 4. §6.4 阶段5引导 → Task 3. ✓
**Security:** check-completeness.mjs is read-only (matchAll, no exec). Test uses spawnSync (no shell). All hook-safe.

---

## Execution Handoff

Plan saved. Subagent-driven or inline.
