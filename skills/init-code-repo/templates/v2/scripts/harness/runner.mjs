import { requiredOwners, checkCriteria, consumedInputs } from './design.mjs';
import { spawnSync } from 'node:child_process';
import { loadProject, loadTask, taskRequirements, taskContext, fingerprint, inside, completionChecks } from './model.mjs';
import { builtin } from './checks.mjs';
import { storeRunReport, leaseRunInputs, releaseRunInputs } from './assets.mjs';
import { materializeCommand } from './command-inputs.mjs';
function execute(root,c){
 const r=spawnSync(c.argv[0],c.argv.slice(1),{cwd:inside(root,c.cwd||'.'),encoding:'utf8',timeout:c.timeoutSeconds*1000,maxBuffer:2*1024*1024,shell:false,env:{...process.env,npm_config_offline:'true'}});
 if(r.error?.code==='ENOENT')return {status:c.required?'blocked':'skipped',message:`工具缺失: ${c.argv[0]}`};
 if(r.error||r.signal)return {status:'blocked',message:`执行错误/超时: ${r.error?.message||r.signal}`};
 const versions={node:['--version'],npm:['--version'],go:['version'],mvn:['--version'],cargo:['--version'],ruff:['--version'],mypy:['--version'],pytest:['--version'],python:['--version']};
 const version=versions[c.argv[0]]?spawnSync(c.argv[0],versions[c.argv[0]],{encoding:'utf8',timeout:5000,env:{...process.env,npm_config_offline:'true'}}):null;
 return {argv:c.argv,cwd:c.cwd||'.',toolVersion:version?.status===0?(version.stdout||version.stderr).trim():'未探测；不声称版本兼容',status:r.status===0?'pass':'fail',message:`exit ${r.status}`,exitCode:r.status,stdout:r.stdout,stderr:r.stderr};
}
export function runChecks(root,options={}){
 const profile=options.profile||'fast',intent=options.intent||'check';
 const report={schemaVersion:2,profile,intent,scope:options.task||options.only||options.group?'subset':'repository',taskReady:false,results:[],createdAt:new Date().toISOString(),nodeVersion:process.version};
 let protection;
 try{
  if(!['fast','ci','release'].includes(profile)||!['check','complete'].includes(intent))throw new Error('未知profile/intent');
  if(Number(process.versions.node.split('.')[0])<22)throw new Error('需本地Node >=22');
  const p=loadProject(root);report.fingerprintScope={repository:true,excluded:[...p.fingerprintExcludes||[],'.git','node_modules','__pycache__','.harness/local'],outsideInputs:'未覆盖，需项目另行定义真实边界验证'};let t,needs;
  if(options.task){t=loadTask(root,p,options.task,{ready:true});needs=taskRequirements(t);report.taskId=t.id;report.taskContext=taskContext(t);}
  if(intent==='complete'&&!t)throw new Error('complete需要明确本地变更上下文；不用助手时按e2e提交实际验收/语义审查，不能从仓库子集推导完成');
  if(intent==='complete')requiredOwners(root,p,t);
  if(intent==='complete'&&(options.only||options.group))throw new Error('complete不能仅选子集');
  if(intent==='complete'&&['fast','ci','release'].indexOf(profile)<['fast','ci','release'].indexOf(needs.profile))throw new Error('profile低于任务最低要求');
  if(options.stage&&!/^P[0-3]$/.test(options.stage))throw new Error('非法stage');
  if(intent==='complete'&&options.stage&&Number(options.stage[1])<Number(p.completeness.stage[1]))throw new Error('complete不能降低项目文档阶段');
  if(profile==='release'){
   if(!t||process.env.ALLOW_REAL_E2E!=='1'||!t.approvalRefs.some(a=>a.kind==='real-e2e'&&a.source))throw new Error('release缺任务、逐项授权引用或ALLOW_REAL_E2E=1；状态文件不能授予权限');
   if(!p.checks.some(c=>c.kind==='command'&&c.layer==='L3'&&c.effect==='real-e2e'&&c.required&&c.profiles.includes('release')))throw new Error('release缺真实E2E验证命令');
   if(!t.rollbackRef)throw new Error('release缺回滚方案');
  }
  let selected=p.checks.filter(c=>c.profiles.includes(profile));
  if(options.group){if(!['lint','test','build','deployment'].includes(options.group))throw new Error('未知group');selected=selected.filter(c=>c.group===options.group);}
  if(options.only){selected=p.checks.filter(c=>options.only.split(',').includes(c.id));if(selected.length!==options.only.split(',').length)throw new Error('未知检查ID');}
  if(intent==='complete'){
   for(const handler of ['config','policy','references','hygiene','tasks','design','convergence','completeness','assets'])if(!p.checks.some(c=>c.id===`core.${handler}`&&c.kind==='builtin'&&c.handler===handler&&c.required))throw new Error(`完成验证缺基础检查: ${handler}`);
   const all=completionChecks(p,profile);
   selected=all;
   for(const layer of needs.layers)if(!all.some(c=>c.kind==='command'&&c.layer===layer&&c.required&&(layer!=='L3'||c.effect==='real-e2e')))throw new Error(`任务缺必需${layer}检查，不能用降低验证范围替代`);
   checkCriteria(root,t,p);
   if(Number(t.risk.level[1])>=2&&!t.approvalRefs.some(a=>a.kind==='design'&&a.source))throw new Error('T2/T3缺设计批准来源引用');
   if(t.impact.securityChanges&&!t.approvalRefs.some(a=>a.kind==='security-review'&&a.source))throw new Error('安全改动缺人工复审引用');
  }
  if(!selected.length)throw new Error('检查集合为空');
  report.plan=selected.map(c=>({id:c.id,kind:c.kind,required:c.required,argv:c.argv,cwd:c.cwd,inputs:c.inputs,inputSelection:c.inputSelection}));
  if(options.plan){report.scope='plan';report.exitCode=0;return report;}
  let executionChecks;
  protection=leaseRunInputs(root,()=>{
   report.fingerprint=fingerprint(root);
   executionChecks=selected.map(c=>materializeCommand(root,c));
   return consumedInputs(root,p,intent==='complete'?t:undefined,selected);
  });
  report.consumedInputs=protection.inputs;
  report.inputProtection={assetIds:protection.assetIds,leaseToken:protection.token,state:'leased'};
  report.fingerprintScope.commandSelections=executionChecks.filter(c=>c.selectedInputs).map(c=>({id:c.id,cwd:c.cwd||'.',selection:c.inputSelection,files:c.selectedInputs}));
  for(const c of executionChecks){
   let result;
   try{
    if(c.kind==='command'&&c.effect==='real-e2e'&&profile!=='release')result={status:'blocked',message:'真实E2E只可在显式授权的release档执行'};
    else result=c.kind==='builtin'?builtin(root,p,c.handler,{...options,taskRecord:t,intent}):execute(root,c);
   }catch(e){result={status:'blocked',message:e.message};}
   report.results.push({id:c.id,required:c.required,...result});
  }
  if(JSON.stringify(consumedInputs(root,p,intent==='complete'?t:undefined,selected))!==JSON.stringify(report.consumedInputs))report.results.push({id:'consumed-inputs.changed',required:true,status:'blocked',message:'验证期间正式来源/实际输入发生变化，请重新验证'});
  if(fingerprint(root)!==report.fingerprint)report.results.push({id:'inputs.changed',required:true,status:'blocked',message:'验证期间输入发生变化，请重新验证'});
  if(intent==='complete')for(const owner of t.convergence?.owners||[])for(const id of owner.evidenceRefs||[])if(!report.results.some(x=>x.id===id&&x.status==='pass'))report.results.push({id:`owner.${owner.path}`,required:true,status:'blocked',message:`owner引用检查未通过: ${id}`});
  if(intent==='complete')for(const r of t.criteriaResults)for(const id of r.checkIds)if(!report.results.some(x=>x.id===id&&x.status==='pass'))report.results.push({id:`criterion.${r.id}`,required:true,status:'blocked',message:`验收引用检查未通过: ${id}`});
  report.exitCode=report.results.some(r=>r.status==='fail')?1:report.results.some(r=>r.required&&r.status==='blocked')?2:0;
  report.taskReady=intent==='complete'&&report.exitCode===0&&report.results.filter(r=>r.required).every(r=>r.status==='pass'||r.status==='not-applicable');
  if(report.taskReady)report.scope='task-complete-verification';
  if(t&&intent!=='complete')report.remainingObligations={minimumProfile:needs.profile,layers:needs.layers,completion:'需intent=complete及converge/handover；子集绿色不能完成任务'};
 }catch(e){report.exitCode=2;report.results.push({id:'preflight',required:true,status:'blocked',message:e.message});}
 if(!options.plan&&!options.noRecord){
  try{storeRunReport(root,report,protection);}catch(e){report.exitCode=2;report.taskReady=false;report.inputProtection=protection?{assetIds:protection.assetIds,leaseToken:protection.token,state:'retained-leases; 核对失联运行后显式release'}:undefined;report.results.push({id:'evidence.write',required:true,status:'blocked',message:e.message});}
 }else if(options.noRecord&&protection){
  try{releaseRunInputs(root,protection);report.inputProtection={assetIds:protection.assetIds,state:'released; noRecord不保留运行凭据'};}catch(e){report.exitCode=2;report.taskReady=false;report.results.push({id:'inputs.release',required:true,status:'blocked',message:e.message});}
 }
 return report;
}
