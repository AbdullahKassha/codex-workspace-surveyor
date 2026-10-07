import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { SyntheticRun } from './support/synthetic-acquisition.js';
import { CanaryScratch, runCanary, retryCanaryCleanup, selectedPaths,
  type CanaryOptions } from './support/personal-canary.js';
import { inspectQualificationAnalysis, type QualificationTest } from './support/personal-qualification.js';

const enabled = process.platform === 'win32' && process.env.WORKSPACE_SURVEYOR_RUN_CANARY_PREPARATION === '1';
const empirical = { skip: !enabled, concurrency: false };
const canary = 'SYNTHETIC_PRIVATE_QUALIFICATION';
const supported = `CREATE TABLE threads(id TEXT, cwd TEXT, unrelated TEXT DEFAULT '${canary}');
  INSERT INTO threads(id,cwd) VALUES('${canary}_ID','${canary}_CWD');`;
function privateFree(value: unknown): void {
  assert.equal(/SYNTHETIC_PRIVATE_|workspace-surveyor-canary-|[A-Z]:[\\/]|S-1-\d/i.test(JSON.stringify(value)), false);
}
function fixture(sql: string, wal = false) {
  const run = new SyntheticRun('simulated-owner-restricted');
  const builder = join(run.root, 'builder', 'standalone.sqlite');
  const source = join(run.sources, 'standalone.sqlite');
  const scratches: CanaryScratch[] = [];
  // Replace only builder contents, then designate new raw source bytes once complete.
  fs.unlinkSync(builder);
  const db = new DatabaseSync(builder);
  try {
    if (wal) db.exec('PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0');
    db.exec(sql);
    for (const suffix of wal ? ['', '-wal', '-shm'] : ['']) fs.copyFileSync(builder + suffix, source + suffix);
  } finally { db.close(); }
  const cleanup = (): void => {
    for (const scratch of scratches) if (scratch.root && fs.existsSync(scratch.root)) assert.equal(scratch.cleanup(), 'removed');
    // Independent harness authority; never the real recovery slot.
    const store = join(run.root, 'recovery');
    if (fs.existsSync(store)) {
      const st = fs.lstatSync(store); assert.equal(st.isDirectory() && !st.isSymbolicLink(), true);
      const entries = fs.readdirSync(store); assert.equal(entries.every(n => ['key','record'].includes(n)), true);
      for (const n of entries) {
        const item = fs.lstatSync(join(store,n)); assert.equal(item.isFile() && !item.isSymbolicLink() && item.nlink === 1 && item.size <= 8192, true);
      }
      for (const n of entries) fs.unlinkSync(join(store,n));
      fs.rmdirSync(store);
    }
    assert.equal(run.cleanup().status, 'removed');
  };
  return { run, source, scratches, cleanup, selection: { kind: 'synthetic' as const,
    fixture: { source, ownerRoot: run.root, ownerNonce: fs.readFileSync(join(run.root,'owner'),'utf8') } } };
}
function snapshot(source: string): string {
  return selectedPaths(source).map(path => {
    const s = fs.lstatSync(path,{bigint:true});
    return `${s.dev}:${s.ino}:${s.size}:${s.mtimeNs}:${s.ctimeNs}:${fs.readFileSync(path).toString('hex')}`;
  }).join('|');
}
function unit(sql: string, inspect: (scratch: CanaryScratch) => void): void {
  const f = fixture(sql); const scratch = new CanaryScratch(); f.scratches.push(scratch);
  try {
    scratch.initialize();
    for (const area of ['acquisition','analysis'] as const) {
      fs.mkdirSync(join(scratch.root!,area)); fs.copyFileSync(f.source,scratch.path(area,0));
    }
    const before = snapshot(f.source), acquisition = fs.readFileSync(scratch.path('acquisition',0));
    inspect(scratch);
    assert.equal(snapshot(f.source) === before, true);
    assert.equal(fs.readFileSync(scratch.path('acquisition',0)).equals(acquisition), true);
    assert.equal(fs.existsSync(join(f.run.sources,'metadata.json')), true);
  } finally { f.cleanup(); }
}
function options(f: ReturnType<typeof fixture>, extra: Partial<CanaryOptions> = {}): CanaryOptions {
  return { executable: process.env.WORKSPACE_SURVEYOR_HELPER_PWSH ?? '', selection: f.selection,
    closure: () => 'absent', analysis: 'qualification', ...extra, hook: async (phase,scratch) => {
      if (phase === 'initialized') f.scratches.push(scratch);
      await extra.hook?.(phase,scratch);
    } };
}

test('qualification accepts one ordinary TEXT sample without returning strings or defaults', () => {
  unit(supported,scratch => {
    const result = inspectQualificationAnalysis(scratch); privateFree(result);
    assert.deepEqual(result,{structure:'accepted',sample:'present',idText:true,cwdText:true,idNull:false,cwdNull:false});
  });
});
for (const [label,sql,expected] of [
  ['empty','CREATE TABLE threads(id TEXT,cwd TEXT)',{sample:'absent',idText:null,cwdText:null,idNull:null,cwdNull:null}],
  ['null','CREATE TABLE threads(id TEXT,cwd TEXT); INSERT INTO threads VALUES(NULL,NULL)',{sample:'present',idText:false,cwdText:false,idNull:true,cwdNull:true}],
  ['blob','CREATE TABLE threads(id TEXT,cwd TEXT); INSERT INTO threads VALUES(x\'01\',x\'02\')',{sample:'present',idText:false,cwdText:false,idNull:false,cwdNull:false}],
] as const) test(`qualification ${label} sample has no inferred semantics`, () => {
  unit(sql,scratch => assert.deepEqual(inspectQualificationAnalysis(scratch),{structure:'accepted',...expected}));
});
for (const [label,sql] of [
  ['missing table','CREATE TABLE other(id TEXT,cwd TEXT)'],
  ['renamed field','CREATE TABLE threads(identifier TEXT,cwd TEXT)'],
  ['case-different field','CREATE TABLE threads(ID TEXT,cwd TEXT)'],
  ['missing field','CREATE TABLE threads(id TEXT)'],
  ['unsupported type','CREATE TABLE threads(id INTEGER,cwd TEXT)'],
  ['untyped field','CREATE TABLE threads(id,cwd TEXT)'],
  ['generated field',"CREATE TABLE threads(id TEXT,cwd TEXT GENERATED ALWAYS AS (id) VIRTUAL)"],
  ['generated unrelated column',"CREATE TABLE threads(id TEXT,cwd TEXT,extra TEXT GENERATED ALWAYS AS (id) STORED)"],
  ['view','CREATE VIEW threads AS SELECT 1 AS id,2 AS cwd'],
  ['virtual table','CREATE VIRTUAL TABLE threads USING fts5(id,cwd)'],
  ['65 columns',`CREATE TABLE threads(id TEXT,cwd TEXT,${Array.from({length:63},(_,i)=>`c${i} TEXT`).join(',')})`],
] as const) test(`qualification refuses ${label} without searching replacements`, () => {
  unit(sql,scratch => {
    const phases: string[] = [];
    const result = inspectQualificationAnalysis(scratch,phase=>{phases.push(phase);});
    assert.equal(result.structure,'unsupported'); assert.equal(result.sample,null);
    assert.equal(phases.includes('sample'),false); privateFree(result);
  });
});
test('qualification accepts the 64-column boundary', () => {
  unit(`CREATE TABLE threads(id TEXT,cwd TEXT,${Array.from({length:62},(_,i)=>`c${i} TEXT`).join(',')})`,
    scratch => assert.equal(inspectQualificationAnalysis(scratch).structure,'accepted'));
});
test('qualification denies non-allowlisted SQL in every phase', () => {
  unit(supported,scratch => {
    const phases: string[] = [];
    const hook: QualificationTest = (phase,attempt) => {
      phases.push(phase);
      for (const sql of ['SELECT id,cwd FROM main.threads','SELECT * FROM main.threads',
        'SELECT sql FROM sqlite_schema',"SELECT dflt_value FROM pragma_table_xinfo('threads','main')",
        "PRAGMA main.table_xinfo('threads');",'ATTACH DATABASE ":memory:" AS other',
        'DELETE FROM threads','VACUUM','PRAGMA journal_mode=WAL',"SELECT load_extension('invented')",
        'SELECT typeof(id), typeof(cwd), id IS NULL, cwd IS NULL FROM main.threads LIMIT 1; SELECT id FROM threads;',
        "PRAGMA main.table_list('threads'); -- changed text"]) {
        assert.throws(()=>attempt(sql),error=>{
          privateFree(String(error)); return error instanceof Error && error.message === 'Qualification refused';
        });
      }
    };
    privateFree(inspectQualificationAnalysis(scratch,hook));
    assert.deepEqual(phases,['structure','columns','sample']);
  });
});
test('qualification never follows a source-defined replacement for the schema table function', () => {
  unit(supported+' CREATE VIEW pragma_table_xinfo AS SELECT 1 AS cid;',scratch=>{
    assert.throws(()=>inspectQualificationAnalysis(scratch),{message:'Qualification refused'});
  });
});
test('qualification malformed analysis and injected diagnostics remain sanitized', () => {
  unit(supported,scratch=>{
    let reached=false;
    assert.throws(()=>inspectQualificationAnalysis(scratch,()=>{reached=true;throw new Error(canary);}),error=>{
      privateFree({message:String(error),stack:(error as Error).stack}); return true;
    }); assert.equal(reached,true);
    fs.writeFileSync(scratch.path('analysis',0),canary);
    assert.throws(()=>inspectQualificationAnalysis(scratch),error=>{
      privateFree({message:String(error),stack:(error as Error).stack}); return true;
    });
  });
});

for (const wal of [false,true]) test(`qualification protected ${wal?'WAL set':'database'} end-to-end path`,empirical,async()=>{
  const f=fixture(supported,wal); const before=snapshot(f.source);
  try {
    const result=await runCanary(options(f)); privateFree(result);
    assert.equal(result.status,'passed'); assert.equal(result.files,wal?3:1);
    assert.equal(result.qualification?.idText,true); assert.equal(result.qualification?.cwdText,true);
    assert.equal(result.cleanup,'removed'); assert.equal(result.recovery,'removed');
    assert.deepEqual(result.evidence.stages,['prepared','recovery-ready','held','copied','verified']);
    assert.equal(result.evidence.exitConfirmed,true); assert.equal(snapshot(f.source)===before,true);
    assert.equal(fs.existsSync(join(f.run.sources,'metadata.json')),true);
  } finally {f.cleanup();}
});
test('qualification unsupported structure still verifies sources and completes authenticated cleanup',empirical,async()=>{
  const f=fixture('CREATE TABLE other(id TEXT,cwd TEXT)'); const before=snapshot(f.source);
  try {
    const result=await runCanary(options(f)); privateFree(result);
    assert.equal(result.status,'refused'); assert.equal(result.reason,'unsupported');
    assert.equal(result.qualification?.structure,'unsupported');
    assert.equal(result.evidence.stages.includes('verified'),true);
    assert.equal(result.cleanup,'removed'); assert.equal(result.recovery,'removed');
    assert.equal(snapshot(f.source)===before,true);
  }finally{f.cleanup();}
});
test('qualification inspection failure withholds results and preserves originals',empirical,async()=>{
  const f=fixture(supported);const before=snapshot(f.source);let reached=false;
  try{
    const result=await runCanary(options(f,{qualificationHook:()=>{reached=true;throw new Error(canary);}}));
    assert.equal(reached,true);privateFree(result);assert.equal(result.status,'refused');assert.equal(result.qualification,null);
    assert.equal(result.cleanup,'removed');assert.equal(result.recovery,'removed');assert.equal(snapshot(f.source)===before,true);
  }finally{f.cleanup();}
});
test('qualification cleanup residual withholds sample until exact synthetic recovery',empirical,async()=>{
  const f=fixture(supported);const before=snapshot(f.source);let reached=false;
  try{
    const result=await runCanary(options(f,{cleanupFault:()=>{reached=true;throw new Error(canary);}}));
    assert.equal(reached,true);privateFree(result);assert.equal(result.status,'refused');assert.equal(result.qualification,null);
    assert.equal(result.cleanup,'residual');
    assert.equal(await retryCanaryCleanup(),'removed');
    assert.equal(snapshot(f.source)===before,true);assert.equal(fs.existsSync(join(f.run.sources,'metadata.json')),true);
  }finally{f.cleanup();}
});
