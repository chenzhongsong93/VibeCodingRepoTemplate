# 多语言栈支持对齐 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把模板对 Java / JS / Golang 的支持度拉齐到 Rust / Python 基准线(骨架 + clean-code + verify 三档门禁 + lefthook 钩子四层齐全)。

**Architecture:** 三阶段串行-并行混合:阶段 1 横切基线(串行,改 assemble.mjs/lefthook/SKILL/dev-conductor 共享接口)→ 阶段 2 各语言栈(并行,java/node-fe/node-be/go 互不依赖)→ 阶段 3 集成验证(串行,golden 全套 + 死链 + 一致性)。TDD 形态特殊:先写 scenario+expected-tree(红)→ 写模板(绿)→ `node tests/run_tests.mjs` 验证。

**Tech Stack:** Node.js (assemble.mjs 装配器 + node:test 测试)、模板字符串变换(`{{VAR}}` 替换 + `<!--IF:cond-->` 条件块 + `<!--require:cond-->` 文件级包含)、Makefile、pom.xml (Maven)、package.json、go.mod、lefthook.yml。

**Spec:** `docs/superpowers/specs/2026-07-31-multi-stack-language-support-design.md`

---

## File Structure

### 新增文件
- `skills/init-code-repo/templates/stacks/java/pom.xml.tmpl` — Maven POM(spotless/checkstyle/spotbugs plugin + verify profile)
- `skills/init-code-repo/templates/stacks/java/Makefile.tmpl` — Java 门禁封装(lint/test/build/run + verify 三档)
- `skills/init-code-repo/templates/stacks/java/src/main/java/.gitkeep` — Maven 主代码目录骨架
- `skills/init-code-repo/templates/stacks/java/src/test/java/.gitkeep` — Maven 测试目录骨架
- `skills/init-code-repo/templates/stacks/node-frontend/package.json.tmpl` — 前端(vite+vitest+eslint+prettier)
- `skills/init-code-repo/templates/stacks/node-frontend/Makefile.tmpl` — 前端 npm script 包装
- `skills/init-code-repo/templates/stacks/node-frontend/tsconfig.json.tmpl` — 前端 tsconfig(jsx/dom)
- `skills/init-code-repo/templates/stacks/node-backend/package.json.tmpl` — 后端(tsx+vitest,无 vite)
- `skills/init-code-repo/templates/stacks/node-backend/Makefile.tmpl` — 后端 npm script 包装
- `skills/init-code-repo/templates/stacks/node-backend/tsconfig.json.tmpl` — 后端 tsconfig(node lib)
- `skills/init-code-repo/templates/stacks/go/go.mod.tmpl` — Go module 声明
- `tests/scenarios/java-stack/config.json` — Java 单栈 scenario
- `tests/golden/java-stack/expected-tree.json` — Java 装配产物树
- `tests/scenarios/node-backend/config.json` — Node 后端单栈 scenario
- `tests/golden/node-backend/expected-tree.json` — Node 后端装配产物树

### 修改文件
- `skills/init-code-repo/templates/core/lefthook.yml.tmpl` — 加 java/go/python 条件块 + doc-sync 正则补 .java
- `skills/init-code-repo/assemble.mjs` — node 派生态 + VERIFY_FAST_CMD 修正
- `skills/init-code-repo/SKILL.md` — 主栈选项表 + 激活集推导 + 组件副作用
- `skills/dev-conductor/SKILL.md` — 脚手架命令表补全(java 完整命令)
- `skills/init-code-repo/templates/stacks/go/Makefile.tmpl` — lint 升级 golangci-lint 降级 + 修 build 目标
- `tests/scenarios/{component,full-governance,full-product,multi-stack,standard}/config.json` — `node` → `node-frontend` 迁移
- `tests/golden/{component,full-governance,full-product,multi-stack,standard}/expected-tree.json` — 产物树更新
- `tests/run_tests.mjs` — node 测试迁移到 node-frontend + java verify 测试

### 删除文件
- `skills/init-code-repo/templates/stacks/node/` — 拆分后旧目录整体移除

---

## 阶段 1 · 横切基线(串行,阻塞阶段 2)

> 本阶段改共享接口(assemble.mjs/lefthook/SKILL/dev-conductor),必须先于各语言栈实装。所有阶段 2 agent 依赖这些接口。

### Task 1: assemble.mjs — node 派生态 + VERIFY_FAST_CMD 修正

**Files:**
- Modify: `skills/init-code-repo/assemble.mjs:18-29` (extraConds)
- Modify: `skills/init-code-repo/assemble.mjs:64-66` (verifyFastCmd 派生)
- Test: `tests/run_tests.mjs` (现有 node 测试将因拆分变红,本任务先不改测试,在 Task 9 迁移)

- [ ] **Step 1: 写失败测试 — node 派生态触发 lefthook `<!--IF:node-->` 块**

在 `tests/run_tests.mjs` 末尾追加(用临时 config 验证 node-frontend 激活 node 派生 cond):

```javascript
test('node-frontend stack derives node cond (lefthook web-lint present)', () => {
  const tmp = '/tmp/init-code-repo-test-node-fe-derive';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, { projectName:'P', oneLine:'L', year:'2026', stacks:['node-frontend'], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:[] });
  const lh = readFileSync(`${tmp}/lefthook.yml`, 'utf8');
  assertOk(lh.includes('eslint'), 'node-frontend derives node cond → web-lint present');
  assertClean(lh, 'node-frontend lefthook');
});
```

- [ ] **Step 2: 跑测试验证失败**

Run: `node --test tests/run_tests.mjs 2>&1 | grep -A5 "node-frontend stack derives"`
Expected: FAIL — lefthook 无 eslint(node 派生态未实现,node-frontend 不是 node)

- [ ] **Step 3: 实现 node 派生态**

修改 `skills/init-code-repo/assemble.mjs` 的 `extraConds` 函数,在 `for (const s of config.stacks || []) conds.push(s);` 之后加派生:

```javascript
function extraConds(config) {
  const conds = [];
  const mode = config.commitGate?.mode || 'default';
  if (mode === 'default') conds.push('commit-default');
  else if (mode === 'custom') conds.push('commit-custom');
  else if (mode === 'none') conds.push('commit-none');
  const stacks = config.stacks || [];
  for (const s of stacks) conds.push(s);
  // node 派生态:node-frontend / node-backend 共享 lefthook 的 <!--IF:node--> 块
  if (stacks.includes('node-frontend') || stacks.includes('node-backend')) conds.push('node');
  for (const r of config.runtimes || []) conds.push(r);
  if (config.repoRole === 'component') conds.push('multi-repo-component');
  if (config.repoRole === 'central-docs') conds.push('central-docs');
  return conds;
}
```

- [ ] **Step 4: 修正 VERIFY_FAST_CMD 派生**

修改 `skills/init-code-repo/assemble.mjs` 第 64-66 行:

```javascript
  const stacks = config.stacks || [];
  const isNodeOnly = stacks.length === 1
    && (stacks[0] === 'node-frontend' || stacks[0] === 'node-backend');
  const verifyFastCmd = isNodeOnly ? 'npm run verify:fast' : 'make verify-fast';
```

- [ ] **Step 5: 跑测试验证通过**

Run: `node --test tests/run_tests.mjs 2>&1 | grep -E "(node-frontend stack derives|pass|fail)" | head`
Expected: 新测试 PASS(lefthook 仍含 eslint,因 node 派生态触发);注意现有 `stacks:['node']` 测试此时仍用旧 node 目录,暂未迁移,可能仍过(旧 node 目录还在)。确认无回归。

- [ ] **Step 6: Commit**

```bash
git add skills/init-code-repo/assemble.mjs tests/run_tests.mjs
git commit -m "feat(assemble): node 派生态 + VERIFY_FAST_CMD 修正支持 node-frontend/backend #1"
```

---

### Task 2: lefthook.yml.tmpl — 加 java/go/python 条件块 + doc-sync 补 .java

**Files:**
- Modify: `skills/init-code-repo/templates/core/lefthook.yml.tmpl` (pre-commit 加 java/go/python 块,pre-push doc-sync 正则)
- Test: `tests/run_tests.mjs` (现有 full-workflow 测试断言 rust 块,本任务扩展)

- [ ] **Step 1: 写失败测试 — python/go/java lefthook 块按栈激活**

在 `tests/run_tests.mjs` 追加:

```javascript
test('lefthook: python/go/java blocks present when stack active', () => {
  for (const stack of ['python', 'go', 'java']) {
    const tmp = `/tmp/init-code-repo-test-lh-${stack}`;
    rmSync(tmp, { recursive: true, force: true });
    assemble(tmp, { projectName:'P', oneLine:'L', year:'2026', stacks:[stack], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:[] });
    const lh = readFileSync(`${tmp}/lefthook.yml`, 'utf8');
    if (stack === 'python') { assertOk(lh.includes('ruff check'), `${stack} ruff`); assertOk(lh.includes('mypy'), `${stack} mypy`); }
    if (stack === 'go') { assertOk(lh.includes('gofmt'), `${stack} gofmt`); assertOk(lh.includes('go vet'), `${stack} vet`); assertOk(lh.includes('golangci-lint'), `${stack} golangci-lint`); }
    if (stack === 'java') { assertOk(lh.includes('spotless:check'), `${stack} spotless`); assertOk(lh.includes('checkstyle:check'), `${stack} checkstyle`); }
    assertClean(lh, `${stack} lefthook`);
  }
});
```

- [ ] **Step 2: 跑测试验证失败**

Run: `node --test tests/run_tests.mjs 2>&1 | grep -A3 "python/go/java blocks"`
Expected: FAIL — lefthook 无 python/go/java 块

- [ ] **Step 3: 实现 — lefthook 加三个语言条件块**

修改 `skills/init-code-repo/templates/core/lefthook.yml.tmpl`,在 `<!--IF:node-->...<!--/IF:node-->` 块之后(`commit-msg:` 之前)追加:

```
<!--IF:python-->
    python-ruff:
      glob: "*.py"
      run: ruff check {staged_files}
    python-mypy:
      glob: "*.py"
      run: mypy {staged_files}
<!--/IF:python-->
<!--IF:go-->
    go-fmt:
      glob: "*.go"
      run: gofmt -l {staged_files}
    go-vet:
      glob: "*.go"
      run: go vet {staged_files}
    golangci-lint:
      glob: "*.go"
      run: command -v golangci-lint >/dev/null && golangci-lint run {staged_files} || (echo "[golangci-lint] 未安装，降级 gofmt+vet（非阻断）" && gofmt -l {staged_files} && go vet {staged_files})
<!--/IF:go-->
<!--IF:java-->
    java-fmt:
      glob: "*.java"
      run: mvn spotless:check
    java-checkstyle:
      glob: "*.java"
      run: mvn checkstyle:check
<!--/IF:java-->
```

- [ ] **Step 4: 实现 — doc-sync 正则补 .java**

修改同文件 pre-push 的 doc-sync-check,正则从 `\.(rs|ts|tsx|js|jsx|py|go)$` 改为 `\.(rs|ts|tsx|js|jsx|py|go|java)$`:

```
        if git diff --name-only HEAD@{1} HEAD | grep -qE '\.(rs|ts|tsx|js|jsx|py|go|java)$'; then
```

- [ ] **Step 5: 跑测试验证通过**

Run: `node --test tests/run_tests.mjs 2>&1 | grep -E "python/go/java blocks|pass|fail" | head`
Expected: 新测试 PASS。注意 `go`/`python` 块激活需要 stacks 含 go/python——现有 go/python scenario 应已含,确认无回归。

- [ ] **Step 6: Commit**

```bash
git add skills/init-code-repo/templates/core/lefthook.yml.tmpl tests/run_tests.mjs
git commit -m "feat(lefthook): 补 python/go/java 条件块 + doc-sync 加 .java #1"
```

---

### Task 3: SKILL.md — 主栈表 + 激活集推导 + 组件副作用同步

**Files:**
- Modify: `skills/init-code-repo/SKILL.md:27` (阶段1主栈选项)
- Modify: `skills/init-code-repo/SKILL.md:149` (激活集推导第4节栈列表)
- Modify: `skills/init-code-repo/SKILL.md:101` (VERIFY_FAST_CMD 派生说明)
- Test: `tests/run_tests.mjs` (SKILL.md 文档契约测试,第 282-294 行)

- [ ] **Step 1: 写失败测试 — SKILL.md 文档新增栈**

在 `tests/run_tests.mjs` 的 `SKILL.md: exists and documents assembly contract` 测试块内追加断言:

```javascript
  assertOk(skill.includes('java') && skill.includes('node-frontend') && skill.includes('node-backend'), 'SKILL 主栈表含 java/node-frontend/node-backend');
  assertOk(skill.includes('node 派生态') || skill.includes('node-frontend'), 'SKILL 文档 node 拆分');
```

- [ ] **Step 2: 跑测试验证失败**

Run: `node --test tests/run_tests.mjs 2>&1 | grep -A3 "documents assembly"`
Expected: FAIL — SKILL.md 当前主栈表写 "无 / rust / node / python / go / 多栈",不含 java/node-frontend/node-backend

- [ ] **Step 3: 修改阶段1主栈选项表**

`skills/init-code-repo/SKILL.md` 第 27 行,把:

```
| 主栈 | 无 / rust / node / python / go / 多栈 | 决定叠加哪些 stacks/ |
```

改为:

```
| 主栈 | 无 / rust / node-frontend / node-backend / python / go / java / 多栈 | 决定叠加哪些 stacks/；node 拆前端/后端子栈 |
```

- [ ] **Step 4: 修改激活集推导第4节栈列表**

`skills/init-code-repo/SKILL.md` 第 149 行,把:

```
**栈**(按 stacks 列表):`rust` / `node` / `python` / `go`。
```

改为:

```
**栈**(按 stacks 列表):`rust` / `node-frontend` / `node-backend` / `python` / `go` / `java`。

**栈派生态**:`node` = stacks 含 `node-frontend` 或 `node-backend`(lefthook 的 `<!--IF:node-->` 块由派生 cond 触发,模板条件块名不改)。
```

- [ ] **Step 5: 修改 VERIFY_FAST_CMD 派生说明**

`skills/init-code-repo/SKILL.md` 第 101 行 `VERIFY_FAST_CMD` 行,把:

```
| `{{VERIFY_FAST_CMD}}` | verifyFastCmd | 派生（node 单栈→npm run verify:fast，否则 make verify-fast） |
```

改为:

```
| `{{VERIFY_FAST_CMD}}` | verifyFastCmd | 派生（node-frontend 或 node-backend 单栈→npm run verify:fast，否则 make verify-fast） |
```

- [ ] **Step 6: 跑测试验证通过**

Run: `node --test tests/run_tests.mjs 2>&1 | grep -E "documents assembly|pass|fail" | head`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add skills/init-code-repo/SKILL.md tests/run_tests.mjs
git commit -m "docs(skill): 主栈表 + 激活集推导 + VERIFY_FAST_CMD 同步 node 拆分与 java #1"
```

---

### Task 4: dev-conductor SKILL.md — 脚手架命令表补全 java

**Files:**
- Modify: `skills/dev-conductor/SKILL.md:57` (java 行命令补全)
- Test: `tests/run_tests.mjs` (dev-conductor 测试,第 519-529 行)

- [ ] **Step 1: 写失败测试 — dev-conductor java 命令完整**

在 `tests/run_tests.mjs` 的 `dev-conductor: SKILL.md exists and orchestrates superpowers` 测试块内追加:

```javascript
  assertOk(skill.includes('mvn archetype:generate'), 'dev-conductor java 命令完整（非 ... 省略）');
  assertOk(!skill.match(/mvn archetype:generate\s*\.\.\./), 'java 命令无 ... 省略');
```

- [ ] **Step 2: 跑测试验证失败**

Run: `node --test tests/run_tests.mjs 2>&1 | grep -A3 "orchestrates superpowers"`
Expected: FAIL — 当前 java 行是 `mvn archetype:generate ...`(带 `...`)

- [ ] **Step 3: 补全 java 脚手架命令**

`skills/dev-conductor/SKILL.md` 第 57 行,把:

```
| java | maven | `mvn archetype:generate ...` |
```

改为:

```
| java | maven | `mvn archetype:generate -DgroupId={{GROUP_ID}} -DartifactId={{PROJECT_NAME}} -DarchetypeArtifactId=maven-archetype-quickstart -DinteractiveMode=false` |
```

> 注:`{{GROUP_ID}}` 作为 TODO 占位(dev-conductor 阶段填),与 pom.xml.tmpl 的 groupId 占位一致。dev-conductor 是指挥 skill,不自己替换变量,只给命令模板。

- [ ] **Step 4: 跑测试验证通过**

Run: `node --test tests/run_tests.mjs 2>&1 | grep -E "orchestrates superpowers|pass|fail" | head`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add skills/dev-conductor/SKILL.md tests/run_tests.mjs
git commit -m "docs(dev-conductor): 补全 java mvn archetype 完整命令 #1"
```

---

## 阶段 2 · 各语言栈(并行,互不依赖)

> 本阶段 4 个 agent 可并行。每个 agent 独立完成自己语言栈的模板 + scenario + golden + 测试。python 无新模板(lefthook 块阶段1 已加),仅验证。

### Task 5: Java / Maven 栈(新建)

**Files:**
- Create: `skills/init-code-repo/templates/stacks/java/pom.xml.tmpl`
- Create: `skills/init-code-repo/templates/stacks/java/Makefile.tmpl`
- Create: `skills/init-code-repo/templates/stacks/java/src/main/java/.gitkeep`
- Create: `skills/init-code-repo/templates/stacks/java/src/test/java/.gitkeep`
- Create: `tests/scenarios/java-stack/config.json`
- Create: `tests/golden/java-stack/expected-tree.json`
- Test: `tests/run_tests.mjs` (新增 java-stack golden 测试 + java verify 测试)

- [ ] **Step 1: 写 scenario config**

Create `tests/scenarios/java-stack/config.json`:

```json
{
  "projectName": "JavaApp",
  "oneLine": "Java Maven 服务",
  "year": "2026",
  "stacks": ["java"],
  "repoShape": "single",
  "runtimes": [],
  "remote": "github",
  "commitGate": { "mode": "default" },
  "components": ["agent-conduct", "clean-code", "full-ledger", "doc-sync", "api-docs"]
}
```

- [ ] **Step 2: 写 expected-tree(红 — 模板还没建,产物树缺 java 文件)**

Create `tests/golden/java-stack/expected-tree.json`:

```json
[
  ".gitignore",
  "AGENTS.md",
  "CLAUDE.md",
  "Makefile",
  "README.md",
  "docs/02-design/api/api-reference.md",
  "docs/02-design/doc-governance.md",
  "docs/02-design/test-spec/README.md",
  "docs/HANDOVER.md",
  "docs/ROADMAP.md",
  "docs/ledger/archive/.gitkeep",
  "docs/ledger/bugs.md",
  "docs/ledger/debt.md",
  "docs/ledger/version-log.md",
  "docs/rules/agent-conduct-rules.md",
  "docs/rules/clean-code-rules.md",
  "docs/rules/commit-rules.md",
  "docs/rules/design-completeness-rules.md",
  "docs/rules/dev-workflow-rules.md",
  "docs/rules/doc-ssot-rules.md",
  "docs/superpowers/specs/.gitkeep",
  "lefthook.yml",
  "pom.xml",
  "pre-receive-remote/pre-receive",
  "scripts/check-completeness.mjs",
  "src/main/java/.gitkeep",
  "src/test/java/.gitkeep"
]
```

- [ ] **Step 3: 写失败测试 — java-stack golden + verify + lefthook**

在 `tests/run_tests.mjs` 追加:

```javascript
test('java-stack: file tree matches golden', () => {
  const tmp = '/tmp/init-code-repo-test-java-stack';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, JSON.parse(readFileSync('tests/scenarios/java-stack/config.json', 'utf8')));
  assertTreeEqual(fileTree(tmp), JSON.parse(readFileSync('tests/golden/java-stack/expected-tree.json', 'utf8')), 'java-stack tree');
});

test('java-stack: pom.xml + Makefile verify targets + lefthook java', () => {
  const tmp = '/tmp/init-code-repo-test-java-stack-content';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, JSON.parse(readFileSync('tests/scenarios/java-stack/config.json', 'utf8')));
  const pom = readFileSync(`${tmp}/pom.xml`, 'utf8');
  assertOk(pom.includes('<artifactId>JavaApp</artifactId>'), 'pom artifactId substituted');
  assertOk(pom.includes('spotless-maven-plugin'), 'pom has spotless');
  assertOk(pom.includes('checkstyle'), 'pom has checkstyle');
  assertOk(pom.includes('spotbugs'), 'pom has spotbugs');
  assertOk(!pom.includes('{{PROJECT_NAME}}'), 'pom no leftover var');
  assertClean(pom, 'java pom.xml');
  const mk = readFileSync(`${tmp}/Makefile`, 'utf8');
  assertOk(mk.includes('mvn spotless:check'), 'Makefile lint');
  assertOk(mk.includes('mvn test'), 'Makefile test');
  assertOk(mk.includes('mvn package'), 'Makefile build');
  assertClean(mk, 'java Makefile');
  const lh = readFileSync(`${tmp}/lefthook.yml`, 'utf8');
  assertOk(lh.includes('spotless:check'), 'lefthook java-fmt');
  assertOk(lh.includes('checkstyle:check'), 'lefthook java-checkstyle');
});

test('java-stack: no dead links + clean', () => {
  const tmp = '/tmp/init-code-repo-test-java-stack-clean';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, JSON.parse(readFileSync('tests/scenarios/java-stack/config.json', 'utf8')));
  assert.equal(deadLinks(tmp).length, 0, 'java-stack dead links');
  for (const f of fileTree(tmp)) if (!f.endsWith('.gitkeep')) assertClean(readFileSync(`${tmp}/${f}`,'utf8'), `java-stack:${f}`);
});
```

并在 `agent-policy: go + python Makefile verify targets` 测试(第 393-405 行)的循环里加 java verify 断言。先扩展该测试的循环数组:

把 `for (const stack of ['go', 'python']) {` 改为 `for (const stack of ['go', 'python', 'java']) {`,并在循环内对 java 加 agent-policy verify 断言(共用现有断言:`verify-fast`/`verify-release`/`ALLOW_REAL_E2E`/`policy-check`)。

- [ ] **Step 4: 跑测试验证失败**

Run: `node --test tests/run_tests.mjs 2>&1 | grep -A3 "java-stack"`
Expected: FAIL — `templates/stacks/java/` 不存在,装配无 pom.xml/Makefile/src

- [ ] **Step 5: 实现 pom.xml.tmpl**

Create `skills/init-code-repo/templates/stacks/java/pom.xml.tmpl`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <!-- TODO: 填 groupId（如 com.example） -->
  <groupId>{{PROJECT_NAME}}</groupId>
  <artifactId>{{PROJECT_NAME}}</artifactId>
  <version>0.1.0</version>
  <packaging>jar</packaging>

  <name>{{PROJECT_NAME}}</name>
  <description>{{ONE_LINE}}</description>

  <properties>
    <!-- TODO: 填 Java 版本（如 17） -->
    <maven.compiler.release>17</maven.compiler.release>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>

  <build>
    <plugins>
      <!-- spotless: 代码格式化（对标 rust fmt） -->
      <plugin>
        <groupId>com.diffplug.spotless</groupId>
        <artifactId>spotless-maven-plugin</artifactId>
        <version>2.43.0</version>
        <configuration>
          <java>
            <googleJavaFormat>
              <version>1.22.0</version>
            </googleJavaFormat>
          </java>
        </configuration>
        <executions>
          <execution>
            <goals>
              <goal>check</goal>
            </goals>
          </execution>
        </executions>
      </plugin>
      <!-- checkstyle: 代码规范检查 -->
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-checkstyle-plugin</artifactId>
        <version>3.6.0</version>
        <configuration>
          <configLocation>google_checks.xml</configLocation>
          <failOnViolation>true</failOnViolation>
        </configuration>
        <executions>
          <execution>
            <goals>
              <goal>check</goal>
            </goals>
          </execution>
        </executions>
      </plugin>
      <!-- spotbugs: 静态缺陷分析（对标 clippy） -->
      <plugin>
        <groupId>com.github.spotbugs</groupId>
        <artifactId>spotbugs-maven-plugin</artifactId>
        <version>4.8.6.4</version>
        <configuration>
          <failOnError>true</failOnError>
        </configuration>
        <executions>
          <execution>
            <goals>
              <goal>check</goal>
            </goals>
          </execution>
        </executions>
      </plugin>
      <!-- surefire: 单元测试 -->
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-surefire-plugin</artifactId>
        <version>3.5.2</version>
      </plugin>
<!--IF:agent-policy-->
      <!-- exec: 运行（verify 门禁用） -->
      <plugin>
        <groupId>org.codehaus.mojo</groupId>
        <artifactId>exec-maven-plugin</artifactId>
        <version>3.4.1</version>
      </plugin>
<!--/IF:agent-policy-->
    </plugins>
  </build>
</project>
```

- [ ] **Step 6: 实现 Makefile.tmpl**

Create `skills/init-code-repo/templates/stacks/java/Makefile.tmpl`:

```makefile
# Makefile — {{PROJECT_NAME}} (Java/Maven)
.PHONY: lint test build run

lint:
	mvn spotless:check checkstyle:check spotbugs:check

test:
	mvn test

build:
	mvn package

run:
	mvn exec:java
<!--IF:agent-policy-->
.PHONY: policy-check verify-fast verify-ci verify-release
policy-check:
	@node scripts/check-agent-policy.mjs .

verify-fast: policy-check
	@git diff HEAD --check
	@mvn spotless:check checkstyle:check spotbugs:check
	@mvn test

verify-ci: verify-fast
	@mvn test

verify-release:
	@if [ "$$ALLOW_REAL_E2E" != "1" ]; then echo "需 ALLOW_REAL_E2E=1"; exit 2; fi
	@$(MAKE) verify-ci
	@mvn package
<!--/IF:agent-policy-->
```

- [ ] **Step 7: 实现 src 骨架目录**

Create `skills/init-code-repo/templates/stacks/java/src/main/java/.gitkeep` (空文件):

```
```

Create `skills/init-code-repo/templates/stacks/java/src/test/java/.gitkeep` (空文件):

```
```

- [ ] **Step 8: 跑测试验证通过**

Run: `node --test tests/run_tests.mjs 2>&1 | grep -E "java-stack|pass|fail" | head -20`
Expected: 三个 java-stack 测试 PASS;go+python+java verify 循环测试 PASS

- [ ] **Step 9: Commit**

```bash
git add skills/init-code-repo/templates/stacks/java/ tests/scenarios/java-stack/ tests/golden/java-stack/ tests/run_tests.mjs
git commit -m "feat(java): Maven 栈全套（pom.xml + Makefile + src 骨架）+ golden #2"
```

---

### Task 6: Node 拆分 — node-frontend(继承现有 node + 加 Makefile/tsconfig)

**Files:**
- Create: `skills/init-code-repo/templates/stacks/node-frontend/package.json.tmpl` (从现有 node/ 迁移)
- Create: `skills/init-code-repo/templates/stacks/node-frontend/Makefile.tmpl`
- Create: `skills/init-code-repo/templates/stacks/node-frontend/tsconfig.json.tmpl`
- Delete: `skills/init-code-repo/templates/stacks/node/` (整个目录)
- Test: `tests/run_tests.mjs` (node 测试迁移到 node-frontend)

- [ ] **Step 1: 写失败测试 — node-frontend 产物含 Makefile + tsconfig**

在 `tests/run_tests.mjs` 追加:

```javascript
test('node-frontend: package.json + Makefile + tsconfig present', () => {
  const tmp = '/tmp/init-code-repo-test-node-fe';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, { projectName:'P', oneLine:'L', year:'2026', stacks:['node-frontend'], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:[] });
  const tree = fileTree(tmp);
  assertOk(tree.includes('package.json'), 'package.json');
  assertOk(tree.includes('Makefile'), 'Makefile present (node-frontend aligns)');
  assertOk(tree.includes('tsconfig.json'), 'tsconfig.json');
  const mk = readFileSync(`${tmp}/Makefile`, 'utf8');
  assertOk(mk.includes('npm run'), 'Makefile wraps npm scripts');
  assertClean(mk, 'node-frontend Makefile');
  const ts = readFileSync(`${tmp}/tsconfig.json`, 'utf8');
  assertOk(ts.includes('jsx'), 'tsconfig frontend jsx');
  assertClean(ts, 'node-frontend tsconfig');
});
```

- [ ] **Step 2: 跑测试验证失败**

Run: `node --test tests/run_tests.mjs 2>&1 | grep -A3 "node-frontend: package"`
Expected: FAIL — `templates/stacks/node-frontend/` 不存在

- [ ] **Step 3: 创建 node-frontend/package.json.tmpl(迁移自现有 node + 微调)**

Create `skills/init-code-repo/templates/stacks/node-frontend/package.json.tmpl`:

```json
{
  "name": "{{PROJECT_NAME}}",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
<!--IF:agent-policy-->
    "lint": "eslint . && prettier --check .",
    "lint:fix": "eslint . --fix && prettier --write .",
    "test": "vitest run",
    "build": "vite build",
    "verify:fast": "node scripts/check-agent-policy.mjs . && git diff HEAD --check && eslint . && vitest run --quick",
    "verify:ci": "npm run verify:fast && vitest run",
    "verify:release": "test \"$ALLOW_REAL_E2E\" = \"1\" && npm run verify:ci && npm run build || (echo 需 ALLOW_REAL_E2E=1 && exit 2)"
<!--ELSE-->
    "lint": "eslint . && prettier --check .",
    "lint:fix": "eslint . --fix && prettier --write .",
    "test": "vitest run",
    "build": "vite build"
<!--/IF:agent-policy-->
  },
  "devDependencies": {
    "eslint": "^9.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "vitest": "^2.0.0",
    "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 4: 创建 node-frontend/Makefile.tmpl**

Create `skills/init-code-repo/templates/stacks/node-frontend/Makefile.tmpl`:

```makefile
# Makefile — {{PROJECT_NAME}} (Node 前端)
.PHONY: lint test build run

lint:
	npm run lint

test:
	npm test

build:
	npm run build

run:
	npm run dev
<!--IF:agent-policy-->
.PHONY: policy-check verify-fast verify-ci verify-release
policy-check:
	@node scripts/check-agent-policy.mjs .

verify-fast: policy-check
	@git diff HEAD --check
	@npm run verify:fast

verify-ci: verify-fast
	@npm run verify:ci

verify-release:
	@if [ "$$ALLOW_REAL_E2E" != "1" ]; then echo "需 ALLOW_REAL_E2E=1"; exit 2; fi
	@$(MAKE) verify-ci
	@npm run build
<!--/IF:agent-policy-->
```

- [ ] **Step 5: 创建 node-frontend/tsconfig.json.tmpl**

Create `skills/init-code-repo/templates/stacks/node-frontend/tsconfig.json.tmpl`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 6: 删除旧 node 目录**

Run: `rm -r skills/init-code-repo/templates/stacks/node/`

- [ ] **Step 7: 跑测试验证通过**

Run: `node --test tests/run_tests.mjs 2>&1 | grep -E "node-frontend: package|pass|fail" | head`
Expected: node-frontend 新测试 PASS。注意:现有 `stacks:['node']` 的测试(component/full-governance/full-product/multi-stack/standard + agent-policy node verify 测试)此时会红(旧 node 目录已删),这些在 Task 9 迁移。**本任务只确认 node-frontend 新测试过。**

- [ ] **Step 8: Commit**

```bash
git add skills/init-code-repo/templates/stacks/node-frontend/ tests/run_tests.mjs
git rm -r skills/init-code-repo/templates/stacks/node/
git commit -m "feat(node): 拆分 node-frontend（package.json + Makefile + tsconfig） #2"
```

---

### Task 7: Node 拆分 — node-backend(新建)

**Files:**
- Create: `skills/init-code-repo/templates/stacks/node-backend/package.json.tmpl`
- Create: `skills/init-code-repo/templates/stacks/node-backend/Makefile.tmpl`
- Create: `skills/init-code-repo/templates/stacks/node-backend/tsconfig.json.tmpl`
- Create: `tests/scenarios/node-backend/config.json`
- Create: `tests/golden/node-backend/expected-tree.json`
- Test: `tests/run_tests.mjs`

- [ ] **Step 1: 写 scenario config**

Create `tests/scenarios/node-backend/config.json`:

```json
{
  "projectName": "BackendSvc",
  "oneLine": "Node 后端服务",
  "year": "2026",
  "stacks": ["node-backend"],
  "repoShape": "single",
  "runtimes": [],
  "remote": "github",
  "commitGate": { "mode": "default" },
  "components": ["agent-conduct", "clean-code", "full-ledger", "doc-sync"]
}
```

- [ ] **Step 2: 写 expected-tree**

Create `tests/golden/node-backend/expected-tree.json`:

```json
[
  ".gitignore",
  "AGENTS.md",
  "CLAUDE.md",
  "Makefile",
  "README.md",
  "docs/02-design/doc-governance.md",
  "docs/02-design/test-spec/README.md",
  "docs/HANDOVER.md",
  "docs/ROADMAP.md",
  "docs/ledger/archive/.gitkeep",
  "docs/ledger/bugs.md",
  "docs/ledger/debt.md",
  "docs/ledger/version-log.md",
  "docs/rules/agent-conduct-rules.md",
  "docs/rules/clean-code-rules.md",
  "docs/rules/commit-rules.md",
  "docs/rules/design-completeness-rules.md",
  "docs/rules/dev-workflow-rules.md",
  "docs/rules/doc-ssot-rules.md",
  "docs/superpowers/specs/.gitkeep",
  "lefthook.yml",
  "package.json",
  "pre-receive-remote/pre-receive",
  "scripts/check-completeness.mjs",
  "tsconfig.json"
]
```

- [ ] **Step 3: 写失败测试**

在 `tests/run_tests.mjs` 追加:

```javascript
test('node-backend: file tree matches golden', () => {
  const tmp = '/tmp/init-code-repo-test-node-backend';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, JSON.parse(readFileSync('tests/scenarios/node-backend/config.json', 'utf8')));
  assertTreeEqual(fileTree(tmp), JSON.parse(readFileSync('tests/golden/node-backend/expected-tree.json', 'utf8')), 'node-backend tree');
});

test('node-backend: no vite, has tsx run, tsconfig node lib', () => {
  const tmp = '/tmp/init-code-repo-test-node-backend-content';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, JSON.parse(readFileSync('tests/scenarios/node-backend/config.json', 'utf8')));
  const pj = JSON.parse(readFileSync(`${tmp}/package.json`, 'utf8'));
  assertOk(!JSON.stringify(pj).includes('vite'), 'node-backend no vite');
  assertOk(pj.devDependencies && pj.devDependencies['tsx'], 'node-backend has tsx');
  const mk = readFileSync(`${tmp}/Makefile`, 'utf8');
  assertOk(mk.includes('tsx src/index.ts'), 'node-backend run tsx');
  assertClean(mk, 'node-backend Makefile');
  const ts = readFileSync(`${tmp}/tsconfig.json`, 'utf8');
  assertOk(!ts.includes('DOM'), 'node-backend tsconfig no DOM lib');
  assertClean(ts, 'node-backend tsconfig');
});

test('node-backend: no dead links + clean', () => {
  const tmp = '/tmp/init-code-repo-test-node-backend-clean';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, JSON.parse(readFileSync('tests/scenarios/node-backend/config.json', 'utf8')));
  assert.equal(deadLinks(tmp).length, 0, 'node-backend dead links');
  for (const f of fileTree(tmp)) if (!f.endsWith('.gitkeep')) assertClean(readFileSync(`${tmp}/${f}`,'utf8'), `node-backend:${f}`);
});
```

- [ ] **Step 4: 跑测试验证失败**

Run: `node --test tests/run_tests.mjs 2>&1 | grep -A3 "node-backend"`
Expected: FAIL — `templates/stacks/node-backend/` 不存在

- [ ] **Step 5: 创建 node-backend/package.json.tmpl**

Create `skills/init-code-repo/templates/stacks/node-backend/package.json.tmpl`:

```json
{
  "name": "{{PROJECT_NAME}}",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
<!--IF:agent-policy-->
    "lint": "eslint . && prettier --check .",
    "lint:fix": "eslint . --fix && prettier --write .",
    "test": "vitest run",
    "build": "tsc",
    "start": "tsx src/index.ts",
    "verify:fast": "node scripts/check-agent-policy.mjs . && git diff HEAD --check && eslint . && vitest run --quick",
    "verify:ci": "npm run verify:fast && vitest run",
    "verify:release": "test \"$ALLOW_REAL_E2E\" = \"1\" && npm run verify:ci && npm run build || (echo 需 ALLOW_REAL_E2E=1 && exit 2)"
<!--ELSE-->
    "lint": "eslint . && prettier --check .",
    "lint:fix": "eslint . --fix && prettier --write .",
    "test": "vitest run",
    "build": "tsc",
    "start": "tsx src/index.ts"
<!--/IF:agent-policy-->
  },
  "devDependencies": {
    "eslint": "^9.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.0.0",
    "tsx": "^4.0.0",
    "vitest": "^2.0.0",
    "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 6: 创建 node-backend/Makefile.tmpl**

Create `skills/init-code-repo/templates/stacks/node-backend/Makefile.tmpl`:

```makefile
# Makefile — {{PROJECT_NAME}} (Node 后端)
.PHONY: lint test build run

lint:
	npm run lint

test:
	npm test

build:
	npm run build

run:
	npx tsx src/index.ts
<!--IF:agent-policy-->
.PHONY: policy-check verify-fast verify-ci verify-release
policy-check:
	@node scripts/check-agent-policy.mjs .

verify-fast: policy-check
	@git diff HEAD --check
	@npm run verify:fast

verify-ci: verify-fast
	@npm run verify:ci

verify-release:
	@if [ "$$ALLOW_REAL_E2E" != "1" ]; then echo "需 ALLOW_REAL_E2E=1"; exit 2; fi
	@$(MAKE) verify-ci
	@npm run build
<!--/IF:agent-policy-->
```

- [ ] **Step 7: 创建 node-backend/tsconfig.json.tmpl**

Create `skills/init-code-repo/templates/stacks/node-backend/tsconfig.json.tmpl`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 8: 跑测试验证通过**

Run: `node --test tests/run_tests.mjs 2>&1 | grep -E "node-backend|pass|fail" | head -20`
Expected: 三个 node-backend 测试 PASS

- [ ] **Step 9: Commit**

```bash
git add skills/init-code-repo/templates/stacks/node-backend/ tests/scenarios/node-backend/ tests/golden/node-backend/ tests/run_tests.mjs
git commit -m "feat(node): 新增 node-backend 子栈（tsx + vitest，无 vite）+ golden #2"
```

---

### Task 8: Go 补齐 — go.mod + golangci-lint 降级 + 修 build 目标

**Files:**
- Create: `skills/init-code-repo/templates/stacks/go/go.mod.tmpl`
- Modify: `skills/init-code-repo/templates/stacks/go/Makefile.tmpl` (lint 升级 + build 修复)
- Test: `tests/run_tests.mjs` (扩展 go 测试)

- [ ] **Step 1: 写失败测试 — go.mod 存在 + golangci-lint 降级 + build 修复**

在 `tests/run_tests.mjs` 追加:

```javascript
test('go: go.mod present + Makefile golangci-lint fallback + build target fixed', () => {
  const tmp = '/tmp/init-code-repo-test-go-stack';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, { projectName:'GoApp', oneLine:'L', year:'2026', stacks:['go'], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:[] });
  const tree = fileTree(tmp);
  assertOk(tree.includes('go.mod'), 'go.mod present');
  const gomod = readFileSync(`${tmp}/go.mod`, 'utf8');
  assertOk(gomod.includes('module GoApp'), 'go.mod module substituted');
  assertOk(!gomod.includes('{{PROJECT_NAME}}'), 'go.mod no leftover var');
  assertClean(gomod, 'go.mod');
  const mk = readFileSync(`${tmp}/Makefile`, 'utf8');
  assertOk(mk.includes('golangci-lint'), 'Makefile golangci-lint');
  assertOk(mk.includes('command -v golangci-lint'), 'Makefile golangci-lint fallback guard');
  assertOk(mk.includes('go build -o bin/GoApp .'), 'build target fixed (single . not ./...)');
  assertOk(!mk.includes('go build -o bin/GoApp ./...'), 'no broken ./... with -o');
  assertClean(mk, 'go Makefile');
});
```

- [ ] **Step 2: 跑测试验证失败**

Run: `node --test tests/run_tests.mjs 2>&1 | grep -A3 "go: go.mod present"`
Expected: FAIL — go.mod 不存在;Makefile 无 golangci-lint;build 目标仍是 `./...`

- [ ] **Step 3: 创建 go.mod.tmpl**

Create `skills/init-code-repo/templates/stacks/go/go.mod.tmpl`:

```
module {{PROJECT_NAME}}

go 1.22
```

> 注:`go 1.22` 作为默认版本占位,dev-conductor 阶段可调。

- [ ] **Step 4: 修改 go/Makefile.tmpl — lint 升级 + build 修复**

把 `skills/init-code-repo/templates/stacks/go/Makefile.tmpl` 的 lint 与 build 段改为(保留 verify 三档结构):

```makefile
# Makefile — {{PROJECT_NAME}} (Go)
.PHONY: lint test build run

lint:
	@command -v golangci-lint >/dev/null && golangci-lint run . \
	  || (echo "[lint] golangci-lint 未安装，降级 gofmt+vet（非阻断）" && gofmt -l . && go vet ./...)

test:
	go test ./...

build:
	go build -o bin/{{PROJECT_NAME}} .

run:
	go run .
<!--IF:agent-policy-->
.PHONY: policy-check verify-fast verify-ci verify-release
policy-check:
	@node scripts/check-agent-policy.mjs .

verify-fast: policy-check
	@git diff HEAD --check
	@command -v golangci-lint >/dev/null && golangci-lint run . \
	  || (gofmt -l . && go vet ./...)
	@go test ./...

verify-ci: verify-fast
	@go test ./...

verify-release:
	@if [ "$$ALLOW_REAL_E2E" != "1" ]; then echo "需 ALLOW_REAL_E2E=1"; exit 2; fi
	@$(MAKE) verify-ci
	@go build -o bin/{{PROJECT_NAME}} .
<!--/IF:agent-policy-->
```

- [ ] **Step 5: 跑测试验证通过**

Run: `node --test tests/run_tests.mjs 2>&1 | grep -E "go: go.mod present|go \+ python|pass|fail" | head`
Expected: 新 go 测试 PASS;现有 go+python verify 循环测试(若已在 Task 5 扩展含 java)仍 PASS

- [ ] **Step 6: Commit**

```bash
git add skills/init-code-repo/templates/stacks/go/ tests/run_tests.mjs
git commit -m "feat(go): 补 go.mod + golangci-lint 非阻断降级 + 修 build 目标 #2"
```

---

### Task 9: 现有 scenario 迁移 node → node-frontend

**Files:**
- Modify: `tests/scenarios/component/config.json`
- Modify: `tests/scenarios/full-governance/config.json`
- Modify: `tests/scenarios/full-product/config.json`
- Modify: `tests/scenarios/multi-stack/config.json`
- Modify: `tests/scenarios/standard/config.json`
- Modify: `tests/golden/component/expected-tree.json`
- Modify: `tests/golden/full-governance/expected-tree.json`
- Modify: `tests/golden/full-product/expected-tree.json`
- Modify: `tests/golden/multi-stack/expected-tree.json`
- Modify: `tests/golden/standard/expected-tree.json`
- Modify: `tests/run_tests.mjs` (agent-policy node verify 测试迁移)

> 依赖:Task 6(node-frontend 模板就位)。本任务把所有 `stacks:["node"]` 迁移为 `["node-frontend"]`,并更新对应 golden tree(产物从单 package.json → package.json + Makefile + tsconfig.json)。

- [ ] **Step 1: 迁移 5 个 scenario config 的 stacks 字段**

对以下 5 个文件,把 `"stacks": ["rust", "node"]` 或 `"stacks": ["node"]` 中的 `node` 改为 `node-frontend`:

- `tests/scenarios/component/config.json`:`["node"]` → `["node-frontend"]`
- `tests/scenarios/full-governance/config.json`:`["rust", "node"]` → `["rust", "node-frontend"]`
- `tests/scenarios/full-product/config.json`:`["rust", "node"]` → `["rust", "node-frontend"]`
- `tests/scenarios/multi-stack/config.json`:`["rust", "node"]` → `["rust", "node-frontend"]`
- `tests/scenarios/standard/config.json`:`["node"]` → `["node-frontend"]`

- [ ] **Step 2: 迁移 agent-policy node verify 测试**

`tests/run_tests.mjs` 第 372-391 行 `agent-policy: node package.json verify scripts valid JSON both modes` 测试,把两处 `stacks:['node']` 改为 `stacks:['node-frontend']`,测试名改为 `agent-policy: node-frontend package.json verify scripts valid JSON both modes`:

```javascript
test('agent-policy: node-frontend package.json verify scripts valid JSON both modes', () => {
  const tmpNode = '/tmp/init-code-repo-test-verify-node-fe';
  rmSync(tmpNode, { recursive: true, force: true });
  assemble(tmpNode, { projectName:'P', oneLine:'L', year:'2026', stacks:['node-frontend'], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:['agent-policy'] });
  const pj = JSON.parse(readFileSync(`${tmpNode}/package.json`, 'utf8'));
  assertOk(pj.scripts['verify:fast'], 'node-frontend has verify:fast');
  assertOk(pj.scripts['verify:release'], 'node-frontend has verify:release');
  assertOk(pj.scripts['verify:release'].includes('ALLOW_REAL_E2E'), 'node-frontend verify:release has guard');
  assertOk(pj.scripts['verify:fast'].includes('check-agent-policy'), 'node-frontend verify:fast calls check-agent-policy');
  assertOk(pj.scripts.lint, 'lint still present');
  const tmpNode2 = '/tmp/init-code-repo-test-verify-node-fe-no';
  rmSync(tmpNode2, { recursive: true, force: true });
  assemble(tmpNode2, { projectName:'P', oneLine:'L', year:'2026', stacks:['node-frontend'], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:[] });
  const pj2 = JSON.parse(readFileSync(`${tmpNode2}/package.json`, 'utf8'));
  assertOk(!pj2.scripts['verify:fast'], 'no verify:fast without agent-policy');
  assertOk(pj2.scripts.lint, 'lint still present without agent-policy');
  assertClean(readFileSync(`${tmpNode2}/package.json`, 'utf8'), 'node-frontend package.json no-ap clean');
});
```

- [ ] **Step 3: 跑测试看哪些 golden tree 需更新**

Run: `node --test tests/run_tests.mjs 2>&1 | grep -E "tree matches golden|fail" | head -20`
Expected: component/full-governance/full-product/multi-stack/standard 的 tree 测试 FAIL(产物树新增 Makefile + tsconfig.json,expected 未更新)

- [ ] **Step 4: 更新 5 个 golden expected-tree.json**

对每个失败的 scenario,跑装配器看实际产物树,把 `expected-tree.json` 更新为含 `Makefile` + `tsconfig.json`(node-frontend 拆分后新增)。具体做法——对每个 scenario 执行:

```bash
# 临时装配看实际树
node -e "import('./skills/init-code-repo/assemble.mjs').then(m=>m.assemble('/tmp/regen-x', JSON.parse(require('fs').readFileSync('tests/scenarios/<name>/config.json','utf8'))))" 
node tests/lib/tree.mjs /tmp/regen-x 2>/dev/null || node -e "import('./tests/lib/tree.mjs').then(m=>console.log(JSON.stringify(m.fileTree('/tmp/regen-x'),null,2)))"
```

把输出写入对应 `tests/golden/<name>/expected-tree.json`。5 个 scenario 各做一次:`component`、`full-governance`、`full-product`、`multi-stack`、`standard`。

> 关键变化:每个含 node-frontend 的 scenario 产物树新增 `Makefile` 和 `tsconfig.json` 两项(原本只有 `package.json`)。手动核对:确认 `package.json` 仍在,新增的 Makefile 是 node-frontend 的(包装 npm script),tsconfig.json 是前端导向。

- [ ] **Step 5: 跑全套测试验证通过**

Run: `node --test tests/run_tests.mjs 2>&1 | tail -5`
Expected: 全套 PASS(含迁移后的 5 个 scenario + node-frontend verify 测试)

- [ ] **Step 6: Commit**

```bash
git add tests/scenarios/ tests/golden/ tests/run_tests.mjs
git commit -m "test: 5 scenario 迁移 node→node-frontend + golden tree 更新 #2"
```

---

## 阶段 3 · 集成验证(串行)

### Task 10: multi-stack scenario 扩展(加 java + node-frontend) + 全套验证

**Files:**
- Modify: `tests/scenarios/multi-stack/config.json` (Task 9 已迁 node-frontend,本任务加 java)
- Modify: `tests/golden/multi-stack/expected-tree.json`
- Modify: `tests/run_tests.mjs` (multi-stack 断言扩展)

- [ ] **Step 1: 扩展 multi-stack config 加 java**

`tests/scenarios/multi-stack/config.json`(Task 9 后已是 `["rust", "node-frontend"]`),改为:

```json
{
  "projectName": "MultiStack",
  "oneLine": "多栈 monorepo",
  "year": "2026",
  "stacks": ["rust", "node-frontend", "java", "go"],
  "repoShape": "monorepo",
  "runtimes": [],
  "remote": "github",
  "commitGate": { "mode": "default" },
  "components": ["full-ledger", "doc-sync"]
}
```

- [ ] **Step 2: 写失败测试 — multi-stack 含 java/go/node-frontend 多栈产物**

`tests/run_tests.mjs` 的 `multi-stack: glue files + pre-receive present` 测试(第 245-267 行)扩展断言:

```javascript
test('multi-stack: glue files + pre-receive present', () => {
  const tmp = '/tmp/init-code-repo-test-multi-stack';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, JSON.parse(readFileSync('tests/scenarios/multi-stack/config.json', 'utf8')));
  const tree = fileTree(tmp);
  const expected = JSON.parse(readFileSync('tests/golden/multi-stack/expected-tree.json', 'utf8'));
  assertTreeEqual(tree, expected, 'multi-stack tree');
  assertOk(tree.includes('Makefile'), 'rust/go/java Makefile present');
  assertOk(tree.includes('package.json'), 'node-frontend package.json present');
  assertOk(tree.includes('tsconfig.json'), 'node-frontend tsconfig present');
  assertOk(tree.includes('pom.xml'), 'java pom.xml present');
  assertOk(tree.includes('go.mod'), 'go.mod present');
  assertOk(tree.includes('src/main/java/.gitkeep'), 'java src skeleton');
  assertOk(tree.includes('pre-receive-remote/pre-receive'), 'pre-receive present (remote=github)');
  assertOk(tree.includes('docs/ledger/debt.md'), 'debt.md present (full-ledger)');
  assertOk(tree.includes('docs/ledger/version-log.md'), 'version-log.md present (full-ledger)');
  const mk = readFileSync(`${tmp}/Makefile`, 'utf8');
  assertOk(mk.includes('# Makefile — MultiStack'), 'Makefile has project name');
  assertClean(mk, 'multi-stack Makefile');
  const pj = readFileSync(`${tmp}/package.json`, 'utf8');
  assertOk(pj.includes('"name": "MultiStack"'), 'package.json has project name');
  assertClean(pj, 'multi-stack package.json');
  const pom = readFileSync(`${tmp}/pom.xml`, 'utf8');
  assertOk(pom.includes('<artifactId>MultiStack</artifactId>'), 'pom has project name');
  assertClean(pom, 'multi-stack pom.xml');
  const lh = readFileSync(`${tmp}/lefthook.yml`, 'utf8');
  assertOk(lh.includes('cargo fmt'), 'rust block');
  assertOk(lh.includes('eslint'), 'node block');
  assertOk(lh.includes('spotless:check'), 'java block');
  assertOk(lh.includes('golangci-lint'), 'go block');
  assertClean(lh, 'multi-stack lefthook');
});
```

- [ ] **Step 3: 跑测试验证失败**

Run: `node --test tests/run_tests.mjs 2>&1 | grep -A5 "multi-stack"`
Expected: FAIL — expected-tree 未含 pom.xml/go.mod/tsconfig.json/src/main/java/.gitkeep

- [ ] **Step 4: 重新生成 multi-stack golden tree**

```bash
rm -rf /tmp/regen-multi
node -e "import('./skills/init-code-repo/assemble.mjs').then(m=>m.assemble('/tmp/regen-multi', JSON.parse(require('fs').readFileSync('tests/scenarios/multi-stack/config.json','utf8'))))"
node -e "import('./tests/lib/tree.mjs').then(m=>console.log(JSON.stringify(m.fileTree('/tmp/regen-multi'),null,2)))" > tests/golden/multi-stack/expected-tree.json
```

- [ ] **Step 5: 跑测试验证通过**

Run: `node --test tests/run_tests.mjs 2>&1 | grep -E "multi-stack|pass|fail" | head`
Expected: multi-stack 测试 PASS

- [ ] **Step 6: Commit**

```bash
git add tests/scenarios/multi-stack/config.json tests/golden/multi-stack/expected-tree.json tests/run_tests.mjs
git commit -m "test(multi-stack): 扩展含 java+go+node-frontend 四栈 + golden #3"
```

---

### Task 11: 全套验证 + 死链 + 装配一致性收口

**Files:**
- 无新文件;最终验证步骤

- [ ] **Step 1: 跑完整测试套件**

Run: `node --test tests/run_tests.mjs 2>&1 | tail -20`
Expected: 全部 PASS(含所有 scenario golden + 内容断言 + 死链 + clean)

- [ ] **Step 2: 验收标准逐项核对**

按 spec 第 9 节验收标准,逐项跑断言:

```bash
# 标准 1: 测试全绿(Step 1 已做)
# 标准 3: lefthook 五语言块
node -e "
import('./skills/init-code-repo/assemble.mjs').then(m=>{
  const fs=require('fs');
  m.assemble('/tmp/verify-all', {projectName:'X',oneLine:'L',year:'2026',stacks:['rust','node-frontend','go','python','java'],repoShape:'single',runtimes:[],remote:'none',commitGate:{mode:'default'},components:[]});
  const lh=fs.readFileSync('/tmp/verify-all/lefthook.yml','utf8');
  for(const b of ['cargo fmt','eslint','gofmt','ruff check','spotless:check']) console.log(b, lh.includes(b));
})"
```
Expected: 五项全 true

```bash
# 标准 4: doc-sync 正则含 .java
grep -o "\.(rs|ts|tsx|js|jsx|py|go|java)" skills/init-code-repo/templates/core/lefthook.yml.tmpl
```
Expected: 输出含 `java`

```bash
# 标准 5: dev-conductor 含完整 mvn 命令
grep "mvn archetype:generate" skills/dev-conductor/SKILL.md
```
Expected: 输出完整命令(无 `...`)

- [ ] **Step 3: 死链 + 一致性最终检查**

```bash
# 死链(测试已含,单独再确认 java-stack/node-backend)
node --test tests/run_tests.mjs 2>&1 | grep -E "dead links" | head
```
Expected: 无 dead links 失败

- [ ] **Step 4: 装配一致性(assemble ↔ SKILL)**

测试套件的 `SKILL.md: exists and documents assembly contract` 已覆盖一致性。确认:

```bash
node --test tests/run_tests.mjs 2>&1 | grep "documents assembly"
```
Expected: PASS

- [ ] **Step 5: 最终 Commit(若有收尾改动)**

```bash
git status
# 若有未提交改动:
git add -A
git commit -m "test: 多语言栈支持对齐收口验证 #3"
```

- [ ] **Step 6: 更新 HANDOVER / memory(可选)**

更新 `docs/HANDOVER.md` 首条交接记录本轮完成项;若用户确认验收通过,按 CLAUDE.md 自动提交规则打 tag。

---

## Self-Review Checklist(计划自审)

**1. Spec 覆盖**:
- 3.1 Java/Maven → Task 5 ✅
- 3.2 Node 拆分 → Task 6(frontend)+ Task 7(backend) ✅
- 3.3 Go 补齐 → Task 8 ✅
- 3.4 Python lefthook → Task 2(lefthook python 块) ✅
- 3.5 横切修复(lefthook/doc-sync/dev-conductor) → Task 2 + Task 4 ✅
- 4.1 node 派生态 → Task 1 ✅
- 4.2 VERIFY_FAST_CMD → Task 1 ✅
- 4.3 三处同步(assemble/SKILL/golden) → Task 1 + Task 3 + 各 Task golden ✅
- 5.1 新 scenario(java-stack/node-backend) → Task 5 + Task 7 ✅
- 5.2 现有 scenario 迁移 → Task 9 ✅
- 6. 实现分解(阶段1 串行 / 阶段2 并行 / 阶段3 集成) → Task 1-4 / 5-9 / 10-11 ✅

**2. 占位符扫描**:无 TBD/TODO 省略(模板内 TODO 是设计本身);所有代码块完整。✅

**3. 类型/命名一致性**:
- `node-frontend`/`node-backend`/`java` 全计划一致 ✅
- `node` 派生 cond 在 assemble.mjs/lefthook/SKILL 三处一致 ✅
- `VERIFY_FAST_CMD` 派生逻辑在 assemble.mjs 与 SKILL.md 一致 ✅
- Java plugin 名(spotless/checkstyle/spotbugs)在 pom.xml/Makefile/lefthook 三处一致 ✅

**4. 依赖排序**:Task 1-4(横切)先于 Task 5-9(语言栈);Task 6 先于 Task 9(迁移依赖 node-frontend 模板);Task 9 先于 Task 10(multi-stack 扩展依赖迁移完成)。✅
