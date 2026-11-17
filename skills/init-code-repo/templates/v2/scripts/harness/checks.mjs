import { checkDesign, checkConvergence, taskFiles } from './design.mjs';
import { policy as assetPolicy, readStore as assetStore } from './assets-store.mjs';
import { spawnSync } from 'node:child_process';
import { hasDeclaration, hasCaseDeclaration } from './trace.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { inside, readJson, listFiles, validateTask, loadProject } from './model.mjs';
const pass=message=>({status:'pass',message});
const fail=message=>({status:'fail',message});
function checkPolicy(root,p){
 const text=readFileSync(inside(root,'AGENTS.md'),'utf8');
 if(!text.includes('授权边界')||!text.includes(p.documents.workflow)||!text.includes(p.documents.handover))return fail('AGENTS缺政策/续接指针');
 const claude=readFileSync(inside(root,'CLAUDE.md'),'utf8');
 if(p.policy?.mode==='adopted'){if(!/^@AGENTS\.md\r?$/m.test(claude))return fail('认领模式CLAUDE须显式导入@AGENTS.md；保留原有规则并追加受控入口');}
 else if(claude.trim()!=='@AGENTS.md')return fail('CLAUDE必须仅导入AGENTS');
 for(const sk of p.skills||[])if(!text.includes(sk.path)||!existsSync(inside(root,sk.path)))return fail(`启用技能不可达: ${sk.id}`);
 return pass('公共入口、续接及启用技能可达；不代表平台实测加载');
}
function completeness(root,p,{stage=p.completeness.stage}={}){
 if(!/^P[0-3]$/.test(stage))throw new Error(`非法stage: ${stage}`);
 const files=[...new Set(Array.from({length:Number(stage[1])+1},(_,i)=>p.completeness.required[`P${i}`]||[]).flat())];
 if(!files.length)throw new Error('完整性必填集为空');
 const gaps=[];
 for(const file of files){
  if(!existsSync(inside(root,file))){gaps.push(`${file}: missing`);continue;}
  const text=readFileSync(inside(root,file),'utf8');
  if(/(?:（TODO[^）]*）|\bTODO\b|\bTBD\b|\{\{[^}]+\}\})/i.test(text))gaps.push(`${file}: placeholder`);
  const headings=[...text.matchAll(/^(#{1,6})\s+.+$/gm)];
  const leaves=headings.filter((h,i)=>!headings[i+1]||headings[i+1][1].length<=h[1].length);
  if(!headings.length||leaves.some(h=>{const i=headings.indexOf(h);return !text.slice(h.index+h[0].length,headings[i+1]?.index??text.length).replace(/<!--[\s\S]*?-->/g,'').replace(/^[\s#|:*-]+$/gm,'').trim();}))gaps.push(`${file}: empty section`);
 }
 return gaps.length?fail(gaps.join('\n')):pass(`${stage}: ${files.length}份已选文档无占位/空节；不证明设计语义质量`);
}
function references(root){
 const gaps=[];
 for(const f of listFiles(root).filter(f=>f.endsWith('.md')&&!f.startsWith('docs/tasks/TASK-'))){
  const text=readFileSync(join(root,f),'utf8').replace(/```[\s\S]*?```/g,'');
  for(const m of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
   const target=m[1];if(/^(https?:|mailto:|#)/.test(target))continue;
   const [path,anchor]=target.split('#');const abs=resolve(root,dirname(f),decodeURIComponent(path.split('?')[0]));
   if(!abs.startsWith(resolve(root)+'/')||!existsSync(abs)){gaps.push(`${f} → ${target}`);continue;}
   inside(root,relative(root,abs));
   if(anchor&&path.endsWith('.md')){
    const heads=readFileSync(abs,'utf8').split('\n').filter(l=>/^#+ /.test(l)).map(l=>l.replace(/^#+ /,'').toLowerCase().replace(/[^\p{L}\p{N}_\s-]/gu,'').replace(/\s/g,'-'));
    if(!heads.includes(anchor))gaps.push(`${f}: missing anchor ${target}`);
   }
  }
 }
 return gaps.length?fail(gaps.join('\n')):pass('活文档相对链接/锚点存在；不证明语义正确');
}
function hygiene(root){
 const gaps=listFiles(root).filter(p=>/(^|\/)\.env($|\.)/.test(p)&&!/(\.example|\.test\.example)$/.test(p)||/\.(pem|key|tmp|bak|orig|rej)$/.test(p));
 return gaps.length?fail(`禁入敏感/临时文件路径: ${gaps.join(', ')}`):pass('文件路径卫生；不等于完整密钥扫描');
}
function traceability(root,p){
 const dir=inside(root,p.documents.testSpec),ids=[];
 if(!existsSync(dir))throw new Error('缺test-spec');
 const pattern=/\bL[123]-[A-Z0-9]+-\d+\b/g;
 for(const file of listFiles(root).filter(f=>f.startsWith(p.documents.testSpec+'/')&&f.endsWith('.md')))ids.push(...readFileSync(join(root,file),'utf8').matchAll(pattern));
 const wanted=new Set(ids.map(m=>m[0]));
 if(!wanted.size)return {status:'not-applicable',message:'无已声明用例；不声称完成1:1追溯'};
 const mapping=existsSync(inside(root,'.harness/test-map.json'))?readJson(root,'.harness/test-map.json'):{cases:[]};
 if(!Array.isArray(mapping.cases))throw new Error('test-map schema非法');
 const counts=new Map(),gaps=[];
 const source=listFiles(root).filter(f=>/\.(rs|[cm]?js|[jt]sx?|py|go|java)$/.test(f)&&!f.startsWith('scripts/'));
 for(const f of source)for(const line of readFileSync(join(root,f),'utf8').split('\n')){
  if(!/覆盖:/.test(line))continue;
  for(const m of line.matchAll(pattern))counts.set(m[0],(counts.get(m[0])||0)+1);
 }
 const mapIds=mapping.cases.map(c=>c.id);
 if(new Set(mapIds).size!==mapIds.length)gaps.push('mapping重复ID');
 for(const id of new Set([...wanted,...counts.keys(),...mapIds])){
  if(!wanted.has(id)||counts.get(id)!==1||!mapIds.includes(id))gaps.push(`${id}: 规格/标签/映射缺失或重复`);
 }
 for(const c of mapping.cases){
  if(!existsSync(inside(root,c.file))){gaps.push(`${c.id}: 测试文件不存在`);continue;}
  const text=readFileSync(inside(root,c.file),'utf8');
  if(!c.selector||!text.includes(c.selector)||!(text.match(pattern)||[]).includes(c.id))gaps.push(`${c.id}: selector/ID不在目标文件`);
  if(!hasCaseDeclaration(text,c.file,c.selector,c.id))gaps.push(`${c.id}: 标签未关联到指定测试声明`);
  if(!hasDeclaration(text,c.file,c.selector))gaps.push(`${c.id}: 未支持或未找到真实测试声明，不能声称函数级映射`);
 }
 return gaps.length?fail(gaps.join('\n')):pass(`${wanted.size}个L1/L2/L3 ID标签及显式测试声明映射一致；非测试语义证明`);
}
function tasks(root,p){
 const paths=taskFiles(root,p);
 const ids=new Set();for(const path of paths){const t=validateTask(readJson(root,path));if(ids.has(t.id)||path!==`${p.documents.tasks}/${t.id}/task.json`)throw new Error('重复task ID或目录与ID不符');ids.add(t.id);}
 return pass(`${paths.length}个当前快照任务结构有效；非全仓全局状态`);
}
function deployment(root,p,options){
 const profile=options.profile||'fast';
 const configured=p.checks.some(c=>c.kind==='command'&&c.group==='deployment'&&c.required&&c.profiles.includes(profile));
 const files=listFiles(root).filter(f=>f.startsWith('infra/'));
 if(!files.length&&!configured)throw new Error('deployment-gates已启用，缺infra输入或本档必需项目验证命令');
 let parsed=0;
 for(const file of files){
  if(file.endsWith('.json')){JSON.parse(readFileSync(inside(root,file),'utf8'));parsed++;}
  if(file.endsWith('.sh')){const r=spawnSync('bash',['-n',inside(root,file)],{encoding:'utf8',timeout:10000});if(r.error)throw new Error('shell解析工具缺失/超时');if(r.status!==0)return fail(`${file}: ${r.stderr}`);parsed++;}
  if(/\.ya?ml$/.test(file)&&!configured)throw new Error('YAML/Kubernetes/Helm需声明本地项目解析命令；不自动安装或跳过');
 }
 if(!parsed&&!configured)throw new Error('无可验证部署输入；需配置项目本地验证命令');
 return pass(`${parsed}个JSON/shell解析；项目命令由统一runner执行；不代表部署/E2E`);
}
export function builtin(root,p,handler,options={}){
 const handlers={config:()=>{loadProject(root);return pass('project结构及固定生命周期有效');},assets:()=>{assetPolicy(root);const state=assetStore(root);if(state.operations.some(o=>o.status==='prepared'))throw new Error('资产操作待recover，不能假称现场完整');return pass(`${Object.keys(state.assets).length}个资产的策略/元数据有效；不执行GC，不替代原始内容核验`);},policy:()=>checkPolicy(root,p),references:()=>references(root),hygiene:()=>hygiene(root),completeness:()=>completeness(root,p,options),traceability:()=>traceability(root,p),tasks:()=>tasks(root,p),design:()=>checkDesign(root,p),convergence:()=>checkConvergence(root,p,options),deployment:()=>deployment(root,p,options)};
 if(!handlers[handler])throw new Error(`未知检查器: ${handler}`);
 return handlers[handler]();
}
