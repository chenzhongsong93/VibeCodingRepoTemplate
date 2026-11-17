import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,existsSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {fixture,put} from './helpers.mjs';
import {createRequire} from 'node:module';
const config={projectName:'Example',oneLine:'本地示例',year:'2026',stacks:[],runtimes:[],remote:'none',components:[]};
const api=()=>import('../../skills/init-code-repo/upgrade.mjs');
test('UPG-01: explicit plan/check/apply upgrades clean managed files and keeps unknown user assets',async()=>{
 const {planUpgrade,checkUpgrade,applyUpgrade}=await api();const root=fixture();put(root,'user-notes.md','my notes');
 const plan=planUpgrade(root,{...config,oneLine:'改版后'});assert.equal(checkUpgrade(root,plan).length,0);
 const result=applyUpgrade(root,plan);assert.equal(result.applied,true);assert.match(readFileSync(join(root,'AGENTS.md'),'utf8'),/改版后/);assert.equal(readFileSync(join(root,'user-notes.md'),'utf8'),'my notes');assert.ok(existsSync(join(root,result.backupPath)));
});
test('UPG-02: manual edits or edits after planning refuse all writes',async()=>{
 const {planUpgrade,checkUpgrade,applyUpgrade}=await api();
 const root=fixture();put(root,'AGENTS.md','my custom policy');const before=readFileSync(join(root,'.harness/project.json'),'utf8');
 const p=planUpgrade(root,{...config,oneLine:'new'});assert.ok(checkUpgrade(root,p).length);assert.throws(()=>applyUpgrade(root,p));assert.equal(readFileSync(join(root,'.harness/project.json'),'utf8'),before);
 const clean=fixture();const plan=planUpgrade(clean,{...config,oneLine:'new'});put(clean,'AGENTS.md','late edit');assert.throws(()=>applyUpgrade(clean,plan));assert.equal(readFileSync(join(clean,'AGENTS.md'),'utf8'),'late edit');
});
test('UPG-03: unmarked legacy repos require an explicit baseline config; exact v1 inputs are upgradable',async()=>{
 const {planUpgrade,applyUpgrade}=await api();const {assembleV1}=await import('../../skills/init-code-repo/assemble-v1.mjs');
 const root=mkdtempSync(join(tmpdir(),'harness-v1-upgrade-'));assembleV1(root,config);
 assert.throws(()=>planUpgrade(root,config),/baseline|基线/);
 const p=planUpgrade(root,config,{legacyConfig:config});assert.equal(applyUpgrade(root,p).applied,true);assert.ok(existsSync(join(root,'.harness/project.json')));
});
test('UPG-04: symlink paths and tampered plan contents are rejected',async()=>{
 const {planUpgrade,applyUpgrade}=await api();const root=fixture();const plan=planUpgrade(root,{...config,oneLine:'new'});plan.changes.find(c=>c.action==='update').content='tampered';assert.throws(()=>applyUpgrade(root,plan));
});
