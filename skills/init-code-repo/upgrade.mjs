import {readFileSync,existsSync,mkdirSync,writeFileSync,renameSync,unlinkSync,openSync,readSync,closeSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID,createHash} from 'node:crypto';
import {buildFiles,assertSafeTarget} from './assemble.mjs';
import {fileOwnership} from './project.mjs';
import {legacyFiles} from './legacy-files.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
// Bounded memory even when a declared source/output is a large artifact.
export function hashFile(path){
 const descriptor=openSync(path,'r'),digest=createHash('sha256'),buffer=Buffer.allocUnsafe(1024*1024);
 try{let size;while((size=readSync(descriptor,buffer,0,buffer.length,null))>0)digest.update(buffer.subarray(0,size));return digest.digest('hex');}finally{closeSync(descriptor);}
}
export const seal=p=>hash(JSON.stringify({...p,digest:undefined}));
const current=(root,path)=>{const abs=assertSafeTarget(root,path);return existsSync(abs)?hashFile(abs):null;};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
// Preserve actual edits to old defaults while allowing the new configuration to change defaults.
// Customized leaves survive template evolution; explicit intake overrides are applied below.
function mergeProjectDefaults(wanted,actual,previous){
 if(same(actual,previous))return wanted;
 if(same(wanted,previous))return actual;
 if(object(wanted)&&object(actual)){
  const result={};for(const key of new Set([...Object.keys(wanted),...Object.keys(actual)])){
   const value=mergeProjectDefaults(wanted[key],actual[key],previous?.[key]);if(value!==undefined)result[key]=value;
  }
  // argv/cwd and file selection form one execution contract. A new selector
  // must never be grafted onto a project's customized command during merge.
  if(wanted.kind==='command'&&actual.kind==='command'&&previous&&['argv','cwd','inputSelection'].some(key=>!same(actual[key],previous[key])))for(const key of ['argv','cwd','inputSelection']){
   if(Object.hasOwn(actual,key))result[key]=actual[key];else delete result[key];
  }
  return result;
 }
 if(Array.isArray(wanted)&&Array.isArray(actual)){
  const old=Array.isArray(previous)?previous:[];
  if([...wanted,...actual,...old].every(value=>object(value)&&typeof value.id==='string')){
   const actualById=new Map(actual.map(value=>[value.id,value])),oldById=new Map(old.map(value=>[value.id,value]));
   // An old default absent from actual is a project deletion, not a missing new default.
   return [...wanted.filter(value=>actualById.has(value.id)||!oldById.has(value.id)).map(value=>actualById.has(value.id)?mergeProjectDefaults(value,actualById.get(value.id),oldById.get(value.id)):value),...actual.filter(value=>!oldById.has(value.id)&&!wanted.some(next=>next.id===value.id))];
  }
 }
 return actual===undefined?wanted:actual;
}
function upgradedProject(wanted,actual,previous,input){
 const result=mergeProjectDefaults(wanted,actual,previous);
 // Required tool checks and lifecycle metadata evolve with the installed tooling.
 const explicit=new Map((input.checks||[]).map(check=>[check.id,check]));
 const merged=new Map((result.checks||[]).map(check=>[check.id,check]));
 for(const check of wanted.checks)if(check.kind==='builtin'||explicit.has(check.id))merged.set(check.id,check);
 for(const [stack,cwd] of Object.entries(input.stackRoots||{}))for(const check of wanted.checks.filter(value=>value.kind==='command'&&value.id.startsWith(stack+'.')))if(merged.has(check.id)&&!explicit.has(check.id))merged.set(check.id,{...merged.get(check.id),cwd});
 result.checks=[...merged.values()];
 if(Object.hasOwn(input,'stacks')||Object.hasOwn(input,'stackRoots'))result.stacks=wanted.stacks;
 if(Object.hasOwn(input,'runtimes'))result.runtimes=wanted.runtimes;
 if(input.branchModel)result.worktree={...result.worktree,defaultBase:wanted.worktree.defaultBase};
 result.fingerprintExcludes=[...new Set([...wanted.fingerprintExcludes,...(actual.fingerprintExcludes||[]).filter(value=>!(previous?.fingerprintExcludes||[]).includes(value))])];
 for(const key of ['schemaVersion','nodeMinimum','templateRevision','assemblyConfig','documents'])result[key]=wanted[key];
 result.capabilities=[...new Set([...wanted.capabilities,...(actual.capabilities||[]).filter(value=>!(previous?.capabilities||[]).includes(value))])];
 if(Object.hasOwn(input,'ci'))result.ci=wanted.ci;
 return result;
}
export function planUpgrade(target,input,{legacyConfig}={}){
 const root=resolve(target),receiptPath=assertSafeTarget(root,'.harness/assembly.json');let baseline,receipt;
 if(existsSync(receiptPath)){
  receipt=JSON.parse(readFileSync(receiptPath,'utf8'));if(receipt.schemaVersion!==2||!receipt.files)throw new Error('未知基线版本');baseline=new Map(Object.entries(receipt.files).map(([p,v])=>[p,v.sha256]));baseline.set('.harness/assembly.json',hash(readFileSync(receiptPath)));
 }else if(legacyConfig)baseline=new Map([...legacyFiles(legacyConfig)].map(([p,s])=>[p,hash(s)]));
 else throw new Error('缺受管理baseline；v1需显式提供legacyConfig基线，禁止猜测覆盖');
 const projectPath=assertSafeTarget(root,'.harness/project.json'),actualProject=existsSync(projectPath)?JSON.parse(readFileSync(projectPath,'utf8')):null;
 for(const [role,path] of Object.entries(input.documents||{}))if(actualProject?.documents?.[role]&&actualProject.documents[role]!==path)throw new Error(`document职责迁移需单独审阅: ${role} ${actualProject.documents[role]} -> ${path}；不创建平行权威`);
 const selectedStacks=input.stacks||receipt?.config?.stacks||[];
 const rootOverrides={...(receipt?.config?.stackRoots||{}),...Object.fromEntries((actualProject?.stacks||[]).map(stack=>[stack.id,stack.cwd||'.'])),...(input.stackRoots||{})};
 const effectiveInput={...(receipt?.config||{}),...input,documents:{...(actualProject?.documents||receipt?.config?.documents||{}),...(input.documents||{})},stackRoots:Object.fromEntries(Object.entries(rootOverrides).filter(([id])=>selectedStacks.includes(id)))};
 const previous=actualProject?(receipt?.projectDefaults||(receipt?.files['.harness/project.json']?.sha256===hash(readFileSync(projectPath))?actualProject:JSON.parse(buildFiles(receipt?.config||legacyConfig).get('.harness/project.json')))):null;
 const fresh=buildFiles(effectiveInput);
 // Long-term prose and actual project configuration belong to the project.
 const ownership=path=>['.harness/assets.json','.harness/project.json'].includes(path)?'project':receipt?.files[path]?.ownership||fileOwnership(path);
 for(const [path,content] of [...fresh])if(ownership(path)==='project'&&current(root,path)!==null){
  if(path==='.harness/project.json'){const wanted=JSON.parse(content),actual=JSON.parse(readFileSync(assertSafeTarget(root,path),'utf8'));fresh.set(path,JSON.stringify(upgradedProject(wanted,actual,previous,input),null,2)+'\n');}
  else fresh.set(path,readFileSync(assertSafeTarget(root,path),'utf8'));
 }
 const nextReceipt=JSON.parse(fresh.get('.harness/assembly.json'));
 for(const [path,content] of fresh)if(path!=='.harness/assembly.json')nextReceipt.files[path]={...nextReceipt.files[path],sha256:hash(content),ownership:ownership(path)};
 for(const [path,entry] of Object.entries(receipt?.files||{}))if(!fresh.has(path))nextReceipt.files[path]=entry;
 fresh.set('.harness/assembly.json',JSON.stringify(nextReceipt,null,2)+'\n');
 const changes=[];
 for(const [path,content] of fresh){
  const observed=current(root,path),expected=baseline.get(path)??null,next=hash(content);
  const action=observed===next?'unchanged':observed!==expected&&ownership(path)!=='project'?'conflict':observed===null?'add':'update';
  changes.push({path,action,expected:observed,baseline:expected,next,content});
 }
 for(const [path,expected] of baseline)if(!fresh.has(path))changes.push({path,action:'retain',expected:current(root,path),baseline:expected,message:'历史/未选能力保留，不删除'});
 const plan={schemaVersion:2,id:randomUUID(),root,createdAt:new Date().toISOString(),changes};plan.digest=seal(plan);return plan;
}
export function checkUpgrade(target,plan){
 const root=resolve(target),errors=[];
 if(plan?.schemaVersion!==2||plan.root!==root||plan.digest!==seal(plan)||!Array.isArray(plan.changes))return ['计划版本/根路径/内容指纹不符'];
 const seen=new Set();
 for(const c of plan.changes){
  try{if(seen.has(c.path))throw new Error('重复输出路径');seen.add(c.path);if(!['add','update','unchanged','conflict','retain'].includes(c.action))throw new Error('未知action');
   if(current(root,c.path)!==c.expected)errors.push(`${c.path}: 计划后文件变化`);
   if(c.action==='conflict')errors.push(`${c.path}: 人工改动/未知归属冲突`);
   if(['add','update','unchanged'].includes(c.action)&&hash(c.content)!==c.next)errors.push(`${c.path}: 计划产物指纹不符`);
  }catch(e){errors.push(`${c.path}: ${e.message}`);}
 }
 return errors;
}
export function applyUpgrade(target,plan){
 const root=resolve(target),errors=checkUpgrade(root,plan);if(errors.length)throw new Error(errors.join('\n'));
 const changes=plan.changes.filter(c=>['add','update'].includes(c.action));
 const backupPath=`.harness/local/upgrades/${plan.id}`,backup=assertSafeTarget(root,backupPath);mkdirSync(backup,{recursive:true});
 const originals=new Map(),inverse=[];
 for(const c of changes){
  const path=assertSafeTarget(root,c.path);const bytes=existsSync(path)?readFileSync(path):null;originals.set(c.path,bytes);
  if(bytes!==null){const file=assertSafeTarget(root,`${backupPath}/before/${c.path}`);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,bytes,{flag:'wx'});}
  const stage=assertSafeTarget(root,`${backupPath}/staged/${c.path}`);mkdirSync(dirname(stage),{recursive:true});writeFileSync(stage,c.content,{flag:'wx'});
  inverse.push({path:c.path,before:c.expected,after:c.next,restoreFrom:bytes===null?null:`${backupPath}/before/${c.path}`});
 }
 writeFileSync(join(backup,'inverse.json'),JSON.stringify({planId:plan.id,changes:inverse},null,2)+'\n',{flag:'wx'});
 const late=checkUpgrade(root,plan);if(late.length)throw new Error(late.join('\n'));
 const written=[];
 try{for(const c of changes){const out=assertSafeTarget(root,c.path);if(current(root,c.path)!==c.expected)throw new Error(`替换期间文件变化: ${c.path}`);mkdirSync(dirname(out),{recursive:true});renameSync(assertSafeTarget(root,`${backupPath}/staged/${c.path}`),out);written.push(c.path);}}
 catch(e){const competing=[];for(const path of written.reverse()){const c=changes.find(x=>x.path===path);if(current(root,path)!==c.next){competing.push(path);continue;}const before=originals.get(path);if(before===null)unlinkSync(assertSafeTarget(root,path));else writeFileSync(assertSafeTarget(root,path),before);}throw new Error(`升级失败，已恢复未被第三方改动的本批文件；保留journal及并发改动${competing.join(',')}: ${e.message}`);}
 return {applied:true,changed:written,retained:plan.changes.filter(c=>c.action==='retain').map(c=>c.path),backupPath};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2),cmd=args.shift(),opts={};for(let i=0;i<args.length;i+=2){if(!['--root','--config','--from-config','--out','--plan'].includes(args[i])||!args[i+1])throw new Error('未知/缺少参数');opts[args[i].slice(2)]=args[i+1];}
  if(!opts.root)throw new Error('需--root');let result;
  if(cmd==='plan'){
   if(!opts.config)throw new Error('需--config');result=planUpgrade(opts.root,JSON.parse(readFileSync(opts.config)),{legacyConfig:opts['from-config']?JSON.parse(readFileSync(opts['from-config'])):undefined});
   if(opts.out)writeFileSync(opts.out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  }else{if(!opts.plan)throw new Error('需--plan');const plan=JSON.parse(readFileSync(opts.plan));if(cmd==='check'){const conflicts=checkUpgrade(opts.root,plan);result={conflicts};if(conflicts.length)process.exitCode=2;}else if(cmd==='apply')result=applyUpgrade(opts.root,plan);else throw new Error('命令: plan/check/apply');}
  console.log(JSON.stringify(result,null,2));
 }catch(e){console.error(e.message);process.exitCode=2;}
}
