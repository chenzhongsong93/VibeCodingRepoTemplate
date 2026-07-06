import { test } from 'node:test';
import assert from 'node:assert/strict';
import { substitute } from '../../skills/init-code-repo/substitute.mjs';

test('substitutes known variables', () => {
  const out = substitute('项目: {{PROJECT_NAME}} — {{ONE_LINE}} ({{YEAR}})', {
    projectName: 'DemoTool',
    oneLine: '一个小工具',
    year: '2026',
  });
  assert.equal(out, '项目: DemoTool — 一个小工具 (2026)');
});

test('leaves unknown placeholders untouched', () => {
  const out = substitute('{{PROJECT_NAME}} {{UNKNOWN}}', {
    projectName: 'Demo', oneLine: '', year: '2026',
  });
  assert.equal(out, 'Demo {{UNKNOWN}}');
});

test('substitutes COMMIT_REGEX', () => {
  const out = substitute('regex: {{COMMIT_REGEX}}', {
    projectName: '', oneLine: '', year: '2026', commitRegex: '^.+$',
  });
  assert.equal(out, 'regex: ^.+$');
});
