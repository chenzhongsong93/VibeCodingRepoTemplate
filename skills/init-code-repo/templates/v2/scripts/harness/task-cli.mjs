#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { createTask, taskIndex, advanceTask, finishTask } from './task.mjs';
import { loadProject, loadTask, inside, taskPath, sha256 } from './model.mjs';
try{
 const args=process.argv.slice(2),cmd=args.shift(),options={};
 for(let i=0;i<args.length;i+=2){if(!['--title','--domain','--risk','--task','--stage','--expected','--note','--evidence'].includes(args[i])||!args[i+1])throw new Error('未知/缺失参数');options[args[i].slice(2)]=args[i+1];}
 const root=process.cwd();let result;
 if(cmd==='create')result=createTask(root,options);
 else if(cmd==='index')result=taskIndex(root);
 else if(cmd==='show'){const p=loadProject(root);result={task:loadTask(root,p,options.task),digest:sha256(readFileSync(inside(root,taskPath(p,options.task))))};}
 else if(cmd==='advance')result=advanceTask(root,{...options,id:options.task});
 else if(cmd==='finish')result=finishTask(root,{...options,id:options.task});
 else throw new Error('命令: create/index/show/advance/finish');
 console.log(JSON.stringify(result,null,2));
}catch(e){console.log(JSON.stringify({status:'blocked',message:e.message}));process.exitCode=2;}
