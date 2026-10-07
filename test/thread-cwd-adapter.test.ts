import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join } from 'node:path';
import { format } from 'node:util';
import { syncBuiltinESMExports } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { SyntheticRun } from './support/synthetic-acquisition.js';
import { CanaryScratch, selectedPaths, retryCanaryCleanup, type CanaryOptions } from './support/personal-canary.js';
import { readThreadCwdCopy, runSyntheticThreadCwd, type AdapterResult } from './support/thread-cwd-adapter.js';

const empirical={skip:process.platform!=='win32'||process.env.WORKSPACE_SURVEYOR_RUN_CANARY_PREPARATION!=='1',concurrency:false};
const secret='SYNTHETIC_PRIVATE_ADAPTER';
const provenance={namespace:'synthetic-source-a',from:'2026-10-07T00:00:00.000Z',through:'2026-10-07T00:00:01.000Z'};
type Build=(db:DatabaseSync)=>void;
const populated:Build=db=>{db.exec('CREATE TABLE threads(id TEXT,cwd TEXT)');db.prepare('INSERT INTO threads VALUES(?,?)').run(secret,secret+'_cwd');};
function privateFree(value:unknown):void {
  assert.equal(/SYNTHETIC_PRIVATE_|workspace-surveyor-canary-|[A-Z]:[\\/]|S-1-\d/.test(String(value)),false);
}
function fixture(build:Build,wal=false){
  const run=new SyntheticRun('simulated-owner-restricted'),scratches:CanaryScratch[]=[];
  const source=join(run.sources,'standalone.sqlite'),builder=join(run.root,'builder','standalone.sqlite');
  const cleanup=()=>{
    for(const scratch of scratches)if(scratch.root&&fs.existsSync(scratch.root))assert.equal(scratch.cleanup(),'removed');
    const store=join(run.root,'recovery');
    if(fs.existsSync(store)){
      const st=fs.lstatSync(store);assert.equal(st.isDirectory()&&!st.isSymbolicLink(),true);
      const entries=fs.readdirSync(store);assert.equal(entries.every(n=>['key','record'].includes(n)),true);
      for(const n of entries){const s=fs.lstatSync(join(store,n));assert.equal(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1&&s.size<=8192,true);}
      for(const n of entries)fs.unlinkSync(join(store,n));fs.rmdirSync(store);
    }
    assert.equal(run.cleanup().status,'removed');
  };
  try{
    fs.unlinkSync(builder);const db=new DatabaseSync(builder);
    try{
      if(wal)db.exec('PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0');
      build(db);
      for(const suffix of wal?['','-wal','-shm']:[''])fs.copyFileSync(builder+suffix,source+suffix);
    }finally{db.close();}
  }catch{cleanup();throw new Error('Synthetic fixture refused');}
  return {run,source,scratches,cleanup,selection:{kind:'synthetic' as const,
    fixture:{source,ownerRoot:run.root,ownerNonce:fs.readFileSync(join(run.root,'owner'),'utf8')}}};
}
function snapshot(source:string):string{
  return selectedPaths(source).map(p=>{const s=fs.lstatSync(p,{bigint:true});
    return `${s.dev}:${s.ino}:${s.size}:${s.mtimeNs}:${s.ctimeNs}:${fs.readFileSync(p).toString('hex')}`;}).join('|');
}
function unit(build:Build,check:(scratch:CanaryScratch)=>void):void{
  const f=fixture(build),scratch=new CanaryScratch();f.scratches.push(scratch);
  try{
    scratch.initialize();for(const area of ['acquisition','analysis'] as const){fs.mkdirSync(join(scratch.root!,area));fs.copyFileSync(f.source,scratch.path(area,0));}
    const before=snapshot(f.source),acquisition=fs.readFileSync(scratch.path('acquisition',0));
    check(scratch);assert.equal(snapshot(f.source)===before,true);
    assert.equal(fs.readFileSync(scratch.path('acquisition',0)).equals(acquisition),true);
    assert.equal(fs.existsSync(join(f.run.sources,'metadata.json')),true);
  }finally{f.cleanup();}
}
function rows(values:readonly (readonly [unknown,unknown])[]):Build{return db=>{
  db.exec('CREATE TABLE threads(id TEXT,cwd TEXT)');const insert=db.prepare('INSERT INTO threads VALUES(?,?)');
  for(const [id,cwd] of values)insert.run(id as string,cwd as string);
};}
function unavailable(result:AdapterResult,reason:string):void{
  assert.equal(result.summary.status,'unavailable');assert.equal(result.summary.reason,reason);
  assert.equal(result.summary.traversal,'unavailable');assert.equal(result.readClaims().length,0);
  assert.equal(result.readGroups().length,0);assert.equal(result.readProvenance(),null);
  privateFree(JSON.stringify(result));privateFree(format('%o',result));
}
function options(f:ReturnType<typeof fixture>,extra:Partial<CanaryOptions>={}){
  return {executable:process.env.WORKSPACE_SURVEYOR_HELPER_PWSH??'',closure:()=> 'absent' as const,
    ...extra,selection:f.selection,hook:async(phase:Parameters<NonNullable<CanaryOptions['hook']>>[0],scratch:CanaryScratch)=>{
      if(phase==='initialized')f.scratches.push(scratch);await extra.hook?.(phase,scratch);
    }};
}

test('adapter retains exact claims and groups shared CWD strings only',()=>{
  unit(rows([['a','C:\\Synthetic\\shared'],['b','C:\\Synthetic\\shared'],['c','C:\\Synthetic\\other']]),scratch=>{
    const result=readThreadCwdCopy(scratch,provenance);
    assert.equal(result.summary.status,'ready');assert.equal(result.summary.claims,3);assert.equal(result.summary.cwdGroups,2);
    assert.equal(result.summary.interpretation,'complete-within-selected-table');
    assert.equal(result.readClaims()[0]?.recordId==='a',true);assert.equal(result.readGroups()[0]?.claimIndexes.length,2);
    assert.equal(Object.isFrozen(result.readClaims()[0]),true);privateFree(JSON.stringify(result));
  });
});
test('adapter empty table completes only its selected-table traversal',()=>{
  unit(rows([]),scratch=>{const r=readThreadCwdCopy(scratch,provenance);assert.equal(r.summary.status,'ready');
    assert.equal(r.summary.rowsRead,0);assert.equal(r.summary.claims,0);assert.equal(r.summary.traversal,'complete-within-selected-table');});
});
test('adapter source namespaces remain separate without cross-source identity joins',()=>{
  unit(populated,scratch=>{
    const a=readThreadCwdCopy(scratch,provenance),b=readThreadCwdCopy(scratch,{...provenance,namespace:'synthetic-source-b'});
    assert.equal(a.readProvenance()?.namespace===b.readProvenance()?.namespace,false);
    assert.equal(a.readClaims()[0]?.recordId===b.readClaims()[0]?.recordId,true);
    assert.equal(a.summary.policy,b.summary.policy);
  });
});
test('adapter duplicate IDs retain identical and conflicting claims with explicit ambiguity',()=>{
  unit(rows([['opaque','a'],['opaque','a'],['opaque','b'],['other','b']]),scratch=>{
    const r=readThreadCwdCopy(scratch,provenance);assert.equal(r.summary.claims,4);assert.equal(r.summary.ambiguousIds,1);
    assert.equal(r.summary.interpretation,'partial');assert.equal(r.readClaims().filter(c=>c.ambiguousId).length,3);
  });
});
test('adapter invalid required values omit rows while retaining duplicate-ID ambiguity',()=>{
  unit(rows([['a','ok'],['a',null],[null,'cwd'],['','cwd'],[Buffer.from('x'),'cwd'],['b',Buffer.from('x')],['c','']]),scratch=>{
    const r=readThreadCwdCopy(scratch,provenance);assert.equal(r.summary.rowsRead,7);assert.equal(r.summary.omittedRows,6);
    assert.equal(r.summary.claims,1);assert.equal(r.summary.ambiguousIds,1);assert.equal(r.readClaims()[0]?.ambiguousId,true);
    assert.equal(r.summary.traversal,'complete-within-selected-table');assert.equal(r.summary.interpretation,'partial');
  });
});
test('adapter opaque case Unicode extended and UNC strings trigger no filesystem operations',()=>{
  const paths=['C:\\Synthetic\\case','c:\\synthetic\\case','C:\\Synthetic\\é','C:\\Synthetic\\e\u0301','\\\\?\\C:\\Synthetic\\case','\\\\synthetic-host\\share\\cwd','../synthetic'];
  unit(rows(paths.map((p,i)=>['id'+i,p])),scratch=>{
    const originals=new Map<string,unknown>();let touched=false;
    for(const key of ['lstatSync','statSync','realpathSync','openSync','accessSync','readFileSync','existsSync','readdirSync']){
      const object=fs as unknown as Record<string,unknown>;const original=object[key] as (...args:unknown[])=>unknown;originals.set(key,original);
      object[key]=(...args:unknown[])=>{if(typeof args[0]==='string'&&paths.includes(args[0])){touched=true;throw new Error(secret);}return Reflect.apply(original,fs,args);};
    }
    syncBuiltinESMExports();
    try{const r=readThreadCwdCopy(scratch,provenance);assert.equal(r.summary.status,'ready');assert.equal(r.summary.cwdGroups,paths.length);
      assert.equal(r.readClaims().every((c,i)=>c.storedCwd===paths[i]),true);assert.equal(touched,false);
    }finally{for(const [key,value] of originals)(fs as unknown as Record<string,unknown>)[key]=value;syncBuiltinESMExports();}
  });
});
for(const count of [3,64])test(`adapter accepts ${count} ordinary columns and ignores unconsumed contents`,()=>{
  unit(db=>{db.exec(`CREATE TABLE threads(id TEXT,cwd TEXT,${Array.from({length:count-2},(_,i)=>`extra${i} TEXT DEFAULT '${secret}'`).join(',')})`);
    db.prepare('INSERT INTO threads(id,cwd) VALUES(?,?)').run(secret,secret);},scratch=>{
    const r=readThreadCwdCopy(scratch,provenance);assert.equal(r.summary.status,'ready');assert.equal(r.summary.unconsumedColumns,true);
    assert.equal(r.summary.claims,1);privateFree(JSON.stringify(r));privateFree(format('%o',r));
  });
});
for(const [name,sql] of [
  ['missing table','CREATE TABLE other(id TEXT,cwd TEXT)'],['missing field','CREATE TABLE threads(id TEXT)'],
  ['renamed field','CREATE TABLE threads(identifier TEXT,cwd TEXT)'],['case changed','CREATE TABLE threads(ID TEXT,cwd TEXT)'],
  ['incompatible type','CREATE TABLE threads(id INTEGER,cwd TEXT)'],['untyped','CREATE TABLE threads(id,cwd TEXT)'],
  ['generated required','CREATE TABLE threads(id TEXT,cwd TEXT GENERATED ALWAYS AS (id))'],
  ['generated extra','CREATE TABLE threads(id TEXT,cwd TEXT,extra TEXT GENERATED ALWAYS AS (id))'],
  ['view','CREATE VIEW threads AS SELECT 1 AS id,2 AS cwd'],['virtual','CREATE VIRTUAL TABLE threads USING fts5(id,cwd)'],
  ['65 columns',`CREATE TABLE threads(id TEXT,cwd TEXT,${Array.from({length:63},(_,i)=>`c${i} TEXT`).join(',')})`],
])test(`adapter refuses ${name} without row reading or alternate discovery`,()=>{
  unit(db=>db.exec(sql!),scratch=>{let read=false;
    unavailable(readThreadCwdCopy(scratch,provenance,p=>{if(p==='rows')read=true;}),'unsupported-schema');assert.equal(read,false);});
});
for(const count of [1000,1001])test(`adapter row boundary ${count} never publishes a truncated map`,()=>{
  unit(rows(Array.from({length:count},(_,i)=>['id'+i,'cwd'])),scratch=>{
    const r=readThreadCwdCopy(scratch,provenance);if(count===1000){assert.equal(r.summary.status,'ready');assert.equal(r.summary.claims,1000);}
    else unavailable(r,'limit');
  });
});
for(const field of [0,1])for(const over of [false,true])test(`adapter UTF-8 field ${field} ${over?'overflow':'boundary'}`,()=>{
  const pair:[string,string]=['id','cwd'];pair[field]='é'.repeat(8192)+(over?'x':'');
  unit(rows([pair]),scratch=>{const r=readThreadCwdCopy(scratch,provenance);if(over)unavailable(r,'limit');else assert.equal(r.summary.status,'ready');});
});
for(const over of [false,true])test(`adapter total text ${over?'overflow':'boundary'} includes every encountered string`,()=>{
  const values:[string,string][]=Array.from({length:64},()=>['i','x'.repeat(16383)]);if(over)values.push(['x','y']);
  unit(rows(values),scratch=>{const r=readThreadCwdCopy(scratch,provenance);if(over)unavailable(r,'limit');else assert.equal(r.summary.status,'ready');});
});
test('adapter omission cannot evade field or aggregate string limits',()=>{
  unit(rows([[null,'x'.repeat(16385)]]),scratch=>unavailable(readThreadCwdCopy(scratch,provenance),'limit'));
  unit(rows(Array.from({length:65},()=>['x'.repeat(16384),null])),scratch=>unavailable(readThreadCwdCopy(scratch,provenance),'limit'));
});
test('adapter SQLite length limit is a sanitized resource refusal before string materialization',()=>{
  unit(rows([['id','x'.repeat(1024*1024+1)]]),scratch=>unavailable(readThreadCwdCopy(scratch,provenance),'limit'));
});
test('adapter fixed SQL denies record exports defaults attachments functions and mutations',()=>{
  unit(populated,scratch=>{const phases:string[]=[];
    const r=readThreadCwdCopy(scratch,provenance,(phase,attempt)=>{
      phases.push(phase);for(const sql of ['SELECT * FROM threads','SELECT id,cwd FROM threads','SELECT sql FROM sqlite_schema',
        "SELECT dflt_value FROM pragma_table_xinfo('threads','main')","PRAGMA main.table_xinfo('threads');",
        'ATTACH DATABASE ":memory:" AS other',"SELECT load_extension('invented')",'DELETE FROM threads','VACUUM',
        'PRAGMA journal_mode=WAL','SELECT id, cwd FROM main.threads LIMIT 1001; SELECT id FROM threads;']){
        assert.throws(()=>attempt(sql),error=>{privateFree(format('%o',error));return true;});
      }
    });assert.equal(r.summary.status,'ready');assert.deepEqual(phases,['structure','columns','rows']);
  });
});
test('adapter schema-function shadow and malformed analysis refuse without disclosure',()=>{
  unit(db=>{populated(db);db.exec('CREATE VIEW pragma_table_xinfo AS SELECT 1 AS cid');},scratch=>unavailable(readThreadCwdCopy(scratch,provenance),'analysis'));
  unit(populated,scratch=>{fs.writeFileSync(scratch.path('analysis',0),secret);unavailable(readThreadCwdCopy(scratch,provenance),'analysis');});
});
test('adapter injected errors and successful diagnostics never disclose private strings',()=>{
  unit(populated,scratch=>{
    const r=readThreadCwdCopy(scratch,provenance);assert.equal(r.readClaims()[0]?.recordId===secret,true);
    for(const output of [JSON.stringify(r),format('%o',r),format('%s',r),format('%j',r),JSON.stringify({...r})])privateFree(output);
    let reached=false;unavailable(readThreadCwdCopy(scratch,provenance,phase=>{if(phase==='rows'){reached=true;throw new Error(secret);}}),'analysis');assert.equal(reached,true);
  });
});
test('adapter invalid capability and provenance refuse before SQLite access',()=>{
  unavailable(readThreadCwdCopy({} as CanaryScratch,provenance),'analysis');
  unit(populated,scratch=>{unavailable(readThreadCwdCopy(scratch,{...provenance,namespace:secret+'\\path'}),'analysis');
    unavailable(readThreadCwdCopy(scratch,{...provenance,through:'2020-01-01T00:00:00.000Z'}),'analysis');});
});
test('synthetic adapter rejects personal selection before invoking any acquisition',async()=>{
  const result=await runSyntheticThreadCwd({selection:{kind:'personal'}} as never,'synthetic-source');
  assert.equal(result.safety,null);unavailable(result.adapter,'safety');
});
for(const wal of [false,true])test(`adapter protected ${wal?'WAL set':'database'} releases claims only after cleanup`,empirical,async()=>{
  const f=fixture(populated,wal),before=snapshot(f.source);let inspected=false,finished=false;
  try{
    const promise=runSyntheticThreadCwd(options(f,{hook:phase=>{if(phase==='analyzed')inspected=true;assert.equal(finished,false);}}),provenance.namespace);
    const r=await promise;finished=true;assert.equal(inspected,true);assert.equal(r.safety?.status,'passed');
    assert.equal(r.adapter.summary.status,'ready');assert.equal(r.adapter.readClaims()[0]?.recordId===secret,true);
    assert.equal(r.safety?.cleanup,'removed');assert.equal(r.safety?.recovery,'removed');assert.equal(r.safety?.files,wal?3:1);
    assert.equal(fs.existsSync(f.scratches[0]!.root!),false);assert.equal(snapshot(f.source)===before,true);
    assert.equal(r.adapter.readProvenance()!.from<=r.adapter.readProvenance()!.through,true);privateFree(JSON.stringify(r));
  }finally{f.cleanup();}
});
test('adapter unsupported schema completes safety verification and cleanup without a map',empirical,async()=>{
  const f=fixture(db=>db.exec('CREATE TABLE other(id TEXT,cwd TEXT)')),before=snapshot(f.source);
  try{const r=await runSyntheticThreadCwd(options(f),provenance.namespace);unavailable(r.adapter,'unsupported-schema');
    assert.equal(r.safety?.evidence.stages.includes('verified'),true);assert.equal(r.safety?.cleanup,'removed');assert.equal(snapshot(f.source)===before,true);
  }finally{f.cleanup();}
});
test('adapter final acquisition verification failure discards an already staged map',empirical,async()=>{
  const f=fixture(populated),before=snapshot(f.source);let reached=false;
  try{const r=await runSyntheticThreadCwd(options(f,{hook:(phase,scratch)=>{if(phase==='analyzed'){reached=true;fs.writeFileSync(scratch.path('acquisition',0),secret);}}}),provenance.namespace);
    assert.equal(reached,true);assert.equal(r.safety?.status,'refused');unavailable(r.adapter,'safety');assert.equal(snapshot(f.source)===before,true);
    assert.equal(r.safety?.cleanup,'removed');
  }finally{f.cleanup();}
});
test('adapter cleanup failure withholds staged claims and exact recovery preserves sentinels',empirical,async()=>{
  const f=fixture(populated),before=snapshot(f.source);let analyzed=false,failed=false;
  try{const r=await runSyntheticThreadCwd(options(f,{hook:phase=>{if(phase==='analyzed')analyzed=true;},cleanupFault:()=>{failed=true;throw new Error(secret);}}),provenance.namespace);
    assert.equal(analyzed&&failed,true);unavailable(r.adapter,'safety');assert.equal(r.safety?.cleanup,'residual');
    assert.equal(await retryCanaryCleanup(),'removed');assert.equal(snapshot(f.source)===before,true);
    assert.equal(fs.existsSync(join(f.run.sources,'metadata.json')),true);privateFree(JSON.stringify(r));
  }finally{f.cleanup();}
});
