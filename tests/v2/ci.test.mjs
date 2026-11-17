import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fixture, put, cli, project } from './helpers.mjs';
test('CI-01: selected provider gets executable preparation, shared checks and artifact retention', () => {
  for (const provider of ['github', 'gitlab']) {
    const root = fixture(), r = cli(root, ['render', '--provider', provider], 'ci.mjs');
    assert.equal(r.status, 0, r.stdout + r.stderr); assert.equal(r.report.remoteExecuted, false);
    const text = readFileSync(join(root, r.report.path), 'utf8');
    assert.match(text, /scripts\/harness\/ci.mjs prepare/); assert.match(text, /scripts\/harness\/check.mjs --profile ci/);
    assert.match(text, /retention-days: 30|expire_in: 30 days/);
  }
});
test('CI-02: existing workflow is never overwritten by regeneration', () => {
  const root = fixture(); put(root, '.github/workflows/harness.yml', 'custom pipeline');
  const r = cli(root, ['render', '--provider', 'github'], 'ci.mjs'); assert.equal(r.status, 2);
  assert.equal(readFileSync(join(root, '.github/workflows/harness.yml'), 'utf8'), 'custom pipeline');
});
test('CI-03: preparation executes declared argv in actual module cwd and propagates failure', () => {
  const root = fixture();
  put(root, 'modules/app/setup.mjs', "import {writeFileSync} from 'node:fs'; writeFileSync('ready.txt',process.argv[2]);\n");
  project(root, p => p.ci = { bootstrap: [{ argv: ['node', 'setup.mjs', 'literal $HOME and spaces'], cwd: 'modules/app' }] });
  let r = cli(root, ['prepare'], 'ci.mjs'); assert.equal(r.status, 0, r.stdout);
  assert.equal(readFileSync(join(root, 'modules/app/ready.txt'), 'utf8'), 'literal $HOME and spaces');
  project(root, p => p.ci.bootstrap = [{ argv: ['node', '-e', 'process.exit(4)'], cwd: '.' }]);
  r = cli(root, ['prepare'], 'ci.mjs'); assert.equal(r.status, 2); assert.equal(r.report.results[0].exitCode, 4);
});
