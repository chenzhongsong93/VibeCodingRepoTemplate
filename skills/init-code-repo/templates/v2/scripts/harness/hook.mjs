#!/usr/bin/env node
import {readFileSync} from 'node:fs';import {spawnSync} from 'node:child_process';
import {loadProject} from './model.mjs';
try{
 const cmd=process.argv[2],p=loadProject(process.env.HARNESS_HOOK_ROOT||process.cwd()),gate=p.assemblyConfig.commitGate;
 const accepts=message=>gate.mode==='none'||new RegExp(gate.mode==='custom'?gate.regex:'^(feat|fix|docs|style|refactor|perf|test|chore)\\([^)]+\\): .+\\s#[0-9]+$').test(message.split('\n')[0]);
 if(cmd==='commit-msg'){
  if(!process.argv[3])throw new Error('缺commit-msg文件');
  if(!accepts(readFileSync(process.argv[3],'utf8')))throw new Error('提交信息不符本项目约定');
 }else if(cmd==='doc-sync')console.log('提醒（非阻断）：按变更影响回刷正式基线与验收资产；本提醒不算完成验证。');
 else if(cmd==='secret-check'){
  const r=spawnSync('gitleaks',['protect','--staged','--redact'],{encoding:'utf8',timeout:30000});
  if(r.error?.code==='ENOENT')console.log('skipped: 可选本地gitleaks未安装；未执行密钥扫描');
  else if(r.error)throw new Error(r.error.message);
  else {process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');process.exitCode=r.status===0?0:1;}
 }else if(cmd==='pre-receive'){
  for(const line of readFileSync(0,'utf8').trim().split('\n').filter(Boolean)){
   const [oldrev,newrev]=line.split(/\s+/);if(!/^[a-f0-9]{40,64}$/.test(oldrev)||!/^[a-f0-9]{40,64}$/.test(newrev))throw new Error('非法ref输入');
   if(/^0+$/.test(newrev))continue;
   const args=['rev-list',/^0+$/.test(oldrev)?newrev:`${oldrev}..${newrev}`,'--not','--all'];
   const commits=spawnSync('git',args,{encoding:'utf8'});if(commits.status!==0)throw new Error(commits.stderr);
   for(const rev of commits.stdout.trim().split('\n').filter(Boolean)){const r=spawnSync('git',['show','-s','--format=%s',rev],{encoding:'utf8'});if(r.status!==0||!accepts(r.stdout))throw new Error(`commit ${rev}不符政策`);}
  }
 }else throw new Error('未知hook命令');
}catch(e){console.error(e.message);process.exitCode=2;}
