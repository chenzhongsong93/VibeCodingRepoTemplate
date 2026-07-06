import { test } from 'node:test';
import { rmSync, readFileSync } from 'node:fs';
import { fileTree } from './lib/tree.mjs';
import { assertTreeEqual } from './lib/diff.mjs';
import { assemble } from '../skills/init-code-repo/assemble.mjs';

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
