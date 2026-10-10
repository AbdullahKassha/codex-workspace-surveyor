import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { reconcile, type ExplorerData, type ThreadClaim, type ProjectClaim, type AssignmentClaim } from '../src/explorer/model.js';
import { friendlyTitle, workspacePresentation, folderStatus, locationPlacement, discoveryNotice } from '../src/explorer/presentation.js';
import { clientCode, explorerHtml, explorerCss } from '../src/explorer/view.js';

const provenance={namespace:'synthetic-ui',from:'2026-10-10T00:00:00Z',through:'2026-10-10T00:00:01Z'};
const coverage={rowsRead:0,omittedRows:0,ambiguousIds:0,titles:'accepted' as const,projects:'desktop-registry' as const,correspondence:'qualified' as const,unconsumedColumns:false};
const id=(n:number)=>'00000000-0000-0000-0000-'+n.toString().padStart(12,'0');
const thread=(n:number,extra:Partial<ThreadClaim>={}):ThreadClaim=>({id:id(n),cwd:'C:\\Synthetic\\atlas',title:'Thread name '+n,
  titleSource:'session-index',titleResolution:'latest',titleState:'complete',ambiguous:false,sourceState:'ordinary',archived:false,...extra});
const model=(threads:ThreadClaim[]=[],projects:ProjectClaim[]=[],assignments:AssignmentClaim[]=[],free:string[]=[])=>reconcile(provenance,coverage,threads,projects,assignments,free);

class Element {
  children:Element[]=[];attributes:Record<string,string>={};textContent='';className='';id='';hidden=false;focused=0;
  onclick:(()=>unknown)|undefined;oninput:((event:{target:{value:string}})=>void)|undefined;
  constructor(readonly tag=''){}
  append(...children:Element[]){this.children.push(...children);}replaceChildren(...children:Element[]){this.children=children;}
  setAttribute(name:string,value:string){this.attributes[name]=value;if(name==='class')this.className=value;}
  focus(){this.focused++;}get childElementCount(){return this.children.length;}
}
const all=(e:Element):Element[]=>[e,...e.children.flatMap(all)];
const texts=(e:Element)=>all(e).map(e=>e.textContent);
const action=(e:Element,label:string)=>all(e).find(e=>e.onclick&&(e.textContent===label||e.children.some(c=>c.textContent===label)))!;
async function browser(data:ExplorerData,clipboard?:{writeText:(value:string)=>Promise<void>}){
  const elements=new Map<string,Element>(),events=new Map<string,(e:{key:string})=>void>();
  const get=(name:string)=>{
    for(const e of elements.values()){const match=all(e).find(n=>n.id===name);if(match)return match;}
    let e=elements.get(name);if(!e){e=new Element();e.id=name;elements.set(name,e);}return e;
  };
  await runInNewContext(clientCode,{AbortController,navigator:{clipboard},document:{getElementById:get,createElement:(tag:string)=>new Element(tag),createElementNS:(_ns:string,tag:string)=>new Element(tag)},
    location:{hash:'#synthetic',pathname:'/'},history:{replaceState(){}},addEventListener:(name:string,callback:(e:{key:string})=>void)=>events.set(name,callback),fetch:async()=>({ok:true,json:async()=>data})});
  return {get,events,elements,groups:()=>get('relationships').children.filter(e=>e.className==='component')};
}

test('qualified friendly titles preserve missing-index skill labels and index precedence; raw prompt fallback is generic',()=>{
  const skill=thread(1,{title:'[$skill-installer](C:\\Synthetic\\skill\\SKILL.md) hatch pet',titleSource:'sqlite',titleResolution:'missing'});
  assert.deepEqual(friendlyTitle(skill),{label:'$skill-installer hatch pet',qualification:'skill-link'});
  assert.deepEqual(friendlyTitle({...skill,title:'Newest friendly name',storedTitle:skill.title,titleSource:'session-index',titleResolution:'latest'}),{label:'Newest friendly name',qualification:'session-index'});
  assert.deepEqual(friendlyTitle(thread(2,{title:'Initial prompt paragraph\n'.repeat(100),titleSource:'sqlite',titleResolution:'missing'})),{label:'Thread 00000000',qualification:'unavailable'});
  assert.equal(friendlyTitle(thread(3,{title:'😀'.repeat(121)})).label,'😀'.repeat(119)+'…');
  assert.equal([...friendlyTitle(thread(3,{title:'😀'.repeat(121)})).label].length,120);
  assert.equal(friendlyTitle(thread(3,{title:'😀'.repeat(120)})).label,'😀'.repeat(120));
});

test('unqualified, malformed, shortened and unsafe skill fallbacks stay generic',()=>{
  const base=thread(1,{titleSource:'sqlite',titleResolution:'missing'});
  for(const title of ['Ordinary short SQLite text','[Skill](synthetic) hatch pet','[$skill](synthetic(unclosed) hatch pet',
    '[$skill](synthetic) first\nsecond','[$skill](synthetic) '+ 'x'.repeat(121),'[$skill](synthetic) \u202epet',
    '[$skill](synthetic) <script>pet</script>','[$skill](synthetic) [Unresolved](bad(with)parentheses)',
    '[$skill](synthetic) \u0000pet','[$skill](synthetic) \ud800pet'])assert.equal(friendlyTitle({...base,title}).qualification,'unavailable');
  for(const titleState of ['shortened','unavailable'] as const)assert.equal(friendlyTitle({...base,title:'[$skill](synthetic) hatch pet',titleState}).qualification,'unavailable');
  assert.equal(friendlyTitle({...base,title:'[$skill](javascript:never-follow) hatch pet'}).label,'$skill hatch pet'); // Destination remains inert text formatting only.
});

test('skill title is consistent in Workspace, Details and accessibility; native find surfaces contain no prompt/link destinations',async()=>{
  const marker='PRIVATE_INITIAL_PROMPT_CANARY',destination='SYNTHETIC_LINK_DESTINATION_CANARY',skill=thread(1,{title:'[$skill-installer]('+destination+') hatch pet',titleSource:'sqlite',titleResolution:'missing'}),
    prompt=thread(2,{cwd:'C:\\Synthetic\\other',title:marker+'\n'+ 'x'.repeat(1000),titleSource:'sqlite',titleResolution:'missing'});
  const ui=await browser(model([skill,prompt],[],[],[skill.id,prompt.id]));
  const row=action(ui.get('relationships'),'$skill-installer hatch pet');assert.ok(row);assert.equal(row.attributes['aria-label'],'thread $skill-installer hatch pet');row.onclick!();
  assert.ok(texts(ui.get('details')).includes('$skill-installer hatch pet'));assert.equal(ui.get('details').hidden,false);
  ui.get('expand-threads').onclick!();assert.ok(texts(ui.get('relationships')).includes('$skill-installer hatch pet'));
  ui.get('diagnostics').onclick!();assert.ok(texts(ui.get('relationships')).includes('skill-link'));
  assert.equal(JSON.stringify([...ui.elements.values()]).includes(marker),false);assert.equal(JSON.stringify([...ui.elements.values()]).includes(destination),false);
  ui.get('workspace').onclick!();assert.equal(JSON.stringify([...ui.elements.values()]).includes(marker),false);
});

test('location projection deduplicates qualified aliases and preserves Project nesting versus projectless relationships',async()=>{
  const paths=['C:\\Synthetic\\atlas','\\\\?\\C:\\SYNTHETIC\\ATLAS'],projects=[{id:'p',label:'Atlas',roots:paths}],
    assigned=thread(1),free=thread(2,{cwd:paths[1]!}),base=model([assigned,free],projects,[{threadId:assigned.id,projectId:'p',projectKind:'local'}],[free.id]),before=JSON.stringify(base),groups=workspacePresentation(base);
  assert.equal(groups.length,1);assert.equal(groups[0]!.locations.length,1);assert.deepEqual(groups[0]!.locations[0]!.projects,[0]);assert.deepEqual(groups[0]!.locations[0]!.threads,[0,1]);assert.equal(JSON.stringify(base),before);
  const ui=await browser(base),nodes=all(ui.groups()[0]!);assert.equal(nodes.filter(e=>e.className==='location-row').length,1);
  const members=nodes.find(e=>e.className==='member-list')!;assert.ok(texts(members).includes('Thread name 1'));assert.equal(texts(members).includes('Thread name 2'),false);assert.ok(texts(ui.groups()[0]!).includes('Projectless'));
  action(ui.get('relationships'),'Thread name 2').onclick!();assert.ok(texts(ui.get('details')).includes('Projectless'));assert.equal(texts(ui.get('details')).includes('Atlas →'),false);
});

test('global and local expansion expose all ordinary Threads for native find and preserve group numbering',async()=>{
  const threads=Array.from({length:8},(_,i)=>thread(i+1)),p={id:'p',label:'Atlas',roots:['C:\\Synthetic\\atlas']},empty={id:'empty',label:'Empty',roots:[]};
  const ui=await browser(model(threads,[p,empty],threads.map(t=>({threadId:t.id,projectId:'p',projectKind:'local'}))));
  assert.equal(all(ui.groups()[0]!).filter(e=>e.className==='thread-row').length,5);assert.ok(texts(ui.groups()[1]!).includes('No current Threads'));
  action(ui.get('relationships'),'Show 3 more Threads').onclick!();assert.equal(all(ui.groups()[0]!).filter(e=>e.className==='thread-row').length,8);
  action(ui.get('relationships'),'Show fewer Threads').onclick!();assert.equal(all(ui.groups()[0]!).filter(e=>e.className==='thread-row').length,5);
  action(ui.get('relationships'),'Show 3 more Threads').onclick!();ui.get('expand-threads').onclick!();assert.equal(ui.get('expand-threads').textContent,'Collapse all Threads');
  assert.equal(all(ui.groups()[0]!).filter(e=>e.className==='thread-row').length,8);assert.ok(action(ui.get('relationships'),'Thread name 8'));assert.equal(all(ui.groups()[0]!).some(e=>e.hidden),false);
  assert.equal(ui.groups()[0]!.children[0]!.textContent,'Workspace group 1');assert.equal(ui.groups()[1]!.children[0]!.textContent,'Workspace group 2');
  ui.get('expand-threads').onclick!();assert.equal(all(ui.groups()[0]!).filter(e=>e.className==='thread-row').length,5);action(ui.get('relationships'),'Show 3 more Threads').onclick!();assert.equal(all(ui.groups()[0]!).filter(e=>e.className==='thread-row').length,8);
  assert.equal(explorerHtml.includes('id="search"'),false);assert.equal(clientCode.includes('oninput'),false);
});

test('unresolved ordinary records get review rows without component connections; historical records are Diagnostics only',async()=>{
  const unresolved=thread(1),conflict=thread(2),internal=thread(3,{sourceState:'subagent'}),archived=thread(4,{archived:true}),p={id:'p',label:'Atlas',roots:['C:\\Synthetic\\atlas']};
  const d=model([unresolved,conflict,internal,archived],[p],[{threadId:conflict.id,projectId:'p',projectKind:'local'}],[conflict.id]);
  const ui=await browser(d);assert.equal(ui.groups().length,1);assert.equal(d.components[0]!.threads.length,0);
  assert.ok(texts(ui.get('relationships')).includes('Needs review'));assert.ok(texts(ui.get('relationships')).includes('Unknown membership'));assert.ok(texts(ui.get('relationships')).includes('Conflicting relationship'));
  assert.equal(texts(ui.get('relationships')).includes('Thread name 3'),false);assert.equal(texts(ui.get('relationships')).includes('Thread name 4'),false);
  ui.get('expand-threads').onclick!();assert.equal(texts(ui.get('relationships')).includes('Thread name 3'),false);
  ui.get('diagnostics').onclick!();assert.ok(texts(ui.get('relationships')).includes('Thread name 3'));assert.ok(texts(ui.get('relationships')).includes('Internal records (1)'));
  action(ui.get('relationships'),'Thread name 3').onclick!();ui.get('workspace').onclick!();assert.equal(ui.get('details').hidden,true);assert.equal(texts(ui.get('details')).includes('Thread name 3'),false);
});

test('selection highlights actual related entities; Escape dismisses Details and restores focus',async()=>{
  const t=thread(1),ui=await browser(model([t],[{id:'p',label:'Atlas',roots:['C:\\Synthetic\\atlas']}],[{threadId:t.id,projectId:'p',projectKind:'local'}]));
  const row=action(ui.get('relationships'),'Thread name 1');assert.equal(ui.get('details').hidden,true);row.onclick!();
  assert.equal(ui.get('details').hidden,false);assert.ok(action(ui.get('relationships'),'Atlas').className.includes('related'));assert.equal(ui.get('details-heading').focused,1);
  ui.events.get('keydown')!({key:'Escape'});assert.equal(ui.get('details').hidden,true);assert.equal(ui.get('details').childElementCount,0);assert.equal(action(ui.get('relationships'),'Thread name 1').focused,1);
});

test('selected Diagnostics uses a visible layout, preserves context on Back/Escape and never exposes raw titles',async()=>{
  const marker='PRIVATE_DIAGNOSTIC_PROMPT_CANARY',t=thread(1,{title:marker+'\n'.repeat(10),titleSource:'sqlite',titleResolution:'missing'});
  const ui=await browser(model([t],[],[],[t.id]));action(ui.get('relationships'),'Thread 00000000').onclick!();
  action(ui.get('details'),'View diagnostic details').onclick!();
  assert.equal(ui.get('layout').className,'layout');assert.equal(ui.get('details').hidden,true);
  assert.ok(texts(ui.get('relationships')).includes('Selected entity evidence'));assert.ok(texts(ui.get('relationships')).includes(t.id));
  assert.equal(ui.get('diagnostic-heading').focused,1);assert.equal(JSON.stringify([...ui.elements.values()]).includes(marker),false);
  action(ui.get('relationships'),'Back to Workspace').onclick!();assert.equal(ui.get('layout').className,'layout has-selection');assert.equal(ui.get('details').hidden,false);
  assert.ok(texts(ui.get('details')).includes(t.id));assert.equal(action(ui.get('relationships'),'Thread 00000000').attributes['aria-pressed'],'true');
  action(ui.get('details'),'View diagnostic details').onclick!();ui.events.get('keydown')!({key:'Escape'});
  assert.equal(ui.get('details').hidden,false);assert.ok(texts(ui.get('details')).includes(t.id));
  ui.events.get('keydown')!({key:'Escape'});assert.equal(ui.get('details').hidden,true);assert.equal(action(ui.get('relationships'),'Thread 00000000').focused,1);
  assert.equal(JSON.stringify([...ui.elements.values()]).includes(marker),false);
});

test('related entity navigation reveals a Thread beyond the initial list',async()=>{
  const threads=Array.from({length:7},(_,i)=>thread(i+1)),p={id:'p',label:'Atlas',roots:['C:\\Synthetic\\atlas']};
  const ui=await browser(model(threads,[p],threads.map(t=>({threadId:t.id,projectId:'p',projectKind:'local'}))));
  action(ui.get('relationships'),'Atlas').onclick!();
  action(ui.get('details'),'Thread name 7 →').onclick!();assert.ok(action(ui.get('relationships'),'Thread name 7'));assert.ok(texts(ui.get('details')).includes('Thread name 7'));
  ui.events.get('keydown')!({key:'Escape'});assert.equal(action(ui.get('relationships'),'Thread name 7').focused,1);
});

test('copy actions write original ID/path only on explicit clicks and handle unavailable clipboard',async()=>{
  const copied:string[]=[],t=thread(1,{cwd:'\\\\?\\C:\\Synthetic\\ATLAS'}),ui=await browser(model([t],[],[],[t.id]),{writeText:async value=>{copied.push(value);}});
  action(ui.get('relationships'),'Thread name 1').onclick!();assert.deepEqual(copied,[]);await action(ui.get('details'),'Copy ID').onclick!();await action(ui.get('details'),'Copy path').onclick!();assert.deepEqual(copied,[t.id,t.cwd]);
  const failed=await browser(model([t],[],[],[t.id]),{writeText:async()=>{throw new Error('synthetic unavailable');}});action(failed.get('relationships'),'Thread name 1').onclick!();await action(failed.get('details'),'Copy ID').onclick!();
  assert.ok(texts(failed.get('details')).includes('Copy unavailable. Select the value above and copy it manually.'));
  const old=action(ui.get('details'),'Copy ID');await ui.get('close').onclick!();await old.onclick!();assert.equal(copied.length,2);
});

test('normal Workspace omits technical noise, empty diagnostic sections and obsolete views',async()=>{
  const t=thread(1),ui=await browser(model([t],[],[],[t.id])),normal=JSON.stringify([...ui.elements.values()]);
  for(const value of ['stored-assignment','session-index','lexical location','Registry Project','inventory','Unclassified /','Source namespace'])assert.equal(normal.includes(value),false);
  assert.equal(explorerHtml.includes('id="locations"'),false);assert.equal(explorerHtml.includes('id="projects"'),false);
  assert.ok(explorerCss.includes('@media(max-width:899px)'));assert.ok(explorerCss.includes('.layout.has-selection #relationships{display:none}'));
  ui.get('diagnostics').onclick!();assert.equal(texts(ui.get('relationships')).some(v=>/^(Internal|Archived|Unresolved) records/.test(v)),false);
  assert.equal(folderStatus(undefined),'Folder not checked');
});


test('vertical tree connects only declared roots, membership and unique CWD use; shared locations appear once',async()=>{
  const root='C:\\Synthetic\\atlas',other='C:\\Synthetic\\elsewhere',second='C:\\Synthetic\\second';
  const p={id:'p',label:'Atlas',roots:[root,second]},q={id:'q',label:'Other Project',roots:[root]};
  const assigned=thread(1,{cwd:other}),free=thread(2,{cwd:root});
  const data=model([assigned,free],[p,q],[{threadId:assigned.id,projectId:'p',projectKind:'local'}],[free.id]);
  const groups=workspacePresentation(data),group=groups[0]!;
  const shared=group.locations.find(l=>l.path===root)!,cwd=group.locations.find(l=>l.path===other)!;
  assert.equal(locationPlacement(data,group,shared),null);assert.equal(locationPlacement(data,group,cwd),null);
  const ui=await browser(data),nodes=all(ui.groups()[0]!);assert.equal(nodes.filter(e=>e.className==='location-row').length,3);
  const projects=nodes.filter(e=>e.className==='project-block');assert.equal(texts(projects[0]!).includes('Thread name 2'),false);
  assert.ok(texts(projects[0]!).includes('Uses elsewhere'));assert.equal(all(projects[0]!).filter(e=>e.className==='location-row').length,0);
  const tree=ui.groups()[0]!.children[1]!,sources=tree.children.find(e=>e.className==='source-folders')!;
  assert.ok(sources);assert.equal(texts(projects[0]!).includes('Source folders'),false);assert.ok(action(sources,'second'));
  const sharedRow=all(sources).find(e=>e.className==='location-row'&&texts(e).includes('atlas'))!;
  const references=all(sharedRow).find(e=>e.className==='source-projects')!;assert.deepEqual(texts(references).filter(Boolean),['Atlas','Other Project']);
  action(references,'Other Project').onclick!();assert.ok(texts(ui.get('details')).includes('Other Project'));
  assert.ok(texts(ui.get('relationships')).includes('Uses atlas'));assert.ok(texts(ui.get('relationships')).includes('Uses elsewhere'));
  assert.equal(explorerCss.includes('color-scheme:light'),true);assert.equal(explorerCss.includes('.component-grid'),false);
});

test('a unique projectless CWD is nested under its Thread and folder status distinguishes inspection from denial',async()=>{
  const t=thread(1),data=model([t],[],[],[t.id]),ui=await browser(data);
  const row=all(ui.get('relationships')).find(e=>e.className==='thread-row')!;
  assert.equal(all(row).filter(e=>e.className==='location-row').length,1);assert.ok(texts(row).includes('atlas'));
  const base={path:t.cwd!,aliases:[t.cwd!],origin:'declared' as const,inspection:'uninspected' as const};
  assert.equal(folderStatus({...base,state:'inaccessible'}),'Folder inaccessible');
  assert.equal(folderStatus({...base,state:'uninspected'}),'Folder not checked');
  assert.equal(folderStatus({...base,state:'inspection-error'}),'Folder check failed');
  assert.equal(folderStatus({...base,state:'exists',inspection:'contents-unavailable'}),'Contents not inspected');
});

test('multiple Source folders form one branch; matching CWDs deduplicate and differing CWDs have selectable references',async()=>{
  const roots=['C:\\Synthetic\\first','C:\\Synthetic\\second'] as const,different='C:\\Synthetic\\scratch';
  const threads=[thread(1,{cwd:roots[0]}),thread(2,{cwd:roots[1]}),thread(3,{cwd:different}),thread(4,{cwd:roots[0]})];
  const ui=await browser(model(threads,[{id:'p',label:'Atlas',roots}],threads.slice(0,3).map(t=>({threadId:t.id,projectId:'p',projectKind:'local'})),[threads[3]!.id]));
  const nodes=all(ui.get('relationships')),project=nodes.find(e=>e.className==='project-block')!,sources=ui.groups()[0]!.children[1]!.children.filter(e=>e.className==='source-folders');
  assert.equal(sources.length,1);assert.ok(texts(sources[0]!).includes('Source folders'));assert.ok(action(sources[0]!,'first'));assert.ok(action(sources[0]!,'second'));
  const branches=all(project).find(e=>e.className==='project-branches')!;assert.equal(branches.children.length,1);assert.equal(branches.children[0]!.className,'member-list');assert.equal(all(project).includes(sources[0]!),false);
  assert.equal(texts(sources[0]!).includes('scratch'),false);assert.equal(all(sources[0]!).filter(e=>e.className==='location-row').length,2);
  assert.equal(nodes.filter(e=>e.className==='location-row').length,3);assert.equal(texts(project).includes('Thread name 4'),false);
  const rows=all(project).filter(e=>e.className==='thread-row');assert.equal(texts(rows[0]!).some(t=>t.startsWith('Uses ')),false);assert.equal(texts(rows[1]!).some(t=>t.startsWith('Uses ')),false);
  action(rows[2]!,'Uses scratch').onclick!();assert.ok(texts(ui.get('details')).includes(different));
  assert.ok(texts(ui.get('relationships')).includes('Projectless'));
});

test('routine discovery bounds stay in Diagnostics; root and meaningful location inspection failures warrant notices',async()=>{
  const base=model([thread(1)],[],[],[id(1)]),root='C:\\Synthetic',path=base.threads[0]!.cwd!;
  const d={...base,discovery:{root,from:provenance.from,through:provenance.through,folders:[
    {path:root,aliases:[root],origin:'discovery' as const,state:'exists' as const,inspection:'enumerated' as const},
    {path,aliases:[path],origin:'declared' as const,state:'exists' as const,inspection:'depth-limit' as const},
    {path:root+'\\irrelevant',aliases:[root+'\\irrelevant'],origin:'discovery' as const,state:'inspection-error' as const,inspection:'uninspected' as const}],git:[],relations:[],
    diagnostics:[{path,reason:'depth-limit'},{path:root+'\\node_modules',reason:'excluded-tree'},{path:root+'\\irrelevant',reason:'inspection-error'}],status:'limited' as const,operations:12,entries:8,
    limits:{depth:4,folders:100,entries:100,operations:100,milliseconds:100,git:10}}};
  const groups=workspacePresentation(d);assert.equal(discoveryNotice(d,groups),null);
  const ui=await browser(d);assert.equal(texts(ui.get('notices')).some(t=>/Discovery|working folders/.test(t)),false);
  ui.get('diagnostics').onclick!();assert.ok(texts(ui.get('relationships')).includes(path+' · depth-limit'));assert.ok(texts(ui.get('relationships')).some(t=>t.startsWith('limited ·')));
  for(const state of ['inspection-error','inaccessible','uninspected'] as const){const failure={...d,discovery:{...d.discovery,folders:d.discovery.folders.map((f,i)=>i===1?{...f,state,inspection:'uninspected' as const}:f)}};
    assert.match(discoveryNotice(failure,workspacePresentation(failure))!,/working folders/);const failed=await browser(failure);assert.ok(texts(failed.get('notices')).some(t=>t.includes('working folders')));}
  for(const state of ['missing','inaccessible','inspection-error'] as const){const failure={...d,discovery:{...d.discovery,folders:d.discovery.folders.map((f,i)=>i===0?{...f,state}:f)}};assert.match(discoveryNotice(failure,workspacePresentation(failure))!,/Discovery root/);}
  const missing={...d,discovery:{...d.discovery,folders:d.discovery.folders.map((f,i)=>i===1?{...f,state:'missing' as const}:f)}};assert.equal(discoveryNotice(missing,workspacePresentation(missing)),null);assert.ok(texts((await browser(missing)).get('relationships')).includes('Missing folder'));
  assert.match(discoveryNotice({...d,discovery:{...d.discovery,status:'cancelled'}},groups)!,/cancelled/);
});

test('global expansion covers multiple Projects and projectless/review Threads while history stays outside Workspace',async()=>{
  const threads=Array.from({length:16},(_,i)=>thread(i+1,{cwd:i<8?'C:\\Synthetic\\one':'C:\\Synthetic\\two'})),free=thread(17,{cwd:'C:\\Synthetic\\free'}),review=thread(18),internal=thread(19,{sourceState:'subagent'});
  const ui=await browser(model([...threads,free,review,internal],[{id:'one',label:'One',roots:['C:\\Synthetic\\one']},{id:'two',label:'Two',roots:['C:\\Synthetic\\two']}],threads.map((t,i)=>({threadId:t.id,projectId:i<8?'one':'two',projectKind:'local'})),[free.id,internal.id]));
  assert.equal(all(ui.get('relationships')).filter(e=>e.className==='thread-row').length,12);
  ui.get('expand-threads').onclick!();assert.equal(all(ui.get('relationships')).filter(e=>e.className==='thread-row').length,18);assert.ok(action(ui.get('relationships'),'Thread name 16'));assert.equal(texts(ui.get('relationships')).includes('Thread name 19'),false);
  ui.get('diagnostics').onclick!();assert.equal(ui.get('expand-threads').hidden,true);ui.get('workspace').onclick!();assert.equal(ui.get('expand-threads').hidden,false);assert.equal(all(ui.get('relationships')).filter(e=>e.className==='thread-row').length,18);
  ui.get('expand-threads').onclick!();assert.equal(all(ui.get('relationships')).filter(e=>e.className==='thread-row').length,12);await ui.get('close').onclick!();ui.get('expand-threads').onclick!();assert.equal(ui.get('relationships').childElementCount,0);
});

test('global expansion is hidden unless an ordinary displayed Project has more than five member Threads',async()=>{
  for(const count of [0,5,6]){
    const threads=Array.from({length:count},(_,i)=>thread(i+1)),history=Array.from({length:7},(_,i)=>thread(i+20,{sourceState:'subagent'})),unknown=thread(99);
    const ui=await browser(model([...threads,...history,unknown],[{id:'p',label:'Atlas',roots:['C:\\Synthetic\\atlas']}],[...threads,...history].map(t=>({threadId:t.id,projectId:'p',projectKind:'local'}))));
    assert.equal(ui.get('expand-threads').hidden,count<=5);
    ui.get('expand-threads').onclick!();assert.equal(ui.get('expand-threads').textContent,count>5?'Collapse all Threads':'Show all Threads');
    if(count>5){assert.ok(action(ui.get('relationships'),'Thread name 6'));assert.equal(ui.get('expand-threads').hidden,false);ui.get('expand-threads').onclick!();assert.equal(all(ui.groups()[0]!).filter(e=>e.className==='thread-row').length,5);assert.ok(action(ui.get('relationships'),'Show 1 more Threads'));}
    await ui.get('close').onclick!();assert.equal(ui.get('expand-threads').hidden,true);
  }
  const free=Array.from({length:8},(_,i)=>thread(i+1)),ui=await browser(model(free,[],[],free.map(t=>t.id)));assert.equal(ui.get('expand-threads').hidden,true);assert.equal(all(ui.get('relationships')).filter(e=>e.className==='thread-row').length,8);
});
