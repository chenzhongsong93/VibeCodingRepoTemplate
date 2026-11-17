import test from 'node:test';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {fixture,project,cli} from './helpers.mjs';
const cmd=(id,argv,extra={})=>({id,kind:'command',argv,cwd:'.',profiles:['fast','ci','release'],required:true,timeoutSeconds:3,effect:'local-validation',...extra});
test('RUN-01: real command failure never becomes a dependency skip',()=>{
 const root=fixture();project(root,p=>p.checks=[cmd('bad',['node','-e','process.exit(7)'])]);
 const r=cli(root);assert.equal(r.status,1);assert.equal(r.report.results[0].status,'fail');
});
test('RUN-02: missing required tool blocks and optional missing tool is visibly skipped',()=>{
 for(const required of [true,false]){
  const root=fixture();project(root,p=>p.checks=[cmd('missing',['harness-no-such-tool-83721'],{required})]);
  const r=cli(root);assert.equal(r.status,required?2:0);assert.equal(r.report.results[0].status,required?'blocked':'skipped');assert.equal(r.report.taskReady,false);
 }
});
test('RUN-03: timeouts are blocked, not successful checks',()=>{
 const root=fixture();project(root,p=>p.checks=[cmd('slow',['node','-e','setTimeout(()=>{},1000)'],{timeoutSeconds:0.03})]);
 assert.equal(cli(root).status,2);
});
test('RUN-04: no-task release lacks evidence and never runs E2E implicitly',()=>{
 const root=fixture();const r=cli(root,['--profile','release']);assert.equal(r.status,2);assert.equal(r.report.taskReady,false);
});
test('RUN-05: unknown handlers and empty check collections cannot pass',()=>{
 for(const checks of [[],[{id:'x',kind:'builtin',handler:'unknown',profiles:['fast'],required:true}]]){const root=fixture();project(root,p=>p.checks=checks);assert.equal(cli(root).status,2);}
});
test('RUN-06: completion rejects missing core checks and nonexistent criterion evidence',()=>{
 // Task CLI fixtures are exercised by the integration suite; a forged task is not permission.
 const root=fixture();const t=cli(root,['create','--title','范围'],'task-cli.mjs').report;
 t.risk={level:'T1',rationale:'局部文档'};t.scope=['docs'];t.impact={paths:['docs'],contractChanges:false,dataChanges:false,securityChanges:false,externalEffects:false,productionEffects:false,behaviorChanges:false,requiredTestLayers:[]};t.criteriaRefs=[{id:'AC1',path:'docs/not-received.md'}];t.criteriaResults=[{id:'AC1',status:'pass',checkIds:['fake']}];
 const fsPath=`${root}/.harness/local/tasks/${t.id}/task.json`;
 // put is imported locally to keep the fixture explicit.
 writeFileSync(fsPath,JSON.stringify(t));
 project(root,p=>p.checks=[cmd('fake',['node','-e','process.exit(0)'])]);
 const r=cli(root,['--profile','ci','--task',t.id,'--intent','complete']);assert.equal(r.status,2);assert.equal(r.report.taskReady,false);
});
