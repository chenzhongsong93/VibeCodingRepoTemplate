import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture,put,cli,project } from './helpers.mjs';
test('CHK-01: optional product docs are absent from minimal completeness; illegal stage is blocked',()=>{
 const root=fixture();put(root,'docs/ROADMAP.md','# ROADMAP\n\n## 当前阶段\nP0已定义验收内容。\n');
 assert.equal(cli(root,['--only','core.completeness','--stage','P0']).status,0);
 assert.equal(cli(root,['--only','core.completeness','--stage','garbage']).status,2);
});
test('CHK-02: a required document with empty sections fails',()=>{
 const root=fixture();put(root,'docs/ROADMAP.md','# ROADMAP\n\n## 空节\n');
 assert.equal(cli(root,['--only','core.completeness']).status,1);
});
test('CHK-03: Chinese policy and shared skill discovery are executable without a platform',()=>{
 const root=fixture({naming:'zh',components:['dev-flow-skills']});
 const r=cli(root,['--only','core.policy']);assert.equal(r.status,0,r.stdout+r.stderr);
});
test('CHK-04: duplicate IDs, L3 gaps and Java source locations are actually checked',()=>{
 const root=fixture({components:['dev-flow-skills']});
 put(root,'docs/02-design/test-spec/case.md','L1-JAVA-01\nL3-DEMO-01\n');
 put(root,'src/Case.java','class Case {\n // 覆盖:§1 L1-JAVA-01\n void acceptsInput() {}\n}\n');
 put(root,'.harness/test-map.json',{cases:[{id:'L1-JAVA-01',file:'src/Case.java',selector:'acceptsInput'}]});
 assert.equal(cli(root,['--only','core.traceability']).status,1);
 put(root,'src/Flow.ts','// 覆盖:§1 L3-DEMO-01\nfunction flowCase(){}\n');
 put(root,'.harness/test-map.json',{cases:[{id:'L1-JAVA-01',file:'src/Case.java',selector:'acceptsInput'},{id:'L3-DEMO-01',file:'src/Flow.ts',selector:'flowCase'}]});
 assert.equal(cli(root,['--only','core.traceability']).status,0);
 put(root,'src/Flow.ts','// 覆盖:§1 L3-DEMO-01\nfunction flowCase(){}\n// 覆盖:§1 L3-DEMO-01\nfunction extra(){}\n');
 assert.equal(cli(root,['--only','core.traceability']).status,1);
});
test('CHK-05: dead links and explicit references fail; invalid project schema blocks',()=>{
 const root=fixture();put(root,'docs/bad.md','# Docs\n\n[missing](absent.md)\n');
 assert.equal(cli(root,['--only','core.references']).status,1);
 project(root,p=>p.schemaVersion=999);
 assert.equal(cli(root).status,2);
});
