#!/usr/bin/env node
import { resolve } from 'node:path';
import { runChecks } from './runner.mjs';
const args=process.argv.slice(2),options={};let root=process.cwd();
try{
 for(let i=0;i<args.length;i++){
  const key=args[i];
  if(['--profile','--intent','--task','--only','--stage','--root','--group'].includes(key)){
   if(!args[i+1]||args[i+1].startsWith('--'))throw new Error(`缺少${key}值`);
   if(key==='--root')root=resolve(args[++i]);else options[key.slice(2)]=args[++i];
  }else if(key==='--plan')options.plan=true;
  else if(key==='--json'){}else throw new Error(`未知参数: ${key}`);
 }
 const report=runChecks(root,options);console.log(JSON.stringify(report,null,2));process.exitCode=report.exitCode;
}catch(e){console.log(JSON.stringify({exitCode:2,taskReady:false,results:[{id:'arguments',status:'blocked',message:e.message}]}));process.exitCode=2;}
