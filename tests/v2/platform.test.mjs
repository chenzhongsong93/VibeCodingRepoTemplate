import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,existsSync,symlinkSync,mkdtempSync,readdirSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fixture,project,put,cli} from './helpers.mjs';
import {assemble} from '../../skills/init-code-repo/assemble.mjs';
const cfg={projectName:'Example',oneLine:'示例',stacks:[],components:[],runtimes:[],remote:'none'};
test('PLAT-01: Make/npm/hooks call the same CLI, complex hook bodies are external',()=>{
 const root=fixture({stacks:['node-backend'],runtimes:['claude-code'],components:['dev-flow-skills','doc-sync']});
 const pkg=JSON.parse(readFileSync(join(root,'package.json')));assert.equal(pkg.scripts['verify:fast'],'node scripts/harness/check.mjs --profile fast');
 const hook=readFileSync(join(root,'lefthook.yml'),'utf8');assert.match(hook,/scripts\/harness\/check.mjs --profile fast/);assert.ok(!hook.includes('run: |'));
 assert.equal(cli(root,['commit-msg','absent-file'],'hook.mjs').status,2);
});
test('PLAT-02: worktree cleanup is a read-only preview without force/delete commands',()=>{
 const root=fixture({components:['worktree-tooling']});const r=cli(root,['preview-cleanup','--branch','feat/example'],'worktree.mjs');assert.equal(r.status,0,r.stdout+r.stderr);assert.equal(r.report.executed,false);
 const script=readFileSync(join(root,'scripts/harness/worktree.mjs'),'utf8');assert.ok(!script.includes("'--force'"));
});
test('PLAT-03: symlink output ancestors cannot be written through',()=>{
 const root=mkdtempSync(join(tmpdir(),'harness-symlink-')),outside=mkdtempSync(join(tmpdir(),'harness-outside-'));symlinkSync(outside,join(root,'docs'),'dir');assert.throws(()=>assemble(root,cfg),/symlink/);assert.equal(existsSync(join(root,'AGENTS.md')),false);
});
test('PLAT-04: central-docs missing components reports blocked instead of publishing an incomplete aggregate',()=>{
 const root=fixture({repoRole:'central-docs'});put(root,'docs/components/registry.yaml','components:\n  - name: absent\n    repo: https://example.invalid/absent.git\n');
 const r=spawnSync(process.execPath,[join(root,'scripts/aggregate.mjs')],{cwd:root,encoding:'utf8'});assert.equal(r.status,2);assert.match(r.stdout+r.stderr,/blocked|缺失/);
});
test('PLAT-05: every existing scenario has valid v2 policy and references on this Linux host',()=>{
 for(const name of readdirSync('tests/scenarios')){
  const config=JSON.parse(readFileSync(`tests/scenarios/${name}/config.json`));const root=fixture(config);const r=cli(root,['--only','core.config,core.policy,core.references']);assert.equal(r.status,0,`${name}\n${r.stdout}\n${r.stderr}`);
 }
});
test('PLAT-06: a nonexistent target below an aliased parent is rejected before creation',()=>{
 const outer=mkdtempSync(join(tmpdir(),'harness-parent-')),outside=mkdtempSync(join(tmpdir(),'harness-destination-'));symlinkSync(outside,join(outer,'alias'),'dir');
 assert.throws(()=>assemble(join(outer,'alias','new-project'),cfg),/symlink/);assert.equal(existsSync(join(outside,'new-project')),false);
});
test('PLAT-07: Claude skill adapters point to the common lifecycle without old ten-step text',()=>{
 const root=fixture({runtimes:['claude-code'],components:['dev-flow-skills']});const s=readFileSync(join(root,'.claude/skills/dev-flow/SKILL.md'),'utf8');assert.match(s,/docs\/skills\/dev-flow\/SKILL.md/);assert.ok(!s.includes('10 步'));assert.ok(!s.includes('提交→SSOT'));
 const noSkill=fixture({runtimes:['claude-code']});assert.equal(existsSync(join(noSkill,'.claude/skills/dev-flow/SKILL.md')),false);
});
