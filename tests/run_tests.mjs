import { test } from 'node:test';
import { rmSync, readFileSync } from 'node:fs';
import { fileTree } from './lib/tree.mjs';
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
