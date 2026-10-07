import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PassThrough } from 'node:stream';
import { spawnSync } from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { SyntheticRun } from './support/synthetic-acquisition.js';
import { CanaryScratch, CanarySession, runCanary, selectedPaths, recoverCanary,
  forgetRecoveredSyntheticResidual, type CanaryOptions } from './support/personal-canary.js';
import { preparePersonalMap, visibleMapInput, mapPreflightRefusal } from './support/personal-thread-cwd-entry.js';

const empirical={skip:process.platform!=='win32'||process.env.WORKSPACE_SURVEYOR_RUN_CANARY_PREPARATION!=='1',concurrency:false};
const secret='SYNTHETIC_PRIVATE_MAP';
const populated=`CREATE TABLE threads(id TEXT,cwd TEXT); INSERT INTO threads VALUES('${secret}_id','${secret}_cwd');`;
const context={enabled:true,nodeVersion:'24.18.1',executable:'C:\\Synthetic\\pwsh.exe',scratchParent:'C:\\Synthetic\\Temp'};
const source='C:\\Synthetic\\source.sqlite';
function privateFree(value:unknown):void{assert.equal(/SYNTHETIC_PRIVATE_|[A-Z]:[\\/]|S-1-\d|workspace-surveyor-canary-/i.test(JSON.stringify(value)),false);}
function fixture(sql=populated,wal=false){
  const run=new SyntheticRun('simulated-owner-restricted'),scratches:CanaryScratch[]=[];
  const source=join(run.sources,'standalone.sqlite'),builder=join(run.root,'builder','standalone.sqlite');
  const cleanup=()=>{
    for(const scratch of scratches)if(scratch.root&&fs.existsSync(scratch.root))assert.equal(scratch.cleanup(),'removed');
    const store=join(run.root,'recovery');
    if(fs.existsSync(store)){
      const st=fs.lstatSync(store);assert.equal(st.isDirectory()&&!st.isSymbolicLink(),true);
      const entries=fs.readdirSync(store);assert.equal(entries.every(n=>['key','record'].includes(n)),true);
      for(const name of entries){const s=fs.lstatSync(join(store,name));assert.equal(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1&&s.size<=8192,true);}
      for(const name of entries)fs.unlinkSync(join(store,name));fs.rmdirSync(store);
    }
    assert.equal(run.cleanup().status,'removed');
  };
  try{
    fs.unlinkSync(builder);const db=new DatabaseSync(builder);
    try{
      if(wal)db.exec('PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0');
      db.exec(sql);
      for(const suffix of wal?['','-wal','-shm']:[''])fs.copyFileSync(builder+suffix,source+suffix);
    }finally{db.close();}
  }catch{cleanup();throw new Error('Synthetic fixture failed');}
  return {run,source,scratches,cleanup,selection:{kind:'synthetic' as const,
    fixture:{source,ownerRoot:run.root,ownerNonce:fs.readFileSync(join(run.root,'owner'),'utf8')}}};
}
function options(f:ReturnType<typeof fixture>,extra:Partial<CanaryOptions>={}):CanaryOptions{
  return {executable:process.env.WORKSPACE_SURVEYOR_HELPER_PWSH??'',selection:f.selection,analysis:'thread-cwd',closure:()=> 'absent',
    ...extra,hook:async(phase,scratch)=>{if(phase==='initialized')f.scratches.push(scratch);await extra.hook?.(phase,scratch);}};
}
function snapshot(source:string):string{return selectedPaths(source).map(p=>{const s=fs.lstatSync(p,{bigint:true});
  return `${s.dev}:${s.ino}:${s.size}:${s.mtimeNs}:${s.ctimeNs}:${fs.readFileSync(p).toString('hex')}`;}).join('|');}

test('MAP input derives context and fixed writers, requiring only visible source and final consent',async()=>{
  const inputs=[source,'AUTHORIZE ONE PRIVATE MAP RUN'],prompts:string[]=[],display:string[]=[];
  const result=await preparePersonalMap(async p=>{prompts.push(p);return inputs.shift()!;},s=>display.push(s),context);
  assert.equal(prompts.length,2);assert.equal(display.join('').includes(context.scratchParent),true);
  assert.equal(display.join('').includes('ChatGPT,Codex'),true);assert.equal(result.analysis,'thread-cwd');
  assert.equal(result.selection.kind,'personal');
  if(result.selection.kind==='personal')assert.deepEqual(result.selection.private,{source,scratchParent:context.scratchParent,
    writers:['ChatGPT','Codex'],consent:true,actualValueConsent:true});
  assert.equal(mapPreflightRefusal.attemptConsumed,false); // Selection preparation performs no operation.
});
for(const defect of ['disabled','runtime','host','relative-source','cancel','wrong-confirmation'])test(`MAP preflight ${defect} remains unconsumed`,async()=>{
  const ctx={...context,...(defect==='disabled'?{enabled:false}:{}),...(defect==='runtime'?{nodeVersion:'0.0.0'}:{}),
    ...(defect==='host'?{executable:'pwsh.exe'}:{})};let reads=0;
  await assert.rejects(preparePersonalMap(async()=>{
    reads++;if(defect==='cancel')throw new Error(secret);
    return reads===1?(defect==='relative-source'?'relative.sqlite':source):'wrong';
  },()=>{},ctx));
  if(['disabled','runtime','host'].includes(defect))assert.equal(reads,0);
  assert.equal(mapPreflightRefusal.attemptConsumed,false);privateFree(mapPreflightRefusal);
});
test('MAP visible input echoes bounded ordinary text and restores terminal after cancellation and EOF',async()=>{
  for(const kind of ['text','cancel','limit','eof'] as const){
    const input=new PassThrough() as PassThrough & {isTTY:boolean;setRawMode:(raw:boolean)=>void};input.isTTY=true;
    const modes:boolean[]=[];input.setRawMode=raw=>{modes.push(raw);};let output='';
    const terminal={isTTY:true,write:(s:unknown)=>{output+=String(s);return true;}};
    const promise=visibleMapInput('Synthetic prompt',input as never,terminal as never);
    const rejected=kind!=='text'?assert.rejects(promise,{message:'Input refused'}):undefined;
    if(kind==='text')input.write('visible\bX\r');else if(kind==='cancel')input.write('\u0003');
    else if(kind==='limit')input.write('x'.repeat(2049));else input.end();
    if(kind==='text'){assert.equal(await promise,'visiblX');assert.equal(output.includes('visible'),true);}
    else await rejected;
    assert.deepEqual(modes,[true,false]);assert.equal(input.listenerCount('data'),0);input.destroy();
  }
});
test('MAP standalone entry refuses noninteractive startup with an unconsumed sanitized result',()=>{
  const r=spawnSync(process.execPath,['dist/test/support/personal-thread-cwd-entry.js'],{encoding:'utf8',
    env:{...process.env,WORKSPACE_SURVEYOR_PERSONAL_CANARY:'0',WORKSPACE_SURVEYOR_PERSONAL_THREAD_CWD:'0'}});
  assert.equal(r.status,1);assert.deepEqual(JSON.parse(r.stdout.trim()),mapPreflightRefusal);privateFree(r.stdout);privateFree(r.stderr);
});

for(const missing of ['base','map','consent','actual-consent'] as const)test(`MAP missing ${missing} refuses before any filesystem access or helper startup`,async()=>{
  const keys=['WORKSPACE_SURVEYOR_PERSONAL_CANARY','WORKSPACE_SURVEYOR_PERSONAL_THREAD_CWD'];
  const saved=keys.map(k=>process.env[k]);const stat=fs.lstatSync,start=CanarySession.prototype.start;let touched=0;
  try{
    process.env[keys[0]!]=missing==='base'?'0':'1';process.env[keys[1]!]=missing==='map'?'0':'1';
    Reflect.set(fs,'lstatSync',()=>{touched++;throw new Error(secret);});syncBuiltinESMExports();
    CanarySession.prototype.start=function(){touched++;throw new Error(secret);};
    const result=await runCanary({executable:context.executable,analysis:'thread-cwd',selection:{kind:'personal',private:{
      source,scratchParent:context.scratchParent,writers:['ChatGPT','Codex'],consent:missing==='consent'?false as never:true,
      ...(missing==='actual-consent'?{}:{actualValueConsent:true as const})}}});
    assert.equal(result.attemptConsumed,false);assert.equal(result.mapping,null);assert.equal(touched,0);privateFree(result);
  }finally{
    Reflect.set(fs,'lstatSync',stat);syncBuiltinESMExports();CanarySession.prototype.start=start;
    keys.forEach((k,i)=>{if(saved[i]===undefined)delete process.env[k];else process.env[k]=saved[i];});
  }
});

test('MAP injected preflight closure refusal leaves the synthetic attempt unconsumed',empirical,async()=>{
  const f=fixture();let reached=false;
  try{const r=await runCanary(options(f,{closure:()=>{reached=true;return 'present';}}));
    assert.equal(reached,true);assert.equal(r.reason,'closure');assert.equal(r.attemptConsumed,false);assert.equal(r.mapping,null);
  }finally{f.cleanup();}
});
test('MAP first source metadata failure consumes the attempt before that access throws',empirical,async()=>{
  const f=fixture(),stat=fs.lstatSync;let reached=false;
  try{
    Reflect.set(fs,'lstatSync',(p:fs.PathLike,...rest:unknown[])=>{if(p===f.run.root){reached=true;throw new Error(secret);}return Reflect.apply(stat,fs,[p,...rest]);});syncBuiltinESMExports();
    const r=await runCanary(options(f));assert.equal(reached,true);assert.equal(r.attemptConsumed,true);assert.equal(r.mapping,null);privateFree(r);
  }finally{Reflect.set(fs,'lstatSync',stat);syncBuiltinESMExports();f.cleanup();}
});
test('MAP helper startup failure stays consumed and cleans its new empty scratch',empirical,async()=>{
  const f=fixture(),start=CanarySession.prototype.start;let reached=false;
  try{
    CanarySession.prototype.start=function(){reached=true;throw new Error(secret);};
    const r=await runCanary(options(f));assert.equal(reached,true);assert.equal(r.attemptConsumed,true);assert.equal(r.mapping,null);
    assert.equal(r.cleanup,'removed');assert.equal(f.scratches.length,1);privateFree(r);
  }finally{CanarySession.prototype.start=start;f.cleanup();}
});
for(const phase of ['construction','startup'] as const)test(`MAP personal boundary ${phase} fault never starts a helper or accesses a recovery slot`,empirical,async()=>{
  const f=fixture(),start=CanarySession.prototype.start,stringify=JSON.stringify;
  const base=process.env.WORKSPACE_SURVEYOR_PERSONAL_CANARY,map=process.env.WORKSPACE_SURVEYOR_PERSONAL_THREAD_CWD;
  let construction=false,started=false;
  try{
    // Both faults are barriers before actual spawning. No known-folder/slot lookup can execute.
    CanarySession.prototype.start=function(){started=true;throw new Error(secret);};
    JSON.stringify=function(value:unknown,...rest:unknown[]){
      if(value&&typeof value==='object'&&'operation' in value&&value.operation==='locate'){
        construction=true;if(phase==='construction')throw new Error(secret);
      }
      return Reflect.apply(stringify,JSON,[value,...rest]);
    } as typeof JSON.stringify;
    process.env.WORKSPACE_SURVEYOR_PERSONAL_CANARY='1';process.env.WORKSPACE_SURVEYOR_PERSONAL_THREAD_CWD='1';
    const r=await runCanary({executable:options(f).executable,analysis:'thread-cwd',selection:{kind:'personal',private:{
      source:f.source,scratchParent:fs.realpathSync(tmpdir()),writers:['ChatGPT','Codex'],consent:true,actualValueConsent:true}}});
    assert.equal(construction,true);assert.equal(started,phase==='startup');assert.equal(r.attemptConsumed,phase==='startup');
    assert.equal(r.mapping,null);assert.equal(r.cleanup,'removed');assert.equal(fs.existsSync(join(f.run.root,'recovery')),false);privateFree(r);
  }finally{
    CanarySession.prototype.start=start;JSON.stringify=stringify;
    if(base===undefined)delete process.env.WORKSPACE_SURVEYOR_PERSONAL_CANARY;else process.env.WORKSPACE_SURVEYOR_PERSONAL_CANARY=base;
    if(map===undefined)delete process.env.WORKSPACE_SURVEYOR_PERSONAL_THREAD_CWD;else process.env.WORKSPACE_SURVEYOR_PERSONAL_THREAD_CWD=map;
    f.cleanup();
  }
});
test('MAP accepted consent with a missing selected host remains unconsumed',empirical,async()=>{
  const f=fixture();let initialized=false;
  try{const r=await runCanary(options(f,{executable:join(f.run.root,'missing','pwsh.exe'),hook:()=>{initialized=true;}}));
    assert.equal(initialized,false);assert.equal(r.attemptConsumed,false);assert.equal(r.mapping,null);privateFree(r);
  }finally{f.cleanup();}
});
test('MAP unexpected teardown exception cannot erase consumed status or disclose diagnostics',empirical,async()=>{
  const f=fixture(),start=CanarySession.prototype.start,finish=CanarySession.prototype.finish;let reached=false;
  try{
    // No child is created. Exercise the outer lifetime owner's exception boundary.
    CanarySession.prototype.start=function(){throw new Error(secret);};
    CanarySession.prototype.finish=async function(){reached=true;throw new Error(secret);};
    const r=await runCanary(options(f));assert.equal(reached,true);assert.equal(r.attemptConsumed,true);
    assert.equal(r.mapping,null);assert.equal(r.cleanup,'residual');privateFree(r);
  }finally{CanarySession.prototype.start=start;CanarySession.prototype.finish=finish;f.cleanup();}
});
for(const [label,sql,wal] of [
  ['standalone',populated,false],['WAL',populated,true],['empty','CREATE TABLE threads(id TEXT,cwd TEXT)',false],
  ['partial',`CREATE TABLE threads(id TEXT,cwd TEXT); INSERT INTO threads VALUES('duplicate','a'),('duplicate','b'),(NULL,'c');`,false],
] as const)test(`MAP fixed mode ${label} emits summary only after verified cleanup`,empirical,async()=>{
  const f=fixture(sql,wal),before=snapshot(f.source);let analyzed=false;
  try{
    const r=await runCanary(options(f,{hook:phase=>{if(phase==='analyzed')analyzed=true;}}));
    assert.equal(analyzed,true);assert.equal(r.status,'passed');assert.equal(r.attemptConsumed,true);assert.equal(r.mapping?.status,'ready');
    assert.equal(r.mapping?.claims,label==='empty'?0:label==='partial'?2:1);
    assert.equal(r.mapping?.interpretation,label==='partial'?'partial':'complete-within-selected-table');
    if(label==='partial'){assert.equal(r.mapping?.omittedRows,1);assert.equal(r.mapping?.ambiguousIds,1);}
    assert.equal(r.files,wal?3:1);assert.equal(r.sourcesStable,true);assert.equal(r.evidence.exitConfirmed,true);
    assert.equal(r.cleanup,'removed');assert.equal(r.recovery,'removed');assert.equal(snapshot(f.source)===before,true);
    assert.equal('readClaims' in r.mapping!,false);privateFree(r);
  }finally{f.cleanup();}
});
for(const [label,sql,reason] of [
  ['unsupported','CREATE TABLE other(id TEXT,cwd TEXT)','unsupported'],
  ['overflow',`CREATE TABLE threads(id TEXT,cwd TEXT); WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n WHERE x<1001) INSERT INTO threads SELECT 'id'||x,'cwd' FROM n;`,'limit'],
] as const)test(`MAP ${label} remains consumed, withholds values and finishes safety cleanup`,empirical,async()=>{
  const f=fixture(sql),before=snapshot(f.source);
  try{const r=await runCanary(options(f));assert.equal(r.status,'refused');assert.equal(r.reason,reason);assert.equal(r.attemptConsumed,true);
    assert.equal(r.mapping?.status,'unavailable');assert.equal(r.mapping?.claims,0);assert.equal(r.evidence.stages.includes('verified'),true);
    assert.equal(r.cleanup,'removed');assert.equal(snapshot(f.source)===before,true);privateFree(r);
  }finally{f.cleanup();}
});
for(const fault of ['malformed','source','acquisition','exit','cleanup'] as const)test(`MAP ${fault} failure cannot release successful mapping findings`,empirical,async()=>{
  const f=fixture(),before=snapshot(f.source);let reached=false;
  try{
    const r=await runCanary(options(f,{
      ...(fault==='exit'?{simulateExitUncertainty:true}:{}),
      ...(fault==='cleanup'?{cleanupFault:()=>{reached=true;throw new Error(secret);}}:{}),
      hook:(phase,scratch)=>{
        if(fault==='malformed'&&phase==='copied'){reached=true;fs.writeFileSync(scratch.path('analysis',0),secret);}
        if(fault==='source'&&phase==='prepared'){reached=true;fs.writeFileSync(f.source,'invented changed source');}
        if(fault==='acquisition'&&phase==='analyzed'){reached=true;fs.writeFileSync(scratch.path('acquisition',0),secret);}
        if(fault==='exit'&&phase==='verified')reached=true;
      }}));
    assert.equal(reached,true);assert.equal(r.status,'refused');assert.equal(r.attemptConsumed,true);
    if(fault==='malformed'){assert.equal(r.mapping?.status,'unavailable');assert.equal(r.reason,'analysis');}else assert.equal(r.mapping,null);
    if(fault==='exit'||fault==='cleanup'){
      assert.equal(r.cleanup,'residual');const writer=fs.openSync(f.source,'r+');fs.closeSync(writer);
      assert.equal(await recoverCanary({store:join(f.run.root,'recovery'),executable:options(f).executable,synthetic:true}),'removed');
      forgetRecoveredSyntheticResidual(f.scratches[0]!.root!);
    }else assert.equal(r.cleanup,'removed');
    if(fault!=='source')assert.equal(snapshot(f.source)===before,true);
    assert.equal(fs.existsSync(join(f.run.sources,'metadata.json')),true);privateFree(r);
  }finally{f.cleanup();}
});
