#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';
import { inside, loadProject } from './model.mjs';
import { withStore, saveStore, readStore, policy, STORE, timestamp, writeJson } from './assets-store.mjs';
import { runDue } from './assets.mjs';

const xml = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const unitArg = s => '"' + s.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('%', '%%').replaceAll('$', () => '$$') + '"';
const winArg = s => '"' + s.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/g, '$1$1') + '"';
function render(root, platform) {
  if (!['systemd', 'launchd', 'windows'].includes(platform)) throw new Error('platform须为systemd/launchd/windows');
  const identity = withStore(root, state => { saveStore(root, state); return state.identity; });
  const executable = process.execPath, script = inside(root, 'scripts/harness/maintenance.mjs');
  const args = [script, 'run', '--root', root, '--identity', identity, '--iterations', '1'];
  const prefix = `.harness/local/schedules/${platform}`, files = {};
  const unitName = `harness-maintenance-${identity}`;
  if (platform === 'systemd') {
    if (/[\r\n\\]/.test(root) || root.trim() !== root) throw new Error('该仓路径暂不支持systemd配置编码；使用明确argv的前台维护入口');
    files[`${unitName}.service`] = `[Unit]\nDescription=Managed repository asset maintenance\n[Service]\nType=oneshot\nWorkingDirectory=${root.replaceAll('%', '%%')}\nExecStart=${[executable, ...args].map(unitArg).join(' ')}\n`;
    files[`${unitName}.timer`] = `[Unit]\nDescription=Daily managed repository maintenance\n[Timer]\nOnCalendar=daily\nPersistent=true\nUnit=${unitName}.service\n[Install]\nWantedBy=timers.target\n`;
  } else if (platform === 'launchd') {
    files[`local.harness.${identity}.plist`] = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict><key>Label</key><string>local.harness.${identity}</string><key>ProgramArguments</key><array>${[executable, ...args].map(s => `<string>${xml(s)}</string>`).join('')}</array><key>WorkingDirectory</key><string>${xml(root)}</string><key>StartInterval</key><integer>86400</integer></dict></plist>\n`;
  } else {
    files[`${unitName}.xml`] = `<?xml version="1.0" encoding="UTF-8"?>\n<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task"><RegistrationInfo><Description>Managed repository maintenance ${identity}</Description></RegistrationInfo><Triggers><CalendarTrigger><StartBoundary>2026-01-01T03:00:00</StartBoundary><Enabled>true</Enabled><ScheduleByDay><DaysInterval>1</DaysInterval></ScheduleByDay></CalendarTrigger></Triggers><Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><StartWhenAvailable>true</StartWhenAvailable><Enabled>true</Enabled></Settings><Actions Context=""><Exec><Command>${xml(executable)}</Command><Arguments>${xml(args.map(winArg).join(' '))}</Arguments><WorkingDirectory>${xml(root)}</WorkingDirectory></Exec></Actions></Task>\n`;
  }
  for (const [name, text] of Object.entries(files)) {
    const path = inside(root, `${prefix}/${name}`);
    if (existsSync(path) && readFileSync(path, 'utf8') !== text) throw new Error('已有调度文件有差异；拒绝覆盖，请显式选定新落点/处理旧配置');
  }
  mkdirSync(inside(root, prefix), { recursive: true });
  for (const [name, text] of Object.entries(files)) if (!existsSync(inside(root, `${prefix}/${name}`))) writeFileSync(inside(root, `${prefix}/${name}`), text, { flag: 'wx' });
  return { platform, identity, root, files: Object.keys(files).map(n => `${prefix}/${n}`), installed: false, runtimePlatform: process.platform, notice: '仅生成；在目标OS重生成并显式启用调度器。enabled=false时实际调用也不执行GC。' };
}
try {
  const argv = process.argv.slice(2), command = argv.shift(), opts = {};
  const allowed = { run: ['root', 'identity', 'iterations', 'interval-seconds'], render: ['root', 'platform'], status: ['root'] };
  if (!Object.hasOwn(allowed, command)) throw new Error('用法: maintenance.mjs run|render|status [--key value]');
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].slice(2);
    if (!argv[i].startsWith('--') || !allowed[command].includes(key) || argv[i + 1] === undefined || Object.hasOwn(opts, key)) throw new Error('未知/重复/缺值参数');
    opts[key] = argv[i + 1];
  }
  const root = resolve(opts.root || process.cwd());
  inside(root, '.harness/project.json'); loadProject(root);
  if (command === 'render') console.log(JSON.stringify(render(root, opts.platform), null, 2));
  else if (command === 'status') {
    const file = inside(root, `${STORE}/maintenance.json`);
    console.log(JSON.stringify({ policy: policy(root), root, lastRun: existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null, schedulerInstalled: 'unknown; configuration is not execution' }, null, 2));
  } else {
    const count = Number(opts.iterations ?? 1), seconds = Number(opts['interval-seconds'] ?? 86400);
    if (!Number.isInteger(count) || count < 0 || count > 100000 || !Number.isFinite(seconds) || seconds < 1 || seconds > 86400) throw new Error('iterations须为0(持续运行)或1..100000，interval-seconds须为1..86400');
    for (let i = 0; count === 0 || i < count; i++) {
      if (opts.identity && readStore(root).identity !== opts.identity) throw new Error('调度仓身份变化，拒绝执行');
      const result = { ...runDue(root), actualInvocationAt: timestamp(), root };
      writeJson(root, `${STORE}/last-invocation.json`, result);
      console.log(JSON.stringify(result));
      if (count === 0 || i + 1 < count) await pause(seconds * 1000);
    }
  }
} catch (e) { console.log(JSON.stringify({ status: 'blocked', error: e.message })); process.exitCode = 2; }
