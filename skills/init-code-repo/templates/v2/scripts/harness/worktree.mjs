#!/usr/bin/env node
import {existsSync} from 'node:fs';import {resolve} from 'node:path';import {spawnSync} from 'node:child_process';
import {loadProject,readJson} from './model.mjs';
try{
 const root=process.cwd(),p=loadProject(root),args=process.argv.slice(2),cmd=args.shift(),opts={};
 for(let i=0;i<args.length;i+=2){if(!['--branch','--base','--path'].includes(args[i])||!args[i+1])throw new Error('非法参数');opts[args[i].slice(2)]=args[i+1];}
 if(!['preview-create','preview-cleanup','create'].includes(cmd))throw new Error('仅支持preview-create/preview-cleanup/create；不提供默认清理或远端删除');
 if(!opts.branch||!/^[-\w]+(?:\/[-\w]+)+$/.test(opts.branch)||opts.branch.includes('..'))throw new Error('需合法任务分支名');
 let base=p.worktree.defaultBase;
 if(existsSync(resolve(root,'AGENTS.config.json'))){const old=readJson(root,'AGENTS.config.json');if(old.branch?.defaultBase&&old.branch.defaultBase!==base)throw new Error('新旧worktree基线配置冲突，需裁决');}
 if(existsSync(resolve(root,'AGENTS.config.local.json'))){const old=readJson(root,'AGENTS.config.local.json');if(old.worktree?.parent&&old.worktree.parent!==p.worktree.parent)throw new Error('新旧local配置冲突，需显式迁移');}
 const path=opts.path?resolve(opts.path):resolve(root,p.worktree.parent,opts.branch);
 const plan={executed:false,command:cmd,branch:opts.branch,base:opts.base||base,path,notice:'预览不fetch、不安装、不移除worktree、不删除本地/远端分支；create须用户实际授权'};
 if(cmd==='create'){
  const r=spawnSync('git',['worktree','add',path,'-b',opts.branch,plan.base],{cwd:root,encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr||r.error?.message);plan.executed=true;
 }
 console.log(JSON.stringify(plan,null,2));
}catch(e){console.log(JSON.stringify({status:'blocked',message:e.message}));process.exitCode=2;}
