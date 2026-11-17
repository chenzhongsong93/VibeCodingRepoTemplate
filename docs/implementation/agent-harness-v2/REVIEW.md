# v2独立代码审阅与处理

使用gpt-6-astra/high做只读实现符合性审阅，依据当时执行计划与已批准设计。它没有独立证明原方案选对了目标；后续Astra/xhigh整体重审已确认该方案弱化核心，故本审阅通过不能证明核心吸纳完成。审阅者报告10项Important和4项较低评级发现，无Critical；主代理按实际用户影响将4项一并纳入修复。独立同意不是正确性证据；下列行为反例及最终全套测试才是本轮验证依据。

| 发现 | 修复与可复现覆盖 |
|---|---|
| 不存在根的祖先symlink/普通文件父路径造成越界或部分装配 | 全量路径先查已有祖先、目录类型和symlink，ASM-06、PLAT-06 |
| 升级替换期间丢失并发写入 | 每文件替换前重验，失败回滚仅恢复仍等于本批产物的文件；保护竞争方改动与保留journal，REV-11 |
| 指纹忽略symlink与源码中的build目录 | symlink输入blocked；生成产物只按项目显式fingerprintExcludes排除，普通build源码纳入，REV-01/02/15 |
| 注释声明被当测试 | 词法受限适配忽略注释/字符串/正则，声明映射与执行证据分开，REV-03/14 |
| 内置layer标签冒充L3 | 层级只由本次实际command满足；L3必须required、release适用、real-e2e，REV-04 |
| complete降低项目文档阶段 | 低于配置的--stage被拒绝，REV-05 |
| make lint/test/build为空壳 | 包装统一入口的真实group，空组blocked；REV-06 |
| 聚合输出symlink和空注册表仍pass | 输入/输出inside路径检查、空注册表blocked，不自动clone，REV-07 |
| 常规任务检查漏重复ID/目录不符 | core.tasks统一检查唯一性和路径，REV-08 |
| T1完整验证默认被profile冲突阻断 | complete总纳入基础完整性，T1可fast，其余验收不降低，TASK-07 |
| 保留文件名可被custom改掉 | 工具契约文件不能改名，REV-09 |
| Rust格式检查漏迁 | 注册cargo fmt --check，REV-12 |
| deployment选项没有实际检查 | 注册必需infra JSON/shell及项目解析契约；无输入/解析器blocked，REV-13 |
| cancelled/blocked可结束 | finish只接受in-progress，REV-10 |

上述每类修复都有本轮先失败再通过的测试；原始红绿日志位于本轮临时日志/harness-v2-*，关键结果汇总在REPORT与VALIDATION。另补可选域模板及Claude薄入口旧文案回归（ASM-07/PLAT-07），没有改写v1 golden。

## 未裁决的外部验证边界

- macOS/Git Bash/WSL、真实Claude/Codex等加载：没有相应实测环境，保持未验证。
- 各语言工具版本、真实构建/部署/E2E：没有安装或连接项目外部环境，只验证本地工具调度和状态语义。
- 自然语言验收、批准引用真实性、测试语义充分性：不是静态结构或本轮有限测试可证明；仍须独立判断与人工流程。

主代理认可这些证据边界，不因本地全绿将它们改写为完成。没有再次派复审代替针对性红绿测试，也没有提交、发布或清理工作区。
