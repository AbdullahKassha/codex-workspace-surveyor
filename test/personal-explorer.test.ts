import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { inspect } from 'node:util';
import { syncBuiltinESMExports } from 'node:module';
import { EventEmitter } from 'node:events';
import { spawnSync } from 'node:child_process';
import { explorerFixture } from './support/explorer-fixture.js';
import { runExplorerEntry } from './support/explorer-entry.js';
import { preparePersonalExplorer, visibleExplorerInput } from './support/personal-explorer-entry.js';
import { runPersonalExplorer, runTitledExplorerPreparation, explorerPreflightSafety, CanarySession,
  type CanaryOptions, type CanaryResult } from './support/personal-canary.js';
import { ExplorerSnapshot, reconcile } from '../src/explorer/model.js';
import { escapeStored } from '../src/explorer/view.js';

const secret='SYNTHETIC_TITLED_PRIVATE';
const context={enabled:true,nodeVersion:'24.18.1',executable:'C:\\Synthetic\\PowerShell\\pwsh.exe',scratchParent:'C:\\Synthetic\\Temp'};
const source='C:\\Synthetic\\selected.sqlite';
const consent='AUTHORIZE ONE TITLED BROWSER RUN';
const empirical={skip:process.platform!=='win32'||process.env.WORKSPACE_SURVEYOR_RUN_CANARY_PREPARATION!=='1'||
  process.env.WORKSPACE_SURVEYOR_RUN_EXPLORER_PREPARATION!=='1',concurrency:false};
const provenance={namespace:'synthetic-browser',from:'2026-10-08T00:00:00.000Z',through:'2026-10-08T00:00:01.000Z'};
function sanitized(value:unknown){assert.equal(JSON.stringify(value).includes(secret),false);assert.equal(inspect(value).includes(secret),false);}
function personal():CanaryOptions{return {executable:context.executable,analysis:'explorer',selection:{kind:'personal',private:{
  source,scratchParent:context.scratchParent,writers:['ChatGPT','Codex'],consent:true,actualValueConsent:true,titleConsent:true,browserConsent:true}}};}
function options(f:ReturnType<typeof explorerFixture>,extra:Partial<CanaryOptions>={}):CanaryOptions{
  const hook=extra.hook;
  return {executable:process.env.WORKSPACE_SURVEYOR_HELPER_PWSH??'',analysis:'explorer',selection:f.selection,closure:()=> 'absent',
    ...extra,hook:async(phase,scratch)=>{if(phase==='initialized')f.scratches.push(scratch);await hook?.(phase,scratch);}};
}
function deferred<T>(){let resolve!:(value:T)=>void,reject!:(value:unknown)=>void;
  const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}

for(const missing of ['base','explorer','consent','actual','title','browser','json','hook','phase-hook','closure-hook','cleanup-hook',
  'frame-hook','spawn-hook','qualification-hook','exit-uncertainty','fault'] as const)
test('personal browser '+missing+' refuses before filesystem access or helper startup',async()=>{
  const keys=['WORKSPACE_SURVEYOR_PERSONAL_CANARY','WORKSPACE_SURVEYOR_PERSONAL_EXPLORER'];
  const saved=keys.map(k=>process.env[k]),stat=fs.lstatSync,start=CanarySession.prototype.start;let touched=0;
  try{
    process.env[keys[0]!]=missing==='base'?'0':'1';process.env[keys[1]!]=missing==='explorer'?'0':'1';
    Reflect.set(fs,'lstatSync',()=>{touched++;throw new Error(secret);});syncBuiltinESMExports();
    CanarySession.prototype.start=function(){touched++;throw new Error(secret);};
    const o=personal();if(o.selection.kind!=='personal')throw 0;const p=o.selection.private;
    if(missing==='consent')p.consent=false as never;
    if(missing==='actual')delete p.actualValueConsent;if(missing==='title')delete p.titleConsent;if(missing==='browser')delete p.browserConsent;
    if(missing==='json')o.explorer={globalState:secret};if(missing==='hook')o.inspectHook=()=>{throw new Error(secret);};
    if(missing==='phase-hook')o.hook=()=>{};if(missing==='closure-hook')o.closure=()=> 'absent';
    if(missing==='cleanup-hook')o.cleanupFault=()=>{};if(missing==='frame-hook')o.corruptFrame=x=>x;
    if(missing==='spawn-hook')o.afterSpawn=()=>{};if(missing==='qualification-hook')o.qualificationHook=()=>{};
    if(missing==='exit-uncertainty')o.simulateExitUncertainty=true;if(missing==='fault')o.fault='none';
    const r=await runPersonalExplorer(o);assert.equal(touched,0);assert.equal(r.safety.attemptConsumed,false);
    assert.equal(r.snapshot,undefined);assert.equal(r.summary,undefined);sanitized(r);
  }finally{Reflect.set(fs,'lstatSync',stat);syncBuiltinESMExports();CanarySession.prototype.start=start;
    keys.forEach((key,i)=>{if(saved[i]===undefined)delete process.env[key];else process.env[key]=saved[i];});}
});

for(const fault of ['disabled','runtime','host','source','confirmation','cancel'] as const)
test('titled browser input '+fault+' stays outside the operation boundary',async()=>{
  const abort=new AbortController(),output:string[]=[];let asked=0;
  const input=async()=>{asked++;if(fault==='cancel'){abort.abort();throw new Error(secret);}
    return asked===1?(fault==='source'?'relative.sqlite':source):fault==='confirmation'?'NO':consent;};
  await assert.rejects(preparePersonalExplorer(input,s=>output.push(s),{...context,enabled:fault!=='disabled',
    nodeVersion:fault==='runtime'?'0':context.nodeVersion,executable:fault==='host'?'pwsh.exe':context.executable},abort.signal),
    e=>e instanceof Error&&!e.message.includes(secret));
  assert.equal(output.join('').includes(secret),false);assert.equal(explorerPreflightSafety.attemptConsumed,false);
});
test('titled browser derives fixed input policy and confirmation alone performs no operation',async()=>{
  const answers=[source,consent],prompts:string[]=[],output:string[]=[];
  const o=await preparePersonalExplorer(async p=>{prompts.push(p);return answers.shift()!;},s=>output.push(s),context,new AbortController().signal);
  assert.equal(prompts.length,2);assert.match(output.join(''),/ChatGPT,Codex/);assert.ok(output.join('').includes(escapeStored(context.scratchParent)));
  assert.equal(o.explorer,undefined);assert.equal(o.analysis,'explorer');
  if(o.selection.kind!=='personal')throw 0;
  assert.equal(o.selection.private.titleConsent,true);assert.equal(o.selection.private.browserConsent,true);
});
test('titled browser cancellation after accepted confirmation still prevents operation startup',async()=>{
  const abort=new AbortController();let calls=0;
  await assert.rejects(preparePersonalExplorer(async()=>{if(++calls===2){abort.abort();return consent;}return source;},()=>{},context,abort.signal));
  assert.equal(calls,2);
});
test('private browser entry rejects arguments/nonterminal invocation without personal access',()=>{
  const r=spawnSync(process.execPath,['dist/test/support/personal-explorer-entry.js',secret],{encoding:'utf8',env:{...process.env,
    WORKSPACE_SURVEYOR_PERSONAL_CANARY:'0',WORKSPACE_SURVEYOR_PERSONAL_EXPLORER:'0'}});
  assert.equal(r.status,1);assert.equal(r.stdout.includes(secret),false);assert.equal(r.stderr.includes(secret),false);
  const report=JSON.parse(r.stdout.trim());assert.equal(report.safety.attemptConsumed,false);assert.equal(report.safety.cleanup,'removed');
  assert.deepEqual(report.fixtureCleanup,{beforeDelivery:'not-run',final:'not-run'});
});
test('structural Project acceptance alone cannot establish correspondence or membership',()=>{
  const d=reconcile(provenance,{rowsRead:1,omittedRows:0,ambiguousIds:0,titles:'accepted',projects:'structure-qualified',
    unconsumedColumns:true,correspondence:'unknown'},[{id:'a',cwd:'same',title:'Synthetic',ambiguous:false}],
    [{id:'p',label:'Synthetic Project',roots:['same']}],[{threadId:'a',projectId:'p'}]);
  assert.deepEqual(d.memberships,['unknown']);assert.equal(d.relations.some(r=>r.kind==='assigned-project'),false);
  assert.equal(d.relations.some(r=>r.kind==='matches-exact-root'),true);
});

class Input extends EventEmitter {
  isTTY=true;isRaw=false;readable=true;readableEnded=false;destroyed=false;raw:boolean[]=[];paused=false;
  setRawMode(value:boolean){this.isRaw=value;this.raw.push(value);return this;}
  setEncoding(){return this;}resume(){return this;}pause(){this.paused=true;return this;}
}
for(const end of ['already-ended','abort','end','close','ctrl-c','oversized','success'] as const)
test('visible browser prompts handle '+end+' and restore terminal',async()=>{
  const input=new Input(),abort=new AbortController(),out:string[]=[];
  if(end==='already-ended')input.readableEnded=true;
  const p=visibleExplorerInput('Selected source',abort.signal,input,{isTTY:true,write:s=>{out.push(String(s));return true;}});
  if(end==='success')input.emit('data',source+'\r');
  else if(end==='abort')abort.abort();else if(end==='end'||end==='close')input.emit(end);
  else if(end==='ctrl-c')input.emit('data','\x03');else if(end==='oversized')input.emit('data','a'.repeat(2049));
  if(end==='success')assert.equal(await p,source);else await assert.rejects(p);
  assert.equal(input.isRaw,false);assert.equal(input.listenerCount('data'),0);assert.equal(input.listenerCount('end'),0);
  assert.equal(input.listenerCount('error'),0);assert.equal(input.listenerCount('close'),0);
  if(end!=='already-ended')assert.equal(input.paused,true);
});
test('cancellation while printing the visible prompt cannot reenable raw mode',async()=>{
  const input=new Input(),abort=new AbortController();let calls=0;
  await assert.rejects(visibleExplorerInput('Selected source',abort.signal,input,{isTTY:true,write:()=>{
    if(++calls===1)abort.abort();return true;
  }}));
  assert.equal(input.isRaw,false);assert.deepEqual(input.raw,[false]);assert.equal(input.listenerCount('data'),0);
});

for(const phase of ['construction','startup'] as const)test('titled browser personal boundary '+phase+' fault without real-slot access',empirical,async()=>{
  const f=explorerFixture(),start=CanarySession.prototype.start,stringify=JSON.stringify;
  const keys=['WORKSPACE_SURVEYOR_PERSONAL_CANARY','WORKSPACE_SURVEYOR_PERSONAL_EXPLORER'],saved=keys.map(k=>process.env[k]);
  let constructed=false,started=false;
  try{
    CanarySession.prototype.start=function(){started=true;throw new Error(secret);};
    JSON.stringify=function(value:unknown,...rest:unknown[]){
      if(value&&typeof value==='object'&&'operation' in value&&value.operation==='locate'){
        constructed=true;if(phase==='construction')throw new Error(secret);
      }return Reflect.apply(stringify,JSON,[value,...rest]);
    } as typeof JSON.stringify;
    keys.forEach(key=>{process.env[key]='1';});
    const o=personal();o.executable=options(f).executable;if(o.selection.kind!=='personal')throw 0;
    o.selection.private.source=f.source;o.selection.private.scratchParent=fs.realpathSync(tmpdir());
    const r=await runPersonalExplorer(o);assert.equal(constructed,true);assert.equal(started,phase==='startup');
    assert.equal(r.safety.attemptConsumed,phase==='startup');assert.equal(r.snapshot,undefined);assert.equal(r.safety.cleanup,'removed');
    assert.equal(fs.existsSync(join(f.run.root,'recovery')),false);sanitized(r);
  }finally{CanarySession.prototype.start=start;JSON.stringify=stringify;
    keys.forEach((key,i)=>{if(saved[i]===undefined)delete process.env[key];else process.env[key]=saved[i];});assert.equal(await f.teardown(),true);}
});

for(const wal of [false,true])test('protected titled-only browser acquisition'+(wal?' with WAL/SHM':''),empirical,async()=>{
  const f=explorerFixture(undefined,wal),before=fs.readFileSync(f.source);let copied=false;
  try{
    const r=await runTitledExplorerPreparation(options(f,{hook:(phase,scratch)=>{
      if(phase==='copied'){copied=true;assert.equal(scratch.copyNames.includes('global-state.json'),false);}
    }}));
    assert.equal(copied,true);assert.equal(r.safety.status,'passed');assert.equal(r.safety.attemptConsumed,true);
    assert.equal(r.safety.mapping,undefined);assert.equal(r.safety.files,wal?3:1);assert.equal(r.safety.cleanup,'removed');
    assert.equal(r.safety.recovery,'removed');assert.equal(r.summary?.titles,'accepted');assert.equal(r.summary?.projects,'unavailable');
    const d=r.snapshot!.take()!;assert.equal(d.threads.length,4);assert.equal(d.threads[0]?.title,'Fix parser boundaries');
    assert.deepEqual(d.memberships,['unknown','unknown','unknown','unknown']);assert.equal(d.projects.length,0);
    assert.equal(fs.readFileSync(f.source).equals(before),true);sanitized(r);
  }finally{assert.equal(await f.teardown(),true);}
});
for(const shape of ['missing-title','title-fallback','partial','empty','incompatible','overflow'] as const)
test('protected titled browser '+shape+' capability outcome',empirical,async()=>{
  const f=explorerFixture(db=>{
    db.exec(shape==='missing-title'?'CREATE TABLE threads(id TEXT,cwd TEXT)':
      shape==='incompatible'?'CREATE TABLE threads(id TEXT,cwd INTEGER,title TEXT)':'CREATE TABLE threads(id TEXT,cwd TEXT,title TEXT)');
    if(shape==='empty'||shape==='incompatible')return;
    if(shape==='missing-title'){db.prepare('INSERT INTO threads VALUES(?,?)').run('a','cwd');return;}
    const insert=db.prepare('INSERT INTO threads VALUES(?,?,?)');insert.run('a','cwd',secret);
    if(shape==='title-fallback'){db.exec('DELETE FROM threads');insert.run('a','cwd',null);insert.run('b','cwd','');insert.run('c','cwd',Buffer.from([1,2]));}
    if(shape==='partial')insert.run('b',null,secret);
    if(shape==='overflow')for(let i=1;i<=1000;i++)insert.run('id'+i,'cwd','Title');
  });
  try{
    const r=await runTitledExplorerPreparation(options(f));assert.equal(r.safety.attemptConsumed,true);
    assert.equal(r.safety.cleanup,'removed');assert.equal(r.safety.recovery,'removed');sanitized(r);
    if(['empty','incompatible','overflow'].includes(shape)){assert.equal(r.snapshot,undefined);assert.equal(r.summary,undefined);
      assert.equal(r.safety.status,'refused');assert.equal(r.safety.reason,shape==='overflow'?'limit':shape==='incompatible'?'unsupported':'analysis');}
    else{assert.equal(r.safety.status,'passed');assert.equal(r.summary?.omittedRows,shape==='partial'?1:0);
      assert.equal(r.summary?.titles,shape==='missing-title'?'unavailable':'accepted');
      if(shape==='title-fallback')assert.equal(r.snapshot!.take()!.threads.every(t=>t.title===null),true);else r.snapshot!.discard();}
  }finally{assert.equal(await f.teardown(),true);}
});
test('titled browser preflight closure refusal is unconsumed; first source failure is consumed',empirical,async()=>{
  const f=explorerFixture(),stat=fs.lstatSync;let reached=false;
  try{
    const preflight=await runTitledExplorerPreparation(options(f,{closure:()=> 'present'}));assert.equal(preflight.safety.attemptConsumed,false);
    Reflect.set(fs,'lstatSync',(p:fs.PathLike,...rest:unknown[])=>{if(p===f.run.root){reached=true;throw new Error(secret);}return Reflect.apply(stat,fs,[p,...rest]);});syncBuiltinESMExports();
    const r=await runTitledExplorerPreparation(options(f));assert.equal(reached,true);assert.equal(r.safety.attemptConsumed,true);sanitized(r);
  }finally{Reflect.set(fs,'lstatSync',stat);syncBuiltinESMExports();assert.equal(await f.teardown(),true);}
});
for(const fault of ['cleanup','acquisition-change','source-change','partial-copy','exit'] as const)
test('titled browser withholds snapshot/summary after '+fault,empirical,async()=>{
  const f=explorerFixture();let reached=false;
  try{
    const extra:Partial<CanaryOptions>=fault==='cleanup'?{cleanupFault:()=>{reached=true;throw new Error(secret);}}:
      fault==='partial-copy'?{fault:'partial-copy',hook:phase=>{if(phase==='prepared')reached=true;}}:
      fault==='exit'?{simulateExitUncertainty:true,hook:phase=>{if(phase==='verified')reached=true;}}:
      {hook:(phase,scratch)=>{if(phase===(fault==='source-change'?'prepared':'analyzed')){
        reached=true;fs.appendFileSync(fault==='source-change'?f.source:scratch.path('acquisition',0),' ');
      }}};
    const r=await runTitledExplorerPreparation(options(f,extra));assert.equal(reached,true);assert.equal(r.snapshot,undefined);assert.equal(r.summary,undefined);
    assert.equal(r.safety.status,'refused');assert.equal(r.safety.attemptConsumed,true);sanitized(r);
    assert.equal(fs.existsSync(f.source),true);assert.equal(fs.existsSync(join(f.run.sources,'wal.sqlite')),true);
    if(fault==='source-change'||fault==='acquisition-change')assert.equal(r.safety.reason,'unstable');
    if(fault==='partial-copy'){assert.equal(r.safety.evidence.partialWritten,true);assert.equal(r.safety.evidence.fault,'after-partial-write');}
    if(fault==='cleanup'||fault==='exit'){assert.equal(r.safety.cleanup,'residual');assert.equal(r.safety.recovery,'available');
      assert.equal(fs.existsSync(join(f.run.root,'recovery','record')),true);}
  }finally{assert.equal(await f.teardown(),true);}
});

// Controlled lifecycle tests share the reviewed shutdown implementation, no sockets/fixtures.
for(const phase of ['acquisition','startup','final-close','normal'] as const)
test('personal browser lifecycle '+phase+' preserves safety, summary privacy and ownership',async()=>{
  const signals=new EventEmitter(),output:string[]=[],acquire=deferred<void>(),startup=deferred<void>(),close=deferred<void>();
  const started=deferred<void>(),acquired=deferred<void>(),closing=deferred<void>(),published=deferred<void>(),closed=deferred<void>();
  const snapshot=new ExplorerSnapshot(reconcile(provenance,{rowsRead:1,omittedRows:0,ambiguousIds:0,titles:'accepted',
    projects:'unavailable',unconsumedColumns:true,correspondence:'unknown'},[{id:secret,cwd:secret,title:secret,ambiguous:false}],[],[]));
  const safety:CanaryResult={...explorerPreflightSafety,status:'passed',reason:'none',attemptConsumed:true,
    evidence:{...explorerPreflightSafety.evidence,exitConfirmed:true}};
  const summary={rowsRead:1,claims:1,omittedRows:0,ambiguousIds:0,titles:'accepted' as const,projects:'unavailable' as const,unconsumedColumns:true};
  let starts=0,closes=0,settled=false;
  const server={url:'http://127.0.0.1:12345/#synthetic-session',closed:closed.promise,close:async()=>{
    closes++;closing.resolve();await close.promise;closed.resolve();}};
  const done=runExplorerEntry({personal:true,signals,write:s=>{output.push(s);if(s===server.url)published.resolve();},
    createFixture:()=>({acquire:async()=>{acquired.resolve();await acquire.promise;return {safety,snapshot,summary};}}),
    start:async cap=>{starts++;assert.ok(cap.take());started.resolve();await startup.promise;return server;}});
  void done.then(()=>{settled=true;});await acquired.promise;
  if(phase==='acquisition')signals.emit('SIGINT');acquire.resolve();
  if(phase!=='acquisition'){
    await started.promise;if(phase==='startup')signals.emit('SIGTERM');startup.resolve();
    if(phase!=='startup'){await published.promise;closed.resolve();}
    await closing.promise;assert.equal(settled,false);if(phase==='final-close')signals.emit('SIGINT');close.resolve();
  }
  assert.equal(await done,phase==='normal'?0:1);assert.equal(signals.listenerCount('SIGINT'),0);assert.equal(signals.listenerCount('SIGTERM'),0);
  assert.deepEqual(snapshot.toJSON(),{capability:'local-explorer',available:false});assert.equal(output.join('').includes(secret),false);
  const report=JSON.parse(output.at(-1)!);assert.deepEqual(report.safety,safety);
  assert.deepEqual(report.fixtureCleanup,{beforeDelivery:'not-run',final:'not-run'});
  assert.equal(report.explorer!==undefined,phase==='normal');
  assert.equal(output.includes(server.url),phase==='normal'||phase==='final-close');assert.equal(starts,phase==='acquisition'?0:1);
  assert.equal(closes,phase==='acquisition'?0:1);
});
