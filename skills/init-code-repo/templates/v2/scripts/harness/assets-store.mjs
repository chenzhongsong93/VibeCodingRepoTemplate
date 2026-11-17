import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, rmSync, readdirSync, lstatSync, openSync, readSync, closeSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { hostname } from 'node:os';
import { spawnSync } from 'node:child_process';
import { inside, sha256 } from './model.mjs';

export const STORE = '.harness/local/asset-state';
export const PAYLOADS = '.harness/local/assets';
export const QUARANTINE = '.harness/local/quarantine';
export const DEFAULT_POLICY = Object.freeze({ schemaVersion: 1, enabled: false, workDays: 7, runDays: 30, cacheDays: 14, quarantineDays: 7, planHours: 24, auditDays: 90, cacheMaxBytes: 1073741824 });
export const timestamp = () => new Date().toISOString();
export function instant(value) {
  const n = Date.parse(value);
  if (!Number.isFinite(n)) throw new Error('资产时间无效');
  return n;
}
export function policy(root) {
  const p = inside(root, '.harness/assets.json');
  const supplied = existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {};
  if (Object.keys(supplied).some(k => !Object.hasOwn(DEFAULT_POLICY, k))) throw new Error('未知资产保留策略字段');
  const value = { ...DEFAULT_POLICY, ...supplied };
  if (value.schemaVersion !== 1 || typeof value.enabled !== 'boolean') throw new Error('资产策略版本/启用状态无效');
  for (const k of Object.keys(DEFAULT_POLICY).filter(k => !['schemaVersion', 'enabled'].includes(k))) {
    if (!Number.isFinite(value[k]) || value[k] < 0 || (k !== 'cacheMaxBytes' && value[k] > 36500)) throw new Error(`资产策略非法: ${k}`);
  }
  return value;
}
export function assetPath(id, state = 'active') {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id)) throw new Error('非法资产标识');
  return `${state === 'quarantined' || state === 'deleted' ? QUARANTINE : PAYLOADS}/${id}`;
}
export function readStore(root) {
  const path = inside(root, `${STORE}/registry.json`);
  const state = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { schemaVersion: 1, root: resolve(root), identity: null, revision: 0, assets: {}, operations: [] };
  if (state.schemaVersion !== 1 || state.root !== resolve(root) || !Number.isInteger(state.revision) || state.revision < 0 || !state.assets || Array.isArray(state.assets) || !Array.isArray(state.operations)) throw new Error('资产登记损坏或仓根改变；停止回收，先恢复/重新认领');
  for (const [id, a] of Object.entries(state.assets)) {
    if (a.id !== id || a.path !== assetPath(id, a.state) || !['active', 'blocked', 'closed', 'quarantined', 'deleted'].includes(a.state) || !['work', 'run', 'cache', 'evidence'].includes(a.kind)) throw new Error('资产身份/受管路径/状态无效');
    if (!Array.isArray(a.references) || !Array.isArray(a.pins) || !a.leases || typeof a.leases !== 'object' || !Array.isArray(a.exports)) throw new Error('资产保护记录无效');
    instant(a.createdAt);
    for (const field of ['closedAt', 'quarantinedAt', 'deletedAt']) if (a[field]) instant(a[field]);
    if (['closed', 'quarantined', 'deleted'].includes(a.state)) instant(a.closedAt);
    if (['quarantined', 'deleted'].includes(a.state)) instant(a.quarantinedAt);
    if (a.state === 'deleted') instant(a.deletedAt);
    if (a.pins.some(p => typeof p !== 'string' || !p) || Array.isArray(a.leases)) throw new Error('资产保护记录损坏');
    for (const lease of Object.values(a.leases)) { if (!lease || !lease.reason || !lease.host) throw new Error('资产租约损坏'); instant(lease.createdAt); }
    for (const e of a.exports) {
      if (!e || typeof e.path !== 'string' || !/^[a-f0-9]{64}$/.test(e.digest)) throw new Error('资产承接记录损坏');
      const canonical = relative(resolve(root), inside(root, e.path)).replaceAll('\\', '/');
      if (canonical !== e.path || /^(?:\.git|\.harness)(?:\/|$)/.test(canonical)) throw new Error('资产承接路径非法');
      instant(e.createdAt);
    }
    for (const target of a.references) if (!Object.hasOwn(state.assets, target)) throw new Error(`资产引用缺失: ${target}`);
    inside(root, a.path);
  }
  for (const op of state.operations) {
    if (!op || !Object.hasOwn(state.assets, op.asset) || !['quarantine', 'restore', 'purge'].includes(op.action) || !['prepared', 'committed', 'aborted'].includes(op.status) || !/^[a-f0-9]{64}$/.test(op.digest)) throw new Error('资产操作日志损坏，停止回收');
    const from = assetPath(op.asset, op.action === 'quarantine' ? 'closed' : 'quarantined');
    const to = op.action === 'quarantine' ? assetPath(op.asset, 'quarantined') : op.action === 'restore' ? assetPath(op.asset) : null;
    if (op.from !== from || op.to !== to) throw new Error('资产操作日志路径损坏');
    instant(op.createdAt);
    if (op.status !== 'prepared') instant(op.completedAt);
  }
  return state;
}
export function writeJson(root, path, value) {
  const target = inside(root, path);
  mkdirSync(dirname(target), { recursive: true });
  const temp = `${path}.${randomUUID()}.tmp`;
  try {
    writeFileSync(inside(root, temp), JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    inside(root, path);
    renameSync(inside(root, temp), target);
  } finally { if (existsSync(inside(root, temp))) rmSync(inside(root, temp)); }
}
export function saveStore(root, state) {
  state.identity ||= randomUUID();
  state.revision++;
  writeJson(root, `${STORE}/registry.json`, state);
}
export function withStore(root, action) {
  const base = inside(root, STORE), lock = inside(root, `${STORE}/lock`);
  mkdirSync(base, { recursive: true });
  try { mkdirSync(lock); } catch (e) { if (e.code === 'EEXIST') throw new Error('资产维护锁已占用；不能并发修改，失联锁请使用recover-lock核对'); throw e; }
  const token = randomUUID();
  try {
    writeFileSync(inside(root, `${STORE}/lock/owner.json`), JSON.stringify({ token, pid: process.pid, host: hostname(), root: resolve(root), createdAt: timestamp() }), { flag: 'wx' });
    return action(readStore(root));
  } finally {
    const ownerPath = inside(root, `${STORE}/lock/owner.json`);
    if (existsSync(ownerPath) && JSON.parse(readFileSync(ownerPath, 'utf8')).token === token) rmSync(lock, { recursive: true });
  }
}
export function recoverLock(root) {
  const path = inside(root, `${STORE}/lock/owner.json`);
  if (!existsSync(path)) throw new Error('锁归属未知，保留现场；需核对后人工恢复');
  const owner = JSON.parse(readFileSync(path, 'utf8'));
  if (owner.host !== hostname() || owner.root !== resolve(root) || !Number.isInteger(owner.pid) || owner.pid <= 0) throw new Error('不能确认锁生产者身份');
  try { process.kill(owner.pid, 0); throw new Error('锁生产者仍存活，拒绝解除'); }
  catch (e) { if (e.code !== 'ESRCH') throw e; }
  if (JSON.parse(readFileSync(path, 'utf8')).token !== owner.token) throw new Error('锁已改变');
  rmSync(inside(root, `${STORE}/lock`), { recursive: true });
  return { recovered: true, previousOwner: owner };
}
export function tree(root, path) {
  const files = [], directories = [];
  let bytes = 0;
  function visit(relative, depth = 0) {
    if (depth > 100 || files.length + directories.length > 100000) throw new Error('资产树超过安全扫描上限，需拆分资产束');
    const full = inside(root, relative), stat = lstatSync(full);
    if (stat.isSymbolicLink()) throw new Error('资产不允许symlink');
    if (stat.isDirectory()) {
      directories.push(relative.slice(path.length));
      for (const name of readdirSync(full).sort()) visit(`${relative}/${name}`, depth + 1);
    } else if (stat.isFile() && stat.nlink === 1) {
      const hash = createHash('sha256'), fd = openSync(full, 'r'), buffer = Buffer.alloc(65536);
      try { let n; while ((n = readSync(fd, buffer, 0, buffer.length, null)) > 0) hash.update(buffer.subarray(0, n)); } finally { closeSync(fd); }
      const after = lstatSync(full);
      if (after.size !== stat.size || after.mtimeMs !== stat.mtimeMs || after.ino !== stat.ino) throw new Error('资产扫描期间发生变化');
      files.push({ path: relative.slice(path.length + 1), size: stat.size, sha256: hash.digest('hex') }); bytes += stat.size;
    } else throw new Error('资产含特殊文件或共享硬链接，拒绝回收');
  }
  visit(path);
  return { files, directories, bytes, digest: sha256(JSON.stringify({ files, directories })) };
}
export function tracked(root, path) {
  const top = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8' });
  if (top.status !== 0) {
    if (existsSync(inside(root, '.git'))) throw new Error('Git状态不可读，拒绝判定资产可回收');
    return false;
  }
  if (resolve(top.stdout.trim()) !== resolve(root)) throw new Error('资产根不是独立仓根，不能判定Git跟踪范围');
  const r = spawnSync('git', ['ls-files', '-z', '--', path], { cwd: root, encoding: 'utf8' });
  if (r.status !== 0) throw new Error('Git跟踪列表不可读');
  return Boolean(r.stdout);
}
export function lookup(state, id) {
  assetPath(id);
  if (!Object.hasOwn(state.assets, id)) throw new Error(`未登记资产: ${id}`);
  return state.assets[id];
}
