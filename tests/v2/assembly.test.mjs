import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { assemble } from '../../skills/init-code-repo/assemble.mjs';
const config={projectName:'Example',oneLine:'本地示例',year:'2026',stacks:[],runtimes:[],remote:'none',components:[]};
const fresh=()=>mkdtempSync(join(tmpdir(),'harness-v2-asm-'));
test('ASM-01: default output carries resolved v2 contract, base policy and real check entry without a stack',()=>{
 const dir=fresh();assemble(dir,config);
 const project=JSON.parse(readFileSync(join(dir,'.harness/project.json')));
 assert.equal(project.schemaVersion,2);
 assert.deepEqual(project.workflow.stages,['orient','specify','design','analyze','implement','verify','converge','handover']);
 assert.ok(existsSync(join(dir,'scripts/harness/check.mjs')));
 assert.match(readFileSync(join(dir,'AGENTS.md'),'utf8'),/授权边界/);
});
test('ASM-02: invalid and conflicting configurations fail before any file is written',()=>{
 for(const overrides of [{stacks:['node-frontend','node-backend']},{stacks:['java'],components:['deployment-gates']},{components:['unknown']},{naming:'custom',namingCustom:{'docs/ROADMAP.md':'../../escape.md'}}]){
  const dir=fresh();assert.throws(()=>assemble(dir,{...config,...overrides}));assert.equal(existsSync(join(dir,'AGENTS.md')),false);
 }
});
test('ASM-03: existing user files are preserved and assembly is refused',()=>{
 const dir=fresh();writeFileSync(join(dir,'AGENTS.md'),'user-owned');
 assert.throws(()=>assemble(dir,config),/存在|exist|conflict/i);
 assert.equal(readFileSync(join(dir,'AGENTS.md'),'utf8'),'user-owned');
});
test('ASM-04: Chinese documents and enabled skill index use the same resolved paths',()=>{
 const dir=fresh();assemble(dir,{...config,naming:'zh',components:['dev-flow-skills','living-specs']});
 const project=JSON.parse(readFileSync(join(dir,'.harness/project.json')));
 assert.equal(project.documents.handover,'docs/交接.md');
 assert.match(readFileSync(join(dir,'AGENTS.md'),'utf8'),/docs\/skills\/dev-flow\/SKILL.md/);
 assert.ok(existsSync(join(dir,'specs/README.md')));
});

test('ASM-05: installed generator CLI works outside the template repository',()=>{
 const dir=fresh(),configPath=join(fresh(),'config.json');writeFileSync(configPath,JSON.stringify(config));
 const r=spawnSync(process.execPath,[new URL('../../skills/init-code-repo/assemble.mjs',import.meta.url).pathname,'--config',configPath,'--root',dir],{cwd:dir,encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);assert.ok(existsSync(join(dir,'.harness/project.json')));
});
test('ASM-06: an existing non-directory parent refuses assembly without partial output',()=>{
 const dir=fresh();writeFileSync(join(dir,'docs'),'user-file');
 assert.throws(()=>assemble(dir,config));assert.equal(existsSync(join(dir,'.gitignore')),false);assert.equal(readFileSync(join(dir,'docs'),'utf8'),'user-file');
});
test('ASM-07: legacy living-specs selection retains the default reusable design template',()=>{
 const dir=fresh();assemble(dir,{...config,components:['living-specs']});assert.ok(existsSync(join(dir,'docs/guides/living-spec-template.md')));assert.match(readFileSync(join(dir,'AGENTS.md'),'utf8'),/specs\/README.md/);
});
test('ASM-08: runtime skill protocol filenames cannot be renamed into undiscoverable entries',()=>{
 const dir=fresh();
 assert.throws(()=>assemble(dir,{...config,naming:'custom',namingCustom:{'docs/skills/e2e-dev-flow/SKILL.md':'FLOW.md'}}),/SKILL|协议/);
 assert.equal(existsSync(join(dir,'AGENTS.md')),false);
});
