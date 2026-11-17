import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,cpSync} from 'node:fs';
import {join} from 'node:path';
import {fixture,put,project,cli,convergenceFor} from './helpers.mjs';
const example=new URL('../../skills/init-code-repo/examples/governed-project/',import.meta.url);
function designFixture(){const root=fixture();cpSync(example,root,{recursive:true});return root;}
test('DES-01: minimal always exposes constitution, system/domain design and actual e2e method contract',()=>{
 const root=fixture();const p=JSON.parse(readFileSync(join(root,'.harness/project.json')));
 for(const key of ['constitution','systemDesign','domainModel','domainIndex','e2e'])assert.ok(p.documents[key],key);
 for(const path of ['.specify/memory/constitution.md','docs/00-system/system-design.md','docs/guides/living-spec-template.md','docs/skills/e2e-dev-flow/SKILL.md','specs/README.md'])assert.ok(existsSync(join(root,path)),path);
 assert.match(readFileSync(join(root,'.gitignore'),'utf8'),/specs\/\*\/plan\//);
 assert.equal(p.documents.tasks,'.harness/local/tasks');
});
test('DES-02: real indexed domain designs satisfy structural checks; unindexed sibling fails',()=>{
 const root=designFixture();let r=cli(root,['--only','core.design']);assert.equal(r.status,0,r.stdout);
 put(root,'specs/099-other/spec.md','# another current design\n');r=cli(root,['--only','core.design']);assert.equal(r.status,1,r.stdout);assert.match(r.stdout,/索引|未登记/);
});
test('DES-03: missing design sections, process dependencies and duplicate current-design copies fail',()=>{
 for(const inject of ['missing','empty','process','duplicate']){
  const root=designFixture();
  if(inject==='missing')put(root,'specs/001-submission/spec.md','# empty domain');
  if(inject==='empty')put(root,'specs/001-submission/spec.md','# 空壳\n\n'+['目标','约束','需求与验收','结构','数据','决策沿革','红线','开放项'].map(h=>'## '+h+'\n\n').join(''));
  if(inject==='process')put(root,'specs/001-submission/spec.md',readFileSync(join(root,'specs/001-submission/spec.md'),'utf8')+'\n[当前权威](tasks/tasks.md)\n');
  if(inject==='duplicate')put(root,'specs/001-submission/design-v2.md','# 新版正式设计\n');
  const r=cli(root,['--only','core.design']);assert.equal(r.status,1,r.stdout);
 }
});
test('DES-11: malformed/missing specialized sources and managed process drafts never pass design checks',()=>{
 for(const mode of ['malformed','missing','process']){
  const root=designFixture(),source='specs/001-submission/spec.md';
  if(mode==='process'){const receipt=JSON.parse(readFileSync(join(root,'.harness/assembly.json')));receipt.files['specs/001-submission/plan/plan.md']='test-receipt';put(root,'.harness/assembly.json',receipt);}
  else put(root,source,readFileSync(join(root,source),'utf8')+(mode==='malformed'?'\n- 专门权威：未定义类别和来源\n':'\n- 专门权威（契约）：[未收到](../../docs/02-design/missing.yaml)\n'));
  const r=cli(root,['--only','core.design']);assert.notEqual(r.status,0,r.stdout);assert.match(r.stdout,/权威|过程/);
 }
});
test('DES-04: a domain-only template is not itself a registered feature; initialized projects do not claim a governance business domain',()=>{
 const root=fixture();assert.ok(!existsSync(join(root,'specs/domain-template.md')));assert.ok(!existsSync(join(root,'specs/001-repo-governance/spec.md')));
 const body=readFileSync(join(root,'AGENTS.md'),'utf8');assert.match(body,/constitution.md/);assert.match(body,/specs\/README.md/);assert.match(body,/e2e-dev-flow/);
});
test('DES-05: root architecture compatibility pages refer to a unique system/model source',()=>{
 const root=fixture({components:['product-docs']});assert.match(readFileSync(join(root,'docs/02-design/system-architecture.md'),'utf8'),/00-system\/system-design.md/);assert.match(readFileSync(join(root,'docs/02-design/entity-model.md'),'utf8'),/00-system\/domain-model.md/);
});
function readyTask(root){
 const t=cli(root,['create','--title','设计收敛验证'],'task-cli.mjs').report;
 t.risk={level:'T1',rationale:'只验证本地治理助手'};t.scope=['docs'];
 t.impact={paths:['docs'],contractChanges:false,dataChanges:false,securityChanges:false,externalEffects:false,productionEffects:false,behaviorChanges:false,requiredTestLayers:[]};
 t.criteriaRefs=[{id:'SUB-R1',path:'specs/001-submission/spec.md'}];t.criteriaResults=[{id:'SUB-R1',status:'pass',checkIds:['core.policy']}];
 put(root,'docs/ROADMAP.md','# 路线\n\n## P0\n本地样本范围明确。\n');return t;
}
function save(root,t){put(root,`.harness/local/tasks/${t.id}/task.json`,t);}
test('DES-06: green checks and phase notes cannot complete without a real feature design source',()=>{
 const root=designFixture(),t=readyTask(root);save(root,t);
 const r=cli(root,['--profile','ci','--task',t.id,'--intent','complete']);assert.equal(r.status,2,r.stdout);assert.match(r.stdout,/所属|长期域/);
});
test('DES-07: selecting a real domain is insufficient without actual convergence review and owner disposition',()=>{
 const root=designFixture(),t=readyTask(root);t.domainRefs=['specs/001-submission/spec.md'];save(root,t);
 const r=cli(root,['--profile','ci','--task',t.id,'--intent','complete']);assert.equal(r.status,2,r.stdout);assert.match(r.stdout,/收敛|语义审查/);
});
test('DES-08: behavioral tests green cannot override a failed semantic review',()=>{
 const root=designFixture(),t=readyTask(root);t.domainRefs=['specs/001-submission/spec.md'];
 t.convergence={owners:[],review:{kind:'independent',source:'样本审查',summary:'执行域仍能执行已取消作业，违反系统约束',status:'fail',findings:[{blocking:true,status:'open'}]}};save(root,t);
 const r=cli(root,['--profile','ci','--task',t.id,'--intent','complete']);assert.equal(r.status,1,r.stdout);assert.equal(r.report.taskReady,false);assert.equal(r.report.results.find(x=>x.id==='core.convergence').status,'fail');
});
test('DES-09: actual Markdown-declared contract and regression owners are required and accepted',()=>{
 const root=designFixture(),t=readyTask(root);t.domainRefs=['specs/001-submission/spec.md'];
 const system='docs/00-system/system-design.md',contract='docs/02-design/api.yaml',regression='docs/02-design/test-spec/submission.md';
 put(root,system,readFileSync(join(root,system),'utf8')+'\n- 专门权威（契约）：[公共接口](../02-design/api.yaml)\n');
 put(root,'specs/001-submission/spec.md',readFileSync(join(root,'specs/001-submission/spec.md'),'utf8')+'\n- 专门权威（测试）：[长期回归](../../docs/02-design/test-spec/submission.md)\n');
 put(root,contract,'openapi: 3.1.0\n');put(root,regression,'# 当前提交回归\n\nSUB-R1创建身份唯一，以真实测试验证。\n');
 t.impact.contractChanges=true;t.risk={level:'T2',rationale:'公共契约变化，必须审查实际契约owner'};t.approvalRefs=[{kind:'design',source:'测试方案已批准'}];
 project(root,p=>p.checks.push({id:'example.contract',kind:'command',group:'test',layer:'L2',argv:['node','--test','tests/behavior.test.mjs'],cwd:'.',profiles:['ci'],required:true,timeoutSeconds:5,effect:'local-validation'}));
 // Explicitly omit both specialized owners to reproduce the prior silent omission.
 t.convergence=convergenceFor(root,t);t.convergence.owners=t.convergence.owners.filter(o=>![contract,regression].includes(o.path));save(root,t);
 let r=cli(root,['--profile','ci','--task',t.id,'--intent','complete']);assert.equal(r.status,2,r.stdout);assert.match(r.stdout,/owner|权威/);
 for(const path of [contract,regression])t.convergence.owners.push({path,outcome:'reviewed-unchanged',reason:'本次机制验收未更改样本接口或回归含义，已核对内容',evidenceRefs:['example.contract']});save(root,t);
 r=cli(root,['--profile','ci','--task',t.id,'--intent','complete']);assert.equal(r.status,0,r.stdout);assert.equal(r.report.taskReady,true);
});
test('DES-10: wrong or duplicate criterion IDs cannot complete from an existing spec',()=>{
 for(const mode of ['missing','duplicate']){
  const root=designFixture(),t=readyTask(root);t.domainRefs=['specs/001-submission/spec.md'];t.convergence=convergenceFor(root,t);
  if(mode==='missing'){t.criteriaRefs[0].id='AC-DOES-NOT-EXIST';t.criteriaResults[0].id='AC-DOES-NOT-EXIST';}
  else{t.criteriaRefs.push({...t.criteriaRefs[0]});t.criteriaResults.push({...t.criteriaResults[0]});}
  save(root,t);const r=cli(root,['--profile','ci','--task',t.id,'--intent','complete']);assert.equal(r.status,2,r.stdout);assert.match(r.stdout,/验收.*(?:ID|条目)|重复/);
 }
});
