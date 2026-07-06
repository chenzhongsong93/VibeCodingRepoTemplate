import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripConditionals, activeConds } from '../../skills/init-code-repo/conditional.mjs';

test('activeConds derives states from components', () => {
  assert.deepEqual(
    activeConds({ components: ['docker'], remote: 'none' }).sort(),
    ['docker', 'full-workflow'].sort()
  );
});

test('activeConds includes remote-hook when remote set', () => {
  const c = activeConds({ components: [], remote: 'github' });
  assert.ok(c.includes('remote-hook'));
});

test('keeps block when cond active, strips when inactive', () => {
  const tpl = 'A\n<!--IF:product-level-->\nB\n<!--/IF:product-level-->\nC';
  assert.equal(stripConditionals(tpl, ['product-level']), 'A\nB\nC');
  assert.equal(stripConditionals(tpl, []), 'A\nC');
});

test('strips IF block but keeps ELSE content', () => {
  const tpl = '<!--IF:full-workflow-->FULL<!--ELSE-->SLIM<!--/IF:full-workflow-->';
  assert.equal(stripConditionals(tpl, ['full-workflow']), 'FULL');
  assert.equal(stripConditionals(tpl, []), 'SLIM');
});
