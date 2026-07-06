import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { substitute } from './substitute.mjs';
import { activeConds, stripConditionals } from './conditional.mjs';

function walk(srcDir, out = []) {
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const full = join(srcDir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else {
      out.push(full);
    }
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
  return conds;
}

const REQUIRE_RE = /^<!--require:([\w-]+)-->\n?/;

export function assemble(targetDir, config) {
  const ctx = {
    projectName: config.projectName,
    oneLine: config.oneLine,
    year: String(config.year),
    commitRegex: config.commitGate?.regex || '',
  };
  const conds = [...activeConds(config), ...extraConds(config)];
  const activeSet = new Set(conds);
  const coreDir = join('skills/init-code-repo/templates/core');
  const files = existsSync(coreDir) ? walk(coreDir) : [];
  for (const abs of files) {
    const rel = abs.slice(coreDir.length + 1).replace(/\\/g, '/');
    let content = readFileSync(abs, 'utf8');
    // Per-file conditional inclusion: a first-line <!--require:cond--> marker
    // means the file is only written when cond is active. Core files have no
    // marker and are always included.
    const req = content.match(REQUIRE_RE);
    if (req) {
      if (!activeSet.has(req[1])) continue; // component inactive → skip file
      content = content.slice(req[0].length); // strip marker line
    }
    content = substitute(content, ctx);
    content = stripConditionals(content, conds);
    const outRel = rel.replace(/\.tmpl$/, '');
    const outPath = join(targetDir, outRel);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, content);
  }
}
