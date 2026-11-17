# 离线复现方法

这些是本轮调查样本，不是新增模板功能或业务测试。原始输出见 [PROBES.txt](PROBES.txt)。检查器由现有assemble生成，样本仅写入独立临时目录；没有安装依赖、联网、Git变更或清理工作区。临时目录保留。

在目标仓根目录，以已安装的本地Node运行下面代码即可重新观察P01–P12；`exit=0`有时正是需要揭示的漏检结果，不代表验收通过。下面的生成参数只用于区分检查器边界，不代表支持全部参数组合；P06/P12有意送入文档禁止但装配器没有拒绝的组合。

```bash
node --input-type=module <<'JS'
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { assemble } from './skills/init-code-repo/assemble.mjs';
const root = mkdtempSync(join(tmpdir(), 'harness-audit-'));
const base = {projectName:'AuditDemo',oneLine:'离线审计样本',year:'2026',stacks:[],runtimes:[],remote:'none',repoShape:'single',commitGate:{mode:'default'},components:[]};
function gen(name, overrides={}) {
  const dir=join(root,name); mkdirSync(dir);
  assemble(dir,{...base,...overrides}); return dir;
}
function check(dir,script,args=[]) {
  const r=spawnSync(process.execPath,[join(dir,'scripts',script),...args],{cwd:dir,encoding:'utf8'});
  return {exit:r.status,stdout:r.stdout.trim(),stderr:r.stderr.trim()};
}
function out(id, value) { console.log(JSON.stringify({id,...value})); }
console.log('Temporary fixtures retained at '+root);
const scenarios=readdirSync('tests/scenarios',{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name).sort();
out('P01',{scenarioCount:scenarios.length,scenarios,rootAgents:existsSync('AGENTS.md'),rootClaude:existsSync('CLAUDE.md'),rootCompletenessScript:existsSync('scripts/check-completeness.mjs')});
const lite=gen('lightweight');
out('P02',check(lite,'check-completeness.mjs',['--stage','P0']));
out('P03',check(lite,'check-completeness.mjs',['--stage','garbage']));
const empty=gen('empty-headings',{components:['product-docs']});
for(const f of ['docs/00-charter/concept.md','docs/00-charter/guardrails.md','docs/00-charter/vision-strategy.md','docs/02-design/north-star.md','docs/ROADMAP.md'])
  writeFileSync(join(empty,f),'# 标题\n\n## 空节\n');
out('P04',check(empty,'check-completeness.mjs',['--stage','P0']));
const policy=gen('policy-no-stack',{components:['agent-policy']});
out('P05',{makefile:existsSync(join(policy,'Makefile')),hookCallsMake:readFileSync(join(policy,'lefthook.yml'),'utf8').includes('make verify-fast')});
const deployment=gen('deployment-java',{stacks:['java'],components:['deployment-gates']});
const mk=readFileSync(join(deployment,'Makefile'),'utf8');
out('P06',{verifyFast:/^verify-fast:/m.test(mk),verifyK8s:/^verify-k8s:/m.test(mk),verifyRelease:/^verify-release:/m.test(mk)});
const flow=gen('dev-flow',{components:['dev-flow-skills']});
out('P07',{hasCanonicalSkill:existsSync(join(flow,'docs/skills/dev-flow/SKILL.md')),entryHasSkillPointer:readFileSync(join(flow,'AGENTS.md'),'utf8').includes('docs/skills/')});
const duplicate=gen('duplicate-id',{components:['dev-flow-skills']});
mkdirSync(join(duplicate,'src'),{recursive:true});
writeFileSync(join(duplicate,'docs/02-design/test-spec/case.md'),'L1-DEMO-01\n');
writeFileSync(join(duplicate,'src/case.ts'),'// 覆盖:§1 L1-DEMO-01\nfunction a(){}\n// 覆盖:§1 L1-DEMO-01\nfunction b(){}\n');
out('P08',check(duplicate,'check-test-spec-consistency.mjs'));
const java=gen('java-id',{components:['dev-flow-skills']});
mkdirSync(join(java,'src'),{recursive:true});
writeFileSync(join(java,'docs/02-design/test-spec/case.md'),'L1-JAVA-01\n');
writeFileSync(join(java,'src/Case.java'),'// 覆盖:§1 L1-JAVA-01\n');
out('P09',check(java,'check-test-spec-consistency.mjs'));
const l3=gen('l3-id',{components:['dev-flow-skills']});
writeFileSync(join(l3,'docs/02-design/test-spec/case.md'),'L3-DEMO-01\n');
out('P10',check(l3,'check-test-spec-consistency.mjs'));
const zh=gen('zh-policy',{components:['agent-policy'],naming:'zh'});
out('P11',check(zh,'check-agent-policy.mjs',['.']));
const both=gen('node-both',{stacks:['node-frontend','node-backend']});
out('P12',{assembled:true,scripts:JSON.parse(readFileSync(join(both,'package.json'),'utf8')).scripts});
JS
```

静态复核示例（均只读）：

```bash
git status --short --branch
git rev-parse HEAD
git ls-files .specify                  # 在源仓运行
rg -n 'verify-release' Makefile scripts # 在源仓运行，未命中返回1
nl -ba skills/init-code-repo/assemble.mjs
nl -ba skills/init-code-repo/templates/core/scripts/check-completeness.mjs.tmpl
```

没有运行完整`npm test`，因为其中部署样本会执行临时仓`git add`/`git commit`，而本轮要求不提交；也没有运行源Maven/policy-check等可能依赖环境或联网的检查。后续实施另行执行适当验证，不把本轮离线观察宣传为完整测试全绿。
