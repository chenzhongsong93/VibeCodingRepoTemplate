import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, rmSync, readdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { inside, sha256 } from './model.mjs';
import { STORE, PAYLOADS, QUARANTINE, policy, assetPath, readStore, saveStore, withStore, tree, tracked, lookup, timestamp, instant, writeJson } from './assets-store.mjs';

const day = 86400000;
const label = (s, name) => { if (typeof s !== 'string' || !s.trim() || s.length > 500 || s.includes('\0')) throw new Error(`缺少/非法${name}`); return s.trim(); };
const live = a => { if (a.state === 'deleted') throw new Error('资产已删除'); return a; };
function exportTarget(root, path) {
  label(path, '承接包路径');
  const canonical = relative(resolve(root), inside(root, path)).replaceAll('\\', '/');
  if (!canonical || /^(?:\.git|\.harness)(?:\/|$)/.test(canonical)) throw new Error('承接包不能位于Git/本地管理区');
  return canonical;
}

function allocate(root, state, { kind = 'work', work, producer = 'agent', rebuild } = {}) {
  if (!['work', 'run', 'cache', 'evidence'].includes(kind)) throw new Error('资产类别须为work/run/cache/evidence');
  if (kind === 'cache') label(rebuild, '缓存重建说明');
  const id = randomUUID(), path = assetPath(id);
  const a = { id, path, kind, work: label(work, '工作标识'), producer: label(producer, '生产者'), state: 'active', createdAt: timestamp(), closedAt: null, references: [], pins: kind === 'evidence' ? ['evidence'] : [], leases: {}, exports: [], rebuild: rebuild || null };
  mkdirSync(inside(root, PAYLOADS), { recursive: true }); mkdirSync(inside(root, path));
  state.assets[id] = a;
  return a;
}
export function createAsset(root, options) {
  return withStore(root, state => { const a = allocate(root, state, options); saveStore(root, state); return a; });
}
export function inventory(root) { return inspect(root, readStore(root), policy(root)); }
function inspect(root, state, rules, now = Date.now()) {
  const protectedIds = new Set(), reasons = new Map(), payloads = {};
  for (const a of Object.values(state.assets)) {
    const why = [];
    if (['active', 'blocked'].includes(a.state)) why.push(a.state);
    if (a.pins.length) why.push('保留锁');
    if (Object.keys(a.leases).length) why.push('活动租约');
    if (a.kind === 'run' && a.state === 'closed' && now - instant(a.closedAt) < rules.runDays * day) why.push('运行记录保留期');
    if (instant(a.createdAt) > now || (a.closedAt && instant(a.closedAt) > now) || (a.quarantinedAt && instant(a.quarantinedAt) > now)) why.push('时间异常');
    if (a.kind === 'cache' && !a.rebuild) why.push('缓存不可重建');
    if (a.state !== 'deleted') {
      payloads[a.id] = tree(root, a.path);
      if (tracked(root, a.path)) why.push('Git受跟踪');
      if (a.disposition?.kind === 'transferred') {
        try {
          const retained = verifyExport(root, a.disposition.target);
          if (retained.sourceAsset !== a.id || retained.digest !== payloads[a.id].digest || retained.digest !== a.disposition.digest) why.push('承接包与源证据不一致');
        } catch { why.push('承接包不可取得或损坏'); }
      }
    }
    if (why.length) protectedIds.add(a.id);
    reasons.set(a.id, why);
  }
  const queue = [...protectedIds];
  while (queue.length) {
    const a = state.assets[queue.shift()];
    for (const id of a.references) {
      if (state.assets[id].state === 'deleted') throw new Error('保护资产引用已删除对象，证据不可取得');
      if (!protectedIds.has(id)) { protectedIds.add(id); queue.push(id); reasons.get(id).push(`被${a.id}引用`); }
    }
  }
  const unmanaged = [];
  for (const parent of [PAYLOADS, QUARANTINE]) if (existsSync(inside(root, parent))) {
    const known = new Set(Object.values(state.assets).filter(a => a.state !== 'deleted').map(a => a.path));
    for (const name of readdirSync(inside(root, parent))) if (!known.has(`${parent}/${name}`)) unmanaged.push(`${parent}/${name}`);
  }
  return { schemaVersion: 1, root: resolve(root), enabled: rules.enabled, assets: Object.values(state.assets).map(a => ({ ...a, bytes: payloads[a.id]?.bytes || 0, digest: payloads[a.id]?.digest || null, protected: protectedIds.has(a.id), reasons: reasons.get(a.id) })), unmanaged, payloads, revision: state.revision, identity: state.identity };
}
function snapshot(state, rules, view) {
  return sha256(JSON.stringify({ state, rules, payloads: view.payloads, tracked: view.assets.filter(a => a.reasons.includes('Git受跟踪')).map(a => a.id) }));
}
function actionsAt(state, rules, view, now) {
  let cacheBytes = view.assets.filter(a => a.kind === 'cache' && a.state === 'closed').reduce((n, a) => n + a.bytes, 0);
  const actions = [];
  const sorted = [...view.assets].sort((a, b) => String(a.closedAt || a.createdAt).localeCompare(String(b.closedAt || b.createdAt)) || a.id.localeCompare(b.id));
  for (const a of sorted) {
    if (a.protected || !['closed', 'quarantined'].includes(a.state)) continue;
    if (!a.closedAt) continue;
    if (a.state === 'quarantined') {
      if (a.quarantinedAt && now - instant(a.quarantinedAt) >= rules.quarantineDays * day) actions.push({ id: a.id, path: a.path, action: 'purge', digest: a.digest });
      continue;
    }
    const days = a.kind === 'run' ? rules.runDays : a.kind === 'cache' ? rules.cacheDays : rules.workDays;
    if (now - instant(a.closedAt) >= days * day || (a.kind === 'cache' && cacheBytes > rules.cacheMaxBytes)) {
      actions.push({ id: a.id, path: a.path, action: 'quarantine', digest: a.digest });
      if (a.kind === 'cache') cacheBytes -= a.bytes;
    }
  }
  return actions;
}
function pending(state) { if (state.operations.some(o => o.status === 'prepared')) throw new Error('资产操作未完成，请先recover；保留现场'); }
export function planAssets(root) {
  const state = readStore(root), rules = policy(root), now = Date.now(); pending(state);
  const view = inspect(root, state, rules, now);
  return { schemaVersion: 1, root: resolve(root), identity: state.identity, createdAt: new Date(now).toISOString(), snapshot: snapshot(state, rules, view), actions: actionsAt(state, rules, view, now), retained: view.assets.filter(a => a.protected).map(a => ({ id: a.id, reasons: a.reasons })), unmanaged: view.unmanaged };
}
function operation(root, state, a, action) {
  const from = a.path, to = action === 'quarantine' ? assetPath(a.id, 'quarantined') : action === 'restore' ? assetPath(a.id) : null;
  if (to && existsSync(inside(root, to))) throw new Error(`恢复/隔离目标已存在，拒绝覆盖: ${to}`);
  const digest = tree(root, from).digest;
  const op = { id: randomUUID(), asset: a.id, action, from, to, digest, status: 'prepared', createdAt: timestamp() };
  state.operations.push(op); saveStore(root, state);
  if (to) { mkdirSync(dirname(inside(root, to)), { recursive: true }); renameSync(inside(root, from), inside(root, to)); }
  else rmSync(inside(root, from), { recursive: true });
  commitOperation(a, op); saveStore(root, state);
  return { id: a.id, action, path: a.path };
}
function commitOperation(a, op) {
  if (op.action === 'quarantine') { a.state = 'quarantined'; a.path = op.to; a.quarantinedAt = timestamp(); }
  else if (op.action === 'restore') { a.state = 'closed'; a.path = op.to; a.closedAt = timestamp(); delete a.quarantinedAt; if (!a.pins.includes('restored')) a.pins.push('restored'); }
  else { a.state = 'deleted'; a.deletedAt = timestamp(); }
  op.status = 'committed'; op.completedAt = timestamp();
}
export function applyAssets(root, plan) {
  return withStore(root, state => {
    const rules = policy(root), now = Date.now(); pending(state);
    if (plan?.schemaVersion !== 1 || plan.root !== resolve(root) || plan.identity !== state.identity || !Array.isArray(plan.actions)) throw new Error('GC计划身份非法');
    const created = instant(plan.createdAt);
    if (created > now || now - created > rules.planHours * 3600000) throw new Error('GC计划已过期/时钟异常');
    const view = inspect(root, state, rules, now);
    if (snapshot(state, rules, view) !== plan.snapshot) throw new Error('GC输入/策略/引用已变化，重新plan');
    const expected = actionsAt(state, rules, view, created);
    if (JSON.stringify(expected) !== JSON.stringify(plan.actions)) throw new Error('GC候选被修改');
    const completed = [];
    for (const item of expected) {
      const a = lookup(state, item.id);
      if (tree(root, a.path).digest !== item.digest || tracked(root, a.path)) throw new Error('GC执行前输入变化');
      completed.push(operation(root, state, a, item.action));
    }
    compact(state, rules, now); saveStore(root, state);
    return { executed: true, completed };
  });
}
function compact(state, rules, now) {
  state.operations = state.operations.filter(o => o.status === 'prepared' || !o.completedAt || now - instant(o.completedAt) < rules.auditDays * day);
  const referenced = new Set(Object.values(state.assets).flatMap(a => a.references));
  for (const [id, a] of Object.entries(state.assets)) if (a.state === 'deleted' && !referenced.has(id) && now - instant(a.deletedAt) >= rules.auditDays * day && !state.operations.some(o => o.asset === id)) delete state.assets[id];
}
export function restoreAsset(root, id) {
  return withStore(root, state => { pending(state); const a = live(lookup(state, id)); if (a.state !== 'quarantined') throw new Error('仅隔离对象可恢复'); return operation(root, state, a, 'restore'); });
}
export function mutateAsset(root, action, opts) {
  return withStore(root, state => {
    pending(state); const a = live(lookup(state, opts.id || opts.from));
    if (['reference', 'lease', 'resume', 'block'].includes(action) && a.state === 'quarantined') operation(root, state, a, 'restore');
    let result;
    if (action === 'pin' || action === 'unpin') {
      const name = label(opts.name, '保留锁名称');
      a.pins = action === 'pin' ? [...new Set([...a.pins, name])] : a.pins.filter(x => x !== name);
    } else if (action === 'reference' || action === 'unreference') {
      const target = live(lookup(state, opts.to));
      if (action === 'reference' && target.state === 'quarantined') operation(root, state, target, 'restore');
      a.references = action === 'reference' ? [...new Set([...a.references, target.id])] : a.references.filter(x => x !== target.id);
    } else if (action === 'lease') {
      const token = randomUUID(); a.leases[token] = { reason: label(opts.reason, '租约用途'), host: hostname(), createdAt: timestamp() }; result = { token, id: a.id, path: a.path };
    } else if (action === 'release') {
      if (!Object.hasOwn(a.leases, opts.token || '')) throw new Error('租约token不匹配'); delete a.leases[opts.token];
    } else if (action === 'block') { a.state = 'blocked'; a.blockedReason = label(opts.reason, '阻断原因'); }
    else if (action === 'resume') { a.state = 'active'; delete a.blockedReason; a.closedAt = null; }
    else if (action === 'close') {
      if (a.state !== 'active' && a.state !== 'closed') throw new Error('先处理阻断/恢复状态，才能关闭');
      if (Object.keys(a.leases).length) throw new Error('资产仍有生产者租约');
      if (!['discarded', 'transferred', 'retained'].includes(opts.disposition)) throw new Error('需明确discarded/transferred/retained处置');
      label(opts.reason, '关闭处置理由');
      if (opts.disposition === 'transferred') {
        opts.target = exportTarget(root, opts.target);
        const v = verifyExport(root, opts.target);
        if (v.sourceAsset !== a.id || v.digest !== tree(root, a.path).digest || !a.exports.some(e => e.path === opts.target && e.digest === v.digest)) throw new Error('承接包过期或未收到本资产的已核验承接包');
        opts.digest = v.digest;
      }
      if (opts.disposition === 'retained' && !a.pins.includes('retained')) a.pins.push('retained');
      a.state = 'closed'; a.closedAt ||= timestamp(); a.disposition = { kind: opts.disposition, reason: opts.reason, target: opts.target || null, digest: opts.digest || null };
    } else throw new Error('未知资产动作');
    saveStore(root, state); return result || a;
  });
}
export function exportAsset(root, id, target) {
  return withStore(root, state => {
    pending(state); const a = live(lookup(state, id)); target = exportTarget(root, target);
    const dest = inside(root, target);
    if (target.startsWith('.git/') || target === '.git' || target.startsWith('.harness/') || existsSync(dest)) throw new Error('承接包须为不存在的仓内独立路径，不能位于Git/本地管理区');
    const original = tree(root, a.path);
    mkdirSync(inside(root, `${target}/files`), { recursive: true });
    for (const dir of original.directories.filter(Boolean)) mkdirSync(inside(root, `${target}/files${dir}`), { recursive: true });
    for (const file of original.files) copyFileSync(inside(root, `${a.path}/${file.path}`), inside(root, `${target}/files/${file.path}`));
    const copy = tree(root, `${target}/files`);
    if (copy.digest !== original.digest || tree(root, a.path).digest !== original.digest) throw new Error('证据复制期间输入变化；保留源，承接未完成');
    writeJson(root, `${target}/manifest.json`, { schemaVersion: 1, sourceAsset: id, producer: a.producer, work: a.work, createdAt: timestamp(), digest: copy.digest, files: copy.files, availability: 'local-export; 传递/远端保留需实际核验' });
    a.exports.push({ path: target, digest: copy.digest, createdAt: timestamp(), availability: 'local-copy' }); saveStore(root, state);
    return verifyExport(root, target);
  });
}
export function verifyExport(root, path) {
  path = exportTarget(root, path); const manifest = JSON.parse(readFileSync(inside(root, `${path}/manifest.json`), 'utf8'));
  const payload = tree(root, `${path}/files`);
  if (manifest.schemaVersion !== 1 || manifest.digest !== payload.digest || JSON.stringify(manifest.files) !== JSON.stringify(payload.files)) throw new Error('承接包内容不完整或已改变');
  return { verified: true, path, sourceAsset: manifest.sourceAsset, digest: payload.digest, availability: 'local-copy' };
}
export function recoverAssets(root) {
  return withStore(root, state => {
    const results = [];
    for (const op of state.operations.filter(o => o.status === 'prepared')) {
      const a = lookup(state, op.asset);
      const source = assetPath(a.id, op.action === 'quarantine' ? 'closed' : 'quarantined');
      const target = op.action === 'quarantine' ? assetPath(a.id, 'quarantined') : op.action === 'restore' ? assetPath(a.id) : null;
      if (!['quarantine', 'restore', 'purge'].includes(op.action) || op.from !== source || op.to !== target) throw new Error('恢复操作记录非法，保留现场');
      const from = existsSync(inside(root, source)), to = target && existsSync(inside(root, target));
      if (from && !to) { op.status = 'aborted'; op.completedAt = timestamp(); }
      else if (!from && ((to && tree(root, target).digest === op.digest) || !target)) commitOperation(a, op);
      else throw new Error('恢复状态不确定，保留源/目标并人工核对');
      results.push({ operation: op.id, status: op.status }); saveStore(root, state);
    }
    return { recovered: results };
  });
}
export function runDue(root) {
  const rules = policy(root);
  if (!rules.enabled) return { executed: false, reason: '资产自动维护尚未启用', configured: false };
  const result = applyAssets(root, planAssets(root));
  writeJson(root, `${STORE}/maintenance.json`, { ...result, root: resolve(root), lastRun: timestamp(), trigger: 'actual invocation; 不代表OS定时器已安装' });
  return result;
}
function inputAssets(root, state, inputs) {
  const paths = inputs.map(input => relative(resolve(root), inside(root, input.path)).replaceAll('\\', '/'));
  return Object.values(state.assets).filter(a => a.state !== 'deleted' && paths.some(path => path === a.path || path.startsWith(a.path + '/'))).map(a => a.id).sort();
}
// Resolve and freeze inputs under the same cooperative lock that GC uses.
// Leases persist across process death; neither age nor recover auto-releases them.
export function leaseRunInputs(root, collect) {
  return withStore(root, state => {
    pending(state);
    const inputs = collect(), assetIds = inputAssets(root, state, inputs), token = randomUUID();
    for (const id of assetIds) state.assets[id].leases[token] = { reason: 'harness.runner消费实际输入；报告持久化前不得回收', host: hostname(), pid: process.pid, createdAt: timestamp() };
    if (assetIds.length) saveStore(root, state);
    return { inputs, assetIds, token };
  });
}
function releaseInputs(state, protection) {
  for (const id of protection?.assetIds || []) {
    const a = live(lookup(state, id));
    if (!Object.hasOwn(a.leases, protection.token)) throw new Error('运行输入租约缺失；保留现场核对');
    delete a.leases[protection.token];
  }
}
export function releaseRunInputs(root, protection) {
  if (!protection?.assetIds.length) return;
  return withStore(root, state => { pending(state); releaseInputs(state, protection); saveStore(root, state); });
}
export function storeRunReport(root, report, protection) {
  return withStore(root, state => {
    pending(state);
    for (const id of protection?.assetIds || []) if (!Object.hasOwn(live(lookup(state, id)).leases, protection.token)) throw new Error('运行输入租约缺失；不能发布失保凭据');
    const a = allocate(root, state, { kind: 'run', work: report.taskId || 'standalone-validation', producer: 'harness.runner' });
    a.references = protection?.assetIds || [];
    report.assetId = a.id; report.evidencePath = `${a.path}/report.json`;
    if (protection) report.inputProtection = { assetIds: protection.assetIds, state: 'run-references' };
    writeJson(root, report.evidencePath, report);
    if (report.taskId) a.pins.push(`task:${report.taskId}:active`);
    else if (report.exitCode !== 0) a.pins.push('failure-needs-triage');
    a.state = 'closed'; a.closedAt = timestamp(); a.disposition = { kind: 'retained', reason: '运行记录按保留策略维护；失败与任务证据保持保护' };
    releaseInputs(state, protection);
    saveStore(root, state); return a;
  });
}
export function finishTaskAssets(root, taskId, evidencePath, { releaseOthers = true } = {}) {
  evidencePath = relative(resolve(root), inside(root, evidencePath)).replaceAll('\\', '/');
  return withStore(root, state => {
    pending(state);
    let retained = null;
    for (const a of Object.values(state.assets).filter(a => a.work === taskId && a.kind === 'run' && a.state !== 'deleted')) {
      if (releaseOthers) a.pins = a.pins.filter(p => p !== `task:${taskId}:active`);
      if (`${a.path}/report.json` === evidencePath) { a.pins = [...new Set([...a.pins, `task:${taskId}:completion`])]; retained = a.id; }
    }
    if (!retained && evidencePath.startsWith(`${PAYLOADS}/`)) throw new Error('完成凭据资产未登记');
    saveStore(root, state); return { retained, availability: 'local-only; export后仍须核对实际共享' };
  });
}
