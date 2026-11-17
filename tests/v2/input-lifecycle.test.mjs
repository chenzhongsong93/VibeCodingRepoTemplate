import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { fixture, put, project, cli, seedDesign, convergenceFor } from './helpers.mjs';
import { planAdoption, applyAdoption } from '../../skills/init-code-repo/adopt.mjs';
import { planUpgrade, applyUpgrade } from '../../skills/init-code-repo/upgrade.mjs';

const domain='specs/001-submission/spec.md';
const config={projectName:'Example',oneLine:'local regression',year:'2026',stacks:['python'],runtimes:[],remote:'none',components:[]};
function prepared(root=fixture()){
 seedDesign(root);
 const t=cli(root,['create','--title','input lifecycle','--domain',domain],'task-cli.mjs').report;
 t.risk={level:'T1',rationale:'local mechanism regression'};t.scope=['docs'];
 t.impact={paths:['docs'],contractChanges:false,dataChanges:false,securityChanges:false,externalEffects:false,productionEffects:false,behaviorChanges:false,requiredTestLayers:[]};
 t.criteriaRefs=[{id:'SUB-R1',path:domain}];t.criteriaResults=[{id:'SUB-R1',status:'pass',checkIds:['core.policy']}];
 t.stage='handover';t.completedStages=['orient','specify','design','analyze','implement','verify','converge'].map(stage=>({stage,note:'verified'}));
 t.convergence=convergenceFor(root,t);put(root,'docs/ROADMAP.md','# Plan\n\n## Current\nDefined.\n');put(root,'docs/HANDOVER.md',`# Handover\n\n${t.id}\n`);put(root,`.harness/local/tasks/${t.id}/task.json`,t);
 return {root,t};
}
const complete=(root,t)=>cli(root,['--task',t.id,'--intent','complete']);
const finish=(root,t,r)=>cli(root,['finish','--task',t.id,'--evidence',r.report.evidencePath],'task-cli.mjs');
function asset(root,args){const r=cli(root,args,'assets-cli.mjs');assert.equal(r.status,0,r.stdout+r.stderr);return r.report;}
function managed(root,body='process.exit(0);\n'){
 const a=asset(root,['workspace','--work','validation-input']);put(root,`${a.path}/check.mjs`,body);
 asset(root,['close','--id',a.id,'--disposition','discarded','--reason','original producer finished']);return a;
}
function command(root,a,extra={}){project(root,p=>p.checks.push({id:'app.input',kind:'command',argv:['node',`./${a.path}/./check.mjs`],cwd:'.',profiles:['fast','ci'],required:true,timeoutSeconds:5,effect:'local-validation',...extra}));}
function policy(root,extra={}){put(root,'.harness/assets.json',{schemaVersion:1,enabled:true,workDays:0,runDays:0,quarantineDays:0,...extra});}
const inventory=root=>asset(root,['inventory']).assets;
const planned=root=>asset(root,['plan']);
function assertProtected(root,id){assert.ok(!planned(root).actions.some(a=>a.id===id),`input ${id} must remain available`);assert.equal(inventory(root).find(a=>a.id===id).protected,true);}
function pythonCli(root,args){
 const bin=join(root,'.harness/local/test-tools');
 for(const tool of ['ruff','mypy','pytest']){const path=join(bin,tool);put(root,`.harness/local/test-tools/${tool}`,`#!${process.execPath}\nconsole.log(JSON.stringify(process.argv.slice(2)));\n`);chmodSync(path,0o755);}
 const r=spawnSync(process.execPath,[join(root,'scripts/harness/check.mjs'),...args],{cwd:root,encoding:'utf8',timeout:15000,env:{...process.env,PATH:bin+':'+process.env.PATH}});
 return {...r,report:JSON.parse(r.stdout)};
}

test('INPUT-F1: root Python defaults execute explicit source files, finish immediately and reject edited or added sources',()=>{
 for(const change of ['none','edit','new-excluded']){
  const {root,t}=prepared(fixture(config));put(root,'app.py','value: int = 1\n');put(root,'src/types.pyi','value: int\n');put(root,'external/source.py','answer = 42\n');put(root,'.harness/local/excluded.py','local = True\n');put(root,'dist/excluded.py','built = True\n');project(root,p=>p.fingerprintExcludes.push('external'));
  const r=pythonCli(root,['--task',t.id,'--intent','complete']);assert.equal(r.status,0,r.stdout);
  for(const id of ['python.lint','python.typecheck']){const result=r.report.results.find(c=>c.id===id);assert.equal(result.status,'pass');assert.deepEqual(JSON.parse(result.stdout),result.argv.slice(1));assert.ok(result.argv.includes('app.py'));assert.ok(result.argv.includes('src/types.pyi'));assert.ok(!result.argv.includes('.'));assert.ok(!result.argv.some(arg=>arg.endsWith('excluded.py')));assert.ok(r.report.fingerprintScope.commandSelections.some(c=>c.id===id&&c.files.includes('external/source.py')));}
  assert.ok(r.report.consumedInputs.some(c=>c.path==='external/source.py'&&c.sha256));
  if(change==='edit')put(root,'external/source.py','answer = 43\n');if(change==='new-excluded')put(root,'external/added.py','added = True\n');
  assert.equal(finish(root,t,r).status,change==='none'?0:2);
 }
});
test('INPUT-F1-EMPTY: an empty default Python source selection is blocked, never a synthetic success',()=>{
 const {root,t}=prepared(fixture(config));const r=pythonCli(root,['--task',t.id,'--intent','complete']);assert.equal(r.status,2);assert.match(r.stdout,/Python.*(?:源文件|输入).*空|无.*Python.*(?:源文件|输入)/);
});
test('INPUT-F1-PREFIX-FILE: selected negative-prefix source bytes stay bound outside the repository fingerprint',()=>{
 const {root,t}=prepared(fixture(config));put(root,'-source.py','value = 1\n');project(root,p=>p.fingerprintExcludes.push('-source.py'));
 const r=pythonCli(root,['--task',t.id,'--intent','complete']);assert.equal(r.status,0,r.stdout);assert.ok(r.report.results.find(c=>c.id==='python.lint').argv.includes('-source.py'));assert.ok(r.report.consumedInputs.some(c=>c.path==='-source.py'&&c.sha256),'selected source bytes must be bound independently of option parsing');
 put(root,'-source.py','value = 2\n');assert.equal(finish(root,t,r).status,2);
});
test('INPUT-F1-PREFIX-DIRECTORY: selected source beneath a negative-prefix directory cannot escape content freshness',()=>{
 const {root,t}=prepared(fixture(config));put(root,'-sources/value.py','value = 1\n');project(root,p=>p.fingerprintExcludes.push('-sources'));
 const r=pythonCli(root,['--task',t.id,'--intent','complete']);assert.equal(r.status,0,r.stdout);assert.ok(r.report.consumedInputs.some(c=>c.path==='-sources/value.py'&&c.sha256),'selected directory descendants must bind their bytes');
 put(root,'-sources/value.py','value = 2\n');assert.equal(finish(root,t,r).status,2);
});
test('INPUT-F1-POSITIONAL: argv after the first terminator binds negative-prefix files and recursive directories',()=>{
 for(const changed of ['-input.json','-inputs/value.json','--']){
  const {root,t}=prepared();for(const path of ['-input.json','-inputs/value.json','--'])put(root,path,'original');
  put(root,'src/positional.mjs',`import {readFileSync} from 'node:fs';\nimport assert from 'node:assert/strict';\nassert.deepEqual(process.argv.slice(2),['--','-input.json','-inputs','--']);\nfor(const path of ['-input.json','-inputs/value.json','--'])assert.equal(readFileSync(path,'utf8'),'original');\n`);
  project(root,p=>{p.fingerprintExcludes.push('-input.json','-inputs','--');p.checks.push({id:'app.positional',kind:'command',argv:['node','src/positional.mjs','--','-input.json','-inputs','--'],cwd:'.',profiles:['fast'],required:true,timeoutSeconds:5,effect:'local-validation'});});
  const r=complete(root,t);assert.equal(r.status,0,r.stdout);for(const path of ['-input.json','-inputs/value.json','--'])assert.ok(r.report.consumedInputs.some(c=>c.path===path&&c.sha256),`${path} is an actual positional input`);assert.ok(r.report.consumedInputs.some(c=>c.path==='-inputs'&&c.type==='directory'));
  put(root,changed,'changed');assert.equal(finish(root,t,r).status,2);
 }
});
test('INPUT-F1-ADOPT: existing root Python layout is retained and default commands reach execution',()=>{
 const root=mkdtempSync(join(tmpdir(),'harness-python-adopt-'));put(root,'app.py','answer: int = 42\n');put(root,'pyproject.toml','[tool.mypy]\nstrict = true\n');
 applyAdoption(root,planAdoption(root,config));const {t}=prepared(root);const r=pythonCli(root,['--task',t.id,'--intent','complete']);assert.equal(r.status,0,r.stdout);assert.equal(finish(root,t,r).status,0);assert.equal(readFileSync(join(root,'pyproject.toml'),'utf8'),'[tool.mypy]\nstrict = true\n');
});
test('INPUT-F1-UPGRADE: default argv and selector migrate together while customized commands remain exact',()=>{
 for(const custom of [false,true]){
  const root=fixture(config),p=JSON.parse(readFileSync(join(root,'.harness/project.json'))),receipt=JSON.parse(readFileSync(join(root,'.harness/assembly.json')));
  for(const check of p.checks.filter(c=>['python.lint','python.typecheck'].includes(c.id))){check.argv=check.id==='python.lint'?['ruff','check','.']:['mypy','.'];delete check.inputSelection;}
  receipt.projectDefaults=structuredClone(p);put(root,'.harness/assembly.json',receipt);
  if(custom)p.checks.find(c=>c.id==='python.lint').argv=['ruff','check','src'];
  const before=structuredClone(p.checks.find(c=>c.id==='python.lint'));put(root,'.harness/project.json',p);applyUpgrade(root,planUpgrade(root,config));
  const next=JSON.parse(readFileSync(join(root,'.harness/project.json'))).checks;
  if(custom)assert.deepEqual(next.find(c=>c.id==='python.lint'),before);
  else assert.equal(next.find(c=>c.id==='python.lint').inputSelection?.kind,'python-files');
  assert.equal(next.find(c=>c.id==='python.typecheck').inputSelection?.kind,'python-files');
 }
 const override={id:'python.lint',kind:'command',argv:['ruff','check','.'],cwd:'.',profiles:['fast'],required:true,timeoutSeconds:5,effect:'local-validation'};
 const {root,t}=prepared(fixture({...config,checks:[override]}));put(root,'app.py','answer = 42\n');assert.deepEqual(JSON.parse(readFileSync(join(root,'.harness/project.json'))).checks.find(c=>c.id===override.id),override);const r=pythonCli(root,['--task',t.id,'--intent','complete']);assert.equal(r.status,2);assert.match(r.stdout,/输出目录|产物/);
});

test('INPUT-F2: completion receipt durably protects an aliased managed script and declared directory input',()=>{
 const {root,t}=prepared();policy(root);const a=managed(root),data=managed(root);put(root,`${data.path}/data/value.json`,'{"accepted":true}\n');command(root,a,{inputs:[`./${data.path}/data/.`]});
 const r=complete(root,t);assert.equal(r.status,0,r.stdout);assert.equal(finish(root,t,r).status,0);
 const run=inventory(root).find(x=>x.id===r.report.assetId);assert.deepEqual(new Set(run.references),new Set([a.id,data.id]));assertProtected(root,a.id);assertProtected(root,data.id);
 assert.equal(Object.keys(inventory(root).find(x=>x.id===a.id).leases).length,0);
 asset(root,['run-due']);asset(root,['run-due']);assert.ok(existsSync(join(root,a.path,'check.mjs')));
});
test('INPUT-F2-WINDOW: an actual GC invoked inside the running check cannot quarantine its closed inputs',()=>{
 const {root,t}=prepared();policy(root);const a=managed(root,`import {runDue} from '../../../../scripts/harness/assets.mjs';\nimport {existsSync} from 'node:fs';\nconst result=runDue(process.cwd());\nconsole.log(JSON.stringify(result));\nif(!existsSync(new URL('./check.mjs',import.meta.url))) process.exit(9);\n`);command(root,a);
 const r=complete(root,t);assert.equal(r.status,0,r.stdout);const result=r.report.results.find(c=>c.id==='app.input');assert.deepEqual(JSON.parse(result.stdout).completed,[]);assert.equal(finish(root,t,r).status,0);assertProtected(root,a.id);
});
test('INPUT-F2-CHECK: standalone retained and failed runs bind their actual managed inputs without adopting unknown files',()=>{
 for(const failed of [false,true]){
  const root=fixture();policy(root,{runDays:30});const a=managed(root,failed?'process.exit(1);\n':undefined);put(root,'.harness/local/unknown.mjs','process.exit(0);\n');command(root,a,{inputs:['.harness/local/unknown.mjs']});
  const r=cli(root,['--only','app.input']);assert.equal(r.status,failed?1:0,r.stdout);assert.ok(Array.isArray(r.report.consumedInputs),'standalone runs must record actual inputs');assert.ok(r.report.consumedInputs.some(c=>c.path===`${a.path}/check.mjs`));const all=inventory(root),run=all.find(x=>x.id===r.report.assetId);assert.deepEqual(run.references,[a.id]);assert.equal(all.length,2);assertProtected(root,a.id);
 }
});
test('INPUT-F2-NORECORD: managed inputs stay leased during unrecorded execution and release only after it returns',async()=>{
 for(const failed of [false,true]){
  const root=fixture();policy(root);const a=managed(root,`import {runDue} from '../../../../scripts/harness/assets.mjs';\nimport {existsSync} from 'node:fs';\nconsole.log(JSON.stringify(runDue(process.cwd())));\nif(!existsSync(new URL('./check.mjs',import.meta.url))) process.exit(9);\nprocess.exit(${failed?1:0});\n`);command(root,a);
  const {runChecks}=await import(pathToFileURL(join(root,'scripts/harness/runner.mjs')));const r=runChecks(root,{only:'app.input',noRecord:true});assert.equal(r.exitCode,failed?1:0,JSON.stringify(r));assert.equal(r.assetId,undefined);assert.equal(inventory(root).length,1);assert.equal(Object.keys(inventory(root)[0].leases).length,0);assert.ok(planned(root).actions.some(x=>x.id===a.id));
 }
});
test('INPUT-F2-WRITE-FAILURE: failed report persistence retains consumer leases until explicit recovery and release',()=>{
 const root=fixture();policy(root);const a=managed(root,`import {mkdirSync,writeFileSync} from 'node:fs';\nimport {hostname} from 'node:os';\nconst lock='.harness/local/asset-state/lock';mkdirSync(lock);writeFileSync(lock+'/owner.json',JSON.stringify({token:'child-lock',pid:process.pid,host:hostname(),root:process.cwd(),createdAt:new Date().toISOString()}));\n`);command(root,a);
 const r=cli(root,['--only','app.input']);assert.equal(r.status,2,r.stdout);assert.ok(r.report.results.some(c=>c.id==='evidence.write'));asset(root,['recover-lock']);
 const found=inventory(root).find(x=>x.id===a.id);assert.equal(Object.keys(found.leases).length,1);assertProtected(root,a.id);
 for(const token of Object.keys(found.leases))asset(root,['release','--id',a.id,'--token',token]);assert.ok(planned(root).actions.some(x=>x.id===a.id));
});
test('INPUT-F2-INTERRUPTION: killed runner leaves inspectable nonexpiring leases rather than releasing active input protection',()=>{
 const root=fixture();policy(root);const a=managed(root,'process.kill(process.ppid,"SIGKILL");\n');command(root,a);
 const r=cli(root,['--only','app.input']);assert.equal(r.signal,'SIGKILL');const found=inventory(root).find(x=>x.id===a.id);assert.equal(Object.keys(found.leases).length,1);assertProtected(root,a.id);asset(root,['recover']);assertProtected(root,a.id);
 for(const token of Object.keys(found.leases))asset(root,['release','--id',a.id,'--token',token]);assert.ok(planned(root).actions.some(x=>x.id===a.id));
});
test('INPUT-F2-RETIRE: finishing a replacement run releases old input closure for explicit GC eligibility',()=>{
 const {root,t}=prepared();policy(root);const a=managed(root),b=managed(root);command(root,a);const old=complete(root,t);assert.equal(old.status,0,old.stdout);assertProtected(root,a.id);
 project(root,p=>p.checks.find(c=>c.id==='app.input').argv=['node',`${b.path}/check.mjs`]);const current=complete(root,t);assert.equal(current.status,0,current.stdout);assert.equal(finish(root,t,current).status,0);const p=planned(root);assert.ok(p.actions.some(x=>x.id===old.report.assetId));assert.ok(p.actions.some(x=>x.id===a.id));assertProtected(root,b.id);
 asset(root,['run-due']);asset(root,['run-due']);assert.ok(!existsSync(join(root,a.path)));assert.ok(existsSync(join(root,b.path,'check.mjs')));
});
