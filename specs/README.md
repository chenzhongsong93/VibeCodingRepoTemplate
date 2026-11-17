# 长期特性功能设计索引

一个域一份spec.md，按职责演进，同域变更就地更新；不是按任务/版本分目录。系统公共约束见[总体设计](../docs/00-system/system-design.md)，政策见[宪法](../.specify/memory/constitution.md)。

| 域 | 职责 | 权威 |
|---|---|---|
| 001-repo-assembly | 新仓装配、存量认领整改、兼容和升级 | [装配与升级](001-repo-assembly/spec.md) |
| 002-development-governance | e2e方法链、设计权威与工程资产生命周期 | [开发与设计治理](002-development-governance/spec.md) |
| 003-verification | 检查执行、证据边界和收敛保护 | [验证与证据](003-verification/spec.md) |

过程plan/tasks/implement默认本地忽略；已存在研究/实施/历史记录仅供追溯，不替代上述当前设计。域拆分/合并/废弃须记录职责接管与引用承接，不自动删除。
