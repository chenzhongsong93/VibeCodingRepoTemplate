# init-code-repo Skill Wizard Implementation Plan (Plan 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement task-by-task.

**Goal:** Author `SKILL.md` (the agent entry point — wizard flow + manual assembly rules for zero-dependency agent-driven assembly), runtime adapters, and finalize the README. This completes the dual-path architecture: end users install `SKILL.md` + `templates/` and the agent assembles without Node.js.

**Architecture:** `SKILL.md` is the SSOT of the assembly contract. It contains: (1) the 5-stage wizard flow, (2) the manual assembly rules (variable substitution table + conditional stripping + require-marker rules + cond derivation) — the agent implements these rules directly, producing output identical to `assemble.mjs`. The engine remains the maintainer test oracle. Runtime adapters (`templates/runtime-adapters/<runtime>/`) are per-runtime install fragments.

**Tech Stack:** Markdown SKILL.md (no code); optional Node.js for maintainer tests.

**Prerequisite:** Plan 3 merged to main (25/25 tests green).

---

## File Structure (this plan)

```
skills/init-code-repo/
├── SKILL.md                                # ← 主体：向导流程 + 手动装配规则
└── templates/runtime-adapters/
    ├── claude-code/settings.json.tmpl      # require:claude-code
    ├── codex/README.md.tmpl                # require:codex
    ├── opencode/README.md.tmpl             # require:opencode
    ├── kimicode/README.md.tmpl             # require:kimicode
    └── zcode/README.md.tmpl                # require:zcode
```

Modified:
- `README.md` — finalize install docs (clarify skill install content = SKILL.md + templates/ + runtime-adapters/).
- `tests/run_tests.mjs` — add a runtime-adapter scenario test.

---

## Task 1: Author SKILL.md (the agent entry point)

**Files:**
- Create: `skills/init-code-repo/SKILL.md`

This is the critical artifact. It must let an agent (any runtime) assemble a repo from `templates/` WITHOUT Node.js, by following the manual assembly rules. The agent's output must match `assemble.mjs`.

- [ ] **Step 1: Create `skills/init-code-repo/SKILL.md`**

```markdown
---
name: init-code-repo
description: Scaffold a new code repo with SSOT doc structure + R&D process + quality gates. Use when creating a new project/repository, starting a fresh codebase, or initializing repo structure. Assembles templates with variable substitution and conditional component inclusion, then guides fill-in. Runtime-neutral — works in Claude Code, codex, opencode, kimicode, zcode.
---

# init-code-repo — 通用代码仓模板

在新仓初始化 SSOT 文档结构 + 研发流程 + 质量门禁，并引导逐步建仓。运行时中立，零外部依赖（agent 自己装配，不需要 Node.js/Python/任何运行时）。

## 5 阶段向导流

按顺序执行：**问 → 等用户答 → 写文件 → 校验 → 下一阶段**。

### 阶段 0 · 前置检查

- 确认当前目录是空仓或仅含 `.git`/`README`/`LICENSE`。含冲突文件（已有 `AGENTS.md`/`CLAUDE.md` 等）→ 停下询问，不静默改。
- 未 `git init` → 提示用户初始化，不替用户 init（除非用户同意）。

### 阶段 1 · 录取

向用户收集（多选题优先）：

| 项 | 选项 | 用途 |
|---|---|---|
| 项目名 | 自由文本 | 填入 {{PROJECT_NAME}} |
| 一句话定位 | 自由文本 | 填入 {{ONE_LINE}} |
| 主栈 | 无 / rust / node / python / go / 多栈 | 决定叠加哪些 stacks/ |
| 仓形态 | 单 app / monorepo | 决定布局 |
| 目标 runtime | claude-code / codex / opencode / kimicode / zcode / 多端 | 决定叠加哪些 runtime-adapters/ |
| 远端托管 | gitcode / github / gitlab / 无 | remote=none 时无 remote-hook；否则有 |
| Commit 门禁档 | 默认正则 / 自定义正则 / 不要求 | 决定 commit-msg 段 |
| 可选组件 | 多选（见下表） | 决定装配范围与版本派生 |

校验：必答项齐全；主栈与仓形态自洽。

### 阶段 2 · 骨架写入

按"手动装配规则"（见下）从 `templates/core/` 写入所有必带文件，按已选组件条件装配。

### 阶段 3 · 栈与门禁叠加

- 按 `config.stacks` 从 `templates/stacks/<栈>/` 写入胶水文件。
- 从 `templates/gates/` 写入门禁文件（按 require 标记条件包含）。
- 按目标 runtime 从 `templates/runtime-adapters/<runtime>/` 写入适配片段。

### 阶段 4 · 填充引导

逐节带用户填占位，每节给检查清单 + 校验：

1. `00-charter/`（若选）：愿景/战略/护栏
2. `02-design/system-architecture.md`（若选）：技术栈/架构骨架
3. `ROADMAP.md`：P0 首阶段门
4. `AGENTS.md` 仓库布局段：按所选栈形态填实际目录树
5. `HANDOVER.md` 首条交接：本轮首做 + 当前阶段门标注

每节可跳过（留 TODO）。校验：占位符残留扫描；AGENTS.md 布局段与实际目录一致。

### 阶段 5 · 验收

- SSOT 一致性：`AGENTS.md` 索引的文件全部存在；三类文档分类在 `doc-governance.md` 已写明；死链扫描（所有 markdown 链接指向实际存在文件）。
- 打印完成清单：已写文件树、未填占位列表、下一步建议。
- 不自动 commit/push（除非用户显式要求）。

---

## 手动装配规则（agent 离线装配，输出须与 assemble.mjs 一致）

agent 读 `templates/` 下的 `.tmpl` 文件，按以下规则处理后写入目标仓（`.tmpl` 后缀去掉）。

### 1. 变量替换

替换 `{{VAR}}` 为 ctx 值：

| 占位符 | ctx 字段 | 来源 |
|--------|---------|------|
| `{{PROJECT_NAME}}` | projectName | 阶段 1 项目名 |
| `{{ONE_LINE}}` | oneLine | 阶段 1 一句话定位 |
| `{{YEAR}}` | year | 当前年份（4 位） |
| `{{COMMIT_REGEX}}` | commitRegex | commit 档为 custom 时的用户正则；否则不出现 |

未知占位符保持不变。

### 2. 条件块剥离（`<!--IF:cond-->`）

模板内的条件块按 cond 是否在"激活集"中保留或剥离：

- `<!--IF:cond-->...<!--/IF:cond-->`：cond 激活 → 保留内容；否则整段移除。
- `<!--IF:cond-->A<!--ELSE-->B<!--/IF:cond-->`：cond 激活 → 保留 A；否则保留 B。
- 嵌套：外层保留后，内层标记继续按规则处理（循环至稳定）。
- 标记尾换行：剥离标记时连同其尾随换行一并消费，避免留空行；保留内容中的段落空行不动。

### 3. 文件级条件包含（`<!--require:cond-->`）

文件首行若是 `<!--require:cond-->`，则仅当 cond 激活时才写该文件；写入前剥去该首行。无此标记的文件（核心必带）总是写入。

### 4. 激活集推导

激活集 = 选中组件 + 派生态 + commit 档 + 选中栈。

**组件直传**（在 components 列表中即激活）：`product-docs`、`docker`、`three-tier-test`、`clean-code`、`agent-conduct`、`full-ledger`、`doc-sync`、`remote-hook`、`api-docs`。

**派生态**：
- `full-workflow` = components 含 `docker` 或 `three-tier-test`。
- `remote-hook` = components 含 `remote-hook` 或 `remote !== 'none'`。

**commit 档**（按 commitGate.mode）：
- `default` → `commit-default`
- `custom` → `commit-custom`
- `none` → `commit-none`

**栈**（按 stacks 列表）：`rust` / `node` / `python` / `go`。

### 5. 写入路径

- `templates/core/**` → 目标仓根（保留相对路径）。
- `templates/stacks/<栈>/**` → 目标仓根（每个选中栈）。
- `templates/gates/**` → 目标仓根（按 require 标记条件包含）。
- `templates/runtime-adapters/<runtime>/**` → 目标仓根（每个选中 runtime）。
- `.tmpl` 后缀去掉。

### 6. 版本派生

- `dev-workflow-rules.md`：选了 docker 或 three-tier-test → 8 步全版（L2/L3 激活）；否则精简（L2/L3 跳过，步骤 5-6 = 记录/发布门控）。模板内已用 `<!--IF:full-workflow-->` 处理。
- `test-spec/`：选了 three-tier-test → 完整三层格式；否则骨架。
- `testing-rules.md`：选了 three-tier-test 才存在（require 标记）。
- `AGENTS.md`：按已选组件条件装配（六层模型段在 product-docs 激活时出现；api 索引行在 api-docs 激活时出现）。

---

## 组件清单

### 核心必带（不问）

AGENTS.md、CLAUDE.md、README.md、.gitignore、lefthook.yml、ROADMAP.md、HANDOVER.md、docs/rules/{commit-rules,dev-workflow-rules,doc-ssot-rules}.md、docs/02-design/{test-spec/README,doc-governance}.md、docs/ledger/{bugs,archive/}、docs/superpowers/specs/、gitleaks（lefthook 内）。

### 可选组件（多选）

| 组件 | cond | 新增 | 副作用 |
|------|------|------|--------|
| 产品级设计文档组 | product-docs | 00-charter/、01-product/、02-design/system-architecture.md | AGENTS 加六层模型段 |
| Docker 构建基础设施 | docker | （infra 模板，后续） | dev-workflow L2 激活 |
| 三层测试规则 | three-tier-test | rules/testing-rules.md | test-spec 升级完整 + dev-workflow L3 激活 |
| Clean Code 严格门禁 | clean-code | rules/clean-code-rules.md | 栈 lint 强制 -D warnings |
| Agent 行为军规 | agent-conduct | rules/agent-conduct-rules.md | AGENTS 索引加军规行 |
| 完整台账 | full-ledger | ledger/{debt,version-log}.md | doc-ssot-rules 台账表加行 |
| 代码-文档同步检查 | doc-sync | （lefthook pre-push 片段，已内联） | lefthook pre-push 加 doc-sync |
| 远端 pre-receive hook | remote-hook | gates/pre-receive-remote/ | commit-rules 标注远端强控 |
| API 文档 | api-docs | 02-design/api/api-reference.md | AGENTS 索引加 api 行 |

### Commit 门禁三档

- 默认正则：`^(feat|fix|docs|style|refactor|perf|test|chore)\(.*\): .+\s#\d+$`
- 自定义正则：用户提供。
- 不要求：仅建议，非强制。

---

## 阶段 5 死链校验（agent 执行）

扫描所有生成的 `.md` 文件中的 markdown 链接 `[text](relative-path)`，验证目标文件存在。忽略外部链接（http/https/mailto）和锚点链接（#...）。死链 = 阻断，修模板（加 require 守卫或移除链接）至无死链。

---

## 回应语言

所有回应、设计文档、规划文档一律使用中文。
```

- [ ] **Step 2: Verify SKILL.md frontmatter parses**

```bash
head -5 skills/init-code-repo/SKILL.md
```
Confirm the YAML frontmatter (name, description) is present and well-formed.

- [ ] **Step 3: Run `npm test`** → 25/25 (SKILL.md isn't tested by the engine, but ensure no regression).

- [ ] **Step 4: Commit**

```bash
git add skills/init-code-repo/SKILL.md
git commit -m "feat(init-code-repo): SKILL.md 向导流程 + 手动装配规则（agent 离线装配）"
```

---

## Task 2: Runtime adapters

**Files:**
- Create: `skills/init-code-repo/templates/runtime-adapters/claude-code/settings.json.tmpl`
- Create: `skills/init-code-repo/templates/runtime-adapters/codex/README.md.tmpl`
- Create: `skills/init-code-repo/templates/runtime-adapters/opencode/README.md.tmpl`
- Create: `skills/init-code-repo/templates/runtime-adapters/kimicode/README.md.tmpl`
- Create: `skills/init-code-repo/templates/runtime-adapters/zcode/README.md.tmpl`

The runtime adapters need a require mechanism based on `config.runtimes` (a list). But the current `extraConds` adds stack conds and commit conds, NOT runtime conds. So `<!--require:claude-code-->` would never be active. 

**Engine change required:** extend `extraConds` to add runtime conds from `config.runtimes`.

- [ ] **Step 1: Extend `assemble.mjs` extraConds to add runtime conds**

In `skills/init-code-repo/assemble.mjs`, modify `extraConds`:

```javascript
function extraConds(config) {
  const conds = [];
  const mode = config.commitGate?.mode || 'default';
  if (mode === 'default') conds.push('commit-default');
  else if (mode === 'custom') conds.push('commit-custom');
  else if (mode === 'none') conds.push('commit-none');
  for (const s of config.stacks || []) conds.push(s);
  for (const r of config.runtimes || []) conds.push(r);
  return conds;
}
```

And in `assemble`, walk `templates/runtime-adapters/<runtime>/` for each selected runtime. Add after the gates writeTree call:

```javascript
  for (const runtime of config.runtimes || []) {
    writeTree(join(root, 'runtime-adapters', runtime), targetDir, ctx, activeSet);
  }
```

- [ ] **Step 2: Create `runtime-adapters/claude-code/settings.json.tmpl`**

```
<!--require:claude-code-->
{
  "permissions": {
    "allow": [
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(git push:*)",
      "Read",
      "Write",
      "Edit",
      "Glob",
      "Grep"
    ],
    "deny": [
      "Bash(rm -rf:*)",
      "Bash(sudo:*)"
    ]
  }
}
```

(This writes to `.claude/settings.json` in the target repo.)

- [ ] **Step 3: Create the 4 other runtime adapter READMEs**

Each is `<!--require:<runtime>-->` + a short note. Example for codex (`runtime-adapters/codex/README.md.tmpl`):

```
<!--require:codex-->
# codex runtime adapter

本项目使用 AGENTS.md 作为 SSOT。codex 直读 `AGENTS.md`，无需 CLAUDE.md。
详见仓根 `AGENTS.md`。
```

Create equivalent files for opencode, kimicode, zcode (same content, change the runtime name in the require marker and the heading text).

- [ ] **Step 4: Smoke test — claude-code runtime produces .claude/settings.json**

```bash
node --input-type=module -e "
import { assemble } from './skills/init-code-repo/assemble.mjs';
import { rmSync, readFileSync } from 'node:fs';
const cfg = { projectName:'Demo', oneLine:'L', year:'2026', stacks:[], repoShape:'single', runtimes:['claude-code'], remote:'none', commitGate:{mode:'default'}, components:[] };
rmSync('/tmp/ra',{recursive:true,force:true});
assemble('/tmp/ra', cfg);
import { fileTree } from './tests/lib/tree.mjs';
console.log('has .claude/settings.json:', fileTree('/tmp/ra').includes('.claude/settings.json'));
const s = readFileSync('/tmp/ra/.claude/settings.json','utf8');
console.log('leftover require:', s.includes('<!--require:'));
console.log('has permissions:', s.includes('permissions'));
"
```
Expected: `has .claude/settings.json: true`, `leftover require: false`, `has permissions: true`.

- [ ] **Step 5: Run suite + commit**

Run `npm test` → 25/25 (existing scenarios don't select runtimes... except full-product has `runtimes: ["claude-code"]`. So full-product golden is now STALE — it doesn't include `.claude/settings.json`. Regenerate it:

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

Inspect: full-product now includes `.claude/settings.json`. Re-run `npm test` → 25/25.

```bash
git add skills/init-code-repo/assemble.mjs skills/init-code-repo/templates/runtime-adapters/ tests/golden/full-product/expected-tree.json
git commit -m "feat(init-code-repo): runtime 适配片段（claude-code/codex/opencode/kimicode/zcode）"
```

---

## Task 3: Finalize README + acceptance test

**Files:**
- Modify: `README.md`
- Modify: `tests/run_tests.mjs` — add an acceptance test asserting SKILL.md exists and describes assembly rules.

- [ ] **Step 1: Update README.md**

Update the "安装" section to clarify the skill install content includes SKILL.md + templates/ + runtime-adapters/. Replace the "安装" section with:

```markdown
## 安装

skill 安装内容 = `skills/init-code-repo/`（`SKILL.md` + `templates/`）。各 agent runtime：

- **Claude Code**：将 `skills/init-code-repo/` 拷贝或软链至 `~/.claude/skills/init-code-repo/`（用户级）或项目 `.claude/skills/`。
- **codex / opencode / kimicode / zcode**：将 `skills/init-code-repo/` 拷贝至对应 runtime 的 skills 目录。skill 仅依赖 `SKILL.md` 与 `templates/`，runtime 中立。

调用时 agent 读 `SKILL.md`，按"手动装配规则"从 `templates/` 装配，零运行时依赖。可选的 `runtime-adapters/` 在选择目标 runtime 时附带（如 Claude Code 的 `.claude/settings.json`）。
```

- [ ] **Step 2: Add SKILL.md acceptance test to `tests/run_tests.mjs`**

Append:

```javascript
test('SKILL.md: exists and documents assembly contract', () => {
  const skill = readFileSync('skills/init-code-repo/SKILL.md', 'utf8');
  // frontmatter
  assertOk(skill.startsWith('---\nname: init-code-repo'));
  // wizard stages
  assertOk(skill.includes('5 阶段向导流'), 'SKILL has wizard stages');
  assertOk(skill.includes('阶段 0'), 'SKILL has stage 0');
  assertOk(skill.includes('阶段 5'), 'SKILL has stage 5');
  // manual assembly rules (agent can assemble without Node.js)
  assertOk(skill.includes('手动装配规则'), 'SKILL has manual assembly rules');
  assertOk(skill.includes('{{PROJECT_NAME}}'), 'SKILL documents variable substitution');
  assertOk(skill.includes('<!--IF:cond-->'), 'SKILL documents conditional stripping');
  assertOk(skill.includes('<!--require:cond-->'), 'SKILL documents require markers');
  assertOk(skill.includes('激活集推导'), 'SKILL documents cond derivation');
  // dead-link check
  assertOk(skill.includes('死链校验'), 'SKILL documents dead-link check');
});
```

- [ ] **Step 3: Run full suite**

Run: `npm test`
Expected: 26/26 (25 prior + 1 SKILL.md acceptance test).

- [ ] **Step 4: Commit**

```bash
git add README.md tests/run_tests.mjs
git commit -m "docs(init-code-repo): 完善 README 安装说明 + SKILL.md 验收测试"
```

---

## Task 4: Final verification + review

- [ ] **Step 1:** `npm test` → 26/26.
- [ ] **Step 2:** Dispatch final code reviewer for the entire Plan 4 diff (`main..HEAD`). Verify SKILL.md is complete (wizard + assembly rules + cond derivation), runtime adapters work, README is accurate.
- [ ] **Step 3:** After review, the full init-code-repo skill (Plans 1-4) is complete. Consider a holistic end-to-end demo: mentally walk through a lightweight assembly using ONLY SKILL.md (no engine) to confirm the agent-driven path is viable.

---

## Self-Review

**Spec coverage:**
- §3.4 dual-path: SKILL.md manual assembly rules → Task 1. ✓ (completes the agent-driven zero-dep path)
- §4.4 runtime-adapters → Task 2. ✓
- §10 wizard flow → Task 1 (SKILL.md). ✓
- §11 dead-link check (agent-executable) → Task 1 (SKILL.md documents it). ✓
- README install docs → Task 3. ✓

**Cond consistency:** Task 2 adds runtime conds (claude-code/codex/opencode/kimicode/zcode) to extraConds. Consistent with require markers on adapter files.

**Placeholder scan:** SKILL.md is full content (no plan placeholders). Template `（TODO: ...）` are end-user fill-in.

**Critical:** SKILL.md must let an agent assemble WITHOUT the engine. The manual assembly rules (§1-6) are the SSOT; assemble.mjs implements the same. If they drift, the agent-driven and engine-driven paths diverge. The SKILL.md acceptance test (Task 3) locks the presence of the rules; the golden tests lock the engine output. Cross-consistency is maintained by both implementing the same documented rules.

---

## Execution Handoff

Plan saved to `docs/superpowers/plans/2026-07-06-init-code-repo-skill-wizard.md`. Subagent-driven (recommended) or inline.
