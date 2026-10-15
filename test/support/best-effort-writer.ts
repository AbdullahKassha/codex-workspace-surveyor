// Only the deliberately mutable invented producer opens a source through SQLite.
import { parentPort, workerData, isMainThread } from 'node:worker_threads';
import fs from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { setTimeout as delay } from 'node:timers/promises';
import { owned, type Binding } from './best-effort-copy.js';

if(isMainThread||!parentPort||process.env.WORKSPACE_SURVEYOR_RUN_BEST_EFFORT_COPY!=='1')throw Error('Synthetic worker invocation refused');
const b=workerData as Binding;
if(dirname(b.root)!==fs.realpathSync(tmpdir())||!b.root.startsWith(join(fs.realpathSync(tmpdir()),'workspace-surveyor-synthetic-')))throw Error('Synthetic worker scope refused');
owned(b);
const path=join(b.root,'builder','standalone.sqlite');
let db:DatabaseSync|undefined,busy=false,stopping=false;
function close(){db?.close();db=undefined;}
function open(){db=new DatabaseSync(path,{allowExtension:false,defensive:true,timeout:0});db.exec('PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0');}
function commit(g:number){const start=performance.now();db!.exec('BEGIN IMMEDIATE');
  try{for(const table of ['first','second'])db!.prepare('UPDATE '+table+' SET generation=?').run(g);db!.exec('COMMIT');}
  catch(e){db!.exec('ROLLBACK');throw e;}return performance.now()-start;}
// Finite producer lifetime; no force termination. Main test retains fixture if exit is unconfirmed.
function stop(){stopping=true;if(!busy){close();clearTimeout(timer);parentPort!.close();}}
const timer=setTimeout(stop,20000);timer.unref();
parentPort.on('message',async(m:{id:number;op:string;generation?:number})=>{
  if(m.op==='exit'){stop();return;}
  if(stopping)return;
  if(busy)return;busy=true;
  try{
    owned(b);let result:object={};const g=m.generation??1;if(!Number.isInteger(g)||g<0||g>128)throw Error('bounds');
    if(m.op==='open')open();
    else if(m.op==='commit')result={latency:commit(g)};
    else if(m.op==='checkpoint')result={checkpoint:db!.prepare('PRAGMA wal_checkpoint(TRUNCATE)').get()};
    else if(m.op==='metadata'){fs.writeFileSync(join(b.root,'builder','metadata.json'),JSON.stringify({generation:g}));
      fs.appendFileSync(join(b.root,'builder','session_index.jsonl'),JSON.stringify({generation:g})+'\n');}
    else if(m.op==='burst'){
      const latencies:number[]=[],failures:number[]=[];
      for(let i=1;i<=32;i++){try{latencies.push(commit(i));}catch(e){failures.push(Number((e as {errcode?:number}).errcode??-1));}await delay(1);}
      result={latencies,failures};
    }else if(m.op==='close')close();
    else throw Error('command');
    parentPort!.postMessage({id:m.id,ok:true,...result});
  }catch{parentPort!.postMessage({id:m.id,ok:false});}
  finally{busy=false;if(stopping)stop();}
});
