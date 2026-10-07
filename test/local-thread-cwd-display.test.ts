import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { PassThrough, Writable } from 'node:stream';
import { EventEmitter } from 'node:events';
import net from 'node:net';
import https from 'node:https';
import { inspect } from 'node:util';
import { syncBuiltinESMExports } from 'node:module';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { AdapterResult } from './support/thread-cwd-adapter.js';
import { LocalMapCapability, LocalMapDelivery } from './support/local-thread-cwd-capability.js';
import { quoteStored, supportedTerminal, viewLocalMap, viewerControls } from './support/local-thread-cwd-viewer.js';
import { prepareLocalDisplay } from './support/personal-thread-cwd-display-entry.js';
import { SyntheticRun } from './support/synthetic-acquisition.js';
import { CanaryScratch, CanarySession, runThreadCwdDisplay, recoverCanary, selectedPaths,
  forgetRecoveredSyntheticResidual, type CanaryOptions, type CanaryResult } from './support/personal-canary.js';

const secret='SYNTHETIC_LOCAL_DISPLAY';
const empirical={skip:process.platform!=='win32'||process.env.WORKSPACE_SURVEYOR_RUN_CANARY_PREPARATION!=='1',concurrency:false};
const provenance={namespace:'synthetic-source',from:'2026-10-07T00:00:00.000Z',through:'2026-10-07T00:00:01.000Z'};
function map(claims=[{recordId:secret,storedCwd:'C:\\Synthetic\\cwd',ambiguousId:false}],omitted=0){
  return new AdapterResult({status:'ready',reason:'none',policy:'threads-id-cwd-v1',traversal:'complete-within-selected-table',
    interpretation:omitted||claims.some(c=>c.ambiguousId)?'partial':'complete-within-selected-table',rowsRead:claims.length+omitted,
    claims:claims.length,omittedRows:omitted,ambiguousIds:new Set(claims.filter(c=>c.ambiguousId).map(c=>c.recordId)).size,
    cwdGroups:new Set(claims.map(c=>c.storedCwd)).size,unconsumedColumns:true},claims,provenance);
}
function safety(m:AdapterResult):CanaryResult{return {status:'passed',reason:'none',cleanup:'removed',recovery:'removed',files:1,
  schemaReadable:true,sourcesStable:true,mapping:m.summary,attemptConsumed:true,
  evidence:{stages:['verified'],phase:'release',fault:'none',partialWritten:false,opened:1,exitConfirmed:true,diagnosticsDiscarded:false}};}
function terminal(action:(input:PassThrough,frame:string,index:number)=>void= input=>input.write('q')){
  const input=new PassThrough() as PassThrough & {isTTY:boolean;isRaw:boolean;setRawMode:(raw:boolean)=>void};
  const modes:boolean[]=[];input.isTTY=true;input.isRaw=false;input.setRawMode=raw=>{input.isRaw=raw;modes.push(raw);};
  const writes:string[]=[],frames:string[]=[];
  const output=Object.assign(new EventEmitter(),{isTTY:true,columns:80,rows:24,destroyed:false,closed:false,errored:null,write:(chunk:unknown,callback?:(error?:Error|null)=>void)=>{
    const value=String(chunk);writes.push(value);
    if(value.startsWith(viewerControls.clear)&&value.includes('Page ')){frames.push(value);queueMicrotask(()=>action(input,value,frames.length));}
    if(callback)queueMicrotask(()=>callback());
    return true;
  }});
  return {input,output,supported:true,modes,writes,frames};
}
function sanitized(value:unknown){assert.equal(JSON.stringify(value).includes(secret),false);assert.equal(inspect(value).includes(secret),false);}

test('blocker 1: already-ended, destroyed and non-readable input terminates and restores promptly',{timeout:2000},async()=>{
  for(const state of ['ended','destroyed','destroyed-error','non-readable']){
    const t=terminal(()=>{});
    try{
      if(state==='ended'){const ended=new Promise<void>(resolve=>t.input.once('end',resolve));t.input.end();t.input.resume();await ended;}
      else if(state==='destroyed'){const closed=new Promise<void>(resolve=>t.input.once('close',resolve));t.input.destroy();await closed;}
      else if(state==='destroyed-error')t.input.destroy(new Error(secret));
      else Object.defineProperty(t.input,'readable',{value:false});
      const cap=new LocalMapCapability(map());
      const result=await viewLocalMap(cap,t);assert.equal(result,state==='destroyed-error'?'failed':'closed');sanitized(result);assert.deepEqual(t.modes,[true,false]);
      assert.equal(t.writes.at(-1),viewerControls.exit);assert.equal(t.input.isRaw,false);assert.equal(cap.take(),undefined);
      for(const event of ['data','end','close','error'])assert.equal(t.input.listenerCount(event),0);
    }finally{t.input.destroy();}
  }
});

test('blocker 2: restoration awaits an asynchronous Writable success or handled failure',{timeout:2000},async()=>{
  for(const fail of [false,true]){
    const t=terminal(()=>{});let settled=false,release:(()=>void)|undefined;
    let started!:()=>void;const restorationStarted=new Promise<void>(resolve=>{started=resolve;});
    const output=Object.assign(new Writable({write(chunk,_encoding,callback){
      const value=chunk.toString();
      if(value===viewerControls.exit){release=()=>callback(fail?new Error(secret):undefined);started();}
      else{if(value.startsWith(viewerControls.clear))queueMicrotask(()=>t.input.write('q'));callback();}
    }}),{isTTY:true,columns:80,rows:24});
    const cap=new LocalMapCapability(map());
    const closed=new Promise<void>(resolve=>output.once('close',resolve));
    const viewing=viewLocalMap(cap,{input:t.input,output,supported:true}).then(status=>{settled=true;return status;});
    try{
      await restorationStarted;await Promise.resolve();assert.equal(settled,false);
      assert.equal(t.input.isRaw,false);assert.equal(output.listenerCount('error'),1);
      release!();release=undefined;
      const result=await viewing;assert.equal(result,fail?'failed':'closed');sanitized(result);
      if(fail)await closed;
      assert.equal(output.listenerCount('error'),0);assert.equal(cap.take(),undefined);
      assert.equal(Boolean(output.errored),fail);
    }finally{release?.();await viewing;t.input.destroy();output.destroy();}
  }
});

test('restoration failure retains its guard beyond setImmediate until delayed destruction settles',{timeout:2000},async()=>{
  for(const emitClose of [true,false]){
    const t=terminal(()=>{});let releaseDestroy:(()=>void)|undefined,destructionStarted=false;
    const writes:string[]=[];
    const output=Object.assign(new Writable({emitClose,write(chunk,_encoding,callback){
      const value=chunk.toString();writes.push(value);
      if(value===viewerControls.exit)callback(new Error(secret));
      else{if(value.startsWith(viewerControls.clear))queueMicrotask(()=>t.input.write('q'));callback();}
    },destroy(error,callback){destructionStarted=true;releaseDestroy=()=>callback(error);}}),{isTTY:true,columns:80,rows:24});
    const cap=new LocalMapCapability(map());
    try{
      const result=await viewLocalMap(cap,{input:t.input,output,supported:true});
      assert.equal(result,'failed');sanitized(result);assert.equal(destructionStarted,true);
      assert.deepEqual(t.modes,[true,false]);assert.equal(t.input.isRaw,false);
      assert.equal(writes.at(-1),viewerControls.exit);assert.equal(cap.take(),undefined);
      // These turns reproduce the old guard's removal point; they are not the
      // completion signal. _destroy remains held until the explicit release.
      await new Promise<void>(resolve=>setImmediate(()=>setImmediate(resolve)));
      const guards=output.listenerCount('error');assert.ok(guards>0);
      for(let i=0;i<3;i++){
        const retry=new LocalMapCapability(map());
        assert.equal(await viewLocalMap(retry,{input:t.input,output,supported:true}),'failed');
        assert.equal(retry.take(),undefined);assert.equal(output.listenerCount('error'),guards);
      }
      let notify!:()=>void,notifications=0;
      const notified=new Promise<void>(resolve=>{notify=resolve;});
      const emit=output.emit;
      // Observe after dispatch without supplying a harness error listener that
      // could mask a missing viewer guard and prevent the uncaught-error case.
      output.emit=function(event:string|symbol,...args:unknown[]){const result=Reflect.apply(emit,this,[event,...args]);
        if(event==='error'){notifications++;notify();}return result;};
      const closed=emitClose?new Promise<void>(resolve=>output.once('close',resolve)):undefined;
      releaseDestroy!();releaseDestroy=undefined;await notified;if(closed)await closed;
      assert.equal(notifications,1);
      assert.equal(output.closed,true);assert.equal(output.listenerCount('error'),0);
      assert.equal(await viewLocalMap(new LocalMapCapability(map()),{input:t.input,output,supported:true}),'failed');
      assert.equal(output.listenerCount('error'),0);
      for(const event of ['close','finish','end'])assert.equal(output.listenerCount(event),0);
      for(const event of ['data','end','close','error'])assert.equal(t.input.listenerCount(event),0);
    }finally{releaseDestroy?.();t.input.destroy();output.destroy();}
  }
});

test('local capability and delivery expose only summaries and permit one take',()=>{
  const m=map(),cap=new LocalMapCapability(m),delivery=new LocalMapDelivery(safety(m),cap);
  sanitized(cap);sanitized(delivery);assert.equal(delivery.takeDisplay(),cap);assert.equal(delivery.takeDisplay(),undefined);
  assert.equal(cap.take(),m);assert.equal(cap.take(),undefined);
});
for(const fault of ['status','cleanup','recovery','stable','exit','mapping'] as const)test(`local delivery withholds capability on ${fault}`,()=>{
  const m=map(),s=safety(m),cap=new LocalMapCapability(m);
  const bad={...s,...(fault==='status'?{status:'refused' as const}:{}),...(fault==='cleanup'?{cleanup:'residual' as const}:{}),
    ...(fault==='recovery'?{recovery:'available' as const}:{}),...(fault==='stable'?{sourcesStable:false}:{}),
    ...(fault==='exit'?{evidence:{...s.evidence,exitConfirmed:false}}:{}),...(fault==='mapping'?{mapping:null}:{})};
  const delivery=new LocalMapDelivery(bad,cap);assert.equal(delivery.takeDisplay(),undefined);assert.equal(cap.take(),undefined);sanitized(delivery);
});
test('stored strings are reversibly escaped without controls, bidi, normalization or surrogate repair',()=>{
  const values=['"\\\x00\x1b]8;;https://synthetic.invalid\x07','\x80\u202e\u2066\u200b\u2028\ud800\udfff','é','e\u0301','\\\\server\\share','\\\\?\\C:\\Synthetic','a\r\nb'];
  for(const value of values){const encoded=quoteStored(value);assert.equal(JSON.parse(encoded),value);assert.match(encoded,/^[\x20-\x7e]+$/);}
  assert.notEqual(quoteStored(values[2]!),quoteStored(values[3]!));
});
test('terminal support is an explicit compatibility indicator, never a recording guarantee',()=>{
  assert.equal(supportedTerminal({}),false);assert.equal(supportedTerminal({TERM:'dumb'}),false);
  assert.equal(supportedTerminal({WT_SESSION:'synthetic'}),true);assert.equal(supportedTerminal({TERM:'xterm-256color'}),true);
});
for(const defect of ['unsupported','redirected','small','invalid-dimensions'] as const)test(`viewer ${defect} refuses without private output`,async()=>{
  const t=terminal(),cap=new LocalMapCapability(map());
  if(defect==='unsupported')t.supported=false;if(defect==='redirected')t.output.isTTY=false;
  if(defect==='small')t.output.rows=12;if(defect==='invalid-dimensions')t.output.columns=NaN;
  assert.equal(await viewLocalMap(cap,t),'refused');assert.equal(cap.take(),undefined);assert.equal(t.writes.length,0);t.input.destroy();
});
test('viewer preserves groups, individual duplicate claims, partial coverage and provenance',async()=>{
  const claims=[{recordId:'duplicate',storedCwd:'C:\\Synthetic',ambiguousId:true},
    {recordId:'duplicate',storedCwd:'C:\\Synthetic',ambiguousId:true},{recordId:'duplicate',storedCwd:'c:\\Synthetic',ambiguousId:true}];
  const t=terminal((input,_frame,i)=>input.write(i<6?'n':'q'));
  assert.equal(await viewLocalMap(new LocalMapCapability(map(claims,2)),t),'closed');
  const text=t.frames.join('');for(const value of ['partial','omitted 2','ambiguous 1','unconsumed columns: yes','synthetic-source','after cleanup','Group 2 / 2','Record 3 [AMBIGUOUS ID]'])assert.equal(text.includes(value),true);
  assert.deepEqual(t.modes,[true,false]);assert.equal(t.writes.at(-1),viewerControls.exit);t.input.destroy();
});
test('viewer wraps all escaped values without truncation and supports previous-page navigation',async()=>{
  const cwd='\u202e'+('\\xé'.repeat(1500)),id='opaque-'+('y'.repeat(10000));const seen=new Set<string>();
  const t=terminal((input,frame)=>{if(seen.has(frame))input.write('q');else{seen.add(frame);input.write('n');}});
  assert.equal(await viewLocalMap(new LocalMapCapability(map([{recordId:id,storedCwd:cwd,ambiguousId:false}])),t),'closed');
  const fields=[...seen].flatMap(f=>f.split('\r\n').filter(l=>l.startsWith('  ')).map(l=>l.startsWith('  + ')?l.slice(4):l.slice(2))).join('');
  assert.equal(fields,[provenance.namespace,provenance.from,provenance.through,cwd,id].map(quoteStored).join(''));
  for(const frame of seen){const body=frame.slice(viewerControls.clear.length);assert.equal(/[\x00-\x09\x0b\x0c\x0e-\x1f\x7f-\uffff]/.test(body),false);}
  t.input.destroy();
  const back=terminal((input,_frame,i)=>input.write(i===1?'n':i===2?'p':'q'));
  assert.equal(await viewLocalMap(new LocalMapCapability(map([{recordId:id,storedCwd:cwd,ambiguousId:false}])),back),'closed');
  assert.equal(back.frames[0],back.frames[2]);back.input.destroy();
});
test('viewer empty map explicitly reports no retained claims',async()=>{
  const t=terminal((input,_frame,i)=>input.write(i===1?'n':'q'));
  assert.equal(await viewLocalMap(new LocalMapCapability(map([])),t),'closed');assert.equal(t.frames.join('').includes('No retained claims'),true);t.input.destroy();
});
for(const failure of ['eof','cancel','error','output-error','write','raw','resize'] as const)test(`viewer restores terminal on ${failure} without diagnostics`,async()=>{
  const t=terminal(input=>{if(failure==='eof')input.end();else if(failure==='error')input.emit('error',new Error(secret));else input.write(failure==='cancel'?'\x03':failure==='resize'?'n':'q');});
  if(failure==='write'){const write=t.output.write;t.output.write=(value,callback)=>{if(String(value).includes('Page '))throw new Error(secret);return write(value,callback);};}
  if(failure==='output-error'){const write=t.output.write;t.output.write=(value,callback)=>{const result=write(value,callback);if(String(value).includes('Page '))t.output.emit('error',new Error(secret));return result;};}
  if(failure==='raw'){const raw=t.input.setRawMode;t.input.setRawMode=value=>{raw(value);if(value)throw new Error(secret);};}
  if(failure==='resize'){const write=t.output.write;t.output.write=(value,callback)=>{const result=write(value,callback);if(String(value).includes('Page ')){t.output.columns=20;queueMicrotask(()=>t.input.write('n'));}return result;};}
  const cap=new LocalMapCapability(map());const result=await viewLocalMap(cap,t);assert.equal(result,['eof','cancel'].includes(failure)?'closed':'failed');
  assert.equal(t.input.isRaw,false);assert.equal(cap.take(),undefined);assert.equal(t.input.listenerCount('data'),0);sanitized(result);t.input.destroy();
});
test('viewer makes no filesystem or network call from opaque stored strings',async()=>{
  const replacements:[object,string,unknown][]=[];let calls=0;
  try{
    for(const [object,names] of [[fs,['lstatSync','realpathSync','openSync','readFileSync','writeFileSync']],
      [net,['connect','createConnection']],[https,['request','get']]] as const){
      for(const name of names){replacements.push([object,name,Reflect.get(object,name)]);Reflect.set(object,name,()=>{calls++;throw new Error(secret);});}
    }
    syncBuiltinESMExports();
    const t=terminal(input=>input.write('q'));
    assert.equal(await viewLocalMap(new LocalMapCapability(map([{recordId:'https://synthetic.invalid',storedCwd:'\\\\Synthetic\\share',ambiguousId:false}])),t),'closed');
    assert.equal(calls,0);t.input.destroy();
  }finally{for(const [object,name,value] of replacements)Reflect.set(object,name,value);syncBuiltinESMExports();}
});
test('display preparation derives inputs and requires distinct read-and-display consent',async()=>{
  const inputs=['C:\\Synthetic\\database.sqlite','AUTHORIZE ONE LOCAL MAP DISPLAY'];let prompts=0,text='';
  const options=await prepareLocalDisplay(async()=>{prompts++;return inputs.shift()!;},s=>{text+=s;},{enabled:true,terminalSupported:true,
    nodeVersion:'24.18.1',executable:'C:\\Synthetic\\pwsh.exe',scratchParent:'C:\\Synthetic\\Temp'});
  assert.equal(prompts,2);assert.equal(text.includes('ChatGPT,Codex'),true);assert.equal(text.includes('external capture'),true);
  assert.equal(options.selection.kind,'personal');if(options.selection.kind==='personal')assert.equal(options.selection.private.displayConsent,true);
  await assert.rejects(prepareLocalDisplay(async()=> 'wrong',()=>{},{enabled:false,terminalSupported:true,nodeVersion:'24.18.1',executable:'',scratchParent:''}),{message:'Preflight refused'});
});
test('display entry refuses noninteractive invocation without starting a personal operation',()=>{
  const result=spawnSync(process.execPath,['dist/test/support/personal-thread-cwd-display-entry.js'],{encoding:'utf8',env:{...process.env,
    WORKSPACE_SURVEYOR_PERSONAL_CANARY:'0',WORKSPACE_SURVEYOR_PERSONAL_THREAD_CWD:'0',WORKSPACE_SURVEYOR_PERSONAL_THREAD_CWD_DISPLAY:'0'}});
  assert.equal(result.status,1);const parsed=JSON.parse(result.stdout.trim());assert.equal(parsed.attemptConsumed,false);assert.equal(parsed.display,'refused');sanitized(result.stdout);sanitized(result.stderr);
});
for(const missing of ['opt-in','consent','base','map','actual-consent'] as const)test(`display missing ${missing} refuses before source/recovery/helper access`,async()=>{
  const keys=['WORKSPACE_SURVEYOR_PERSONAL_CANARY','WORKSPACE_SURVEYOR_PERSONAL_THREAD_CWD','WORKSPACE_SURVEYOR_PERSONAL_THREAD_CWD_DISPLAY'],saved=keys.map(k=>process.env[k]);
  const stat=fs.lstatSync,start=CanarySession.prototype.start;let touched=0;
  try{
    process.env[keys[0]!]=missing==='base'?'0':'1';process.env[keys[1]!]=missing==='map'?'0':'1';process.env[keys[2]!]=missing==='opt-in'?'0':'1';
    Reflect.set(fs,'lstatSync',()=>{touched++;throw new Error(secret);});syncBuiltinESMExports();
    CanarySession.prototype.start=function(){touched++;throw new Error(secret);};
    const result=await runThreadCwdDisplay({analysis:'thread-cwd',executable:'C:\\Synthetic\\pwsh.exe',selection:{kind:'personal',private:{source:'C:\\Synthetic\\database.sqlite',scratchParent:'C:\\Synthetic\\Temp',writers:['ChatGPT','Codex'],consent:true,...(missing==='actual-consent'?{}:{actualValueConsent:true as const}),...(missing==='consent'?{}:{displayConsent:true as const})}}});
    assert.equal(touched,0);assert.equal(result.safety.attemptConsumed,false);assert.equal(result.takeDisplay(),undefined);sanitized(result);
  }finally{Reflect.set(fs,'lstatSync',stat);syncBuiltinESMExports();CanarySession.prototype.start=start;keys.forEach((k,i)=>{if(saved[i]===undefined)delete process.env[k];else process.env[k]=saved[i];});}
});

function fixture(sql=`CREATE TABLE threads(id TEXT,cwd TEXT); INSERT INTO threads VALUES('${secret}','C:\\Synthetic');`,wal=false){
  const run=new SyntheticRun('simulated-owner-restricted'),scratches:CanaryScratch[]=[];
  const source=join(run.sources,'standalone.sqlite'),builder=join(run.root,'builder','standalone.sqlite');
  const cleanup=()=>{
    let confirmed=true;
    for(const scratch of scratches)if(scratch.root){
      let present=true;
      try{fs.lstatSync(scratch.root);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')present=false;else confirmed=false;}
      if(present)try{if(scratch.cleanup()!=='removed')confirmed=false;}catch{confirmed=false;}
    }
    // Never destroy the only recovery controls while any scratch remains uncertain.
    if(!confirmed)throw new Error('Synthetic scratch cleanup residual');
    const store=join(run.root,'recovery');if(fs.existsSync(store)){
      const s=fs.lstatSync(store);assert.equal(s.isDirectory()&&!s.isSymbolicLink(),true);const entries=fs.readdirSync(store);
      assert.equal(entries.every(n=>['key','record'].includes(n)),true);
      for(const name of entries){const p=join(store,name),s=fs.lstatSync(p);assert.equal(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1&&s.size<=8192,true);fs.unlinkSync(p);}fs.rmdirSync(store);
    }
    assert.equal(run.cleanup().status,'removed');
  };
  try{fs.unlinkSync(builder);const db=new DatabaseSync(builder);try{if(wal)db.exec('PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0');db.exec(sql);
    for(const suffix of wal?['','-wal','-shm']:[''])fs.copyFileSync(builder+suffix,source+suffix);
  }finally{db.close();}}catch{cleanup();throw new Error('Synthetic fixture failed');}
  return {run,source,scratches,cleanup};
}
function options(f:ReturnType<typeof fixture>,extra:Partial<CanaryOptions>={}):CanaryOptions{return {
  executable:process.env.WORKSPACE_SURVEYOR_HELPER_PWSH??'',analysis:'thread-cwd',closure:()=> 'absent',selection:{kind:'synthetic',fixture:{source:f.source,ownerRoot:f.run.root,ownerNonce:fs.readFileSync(join(f.run.root,'owner'),'utf8')}},
  ...extra,hook:async(phase,scratch)=>{if(phase==='initialized')f.scratches.push(scratch);await extra.hook?.(phase,scratch);}};}
function snapshot(source:string){return selectedPaths(source).map(p=>{const s=fs.lstatSync(p,{bigint:true});return `${s.dev}:${s.ino}:${s.size}:${s.mtimeNs}:${s.ctimeNs}:${fs.readFileSync(p).toString('hex')}`;}).join('|');}
async function withFixture(sql:string|undefined,wal:boolean,body:(f:ReturnType<typeof fixture>,before:string)=>Promise<void>,measure=snapshot):Promise<void>{
  const f=fixture(sql,wal);
  try{const before=measure(f.source);await body(f,before);}finally{f.cleanup();}
}
test('blocker 3: harness residual retains recovery controls and unrelated sentinels',()=>{
  const f=fixture(),scratch=new CanaryScratch();let sentinel:SyntheticRun|undefined;
  const cleanup=scratch.cleanup;let injected=0;
  try{
    sentinel=new SyntheticRun('simulated-owner-restricted');const unrelated=join(sentinel.sources,'metadata.json'),before=fs.readFileSync(unrelated);
    f.scratches.push(scratch);scratch.initialize();const store=join(f.run.root,'recovery');fs.mkdirSync(store);
    fs.writeFileSync(join(store,'key'),'synthetic-key');fs.writeFileSync(join(store,'record'),'synthetic-record');
    scratch.cleanup=()=>{injected++;return 'residual';};
    assert.throws(()=>f.cleanup(),{message:'Synthetic scratch cleanup residual'});assert.equal(injected,1);
    assert.equal(fs.existsSync(scratch.root!),true);assert.equal(fs.existsSync(f.source),true);
    assert.equal(fs.readFileSync(join(store,'key'),'utf8'),'synthetic-key');assert.equal(fs.readFileSync(join(store,'record'),'utf8'),'synthetic-record');
    assert.deepEqual(fs.readFileSync(unrelated),before);
    scratch.cleanup=cleanup;f.cleanup();assert.equal(fs.existsSync(store),false);assert.equal(fs.existsSync(scratch.root!),false);
    assert.deepEqual(fs.readFileSync(unrelated),before);
  }finally{scratch.cleanup=cleanup;try{f.cleanup();}finally{if(sentinel)assert.equal(sentinel.cleanup().status,'removed');}}
});
test('blocker 4: initial snapshot failure cleans the shared scope for all ten display callbacks',async()=>{
  let injected=0,bodies=0;
  for(const callback of ['standalone','WAL','partial','empty','source','acquisition','exit','cleanup','schema','overflow']){
    let root:string|undefined;
    await assert.rejects(withFixture(undefined,callback==='WAL',async()=>{bodies++;},source=>{
      root=dirname(dirname(source));injected++;throw new Error('Injected initial snapshot failure');
    }),{message:'Injected initial snapshot failure'});
    assert.ok(root);assert.equal(fs.existsSync(root),false);
  }
  assert.equal(injected,10);assert.equal(bodies,0);
});
for(const [kind,sql,wal] of [
  ['standalone',`CREATE TABLE threads(id TEXT,cwd TEXT); INSERT INTO threads VALUES('${secret}','opaque');`,false],
  ['WAL',`CREATE TABLE threads(id TEXT,cwd TEXT); INSERT INTO threads VALUES('${secret}','opaque');`,true],
  ['partial',`CREATE TABLE threads(id TEXT,cwd TEXT); INSERT INTO threads VALUES('dup','A'),('dup','a'),(NULL,'x');`,false],
  ['empty','CREATE TABLE threads(id TEXT,cwd TEXT)',false],
] as const)test(`display ${kind} capability follows protected verification and exact cleanup`,empirical,async()=>{
  await withFixture(sql,wal,async(f,before)=>{let verified=false,exited=false;
    const result=await runThreadCwdDisplay(options(f,{hook:phase=>{if(phase==='verified')verified=true;if(phase==='exited')exited=true;}}));
    assert.equal(verified&&exited,true);assert.equal(result.safety.status,'passed');assert.equal(result.safety.attemptConsumed,true);
    assert.equal(result.safety.cleanup,'removed');assert.equal(result.safety.recovery,'removed');assert.equal(result.safety.files,wal?3:1);sanitized(result);
    const cap=result.takeDisplay();assert.ok(cap);assert.equal(result.takeDisplay(),undefined);const m=cap.take();assert.ok(m);assert.ok(m.readProvenance());
    assert.equal(m.summary.claims,kind==='empty'?0:kind==='partial'?2:1);if(kind==='partial')assert.equal(m.summary.interpretation,'partial');
    assert.equal(cap.take(),undefined);assert.equal(snapshot(f.source),before);assert.equal(fs.existsSync(join(f.run.sources,'metadata.json')),true);
  });
});
for(const fault of ['source','acquisition','exit','cleanup','schema','overflow'] as const)test(`display ${fault} withholds capability and preserves synthetic cleanup authority`,empirical,async()=>{
  await withFixture(fault==='schema'?'CREATE TABLE other(id TEXT,cwd TEXT)':fault==='overflow'?
    "CREATE TABLE threads(id TEXT,cwd TEXT); WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n WHERE x<1001) INSERT INTO threads SELECT 'id'||x,'cwd' FROM n;":undefined,false,async(f,before)=>{let reached=false;
    const result=await runThreadCwdDisplay(options(f,{...(fault==='exit'?{simulateExitUncertainty:true}:{}),
    ...(fault==='cleanup'?{cleanupFault:()=>{reached=true;throw new Error(secret);}}:{}),hook:(phase,scratch)=>{
      if(fault==='source'&&phase==='prepared'){reached=true;fs.writeFileSync(f.source,'invented mutation');}
      if(fault==='acquisition'&&phase==='analyzed'){reached=true;fs.writeFileSync(scratch.path('acquisition',0),'invented mutation');}
      if(['exit','schema','overflow'].includes(fault)&&phase==='verified')reached=true;
    }}));
    assert.equal(reached,true);assert.equal(result.safety.status,'refused');assert.equal(result.safety.attemptConsumed,true);assert.equal(result.takeDisplay(),undefined);sanitized(result);
    if(['exit','cleanup'].includes(fault)){assert.equal(result.safety.cleanup,'residual');assert.equal(await recoverCanary({store:join(f.run.root,'recovery'),executable:options(f).executable,synthetic:true}),'removed');forgetRecoveredSyntheticResidual(f.scratches[0]!.root!);}
    else assert.equal(result.safety.cleanup,'removed');
    if(fault!=='source')assert.equal(snapshot(f.source),before);assert.equal(fs.existsSync(join(f.run.sources,'metadata.json')),true);
  });
});
