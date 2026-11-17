import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, lstatSync, realpathSync } from 'node:fs';
import { resolve, dirname, join, posix } from 'node:path';
import { createHash } from 'node:crypto';
import { substitute } from './substitute.mjs';
import { activeConds, stripConditionals } from './conditional.mjs';
import { buildMap, mapPath, substituteFiles, substituteFilePaths, substituteFileNames } from './naming.mjs';
import { resolveConfig, makeProject, definitions, templateRoot, safeRelative, documentPaths, fileOwnership } from './project.mjs';
export { assembleV1 } from './assemble-v1.mjs';
const digest=s=>createHash('sha256').update(s).digest('hex');
function walk(dir){return existsSync(dir)?readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]):[];}
export function buildFiles(input) {
 const config=resolveConfig(input),map=buildMap(config.naming,config.namingCustom||{});
 const conds=new Set([...activeConds(config),...config.stacks,...config.runtimes,`commit-${config.commitGate.mode}`]);
 if(config.stacks.some(s=>s.startsWith('node-')))conds.add('node');
 if(config.runtimes.includes('claude-code')&&config.components.includes('dev-flow-skills'))conds.add('claude-flow-adapter');
 if(config.repoRole==='component')conds.add('multi-repo-component');
 if(config.repoRole==='central-docs')conds.add('central-docs');
 const bm=config.branchModel||{};
 const ctx={projectName:config.projectName,oneLine:config.oneLine,year:String(config.year),commitRegex:config.commitGate.regex||'',devBranch:bm.dev||'dev',mainBranch:bm.main||'main',fixBranch:bm.fix||'fix',releasePrefix:bm.release||'release/v',policyId:config.policyId||`${config.projectName}-Agent-Policy: 2.0`,piFormat:config.piFormat||'YYYY-PI<N>',piFirst:(config.piFormat||'YYYY-PI<N>').replace('YYYY',config.year).replace('<N>','1'),verifyFastCmd:'node scripts/harness/check.mjs --profile fast',upstreamRepo:config.upstream?.repo||'（TODO: 填上游仓名）',upstreamBaseline:config.upstream?.baseline||'（TODO: 填上游基线）',upstreamLicense:config.upstream?.license||'（TODO: 填许可证）'};
 const files=new Map(),owners={};
 const overlays=walk(join(templateRoot,'v2'));
 const overlayPaths=new Set(overlays.map(p=>p.slice(join(templateRoot,'v2').length+1).replace(/\.tmpl$/,'')));
 function addTree(root,isV2=false,prefix=''){for(const abs of walk(root)){
  const rel=abs.slice(root.length+1).replaceAll('\\','/').replace(/\.tmpl$/,'');
  if(!isV2&&overlayPaths.has(rel)&&definitions.supersedes.includes(rel))continue;
  let text=readFileSync(abs,'utf8');const req=text.match(/^<!--require:([\w-]+)-->\r?\n?/);
  if(req){if(!conds.has(req[1]))continue;text=text.slice(req[0].length);}
  text=substitute(text,ctx);text=substituteFilePaths(text,map);text=substituteFileNames(text,map);text=substituteFiles(text,map,rel.includes('/')?rel.slice(0,rel.lastIndexOf('/')):'');text=stripConditionals(text,[...conds]);
  const out=safeRelative((prefix?prefix+'/':'')+mapPath(rel,map));
  if(files.has(out))throw new Error(`输出owner冲突: ${out}: ${owners[out]} / ${abs}`);
  files.set(out,text);owners[out]=abs.slice(templateRoot.length);
 }}
 addTree(join(templateRoot,'core'));
 for(const stack of config.stacks)addTree(join(templateRoot,'stacks',stack),false,config.stackRoots[stack]==='.'?'':config.stackRoots[stack]||'');
 // Makefile is owned solely by v2; v1 shared templates are not another writer.
 addTree(join(templateRoot,'gates'));
 if(config.repoRole==='central-docs')addTree(join(templateRoot,'central-docs'));
 for(const runtime of config.runtimes)addTree(join(templateRoot,'runtime-adapters',runtime));
 addTree(join(templateRoot,'v2'),true);
 for(const stack of ['node-frontend','node-backend'])if(config.stacks.includes(stack)){
   const pkgPath=(config.stackRoots[stack]&&config.stackRoots[stack]!=='.'?config.stackRoots[stack]+'/':'')+'package.json';
   const pkg=JSON.parse(files.get(pkgPath));
   const relativeRoot=posix.relative(config.stackRoots[stack]||'.','.');
   for(const p of ['fast','ci','release'])pkg.scripts[`verify:${p}`]=`node ${posix.relative(config.stackRoots[stack]||'.','scripts/harness/check.mjs')}${relativeRoot?` --root ${relativeRoot}`:''} --profile ${p}`;
   files.set(pkgPath,JSON.stringify(pkg,null,2)+'\n');
 }
 files.set('.gitignore',files.get('.gitignore')+'\n# 本机证据与临时工件\n/.artifacts/\n.harness/local/\n# 过程不持续进入源码；长期结论归同一spec\nspecs/*/plan/\nspecs/*/tasks/\nspecs/*/implement/\n');
 // Resolve arbitrary existing-document mappings after filename naming, preserving relative links.
 const relocations=new Map(Object.entries(config.documents||{}).map(([role,path])=>[mapPath(documentPaths[role],map),path]));
 const relocate=path=>{for(const [before,after] of [...relocations].sort((a,b)=>b[0].length-a[0].length)){if(path===before||path.startsWith(before+'/'))return after+path.slice(before.length);}return path;};
 const relocated=new Map();
 for(const [path,body] of files){const out=relocate(path);if(relocated.has(out))throw new Error(`document输出冲突: ${out}`);let text=body;
  text=text.replace(/(\]\()([^#)\s]+)(#[^)\s]*)?(\))/g,(all,a,target,anchor='',b)=>{if(/^(?:[a-z]+:|\/)/i.test(target))return all;const resolved=posix.normalize(posix.join(posix.dirname(path),target));const mapped=relocate(resolved);return a+(posix.relative(posix.dirname(out),mapped)||posix.basename(mapped))+anchor+b;});
  for(const [before,after] of relocations)text=text.split(before).join(after);
  relocated.set(out,text);if(out!==path)owners[out]=owners[path];
 }
 files.clear();for(const [path,text] of relocated)files.set(path,text);
 const revision=digest([...files].map(([p,s])=>p+'\0'+s).join('\0'));
 const project=makeProject(config,files,`sha256:${revision}`);
 for(const schema of ['project.schema.json','task.schema.json']){files.set(`.harness/${schema}`,readFileSync(new URL(`./contracts/${schema}`,import.meta.url),'utf8'));owners[`.harness/${schema}`]='contracts/'+schema;}
 files.set('.harness/project.json',JSON.stringify(project,null,2)+'\n');owners['.harness/project.json']='contracts + project.mjs';
 files.set('.harness/assembly.json',JSON.stringify({schemaVersion:2,templateRevision:project.templateRevision,config,projectDefaults:project,files:Object.fromEntries([...files].map(([p,s])=>[p,{sha256:digest(s),owner:owners[p],ownership:fileOwnership(p)}]))},null,2)+'\n');
 return files;
}
export function assertSafeTarget(root,relative){
 safeRelative(relative);const base=resolve(root),target=resolve(base,relative);
 if(!target.startsWith(base+'/'))throw new Error(`路径逃出仓根: ${relative}`);
 let ancestor=base;
 while(!lstatSync(ancestor,{throwIfNoEntry:false})){const parent=dirname(ancestor);if(parent===ancestor)break;ancestor=parent;}
 const ancestorStat=lstatSync(ancestor,{throwIfNoEntry:false});
 if(ancestorStat?.isSymbolicLink()||realpathSync(ancestor)!==ancestor)throw new Error('仓根已有祖先不能为symlink');
 if(!ancestorStat?.isDirectory())throw new Error('目标父路径不是目录');
 let cursor=base;
 const parts=relative.split('/');
 for(let i=0;i<parts.length;i++){
  cursor=join(cursor,parts[i]);const stat=lstatSync(cursor,{throwIfNoEntry:false});
  if(stat?.isSymbolicLink())throw new Error(`symlink路径拒绝: ${relative}`);
  if(stat&&i<parts.length-1&&!stat.isDirectory())throw new Error(`输出父路径不是目录: ${relative}`);
 }
 return target;
}

export function assemble(targetDir,input){
 const files=buildFiles(input),root=resolve(targetDir);
 for(const [rel] of files){const out=assertSafeTarget(root,rel);if(existsSync(out))throw new Error(`目标文件已存在 conflict: ${rel}; 请使用upgrade plan/check/apply`);}
 for(const [rel,text] of files){const out=assertSafeTarget(root,rel);mkdirSync(dirname(out),{recursive:true});writeFileSync(out,text,{flag:'wx'});}
 return {schemaVersion:2,files:[...files.keys()]};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2),opts={};
  for(let i=0;i<args.length;i++){if(args[i]==='--plan')opts.plan=true;else if(['--config','--root'].includes(args[i])&&args[i+1])opts[args[i].slice(2)]=args[++i];else throw new Error('用法: --config file --root target [--plan]');}
  if(!opts.config||!opts.root)throw new Error('需--config与--root');
  const config=JSON.parse(readFileSync(opts.config,'utf8'));
  const result=opts.plan?{schemaVersion:2,files:[...buildFiles(config).keys()]}:assemble(opts.root,config);
  console.log(JSON.stringify(result,null,2));
 }catch(e){console.error(e.message);process.exitCode=2;}
}
