import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join } from 'node:path';
import { fork, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { DatabaseSync } from 'node:sqlite';
import { SyntheticRun } from './support/synthetic-acquisition.js';
import { bind, owned, copyBytes, copyNames, inspectCopy, type Binding } from './support/best-effort-copy.js';
import { epochCopy, committedWal } from './support/best-effort-validated-copy.js';

const enabled=process.platform==='win32'&&process.env.WORKSPACE_SURVEYOR_RUN_BEST_EFFORT_GATE==='1';
let unresolved=false;
function bounded<T>(p:Promise<T>):Promise<T>{return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Synthetic process deadline')),10000);
  p.then(v=>{clearTimeout(timer);resolve(v);},e=>{clearTimeout(timer);reject(e);});});}
class Producer {
  child:ChildProcess;exit:Promise<number|null>;exited=false;serial=0;bytes=0;
  pending=new Map<number,{resolve:(r:any)=>void;reject:(e:Error)=>void}>();
  constructor(){
    this.child=fork(fileURLToPath(new URL('./support/best-effort-process.js',import.meta.url)),[],
      {execArgv:[],windowsHide:true,stdio:['ignore','ignore','pipe','ipc']});
    this.exit=new Promise(resolve=>this.child.once('exit',code=>{this.exited=true;
      for(const p of this.pending.values())p.reject(Error('Synthetic process exited'));this.pending.clear();resolve(code);}));
    this.child.on('error',()=>{for(const p of this.pending.values())p.reject(Error('Synthetic process unavailable'));this.pending.clear();});
    this.child.stderr?.on('data',(v:Buffer)=>{this.bytes+=v.length;});
    this.child.on('message',(r:any)=>{this.bytes+=Buffer.byteLength(JSON.stringify(r));const p=this.pending.get(r.id);this.pending.delete(r.id);
      if(r.ok===true&&this.bytes<65536)p?.resolve(r);else p?.reject(Error('Synthetic protocol refused'));});
  }
  call(op:string,extra:object={}):Promise<any>{const id=++this.serial;return bounded(new Promise((resolve,reject)=>{
    this.pending.set(id,{resolve,reject});this.child.send({id,op,...extra},e=>{if(e){this.pending.delete(id);reject(Error('Synthetic IPC refused'));}});}));}
  async stop(){if(!this.exited&&this.child.connected)this.child.send({id:++this.serial,op:'exit'});
    assert.equal(await bounded(this.exit),0,'Independent producer exit unconfirmed');assert.ok(this.bytes<65536);}
}
type Harness={b:Binding;p:Producer;run:SyntheticRun;clear:()=>void};
async function fixture(t:TestContext,body:(h:Harness)=>Promise<void>){
  assert.equal(unresolved,false,'Earlier uncertainty blocks subsequent gate fixtures');
  const run=new SyntheticRun('simulated-owner-restricted');let p:Producer|undefined;
  try{
    fs.mkdirSync(run.acquisition);fs.mkdirSync(run.analysis);
    const source=join(run.root,'builder','standalone.sqlite');fs.unlinkSync(source);
    const db=new DatabaseSync(source);
    try{db.exec('PRAGMA page_size=4096; CREATE TABLE first(generation INTEGER); CREATE TABLE second(generation INTEGER); CREATE TABLE payload(value BLOB); INSERT INTO first VALUES(0); INSERT INTO second VALUES(0); BEGIN');
      const insert=db.prepare('INSERT INTO payload VALUES(zeroblob(4000))');for(let i=0;i<64;i++)insert.run();db.exec('COMMIT');}
    finally{db.close();}
    fs.writeFileSync(join(run.root,'builder','metadata.json'),'{"generation":0}');
    fs.writeFileSync(join(run.root,'builder','session_index.jsonl'),'{"generation":0}\n');
    const b=bind(run);p=new Producer();assert.equal((await p.call('init',{binding:b})).pid,p.child.pid);
    assert.notEqual(p.child.pid,process.pid);
    const clear=()=>{owned(b);for(const dir of [run.acquisition,run.analysis]){
      const names=fs.readdirSync(dir);assert.ok(names.every(n=>[...copyNames,'standalone.sqlite-shm'].includes(n as any)));
      for(const n of names){const s=fs.lstatSync(join(dir,n));assert.ok(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1&&s.size<16*1024*1024);}
      for(const n of names)fs.unlinkSync(join(dir,n));}};
    await body({b,p,run,clear});
  }finally{
    try{await p?.stop();assert.equal(run.cleanup().status,'removed');assert.equal(fs.existsSync(run.root),false);
      t.diagnostic('independent process exited; exact invented fixture cleanup=removed');}
    catch{unresolved=true;throw Error('Gate fixture lifetime/cleanup unconfirmed; no subsequent fixtures authorized');}
  }
}
type Counts={attempts:number;candidates:number;refused:number;structurallyInvalid:number;undetectedMixed:number;consistent:number};
const counts=():Counts=>({attempts:0,candidates:0,refused:0,structurallyInvalid:0,undetectedMixed:0,consistent:0});
function record(h:Harness,c:Counts,candidate:boolean){c.attempts++;
  if(!candidate){c.refused++;return;}
  c.candidates++;const view=inspectCopy(h.b);
  // Oracle classification is AFTER the strategy's decision; never hide a candidate's inconsistency as a strategy refusal.
  if(!view.integrity)c.structurallyInvalid++;else if(!view.invariant)c.undetectedMixed++;else c.consistent++;
  return view;
}
function latency(a:number[]){const s=[...a].sort((a,b)=>a-b);return {commits:s.length,p95ms:s[Math.floor(s.length*.95)],maxms:s.at(-1)};}

test('final best-effort gate: independent producer and WAL epoch ordering',{skip:!enabled,concurrency:false},async t=>{
  const guarded=counts(),published=counts(),raw=counts(),walFirst=counts();
  t.diagnostic(JSON.stringify({node:process.versions.node,sqlite:process.versions.sqlite,platform:process.platform}));
  await t.test('missing/empty epoch refuses rather than inventing a stable no-WAL case',async t=>fixture(t,async h=>{
    assert.equal((await epochCopy(h.b)).status,'refused');record(h,guarded,false);
    await h.p.call('seed');await h.p.call('truncate');assert.equal((await epochCopy(h.b)).status,'refused');record(h,guarded,false);
  }));
  await t.test('idle committed epoch succeeds and malformed/torn frame checks refuse',async t=>fixture(t,async h=>{
    await h.p.call('seed');assert.equal((await epochCopy(h.b)).status,'candidate');
    assert.equal(record(h,guarded,true)!.dbGeneration,0);
    const bytes=fs.readFileSync(join(h.run.acquisition,'standalone.sqlite-wal'));
    assert.equal(committedWal(bytes),bytes.length);
    for(const offset of [0,24,40,bytes.length-1]){const bad=Buffer.from(bytes);bad[offset]!^=1;assert.throws(()=>committedWal(bad));}
    assert.throws(()=>committedWal(bytes.subarray(0,bytes.length-1)));
  }));
  await t.test('database first + later WAL repairs the same-epoch checkpoint mixture',async t=>fixture(t,async h=>{
    await h.p.call('seed');let busy=-1;
    const r=await epochCopy(h.b,'db-first',async(phase,offset)=>{if(phase==='db'&&offset===8192){await h.p.call('commit');busy=(await h.p.call('checkpoint')).checkpoint.busy;}});
    assert.equal(busy,0);assert.equal(r.status,'candidate');assert.equal(record(h,guarded,true)!.dbGeneration,1);
  }));
  await t.test('WAL-first ordering still accepts a mixed logical generation despite stable epoch/checksums',async t=>fixture(t,async h=>{
    await h.p.call('seed');
    const r=await epochCopy(h.b,'wal-first',async(phase,offset)=>{if(phase==='db'&&offset===8192){await h.p.call('commit');assert.equal((await h.p.call('checkpoint')).checkpoint.busy,0);}});
    assert.equal(r.status,'candidate');const v=record(h,walFirst,true)!;
    assert.equal(v.integrity,true);assert.equal(v.dbGeneration,0);assert.equal(v.otherGeneration,1);
  }));
  await t.test('raw baseline repeats the missing-epoch undetected mixture across a real process',async t=>fixture(t,async h=>{
    const r=await copyBytes(h.b,async(name,offset)=>{if(name==='standalone.sqlite'&&offset===8192){
      await h.p.call('commit');await h.p.call('truncate');await h.p.call('close');}});
    assert.equal(r.status,'copied');assert.equal(record(h,raw,true)!.invariant,false);
  }));
  for(const point of ['db','wal','verify-wal'] as const)await t.test('truncate/reset during '+point+' refuses',async t=>fixture(t,async h=>{
    await h.p.call('seed');let reached=false;
    const r=await epochCopy(h.b,'db-first',async(phase,offset)=>{if(phase===point&&offset===4096){
      reached=true;assert.equal((await h.p.call('truncate')).checkpoint.busy,0);await h.p.call('commit',{generation:2});}});
    assert.equal(reached,true);assert.equal(r.status,'refused');record(h,guarded,false);
  }));
  await t.test('growth beyond captured WAL prefix accepts a coherent older commit',async t=>fixture(t,async h=>{
    await h.p.call('commit',{generation:1});
    const r=await epochCopy(h.b,'db-first',async(phase,offset)=>{if(phase==='wal'&&offset===0)await h.p.call('commit',{generation:2});});
    assert.equal(r.status,'candidate');assert.equal(record(h,guarded,true)!.dbGeneration,1);
  }));
  await t.test('producer shutdown during database copying refuses changed lifecycle',async t=>fixture(t,async h=>{
    await h.p.call('seed');let reached=false;const r=await epochCopy(h.b,'db-first',async(phase,offset)=>{if(phase==='db'&&offset===4096){reached=true;await h.p.call('close');}});
    assert.equal(reached,true);assert.equal(r.status,'refused');record(h,guarded,false);
  }));
  await t.test('valid reused WAL with old tail can remain unavailable after the producer becomes idle',async t=>fixture(t,async h=>{
    await h.p.call('burst');assert.equal((await h.p.call('checkpoint')).checkpoint.busy,0);
    await h.p.call('commit',{generation:33});
    // Independent baseline establishes actual usability. The epoch gate does not treat that as validation authority.
    assert.equal((await copyBytes(h.b)).status,'copied');assert.equal(inspectCopy(h.b).dbGeneration,33);h.clear();
    for(let i=0;i<2;i++){assert.equal((await epochCopy(h.b)).status,'refused');record(h,guarded,false);h.clear();}
    t.diagnostic('coherent idle generation 33; stale WAL tail causes two strict-validator refusals');
    const before=fs.readFileSync(join(h.run.root,'builder','standalone.sqlite-shm'));
    assert.equal((await epochCopy(h.b,'db-first',undefined,'published')).status,'candidate');
    assert.equal(record(h,published,true)!.dbGeneration,33);
    assert.deepEqual(fs.readFileSync(join(h.run.root,'builder','standalone.sqlite-shm')),before);
    t.diagnostic('published WAL-index endpoint succeeds on the same idle reused WAL; source SHM bytes unchanged');
  }));
  await t.test('published endpoint repairs mixture, refuses an unpublished epoch, and excludes spilled suffix frames',async t=>fixture(t,async h=>{
    await h.p.call('seed');let reached=false;
    const r=await epochCopy(h.b,'db-first',async(phase,offset)=>{if(phase==='db'&&offset===8192){reached=true;await h.p.call('commit');assert.equal((await h.p.call('checkpoint')).checkpoint.busy,0);}},'published');
    assert.equal(reached,true);assert.equal(r.status,'candidate');assert.equal(record(h,published,true)!.dbGeneration,1);h.clear();
    await h.p.call('pending',{generation:99});
    // The prior checkpoint permits a reset: this new epoch has no published commit yet.
    assert.equal((await epochCopy(h.b,'db-first',undefined,'published')).status,'refused');record(h,published,false);h.clear();
    await h.p.call('rollback');await h.p.call('commit',{generation:2});await h.p.call('pending',{generation:99});
    assert.equal((await epochCopy(h.b,'db-first',undefined,'published')).status,'candidate');
    assert.equal(record(h,published,true)!.dbGeneration,2);
    assert.ok(fs.statSync(join(h.run.root,'builder','standalone.sqlite-wal')).size>fs.statSync(join(h.run.acquisition,'standalone.sqlite-wal')).size);
    await h.p.call('rollback');
  }));
  await t.test('published endpoint refuses reset during DB capture',async t=>fixture(t,async h=>{
    await h.p.call('seed');let reached=false;
    const r=await epochCopy(h.b,'db-first',async(phase,offset)=>{if(phase==='db'&&offset===8192){reached=true;await h.p.call('truncate');await h.p.call('commit',{generation:2});}},'published');
    assert.equal(reached,true);assert.equal(r.status,'refused');record(h,published,false);
  }));
  await t.test('P1 protocol limitation: injected stale valid SHM header admits a mixed DB-first candidate',async t=>fixture(t,async h=>{
    await h.p.call('seed');
    const shm=join(h.run.root,'builder','standalone.sqlite-shm'),id=fs.statSync(shm);
    const stale=Buffer.alloc(96),fd=fs.openSync(shm,'r');
    try{assert.equal(fs.readSync(fd,stale,0,96,0),96);}finally{fs.closeSync(fd);}
    const earlierWal=fs.readFileSync(join(h.run.root,'builder','standalone.sqlite-wal'));
    assert.equal(committedWal(earlierWal),earlierWal.length);
    assert.deepEqual(stale.subarray(0,48),stale.subarray(48,96));
    const read=fs.readSync;let injected=0,reached=false;
    // Fault-inject ONLY this owned SHM header read. Return previously valid bytes without modifying the file.
    // This models the missing mapped-memory/ReadFile coherence prerequisite; it is not an observed OS failure.
    const mocked=t.mock.method(fs,'readSync',(...args:Parameters<typeof fs.readSync>)=>{
      const result=Reflect.apply(read,fs,args),values:readonly unknown[]=args;
      const [handle,buffer,offset,length,position]=values;
      if(typeof handle==='number'&&Buffer.isBuffer(buffer)&&offset===0&&length===96&&position===0&&result===96){
        const s=fs.fstatSync(handle);
        if(s.dev===id.dev&&s.ino===id.ino){stale.copy(buffer);injected++;}
      }
      return result;
    });
    let r:Awaited<ReturnType<typeof epochCopy>>;
    try{
      r=await epochCopy(h.b,'db-first',async(phase,offset)=>{if(phase==='db'&&offset===8192){
        reached=true;await h.p.call('commit');assert.equal((await h.p.call('checkpoint')).checkpoint.busy,0);
      }},'published');
    }finally{mocked.mock.restore();}
    assert.equal(reached,true);assert.equal(injected,1);assert.equal(r.status,'candidate');
    const current=Buffer.alloc(96),currentFd=fs.openSync(shm,'r');
    try{assert.equal(fs.readSync(currentFd,current,0,96,0),96);}finally{fs.closeSync(currentFd);}
    assert.notDeepEqual(current,stale);assert.deepEqual(current.subarray(32,40),stale.subarray(32,40));
    assert.deepEqual(fs.readFileSync(join(h.run.acquisition,'standalone.sqlite-wal')),earlierWal);
    const limitation=counts(),view=record(h,limitation,true)!;
    assert.equal(view.integrity,true);assert.equal(view.dbGeneration,0);assert.equal(view.otherGeneration,1);
    assert.equal(limitation.undetectedMixed,1);
    t.diagnostic(JSON.stringify({fault:'injected-stale-valid-shm-header',windowsCoherenceFailureObserved:false,
      strategyDecision:r.status,integrity:view.integrity,logicalConsistency:view.invariant,undetectedMixed:limitation.undetectedMixed}));
    // The existing success-rate sample remains historical; this regression deliberately exposes its missing case.
  }));
  for(const endpoint of ['strict-file','published'] as const)for(const checkpoints of [false,true])await t.test('finite concurrent burst, '+endpoint+', checkpoints='+checkpoints,async t=>fixture(t,async h=>{
    await h.p.call('commit',{generation:0});
    const control=await h.p.call('burst',{checkpoints});assert.deepEqual(control.failures,[]);
    await h.p.call('truncate');await h.p.call('commit',{generation:0});
    // Handle rejection immediately so an uncertain child cannot cause unhandled rejection before teardown.
    const pending=h.p.call('burst',{checkpoints}).then(v=>({value:v}),()=>({value:null}));
    const batch=counts(),times:number[]=[];
    for(let i=0;i<16;i++){
      const r=await epochCopy(h.b,'db-first',async(_phase,offset)=>{if(offset===0)await delay(2);},endpoint);times.push(r.ms);
      record(h,batch,r.status==='candidate');h.clear();
    }
    const total=endpoint==='published'?published:guarded;
    for(const key of Object.keys(total) as (keyof Counts)[])total[key]+=batch[key];
    const live=(await pending).value;assert.ok(live);assert.deepEqual(live.failures,[]);assert.ok(live.busyCheckpoints.every((v:number)=>v===0));
    assert.equal(batch.undetectedMixed,0);assert.equal(batch.structurallyInvalid,0);assert.ok(batch.consistent>0);
    t.diagnostic(JSON.stringify({endpoint,checkpoints,copies:batch,copyTimes:latency(times),control:latency(control.latencies),concurrent:latency(live.latencies),failedCommits:live.failures.length,busyCheckpoints:live.busyCheckpoints}));
  }));
  for(const c of [guarded,published]){assert.equal(c.undetectedMixed,0);assert.equal(c.structurallyInvalid,0);}
  t.diagnostic(JSON.stringify({dbFirstEpoch:guarded,publishedEndpoint:published,walFirstEpoch:walFirst,rawBaseline:raw}));
});
