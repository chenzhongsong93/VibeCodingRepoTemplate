import { readdirSync } from 'node:fs';

// Returns sorted relative file paths under dir (POSIX slashes).
export function fileTree(dir, base = dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git') continue;
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      out.push(...fileTree(full, base));
    } else {
      out.push(full.slice(base.length + 1).replace(/\\/g, '/'));
    }
  }
  return out.sort();
}
