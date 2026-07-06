# 提交规范

## 强制格式

`<type>(<scope>): <description> #<issue>`

正则：`^(feat|fix|docs|style|refactor|perf|test|chore)\(.*\): .+\s#\d+$`

type：feat/fix/docs/style/refactor/perf/test/chore。subject 中文祈使句，不带句号。

## 通用约定

- 小步提交、原子提交。
- 敏感信息（.env / credentials / API key）禁止进 commit。
- 不 amend 已发布 commit，不 force push main，不 --no-verify 跳过 hook（除非用户显式批准）。
- vibe coding 产出的 commit 须加 `Co-Authored-By: <模型署名> <noreply@anthropic.com>`。
