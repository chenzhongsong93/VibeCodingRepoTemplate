import assert from 'node:assert/strict';

// Asserts actual file list equals expected list.
export function assertTreeEqual(actual, expected, label) {
  assert.deepEqual(actual, expected, `tree mismatch [${label}]`);
}

// Asserts a file's content contains substring (lightweight content check).
export function assertContains(content, needle, label) {
  assert.ok(content.includes(needle), `[${label}] expected to contain:\n${needle}`);
}

// Asserts no leftover conditional markers or unresolved vars.
export function assertClean(content, label) {
  assert.ok(!/<!--IF:/.test(content), `[${label}] leftover <!--IF: marker`);
  assert.ok(!/<!--\/IF:/.test(content), `[${label}] leftover <!--/IF: marker`);
  assert.ok(!/\{\{[A-Z_]+\}\}/.test(content), `[${label}] leftover {{VAR}}`);
}
