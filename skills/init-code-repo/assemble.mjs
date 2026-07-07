import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { substitute } from './substitute.mjs';
import { activeConds, stripConditionals } from './conditional.mjs';
import { buildMap, mapPath, substituteFiles, substituteFilePaths, substituteFileNames } from './naming.mjs';

const REQUIRE_RE = /^<!--require:([\w-]+)-->\n?/;

function walk(srcDir, out = []) {
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const full = join(srcDir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function extraConds(config) {
  const conds = [];
  const mode = config.commitGate?.mode || 'default';
  if (mode === 'default') conds.push('commit-default');
  else if (mode === 'custom') conds.push('commit-custom');
  else if (mode === 'none') conds.push('commit-none');
  for (const s of config.stacks || []) conds.push(s);
  for (const r of config.runtimes || []) conds.push(r);
  if (config.repoRole === 'component') conds.push('multi-repo-component');
  if (config.repoRole === 'central-docs') conds.push('central-docs');
  return conds;
}

function writeTree(srcDir, targetDir, ctx, activeSet, map) {
  if (!existsSync(srcDir)) return;
  for (const abs of walk(srcDir)) {
    const rel = abs.slice(srcDir.length + 1).replace(/\\/g, '/');
    let content = readFileSync(abs, 'utf8');
    const req = content.match(REQUIRE_RE);
    if (req) {
      if (!activeSet.has(req[1])) continue;
      content = content.slice(req[0].length);
    }
    content = substitute(content, ctx);
    content = substituteFilePaths(content, map);
    content = substituteFileNames(content, map);
    const outRel = rel.replace(/\.tmpl$/, '');
    const currentDir = outRel.includes('/') ? outRel.slice(0, outRel.lastIndexOf('/')) : '';
    content = substituteFiles(content, map, currentDir);
    content = stripConditionals(content, [...activeSet]);
    const outRelMapped = mapPath(outRel, map);
    const outPath = join(targetDir, outRelMapped);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, content);
  }
}

export function assemble(targetDir, config) {
  const ctx = {
    projectName: config.projectName,
    oneLine: config.oneLine,
    year: String(config.year),
    commitRegex: config.commitGate?.regex || '',
  };
  const conds = [...activeConds(config), ...extraConds(config)];
  const activeSet = new Set(conds);
  const map = buildMap(config.naming, config.namingCustom || {});
  const root = 'skills/init-code-repo/templates';
  writeTree(join(root, 'core'), targetDir, ctx, activeSet, map);
  for (const stack of config.stacks || []) {
    writeTree(join(root, 'stacks', stack), targetDir, ctx, activeSet, map);
  }
  writeTree(join(root, 'gates'), targetDir, ctx, activeSet, map);
  if (config.repoRole === 'central-docs') {
    writeTree(join(root, 'central-docs'), targetDir, ctx, activeSet, map);
  }
  for (const runtime of config.runtimes || []) {
    writeTree(join(root, 'runtime-adapters', runtime), targetDir, ctx, activeSet, map);
  }
}
