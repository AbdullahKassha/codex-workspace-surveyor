// Independent, finite producer for the new gate; no historical live-research imports.
import fs from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { setTimeout as delay } from 'node:timers/promises';
import { owned, type Binding } from './best-effort-copy.js';
let b:Binding|undefined,db:DatabaseSync|undefined,busy=false,stopping=false,count=0;
const send=(v:object)=>{if(process.connected)process.send?.(v);};
function stop(){stopping=true;if(!busy){db?.close();db=undefined;clearTimeout(timer);if(process.connected)process.disconnect();}}
const timer=setTimeout(stop,60000);timer.unref();
function commit(g:number,seed=false){const start=performance.now();db!.exec('BEGIN IMMEDIATE');
  try{if(seed)db!.prepare('UPDATE payload SET value=? WHERE rowid=1').run(Buffer.alloc(4000,42));
    else for(const table of ['first','second'])db!.prepare('UPDATE '+table+' SET generation=?').run(g);
    db!.exec('COMMIT');}catch(e){db!.exec('ROLLBACK');throw e;}return performance.now()-start;}
if(process.env.WORKSPACE_SURVEYOR_RUN_BEST_EFFORT_GATE!=='1'||!process.send)stop();
else{
  process.on('disconnect',stop);
  process.on('message',async(m:{id:number;op:string;binding?:Binding;generation?:number;checkpoints?:boolean})=>{
    if(m.op==='exit'){stop();return;}if(busy||stopping)return;busy=true;
    try{
      if(++count>256)throw Error('bound');
      if(m.op==='init'){
        if(b||!m.binding||dirname(m.binding.root)!==fs.realpathSync(tmpdir())||
          !m.binding.root.startsWith(join(fs.realpathSync(tmpdir()),'workspace-surveyor-synthetic-')))throw Error('scope');
        b=m.binding;owned(b);db=new DatabaseSync(join(b.root,'builder','standalone.sqlite'),{allowExtension:false,defensive:true,timeout:0});
        db.exec('PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0; PRAGMA synchronous=FULL');
        send({id:m.id,ok:true,pid:process.pid});return;
      }
      if(!b||!db)throw Error('init');owned(b);let result:object={};
      const g=m.generation??1;if(!Number.isInteger(g)||g<0||g>256)throw Error('bound');
      if(m.op==='commit')result={latency:commit(g)};
      else if(m.op==='seed')commit(0,true);
      else if(m.op==='pending'){
        db.exec('PRAGMA cache_size=4; BEGIN IMMEDIATE');
        for(const table of ['first','second'])db.prepare('UPDATE '+table+' SET generation=?').run(g);
        db.prepare('UPDATE payload SET value=?').run(Buffer.alloc(4000,99));
      }else if(m.op==='rollback')db.exec('ROLLBACK');
      else if(m.op==='checkpoint'||m.op==='truncate')result={checkpoint:db.prepare('PRAGMA wal_checkpoint('+(m.op==='truncate'?'TRUNCATE':'PASSIVE')+')').get()};
      else if(m.op==='burst'){
        const latencies:number[]=[],busyCheckpoints:number[]=[],failures:number[]=[];
        for(let i=1;i<=32&&!stopping;i++){
          try{latencies.push(commit(i));if(m.checkpoints&&i%4===0)busyCheckpoints.push(Number(db.prepare('PRAGMA wal_checkpoint(PASSIVE)').get()!.busy));}
          catch(e){failures.push(Number((e as {errcode?:number}).errcode??-1));}await delay(5);
        }result={latencies,busyCheckpoints,failures};
      }else if(m.op==='close'){db.close();db=undefined;}
      else throw Error('command');
      send({id:m.id,ok:true,...result});
    }catch{send({id:m.id,ok:false});}
    finally{busy=false;if(stopping)stop();}
  });
}
