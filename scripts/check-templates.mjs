import {readdirSync,readFileSync,mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {spawnSync} from 'node:child_process';
import {buildFiles} from '../skills/init-code-repo/assemble.mjs';
import {validateProject} from '../skills/init-code-repo/templates/v2/scripts/harness/model.mjs';
let scenarios=0,syntax=0;
const scratch=mkdtempSync(join(tmpdir(),'harness-template-check-'));
for(const name of readdirSync('tests/scenarios').sort()){
 const config=JSON.parse(readFileSync(`tests/scenarios/${name}/config.json`));const files=buildFiles(config);scenarios++;
 validateProject(JSON.parse(files.get('.harness/project.json')));
 for(const [path,text] of files){
  if(/<!--(?:IF:|\/IF:|require:|ELSE)|\{\{(?:FILE:|FPATH:|FNAME:|[A-Z_]+\}\})/.test(text))throw new Error(`${name}/${path}: 残留装配标记`);
  if(path.endsWith('.json'))JSON.parse(text);
  if(path.endsWith('.mjs')){const temp=join(scratch,`${syntax++}.mjs`);writeFileSync(temp,text);const r=spawnSync(process.execPath,['--check',temp],{encoding:'utf8'});if(r.status!==0)throw new Error(`${name}/${path}: ${r.stderr}`);}
 }
}
console.log(JSON.stringify({status:'pass',scenarios,generatedScriptsSyntaxChecked:syntax,node:process.version,scope:'本地装配/JSON/JS语法与契约；不代表平台加载、栈运行或部署'},null,2));
