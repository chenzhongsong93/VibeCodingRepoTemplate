import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const LINK_RE = /\[[^\]]*\]\(([^)]+)\)/g;

// Collect dead markdown links in a generated dir.
// Returns array of { file, link, target } for links whose target does not exist.
// Ignores external links (http/https/mailto) and anchor-only links (#...).
export function deadLinks(rootDir) {
  const dead = [];
  const files = listMdFiles(rootDir);
  for (const file of files) {
    const rel = file.slice(rootDir.length + 1).replace(/\\/g, '/');
    const text = readFileSync(file, 'utf8');
    let m;
    while ((m = LINK_RE.exec(text)) !== null) {
      const target = m[1];
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      const cleanTarget = target.split('#')[0].split('?')[0];
      if (!cleanTarget) continue;
      const abs = resolve(dirname(file), cleanTarget);
      if (!existsSync(abs)) {
        dead.push({ file: rel, link: target, target: cleanTarget });
      }
    }
  }
  return dead;
}

function listMdFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) listMdFiles(full, out);
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}
