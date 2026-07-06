import { test } from 'node:test';
import { rmSync, readFileSync, readdirSync } from 'node:fs';
import { fileTree } from './lib/tree.mjs';
import { deadLinks } from './lib/links.mjs';
import { assertTreeEqual, assertClean, assertContains } from './lib/diff.mjs';
import assert from 'node:assert/strict';
import { assemble } from '../skills/init-code-repo/assemble.mjs';

const assertOk = assert.ok;

// Import lib unit tests so a single `npm test` runs the full suite.
import './lib/substitute.test.mjs';
import './lib/conditional.test.mjs';

const TMP = '/tmp/init-code-repo-test-lightweight';

function loadConfig(name) {
  return JSON.parse(readFileSync(`tests/scenarios/${name}/config.json`, 'utf8'));
}

test('lightweight: file tree matches golden', () => {
  rmSync(TMP, { recursive: true, force: true });
  assemble(TMP, loadConfig('lightweight'));
  const actual = fileTree(TMP);
  const expected = JSON.parse(readFileSync('tests/golden/lightweight/expected-tree.json', 'utf8'));
  assertTreeEqual(actual, expected, 'lightweight tree');
});

test('lightweight: content + cleanliness', () => {
  const tmp = '/tmp/init-code-repo-test-content';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, loadConfig('lightweight'));
  const tree = fileTree(tmp);
  const read = (p) => readFileSync(`${tmp}/${p}`, 'utf8');

  // AGENTS.md content
  const agents = read('AGENTS.md');
  assertContains(agents, '# AGENTS.md — DemoTool', 'AGENTS title');
  assertContains(agents, '一个小工具', 'AGENTS one-line');
  // lightweight: no optional rule rows
  assertOk(!agents.includes('agent-conduct-rules.md'), 'AGENTS no conduct row');
  assertOk(!agents.includes('clean-code-rules.md'), 'AGENTS no clean-code row');
  assertOk(!agents.includes('testing-rules.md'), 'AGENTS no testing row');

  // CLAUDE.md immutable pointer
  assertContains(read('CLAUDE.md'), 'AGENTS.md', 'CLAUDE points to AGENTS');

  // commit-rules: default mode enforced
  const cr = read('docs/rules/commit-rules.md');
  assertContains(cr, 'feat|fix|docs', 'commit default regex present');
  assertOk(!cr.includes('{{COMMIT_REGEX}}'), 'no leftover commit regex var');
  assertOk(!cr.includes('建议（非强制）'), 'default mode is enforced not suggested');

  // dev-workflow: slim (no full-workflow → no L2/L3 steps)
  const dw = read('docs/rules/dev-workflow-rules.md');
  assertOk(!dw.includes('L2 集成测试'), 'slim workflow no L2');
  assertOk(!dw.includes('L3 端到端测试'), 'slim workflow no L3');

  // ROADMAP / HANDOVER pairing
  assertContains(read('docs/ROADMAP.md'), 'HANDOVER.md', 'ROADMAP links HANDOVER');
  assertContains(read('docs/HANDOVER.md'), 'ROADMAP.md', 'HANDOVER links ROADMAP');

  // lefthook: gitleaks always + default commit-msg; no rust/node fragments
  const lh = read('lefthook.yml');
  assertContains(lh, 'gitleaks', 'lefthook gitleaks');
  assertContains(lh, 'conventional-commit', 'lefthook default commit-msg');
  assertOk(!lh.includes('cargo fmt'), 'no rust fragment in lightweight');
  assertOk(!lh.includes('eslint'), 'no node fragment in lightweight');

  // cleanliness across all non-.gitkeep files
  for (const f of tree) {
    if (!f.endsWith('.gitkeep')) assertClean(read(f), f);
  }
});

const MODE_TMP = '/tmp/init-code-repo-test-commit-modes';

function assembleFresh(tmp, configOverrides) {
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, { ...loadConfig('lightweight'), ...configOverrides });
}

test('commit-gate default mode', () => {
  assembleFresh(MODE_TMP, { commitGate: { mode: 'default' } });
  const lh = readFileSync(`${MODE_TMP}/lefthook.yml`, 'utf8');
  const cr = readFileSync(`${MODE_TMP}/docs/rules/commit-rules.md`, 'utf8');
  assertOk(lh.includes('feat|fix|docs'), 'lefthook has default regex');
  assertOk(cr.includes('feat|fix|docs'), 'commit-rules has default regex');
  assertOk(!lh.includes('{{COMMIT_REGEX}}'), 'no leftover COMMIT_REGEX in lefthook');
  assertOk(!cr.includes('建议（非强制）'), 'default is enforced not suggested');
});

test('commit-gate custom mode', () => {
  assembleFresh(MODE_TMP, {
    commitGate: { mode: 'custom', regex: '^.+:\\s.+$' },
  });
  const lh = readFileSync(`${MODE_TMP}/lefthook.yml`, 'utf8');
  const cr = readFileSync(`${MODE_TMP}/docs/rules/commit-rules.md`, 'utf8');
  assertOk(lh.includes('^.+:\\s.+$'), 'lefthook has custom regex');
  assertOk(cr.includes('^.+:\\s.+$'), 'commit-rules has custom regex');
  assertOk(!lh.includes('feat|fix|docs'), 'no default regex in custom mode');
  assertOk(!cr.includes('建议（非强制）'), 'custom is enforced not suggested');
});

test('commit-gate none mode', () => {
  assembleFresh(MODE_TMP, { commitGate: { mode: 'none' } });
  const lh = readFileSync(`${MODE_TMP}/lefthook.yml`, 'utf8');
  const cr = readFileSync(`${MODE_TMP}/docs/rules/commit-rules.md`, 'utf8');
  assertOk(cr.includes('建议（非强制）'), 'none mode is suggestion only');
  assertOk(!lh.includes('conventional-commit'), 'no commit-msg gate in none mode');
  assertOk(!cr.includes('feat|fix|docs'), 'no default regex in none mode');
});

const COND_TMP = '/tmp/init-code-repo-test-with-conduct';

test('with-conduct: AGENTS includes conduct row', () => {
  rmSync(COND_TMP, { recursive: true, force: true });
  assemble(COND_TMP, JSON.parse(readFileSync('tests/scenarios/with-conduct/config.json', 'utf8')));
  const agents = readFileSync(`${COND_TMP}/AGENTS.md`, 'utf8');
  assertOk(agents.includes('agent-conduct-rules.md'), 'AGENTS has conduct row');
  // other optional rows still absent
  assertOk(!agents.includes('clean-code-rules.md'), 'no clean-code row');
  assertOk(!agents.includes('testing-rules.md'), 'no testing row');
  // cleanliness
  assertClean(agents, 'with-conduct AGENTS');
});

test('lightweight: content snapshots match golden', () => {
  const tmp = '/tmp/init-code-repo-test-snap';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, loadConfig('lightweight'));
  const files = ['AGENTS.md', 'CLAUDE.md', 'lefthook.yml', 'docs/rules/commit-rules.md'];
  for (const f of files) {
    const actual = readFileSync(`${tmp}/${f}`, 'utf8');
    const expected = readFileSync(`tests/golden/lightweight/${f}`, 'utf8');
    assert.equal(actual, expected, `snapshot mismatch: ${f}`);
  }
});

const FW_TMP = '/tmp/init-code-repo-test-full-workflow';

test('full-workflow: L2/L3 steps + rust + doc-sync active', () => {
  rmSync(FW_TMP, { recursive: true, force: true });
  assemble(FW_TMP, JSON.parse(readFileSync('tests/scenarios/full-workflow/config.json', 'utf8')));

  const dw = readFileSync(`${FW_TMP}/docs/rules/dev-workflow-rules.md`, 'utf8');
  // L2/L3 present (full-workflow active)
  assertOk(dw.includes('L2 集成测试'), 'L2 step present');
  assertOk(dw.includes('L3 端到端测试'), 'L3 step present');
  // docker inner conditional active → Docker description present
  assertOk(dw.includes('Docker 镜像构建后跑契约测试'), 'docker L2 description present');
  // step numbers unique: 记录 is step 7, 发布门控 is step 8 (not 5/6)
  assertOk(dw.includes('7. **记录**'), '记录 is step 7');
  assertOk(dw.includes('8. **发布门控**'), '发布门控 is step 8');
  assertOk(!dw.includes('5. **记录**'), 'no duplicate 记录 at step 5');
  assertOk(!dw.includes('6. **发布门控**'), 'no duplicate 发布门控 at step 6');
  // three-tier-test NOT selected → its inline description stripped
  assertOk(!dw.includes('跨模块集成回归'), 'three-tier-test description stripped');
  assertClean(dw, 'full-workflow dev-workflow');

  const lh = readFileSync(`${FW_TMP}/lefthook.yml`, 'utf8');
  assertOk(lh.includes('cargo fmt'), 'rust fragment present');
  assertOk(lh.includes('cargo clippy'), 'rust clippy present');
  assertOk(lh.includes('doc-sync-check'), 'doc-sync pre-push gate present');
  assertOk(lh.includes('gitleaks'), 'gitleaks present');
  assertOk(!lh.includes('eslint'), 'no node fragment (node stack not selected)');
  assertClean(lh, 'full-workflow lefthook');

  // AGENTS cleanliness (no markers leaked)
  const agents = readFileSync(`${FW_TMP}/AGENTS.md`, 'utf8');
  assertClean(agents, 'full-workflow AGENTS');
});

test('require-marker: optional files included only when component active', () => {
  const tmp = '/tmp/init-code-repo-test-require';
  rmSync(tmp, { recursive: true, force: true });

  // lightweight: agent-conduct inactive → file absent
  assemble(tmp, loadConfig('lightweight'));
  const treeLight = fileTree(tmp);
  assertOk(!treeLight.includes('docs/rules/agent-conduct-rules.md'), 'agent-conduct absent in lightweight');
  assertOk(!treeLight.includes('docs/ledger/debt.md'), 'debt absent in lightweight');

  // with-conduct: agent-conduct active → file present, marker stripped
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, JSON.parse(readFileSync('tests/scenarios/with-conduct/config.json', 'utf8')));
  const treeCond = fileTree(tmp);
  assertOk(treeCond.includes('docs/rules/agent-conduct-rules.md'), 'agent-conduct present with-conduct');
  const ac = readFileSync(`${tmp}/docs/rules/agent-conduct-rules.md`, 'utf8');
  assertOk(!ac.startsWith('<!--require:'), 'require marker stripped from output');
  assertOk(ac.startsWith('# Agent 行为军规'), 'file starts with title after marker strip');
  assertClean(ac, 'with-conduct agent-conduct-rules');
});

const SCENARIOS = ['standard', 'full-product'];

for (const name of SCENARIOS) {
  test(`${name}: file tree matches golden`, () => {
    const tmp = `/tmp/init-code-repo-test-${name}`;
    rmSync(tmp, { recursive: true, force: true });
    assemble(tmp, JSON.parse(readFileSync(`tests/scenarios/${name}/config.json`, 'utf8')));
    const actual = fileTree(tmp);
    const expected = JSON.parse(readFileSync(`tests/golden/${name}/expected-tree.json`, 'utf8'));
    assertTreeEqual(actual, expected, `${name} tree`);
  });

  test(`${name}: no dead markdown links`, () => {
    const tmp = `/tmp/init-code-repo-test-${name}-links`;
    rmSync(tmp, { recursive: true, force: true });
    assemble(tmp, JSON.parse(readFileSync(`tests/scenarios/${name}/config.json`, 'utf8')));
    const dead = deadLinks(tmp);
    assert.equal(dead.length, 0, `${name} dead links:\n${dead.map(d => '  ' + d.file + ' -> ' + d.link).join('\n')}`);
  });

  test(`${name}: cleanliness (no leftover markers/vars)`, () => {
    const tmp = `/tmp/init-code-repo-test-${name}-clean`;
    rmSync(tmp, { recursive: true, force: true });
    assemble(tmp, JSON.parse(readFileSync(`tests/scenarios/${name}/config.json`, 'utf8')));
    for (const f of fileTree(tmp)) {
      if (!f.endsWith('.gitkeep')) assertClean(readFileSync(`${tmp}/${f}`, 'utf8'), `${name}:${f}`);
    }
  });
}

test('multi-stack: glue files + pre-receive present', () => {
  const tmp = '/tmp/init-code-repo-test-multi-stack';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, JSON.parse(readFileSync('tests/scenarios/multi-stack/config.json', 'utf8')));
  const tree = fileTree(tmp);
  const expected = JSON.parse(readFileSync('tests/golden/multi-stack/expected-tree.json', 'utf8'));
  assertTreeEqual(tree, expected, 'multi-stack tree');
  // stack glue files
  assertOk(tree.includes('Makefile'), 'rust Makefile present');
  assertOk(tree.includes('package.json'), 'node package.json present');
  // remote gate
  assertOk(tree.includes('pre-receive-remote/pre-receive'), 'pre-receive present (remote=github)');
  // full-ledger
  assertOk(tree.includes('docs/ledger/debt.md'), 'debt.md present (full-ledger)');
  assertOk(tree.includes('docs/ledger/version-log.md'), 'version-log.md present (full-ledger)');
  // substituted content
  const mk = readFileSync(`${tmp}/Makefile`, 'utf8');
  assertOk(mk.includes('# Makefile — MultiStack'), 'Makefile has project name');
  assertClean(mk, 'multi-stack Makefile');
  const pj = readFileSync(`${tmp}/package.json`, 'utf8');
  assertOk(pj.includes('"name": "MultiStack"'), 'package.json has project name');
  assertClean(pj, 'multi-stack package.json');
});

test('all scenarios: no dead markdown links', () => {
  const scenarios = readdirSync('tests/scenarios', { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  for (const name of scenarios) {
    const tmp = `/tmp/init-code-repo-deadlink-${name}`;
    rmSync(tmp, { recursive: true, force: true });
    assemble(tmp, JSON.parse(readFileSync(`tests/scenarios/${name}/config.json`, 'utf8')));
    const dead = deadLinks(tmp);
    assert.equal(dead.length, 0, `${name} dead links:\n${dead.map(d => '  ' + d.file + ' -> ' + d.link).join('\n')}`);
  }
});

test('SKILL.md: exists and documents assembly contract', () => {
  const skill = readFileSync('skills/init-code-repo/SKILL.md', 'utf8');
  assertOk(skill.startsWith('---\nname: init-code-repo'), 'SKILL has frontmatter');
  assertOk(skill.includes('5 阶段向导流'), 'SKILL has wizard stages');
  assertOk(skill.includes('阶段 0'), 'SKILL has stage 0');
  assertOk(skill.includes('阶段 5'), 'SKILL has stage 5');
  assertOk(skill.includes('手动装配规则'), 'SKILL has manual assembly rules');
  assertOk(skill.includes('{{PROJECT_NAME}}'), 'SKILL documents variable substitution');
  assertOk(skill.includes('<!--IF:cond-->'), 'SKILL documents conditional stripping');
  assertOk(skill.includes('<!--require:cond-->'), 'SKILL documents require markers');
  assertOk(skill.includes('激活集推导'), 'SKILL documents cond derivation');
  assertOk(skill.includes('死链校验'), 'SKILL documents dead-link check');
});

test('runtime adapters: claude-code produces .claude/settings.json, others produce nothing', () => {
  // claude-code → .claude/settings.json
  const tmpC = '/tmp/init-code-repo-test-rt-cc';
  rmSync(tmpC, { recursive: true, force: true });
  assemble(tmpC, { projectName:'D', oneLine:'L', year:'2026', stacks:[], repoShape:'single', runtimes:['claude-code'], remote:'none', commitGate:{mode:'default'}, components:[] });
  const treeC = fileTree(tmpC);
  assertOk(treeC.includes('.claude/settings.json'), 'claude-code produces .claude/settings.json');
  // core README.md NOT overwritten by adapter (no adapter README exists)
  const rm = readFileSync(`${tmpC}/README.md`, 'utf8');
  assertOk(rm.startsWith('# D'), 'core README intact (not overwritten)');

  // codex runtime → no extra files (adapter removed)
  const tmpX = '/tmp/init-code-repo-test-rt-codex';
  rmSync(tmpX, { recursive: true, force: true });
  assemble(tmpX, { projectName:'D', oneLine:'L', year:'2026', stacks:[], repoShape:'single', runtimes:['codex'], remote:'none', commitGate:{mode:'default'}, components:[] });
  const treeX = fileTree(tmpX);
  assertOk(!treeX.includes('README.md') || readFileSync(`${tmpX}/README.md`,'utf8').startsWith('# D'), 'codex does not overwrite README');
  assertOk(!treeX.some(f => f.startsWith('codex/')), 'no codex adapter dir');
});
