# 多语言栈支持对齐设计

- **日期**:2026-07-31
- **主题**:把模板对 Java / JS / Golang 的支持度拉齐到 Rust / Python 基准线
- **范围**:新增 Java(Maven)栈、Node 拆分前后端子栈、Go 补齐(go.mod + golangci-lint)、Python 补 lefthook 钩子,及三处横切修复
- **状态**:设计已与用户确认,待实现

## 1. 背景与动机

模板仓库 `VibeCodingRepoTemplate` 的"语言支持度"由四层构成:① `templates/stacks/<lang>/` 骨架胶水文件,② clean-code 门禁(lint 工具配置),③ verify-fast/ci/release 三档质量门,④ `lefthook.yml` 的 pre-commit 语言钩子。

以 rust / python 为基准线(四层齐全)对照现状,发现:

| 语言 | 骨架 | clean-code 门禁 | verify 三档 | lefthook 钩子 |
|------|------|----------------|------------|--------------|
| rust | ✅ Makefile + dev-conductor `cargo new` | ✅ fmt+clippy `-D warnings` | ✅ | ✅ rust-fmt/clippy |
| python | ✅ Makefile + pyproject.toml | ✅ ruff+mypy | ✅ | ❌ 缺 |
| go | ⚠️ 仅 Makefile(无 go.mod) | ⚠️ 偏弱(gofmt+vet,无 golangci-lint) | ✅ | ❌ 缺 |
| node | ⚠️ 硬编码 vite 前端(无 Makefile) | ✅ eslint+prettier | ✅(走 npm script 非 make) | ✅ web-lint/fmt |
| **java** | **❌ 完全缺失** | **❌** | **❌** | **❌** |

附带不一致:
- `lefthook.yml` 只有 rust/node 两个语言条件块。
- `doc-sync` pre-push 正则 `\.(rs|ts|tsx|js|jsx|py|go)$` 漏 `.java`。
- `dev-conductor` 描述里写了 "mvn" 但无 java stack 模板支撑(空承诺)。
- `assemble.mjs` 的 `VERIFY_FAST_CMD` 派生硬编码 `stacks[0] === 'node'`,Node 拆分后会失配。
- go 的 build 目标 `go build -o bin/{{PROJECT_NAME}} ./...` 对多包 `-o` 写法有误。

## 2. 目标与非目标

### 目标
- Java/Maven 全套四层支持。
- Node 拆为 node-frontend / node-backend 两个子栈,各自四层齐全。
- Go 补齐 go.mod + golangci-lint(非阻断降级) + 修 build 目标。
- Python 补 lefthook 钩子。
- 三处横切修复(lefthook 语言块补全、doc-sync 正则、dev-conductor 脚手架表)。
- 所有改动经 golden 测试覆盖,assemble ↔ SKILL 一致性保持。

### 非目标(YAGNI)
- 不引入 Gradle(Java 唯用 Maven,避免膨胀)。
- 不引入 Spring Boot / 任何框架脚手架。
- 不引入 Node monorepo 子栈。
- Java 的 Docker 集成(jib/distroless)只留 TODO 占位,不在本 spec 实装。
- 不改 dev-conductor 的整体编排逻辑,仅补脚手架命令表。

## 3. 各语言栈设计

### 3.1 Java / Maven(新建)

新增目录 `templates/stacks/java/`:

| 文件 | 内容要点 |
|------|---------|
| `pom.xml.tmpl` | groupId/artifactId = `{{PROJECT_NAME}}`(占位)、Java 版本 `TODO` 占位、必装 plugin:spotless(google-java-format fmt)+ checkstyle + spotbugs + surefire(test)。`<!--IF:agent-policy-->` 激活时挂 verify profile |
| `Makefile.tmpl` | lint=`mvn spotless:check checkstyle:check spotbugs:check`、test=`mvn test`、build=`mvn package`、run=`mvn exec:java`。verify-fast/ci/release 三档对齐 rust 模式 |
| `src/main/java/.gitkeep` | Maven 约定式主代码目录骨架(空,dev-conductor 阶段填) |
| `src/test/java/.gitkeep` | Maven 约定式测试目录骨架 |

lefthook java 块(`<!--IF:java-->`):
- java-fmt:`mvn spotless:check`,glob `*.java`
- java-checkstyle:`mvn checkstyle:check`,glob `*.java`

dev-conductor:java 栈脚手架命令为 `mvn archetype:generate`(生成约定式骨架),非裸 `mvn`。

### 3.2 Node 拆分:node-frontend / node-backend

**3.2.1 `templates/stacks/node-frontend/`**(继承现有 node 内容并增强):

| 文件 | 要点 |
|------|------|
| `package.json.tmpl` | vite + vitest + eslint + prettier + tsconfig。scripts: lint/test/build/verify:fast/ci/release(现状保留,微调) |
| `Makefile.tmpl` | **新增**——包装 npm script 对齐其它栈(lint/test/build/run + verify 三档),消除"node 无 Makefile"不一致 |
| `tsconfig.json.tmpl` | 前端导向(jsx/dom lib) |

**3.2.2 `templates/stacks/node-backend/`**(新建):

| 文件 | 要点 |
|------|------|
| `package.json.tmpl` | tsx + vitest + eslint + prettier + tsconfig,**无 vite、无 vite build**。build=`tsc`(出 CJS)或省略。run=`tsx src/index.ts`。verify 三档 |
| `Makefile.tmpl` | 同 frontend 结构,run=`tsx src/index.ts` |
| `tsconfig.json.tmpl` | 后端导向(node lib,无 dom) |

**3.2.3 激活集与 lefthook**:
- 激活集 cond 拆为 `node-frontend` + `node-backend`(因为骨架文件不同)。
- lefthook 的 `<!--IF:node-->` 块**保留不动**,由新增的 **node 派生态**触发:`node = stacks 含 node-frontend 或 node-backend`。模板条件块名不改,最小改动。
- lefthook web-lint/web-fmt 对前后端工具栈相同(eslint+prettier),合并一个块即可。

### 3.3 Go 补齐

| 文件 | 要点 |
|------|------|
| `go.mod.tmpl` | **新增**——module `{{PROJECT_NAME}}`、go 版本 `TODO` 占位 |
| `Makefile.tmpl`(改) | lint 升级:`command -v golangci-lint >/dev/null && golangci-lint run \|\| (gofmt -l . && go vet ./...)`(非阻断降级)。**修 build 目标**:`go build -o bin/{{PROJECT_NAME}} .`(去 `./...`,单 main 包) |
| lefthook go 块(`<!--IF:go-->`) | go-fmt(gofmt -l)+ go-vet(go vet)+ golangci-lint(非阻断) |

### 3.4 Python 补 lefthook 钩子

python Makefile 门禁已齐全,只缺 git 钩子触发。lefthook 加 `<!--IF:python-->` 块:
- python-ruff:`ruff check`,glob `*.py`
- python-mypy:`mypy`,glob `*.py`

无新文件。

### 3.5 横切修复(3 处)

1. **lefthook 语言条件块补全**:java/go/python 块加入,与 rust/node 并列(见 3.1/3.3/3.4)。
2. **doc-sync 正则**:`\.(rs|ts|tsx|js|jsx|py|go|java)$` 加 `|java`。
3. **dev-conductor 脚手架命令表**:兑现 `mvn archetype:generate`(java)、`npm create vite`(node-frontend)、`tsx init` 或手工(node-backend)、`go mod init`(go)、`uv init`/`cargo new`(python/rust)——补全并加 java 行。

## 4. 装配机制变更

### 4.1 激活集推导

`conditional.mjs` 的 `activeConds` 不处理 stacks(stacks 在 `assemble.mjs` 的 `extraConds` 里直传)。变更:

**`assemble.mjs` `extraConds`**:stacks 直传已支持任意栈名(第 24 行 `for (const s of config.stacks || []) conds.push(s)`),新增 `java`/`node-frontend`/`node-backend` 无需改这行——栈名即 cond 名。

**新增 node 派生态**(明确放在 `extraConds` 内,紧挨 stacks 直传行,职责一致——stacks 相关派生都在 extraConds):
```js
const stacks = config.stacks || [];
if (stacks.includes('node-frontend') || stacks.includes('node-backend')) conds.push('node');
```
这样 lefthook 的 `<!--IF:node-->` 块由派生 cond 触发,模板条件块名不改。

> `activeConds` 只处理组件派生态(full-workflow/remote-hook/agent-policy),stacks 派生归 `extraConds`,两者职责分离,本 spec 不打破。

### 4.2 VERIFY_FAST_CMD 派生修正

`assemble.mjs` 第 65 行当前:
```js
const verifyFastCmd = stacks.length === 1 && stacks[0] === 'node'
  ? 'npm run verify:fast' : 'make verify-fast';
```

Node 拆分后 `stacks[0] === 'node'` 永不成立。变更:
```js
const isNodeOnly = stacks.length === 1
  && (stacks[0] === 'node-frontend' || stacks[0] === 'node-backend');
const verifyFastCmd = isNodeOnly ? 'npm run verify:fast' : 'make verify-fast';
```
> 注:node-frontend/backend 均新增 Makefile 包装 `npm run verify:fast`,故 `make verify-fast` 也能工作;但 lefthook `{{VERIFY_FAST_CMD}}` 仍走 npm script(与 package.json scripts 对齐),故保留 npm 分支。

### 4.3 三处同步(任何新增 cond/stack/变量都要落)

| 落点 | 文件 | 改动 |
|------|------|------|
| 装配脚本 | `assemble.mjs` | node 派生态 + VERIFY_FAST_CMD 修正 |
| 装配文档 | `SKILL.md` | 阶段1"主栈"选项表、激活集推导第4节、组件清单副作用列 |
| golden 测试 | `tests/golden/*/expected-tree.json` + 新 scenario | 验证装配产物树 |

## 5. 测试策略

### 5.1 新 scenario + golden

| scenario | config.stacks | 验证 |
|----------|--------------|------|
| `java-stack`(新) | `[java]` | pom.xml/Makefile/src 骨架树 + verify 三档 + lefthook java 块 |
| `node-backend`(新) | `[node-backend]` | node 拆分后 backend 产物树 + Makefile |
| `multi-stack`(扩) | `[rust, node-frontend, java, go]` | 多栈共存 + lefthook 多语言块 |

### 5.2 现有 scenario 迁移(破坏性)

5 个 scenario 的 `stacks: ["node"]` 迁移为 `node-frontend`(默认前端,因现状是 vite):
- `component`、`full-governance`、`full-product`、`multi-stack`、`standard`

对应 `expected-tree.json` 更新(产物从 `package.json` 单文件 → `package.json + Makefile + tsconfig.json`,路径从 `stacks/node/` → `stacks/node-frontend/`)。

### 5.3 横切断言

在 `full-governance` 等 scenario 验证:
- doc-sync 正则含 `java`
- lefthook 含各语言块(按激活栈)

### 5.4 TDD 顺序

1. 先写 scenario + expected-tree(红)
2. 写模板(绿)
3. `node tests/run_tests.mjs` 全套验证

### 5.5 装配一致性

`tests/run_tests.mjs` 已有 assemble ↔ SKILL 一致性检查,自动覆盖。

## 6. 实现分解

### 阶段 1 · 横切基线(串行,阻塞后续)

| 子任务 | 文件 |
|--------|------|
| 1a. 激活集 + 派生态 + VERIFY_FAST_CMD | `assemble.mjs` |
| 1b. lefthook 模板 | `templates/core/lefthook.yml.tmpl`(加 java/go/python 块 + doc-sync 正则) |
| 1c. SKILL.md 文档同步 | 阶段1主栈选项表、激活集推导第4节、组件清单副作用列 |
| 1d. dev-conductor 脚手架表 | `skills/dev-conductor/SKILL.md` |

### 阶段 2 · 各语言栈(并行,互不依赖)

| 并行 agent | 子任务 | 依赖 |
|-----------|--------|------|
| agent-java | java 栈全套 + java-stack scenario/golden | 阶段1 |
| agent-node-fe | node-frontend + 迁移现有 5 个 scenario | 阶段1 |
| agent-node-be | node-backend + node-backend scenario/golden | 阶段1 |
| agent-go | go.mod + Makefile 改 + golangci-lint 降级 + 修 build 目标 | 阶段1 |
| agent-python | 验证 lefthook python 块(阶段1 已做) | 阶段1 |

### 阶段 3 · 集成验证(串行)

- 扩展 multi-stack scenario(加 java + node-frontend)
- 跑 `node tests/run_tests.mjs` 全套 golden
- 死链校验(SKILL.md 阶段5)
- 装配一致性(assemble ↔ SKILL)

## 7. 边界与错误处理

- **Java 版本占位**:pom.xml 的 `<maven.compiler.release>` 留 `TODO`,阶段1不强制问(避免录取过重),dev-conductor 阶段填。
- **Node 拆分向后兼容**:现有 5 个 scenario 的 `node` → `node-frontend` 迁移(破坏性,用户已确认接受)。模板仍在演进期,外部已建仓库升级需手工迁移 stacks 字段。
- **golangci-lint 缺失**:`command -v` 探测,Makefile/lefthook 均降级为 gofmt+vet,不阻断。遵循模板"零外部依赖"原则。
- **go build 目标**:改为 `go build -o bin/{{PROJECT_NAME}} .`(单 main 包);多模块仓留 TODO 让用户调。
- **Java Docker 集成**:仅留 TODO 占位,不在本 spec 实装。

## 8. 交付物清单

### 新增文件
- `templates/stacks/java/{pom.xml,Makefile}.tmpl` + `src/main/java/.gitkeep` + `src/test/java/.gitkeep`
- `templates/stacks/node-frontend/{package.json,Makefile,tsconfig.json}.tmpl`
- `templates/stacks/node-backend/{package.json,Makefile,tsconfig.json}.tmpl`
- `templates/stacks/go/go.mod.tmpl`
- `tests/scenarios/java-stack/config.json` + `tests/golden/java-stack/expected-tree.json`
- `tests/scenarios/node-backend/config.json` + `tests/golden/node-backend/expected-tree.json`

### 修改文件
- `templates/stacks/node/` → 删除(拆分后旧目录移除)
- `templates/stacks/go/Makefile.tmpl`(lint 升级 + build 修复)
- `templates/core/lefthook.yml.tmpl`(java/go/python 块 + doc-sync 正则)
- `assemble.mjs`(node 派生态 + VERIFY_FAST_CMD)
- `skills/init-code-repo/SKILL.md`(主栈表 + 激活集 + 组件副作用)
- `skills/dev-conductor/SKILL.md`(脚手架表)
- 现有 5 个 scenario 迁移 `node` → `node-frontend` + 对应 expected-tree.json

## 9. 验收标准

1. `node tests/run_tests.mjs` 全套绿(含新 java-stack/node-backend scenario)
2. rust/python/go/java/node-fe/node-be 六栈各自 verify 三档门禁齐全
3. lefthook 含五种语言条件块(rust/node/go/python/java)
4. doc-sync 正则含 `.java`
5. dev-conductor 脚手架表含 mvn 且有 java stack 支撑(无空承诺)
6. SKILL.md ↔ assemble.mjs 一致性检查通过
7. 死链扫描通过
