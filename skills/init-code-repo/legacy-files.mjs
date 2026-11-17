// Pure renderer for an explicitly supplied v1 baseline; never writes the target.
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {substitute} from './substitute.mjs';
import {activeConds,stripConditionals} from './conditional.mjs';
import {buildMap,mapPath,substituteFiles,substituteFilePaths,substituteFileNames} from './naming.mjs';
import {templateRoot} from './project.mjs';
export function legacyFiles(c){
 const b=c.branchModel||{},stacks=c.stacks||[],up=c.upstream||{};
 const ctx={projectName:c.projectName,oneLine:c.oneLine,year:String(c.year),commitRegex:c.commitGate?.regex||'',devBranch:b.dev||'dev',mainBranch:b.main||'main',fixBranch:b.fix||'fix',releasePrefix:b.release||'release/v',policyId:c.policyId||`${c.projectName}-Agent-Policy: 1.0`,piFormat:c.piFormat||'YYYY-PI<N>',piFirst:(c.piFormat||'YYYY-PI<N>').replace('YYYY',String(c.year)).replace('<N>','1'),verifyFastCmd:stacks.length===1&&stacks[0].startsWith('node-')?'npm run verify:fast':'make verify-fast',upstreamRepo:up.repo||'（TODO: 填上游仓名）',upstreamBaseline:up.baseline||'（TODO: 填上游基线 commit）',upstreamLicense:up.license||'（TODO: 填上游许可证，如 Apache-2.0）'};
 const conds=new Set([...activeConds(c),...stacks,...(c.runtimes||[]),`commit-${c.commitGate?.mode||'default'}`]);
 if(stacks.some(s=>s.startsWith('node-')))conds.add('node');
 if(c.repoRole==='component')conds.add('multi-repo-component');if(c.repoRole==='central-docs')conds.add('central-docs');
 const map=buildMap(c.naming,c.namingCustom||{}),files=new Map();
 function tree(root,dir=root){if(!existsSync(dir))return;for(const e of readdirSync(dir,{withFileTypes:true})){const abs=join(dir,e.name);if(e.isDirectory()){tree(root,abs);continue;}const rel=abs.slice(root.length+1).replace(/\.tmpl$/,'');let text=readFileSync(abs,'utf8');const req=text.match(/^<!--require:([\w-]+)-->\n?/);if(req){if(!conds.has(req[1]))continue;text=text.slice(req[0].length);}text=substitute(text,ctx);text=substituteFilePaths(text,map);text=substituteFileNames(text,map);text=substituteFiles(text,map,rel.includes('/')?rel.slice(0,rel.lastIndexOf('/')):'');files.set(mapPath(rel,map),stripConditionals(text,[...conds]));}}
 tree(join(templateRoot,'core'));for(const s of stacks)tree(join(templateRoot,'stacks',s));if(stacks.length)tree(join(templateRoot,'shared'));tree(join(templateRoot,'gates'));if(c.repoRole==='central-docs')tree(join(templateRoot,'central-docs'));for(const r of c.runtimes||[])tree(join(templateRoot,'runtime-adapters',r));return files;
}
