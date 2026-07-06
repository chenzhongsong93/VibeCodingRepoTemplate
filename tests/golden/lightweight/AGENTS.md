# AGENTS.md — DemoTool

> 本文件是本仓 SSOT 入口。所有 agent（人/AI）动手前必读。
> 多端兼容：Claude CLI 经 `CLAUDE.md` 转引至此；codex/opencode/kimicode/zcode 直读本文件。

## 项目一句话

一个小工具

## 强制规则索引（违反 = 构建阻断）

| 规则 | 文档 |
|------|------|
| 研发流程 | [docs/rules/dev-workflow-rules.md](docs/rules/dev-workflow-rules.md) |
| 提交规范 | [docs/rules/commit-rules.md](docs/rules/commit-rules.md) |
| SSOT/文档治理 | [docs/rules/doc-ssot-rules.md](docs/rules/doc-ssot-rules.md) |

## 代码仓结构

```
DemoTool/
├── docs/
│   ├── 02-design/test-spec/   # 测试设计 SSOT
│   ├── ROADMAP.md              # 前瞻路线图（与 HANDOVER 配对）
│   ├── HANDOVER.md             # 进展+交接（与 ROADMAP 配对）
│   ├── ledger/                 # 累积型台账（bugs）
│   ├── rules/                  # 强制规则
│   └── superpowers/specs/      # 过程稿（非 SSOT）
├── AGENTS.md                   # 本文件
└── CLAUDE.md                   # 委托指针
```

## 文档三类

详见 [docs/rules/doc-ssot-rules.md](docs/rules/doc-ssot-rules.md)：正式 SSOT / 累积型台账 / 过程文档。

## 回应语言

所有回应、设计文档、规划文档一律使用中文。
