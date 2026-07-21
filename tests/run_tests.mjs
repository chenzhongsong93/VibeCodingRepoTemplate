import { test } from 'node:test';
import { rmSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
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

test('full-product: docker infra + entity-model + ui-design present', () => {
  const tmp = '/tmp/init-code-repo-test-fp-extras';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, JSON.parse(readFileSync('tests/scenarios/full-product/config.json', 'utf8')));
  const tree = fileTree(tmp);
  // docker infra
  assertOk(tree.includes('infra/docker/Dockerfile'), 'Dockerfile present');
  assertOk(tree.includes('infra/docker/docker-compose.yml'), 'compose present');
  assertOk(tree.includes('infra/docker/.env.example'), '.env.example present');
  // entity-model + ui-design (product-docs)
  assertOk(tree.includes('docs/02-design/entity-model.md'), 'entity-model present');
  assertOk(tree.includes('docs/02-design/ui-design/README.md'), 'ui-design README present');
  // docker Dockerfile has rust hint (full-product stacks rust+node), no node hint leak... actually node IS selected so node hint present too
  const df = readFileSync(`${tmp}/infra/docker/Dockerfile`, 'utf8');
  assertOk(df.includes('Rust 示例'), 'Dockerfile rust hint');
  assertOk(df.includes('Node 示例'), 'Dockerfile node hint');
  assertClean(df, 'full-product Dockerfile');
});

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
  // claude-code → .claude/settings.json (minimal model: no agent-policy)
  const tmpC = '/tmp/init-code-repo-test-rt-cc';
  rmSync(tmpC, { recursive: true, force: true });
  assemble(tmpC, { projectName:'D', oneLine:'L', year:'2026', stacks:[], repoShape:'single', runtimes:['claude-code'], remote:'none', commitGate:{mode:'default'}, components:[] });
  const treeC = fileTree(tmpC);
  assertOk(treeC.includes('.claude/settings.json'), 'claude-code produces .claude/settings.json');
  // core README.md NOT overwritten by adapter (no adapter README exists)
  const rm = readFileSync(`${tmpC}/README.md`, 'utf8');
  assertOk(rm.startsWith('# D'), 'core README intact (not overwritten)');

  // minimal-model security assertions: git write in ask (not allow), destructive in deny, no verify
  const sj = JSON.parse(readFileSync(`${tmpC}/.claude/settings.json`, 'utf8'));
  const allowStr = (sj.permissions.allow || []).join(' ');
  assertOk(!allowStr.includes('git commit') && !allowStr.includes('git push'), 'minimal: git commit/push NOT in allow');
  assertOk((sj.permissions.ask || []).some(p => p.includes('git commit')), 'minimal: git commit in ask');
  assertOk((sj.permissions.deny || []).some(p => p.includes('reset --hard')), 'minimal: deny has reset --hard');
  assertOk(!allowStr.includes('verify'), 'minimal: no verify in allow');
  assertOk(!JSON.stringify(sj).includes('{{VERIFY_FAST_CMD}}'), 'no leftover var (minimal has no verify line anyway)');

  // codex runtime → no extra files (adapter removed)
  const tmpX = '/tmp/init-code-repo-test-rt-codex';
  rmSync(tmpX, { recursive: true, force: true });
  assemble(tmpX, { projectName:'D', oneLine:'L', year:'2026', stacks:[], repoShape:'single', runtimes:['codex'], remote:'none', commitGate:{mode:'default'}, components:[] });
  const treeX = fileTree(tmpX);
  assertOk(!treeX.includes('README.md') || readFileSync(`${tmpX}/README.md`,'utf8').startsWith('# D'), 'codex does not overwrite README');
  assertOk(!treeX.some(f => f.startsWith('codex/')), 'no codex adapter dir');
});

test('agent-policy: settings.json full model with verify in allow', () => {
  const tmp = '/tmp/init-code-repo-test-settings-full';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, { projectName:'P', oneLine:'L', year:'2026', stacks:['rust'], repoShape:'single', runtimes:['claude-code'], remote:'none', commitGate:{mode:'default'}, components:['agent-policy'] });
  const sj = JSON.parse(readFileSync(`${tmp}/.claude/settings.json`, 'utf8'));
  const allowStr = (sj.permissions.allow || []).join(' ');
  assertOk(allowStr.includes('verify'), 'full: verify in allow');
  assertOk(allowStr.includes('make verify-fast'), 'full: VERIFY_FAST_CMD substituted to make verify-fast (rust stack)');
  assertOk((sj.permissions.ask || []).some(p => p.includes('git commit')), 'full: git commit in ask');
  assertOk(!JSON.stringify(sj).includes('{{VERIFY_FAST_CMD}}'), 'no leftover var');
});

test('agent-policy: check-agent-policy.mjs shipped + POLICY_ID substituted', () => {
  // Full run (exits 0) is asserted in the 2g AGENTS-Policy test, after the
  // AGENTS Policy段 is added. Here we only verify the script ships with its
  // {{POLICY_ID}} placeholder substituted (the script's own invariants beyond
  // AGENTS — settings.json full model + agent-governance 4 docs — already hold
  // at this point; only assertion ② needs the 2g AGENTS段).
  const tmp = '/tmp/init-code-repo-test-check-policy';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, { projectName:'P', oneLine:'L', year:'2026', stacks:['rust'], repoShape:'single', runtimes:['claude-code'], remote:'none', commitGate:{mode:'default'}, components:['agent-policy'] });
  assertOk(fileTree(tmp).includes('scripts/check-agent-policy.mjs'), 'check-agent-policy shipped');
  const cap = readFileSync(`${tmp}/scripts/check-agent-policy.mjs`, 'utf8');
  assertOk(!cap.includes('{{POLICY_ID}}'), 'POLICY_ID substituted in shipped script');
  assertOk(cap.includes('P-Agent-Policy: 1.0'), 'script embeds resolved POLICY_ID');
  assertClean(cap, 'check-agent-policy.mjs');
});

test('agent-policy: rust Makefile verify targets', () => {
  const tmp = '/tmp/init-code-repo-test-verify-rust';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, { projectName:'P', oneLine:'L', year:'2026', stacks:['rust'], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:['agent-policy'] });
  const mk = readFileSync(`${tmp}/Makefile`, 'utf8');
  assertOk(mk.includes('verify-fast:'), 'rust Makefile has verify-fast');
  assertOk(mk.includes('verify-release:'), 'rust Makefile has verify-release');
  assertOk(mk.includes('ALLOW_REAL_E2E'), 'rust Makefile has ALLOW_REAL_E2E guard');
  assertOk(mk.includes('policy-check:'), 'rust Makefile has policy-check');
  assertClean(mk, 'rust Makefile');
  const tmp2 = '/tmp/init-code-repo-test-verify-rust-no';
  rmSync(tmp2, { recursive: true, force: true });
  assemble(tmp2, { projectName:'P', oneLine:'L', year:'2026', stacks:['rust'], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:[] });
  const mk2 = readFileSync(`${tmp2}/Makefile`, 'utf8');
  assertOk(!mk2.includes('verify-fast:'), 'no verify-fast without agent-policy');
  assertOk(!mk2.includes('policy-check:'), 'no policy-check without agent-policy');
  assertClean(mk2, 'rust Makefile no-ap');
});

test('agent-policy: node package.json verify scripts valid JSON both modes', () => {
  // node package.json valid JSON both modes (whole-scripts IF/ELSE override)
  const tmpNode = '/tmp/init-code-repo-test-verify-node';
  rmSync(tmpNode, { recursive: true, force: true });
  assemble(tmpNode, { projectName:'P', oneLine:'L', year:'2026', stacks:['node'], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:['agent-policy'] });
  const pj = JSON.parse(readFileSync(`${tmpNode}/package.json`, 'utf8'));
  assertOk(pj.scripts['verify:fast'], 'node has verify:fast');
  assertOk(pj.scripts['verify:release'], 'node has verify:release');
  assertOk(pj.scripts['verify:release'].includes('ALLOW_REAL_E2E'), 'node verify:release has guard');
  assertOk(pj.scripts['verify:fast'].includes('check-agent-policy'), 'node verify:fast calls check-agent-policy');
  assertOk(pj.scripts.lint, 'lint still present');
  // without agent-policy → no verify scripts, valid JSON
  const tmpNode2 = '/tmp/init-code-repo-test-verify-node-no';
  rmSync(tmpNode2, { recursive: true, force: true });
  assemble(tmpNode2, { projectName:'P', oneLine:'L', year:'2026', stacks:['node'], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:[] });
  const pj2 = JSON.parse(readFileSync(`${tmpNode2}/package.json`, 'utf8'));
  assertOk(!pj2.scripts['verify:fast'], 'no verify:fast without agent-policy');
  assertOk(pj2.scripts.lint, 'lint still present without agent-policy');
  assertClean(readFileSync(`${tmpNode2}/package.json`, 'utf8'), 'node package.json no-ap clean');
});

test('agent-policy: go + python Makefile verify targets', () => {
  for (const stack of ['go', 'python']) {
    const tmp = `/tmp/init-code-repo-test-verify-${stack}`;
    rmSync(tmp, { recursive: true, force: true });
    assemble(tmp, { projectName:'P', oneLine:'L', year:'2026', stacks:[stack], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:['agent-policy'] });
    const mk = readFileSync(`${tmp}/Makefile`, 'utf8');
    assertOk(mk.includes('verify-fast:'), `${stack} Makefile has verify-fast`);
    assertOk(mk.includes('verify-release:'), `${stack} Makefile has verify-release`);
    assertOk(mk.includes('ALLOW_REAL_E2E'), `${stack} Makefile has ALLOW_REAL_E2E guard`);
    assertOk(mk.includes('policy-check:'), `${stack} Makefile has policy-check`);
    assertClean(mk, `${stack} Makefile`);
  }
});

test('agent-policy: AGENTS Policy段 + lefthook verify-fast', () => {
  const tmp = '/tmp/init-code-repo-test-agents-policy';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, { projectName:'P', oneLine:'L', year:'2026', stacks:['rust'], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:['agent-policy'] });
  const a = readFileSync(`${tmp}/AGENTS.md`, 'utf8');
  assertOk(a.includes('P-Agent-Policy: 1.0'), 'AGENTS has POLICY_ID substituted');
  assertOk(a.includes('Policy 1.0 有效摘要'), 'AGENTS has Policy section');
  assertOk(a.includes('T0'), 'AGENTS has T0-T3 summary');
  assertOk(a.includes('授权边界'), 'AGENTS has 授权边界');
  assertOk(a.includes('新会话续接读序'), 'AGENTS has session read order');
  assertOk(!a.includes('{{POLICY_ID}}') && !a.includes('{{VERIFY_FAST_CMD}}'), 'AGENTS no leftover vars');
  assertOk(!a.includes('{{DEV_BRANCH}}') && !a.includes('{{MAIN_BRANCH}}'), 'AGENTS branch vars substituted');
  assertClean(a, 'AGENTS');
  const lh = readFileSync(`${tmp}/lefthook.yml`, 'utf8');
  assertOk(lh.includes('verify-fast'), 'lefthook has verify-fast');
  assertOk(lh.includes('make verify-fast'), 'lefthook verify-fast cmd substituted');
  assertOk(!lh.includes('{{VERIFY_FAST_CMD}}'), 'no leftover var');
  assertClean(lh, 'lefthook');
});

test('agent-policy: check-agent-policy.mjs exits 0 (full invariants)', () => {
  // Now that the AGENTS Policy段 (2g.1) ships {{POLICY_ID}}, all five
  // check-agent-policy invariants hold → script exits 0.
  const tmp = '/tmp/init-code-repo-test-check-policy-run';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, { projectName:'P', oneLine:'L', year:'2026', stacks:['rust'], repoShape:'single', runtimes:['claude-code'], remote:'none', commitGate:{mode:'default'}, components:['agent-policy'] });
  const r = spawnSync('node', [`${tmp}/scripts/check-agent-policy.mjs`, tmp]);
  assert.equal(r.status, 0, `check-agent-policy exits 0; stderr: ${String(r.stderr)}`);
});

for (const name of ['component', 'central-docs']) {
  test(`${name}: file tree matches golden`, () => {
    const tmp = `/tmp/init-code-repo-test-${name}`;
    rmSync(tmp, { recursive: true, force: true });
    assemble(tmp, JSON.parse(readFileSync(`tests/scenarios/${name}/config.json`, 'utf8')));
    assertTreeEqual(fileTree(tmp), JSON.parse(readFileSync(`tests/golden/${name}/expected-tree.json`, 'utf8')), `${name} tree`);
  });

  test(`${name}: role-specific content`, () => {
    const tmp = `/tmp/init-code-repo-test-${name}-content`;
    rmSync(tmp, { recursive: true, force: true });
    assemble(tmp, JSON.parse(readFileSync(`tests/scenarios/${name}/config.json`, 'utf8')));
    const a = readFileSync(`${tmp}/AGENTS.md`, 'utf8');
    if (name === 'component') {
      assertOk(a.includes('## 跨仓文档'), 'component AGENTS has 跨仓段');
      assertOk(!a.includes('## 跨仓文档（中央 docs 仓）'), 'component AGENTS no central-docs段');
      const cy = readFileSync(`${tmp}/doc/component.yaml`, 'utf8');
      assertOk(cy.includes('name: comp-svc'), 'component.yaml has name');
      assertClean(cy, 'component.yaml');
    } else {
      assertOk(a.includes('中央 docs 仓'), 'central-docs AGENTS has central段');
      assertOk(readFileSync(`${tmp}/docs/components/registry.yaml`, 'utf8').includes('registry'), 'registry present');
      assertOk(readFileSync(`${tmp}/scripts/aggregate.mjs`, 'utf8').includes('aggregate'), 'aggregate.mjs present');
    }
    assertClean(a, `${name} AGENTS`);
  });
}

test('html-views: tree + content', () => {
  const tmp = '/tmp/init-code-repo-test-html-views';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, JSON.parse(readFileSync('tests/scenarios/html-views/config.json', 'utf8')));
  const tree = fileTree(tmp);
  const expected = JSON.parse(readFileSync('tests/golden/html-views/expected-tree.json', 'utf8'));
  assertTreeEqual(tree, expected, 'html-views tree');
  assertOk(tree.includes('docs/.vitepress/config.ts'), 'vitepress config present');
  assertOk(tree.includes('docs/02-design/views/README.md'), 'views README present');
  const c = readFileSync(`${tmp}/docs/.vitepress/config.ts`, 'utf8');
  assertOk(c.includes("title: 'HtmlViews'"), 'vitepress title substituted');
  assertClean(c, 'vitepress config');
  const dg = readFileSync(`${tmp}/docs/02-design/doc-governance.md`, 'utf8');
  assertOk(dg.includes('HTML 视图（非 SSOT）'), 'governance has HTML section');
  assertClean(dg, 'governance');
});

test('deadLinks: scans .html <a href>', () => {
  const tmp = '/tmp/init-code-repo-test-html-deadlink';
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(`${tmp}/docs`, { recursive: true });
  writeFileSync(`${tmp}/docs/page.html`,
    '<a href="good.html">good</a> <a href="missing.html">missing</a> <a href="https://ext.com">ext</a> <a href="#anchor">anchor</a>');
  writeFileSync(`${tmp}/docs/good.html`, '<p>exists</p>');
  const dead = deadLinks(tmp);
  assertOk(dead.some(d => d.target === 'missing.html'), 'missing.html flagged');
  assertOk(!dead.some(d => d.target === 'good.html'), 'good.html not flagged');
  assertOk(!dead.some(d => d.link.startsWith('https://') || d.link.startsWith('#')), 'ext/anchor ignored');
});

test('check-completeness.mjs: shipped to generated repo + flags TODO residue', () => {
  // assemble full-product (has product-docs → charter/north-star with TODO residue)
  const tmp = '/tmp/init-code-repo-test-completeness';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, JSON.parse(readFileSync('tests/scenarios/full-product/config.json', 'utf8')));
  const tree = fileTree(tmp);
  assertOk(tree.includes('scripts/check-completeness.mjs'), 'check-completeness.mjs shipped to generated repo');
  // run the shipped script against the assembled repo (P0 → charter/north-star TODO → exit 1)
  const r = spawnSync('node', [`${tmp}/scripts/check-completeness.mjs`, '--stage', 'P0', '--root', tmp]);
  assertOk(r.status === 1, 'check-completeness exits 1 on TODO residue');
  const err = String(r.stderr);
  assertOk(err.includes('concept.md') || err.includes('north-star.md'), 'stderr mentions a TODO-bearing doc');
});

test('dev-conductor: SKILL.md exists and orchestrates superpowers', () => {
  const skill = readFileSync('skills/dev-conductor/SKILL.md', 'utf8');
  assertOk(skill.startsWith('---\nname: dev-conductor'), 'dev-conductor frontmatter');
  assertOk(skill.includes('superpowers:brainstorming'), 'drives brainstorming for docs');
  assertOk(skill.includes('superpowers:writing-plans'), 'drives writing-plans for code');
  assertOk(skill.includes('executing-plans'), 'drives executing-plans');
  assertOk(skill.includes('完整性门控'), 'reads completeness gate');
  assertOk(skill.includes('构建块视图'), 'reads system-architecture to split modules');
  assertOk(skill.includes('cargo new') || skill.includes('npm create'), 'native scaffolding');
  assertOk(skill.includes('不写文档/代码') || skill.includes('不自己写代码'), 'does not write code itself');
});

test('init-code-repo SKILL.md引导 dev-conductor (not fill-design-doc/scaffold-code)', () => {
  const skill = readFileSync('skills/init-code-repo/SKILL.md', 'utf8');
  assertOk(skill.includes('dev-conductor'), 'init-code-repo references dev-conductor');
  assertOk(!skill.includes('fill-design-doc'), 'init-code-repo no longer references fill-design-doc');
  assertOk(!skill.includes('scaffold-code'), 'init-code-repo no longer references scaffold-code');
});

test('zh-naming: file tree matches golden', () => {
  const tmp = '/tmp/init-code-repo-test-zh';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, JSON.parse(readFileSync('tests/scenarios/zh-naming/config.json', 'utf8')));
  const actual = fileTree(tmp);
  const expected = JSON.parse(readFileSync('tests/golden/zh-naming/expected-tree.json', 'utf8'));
  assertTreeEqual(actual, expected, 'zh-naming tree');
});

test('agent-policy: CLAUDE.md single-line when active', () => {
  const baseCfg = { projectName:'P', oneLine:'L', year:'2026', stacks:[], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:[] };
  const tmpNo = '/tmp/init-code-repo-test-claude-no';
  rmSync(tmpNo, { recursive: true, force: true });
  assemble(tmpNo, baseCfg);
  assertOk(readFileSync(`${tmpNo}/CLAUDE.md`,'utf8').split('\n').filter(l=>l.trim()).length > 1, 'no agent-policy: multi-line CLAUDE');
  const tmpYes = '/tmp/init-code-repo-test-claude-yes';
  rmSync(tmpYes, { recursive: true, force: true });
  assemble(tmpYes, { ...baseCfg, components:['agent-policy'] });
  assert.equal(readFileSync(`${tmpYes}/CLAUDE.md`,'utf8').trim(), '@AGENTS.md', 'agent-policy: CLAUDE.md is single @AGENTS.md');
});

test('agent-policy: dev-workflow-rules governance vs slim', () => {
  const baseCfg = { projectName:'P', oneLine:'L', year:'2026', stacks:[], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:[] };
  const tmpSlim = '/tmp/init-code-repo-test-ap-slim';
  rmSync(tmpSlim, { recursive: true, force: true });
  assemble(tmpSlim, baseCfg);
  const dwSlim = readFileSync(`${tmpSlim}/docs/rules/dev-workflow-rules.md`, 'utf8');
  assertOk(!dwSlim.includes('T0–T3 公共风险分级'), 'slim no T0-T3 table');
  assertClean(dwSlim, 'slim dev-workflow');

  const tmpGov = '/tmp/init-code-repo-test-ap-gov';
  rmSync(tmpGov, { recursive: true, force: true });
  assemble(tmpGov, { ...baseCfg, components:['agent-policy'], branchModel:{dev:'dev_mvp'} });
  const dwGov = readFileSync(`${tmpGov}/docs/rules/dev-workflow-rules.md`, 'utf8');
  assertOk(dwGov.includes('T0–T3 公共风险分级'), 'gov has T0-T3 table');
  assertOk(!dwGov.includes('{{DEV_BRANCH}}'), 'DEV_BRANCH substituted');
  assertOk(dwGov.includes('dev_mvp'), 'branch var substituted to dev_mvp');
  assertClean(dwGov, 'gov dev-workflow');
});

test('dev-flow-skills: three SSOT + agent-policy auto-activated', () => {
  const tmp = '/tmp/init-code-repo-test-devflow-skills';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, { projectName:'P', oneLine:'L', year:'2026', stacks:['rust'], repoShape:'single', runtimes:['claude-code'], remote:'none', commitGate:{mode:'default'}, components:['dev-flow-skills'] });
  const tree = fileTree(tmp);
  assertOk(tree.includes('docs/skills/dev-flow/SKILL.md'), 'dev-flow SSOT');
  assertOk(tree.includes('docs/skills/test-spec/SKILL.md'), 'test-spec SSOT');
  assertOk(tree.includes('docs/skills/design-review/SKILL.md'), 'design-review SSOT');
  assertOk(tree.includes('docs/02-design/agent-governance/policy.md'), 'agent-policy auto-activated');
  assertOk(tree.includes('scripts/check-agent-policy.mjs'), 'check-agent-policy present');
  const df = readFileSync(`${tmp}/docs/skills/dev-flow/SKILL.md`, 'utf8');
  assertOk(!df.includes('baiwang'), 'no baiwang leftover');
  assertOk(!df.includes('{{VERIFY_FAST_CMD}}'), 'VERIFY_FAST_CMD substituted');
  assertClean(df, 'dev-flow SSOT');
  // test-spec + design-review SSOT also clean + no baiwang
  const ts = readFileSync(`${tmp}/docs/skills/test-spec/SKILL.md`, 'utf8');
  assertOk(!ts.includes('baiwang') && !ts.includes('octo') && !ts.includes('neo4j'), 'test-spec no baiwang/octo/neo4j');
  assertClean(ts, 'test-spec SSOT');
  const dr = readFileSync(`${tmp}/docs/skills/design-review/SKILL.md`, 'utf8');
  assertOk(!dr.includes('baiwang') && !dr.includes('octo') && !dr.includes('neo4j'), 'design-review no baiwang/octo/neo4j');
  assertClean(dr, 'design-review SSOT');
});

test('dev-flow-skills: thin adapters under .claude/skills', () => {
  const tmp = '/tmp/init-code-repo-test-thin-adapters';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, { projectName:'P', oneLine:'L', year:'2026', stacks:['rust'], repoShape:'single', runtimes:['claude-code'], remote:'none', commitGate:{mode:'default'}, components:['dev-flow-skills'] });
  const tree = fileTree(tmp);
  assertOk(tree.includes('.claude/skills/dev-flow/SKILL.md'), 'dev-flow thin adapter');
  assertOk(tree.includes('.claude/skills/test-spec/SKILL.md'), 'test-spec thin adapter');
  assertOk(tree.includes('.claude/skills/design-review/SKILL.md'), 'design-review thin adapter');
  const t = readFileSync(`${tmp}/.claude/skills/dev-flow/SKILL.md`, 'utf8');
  assertOk(t.includes('docs/skills/dev-flow/SKILL.md'), 'thin adapter points to SSOT');
  assertClean(t, 'thin adapter');
  // each adapter points to its own SSOT + no baiwang
  for (const sk of ['test-spec', 'design-review']) {
    const c = readFileSync(`${tmp}/.claude/skills/${sk}/SKILL.md`, 'utf8');
    assertOk(c.includes(`docs/skills/${sk}/SKILL.md`), `${sk} adapter points to SSOT`);
    assertOk(!c.includes('baiwang'), `${sk} adapter no baiwang`);
    assertClean(c, `${sk} adapter`);
  }
  const tmp2 = '/tmp/init-code-repo-test-thin-no-cc';
  rmSync(tmp2, { recursive: true, force: true });
  assemble(tmp2, { projectName:'P', oneLine:'L', year:'2026', stacks:['rust'], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:['dev-flow-skills'] });
  assertOk(!fileTree(tmp2).some(f => f.startsWith('.claude/skills/')), 'no thin adapter without claude-code runtime');
});

test('dev-flow-skills: check-test-spec-consistency shipped', () => {
  const tmp = '/tmp/init-code-repo-test-tspec-consistency';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, { projectName:'P', oneLine:'L', year:'2026', stacks:['rust'], repoShape:'single', runtimes:[], remote:'none', commitGate:{mode:'default'}, components:['dev-flow-skills'] });
  assertOk(fileTree(tmp).includes('scripts/check-test-spec-consistency.mjs'), 'consistency script shipped');
  const r = spawnSync('node', [`${tmp}/scripts/check-test-spec-consistency.mjs`, tmp]);
  assert.equal(r.status, 0, 'skip when no test-spec dir');
});

test('zh-naming: Chinese filenames + tooling-fixed English + links + gate works', () => {
  const tmp = '/tmp/init-code-repo-test-zh-content';
  rmSync(tmp, { recursive: true, force: true });
  assemble(tmp, JSON.parse(readFileSync('tests/scenarios/zh-naming/config.json', 'utf8')));
  const tree = fileTree(tmp);
  // Chinese doc names
  assertOk(tree.includes('docs/路线图.md'), '路线图.md');
  assertOk(tree.includes('docs/交接.md'), '交接.md');
  assertOk(tree.includes('docs/rules/研发流程规则.md'), '研发流程规则.md');
  assertOk(tree.includes('docs/02-design/系统架构.md'), '系统架构.md');
  assertOk(tree.includes('docs/02-design/北极星.md'), '北极星.md');
  assertOk(tree.includes('docs/02-design/api/接口文档.md'), '接口文档.md');
  assertOk(tree.includes('docs/rules/Agent行为军规.md'), 'Agent行为军规.md');
  assertOk(tree.includes('docs/ledger/bug台账.md'), 'bug台账.md');
  // tooling-fixed English
  assertOk(tree.includes('AGENTS.md') && tree.includes('CLAUDE.md') && tree.includes('README.md'), 'tooling-fixed English');
  assertOk(tree.includes('lefthook.yml'), 'lefthook.yml English');
  // no leftover placeholders
  const agents = readFileSync(`${tmp}/AGENTS.md`, 'utf8');
  assertOk(!agents.includes('{{FILE:'), 'no {{FILE: leftover');
  assertOk(agents.includes('](docs/rules/研发流程规则.md)'), 'AGENTS link uses Chinese path');
  // charter 章程.md relative link to 概念.md
  const charter = readFileSync(`${tmp}/docs/00-charter/章程.md`, 'utf8');
  assertOk(charter.includes('](概念.md)'), 'charter relative link Chinese');
  // check-completeness.mjs shipped with Chinese MAPPING paths + runs
  const cc = readFileSync(`${tmp}/scripts/check-completeness.mjs`, 'utf8');
  assertOk(cc.includes('docs/00-charter/概念.md'), 'check-completeness MAPPING has Chinese path');
  assertOk(!cc.includes('{{FPATH:'), 'no {{FPATH: leftover in shipped script');
  const r = spawnSync('node', [`${tmp}/scripts/check-completeness.mjs`, '--stage', 'P0', '--root', tmp]);
  assertOk(r.status === 1, 'zh check-completeness exits 1 on TODO residue');
  assertOk(String(r.stderr).includes('概念.md') || String(r.stderr).includes('北极星.md'), 'zh stderr mentions Chinese doc');
  // dead-link check
  const dead = deadLinks(tmp);
  assert.equal(dead.length, 0, `zh dead links:\n${dead.map(d => '  ' + d.file + ' -> ' + d.link).join('\n')}`);
});
