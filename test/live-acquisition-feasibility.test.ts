// Opted-in disposable measurements, not a live personal acquisition adapter.
import test from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join } from 'node:path';
import { fork, spawnSync, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { explorerFixture } from './support/explorer-fixture.js';
import { runCanary } from './support/personal-canary.js';
import { ExplorerSession } from '../src/explorer/session.js';
import { ExplorerSnapshot, reconcile } from '../src/explorer/model.js';

const enabled=process.platform==='win32'&&process.env.WORKSPACE_SURVEYOR_RUN_LIVE_FEASIBILITY==='1';
const options={skip:!enabled,concurrency:false,timeout:30000};
const executable=process.env.WORKSPACE_SURVEYOR_HELPER_PWSH??'';
const entry=fileURLToPath(new URL('./support/live-acquisition-worker.js',import.meta.url));
type Reply=Record<string,unknown>;
let unresolved=false;
function bounded<T>(promise:Promise<T>,milliseconds=12000):Promise<T>{
  return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Research protocol deadline')),milliseconds);timer.unref();
    promise.then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});});
}
class Worker {
  readonly child:ChildProcess;
  readonly exited:Promise<void>;
  verified=false;
  private serial=0;
  private pending=new Map<number,{resolve:(r:Reply)=>void;reject:(e:Error)=>void}>();
  private steps:Reply[]=[];
  private waiter:((r:Reply)=>void)|undefined;
  private bytes=0;
  constructor(){
    this.child=fork(entry,[],{stdio:['ignore','ignore','pipe','ipc'],windowsHide:true,execArgv:[],env:{...process.env}});
    this.exited=new Promise(resolve=>this.child.once('exit',()=>{
      for(const pending of this.pending.values())pending.reject(Error('Invented worker exited'));this.pending.clear();resolve();
    }));
    this.child.on('error',()=>{for(const pending of this.pending.values())pending.reject(Error('Invented worker unavailable'));});
    this.child.stderr?.on('data',(chunk:Buffer)=>{this.bytes+=chunk.length;});
    this.child.on('message',(value:Reply)=>{
      this.bytes+=Buffer.byteLength(JSON.stringify(value));
      if(this.bytes>65536)return;
      if(value.event==='step'){if(this.waiter){this.waiter(value);this.waiter=undefined;}else this.steps.push(value);return;}
      const pending=this.pending.get(Number(value.id));this.pending.delete(Number(value.id));pending?.resolve(value);
    });
  }
  request(op:string,fields:Reply={}):Promise<Reply>{
    const id=++this.serial;return bounded(new Promise((resolve,reject)=>{
      this.pending.set(id,{resolve,reject});this.child.send({id,op,...fields},error=>{if(error){this.pending.delete(id);reject(Error('Invented worker IPC unavailable'));}});
    }));
  }
  async call(op:string,fields:Reply={}):Promise<Reply>{const result=await this.request(op,fields);assert.equal(result.ok,true,'Fixture command refused');return result;}
  step():Promise<Reply>{return this.steps.length?Promise.resolve(this.steps.shift()!):bounded(new Promise(resolve=>{this.waiter=resolve;}),8000);}
  async stop(){
    if(this.child.exitCode!==null||this.child.signalCode!==null){await this.exited;return;}
    assert.equal(this.verified,true,'Unverified fixture lifetime; retain artifacts');
    if(this.pending.size){if(this.child.connected)this.child.disconnect();}
    else if(this.child.connected)await this.call('exit');await bounded(this.exited);
    assert.ok(this.bytes<=65536,'Fixture protocol output exceeded bound');
  }
  async crash(){assert.equal(this.verified,true);assert.ok(this.child.pid);assert.equal(this.child.kill('SIGKILL'),true);await this.exited;}
}
function protect(path:string){
  // Exact empty owned destination only; never change designated-source ACLs.
  assert.deepEqual(fs.readdirSync(path),[]);
  const script=`$ErrorActionPreference='Stop';$p=([Console]::In.ReadToEnd() | ConvertFrom-Json);$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User;
  $a=[Security.AccessControl.DirectorySecurity]::new();$a.SetOwner($sid);$a.SetAccessRuleProtection($true,$false);
  $r=[Security.AccessControl.FileSystemAccessRule]::new($sid,[Security.AccessControl.FileSystemRights]::FullControl,[Security.AccessControl.InheritanceFlags]3,[Security.AccessControl.PropagationFlags]::None,[Security.AccessControl.AccessControlType]::Allow);
  [void]$a.AddAccessRule($r);[IO.FileSystemAclExtensions]::SetAccessControl([IO.DirectoryInfo]::new($p),$a);
  $v=[IO.FileSystemAclExtensions]::GetAccessControl([IO.DirectoryInfo]::new($p));$rules=$v.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier]);
  if(-not $v.AreAccessRulesProtected -or -not $v.GetOwner([Security.Principal.SecurityIdentifier]).Equals($sid) -or $rules.Count -ne 1 -or -not $rules[0].IdentityReference.Equals($sid) -or [int]$rules[0].FileSystemRights -ne [int][Security.AccessControl.FileSystemRights]::FullControl){throw 'protection'};[Console]::Write('protected')`;
  const input=JSON.stringify(path).replace(/[^\x00-\x7f]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
  const r=spawnSync(executable,['-NoProfile','-NonInteractive','-Command',script],{input,encoding:'utf8',windowsHide:true,timeout:5000,maxBuffer:8192});
  assert.equal(r.status,0,'Owned destination protection failed');assert.equal(r.stdout,'protected');
}
async function fixture(t:TestContext,body:(h:Harness)=>Promise<void>,wal=false){
  assert.equal(unresolved,false,'Earlier research residual blocks subsequent cases');
  const f=explorerFixture(undefined,wal),workers:Worker[]=[];
  const root=f.run.root,source=join(root,'builder','standalone.sqlite'),destination=join(f.run.acquisition,'standalone.sqlite');
  const gate=join(f.run.analysis,'session_index.jsonl');
  const h={f,root,source,destination,gate,workers,
    async worker(role:'writer'|'reader'|'metadata',area:'builder'|'sources'='builder'){
      const w=new Worker();workers.push(w);const s=fs.lstatSync(root,{bigint:true}),nonce=fs.readFileSync(join(root,'owner'),'utf8');
      const hello=await w.call('init',{root,nonce,dev:String(s.dev),ino:String(s.ino),role,area});
      assert.equal(hello.pid,w.child.pid);assert.equal(hello.nonce,nonce);w.verified=true;return w;
    }};
  let watcher:fs.FSWatcher|undefined;const events=new Set<string>();
  try{
    fs.mkdirSync(f.run.acquisition);fs.mkdirSync(f.run.analysis);
    protect(f.run.acquisition);protect(f.run.analysis);
    fs.writeFileSync(gate,'wait',{flag:'wx'});
    watcher=fs.watch(join(root,'builder'),(event,name)=>{if(events.size<64)events.add(event+':'+(name?.toString()??'unknown'));});
    await body(h);
  }finally{
    watcher?.close();
    try{
      for(const worker of workers)await worker.stop();
      let total=0,files=0;
      const inspect=(directory:string)=>{for(const name of fs.readdirSync(directory)){
        const p=join(directory,name),s=fs.lstatSync(p);assert.equal(s.isSymbolicLink(),false);
        if(s.isDirectory())inspect(p);else{assert.ok(s.size<=16*1024*1024);total+=s.size;files++;}
      }};inspect(root);assert.ok(total<=64*1024*1024&&files<=32,'Research bounds exceeded');
      assert.equal(await f.teardown(),true,'Owned research cleanup unconfirmed');
      assert.equal(fs.existsSync(root),false);
      t.diagnostic(JSON.stringify({cleanup:'removed',watchEvents:events.size,bytesAtCleanup:total}));
    }catch{unresolved=true;throw Error('Research child/cleanup uncertainty; exact owned fixture retained');}
  }
}
type Harness={f:ReturnType<typeof explorerFixture>;root:string;source:string;destination:string;gate:string;workers:Worker[];
  worker:(role:'writer'|'reader'|'metadata',area?:'builder'|'sources')=>Promise<Worker>};
function measure(path:string){
  return ['','-wal','-shm'].map(suffix=>{
    const p=path+suffix;if(!fs.existsSync(p))return null;const s=fs.lstatSync(p,{bigint:true});
    let hash:string|null=null;try{hash=createHash('sha256').update(fs.readFileSync(p)).digest('hex');}
    catch(error){if((error as NodeJS.ErrnoException).code!=='EBUSY')throw Error('Research measurement unavailable');}
    return {identity:String(s.dev)+':'+String(s.ino),bytes:Number(s.size),mtime:String(s.mtimeNs),ctime:String(s.ctimeNs),hash};
  });
}
function stats(reply:Reply){const a=(reply.latencies as number[]).slice().sort((x,y)=>x-y);return {commits:a.length,failures:(reply.failures as number[]).length,
  p50ms:a[Math.floor(a.length*.5)],p95ms:a[Math.floor(a.length*.95)],maxms:a.at(-1)};}
function inspectCopy(path:string){const db=new DatabaseSync(path,{readOnly:true,allowExtension:false,defensive:true,timeout:0});
  try{return {generation:Number(db.prepare('SELECT generation FROM live_probe').get()!.generation),valid:db.prepare('PRAGMA quick_check').get()!.quick_check==='ok'};}finally{db.close();}}

test('live research worker refuses execution without the separate opt-in',()=>{
  const r=spawnSync(process.execPath,[entry],{env:{...process.env,WORKSPACE_SURVEYOR_RUN_LIVE_FEASIBILITY:'0'},encoding:'utf8',windowsHide:true,timeout:5000});
  assert.equal(r.status,2);assert.equal(r.stdout,'');assert.equal(r.stderr,'');
});

test('live research IPC refuses an external source location before fixture initialization',options,async()=>{
  const worker=new Worker();
  try{
    const result=await worker.request('init',{root:'C:\\Synthetic\\NotAHarnessRoot',nonce:'11111111-1111-1111-1111-111111111111',
      dev:'0',ino:'0',role:'reader',area:'builder'});
    assert.equal(result.ok,false);assert.equal(result.category,'selection');
  }finally{worker.child.disconnect();await bounded(worker.exited);assert.equal(worker.child.exitCode,0);}
});

for(const rate of [100,1] as const)test('live backup multiprocess idle and uncommitted writer; batch '+rate,options,async t=>fixture(t,async h=>{
  const writer=await h.worker('writer');await writer.call('open');await writer.call('uncommitted',{generation:9});
  const before=measure(h.source),reader=await h.worker('reader'),result=await reader.call('backup',{rate});
  assert.equal(result.generation,0);assert.equal(result.consistent,true);assert.equal(result.integrity,true);
  const after=measure(h.source);assert.equal(after[0]!.hash,before[0]!.hash);assert.equal(after[1]!.hash,before[1]!.hash);
  assert.notEqual(before[0]!.hash,null);assert.notEqual(before[1]!.hash,null);
  t.diagnostic(JSON.stringify({rate,steps:result.steps,milliseconds:result.milliseconds,
    sourceShmChanged:before[2]!.hash===null||after[2]!.hash===null?'unobserved: raw read busy':before[2]!.hash!==after[2]!.hash}));
  await reader.call('close');await writer.call('rollback');await writer.call('close');
}));

test('live backup readOnly creates a missing source SHM on the closed owned WAL image',options,async t=>fixture(t,async h=>{
  fs.copyFileSync(h.f.source,h.source);fs.copyFileSync(h.f.source+'-wal',h.source+'-wal');
  assert.equal(fs.existsSync(h.source+'-shm'),false);const before=measure(h.source);
  const reader=await h.worker('reader');const result=await reader.call('backup');
  // The image has the accepted invented threads schema, not the research generation table.
  assert.equal(result.generation,undefined);assert.equal(result.integrity,true);assert.equal(fs.existsSync(h.source+'-shm'),true);
  assert.equal(measure(h.source)[0]!.hash,before[0]!.hash);assert.equal(measure(h.source)[1]!.hash,before[1]!.hash);
  t.diagnostic('readOnly backup source opening created SHM; unchanged DB/WAL hashes do not satisfy the source-side-effect contract.');
},true));

test('live protected copying preserves its writer-first refusal and reader-first exclusion',options,async t=>fixture(t,async h=>{
  assert.equal(process.env.WORKSPACE_SURVEYOR_RUN_CANARY_PREPARATION,'1');
  const writer=await h.worker('writer','sources');await writer.call('open');
  const acquire=(hook?:Parameters<typeof runCanary>[0]['hook'])=>runCanary({executable,selection:h.f.selection,closure:()=> 'absent',
    hook:async(phase,scratch)=>{if(phase==='initialized')h.f.scratches.push(scratch);await hook?.(phase,scratch);}});
  const first=await acquire();assert.equal(first.status,'refused');assert.equal(first.cleanup,'removed');
  await writer.call('close');let opened:Reply|undefined,denied:Reply|undefined,companions=false;
  const second=await acquire(async phase=>{if(phase==='held'){
    opened=await writer.request('open');denied=opened.ok?await writer.request('commit',{generation:2}):opened;
    companions=fs.existsSync(h.f.source+'-wal')||fs.existsSync(h.f.source+'-shm');
  }});
  assert.equal(denied?.ok,false);assert.equal(second.cleanup,'removed');
  if(companions)assert.equal(second.status,'refused');
  t.diagnostic(JSON.stringify({writerFirst:first.reason,readerFirstOpen:opened?.ok,readerFirstWriteCode:denied?.code,
    companionsAppeared:companions,protectedCopy:second.status,protectedReason:second.reason}));
}));

test('live pinned reader preserves SQLite snapshot but delays writer checkpoint until release',options,async t=>fixture(t,async h=>{
  const writer=await h.worker('writer');await writer.call('open');await writer.call('commit',{generation:1});
  const reader=await h.worker('reader');assert.equal((await reader.call('pin')).generation,1);
  const commit=await writer.call('commit',{generation:2}),blocked=await writer.call('checkpoint');
  assert.equal((blocked.checkpoint as Reply).busy,1);
  const result=await reader.call('backup',{rate:1});assert.equal(result.generation,1);assert.equal(result.consistent,true);
  await reader.call('close');const released=await writer.call('checkpoint');assert.equal((released.checkpoint as Reply).busy,0);
  await writer.call('close');assert.equal(fs.existsSync(h.source+'-wal'),false);await writer.call('open');assert.equal(fs.existsSync(h.source+'-wal'),true);
  t.diagnostic(JSON.stringify({writerCommitMs:commit.milliseconds,checkpointDuring:blocked.checkpoint,checkpointAfter:released.checkpoint}));
}));

for(const rate of [100,1] as const)test('live backup external commit restart and writer latency; batch '+rate,options,async t=>fixture(t,async h=>{
  const writer=await h.worker('writer');await writer.call('open');const baseline=stats(await writer.call('burst'));
  const reader=await h.worker('reader');fs.writeFileSync(h.gate,'wait');const attempt=reader.call('backup',{rate,gate:true});
  await reader.step();await writer.call('commit',{generation:100});const concurrent=writer.call('burst');fs.writeFileSync(h.gate,'go');
  const result=await attempt,under=stats(await concurrent);
  t.diagnostic(JSON.stringify({rate,baseline,concurrent:under,completed:result.integrity===true,stopReason:result.stopReason,
    failurePhase:result.failurePhase,code:result.code,backupMs:result.milliseconds,steps:result.steps,restarts:result.restarts,walBytes:measure(h.source)[1]?.bytes}));
  if(result.integrity===true)assert.equal(result.consistent,true);
  else{
    assert.ok(result.boundedStop===true||result.stopReason==='sqlite-io'&&[5,6].includes(Number(result.code)&255),'Unexpected backup failure');
    assert.equal(result.failurePhase,'backup');assert.equal(result.generation,undefined);
  }
  assert.ok(Number(result.restarts)>0);assert.equal(under.failures,0);
}));

test('live raw-copy counterexample: WAL reset yields a valid stale database without stability verification',options,async t=>fixture(t,async h=>{
  const writer=await h.worker('writer');await writer.call('open');await writer.call('checkpoint');const before=measure(h.source);
  fs.copyFileSync(h.source,h.destination);await writer.call('commit',{generation:1});await writer.call('checkpoint');
  for(const suffix of ['-wal','-shm'])fs.copyFileSync(h.source+suffix,h.destination+suffix);
  const copy=inspectCopy(h.destination);assert.equal(copy.valid,true);assert.equal(copy.generation,0);assert.notEqual(before[0]!.hash,measure(h.source)[0]!.hash);
  t.diagnostic('Raw copy parsed successfully but retained generation 0 after generation 1 checkpoint; source stability checks would reject it.');
}));

test('live metadata barriers expose cross-source skew, partial records and observer blind spots',options,async t=>fixture(t,async h=>{
  const writer=await h.worker('writer');await writer.call('open');const meta=await h.worker('metadata');await meta.call('metadata-init');
  const reader=await h.worker('reader'),backup=await reader.call('backup');assert.equal(backup.generation,0);
  await writer.call('commit',{generation:1});await meta.call('atomic',{generation:1});await meta.call('append',{generation:1});
  const json=join(h.root,'builder','metadata.json'),index=join(h.root,'builder','session_index.jsonl');
  assert.equal(JSON.parse(fs.readFileSync(json,'utf8')).generation,1);
  assert.equal(JSON.parse(fs.readFileSync(index,'utf8').trim().split('\n').at(-1)!).generation,1);
  const bytes=fs.readFileSync(json),events=await meta.call('transient');assert.deepEqual(fs.readFileSync(json),bytes);
  assert.equal(fs.existsSync(h.source+'-journal'),false);assert.equal(events.writes,2);assert.equal(events.creates,1);
  await meta.call('partial');assert.throws(()=>JSON.parse(fs.readFileSync(json,'utf8')));
  await meta.call('partial-index');assert.throws(()=>fs.readFileSync(index,'utf8').trim().split('\n').map(line=>JSON.parse(line)));
  await meta.call('atomic',{generation:2});await meta.call('truncate',{generation:2});assert.equal(fs.readFileSync(index,'utf8').trim().split('\n').length,1);
  t.diagnostic('Valid DB generation 0 with valid JSON/index generation 1; transient writes/create/delete occurred despite identical final JSON bytes and absent transient file.');
}));

test('live backup cancellation before opening, during progress and before publication',options,async t=>fixture(t,async h=>{
  const writer=await h.worker('writer');await writer.call('open');const reader=await h.worker('reader');
  assert.equal((await reader.call('cancel-before')).opened,false);assert.equal(fs.existsSync(h.destination),false);
  const attempt=reader.call('backup',{rate:1,gate:true});await reader.step();fs.writeFileSync(h.gate,'cancel');const cancelled=await attempt;
  assert.equal(cancelled.cancelled,true);assert.equal(cancelled.boundedStop,false);await reader.call('close');
  const makeSnapshot=()=>new ExplorerSnapshot(reconcile({namespace:'synthetic-live-research',from:'2026-10-11T00:00:00Z',through:'2026-10-11T00:00:01Z'},
    {rowsRead:0,omittedRows:0,ambiguousIds:0,titles:'unavailable',projects:'unavailable',unconsumedColumns:false,correspondence:'unknown'},[],[],[]));
  let ready!:()=>void,release!:()=>void,candidate:ExplorerSnapshot|undefined,runs=0;
  const completed=new Promise<void>(resolve=>{ready=resolve;}),publication=new Promise<void>(resolve=>{release=resolve;});
  const session=new ExplorerSession({scope:'c'.repeat(64),acquire:async()=>{
    if(++runs===1)return {snapshot:makeSnapshot()};
    const copied=await reader.call('backup',{rate:1});assert.equal(copied.integrity,true);await reader.call('close');
    candidate=makeSnapshot();ready();await publication;return {snapshot:candidate};
  }});
  try{
    session.refresh();await session.settled();const previous=session.snapshot().data;
    session.refresh();await bounded(completed);session.cancel();release();await session.settled();
    assert.equal(session.snapshot().data,previous);assert.equal(session.state().revision,1);
    assert.equal(session.state().attempt?.outcome,'cancelled');assert.equal(candidate!.take(),undefined);
  }finally{release();await session.close();}
  assert.equal(((await writer.call('checkpoint')).checkpoint as Reply).busy,0);
  t.diagnostic(JSON.stringify({cancelledAtProgress:true,cancelMs:cancelled.milliseconds,destinationBytesAfterSuccess:fs.statSync(h.destination).size,
    publication:'accepted session controller retained prior synthetic snapshot; cancelled candidate discarded'}));
}));

test('live acquirer crash and supervisor disconnect release only owned child handles',options,async t=>fixture(t,async h=>{
  const writer=await h.worker('writer');await writer.call('open');const reader=await h.worker('reader');
  const attempt=reader.call('backup',{rate:1,gate:true}).catch(()=>({exited:true}));await reader.step();await reader.crash();await attempt;
  assert.equal(((await writer.call('checkpoint')).checkpoint as Reply).busy,0);
  const second=await h.worker('reader');fs.writeFileSync(h.gate,'wait');
  const abandoned=second.call('backup',{rate:1,gate:true}).catch(()=>({exited:true}));await second.step();second.child.disconnect();
  await second.exited;await abandoned;assert.equal(((await writer.call('checkpoint')).checkpoint as Reply).busy,0);
  t.diagnostic(JSON.stringify({acquirerCrash:'confirmed exit',supervisorDisconnect:'gate deadline then disposal',partialDestinationPresent:fs.existsSync(h.destination)}));
}));

test('live writer crash retains committed WAL; read-only backup must be assessed for recovery side effects',options,async t=>fixture(t,async h=>{
  const writer=await h.worker('writer');await writer.call('open');await writer.call('commit',{generation:3});await writer.call('uncommitted',{generation:4});await writer.crash();
  const before=measure(h.source),reader=await h.worker('reader'),result=await reader.call('backup',{rate:1});
  assert.equal(result.generation,3);assert.equal(result.consistent,true);assert.equal(result.integrity,true);
  await reader.call('close');const after=measure(h.source),comparable=before[2]?.hash!=null&&after[2]?.hash!=null;
  t.diagnostic(JSON.stringify({committedGeneration:3,uncommittedGenerationExcluded:true,shmHashesComparable:comparable,
    shmChanged:comparable?before[2]!.hash!==after[2]!.hash:'unobserved',sourceSetChanged:before.map(v=>v!==null).join()!==after.map(v=>v!==null).join()}));
}));
