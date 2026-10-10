import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join } from 'node:path';
import { inspect } from 'node:util';
import { syncBuiltinESMExports } from 'node:module';
import { runInNewContext } from 'node:vm';
import { request } from 'node:http';
import { EventEmitter } from 'node:events';
import { DatabaseSync } from 'node:sqlite';
import { explorerFixture, inventedProjects } from './support/explorer-fixture.js';
import { CanaryScratch, runSyntheticExplorer, type CanaryOptions, type CanaryResult } from './support/personal-canary.js';
import { readExplorerCopies, explorerLimits } from '../src/explorer/readers.js';
import { reconcile, ExplorerSnapshot, windowsPathKey, type ExplorerData } from '../src/explorer/model.js';
import { serveLocalExplorer } from '../src/explorer/server.js';
import { clientCode, explorerHtml, escapeStored, threadLink, displayTitle } from '../src/explorer/view.js';
import { runExplorerEntry } from './support/explorer-entry.js';

const provenance={namespace:'synthetic-a',from:'2026-10-07T00:00:00.000Z',through:'2026-10-07T00:00:01.000Z'};
const secret='SYNTHETIC_EXPLORER_PRIVATE';
const empirical={skip:process.platform!=='win32'||process.env.WORKSPACE_SURVEYOR_RUN_CANARY_PREPARATION!=='1'||process.env.WORKSPACE_SURVEYOR_RUN_EXPLORER_PREPARATION!=='1',concurrency:false};
type Build=(db:DatabaseSync)=>void;
const rows=(values:readonly (readonly unknown[])[]):Build=>db=>{db.exec('CREATE TABLE threads(id TEXT,cwd TEXT,title TEXT)');
  const insert=db.prepare('INSERT INTO threads VALUES(?,?,?)');for(const row of values)insert.run(...row as [string,string,string]);};
function sanitized(x:unknown){assert.equal(JSON.stringify(x).includes(secret),false);assert.equal(inspect(x).includes(secret),false);}
async function unit(build:Build,check:(result:ReturnType<typeof readExplorerCopies>,scratch:CanaryScratch)=>void,json:unknown=inventedProjects,policy:'desktop-v1'|'unavailable'='desktop-v1',indexContent?:string){
  const f=explorerFixture(build,false,json,indexContent),scratch=new CanaryScratch(['database.sqlite','global-state.json',...(indexContent!==undefined?['session-index.jsonl']:[])],'explorer');f.scratches.push(scratch);
  try{
    scratch.initialize();for(const area of ['acquisition','analysis'] as const){fs.mkdirSync(join(scratch.root!,area));
      fs.copyFileSync(f.source,scratch.path(area,0));fs.copyFileSync(f.globalState,scratch.path(area,1));if(indexContent!==undefined)fs.copyFileSync(f.sessionIndex,scratch.path(area,2));}
    const before=[fs.readFileSync(f.source),fs.readFileSync(f.globalState),fs.readFileSync(scratch.path('acquisition',0)),fs.readFileSync(scratch.path('acquisition',1))];
    const result=readExplorerCopies(scratch,provenance,1,policy,indexContent!==undefined?2:undefined);sanitized(result);check(result,scratch);
    if(indexContent!==undefined){assert.equal(fs.readFileSync(f.sessionIndex,'utf8'),indexContent);assert.equal(fs.readFileSync(scratch.path('acquisition',2),'utf8'),indexContent);}
    for(const [i,p] of [f.source,f.globalState,scratch.path('acquisition',0),scratch.path('acquisition',1)].entries())assert.equal(fs.readFileSync(p).equals(before[i]!),true);
  }finally{assert.equal(await f.teardown(),true);}
}

test('named records retain exact strings, duplicate titles, omissions and opaque-ID ambiguity',async()=>{
  await unit(rows([['a','C:\\Synthetic\\X','Same'],['b','C:\\Synthetic\\X','Same'],['a','c:\\synthetic\\x',secret],['a',null,'Omitted'],['c','é',''],['d','e\u0301',null]]),r=>{
    assert.equal(r.status,'ready');assert.equal(r.summary?.omittedRows,0);assert.equal(r.summary?.ambiguousIds,1);
    const d=r.snapshot!.take()!;assert.equal(d.threads.length,6);assert.equal(d.threads[5]?.title,null);assert.equal(d.threads[3]?.cwd,null);assert.equal(d.locations.includes('é'),true);
    assert.equal(d.locations.includes('e\u0301'),true);assert.equal(d.threads[2]?.ambiguous,true);assert.equal(r.snapshot!.take(),undefined);
  });
});
test('empty selected table yields no population or projectlessness claim',async()=>{
  await unit(rows([]),r=>{assert.equal(r.summary?.rowsRead,0);assert.equal(r.snapshot!.take()!.threads.length,0);});
});
for(const ddl of ['CREATE TABLE threads(id TEXT,cwd TEXT)','CREATE TABLE threads(id TEXT,cwd TEXT,title INTEGER)'])test('unqualified title capability leaves location records useful: '+ddl,async()=>{
  await unit(db=>{db.exec(ddl);db.prepare('INSERT INTO threads(id,cwd) VALUES(?,?)').run('a','C:\\Synthetic\\cwd');},r=>{
    assert.equal(r.status,'ready');assert.equal(r.summary?.titles,'unavailable');assert.equal(r.snapshot!.take()!.threads[0]?.title,null);
  });
});
test('additional ordinary columns are accepted without reading defaults or contents',async()=>{
  await unit(db=>{db.exec(`CREATE TABLE threads(id TEXT,cwd TEXT,title TEXT,extra TEXT DEFAULT '${secret}')`);db.prepare('INSERT INTO threads(id,cwd,title) VALUES(?,?,?)').run('a','cwd','Title');},r=>{
    assert.equal(r.summary?.unconsumedColumns,true);assert.equal(JSON.stringify(r.snapshot!.take()).includes(secret),false);
  });
});
for(const ddl of ['CREATE TABLE threads(id TEXT,cwd INTEGER,title TEXT)',
  'CREATE TABLE threads(id TEXT,cwd TEXT,title TEXT,extra TEXT GENERATED ALWAYS AS (cwd))',
  'CREATE VIEW threads AS SELECT "a" AS id,"cwd" AS cwd,"title" AS title',
  'CREATE VIRTUAL TABLE threads USING fts5(id,cwd,title)',
  'CREATE TABLE threads(id TEXT,cwd TEXT,title TEXT,'+Array.from({length:62},(_,i)=>`extra${i} TEXT`).join(',')+')'])test('unsupported named-thread schema refuses: '+ddl.slice(0,65),async()=>{
  await unit(db=>db.exec(ddl),r=>{assert.equal(r.status,'unavailable');assert.equal(r.reason,'schema');assert.equal(r.snapshot,undefined);});
});
test('malformed copied database refuses without findings',async()=>{
  await unit(rows([]),(r,scratch)=>{r.snapshot?.discard();fs.writeFileSync(scratch.path('analysis',0),secret);
    const failure=readExplorerCopies(scratch,provenance);assert.equal(failure.status,'unavailable');sanitized(failure);});
});
for(const [name,values,reason] of [
  ['row boundary',Array.from({length:1000},(_,i)=>['id'+i,'cwd','title']),'none'],
  ['row overflow',Array.from({length:1001},(_,i)=>['id'+i,'cwd','title']),'limit'],
  ['field boundary',[['x'.repeat(16384),'cwd','Title']],'none'],
  ['field overflow',[['x'.repeat(16385),'cwd','Title']],'limit'],
  ['total overflow',Array.from({length:70},(_,i)=>['a'+i,'x'.repeat(16384),'Title']),'limit'],
] as const)test('named reader '+name,async()=>{await unit(rows(values),r=>{assert.equal(r.reason,reason);if(reason!=='none')assert.equal(r.snapshot,undefined);},null,'unavailable');});
test('unqualified real JSON cannot enable Projects even when synthetic-looking',async()=>{
  await unit(rows([['a','cwd','Title']]),r=>{assert.equal(r.summary?.projects,'unavailable');const d=r.snapshot!.take()!;
    assert.equal(d.projects.length,0);assert.deepEqual(d.memberships,['unknown']);},inventedProjects,'unavailable');
});
for(const json of [{ 'electron-saved-workspace-roots':['C:\\Synthetic\\folder'] },null,{format:'workspace-surveyor-invented-projects-v1',projects:'bad',assignments:[]}])test('unsupported Project structure disables only that capability',async()=>{
  await unit(rows([['a','cwd','Title']]),r=>{assert.equal(r.status,'ready');assert.equal(r.summary?.projects,'unavailable');assert.equal(r.snapshot!.take()!.memberships[0],'unknown');},json);
});
test('reconciliation preserves multiple/nested roots, duplicate labels, dangling/conflicting and shared location claims',async()=>{
  const json={'local-projects':{p:{id:'p',name:'Same',rootPaths:['cwd','cwd/child']},q:{id:'q',name:'Same',rootPaths:['cwd']}},
    'thread-project-assignments':Object.fromEntries([['a','p'],['b','q'],['c','p'],['d','gone'],['gone','p']].map(([id,p])=>[id,{projectKind:'local',projectId:p}])), 'projectless-thread-ids':['c']};
  await unit(rows([['a','cwd','A'],['b','cwd','B'],['c','cwd','C'],['d','cwd','D'],['e','cwd','E']]),r=>{
    const d=r.snapshot!.take()!;assert.deepEqual(d.memberships,['stored-assignment','stored-assignment','conflicting','dangling','no-assignment-observed']);
    assert.equal(d.danglingAssignments,2);assert.equal(d.relations.filter(r=>r.kind==='matches-exact-root').length,10);
    assert.equal(d.relations.filter(r=>r.kind==='shares-exact-cwd').length,5);assert.notEqual(d.projectNamespace,d.provenance.namespace);
  },json);
});
test('mismatched embedded Project IDs disable Projects without guessing identity',async()=>{
  await unit(rows([['a','cwd','A']]),r=>assert.equal(r.snapshot!.take()!.memberships[0],'unknown'),
    {'local-projects':{p:{id:'p',name:'X',rootPaths:[]},q:{id:'p',name:'Y',rootPaths:[]}},'thread-project-assignments':{a:{projectKind:'local',projectId:'p'}},'projectless-thread-ids':[]});
});
test('Project values share the field/text budgets and overflow withholds the entire dataset',async()=>{
  await unit(rows([]),r=>{assert.equal(r.reason,'limit');assert.equal(r.snapshot,undefined);},
    {'local-projects':{p:{id:'p',name:'x'.repeat(explorerLimits.fieldBytes+1),rootPaths:[]}},'thread-project-assignments':{},'projectless-thread-ids':[]});
});
test('stored roots and CWD strings are preserved and never used for filesystem access',async()=>{
  const strings=['C:\\Synthetic\\case','c:\\synthetic\\case','\\\\?\\C:\\Synthetic\\case','\\\\synthetic-host\\share\\cwd','../synthetic'];
  await unit(rows(strings.map((p,i)=>['id'+i,p,'Title'])),(r,scratch)=>{
    r.snapshot?.discard();const originals=new Map<string,unknown>();let touched=false;
    const object=fs as unknown as Record<string,unknown>;
    for(const key of ['lstatSync','statSync','realpathSync','openSync','readFileSync','readdirSync']){
      const original=object[key] as (...args:unknown[])=>unknown;originals.set(key,original);
      object[key]=(...args:unknown[])=>{if(typeof args[0]==='string'&&strings.includes(args[0])){touched=true;throw new Error(secret);}return Reflect.apply(original,fs,args);};
    }
    syncBuiltinESMExports();
    try{const result=readExplorerCopies(scratch,provenance,1,'desktop-v1');assert.equal(result.status,'ready');
      assert.equal(result.snapshot!.take()!.threads.every((t,i)=>t.cwd===strings[i]),true);assert.equal(touched,false);
    }finally{for(const [key,value] of originals)object[key]=value;syncBuiltinESMExports();}
  });
});

function data():ExplorerData{return reconcile(provenance,{rowsRead:1,omittedRows:0,ambiguousIds:0,titles:'accepted',projects:'unavailable',unconsumedColumns:true,correspondence:'unknown'},
  [{id:secret,cwd:'C:\\Synthetic\\<img onerror=alert(1)>\u202e',title:'<script>'+secret+'</script>\u001b',ambiguous:false}],[],[]);}

test('Desktop metadata classifies internal/history, corroborated user Threads, conflicts and stale references',async()=>{
  const ids=['assigned','free','guardian','archived','unassigned','conflict','dangling','remote','malformed','oversize','no-cwd','unknown-archive'];
  const json={'local-projects':{p:{id:'p',name:'Synthetic Project',rootPaths:['C:\\Synthetic\\atlas']},empty:{id:'empty',name:'Empty',rootPaths:[]}},
    'thread-project-assignments':Object.fromEntries(['assigned','guardian','archived','conflict','malformed','oversize','no-cwd','unknown-archive','deleted'].map(id=>[id,{projectKind:'local',projectId:'p'}]).concat([
      ['dangling',{projectKind:'local',projectId:'removed'}],['remote',{projectKind:'remote',projectId:'p'}]])),
    'projectless-thread-ids':['free','conflict','deleted-free']};
  await unit(db=>{
    db.exec('CREATE TABLE threads(id TEXT,cwd TEXT,title TEXT,source TEXT,archived INTEGER,project_id TEXT,body TEXT)');
    const insert=db.prepare('INSERT INTO threads VALUES(?,?,?,?,?,?,?)');
    for(const id of ids)insert.run(id,id==='no-cwd'?null:'\\\\?\\C:\\Synthetic\\atlas','Same title',
      id==='guardian'?JSON.stringify({subagent:{other:'guardian'}}):id==='malformed'?'{broken':id==='oversize'?'x'.repeat(10000):'vscode',
      id==='archived'?1:id==='unknown-archive'?null:0,null,secret);
  },r=>{
    const d=r.snapshot!.take()!;
    assert.equal(r.summary?.projects,'desktop-registry');assert.equal(r.summary?.omittedRows,0);
    assert.deepEqual(d.visibility,['inferred','inferred','internal','archived','unknown','unknown','unknown','unknown','unknown','unknown','inferred','unknown']);
    assert.deepEqual(d.memberships,['stored-assignment','projectless','stored-assignment','stored-assignment','no-assignment-observed','conflicting','dangling','unknown','stored-assignment','stored-assignment','stored-assignment','stored-assignment']);
    assert.equal(d.danglingAssignments,2);assert.equal(d.staleProjectless,1);
    assert.equal(d.threads.some(t=>t.id==='deleted'),false);assert.equal(d.projects.length,2);
    assert.equal(d.threads[10]!.cwd,null);assert.equal(d.relations.filter(x=>x.kind==='matches-normalized-root').length,11);
    assert.deepEqual(d.components.map(c=>[...c.threads]),[[0,1,10],[]]);
    assert.equal(JSON.stringify(d).includes(secret),false);assert.equal(JSON.stringify(d).includes('guardian"}'),false);
  },json);
});

test('Windows lexical comparison preserves ambiguous namespaces and avoids proximity or Unicode alias guesses',()=>{
  assert.equal(windowsPathKey('C:\\Synthetic\\Atlas\\'),windowsPathKey('\\\\?\\c:\\synthetic\\ATLAS'));
  assert.equal(windowsPathKey('\\\\Host\\Share\\Folder'),windowsPathKey('\\\\?\\UNC\\host\\share\\folder'));
  assert.equal(windowsPathKey('C:/Synthetic/Atlas'),windowsPathKey('C:\\Synthetic\\Atlas'));
  for(const p of ['C:atlas','C:\\Synthetic\\..\\atlas','C:\\Synthetic\\name.','C:\\Synthetic\\name ',
    '\\\\?\\C:\\Synthetic/atlas','\\\\.\\C:\\atlas','\\\\?\\GLOBALROOT\\Device','C:\\a:stream','C:\\CON\\x','\\\\host'])assert.equal(windowsPathKey(p),null,p);
  assert.notEqual(windowsPathKey('C:\\atlas'),windowsPathKey('C:\\atlas-two'));
  assert.notEqual(windowsPathKey('C:\\é'),windowsPathKey('C:\\e\u0301'));
});

test('Windows Unicode sequences remain distinct in root matches and Workspace connectivity',()=>{
  const coverage={...data().coverage,projects:'desktop-registry' as const,correspondence:'qualified' as const};
  for(const [ordinary,extended] of [['C:\\Synthetic\\','\\\\?\\c:\\synthetic\\'],
    ['\\\\Host\\Share\\','\\\\?\\UNC\\host\\share\\']] as const){
    const roots=[ordinary+'\u0130',ordinary+'i\u0307'];
    const cwds=[extended+'\u0130',extended+'i\u0307'];
    const projects=roots.map((root,i)=>({id:'p'+i,label:'Synthetic '+i,roots:[root]}));
    const threads=cwds.map((cwd,i)=>({id:'t'+i,cwd,title:'Synthetic '+i,ambiguous:false,sourceState:'ordinary' as const,archived:false}));
    const d=reconcile(provenance,coverage,threads,projects,[],['t0','t1']);
    assert.deepEqual(d.relations.filter(r=>r.kind==='matches-normalized-root').map(r=>[r.subject,r.target]),[[0,0],[1,1]]);
    assert.deepEqual(d.components,[{projects:[0],threads:[0]},{projects:[1],threads:[1]}]);
    assert.notEqual(windowsPathKey(roots[0]!),windowsPathKey(roots[1]!));
    assert.ok(windowsPathKey(roots[0]!)!.endsWith('\u0130'));
    assert.ok(windowsPathKey(roots[1]!)!.endsWith('i\u0307'));
    assert.deepEqual(d.projects.map(p=>p.roots[0]),roots);
    assert.deepEqual(d.threads.map(t=>t.cwd),cwds);
    const unassociated=reconcile(provenance,coverage,threads,[],[],['t0','t1']);
    assert.deepEqual(unassociated.components,[{projects:[],threads:[0]},{projects:[],threads:[1]}]);
  }
});

test('CWD changes preserve Thread identity and unknown/internal records cannot bridge ordinary components',()=>{
  const coverage={...data().coverage,projects:'desktop-registry' as const,correspondence:'qualified' as const};
  const projects=[{id:'p',label:'Same',roots:['C:\\Synthetic\\a']},{id:'q',label:'Same',roots:['C:\\Synthetic\\b']}];
  const original={id:'a',cwd:'C:\\Synthetic\\a',title:'Same',ambiguous:false,sourceState:'ordinary' as const,archived:false};
  const before=reconcile(provenance,coverage,[original],projects,[],['a']);
  const after=reconcile(provenance,coverage,[{...original,cwd:'C:\\Synthetic\\b'},
    {...original,id:'internal',sourceState:'subagent',cwd:'C:\\Synthetic\\a'}],projects,[{threadId:'internal',projectId:'q',projectKind:'local'}],['a']);
  assert.equal(before.threads[0]!.id,after.threads[0]!.id);assert.equal(after.components.length,2);
  assert.deepEqual(before.components[0]!.threads,[0]);assert.deepEqual(after.components[1]!.threads,[0]);
  assert.equal(after.memberships[0],'projectless');
});

test('duplicate source IDs stay unclassified and duplicate Project identities stay conflicting',()=>{
  const coverage={...data().coverage,projects:'desktop-registry' as const,correspondence:'qualified' as const};
  const t={id:'a',cwd:null,title:null,ambiguous:true,sourceState:'ordinary' as const,archived:false};
  const d=reconcile(provenance,coverage,[t,t],[{id:'p',label:'A',roots:[]},{id:'p',label:'B',roots:[]}],[{threadId:'a',projectId:'p',projectKind:'local'}]);
  assert.deepEqual(d.visibility,['unknown','unknown']);assert.deepEqual(d.memberships,['conflicting','conflicting']);
});

test('deeplinks accept opaque UUIDs only and cannot introduce another scheme or navigation path',()=>{
  const id='00000000-0000-0000-0000-000000000001';assert.equal(threadLink(id),'codex://threads/'+id);
  for(const id of ['javascript:alert(1)','a/../settings','id?x=1','id#x','<svg>','\u0000',''])assert.equal(threadLink(id),null);
});
test('stored rendering is reversible, controls/bidi are visible and HTML stays text',()=>{
  assert.equal(escapeStored('a\u001b\u202e\\b'),'a\\u{1b}\\u{202e}\\\\b');
  assert.equal(clientCode.includes('innerHTML'),false);assert.equal(clientCode.includes('textContent'),true);
  assert.equal(explorerHtml.includes(secret),false);assert.equal(/localStorage|sessionStorage|readText|WebSocket|sendBeacon/.test(clientCode),false);
});
class Element {
  attributes:Record<string,string>={};setAttribute(name:string,value:string){this.attributes[name]=value;}
  children:Element[]=[];textContent='';className='';ariaPressed='';type='';value='';onclick:(()=>void)|undefined;oninput:((event:{target:{value:string}})=>void)|undefined;
  get childElementCount(){return this.children.length;}append(...children:Element[]){this.children.push(...children);}replaceChildren(...children:Element[]){this.children=children;}
}
test('Workspace DOM shows connected real-shaped entities, empty Projects and projectless Threads with diagnostics collapsed',async()=>{
  const elements=new Map<string,Element>();const get=(id:string)=>{let e=elements.get(id);if(!e){e=new Element();elements.set(id,e);}return e;};
  const id='00000000-0000-0000-0000-000000000001';
  const ordinary={cwd:'C:\\Synthetic\\atlas',title:'Visible title',titleSource:'session-index' as const,titleResolution:'latest' as const,ambiguous:false,sourceState:'ordinary' as const,archived:false};
  const d=reconcile(provenance,{...data().coverage,projects:'desktop-registry',correspondence:'qualified'},
    [{...ordinary,id},{...ordinary,id:'free',cwd:'\\\\?\\C:\\Synthetic\\ATLAS',title:'Free title'},
     {...ordinary,id:'unknown',title:'Unclassified title'},{...ordinary,id:'internal',title:'Internal title',sourceState:'subagent'}],
    [{id:'p',label:'Atlas',roots:['C:\\Synthetic\\atlas']},{id:'empty',label:'Empty Project',roots:[]}],
    [{threadId:id,projectId:'p',projectKind:'local'}],['free']);
  await runInNewContext(clientCode,{AbortController,document:{getElementById:get,createElement:()=>new Element(),createElementNS:()=>new Element()},
    location:{hash:'#synthetic-token',pathname:'/'},history:{replaceState(){}},addEventListener(){},fetch:async()=>({ok:true,json:async()=>d})});
  const texts=(e:Element):string[]=>[e.textContent,...e.children.flatMap(texts)];
  const primary=get('relationships').children.slice(0,2).flatMap(texts);
  assert.ok(primary.includes('Atlas'));assert.ok(primary.includes('Empty Project'));assert.ok(primary.includes('Visible title'));assert.ok(primary.includes('Free title'));
  assert.equal(primary.includes('Internal title'),false);assert.equal(primary.includes('Unclassified title'),false);
  assert.ok(primary.includes('Projectless'));assert.ok(primary.includes('No current Threads'));
  assert.equal(primary.some(x=>x.includes('Registry Project')),false);
  const find=(e:Element,title:string):Element|undefined=>e.onclick&&(e.textContent===title||e.children.some(c=>c.textContent===title))?e:e.children.map(x=>find(x,title)).find(Boolean);
  find(get('relationships'),'Visible title')!.onclick!();
  const link=get('details').children.find(e=>e.textContent==='Open in Codex ↗');assert.ok(link);assert.equal(Reflect.get(link,'href'),'codex://threads/'+id);
  get('expand-threads').onclick!();assert.ok(texts(get('relationships')).includes('Free title'));
  assert.ok(texts(get('relationships')).includes('Visible title'));
});
test('browser DOM renders hostile strings as text, unknown membership, details and unavailable Projects',async()=>{
  const elements=new Map<string,Element>();let resolveDone!:()=>void;const done=new Promise<void>(resolve=>{resolveDone=resolve;});
  const get=(id:string)=>{let e=elements.get(id);if(!e){e=new Element();elements.set(id,e);}return e;};
  get('relationships').append=(...children:Element[])=>{get('relationships').children.push(...children);resolveDone();};
  const context={document:{getElementById:get,createElement:()=>new Element(),createElementNS:()=>new Element()},location:{hash:'#synthetic-token',pathname:'/'},history:{replaceState(){}},
    AbortController,addEventListener(){},fetch:async()=>({ok:true,json:async()=>data()})};
  runInNewContext(clientCode,context);await done;
  assert.ok(get('notices').children.some(e=>e.textContent.includes('unavailable')));
  get('diagnostics').onclick!();const unclassified=get('relationships').children.find(e=>e.children[0]?.textContent==='Unresolved records (1)')!;
  const group=unclassified.children[1]!;
  const selectRow=(e:Element):Element|undefined=>e.className.includes('entity-select')?e:e.children.map(selectRow).find(Boolean);
  const record=selectRow(group)!;record.onclick!();
  const evidence=get('relationships').children.find(e=>e.className==='diagnostic-evidence')!;
  assert.ok(evidence.children.some(e=>e.textContent.includes('\\u{202e}')));
  assert.equal(evidence.children.some(e=>e.textContent===secret),true);
  assert.equal(Reflect.get(get('details'),'hidden'),true);assert.equal(get('layout').className,'layout');
  get('workspace').onclick!();assert.ok(get('notices').children.some(e=>e.textContent.includes('unavailable')));
  await get('close').onclick!();assert.equal(get('relationships').childElementCount,0);
  record.onclick!();assert.equal(get('details').childElementCount,0);
});

function deferred<T>(){
  let resolve!:(value:T)=>void,reject!:(reason:unknown)=>void;
  const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};
}
for(const phase of ['response','body'] as const)for(const outcome of ['success','failure'] as const)
test('browser shutdown ignores late snapshot '+phase+' '+outcome,async()=>{
  const elements=new Map<string,Element>();const get=(id:string)=>{let e=elements.get(id);if(!e){e=new Element();elements.set(id,e);}return e;};
  const body=deferred<ExplorerData>(),bodyStarted=deferred<void>();
  const response={ok:true,json:()=>{bodyStarted.resolve();return body.promise;}};
  const pending=deferred<typeof response>();let signal:AbortSignal|undefined,closes=0;
  const loading=runInNewContext(clientCode,{AbortController,document:{getElementById:get,createElement:()=>new Element(),createElementNS:()=>new Element()},
    location:{hash:'#synthetic-token',pathname:'/'},history:{replaceState(){}},addEventListener(){},
    fetch:(path:string,options:{signal?:AbortSignal})=>{
      if(path==='/close'){closes++;assert.equal(options.signal,undefined);return Promise.resolve({ok:true});}
      signal=options.signal;return pending.promise; // Deliberately ignore abort: guards must reject late results too.
    }}) as Promise<void>;
  if(phase==='body'){pending.resolve(response);await bodyStarted.promise;}
  await get('close').onclick!();const closedText=get('coverage').textContent;
  assert.match(closedText,/Session closed/);assert.equal(signal?.aborted,true);
  if(phase==='response'){
    if(outcome==='success'){body.resolve(data());pending.resolve(response);}else pending.reject(new Error(secret));
  }else if(outcome==='success')body.resolve(data());else body.reject(new Error(secret));
  await loading;
  get('workspace').onclick!();get('diagnostics').onclick!();get('expand-threads').onclick!();
  await get('close').onclick!();
  assert.equal(closes,1);assert.equal(get('coverage').textContent,closedText);
  assert.equal(get('relationships').childElementCount,0);assert.equal(get('details').childElementCount,0);
  assert.equal(get('limitations').childElementCount,0);
  assert.equal(JSON.stringify([...elements.values()]).includes(secret),false);
});
for(const outcome of ['delivered','rejected','undelivered'] as const)
test('browser shutdown pagehide authenticates close; '+outcome+' delivery preserves terminal state and expiry fallback',async t=>{
  // An unreceived close must still expire through the unchanged real server timer.
  if(outcome!=='delivered')t.mock.timers.enable({apis:['setTimeout']});
  const server=outcome!=='delivered'?await serveLocalExplorer(new ExplorerSnapshot(data())):undefined;
  let expired=false;if(server)void server.closed.then(()=>{expired=true;});
  try{
  const elements=new Map<string,Element>();const get=(id:string)=>{let e=elements.get(id);if(!e){e=new Element();elements.set(id,e);}return e;};
  const response=deferred<{ok:boolean;json:()=>Promise<ExplorerData>}>(),closure=deferred<unknown>();let hide!:()=>void,signal:AbortSignal|undefined,closes=0;
  const loading=runInNewContext(clientCode,{AbortController,document:{getElementById:get,createElement:()=>new Element(),createElementNS:()=>new Element()},
    location:{hash:'#synthetic-token',pathname:'/'},history:{replaceState(){}},
    addEventListener:(name:string,callback:()=>void)=>{if(name==='pagehide')hide=callback;},
    fetch:(path:string,options:{signal?:AbortSignal;method?:string;headers:Record<string,string>;keepalive?:boolean;body?:unknown})=>{
      if(path==='/close'){
        closes++;assert.equal(options.method,'POST');assert.equal(options.keepalive,true);
        assert.equal(options.headers['X-Surveyor-Session'],'synthetic-token');assert.equal(options.signal,undefined);assert.equal(options.body,undefined);
        return closure.promise;
      }
      assert.equal(path,'/snapshot');signal=options.signal;return response.promise;
    }}) as Promise<void>;
  hide();assert.equal(closes,1);assert.equal(signal?.aborted,true);
  if(outcome==='delivered')closure.resolve({ok:true});else if(outcome==='rejected')closure.reject(new Error(secret));
  hide();await get('close').onclick!();assert.equal(closes,1);
  response.resolve({ok:true,json:async()=>data()});await loading;
  assert.equal(get('relationships').childElementCount,0);assert.match(get('coverage').textContent,/Session closed/);
  if(server){assert.equal(expired,false);t.mock.timers.tick(10*60*1000-1);assert.equal(expired,false);
    t.mock.timers.tick(1);await server.closed;assert.equal(expired,true);
    assert.equal(get('relationships').childElementCount,0);assert.match(get('coverage').textContent,/Session closed/);}
  }finally{await server?.close();if(server)t.mock.timers.reset();}
});

function entryHarness(){
  const signals=new EventEmitter(),output:string[]=[],snapshot=new ExplorerSnapshot(data());
  const acquisition=deferred<{snapshot?:ExplorerSnapshot;safety:CanaryResult|null}>(),acquisitionStarted=deferred<void>();
  const startup=deferred<void>(),startupStarted=deferred<void>(),teardownStarted=deferred<void>();
  const closeGate=deferred<void>(),closeStarted=deferred<void>(),closed=deferred<void>(),published=deferred<void>();
  const finalTeardownStarted=deferred<void>();
  let cleanupGate:ReturnType<typeof deferred<boolean>>|undefined,cleanupFrom=1,teardowns=0,starts=0,closes=0,settled=false;
  const server={url:'http://127.0.0.1:12345/#synthetic-session',closed:closed.promise,close:async()=>{
    closes++;closeStarted.resolve();await closeGate.promise;closed.resolve();
  }};
  const deps:Parameters<typeof runExplorerEntry>[0]={signals,write:text=>{output.push(text);if(text===server.url)published.resolve();},
    createFixture:()=>({acquire:()=>{acquisitionStarted.resolve();return acquisition.promise;},teardown:async()=>{
      teardowns++;teardownStarted.resolve();if(teardowns===2)finalTeardownStarted.resolve();return cleanupGate&&teardowns>=cleanupFrom?cleanupGate.promise:true;
    }}),
    start:async cap=>{starts++;assert.equal(cap,snapshot);assert.ok(cap.take());startupStarted.resolve();await startup.promise;return server;}};
  const run=()=>{const done=runExplorerEntry(deps);void done.then(()=>{settled=true;});return done;};
  const check=()=>{
    assert.equal(signals.listenerCount('SIGINT'),0);assert.equal(signals.listenerCount('SIGTERM'),0);
    assert.deepEqual(snapshot.toJSON(),{capability:'local-explorer',available:false});
    assert.equal(output.join('').includes(secret),false);
  };
  const report=()=>JSON.parse(output.at(-1)!);
  return {signals,output,snapshot,acquisition,acquisitionStarted,startup,startupStarted,teardownStarted,finalTeardownStarted,closeGate,closeStarted,closed,published,server,run,check,report,
    holdCleanup:(from=1)=>{cleanupFrom=from;return cleanupGate=deferred<boolean>();},counts:()=>({teardowns,starts,closes,settled})};
}
for(const signal of ['SIGINT','SIGTERM'])test('entry shutdown cancellation during acquisition '+signal,async()=>{
  const h=entryHarness(),cleanup=h.holdCleanup(),done=h.run();await h.acquisitionStarted.promise;
  h.signals.emit(signal);h.signals.emit(signal);assert.equal(h.counts().settled,false);assert.equal(h.counts().teardowns,0);
  h.acquisition.resolve({snapshot:h.snapshot,safety:null});await h.teardownStarted.promise;
  assert.equal(h.counts().settled,false);assert.equal(h.counts().starts,0);assert.equal(h.snapshot.take(),undefined);
  assert.equal(h.signals.listenerCount(signal),1);cleanup.resolve(true);
  assert.equal(await done,1);assert.deepEqual(h.counts(),{teardowns:1,starts:0,closes:0,settled:true});
  assert.equal(h.output.length,1);assert.deepEqual(h.report(),{status:'refused',reason:'cancelled',cancelled:true,safety:null,
    fixtureCleanup:{beforeDelivery:'not-run',final:'removed'}});h.check();
});
test('entry shutdown cancellation during fixture teardown prevents server startup',async()=>{
  const h=entryHarness(),cleanup=h.holdCleanup(),done=h.run();h.acquisition.resolve({snapshot:h.snapshot,safety:null});await h.teardownStarted.promise;
  h.signals.emit('SIGINT');cleanup.resolve(true);assert.equal(await done,1);assert.equal(h.counts().starts,0);
  assert.equal(h.counts().teardowns,2);h.check();
});
for(const signal of ['SIGINT','SIGTERM'])test('entry shutdown cancellation during server startup '+signal,async()=>{
  const h=entryHarness(),done=h.run();h.acquisition.resolve({snapshot:h.snapshot,safety:null});await h.startupStarted.promise;
  h.signals.emit(signal);h.signals.emit(signal);assert.equal(h.counts().settled,false);assert.equal(h.counts().closes,0);
  h.startup.resolve();await h.closeStarted.promise;
  assert.equal(h.counts().settled,false);assert.equal(h.counts().teardowns,1);assert.equal(h.output.includes(h.server.url),false);
  h.signals.emit(signal);assert.equal(h.counts().closes,1);h.closeGate.resolve();
  assert.equal(await done,1);assert.deepEqual(h.counts(),{teardowns:2,starts:1,closes:1,settled:true});h.check();
});
test('entry shutdown startup rejection after cancellation is sanitized and cleaned',async()=>{
  const h=entryHarness(),done=h.run();h.acquisition.resolve({snapshot:h.snapshot,safety:null});await h.startupStarted.promise;
  h.signals.emit('SIGTERM');h.startup.reject(new Error(secret));assert.equal(await done,1);
  assert.equal(h.output.includes(h.server.url),false);assert.equal(h.counts().teardowns,2);h.check();
});
test('entry shutdown normal completion publishes once and awaits server and fixture cleanup',async()=>{
  const h=entryHarness(),done=h.run();h.acquisition.resolve({snapshot:h.snapshot,safety:null});await h.startupStarted.promise;
  h.startup.resolve();await h.published.promise;assert.equal(h.counts().settled,false);
  h.closed.resolve();await h.closeStarted.promise;assert.equal(h.counts().settled,false);h.closeGate.resolve();
  assert.equal(await done,0);assert.equal(h.output.filter(x=>x===h.server.url).length,1);
  assert.deepEqual(h.counts(),{teardowns:2,starts:1,closes:1,settled:true});h.check();
});
test('entry shutdown repeated signals after delivery share one owned close',async()=>{
  const h=entryHarness(),done=h.run();h.acquisition.resolve({snapshot:h.snapshot,safety:null});h.startup.resolve();await h.published.promise;
  h.signals.emit('SIGINT');await h.closeStarted.promise;h.signals.emit('SIGINT');h.signals.emit('SIGTERM');
  assert.equal(h.counts().closes,1);assert.equal(h.counts().settled,false);h.closeGate.resolve();
  assert.equal(await done,1);assert.equal(h.counts().closes,1);h.check();
});
test('entry shutdown retains residual reporting and removes listeners after teardown failure',async()=>{
  const h=entryHarness(),cleanup=h.holdCleanup(),done=h.run();await h.acquisitionStarted.promise;h.signals.emit('SIGINT');
  h.acquisition.resolve({snapshot:h.snapshot,safety:null});await h.teardownStarted.promise;cleanup.reject(new Error(secret));
  assert.equal(await done,1);assert.equal(h.report().cancelled,true);assert.equal(h.report().fixtureCleanup.final,'residual');h.check();
});

const acquisitionSafety:CanaryResult={status:'refused',reason:'cleanup',cleanup:'residual',recovery:'available',files:2,
  schemaReadable:true,sourcesStable:true,attemptConsumed:true,evidence:{stages:['prepared','held','copied'],phase:'release',fault:'none',
    partialWritten:false,opened:2,exitConfirmed:false,diagnosticsDiscarded:true}};
for(const removed of [true,false])test('entry shutdown cancelled acquisition preserves safety independently of fixture removal '+removed,async()=>{
  const h=entryHarness(),cleanup=h.holdCleanup(),done=h.run(),expected=structuredClone(acquisitionSafety);
  await h.acquisitionStarted.promise;h.signals.emit('SIGINT');h.acquisition.resolve({safety:acquisitionSafety});
  await h.teardownStarted.promise;assert.equal(h.output.length,0);assert.equal(h.counts().settled,false);
  cleanup.resolve(removed);assert.equal(await done,1);
  assert.equal(h.report().cancelled,true);assert.deepEqual(h.report().safety,expected);assert.deepEqual(acquisitionSafety,expected);
  assert.deepEqual(h.report().fixtureCleanup,{beforeDelivery:'not-run',final:removed?'removed':'residual'});
  assert.equal(h.counts().starts,0);h.snapshot.discard();h.check();
});
for(const signal of ['SIGINT','SIGTERM','none'])test('entry shutdown final teardown settles before final cancellation decision '+signal,async()=>{
  const h=entryHarness(),cleanup=h.holdCleanup(2),done=h.run();
  const safety:CanaryResult={...acquisitionSafety,status:'passed',reason:'none',cleanup:'removed',recovery:'removed',evidence:{...acquisitionSafety.evidence,exitConfirmed:true}};
  h.acquisition.resolve({snapshot:h.snapshot,safety});h.startup.resolve();await h.published.promise;
  h.closed.resolve();await h.closeStarted.promise;h.closeGate.resolve();await h.finalTeardownStarted.promise;
  const priorOutput=h.output.length;assert.equal(h.counts().settled,false);
  if(signal!=='none'){h.signals.emit(signal);h.signals.emit(signal);}
  assert.equal(h.signals.listenerCount('SIGINT'),1);assert.equal(h.signals.listenerCount('SIGTERM'),1);
  assert.equal(h.output.length,priorOutput);cleanup.resolve(true);
  assert.equal(await done,signal==='none'?0:1);assert.equal(h.output.length,priorOutput+1);
  assert.equal(h.report().status,signal==='none'?'passed':'refused');assert.equal(h.report().cancelled,signal!=='none');
  assert.equal(h.report().reason,signal==='none'?'none':'cancelled');assert.deepEqual(h.report().safety,safety);
  assert.deepEqual(h.report().fixtureCleanup,{beforeDelivery:'removed',final:'removed'});h.check();
});
test('entry shutdown signal at final teardown resolution is included before listener removal and reporting',async()=>{
  const h=entryHarness(),cleanup=h.holdCleanup(2),done=h.run();
  h.acquisition.resolve({snapshot:h.snapshot,safety:null});h.startup.resolve();await h.published.promise;
  h.closed.resolve();await h.closeStarted.promise;h.closeGate.resolve();await h.finalTeardownStarted.promise;
  void cleanup.promise.then(()=>{assert.equal(h.signals.listenerCount('SIGTERM'),1);h.signals.emit('SIGTERM');});
  cleanup.resolve(true);assert.equal(await done,1);assert.equal(h.report().cancelled,true);h.check();
});
test('loopback session is memory-only, protected by host/origin/token, no-store and single-use capability',async()=>{
  const cap=new ExplorerSnapshot(data());sanitized(cap);const server=await serveLocalExplorer(cap);
  try{
    const url=new URL(server.url),token=url.hash.slice(1),base=url.origin;
    assert.equal(cap.take(),undefined);assert.equal((await fetch(base+'/snapshot')).status,403);
    assert.equal((await fetch(base+'/snapshot',{headers:{'X-Surveyor-Session':token,Origin:'https://example.invalid'}})).status,403);
    const hostileHost=await new Promise<number>(resolve=>{const req=request(base+'/snapshot',{headers:{'X-Surveyor-Session':token,Host:'localhost'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode!));});req.end();});
    assert.equal(hostileHost,403);
    assert.equal((await fetch(base+'/snapshot?extra',{headers:{'X-Surveyor-Session':token}})).status,404);
    const response=await fetch(base+'/snapshot',{headers:{'X-Surveyor-Session':token,Origin:base}});
    assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal((await response.json() as ExplorerData).threads.length,1);
    const page=await (await fetch(base)).text();assert.equal(page.includes(secret),false);assert.equal(page.includes(token),false);
    assert.equal((await fetch(base+'/close',{method:'POST',headers:{'X-Surveyor-Session':token,Origin:base}})).status,200);await server.closed;
  }finally{await server.close();}
});

function options(f:ReturnType<typeof explorerFixture>,extra:Partial<CanaryOptions>={}):CanaryOptions{return {
  executable:process.env.WORKSPACE_SURVEYOR_HELPER_PWSH??'',analysis:'explorer',explorer:{globalState:f.globalState},selection:f.selection,closure:()=> 'absent',...extra,
  hook:async(phase,scratch)=>{if(phase==='initialized')f.scratches.push(scratch);await extra.hook?.(phase,scratch);}};}
for(const wal of [false,true])test('protected synthetic DB + JSON acquisition'+(wal?' + WAL/SHM':''),empirical,async()=>{
  const f=explorerFixture(undefined,wal);
  try{const result=await runSyntheticExplorer(options(f));sanitized(result);
    assert.equal(result.safety?.status,'passed');assert.equal(result.safety?.files,wal?4:2);assert.equal(result.safety?.cleanup,'removed');
    const d=result.snapshot!.take()!;assert.equal(d.threads.length,4);assert.equal(d.projects.length,2);
  }finally{assert.equal(await f.teardown(),true);}
});
for(const fault of ['cleanup','unstable-json','descriptor','partial-copy','protocol'] as const)test('explorer withholds browser capability after '+fault,empirical,async()=>{
  const f=explorerFixture();let reached=false,confirmedExitedDescriptorFault=false;
  try{
    const result=await runSyntheticExplorer(options(f, fault==='cleanup'?{cleanupFault:()=>{reached=true;throw new Error(secret);}}:
      fault==='unstable-json'?{hook:phase=>{if(phase==='prepared'){reached=true;fs.appendFileSync(f.globalState,' ');}}}:
      fault==='protocol'?{corruptFrame:raw=>{reached=true;return raw+secret;}}:{fault,hook:phase=>{if(phase==='prepared')reached=true;}}));
    assert.equal(reached,true);assert.equal(result.snapshot,undefined);assert.equal(result.safety?.status,'refused');sanitized(result);
    confirmedExitedDescriptorFault=fault==='descriptor'&&result.safety?.evidence.exitConfirmed===true;
    assert.equal(fs.existsSync(f.source),true);assert.equal(fs.existsSync(join(f.run.sources,'wal.sqlite')),true);
    if(fault==='cleanup'){assert.equal(fs.existsSync(join(f.run.root,'recovery','record')),true);assert.equal(fs.existsSync(join(f.run.root,'recovery','key')),true);}
  }finally{assert.equal(await f.teardown(confirmedExitedDescriptorFault),true);}
});
test('explorer refuses personal selection before source/recovery access',async()=>{
  const result=await runSyntheticExplorer({executable:'not-selected',analysis:'explorer',explorer:{globalState:secret},selection:{kind:'personal',private:{source:secret,consent:true,scratchParent:secret,writers:['ChatGPT','Codex']}}});
  assert.equal(result.safety,null);assert.equal(result.snapshot,undefined);sanitized(result);
});
test('partial source-set acquisition rejects a writer on the final JSON before any destination content',empirical,async()=>{
  const f=explorerFixture(undefined,true);let writer:number|undefined,prepared=false;
  try{
    const result=await runSyntheticExplorer(options(f,{hook:phase=>{if(phase==='prepared'){prepared=true;writer=fs.openSync(f.globalState,'r+');}}}));
    assert.equal(prepared,true);assert.equal(result.snapshot,undefined);assert.equal(result.safety?.evidence.opened,3);
    assert.equal(result.safety?.evidence.phase,'open');assert.equal(result.safety?.files,0);assert.equal(result.safety?.cleanup,'removed');sanitized(result);
  }finally{if(writer!==undefined)fs.closeSync(writer);assert.equal(await f.teardown(),true);}
});
test('final JSON acquisition-copy verification withholds a staged relationship snapshot',empirical,async()=>{
  const f=explorerFixture();let reached=false;
  try{
    const result=await runSyntheticExplorer(options(f,{hook:(phase,scratch)=>{if(phase==='analyzed'){reached=true;fs.appendFileSync(scratch.path('acquisition',1),' ');}}}));
    assert.equal(reached,true);assert.equal(result.snapshot,undefined);assert.equal(result.safety?.status,'refused');sanitized(result);
  }finally{assert.equal(await f.teardown(),true);}
});
test('uncertain helper disposal preserves controls and withholds explorer delivery',empirical,async()=>{
  const f=explorerFixture();
  try{
    const result=await runSyntheticExplorer(options(f,{simulateExitUncertainty:true}));
    assert.equal(result.snapshot,undefined);assert.equal(result.safety?.status,'refused');assert.equal(result.safety?.cleanup,'residual');
    assert.equal(fs.existsSync(join(f.run.root,'recovery','record')),true);sanitized(result);
  }finally{assert.equal(await f.teardown(),true);}
});

for(const [name,value,shortened] of [['normal','Normal label',false],['large','x'.repeat(2*1024*1024),true],
  ['unicode','😀'.repeat(1025),true],['NUL','a\0b',false],['UTF8 boundary','a'.repeat(4095)+'😀tail',true],['BOM','\ufeffTitle',false]] as const)
test('optional title preview '+name+' preserves relationships and marks shortening',async()=>{
  await unit(rows([['a','cwd',value]]),r=>{assert.equal(r.status,'ready');assert.equal(r.summary?.claims,1);
    const t=r.snapshot!.take()!.threads[0]!;assert.equal(t.titleState,shortened?'shortened':'complete');
    assert.ok(Buffer.byteLength(t.title!)<=explorerLimits.titleBytes);
    if(!shortened)assert.equal(t.title,value);else assert.ok(value.startsWith(t.title!));
    assert.equal(r.summary?.shortenedTitles,shortened?1:0);
  },null,'unavailable');
});
test('optional cumulative title budget keeps every valid relationship with explicit fallbacks',async()=>{
  await unit(rows(Array.from({length:100},(_,i)=>['a'+i,'cwd','x'.repeat(4096)])),r=>{
    assert.equal(r.status,'ready');assert.equal(r.summary?.claims,100);assert.equal(r.summary?.unavailableTitles,36);
    const ts=r.snapshot!.take()!.threads;assert.equal(ts.filter(t=>t.titleState==='unavailable').length,36);
    assert.equal(ts.reduce((n,t)=>n+Buffer.byteLength(t.title??''),0),explorerLimits.titleTextBytes);
  },null,'unavailable');
});
for(const [values,detail] of [[['x'.repeat(16385),'cwd','Title'],'reader-id-bytes'],[['id','x'.repeat(16385),'Title'],'reader-cwd-bytes']] as const)
test('required field diagnostic '+detail+' withholds the dataset',async()=>{
  await unit(rows([values]),r=>{assert.equal(r.reason,'limit');assert.equal(r.limit,detail);assert.equal(r.structureAccepted,true);
    assert.equal(r.snapshot,undefined);},null,'unavailable');
});
test('row and required cumulative diagnostics stay precise and sanitized',async()=>{
  await unit(rows(Array.from({length:1001},(_,i)=>['id'+i,'cwd',secret])),r=>{assert.equal(r.limit,'reader-rows');},null,'unavailable');
  await unit(rows(Array.from({length:65},(_,i)=>['id'+i,'x'.repeat(16384),secret])),r=>{assert.equal(r.limit,'reader-required-text');},null,'unavailable');
});

test('browser uses generic labels for unqualified title previews and retains counters only in Diagnostics',async()=>{
  const elements=new Map<string,Element>();const get=(id:string)=>{let e=elements.get(id);if(!e){e=new Element();elements.set(id,e);}return e;};
  const d=reconcile(provenance,{rowsRead:2,omittedRows:0,ambiguousIds:0,titles:'accepted',shortenedTitles:1,unavailableTitles:1,
    projects:'unavailable',unconsumedColumns:false,correspondence:'unknown'},
    [{id:'a',cwd:'cwd',title:'Preview',titleState:'shortened',ambiguous:false},
     {id:'b',cwd:'cwd',title:null,titleState:'unavailable',ambiguous:false}],[],[]);
  await runInNewContext(clientCode,{AbortController,document:{getElementById:get,createElement:()=>new Element(),createElementNS:()=>new Element()},
    location:{hash:'#synthetic-token',pathname:'/'},history:{replaceState(){}},addEventListener(){},fetch:async()=>({ok:true,json:async()=>d})});
  get('diagnostics').onclick!();const all=(e:Element):Element[]=>[e,...e.children.flatMap(all)];
  assert.ok(all(get('relationships')).some(e=>e.textContent==='Thread a'));assert.ok(all(get('relationships')).some(e=>e.textContent==='Thread b'));
  assert.equal(all(get('relationships')).some(e=>e.textContent.includes('Preview')),false);
  assert.ok(all(get('relationships')).some(e=>e.textContent.includes('"shortenedTitles":1')));
  assert.equal(get('coverage').textContent.includes('shortened'),false);
});

test('open-app compatibility probe: active WAL writer, snapshot reads and reader side effects on owned builder only',async t=>{
  const f=explorerFixture(),path=join(f.run.root,'builder','standalone.sqlite');
  let writer:DatabaseSync|undefined,reader:DatabaseSync|undefined;
  try{
    writer=new DatabaseSync(path);writer.exec('PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0; CREATE TABLE live_probe(id INTEGER); INSERT INTO live_probe VALUES(1)');
    const database=fs.readFileSync(path),wal=fs.readFileSync(path+'-wal'),shm=fs.readFileSync(path+'-shm');
    reader=new DatabaseSync(path,{readOnly:true,allowExtension:false,defensive:true,timeout:0});reader.exec('PRAGMA query_only=ON; BEGIN');
    assert.equal(reader.prepare('SELECT count(*) AS n FROM live_probe').get()!.n,1);
    assert.equal(fs.readFileSync(path).equals(database),true);assert.equal(fs.readFileSync(path+'-wal').equals(wal),true);
    const shmChanged=!fs.readFileSync(path+'-shm').equals(shm);
    writer.exec('INSERT INTO live_probe VALUES(2)');
    assert.equal(reader.prepare('SELECT count(*) AS n FROM live_probe').get()!.n,1);
    reader.exec('COMMIT');assert.equal(reader.prepare('SELECT count(*) AS n FROM live_probe').get()!.n,2);
    assert.throws(()=>reader!.exec('INSERT INTO live_probe VALUES(3)'));
    t.diagnostic('Synthetic WAL snapshot read succeeded; shared-memory bytes changed during reader-only interval: '+shmChanged+'. Not evidence of zero source-side effects.');
  }finally{reader?.close();writer?.close();assert.equal(await f.teardown(),true);}
});

test('open-app compatibility probe: readOnly can create WAL shared memory on an owned analysis-shaped copy',async t=>{
  const f=explorerFixture(undefined,true),path=join(f.run.root,'builder','standalone.sqlite');let reader:DatabaseSync|undefined;
  try{
    fs.copyFileSync(f.source,path);fs.copyFileSync(f.source+'-wal',path+'-wal');
    assert.equal(fs.existsSync(path+'-shm'),false);
    const database=fs.readFileSync(path),wal=fs.readFileSync(path+'-wal');
    reader=new DatabaseSync(path,{readOnly:true,allowExtension:false,defensive:true,timeout:0});reader.exec('PRAGMA query_only=ON');
    assert.equal(reader.prepare('SELECT count(*) AS n FROM threads').get()!.n,4);
    assert.equal(fs.readFileSync(path).equals(database),true);assert.equal(fs.readFileSync(path+'-wal').equals(wal),true);
    const created=fs.existsSync(path+'-shm');
    assert.equal(created,true);t.diagnostic('Synthetic readOnly connection created SHM. Direct live SQLite access is not enabled.');
  }finally{reader?.close();assert.equal(await f.teardown(),true);}
});

for(const encoding of ['UTF-8','UTF-16le','UTF-16be'] as const)
for(const long of [false,true])test('qualified title encoding '+encoding+' '+(long?'bounded':'complete'),async()=>{
  const value=long?'文😀'.repeat(1500):'Synthetic é 文 😀\0\ufeff title';
  await unit(db=>{
    db.exec(`PRAGMA encoding='${encoding}'`);rows([['opaque','exact-cwd',value]])(db);
    const raw=db.prepare('SELECT CAST(title AS BLOB) AS bytes FROM threads').get()!.bytes as Uint8Array;
    const expected=Buffer.from(value,encoding==='UTF-8'?'utf8':'utf16le');if(encoding==='UTF-16be')expected.swap16();
    assert.equal(Buffer.from(raw).equals(expected),true); // Observed SQLite conversion, builder only.
  },r=>{
    assert.equal(r.status,'ready');assert.equal(r.summary?.claims,1);
    const t=r.snapshot!.take()!.threads[0]!;
    assert.equal(t.id,'opaque');assert.equal(t.cwd,'exact-cwd');assert.equal(t.titleState,long?'shortened':'complete');
    assert.ok(Buffer.byteLength(t.title!)<=4096);assert.ok(value.startsWith(t.title!));
    if(!long)assert.equal(t.title,value);
  },null,'unavailable');
});

for(const [name,bytes] of [
  ...[4093,4094,4095,4096,4097].map(n=>['invalid byte '+n,Buffer.concat([Buffer.alloc(n,0x61),Buffer.from([0xff]),Buffer.alloc(8,0x62)])] as const),
  ['overlong',Buffer.concat([Buffer.alloc(4095,0x61),Buffer.from([0xc0,0xaf]),Buffer.alloc(8,0x62)])],
  ['surrogate',Buffer.concat([Buffer.alloc(4094,0x61),Buffer.from([0xed,0xa0,0x80]),Buffer.alloc(8,0x62)])],
  ['invalid continuation',Buffer.concat([Buffer.alloc(4095,0x61),Buffer.from([0xe2,0x28,0xa1]),Buffer.alloc(8,0x62)])],
  ['truncated before boundary',Buffer.concat([Buffer.alloc(4095,0x61),Buffer.from([0xe2])])],
  ['truncated overflow byte',Buffer.concat([Buffer.alloc(4096,0x61),Buffer.from([0xf0])])]
] as const)test('malformed UTF-8 title boundary '+name+' is unavailable without dropping bytes',async()=>{
  await unit(db=>{
    db.exec('CREATE TABLE threads(id TEXT,cwd TEXT,title TEXT)');
    db.prepare("INSERT INTO threads VALUES('opaque','exact-cwd',CAST(? AS TEXT))").run(bytes);
  },r=>{
    assert.equal(r.status,'ready');assert.equal(r.summary?.unavailableTitles,1);assert.equal(r.summary?.shortenedTitles,0);
    const t=r.snapshot!.take()!.threads[0]!;assert.equal(t.title,null);assert.equal(t.titleState,'unavailable');
    assert.equal(t.id,'opaque');assert.equal(t.cwd,'exact-cwd');
  },null,'unavailable');
});

for(const character of ['é','€','😀'])test('valid UTF-8 crossing preview boundary '+character,async()=>{
  const value='a'.repeat(4095)+character+'tail';
  await unit(rows([['opaque','exact-cwd',value]]),r=>{
    const t=r.snapshot!.take()!.threads[0]!;assert.equal(t.title,'a'.repeat(4095));assert.equal(t.titleState,'shortened');
    assert.equal(r.summary?.unavailableTitles,0);
  },null,'unavailable');
});

for(const encoding of ['UTF-16le','UTF-16be'])test('qualified title encoding '+encoding+' excludes raw lookahead from display',async()=>{
  await unit(db=>{db.exec(`PRAGMA encoding='${encoding}'`);rows([['opaque','exact-cwd','a'.repeat(2047)+'😀tail']])(db);},r=>{
    const t=r.snapshot!.take()!.threads[0]!;assert.equal(t.title,'a'.repeat(2047));assert.equal(t.titleState,'shortened');
  },null,'unavailable');
});

const indexLine=(id:string,thread_name:unknown,updated_at:unknown='2026-10-09T12:00:00Z')=>JSON.stringify({id,thread_name,updated_at});
test('title index joins exact IDs, selects newest timestamps independent of line order and never creates Threads',async()=>{
  const index=[indexLine('a','Friendly atlas'),indexLine('a','Old atlas','2026-10-08T12:00:00Z'),indexLine('a','Friendly atlas'),indexLine('stale','Index-only record'),indexLine('A','Case distinct')].join('\n');
  for(const content of [index,index.split('\n').reverse().join('\n')])await unit(rows([['a','same','Initial prompt\n'.repeat(100)],['b','same','SQLite fallback']]),r=>{
    const d=r.snapshot!.take()!;assert.equal(d.threads.length,2);assert.equal(d.threads[0]!.title,'Friendly atlas');assert.equal(d.threads[0]!.titleSource,'session-index');
    assert.match(d.threads[0]!.storedTitle!,/Initial prompt/);assert.equal(d.threads[0]!.titleUpdatedAt,'2026-10-09T12:00:00Z');
    assert.equal(d.threads[1]!.title,'SQLite fallback');assert.equal(d.threads[1]!.titleResolution,'missing');
    assert.equal(d.coverage.sessionIndex!.duplicates,2);assert.equal(d.coverage.sessionIndex!.unmatchedIds,2);
    assert.equal(d.memberships[0],'no-assignment-observed');assert.equal(d.visibility[0],'unknown');
  },inventedProjects,'desktop-v1',content);
});
for(const [name,content,resolution] of [
  ['conflict',[indexLine('a','One'),indexLine('a','Two')].join('\n'),'conflict'],
  ['newer resolves older conflict',[indexLine('a','One','2026-10-08T00:00:00Z'),indexLine('a','Two','2026-10-08T00:00:00Z'),indexLine('a','Latest')].join('\n'),'latest'],
  ['invalid time',indexLine('a','Unknown order','nonsense'),'invalid'],
  ['empty latest',[indexLine('a','Old','2026-10-08T00:00:00Z'),indexLine('a','  ')].join('\n'),'missing'],
  ['oversized title',indexLine('a','x'.repeat(4097)),'invalid'],
  ['invalid unicode',indexLine('a','\ud800'),'invalid'],
  ['record bound','x'.repeat(65537),'limit'],
  ['row bound','\n'.repeat(10001),'limit'],
  ['empty index','','missing'],
] as const)test('title index fallback: '+name,async()=>{
  await unit(rows([['a','cwd','Fallback']]),r=>{const d=r.snapshot!.take()!,t=d.threads[0]!;assert.equal(t.titleResolution,resolution);
    assert.equal(t.title,resolution==='latest'?'Latest':'Fallback');assert.equal(t.cwd,'cwd');},inventedProjects,'desktop-v1',content);
});
test('malformed index lines remain visible as diagnostics without dropping unrelated valid enrichment',async()=>{
  await unit(rows([['a','cwd','Fallback']]),r=>{const d=r.snapshot!.take()!;assert.equal(d.threads[0]!.title,'Friendly');
    assert.equal(d.coverage.sessionIndex!.status,'partial');assert.equal(d.coverage.sessionIndex!.invalidRecords,2);},inventedProjects,'desktop-v1','{bad\n'+JSON.stringify({unrelated:true})+'\n'+indexLine('a','Friendly'));
});

test('index timestamps retain submillisecond ordering and reject impossible calendar dates',async()=>{
  await unit(rows([['a','cwd','Fallback'],['b','cwd','Fallback']]),r=>{
    const d=r.snapshot!.take()!;assert.equal(d.threads[0]!.title,'New');assert.equal(d.threads[1]!.titleResolution,'invalid');
  },inventedProjects,'desktop-v1',[indexLine('a','New','2026-10-09T12:00:00.000002Z'),indexLine('a','Old','2026-10-09T12:00:00.000001Z'),indexLine('b','Impossible','2026-02-30T12:00:00Z')].join('\n'));
});
test('resolved title is prominent and native-find-visible while raw prompt fallback never enters rendered surfaces',async()=>{
  const elements=new Map<string,Element>();const get=(id:string)=>{let e=elements.get(id);if(!e){e=new Element();elements.set(id,e);}return e;};
  const prompt='Initial prompt paragraph\n'.repeat(100);
  const d=reconcile(provenance,{...data().coverage,projects:'desktop-registry',correspondence:'qualified'},[
    {id:'a',cwd:'cwd',title:'Friendly atlas',storedTitle:prompt,titleSource:'session-index',titleResolution:'latest',titleUpdatedAt:'2026-10-09T12:00:00Z',sourceState:'ordinary',archived:false,ambiguous:false},
    {id:'b',cwd:'elsewhere',title:prompt,titleSource:'sqlite',titleResolution:'missing',sourceState:'ordinary',archived:false,ambiguous:false}],[],[],['a','b']);
  await runInNewContext(clientCode,{AbortController,document:{getElementById:get,createElement:()=>new Element(),createElementNS:()=>new Element()},location:{hash:'#synthetic',pathname:'/'},history:{replaceState(){}},addEventListener(){},fetch:async()=>({ok:true,json:async()=>d})});
  const all=(e:Element):Element[]=>[e,...e.children.flatMap(all)];
  const button=all(get('relationships')).find(e=>e.onclick&&e.children.some(c=>c.textContent==='Friendly atlas'))!;assert.ok(button);button.onclick!();
  assert.ok(get('details').children.some(e=>e.textContent==='Friendly atlas'));assert.equal(all(get('details')).some(e=>e.textContent==='session-index'),false);
  assert.equal(all(get('details')).some(e=>e.textContent.includes('Initial prompt')),false);
  assert.ok(all(get('relationships')).some(e=>e.textContent==='Thread b'));
  get('expand-threads').onclick!();assert.ok(all(get('relationships')).some(e=>e.textContent==='Friendly atlas'));assert.equal(all(get('relationships')).some(e=>e.textContent.startsWith('Initial prompt')),false);
  get('diagnostics').onclick!();assert.equal(JSON.stringify([...elements.values()]).includes('Initial prompt'),false);
  get('workspace').onclick!();assert.equal(JSON.stringify([...elements.values()]).includes('Initial prompt'),false);
});

for(const fault of ['writer','acquisition-change'] as const)test('protected final title-index member refuses '+fault,empirical,async()=>{
  const f=explorerFixture(undefined,true,undefined,indexLine('record-a','Friendly synthetic'));let writer:number|undefined,reached=false;
  try{
    const result=await runSyntheticExplorer(options(f,{explorer:{globalState:f.globalState,sessionIndex:f.sessionIndex},hook:(phase,scratch)=>{
      if(fault==='writer'&&phase==='prepared'){reached=true;writer=fs.openSync(f.sessionIndex,'r+');}
      if(fault==='acquisition-change'&&phase==='analyzed'){reached=true;fs.appendFileSync(scratch.path('acquisition',4),' ');}
    }}));
    assert.equal(reached,true);assert.equal(result.snapshot,undefined);assert.equal(result.safety!.status,'refused');assert.equal(result.safety!.cleanup,'removed');
    if(fault==='writer'){assert.equal(result.safety!.evidence.opened,4);assert.equal(result.safety!.evidence.phase,'open');}
    sanitized(result);
  }finally{if(writer!==undefined)fs.closeSync(writer);assert.equal(await f.teardown(),true);}
});

test('three observed title counterexamples use invented IDs and values without changing relationships',async()=>{
  const ids=['00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000013'];
  const linked='[$synthetic-skill](C:\\Synthetic\\skill\\SKILL.md) hatch creature';
  const registry={'local-projects':{p:{id:'p',name:'Synthetic studio',rootPaths:['cwd']}},'thread-project-assignments':Object.fromEntries(ids.map(id=>[id,{projectKind:'local',projectId:'p'}])),'projectless-thread-ids':[]};
  const index=[indexLine(ids[0]!,'Earlier studio','2026-01-02T12:00:00.1111111Z'),indexLine(ids[0]!,'Studio','2026-01-02T12:00:00.1111112Z'),indexLine(ids[2]!,'Earlier queue','2026-01-03T12:00:00.2222221Z'),indexLine(ids[2]!,'Queue','2026-01-03T12:00:00.2222222Z')].join('\n');
  await unit(db=>{db.exec('CREATE TABLE threads(id TEXT,cwd TEXT,title TEXT,source TEXT,archived INTEGER)');const insert=db.prepare("INSERT INTO threads VALUES(?,? ,?,'vscode',0)");
    ids.forEach((id,i)=>insert.run(id,'cwd',i===1?linked:'Synthetic initial prompt\n'.repeat(100)));},r=>{
      const d=r.snapshot!.take()!;assert.deepEqual(d.threads.map(t=>t.titleSource),['session-index','sqlite','session-index']);
      assert.deepEqual(d.threads.map(displayTitle),['Studio','$synthetic-skill hatch creature','Queue']);
      assert.equal(d.threads[1]!.titleResolution,'missing');assert.equal(d.threads[1]!.title,linked);
      assert.ok(d.memberships.every(m=>m==='stored-assignment'));assert.ok(d.visibility.every(v=>v==='inferred'));assert.equal(d.components.length,1);
    },registry,'desktop-v1',index);
});
test('fallback inline links display labels only without interpreting HTML or changing index names',()=>{
  assert.equal(displayTitle({title:'[Synthetic](javascript:bad) title',titleSource:'sqlite'}),'Synthetic title');
  assert.equal(displayTitle({title:'[Synthetic](x) title',titleSource:'session-index'}),'[Synthetic](x) title');
  assert.equal(displayTitle({title:'<script>synthetic</script>',titleSource:'sqlite'}),'<script>synthetic</script>');
  assert.equal(displayTitle({title:'[Incomplete](path(with)parens)',titleSource:'sqlite'}),'[Incomplete](path(with)parens)');
});
