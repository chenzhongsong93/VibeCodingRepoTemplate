import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildMap, mapPath } from './naming.mjs';
export const definitions=JSON.parse(readFileSync(new URL('./contracts/definitions.json',import.meta.url),'utf8'));
export const templateRoot=fileURLToPath(new URL('./templates/',import.meta.url));
export function safeRelative(path) {
  if(typeof path!=='string'||!path||path.startsWith('/')||path.includes('\\')||path.includes(':')||(/[\x00-\x1f\x7f]/.test(path))||path.split('/').some(x=>x==='..'||x===''||(x==='.'&&path!=='.'))) throw new Error(`非法仓内路径: ${path}`);
  return path;
}
export const documentPaths={handover:'docs/HANDOVER.md',roadmap:'docs/ROADMAP.md',workflow:'docs/rules/dev-workflow-rules.md',testSpec:'docs/02-design/test-spec',tasks:'.harness/local/tasks',taskTemplate:'docs/tasks/task-template.md',taskGuide:'docs/tasks/README.md',constitution:'.specify/memory/constitution.md',systemDesign:'docs/00-system/system-design.md',domainModel:'docs/00-system/domain-model.md',domainIndex:'specs/README.md',e2e:'docs/skills/e2e-dev-flow/SKILL.md',livingSpecTemplate:'docs/guides/living-spec-template.md'};
export function resolveConfig(input) {
  if(!input||typeof input!=='object'||Array.isArray(input)) throw new Error('config必须是对象');
  const config={stacks:[],runtimes:[],components:[],repoRole:'single',repoShape:'single',remote:'none',naming:'en',commitGate:{mode:'default'},year:String(new Date().getFullYear()),...input};
  for(const k of ['projectName','oneLine']) if(typeof config[k]!=='string'||!config[k].trim()) throw new Error(`缺少${k}`);
  if(!['en','zh','custom'].includes(config.naming)) throw new Error('未知naming');
  if(!['single','component','central-docs'].includes(config.repoRole)||!['single','monorepo'].includes(config.repoShape)) throw new Error('未知仓角色/形态');
  if(!['none','github','gitcode','gitlab'].includes(config.remote)) throw new Error('未知remote');
  if(!['default','custom','none'].includes(config.commitGate?.mode)) throw new Error('未知commitGate');
  if(config.commitGate.mode==='custom') {if(!config.commitGate.regex)throw new Error('custom正则缺失');new RegExp(config.commitGate.regex);}
  if(config.preset&&!definitions.presets[config.preset])throw new Error('未知preset');
  config.components=[...new Set([...(definitions.presets[config.preset]||[]),...config.components])];
  for(const key of ['components','stacks','runtimes']) {
    if(!Array.isArray(config[key])||config[key].some(x=>!definitions[key].includes(x)))throw new Error(`未知${key}`);
    if(new Set(config[key]).size!==config[key].length)throw new Error(`重复${key}`);
  }
  config.stackRoots={...(config.stackRoots||{})};
  for(const [id,path] of Object.entries(config.stackRoots)){if(!config.stacks.includes(id))throw new Error(`未知stackRoots: ${id}`);safeRelative(path);}
  if(config.stacks.includes('node-frontend')&&config.stacks.includes('node-backend')&&(config.stackRoots['node-frontend']||'.')===(config.stackRoots['node-backend']||'.'))throw new Error('Node前后端根路径冲突；请声明不同stackRoots');
  if(config.documents)for(const [role,path] of Object.entries(config.documents)){if(!Object.hasOwn(documentPaths,role))throw new Error(`未知document角色: ${role}`);safeRelative(path);}
  if(config.documents&&new Set(Object.values({...documentPaths,...config.documents})).size!==Object.keys(documentPaths).length)throw new Error('document角色路径冲突');
  if(config.domains){if(!Array.isArray(config.domains))throw new Error('domains须为数组');const ids=new Set(),paths=new Set();for(const domain of config.domains){if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(domain.id)||ids.has(domain.id)||paths.has(domain.path))throw new Error('domain身份/路径重复或非法');safeRelative(domain.path);if(!domain.path.endsWith('.md')||typeof domain.description!=='string'||!domain.description.trim()||/[|\n\r]/.test(domain.description))throw new Error('domain须含Markdown路径与单行description');ids.add(domain.id);paths.add(domain.path);}}
  if(config.checks){if(!Array.isArray(config.checks))throw new Error('checks须为数组');const checkIds=new Set();for(const c of config.checks){if(checkIds.has(c.id))throw new Error('重复check ID');checkIds.add(c.id);if(c.kind!=='command'||!c.id||!Array.isArray(c.argv)||!c.argv.length||c.argv.some(x=>typeof x!=='string'||x.includes('\0'))||typeof c.required!=='boolean'||!Array.isArray(c.profiles)||!c.profiles.length||c.profiles.some(x=>!['fast','ci','release'].includes(x))||!['local-validation','real-e2e'].includes(c.effect)||!(c.timeoutSeconds>0))throw new Error(`check契约非法: ${c.id}`);safeRelative(c.cwd||'.');if(c.inputs!==undefined){if(!Array.isArray(c.inputs))throw new Error('check.inputs须为路径数组');for(const path of c.inputs)safeRelative(path);}}}

  if(config.stacks.length&&config.components.includes('deployment-gates'))throw new Error('deployment-gates仅适用无编程栈');
  if(config.components.includes('dev-flow-skills')&&!config.components.includes('agent-policy'))config.components.push('agent-policy');
  const map=buildMap(config.naming,config.namingCustom||{});
  for(const key of Object.keys(map))if(key.endsWith('/SKILL.md'))throw new Error('SKILL.md是技能发现协议文件，不能改名');
  for(const [key,value] of Object.entries(map)) {if(!key.startsWith('docs/')&&!['ERROR_LOG.md','REVIEW.md'].includes(key))throw new Error('工具契约文件禁止改名');safeRelative(key);if(typeof value!=='string'||value.includes('/')||value.includes('\\')||value==='..'||!value.trim())throw new Error('命名必须为单个文件名');safeRelative(value);}
  return config;
}
const command=(id,argv,layer,profiles=['fast','ci','release'])=>({id,kind:'command',argv,cwd:'.',tools:[argv[0]],layer,profiles,required:true,timeoutSeconds:600,effect:'local-validation',group:id.endsWith('.test')?'test':id.endsWith('.build')?'build':'lint'});
export function makeProject(config,files,revision) {
  const map=buildMap(config.naming,config.namingCustom||{});
  const doc=p=>{for(const [role,path] of Object.entries(documentPaths))if(config.documents?.[role]&&(p===path||p.startsWith(path+'/')))return p===path?config.documents[role]:config.documents[role]+mapPath(p,map).slice(path.length);return mapPath(p,map);};
  const documents=Object.fromEntries(Object.entries(documentPaths).map(([role,path])=>[role,config.documents?.[role]||doc(path)]));
  const groups={P0:[doc('docs/ROADMAP.md')],P1:[],P2:[doc('docs/02-design/test-spec/README.md')],P3:[]};
  const available=(paths)=>paths.map(doc).filter(p=>files.has(p));
  groups.P0.push(...available(['docs/00-charter/concept.md','docs/00-charter/guardrails.md','docs/00-charter/vision-strategy.md','docs/02-design/north-star.md']));
  groups.P1.push(documents.systemDesign,documents.domainModel,...available(['docs/02-design/api/api-reference.md']));
  groups.P2.push(...available(['docs/02-design/ui-design/README.md']));
  groups.P3.push(...available(['docs/ledger/debt.md']));
  const checks=['config','policy','references','hygiene','tasks','assets'].map(handler=>({id:`core.${handler}`,kind:'builtin',handler,profiles:['fast','ci','release'],required:true}));
  checks.push({id:'core.design',kind:'builtin',handler:'design',profiles:['fast','ci','release'],required:true});
  checks.push({id:'core.convergence',kind:'builtin',handler:'convergence',profiles:['ci','release'],required:true});
  checks.push({id:'core.completeness',kind:'builtin',handler:'completeness',profiles:['ci','release'],required:true});
  if(config.components.includes('deployment-gates'))checks.push({id:'core.deployment',kind:'builtin',handler:'deployment',profiles:['fast','ci','release'],required:true,group:'deployment'});
  if(config.components.includes('dev-flow-skills'))checks.push({id:'core.traceability',kind:'builtin',handler:'traceability',profiles:['fast','ci','release'],required:true});
  for(const s of config.stacks){
    const cmds={rust:[['format',['cargo','fmt','--check']],['lint',['cargo','clippy','--all-targets','--','-D','warnings']],['test',['cargo','test'],'L1'],['build',['cargo','build','--release']]],'node-frontend':[['lint',['npm','run','lint']],['test',['npm','test'],'L1'],['build',['npm','run','build']]],'node-backend':[['lint',['npm','run','lint']],['test',['npm','test'],'L1'],['build',['npm','run','build']]],python:[['lint',['ruff','check']],['typecheck',['mypy']],['test',['pytest','-q'],'L1'],['build',['python','-m','build']]],go:[['lint',['go','vet','./...']],['format',[process.execPath,'scripts/harness/go-format.mjs']],['test',['go','test','./...'],'L1'],['build',['go','build','./...']]],java:[['lint',['mvn','spotless:check','checkstyle:check','spotbugs:check']],['test',['mvn','test'],'L1'],['build',['mvn','package']]]};
    for(const [name,argv,layer] of cmds[s])checks.push({...command(`${s}.${name}`,argv[0]===process.execPath?['node',...argv.slice(1)]:argv,layer,name==='build'?['ci','release']:undefined),cwd:config.stackRoots[s]||'.',...(s==='python'&&['lint','typecheck'].includes(name)?{inputSelection:{kind:'python-files',excludeDirectoryNames:['.git','node_modules','__pycache__','.venv','venv','.pytest_cache','.mypy_cache','.ruff_cache'],excludePaths:['.harness/local','build','dist']}}:{}),...(s==='go'&&name==='format'?{argv:['node',(config.stackRoots[s]&&config.stackRoots[s]!=='.'?'../'.repeat(config.stackRoots[s].split('/').length):'')+'scripts/harness/go-format.mjs']}:{} )});
  }
  for(const c of config.checks||[]){const i=checks.findIndex(x=>x.id===c.id);if(i<0)checks.push(c);else if(checks[i].kind==='builtin')throw new Error('不可替换基础检查');else checks[i]=c;}
  return {...(config.ci?{ci:config.ci}:{}),schemaVersion:2,nodeMinimum:22,templateRevision:revision,capabilities:['base-policy','task-context','design-governance','asset-lifecycle',...config.components],fingerprintExcludes:[...new Set(config.stacks.flatMap(s=>(s==='rust'||s==='java'?['target']:s.startsWith('node-')?['dist','coverage','test-results']:s==='python'?['build','dist','.pytest_cache','.mypy_cache','.ruff_cache']:[]).map(path=>(config.stackRoots[s]&&config.stackRoots[s]!=='.'?config.stackRoots[s]+'/':'')+path)))],documents,completeness:{stage:'P0',required:groups},stacks:config.stacks.map(id=>({id,cwd:config.stackRoots[id]||'.'})),checks,workflow:{version:1,source:documents.e2e,role:'执行投影，不是设计/政策权威',stages:definitions.stages},skills:[{id:'e2e-dev-flow',path:documents.e2e},...(config.components.includes('dev-flow-skills')?['dev-flow','test-spec','design-review'].map(id=>({id,path:`docs/skills/${id}/SKILL.md`})) :[])],runtimes:config.runtimes,worktree:{defaultBase:`origin/${config.branchModel?.dev||'dev'}`,parent:'..'},assemblyConfig:config};
}

export function fileOwnership(path){return ['package.json','tsconfig.json','pyproject.toml','go.mod','pom.xml','Makefile'].includes(path.split('/').pop())||path==='.harness/project.json'||path==='.harness/assets.json'||((path.endsWith('.md')||path==='doc/component.yaml'||path==='docs/components/registry.yaml')&&!path.startsWith('docs/skills/')&&!['AGENTS.md','CLAUDE.md'].includes(path))?'project':'template';}
