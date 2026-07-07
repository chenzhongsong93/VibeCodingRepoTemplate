// naming.mjs — 文件名映射（en/zh/custom）。工具契约文件不在映射内（恒英文）。
// 映射 key = 英文相对路径（repo-root-relative），value = 中文文件名（仅 basename，目录留英文）。

const ZH = {
  'docs/ROADMAP.md': '路线图.md',
  'docs/HANDOVER.md': '交接.md',
  'ERROR_LOG.md': '错误日志.md',
  'REVIEW.md': '复盘.md',
  'docs/00-charter/README.md': '章程.md',
  'docs/00-charter/concept.md': '概念.md',
  'docs/00-charter/vision-strategy.md': '愿景战略.md',
  'docs/00-charter/guardrails.md': '护栏.md',
  'docs/01-product/README.md': '产品定义.md',
  'docs/02-design/system-architecture.md': '系统架构.md',
  'docs/02-design/doc-governance.md': '文档治理.md',
  'docs/02-design/entity-model.md': '实体模型.md',
  'docs/02-design/north-star.md': '北极星.md',
  'docs/02-design/api/api-reference.md': '接口文档.md',
  'docs/02-design/test-spec/README.md': '测试设计.md',
  'docs/02-design/ui-design/README.md': 'UI设计.md',
  'docs/02-design/views/README.md': '视觉资产.md',
  'docs/ledger/bugs.md': 'bug台账.md',
  'docs/ledger/debt.md': '债务台账.md',
  'docs/ledger/version-log.md': '版本记录.md',
  'docs/rules/commit-rules.md': '提交规范.md',
  'docs/rules/dev-workflow-rules.md': '研发流程规则.md',
  'docs/rules/doc-ssot-rules.md': 'SSOT治理.md',
  'docs/rules/design-completeness-rules.md': '设计完整性门控.md',
  'docs/rules/agent-conduct-rules.md': 'Agent行为军规.md',
  'docs/rules/clean-code-rules.md': '代码规范.md',
  'docs/rules/testing-rules.md': '测试规则.md',
};

export function buildMap(naming = 'en', namingCustom = {}) {
  let base = {};
  if (naming === 'zh') base = { ...ZH };
  return { ...base, ...namingCustom };
}

// Map an English repo-root-relative path to its output path (replace basename if in map).
export function mapPath(rel, map) {
  const mappedBasename = map[rel];
  if (!mappedBasename) return rel;
  const slashIdx = rel.lastIndexOf('/');
  const dir = slashIdx >= 0 ? rel.slice(0, slashIdx) : '';
  return dir ? `${dir}/${mappedBasename}` : mappedBasename;
}

// Resolve a target (possibly relative with . / .. or basename or repo-root-relative)
// against currentDir to a repo-root-relative path.
function resolveRel(currentDir, target) {
  if (target.startsWith('.')) {
    const parts = (currentDir || '').split('/').filter(Boolean);
    for (const seg of target.split('/')) {
      if (seg === '.' || seg === '') continue;
      else if (seg === '..') parts.pop();
      else parts.push(seg);
    }
    return parts.join('/');
  }
  // no leading . : if has '/', treat as repo-root-relative; else basename in currentDir
  if (target.includes('/')) return target;
  return currentDir ? `${currentDir}/${target}` : target;
}

// Re-relativize a repo-root-relative path back to be relative from currentDir.
function relativize(currentDir, fullPath) {
  if (!currentDir) return fullPath;
  const cur = currentDir.split('/').filter(Boolean);
  const full = fullPath.split('/').filter(Boolean);
  let i = 0;
  while (i < cur.length && i < full.length && cur[i] === full[i]) i++;
  const up = cur.length - i;
  const down = full.slice(i);
  return '../'.repeat(up) + down.join('/');
}

// Substitute {{FILE:path}} → mapped path, relativized from currentDir (for markdown links).
export function substituteFiles(text, map, currentDir) {
  return text.replace(/\{\{FILE:([^}]+)\}\}/g, (m, p) => {
    const resolved = resolveRel(currentDir, p.trim());
    const mapped = mapPath(resolved, map);
    return relativize(currentDir, mapped);
  });
}

// Substitute {{FPATH:path}} → mapped path, repo-root-relative, NOT relativized (for script MAPPING / inline code).
export function substituteFilePaths(text, map) {
  return text.replace(/\{\{FPATH:([^}]+)\}\}/g, (m, p) => mapPath(p.trim(), map));
}
