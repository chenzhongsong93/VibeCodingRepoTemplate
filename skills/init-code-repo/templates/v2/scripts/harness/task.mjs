import { taskFiles, designSources, checkConvergence, checkCriteria, consumedInputs, debtTransfers } from './design.mjs';
import { finishTaskAssets } from './assets.mjs';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { loadProject, loadTask, validateTask, taskPath, stages, inside, listFiles, readJson, sha256, fingerprint, taskContext, completionChecks } from './model.mjs';
export function createTask(root,{title,risk,domain}={}){
 if(risk==='T0')return {created:false,message:'T0只读不创建任务文件'};
 if(!title?.trim())throw new Error('缺title');
 if(risk&&!/^T[1-3]$/.test(risk))throw new Error('非法risk');
 const p=loadProject(root),id=`TASK-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${randomUUID()}`;
 const refs=domain?domain.split(','):[];designSources(root,p,refs);
 const git=(...args)=>{const r=spawnSync('git',args,{cwd:root,encoding:'utf8'});return r.status===0?r.stdout.trim():null;};
 const task={schemaVersion:2,id,title,externalIssueRef:null,domainRefs:refs,convergence:null,baseCommit:git('rev-parse','HEAD'),branch:git('branch','--show-current'),worktree:git('rev-parse','--show-toplevel'),stage:'orient',status:'in-progress',scope:[],risk:risk?{level:risk,rationale:''}:null,impact:{paths:[],contractChanges:null,dataChanges:null,securityChanges:null,externalEffects:null,productionEffects:null,behaviorChanges:null,requiredTestLayers:[]},criteriaRefs:[],criteriaResults:[],approvalRefs:[],verificationRefs:[],nextActions:['补充scope/risk依据/impact/验收；按需设计与验证'],completedStages:[]};
 const rel=taskPath(p,id),dir=rel.slice(0,rel.lastIndexOf('/'));mkdirSync(inside(root,dir),{recursive:true});
 writeFileSync(inside(root,rel),JSON.stringify(task,null,2)+'\n',{flag:'wx'});
 writeFileSync(inside(root,`${dir}/task.md`),`# ${title}\n\n${readFileSync(inside(root,p.documents.taskTemplate),'utf8')}\n`,{flag:'wx'});
 return {...task,digest:sha256(readFileSync(inside(root,rel)))};
}
export function taskIndex(root){
 const p=loadProject(root),paths=taskFiles(root,p);
 const tasks=paths.map(path=>validateTask(readJson(root,path)));
 if(new Set(tasks.map(t=>t.id)).size!==tasks.length)throw new Error('重复task ID');
 const text='# 本地执行材料索引\n\n仅当前已收到快照；其他worktree不会自动同步，未传递内容是local-only。\n\n| 任务 | 阶段 | 状态 | 下轮首做 |\n|---|---|---|---|\n'+tasks.map(t=>`| [${t.id}](${t.id}/task.md) | ${t.stage} | ${t.status} | ${(t.nextActions||[]).join('; ').replaceAll('|','\\|')} |`).join('\n')+'\n';
 mkdirSync(inside(root,p.documents.tasks),{recursive:true});writeFileSync(inside(root,`${p.documents.tasks}/README.md`),text);return tasks;
}
function updateTask(root,id,expected,edit){
 const p=loadProject(root),rel=taskPath(p,id),path=inside(root,rel),before=readFileSync(path),t=validateTask(JSON.parse(before));
 if(!expected||sha256(before)!==expected)throw new Error('task旧内容指纹不符；拒绝覆盖并行修改');
 edit(t,p);
 if(sha256(readFileSync(path))!==expected)throw new Error('task期间发生变更');
 writeFileSync(path,JSON.stringify(t,null,2)+'\n');return {...t,digest:sha256(readFileSync(path))};
}
export function advanceTask(root,{id,stage,expected,note}){
 return updateTask(root,id,expected,t=>{
  validateTask(t,{ready:true});
  if(t.status!=='in-progress')throw new Error('仅in-progress可推进');
  if(stages.indexOf(stage)!==stages.indexOf(t.stage)+1)throw new Error('不允许跳阶段');
  if(!note?.trim())throw new Error('推进须提供阶段完成依据note');
  if(t.stage==='design'&&Number(t.risk.level[1])>=2&&!t.approvalRefs.some(a=>a.kind==='design'&&a.source))throw new Error('T2设计缺批准来源');
  t.completedStages=[...(t.completedStages||[]),{stage:t.stage,note}];t.stage=stage;
 });
}
export function finishTask(root,{id,evidence,expected}){
 const p=loadProject(root),t=loadTask(root,p,id,{ready:true});
 if(!expected)expected=sha256(readFileSync(inside(root,taskPath(p,id))));
 const result=updateTask(root,id,expected,current=>{
  if(current.status!=='in-progress')throw new Error('仅in-progress状态可以完成任务');
  if(current.stage!=='handover'||!stages.slice(0,-1).every(s=>(current.completedStages||[]).some(c=>c.stage===s&&c.note)))throw new Error('需先完成全部阶段与交接');
  if(!readFileSync(inside(root,p.documents.handover),'utf8').includes(id))throw new Error('HANDOVER需指向当前任务');
  if(!existsSync(inside(root,evidence)))throw new Error('证据未收到/local-only，需本机重跑');
  const report=readJson(root,evidence);
  if(!report.taskReady||report.exitCode!==0||report.taskId!==id||report.intent!=='complete'||report.fingerprint!==fingerprint(root)||report.taskContext!==taskContext(current))throw new Error('完成验证证据缺失或输入已过期');
  for(const id of ['core.design','core.convergence'])if(!report.results?.some(r=>r.id===id&&r.required&&r.status==='pass'))throw new Error('旧凭据缺真实设计来源/收敛审查，不能完成');
  checkCriteria(root,current,p);
  if(!Array.isArray(report.consumedInputs)||JSON.stringify(report.consumedInputs)!==JSON.stringify(consumedInputs(root,p,current,completionChecks(p,report.profile))))throw new Error('正式来源/实际输入闭包已过期，需重新验证');
  const convergence=checkConvergence(root,p,{taskRecord:current,intent:'complete'});if(convergence.status!=='pass')throw new Error(convergence.message);
  if(!Array.isArray(report.results)||!report.results.length||report.results.some(r=>r.status==='fail'||(r.required&&r.status==='blocked')))throw new Error('证据结果不满足完成条件');
  finishTaskAssets(root,id,evidence,{releaseOthers:false});
  current.status='done';current.verificationRefs=[...current.verificationRefs,{path:evidence,availability:'local-only',fingerprint:report.fingerprint}];current.nextActions=debtTransfers(root,p,current).map(item=>`${item.id}: ${item.transfer.path}#${item.transfer.id}；关闭条件：${item.transfer.closureCriteria}`);
 });
 try{result.assets=finishTaskAssets(root,id,evidence);}catch(e){result.maintenanceWarning=`完成凭据已保护；旧运行保护尚未释放: ${e.message}`;}
 return result;
}
