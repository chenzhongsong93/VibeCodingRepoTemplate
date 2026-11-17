import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,cpSync,mkdtempSync,existsSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {fixture,put,project,cli,seedDesign} from './helpers.mjs';

const submission='specs/001-submission/spec.md',execution='specs/002-execution/spec.md';
const text=(root,path)=>readFileSync(join(root,path),'utf8');
const trackedDesigns=root=>{const walk=dir=>readdirSync(join(root,dir),{withFileTypes:true}).flatMap(e=>{const rel=dir+'/'+e.name;if(/^specs\/[^/]+\/(plan|tasks|implement)(\/|$)/.test(rel))return [];return e.isDirectory()?walk(rel):rel.endsWith('.md')?[rel]:[];});return JSON.stringify([...walk('docs/00-system'),...walk('specs')].sort());};
function program(root,body){return `import assert from 'node:assert/strict';\nimport {submit} from './src/submit.mjs';\nimport {execute} from './src/execute.mjs';\n${body}\n`;}
function behavior(root,body){return spawnSync(process.execPath,['--input-type=module','-e',program(root,body)],{cwd:root,encoding:'utf8'});}

function currentTests(root,bodies,boundary){
 const header="import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport {submit} from '../src/submit.mjs';\nimport {execute} from '../src/execute.mjs';\n";
 const tests=bodies.map((body,i)=>`test('提交域当前验收 ${i+1}',async()=>{${body}});`).join('\n');
 put(root,'tests/behavior.test.mjs',header+tests+"\ntest('执行成功/失败/不可重跑',async()=>{const m=new Map();submit(m,'ok',1);assert.equal(await execute(m,'ok',async x=>x+1),2);await assert.rejects(()=>execute(m,'ok',async()=>0),/not runnable/);submit(m,'bad',1);await assert.rejects(()=>execute(m,'bad',async()=>{throw new Error('failure');}),/failure/);assert.equal(m.get('bad').state,'failed');});\n");
 const simple="const m=new Map();const job=submit(m,'integration',1);assert.equal(job.state,'queued');assert.equal(await execute(m,'integration',async x=>x+1),2);assert.equal(m.size,1);";
 put(root,'tests/boundary.test.mjs',header+`test('跨域公共契约与当前验收',async()=>{${(boundary||simple).replace("import('./src/submit.mjs')","import('../src/submit.mjs')")}});\n`);
}
function cursor(root,change,domains,body,{cross=false}={}){
 const t=cli(root,['create','--title',change,'--domain',domains.join(',')],'task-cli.mjs').report;
 t.externalIssueRef=change;t.scope=['src'];t.risk={level:'T2',rationale:cross?'新增跨域取消契约':'提交域公开重复/输入契约变更，即使同域也按T2验证'};
 t.impact={paths:cross?['src/submit.mjs','src/execute.mjs']:['src/submit.mjs'],contractChanges:true,dataChanges:cross,securityChanges:false,externalEffects:false,productionEffects:false,behaviorChanges:true,requiredTestLayers:['L1','L2']};
 t.criteriaRefs=domains.map(path=>({id:path===submission?(cross?'SUB-R4':'SUB-R2'):'EXE-R2',path}));t.criteriaResults=t.criteriaRefs.map(c=>({id:c.id,status:'pass',checkIds:['example.behavior','example.boundary']}));t.approvalRefs=[{kind:'design',source:`样本用户已批准${change}的明确目标；此处是测试输入，不是伪造真实用户授权`}];
 t.stage='handover';t.completedStages=['orient','specify','design','analyze','implement','verify','converge'].map(stage=>({stage,note:`${change}:实际设计/行为对照记录在原spec与本地样本证据`}));
 const owners=['docs/00-system/system-design.md',...domains,'docs/00-system/domain-model.md','docs/02-design/test-spec/submission.md'];
 t.convergence={review:{kind:'self',source:'本地连续演进用例内容审读，另有fresh Astra应用审查',summary:'对照批准目标、实际模块、共享不变量和真实断言；不是凭字段/计数判断',status:'pass',findings:[]},owners:owners.map(path=>({path,outcome:path===submission||path==='docs/02-design/test-spec/submission.md'||cross?'updated':'reviewed-unchanged',reason:path===submission||path==='docs/02-design/test-spec/submission.md'||cross?`${change}:更新相应需求/流程/契约及沿革`:'本次变更的重复/输入策略属提交域；跨域检查表明公共字段/状态和共同边界未改变',evidenceRefs:['example.behavior','example.boundary']})),openItems:[]};
 project(root,p=>{p.checks=p.checks.filter(c=>!c.id.startsWith('example.'));for(const [id,layer,file] of [['example.behavior','L1','tests/behavior.test.mjs'],['example.boundary','L2','tests/boundary.test.mjs']])p.checks.push({id,kind:'command',group:'test',layer,argv:['node','--test',file],cwd:'.',profiles:['ci'],required:true,timeoutSeconds:5,effect:'local-validation'});});
 put(root,`.harness/local/tasks/${t.id}/task.json`,t);put(root,'docs/HANDOVER.md',`# 当前快照\n\n${change} / ${t.id}。长期设计见specs/README.md；目标、实现和决策在所属原spec。当前已完成；无阻断。\n`);return t;
}
function finish(root,t){const r=cli(root,['--profile','ci','--task',t.id,'--intent','complete']);assert.equal(r.status,0,r.stdout);assert.equal(r.report.taskReady,true);const closed=cli(root,['finish','--task',t.id,'--evidence',r.report.evidencePath],'task-cli.mjs');assert.equal(closed.status,0,closed.stdout);}
function revise(root,change,replacement){let s=text(root,submission);s=s.replace(/设计版本：[^。]+。/,`设计版本：${change}。`);s=s.replace('实现：下列验收已由初始样本支持。','实现：本次新目标待实现/验证，其余按需求状态。');s=s.replace(/- SUB-R2：[^\n]+/,replacement);s=s.replace(/现有ID重复提交抛出duplicate，不创建第二条记录。|当前重复与输入语义见SUB-R2；所有失败保持原记录和Map不变。/,'当前重复与输入语义见SUB-R2；所有失败保持原记录和Map不变。');s=s.replace('先验ID→查重复→创建→返回','先验ID→按SUB-R2判重/冲突→必要时创建→返回');s=s.replace('| v1 | 重复ID显式拒绝，先建立可观察基线供后续幂等演进对照 | 生效 |','| v1 | 重复ID显式拒绝，先建立可观察基线供后续幂等演进对照 | 已由CHANGE-IDEMPOTENT取代 |');if(change==='CHANGE-ID-TYPE')s=s.replace('- SUB-R3：Given空ID，When提交，Then失败且Map不变。状态：已实现；后续更严格输入类型需单独批准。','- SUB-R3：Given非法ID，When提交，Then按SUB-R2输入约束拒绝且Map不变。状态：待实现。');s=s.replace(/\n+## 红线/,`\n| ${change} | 用户批准修订；相关旧决定由此条取代，当前行为以需求节为准 | 待验证 |\n\n## 红线`);put(root,submission,s);}

test('EVO-01: three same-domain changes, then a cross-domain conflict, converge to the same live designs',()=>{
 const root=fixture();seedDesign(root);put(root,'docs/ROADMAP.md','# 路线\n\n## P0\n本地作业样本验证连续设计维护，不提供服务或部署。\n');
 const initial=trackedDesigns(root),transitions=[],bodies=[];
 const changes=[
  {id:'CHANGE-IDEMPOTENT',body:'const m=new Map();const first=submit(m,"a",1);assert.equal(submit(m,"a",1),first);assert.equal(m.size,1);',spec:'- SUB-R2：Given相同ID与相同payload，When重试，Then返回同一记录，Map只有一条。状态：待实现。',code:`export function submit(store,id,payload){if(!id)throw new Error('id required');if(store.has(id))return store.get(id);const job={id,payload,state:'queued'};store.set(id,job);return job;}\n`},
  {id:'CHANGE-PAYLOAD-CONFLICT',body:'const m=new Map();const first=submit(m,"a",1);assert.throws(()=>submit(m,"a",2),/payload conflict/);assert.equal(m.get("a"),first);',spec:'- SUB-R2：Given相同ID，Whenpayload相同则返回原记录；不同时抛payload conflict且原记录不变。状态：待实现。',code:`export function submit(store,id,payload){if(!id)throw new Error('id required');if(store.has(id)){const old=store.get(id);if(old.payload!==payload)throw new Error('payload conflict');return old;}const job={id,payload,state:'queued'};store.set(id,job);return job;}\n`},
  {id:'CHANGE-ID-TYPE',body:'const m=new Map();for(const id of [1,{},"",null])assert.throws(()=>submit(m,id,1),/id required/);assert.equal(m.size,0);assert.equal(submit(m,"a",1).id,"a");',spec:'- SUB-R2：Given合法相同ID，payload相同重试返回原记录，不同则冲突；ID必须非空字符串，非法输入不创建记录。状态：待实现。',code:`export function submit(store,id,payload){if(typeof id!=='string'||!id)throw new Error('id required');if(store.has(id)){const old=store.get(id);if(old.payload!==payload)throw new Error('payload conflict');return old;}const job={id,payload,state:'queued'};store.set(id,job);return job;}\n`}
 ];
 for(const change of changes){
  revise(root,change.id,change.spec);
  const red=behavior(root,change.body);assert.notEqual(red.status,0,`${change.id} must fail before implementation`);
  assert.match(text(root,submission),/待实现/); // The approved target is visible without pretending it shipped.
  put(root,'src/submit.mjs',change.code);assert.equal(behavior(root,change.body).status,0,change.id);
  put(root,submission,text(root,submission).replace(/状态：待实现。/g,'状态：已验证。').replace(`${change.id} | 用户批准修订；相关旧决定由此条取代，当前行为以需求节为准 | 待验证`,`${change.id} | 用户批准修订；相关旧决定由此条取代，当前行为以需求节为准 | 已验证`));
  put(root,submission,text(root,submission).replace('本次新目标待实现/验证，其余按需求状态','当前需求已由本轮及累积回归验证'));
  put(root,'docs/02-design/test-spec/submission.md',`# 提交域长期回归\n\n${change.id}更新当前SUB-R2；同ID/冲突/类型验收统一维护在本文件和真实行为断言，不为每轮新增一份test-spec。\n`);
  put(root,'specs/001-submission/plan/plan.md',`本次${change.id}的临时实现计划；长期目标和决定在原spec。\n`);
  bodies.push(change.body);currentTests(root,bodies);
  const t=cursor(root,change.id,[submission],change.body);finish(root,t);transitions.push({change:change.id,red:red.status,green:0,spec:submission});
  assert.equal(trackedDesigns(root),initial);
  assert.ok(text(root,submission).includes(`设计版本：${change.id}。`),'每轮设计版本应指向当前已批准修订');
  assert.doesNotMatch(text(root,submission),/现有ID重复提交抛出duplicate|本次新目标待实现\/验证/,'当前需求和当前事实必须同步，不得只往末尾追加修订');
  if(change.id==='CHANGE-ID-TYPE')assert.doesNotMatch(text(root,submission),/后续更严格输入类型需单独批准/);
 }
 // Cross-domain target: cancellation remains a flag on queued records; old execution ignores it.
 const change='CHANGE-CANCEL';
 const systemPath='docs/00-system/system-design.md',modelPath='docs/00-system/domain-model.md';
 put(root,systemPath,text(root,systemPath).replace(/^> 目标：[^\n]+/m,`> 目标：样本验收基线${change}已批准。实现：取消目标待实现/验证，既有行为按对应域状态。`).replace('## 结构与关键流程',`- SYS-I4：queued且cancelled=true的作业不可启动或产生执行副作用。${change}已批准，待实现/验证。\n\n## 结构与关键流程`).replace(/\n+## 开放项/,`\n| ${change} | 取消不是只改提交入口；必须覆盖执行启动边界 | 待验证 |\n\n## 开放项`));
 put(root,modelPath,text(root,modelPath).replace('后续若增加取消字段/状态，两个域须共同对照本契约与系统不变量。','取消不新增执行状态，见下列取消契约；两个域共同遵守系统不变量。').replace('## 决策沿革',`## 取消契约\n\n${change}：cancelled布尔标记，缺省false；取消queued只设此标记，执行域必须在副作用前检查。公共定义只在此处维护。\n\n## 决策沿革`)+`| ${change} | 采用取消标记并在启动副作用前校验，不新增状态 | 待验证 |\n`);
 for(const path of [submission,execution])put(root,path,text(root,path).replace(/设计版本：[^。]+。/,`设计版本：${change}。`).replace(/实现：[^。\n]+。/,`实现：${change}已批准，待实现/验证；既有需求按各项状态。`).replace('## 数据与运行',`${change}：本域遵守共享取消契约和SYS-I4，目标已批准，待实现/验证。\n\n## 数据与运行`).replace(/\n+## 红线/,`\n| ${change} | 提交标记取消，执行启动前拒绝；细节引用共享模型 | 待验证 |\n\n## 红线`).replace('后续取消语义若引入新字段，需同时更新公共契约和本域启动检查。','取消当前约束见EXE-R2与共享契约；后续语义变化继续同步本域启动边界。'));
 put(root,'src/submit.mjs',text(root,'src/submit.mjs')+`export function cancel(store,id){const job=store.get(id);if(!job||job.state!=='queued')throw new Error('not cancellable');job.cancelled=true;return job;}\n`);
 const boundary=`const {cancel}=await import('./src/submit.mjs');const m=new Map();submit(m,'cancelled',1);cancel(m,'cancelled');let calls=0;await assert.rejects(()=>execute(m,'cancelled',async()=>{calls++;return 42;}),/cancel/);assert.equal(calls,0);assert.equal(m.get('cancelled').state,'queued');assert.equal('result' in m.get('cancelled'),false);assert.equal('error' in m.get('cancelled'),false);const before=m.size;assert.throws(()=>cancel(m,'missing'),/not cancellable/);assert.equal(m.size,before);for(const state of ['running','done','failed']){const job={id:state,payload:1,state};m.set(state,job);const snapshot=JSON.stringify(job);assert.throws(()=>cancel(m,state),/not cancellable/);assert.equal(JSON.stringify(job),snapshot);}`;
 put(root,execution,text(root,execution).replace('只有queued可启动','只有queued且未取消可启动').replace('Given不存在或非queued','Given不存在、非queued或已取消'));
 put(root,submission,text(root,submission).replace('## 架构与关键流程','- SUB-R4：Given queued作业，When取消，Then只设置共享取消标记；非queued/不存在拒绝且不变。状态：待实现/验证。\n\n## 架构与关键流程'));
 currentTests(root,bodies,boundary);
 const ordinary='const m=new Map();submit(m,"normal",1);assert.equal(await execute(m,"normal",async x=>x+1),2);';
 assert.equal(behavior(root,ordinary).status,0);assert.equal(cli(root,['--only','core.design,core.policy']).status,0);
 const violated=behavior(root,boundary);assert.notEqual(violated.status,0);transitions.push({change,oldUnit:0,structural:0,newBoundary:violated.status});
 put(root,'docs/HANDOVER.md',`# 活跃变更\n\n${change}已批准，提交已支持取消，执行域尚未检查标记，SYS-I4和新边界断言失败。下一步改src/execute.mjs，长期目标及去向在原系统和两个spec。本地草稿未共享时依此重建。\n`);
 put(root,'docs/02-design/test-spec/submission.md',`# 提交/执行当前回归资产\n\n${change}：SUB-R1/R2/R3由tests/behavior.test.mjs覆盖；SUB-R4、EXE-R2及SYS-I4由tests/boundary.test.mjs覆盖。跨域取消必须零副作用、queued不变；同时覆盖成功、失败和终态拒绝。\n`);
 put(root,'docs/ledger/bugs.md','# 样本缺陷台账\n\n| ID | 根因 | 状态 | 回归与关闭条件 |\n|---|---|---|---|\n| SAMPLE-CANCEL | 只改提交标记，遗漏执行边界检查；不是生产事故 | OPEN | tests/boundary.test.mjs：取消后拒绝、零副作用、状态不变 |\n');
 const conflictSnapshot=mkdtempSync(join(tmpdir(),'harness-semantic-conflict-'));cpSync(root,conflictSnapshot,{recursive:true,filter:path=>!path.includes('/.harness/local')&&!/\/specs\/[^/]+\/(plan|tasks|implement)(\/|$)/.test(path)});
 const failed=cursor(root,change,[submission,execution],boundary,{cross:true});failed.convergence.review={kind:'self',source:'独立边界断言与系统/域内容对照',summary:'旧单测和结构绿，但执行域仍违反SYS-I4',status:'fail',findings:[{blocking:true,status:'open',message:'取消后仍执行副作用'}]};put(root,`.harness/local/tasks/${failed.id}/task.json`,failed);
 const blocked=cli(root,['--profile','ci','--task',failed.id,'--intent','complete']);assert.equal(blocked.status,1);assert.equal(blocked.report.taskReady,false);
 put(root,'src/execute.mjs',text(root,'src/execute.mjs').replace("  job.state = 'running';","  if (job.cancelled) throw new Error('cancelled');\n  job.state = 'running';"));assert.equal(behavior(root,boundary).status,0);
 for(const path of ['docs/00-system/system-design.md','docs/00-system/domain-model.md',submission,execution])put(root,path,text(root,path).replace(/待实现\/验证/g,'已实现并由取消边界用例验证').replace(/\| 待验证 \|/g,'| 已验证 |'));
 put(root,'docs/ledger/bugs.md',text(root,'docs/ledger/bugs.md').replace('| OPEN |','| CLOSED：真实边界断言通过，长期回归保留 |'));
 const final=cursor(root,change,[submission,execution],boundary,{cross:true});finish(root,final);
 for(const path of [submission,execution])assert.ok(text(root,path).includes(`设计版本：${change}。`),'跨域修订的两个设计元信息都必须更新');
 const system=text(root,'docs/00-system/system-design.md');assert.ok(system.indexOf('SYS-I4：')>system.indexOf('## 公共不变量')&&system.indexOf('SYS-I4：')<system.indexOf('## 结构与关键流程'),'公共约束应更新原职责节，不能追加在开放项后');
 for(const path of [submission,execution])assert.ok(text(root,path).indexOf(`| ${change} |`)<text(root,path).indexOf('## 红线'),'决策修订归决策节');
 const received=mkdtempSync(join(tmpdir(),'harness-received-snapshot-'));cpSync(root,received,{recursive:true,filter:path=>!path.includes('/.harness/local')&&!/\/specs\/[^/]+\/(plan|tasks|implement)(\/|$)/.test(path)});
 assert.equal(existsSync(join(received,'specs/001-submission/plan/plan.md')),false);assert.equal(cli(received,['--only','core.design,core.policy,core.references']).status,0);assert.equal(cli(received,['--profile','ci']).status,0);
 assert.equal(cli(received,['show','--task',final.id],'task-cli.mjs').status,2);assert.match(text(received,'docs/HANDOVER.md'),/CHANGE-CANCEL/);assert.match(text(received,submission),/CHANGE-IDEMPOTENT[\s\S]*CHANGE-PAYLOAD-CONFLICT[\s\S]*CHANGE-ID-TYPE/);
 console.log(JSON.stringify({evolutionRoot:root,conflictSnapshot,receivedSnapshot:received,transitions,permanentDomainDesigns:2,processHistoryRequired:false}));
});
