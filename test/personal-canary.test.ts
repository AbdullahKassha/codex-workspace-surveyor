import test from 'node:test';
import assert from 'node:assert/strict';
import fs, { copyFileSync, existsSync, lstatSync, readFileSync, writeFileSync, mkdirSync, truncateSync,
  openSync, closeSync, linkSync, symlinkSync, readdirSync, rmdirSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import childProcess, { spawnSync, spawn } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import { SyntheticRun } from './support/synthetic-acquisition.js';
import { CanaryScratch, canaryLimits, contains, forgetRecoveredSyntheticResidual, inspectCanaryAnalysis,
  parseCanaryFrame, retryCanaryCleanup, runCanary, selectedPaths, recoverCanary, CanarySession } from './support/personal-canary.js';
import type { CanaryOptions, CanaryResult, CanaryFault } from './support/personal-canary.js';

const enabled=process.platform==='win32'&&process.env.WORKSPACE_SURVEYOR_RUN_CANARY_PREPARATION==='1';
const empirical={skip:!enabled,concurrency:false};
function privateFree(value:unknown):void {
  assert.equal(/SYNTHETIC_PRIVATE_|workspace-surveyor-canary-|[A-Z]:[\\/]|S-1-\d|\bSDDL\b/i.test(JSON.stringify(value)),false);
}
function fixture(selected:'standalone.sqlite'|'wal.sqlite'='standalone.sqlite') {
  const run=new SyntheticRun('simulated-owner-restricted');
  const source=join(run.sources,selected);
  const scratches:CanaryScratch[]=[];
  const cleanup=run.cleanup.bind(run);
  run.cleanup=()=>{
    let scratchRemoved=true;
    for(const scratch of scratches)if(scratch.root&&existsSync(scratch.root))scratchRemoved=scratch.cleanup()==='removed'&&scratchRemoved;
    const store=join(run.root,'recovery');
    if(existsSync(store)){
      assert.equal(lstatSync(store).isDirectory()&&!lstatSync(store).isSymbolicLink(),true);
      const entries=readdirSync(store);assert.equal(entries.every(n=>['key','record'].includes(n)),true);
      for(const n of entries){const p=join(store,n);const st=lstatSync(p);assert.equal(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1&&st.size<=8192,true);}
      for(const n of entries)fs.unlinkSync(join(store,n));rmdirSync(store);
    }
    const result=cleanup();assert.equal(scratchRemoved,true);return result;
  };
  return {run,source,scratches,selection:{kind:'synthetic' as const,fixture:{source,ownerRoot:run.root,ownerNonce:readFileSync(join(run.root,'owner'),'utf8')}}};
}
function options(f:ReturnType<typeof fixture>, extra:Partial<CanaryOptions>={}):CanaryOptions {
  const executable=process.env.WORKSPACE_SURVEYOR_HELPER_PWSH??'';
  return {executable,selection:f.selection,closure:()=> 'absent',...extra,hook:async(phase,scratch)=>{
    if(phase==='initialized')f.scratches.push(scratch);await extra.hook?.(phase,scratch);
  }};
}
function sourceSnapshot(source:string):string {
  return selectedPaths(source).map(path=>{
    const s=lstatSync(path,{bigint:true});
    return `${s.dev}:${s.ino}:${s.size}:${s.mtimeNs}:${s.ctimeNs}:${readFileSync(path).toString('hex')}`;
  }).join('|');
}
function passed(result:CanaryResult,count:number):void {
  privateFree(result);assert.equal(result.status,'passed');assert.equal(result.cleanup,'removed');
  assert.equal(result.files,count);assert.equal(result.schemaReadable,true);assert.equal(result.sourcesStable,true);
  assert.equal(result.evidence.exitConfirmed,true);
  assert.deepEqual(result.evidence.stages,['prepared','recovery-ready','held','copied','verified']);
}

test('canary bounds and containment are separate from unchanged synthetic defaults',()=>{
  assert.equal(canaryLimits.file,16*1024*1024);assert.equal(canaryLimits.selected,32*1024*1024);
  assert.equal(contains(join('C:','invented','a'),join('C:','invented','ab')),false);
  assert.equal(contains(join('C:','invented','a'),join('C:','invented','a','child')),true);
});
test('canary explicit selection accepts only complete existing companion sets',()=>{
  const f=fixture('wal.sqlite');
  try {
    assert.equal(selectedPaths(f.source).length,3);
    fs.unlinkSync(f.source+'-shm');assert.throws(()=>selectedPaths(f.source),{message:'Canary refused'});
    writeFileSync(f.source+'-shm','invented');writeFileSync(f.source+'-journal','invented');
    assert.throws(()=>selectedPaths(f.source),{message:'Canary refused'});
  }finally{assert.equal(f.run.cleanup().status,'removed');}
});
for(const bound of ['file','total'] as const)test(`canary ${bound} limit refuses metadata before acquisition`,()=>{
  const f=fixture(bound==='total'?'wal.sqlite':'standalone.sqlite');
  try{
    if(bound==='file')truncateSync(f.source,canaryLimits.file+1);
    else {truncateSync(f.source,canaryLimits.file);truncateSync(f.source+'-wal',canaryLimits.file);truncateSync(f.source+'-shm',1);}
    assert.throws(()=>selectedPaths(f.source),{message:'Canary refused'});
  }finally{assert.equal(f.run.cleanup().status,'removed');}
});
test('canary source hard links are refused',()=>{
  const f=fixture();const other=fixture();const alias=join(other.run.sources,'alias');
  try{linkSync(f.source,alias);assert.throws(()=>selectedPaths(f.source),{message:'Canary refused'});}
  finally{fs.unlinkSync(alias);assert.equal(other.run.cleanup().status,'removed');assert.equal(f.run.cleanup().status,'removed');}
});
test('canary source directory junction is refused without following external sources',()=>{
  const f=fixture();const other=fixture();const alias=join(other.run.sources,'alias');
  try{symlinkSync(f.run.sources,alias,'junction');assert.throws(()=>selectedPaths(join(alias,'standalone.sqlite')),{message:'Canary refused'});}
  finally{fs.unlinkSync(alias);assert.equal(other.run.cleanup().status,'removed');assert.equal(f.run.cleanup().status,'removed');}
});
test('scratch cleanup preserves external sources and sentinel after child deletion failure',()=>{
  const f=fixture();const scratch=new CanaryScratch();const before=sourceSnapshot(f.source);
  try{
    scratch.initialize();mkdirSync(join(scratch.root!,'acquisition'));mkdirSync(join(scratch.root!,'analysis'));
    copyFileSync(f.source,scratch.path('acquisition',0));
    let reached=false;
    assert.equal(scratch.cleanup(phase=>{if(phase==='child'){reached=true;throw new Error('SYNTHETIC_PRIVATE_CANARY');}}),'residual');
    assert.equal(reached,true);assert.equal(existsSync(join(scratch.root!,'owner')),true);
    assert.equal(sourceSnapshot(f.source)===before,true);assert.equal(existsSync(join(f.run.sources,'metadata.json')),true);
    assert.equal(scratch.cleanup(),'removed');
  }finally{scratch.cleanup();assert.equal(f.run.cleanup().status,'removed');}
});
test('scratch final-root cleanup retry rejects newly introduced entries',()=>{
  const scratch=new CanaryScratch();scratch.initialize();
  assert.equal(scratch.cleanup(()=>{throw new Error('invented');}),'residual');
  writeFileSync(join(scratch.root!,'unexpected'),'invented');assert.equal(scratch.cleanup(),'residual');
  fs.unlinkSync(join(scratch.root!,'unexpected'));assert.equal(scratch.cleanup(),'removed');
});
test('scratch unknown entries refuse before deleting any owned content',()=>{
  const scratch=new CanaryScratch();scratch.initialize();writeFileSync(join(scratch.root!,'unknown'),'invented');
  assert.equal(scratch.cleanup(),'residual');assert.equal(existsSync(join(scratch.root!,'owner')),true);
  fs.unlinkSync(join(scratch.root!,'unknown'));assert.equal(scratch.cleanup(),'removed');
});
test('analysis authorizer permits only fixed schema operations, never application records or attach',()=>{
  const f=fixture();const scratch=new CanaryScratch();
  try{
    scratch.initialize();mkdirSync(join(scratch.root!,'analysis'));copyFileSync(f.source,scratch.path('analysis',0));
    let attempted=false;
    assert.equal(inspectCanaryAnalysis(scratch,db=>{
      attempted=true;
      for(const sql of ['SELECT * FROM invented_threads','SELECT name FROM main.sqlite_schema',
        'ATTACH DATABASE ":memory:" AS other','PRAGMA journal_mode=WAL','DELETE FROM invented_threads']) {
        assert.throws(()=>db.prepare(sql));
      }
    }),true);assert.equal(attempted,true);
  }finally{assert.equal(scratch.cleanup(),'removed');assert.equal(f.run.cleanup().status,'removed');}
});
test('protocol rejects private diagnostics, extra fields and wrong correlation',()=>{
  const nonce='invented';
  for(const raw of ['SYNTHETIC_PRIVATE_CANARY',JSON.stringify({stage:'prepared',run:nonce,count:0,protected:true,path:'SYNTHETIC_PRIVATE_CANARY'}),
    JSON.stringify({stage:'prepared',run:'other',count:0,protected:true}), ' '.repeat(8193)])
    assert.throws(()=>parseCanaryFrame(raw,nonce),{message:'Canary refused'});
});
test('manual entry requires opt-in and accepts no source command-line arguments',()=>{
  const path=fileURLToPath(new URL('./support/personal-canary-entry.js',import.meta.url));
  const output=spawnSync(process.execPath,[path,'SYNTHETIC_PRIVATE_CANARY'],
    {encoding:'utf8',env:{...process.env,WORKSPACE_SURVEYOR_PERSONAL_CANARY:'0'}});
  assert.equal(output.status,2);assert.equal(output.stdout,'Personal canary not enabled.\n');privateFree(output.stdout+output.stderr);
});
test('canary preparation and entry stay outside product imports; reviewed helpers and fixture builder unchanged',()=>{
  const runner=readFileSync('test/support/personal-canary.ts','utf8');
  const entry=readFileSync('test/support/personal-canary-entry.ts','utf8');
  assert.match(runner,/FileShare|personal-canary-helper/);assert.match(entry,/setRawMode\(true\)/);
  assert.equal(/console\.(?:log|error)|stderr\.write|writeFileSync/.test(entry),false);
  for(const name of fs.readdirSync('src'))if(name.endsWith('.ts'))assert.doesNotMatch(readFileSync(join('src',name),'utf8'),/personal-canary/);
});

for(const selected of ['standalone.sqlite','wal.sqlite'] as const)test(`protected canary preparation: ${selected}`,empirical,async()=>{
  const f=fixture(selected);const before=sourceSnapshot(f.source);
  try{passed(await runCanary(options(f)),selected==='wal.sqlite'?3:1);assert.equal(sourceSnapshot(f.source)===before,true);}
  finally{assert.equal(f.run.cleanup().status,'removed');}
});
for(const observation of ['present','unknown'] as const)test(`injected initial closure ${observation} refuses before any scratch`,empirical,async()=>{
  const f=fixture();let initialized=false;
  try{const r=await runCanary(options(f,{closure:()=>observation,hook:()=>{initialized=true;}}));
    privateFree(r);assert.equal(r.reason,'closure');assert.equal(r.cleanup,'removed');assert.equal(initialized,false);}
  finally{assert.equal(f.run.cleanup().status,'removed');}
});
test('injected reappearing writer refuses while sources remain held',empirical,async()=>{
  const f=fixture();let calls=0;
  try{const r=await runCanary(options(f,{closure:()=>++calls>=3?'present':'absent'}));privateFree(r);
    assert.equal(r.reason,'closure');assert.deepEqual(r.evidence.stages,['prepared','recovery-ready','held']);assert.equal(r.cleanup,'removed');}
  finally{assert.equal(f.run.cleanup().status,'removed');}
});
test('writer on the last SHM refuses after two retained handles and before copying',empirical,async()=>{
  const f=fixture('wal.sqlite');const fd=openSync(f.source+'-shm','r+');let copied=false;
  try{const r=await runCanary(options(f,{hook:phase=>{if(phase==='copied')copied=true;}}));privateFree(r);
    assert.equal(r.status,'refused');assert.equal(r.evidence.phase,'open');assert.equal(r.evidence.opened,2);
    assert.equal(copied,false);assert.equal(r.cleanup,'removed');assert.equal(r.evidence.exitConfirmed,true);}
  finally{closeSync(fd);assert.equal(f.run.cleanup().status,'removed');}
});
for(const fault of ['protected','descriptor','partial-copy','diagnostic'] as const)test(`canary fault evidence: ${fault}`,empirical,async()=>{
  const f=fixture();const before=sourceSnapshot(f.source);let partialVerified=false;
  try{
    const r=await runCanary(options(f,{fault,hook:(phase,scratch)=>{
      if(phase==='exited'&&fault==='partial-copy')partialVerified=lstatSync(scratch.path('acquisition',0)).size===16;
    }}));privateFree(r);assert.equal(r.status,'refused');assert.equal(r.cleanup,['descriptor','diagnostic'].includes(fault)?'residual':'removed');assert.equal(r.evidence.exitConfirmed,true);
    const expected={protected:['protect','after-protection'],descriptor:['copy','destination-descriptor'],
      'partial-copy':['copy','after-partial-write'],diagnostic:['verify','diagnostic']}[fault];
    assert.equal(r.evidence.phase,expected[0]);assert.equal(r.evidence.fault,expected[1]);
    assert.equal(r.evidence.partialWritten,fault==='partial-copy');assert.equal(partialVerified,fault==='partial-copy');
    if(fault==='diagnostic')assert.equal(r.evidence.diagnosticsDiscarded,true);
    assert.equal(sourceSnapshot(f.source)===before,true);
  }finally{assert.equal(f.run.cleanup().status,'removed');}
});
for(const mutation of ['source','companion'] as const)test(`canary pre-lock ${mutation} change refuses`,empirical,async()=>{
  const f=fixture();
  try{const r=await runCanary(options(f,{hook:phase=>{if(phase==='prepared'){
    if(mutation==='source')writeFileSync(f.source,'invented altered bytes');else writeFileSync(f.source+'-wal','invented');
  }}}));privateFree(r);assert.equal(r.status,'refused');assert.deepEqual(r.evidence.stages,['prepared']);assert.equal(r.cleanup,'removed');}
  finally{assert.equal(f.run.cleanup().status,'removed');}
});
test('source handles permit readers and deny writing, rename and deletion through analysis',empirical,async()=>{
  const f=fixture();let held=false;
  try{passed(await runCanary(options(f,{hook:phase=>{
    if(phase==='analyzed'){
      held=true;const fd=openSync(f.source,'r');closeSync(fd);
      assert.throws(()=>openSync(f.source,'r+'));assert.throws(()=>fs.renameSync(f.source,f.source+'.renamed'));
      assert.throws(()=>fs.unlinkSync(f.source));
    }
  }})),1);assert.equal(held,true);const writer=openSync(f.source,'r+');closeSync(writer);}
  finally{assert.equal(f.run.cleanup().status,'removed');}
});
test('analysis changes cannot modify acquisition or source bytes',empirical,async()=>{
  const f=fixture();const before=sourceSnapshot(f.source);let touched=false;
  try{passed(await runCanary(options(f,{hook:(phase,scratch)=>{if(phase==='analyzed'){
    touched=true;const p=scratch.path('analysis',0);const b=readFileSync(p);b[b.length-1]=(b[b.length-1]??0)^1;writeFileSync(p,b);
  }}})),1);assert.equal(touched,true);assert.equal(sourceSnapshot(f.source)===before,true);}
  finally{assert.equal(f.run.cleanup().status,'removed');}
});
test('malformed analysis refuses without raw SQLite exception diagnostics',empirical,async()=>{
  const f=fixture();let altered=false;
  try{const r=await runCanary(options(f,{hook:(phase,scratch)=>{if(phase==='copied'){
    altered=true;writeFileSync(scratch.path('analysis',0),'SYNTHETIC_PRIVATE_CANARY');
  }}}));privateFree(r);assert.equal(altered,true);assert.equal(r.reason,'analysis');assert.equal(r.cleanup,'removed');}
  finally{assert.equal(f.run.cleanup().status,'removed');}
});
test('acquisition tampering withholds all results',empirical,async()=>{
  const f=fixture();
  try{const r=await runCanary(options(f,{hook:(phase,scratch)=>{if(phase==='analyzed')writeFileSync(scratch.path('acquisition',0),'invented');}}));
    privateFree(r);assert.equal(r.status,'refused');assert.equal(r.reason,'unstable');assert.equal(r.cleanup,'removed');}
  finally{assert.equal(f.run.cleanup().status,'removed');}
});
for(const corrupt of ['extra','oversize','duplicate'] as const)test(`canary protocol ${corrupt} refuses and suppresses diagnostics`,empirical,async()=>{
  const f=fixture();
  try{const r=await runCanary(options(f,{corruptFrame:raw=>{
    if(JSON.parse(raw).stage==='finished')return raw;
    if(corrupt==='oversize')return 'SYNTHETIC_PRIVATE_CANARY'.repeat(500);
    if(corrupt==='duplicate'){const x=JSON.parse(raw);x.stage='prepared';return JSON.stringify(x);}
    return JSON.stringify({...JSON.parse(raw),private:'SYNTHETIC_PRIVATE_CANARY'});
  }}));privateFree(r);assert.equal(r.status,'refused');assert.equal(r.cleanup,'removed');assert.equal(r.evidence.exitConfirmed,true);}
  finally{assert.equal(f.run.cleanup().status,'removed');}
});
test('canary cleanup failure is residual with ownership retained and exact authenticated recovery',empirical,async()=>{
  const f=fixture();const before=sourceSnapshot(f.source);let reached=false;let retained=false;
  try{const r=await runCanary(options(f,{cleanupFault:phase=>{if(phase==='child'){reached=true;throw new Error('SYNTHETIC_PRIVATE_CANARY');}},
    hook:(phase,scratch)=>{if(phase==='exited')retained=existsSync(join(scratch.root!,'owner'));}}));
    privateFree(r);assert.equal(r.status,'refused');assert.equal(r.cleanup,'residual');assert.equal(reached,true);assert.equal(retained,true);
    assert.equal(sourceSnapshot(f.source)===before,true);assert.equal(await retryCanaryCleanup(),'removed');
  }finally{assert.equal(f.run.cleanup().status,'removed');}
});
test('unconfirmed exit withholds cleanup and findings until separate synthetic recovery',empirical,async()=>{
  const f=fixture();let owned:CanaryScratch|undefined;
  try{
    const r=await runCanary(options(f,{simulateExitUncertainty:true,hook:(phase,scratch)=>{
      if(phase==='initialized')owned=scratch;
    }}));privateFree(r);assert.equal(r.status,'refused');assert.equal(r.cleanup,'residual');
    assert.equal(r.evidence.exitConfirmed,false);assert.equal(r.schemaReadable,false);
    assert.equal(await retryCanaryCleanup(),'residual');assert.equal(existsSync(owned!.root!),true);
    // The simulation has an actually exited helper; independently verify released sources.
    const writer=openSync(f.source,'r+');closeSync(writer);
    assert.equal(owned!.cleanup(),'removed');forgetRecoveredSyntheticResidual(owned!.root!);
  }finally{assert.equal(f.run.cleanup().status,'removed');}
});
test('missing selected executable refuses before initialization and discloses no diagnostics',empirical,async()=>{
  const f=fixture();let initialized=false;
  try{const r=await runCanary(options(f,{executable:join(f.run.root,'SYNTHETIC_PRIVATE_CANARY','pwsh.exe'),
    hook:()=>{initialized=true;}}));privateFree(r);assert.equal(r.status,'refused');assert.equal(r.cleanup,'removed');
    assert.equal(initialized,false);assert.deepEqual(r.evidence.stages,[]);
  }finally{assert.equal(f.run.cleanup().status,'removed');}
});
test('initialization root lstat exception and captured diagnostics are sanitized; unknown root not deleted',empirical,async()=>{
  const f=fixture();const original=fs.lstatSync;let root='';let identity:{dev:bigint;ino:bigint}|undefined;
  const stdout=process.stdout.write;const stderr=process.stderr.write;let captured='';
  try{
    Reflect.set(fs,'lstatSync',((path:fs.PathLike,...args:unknown[])=>{
      if(String(path).includes('workspace-surveyor-canary-')&&!root){
        root=String(path);identity=original(path,{bigint:true});throw new Error('SYNTHETIC_PRIVATE_CANARY '+root);
      }
      return Reflect.apply(original,fs,[path,...args]);
    }) as typeof fs.lstatSync);syncBuiltinESMExports();
    process.stdout.write=((chunk:unknown)=>{captured+=String(chunk);return true;}) as typeof stdout;
    process.stderr.write=((chunk:unknown)=>{captured+=String(chunk);return true;}) as typeof stderr;
    const r=await runCanary(options(f));privateFree(r);assert.equal(r.status,'refused');assert.equal(r.cleanup,'residual');
  }finally{
    Reflect.set(fs,'lstatSync',original);syncBuiltinESMExports();process.stdout.write=stdout;process.stderr.write=stderr;
    privateFree(captured);
    assert.ok(root);const actual=lstatSync(root,{bigint:true});assert.equal(actual.dev,identity?.dev);assert.equal(actual.ino,identity?.ino);
    assert.deepEqual(readdirSync(root),[]);rmdirSync(root);forgetRecoveredSyntheticResidual(root);assert.equal(f.run.cleanup().status,'removed');
  }
});

// No child output is forwarded: ownership frames are private harness capabilities.
async function worker(request:object,f?:ReturnType<typeof fixture>):Promise<Record<string,unknown>>{
  const child=spawn(process.execPath,[fileURLToPath(new URL('./support/personal-canary-recovery-worker.js',import.meta.url))],
    {shell:false,windowsHide:true,stdio:['pipe','pipe','pipe']});
  let output='',unsafe=false,diagnostic=false;
  child.stdout.setEncoding('utf8');child.stdout.on('data',(chunk:string)=>{
    if(Buffer.byteLength(output)+Buffer.byteLength(chunk)>8192)unsafe=true;else output+=chunk;
  });
  child.stderr.on('data',()=>{diagnostic=true;});child.on('error',()=>{unsafe=true;});
  const done=new Promise<number|null>(resolve=>child.on('close',resolve));child.stdin.end(JSON.stringify(request));
  const code=await done;
  // Capture cleanup ownership before asserting any result.
  let result:Record<string,unknown>|undefined;
  for(const line of output.trim().split('\n')){
    let x:Record<string,unknown>;try{x=JSON.parse(line);}catch{unsafe=true;continue;}
    if(x.stage==='owned'&&f){
      const scratch=new CanaryScratch();scratch.root=String(x.root);
      Object.defineProperty(scratch,'nonce',{value:String(x.nonce)});
      Reflect.set(scratch,'identity',{dev:BigInt(String(x.dev)),ino:BigInt(String(x.ino))});f.scratches.push(scratch);
    }else if(x.stage==='result')result=x;else unsafe=true;
  }
  assert.equal(unsafe,false);assert.equal(diagnostic,false);assert.equal(code,0);assert.ok(result);return result;
}
for(const failure of ['cleanup','missing','malformed'] as const)test(`fresh process recovers copied bytes after ${failure} failure and runner exit`,empirical,async()=>{
  const f=fixture('wal.sqlite');const before=sourceSnapshot(f.source);const store=join(f.run.root,'recovery');
  try{
    const first=await worker({operation:'run',failure,fixture:f.selection.fixture,executable:options(f).executable},f);
    privateFree(first.result);const r=first.result as CanaryResult;
    assert.equal(r.status,'refused');assert.equal(r.cleanup,'residual');assert.equal(r.recovery,'available');
    assert.equal(r.evidence.stages.includes('copied'),true);
    const root=f.scratches[0]!.root!;assert.equal(lstatSync(join(root,'acquisition','database.sqlite')).size>0,true);
    const bytes=readFileSync(join(store,'record'),'utf8');
    assert.equal(bytes.includes(f.source)||bytes.includes('standalone.sqlite')||bytes.includes('SYNTHETIC_PRIVATE_'),false);
    const payload=JSON.parse(JSON.parse(bytes).payload);
    assert.deepEqual(Object.keys(payload).sort(),['entries','nonce','root','store','version']);
    const second=await worker({operation:'recover',store,executable:options(f).executable});
    privateFree(second);assert.equal(second.status,'removed');assert.equal(existsSync(root)||existsSync(store),false);
    assert.equal(sourceSnapshot(f.source)===before,true);assert.equal(existsSync(join(f.run.sources,'metadata.json')),true);
  }finally{assert.equal(f.run.cleanup().status,'removed');}
});
async function leaveCopies(f:ReturnType<typeof fixture>):Promise<string>{
  const r=await runCanary(options(f,{cleanupFault:phase=>{if(phase==='file')throw new Error('SYNTHETIC_PRIVATE_RECOVERY');}}));
  privateFree(r);assert.equal(r.cleanup,'residual');assert.equal(r.recovery,'available');assert.equal(r.evidence.stages.includes('copied'),true);
  return join(f.run.root,'recovery');
}
test('runner and helper lifetime handles block recovery; concurrent recoveries serialize',empirical,async()=>{
  const f=fixture();let checked=false;
  try{
    const r=await runCanary(options(f,{hook:async phase=>{if(phase==='copied'){
      checked=true;const store=join(f.run.root,'recovery');
      assert.throws(()=>openSync(join(store,'record'),'r+')); // Helper denies writes; ordinary Node reads alone do not.
      assert.throws(()=>fs.unlinkSync(join(store,'record')));assert.throws(()=>fs.unlinkSync(join(store,'key')));
      assert.equal(await recoverCanary({store,executable:options(f).executable,synthetic:true}),'busy');
    }},cleanupFault:phase=>{if(phase==='file')throw new Error('invented');}}));
    assert.equal(checked,true);assert.equal(r.recovery,'available');
    const store=join(f.run.root,'recovery'),fd=openSync(join(store,'record'),'r');
    try{assert.equal(await recoverCanary({store,executable:options(f).executable,synthetic:true}),'busy');}finally{closeSync(fd);}
    let competing=false;
    assert.equal(await recoverCanary({store,executable:options(f).executable,synthetic:true,locked:async()=>{
      competing=true;assert.equal(await recoverCanary({store,executable:options(f).executable,synthetic:true}),'busy');
    }}),'removed');assert.equal(competing,true);
  }finally{assert.equal(f.run.cleanup().status,'removed');}
});
for(const fault of ['recovery-create','recovery-descriptor','recovery-write','recovery-flush','recovery-readback'] as const)
 test(`persistence ${fault} fault is reached before any source copying`,empirical,async()=>{
  const f=fixture();let copied=false;
  try{const r=await runCanary(options(f,{fault,hook:phase=>{if(phase==='copied')copied=true;}}));privateFree(r);
    assert.equal(r.status,'refused');assert.equal(r.evidence.phase,'persistence');assert.equal(r.evidence.fault,fault);
    assert.equal(r.evidence.opened,0);assert.equal(copied,false);assert.equal(r.cleanup,'removed');
  }finally{assert.equal(f.run.cleanup().status,'removed');}
});
for(const phase of ['child','marker','root','metadata'] as const)test(`restart cleanup resumes after ${phase} deletion failure`,empirical,async()=>{
  const f=fixture();
  try{
    const store=await leaveCopies(f);let reached=false;
    const r=await recoverCanary({store,executable:options(f).executable,synthetic:true,fault:p=>{
      if(p===phase){reached=true;throw new Error('SYNTHETIC_PRIVATE_RECOVERY');}
    }});
    assert.equal(reached,true);assert.notEqual(r,'removed');assert.equal(existsSync(join(store,'record')),true);
    const next=await worker({operation:'recover',store,executable:options(f).executable});assert.equal(next.status,'removed');
  }finally{assert.equal(f.run.cleanup().status,'removed');}
});
for(const defect of ['wrong-key','missing-key','missing-record','truncated','altered','unknown-fields','wrong-root','wrong-nonce','missing-marker','replacement','unknown-entry','link'] as const)
 test(`persistent recovery refuses ${defect} without deleting unrelated objects`,empirical,async()=>{
  const f=fixture();let undo=()=>{};
  try{
    const store=await leaveCopies(f),root=f.scratches[0]!.root!;
    const key=readFileSync(join(store,'key')),record=readFileSync(join(store,'record'));
    const sentinel=join(f.run.sources,'metadata.json'),before=readFileSync(sentinel);
    const copy=join(root,'analysis','database.sqlite');
    if(defect==='wrong-key')writeFileSync(join(store,'key'),Buffer.alloc(32));
    else if(defect==='missing-key')fs.unlinkSync(join(store,'key'));
    else if(defect==='missing-record')fs.unlinkSync(join(store,'record'));
    else if(defect==='truncated')writeFileSync(join(store,'record'),record.subarray(0,20));
    else if(defect==='altered'){const e=JSON.parse(record.toString());e.payload+=' ';writeFileSync(join(store,'record'),JSON.stringify(e));}
    else if(['unknown-fields','wrong-root','wrong-nonce'].includes(defect)){
      const e=JSON.parse(record.toString()),p=JSON.parse(e.payload);
      if(defect==='unknown-fields')p.private='SYNTHETIC_PRIVATE_RECOVERY';
      if(defect==='wrong-root')p.root.ino='1';
      if(defect==='wrong-nonce')p.nonce='00000000-0000-0000-0000-000000000000';
      e.payload=JSON.stringify(p);e.mac=createHmac('sha256',key).update(e.payload).digest('hex');writeFileSync(join(store,'record'),JSON.stringify(e));
    }else if(defect==='missing-marker'){
      const p=join(root,'owner');const original=readFileSync(p);fs.unlinkSync(p);undo=()=>writeFileSync(p,original);
    }else if(defect==='unknown-entry'){
      const p=join(root,'sentinel');writeFileSync(p,'invented');undo=()=>fs.unlinkSync(p);
    }else{
      const saved=join(f.run.sources,'saved-copy');fs.renameSync(copy,saved);
      if(defect==='link')linkSync(sentinel,copy);else writeFileSync(copy,'invented replacement');
      undo=()=>{fs.unlinkSync(copy);fs.renameSync(saved,copy);};
    }
    const result=await recoverCanary({store,executable:options(f).executable,synthetic:true});
    assert.notEqual(result,'removed');assert.equal(existsSync(root),true);assert.equal(readFileSync(sentinel).equals(before),true);
    undo();undo=()=>{};
    // Restore only invented control metadata in this harness, never permissions or originals.
    // Missing files are recovered by independent teardown: no fabricated DACL recovery claim.
    if(existsSync(join(store,'key')))writeFileSync(join(store,'key'),key);
    if(existsSync(join(store,'record')))writeFileSync(join(store,'record'),record);
  }finally{undo();assert.equal(f.run.cleanup().status,'removed');}
});
test('serialization failures and multibyte request limits precede every spawn',()=>{
  const original=childProcess.spawn;let spawned=0;
  try{
    Reflect.set(childProcess,'spawn',()=>{spawned++;throw new Error('Must not spawn');});syncBuiltinESMExports();
    for(const request of [{value:'Ã©'.repeat(5000)},{value:'a'.repeat(8192)},
      {operation:'acquire',root:'C:/invented/root',nonce:'invented',count:3,source:'a'.repeat(6800)},{toJSON(){throw new Error('SYNTHETIC_PRIVATE_RECOVERY');}}]){
      let error:unknown;try{new CanarySession(request,'invented','invented').start();}catch(e){error=e;}
      assert.ok(error);privateFree(String(error));
    }
    assert.equal(spawned,0);
  }finally{Reflect.set(childProcess,'spawn',original);syncBuiltinESMExports();}
});
test('post-spawn failure leaves an owned child that exits cooperatively',empirical,async()=>{
  const nonce=randomUUID();const session=new CanarySession({operation:'invalid',nonce},process.env.WORKSPACE_SURVEYOR_HELPER_PWSH!,nonce);
  let reached=false;
  try{assert.throws(()=>session.start(()=>{reached=true;throw new Error('SYNTHETIC_PRIVATE_RECOVERY');}));}
  finally{await session.finish();}
  assert.equal(reached,true);assert.equal(session.spawned,true);assert.equal(session.processExited,true);
});

test('an existing recovery slot blocks acquisition without overwriting or opening sources',empirical,async()=>{
  const f=fixture();
  try{
    const store=await leaveCopies(f);const record=readFileSync(join(store,'record'));let initialized=false;
    const r=await runCanary(options(f,{hook:phase=>{if(phase==='initialized')initialized=true;}}));
    privateFree(r);assert.equal(r.status,'refused');assert.equal(r.cleanup,'residual');assert.equal(r.recovery,'unavailable');
    assert.equal(initialized,false);assert.equal(r.evidence.opened,0);assert.equal(readFileSync(join(store,'record')).equals(record),true);
    assert.equal(await recoverCanary({store,executable:options(f).executable,synthetic:true}),'removed');
  }finally{assert.equal(f.run.cleanup().status,'removed');}
});

const wait=(milliseconds:number):Promise<void>=>new Promise(done=>setTimeout(done,milliseconds));
test('recovery deletion acknowledgments accept only bounded sanitized evidence',()=>{
  const nonce=randomUUID();
  for(const stage of ['recovery-deleted','recovery-paused']){
    const frame={stage,run:nonce,count:1,deleted:true};
    assert.equal(parseCanaryFrame(JSON.stringify(frame),nonce).stage,stage);
    for(const invalid of [{...frame,count:11},{...frame,count:1.5},{...frame,deleted:'yes'},
      {...frame,private:'SYNTHETIC_PRIVATE_RECOVERY'},{...frame,run:'wrong'}]){
      let error:unknown;try{parseCanaryFrame(JSON.stringify(invalid),nonce);}catch(e){error=e;}
      assert.ok(error);privateFree(String(error));
    }
  }
  assert.throws(()=>parseCanaryFrame(JSON.stringify({stage:'recovery-paused',run:nonce,count:1,deleted:false}),nonce));
});
test('recovery scratch deletion occurs only in the exclusive-handle helper',empirical,async()=>{
  const f=fixture();const originalUnlink=fs.unlinkSync,originalRmdir=fs.rmdirSync;
  const mutations:string[]=[];
  try{
    const store=await leaveCopies(f),root=f.scratches[0]!.root!;
    Reflect.set(fs,'unlinkSync',(path:fs.PathLike)=>{mutations.push(String(path));return originalUnlink(path);});
    Reflect.set(fs,'rmdirSync',(path:fs.PathLike)=>{mutations.push(String(path));return originalRmdir(path);});syncBuiltinESMExports();
    assert.equal(await recoverCanary({store,executable:options(f).executable,synthetic:true}),'removed');
    assert.equal(mutations.some(path=>contains(root,path)),false);
    assert.equal(mutations.length,3);assert.equal(mutations.every(path=>contains(store,path)),true);
  }finally{
    Reflect.set(fs,'unlinkSync',originalUnlink);Reflect.set(fs,'rmdirSync',originalRmdir);syncBuiltinESMExports();
    assert.equal(f.run.cleanup().status,'removed');
  }
});
test('destructive recovery crosses the old deadline while exclusion survives Node timeout',empirical,async()=>{
  const f=fixture();const before=sourceSnapshot(f.source);let paused=false,busy=false,owner:CanarySession|undefined;
  try{
    const store=await leaveCopies(f),root=f.scratches[0]!.root!,started=Date.now();
    const result=await recoverCanary({store,executable:options(f).executable,synthetic:true,probe:'slow',step:async(event,session)=>{
      if(event.stage==='paused'){
        privateFree(event);assert.equal(event.count,1);paused=true;owner=session;
        assert.equal(existsSync(join(root,'acquisition','database.sqlite')),false);
        await wait(31_000);assert.equal(session.processExited,false);assert.equal(session.unsafe,true);
        busy=await recoverCanary({store,executable:options(f).executable,synthetic:true})==='busy';assert.equal(busy,true);
        assert.equal(existsSync(join(root,'analysis','database.sqlite')),true);
      }
    }});
    assert.equal(paused&&busy,true);assert.equal(Date.now()-started>=35_000,true);
    assert.equal(result,'residual');assert.equal(owner?.processExited,true);
    assert.equal(existsSync(join(store,'record'))&&existsSync(join(store,'key')),true);
    assert.equal(existsSync(join(root,'analysis','database.sqlite')),true);
    assert.equal(await recoverCanary({store,executable:options(f).executable,synthetic:true}),'removed');
    assert.equal(sourceSnapshot(f.source)===before,true);assert.equal(existsSync(join(f.run.sources,'metadata.json')),true);
  }finally{assert.equal(f.run.cleanup().status,'removed');}
});
for(const timing of ['before','during'] as const)for(const failure of ['eof','malformed'] as const)
 test(`recovery ${failure} ${timing} dispatch stops deletion before exclusion release`,empirical,async()=>{
  const f=fixture();const before=sourceSnapshot(f.source);let reached=false,owner:CanarySession|undefined;
  try{
    const store=await leaveCopies(f),root=f.scratches[0]!.root!;
    const result=await recoverCanary({store,executable:options(f).executable,synthetic:true,
      ...(timing==='during'?{probe:'short' as const}:{}),step:async(event,session)=>{
        if(!reached&&event.stage===(timing==='before'?'before':'paused')){
          privateFree(event);assert.equal(event.count,1);reached=true;owner=session;
          if(timing==='during'){
            assert.equal(existsSync(join(root,'acquisition','database.sqlite')),false);
            assert.equal(await recoverCanary({store,executable:options(f).executable,synthetic:true}),'busy');
          }
          if(failure==='eof')session.cancel();else session.send({command:'SYNTHETIC_PRIVATE_INVALID'});
        }
      }});
    assert.equal(reached,true);assert.equal(result,'residual');assert.equal(owner?.processExited,true);
    assert.equal(existsSync(join(root,'acquisition','database.sqlite')),timing==='before');
    assert.equal(existsSync(join(root,'analysis','database.sqlite')),true);
    assert.equal(existsSync(join(store,'record'))&&existsSync(join(store,'key')),true);
    // After actual exit no remaining deletion can be dispatched by the first recovery.
    await wait(100);assert.equal(existsSync(join(root,'analysis','database.sqlite')),true);
    assert.equal(await recoverCanary({store,executable:options(f).executable,synthetic:true}),'removed');
    assert.equal(sourceSnapshot(f.source)===before,true);assert.equal(existsSync(join(f.run.sources,'metadata.json')),true);
  }finally{assert.equal(f.run.cleanup().status,'removed');}
});
test('delayed Node authorization after the receive deadline cannot dispatch another deletion',empirical,async()=>{
  const f=fixture();let delayed=false,owner:CanarySession|undefined;
  try{
    const store=await leaveCopies(f),root=f.scratches[0]!.root!;const before=sourceSnapshot(f.source);
    const result=await recoverCanary({store,executable:options(f).executable,synthetic:true,step:async(event,session)=>{
      if(event.stage==='deleted'&&event.count===1){
        privateFree(event);delayed=true;owner=session;await wait(31_000);
        assert.equal(session.processExited,true);
        assert.equal(existsSync(join(root,'analysis','database.sqlite')),true);
      }
    }});
    assert.equal(delayed,true);assert.equal(result,'residual');assert.equal(owner?.processExited,true);
    assert.equal(existsSync(join(root,'analysis','database.sqlite')),true);
    assert.equal(existsSync(join(store,'record')),true);
    assert.equal(await recoverCanary({store,executable:options(f).executable,synthetic:true}),'removed');
    assert.equal(sourceSnapshot(f.source)===before,true);assert.equal(existsSync(join(f.run.sources,'metadata.json')),true);
  }finally{assert.equal(f.run.cleanup().status,'removed');}
});
