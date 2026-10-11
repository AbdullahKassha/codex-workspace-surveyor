import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { request } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { ExplorerSnapshot, reconcile, locationKey, type ExplorerData } from '../src/explorer/model.js';
import { ExplorerSession, type RefreshResult, type SessionState } from '../src/explorer/session.js';
import { serveReusableExplorer } from '../src/explorer/server.js';
import { bookmarkSelection, restoreSelection } from '../src/explorer/selection.js';
import { reusableClientCode, reusableExplorerHtml, explorerCss, explorerHtml, snapshotUpdatedLabel } from '../src/explorer/view.js';
import { discoverRelationships, discoveryLimits } from '../src/explorer/discovery.js';
import { directoryFixture } from './support/discovery-fixture.js';
import { SessionBroker } from './support/session-broker.js';
import { explorerFixture } from './support/explorer-fixture.js';
import { runSyntheticExplorer, explorerPreflightSafety } from './support/personal-canary.js';
import { runReusableEntry } from './support/reusable-explorer-entry.js';
import { completeExplorerRefresh } from './support/personal-explorer-entry.js';

const scope='a'.repeat(64),token='b'.repeat(64),url='http://127.0.0.1:12345/#'+token;
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(yes=>{resolve=yes;});return {promise,resolve};}
const coverage={rowsRead:2,omittedRows:0,ambiguousIds:0,titles:'accepted' as const,projects:'desktop-registry' as const,correspondence:'qualified' as const,unconsumedColumns:false};
function data(reverse=false):ExplorerData{
  const threads=['one','two'].map(id=>({id,cwd:'C:\\Synthetic\\'+id,title:'Friendly '+id,titleSource:'session-index' as const,
    titleResolution:'latest' as const,titleState:'complete' as const,ambiguous:false,sourceState:'ordinary' as const,archived:false}));
  const projects=['alpha','beta'].map(id=>({id,label:'Project '+id,roots:['C:\\Synthetic\\'+id]}));
  return reconcile({namespace:randomBytes(8).toString('hex'),from:'2026-10-11T00:00:00Z',through:'2026-10-11T00:00:01Z'},coverage,
    reverse?threads.reverse():threads,reverse?projects.reverse():projects,[{threadId:'one',projectId:'alpha'},{threadId:'two',projectId:'beta'}]);
}
const snapshot=()=>new ExplorerSnapshot(data());

test('session starts empty without acquisition; reads and subscriptions never inspect',async()=>{
  let runs=0;const session=new ExplorerSession({scope,acquire:async()=>{runs++;return {snapshot:snapshot()};}});
  try{assert.equal(session.snapshot().data,null);session.state();const off=session.subscribe(()=>{});off();assert.equal(runs,0);
    assert.equal(session.refresh(),'accepted');assert.equal(session.refresh(),'busy');await session.settled();assert.equal(runs,1);
    assert.equal(session.state().revision,1);assert.equal(session.state().attempt?.outcome,'success');
  }finally{await session.close();}
});
for(const failure of ['closure','cleanup','discovery','acquisition','throw','cancel'] as const)test('refresh retains successful snapshot after '+failure,async()=>{
  let runs=0;const blocked=deferred<RefreshResult>();let discarded:ExplorerSnapshot|undefined;
  const session=new ExplorerSession({scope,acquire:async(signal,discovery)=>{
    if(++runs===1)return {snapshot:snapshot()};discovery();
    if(failure==='throw')throw new Error('SYNTHETIC_PRIVATE');
    if(failure==='cancel'){const result=await blocked.promise;assert.equal(signal.aborted,true);return result;}
    return {snapshot:discarded=snapshot(),failure};
  }});
  try{
    session.refresh();await session.settled();const previous=session.snapshot().data;
    session.refresh();await nextTurn();assert.equal(session.snapshot().data,previous);
    if(failure==='cancel'){session.cancel();assert.equal(session.state().phase,'cancelling');blocked.resolve({snapshot:discarded=snapshot(),failure:'cleanup'});}
    await session.settled();assert.equal(session.snapshot().data,previous);assert.equal(session.state().revision,1);
    assert.equal(session.state().attempt?.outcome,failure==='cancel'?'cancelled':'failure');assert.equal(discarded?.take(),undefined);
    if(failure==='cancel')assert.equal(session.state().attempt?.failure,'cleanup');
    assert.equal(JSON.stringify(session.state()).includes('SYNTHETIC_PRIVATE'),false);
  }finally{await session.close();}
});
test('close blocks new work and waits for acquisition cleanup before finishing',async()=>{
  const wait=deferred<RefreshResult>(),entered=deferred<AbortSignal>();
  const session=new ExplorerSession({scope,acquire:signal=>{entered.resolve(signal);return wait.promise;}});
  session.refresh();const signal=await entered.promise;let finished=false;const closing=session.close().then(()=>{finished=true;});
  assert.equal(signal.aborted,true);assert.equal(session.refresh(),'closed');assert.equal(session.snapshot().data,null);await nextTurn();assert.equal(finished,false);
  const cap=snapshot();wait.resolve({snapshot:cap});await closing;assert.equal(cap.take(),undefined);assert.equal(session.state().phase,'closed');
});
test('idle reads do not extend expiration; deliberate activity cannot extend absolute maximum',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});const session=new ExplorerSession({scope,idleMs:100,maximumMs:250,acquire:async()=>({snapshot:snapshot()})});
  t.mock.timers.tick(90);session.state();session.snapshot();session.touch();t.mock.timers.tick(90);session.touch();
  t.mock.timers.tick(70);await nextTurn();assert.equal(session.state().phase,'closed');
  const idle=new ExplorerSession({scope,idleMs:100,maximumMs:250,acquire:async()=>({snapshot:snapshot()})});
  t.mock.timers.tick(90);idle.state();idle.snapshot();t.mock.timers.tick(10);await nextTurn();assert.equal(idle.state().phase,'closed');
});

test('reusable HTTP authenticates commands, rejects paths/bodies and never acquires on reload/state/snapshot reads',async()=>{
  let runs=0;const wait=deferred<RefreshResult>(),late=deferred<RefreshResult>(),session=new ExplorerSession({scope,acquire:()=>++runs===1?wait.promise:late.promise});
  const server=await serveReusableExplorer(session),u=new URL(server.url),headers={'X-Surveyor-Session':u.hash.slice(1),Origin:u.origin};
  try{
    assert.equal((await fetch(u.origin+'/')).status,200);assert.equal((await fetch(u.origin+'/snapshot')).status,403);
    for(const path of ['/state','/snapshot','/','/client.js'])assert.equal((await fetch(u.origin+path,{headers})).status,200);
    assert.equal(runs,0);
    for(const extra of [{Origin:'https://example.invalid'},{Host:'localhost:'+u.port},{'X-Surveyor-Session':'c'.repeat(64)},{'Sec-Fetch-Site':'cross-site'}])
      assert.equal(await new Promise<number>((resolve,reject)=>{
        const req=request(u.origin+'/refresh',{method:'POST',headers:{...headers,...extra,'Content-Length':'0'}},res=>{res.resume();resolve(res.statusCode!);});
        req.on('error',reject);req.end();
      }),403);
    assert.equal((await fetch(u.origin+'/refresh',{method:'POST',headers,body:'C:\\Synthetic\\secret.sqlite'})).status,403);
    assert.equal((await fetch(u.origin+'/refresh?source=private',{method:'POST',headers})).status,404);
    assert.equal((await fetch(u.origin+'/refresh',{method:'POST',headers})).status,202);
    assert.equal((await fetch(u.origin+'/refresh',{method:'POST',headers})).status,409);assert.equal(runs,1);
    wait.resolve({snapshot:snapshot()});await session.settled();
    const response=await fetch(u.origin+'/snapshot',{headers});assert.equal(response.headers.get('cache-control'),'no-store');assert.equal((await response.json()).revision,1);
    await fetch(u.origin+'/');await fetch(u.origin+'/state',{headers});assert.equal(runs,1);
    await fetch(u.origin+'/refresh',{method:'POST',headers});
    assert.equal((await fetch(u.origin+'/close',{method:'POST',headers})).status,200);
    assert.equal((await fetch(u.origin+'/refresh',{method:'POST',headers})).status,410);
    assert.equal((await fetch(u.origin+'/snapshot',{headers})).status,410);assert.equal(runs,2);
    const candidate=snapshot();late.resolve({snapshot:candidate});await server.closed;assert.equal(candidate.take(),undefined);
  }finally{wait.resolve({});late.resolve({});await server.close();}
});
test('bounded authenticated event connections report changes and all close after session closure',async()=>{
  const session=new ExplorerSession({scope,acquire:async()=>({snapshot:snapshot()})}),server=await serveReusableExplorer(session),u=new URL(server.url);
  const headers={'X-Surveyor-Session':u.hash.slice(1),Origin:u.origin},abort=new AbortController();
  const readers:ReadableStreamDefaultReader<Uint8Array>[]=[];
  try{
    for(let i=0;i<8;i++){const response=await fetch(u.origin+'/events',{headers,signal:abort.signal});assert.equal(response.status,200);const reader=response.body!.getReader();readers.push(reader);assert.ok((await reader.read()).value);}
    assert.equal((await fetch(u.origin+'/events',{headers})).status,429);assert.equal(session.state().revision,0);
    session.refresh();await session.settled();const event=await readers[0]!.read();assert.ok(new TextDecoder().decode(event.value).includes('acquiring'));
    assert.equal((await fetch(u.origin+'/close',{method:'POST',headers})).status,200);await server.closed;assert.equal(session.snapshot().data,null);
    await assert.rejects(fetch(u.origin+'/snapshot',{headers}));
  }finally{abort.abort();await server.close();}
});

test('selection restoration uses source-qualified IDs, never array order, and clears duplicate/ambiguous identities',()=>{
  const original=data(),reordered=data(true);
  for(const kind of ['thread','project'] as const){const bookmark=bookmarkSelection(original,{kind,index:0});assert.ok(bookmark);
    assert.deepEqual(restoreSelection(reordered,bookmark),{kind,index:1});
    const duplicated={...reordered,[kind==='thread'?'threads':'projects']:kind==='thread'?[...reordered.threads,reordered.threads[1]!]:[...reordered.projects,reordered.projects[1]!]};
    assert.equal(restoreSelection(duplicated,bookmark),null);
  }
  assert.equal(restoreSelection({...reordered,threads:reordered.threads.map(t=>({...t,ambiguous:true}))},bookmarkSelection(original,{kind:'thread',index:0})),null);
});
test('folder selection requires path plus physical identity and clears replacements or missing identity',async()=>{
  const f=directoryFixture();try{
    const observed=await discoverRelationships(data(),{root:f.root,access:{metadataRoots:[f.root]},attributes:async()=>16});
    const bookmark=bookmarkSelection(observed,{kind:'location',path:f.root});assert.ok(bookmark);
    assert.deepEqual(restoreSelection(observed,bookmark),{kind:'location',path:f.root});
    const replaced={...observed,discovery:{...observed.discovery!,folders:observed.discovery!.folders.map(f=>({...f,identity:{device:'different',file:'replacement'}}))}};
    assert.equal(restoreSelection(replaced,bookmark),null);assert.equal(bookmarkSelection(data(),{kind:'location',path:f.root}),null);
  }finally{f.cleanup();}
});
test('scope blocks external declared/Git paths before any target metadata read while retaining copied evidence',async()=>{
  const f=directoryFixture();try{
    const external=f.mkdir(join(f.owner,'Outside Ω')),seen:string[]=[];
    fs.writeFileSync(join(f.root,'.git'),'gitdir: '+external+'\n');
    const declared=reconcile(data().provenance,coverage,[{...data().threads[0]!,cwd:external}],[],[],['one']);
    const observed=await discoverRelationships(declared,{root:f.root,access:{metadataRoots:[f.root]},attributes:async path=>{seen.push(path);return 16;}});
    assert.equal(observed.threads[0]!.cwd,external);assert.equal(seen.some(path=>locationKey(path)===locationKey(external)),false);
    assert.ok(observed.discovery!.diagnostics.some(n=>n.path===external&&n.reason==='outside-approved-scope'));
    assert.equal(observed.discovery!.folders.find(folder=>folder.path===external)?.state,'uninspected');
    await assert.rejects(discoverRelationships(data(),{root:f.root,access:{metadataRoots:[]}}));
  }finally{f.cleanup();}
});

class Element {
  children:Element[]=[];textContent='';className='';id='';hidden=false;disabled=false;open=false;focused=false;attributes:Record<string,string>={};onclick:(()=>unknown)|undefined;
  append(...children:Element[]){this.children.push(...children);}replaceChildren(...children:Element[]){this.children=children;}
  setAttribute(key:string,value:string){this.attributes[key]=value;}focus(){this.focused=true;}contains(target:unknown){return all(this).includes(target as Element);}get childElementCount(){return this.children.length;}
}
const all=(element:Element):Element[]=>[element,...element.children.flatMap(all)];
async function browser(store=new Map<string,string>(),hash='#'+token,realTimers=false){
  const elements=new Map<string,Element>(),events=new Map<string,(event:unknown)=>void>(),requests:string[]=[];
  let stream!:ReadableStreamDefaultController<Uint8Array>,current={revision:1,scope,data:data()},hold=false,failedClose=false;
  const delivery=deferred<typeof current>();
  const get=(id:string)=>{for(const root of elements.values()){const nested=all(root).find(e=>e.id===id);if(nested)return nested;}
    let e=elements.get(id);if(!e){e=new Element();e.id=id;elements.set(id,e);}return e;};
  const document={activeElement:null as Element|null,getElementById:get,createElement:()=>new Element(),createElementNS:()=>new Element()};
  const credentials:string[]=[];
  const context={AbortController,TextDecoder,Date,setInterval:realTimers?setInterval:()=>1,clearInterval:realTimers?clearInterval:()=>{},
    sessionStorage:{getItem:(key:string)=>store.get(key),setItem:(key:string,value:string)=>store.set(key,value),removeItem:(key:string)=>store.delete(key)},
    location:{hash,pathname:'/'},history:{replaceState(){}},document,
    addEventListener:(name:string,handler:(event:unknown)=>void)=>events.set(name,handler),
    fetch:async(path:string,options:{signal?:AbortSignal;headers?:Record<string,string>})=>{
      if(path==='/close'&&failedClose)throw new Error('Invented disconnected transport');
      requests.push(path);if(path==='/events'){credentials.push(options.headers?.['X-Surveyor-Session']??'');return {ok:true,body:new ReadableStream<Uint8Array>({start(controller){stream=controller;
        options.signal?.addEventListener('abort',()=>{try{controller.close();}catch{/* Already ended fault fixture. */}},{once:true});}})};}
      return {ok:true,status:200,json:async()=>path==='/snapshot'&&hold?delivery.promise:current};
    }};
  runInNewContext(reusableClientCode,context);await nextTurn();
  const state=(extra:Partial<SessionState>={})=>({version:1,revision:1,scope,phase:'idle',updatedAt:'2026-10-11T00:00:02Z',attempt:null,...extra});
  const push=async(value:object)=>{stream.enqueue(new TextEncoder().encode(JSON.stringify(value)+'\n'));await nextTurn();await nextTurn();};
  return {get,events,requests,credentials,store,state,push,loseEvents:async(kind:'error'|'eof')=>{if(kind==='error')stream.error(new Error('Invented stream loss'));else stream.close();await nextTurn();},replace:(revision:number,newData:ExplorerData,newScope=scope)=>{current={revision,scope:newScope,data:newData};},
    hold:()=>{hold=true;},release:()=>delivery.resolve(current),failClose:()=>{failedClose=true;},focus:(id:string)=>{document.activeElement=get(id);},stop:()=>events.get('pagehide')?.({})};
}

for(const kind of ['error','eof'] as const)test('event-stream '+kind+' stays disconnected through actual 30-second/repeated age ticks; authenticated reload reconnects without inspection',async t=>{
  const now=new Date(2026,9,11,15,0).getTime(),updatedAt=new Date(now-60000).toISOString();
  t.mock.timers.enable({apis:['setInterval','Date'],now});
  const ui=await browser(new Map(),'#'+token,true);
  try{
    const state=ui.state({updatedAt,attempt:{startedAt:updatedAt,finishedAt:updatedAt,outcome:'success',failure:null}});
    await ui.push(state);const before=ui.get('coverage').textContent;assert.match(before,/1 minute ago/);
    assert.equal(ui.get('refresh').disabled,false);assert.equal(ui.get('close').disabled,false);
    await ui.loseEvents(kind);const warning=ui.get('session-status').textContent;assert.match(warning,/Connection unavailable.*stale.*Reload/);
    for(const elapsed of [30000,30000,60000]){
      t.mock.timers.tick(elapsed);await nextTurn();
      assert.equal(ui.get('session-status').textContent,warning);assert.equal(ui.get('refresh').disabled,true);
      assert.equal(ui.get('cancel').disabled,true);assert.equal(ui.get('close').disabled,true);
      assert.ok(ui.get('relationships').children.length>0);assert.equal(ui.store.size,1);
    }
    assert.match(ui.get('coverage').textContent,/3 minutes ago/);
    ui.get('diagnostics').onclick!();assert.ok(all(ui.get('relationships')).some(e=>e.textContent===updatedAt));
    ui.get('workspace').onclick!();ui.get('refresh').onclick!();ui.get('cancel').onclick!();await ui.get('close').onclick!();
    ui.events.get('click')!({isTrusted:true,target:ui.get('workspace')});await nextTurn();
    assert.equal(ui.requests.filter(path=>path==='/events').length,1);
    assert.equal(ui.requests.some(path=>['/refresh','/cancel','/close','/activity'].includes(path)),false);
    ui.stop();const reload=await browser(ui.store,'',true);try{
      assert.deepEqual(reload.credentials,[token]);await reload.push(state);
      assert.equal(reload.get('session-status').textContent,'Ready.');assert.equal(reload.get('refresh').disabled,false);assert.equal(reload.get('close').disabled,false);
      assert.match(reload.get('coverage').textContent,/3 minutes ago/);assert.ok(reload.get('relationships').children.length>0);
      assert.equal(reload.requests.some(path=>['/refresh','/cancel','/close','/activity'].includes(path)),false);
    }finally{reload.stop();}
  }finally{ui.stop();}
});

test('reusable header separates navigation, Refresh and a native keyboard Session disclosure with bounded narrow layout',()=>{
  const header=reusableExplorerHtml.match(/<header[\s\S]*?<\/header>/)![0],nav=header.match(/<nav[\s\S]*?<\/nav>/)![0];
  assert.deepEqual([...nav.matchAll(/<button id="([^"]+)"/g)].map(m=>m[1]),['workspace','diagnostics']);
  assert.match(header,/<div class="header-actions"><button id="refresh">Refresh<\/button><details id="session-menu"/);
  assert.match(header,/<summary id="session-toggle">Session<\/summary>/);
  assert.match(header,/<button id="close" aria-describedby="session-close-note">Close session<\/button>/);
  assert.match(header,/Closing the session disconnects all connected tabs/);assert.doesNotMatch(header,/id="cancel"/);
  assert.match(reusableExplorerHtml,/<div class="refresh-status">[\s\S]*?<button id="cancel" hidden disabled>/);
  assert.match(explorerCss,/\.session-header\{display:grid;grid-template-columns:minmax\(0,1fr\) auto\}/);
  assert.match(explorerCss,/@media\(max-width:520px\)\{\.session-header\{grid-template-columns:minmax\(0,1fr\)/);
  assert.match(explorerCss,/\.header-navigation nav\{flex-wrap:wrap\}/);
  assert.match(explorerCss,/max-width:calc\(100vw - 36px\)/);assert.match(explorerCss,/\.session-menu summary:focus-visible/);
  assert.doesNotMatch(explorerHtml,/session-menu|id="refresh"/);
});

test('Cancel appears only during active acquisition/discovery and restores visible focus when hidden',async()=>{
  const ui=await browser();try{
    let version=0;for(const phase of ['idle','acquiring','discovery','cancelling','idle'] as const){
      if(phase==='cancelling')ui.focus('cancel');await ui.push(ui.state({version:++version,phase}));
      const active=phase==='acquiring'||phase==='discovery';assert.equal(ui.get('cancel').hidden,!active);assert.equal(ui.get('cancel').disabled,!active);
      assert.equal(ui.get('refresh').disabled,phase!=='idle');
    }
    assert.equal(ui.get('session-status').focused,true);await ui.push(ui.state({version:++version,phase:'closing'}));assert.equal(ui.get('cancel').hidden,true);
  }finally{ui.stop();}
});

test('Session menu Escape preserves entity context, outside clicks dismiss it, and Close uses existing authenticated closure',async()=>{
  const ui=await browser();try{
    await ui.push(ui.state());all(ui.get('relationships')).find(e=>e.onclick&&e.children.some(c=>c.textContent==='Friendly one'))!.onclick!();
    const menu=ui.get('session-menu');menu.open=true;let prevented=false;
    ui.events.get('keydown')!({key:'Escape',preventDefault:()=>{prevented=true;}});
    assert.equal(menu.open,false);assert.equal(prevented,true);assert.equal(ui.get('session-toggle').focused,true);assert.equal(ui.get('details').hidden,false);
    menu.open=true;ui.events.get('click')!({target:ui.get('workspace')});assert.equal(menu.open,false);assert.equal(ui.requests.includes('/close'),false);
    menu.open=true;menu.append(ui.get('close'));ui.events.get('click')!({target:ui.get('close')});assert.equal(menu.open,true);
    await ui.get('close').onclick!();assert.equal(ui.requests.filter(path=>path==='/close').length,1);assert.equal(menu.open,false);
    assert.equal(ui.get('close').disabled,true);assert.equal(ui.store.size,0);assert.equal(ui.get('relationships').children.length,0);assert.equal(ui.get('session-status').focused,true);
  }finally{ui.stop();}
});

test('snapshot update label uses local calendar/locale with useful age and truthful invalid/future fallback',()=>{
  const updated=new Date(2026,9,11,15,38),iso=updated.toISOString(),now=updated.getTime()+120000;
  assert.equal(snapshotUpdatedLabel(iso,now,'en-GB'),'Last updated today at 15:38 · 2 minutes ago');
  assert.match(snapshotUpdatedLabel(iso,now,'de-DE'),/15:38 · vor 2 Minuten$/);
  assert.match(snapshotUpdatedLabel(iso,updated.getTime()+1000,'en-GB'),/just now$/);
  assert.match(snapshotUpdatedLabel(iso,updated.getTime()+7200000,'en-GB'),/2 hours ago$/);
  assert.match(snapshotUpdatedLabel(iso,updated.getTime()+172800000,'en-GB'),/2 days ago$/);
  const midnight=snapshotUpdatedLabel(new Date(2026,9,11,23,59).toISOString(),new Date(2026,9,12,0,1).getTime(),'en-GB');
  assert.doesNotMatch(midnight,/today/);assert.match(midnight,/2 minutes ago$/);
  assert.equal(snapshotUpdatedLabel(null,now),'Last updated time unavailable');assert.equal(snapshotUpdatedLabel('invented invalid',now),'Last updated time unavailable');
  assert.match(snapshotUpdatedLabel(iso,updated.getTime()-1),/future.*clock/);
});

test('compact update time stays tied to displayed revision; exact UTC evidence remains in Diagnostics during pending/failed refresh',async()=>{
  const ui=await browser();try{
    const first='2026-10-11T00:00:02Z',second='2026-10-11T00:05:02Z';
    const original={...data(),discovery:{root:'C:\\Synthetic',from:'2026-10-11T00:00:01Z',through:first,folders:[],git:[],relations:[],diagnostics:[],status:'complete' as const,operations:0,entries:0,limits:discoveryLimits}};
    const untouched=JSON.stringify(original),success={startedAt:first,finishedAt:first,outcome:'success' as const,failure:null};
    ui.replace(1,original);await ui.push(ui.state({attempt:success}));const label=ui.get('coverage').textContent;
    assert.match(label,/^Last updated /);assert.doesNotMatch(label,/2026-10-11T|Acquisition|folder observation/);
    ui.get('diagnostics').onclick!();const evidence=all(ui.get('relationships')).map(e=>e.textContent);
    assert.ok(evidence.includes(first));assert.ok(evidence.includes(original.provenance.from+' → '+original.provenance.through));
    assert.ok(evidence.includes(original.discovery.from+' → '+original.discovery.through));
    ui.get('workspace').onclick!();ui.hold();ui.replace(2,data(true));
    await ui.push(ui.state({version:2,revision:2,updatedAt:second,attempt:success}));
    assert.equal(ui.get('coverage').textContent,label);assert.match(ui.get('session-status').textContent,/previous successful snapshot/);
    ui.get('diagnostics').onclick!();assert.ok(all(ui.get('relationships')).some(e=>e.textContent===first));
    ui.release();await nextTurn();assert.notEqual(ui.get('coverage').textContent,label);assert.ok(all(ui.get('relationships')).some(e=>e.textContent===second));
    const newer=ui.get('coverage').textContent;await ui.push(ui.state({version:3,revision:2,updatedAt:second,attempt:{...success,outcome:'failure',failure:'closure'}}));
    assert.equal(ui.get('coverage').textContent,newer);assert.match(ui.get('session-status').textContent,/previous successful snapshot/);
    assert.equal(JSON.stringify(original),untouched);
  }finally{ui.stop();}
});
test('reusable browser reload retains only its credential, never inspects, and page exit does not close session',async()=>{
  const first=await browser();try{
    await first.push(first.state());assert.ok(all(first.get('relationships')).some(e=>e.textContent==='Friendly one'));
    assert.equal(first.store.size,1);assert.equal(first.store.get('workspace-surveyor-session'),token);
    first.stop();assert.equal(first.requests.includes('/close'),false);assert.equal(first.requests.includes('/refresh'),false);
    const reload=await browser(first.store,'');try{await reload.push(reload.state());assert.equal(reload.requests.includes('/refresh'),false);assert.equal(reload.get('relationships').children.length>0,true);}
    finally{reload.stop();}
  }finally{first.stop();}
});

test('browser clears source-changed/internal context and ignores snapshot delivery after closure',async()=>{
  const ui=await browser();try{
    await ui.push(ui.state());all(ui.get('relationships')).find(e=>e.onclick&&e.children.some(c=>c.textContent==='Friendly one'))!.onclick!();
    ui.replace(2,data(true),'d'.repeat(64));await ui.push(ui.state({version:2,revision:2,scope:'d'.repeat(64)}));
    assert.equal(ui.get('details').hidden,true);
    all(ui.get('relationships')).find(e=>e.onclick&&e.children.some(c=>c.textContent==='Friendly one'))!.onclick!();
    const original=data(),hidden=reconcile(original.provenance,original.coverage,
      original.threads.map(t=>t.id==='one'?{...t,sourceState:'subagent'}:t),original.projects,original.assignments);
    ui.replace(3,hidden,'d'.repeat(64));await ui.push(ui.state({version:3,revision:3,scope:'d'.repeat(64)}));
    assert.equal(ui.get('details').hidden,true);assert.equal(all(ui.get('relationships')).some(e=>e.textContent==='Friendly one'),false);
    ui.hold();ui.replace(4,data());await ui.push(ui.state({version:4,revision:4}));
    await ui.push(ui.state({version:5,revision:5,phase:'closed'}));ui.release();await nextTurn();
    assert.equal(ui.get('relationships').children.length,0);assert.equal(ui.store.size,0);
  }finally{ui.stop();}
});
test('failed browser Close request retains credentials and reports uncertainty rather than claiming closure',async()=>{
  const ui=await browser();try{
    await ui.push(ui.state());ui.failClose();await ui.get('close').onclick!();
    assert.equal(ui.store.size,1);assert.ok(ui.get('relationships').children.length>0);assert.match(ui.get('session-status').textContent,/Connection unavailable/);
  }finally{ui.stop();}
});
test('publication gate refuses unstable sources, uncertain disposal or cleanup and cancellation',async()=>{
  const passed={...explorerPreflightSafety,status:'passed' as const,sourcesStable:true,evidence:{...explorerPreflightSafety.evidence,exitConfirmed:true}};
  for(const safety of [{...passed,sourcesStable:false},{...passed,evidence:{...passed.evidence,exitConfirmed:false}},
    {...passed,cleanup:'residual' as const},{...passed,recovery:'available' as const}]){
    const candidate=snapshot(),result=await completeExplorerRefresh({safety,snapshot:candidate},{executable:''},new AbortController().signal);
    assert.equal(result.snapshot,undefined);assert.ok(result.failure);assert.equal(candidate.take(),undefined);
  }
  const abort=new AbortController();abort.abort();const candidate=snapshot();
  const result=await completeExplorerRefresh({safety:passed,snapshot:candidate},{executable:''},abort.signal,()=>assert.fail('No cancelled discovery'));
  assert.equal(result.snapshot,undefined);assert.equal(candidate.take(),undefined);
  const residual=snapshot(),cancelled=await completeExplorerRefresh({safety:{...passed,cleanup:'residual'},snapshot:residual},{executable:''},abort.signal);
  assert.equal(cancelled.failure,'cleanup');assert.equal(residual.take(),undefined);
});
test('browser preserves selected Thread over reordering, retains failed-refresh view, and clears credentials/data on close',async()=>{
  const ui=await browser();try{
    await ui.push(ui.state());const row=all(ui.get('relationships')).find(e=>e.onclick&&e.children.some(c=>c.textContent==='Friendly one'));assert.ok(row);row.onclick!();
    assert.ok(all(ui.get('details')).some(e=>e.textContent==='Friendly one'));
    ui.replace(2,data(true));await ui.push(ui.state({version:2,revision:2}));assert.ok(all(ui.get('details')).some(e=>e.textContent==='Friendly one'));
    await ui.push(ui.state({version:3,revision:2,attempt:{startedAt:'now',finishedAt:'now',outcome:'failure',failure:'closure'}}));
    assert.match(ui.get('session-status').textContent,/Close Codex.*previous successful/);assert.ok(all(ui.get('details')).some(e=>e.textContent==='Friendly one'));
    await ui.push(ui.state({version:4,revision:2,attempt:{startedAt:'now',finishedAt:'now',outcome:'cancelled',failure:'cleanup'}}));
    assert.match(ui.get('session-status').textContent,/Cleanup or recovery was not confirmed.*previous successful/);
    assert.doesNotMatch(ui.get('session-status').textContent,/after cleanup/);
    await ui.push(ui.state({version:5,phase:'closing'}));assert.equal(ui.store.size,0);assert.equal(ui.get('relationships').children.length,0);
    await ui.push(ui.state({version:6,phase:'closed',attempt:{startedAt:'now',finishedAt:'now',outcome:'cancelled',failure:'cleanup'}}));
    assert.match(ui.get('session-status').textContent,/Session closed\. Cleanup or recovery was not confirmed/);
  }finally{ui.stop();}
});

const empirical={skip:process.platform!=='win32'||process.env.WORKSPACE_SURVEYOR_RUN_CANARY_PREPARATION!=='1'||process.env.WORKSPACE_SURVEYOR_RUN_EXPLORER_PREPARATION!=='1'};
const executable=()=>process.env.WORKSPACE_SURVEYOR_HELPER_PWSH??'';
test('Windows broker reconnects once, refuses changed scope, and releases its lifetime on parent shutdown',empirical,async()=>{
  const channel=randomBytes(32).toString('hex');let requests=0,lost=0;
  const owner=await SessionBroker.start(executable(),scope,()=>{requests++;},()=>{lost++;},channel);assert.equal(owner.kind,'owner');if(owner.kind!=='owner')return;
  try{
    await owner.broker.ready(url);
    const attached=await SessionBroker.start(executable(),scope,()=>assert.fail('second owner'),()=>{},channel);assert.deepEqual(attached,{kind:'attached',url});assert.equal(requests,1);
    await assert.rejects(SessionBroker.start(executable(),'c'.repeat(64),()=>{},()=>{},channel));assert.equal(requests,1);
    const another=await SessionBroker.start(executable(),scope,()=>{},()=>{},channel);assert.equal(another.kind,'attached');assert.equal(requests,2);
  }finally{await owner.broker.stop();}
  assert.equal(lost,0);const restarted=await SessionBroker.start(executable(),scope,()=>{},()=>{},channel);assert.equal(restarted.kind,'owner');if(restarted.kind==='owner')await restarted.broker.stop();
});
test('simultaneous Windows startup elects one owner; peer waits for readiness without another host',empirical,async()=>{
  const channel=randomBytes(32).toString('hex');const owners:SessionBroker[]=[];
  const start=async()=>{const result=await SessionBroker.start(executable(),scope,()=>{},()=>{},channel);
    if(result.kind==='owner'){owners.push(result.broker);await result.broker.ready(url);}return result.kind;};
  try{assert.deepEqual((await Promise.all([start(),start()])).sort(),['attached','owner']);assert.equal(owners.length,1);}
  finally{await Promise.all(owners.map(owner=>owner.stop()));}
});

test('malformed, incompatible and mid-reply Windows clients cannot release ownership; invalid versions obtain no credentials',empirical,async()=>{
  const channel=randomBytes(32).toString('hex');let relaunches=0;
  const owner=await SessionBroker.start(executable(),scope,()=>{relaunches++;},()=>assert.fail('Owner lost'),channel);
  assert.equal(owner.kind,'owner');if(owner.kind!=='owner')return;
  const command=`$ErrorActionPreference='Stop'
$request=[Console]::ReadLine()|ConvertFrom-Json
$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
$hash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($sid))).ToLowerInvariant()
$pipe=[IO.Pipes.NamedPipeClientStream]::new('.','WorkspaceSurveyor.Session.v1.'+$hash+'.'+$request.channel,[IO.Pipes.PipeDirection]::InOut,([IO.Pipes.PipeOptions]::Asynchronous -bor [IO.Pipes.PipeOptions]::CurrentUserOnly))
$cancel=[Threading.CancellationTokenSource]::new(5000)
try{
 $pipe.Connect(5000)
 $body=[Text.Encoding]::UTF8.GetBytes((@{version=$request.value;scope=('a'*64)}|ConvertTo-Json -Compress))
 $length=if($request.large){2048}else{$body.Length}
 $prefix=[BitConverter]::GetBytes([int]$length)
 $null=$pipe.WriteAsync($prefix,0,4,$cancel.Token).GetAwaiter().GetResult()
 if(-not $request.large){$null=$pipe.WriteAsync($body,0,$body.Length,$cancel.Token).GetAwaiter().GetResult()}
 $buffer=[byte[]]::new(1024)
 $count=$pipe.ReadAsync($buffer,0,1024,$cancel.Token).GetAwaiter().GetResult()
 if([Text.Encoding]::UTF8.GetString($buffer,0,$count).Contains('http')){exit 2}
 [Console]::WriteLine('bounded-refusal')
}finally{$pipe.Dispose();$cancel.Dispose()}`;
  try{
    await owner.broker.ready(url);
    for(const peer of [{large:true,value:99},{large:false,value:99},{large:false,value:'1'},{large:false,value:true}]){
      const child=spawn(executable(),['-NoLogo','-NoProfile','-NonInteractive','-Command',command],{windowsHide:true,stdio:['pipe','pipe','ignore']});
      let output='';child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{output+=chunk;});
      const exited=once(child,'close');child.stdin.end(JSON.stringify({channel,...peer})+'\n');
      assert.equal((await exited)[0],0);assert.equal(output.trim(),'bounded-refusal');
    }
    assert.equal(relaunches,0);
    const partial=spawn(executable(),['-NoLogo','-NoProfile','-NonInteractive','-Command',command],{windowsHide:true,stdio:['pipe','pipe','ignore']});
    partial.stdout.resume();const partialExited=once(partial,'close');partial.stdin.end(JSON.stringify({channel,large:false,value:1})+'\n');
    assert.equal((await partialExited)[0],0);assert.equal(relaunches,1);
    assert.equal((await SessionBroker.start(executable(),scope,()=>{},()=>{},channel)).kind,'attached');assert.equal(relaunches,2);
  }finally{await owner.broker.stop();}
});
test('owned host crash releases its session-child pipe without locator files or stale-lock removal',empirical,async()=>{
  const channel=randomBytes(32).toString('hex');
  const command=`import {SessionBroker} from ${JSON.stringify(new URL('./support/session-broker.js',import.meta.url).href)};
import {createInterface} from 'node:readline';
const lines=createInterface({input:process.stdin});let initialized=false;
for await(const line of lines){if(initialized)process.exit(17);
const c=JSON.parse(line);const owner=await SessionBroker.start(c.executable,c.scope,()=>{},()=>{},c.channel);
if(owner.kind!=='owner')process.exit(18);await owner.broker.ready(c.url);initialized=true;process.stdout.write('ready\\n');}`;
  const child=spawn(process.execPath,['--input-type=module','-e',command],{windowsHide:true,stdio:['pipe','pipe','ignore']});
  const ready=deferred<void>(),exited=once(child,'close');child.stdout.once('data',()=>ready.resolve());
  child.stdin.write(JSON.stringify({channel,scope,url,executable:executable()})+'\n');
  try{
    await Promise.race([ready.promise,exited.then(()=>{throw new Error('Owned crash fixture did not initialize');})]);
    child.stdin.write('exit-owned-host\n');assert.equal((await exited)[0],17);
    // Parent EOF must independently reach the helper before this single probe.
    await new Promise(resolve=>setTimeout(resolve,1000));
    const restarted=await SessionBroker.start(executable(),scope,()=>{},()=>{},channel);
    assert.equal(restarted.kind,'owner');if(restarted.kind==='owner')await restarted.broker.stop();
  }finally{child.stdin.end();await exited;}
});

async function waitFor(predicate:()=>Promise<boolean>){for(let i=0;i<2000;i++){if(await predicate())return;await new Promise(resolve=>setTimeout(resolve,25));}assert.fail('Disposable session did not reach expected state');}
test('reusable session launches empty then uses real protected refreshes; relaunch while busy never queues and failed refresh retains prior data',empirical,async()=>{
  const f=explorerFixture(),channel=randomBytes(32).toString('hex'),opened=deferred<string>(),held=deferred<void>(),release=deferred<void>();
  let runs=0,hold=false,closure:'present'|'absent'='absent';const output:string[]=[];
  const host=runReusableEntry({scope,channel,executable:executable(),write:text=>output.push(text),openBrowser:async url=>{
    const u=new URL(url),response=await fetch(u.origin+'/snapshot',{headers:{'X-Surveyor-Session':u.hash.slice(1)}});assert.equal((await response.json()).data,null);
    assert.equal(runs,0);opened.resolve(url);return true;},acquire:async(signal,discovery)=>{
      runs++;const result=await runSyntheticExplorer({executable:executable(),analysis:'explorer',explorer:{globalState:f.globalState},selection:f.selection,closure:()=>closure,
        hook:async(phase,scratch)=>{if(phase==='initialized')f.scratches.push(scratch);if(hold&&phase==='held'){held.resolve();await release.promise;}}});
      assert.ok(result.safety);return completeExplorerRefresh({...result,safety:result.safety},
        {executable:executable(),discoveryRoot:f.run.sources},signal,discovery,true);
    }});
  let base='',headers:Record<string,string>={};
  try{
    const u=new URL(await Promise.race([opened.promise,host.then(()=>{throw new Error('Disposable host ended before delivery');})]));base=u.origin;headers={'X-Surveyor-Session':u.hash.slice(1),Origin:base};
    const state=async()=>await (await fetch(base+'/state',{headers})).json() as SessionState;
    await waitFor(async()=> (await state()).attempt?.outcome==='success');assert.equal(runs,1);
    const previous=await (await fetch(base+'/snapshot',{headers})).json();assert.equal(previous.revision,1);
    hold=true;await fetch(base+'/refresh',{method:'POST',headers});await held.promise;
    const relaunch=await runReusableEntry({scope,channel,executable:executable(),write:text=>output.push(text),openBrowser:async attached=>{assert.equal(attached,u.href);return true;},acquire:async()=>assert.fail('Relaunch cannot create another inspector')});
    assert.equal(relaunch,0);assert.equal(runs,2);assert.equal((await (await fetch(base+'/snapshot',{headers})).json()).revision,1);
    const competing=await runSyntheticExplorer({executable:executable(),analysis:'explorer',explorer:{globalState:f.globalState},selection:f.selection,closure:()=> 'absent'});
    assert.equal(competing.safety?.status,'refused');assert.equal(competing.snapshot,undefined);
    await fetch(base+'/cancel',{method:'POST',headers});release.resolve();hold=false;
    await waitFor(async()=> (await state()).attempt?.outcome==='cancelled');assert.equal((await state()).revision,1);
    closure='present';await fetch(base+'/refresh',{method:'POST',headers});await waitFor(async()=> (await state()).attempt?.outcome==='failure');assert.equal((await state()).revision,1);
    closure='absent';await fetch(base+'/refresh',{method:'POST',headers});await waitFor(async()=> (await state()).revision===2);
    assert.ok(f.scratches.every(s=>!fs.existsSync(s.root!)));assert.equal(fs.existsSync(join(f.run.root,'recovery')),false);
    await fetch(base+'/close',{method:'POST',headers});assert.equal(await host,0);assert.equal(output.some(line=>line.includes('/#')),false);
  }finally{
    release.resolve();if(base)try{await fetch(base+'/close',{method:'POST',headers});}catch{}
    await host;assert.equal(await f.teardown(),true);
  }
});
