import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fixture, put, project, cli, seedDesign, convergenceFor } from './helpers.mjs';
const domain='specs/001-submission/spec.md';
function prepared(){
 const root=fixture();seedDesign(root);
 const t=cli(root,['create','--title','完成保护回归','--domain',domain],'task-cli.mjs').report;
 t.risk={level:'T1',rationale:'本地机制验证'};t.scope=['docs'];t.impact={paths:['docs'],contractChanges:false,dataChanges:false,securityChanges:false,externalEffects:false,productionEffects:false,behaviorChanges:false,requiredTestLayers:[]};
 t.criteriaRefs=[{id:'SUB-R1',path:domain}];t.criteriaResults=[{id:'SUB-R1',status:'pass',checkIds:['core.policy']}];
 t.stage='handover';t.completedStages=['orient','specify','design','analyze','implement','verify','converge'].map(stage=>({stage,note:'实际机制回归'}));
 t.convergence=convergenceFor(root,t);put(root,'docs/ROADMAP.md','# 路线\n\n## P0\n范围已明确。\n');put(root,'docs/HANDOVER.md',`# 当前交接\n\n${t.id} 验收记录。\n`);save(root,t);return {root,t};
}
function save(root,t){put(root,`.harness/local/tasks/${t.id}/task.json`,t);}
function complete(root,t){return cli(root,['--task',t.id,'--intent','complete']);}
function finish(root,t,r){return cli(root,['finish','--task',t.id,'--evidence',r.report.evidencePath],'task-cli.mjs');}
function append(root,path,text){put(root,path,readFileSync(join(root,path),'utf8')+'\n'+text+'\n');}
test('CP-C01: draft and task self-reference cannot serve as acceptance authority',()=>{
 for(const self of [false,true]){const {root,t}=prepared();const path=self?`.harness/local/tasks/${t.id}/task.json`:'specs/001-submission/tasks/tasks.md';if(!self)put(root,path,'DRAFT-ONLY-AC1 invented acceptance');t.criteriaRefs=[{id:'DRAFT-ONLY-AC1',path}];t.criteriaResults=[{id:'DRAFT-ONLY-AC1',status:'pass',checkIds:['core.policy']}];save(root,t);const r=complete(root,t);assert.equal(r.report.taskReady,false,r.stdout);assert.match(r.stdout,/验收.*(?:正式|权威|来源)/);}
});
test('CP-C02: explicitly impacted registered domain must have an owner disposition',()=>{
 const {root,t}=prepared();t.impact.paths.push('specs/002-execution/spec.md');save(root,t);const r=complete(root,t);assert.equal(r.report.taskReady,false,r.stdout);assert.match(r.stdout,/owner|遗漏/);
 t.convergence=convergenceFor(root,t);save(root,t);assert.equal(complete(root,t).status,0);
});
test('CP-C03: empty, heading-only, empty-leaf and placeholder system/policy cannot complete',()=>{
 for(const key of ['constitution','systemDesign','domainModel'])for(const body of ['', '# only title\n','# Title\n\n## Empty\n','# Title\n\n## Scope\nTODO\n']){const {root,t}=prepared();const p=JSON.parse(readFileSync(join(root,'.harness/project.json')));put(root,p.documents[key],body);const r=complete(root,t);assert.equal(r.report.taskReady,false,`${key}: ${body}\n${r.stdout}`);assert.match(r.stdout,/骨架|空|底座|内容/);}
});
test('CP-C01: declared acceptance sources and transitive excluded evidence enter receipt closure',()=>{
 const {root,t}=prepared();const acceptance='docs/acceptance.md',detail='external-evidence/input.md';
 append(root,domain,'- 专门权威（测试）：[验收](../../docs/acceptance.md)');put(root,acceptance,'# Long term acceptance\n\nAC-DECLARED: acceptance baseline. [input](../external-evidence/input.md)\n');put(root,detail,'# Input\n\nOriginal baseline.\n');project(root,p=>p.fingerprintExcludes.push('external-evidence'));
 t.criteriaRefs=[{id:'AC-DECLARED',path:acceptance}];t.criteriaResults=[{id:'AC-DECLARED',status:'pass',checkIds:['core.policy']}];t.convergence=convergenceFor(root,t);save(root,t);
 const r=complete(root,t);assert.equal(r.status,0,r.stdout);assert.ok(r.report.consumedInputs?.some(x=>x.path===detail&&x.sha256));
 put(root,detail,'# Input\n\nChanged acceptance baseline.\n');const f=finish(root,t,r);assert.equal(f.status,2,f.stdout);assert.match(f.stdout,/过期|输入/);
});
test('CP-C05: unfinished nonblocking debt requires a shared destination and closure criteria',()=>{
 const {root,t}=prepared();t.convergence.openItems=[{id:'DEBT-001',status:'open',blocking:false}];save(root,t);let r=complete(root,t);assert.equal(r.report.taskReady,false,r.stdout);assert.match(r.stdout,/遗留|承接|去向/);
 append(root,domain,'DEBT-001：延后优化；关闭条件：基准在固定负载下通过。');t.convergence.openItems[0].transfer={path:domain,id:'DEBT-001',closureCriteria:'基准在固定负载下通过'};append(root,'docs/HANDOVER.md',`未闭环 DEBT-001 见 ${domain}，基准在固定负载下通过后关闭。`);save(root,t);r=complete(root,t);assert.equal(r.status,0,r.stdout);const f=finish(root,t,r);assert.equal(f.status,0,f.stdout);assert.ok(f.report.nextActions.some(x=>x.includes('DEBT-001')&&x.includes(domain)));
});
test('CP-C05: false, local-only or unfindable debt transfers remain blocked',()=>{
 for(const path of ['.harness/local/debt.md',domain]){const {root,t}=prepared();if(path.startsWith('.harness'))put(root,path,'DEBT-002 closure criterion');t.convergence.openItems=[{id:'DEBT-002',status:'open',blocking:false,transfer:{path,id:'DEBT-002',closureCriteria:'closure criterion'}}];append(root,'docs/HANDOVER.md',`DEBT-002 ${path}`);save(root,t);assert.equal(complete(root,t).report.taskReady,false);}
});
test('CP-C08: an adjacent tag must belong to the mapped declaration, including parameterized tests',()=>{
 const root=fixture({components:['dev-flow-skills']});put(root,'docs/02-design/test-spec/case.md','L1-MAP-01\n');put(root,'src/cases.test.mjs',"// 覆盖:§1 L1-MAP-01\ntest('actual',()=>{});\ntest('wrong',()=>{});\n");put(root,'.harness/test-map.json',{cases:[{id:'L1-MAP-01',file:'src/cases.test.mjs',selector:'wrong'}]});assert.equal(cli(root,['--only','core.traceability']).status,1);
 put(root,'src/cases.test.mjs',"// 覆盖:§1 L1-MAP-01\ntest.each([1,2])('actual %s',value=>{});\n");put(root,'.harness/test-map.json',{cases:[{id:'L1-MAP-01',file:'src/cases.test.mjs',selector:'actual %s'}]});assert.equal(cli(root,['--only','core.traceability']).status,0);
});
test('CP-C09: explicit readable history evidence is allowed, unmarked active draft dependency is not',()=>{
 const {root,t}=prepared();const path='specs/001-submission/implement/old-review.md';put(root,path,'# Earlier review\n\nHistorical observations.\n');append(root,domain,'- 历史证据：[旧审查](implement/old-review.md)');let r=complete(root,t);assert.equal(r.status,0,r.stdout);put(root,path,'# Earlier review\n\nChanged historical input.\n');assert.equal(finish(root,t,r).status,2);
 append(root,domain,'[当前验收依赖](implement/old-review.md)');r=complete(root,t);assert.equal(r.report.taskReady,false,r.stdout);assert.match(r.stdout,/活设计依赖/);
});
test('CP-INDEX: existing domain layout uses index authority while undeclared parallel specs fail',()=>{
 const {root}=prepared();const target='docs/design/orders.md';put(root,target,readFileSync(join(root,domain),'utf8').replaceAll('../../docs/','../'));rmSync(join(root,'specs/001-submission'),{recursive:true});put(root,'specs/README.md',readFileSync(join(root,'specs/README.md'),'utf8').replace('001-submission/spec.md','../docs/design/orders.md'));const r=cli(root,['--only','core.design']);assert.equal(r.status,0,r.stdout);
 put(root,'docs/design/orders-v2.md','# Parallel unregistered design\n');assert.notEqual(cli(root,['--only','core.design']).status,0);
});
test('CP-C08-PY: parameterized Python decorators preserve association with their declaration',()=>{
 const root=fixture({components:['dev-flow-skills']});put(root,'docs/02-design/test-spec/case.md','L1-PARAM-01\n');put(root,'tests/test_case.py','# 覆盖:§1 L1-PARAM-01\n@pytest.mark.parametrize(\n    "value",\n    [1, 2],\n)\ndef test_values(value):\n    assert value > 0\n');put(root,'.harness/test-map.json',{cases:[{id:'L1-PARAM-01',file:'tests/test_case.py',selector:'test_values'}]});assert.equal(cli(root,['--only','core.traceability']).status,0);
});
test('CP-C01-TRANSITIVE: active design cannot smuggle a draft dependency through an ordinary linked document',()=>{
 const {root,t}=prepared();append(root,domain,'[解释](../../docs/interpretation.md)');put(root,'docs/interpretation.md','# 解释\n\n[当前验收](../specs/001-submission/tasks/acceptance.md)\n');put(root,'specs/001-submission/tasks/acceptance.md','# 临时验收\n\nNot an authority.\n');const r=complete(root,t);assert.equal(r.report.taskReady,false,r.stdout);assert.match(r.stdout,/活设计依赖/);
});
test('CP-INPUTS: configuration consumed by completion cannot exclude itself from freshness',()=>{
 const {root,t}=prepared();project(root,p=>p.fingerprintExcludes.push('.harness/project.json'));const r=complete(root,t);assert.equal(r.status,0,r.stdout);project(root,p=>p.completeness.stage='P1');const f=finish(root,t,r);assert.equal(f.status,2,f.stdout);assert.match(f.stdout,/过期|输入/);
});
test('CP-HANDOVER: a handover may point to local execution material without promoting it to authority',()=>{
 const {root,t}=prepared();append(root,'docs/HANDOVER.md',`[本地执行](../.harness/local/tasks/${t.id}/task.json)`);const r=complete(root,t);assert.equal(r.status,0,r.stdout);assert.equal(finish(root,t,r).status,0);
});
test('CP-INDEX-IDENTITY: one domain identity cannot register two parallel authorities',()=>{
 const {root}=prepared();put(root,'specs/003-parallel/spec.md',readFileSync(join(root,domain),'utf8'));append(root,'specs/README.md','| 001-submission | 同一域的另一入口 | [平行正文](003-parallel/spec.md) |');const r=cli(root,['--only','core.design']);assert.notEqual(r.status,0,r.stdout);assert.match(r.stdout,/重复|唯一|平行/);
});
test('CP-C02-PUBLIC: explicitly changed shared model and policy owners require dispositions',()=>{
 for(const key of ['domainModel','constitution','domainIndex']){const {root,t}=prepared();const p=JSON.parse(readFileSync(join(root,'.harness/project.json')));t.impact.paths=[p.documents[key]];save(root,t);let r=complete(root,t);assert.equal(r.report.taskReady,false,r.stdout);assert.match(r.stdout,/owner|遗漏/);t.convergence=convergenceFor(root,t);save(root,t);r=complete(root,t);assert.equal(r.status,0,r.stdout);}
});
test('CP-REVIEW-COMMAND: directly executed ignored scripts and declared cwd inputs invalidate old completion',()=>{
 for(const changed of ['script','input']){const {root,t}=prepared();put(root,'.harness/local/check-work/check.mjs','process.exit(0);\n');put(root,'.harness/local/check-work/config.json','{"accepted":true}\n');project(root,p=>p.checks.push({id:'local.direct',kind:'command',group:'test',argv:['node','check.mjs'],cwd:'.harness/local/check-work',inputs:['config.json'],profiles:['fast','ci'],required:true,timeoutSeconds:5,effect:'local-validation'}));const r=complete(root,t);assert.equal(r.status,0,r.stdout);put(root,changed==='script'?'.harness/local/check-work/check.mjs':'.harness/local/check-work/config.json',changed==='script'?'process.exit(1);\n':'{"accepted":false}\n');const f=finish(root,t,r);assert.equal(f.status,2,f.stdout);assert.match(f.stdout,/过期|输入/);}
});
test('CP-REVIEW-DIRECTORY: valid source directory navigation is readable and type-bound',()=>{
 const {root,t}=prepared();append(root,domain,'[源码目录](../../src/)');const r=complete(root,t);assert.equal(r.status,0,r.stdout);assert.ok(r.report.consumedInputs.some(x=>x.path==='src'&&x.type==='directory'));assert.equal(finish(root,t,r).status,0);
});
test('CP-REVIEW-PARAM: punctuation string data is never parsed as decorator syntax',()=>{
 const root=fixture({components:['dev-flow-skills']});put(root,'docs/02-design/test-spec/case.md','L1-PARAM-01\n');put(root,'tests/test_case.py','# 覆盖:§1 L1-PARAM-01\n@pytest.mark.parametrize("value", [")", "(", "]", "[", "}", "{"])\ndef test_values(value):\n    assert value\n');put(root,'.harness/test-map.json',{cases:[{id:'L1-PARAM-01',file:'tests/test_case.py',selector:'test_values'}]});assert.equal(cli(root,['--only','core.traceability']).status,0);
});
test('CP-REVIEW-ROOT: a root-level domain has the same parallel-authority protection as nested domains',()=>{
 const {root}=prepared();const body=readFileSync(join(root,domain),'utf8').replaceAll('../../docs/','docs/');put(root,'orders.md',body);rmSync(join(root,'specs/001-submission'),{recursive:true});put(root,'specs/README.md',readFileSync(join(root,'specs/README.md'),'utf8').replace('001-submission/spec.md','../orders.md'));assert.equal(cli(root,['--only','core.design']).status,0);put(root,'orders-v2.md',body);const r=cli(root,['--only','core.design']);assert.notEqual(r.status,0,r.stdout);assert.match(r.stdout,/设计副本|平行|索引/);
});
test('CP-REVIEW-RUNTIME: input changes during validation block readiness and declared directory inputs retain all bytes',()=>{
 for(const during of [false,true]){const {root,t}=prepared();put(root,'.harness/local/inputs/value.json','{"before":true}\n');put(root,'.harness/local/check.mjs',during?'import {writeFileSync} from "node:fs";writeFileSync(".harness/local/inputs/value.json", "changed");\n':'process.exit(0);\n');project(root,p=>p.checks.push({id:'local.mutate',kind:'command',group:'test',argv:['node','.harness/local/check.mjs'],inputs:['.harness/local/inputs'],cwd:'.',profiles:['fast'],required:true,timeoutSeconds:5,effect:'local-validation'}));const r=complete(root,t);if(during){assert.equal(r.status,2,r.stdout);assert.equal(r.report.taskReady,false);assert.ok(r.report.results.some(x=>x.id==='consumed-inputs.changed'));}else{assert.equal(r.status,0,r.stdout);put(root,'.harness/local/inputs/value.json','{"after":true}\n');assert.equal(finish(root,t,r).status,2);}}
});
test('CP-REVIEW-JS-PARAM: punctuation strings inside each data do not alter call syntax',()=>{
 const root=fixture({components:['dev-flow-skills']});put(root,'docs/02-design/test-spec/case.md','L1-PARAM-01\n');put(root,'src/param.test.mjs','// 覆盖:§1 L1-PARAM-01\ntest.each([")", "(", "]", "[", "}", "{"])("values %s", value=>{});\n');put(root,'.harness/test-map.json',{cases:[{id:'L1-PARAM-01',file:'src/param.test.mjs',selector:'values %s'}]});assert.equal(cli(root,['--only','core.traceability']).status,0);
});
test('CP-REVIEW-ABSOLUTE: an absolute argv path inside this repository is still a consumed local script',()=>{
 const {root,t}=prepared();const path='.harness/local/absolute-check.mjs';put(root,path,'process.exit(0);\n');project(root,p=>p.checks.push({id:'local.absolute',kind:'command',group:'test',argv:[process.execPath,join(root,path)],cwd:'.',profiles:['fast'],required:true,timeoutSeconds:5,effect:'local-validation'}));const r=complete(root,t);assert.equal(r.status,0,r.stdout);put(root,path,'process.exit(1);\n');assert.equal(finish(root,t,r).status,2);
});
test('CP-REVIEW-PREFIX: a string expression between a tag and declaration cannot masquerade as a modifier',()=>{
 const root=fixture({components:['dev-flow-skills']});put(root,'docs/02-design/test-spec/case.md','L1-PARAM-01\n');put(root,'src/param.test.mjs','// 覆盖:§1 L1-PARAM-01\n"async"\nfunction actual() {}\n');put(root,'.harness/test-map.json',{cases:[{id:'L1-PARAM-01',file:'src/param.test.mjs',selector:'actual'}]});assert.equal(cli(root,['--only','core.traceability']).status,1);
});
test('CP-ROUND2-ARGV: a whole-repository input must block before producing unusable ready evidence',()=>{
 const {root,t}=prepared();put(root,'src/check.mjs','process.exit(0);\n');project(root,p=>p.checks.push({id:'local.whole-repo',kind:'command',group:'test',argv:['node','src/check.mjs','.'],cwd:'.',profiles:['fast'],required:true,timeoutSeconds:5,effect:'local-validation'}));const r=complete(root,t);
 // Before the fix this proves the receipt is unusable immediately, without edits.
 if(r.report.taskReady){const f=finish(root,t,r);assert.equal(f.status,2,f.stdout);assert.match(f.stdout,/过期|输入/);}
 assert.equal(r.status,2,r.stdout);assert.equal(r.report.taskReady,false);assert.ok(r.report.results.some(x=>x.id==='preflight'&&x.status==='blocked'));assert.match(r.stdout,/输出.*(?:范围|目录)|产物/);assert.match(r.stdout,/缩小|源输入|narrow/);
});
test('CP-ROUND2-INPUTS: declared directory inputs cannot contain reserved producers; narrow source inputs can finish',()=>{
 for(const input of ['.','.harness/local','.harness/local/runs','.harness/local/assets','.harness/local/asset-state','.harness/local/quarantine']){const {root,t}=prepared();put(root,'src/check.mjs','process.exit(0);\n');if(input!=='.'&&input!=='.harness/local')put(root,`${input}/existing.txt`,'producer state\n');project(root,p=>p.checks.push({id:'local.declared-root',kind:'command',group:'test',argv:['node','src/check.mjs'],inputs:[input],cwd:'.',profiles:['fast'],required:true,timeoutSeconds:5,effect:'local-validation'}));const r=complete(root,t);assert.equal(r.status,2,`${input}\n${r.stdout}`);assert.equal(r.report.taskReady,false);assert.ok(r.report.results.some(x=>x.id==='preflight'&&x.status==='blocked'));assert.match(r.stdout,/输出.*(?:范围|目录)|产物/);}
 const {root,t}=prepared();put(root,'src/check.mjs','process.exit(0);\n');project(root,p=>p.checks.push({id:'local.narrow',kind:'command',group:'test',argv:['node','src/check.mjs','src'],inputs:['src'],cwd:'.',profiles:['fast'],required:true,timeoutSeconds:5,effect:'local-validation'}));const r=complete(root,t);assert.equal(r.status,0,r.stdout);assert.equal(r.report.taskReady,true);assert.equal(finish(root,t,r).status,0);
});
