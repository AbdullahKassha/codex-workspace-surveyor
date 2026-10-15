import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { reconcile, type ExplorerData, type ThreadClaim, type ProjectClaim, type AssignmentClaim, type InstructionScopeObservation } from '../src/explorer/model.js';
import { friendlyTitle, workspacePresentation, folderStatus, locationPlacement, discoveryNotice, readablePath, diagnosticRelationGroups } from '../src/explorer/presentation.js';
import { clientCode, explorerHtml, explorerCss } from '../src/explorer/view.js';

const provenance={namespace:'synthetic-ui',from:'2026-10-10T00:00:00Z',through:'2026-10-10T00:00:01Z'};
const coverage={rowsRead:0,omittedRows:0,ambiguousIds:0,titles:'accepted' as const,projects:'desktop-registry' as const,correspondence:'qualified' as const,unconsumedColumns:false};
const id=(n:number)=>'00000000-0000-0000-0000-'+n.toString().padStart(12,'0');
const thread=(n:number,extra:Partial<ThreadClaim>={}):ThreadClaim=>({id:id(n),cwd:'C:\\Synthetic\\atlas',title:'Thread name '+n,
  titleSource:'session-index',titleResolution:'latest',titleState:'complete',ambiguous:false,sourceState:'ordinary',archived:false,...extra});
const model=(threads:ThreadClaim[]=[],projects:ProjectClaim[]=[],assignments:AssignmentClaim[]=[],free:string[]=[])=>reconcile(provenance,coverage,threads,projects,assignments,free);

class Element {
  children:Element[]=[];attributes:Record<string,string>={};textContent='';className='';id='';hidden=false;open=false;focused=0;
  ontoggle:(()=>unknown)|undefined;onclick:(()=>unknown)|undefined;oninput:((event:{target:{value:string}})=>void)|undefined;
  constructor(readonly tag=''){}
  append(...children:Element[]){this.children.push(...children);}replaceChildren(...children:Element[]){this.children=children;}
  setAttribute(name:string,value:string){this.attributes[name]=value;if(name==='class')this.className=value;}
  focus(){this.focused++;}get childElementCount(){return this.children.length;}
}
const all=(e:Element):Element[]=>[e,...e.children.flatMap(all)];
const texts=(e:Element)=>all(e).map(e=>e.textContent);
const normalTexts=(e:Element):string[]=>e.hidden?[]:[e.textContent,...e.children.filter(child=>child.tag!=='details').flatMap(normalTexts)];
const expand=(e:Element)=>{e.open=true;e.ontoggle?.();return e;};
const expandRelations=(e:Element)=>{for(const group of all(e).filter(n=>n.className==='evidence-group'&&/\bobservations?\b/.test(n.children[0]?.textContent||'')))expand(group);};
const instructionChecks=(e:Element)=>all(e).find(n=>n.className==='evidence-group'&&n.children[0]?.textContent.startsWith('Exact instruction checks'))!;
const copyAction=(e:Element,label:string)=>all(e).find(e=>e.attributes['aria-label']===label)!;
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

function instructionFixture(cwd:string):InstructionScopeObservation {
  const entries:InstructionScopeObservation['entries'][number][]=[],ancestry:InstructionScopeObservation['cwds'][number]['ancestry'][number][]=[];
  for(const path of [cwd,'C:\\Synthetic\\atlas\\parent','C:\\Synthetic\\atlas']){
    const directory=entries.length;entries.push({path,purpose:'directory',state:'present',type:'directory'});
    const marker=entries.length;entries.push({path:path+'\\.git',purpose:'marker',state:path==='C:\\Synthetic\\atlas'?'present':'absent',type:'directory'});
    const instructions=[entries.length,entries.length+1];for(const name of ['AGENTS.override.md','AGENTS.md'])entries.push({path:path+'\\'+name,purpose:'instruction',state:'present',type:'file',size:12});
    ancestry.push({path,directory,marker,instructions});
  }
  return {root:'C:\\Synthetic',from:provenance.from,through:provenance.through,policy:{effective:'unknown',assumption:'documented-git',evidence:['DOC-005','DOC-006']},
    entries,cwds:[{cwd,ancestry,stop:'marker',stoppedAt:'C:\\Synthetic\\atlas',complete:true,candidate:'C:\\Synthetic\\atlas'}],qualifyingCwds:1,status:'complete',operations:12,
    limits:{cwds:100,depth:12,operations:5000,milliseconds:5000}};
}

function checkedScopeFixture(cwd:string):InstructionScopeObservation {
  const root='C:\\Synthetic',entries:InstructionScopeObservation['entries'][number][]=[],ancestry:InstructionScopeObservation['cwds'][number]['ancestry'][number][]=[];
  for(const path of [cwd,root]){
    const directory=entries.length;entries.push({path,purpose:'directory',state:'present',type:'directory'});
    const marker=entries.length;entries.push({path:path+'\\.git',purpose:'marker',state:'absent',reason:'missing',at:'target',obstruction:path+'\\.git'});
    const instructions=[entries.length,entries.length+1];
    for(const name of ['AGENTS.override.md','AGENTS.md'])entries.push({path:path+'\\'+name,purpose:'instruction',state:'absent',reason:'missing',at:'target',obstruction:path+'\\'+name});
    ancestry.push({path,directory,marker,instructions});
  }
  return {...instructionFixture(cwd),root,entries,cwds:[{cwd,ancestry,stop:'scope-boundary',stoppedAt:root,complete:false}],status:'partial'};
}

test('scope-edge explanation requires checked CWD-to-root marker absence and preserves other stopping reasons',async()=>{
  const t=thread(1,{cwd:'C:\\Synthetic\\working'}),base=model([t],[],[],[t.id]),observation=checkedScopeFixture(t.cwd!),d={...base,instructionScope:observation},before=JSON.stringify(d);
  const sentence='No .git marker found in the folders checked. Folders above Synthetic were not checked.';
  const ui=await browser(d),original=await browser(base);assert.deepEqual(texts(ui.get('relationships')),texts(original.get('relationships')));
  action(ui.get('relationships'),'Thread name 1').onclick!();assert.ok(texts(ui.get('details')).includes(sentence));
  assert.equal(texts(ui.get('details')).some(s=>s.includes('selected folder')),false);assert.equal(JSON.stringify(d),before);
  const row=observation.cwds[0]!;
  for(const [stop,reason] of [['depth-limit','folder-depth limit'],['operations-limit','check limit'],['time-limit','time limit'],
    ['cancelled','cancelled'],['obstruction','folder or .git entry']] as const){
    const other=await browser({...base,instructionScope:{...observation,cwds:[{...row,stop}]}});action(other.get('relationships'),'Thread name 1').onclick!();
    assert.equal(texts(other.get('details')).includes(sentence),false);assert.ok(texts(other.get('details')).some(s=>s.includes(reason)));
  }
  for(const changed of [
    {...observation,cwds:[{...row,ancestry:row.ancestry.slice(0,1)}]},
    {...observation,cwds:[{...row,stoppedAt:t.cwd!}]},
    {...observation,cwds:[{...row,ancestry:[row.ancestry[0]!,row.ancestry[0]!,row.ancestry[1]!]}]},
    {...observation,entries:observation.entries.map((e,i)=>i===1?{...e,state:'uninspected' as const,at:'ancestor' as const,reason:'access-denied'}:e)},
    {...observation,entries:observation.entries.map((e,i)=>i===4?{...e,state:'uninspected' as const}:e)}
  ]){
    const incomplete=await browser({...base,instructionScope:changed});action(incomplete.get('relationships'),'Thread name 1').onclick!();
    assert.equal(texts(incomplete.get('details')).includes(sentence),false);
    assert.ok(texts(incomplete.get('details')).includes('Parent folders were not fully checked; inspection reached its scope boundary.'));
  }
});

test('instruction Diagnostics calls exact-target absence checked while preserving actual obstruction details and evidence',async()=>{
  const t=thread(1,{cwd:'C:\\Synthetic\\working'}),base=model([t],[],[],[t.id]),fixture=checkedScopeFixture(t.cwd!);
  const ordinary=await browser({...base,instructionScope:fixture});action(ordinary.get('relationships'),'Thread name 1').onclick!();action(ordinary.get('details'),'Inspect evidence').onclick!();
  assert.equal(normalTexts(ordinary.get('relationships')).some(s=>s.includes('AGENTS.override.md')),false);expand(instructionChecks(ordinary.get('relationships')));
  assert.ok(texts(ordinary.get('relationships')).includes(t.cwd+'\\AGENTS.md · Absent · target checked'));
  const entries=fixture.entries.map((e,i)=>i===3?{...e,state:'uninspected' as const,reason:'access-denied',at:'ancestor' as const,obstruction:fixture.root}:
    i===5?{...e,state:'uninspected' as const,reason:'reparse-refused'}:
    i===6?{...e,state:'inaccessible' as const,reason:'access-denied'}:
    i===7?{...e,state:'error' as const,reason:'io-error'}:e);
  const d={...base,instructionScope:{...fixture,entries,cwds:fixture.cwds.map(row=>({...row,stop:'obstruction' as const}))}},before=JSON.stringify(d),ui=await browser(d);
  action(ui.get('relationships'),'Thread name 1').onclick!();action(ui.get('details'),'Inspect evidence').onclick!();
  assert.ok(normalTexts(ui.get('relationships')).includes('Search incomplete: a folder or .git entry could not be checked.'));expand(instructionChecks(ui.get('relationships')));
  const diagnostic=texts(ui.get('relationships'));
  for(const i of [1,2]){
    assert.ok(diagnostic.includes(entries[i]!.path+' · Absent · target checked'));
    assert.equal(diagnostic.some(s=>s.startsWith(entries[i]!.path+' ·')&&s.includes('obstruction')),false);
  }
  assert.ok(diagnostic.includes(entries[3]!.path+' · uninspected · access-denied · ancestor obstruction: '+fixture.root));
  for(const i of [5,6,7])assert.ok(diagnostic.includes(entries[i]!.path+' · '+entries[i]!.state+' · '+entries[i]!.reason+' · target obstruction: '+entries[i]!.path));
  assert.equal(JSON.stringify(d),before);assert.deepEqual(d.components,base.components);assert.deepEqual(d.relations,base.relations);
});

test('possible instructions remain in Thread Details, cap paths and expose only selected CWD checks in Diagnostics',async()=>{
  const t=thread(1,{cwd:'C:\\Synthetic\\atlas\\parent\\working'}),base=model([t],[],[],[t.id]),d={...base,instructionScope:instructionFixture(t.cwd!)},before=JSON.stringify(d);
  const original=await browser(base),ui=await browser(d);assert.deepEqual(texts(ui.get('relationships')),texts(original.get('relationships')));
  action(ui.get('relationships'),'Thread name 1').onclick!();
  const detail=texts(ui.get('details'));assert.ok(detail.includes('Possible project instructions'));
  const normal=normalTexts(ui.get('details'));assert.ok(normal.includes('AGENTS.md found in atlas.'));
  assert.equal(normal.includes('Observed instruction file'),false);assert.equal(normal.some(s=>/selected|loaded|override first/.test(s)),false);
  assert.ok(detail.includes('Under the documented default rule, Codex may stop searching for parent instructions at atlas because this folder contains .git.'));
  assert.ok(detail.includes('Actual Desktop settings have not been checked.'));
  assert.equal(normal.filter(s=>s.includes(' found in ')).length,4);assert.ok(detail.includes('2 more files in Diagnostics.'));
  assert.equal(texts(ui.get('relationships')).some(s=>s.includes('AGENTS.md')),false);
  assert.ok(normalTexts(ui.get('details')).includes('Inspect evidence'));assert.equal(normalTexts(ui.get('details')).includes('Thread ID'),false);
  action(ui.get('details'),'Inspect evidence').onclick!();
  assert.ok(normalTexts(ui.get('relationships')).includes('C:\\Synthetic\\atlas\\AGENTS.md'));
  assert.ok(normalTexts(ui.get('relationships')).includes('Actual Desktop settings have not been checked.'));
  const checks=instructionChecks(ui.get('relationships'));assert.equal(checks.open,false);assert.equal(checks.children.length,1);
  expand(checks);assert.equal(all(checks).filter(e=>e.className==='evidence-group').length,1);
  const diagnostics=texts(ui.get('relationships'));
  assert.ok(diagnostics.includes('Root-marker assumption'));assert.ok(diagnostics.includes('Documented default .git rule; effective settings unknown'));assert.ok(diagnostics.includes('marker · C:\\Synthetic\\atlas'));
  assert.equal(diagnostics.filter(s=>s.includes(' · present · file · 12 bytes')).length,6);
  assert.equal(JSON.stringify(d),before);
  // Missing override checks stay in Diagnostics, with no extra normal sentence.
  const onlyStandard={...d,instructionScope:{...d.instructionScope,entries:d.instructionScope.entries.map(e=>e.path.endsWith('AGENTS.override.md')?{...e,state:'absent' as const,reason:'missing',at:'target' as const,obstruction:e.path}:e)}};
  const standard=await browser(onlyStandard);action(standard.get('relationships'),'Thread name 1').onclick!();
  assert.equal(normalTexts(standard.get('details')).some(s=>s.includes('AGENTS.override.md')),false);
  action(standard.get('details'),'Inspect evidence').onclick!();expand(instructionChecks(standard.get('relationships')));assert.ok(texts(standard.get('relationships')).some(s=>s.includes('AGENTS.override.md · Absent · target checked')));
});

test('instruction Details qualify incomplete, unavailable and empty observations without implying loaded or selected files',async()=>{
  const t=thread(1),base=model([t],[],[],[t.id]);
  const old=await browser(base);action(old.get('relationships'),'Thread name 1').onclick!();
  assert.ok(texts(old.get('details')).includes('Instruction locations were not checked.'));
  const fixture=instructionFixture(t.cwd!),row=fixture.cwds[0]!;
  const observation:InstructionScopeObservation={...fixture,status:'partial',entries:fixture.entries.map(e=>e.purpose==='instruction'?{...e,state:'absent'}:e),
    cwds:[{cwd:row.cwd,ancestry:row.ancestry,stop:'scope-boundary',stoppedAt:fixture.root,complete:false}]};
  const ui=await browser({...base,instructionScope:observation});action(ui.get('relationships'),'Thread name 1').onclick!();
  assert.ok(texts(ui.get('details')).includes('No instruction files found in the folders checked.'));
  assert.ok(texts(ui.get('details')).includes('Parent folders were not fully checked; inspection reached its scope boundary.'));
  const partial={...observation,entries:observation.entries.map(e=>e.purpose==='instruction'?{...e,state:'uninspected' as const,reason:'operations-limit'}:e)};
  const failed=await browser({...base,instructionScope:partial});action(failed.get('relationships'),'Thread name 1').onclick!();
  assert.equal(texts(failed.get('details')).includes('No instruction files found in the folders checked.'),false);
  assert.ok(texts(failed.get('details')).includes('Instruction-file checks are incomplete.'));
  const nonfiles={...observation,entries:observation.entries.map(e=>e.purpose==='instruction'?{...e,state:'present' as const,type:'directory' as const}:e)};
  const checked=await browser({...base,instructionScope:nonfiles});action(checked.get('relationships'),'Thread name 1').onclick!();
  assert.ok(normalTexts(checked.get('details')).includes('No instruction files found in the folders checked.'));
  assert.equal(normalTexts(checked.get('details')).includes('Instruction-file checks are incomplete.'),false);
});

test('Diagnostics shows conditional findings immediately while exact instruction checks stay shallow and bounded',async()=>{
  const root='C:\\Synthetic\\atlas',paths=[root];for(let i=0;i<11;i++)paths.unshift(paths[0]+'\\level'+i);
  const t=thread(1,{cwd:paths[0]!}),fixture=instructionFixture(t.cwd!),entries:InstructionScopeObservation['entries'][number][]=[],ancestry:InstructionScopeObservation['cwds'][number]['ancestry'][number][]=[];
  for(const path of paths){const directory=entries.length;entries.push({path,purpose:'directory',state:'present',type:'directory'});
    const marker=entries.length;entries.push({path:path+'\\.git',purpose:'marker',state:path===root?'present':'absent',...(path===root?{type:'directory' as const}:{reason:'missing',at:'target' as const})});
    const instructions=[entries.length,entries.length+1];for(const name of ['AGENTS.override.md','AGENTS.md'])entries.push({path:path+'\\'+name,purpose:'instruction',state:'absent',reason:'missing',at:'target'});
    ancestry.push({path,directory,marker,instructions});}
  const d={...model([t],[],[],[t.id]),instructionScope:{...fixture,entries,operations:48,cwds:[{cwd:t.cwd!,ancestry,stop:'marker' as const,stoppedAt:root,candidate:root,complete:true}]}},before=JSON.stringify(d),ui=await browser(d);
  action(ui.get('relationships'),t.title!).onclick!();action(ui.get('details'),'Inspect evidence').onclick!();
  const visible=normalTexts(ui.get('relationships'));assert.ok(visible.includes('No instruction files found in the folders checked.'));
  assert.ok(visible.some(s=>s.includes('Under the documented default rule, Codex may stop')));assert.ok(visible.includes('Actual Desktop settings have not been checked.'));
  assert.equal(visible.some(s=>s.includes('AGENTS.override.md')),false);const checks=instructionChecks(ui.get('relationships'));assert.equal(checks.children.length,1);
  action(ui.get('relationships'),'Expand all').onclick!();
  const exactRows=()=>texts(checks).filter(s=>s.startsWith('{'));assert.equal(exactRows().length,25);
  assert.equal(all(checks).filter(e=>e.tag==='details'&&e.className!=='context-help').length,1);
  action(checks,'Show next 23 (23 remaining)').onclick!();assert.equal(exactRows().length,48);
  assert.deepEqual(exactRows().map(s=>JSON.parse(s)),entries);action(ui.get('relationships'),'Collapse all').onclick!();assert.equal(checks.open,false);
  action(ui.get('relationships'),'Expand all').onclick!();assert.equal(exactRows().length,48);assert.equal(JSON.stringify(d),before);
});

test('instruction paths stay inert and escaped, and unrelated CWD evidence is absent from selected Diagnostics',async()=>{
  const t=thread(1),base=model([t],[],[],[t.id]),fixture=instructionFixture(t.cwd!);
  const observation={...fixture,entries:fixture.entries.map((e,i)=>i===10?{...e,path:'C:\\Synthetic\\<script>\u202e\\AGENTS.md'}:e)};
  const ui=await browser({...base,instructionScope:observation});action(ui.get('relationships'),'Thread name 1').onclick!();
  assert.ok(all(ui.get('details')).some(e=>e.attributes.title==='C:\\Synthetic\\<script>\\u{202e}\\AGENTS.md'));
  assert.equal(all(ui.get('details')).some(e=>e.tag==='script'),false);
  const other='C:\\Synthetic\\unrelated\\AGENTS.md',d={...observation,entries:[...observation.entries,{path:other,purpose:'instruction' as const,state:'present' as const,type:'file' as const}]};
  const selected=await browser({...base,instructionScope:d});action(selected.get('relationships'),'Thread name 1').onclick!();action(selected.get('details'),'Inspect evidence').onclick!();
  assert.equal(texts(selected.get('relationships')).some(s=>s.includes(other)),false);
});

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
  action(ui.get('relationships'),'Thread name 2').onclick!();assert.ok(texts(ui.get('details')).includes('No Project assigned.'));assert.equal(texts(ui.get('details')).includes('Atlas →'),false);
});

test('global and local expansion expose all ordinary Threads for native find and preserve group numbering',async()=>{
  const threads=Array.from({length:8},(_,i)=>thread(i+1)),p={id:'p',label:'Atlas',roots:['C:\\Synthetic\\atlas']},empty={id:'empty',label:'Empty',roots:[]};
  const ui=await browser(model(threads,[p,empty],threads.map(t=>({threadId:t.id,projectId:'p',projectKind:'local'}))));
  assert.equal(all(ui.groups()[0]!).filter(e=>e.className==='thread-row').length,5);assert.ok(texts(ui.groups()[1]!).includes('No qualifying assigned Threads observed'));
  action(ui.get('relationships'),'Show 3 more Threads').onclick!();assert.equal(all(ui.groups()[0]!).filter(e=>e.className==='thread-row').length,8);
  action(ui.get('relationships'),'Show fewer Threads').onclick!();assert.equal(all(ui.groups()[0]!).filter(e=>e.className==='thread-row').length,5);
  action(ui.get('relationships'),'Show 3 more Threads').onclick!();ui.get('expand-threads').onclick!();assert.equal(ui.get('expand-threads').textContent,'Collapse all Threads');
  assert.equal(all(ui.groups()[0]!).filter(e=>e.className==='thread-row').length,8);assert.ok(action(ui.get('relationships'),'Thread name 8'));assert.equal(all(ui.groups()[0]!).some(e=>e.hidden),false);
  assert.deepEqual(ui.groups().map(g=>g.attributes['data-workspace-group']),['1','2']);
  assert.equal(texts(ui.get('relationships')).some(s=>s.startsWith('Workspace group ')),false);
  assert.equal(ui.groups()[0]!.attributes['aria-label'],'Project Atlas relationships');
  assert.equal(texts(ui.groups()[0]!).filter(s=>s==='Atlas').length,1);
  assert.equal(all(ui.groups()[0]!).some(e=>e.className==='source-projects'),false);
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
  ui.get('diagnostics').onclick!();assert.equal(texts(ui.get('relationships')).includes('Thread name 3'),false);assert.ok(texts(ui.get('relationships')).includes('Internal records (1)'));
  expand(all(ui.get('relationships')).find(e=>e.children[0]?.textContent==='Internal records (1)')!);assert.ok(texts(ui.get('relationships')).includes('Thread name 3'));
  action(ui.get('relationships'),'Thread name 3').onclick!();ui.get('workspace').onclick!();assert.equal(ui.get('details').hidden,true);assert.equal(texts(ui.get('details')).includes('Thread name 3'),false);
});

test('selection highlights actual related entities; Escape dismisses Details and restores focus',async()=>{
  const t=thread(1),ui=await browser(model([t],[{id:'p',label:'Atlas',roots:['C:\\Synthetic\\atlas']}],[{threadId:t.id,projectId:'p',projectKind:'local'}]));
  const row=action(ui.get('relationships'),'Thread name 1');assert.equal(ui.get('details').hidden,true);row.onclick!();
  assert.equal(ui.get('details').hidden,false);assert.ok(action(ui.get('relationships'),'Atlas').className.includes('related'));assert.equal(ui.get('details-heading').focused,1);
  ui.events.get('keydown')!({key:'Escape'});assert.equal(ui.get('details').hidden,true);assert.equal(ui.get('details').childElementCount,0);assert.equal(action(ui.get('relationships'),'Thread name 1').focused,1);
  assert.ok(explorerCss.includes('summary:focus-visible'));assert.ok(texts(ui.get('details')).length===1);
});

test('exceptional Git relationships retain contextual navigation across groups without merging them',async()=>{
  const root='C:\\Synthetic',checkout=root+'\\checkout',t=thread(1,{cwd:checkout+'\\working'}),base=model([t],[],[],[t.id]);
  const d:ExplorerData={...base,components:[{projects:[],threads:[0],folders:[0]},{projects:[],threads:[],folders:[1]}],discovery:{
    root,from:provenance.from,through:provenance.through,status:'complete',operations:0,entries:0,diagnostics:[],
    limits:{depth:4,folders:100,entries:100,operations:100,milliseconds:100,git:10},
    folders:[t.cwd!,checkout].map(path=>({path,aliases:[path],origin:'declared',state:'exists',inspection:'exact-only'})),
    git:[{folder:1,kind:'main',state:'verified',commonIdentity:'synthetic',detail:'Invented verified metadata'}],
    relations:[{kind:'inside-git-tree',subject:{kind:'thread',index:0},target:{kind:'git',index:0},evidence:'lexical-containment'}]}};
  const before=JSON.stringify(d),ui=await browser(d);assert.equal(ui.groups().length,2);
  action(ui.get('relationships'),t.title!).onclick!();action(ui.get('details'),'Repository: checkout →').onclick!();
  assert.ok(normalTexts(ui.get('details')).includes('Main repository'));ui.events.get('keydown')!({key:'Escape'});
  assert.equal(action(ui.get('relationships'),'Repository').focused,1);assert.equal(ui.groups().length,2);assert.equal(JSON.stringify(d),before);
});

test('selected Diagnostics uses a visible layout, preserves context on Back/Escape and never exposes raw titles',async()=>{
  const marker='PRIVATE_DIAGNOSTIC_PROMPT_CANARY',t=thread(1,{title:marker+'\n'.repeat(10),titleSource:'sqlite',titleResolution:'missing'});
  const ui=await browser(model([t],[],[],[t.id]));action(ui.get('relationships'),'Thread 00000000').onclick!();
  action(ui.get('details'),'Inspect evidence').onclick!();
  assert.equal(ui.get('layout').className,'layout');assert.equal(ui.get('details').hidden,true);
  assert.ok(texts(ui.get('relationships')).includes('Technical evidence — Thread 00000000 (Thread)'));assert.ok(texts(ui.get('relationships')).includes(t.id));
  assert.equal(ui.get('diagnostic-heading').focused,1);assert.equal(JSON.stringify([...ui.elements.values()]).includes(marker),false);
  action(ui.get('relationships'),'Back to Workspace').onclick!();assert.equal(ui.get('layout').className,'layout has-selection');assert.equal(ui.get('details').hidden,false);
  assert.ok(texts(ui.get('details')).includes(t.id));assert.equal(action(ui.get('relationships'),'Thread 00000000').attributes['aria-pressed'],'true');
  action(ui.get('details'),'Inspect evidence').onclick!();ui.events.get('keydown')!({key:'Escape'});
  assert.equal(ui.get('details').hidden,false);assert.ok(texts(ui.get('details')).includes(t.id));
  ui.events.get('keydown')!({key:'Escape'});assert.equal(ui.get('details').hidden,true);assert.equal(action(ui.get('relationships'),'Thread 00000000').focused,1);
  assert.equal(JSON.stringify([...ui.elements.values()]).includes(marker),false);
});

test('Project Details omit duplicate Thread navigation; tree expansion retains keyboard selection',async()=>{
  const threads=Array.from({length:7},(_,i)=>thread(i+1)),p={id:'p',label:'Atlas',roots:['C:\\Synthetic\\atlas']};
  const ui=await browser(model(threads,[p],threads.map(t=>({threadId:t.id,projectId:'p',projectKind:'local'}))));
  action(ui.get('relationships'),'Atlas').onclick!();
  assert.equal(texts(ui.get('details')).includes('Thread name 7 →'),false);action(ui.get('relationships'),'Show 2 more Threads').onclick!();action(ui.get('relationships'),'Thread name 7').onclick!();assert.ok(action(ui.get('relationships'),'Thread name 7'));assert.ok(texts(ui.get('details')).includes('Thread name 7'));
  ui.events.get('keydown')!({key:'Escape'});assert.equal(action(ui.get('relationships'),'Thread name 7').focused,1);
});

test('compact accessible copy actions preserve IDs and safely display conventional paths',async()=>{
  const copied:string[]=[],t=thread(1,{cwd:'\\\\?\\C:\\Synthetic\\ATLAS'}),ui=await browser(model([t],[],[],[t.id]),{writeText:async value=>{copied.push(value);}});
  action(ui.get('relationships'),'Thread name 1').onclick!();assert.deepEqual(copied,[]);await copyAction(ui.get('details'),'Copy Thread ID').onclick!();await copyAction(ui.get('details'),'Copy working folder').onclick!();assert.deepEqual(copied,[t.id,'C:\\Synthetic\\ATLAS']);assert.ok(normalTexts(ui.get('details')).includes('C:\\Synthetic\\ATLAS'));assert.equal(normalTexts(ui.get('details')).includes(t.cwd!),false);assert.ok(texts(ui.get('details')).includes(t.cwd!));const disclosure=all(ui.get('details')).find(e=>e.className==='technical-information')!;assert.equal(disclosure.open,false);assert.ok(texts(disclosure).includes('Thread ID'));assert.equal(copyAction(ui.get('details'),'Copy working folder').textContent,'⧉');
  const failed=await browser(model([t],[],[],[t.id]),{writeText:async()=>{throw new Error('synthetic unavailable');}});action(failed.get('relationships'),'Thread name 1').onclick!();await copyAction(failed.get('details'),'Copy Thread ID').onclick!();
  assert.ok(texts(failed.get('details')).includes('Copy unavailable. Select the value above and copy it manually.'));
  const old=copyAction(ui.get('details'),'Copy Thread ID');await ui.get('close').onclick!();await old.onclick!();assert.equal(copied.length,2);
  for(const path of ['\\\\?\\UNC\\server\\share\\atlas','\\\\.\\C:\\Synthetic\\atlas','\\\\?\\Volume{synthetic}\\atlas',
    '\\\\?\\C:\\Synthetic\\..\\atlas','\\\\?\\C:\\Synthetic\\trailing.','\\\\?\\C:\\Synthetic\\CON','\\\\?\\C:\\Synthetic/atlas',
    '\\\\?\\C:\\Synthetic\\\u202eAtlas','\\\\?\\C:\\'+ 'a'.repeat(260)])assert.equal(readablePath(path),path);
  const raw='\\\\?\\UNC\\server\\share\\atlas',unc=thread(2,{cwd:raw}),uncCopies:string[]=[],untouched=await browser(model([unc],[],[],[unc.id]),{writeText:async value=>{uncCopies.push(value);}});
  action(untouched.get('relationships'),'Thread name 2').onclick!();await copyAction(untouched.get('details'),'Copy working folder').onclick!();assert.equal(uncCopies.at(-1),raw);
  assert.equal(readablePath('\\\\?\\C:\\Synthetic\\ATLAS'),'C:\\Synthetic\\ATLAS');assert.equal(readablePath('C:\\Synthetic\\atlas'),'C:\\Synthetic\\atlas');
});

test('normal Workspace omits technical noise, empty diagnostic sections and obsolete views',async()=>{
  const t=thread(1),ui=await browser(model([t],[],[],[t.id])),normal=JSON.stringify([...ui.elements.values()]);
  for(const value of ['stored-assignment','session-index','lexical location','Registry Project','inventory','Unclassified /','Source namespace'])assert.equal(normal.includes(value),false);
  assert.equal(explorerHtml.includes('id="locations"'),false);assert.equal(explorerHtml.includes('id="projects"'),false);
  assert.ok(explorerCss.includes('@media(max-width:899px)'));assert.ok(explorerCss.includes('.layout.has-selection #relationships{display:none}'));
  ui.get('diagnostics').onclick!();assert.equal(texts(ui.get('relationships')).some(v=>/^(Internal|Archived|Unresolved) records/.test(v)),false);
  assert.equal(folderStatus(undefined),'Folder not checked');
});

test('technical disclosures avoid duplicate paths and contextual help is accessible and state-specific',async()=>{
  const paths=['C:\\Synthetic\\atlas','C:\\Synthetic\\second'],t=thread(1),d=model([t],[{id:'p',label:'Atlas',roots:paths}],[{threadId:t.id,projectId:'p',projectKind:'local'}]),before=JSON.stringify(d),ui=await browser(d);
  action(ui.get('relationships'),'Atlas').onclick!();const technical=all(ui.get('details')).find(e=>e.className==='technical-information')!;
  assert.equal(technical.open,false);assert.deepEqual(texts(technical).filter(s=>paths.includes(s)),[]);assert.equal(texts(ui.get('details')).filter(s=>paths.includes(s)).length,2);
  expand(technical);assert.equal(technical.open,true);assert.ok(texts(technical).includes('Project ID'));
  assert.ok(explorerCss.includes('details:not([open])>:not(summary){display:none}'));
  action(ui.get('relationships'),'atlas').onclick!();assert.equal(texts(ui.get('details')).includes('Original path'),false);
  action(ui.get('relationships'),t.title!).onclick!();assert.equal(texts(ui.get('details')).filter(s=>s===t.cwd).length,1);
  const folderHelp=all(ui.get('details')).find(e=>e.className==='context-help'&&e.children[0]?.attributes['aria-label']==='About Working folder')!;
  assert.equal(folderHelp.open,false);assert.equal(folderHelp.children[0]!.tag,'summary');expand(folderHelp);
  assert.ok(texts(folderHelp).some(s=>s.includes('folder path stored with the Thread')));
  action(ui.get('details'),'Inspect evidence').onclick!();const controls=all(ui.get('relationships')).filter(e=>e.className==='context-help');
  for(const [label,phrase] of [['Visibility (inferred)','currently visible inside Codex Desktop'],['Membership (stored-assignment)','not guessed from the working-folder'],['Title source (session-index)','usual location is %USERPROFILE%\\.codex\\session_index.jsonl'],['Title resolution (latest)','not Workspace visibility']] as const){
    const control=controls.find(e=>e.children[0]?.attributes['aria-label']==='About '+label)!;assert.ok(control);assert.equal(control.open,false);expand(control);assert.ok(texts(control).some(s=>s.includes(phrase)));
  }
  assert.equal(JSON.stringify(d),before);ui.events.get('keydown')!({key:'Escape'});assert.equal(ui.get('details').hidden,false);
});

test('each selected entity has immediate readable Diagnostics and one-step evidence access without opening IDs',async()=>{
  const path='C:\\Synthetic\\atlas',t=thread(1),base=model([t],[{id:'p',label:'Atlas',roots:[path]}],[{threadId:t.id,projectId:'p',projectKind:'local'}]);
  const d:ExplorerData={...base,discovery:{root:'C:\\Synthetic',from:provenance.from,through:provenance.through,status:'complete',operations:0,entries:0,diagnostics:[],
    limits:{depth:4,folders:100,entries:100,operations:100,milliseconds:100,git:10},folders:[{path,aliases:[path],origin:'declared',state:'exists',inspection:'exact-only'}],
    git:[{folder:0,kind:'main',state:'verified',detail:'Invented verified metadata'}],relations:[
      {kind:'physical-location',subject:{kind:'project',index:0},target:{kind:'folder',index:0},evidence:'observed-path'},
      {kind:'inside-git-tree',subject:{kind:'thread',index:0},target:{kind:'git',index:0},evidence:'lexical-containment'}]}};
  const before=JSON.stringify(d),ui=await browser(d);
  for(const [label,type] of [['Atlas','Project'],[t.title!,'Thread'],['atlas','Folder'],['Repository','Main repository']]){
    action(ui.get('relationships'),label!).onclick!();assert.ok(normalTexts(ui.get('details')).includes('Inspect evidence'));
    assert.equal(normalTexts(ui.get('details')).some(s=>s==='Project ID'||s==='Thread ID'),false);
    assert.ok(all(ui.get('details')).filter(e=>e.className==='technical-information').every(e=>!e.open));
    action(ui.get('details'),'Inspect evidence').onclick!();const normal=normalTexts(ui.get('relationships'));
    assert.ok(normal.some(s=>s.startsWith('Technical evidence — ')&&s.endsWith('('+type+')')));assert.ok(normal.includes(path));
    assert.ok(normal.some(s=>s.includes(' → ')));assert.equal(normal.some(s=>/physical-location ·|inside-git-tree ·/.test(s)),false);
    const evidence=all(ui.get('relationships')).filter(e=>e.className==='evidence-group');assert.ok(evidence.every(e=>!e.open));
    assert.ok(evidence.every(e=>all(e).slice(1).every(child=>child.className!=='evidence-group')));
    ui.events.get('keydown')!({key:'Escape'});assert.equal(ui.groups().length,1);assert.ok(ui.get('details-heading').focused);
  }
  for(const state of ['unsupported','missing','inaccessible'] as const){const other=await browser({...d,discovery:{...d.discovery!,git:[{...d.discovery!.git[0]!,state}]}});
    action(other.get('relationships'),'Git '+state).onclick!();action(other.get('details'),'Inspect evidence').onclick!();
    assert.ok(normalTexts(other.get('relationships')).includes('Git metadata '+state+'. Repository identity was not verified.'));
    assert.equal(normalTexts(other.get('relationships')).some(s=>/invalid repository|boundary.*selected/i.test(s)),false);
  }
  assert.equal(JSON.stringify(d),before);
});

test('Diagnostics groups Git evidence, resolves identical entity names and progressively reveals every raw relationship',async()=>{
  const path='C:\\Synthetic\\atlas',threads=Array.from({length:60},(_,i)=>thread(i+1,{title:'Atlas'})),base=model(threads,[{id:'p',label:'Atlas',roots:[path]}],threads.map(t=>({threadId:t.id,projectId:'p',projectKind:'local'})));
  const d:ExplorerData={...base,discovery:{root:'C:\\Synthetic',from:provenance.from,through:provenance.through,status:'complete',operations:0,entries:0,diagnostics:[],
    limits:{depth:4,folders:100,entries:100,operations:100,milliseconds:100,git:10},folders:[{path,aliases:[path],origin:'declared',state:'exists',inspection:'exact-only'}],
    git:[{folder:0,kind:'main',state:'verified',admin:path+'\\.git',common:path+'\\.git',detail:'Invented verified metadata'}],relations:[
      {kind:'physical-location',subject:{kind:'project',index:0},target:{kind:'folder',index:0},evidence:'observed-path'},
      ...threads.map((_,index)=>({kind:'inside-git-tree' as const,subject:{kind:'thread' as const,index},target:{kind:'git' as const,index:0},evidence:'lexical-containment' as const})),
      ...Array.from({length:10},()=>({kind:'inside-git-tree' as const,subject:{kind:'thread' as const,index:0},target:{kind:'git' as const,index:0},evidence:'lexical-containment' as const}))]}};
  const before=JSON.stringify(d),ui=await browser(d);action(ui.get('relationships'),'Repository').onclick!();
  assert.ok(texts(ui.get('details')).includes('Git metadata folder'));assert.equal(texts(ui.get('details')).includes('Common Git directory'),false);
  action(ui.get('details'),'Inspect evidence').onclick!();assert.ok(texts(ui.get('relationships')).includes('Technical evidence — atlas (Main repository)'));
  const grouped=all(ui.get('relationships')).find(e=>e.className==='relationship-summary'&&e.children[0]?.textContent.startsWith('Paths within Git working tree'))!;
  assert.ok(normalTexts(grouped).includes('60 related entities · 70 observations'));assert.equal(texts(grouped).some(s=>s.includes('thread:59')),false);
  const row='Thread Atlas → Main repository '+path;assert.equal(normalTexts(grouped).filter(s=>s===row).length,1);
  const raw=all(grouped).filter(e=>e.className==='evidence-group'&&e.children[0]?.textContent.startsWith('Exact relationship evidence'));assert.equal(raw.length,1);assert.equal(raw[0]!.open,false);
  assert.equal(texts(raw[0]!).some(s=>s.startsWith('inside-git-tree ·')),false);
  const expandAll=action(ui.get('relationships'),'Expand all'),collapseAll=action(ui.get('relationships'),'Collapse all');
  for(const control of [expandAll,collapseAll]){assert.equal(control.tag,'button');assert.equal(control.attributes['aria-controls'],'diagnostic-content');}
  expandAll.focus();expandAll.onclick!();assert.equal(expandAll.focused,1);
  assert.ok(all(ui.get('relationships')).filter(e=>e.className==='evidence-group').every(e=>e.open));
  assert.ok(all(ui.get('relationships')).filter(e=>e.tag==='details').every(e=>e.open));
  assert.equal(texts(raw[0]!).filter(s=>s.startsWith('inside-git-tree ·')).length,25);
  collapseAll.focus();collapseAll.onclick!();assert.equal(collapseAll.focused,1);assert.equal(raw[0]!.open,false);
  assert.ok(all(ui.get('relationships')).filter(e=>e.tag==='details').every(e=>!e.open));
  assert.equal(normalTexts(grouped).filter(s=>s===row).length,1);expandAll.onclick!();assert.equal(texts(raw[0]!).filter(s=>s.startsWith('inside-git-tree ·')).length,25);
  action(raw[0]!,'Show all remaining (45)').onclick!();assert.equal(texts(raw[0]!).filter(s=>s.startsWith('inside-git-tree ·')).length,70);
  assert.equal(raw[0]!.children.at(-1)!.focused,1);assert.ok(all(raw[0]!).some(e=>e.attributes.role==='status'&&e.textContent==='70 entries shown of 70'));
  assert.ok(texts(raw[0]!).includes('inside-git-tree · lexical-containment · thread:59 → git:0'));
  assert.equal(texts(raw[0]!).filter(s=>s==='inside-git-tree · lexical-containment · thread:0 → git:0').length,11);
  assert.equal(all(raw[0]!).filter(e=>e.className==='evidence-group').length,1);
  ui.get('workspace').onclick!();action(ui.get('relationships'),'Atlas').onclick!();action(ui.get('details'),'Inspect evidence').onclick!();expandRelations(ui.get('relationships'));
  assert.ok(texts(ui.get('relationships')).includes('Project Atlas → Folder '+path));assert.equal(ui.groups().length,0);assert.equal(JSON.stringify(d),before);
  assert.ok(normalTexts(ui.get('relationships')).includes('1 related entity · 1 observation'));
  assert.equal(texts(ui.get('relationships')).some(s=>s.includes('1 observations')),false);
  for(const selected of [{kind:'git',index:0},{kind:'project',index:0},{kind:'thread',index:0},{kind:'location',path}]){
    const refs=diagnosticRelationGroups(d,selected).flatMap(group=>group.rows.flatMap(row=>row.related));
    for(const own of selected.kind==='location'?['folder:0','location:0']:[selected.kind+':0'])assert.equal(refs.includes(own),false);
    assert.ok(refs.length);
  }
  ui.events.get('keydown')!({key:'Escape'});assert.equal(ui.get('details').hidden,false);assert.equal(ui.groups().length,1);assert.ok(ui.get('details-heading').focused);
  const unique=await browser({...d,threads:threads.map((t,i)=>({...t,title:'Distinct '+i}))});action(unique.get('relationships'),'Repository').onclick!();action(unique.get('details'),'Inspect evidence').onclick!();
  const many=all(unique.get('relationships')).find(e=>e.className==='relationship-summary'&&e.children[0]?.textContent.startsWith('Paths within Git working tree'))!;
  assert.equal(normalTexts(many).filter(s=>s.startsWith('Thread Distinct ')).length,25);
  action(many,'Show all remaining (35)').onclick!();assert.equal(normalTexts(many).filter(s=>s.startsWith('Thread Distinct ')).length,60);
  assert.equal(texts(many).some(s=>s.startsWith('inside-git-tree ·')),false);
});

test('Details explain membership evidence without changing assignment or shared-location grouping',async()=>{
  const assigned=thread(1),free=thread(2),unknown=thread(3),conflict=thread(4),dangling=thread(5),remote=thread(6);
  const d=model([assigned,free,unknown,conflict,dangling,remote],[{id:'p',label:'Atlas',roots:[assigned.cwd!]}],
    [{threadId:assigned.id,projectId:'p',projectKind:'local'},{threadId:conflict.id,projectId:'p',projectKind:'local'},
      {threadId:dangling.id,projectId:'missing',projectKind:'local'},{threadId:remote.id,projectId:'p',projectKind:'remote'}],[free.id,conflict.id]);
  const before=JSON.stringify(d),groups=workspacePresentation(d),ui=await browser(d);
  for(const [t,explanation] of [
    [assigned,null],[free,'No Project assigned.'],[unknown,'Project membership is unknown.'],
    [conflict,'Project membership is conflicting.'],[dangling,'The assigned Project is unavailable.'],
    [remote,'Project membership is unknown.']] as const){
    action(ui.get('relationships'),t.title!).onclick!();if(explanation)assert.ok(normalTexts(ui.get('details')).includes(explanation));
    assert.ok(normalTexts(ui.get('details')).includes('Working folder'));
    assert.equal(normalTexts(ui.get('details')).includes('Stored working directory'),false);
  }
  action(ui.get('relationships'),free.title!).onclick!();
  assert.ok(normalTexts(ui.get('details')).includes('This folder is also declared by Atlas. Folder sharing does not establish Project membership.'));
  assert.equal(texts(ui.get('details')).includes('Atlas →'),false);
  assert.deepEqual(d.memberships,['stored-assignment','projectless','no-assignment-observed','conflicting','dangling','unknown']);
  assert.deepEqual(workspacePresentation(d),groups);assert.equal(JSON.stringify(d),before);
  assert.deepEqual(ui.groups().map(g=>g.attributes['data-workspace-group']),['1']);

  const unavailable={...d,coverage:{...d.coverage,projects:'unavailable' as const,correspondence:'unknown' as const},
    memberships:d.memberships.map(()=> 'unknown' as const),relations:d.relations.filter(r=>r.kind!=='assigned-project')};
  const other=await browser(unavailable);action(other.get('relationships'),unknown.title!).onclick!();
  assert.ok(normalTexts(other.get('details')).includes('Project membership is unknown.'));action(other.get('details'),'Inspect evidence').onclick!();
  assert.ok(texts(other.get('relationships')).some(s=>s.includes('insufficient to establish membership')));
  assert.equal(texts(other.get('details')).includes('No assignment was observed; Project membership remains unknown.'),false);
});

test('Folder Details distinguish declarers and CWD reporters across shared Windows aliases',async()=>{
  const root='C:\\Synthetic\\atlas',alias='\\\\?\\C:\\SYNTHETIC\\ATLAS',assigned=thread(1),free=thread(2,{cwd:alias});
  const d=model([assigned,free],[{id:'p',label:'Atlas',roots:[root,alias]},{id:'q',label:'Other',roots:[alias]}],
    [{threadId:assigned.id,projectId:'p',projectKind:'local'}],[free.id]),before=JSON.stringify(d),ui=await browser(d);
  const folder=all(ui.get('relationships')).find(e=>e.className==='location-row')!;
  action(folder,'atlas').onclick!();const detail=texts(ui.get('details'));
  assert.ok(detail.includes('Shared Source folder for Atlas, Other.'));assert.ok(detail.includes('Folder sharing does not establish Project membership.'));
  assert.equal(detail.includes('Projects declaring this folder'),false);assert.equal(detail.some(v=>v.includes('qualifying Threads report')),false);
  action(ui.get('details'),'Inspect evidence').onclick!();
  expandRelations(ui.get('relationships'));assert.ok(texts(ui.get('relationships')).some(s=>s.includes('Project Atlas → Folder')));assert.ok(texts(ui.get('relationships')).some(s=>s.includes('Thread Thread name 2 → Folder')));
  ui.get('workspace').onclick!();
  assert.equal(all(ui.get('relationships')).filter(e=>e.className==='location-row').length,1);assert.equal(JSON.stringify(d),before);
});

test('Thread Details compare all Source folders while preserving assignment and unavailable-root uncertainty',async()=>{
  const roots=['C:\\Synthetic\\first','C:\\Synthetic\\second'],a=thread(1,{cwd:roots[1]!}),b=thread(2,{cwd:'C:\\Synthetic\\scratch'}),c=thread(3);
  const d=model([a,b,c],[{id:'p',label:'Atlas',roots},{id:'empty',label:'No roots',roots:[]},{id:'unused',label:'Unused',roots:[]}],
    [{threadId:a.id,projectId:'p',projectKind:'local'},{threadId:b.id,projectId:'p',projectKind:'local'},{threadId:c.id,projectId:'empty',projectKind:'local'}]);
  const before=JSON.stringify(d),ui=await browser(d);
  action(ui.get('relationships'),a.title!).onclick!();assert.equal(normalTexts(ui.get('details')).some(v=>v.includes('matches a Source')),false);
  assert.equal(texts(ui.get('details')).some(v=>v.includes('differs from all')),false);
  action(ui.get('relationships'),b.title!).onclick!();assert.ok(normalTexts(ui.get('details')).includes("Working folder differs from Atlas's Source folders."));
  action(ui.get('relationships'),c.title!).onclick!();assert.equal(texts(ui.get('details')).some(v=>v.includes('differs from all')),false);
  action(ui.get('relationships'),'Atlas').onclick!();assert.equal(normalTexts(ui.get('details')).filter(v=>v==='Source folder').length,2);assert.equal(texts(ui.get('details')).some(v=>v.includes('declares this')),false);
  action(ui.get('relationships'),'Unused').onclick!();assert.equal(texts(ui.get('details')).includes('No qualifying assigned Threads observed'),false);assert.ok(texts(ui.get('relationships')).includes('No qualifying assigned Threads observed'));
  assert.equal(texts(ui.get('relationships')).includes('No current Threads'),false);assert.equal(JSON.stringify(d),before);
});

test('relationship explanations keep arbitrary Project labels inert and private title fallbacks absent',async()=>{
  const label='<img onerror=alert(1)>\u202e',marker='PRIVATE_BOUNDARY_TITLE',t=thread(1,{title:marker,titleSource:'sqlite',titleResolution:'missing'});
  const d=model([t],[{id:'p',label,roots:[t.cwd!]}],[{threadId:t.id,projectId:'p',projectKind:'local'}]),ui=await browser(d);
  action(ui.get('relationships'),'Thread 00000000').onclick!();
  action(ui.get('details'),'Inspect evidence').onclick!();expandRelations(ui.get('relationships'));assert.ok(texts(ui.get('relationships')).some(s=>s.includes('→ Project <img onerror=alert(1)>\\u{202e}')));
  assert.ok(texts(ui.get('relationships')).some(s=>s.startsWith('Thread 00000000 → Folder ')));
  assert.equal(texts(ui.get('relationships')).some(s=>s.includes('Thread Thread 00000000')),false);
  assert.equal(all(ui.get('details')).some(e=>e.tag==='img'),false);assert.equal(JSON.stringify([...ui.elements.values()]).includes(marker),false);
});

test('hidden stored CWD claims do not imply additional qualifying Threads in Details',async()=>{
  const visible=thread(1),p={id:'p',label:'Atlas',roots:[visible.cwd!]};
  for(const hidden of [thread(2,{archived:true}),thread(3,{sourceState:'subagent'}),thread(4)]){
    const d=model([visible,hidden],[p],[{threadId:visible.id,projectId:'p',projectKind:'local'}]),before=JSON.stringify(d),groups=workspacePresentation(d);
    assert.ok(d.relations.some(r=>r.kind==='shares-exact-cwd'&&r.subject===0));
    assert.equal(d.visibility[0],'inferred');assert.notEqual(d.visibility[1],'inferred');
    assert.deepEqual(groups[0]!.threads,[0]);const ui=await browser(d);
    action(ui.get('relationships'),visible.title!).onclick!();
    assert.equal(texts(ui.get('details')).some(v=>/Other Threads|qualifying Threads report/.test(v)),false);
    action(ui.get('relationships'),'atlas').onclick!();
    assert.equal(normalTexts(ui.get('details')).some(v=>v.includes('qualifying Thread reports')),false);
    assert.equal(texts(ui.get('details')).includes('Sharing this folder does not establish Project membership.'),false);
    assert.deepEqual(workspacePresentation(d),groups);assert.equal(JSON.stringify(d),before);
  }
});

test('two qualifying CWD reporters retain consistent counts in technical evidence without normal Details repetition',async()=>{
  for(const cwd of ['C:\\Synthetic\\atlas','\\\\?\\C:\\SYNTHETIC\\ATLAS']){
    const a=thread(1),b=thread(2,{cwd}),p={id:'p',label:'Atlas',roots:[a.cwd!]};
    const d=model([a,b],[p],[a,b].map(t=>({threadId:t.id,projectId:'p',projectKind:'local'}))),before=JSON.stringify(d),groups=workspacePresentation(d),ui=await browser(d);
    for(const t of [a,b]){
      action(ui.get('relationships'),t.title!).onclick!();
      assert.equal(normalTexts(ui.get('details')).some(v=>v.includes('qualifying Threads report')),false);
      action(ui.get('details'),'Inspect evidence').onclick!();expandRelations(ui.get('relationships'));assert.ok(texts(ui.get('relationships')).some(s=>s.includes('Shared stored working folders')||s.includes('Reported working folders')));ui.get('workspace').onclick!();
      assert.equal(texts(ui.get('details')).includes('Matching a Source folder does not establish Project membership.'),false);
    }
    action(ui.get('relationships'),'atlas').onclick!();
    action(ui.get('details'),'Inspect evidence').onclick!();expandRelations(ui.get('relationships'));assert.ok(texts(ui.get('relationships')).some(s=>s.includes('Shared stored working folders')||s.includes('Reported working folders')));ui.get('workspace').onclick!();
    assert.equal(texts(ui.get('details')).includes('Sharing this folder does not establish Project membership.'),false);
    assert.deepEqual(workspacePresentation(d),groups);assert.equal(JSON.stringify(d),before);
  }
});

test('a single assigned Thread at its own Source folder needs no membership caveats',async()=>{
  const t=thread(1),d=model([t],[{id:'p',label:'Atlas',roots:[t.cwd!]}],[{threadId:t.id,projectId:'p',projectKind:'local'}]),before=JSON.stringify(d),ui=await browser(d);
  action(ui.get('relationships'),t.title!).onclick!();
  assert.equal(texts(ui.get('details')).some(v=>/Stored assignment|matches a Source folder/.test(v)),false);
  assert.equal(texts(ui.get('details')).some(v=>/does not establish Project membership|qualifying Threads report/.test(v)),false);
  action(ui.get('relationships'),'atlas').onclick!();
  assert.equal(texts(ui.get('details')).some(v=>v.includes('qualifying Thread reports')),false);
  assert.equal(texts(ui.get('details')).some(v=>v.includes('does not establish Project membership')),false);
  assert.ok(normalTexts(ui.get('details')).includes('Folder'));assert.equal(normalTexts(ui.get('details')).includes('Thread'),false);
  action(ui.get('relationships'),'Atlas').onclick!();assert.ok(normalTexts(ui.get('details')).includes('Project'));
  assert.equal(normalTexts(ui.get('details')).includes('Thread ID'),false);const technical=all(ui.get('details')).find(e=>e.className==='technical-information')!;
  assert.equal(technical.open,false);assert.ok(texts(technical).includes('Project ID'));assert.ok(copyAction(technical,'Copy Project ID'));
  assert.equal(all(ui.get('details')).some(e=>e.onclick&&/View folder|View repository|Thread name/.test(e.textContent)),false);
  assert.equal(JSON.stringify(d),before);
});

test('matching caveats remain for unresolved membership and clear cross-Project associations',async()=>{
  const a=thread(1),root=a.cwd!,p={id:'p',label:'Atlas',roots:[root]},q={id:'q',label:'Other',roots:[root]};
  for(const kind of ['projectless','unknown','conflicting','cross-project'] as const){
    const assignments=kind==='conflicting'||kind==='cross-project'?[{threadId:a.id,projectId:'p',projectKind:'local'}]:[];
    const d=model([a],kind==='cross-project'?[p,q]:[p],assignments,kind==='projectless'||kind==='conflicting'?[a.id]:[]),before=JSON.stringify(d),ui=await browser(d);
    action(ui.get('relationships'),a.title!).onclick!();
    assert.ok(normalTexts(ui.get('details')).some(v=>v.includes('Folder sharing does not establish Project membership.')));
    if(kind==='projectless'||kind==='cross-project'){
      action(ui.get('relationships'),'atlas').onclick!();
      assert.ok(texts(ui.get('details')).includes('Folder sharing does not establish Project membership.'));
    }
    assert.equal(JSON.stringify(d),before);
  }
  // Two clear assignments to different Projects remain distinct despite one shared CWD.
  const b=thread(2),d=model([a,b],[p,q],[{threadId:a.id,projectId:'p',projectKind:'local'},{threadId:b.id,projectId:'q',projectKind:'local'}]),before=JSON.stringify(d),ui=await browser(d);
  action(ui.get('relationships'),a.title!).onclick!();action(ui.get('relationships'),'atlas').onclick!();
  assert.ok(texts(ui.get('details')).includes('Folder sharing does not establish Project membership.'));
  assert.deepEqual(d.memberships,['stored-assignment','stored-assignment']);assert.equal(JSON.stringify(d),before);
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
  const tree=ui.groups()[0]!.children.find(e=>e.className==='relationship-tree')!,sources=tree.children.find(e=>e.className==='source-folders')!;
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
  const nodes=all(ui.get('relationships')),project=nodes.find(e=>e.className==='project-block')!,sources=ui.groups()[0]!.children.find(e=>e.className==='relationship-tree')!.children.filter(e=>e.className==='source-folders');
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
  ui.get('diagnostics').onclick!();expand(all(ui.get('relationships')).find(e=>e.children[0]?.textContent==='Discovery warnings')!);assert.ok(texts(ui.get('relationships')).includes(path+' · depth-limit'));assert.ok(texts(ui.get('relationships')).some(t=>t.startsWith('limited ·')));
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
