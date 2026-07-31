# RETROSPECTIVE.md — 需求复盘

> 每轮需求验收通过后记录。CLAUDE.md 复盘机制要求。

---

## 2026-07-31 · 多语言栈支持对齐（Java/Maven + Node 拆分 + Go 补齐）

**需求**:把模板对 Java/JS/Golang 支持拉齐到 Rust/Python 基准线（骨架+clean-code+门禁管控四层）。
**交付**:16 commit，92 测试全绿，tag `release-multi-stack-language-support`。

### 做得好（值得保留/推广）

1. **brainstorming→writing-plans→subagent-driven 全链路纪律**:每步 HARD-GATE 防止跳步,spec/plan 都落盘 commit,实现才动手。spec 四节分节确认,plan 11 task bite-sized。
2. **subagent-driven 两阶段 review（spec+质量）抓出多个计划瑕疵**:
   - EL-004（Makefile 多栈同名覆盖）——Task 9 review 发现,Task 10 修复
   - I-1（node-frontend package.json 漏 dev script）——final review 发现并修
   - 断言精度（vite/vitest、cargo test/go test 子串碰撞）——implementer 两次正确识别并改精确匹配
3. **TDD 红绿循环留痕**:每 task 先写失败测试（红）再实现（绿）,红绿证据进 commit。模板仓库 TDD 形态特殊:golden 测试（scenario→expected-tree）是红绿入口。
4. **过渡态管理**:Task 6 删 node/ 后 6 个红测试是预期（Task 9 修）,不盲目"修"红测试。implementer/reviewer 都理解过渡态,不误判为回归。
5. **EL-004 修复方案**:把"writeTree 覆盖 bug"重新表述为"条件块分段问题"（对标 lefthook.yml.tmpl 并列块先例）,零引擎改动。同时绑定"修复 + 加测试暴露"（四栈命令共存断言 + snapshot）,防回归。

### 做得差（根因 + 如何避免）

1. **plan 设计时没预见到 writeTree 同名覆盖（EL-004）**:
   - 根因:写 plan 时只勘察了 stack 模板内容,没勘察 assemble.mjs 的多栈写入行为（writeTree 写根路径,后写覆盖）。
   - 改进:**涉及"多栈/多实例装配"的 plan,必须先勘察装配/写入机制的同名文件行为**。写 plan 前读 writeTree 代码。
2. **plan 的 package.json 漏 dev script（I-1）**:
   - 根因:plan 里 Makefile 用 `npm run dev` 但 package.json 没对应 `dev: "vite"`——plan 自身不一致。测试只验 Makefile 文本含 `npm run dev`,没验 package.json 真能跑（EL-004 闭环时强调的"验内容共存而非仅验存在"的反面）。
   - 改进:**plan 写完后交叉核对:Makefile 调用的所有 npm script 在 package.json 都有定义**。
3. **测试断言用子串匹配误中（vite/vitest、cargo test/go test）**:
   - 根因:写断言时没考虑子串碰撞（`vite` 是 `vitest` 子串;`cargo test` 含 `go test` 子串）。
   - 改进:**断言优先精确匹配（key 存在性 / 完整命令串）,避免裸子串 includes**。
4. **expected-tree 预测只验文件清单,没验内容冲突**:
   - 根因:multi-stack golden 只预测文件清单,没预见多栈 Makefile 内容覆盖。测试只断言 `mk.includes('# Makefile — MultiStack')`（项目名）,不验 cargo/npm/go/java 命令共存——掩盖 bug。
   - 改进:**多栈 scenario 的 golden 不仅要验文件清单,要验关键文件内容共存**（已落实:multi-stack 加四栈命令共存断言 + Makefile snapshot）。

### 规则提取建议（供用户级规范）

以下规则值得提取到用户级 CLAUDE.md 或生成专用 skill（待用户决定）:

| 规则 | 触发场景 | 内容 |
|------|---------|------|
| 多栈装配勘察 | plan 涉及多栈/多实例装配 | 写 plan 前必读装配器的写入机制（同名文件行为）,不能只看模板内容 |
| plan 交叉核对 | plan 含 Makefile 调用 npm script | Makefile 调用的 script 必须在 package.json 有定义,plan 自审时核对 |
| 断言精确匹配 | 写测试断言 | 优先 key 存在性/完整命令串,避免裸子串 includes（防 vite/vitest、cargo test/go test 碰撞） |
| golden 内容共存 | 多栈 scenario golden | 不仅验文件清单,验关键文件内容含所有激活栈的命令/配置 |

### 文档更新

- ERROR_LOG.md:EL-004（已修复,方案 A）、EL-005（新登记,dual-node package.json 覆盖,待 per-stack spec）
- spec:`docs/superpowers/specs/2026-07-31-multi-stack-language-support-design.md`
- plan:`docs/superpowers/plans/2026-07-31-multi-stack-language-support.md`
- EL-004 修复 plan:`.claude/plans/snazzy-mixing-dongarra.md`

### 遗留技术债（不阻塞,已登记）

- EL-005:dual-node package.json/tsconfig 覆盖（短期 SKILL.md 互斥说明,长期 per-stack 命名空间 spec）
- Minor:gofmt 阻断强度跨栈不一致、golangci-lint 降级 echo 措辞、dual-node lint 重复、vitest --quick flag 待实测
