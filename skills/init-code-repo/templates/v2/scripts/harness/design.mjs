// Mechanical support for the Markdown design model. This never decides design semantics.
import { readFileSync, existsSync, readdirSync, lstatSync } from 'node:fs';
import { posix, resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { inside, listFiles, readJson, sha256 } from './model.mjs';
import { materializeCommand } from './command-inputs.mjs';
const read=(root,path)=>readFileSync(inside(root,path),'utf8');
const failure=message=>({status:'fail',message});
const processPath=path=>/(?:^|\/)(?:plan|tasks|implement|archive)(?:\/|$)|^docs\/(?:superpowers|research|implementation)\/|^\.harness\//.test(path);
function localLinks(body,path){
  const links=[];
  for(const line of body.replace(/```[\s\S]*?```/g,'').split('\n'))for(const m of line.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
    const href=m[1];if(/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(href))continue;
    const raw=decodeURIComponent(href.split(/[?#]/)[0]);if(!raw)continue;
    if(raw.startsWith('/')||raw.includes('\\'))throw new Error(`${path}: 非法仓内链接 ${href}`);
    const target=posix.normalize(posix.join(posix.dirname(path),raw));
    links.push({target,href,historical:/^\s*- 历史(?:证据|溯源)：\[[^\]]+\]\([^)]+\)\s*$/.test(line)});
  }
  return links;
}
export function designSources(root,project,domainRefs=[]){
  const index=project.documents.domainIndex;
  if(!index||!existsSync(inside(root,index)))throw new Error('缺长期域设计索引');
  const identities=new Set();
  const domains=[],base=new Set([project.documents.constitution,project.documents.systemDesign,project.documents.domainModel,index]);
  for(const line of read(root,index).split('\n').filter(line=>/^\s*\|/.test(line))){
    const links=localLinks(line,index).filter(link=>!base.has(link.target));
    if(!links.length)continue;
    const identity=line.split('|')[1].trim();
    if(!identity||identities.has(identity)||links.length!==1)throw new Error(`域索引身份重复/平行权威: ${identity}`);
    identities.add(identity);
    for(const {target:path} of links){
      inside(root,path);if(base.has(path))continue;
      if(!path.endsWith('.md')||processPath(path))throw new Error(`域权威路径不合规: ${path}`);
      if(domains.includes(path))throw new Error(`域索引重复: ${path}`);
      domains.push(path);
    }
  }
  for(const ref of domainRefs)if(!domains.includes(ref))throw new Error(`所选域未登记: ${ref}`);
  return {domains,selected:domainRefs,system:project.documents.systemDesign,model:project.documents.domainModel};
}
export function taskFiles(root,project){
  const directory=project.documents.tasks;
  if(!existsSync(inside(root,directory)))return [];
  return readdirSync(inside(root,directory),{withFileTypes:true}).flatMap(entry=>{
    const path=`${directory}/${entry.name}/task.json`;
    if(entry.isSymbolicLink())throw new Error('本地任务目录不支持symlink');
    return entry.isDirectory()&&existsSync(inside(root,path))?[path]:[];
  });
}
function activeDependencyErrors(root,path){
  const errors=[];
  for(const {target,href,historical} of localLinks(read(root,path),path)){
    inside(root,target);
    if(processPath(target)&&!historical)errors.push(`${path}: 活设计依赖过程/历史 ${href}`);
    if(historical&&(!existsSync(inside(root,target))||!target.endsWith('.md')))errors.push(`${path}: 历史证据须为可读Markdown ${href}`);
  }
  return errors;
}
function contentErrors(root,path){
  const body=read(root,path).replace(/<!--[\s\S]*?-->/g,''),errors=[];
  if(/(?:（TODO[^）]*）|\bTODO\b|\bTBD\b|\{\{[^}]+\}\})/i.test(body))errors.push(`${path}: 治理底座仍是未填骨架`);
  const headings=[...body.matchAll(/^(#{1,6})\s+.+$/gm)];
  if(!headings.some(h=>h[1].length>=2))errors.push(`${path}: 治理底座缺有效内容节`);
  for(let i=0;i<headings.length;i++){
    if(headings[i+1]&&headings[i+1][1].length>headings[i][1].length)continue;
    if(!body.slice(headings[i].index+headings[i][0].length,headings[i+1]?.index??body.length).replace(/^[\s#|:*-]+$/gm,'').trim())errors.push(`${path}: 治理底座空节 ${headings[i][0]}`);
  }
  return errors;
}
export function checkDesign(root,project){
  const errors=[];
  for(const key of ['constitution','systemDesign','domainModel','domainIndex','e2e','livingSpecTemplate']){
    const path=project.documents[key];
    if(!path||!existsSync(inside(root,path)))errors.push(`缺治理底座 ${key}`);
  }
  if(errors.length)return failure(errors.join('\n'));
  const {domains}=designSources(root,project);
  const specialized=specializedOwners(root,[project.documents.systemDesign,...domains]);
  const formal=new Set(['README.md','AGENTS.md','CLAUDE.md',...Object.values(project.documents),...domains,...specialized.map(o=>o.path)]);
  // Any parallel spec.md is a second domain authority until the index declares it.
  for(const path of listFiles(root).filter(path=>path.endsWith('/spec.md')))if(!domains.includes(path))errors.push(`${path}: 未登记域/散落设计，先查域索引`);
  for(const path of [project.documents.constitution,project.documents.systemDesign,project.documents.domainModel,...domains,...specialized.map(o=>o.path).filter(path=>path.endsWith('.md'))]){
    if(!existsSync(inside(root,path))){errors.push(`缺权威设计 ${path}`);continue;}
    errors.push(...activeDependencyErrors(root,path));
    if(domains.includes(path)){
      const body=read(root,path);
      for(const heading of ['目标','约束','需求与验收','(?:架构|结构)','数据','决策沿革','红线','开放项'])if(!new RegExp(`^## .*${heading}`, 'm').test(body))errors.push(`${path}: 缺设计内容节 ${heading}`);
      const headings=[...body.matchAll(/^(#{2,6})\s+.+$/gm)];
      for(let i=0;i<headings.length;i++){
        if(headings[i+1]&&headings[i+1][1].length>headings[i][1].length)continue;
        const content=body.slice(headings[i].index+headings[i][0].length,headings[i+1]?.index??body.length).replace(/<!--[\s\S]*?-->/g,'').replace(/^[\s#|:*-]+$/gm,'').trim();
        if(!content)errors.push(`${path}: 设计空节 ${headings[i][0]}`);
      }
      const dir=posix.dirname(path);
      for(const file of listFiles(root).filter(f=>(dir==='.'?!f.includes('/'):f.startsWith(dir+'/'))&&f.endsWith('.md')&&f!==path)){
        if(processPath(file)||formal.has(file))continue;
        const relative=posix.relative(dir,file);
        if(!body.includes(`](${relative})`)||!read(root,file).includes('角色：附属设计'))errors.push(`${file}: 未受spec索引的设计副本；必要附件须明确附属角色`);
      }
    }
  }
  // Read-only Git detection: managed manifests are an additional source, never a Git substitute.
  const top=spawnSync('git',['rev-parse','--show-toplevel'],{cwd:root,encoding:'utf8'});
  let tracked=[];
  if(top.status===0&&resolve(top.stdout.trim())===resolve(root)){
    const r=spawnSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'});
    if(r.status!==0)throw new Error('Git跟踪列表不可读，不能验证过程稿边界');
    tracked=r.stdout.split('\0').filter(Boolean);
  }
  if(existsSync(inside(root,'.harness/assembly.json')))tracked.push(...Object.keys(readJson(root,'.harness/assembly.json').files||{}));
  for(const path of new Set(tracked))if(domains.some(domain=>path.startsWith(posix.dirname(domain)+'/')&&/(?:^|\/)(plan|tasks|implement)(?:\/|$)/.test(path))||/^docs\/tasks\/TASK-/.test(path))errors.push(`${path}: 过程工件被跟踪/管理，不能持续堆入源码知识层`);
  if(errors.length)return failure(errors.join('\n'));
  return domains.length?{status:'pass',message:`${domains.length}个长期域、系统/共享owner及过程依赖结构有效；不证明语义一致`,domains}:{status:'not-applicable',message:'治理底座已生成，尚未定义实际功能域；不能据此完成开发',domains};
}
export function specializedOwners(root,sources){
  const owners=new Map();
  for(const source of sources){
    if(!existsSync(inside(root,source)))throw new Error(`缺权威设计 ${source}`);
    const body=read(root,source).replace(/```[\s\S]*?```/g,'');
    for(const line of body.split('\n').filter(line=>/^\s*- 专门权威/.test(line))){
      const match=line.match(/^\s*- 专门权威（(契约|测试|事实)）：\[[^\]]+\]\(([^)#]+)\)\s*$/);
      if(!match)throw new Error(`${source}: 专门权威声明格式不正确`);
      const [,kind,relative]=match;
      if(/^(?:[a-z]+:|\/)/i.test(relative))throw new Error(`${source}: 专门权威须为仓内相对路径`);
      const path=posix.normalize(posix.join(posix.dirname(source),relative));
      if(!existsSync(inside(root,path)))throw new Error(`专门权威未收到: ${path}`);
      if(/(?:^|\/)(plan|tasks|implement|archive)(?:\/|$)|^docs\/(research|implementation)\/|^\.harness\//.test(path))throw new Error(`专门权威不能指向过程/历史: ${path}`);
      if(owners.has(path)&&owners.get(path)!==kind)throw new Error(`专门权威类别冲突: ${path}`);
      owners.set(path,kind);
    }
  }
  return [...owners].map(([path,kind])=>({path,kind}));
}
export function requiredOwners(root,project,task){
  if(!task.domainRefs?.length)throw new Error('完成验证缺所属长期域设计；task/阶段note不是设计权威');
  const sources=designSources(root,project,task.domainRefs);
  const impacted=sources.domains.filter(path=>task.impact.paths.includes(path)||task.criteriaRefs.some(c=>c.path===path));
  const selected=[...new Set([...sources.selected,...impacted])];
  const paths=[sources.system,...selected];
  if(task.impact.dataChanges||task.impact.contractChanges)paths.push(sources.model);
  for(const path of [sources.model,project.documents.constitution,project.documents.domainIndex])if(task.impact.paths.includes(path))paths.push(path);
  for(const owner of specializedOwners(root,[sources.system,...selected])){
    if(owner.kind!=='契约'||task.impact.dataChanges||task.impact.contractChanges||task.impact.paths.includes(owner.path))paths.push(owner.path);
  }
  for(const owner of specializedOwners(root,[sources.system,...sources.domains]))if(task.impact.paths.includes(owner.path)&&!paths.includes(owner.path))paths.push(owner.path);
  for(const path of paths)if(!path||!existsSync(inside(root,path)))throw new Error(`缺受影响设计owner: ${path}`);
  return [...new Set(paths)];
}
export function checkCriteria(root,task,project){
  const {domains,system,model}=designSources(root,project);
  const allowed=new Set([system,model,...domains,...specializedOwners(root,[system,...domains]).map(o=>o.path)]);
  const seen=new Set();
  for(const criterion of task.criteriaRefs){
    if(!criterion.id||!/^[A-Za-z][A-Za-z0-9_.-]*$/.test(criterion.id)||seen.has(criterion.id))throw new Error('验收条目ID缺失、非法或重复');
    seen.add(criterion.id);
    if(!criterion.path||!existsSync(inside(root,criterion.path)))throw new Error(`验收来源未收到: ${criterion.path}`);
    if(!allowed.has(criterion.path)||processPath(criterion.path))throw new Error(`验收来源不是正式权威: ${criterion.path}`);
    const escaped=criterion.id.replaceAll('.', '\\.');
    if(!new RegExp(`(?<![A-Za-z0-9_.-])${escaped}(?![A-Za-z0-9_.-])`).test(read(root,criterion.path)))throw new Error(`验收ID不在来源文档: ${criterion.id} @ ${criterion.path}`);
  }
  const results=task.criteriaResults||[];
  if(results.length!==seen.size||new Set(results.map(r=>r.id)).size!==results.length||results.some(r=>!seen.has(r.id)||r.status!=='pass'||!r.checkIds?.length))throw new Error('验收条目结果/检查映射不完整或重复');
  // Token existence is structural traceability, never proof that a test covers the criterion.
}
export function checkConvergence(root,project,{taskRecord,intent}={}){
  if(intent!=='complete'||!taskRecord)return {status:'not-applicable',message:'本次不是任务完整收敛判定；不能据子集绿色宣称设计一致'};
  const owners=requiredOwners(root,project,taskRecord),record=taskRecord.convergence;
  const gaps=[...new Set([project.documents.constitution,project.documents.systemDesign,project.documents.domainModel])].flatMap(path=>contentErrors(root,path));
  if(gaps.length)return failure(gaps.join('\n'));
  checkCriteria(root,taskRecord,project);
  if(!record||!Array.isArray(record.owners)||!record.review)throw new Error('缺真实设计收敛/语义审查记录；已有测试绿不足以完成');
  const review=record.review;
  if(!['self','independent','human'].includes(review.kind)||!review.source||!review.summary||!Array.isArray(review.findings))throw new Error('语义审查需记录实际审查方式、来源、内容结论和发现；字段不证明真实性');
  if(review.status!=='pass'||review.findings.some(f=>f.blocking&&f.status!=='closed')||(record.openItems||[]).some(f=>f.blocking&&f.status!=='closed'))return failure('语义审查/设计偏差仍阻断；不能以测试绿覆盖');
  debtTransfers(root,project,taskRecord);
  const seen=new Set();
  for(const item of record.owners){
    if(seen.has(item.path))throw new Error('收敛owner重复');seen.add(item.path);
    if(!owners.includes(item.path))throw new Error(`收敛owner不在影响范围: ${item.path}`);
    if(!['updated','reviewed-unchanged'].includes(item.outcome)||!item.reason?.trim()||!Array.isArray(item.evidenceRefs)||!item.evidenceRefs.length)throw new Error(`缺owner回刷/不需修改依据: ${item.path}`);
    const body=read(root,item.path);
    if(/（TODO[^）]*）|^\s*(?:TODO|TBD)\b/m.test(body))return failure(`${item.path}: 权威设计仍是未填骨架`);
    if(item.outcome==='updated'&&!body.includes(taskRecord.externalIssueRef||taskRecord.id))return failure(`${item.path}: 更新缺本次来源/沿革`);
  }
  if(owners.some(path=>!seen.has(path)))throw new Error('遗漏受影响系统/域/契约owner的收敛去向');
  return {status:'pass',message:'已核对长期来源、影响owner及审查/回刷证据引用；语义正确性仍由实际内容审阅负责',owners};
}

// Explicitly consumed local inputs supplement the broad repository fingerprint, even
// when a project excludes their directory. Closure is recomputed at finish.
export function consumedInputs(root,project,task,checks=project.checks){
  const pending=[{path:'.harness/project.json',role:'command'}],selections=[];
  if(task){
    const {domains,system,model}=designSources(root,project,task.domainRefs);
    pending.push(...[project.documents.handover,project.documents.constitution,project.documents.domainIndex,system,model,...domains,...specializedOwners(root,[system,...domains]).map(o=>o.path),...task.criteriaRefs.map(c=>c.path),...[...(task.convergence?.openItems||[]),...(task.convergence?.review?.findings||[])].filter(i=>i.status!=='closed'&&i.transfer?.path).map(i=>i.transfer.path)].map(path=>({path,role:path===project.documents.handover?'reference':'active'})));
  }
  for(const declared of checks.filter(c=>c.kind==='command')){
    const check=materializeCommand(root,declared);
    if(check.selectedInputs){
      selections.push({path:check.cwd||'.',type:'selection',checkId:check.id,sha256:sha256(JSON.stringify(check.selectedInputs))});
      // The selector already resolved these repository-relative files. Their
      // content binding must not depend on argv's heuristic option detection.
      pending.push(...check.selectedInputs.map(path=>({path,role:'command',recursive:true})));
    }
    const cwd=check.cwd||'.';inside(root,cwd);pending.push({path:cwd,role:'command'});
    for(const input of check.inputs||[]){
      if(input.startsWith('/')||input.includes('\\')||input.includes(':'))throw new Error(`命令inputs须为仓内cwd相对路径: ${input}`);
      const path=posix.normalize(posix.join(cwd,input));inside(root,path);pending.push({path,role:'command',recursive:true});
    }
    let positional=false;
    for(let i=0;i<check.argv.length;i++){
      const arg=check.argv[i];if(!positional&&arg==='--'){positional=true;continue;}
      if((!positional&&arg.startsWith('-'))||(i===0&&!arg.includes('/')))continue;
      const absoluteArgument=resolve(root,cwd,arg),base=resolve(root);
      if(absoluteArgument!==base&&!absoluteArgument.startsWith(base+'/'))continue;
      const path=relative(base,absoluteArgument)||'.';
      // argv may contain inline program text or non-path values. Bind every
      // existing local path; indirect reads use the explicit inputs contract.
      let absolute;try{absolute=inside(root,path);}catch(error){if(existsSync(resolve(root,cwd,arg)))throw error;continue;}
      if(existsSync(absolute))pending.push({path,role:'command',recursive:true});
    }
  }
  const seen=new Map(),visited=new Set(),recursiveDirectories=new Set();
  while(pending.length){const {path:rawPath,role,recursive=false}=pending.pop(),path=posix.normalize(rawPath).replace(/\/$/,'')||'.',key=JSON.stringify([path,role,recursive]);if(visited.has(key))continue;visited.add(key);
    const absolute=inside(root,path),stat=lstatSync(absolute);
    if(stat.isDirectory()){
      // Navigation/cwd bind the directory's path and type, not arbitrary bytes
      // beneath it. Declared/argv input directories bind the complete subtree.
      if(recursive){
        const outputRoot=['.harness/local/runs','.harness/local/assets','.harness/local/asset-state','.harness/local/quarantine'].find(output=>path==='.'||output===path||output.startsWith(path+'/'));
        if(outputRoot)throw new Error(`命令目录输入 ${path} 包含harness输出目录 ${outputRoot}；请缩小为明确的源输入目录，不能将验证产物纳入自身输入`);
        recursiveDirectories.add(path);const children=readdirSync(absolute,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name));
        seen.set(path,{path,type:'directory',sha256:sha256(JSON.stringify(children.map(child=>[child.name,child.isDirectory()?'directory':child.isFile()?'file':'unsupported'])))});
        for(const child of children)pending.push({path:posix.join(path,child.name),role:'command',recursive:true});
      }else if(!recursiveDirectories.has(path))seen.set(path,{path,type:'directory',sha256:sha256(`directory\0${path}`)});
      continue;
    }
    if(!stat.isFile())throw new Error(`不支持的实际输入类型: ${path}`);
    const bytes=readFileSync(absolute);seen.set(path,{path,sha256:sha256(bytes)});
    if(role!=='command'&&path.endsWith('.md'))for(const link of localLinks(bytes.toString('utf8'),path)){
      inside(root,link.target);
      if(role==='active'&&!link.historical&&processPath(link.target))throw new Error(`${path}: 活设计依赖过程/历史 ${link.href}`);
      pending.push({path:link.target,role:role==='reference'||link.historical?'reference':'active'});
    }
  }
  return [...seen.values(),...selections].sort((a,b)=>a.path.localeCompare(b.path)||(a.checkId||'').localeCompare(b.checkId||''));
}

export function debtTransfers(root,project,task){
  const open=[...(task.convergence?.review?.findings||[]),...(task.convergence?.openItems||[])].filter(i=>i.status!=='closed');
  const {domains,system,model}=designSources(root,project,task.domainRefs);
  const allowed=new Set([system,model,...domains,...specializedOwners(root,[system,...domains]).map(o=>o.path)]);
  const handover=read(root,project.documents.handover);
  for(const item of open){
    const tr=item.transfer;
    if(item.blocking||!item.id||!tr||!allowed.has(tr.path)||processPath(tr.path)||!tr.id||!tr.closureCriteria?.trim())throw new Error('未闭环遗留缺共享承接owner/条目与关闭条件');
    const body=read(root,tr.path);
    if(!body.includes(item.id)||!body.includes(tr.id)||!body.includes(tr.closureCriteria)||!handover.includes(item.id)||!handover.includes(tr.path))throw new Error(`遗留承接条目/关闭条件或交接去向不可查: ${item.id}`);
  }
  return open;
}
