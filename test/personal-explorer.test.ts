import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { inspect } from 'node:util';
import { syncBuiltinESMExports } from 'node:module';
import { EventEmitter } from 'node:events';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { explorerFixture } from './support/explorer-fixture.js';
import { runExplorerEntry } from './support/explorer-entry.js';
import { preparePersonalExplorer, acquisitionFailureSummary, acquirePersonalSnapshot, completeExplorerRefresh } from './support/personal-explorer-entry.js';
import { runPersonalExplorer, runTitledExplorerPreparation, explorerPreflightSafety, CanarySession, CanaryScratch, diagnoseCanaryRecovery, recoverCanaryWithEvidence,
  type CanaryOptions, type CanaryResult } from './support/personal-canary.js';
import { ExplorerSnapshot, reconcile } from '../src/explorer/model.js';
import { escapeStored } from '../src/explorer/view.js';
import { resolveRecoveryBlocker } from './support/recovery-resolution-entry.js';

const secret='SYNTHETIC_TITLED_PRIVATE';
const context={home:'C:\\Synthetic\\Home with spaces Ω',enabled:true,nodeVersion:'24.18.1',executable:'C:\\Synthetic\\PowerShell\\pwsh.exe',scratchParent:'C:\\Synthetic\\Temp'};
const source='C:\\Synthetic\\selected.sqlite';
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

test('checkpointed WAL reproduces legacy analysis side effects and refuses unregistered cleanup',empirical,async()=>{
  const f=explorerFixture(undefined,'checkpointed'),created:{path:string;ino:bigint;dev:bigint}[]=[];
  const before=fs.readFileSync(f.source);let reached=false;
  try{
    const result=await runTitledExplorerPreparation(options(f,{explorer:{globalState:f.globalState},hook:(phase,scratch)=>{
      if(phase!=='copied')return;
      const path=scratch.path('analysis',0);
      for(const suffix of ['-wal','-shm'])assert.equal(fs.existsSync(path+suffix),false);
      // Deliberately reproduce the old constructor on this exact owned synthetic copy.
      const db=new DatabaseSync(path,{readOnly:true});
      try{assert.equal(db.prepare('SELECT count(*) AS count FROM threads').get()!.count,4);}finally{db.close();}
      for(const suffix of ['-wal','-shm']){const entry=path+suffix,s=fs.lstatSync(entry,{bigint:true});created.push({path:entry,ino:s.ino,dev:s.dev});}
      reached=true;
    }}));
    assert.equal(reached,true);assert.equal(result.snapshot,undefined);assert.equal(result.safety.cleanup,'residual');assert.equal(result.safety.recovery,'available');
    const report=await recoverCanaryWithEvidence({store:join(f.run.root,'recovery'),executable:options(f).executable,synthetic:true});
    assert.equal(report.category,'scratch-inventory');assert.equal(report.deletionAuthorized,false);assert.equal(report.helperExit,'confirmed');
    assert.equal(fs.readFileSync(f.source).equals(before),true);
  }finally{
    // Test instrumentation established these exact identities; never infer ownership of personal extras.
    for(const entry of created){const s=fs.lstatSync(entry.path,{bigint:true});assert.equal(s.ino,entry.ino);assert.equal(s.dev,entry.dev);fs.unlinkSync(entry.path);}
    assert.equal(await f.teardown(),true);
  }
});

for(const registry of [false,true])test('checkpointed WAL without companions produces a snapshot and removes authenticated scratch: '+registry,empirical,async()=>{
  const f=explorerFixture(undefined,'checkpointed');let inspected=false;
  const before=fs.readFileSync(f.source),stat=fs.lstatSync(f.source,{bigint:true});
  try{
    assert.equal(fs.existsSync(f.source+'-wal'),false);assert.equal(fs.existsSync(f.source+'-shm'),false);
    const result=await runTitledExplorerPreparation(options(f,{...(registry?{explorer:{globalState:f.globalState}}:{}),hook:(phase,scratch)=>{
      if(phase==='analyzed'){
        inspected=true;const path=scratch.path('analysis',0);
        assert.equal(scratch.sqliteLocation().endsWith('?immutable=1'),true);
        assert.equal(fs.existsSync(path+'-wal'),false);assert.equal(fs.existsSync(path+'-shm'),false);
      }
    }}));
    assert.equal(inspected,true);assert.equal(result.safety.status,'passed');assert.equal(result.safety.cleanup,'removed');assert.equal(result.safety.recovery,'removed');
    const snapshot=result.snapshot!.take()!;assert.equal(snapshot.threads.length,4);assert.equal(snapshot.projects.length,registry?2:0);
    assert.equal(fs.readFileSync(f.source).equals(before),true);
    const after=fs.lstatSync(f.source,{bigint:true});assert.equal(after.ino,stat.ino);assert.equal(after.mtimeNs,stat.mtimeNs);
    assert.equal(fs.existsSync(f.source+'-wal'),false);assert.equal(fs.existsSync(f.source+'-shm'),false);
    assert.equal(fs.existsSync(join(f.run.root,'recovery')),false);assert.ok(f.scratches.every(s=>!fs.existsSync(s.root!)));
  }finally{assert.equal(await f.teardown(),true);}
});
for(const areas of [['analysis'],['acquisition','analysis']] as const)
test('owned analysis never switches to immutable mode after losing a selected WAL pair: '+areas.join(','),empirical,async()=>{
  const f=explorerFixture(undefined,true);const before=fs.readFileSync(f.source);let refused=false;
  try{
    const result=await runTitledExplorerPreparation(options(f,{explorer:{globalState:f.globalState},hook:(phase,scratch)=>{
      if(phase==='copied'){
        for(const area of areas){fs.unlinkSync(scratch.path(area,1));fs.unlinkSync(scratch.path(area,2));}
        assert.throws(()=>scratch.sqliteLocation());refused=true;
      }
    }}));
    assert.equal(refused,true);assert.equal(result.snapshot,undefined);assert.equal(result.safety.status,'refused');
    assert.equal(result.safety.cleanup,'removed');assert.equal(result.safety.recovery,'removed');assert.equal(fs.readFileSync(f.source).equals(before),true);
  }finally{assert.equal(await f.teardown(),true);}
});

for(const wal of [true,'checkpointed'] as const)
test('interrupted read-only analysis cleans its authenticated inventory across repeated cycles: '+wal,empirical,async()=>{
  const f=explorerFixture(undefined,wal);const before=fs.readFileSync(f.source);
  try{
    for(let cycle=0;cycle<3;cycle++){
      const r=await runTitledExplorerPreparation(options(f,{explorer:{globalState:f.globalState},hook:(phase,scratch)=>{
        if(phase==='analyzed'){
          assert.equal(fs.readdirSync(join(scratch.root!,'analysis')).some(n=>n.endsWith('-journal')),false);
          if(cycle!==2)throw new Error('INVENTED_INTERRUPTION_AFTER_SQLITE_CLOSE');
        }
      }}));
      assert.equal(r.safety.status,cycle===2?'passed':'refused');assert.equal(r.safety.cleanup,'removed');
      assert.equal(r.safety.recovery,'removed');assert.ok(f.scratches.every(s=>!fs.existsSync(s.root!)));r.snapshot?.discard();
      assert.deepEqual(fs.readFileSync(f.source),before);
    }
  }finally{assert.equal(await f.teardown(),true);}
});
test('an unexpected analysis journal is retained and no snapshot is published',empirical,async()=>{
  const f=explorerFixture(undefined,'checkpointed');let extra:string|undefined;
  try{
    const r=await runTitledExplorerPreparation(options(f,{explorer:{globalState:f.globalState},hook:(phase,scratch)=>{
      if(phase==='analyzed'){extra=scratch.path('analysis',0)+'-journal';fs.writeFileSync(extra,'INVENTED_SECONDARY_FILE');}
    }}));
    assert.equal(r.snapshot,undefined);assert.equal(r.safety.status,'refused');assert.equal(r.safety.cleanup,'residual');
    assert.equal(fs.readFileSync(extra!,'utf8'),'INVENTED_SECONDARY_FILE');
    const recovery=await recoverCanaryWithEvidence({store:join(f.run.root,'recovery'),executable:options(f).executable,synthetic:true});
    assert.equal(recovery.category,'scratch-inventory');assert.equal(recovery.deletionAuthorized,false);
  }finally{if(extra&&fs.existsSync(extra))fs.unlinkSync(extra);assert.equal(await f.teardown(),true);}
});

for(const unknown of [false,true])test('guarded recovery resolution with real synthetic controls: unknown inventory '+unknown,empirical,async()=>{
  const f=explorerFixture(undefined,'checkpointed');let extra:string|undefined,refreshes=0;
  const before=fs.readFileSync(f.source);
  try{
    const held=await runTitledExplorerPreparation(options(f,{explorer:{globalState:f.globalState},cleanupFault:()=>{throw new Error('Invented cleanup interruption');}}));
    assert.equal(held.safety.cleanup,'residual');assert.equal(held.snapshot,undefined);
    const store=join(f.run.root,'recovery'),root=f.scratches[0]!.root!,record=fs.readFileSync(join(store,'record'));
    if(unknown){extra=join(root,'invented-unregistered');fs.writeFileSync(extra,'invented independently owned sentinel');}
    const blocked=await runTitledExplorerPreparation(options(f,{closure:()=>assert.fail('Occupied recovery must precede process checking')}));
    assert.equal(blocked.safety.reason,'cleanup');assert.equal(blocked.safety.evidence.acquisition?.recoveryPreflight,'occupied');
    assert.equal(blocked.safety.evidence.acquisition?.scratchInitialization,'not-started');
    assert.equal(fs.readFileSync(join(store,'record')).equals(record),true);
    const result=await resolveRecoveryBlocker({recover:()=>recoverCanaryWithEvidence({store,executable:options(f).executable,synthetic:true}),
      refresh:async()=>{refreshes++;return completeExplorerRefresh(await runTitledExplorerPreparation(options(f,{explorer:{globalState:f.globalState}})),
        {executable:options(f).executable},new AbortController().signal);}});
    sanitized(result);assert.equal(result.status,unknown?'blocked':'restored');assert.equal(refreshes,unknown?0:1);
    if(unknown){assert.equal(result.recovery.category,'scratch-inventory');assert.equal(result.recovery.deletionAuthorized,false);
      assert.equal(fs.readFileSync(join(store,'record')).equals(record),true);assert.equal(fs.readFileSync(extra!).toString(),'invented independently owned sentinel');
      assert.equal(fs.existsSync(root),true);
    }else{assert.equal(result.populated,true);assert.equal(fs.existsSync(store),false);assert.ok(f.scratches.every(s=>!fs.existsSync(s.root!)));}
    assert.equal(fs.readFileSync(f.source).equals(before),true);
  }finally{
    // Independent owner restores only its deliberately inserted synthetic sentinel, never a personal artifact.
    if(extra)fs.unlinkSync(extra);assert.equal(await f.teardown(),true);
  }
});

// Metadata-only regressions: no PowerShell child, protected acquisition or RECOVER dispatch.
for(const fault of ['source','occupied','desktop-present','desktop-unknown','validation','containment','creation'] as const)
test('initial refresh distinguishes '+fault+' refusal without running an acquisition helper',{skip:process.platform!=='win32',concurrency:false},async()=>{
  const f=explorerFixture(),executable=join(f.run.root,'pwsh.exe'),store=join(f.run.root,'recovery');
  const saved=['WORKSPACE_SURVEYOR_RUN_CANARY_PREPARATION','WORKSPACE_SURVEYOR_RUN_EXPLORER_PREPARATION'].map(k=>process.env[k]);
  const initialize=CanaryScratch.prototype.initialize,start=CanarySession.prototype.start,stat=fs.lstatSync,mkdtemp=fs.mkdtempSync;
  let inside=false,creationCalls=0,starts=0;
  try{
    fs.writeFileSync(executable,'invented executable; never launched');
    process.env.WORKSPACE_SURVEYOR_RUN_CANARY_PREPARATION='1';process.env.WORKSPACE_SURVEYOR_RUN_EXPLORER_PREPARATION='1';
    CanarySession.prototype.start=()=>{starts++;assert.fail('No helper permitted');};
    CanaryScratch.prototype.initialize=function(){inside=true;try{return initialize.call(this);}finally{inside=false;}};
    Reflect.set(fs,'lstatSync',((path:fs.PathLike,...args:unknown[])=>{
      if(inside&&fault==='validation')throw new Error(secret);
      const value=Reflect.apply(stat,fs,[path,...args]);
      if(inside&&fault==='containment')return new Proxy(value,{get:(target,key)=>key==='isSymbolicLink'?()=>true:Reflect.get(target,key)});
      return value;
    }) as typeof fs.lstatSync);
    Reflect.set(fs,'mkdtempSync',()=>{creationCalls++;throw new Error(secret);});syncBuiltinESMExports();
    if(fault==='occupied')fs.mkdirSync(store);
    const selection=fault==='source'?{...f.selection,fixture:{...f.selection.fixture,source:join(f.run.sources,'missing.sqlite')}}:f.selection;
    const early=fault==='desktop-present'||fault==='desktop-unknown';
    const before=fs.readFileSync(f.source);
    const result=await runTitledExplorerPreparation({...options(f),executable,selection,
      closure:()=>{assert.notEqual(fault,'occupied','Recovery must be checked before the Desktop probe');return early?fault==='desktop-present'?'present':'unknown':'absent';}});
    assert.equal(result.snapshot,undefined);assert.equal(starts,0);sanitized(result);
    const a=result.safety.evidence.acquisition!;
    assert.equal(a.helperLaunched,false);assert.equal(a.helperExit,'not-launched');assert.equal(a.helperOutcome,'not-reported');
    assert.equal(a.cleanupRecovery,'not-attempted');
    assert.equal(result.safety.cleanup,fault==='occupied'||fault==='creation'?'residual':'removed');
    assert.equal(a.recoveryPreflight,fault==='occupied'?'occupied':'clear');
    assert.equal(a.stage,early?'closure-preflight':fault==='source'?'source-selection':fault==='occupied'?'recovery-preflight':'scratch-initialization');
    assert.equal(a.scratchInitialization,fault==='validation'||fault==='containment'?'validating':fault==='creation'?'creation-attempted':'not-started');
    assert.equal(a.reason,fault==='desktop-unknown'?'helper':early?'closure':fault==='occupied'?'selection':fault==='containment'?'containment':'io');
    assert.equal(creationCalls,fault==='creation'?1:0);
    const refresh=await completeExplorerRefresh(result,{executable},new AbortController().signal);
    assert.equal(refresh.failure,fault==='desktop-present'?'closure':fault==='occupied'||fault==='creation'?'cleanup':'acquisition');assert.equal(refresh.snapshot,undefined);
    assert.deepEqual(fs.readFileSync(f.source),before);
    const summary=JSON.parse(acquisitionFailureSummary(result.safety).slice('Acquisition failure: '.length));
    assert.equal(summary.acquisitionReason,a.reason);assert.equal(summary.cleanup,result.safety.cleanup);sanitized(summary);
    assert.equal(fs.existsSync(store),fault==='occupied');
  }finally{
    CanaryScratch.prototype.initialize=initialize;CanarySession.prototype.start=start;
    Reflect.set(fs,'lstatSync',stat);Reflect.set(fs,'mkdtempSync',mkdtemp);syncBuiltinESMExports();
    ['WORKSPACE_SURVEYOR_RUN_CANARY_PREPARATION','WORKSPACE_SURVEYOR_RUN_EXPLORER_PREPARATION'].forEach((k,i)=>{
      if(saved[i]===undefined)delete process.env[k];else process.env[k]=saved[i];});
    if(fault==='occupied')fs.rmdirSync(store);
    fs.unlinkSync(executable);assert.equal(await f.teardown(),true);
  }
});

test('acquisition failure summary allowlists categories and never forwards private or raw fields',()=>{
  const safety={...explorerPreflightSafety,reason:secret,cleanup:secret,recovery:secret,limit:secret,
    evidence:{...explorerPreflightSafety.evidence,phase:secret,stages:[secret],
      acquisition:{stage:secret,reason:secret,scratchInitialization:secret,recoveryPreflight:secret,helperLaunched:secret,helperExit:secret,helperOutcome:secret,cleanupRecovery:secret}},
    privatePath:secret} as unknown as CanaryResult;
  const text=acquisitionFailureSummary(safety);sanitized(text);
  assert.match(text,/unreported/);assert.doesNotMatch(text,/privatePath|stages|diagnosticsDiscarded/);
  const absent=JSON.parse(acquisitionFailureSummary(explorerPreflightSafety).slice('Acquisition failure: '.length));
  assert.equal(absent.helperLaunched,null);assert.equal(absent.scratchInitialization,'unreported');
});

test('Refresh reports a refused preflight once without IO; reporting errors cannot bypass publication',async()=>{
  const stat=fs.lstatSync,start=CanarySession.prototype.start;let touched=0;
  try{
    Reflect.set(fs,'lstatSync',()=>{touched++;throw new Error(secret);});syncBuiltinESMExports();
    CanarySession.prototype.start=()=>{touched++;assert.fail('No helper permitted');};
    for(const throws of [false,true]){
      const o=personal();if(o.selection.kind!=='personal')throw 0;o.selection.private.consent=false as never;
      const output:string[]=[];
      const result=await acquirePersonalSnapshot(o,new AbortController().signal,()=>assert.fail('No discovery'),true,text=>{
        output.push(text);if(throws)throw new Error(secret);
      });
      assert.equal(output.length,1);assert.match(output[0]!,/^Acquisition failure: /);sanitized(output);
      assert.deepEqual(result,{failure:'acquisition'});assert.equal(touched,0);
    }
  }finally{Reflect.set(fs,'lstatSync',stat);syncBuiltinESMExports();CanarySession.prototype.start=start;}
});

for(const missing of ['consent','actual','title','browser','json','hook','phase-hook','closure-hook','cleanup-hook',
  'frame-hook','spawn-hook','qualification-hook','exit-uncertainty','fault'] as const)
test('personal browser '+missing+' refuses before filesystem access or helper startup',async()=>{
  const keys=['WORKSPACE_SURVEYOR_PERSONAL_CANARY','WORKSPACE_SURVEYOR_PERSONAL_EXPLORER'];
  const saved=keys.map(k=>process.env[k]),stat=fs.lstatSync,start=CanarySession.prototype.start;let touched=0;
  try{
    delete process.env[keys[0]!];delete process.env[keys[1]!];
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

for(const fault of ['disabled','runtime','host','home','cancel'] as const)
test('source selection '+fault+' stays outside the operation boundary',async()=>{
  const abort=new AbortController();if(fault==='cancel')abort.abort();
  await assert.rejects(preparePersonalExplorer([],()=>{}, {...context,enabled:fault!=='disabled',
    home:fault==='home'?'relative':context.home,nodeVersion:fault==='runtime'?'0':context.nodeVersion,
    executable:fault==='host'?'pwsh.exe':context.executable},abort.signal),e=>e instanceof Error&&e.message==='Preflight refused');
  assert.equal(explorerPreflightSafety.attemptConsumed,false);
});
for(const args of [['--source'],['--source',''],['--source','relative.sqlite'],['--source','\\\\host\\share\\db.sqlite'],
  ['--source',source,'--source',source],['--change-source'],['--unknown'],['--source='+source]])
test('source selection rejects argument shape '+JSON.stringify(args.map((_,i)=>i))+': '+args[0]+': '+args.length,async()=>{
  let displayed=0;
  await assert.rejects(preparePersonalExplorer(args,()=>{displayed++;},context,new AbortController().signal));
  assert.equal(displayed,0);
});
test('source selection derives a default and preserves an invocation-only override without IO',async()=>{
  const stat=fs.lstatSync,read=fs.readFileSync,write=fs.writeFileSync,start=CanarySession.prototype.start;
  let touched=0;const denied=()=>{touched++;throw new Error(secret);};const output:string[]=[];
  try{
    Reflect.set(fs,'lstatSync',denied);Reflect.set(fs,'readFileSync',denied);Reflect.set(fs,'writeFileSync',denied);
    syncBuiltinESMExports();CanarySession.prototype.start=denied;
    for(const [args,expected] of [[[],join(context.home,'.codex','state_5.sqlite')],[['--source',source],source],
      [[],join(context.home,'.codex','state_5.sqlite')]] as const){
      const o=await preparePersonalExplorer(args,s=>output.push(s),context,new AbortController().signal);
      if(o.selection.kind!=='personal')throw 0;
      assert.equal(o.selection.private.source,expected);assert.equal(o.selection.private.titleConsent,true);
      assert.equal(o.selection.private.browserConsent,true);assert.equal(o.explorer?.globalState,join(context.home,'.codex','.codex-global-state.json'));
    }
    assert.equal(touched,0);assert.match(output.join(''),/ChatGPT,Codex/);assert.match(output.join(''),/--source/);
    assert.ok(output.join('').includes(escapeStored(context.scratchParent)));
  }finally{Reflect.set(fs,'lstatSync',stat);Reflect.set(fs,'readFileSync',read);Reflect.set(fs,'writeFileSync',write);
    syncBuiltinESMExports();CanarySession.prototype.start=start;}
});
test('source selection cancellation during local display prevents operation startup',async()=>{
  const abort=new AbortController();
  await assert.rejects(preparePersonalExplorer([],()=>abort.abort(),context,abort.signal));
});

test('database and registry overrides are independent, nonpersistent and strictly parsed',async()=>{
  const json='C:\\Synthetic\\chosen.json';
  for(const args of [['--global-state',json],['--global-state',json,'--source',source],['--source',source,'--global-state',json]]){
    const o=await preparePersonalExplorer(args,()=>{},context,new AbortController().signal);
    assert.equal(o.explorer?.globalState,json);if(o.selection.kind!=='personal')throw 0;
    assert.equal(o.selection.private.source,args.includes('--source')?source:join(context.home,'.codex','state_5.sqlite'));
  }
  for(const args of [['--global-state'],['--global-state','relative'],['--global-state',json,'--global-state',json]])
    await assert.rejects(preparePersonalExplorer(args,()=>{},context,new AbortController().signal));
});

for(const shape of ['populated','missing-json','incompatible-json','projects-only','empty'] as const)
test('attempt-tracked real-shaped DB plus JSON profile '+shape,empirical,async()=>{
  const f=explorerFixture(['projects-only','empty'].includes(shape)?db=>db.exec('CREATE TABLE threads(id TEXT,cwd TEXT,title TEXT,source TEXT,archived INTEGER)'):undefined);
  const before=fs.readFileSync(f.source);let profile='';
  try{
    if(shape==='missing-json')fs.unlinkSync(f.globalState);
    if(shape==='incompatible-json')fs.writeFileSync(f.globalState,'{"unrelated":true}');
    if(shape==='empty')fs.writeFileSync(f.globalState,JSON.stringify({'local-projects':{},'thread-project-assignments':{},'projectless-thread-ids':[]}));
    const r=await runTitledExplorerPreparation(options(f,{explorer:{globalState:f.globalState},hook:(phase,scratch)=>{if(phase==='copied')profile=scratch.profile;}}));
    assert.equal(r.safety.status,'passed');assert.equal(r.safety.attemptConsumed,true);assert.equal(r.safety.cleanup,'removed');assert.equal(r.safety.recovery,'removed');
    assert.equal(profile,shape==='missing-json'?'canary':'explorer');assert.equal(fs.readFileSync(f.source).equals(before),true);
    const d=r.snapshot!.take()!;
    assert.equal(d.projects.length,['missing-json','incompatible-json','empty'].includes(shape)?0:2);
    if(shape==='populated'){assert.equal(d.memberships[3],'projectless');assert.ok(d.visibility.every(v=>v==='inferred'));}
    if(['projects-only','empty'].includes(shape))assert.equal(d.threads.length,0);
    if(['missing-json','incompatible-json'].includes(shape))assert.ok(d.memberships.every(m=>m==='unknown'));
  }finally{assert.equal(await f.teardown(),true);}
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
    keys.forEach(key=>{delete process.env[key];});
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
    if(['incompatible','overflow'].includes(shape)){assert.equal(r.snapshot,undefined);assert.equal(r.summary,undefined);
      assert.equal(r.safety.status,'refused');assert.equal(r.safety.reason,shape==='overflow'?'limit':shape==='incompatible'?'unsupported':'analysis');
      if(shape==='overflow'){assert.equal(r.safety.limit,'reader-rows');assert.equal(r.safety.failureStage,'analysis');
        assert.equal(r.safety.files,1);assert.equal(r.safety.sourcesStable,true);assert.equal(r.safety.schemaReadable,true);}}
    else{assert.equal(r.safety.status,'passed');assert.equal(r.summary?.omittedRows,0);
      assert.equal(r.summary?.titles,shape==='missing-title'?'unavailable':'accepted');
      if(shape==='title-fallback')assert.equal(r.snapshot!.take()!.threads.every(t=>t.title===null),true);else r.snapshot!.discard();}
  }finally{assert.equal(await f.teardown(),true);}
});
test('early Desktop absence never replaces later closure checks or authenticated cleanup',empirical,async()=>{
  const f=explorerFixture();let running=false,reached=false;
  try{
    const result=await runTitledExplorerPreparation(options(f,{closure:()=>running?'present':'absent',hook:phase=>{
      if(phase==='prepared'){reached=true;running=true;}
    }}));
    assert.equal(reached,true);assert.equal(result.safety.reason,'closure');assert.equal(result.snapshot,undefined);
    assert.equal(result.safety.evidence.acquisition?.helperExit,'confirmed');
    assert.equal(result.safety.cleanup,'removed');assert.equal(result.safety.recovery,'removed');
    assert.equal(f.scratches.length,1);assert.ok(f.scratches.every(s=>!fs.existsSync(s.root!)));
  }finally{assert.equal(await f.teardown(),true);}
});

test('Explorer recovery preflight consumes the attempt before early closure refusal; first source failure stays consumed',empirical,async()=>{
  const f=explorerFixture(),stat=fs.lstatSync;let reached=false;
  try{
    const preflight=await runTitledExplorerPreparation(options(f,{closure:()=> 'present'}));assert.equal(preflight.safety.attemptConsumed,true);
    assert.equal(preflight.safety.evidence.acquisition?.stage,'closure-preflight');assert.equal(f.scratches.length,0);
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

for(const shape of ['file','total'] as const)test('source byte limit '+shape+' reports precise sanitized subtype before copying',empirical,async()=>{
  const f=explorerFixture(undefined,true),stat=fs.lstatSync;let measured=false;
  try{
    Reflect.set(fs,'lstatSync',(path:fs.PathLike,...rest:unknown[])=>{
      const value=Reflect.apply(stat,fs,[path,...rest]);
      if([f.source,f.source+'-wal',f.source+'-shm'].includes(String(path))){measured=true;
        value.size=typeof value.size==='bigint'?BigInt((shape==='file'?17:11)*1024*1024):(shape==='file'?17:11)*1024*1024;}
      return value;
    });syncBuiltinESMExports();
    const r=await runTitledExplorerPreparation(options(f));assert.equal(measured,true);assert.equal(r.snapshot,undefined);
    assert.equal(r.safety.reason,'limit');assert.equal(r.safety.limit,shape==='file'?'source-file-bytes':'source-total-bytes');
    assert.equal(r.safety.failureStage,'source-selection');assert.equal(r.safety.files,0);assert.equal(r.safety.cleanup,'removed');
    assert.deepEqual(r.safety.evidence.stages,[]);sanitized(r);
  }finally{Reflect.set(fs,'lstatSync',stat);syncBuiltinESMExports();assert.equal(await f.teardown(),true);}
});

test('missing synthetic default refuses without alternative search or retry',empirical,async()=>{
  const f=explorerFixture(),o=options(f);let starts=0;const start=CanarySession.prototype.start;
  try{
    const missing=join(f.run.sources,'.codex','state_5.sqlite');
    if(o.selection.kind!=='synthetic')throw 0;
    o.selection.fixture.source=missing;
    CanarySession.prototype.start=function(){starts++;return start.call(this);};
    const r=await runTitledExplorerPreparation(o);
    assert.equal(r.safety.status,'refused');assert.equal(r.snapshot,undefined);assert.equal(starts,0);
    assert.equal(fs.existsSync(f.source),true);sanitized(r);
  }finally{CanarySession.prototype.start=start;assert.equal(await f.teardown(),true);}
});

for(const shape of ['complete','missing-index','bad-index','missing-registry','cleanup-recovery'] as const)
test('protected title-index profile '+shape,empirical,async()=>{
  const content=JSON.stringify({id:'record-a',thread_name:'Friendly synthetic atlas',updated_at:'2026-10-09T12:00:00Z'})+'\n';
  const f=explorerFixture(undefined,true,undefined,content);
  try{
    if(shape==='missing-index')fs.unlinkSync(f.sessionIndex);
    if(shape==='missing-registry')fs.unlinkSync(f.globalState);
    if(shape==='bad-index')fs.writeFileSync(f.sessionIndex,Buffer.from([0xff]));
    const original=shape==='missing-index'?undefined:fs.readFileSync(f.sessionIndex);
    const r=await runTitledExplorerPreparation(options(f,{explorer:{globalState:f.globalState,sessionIndex:f.sessionIndex},
      ...(shape==='cleanup-recovery'?{cleanupFault:()=>{throw new Error('Synthetic cleanup refusal');}}:{})}));
    if(shape==='cleanup-recovery'){
      assert.equal(r.snapshot,undefined);assert.equal(r.safety.cleanup,'residual');
      const store=join(f.run.root,'recovery'),root=f.scratches[0]!.root!;
      const paths=[...['key','record'].map(n=>join(store,n)),join(root,'owner'),...['acquisition','analysis'].flatMap(area=>
        ['database.sqlite','database.sqlite-wal','database.sqlite-shm','global-state.json','session-index.jsonl'].map(n=>join(root,area,n)))];
      const save=()=>paths.map(path=>{const s=fs.lstatSync(path,{bigint:true});return {dev:s.dev,ino:s.ino,size:s.size,mtime:s.mtimeNs,bytes:fs.readFileSync(path)};});
      const before=save(),diagnostic=await diagnoseCanaryRecovery({store,executable:options(f).executable,synthetic:true});
      assert.equal(diagnostic.status,'verified');assert.equal(diagnostic.deletionAuthorized,false);sanitized(diagnostic);
      assert.deepEqual(save(),before);assert.equal(fs.existsSync(store),true);
    }
    else{assert.equal(r.safety.status,'passed');assert.equal(r.safety.cleanup,'removed');assert.equal(r.safety.recovery,'removed');
      assert.equal(r.safety.files,['missing-index','missing-registry'].includes(shape)?4:5);
      const d=r.snapshot!.take()!;assert.equal(d.threads.length,4);
      assert.equal(d.threads[0]!.title,['missing-index','bad-index'].includes(shape)?'Fix parser boundaries':'Friendly synthetic atlas');
      assert.equal(d.threads[0]!.titleSource,['missing-index','bad-index'].includes(shape)?'sqlite':'session-index');
      assert.equal(d.projects.length,shape==='missing-registry'?0:2);
    }
    if(original)assert.equal(fs.readFileSync(f.sessionIndex).equals(original),true);
  }finally{assert.equal(await f.teardown(),true);}
});
test('title index selection defaults and explicit overrides are invocation-only',async()=>{
  const index='C:\\Synthetic\\chosen.jsonl';
  for(const args of [[],['--session-index',index],['--session-index',index,'--global-state','C:\\Synthetic\\global.json','--source',source]]){
    const o=await preparePersonalExplorer(args,()=>{},context,new AbortController().signal);
    assert.equal(o.explorer!.sessionIndex,args.length?index:join(context.home,'.codex','session_index.jsonl'));
  }
  for(const args of [['--session-index'],['--session-index','relative'],['--session-index',index,'--session-index',index]])await assert.rejects(preparePersonalExplorer(args,()=>{},context,new AbortController().signal));
});
