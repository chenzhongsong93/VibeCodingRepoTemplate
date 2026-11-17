#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { inside, loadProject } from './model.mjs';

function workflow(provider) {
  if (provider === 'github') return {
    path: '.github/workflows/harness.yml',
    content: `name: Repository verification
on:
  push:
  pull_request:
  workflow_dispatch:
permissions:
  contents: read
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Prepare project dependencies and tools
        run: node scripts/harness/ci.mjs prepare
      - name: Verify actual repository checks
        run: node scripts/harness/check.mjs --profile ci
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: harness-evidence
          path: .harness/local/assets/
          include-hidden-files: true
          retention-days: 30
          if-no-files-found: ignore
`
  };
  if (provider === 'gitlab') return {
    path: '.gitlab-ci.yml',
    content: `image: node:22
stages:
  - verify
harness-verification:
  stage: verify
  script:
    - node scripts/harness/ci.mjs prepare
    - node scripts/harness/check.mjs --profile ci
  artifacts:
    when: always
    paths:
      - .harness/local/assets/
    expire_in: 30 days
`
  };
  throw new Error('provider须为github或gitlab；其他平台可调用同一check入口，尚无专用配置生成器');
}
function prepare(root, p) {
  const steps = p.ci?.bootstrap;
  if (!steps && p.stacks.length) throw new Error('需在.harness/project.json的ci.bootstrap明确工具/依赖准备argv与cwd；不假称通用runner已有业务环境');
  if (steps !== undefined && !Array.isArray(steps)) throw new Error('ci.bootstrap须为数组');
  for (const step of steps || []) {
    if (!step || !Array.isArray(step.argv) || !step.argv.length || step.argv.some(s => typeof s !== 'string' || !s || s.includes('\0')) || /^(?:bash|sh|zsh|cmd|powershell|pwsh)(?:\.exe)?$/i.test(step.argv[0])) throw new Error('bootstrap需直接argv调用，不能求值shell字符串');
    inside(root, step.cwd || '.');
    if (step.timeoutSeconds !== undefined && (!Number.isFinite(step.timeoutSeconds) || step.timeoutSeconds <= 0 || step.timeoutSeconds > 3600)) throw new Error('bootstrap timeoutSeconds须为1..3600');
  }
  const results = [];
  for (const step of steps || []) {
    const r = spawnSync(step.argv[0], step.argv.slice(1), { cwd: inside(root, step.cwd || '.'), shell: false, encoding: 'utf8', timeout: (step.timeoutSeconds || 600) * 1000, maxBuffer: 2 * 1024 * 1024 });
    results.push({ argv: step.argv, cwd: step.cwd || '.', exitCode: r.status, stdout: r.stdout, stderr: r.stderr, error: r.error?.message, signal: r.signal });
    if (r.error || r.status !== 0) return { status: 'blocked', results };
  }
  return { status: 'pass', results, scope: '已声明准备命令；后续check负责实际验证' };
}
try {
  const root = process.cwd(), p = loadProject(root), args = process.argv.slice(2), command = args.shift();
  let result;
  if (command === 'prepare' && args.length === 0) {
    result = prepare(root, p); if (result.status !== 'pass') process.exitCode = 2;
  } else if (command === 'render' && args.length === 2 && args[0] === '--provider') {
    const generated = workflow(args[1]), path = inside(root, generated.path);
    if (existsSync(path) && readFileSync(path, 'utf8') !== generated.content) throw new Error('已有CI配置不同，拒绝覆盖；在原pipeline显式接入同一prepare/check命令');
    if (!existsSync(path)) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, generated.content, { flag: 'wx' }); }
    result = { provider: args[1], path: generated.path, remoteExecuted: false, notice: '已生成实际workflow；未提交/推送/触发远端CI。保留期30天不等于长期发布证据。' };
  } else throw new Error('用法: ci.mjs render --provider github|gitlab 或 ci.mjs prepare');
  console.log(JSON.stringify(result, null, 2));
} catch (e) { console.log(JSON.stringify({ status: 'blocked', error: e.message })); process.exitCode = 2; }
