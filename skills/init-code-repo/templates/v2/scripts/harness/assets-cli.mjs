#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { inside } from './model.mjs';
import { recoverLock, policy, readStore, STORE } from './assets-store.mjs';
import { createAsset, inventory, planAssets, applyAssets, restoreAsset, mutateAsset, exportAsset, verifyExport, recoverAssets, runDue } from './assets.mjs';

try {
  const root = process.cwd(), args = process.argv.slice(2), command = args.shift(), opts = {};
  const allowed = { workspace: ['work', 'kind', 'producer', 'rebuild'], inventory: [], plan: [], apply: ['plan'], restore: ['id'], close: ['id', 'disposition', 'reason', 'target'], block: ['id', 'reason'], resume: ['id'], pin: ['id', 'name'], unpin: ['id', 'name'], reference: ['from', 'to'], unreference: ['from', 'to'], lease: ['id', 'reason'], release: ['id', 'token'], export: ['id', 'to'], 'verify-export': ['path'], recover: [], 'recover-lock': [], 'run-due': [], status: [] };
  if (!Object.hasOwn(allowed, command)) throw new Error(`用法: assets-cli.mjs <${Object.keys(allowed).join('|')}> [--key value]`);
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].slice(2);
    if (!args[i].startsWith('--') || !allowed[command].includes(key) || args[i + 1] === undefined || Object.hasOwn(opts, key)) throw new Error('未知/重复/缺值参数');
    opts[key] = args[i + 1];
  }
  let result;
  if (command === 'workspace') result = createAsset(root, opts);
  else if (command === 'inventory') { result = inventory(root); delete result.payloads; }
  else if (command === 'plan') result = planAssets(root);
  else if (command === 'apply') result = applyAssets(root, JSON.parse(readFileSync(inside(root, opts.plan), 'utf8')));
  else if (command === 'restore') result = restoreAsset(root, opts.id);
  else if (command === 'export') result = exportAsset(root, opts.id, opts.to);
  else if (command === 'verify-export') result = verifyExport(root, opts.path);
  else if (command === 'recover') result = recoverAssets(root);
  else if (command === 'recover-lock') result = recoverLock(root);
  else if (command === 'run-due') result = runDue(root);
  else if (command === 'status') {
    let lastRun = null;
    try { lastRun = JSON.parse(readFileSync(inside(root, `${STORE}/maintenance.json`), 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    result = { policy: policy(root), identity: readStore(root).identity, lastRun, scheduler: '未从配置推断调度器已安装；请核对实际调度记录' };
  } else result = mutateAsset(root, command, opts);
  console.log(JSON.stringify(result, null, 2));
} catch (e) { console.log(JSON.stringify({ status: 'blocked', error: e.message })); process.exitCode = 2; }
