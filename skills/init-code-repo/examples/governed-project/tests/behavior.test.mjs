import test from 'node:test';
import assert from 'node:assert/strict';
import {submit} from '../src/submit.mjs';
import {execute} from '../src/execute.mjs';
test('提交身份唯一；拒绝重复/空ID不改变原记录',()=>{
 const jobs=new Map(),job=submit(jobs,'a',1);
 assert.equal(job.state,'queued');assert.equal(jobs.get('a'),job);
 assert.throws(()=>submit(jobs,'a',2),/duplicate/);
 assert.throws(()=>submit(jobs,'',2),/id required/);
 assert.equal(jobs.size,1);assert.equal(job.payload,1);
});
test('执行成功、失败和终态不可重跑',async()=>{
 const jobs=new Map();submit(jobs,'a',1);
 assert.equal(await execute(jobs,'a',async x=>x+1),2);
 assert.equal(jobs.get('a').state,'done');
 await assert.rejects(()=>execute(jobs,'a',async()=>0),/not runnable/);
 submit(jobs,'b',2);
 await assert.rejects(()=>execute(jobs,'b',async()=>{throw new Error('failure');}),/failure/);
 assert.equal(jobs.get('b').state,'failed');
});
