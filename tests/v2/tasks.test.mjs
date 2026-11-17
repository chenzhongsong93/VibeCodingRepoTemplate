import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fixture,put,project,cli,seedDesign,convergenceFor} from './helpers.mjs';
function task(root,risk='T2'){
 seedDesign(root);
 const r=cli(root,['create','--title','示例变更','--domain','specs/001-submission/spec.md'],'task-cli.mjs');assert.equal(r.status,0,r.stderr+r.stdout);
 const t=r.report; t.risk={level:risk,rationale:'用户批准的局部文档方案'};t.scope=['docs'];t.criteriaRefs=[{id:'SUB-R1',path:'specs/001-submission/spec.md'}];
 t.impact={paths:['docs'],contractChanges:false,dataChanges:false,securityChanges:false,externalEffects:false,productionEffects:false,behaviorChanges:false,requiredTestLayers:[]};
 t.criteriaResults=[{id:'SUB-R1',status:'pass',checkIds:['core.policy']}];t.approvalRefs=[{kind:'design',source:'用户本轮直接批准'}];
 t.convergence=convergenceFor(root,t);put(root,`.harness/local/tasks/${t.id}/task.json`,t);return t;
}
test('TASK-01: no task on initialization; T0 creates none; independent task IDs use UUID',()=>{
 const root=fixture();const a=cli(root,['create','--title','read','--risk','T0'],'task-cli.mjs');assert.equal(a.status,0);assert.equal(a.report.created,false);
 const t1=task(root),t2=task(root);assert.notEqual(t1.id,t2.id);assert.match(t1.id,/^TASK-\d{8}-[a-f0-9-]{36}$/);
});
test('TASK-02: unknown risk blocks, and T2 fast passes only as subset',()=>{
 const root=fixture();const raw=cli(root,['create','--title','未知'],'task-cli.mjs').report;
 assert.equal(cli(root,['--task',raw.id]).status,2);
 const t=task(root);project(root,p=>p.checks=p.checks.filter(c=>c.id!=='core.completeness'));
 const partial=cli(root,['--profile','fast','--task',t.id]);assert.equal(partial.status,0,partial.stdout);assert.equal(partial.report.taskReady,false);
 assert.equal(cli(root,['--profile','fast','--task',t.id,'--intent','complete']).status,2);
});
test('TASK-03: full evidence is bound to inputs and cannot close after a source edit',()=>{
 const root=fixture();const t=task(root);t.stage='handover';t.completedStages=['orient','specify','design','analyze','implement','verify','converge'].map(stage=>({stage,note:'已完成并复核'}));put(root,`.harness/local/tasks/${t.id}/task.json`,t);put(root,'docs/HANDOVER.md',`# 交接\n\n${t.id} 当前验收摘要。\n`);put(root,'docs/ROADMAP.md','# 路线\n\n## 当前阶段\nP0范围与验收已确定。\n');
 const r=cli(root,['--profile','ci','--task',t.id,'--intent','complete']);assert.equal(r.status,0,r.stdout);assert.equal(r.report.taskReady,true);
 put(root,'changed.md','# Changed\nactual content\n');
 const close=cli(root,['finish','--task',t.id,'--evidence',r.report.evidencePath],'task-cli.mjs');assert.equal(close.status,2);assert.match(close.stdout,/过期/);assert.notEqual(JSON.parse(readFileSync(`${root}/.harness/local/tasks/${t.id}/task.json`)).status,'done');
});
test('TASK-04: expected digest rejects stale task updates; received snapshot without local evidence blocks',()=>{
 const root=fixture();const t=task(root);
 const r=cli(root,['advance','--task',t.id,'--stage','specify','--expected','stale'],'task-cli.mjs');assert.equal(r.status,2);
 t.stage='handover';t.completedStages=['orient','specify','design','analyze','implement','verify','converge'].map(stage=>({stage,note:'已完成'}));put(root,`.harness/local/tasks/${t.id}/task.json`,t);put(root,'docs/HANDOVER.md',`# 交接\n\n${t.id} 当前状态。\n`);
 const missing=cli(root,['finish','--task',t.id,'--evidence','.harness/local/runs/not-received.json'],'task-cli.mjs');assert.equal(missing.status,2);assert.match(missing.stdout,/未收到|local-only/);
});
test('TASK-05: real boundary impact requires L2 even if risk is understated or test layers omitted',()=>{
 const root=fixture();const t=task(root,'T1');t.impact.contractChanges=true;put(root,`.harness/local/tasks/${t.id}/task.json`,t);
 assert.equal(cli(root,['--task',t.id]).status,2);
 t.risk.level='T2';put(root,`.harness/local/tasks/${t.id}/task.json`,t);
 const r=cli(root,['--profile','ci','--task',t.id,'--intent','complete']);assert.equal(r.status,2);assert.match(r.stdout,/L2/);
});

test('TASK-06: actual lifecycle can close with current complete evidence and a handover pointer',()=>{
 const root=fixture();let t=task(root);
 put(root,'docs/ROADMAP.md','# 路线\n\n## 当前阶段\nP0范围与验收已确定。\n');
 put(root,'docs/HANDOVER.md',`# 当前交接\n\n任务 ${t.id}，全部验收已验证。\n`);
 for(const stage of ['specify','design','analyze','implement','verify','converge','handover']){
  const shown=cli(root,['show','--task',t.id],'task-cli.mjs').report;
  const advanced=cli(root,['advance','--task',t.id,'--stage',stage,'--expected',shown.digest,'--note','本阶段证据已对照并记录在task.md'],'task-cli.mjs');
  assert.equal(advanced.status,0,advanced.stdout);t=advanced.report;
 }
 const r=cli(root,['--profile','ci','--task',t.id,'--intent','complete']);assert.equal(r.status,0,r.stdout);assert.equal(r.report.taskReady,true);
 const closed=cli(root,['finish','--task',t.id,'--evidence',r.report.evidencePath],'task-cli.mjs');assert.equal(closed.status,0,closed.stdout);assert.equal(closed.report.status,'done');
});
test('TASK-07: T1 full verification can use fast while still enforcing completeness',()=>{
 const root=fixture();const t=task(root,'T1');put(root,'docs/ROADMAP.md','# 路线\n\n## 当前阶段\nP0验收已填写。\n');
 const r=cli(root,['--profile','fast','--task',t.id,'--intent','complete']);assert.equal(r.status,0,r.stdout);assert.equal(r.report.taskReady,true);assert.ok(r.report.results.some(c=>c.id==='core.completeness'&&c.status==='pass'));
});
