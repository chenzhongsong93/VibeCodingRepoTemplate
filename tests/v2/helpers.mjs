import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { assemble } from '../../skills/init-code-repo/assemble.mjs';
import { requiredOwners } from '../../skills/init-code-repo/templates/v2/scripts/harness/design.mjs';
export function fixture(overrides={}){const root=mkdtempSync(join(tmpdir(),'harness-v2-'));assemble(root,{projectName:'Example',oneLine:'本地示例',year:'2026',stacks:[],runtimes:[],remote:'none',components:[],...overrides});return root;}
export function put(root,path,content){mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),typeof content==='string'?content:JSON.stringify(content,null,2)+'\n');}
export function project(root,edit){const p=JSON.parse(readFileSync(join(root,'.harness/project.json')));edit(p);put(root,'.harness/project.json',p);return p;}
export function cli(root,args=[],script='check.mjs'){const r=spawnSync(process.execPath,[join(root,'scripts/harness',script),...args],{cwd:root,encoding:'utf8',timeout:15000});let report;try{report=JSON.parse(r.stdout);}catch{report={error:r.stderr||r.stdout};}return {...r,report};}

export function seedDesign(root){
 if(!existsSync(join(root,'specs/001-submission/spec.md')))cpSync(new URL('../../skills/init-code-repo/examples/governed-project/',import.meta.url),root,{recursive:true});
}
export function convergenceFor(root,t){
 const p=JSON.parse(readFileSync(join(root,'.harness/project.json')));
 const owners=requiredOwners(root,p,t);
 return {review:{kind:'self',source:'测试夹具：本地助手机制核对，非独立业务语义审查',summary:'本次仅检验治理助手，对照系统/域来源及既有样本；真实行为和语义另外由evolution场景及独立审查验收',status:'pass',findings:[]},owners:[...new Set(owners)].map(path=>({path,outcome:'reviewed-unchanged',reason:'本用例不改变样本业务，只检查助手行为；当前正式设计保持原义',evidenceRefs:['core.design']})),openItems:[]};
}
