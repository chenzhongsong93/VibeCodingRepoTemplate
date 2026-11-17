import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fixture, put, cli, seedDesign, convergenceFor } from './helpers.mjs';

test('MNT-01: new repositories ship explicit disabled-by-default lifecycle policy', () => {
  const root = fixture();
  assert.ok(existsSync(join(root, '.harness/assets.json')));
  assert.equal(JSON.parse(readFileSync(join(root, '.harness/assets.json'))).enabled, false);
});
test('MNT-02: real verification reports are registered and a failure retains diagnostic evidence', () => {
  const root = fixture();
  const r = cli(root, ['--only', 'core.config']); assert.equal(r.status, 0, r.stdout);
  assert.ok(r.report.assetId, 'runner must register its actual output');
  assert.ok(existsSync(join(root, r.report.evidencePath)));
  const failed = cli(root, ['--only', 'core.completeness']); assert.notEqual(failed.status, 0);
  const all = cli(root, ['inventory'], 'assets-cli.mjs'); assert.equal(all.status, 0, all.stdout);
  assert.equal(all.report.assets.find(a => a.id === failed.report.assetId).protected, true);
});
test('MNT-03: real periodic foreground calls quarantine then purge, with retained unknown work', () => {
  const root = fixture(); put(root, '.harness/assets.json', { schemaVersion: 1, enabled: true, workDays: 0, quarantineDays: 0 });
  const a = cli(root, ['workspace', '--work', 'periodic'], 'assets-cli.mjs').report;
  put(root, `${a.path}/temporary.txt`, 'done'); put(root, 'unknown.txt', 'keep');
  assert.equal(cli(root, ['close', '--id', a.id, '--disposition', 'discarded', '--reason', 'no remaining obligations'], 'assets-cli.mjs').status, 0);
  const r = cli(root, ['run', '--iterations', '2', '--interval-seconds', '1'], 'maintenance.mjs');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const ticks = r.stdout.trim().split('\n').map(s => JSON.parse(s)); assert.equal(ticks.length, 2);
  assert.equal(ticks[0].completed[0].action, 'quarantine'); assert.equal(ticks[1].completed[0].action, 'purge');
  assert.ok(existsSync(join(root, 'unknown.txt')));
  assert.ok(cli(root, ['status'], 'assets-cli.mjs').report.lastRun.lastRun);
});
test('MNT-04: timer rendering binds the root and registry identity without claiming installation', () => {
  const root = fixture();
  for (const platform of ['systemd', 'launchd', 'windows']) {
    const r = cli(root, ['render', '--platform', platform], 'maintenance.mjs'); assert.equal(r.status, 0, r.stdout);
    assert.equal(r.report.installed, false); assert.ok(r.report.identity);
    for (const file of r.report.files) assert.ok(existsSync(join(root, file)));
  }
  const denied = cli(root, ['run', '--identity', 'wrong-identity'], 'maintenance.mjs'); assert.equal(denied.status, 2);
});
test('MNT-05: task completion retains its receipt while superseded run outputs become collectable', () => {
  const root = fixture(); seedDesign(root);
  put(root, '.harness/assets.json', { schemaVersion: 1, enabled: true, runDays: 0, quarantineDays: 0 });
  const t = cli(root, ['create', '--title', 'asset lifecycle', '--domain', 'specs/001-submission/spec.md'], 'task-cli.mjs').report;
  t.risk = { level: 'T1', rationale: 'local verification' }; t.scope = ['docs'];
  t.impact = { paths: ['docs'], contractChanges: false, dataChanges: false, securityChanges: false, externalEffects: false, productionEffects: false, behaviorChanges: false, requiredTestLayers: [] };
  t.criteriaRefs = [{ id: 'SUB-R1', path: 'specs/001-submission/spec.md' }];
  t.criteriaResults = [{ id: 'SUB-R1', status: 'pass', checkIds: ['core.policy'] }];
  t.stage = 'handover'; t.completedStages = ['orient', 'specify', 'design', 'analyze', 'implement', 'verify', 'converge'].map(stage => ({ stage, note: 'covered' }));
  t.convergence = convergenceFor(root, t);
  put(root, `.harness/local/tasks/${t.id}/task.json`, t); put(root, 'docs/HANDOVER.md', `# 当前交接\n\n${t.id}\n`); put(root, 'docs/ROADMAP.md', '# 计划\n\n## 当前\n已确认。\n');
  const config = JSON.parse(readFileSync(join(root, '.harness/project.json'), 'utf8'));
  put(root, '.harness/project.json', { ...config, checks: config.checks.filter(c => c.id !== 'core.assets') });
  assert.equal(cli(root, ['--task', t.id, '--intent', 'complete']).status, 2, 'complete must require lifecycle integrity check');
  put(root, '.harness/project.json', config);
  const old = cli(root, ['--task', t.id, '--only', 'core.config']); assert.equal(old.status, 0, old.stdout);
  const current = cli(root, ['--task', t.id, '--intent', 'complete']); assert.equal(current.status, 0, current.stdout);
  const done = cli(root, ['finish', '--task', t.id, '--evidence', './' + current.report.evidencePath], 'task-cli.mjs'); assert.equal(done.status, 0, done.stdout);
  const p = cli(root, ['plan'], 'assets-cli.mjs').report;
  assert.ok(p.actions.some(a => a.id === old.report.assetId));
  assert.ok(p.retained.some(a => a.id === current.report.assetId));
});
test('MNT-06: schedules for different repositories have distinct installable unit names', () => {
  for (const platform of ['systemd', 'launchd', 'windows']) {
    const first = cli(fixture(), ['render', '--platform', platform], 'maintenance.mjs');
    const second = cli(fixture(), ['render', '--platform', platform], 'maintenance.mjs');
    assert.equal(first.status, 0, first.stdout); assert.equal(second.status, 0, second.stdout);
    assert.notEqual(first.report.files[0].split('/').at(-1), second.report.files[0].split('/').at(-1));
  }
});
test('MNT-07: normal verification checks lifecycle configuration and journal integrity without running GC', () => {
  const root = fixture();
  let r = cli(root, ['--only', 'core.assets']); assert.equal(r.status, 0, r.stdout);
  put(root, '.harness/assets.json', { schemaVersion: 1, enabled: 'yes' });
  r = cli(root, ['--only', 'core.assets']); assert.equal(r.status, 2, r.stdout);
});
test('MNT-08: generated Linux unit passes native parser and preserves literal dollar/percent paths', t => {
  if (process.platform !== 'linux' || spawnSync('systemd-analyze', ['--version']).status !== 0) { t.skip('systemd-analyze unavailable; no Linux parser claim'); return; }
  const initial = fixture(), root = initial + ' $VIBE%literal'; renameSync(initial, root);
  const rendered = cli(root, ['render', '--platform', 'systemd'], 'maintenance.mjs'); assert.equal(rendered.status, 0, rendered.stdout);
  const service = rendered.report.files.find(p => p.endsWith('.service'));
  const r = spawnSync('systemd-analyze', ['verify', join(root, service)], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stdout + r.stderr);
  const text = readFileSync(join(root, service), 'utf8');
  assert.match(text, /ExecStart=.*\$\$VIBE%%literal/);
});
