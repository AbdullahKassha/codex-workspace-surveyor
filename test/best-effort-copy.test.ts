import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import { DatabaseSync } from 'node:sqlite';
import { setTimeout as delay } from 'node:timers/promises';
import { SyntheticRun } from './support/synthetic-acquisition.js';
import { bind, owned, copyBytes, inspectCopy, copyNames, type Binding } from './support/best-effort-copy.js';

const enabled=process.platform==='win32'&&process.env.WORKSPACE_SURVEYOR_RUN_BEST_EFFORT_COPY==='1';
let unresolved=false;
function bounded<T>(p:Promise<T>):Promise<T>{return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Synthetic worker deadline; retain fixture if exit unconfirmed')),8000);
  p.then(v=>{clearTimeout(timer);resolve(v);},e=>{clearTimeout(timer);reject(e);});});}
class Producer {
  worker:Worker;exit:Promise<number>;serial=0;exited=false;
  pending=new Map<number,{resolve:(v:any)=>void;reject:(e:Error)=>void}>();
  constructor(b:Binding){
    this.worker=new Worker(new URL('./support/best-effort-writer.js',import.meta.url),{workerData:b});
    this.exit=new Promise(resolve=>this.worker.once('exit',code=>{this.exited=true;
      for(const p of this.pending.values())p.reject(Error('Synthetic producer exited'));this.pending.clear();resolve(code);}));
    this.worker.on('error',()=>{for(const p of this.pending.values())p.reject(Error('Synthetic producer failure'));this.pending.clear();});
    this.worker.on('message',v=>{const p=this.pending.get(v.id);this.pending.delete(v.id);
      if(v.ok===true)p?.resolve(v);else p?.reject(Error('Synthetic producer command refused'));});
  }
  call(op:string,generation?:number):Promise<any>{const id=++this.serial;return bounded(new Promise((resolve,reject)=>{
    this.pending.set(id,{resolve,reject});this.worker.postMessage({id,op,...(generation===undefined?{}:{generation})});}));}
  async stop(){if(!this.exited)this.worker.postMessage({id:++this.serial,op:'exit'});assert.equal(await bounded(this.exit),0,'Producer exit unconfirmed');}
}
type Harness={b:Binding;producer:Producer;source:string;run:SyntheticRun;clear:()=>void};
async function fixture(t:TestContext,body:(h:Harness)=>Promise<void>){
  assert.equal(unresolved,false,'Earlier fixture uncertainty blocks further experiments');
  const run=new SyntheticRun('simulated-owner-restricted');let producer:Producer|undefined;
  try{
    fs.mkdirSync(run.acquisition);fs.mkdirSync(run.analysis);
    const source=join(run.root,'builder','standalone.sqlite');fs.unlinkSync(source);
    const db=new DatabaseSync(source);
    try{db.exec('PRAGMA page_size=4096; CREATE TABLE first(generation INTEGER); CREATE TABLE second(generation INTEGER); CREATE TABLE payload(value BLOB); INSERT INTO first VALUES(0); INSERT INTO second VALUES(0); BEGIN');
      const insert=db.prepare('INSERT INTO payload VALUES(zeroblob(4000))');for(let i=0;i<256;i++)insert.run();db.exec('COMMIT');
      assert.equal(db.prepare("SELECT rootpage FROM sqlite_schema WHERE name='first'").get()!.rootpage,2);
      assert.equal(db.prepare("SELECT rootpage FROM sqlite_schema WHERE name='second'").get()!.rootpage,3);
    }finally{db.close();}
    fs.writeFileSync(join(run.root,'builder','metadata.json'),'{"generation":0}');
    fs.writeFileSync(join(run.root,'builder','session_index.jsonl'),'{"generation":0}\n');
    const b=bind(run);producer=new Producer(b);
    const clear=()=>{owned(b);for(const area of [run.acquisition,run.analysis]){
      const names=fs.readdirSync(area);assert.ok(names.every(n=>[...copyNames,'standalone.sqlite-shm'].includes(n as any)));
      for(const name of names){const s=fs.lstatSync(join(area,name));assert.ok(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1&&s.size<=16*1024*1024);}
      for(const name of names)fs.unlinkSync(join(area,name));}};
    await body({b,producer,source,run,clear});
  }finally{
    try{
      await producer?.stop();
      assert.equal(run.cleanup().status,'removed','Exact owned fixture cleanup unconfirmed');
      assert.equal(fs.existsSync(run.root),false);t.diagnostic('cleanup=removed; producer exit confirmed; invented data only; DACL qualification not claimed');
    }catch{unresolved=true;throw Error('Synthetic lifetime/cleanup uncertainty; fixture retained; no later experiment permitted');}
  }
}
function measure(source:string){return ['','-wal','-shm'].map(suffix=>{
  try{const p=source+suffix,s=fs.statSync(p);return {bytes:s.size,hash:createHash('sha256').update(fs.readFileSync(p)).digest('hex'),mtime:s.mtimeMs,ctime:s.ctimeMs};}
  catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw Error('Synthetic measurement unavailable');}});}
function stats(latencies:number[]){const a=[...latencies].sort((x,y)=>x-y);return {commits:a.length,p95ms:a[Math.floor(a.length*.95)],maxms:a.at(-1)};}

test('best-effort byte-copy feasibility (separate synthetic opt-in)',{skip:!enabled,concurrency:false},async t=>{
  t.diagnostic(JSON.stringify({node:process.versions.node,sqlite:process.versions.sqlite,uv:process.versions.uv,platform:process.platform}));
  await t.test('idle no-WAL and live-WAL copies; consumer source hashes unchanged',async t=>fixture(t,async h=>{
    for(const wal of [false,true]){
      if(wal){await h.producer.call('open');await h.producer.call('commit',1);}
      const before=measure(h.source);assert.equal((await copyBytes(h.b)).status,'copied');
      const view=inspectCopy(h.b);assert.equal(view.status,'usable');assert.equal(view.dbGeneration,wal?1:0);
      assert.deepEqual(measure(h.source),before);t.diagnostic(JSON.stringify({wal,view,sourceBytesAndSampledMetadataUnchanged:true}));h.clear();
    }
  }));
  await t.test('reader-first sharing permits writer open, commit and checkpoint while read handle held',async t=>fixture(t,async h=>{
    let checkpoint:any;const result=await copyBytes(h.b,async(name,offset)=>{
      if(name==='standalone.sqlite'&&offset===0){await h.producer.call('open');await h.producer.call('commit',1);
        checkpoint=(await h.producer.call('checkpoint')).checkpoint;await h.producer.call('close');}
    });assert.equal(checkpoint.busy,0);assert.equal(result.status,'copied');assert.equal(inspectCopy(h.b).dbGeneration,1);
    t.diagnostic(JSON.stringify({checkpoint,writerSucceededWithConsumerHandle:true}));
  }));
  await t.test('concurrent WAL growth: bounded copies and producer latency compared with control',async t=>fixture(t,async h=>{
    await h.producer.call('open');await h.producer.call('commit',0);
    const control=await h.producer.call('burst');assert.deepEqual(control.failures,[]);
    await h.producer.call('checkpoint');await h.producer.call('commit',0);
    const growthBefore=fs.statSync(h.source+'-wal').size;
    const burst=h.producer.call('burst');let copied=0,usable=0,refused=0;const refusalReasons:string[]=[];
    for(let i=0;i<4;i++){
      const r=await copyBytes(h.b,async(_name,offset)=>{if(offset%65536===0)await delay(1);});
      if(r.status==='copied'){copied++;if(inspectCopy(h.b).status==='usable')usable++;else{refused++;refusalReasons.push('analysis');}}
      else{refused++;refusalReasons.push(r.reason);}
      h.clear();
    }
    const live=await burst;assert.deepEqual(live.failures,[]);assert.ok(usable>0);
    assert.ok(fs.statSync(h.source+'-wal').size>growthBefore);
    t.diagnostic(JSON.stringify({control:stats(control.latencies),concurrent:stats(live.latencies),failedCommits:live.failures.length,copied,usable,refused,refusalReasons}));
  }));
  await t.test('WAL append during its copy preserves a usable earlier prefix; reset/reuse refuses',async t=>fixture(t,async h=>{
    await h.producer.call('open');await h.producer.call('commit',1);
    const r=await copyBytes(h.b,async(name,offset)=>{if(name==='standalone.sqlite-wal'&&offset===0)await h.producer.call('commit',2);});
    assert.equal(r.status,'copied');const view=inspectCopy(h.b);assert.equal(view.status,'usable');assert.equal(view.dbGeneration,1);
    t.diagnostic(JSON.stringify({walGrowthCopy:view,producerGeneration:2}));h.clear();
    const reset=await copyBytes(h.b,async(name,offset)=>{if(name==='standalone.sqlite-wal'&&offset===4096){
      assert.equal((await h.producer.call('checkpoint')).checkpoint.busy,0);await h.producer.call('commit',3);await h.producer.call('commit',4);}});
    assert.equal(reset.status,'refused');
  }));
  await t.test('checkpoint/reset during WAL read refuses; next independent copy succeeds',async t=>fixture(t,async h=>{
    await h.producer.call('open');await h.producer.call('commit',1);let checkpoint:any;
    const r=await copyBytes(h.b,async(name,offset)=>{if(name==='standalone.sqlite-wal'&&offset===0)checkpoint=(await h.producer.call('checkpoint')).checkpoint;});
    assert.equal(checkpoint.busy,0);assert.equal(r.status,'refused');h.clear();
    await h.producer.call('commit',2);assert.equal((await copyBytes(h.b)).status,'copied');assert.equal(inspectCopy(h.b).dbGeneration,2);
    t.diagnostic(JSON.stringify({checkpoint,resetCopy:'refused'}));
  }));
  await t.test('last writer closes and removes companions: lifecycle refusal, no held read prevents shutdown',async t=>fixture(t,async h=>{
    await h.producer.call('open');await h.producer.call('commit',1);
    const r=await copyBytes(h.b,async(name,offset)=>{if(name==='standalone.sqlite'&&offset===0)await h.producer.call('close');});
    assert.equal(r.status,'refused');assert.equal(fs.existsSync(h.source+'-wal'),false);assert.equal(fs.existsSync(h.source+'-shm'),false);
  }));
  await t.test('readable stale DB plus newer JSON/index passes integrity: freshness is not established',async t=>fixture(t,async h=>{
    const size=fs.statSync(h.source).size;
    const r=await copyBytes(h.b,async(name,offset)=>{if(name==='standalone.sqlite'&&offset===size){
      await h.producer.call('open');await h.producer.call('commit',1);await h.producer.call('checkpoint');await h.producer.call('close');await h.producer.call('metadata',1);}});
    assert.equal(r.status,'copied');const view=inspectCopy(h.b);
    assert.equal(view.status,'usable');assert.equal(view.dbGeneration,0);assert.equal(view.jsonGeneration,1);assert.equal(view.indexGeneration,1);
    t.diagnostic(JSON.stringify({view,crossSourceGenerationSkew:true}));
  }));
  await t.test('checkpoint between pages produces mixed DB generations despite integrity passing; known invariant rejects',async t=>fixture(t,async h=>{
    const r=await copyBytes(h.b,async(name,offset)=>{if(name==='standalone.sqlite'&&offset===8192){
      await h.producer.call('open');await h.producer.call('commit',1);await h.producer.call('checkpoint');await h.producer.call('close');}});
    assert.equal(r.status,'copied');const view=inspectCopy(h.b);
    assert.equal(view.integrity,true);assert.equal(view.dbGeneration,0);assert.equal(view.otherGeneration,1);assert.equal(view.status,'refused');
    t.diagnostic(JSON.stringify({view,knownInvariantRequiredBeyondIntegrity:true}));
  }));
  await t.test('malformed copy and partial metadata rejected; bounded and cancelled copies withheld',async t=>fixture(t,async h=>{
    assert.equal((await copyBytes(h.b)).status,'copied');
    // Corruption injection targets ONLY the owned acquisition copy.
    fs.writeFileSync(join(h.run.acquisition,'standalone.sqlite'),Buffer.alloc(128,255));assert.equal(inspectCopy(h.b).status,'refused');h.clear();
    assert.equal((await copyBytes(h.b)).status,'copied');fs.writeFileSync(join(h.run.acquisition,'metadata.json'),'{');
    assert.equal(inspectCopy(h.b).status,'refused');h.clear();
    assert.equal((await copyBytes(h.b)).status,'copied');fs.appendFileSync(join(h.run.acquisition,'session_index.jsonl'),'{');
    assert.equal(inspectCopy(h.b).status,'refused');h.clear();
    const abort=new AbortController();abort.abort();assert.equal((await copyBytes(h.b,undefined,abort.signal)).status,'refused');
    assert.deepEqual(fs.readdirSync(h.run.acquisition),[]);
    const during=new AbortController();assert.equal((await copyBytes(h.b,async()=>{during.abort();},during.signal)).status,'refused');h.clear();
    // Owned producer fixture only: no actual large allocation/content or private input.
    fs.truncateSync(join(h.run.root,'builder','metadata.json'),16*1024*1024+1);assert.equal((await copyBytes(h.b)).status,'refused');
  }));
});
