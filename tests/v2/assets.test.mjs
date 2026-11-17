import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync, symlinkSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fixture, put, cli } from './helpers.mjs';

function asset(root, args, expected = 0) {
  const r = cli(root, args, 'assets-cli.mjs');
  assert.equal(r.status, expected, `${args.join(' ')}: ${r.stdout} ${r.stderr}`);
  return r.report;
}
function setup() {
  const root = fixture();
  put(root, '.harness/assets.json', { schemaVersion: 1, enabled: true, workDays: 0, runDays: 0, cacheDays: 0, quarantineDays: 0 });
  return root;
}
function workspace(root, work = 'change-one', kind = 'work') {
  return asset(root, ['workspace', '--work', work, '--kind', kind, '--producer', 'test', ...(kind === 'cache' ? ['--rebuild', 'node build.mjs'] : [])]);
}
function close(root, a) { return asset(root, ['close', '--id', a.id, '--disposition', 'discarded', '--reason', '试验结束，无需长期承接']); }
function plan(root) {
  const p = asset(root, ['plan']);
  put(root, '.harness/local/gc-plan.json', p);
  return p;
}
function apply(root, status = 0) { return asset(root, ['apply', '--plan', '.harness/local/gc-plan.json'], status); }

test('ASSET-01: script, screenshot and analysis remain protected while work is active', () => {
  const root = setup(), a = workspace(root);
  put(root, `${a.path}/probe.mjs`, 'console.log("probe")\n');
  writeFileSync(join(root, a.path, 'screenshot.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5mcAAAAASUVORK5CYII=', 'base64'));
  put(root, `${a.path}/analysis.md`, '# 实验\n结果尚待裁决。\n');
  assert.equal(plan(root).actions.length, 0);
  assert.equal(asset(root, ['inventory']).assets.find(x => x.id === a.id).protected, true);
  assert.ok(existsSync(join(root, a.path, 'probe.mjs')));
});

test('ASSET-02: closed assets quarantine, restore exact bytes, and require explicit unpin before deletion', () => {
  const root = setup(), a = workspace(root);
  put(root, `${a.path}/proof.txt`, 'valuable experiment');
  close(root, a); assert.equal(plan(root).actions[0].action, 'quarantine'); apply(root);
  assert.ok(!existsSync(join(root, a.path)));
  asset(root, ['restore', '--id', a.id]);
  assert.equal(readFileSync(join(root, a.path, 'proof.txt'), 'utf8'), 'valuable experiment');
  assert.equal(plan(root).actions.length, 0);
  asset(root, ['unpin', '--id', a.id, '--name', 'restored']);
  plan(root); apply(root); assert.equal(plan(root).actions[0].action, 'purge'); apply(root);
  assert.equal(asset(root, ['inventory']).assets.find(x => x.id === a.id).state, 'deleted');
});

test('ASSET-03: live consumers transitively protect closed dependencies and releasing references permits collection', () => {
  const root = setup(), a = workspace(root, 'input'), b = workspace(root, 'intermediate'), c = workspace(root, 'consumer');
  asset(root, ['reference', '--from', b.id, '--to', a.id]);
  asset(root, ['reference', '--from', c.id, '--to', b.id]);
  close(root, a); close(root, b); assert.equal(plan(root).actions.length, 0);
  asset(root, ['unreference', '--from', c.id, '--to', b.id]);
  assert.equal(plan(root).actions.length, 2);
});

test('ASSET-04: changed bytes, new reference and policy changes all invalidate a pending GC plan', () => {
  const root = setup(), a = workspace(root); put(root, `${a.path}/x`, 'before'); close(root, a); plan(root);
  put(root, `${a.path}/x`, 'after'); apply(root, 2); assert.ok(existsSync(join(root, a.path)));
  plan(root); asset(root, ['pin', '--id', a.id, '--name', 'review']); apply(root, 2);
  asset(root, ['unpin', '--id', a.id, '--name', 'review']); plan(root);
  put(root, '.harness/assets.json', { schemaVersion: 1, enabled: false }); apply(root, 2);
});

test('ASSET-05: unknown and ignored files outside registered bundles survive automatic GC', () => {
  const root = setup(); put(root, 'scratch.py', '# user work'); put(root, '.harness/local/runs/old.json', '{}');
  put(root, '.harness/local/assets/unregistered/important.txt', 'unknown');
  const a = workspace(root); close(root, a);
  asset(root, ['run-due']); asset(root, ['run-due']);
  for (const path of ['scratch.py', '.harness/local/runs/old.json', '.harness/local/assets/unregistered/important.txt']) assert.ok(existsSync(join(root, path)), path);
  assert.ok(asset(root, ['inventory']).unmanaged.some(x => x.includes('unregistered')));
});

test('ASSET-06: leased and blocked work cannot be closed for collection', () => {
  const root = setup(), a = workspace(root), lease = asset(root, ['lease', '--id', a.id, '--reason', 'writer']);
  asset(root, ['close', '--id', a.id, '--disposition', 'discarded', '--reason', 'attempt'], 2);
  asset(root, ['release', '--id', a.id, '--token', lease.token]);
  asset(root, ['block', '--id', a.id, '--reason', 'failure needs diagnosis']);
  assert.equal(plan(root).actions.length, 0);
  asset(root, ['resume', '--id', a.id]); close(root, a);
  assert.equal(plan(root).actions.length, 1);
});

test('ASSET-07: evidence export is self-contained and transfer checks actual retained contents', () => {
  const root = setup(), a = workspace(root, 'evidence'); put(root, `${a.path}/proof.txt`, 'stable');
  asset(root, ['pin', '--id', a.id, '--name', 'release-v1']);
  asset(root, ['export', '--id', a.id, '--to', 'delivery/evidence-v1']);
  assert.equal(readFileSync(join(root, 'delivery/evidence-v1/files/proof.txt'), 'utf8'), 'stable');
  asset(root, ['close', '--id', a.id, '--disposition', 'transferred', '--target', 'delivery/evidence-v1', '--reason', 'copied and verified']);
  assert.equal(plan(root).actions.length, 0);
  put(root, 'delivery/evidence-v1/files/proof.txt', 'tampered');
  asset(root, ['verify-export', '--path', 'delivery/evidence-v1'], 2);
});

test('ASSET-08: symlinks and registry path tampering fail closed before removing anything', () => {
  const root = setup(), a = workspace(root); put(root, 'precious.txt', 'keep');
  symlinkSync(join(root, 'precious.txt'), join(root, a.path, 'link')); close(root, a);
  asset(root, ['plan'], 2); assert.equal(readFileSync(join(root, 'precious.txt'), 'utf8'), 'keep');
});

test('ASSET-09: restore refuses to overwrite replacement work', () => {
  const root = setup(), a = workspace(root); put(root, `${a.path}/x`, 'old'); close(root, a); plan(root); apply(root);
  put(root, `${a.path}/x`, 'new'); asset(root, ['restore', '--id', a.id], 2);
  assert.equal(readFileSync(join(root, a.path, 'x'), 'utf8'), 'new');
});

test('ASSET-10: inactive automatic policy never deletes, even with zero TTL', () => {
  const root = setup(), a = workspace(root); close(root, a);
  put(root, '.harness/assets.json', { schemaVersion: 1, enabled: false, workDays: 0 });
  assert.equal(asset(root, ['run-due']).executed, false); assert.ok(existsSync(join(root, a.path)));
});

test('ASSET-11: forged plans cannot extend candidate paths and incomplete locks block mutation', () => {
  const root = setup(), a = workspace(root); close(root, a); const p = plan(root);
  p.actions[0].path = 'precious.txt'; put(root, 'precious.txt', 'safe'); put(root, '.harness/local/gc-plan.json', p);
  apply(root, 2); assert.equal(readFileSync(join(root, 'precious.txt'), 'utf8'), 'safe');
  mkdirSync(join(root, '.harness/local/asset-state/lock'));
  asset(root, ['workspace', '--work', 'blocked'], 2);
});

test('ASSET-12: reopening a quarantined failure restores its bytes and preserves an inspectable blocked record', () => {
  const root = setup(), a = workspace(root); put(root, `${a.path}/diagnostic`, 'needed'); close(root, a); plan(root); apply(root);
  asset(root, ['block', '--id', a.id, '--reason', 'new failure investigation']);
  const found = asset(root, ['inventory']).assets.find(x => x.id === a.id);
  assert.equal(found.state, 'blocked'); assert.equal(found.protected, true);
  assert.equal(readFileSync(join(root, found.path, 'diagnostic'), 'utf8'), 'needed');
});

test('ASSET-13: an interrupted quarantine is completed by recovery rather than treated as lost evidence', () => {
  const root = setup(), a = workspace(root); put(root, `${a.path}/proof`, 'recoverable'); close(root, a);
  const v = asset(root, ['inventory']).assets.find(x => x.id === a.id);
  const path = '.harness/local/asset-state/registry.json', state = JSON.parse(readFileSync(join(root, path), 'utf8'));
  const to = `.harness/local/quarantine/${a.id}`;
  state.operations.push({ id: 'interrupted-operation', asset: a.id, action: 'quarantine', from: a.path, to, digest: v.digest, status: 'prepared', createdAt: new Date().toISOString() });
  put(root, path, state); mkdirSync(join(root, '.harness/local/quarantine'), { recursive: true }); renameSync(join(root, a.path), join(root, to));
  asset(root, ['plan'], 2); asset(root, ['recover']); asset(root, ['restore', '--id', a.id]);
  assert.equal(readFileSync(join(root, a.path, 'proof'), 'utf8'), 'recoverable');
});

test('ASSET-14: cache quota reclaims only eligible cache and never consumes evidence budget', () => {
  const root = setup();
  put(root, '.harness/assets.json', { schemaVersion: 1, enabled: true, cacheDays: 14, cacheMaxBytes: 3 });
  const old = workspace(root, 'cache-old', 'cache'), recent = workspace(root, 'cache-new', 'cache'), proof = workspace(root, 'proof', 'evidence');
  for (const a of [old, recent, proof]) { put(root, `${a.path}/data`, 'abc'); close(root, a); }
  const p = plan(root); assert.equal(p.actions.length, 1); assert.equal(p.actions[0].id, old.id);
  assert.ok(p.retained.some(a => a.id === proof.id));
});

test('ASSET-15: a stale exported copy cannot discharge newer source evidence', () => {
  const root = setup(), a = workspace(root); put(root, `${a.path}/proof`, 'old');
  asset(root, ['export', '--id', a.id, '--to', 'delivery/old']); put(root, `${a.path}/proof`, 'new');
  asset(root, ['close', '--id', a.id, '--disposition', 'transferred', '--target', 'delivery/old', '--reason', 'attempt'], 2);
  assert.equal(plan(root).actions.length, 0);
});
test('ASSET-16: normalized export paths cannot put the retained copy into a GC-managed directory', () => {
  const root = setup(), a = workspace(root), b = workspace(root, 'other'); put(root, `${a.path}/proof`, 'unique');
  asset(root, ['export', '--id', a.id, '--to', `./${b.path}/delivery`], 2);
  assert.ok(!existsSync(join(root, b.path, 'delivery')));
});
test('ASSET-17: loss or corruption of transferred evidence protects the original through quarantine and purge', () => {
  for (const quarantine of [false, true]) {
    const root = setup(), a = workspace(root); put(root, `${a.path}/proof`, 'unique');
    asset(root, ['export', '--id', a.id, '--to', 'delivery/proof']);
    asset(root, ['close', '--id', a.id, '--disposition', 'transferred', '--target', 'delivery/proof', '--reason', 'verified']);
    if (quarantine) { plan(root); apply(root); }
    rmSync(join(root, 'delivery/proof'), { recursive: true });
    assert.equal(plan(root).actions.length, 0);
    const found = asset(root, ['inventory']).assets.find(x => x.id === a.id); assert.equal(found.protected, true);
    assert.equal(readFileSync(join(root, found.path, 'proof'), 'utf8'), 'unique');
  }
});
test('ASSET-18: corrupt journal state or timestamp blocks before destructive operations', () => {
  for (const field of ['status', 'completedAt']) {
    const root = setup(), a = workspace(root); put(root, `${a.path}/proof`, 'safe'); close(root, a); plan(root); apply(root);
    const path = '.harness/local/asset-state/registry.json', state = JSON.parse(readFileSync(join(root, path), 'utf8'));
    state.operations[0][field] = field === 'status' ? 'prepare' : 'corrupt-time'; put(root, path, state);
    asset(root, ['run-due'], 2);
    assert.equal(readFileSync(join(root, state.assets[a.id].path, 'proof'), 'utf8'), 'safe');
  }
});
