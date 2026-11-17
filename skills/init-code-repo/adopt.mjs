// Explicit, additive adoption of ordinary repositories. No Git, installs, moves or discovery outside root.
import {readFileSync,readdirSync,lstatSync,existsSync,writeFileSync} from 'node:fs';
import {resolve,join,posix} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {buildFiles,assertSafeTarget} from './assemble.mjs';
import {resolveConfig,fileOwnership,safeRelative} from './project.mjs';
import {checkUpgrade,applyUpgrade,seal,hashFile} from './upgrade.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const get=(root,path)=>{const file=assertSafeTarget(root,path);if(!existsSync(file))return null;if(!lstatSync(file).isFile())throw new Error(`非普通文件: ${path}`);return readFileSync(file,'utf8');};
const excludedDirectoryNames=['.git','node_modules','.venv','venv','__pycache__','.artifacts'];
function scopeFor(protectedPaths=[],declared=[]){
 if(!Array.isArray(declared))throw new Error('snapshotExcludes须为仓内非源码目录路径数组');
 for(const path of declared){safeRelative(path);if(path==='.')throw new Error('snapshotExcludes不可排除仓根');}
 return {excludedDirectoryNames,excludedPaths:['.harness/local',...declared],protectedPaths:[...new Set(protectedPaths)].sort(),cost:'按纳入源文件全部字节流式哈希；排除目录不认领、不删除，不提供这些目录的源新鲜度证据'};
}
function snapshot(root,scope,dir=''){
 const result={};assertSafeTarget(root,'.harness/assembly.json');
 for(const e of readdirSync(join(root,dir),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const path=dir?`${dir}/${e.name}`:e.name;
  const directoryEntry=e.isDirectory()||e.isSymbolicLink();
  const excluded=path.split('/').slice(0,-1).some(segment=>scope.excludedDirectoryNames.includes(segment))||(directoryEntry&&scope.excludedDirectoryNames.includes(e.name))||scope.excludedPaths.some(exclude=>path.startsWith(exclude+'/')||(path===exclude&&directoryEntry));
  const protectedPath=scope.protectedPaths.some(include=>path===include||path.startsWith(include+'/')||include.startsWith(path+'/'));
  if(excluded&&!protectedPath)continue;
  if(e.isSymbolicLink())throw new Error(`symlink输入拒绝: ${path}`);
  if(e.isDirectory())Object.assign(result,snapshot(root,scope,path));else if(e.isFile())result[path]=hashFile(assertSafeTarget(root,path));else throw new Error(`非普通输入: ${path}`);
 }return result;
}
export function inspectRepository(target,{protectedPaths=[],snapshotExcludes=[]}={}){const root=resolve(target),snapshotScope=scopeFor(protectedPaths,snapshotExcludes),files=snapshot(root,snapshotScope);return {schemaVersion:2,root,managed:Object.hasOwn(files,'.harness/assembly.json'),files,snapshotScope,documents:Object.keys(files).filter(p=>p.endsWith('.md')),message:'只读清单；请显式documents/domains/stackRoots/checks认领实际职责，不猜测设计权威'};}
function appendBlock(text,name,body){const start=`<!-- harness:${name}:start -->`,end=`<!-- harness:${name}:end -->`;if(text.includes(start)||text.includes(end))throw new Error(`已有${name}受控块；请先核对现有接入，不重复追加`);return text+(text.endsWith('\n')?'':'\n')+`\n${start}\n${body}\n${end}\n`;}
export function planAdoption(target,input){
 const root=resolve(target),config=resolveConfig(input),fresh=buildFiles(config),project=JSON.parse(fresh.get('.harness/project.json')),remediation=[],changes=[],ownership={};
 const protectedPaths=[...fresh.keys(),...Object.values(config.documents||{}),...(config.domains||[]).map(domain=>domain.path),...(config.checks||[]).flatMap(check=>(check.inputs||[]).map(path=>posix.join(check.cwd||'.',path)))];
 const inspection=inspectRepository(root,{protectedPaths,snapshotExcludes:config.snapshotExcludes||[]});if(inspection.managed)throw new Error('已有receipt，请使用upgrade plan/check/apply');
 project.policy={mode:'adopted'};
 for(const path of Object.values(config.documents||{}))ownership[path]='project';
 // Index entries are a controlled additive mapping, not duplicate domain documents.
 const index=project.documents.domainIndex,indexText=get(root,index)??fresh.get(index);
 fresh.set(index,indexText);
 if(config.domains?.length){
  for(const domain of config.domains){if(get(root,domain.path)===null)throw new Error(`域权威不存在: ${domain.path}；请显式提供现有正文`);ownership[domain.path]='project';if(!fresh.has(domain.path))fresh.set(domain.path,get(root,domain.path));}
  const declared=new Map(),declaredPaths=new Map();
  for(const line of indexText.split('\n').filter(line=>/^\s*\|/.test(line))){const id=line.split('|')[1].trim(),links=[...line.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)];if(!links.length)continue;if(links.length!==1||declared.has(id))throw new Error(`已有域索引身份冲突: ${id}`);const path=posix.normalize(posix.join(posix.dirname(index),decodeURIComponent(links[0][1].split('#')[0])));if(declaredPaths.has(path))throw new Error(`已有域索引路径重复: ${path}`);declared.set(id,path);declaredPaths.set(path,id);}
  const missing=[];
  for(const domain of config.domains){if((declared.has(domain.id)&&declared.get(domain.id)!==domain.path)||(declaredPaths.has(domain.path)&&declaredPaths.get(domain.path)!==domain.id))throw new Error(`域身份/映射冲突: ${domain.id} -> ${domain.path}；先裁决现有唯一权威`);if(!declared.has(domain.id))missing.push(domain);}
  const href=path=>encodeURI(path).replaceAll('(','%28').replaceAll(')','%29');
  const rows=missing.map(d=>`| ${d.id} | ${d.description} | [${d.id}](${href(posix.relative(posix.dirname(index),d.path))}) |`).join('\n');
  if(missing.length&&get(root,index)!==null)fresh.set(index,appendBlock(indexText,'domains',`| 域 | 职责 | 权威 |\n|---|---|---|\n${rows}`));
  else if(get(root,index)===null)fresh.set(index,indexText+`\n| 域 | 职责 | 权威 |\n|---|---|---|\n${rows}\n`);
 }
 const entry=`## 工程治理接入与授权边界\n\n既有项目规则继续适用；外部动作须明确授权。政策/设计入口：\n\n${Object.entries(project.documents).filter(([role])=>['constitution','systemDesign','domainModel','domainIndex','workflow','handover'].includes(role)).map(([role,path])=>`- ${role}: [${path}](${path})`).join('\n')}\n${project.skills.map(s=>`- 方法: [${s.path}](${s.path})`).join('\n')}\n\n验证：node scripts/harness/check.mjs --profile fast；内容差距见认领计划remediation。`;
 for(const path of ['AGENTS.md','CLAUDE.md']){const before=get(root,path);if(before!==null){fresh.set(path,appendBlock(before,path==='AGENTS.md'?'entry':'claude',path==='AGENTS.md'?entry:'@AGENTS.md'));ownership[path]='project';}}
 const ignore=get(root,'.gitignore');if(ignore!==null){fresh.set('.gitignore',ignore+'\n# harness:ignore:start\n# harness local execution materials\n/.artifacts/\n.harness/local/\nspecs/*/plan/\nspecs/*/tasks/\nspecs/*/implement/\n# harness:ignore:end\n');ownership['.gitignore']='project';}
 fresh.set('.harness/project.json',JSON.stringify(project,null,2)+'\n');
 for(const [path,content] of fresh){if(path==='.harness/assembly.json')continue;const before=get(root,path);let chosen=content,action=before===null?'add':before===content?'unchanged':'conflict';const owner=ownership[path]||fileOwnership(path);ownership[path]=owner;
  if(path==='.harness/project.json'&&before!==null){action='conflict';ownership[path]='template';}
  if(before!==null&&owner==='project'&&path!=='.harness/project.json'&&!['AGENTS.md','CLAUDE.md','.gitignore',index].includes(path)){chosen=before;action='unchanged';}
  if(before!==null&&['AGENTS.md','CLAUDE.md','.gitignore',index].includes(path)&&owner==='project')action=before===chosen?'unchanged':'update';
  fresh.set(path,chosen);changes.push({path,action,expected:before===null?null:hash(before),baseline:null,next:hash(chosen),content:chosen,message:action==='conflict'?'未知工具/配置碰撞；保留现状，明确迁移/改名后重新plan':undefined});
 }
 for(const [role,path] of Object.entries(project.documents))if(!['tasks','testSpec'].includes(role))remediation.push({role,path,status:'review-required',message:get(root,path)!==null?'已保留原文；核对项目批准目标、内容结构与来源/验收标识，不自动重写':'已提供治理骨架；填写项目真实目标、当前实现和未闭环，骨架不等于验收通过'});
 for(const check of project.checks.filter(c=>c.kind==='command'&&c.argv[0]==='npm')){const script=check.argv[1]==='test'?'test':check.argv[1]==='run'?check.argv[2]:null;if(!script)continue;const packagePath=(check.cwd&&check.cwd!=='.'?check.cwd+'/':'')+'package.json';const source=get(root,packagePath)??fresh.get(packagePath);if(source){try{if(!JSON.parse(source).scripts?.[script])remediation.push({role:'check',id:check.id,path:packagePath,status:'required',message:`现有package未声明scripts.${script}；在checks中声明实际argv/cwd/inputs，或在原包配置中补充真实检查，工具不改写包配置。`});}catch{remediation.push({role:'check',id:check.id,path:packagePath,status:'required',message:'现有package无法解析；保留原文，请核对实际命令配置'});}}}
 for(const domain of config.domains||[]){const body=get(root,domain.path),missing=['目标','约束','需求与验收','(?:架构|结构)','数据','决策沿革','红线','开放项'].filter(heading=>!new RegExp(`^## .*${heading}`,'m').test(body));if(missing.length)remediation.push({role:'domain',path:domain.path,status:'required',message:`原文已保留；当前机查缺设计内容节: ${missing.join('、')}。请在原权威中补充或明确适配，不复制另一份设计。`});}
 if(!config.domains?.length)remediation.push({role:'domains',status:'required',message:'请认领现有功能域：domains:[{id,path,description}]；未定位真实域前不能完整完成变化'});
 const receipt=JSON.parse(fresh.get('.harness/assembly.json'));receipt.adopted=true;receipt.config=config;receipt.files=Object.fromEntries(changes.map(c=>[c.path,{sha256:c.next,owner:'adoption',ownership:ownership[c.path]}]));
 const content=JSON.stringify(receipt,null,2)+'\n';changes.push({path:'.harness/assembly.json',action:'add',expected:null,baseline:null,next:hash(content),content});
 const plan={schemaVersion:2,kind:'adoption',id:randomUUID(),root,createdAt:new Date().toISOString(),sourceFiles:inspection.files,snapshotScope:inspection.snapshotScope,remediation,changes};plan.digest=seal(plan);return plan;
}
export function checkAdoption(target,plan){const errors=checkUpgrade(target,plan);if(plan?.kind!=='adoption')errors.push('不是adoption计划');try{if(JSON.stringify(snapshot(resolve(target),plan.snapshotScope||scopeFor()))!==JSON.stringify(plan.sourceFiles))errors.push('计划后仓内来源变化；重新inspect/plan');}catch(e){errors.push(e.message);}return errors;}
export function applyAdoption(target,plan){const errors=checkAdoption(target,plan);if(errors.length)throw new Error(errors.join('\n'));return {...applyUpgrade(target,plan),remediation:plan.remediation};}
export function planAdoptions(entries){if(!Array.isArray(entries)||!entries.length)throw new Error('批量计划须显式非空root/config列表');const seen=new Set();return entries.map(e=>{const root=resolve(e.root);if(seen.has(root))throw new Error('重复批量root');seen.add(root);return planAdoption(root,typeof e.config==='string'?JSON.parse(readFileSync(e.config,'utf8')):e.config);});}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const args=process.argv.slice(2),cmd=args.shift(),opts={};for(let i=0;i<args.length;i+=2){if(!['--root','--config','--plan','--out','--roots'].includes(args[i])||!args[i+1])throw new Error('未知/缺少参数');opts[args[i].slice(2)]=args[i+1];}let result;
 if(cmd==='batch-plan'){if(!opts.roots)throw new Error('需--roots JSON显式列表');result={plans:planAdoptions(JSON.parse(readFileSync(opts.roots,'utf8')))};}
 else{if(!opts.root)throw new Error('需--root');if(cmd==='inspect')result=inspectRepository(opts.root);else if(cmd==='plan'){if(!opts.config)throw new Error('需--config');result=planAdoption(opts.root,JSON.parse(readFileSync(opts.config,'utf8')));}else if(['check','apply'].includes(cmd)){if(!opts.plan)throw new Error('需--plan');let plan=JSON.parse(readFileSync(opts.plan,'utf8'));if(Array.isArray(plan.plans)){const matches=plan.plans.filter(item=>item.root===resolve(opts.root));if(matches.length!==1)throw new Error('批量计划必须且只能包含一个匹配root');plan=matches[0];}if(cmd==='check'){result={conflicts:checkAdoption(opts.root,plan)};if(result.conflicts.length)process.exitCode=2;}else result=applyAdoption(opts.root,plan);}else throw new Error('命令inspect/plan/check/apply/batch-plan');}
 if(opts.out)writeFileSync(opts.out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result,null,2));
 }catch(e){console.error(e.message);process.exitCode=2;}
}
