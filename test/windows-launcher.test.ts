import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync, type spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { pathToFileURL } from 'node:url';
import { directoryFixture } from './support/discovery-fixture.js';
import { explorerFixture } from './support/explorer-fixture.js';
import { runExplorerEntry } from './support/explorer-entry.js';
import { runSyntheticExplorer, type CanaryResult } from './support/personal-canary.js';
import { ExplorerSnapshot, reconcile } from '../src/explorer/model.js';
import { serveLocalExplorer } from '../src/explorer/server.js';
import { browserCommand, launchPrerequisite, launchReport, openWindowsBrowser, windowsDiscoveryArgs } from './support/windows-explorer-entry.js';
import { preparePersonalExplorer } from './support/personal-explorer-entry.js';

const secret='SYNTHETIC_LAUNCH_PRIVATE',url='http://127.0.0.1:12345/#'+'a'.repeat(64);
const safety:CanaryResult={status:'passed',reason:'none',cleanup:'removed',recovery:'removed',files:1,schemaReadable:true,sourcesStable:true,
  evidence:{stages:['prepared','recovery-ready','held','copied','verified'],phase:'release',fault:'none',partialWritten:false,opened:1,exitConfirmed:true,diagnosticsDiscarded:false}};
function snapshot(){return new ExplorerSnapshot(reconcile({namespace:'synthetic-launch',from:'2026-10-11T00:00:00Z',through:'2026-10-11T00:00:01Z'},
  {rowsRead:0,omittedRows:0,ambiguousIds:0,titles:'unavailable',projects:'unavailable',correspondence:'unknown',unconsumedColumns:false},[],[],[]));}
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(yes=>{resolve=yes;});return {promise,resolve};}

for(const name of ['InventedProfile','Invented profile Ω with spaces'])test('Windows convention selects only the exact existing root: '+name,async()=>{
  const f=directoryFixture();
  try{
    const home=f.mkdir(join(f.owner,name)),root=f.mkdir(join(home,'Documents','Codex')),probed:string[]=[];
    const args=windowsDiscoveryArgs([],home,path=>{probed.push(path);return fs.lstatSync(path).isDirectory();});
    assert.deepEqual(probed,[root]);assert.deepEqual(args,['--discovery-root',root]);
    assert.deepEqual(windowsDiscoveryArgs([],home),args);
    const options=await preparePersonalExplorer(args,()=>{},
      {enabled:true,nodeVersion:'24.18.1',executable:'C:\\Synthetic\\pwsh.exe',scratchParent:f.owner,home},new AbortController().signal);
    assert.equal(options.discoveryRoot,root);assert.equal(options.selection.kind,'personal');
  }finally{f.cleanup();}
});
test('missing conventional directory keeps ordinary source selection without searching alternatives',async()=>{
  const f=directoryFixture();
  try{
    const home=f.mkdir(join(f.owner,'Invented missing profile Ω'));
    f.mkdir(join(home,'Codex'));f.mkdir(join(home,'Documents','Other')); // Plausible alternatives must not be selected.
    for(const fileInstead of [false,true]){
      if(fileInstead)fs.writeFileSync(join(home,'Documents','Codex'),'invented non-directory');
      const original=['--source',join(home,'selected.sqlite')];
      assert.deepEqual(windowsDiscoveryArgs(original,home),original);
      const options=await preparePersonalExplorer(windowsDiscoveryArgs(original,home),()=>{},
        {enabled:true,nodeVersion:'24.18.1',executable:'C:\\Synthetic\\pwsh.exe',scratchParent:f.owner,home},new AbortController().signal);
      assert.equal(options.discoveryRoot,undefined);assert.equal(options.selection.kind,'personal');
    }
  }finally{f.cleanup();}
});
test('unavailable profile/root never falls back or retries and never exposes probe errors',()=>{
  for(const home of [undefined,'','relative profile'])assert.deepEqual(windowsDiscoveryArgs([],home,()=>assert.fail('No probe allowed')),[]);
  const calls:string[]=[];
  const home=resolve('Invented profile Ω');
  assert.deepEqual(windowsDiscoveryArgs([],home,path=>{calls.push(path);throw new Error(secret);}),[]);
  assert.deepEqual(calls,[join(home,'Documents','Codex')]);
});
test('explicit discovery overrides remain exact and do not probe the convention, including invalid overrides',()=>{
  for(const root of [resolve('Explicit scope Ω with spaces'),'relative invalid']){
    const args=['--source',resolve('Invented source.sqlite'),'--discovery-root',root];
    assert.deepEqual(windowsDiscoveryArgs(args,resolve('Unused profile'),()=>assert.fail('Override must take precedence')),args);
  }
  assert.deepEqual(windowsDiscoveryArgs(['--discovery-root'],resolve('Unused profile'),()=>assert.fail('Malformed invocation')),['--discovery-root']);
});
test('Windows convention preserves all three explicit sources; standalone preparation retains no discovery default',async()=>{
  const home=resolve('Invented profile Ω'),args=['--source',join(home,'chosen.sqlite'),'--global-state',join(home,'chosen.json'),'--session-index',join(home,'chosen.jsonl')];
  const context={enabled:true,nodeVersion:'24.18.1',executable:'C:\\Synthetic\\pwsh.exe',scratchParent:resolve('Invented scratch'),home};
  const selected=await preparePersonalExplorer(windowsDiscoveryArgs(args,home,()=>true),()=>{},context,new AbortController().signal);
  assert.equal(selected.discoveryRoot,join(home,'Documents','Codex'));
  assert.deepEqual(selected.explorer,{globalState:args[3],sessionIndex:args[5]});
  const standalone=await preparePersonalExplorer(args,()=>{},context,new AbortController().signal);
  assert.equal(standalone.discoveryRoot,undefined);
});

test('double-click prerequisites refuse before entry import and never reveal selected values',()=>{
  const context={platform:'win32',nodeVersion:'24.18.1',terminal:true,executable:'C:\\Synthetic\\PowerShell Ω\\pwsh.exe'};
  assert.equal(launchPrerequisite(context,()=>true),undefined);
  for(const c of [{...context,platform:'linux'},{...context,nodeVersion:'22.0.0'},{...context,terminal:false},
    {...context,executable:'relative/pwsh.exe'},{...context,executable:'C:\\Synthetic\\'+secret}]){
    const message=launchPrerequisite(c,()=>false);assert.ok(message);assert.equal(message.includes(secret),false);
  }
  assert.match(launchPrerequisite(context,()=>false)!,/PowerShell 7/);
});

function browserHarness(){
  const child=Object.assign(new EventEmitter(),{stdin:new PassThrough(),unref:()=>{}});let transported='';
  child.stdin.on('data',chunk=>{transported+=chunk.toString();});
  const launch=((executable:string,args:string[],options:unknown)=>{
    assert.equal(executable,'C:\\Synthetic\\PowerShell Ω\\pwsh.exe');
    assert.equal(args.includes(browserCommand),true);assert.equal(JSON.stringify(args).includes(url),false);
    assert.deepEqual(options,{shell:false,windowsHide:true,stdio:['pipe','ignore','ignore']});return child;
  }) as unknown as typeof spawn;
  return {child,launch,transported:()=>transported};
}
for(const outcome of ['success','failure','error','cancel','timeout'] as const)test('browser dispatch '+outcome+' uses stdin and bounded confirmation',async t=>{
  const h=browserHarness(),abort=new AbortController();
  if(outcome==='timeout')t.mock.timers.enable({apis:['setTimeout']});
  const opened=openWindowsBrowser('C:\\Synthetic\\PowerShell Ω\\pwsh.exe',url,abort.signal,h.launch);
  assert.equal(h.transported(),url+'\n');
  if(outcome==='cancel')abort.abort();else if(outcome==='timeout')t.mock.timers.tick(5000);
  else if(outcome==='error')h.child.emit('error',new Error(secret));else h.child.emit('close',outcome==='success'?0:1);
  assert.equal(await opened,outcome==='success');assert.equal(h.child.stdin.destroyed,true);
  // Late completion after cancellation/timeout has no second result or unhandled error.
  h.child.emit('close',0);
});
test('browser dispatch rejects cancellation and arbitrary URLs before spawning',async()=>{
  const abort=new AbortController();let started=0;
  const launch=(()=>{started++;throw new Error(secret);}) as unknown as typeof spawn;
  for(const invalid of ['https://example.invalid/#'+secret,url+'?extra','http://localhost:12345/#'+'a'.repeat(64)])
    assert.equal(await openWindowsBrowser('unused',invalid,abort.signal,launch),false);
  abort.abort();assert.equal(await openWindowsBrowser('unused',url,abort.signal,launch),false);assert.equal(started,0);
});

for(const outcome of ['success','failure','throw','cancel'] as const)test('automatic delivery '+outcome+' follows cleanup and server readiness',async()=>{
  const signals=new EventEmitter(),output:string[]=[],order:string[]=[],closed=deferred<void>();let closes=0;
  const cap=snapshot();
  const code=await runExplorerEntry({personal:true,signals,write:text=>output.push(text),
    createFixture:()=>({acquire:async()=>{order.push('acquired');return {snapshot:cap,safety};},teardown:async()=>{order.push('cleanup');return true;}}),
    start:async incoming=>{order.push('ready');assert.ok(incoming.take());return {url,closed:closed.promise,close:async()=>{closes++;closed.resolve();}};},
    openBrowser:async received=>{order.push('browser');assert.equal(received,url);assert.deepEqual(order,['acquired','cleanup','ready','browser']);
      closed.resolve();if(outcome==='cancel')signals.emit('SIGINT');if(outcome==='throw')throw new Error(secret);return outcome==='success';}});
  assert.equal(code,outcome==='cancel'?1:0);assert.equal(closes,1);assert.equal(cap.take(),undefined);
  assert.equal(output.includes(url),outcome==='failure'||outcome==='throw');assert.equal(output.some(s=>s.includes(secret)),false);
  assert.equal(signals.listenerCount('SIGINT'),0);const report=JSON.parse(output.at(-1)!);assert.deepEqual(report.safety,safety);
  assert.deepEqual(report.fixtureCleanup,{beforeDelivery:'removed',final:'removed'});
});
for(const phase of ['acquisition','cleanup','startup'] as const)test('automatic delivery is withheld after '+phase+' refusal',async()=>{
  let opened=0;const cap=snapshot(),output:string[]=[];
  const code=await runExplorerEntry({personal:true,signals:new EventEmitter(),write:t=>output.push(t),
    createFixture:()=>({acquire:async()=>({snapshot:cap,safety:phase==='acquisition'?{...safety,status:'refused'}:safety}),teardown:async()=>phase!=='cleanup'}),
    start:async()=>{throw new Error(secret);},openBrowser:async()=>{opened++;return true;}});
  assert.equal(code,1);assert.equal(opened,0);assert.equal(cap.take(),undefined);assert.equal(output.join('').includes(secret),false);
});
test('human launch reports preserve refusal and residual uncertainty without echoing diagnostics',()=>{
  for(const r of [{status:'passed',safety},{status:'refused',reason:'acquisition',safety:{...safety,reason:'limit'}},
    {status:'refused',reason:'acquisition',safety:{...safety,reason:'helper',evidence:{phase:'closure'}}},
    {status:'refused',cancelled:true,safety:{...safety,cleanup:'residual',recovery:'available'}}]){
    const report=launchReport(JSON.stringify({...r,private:secret}));assert.equal(report.includes(secret),false);
    if(r.safety.cleanup!=='removed')assert.match(report,/not confirmed/);else assert.match(report,/cleanup.*confirmed/);
  }
  assert.match(launchReport(secret),/could not be completed/);
  assert.match(launchReport(JSON.stringify({status:'refused',safety:{...safety,attemptConsumed:false}})),/Acquisition did not start/);
});

test('compiled Windows entry refuses piped invocation before any source/helper operation',{skip:process.platform!=='win32'},()=>{
  const f=directoryFixture();
  try{
    const entry=resolve('dist/test/support/windows-explorer-entry.js');
    const result=spawnSync(process.execPath,[entry,secret],{cwd:f.root,env:{...process.env,WORKSPACE_SURVEYOR_HELPER_PWSH:secret},encoding:'utf8'});
    assert.equal(result.status,1);assert.match(result.stdout,/visible console/);
    assert.equal((result.stdout+result.stderr).includes(secret),false);assert.equal(result.stderr,'');
  }finally{f.cleanup();}
});

for(const mode of ['normal','child-failure','child-cancel','no-node','no-build','directory-failure'] as const)test('native cmd launch '+mode+' from unrelated space/Unicode paths',
  {skip:process.platform!=='win32'},()=>{
    const f=directoryFixture();
    try{
      const repository=f.mkdir(join(f.owner,'Repository Ω with spaces & parentheses (1)')),cwd=f.mkdir(join(f.owner,'Unrelated caller Ω'));
      const launcher=join(repository,'Workspace Surveyor.cmd');fs.copyFileSync(resolve('Workspace Surveyor.cmd'),launcher);
      if(mode==='directory-failure'){
        const content=fs.readFileSync(launcher,'utf8');assert.ok(content.includes('pushd "%SURVEYOR_ROOT%"'));
        fs.writeFileSync(launcher,content.replace('pushd "%SURVEYOR_ROOT%"','pushd "%SURVEYOR_TEST_MISSING_DIRECTORY%"'));
      }
      fs.writeFileSync(join(cwd,'node.exe'),'invented caller decoy');
      const childCode=mode==='child-failure'?37:mode==='child-cancel'?130:0;
      if(mode!=='no-build'){
        const dist=f.mkdir(join(repository,'dist','test','support'));
        fs.writeFileSync(join(dist,'windows-explorer-entry.js'),"console.log('SYNTHETIC_LAUNCH_RESULT '+JSON.stringify({entry:process.argv[1],args:process.argv.slice(2),cwd:process.cwd()}));process.exitCode="+childCode+';');
      }
      // Resume in the same cmd process after CALL, so restoration and exit status
      // are observed independently of the launcher's own messages.
      const wrapper=join(cwd,'caller.cmd');
      fs.writeFileSync(wrapper,'@echo off\r\ncall "%SURVEYOR_TEST_LAUNCHER%" --discovery-root "%SURVEYOR_TEST_SCOPE%"\r\nset "CHILD_RESULT=%ERRORLEVEL%"\r\n"%SURVEYOR_TEST_NODE%" -e "console.log(\'SYNTHETIC_CALLER_CWD \'+JSON.stringify(process.cwd()))"\r\nexit /b %CHILD_RESULT%\r\n');
      const result=spawnSync(join(process.env.SystemRoot!,'System32','cmd.exe'),['/d','/s','/c','""'+wrapper+'""'],
        {cwd,env:{...process.env,PATH:mode==='no-node'?'':dirname(process.execPath),SURVEYOR_TEST_LAUNCHER:launcher,
          SURVEYOR_TEST_NODE:process.execPath,SURVEYOR_TEST_SCOPE:'C:\\Synthetic\\Scope Ω',SURVEYOR_TEST_MISSING_DIRECTORY:join(f.owner,'Absent Ω directory')},
          input:'\r\n',encoding:'utf8',windowsHide:true,windowsVerbatimArguments:true,timeout:10000});
      const runsChild=['normal','child-failure','child-cancel'].includes(mode);
      assert.equal(result.error,undefined);assert.equal(result.status,runsChild?childCode:1);
      const caller=result.stdout.split(/\r?\n/).find(s=>s.startsWith('SYNTHETIC_CALLER_CWD '));assert.ok(caller);
      assert.equal(fs.lstatSync(JSON.parse(caller.slice('SYNTHETIC_CALLER_CWD '.length))).ino,fs.lstatSync(cwd).ino);
      if(runsChild){
        const line=result.stdout.split(/\r?\n/).find(s=>s.startsWith('SYNTHETIC_LAUNCH_RESULT '));assert.ok(line);
        const observed=JSON.parse(line.slice('SYNTHETIC_LAUNCH_RESULT '.length));
        // cmd/Node can normalize the casing of a Windows parent. Compare identities,
        // while requiring the invented Unicode/spaces portion to survive unchanged.
        const actual=fs.lstatSync(observed.entry),expected=fs.lstatSync(join(repository,'dist','test','support','windows-explorer-entry.js'));
        assert.equal(actual.dev,expected.dev);assert.equal(actual.ino,expected.ino);
        assert.ok(observed.entry.endsWith(join('Repository Ω with spaces & parentheses (1)','dist','test','support','windows-explorer-entry.js')));
        assert.equal(fs.lstatSync(observed.cwd).ino,fs.lstatSync(repository).ino);assert.deepEqual(observed.args,['--discovery-root','C:\\Synthetic\\Scope Ω']);
      }else{
        assert.match(result.stdout,mode==='no-node'?/Node.js 24/:mode==='no-build'?/npm run build/:/Cannot enter.*repository directory/);
        assert.equal(result.stdout.includes('SYNTHETIC_LAUNCH_RESULT'),false);
      }
    }finally{f.cleanup();}
  });

const empirical={skip:process.platform!=='win32'||process.env.WORKSPACE_SURVEYOR_RUN_CANARY_PREPARATION!=='1'||
  process.env.WORKSPACE_SURVEYOR_RUN_EXPLORER_PREPARATION!=='1'};

test('native cmd fixes temporary caller containment without bypassing repository containment; real acquisition, cancellation and cleanup',empirical,async()=>{
  // The disposable repository must be outside TEMP, just like a legitimate
  // checkout. Only this authenticated, exact test directory is removed below.
  const checkout=fs.realpathSync(resolve('.')),owned=fs.mkdtempSync(join(checkout,'surveyor-launch-'));
  const identity=fs.lstatSync(owned),caller=directoryFixture(),f=explorerFixture();
  let cleanupConfirmed=true;
  try{
    const repository=join(owned,'Repository Ω with spaces & parentheses (1)');fs.mkdirSync(repository);
    const unsafeRepository=caller.mkdir(join(caller.owner,'Unsafe repository Ω with spaces'));
    const callerDirectory=caller.mkdir(join(caller.owner,'Caller Ω with spaces & parentheses (2)'));
    const worker=`import fs from 'node:fs';
import { join } from 'node:path';
import { CanaryScratch, runSyntheticExplorer } from ${JSON.stringify(pathToFileURL(resolve('dist/test/support/personal-canary.js')).href)};
import { runExplorerEntry } from ${JSON.stringify(pathToFileURL(resolve('dist/test/support/explorer-entry.js')).href)};
const config=JSON.parse(process.env.SURVEYOR_TEST_ACQUISITION),scratches=[];
let report,containmentReason;
if(config.mode==='containment'){
  const probe=new CanaryScratch();scratches.push(probe);
  try{probe.initialize();}catch(error){containmentReason=error.reason;}
  finally{if(probe.root)probe.cleanup();}
}
process.exitCode=await runExplorerEntry({personal:true,signals:process,
  write:text=>{if(text.startsWith('{'))report=JSON.parse(text);},
  start:async snapshot=>{snapshot.discard();return {url:'',closed:Promise.resolve(),close:async()=>{}};},
  createFixture:()=>({acquire:()=>runSyntheticExplorer({
    executable:process.env.WORKSPACE_SURVEYOR_HELPER_PWSH,analysis:'explorer',
    explorer:config.explorer,selection:config.selection,closure:()=> 'absent',
    ...(config.mode==='failure'?{fault:'partial-copy'}:{}),
    hook:phaseHook})})});
function phaseHook(phase,scratch){
  if(phase==='initialized')scratches.push(scratch);
  if(phase==='held'&&config.mode==='cancel')process.emit('SIGINT');
}
console.log('SYNTHETIC_ACQUISITION '+JSON.stringify({cwd:process.cwd(),report,containmentReason,
  scratchAbsent:scratches.every(s=>!s.root||!fs.existsSync(s.root)),
  recoveryAbsent:!fs.existsSync(join(config.selection.fixture.ownerRoot,'recovery'))}));
`;
    for(const root of [repository,unsafeRepository]){
      fs.copyFileSync(resolve('Workspace Surveyor.cmd'),join(root,'Workspace Surveyor.cmd'));
      fs.mkdirSync(join(root,'dist','test','support'),{recursive:true});
      fs.writeFileSync(join(root,'package.json'),'{"type":"module"}');
      fs.writeFileSync(join(root,'dist','test','support','windows-explorer-entry.js'),worker);
    }
    const invoke=(root:string,cwd:string,viaCmd:boolean,mode='success')=>{
      const entry=join(root,'dist','test','support','windows-explorer-entry.js');
      cleanupConfirmed=false;
      const result=spawnSync(viaCmd?join(process.env.SystemRoot!,'System32','cmd.exe'):process.execPath,
        viaCmd?['/d','/s','/c','""'+join(root,'Workspace Surveyor.cmd')+'""']:[entry],
        {cwd,env:{...process.env,PATH:dirname(process.execPath),SURVEYOR_TEST_ACQUISITION:JSON.stringify({
          selection:f.selection,explorer:{globalState:f.globalState},mode})},
          input:'\r\n',encoding:'utf8',windowsHide:true,windowsVerbatimArguments:viaCmd});
      assert.equal(result.error,undefined);
      const line=result.stdout.split(/\r?\n/).find(s=>s.startsWith('SYNTHETIC_ACQUISITION '));
      assert.ok(line,'Acquisition worker must report its cleanup outcome; otherwise preserve fixture controls.');
      const observed=JSON.parse(line.slice('SYNTHETIC_ACQUISITION '.length));
      cleanupConfirmed=observed.scratchAbsent===true&&observed.recoveryAbsent===true;
      assert.equal(cleanupConfirmed,true,'Unexpected synthetic residual; preserve exact fixture controls.');
      assert.equal(fs.lstatSync(observed.cwd).ino,fs.lstatSync(viaCmd?root:cwd).ino);
      assert.equal(result.status,observed.report.status==='passed'?0:1);
      if(mode==='containment'){
        assert.equal(observed.containmentReason,'containment');assert.equal(observed.report.status,'refused');
        assert.equal(observed.report.safety.evidence.opened,0);assert.deepEqual(observed.report.safety.evidence.stages,[]);
        // Validation refused before creation: no scratch obligation was created.
        assert.equal(observed.report.safety.reason,'containment');
        assert.equal(observed.report.safety.cleanup,'removed');
        assert.equal(observed.report.safety.evidence.acquisition.scratchInitialization,'validating');
      }
      return observed.report;
    };
    const direct=invoke(repository,repository,false);
    assert.equal(direct.safety.status,'passed');assert.equal(direct.safety.sourcesStable,true);
    // Demonstrate the original failure with the identical designated sources.
    invoke(repository,callerDirectory,false,'containment');
    for(const cwd of [repository,callerDirectory]){
      const result=invoke(repository,cwd,true);
      assert.equal(result.status,'passed');assert.equal(result.safety.sourcesStable,true);
      assert.equal(result.safety.cleanup,'removed');assert.equal(result.safety.recovery,'removed');
      assert.equal(result.safety.evidence.exitConfirmed,true);
    }
    for(const mode of ['failure','cancel']){
      const result=invoke(repository,callerDirectory,true,mode);
      assert.equal(result.status,'refused');assert.equal(result.cancelled,mode==='cancel');
      assert.equal(result.safety.status,mode==='cancel'?'passed':'refused');
      assert.equal(result.safety.cleanup,'removed');assert.equal(result.safety.recovery,'removed');
      assert.equal(result.safety.evidence.exitConfirmed,true);
    }
    invoke(unsafeRepository,repository,true,'containment');
  }finally{
    // Never remove controls after an unknown child/cleanup outcome.
    assert.equal(cleanupConfirmed,true,'Synthetic acquisition cleanup unconfirmed; owned fixtures retained.');
    assert.equal(await f.teardown(),true);caller.cleanup();
    assert.equal(dirname(owned),checkout);assert.ok(owned.startsWith(join(checkout,'surveyor-launch-')));
    const current=fs.lstatSync(owned);assert.equal(current.isSymbolicLink(),false);
    assert.equal(current.dev,identity.dev);assert.equal(current.ino,identity.ino);
    fs.rmSync(owned,{recursive:true});assert.equal(fs.existsSync(owned),false);
  }
});

test('protected disposable launch delivers only after verified cleanup; duplicate acquisition refuses safely',empirical,async()=>{
  const f=explorerFixture(),output:string[]=[];let duplicated=false;
  const executable=process.env.WORKSPACE_SURVEYOR_HELPER_PWSH??'';
  const options={executable,analysis:'explorer' as const,explorer:{globalState:f.globalState},selection:f.selection,closure:()=> 'absent' as const};
  try{
    const code=await runExplorerEntry({signals:new EventEmitter(),write:t=>output.push(t),start:serveLocalExplorer,
      createFixture:()=>({teardown:f.teardown,acquire:()=>runSyntheticExplorer({...options,hook:async(phase,scratch)=>{
        if(phase==='initialized')f.scratches.push(scratch);
        if(phase==='held'){
          const second=await runSyntheticExplorer(options);duplicated=true;assert.equal(second.safety?.status,'refused');assert.equal(second.snapshot,undefined);
        }
      }})}),openBrowser:async delivered=>{
        assert.equal(fs.existsSync(f.run.root),false);assert.ok(f.scratches.every(s=>!fs.existsSync(s.root!)));
        const u=new URL(delivered),headers={'X-Surveyor-Session':u.hash.slice(1),Origin:u.origin};
        assert.equal((await fetch(u.origin+'/snapshot')).status,403);
        assert.equal((await fetch(u.origin+'/snapshot',{headers})).status,200);
        assert.equal((await fetch(u.origin+'/close',{method:'POST',headers})).status,200);return true;
      }});
    assert.equal(code,0);assert.equal(duplicated,true);assert.equal(output.some(t=>t.includes('/#')),false);
    const report=JSON.parse(output.at(-1)!);assert.equal(report.safety.sourcesStable,true);assert.equal(report.safety.cleanup,'removed');
    assert.deepEqual(report.fixtureCleanup,{beforeDelivery:'removed',final:'removed'});
  }finally{assert.equal(await f.teardown(),true);}
});
