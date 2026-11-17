import { readFileSync, readdirSync, existsSync, lstatSync, realpathSync } from 'node:fs';
import { resolve, join, relative, dirname } from 'node:path';
import { createHash } from 'node:crypto';
export const stages=['orient','specify','design','analyze','implement','verify','converge','handover'];
export const sha256=s=>createHash('sha256').update(s).digest('hex');
export function inside(root,path){
 if(typeof path!=='string'||!path||path.includes('\\')||path.includes(':')||path.startsWith('/')||path.split('/').includes('..'))throw new Error(`非法仓内路径: ${path}`);
 const base=resolve(root),out=resolve(base,path);
 if(out!==base&&!out.startsWith(base+'/'))throw new Error('路径逃出仓根');
 let ancestor=base;while(!lstatSync(ancestor,{throwIfNoEntry:false})){const parent=dirname(ancestor);if(parent===ancestor)break;ancestor=parent;}
 const stat=lstatSync(ancestor,{throwIfNoEntry:false});
 if(stat?.isSymbolicLink()||realpathSync(ancestor)!==ancestor)throw new Error('拒绝symlink仓根/已有祖先');
 if(!stat?.isDirectory())throw new Error('根父路径不是目录');
 let cursor=base;const parts=path.split('/').filter(p=>p&&p!=='.');
 for(let i=0;i<parts.length;i++){cursor=join(cursor,parts[i]);const s=lstatSync(cursor,{throwIfNoEntry:false});if(s?.isSymbolicLink())throw new Error(`拒绝symlink: ${path}`);if(s&&i<parts.length-1&&!s.isDirectory())throw new Error(`父路径不是目录: ${path}`);}
 return out;
}
export const readJson=(root,path)=>JSON.parse(readFileSync(inside(root,path),'utf8'));
export function validateProject(p){
 if(p?.schemaVersion!==2||p.nodeMinimum!==22)throw new Error('不支持的project schema/Node版本契约');
 if(!Array.isArray(p.capabilities)||!p.capabilities.includes('base-policy')||!p.capabilities.includes('task-context'))throw new Error('缺基础capabilities');
 if(!p.documents||!Array.isArray(p.checks)||p.checks.length===0||!p.workflow||JSON.stringify(p.workflow.stages)!==JSON.stringify(stages))throw new Error('project结构/生命周期非法');
 for(const path of Object.values(p.documents))inside('.',path);
 const ids=new Set();
 for(const c of p.checks){
  if(!c.id||ids.has(c.id)||!['builtin','command'].includes(c.kind)||typeof c.required!=='boolean'||!Array.isArray(c.profiles)||!c.profiles.length||c.profiles.some(x=>!['fast','ci','release'].includes(x)))throw new Error(`check注册非法: ${c.id}`);
  ids.add(c.id);
  if(c.kind==='command'){
   if(!Array.isArray(c.argv)||!c.argv.length||c.argv.some(x=>typeof x!=='string'||x.includes('\0'))||!['local-validation','real-e2e'].includes(c.effect)||!(c.timeoutSeconds>0))throw new Error(`命令契约非法: ${c.id}`);
   if(/^(ba|z|da)?sh$|^(cmd|powershell|pwsh)(\.exe)?$/i.test(c.argv[0]))throw new Error('命令不得求值shell字符串');
   inside('.',c.cwd||'.');
   if(c.inputs!==undefined&&(!Array.isArray(c.inputs)||c.inputs.some(path=>typeof path!=='string'||!path)))throw new Error(`命令inputs须为非空路径数组: ${c.id}`);
   if(c.inputSelection!==undefined){
    const s=c.inputSelection;
    if(!s||s.kind!=='python-files'||Object.keys(s).some(k=>!['kind','excludeDirectoryNames','excludePaths'].includes(k))||!Array.isArray(s.excludeDirectoryNames)||s.excludeDirectoryNames.some(name=>typeof name!=='string'||!name||name==='.'||name==='..'||/[\\/:]/.test(name))||!Array.isArray(s.excludePaths))throw new Error(`命令inputSelection非法: ${c.id}`);
    for(const path of s.excludePaths){inside('.',path);if(path==='.')throw new Error('inputSelection不可排除整个cwd');}
   }
  }
 }
 if(!p.completeness||!/^P[0-3]$/.test(p.completeness.stage)||!p.completeness.required)throw new Error('完整性配置非法');
 return p;
}
export const loadProject=root=>validateProject(readJson(root,'.harness/project.json'));
export function listFiles(root,dir='',excluded){
 if(!excluded){const file=inside(root,'.harness/project.json');excluded=existsSync(file)?JSON.parse(readFileSync(file,'utf8')).fingerprintExcludes||[]:[];if(!Array.isArray(excluded))throw new Error('fingerprintExcludes必须为数组');for(const path of excluded){if(path==='.')throw new Error('不可排除整个仓根');inside(root,path);}}
 const out=[];
 for(const e of readdirSync(join(root,dir),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
  const rel=dir?`${dir}/${e.name}`:e.name;
  if(/^specs\/[^/]+\/(plan|tasks|implement)(\/|$)/.test(rel))continue;
  if(e.name==='.git'||e.name==='node_modules'||e.name==='__pycache__'||excluded.some(p=>rel===p||rel.startsWith(p+'/'))||rel==='.harness/local')continue;
  if(e.isSymbolicLink())throw new Error(`symlink输入不在受支持的证据范围: ${rel}`);
  if(e.isDirectory())out.push(...listFiles(root,rel,excluded));else if(e.isFile())out.push(rel);
 }
 return out;
}
export function fingerprint(root){
 return sha256(listFiles(root).filter(p=>!/^docs\/tasks\/[^/]+\/task\.json$/.test(p)&&p!=='docs/tasks/README.md').map(p=>p+'\0'+sha256(readFileSync(join(root,p)))).join('\0'));
}
export function taskContext(task){return sha256(JSON.stringify({id:task.id,risk:task.risk,impact:task.impact,scope:task.scope,baseCommit:task.baseCommit,domainRefs:task.domainRefs,convergence:task.convergence,rollbackRef:task.rollbackRef,criteriaRefs:task.criteriaRefs,criteriaResults:task.criteriaResults,approvalRefs:task.approvalRefs}));}
export function validateTask(t,{ready=false}={}){
 if(t?.schemaVersion!==2||!/^TASK-\d{8}-[a-f0-9-]{36}$/.test(t.id)||!stages.includes(t.stage)||!['in-progress','blocked','done','cancelled'].includes(t.status))throw new Error('task schema/id/stage/status非法');
 for(const k of ['scope','domainRefs','criteriaRefs','approvalRefs','verificationRefs','nextActions'])if(!Array.isArray(t[k]))throw new Error(`task缺少${k}`);
 if(ready){
  if(!/^T[0-3]$/.test(t.risk?.level)||!t.risk.rationale?.trim())throw new Error('缺risk判定/依据');
  if(!Array.isArray(t.impact?.paths)||!Array.isArray(t.impact?.requiredTestLayers)||t.impact.requiredTestLayers.some(x=>!['L1','L2','L3'].includes(x)))throw new Error('缺impact范围/测试层级');
  for(const key of ['contractChanges','dataChanges','securityChanges','externalEffects','productionEffects','behaviorChanges'])if(typeof t.impact[key]!=='boolean')throw new Error(`未知impact.${key}`);
  const min=t.impact.productionEffects?3:['contractChanges','dataChanges','securityChanges','externalEffects'].some(k=>t.impact[k])?2:0;
  if(Number(t.risk.level[1])<min)throw new Error('risk低于实际影响下限');
  if(!t.criteriaRefs.length||!t.scope.length)throw new Error('缺验收或任务范围');
 }
 return t;
}
export function taskPath(project,id){if(!/^TASK-\d{8}-[a-f0-9-]{36}$/.test(id))throw new Error('非法task ID');return `${project.documents.tasks}/${id}/task.json`;}
export function loadTask(root,project,id,options){return validateTask(readJson(root,taskPath(project,id)),options);}
export function taskRequirements(t){
 validateTask(t,{ready:true});const layers=new Set(t.impact.requiredTestLayers);
 if(t.impact.behaviorChanges)layers.add('L1');
 if(['contractChanges','dataChanges','securityChanges','externalEffects'].some(k=>t.impact[k]))layers.add('L2');
 if(t.impact.productionEffects||t.risk.level==='T3')layers.add('L3');
 return {profile:Number(t.risk.level[1])>=3?'release':Number(t.risk.level[1])>=2?'ci':'fast',layers:[...layers]};
}

export function completionChecks(project,profile){
 return project.checks.filter(c=>['fast',...(profile!=='fast'?['ci']:[]),...(profile==='release'?['release']:[])].some(x=>c.profiles.includes(x))||(c.kind==='builtin'&&['config','policy','references','hygiene','tasks','design','convergence','completeness','assets'].includes(c.handler)));
}
