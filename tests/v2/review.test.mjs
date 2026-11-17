import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,symlinkSync,existsSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';import {spawnSync} from 'node:child_process';
import {fixture,put,project,cli,seedDesign,convergenceFor} from './helpers.mjs';
import {buildFiles} from '../../skills/init-code-repo/assemble.mjs';
import {planUpgrade} from '../../skills/init-code-repo/upgrade.mjs';
const cfg={projectName:'Example',oneLine:'本地示例',year:'2026',stacks:[],runtimes:[],remote:'none',components:[]};
function ready(root,risk='T1'){
 seedDesign(root);
 const t=cli(root,['create','--title','审阅反例','--domain','specs/001-submission/spec.md'],'task-cli.mjs').report;
 t.risk={level:risk,rationale:'审阅验证'};t.scope=['src'];t.impact={paths:['src'],contractChanges:false,dataChanges:false,securityChanges:false,externalEffects:false,productionEffects:risk==='T3',behaviorChanges:false,requiredTestLayers:[]};t.criteriaRefs=[{id:'SUB-R1',path:'specs/001-submission/spec.md'}];t.criteriaResults=[{id:'SUB-R1',status:'pass',checkIds:['core.policy']}];t.approvalRefs=[{kind:'design',source:'用户批准'},{kind:'real-e2e',source:'用户逐项批准'}];t.rollbackRef='task.md内回滚方案';t.stage='handover';t.completedStages=['orient','specify','design','analyze','implement','verify','converge'].map(stage=>({stage,note:'已完成'}));
 t.convergence=convergenceFor(root,t);put(root,`.harness/local/tasks/${t.id}/task.json`,t);put(root,'docs/HANDOVER.md',`# 当前交接\n\n${t.id} 验收与遗留记录。\n`);put(root,'docs/ROADMAP.md','# 路线\n\n## P0\n范围验收已定义。\n');return t;
}
test('REV-01: symlink input cannot produce a complete verification receipt',()=>{
 const root=fixture(),external=mkdtempSync(join(tmpdir(),'harness-linked-input-'));put(external,'value','good');put(root,'src/keep.txt','source');symlinkSync(join(external,'value'),join(root,'src/input.txt'));
 const t=ready(root);const r=cli(root,['--profile','ci','--task',t.id,'--intent','complete']);assert.equal(r.status,2);assert.match(r.stdout,/symlink/);
});
test('REV-02: source under src/build remains in the input fingerprint',()=>{
 const root=fixture();put(root,'src/build/source.txt','one');const t=ready(root);const r=cli(root,['--profile','ci','--task',t.id,'--intent','complete']);assert.equal(r.status,0,r.stdout);
 put(root,'src/build/source.txt','two');const f=cli(root,['finish','--task',t.id,'--evidence',r.report.evidencePath],'task-cli.mjs');assert.equal(f.status,2);assert.match(f.stdout,/过期/);
});
test('REV-03: comments cannot masquerade as a test function declaration',()=>{
 const root=fixture({components:['dev-flow-skills']});put(root,'docs/02-design/test-spec/case.md','L1-DEMO-01');put(root,'src/fake.ts','// 覆盖:§1 L1-DEMO-01\n// function onlyAComment() {}\n');put(root,'.harness/test-map.json',{cases:[{id:'L1-DEMO-01',file:'src/fake.ts',selector:'onlyAComment'}]});
 const r=cli(root,['--only','core.traceability']);assert.notEqual(r.status,0);assert.match(r.stdout,/声明|selector/);
});
test('REV-04: builtin layer labels cannot satisfy actual release E2E obligations',()=>{
 const root=fixture(),t=ready(root,'T3');project(root,p=>p.checks.find(c=>c.id==='core.policy').layer='L3');
 const r=spawnSync(process.execPath,[join(root,'scripts/harness/check.mjs'),'--profile','release','--task',t.id,'--intent','complete'],{cwd:root,encoding:'utf8',env:{...process.env,ALLOW_REAL_E2E:'1'}});assert.equal(r.status,2);assert.match(r.stdout,/L3|E2E/);
});
test('REV-05: complete cannot downgrade the project document stage',()=>{
 const root=fixture(),t=ready(root);put(root,'docs/must.md','# Design\n\nTODO\n');project(root,p=>{p.completeness.stage='P3';p.completeness.required.P3=['docs/must.md'];});
 const r=cli(root,['--profile','ci','--task',t.id,'--intent','complete','--stage','P0']);assert.equal(r.status,2);assert.equal(r.report.taskReady,false);
});
test('REV-06: make test runs actual registered tests rather than a successful echo',()=>{
 const root=fixture();project(root,p=>p.checks.push({id:'custom.test',kind:'command',group:'test',argv:['node','-e','process.stdout.write("ACTUAL_TEST_EXECUTED")'],cwd:'.',profiles:['fast','ci'],required:true,timeoutSeconds:3,effect:'local-validation',layer:'L1'}));
 const r=spawnSync('make',['test'],{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr);assert.match(r.stdout,/ACTUAL_TEST_EXECUTED/);
});
test('REV-07: aggregate refuses symlink outputs and empty registries',()=>{
 const root=fixture({repoRole:'central-docs'}),external=mkdtempSync(join(tmpdir(),'harness-aggregate-'));put(external,'user.md','preserve');
 put(root,'docs/components/registry.yaml','components: []\n');
 const r=spawnSync(process.execPath,[join(root,'scripts/aggregate.mjs')],{cwd:root,encoding:'utf8'});assert.equal(r.status,2);
 put(root,'components/a/doc/component.yaml','name: a');put(root,'docs/components/registry.yaml','components:\n  - name: a\n    local: components/a\n');
 // Existing generated file is replaced with a symlink only in this disposable fixture.
 const fs=process.getBuiltinModule('fs');fs.unlinkSync(join(root,'docs/architecture-overview.md'));symlinkSync(join(external,'user.md'),join(root,'docs/architecture-overview.md'));
 const s=spawnSync(process.execPath,[join(root,'scripts/aggregate.mjs')],{cwd:root,encoding:'utf8'});assert.equal(s.status,2);assert.equal(readFileSync(join(external,'user.md'),'utf8'),'preserve');
});
test('REV-08: ordinary task checking rejects duplicate identities and mismatched directories',()=>{
 const root=fixture(),t=ready(root);put(root,'.harness/local/tasks/duplicate/task.json',JSON.parse(readFileSync(join(root,`.harness/local/tasks/${t.id}/task.json`))));
 assert.notEqual(cli(root,['--only','core.tasks']).status,0);
});
test('REV-09: reserved entry names cannot be remapped; rust format and deployment checks are registered',()=>{
 assert.throws(()=>buildFiles({...cfg,naming:'custom',namingCustom:{'AGENTS.md':'POLICY.md'}}));
 const rust=JSON.parse(buildFiles({...cfg,stacks:['rust']}).get('.harness/project.json'));assert.ok(rust.checks.some(c=>c.argv?.join(' ')==='cargo fmt --check'));
 const deploy=fixture({components:['deployment-gates']});const p=JSON.parse(readFileSync(join(deploy,'.harness/project.json')));assert.ok(p.checks.some(c=>c.id==='core.deployment'));assert.equal(cli(deploy,['--only','core.deployment']).status,2);
});
test('REV-10: cancelled tasks cannot be finished with otherwise valid evidence',()=>{
 const root=fixture(),t=ready(root);const r=cli(root,['--profile','ci','--task',t.id,'--intent','complete']);assert.equal(r.status,0,r.stdout);t.status='cancelled';put(root,`.harness/local/tasks/${t.id}/task.json`,t);
 const f=cli(root,['finish','--task',t.id,'--evidence',r.report.evidencePath],'task-cli.mjs');assert.equal(f.status,2);assert.match(f.stdout,/状态|in-progress/);
});
test('REV-11: an upgrade stops on mid-apply edits and preserves the competing writer',()=>{
 const root=fixture();const plan=planUpgrade(root,{...cfg,oneLine:'new version'});
 // The test injects a competing write between two actual replacements, not a production test hook.
 put(root,'.harness/local/race-plan.json',plan);
 const updates=plan.changes.filter(c=>c.action==='update');const target=updates.at(-1).path;const firstPath=updates[0].path,firstBefore=readFileSync(join(root,firstPath),'utf8');
 const code=`const fs=require('node:fs');const {syncBuiltinESMExports}=require('node:module');const original=fs.renameSync;let once=false;fs.renameSync=function(...args){if(!once){once=true;fs.writeFileSync(${JSON.stringify(join(root,target))},'competing user edit');}return original(...args);};syncBuiltinESMExports();import(${JSON.stringify(new URL('../../skills/init-code-repo/upgrade.mjs',import.meta.url).href)}).then(m=>{try{m.applyUpgrade(${JSON.stringify(root)},JSON.parse(fs.readFileSync(${JSON.stringify(join(root,'.harness/local/race-plan.json'))})));process.exitCode=0;}catch(e){console.log(e.message);process.exitCode=2;}});`;
 const r=spawnSync(process.execPath,['-e',code],{encoding:'utf8'});assert.equal(r.status,2,r.stdout+r.stderr);assert.equal(readFileSync(join(root,target),'utf8'),'competing user edit');assert.equal(readFileSync(join(root,firstPath),'utf8'),firstBefore);
});
test('REV-12: rust retains its format verification command',()=>{
 const p=JSON.parse(buildFiles({...cfg,stacks:['rust']}).get('.harness/project.json'));assert.ok(p.checks.some(c=>c.argv?.join(' ')==='cargo fmt --check'));
});
test('REV-13: deployment gates are a real required capability with blocked missing inputs',()=>{
 const root=fixture({components:['deployment-gates']}),p=JSON.parse(readFileSync(join(root,'.harness/project.json')));assert.ok(p.checks.some(c=>c.id==='core.deployment'));assert.equal(cli(root,['--only','core.deployment']).status,2);
});
test('REV-14: regex literals cannot masquerade as function declarations',()=>{
 const root=fixture({components:['dev-flow-skills']});put(root,'docs/02-design/test-spec/case.md','L1-DEMO-01');put(root,'src/fake.ts','// 覆盖:§1 L1-DEMO-01\nconst pattern = /function onlyRegex()/;\n');put(root,'.harness/test-map.json',{cases:[{id:'L1-DEMO-01',file:'src/fake.ts',selector:'onlyRegex'}]});assert.notEqual(cli(root,['--only','core.traceability']).status,0);
});
test('REV-15: a minimal project does not silently exclude root build sources',()=>{
 const root=fixture();put(root,'build/source.txt','one');const t=ready(root);const r=cli(root,['--profile','ci','--task',t.id,'--intent','complete']);assert.equal(r.status,0,r.stdout);put(root,'build/source.txt','two');assert.equal(cli(root,['finish','--task',t.id,'--evidence',r.report.evidencePath],'task-cli.mjs').status,2);
});
