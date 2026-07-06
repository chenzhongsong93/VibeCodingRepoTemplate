import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const MD_LINK_RE = /\[[^\]]*\]\(([^)]+)\)/g;
const HTML_LINK_RE = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;

// Collect dead markdown + HTML links in a generated dir.
// Returns array of { file, link, target } for links whose target does not exist.
// Ignores external (http/https/mailto) and anchor-only (#) links.
export function deadLinks(rootDir) {
  const dead = [];
  for (const file of listLinkFiles(rootDir)) {
    const rel = file.slice(rootDir.length + 1).replace(/\\/g, '/');
    const text = readFileSync(file, 'utf8');
    const targets = new Set();
    const re = rel.endsWith('.html') ? HTML_LINK_RE : MD_LINK_RE;
    for (const m of text.matchAll(re)) targets.add(m[1]);
    for (const target of targets) {
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      const cleanTarget = target.split('#')[0].split('?')[0];
      if (!cleanTarget) continue;
      const abs = resolve(dirname(file), cleanTarget);
      if (!existsSync(abs)) dead.push({ file: rel, link: target, target: cleanTarget });
    }
  }
  return dead;
}

function listLinkFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) listLinkFiles(full, out);
    else if (entry.name.endsWith('.md') || entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}
