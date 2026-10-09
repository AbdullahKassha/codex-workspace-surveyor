import { locationKey, windowsPathKey } from './model.js';
// No observed values are interpolated into HTML or executable source.
export function threadLink(id:string):string|null {
  return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)?'codex://threads/'+encodeURIComponent(id):null;
}
export function displayTitle(t:{title:string|null;titleSource?:string}):string {
  const value=t.title||'';
  // A bounded stored-title presentation rule, not a new source or navigation target.
  // Desktop's exact-ID metadata can contain simple Markdown skill links.
  return t.titleSource==='session-index'?value:value.replace(/(?<!!)\[([^\]\r\n]+)\]\((?:[^()\r\n]|\\[()])*\)/g,'$1');
}
export function escapeStored(value:string):string {
  return [...value].map(c=>{const n=c.codePointAt(0)!;return n<32||(n>=127&&n<=159)||/\p{Cf}/u.test(c)||(n>=0xd800&&n<=0xdfff)||
    (n>=0x202a&&n<=0x202e)||(n>=0x2066&&n<=0x2069)||n===0x200e||n===0x200f||n===0x061c||
    n===0x2028||n===0x2029 ? `\\u{${n.toString(16)}}` : c==='\\' ? '\\\\' : c;}).join('');
}
export const clientCode = `
const escapeStored=${escapeStored.toString()};
const windowsPathKey=${windowsPathKey.toString()};
const locationKey=${locationKey.toString()};
const threadLink=${threadLink.toString()};
const displayTitle=${displayTitle.toString()};
const token=location.hash.slice(1);history.replaceState(null,'',location.pathname);
let data=null,view='workspace',query='',closed=false;
const snapshotLoad=new AbortController();
const byId=id=>document.getElementById(id);
const text=(tag,value,className)=>{const e=document.createElement(tag);e.textContent=escapeStored(String(value));if(className)e.className=className;return e;};
const label=t=>{const compact=displayTitle(t).replace(/\\s+/gu,' ').trim();if(!compact)return 'Untitled record [title unavailable]';const chars=[...compact];return chars.slice(0,120).join('')+(t.titleState==='shortened'?' … [shortened]':chars.length>120?' … [preview]':'');};
const locationLabel=p=>p.split(/[\\\\/]/).filter(Boolean).at(-1)||p;
const matches=t=>!query||displayTitle(t).toLocaleLowerCase().includes(query)||(t.cwd||'').toLocaleLowerCase().includes(query);
function details(index){
 if(closed||!data)return;
 const t=data.threads[index],panel=byId('details');panel.replaceChildren(text('h2',label(t)));
 for(const [name,value] of [['Visibility',data.visibility[index]],['Title source',t.titleSource||'sqlite'],['Index resolution',t.titleResolution||'unavailable'],['Title metadata updated',t.titleUpdatedAt||'Unavailable'],['Title display',t.titleState||'complete'],['Record ID',t.id],['Exact stored CWD',t.cwd??'Unavailable'],['Membership evidence',data.memberships[index]],
 ['Identity',t.ambiguous?'Ambiguous duplicate ID — claims preserved':'Source-local opaque ID; UI visibility unknown'],
 ['Source namespace',data.provenance.namespace],['Project namespace',data.projectNamespace],['Acquisition interval',data.provenance.from+' → '+data.provenance.through]]){
  panel.append(text('h3',name),text('p',value,'exact'));
 }
 const technical=document.createElement('details');technical.append(text('summary','Bounded title metadata'),text('p',t.title||'Unavailable','exact'));
 if(displayTitle(t)!==(t.title||''))panel.append(text('p','Display uses inline-link labels from the SQLite fallback title; links are not followed. Raw metadata is below.','muted'));
 if(t.titleSource==='session-index'&&t.storedTitle&&t.storedTitle!==t.title)technical.append(text('h3','SQLite title preview (fallback metadata)'),text('p',t.storedTitle,'exact'));
 panel.append(technical);
 const assignments=data.assignments.filter(a=>a.threadId===t.id);
 for(const a of assignments){panel.append(text('h3','Stored assignment reference'),text('p',a.projectId,'exact'));}
 const roots=data.relations.filter(r=>['matches-exact-root','matches-normalized-root'].includes(r.kind)&&r.subject===index).map(r=>data.projects[r.target].label||'Unnamed Project');
 panel.append(text('h3','Location matches (derived, not membership)'),text('p',roots.length?roots.join(' · '):'No comparable root match observed'));
 const assigned=data.relations.find(r=>r.kind==='assigned-project'&&r.subject===index);
 if(assigned&&t.cwd&&!data.projects[assigned.target].roots.some(root=>locationKey(root)===locationKey(t.cwd)))panel.append(text('p','Assigned Project roots and stored CWD differ; physical relationship is uninspected.','warning'));
 const href=threadLink(t.id);if(href&&data.visibility[index]==='inferred'){const a=text('a','Open Thread in Codex');a.href=href;panel.append(a);}
 panel.append(text('p','Visibility is inferred from metadata, not confirmed by this browser. No stored path is followed; filesystem and runtime CWD remain uninspected.','muted'));
}
function record(t,i){const b=text('button',label(t),'record');b.type='button';
 const assigned=data.relations.find(r=>r.kind==='assigned-project'&&r.subject===i);
 b.append(text('small',data.visibility[i]+' · '+data.memberships[i]+(assigned?' · '+(data.projects[assigned.target].label||'Unnamed Project'):'')+(t.ambiguous?' · ambiguous ID':'')+' · title: '+(t.titleSource||'sqlite')));b.onclick=()=>details(i);return b;}
function group(parent,cwd,indexes){
 const block=document.createElement('section');block.className='group';block.append(text('h3',cwd===null?'Working directory unavailable':locationLabel(cwd)),text('p',cwd??'No usable stored CWD','exact muted'));
 const visible=indexes.filter(i=>matches(data.threads[i]));if(!visible.length&&query)return;
 block.append(text('small',visible.length+' Threads · lexical location group; original CWDs in details'));
 visible.forEach(i=>block.append(record(data.threads[i],i)));parent.append(block);
}
function grouped(parent,indexes){
 const groups=new Map();for(const i of indexes){const cwd=data.threads[i].cwd,key=cwd===null?'missing:'+i:locationKey(cwd);let g=groups.get(key);if(!g){g={cwd,indexes:[]};groups.set(key,g);}g.indexes.push(i);}
 for(const g of groups.values())group(parent,g.cwd,g.indexes);
}
function projectCard(p,pi){
 const section=document.createElement('section');section.className='project';section.append(text('h2',p.label||'Unnamed Project'),text('small','Registry Project · inferred current · declared roots, filesystem uninspected'));
 p.roots.forEach(root=>section.append(text('p',root,'exact')));
 const assigned=data.relations.filter(r=>r.kind==='assigned-project'&&r.target===pi&&data.visibility[r.subject]==='inferred');
 const unknown=data.threads.filter((t,i)=>data.visibility[i]==='unknown'&&data.assignments.some(a=>a.threadId===t.id&&a.projectId===p.id&&a.projectKind==='local')).length;
 section.append(text('p',assigned.length?assigned.length+' inferred current Threads assigned': 'No current Threads observed; not proof of emptiness.','muted'));
 if(unknown)section.append(text('p',unknown+' unclassified related records — see Unclassified.','warning'));
 return section;
}
function render(){
 if(closed||!data)return;const list=byId('relationships');list.replaceChildren();
 byId('locations').ariaPressed=String(view==='locations');byId('projects').ariaPressed=String(view==='projects');
 byId('workspace').ariaPressed=String(view==='workspace');
 const ordinary=data.threads.flatMap((t,i)=>data.visibility[i]==='inferred'?[i]:[]);
 if(data.coverage.projects==='unavailable')list.append(text('p','Local Project data unavailable; membership and visibility may remain unknown. See Unclassified for retained records.','warning'));
 if(view==='locations'){
  grouped(list,ordinary);
 }else if(view==='workspace'){
  data.components.forEach((c,ci)=>{
   const projectMatch=c.projects.some(i=>[data.projects[i].label,...data.projects[i].roots].some(v=>(v||'').toLocaleLowerCase().includes(query)));
   if(query&&!projectMatch&&!c.threads.some(i=>matches(data.threads[i])))return;
   const block=document.createElement('section');block.className='component';block.append(text('h2','Workspace group '+(ci+1)),text('small','Connected by assignments or comparable stored locations; location matches do not assign Projects.'));
   c.projects.forEach(pi=>block.append(projectCard(data.projects[pi],pi)));grouped(block,c.threads);list.append(block);
  });
 }else{
  data.projects.forEach((p,pi)=>{const section=projectCard(p,pi);grouped(section,data.relations.filter(r=>r.kind==='assigned-project'&&r.target===pi&&data.visibility[r.subject]==='inferred').map(r=>r.subject));list.append(section);});
  const projectless=ordinary.filter(i=>data.memberships[i]==='projectless');if(projectless.length){list.append(text('h2','Explicitly projectless'));grouped(list,projectless);}
 }
 const unknown=data.threads.flatMap((t,i)=>data.visibility[i]==='unknown'?[i]:[]);
 const unclassified=document.createElement('details');unclassified.append(text('summary','Unclassified / unknown membership ('+unknown.length+')'));grouped(unclassified,unknown);list.append(unclassified);
 const hidden=data.threads.flatMap((t,i)=>['internal','archived'].includes(data.visibility[i])?[i]:[]);
 const diagnostic=document.createElement('details');diagnostic.append(text('summary','Diagnostics ('+hidden.length+' internal/archived records; '+data.danglingAssignments+' dangling assignments; '+data.staleProjectless+' stale projectless references)'));
 grouped(diagnostic,hidden);
 data.assignments.filter(a=>!data.threads.some(t=>t.id===a.threadId)||a.projectKind!=='local'||!data.projects.some(p=>p.id===a.projectId)).forEach(a=>diagnostic.append(text('p',a.threadId+' → '+a.projectId+' · '+(a.projectKind||'unknown kind'),'exact')));
 list.append(diagnostic);
 if(!data.threads.length&&!data.projects.length)list.append(text('p','No entities in this selected snapshot. Coverage remains limited to the selected sources.'));
 if(!list.childElementCount)list.append(text('p','No matching record claims in this selected copy.'));
}
function closeLocal(){
 if(closed)return false;closed=true;snapshotLoad.abort();
 data=null;byId('relationships').replaceChildren();byId('details').replaceChildren();byId('coverage').textContent='Session closed; browser memory is not a secure-erasure guarantee.';
 return true;
}
async function closeView(){
 if(!closeLocal())return;
 // Best effort across page exit; server expiry remains the fallback.
 try{await fetch('/close',{method:'POST',headers:{'X-Surveyor-Session':token},cache:'no-store',keepalive:true});}catch{};
}
byId('locations').onclick=()=>{view='locations';render();};byId('projects').onclick=()=>{view='projects';render();};
byId('workspace').onclick=()=>{view='workspace';render();};
byId('search').oninput=e=>{query=e.target.value.toLocaleLowerCase();render();};byId('close').onclick=closeView;
addEventListener('pagehide',()=>{void closeView();});
(async()=>{try{
 const response=await fetch('/snapshot',{headers:{'X-Surveyor-Session':token},cache:'no-store',signal:snapshotLoad.signal});if(closed)return;if(!response.ok)throw 0;
 const loaded=await response.json();if(closed)return;data=loaded;const c=data.coverage;
 byId('coverage').textContent=c.rowsRead+' rows traversed in selected table · '+data.threads.length+' retained claims · '+c.omittedRows+' omissions · '+c.ambiguousIds+' ambiguous IDs · '+data.danglingAssignments+' dangling references · titles '+c.titles+' · '+(c.shortenedTitles||0)+' shortened titles · '+(c.unavailableTitles||0)+' unavailable titles · Projects '+c.projects+' · unconsumed columns '+c.unconsumedColumns;
 if(c.sessionIndex){const s=c.sessionIndex;byId('coverage').textContent+=' · title index '+s.status+' · '+s.enriched+' enriched · '+s.duplicates+' duplicate records · '+s.conflicts+' conflicts · '+s.invalidRecords+' invalid records · '+s.unmatchedIds+' unmatched IDs (no Threads created)';}
 byId('limitations').replaceChildren(...data.limitations.map(v=>text('p',v)));
 byId('notice').textContent=(data.provenance.namespace.startsWith('synthetic-')?'INVENTED demonstration. ':'Local snapshot. ')+'Metadata-inferred relationships; no filesystem inspection or automatic actions.';
 render();
 }catch{if(!closed)byId('coverage').textContent='Dataset unavailable or local session refused.';}})();
`;
export const explorerHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Workspace Surveyor</title><link rel="stylesheet" href="/style.css"></head><body>
<header><div class="brand">Workspace Surveyor <span>for Codex</span></div><button id="close">Close local session</button></header>
<main><p id="notice" class="warning">Local snapshot · read-only · no filesystem actions</p><h1>Understand where your threads belong</h1><p class="muted">Stored assignments and locations, with uncertainty kept visible.</p>
<p id="coverage" role="status">Loading selected snapshot…</p><nav><button id="workspace" aria-pressed="true">Workspace</button><button id="locations" aria-pressed="false">Locations</button><button id="projects" aria-pressed="false">Projects</button><label>Search titles or locations <input id="search" type="search" autocomplete="off" placeholder="Find a thread or stored location"></label></nav>
<div class="layout"><div id="relationships"></div><aside id="details"><h2>Record details</h2><p>Select a titled record to inspect its evidence.</p></aside></div><footer id="limitations"></footer></main><script src="/client.js" defer></script></body></html>`;
export const explorerCss = `.component{border-left:3px solid #72c7b8;padding:8px 0 8px 18px;margin:24px 0 36px}summary{cursor:pointer;padding:16px 0;color:#a2b5c6}details{border-top:1px solid #32404c}a{color:#82dacf}:root{font-family:system-ui,sans-serif;color:#e4e9ef;background:#111820;color-scheme:dark}*{box-sizing:border-box}body{margin:0}header{display:flex;justify-content:space-between;align-items:center;padding:20px 5%;border-bottom:1px solid #32404c}.brand{font-size:20px;font-weight:650}.brand span{font-weight:400;font-size:13px;color:#a2b5c6}main{max-width:1280px;margin:auto;padding:28px 36px}h1{font-size:30px;margin:16px 0 8px}h2{font-size:20px}h3{font-size:16px;margin-bottom:6px}.muted,small{color:#a2b5c6}.warning{color:#ffd68c}.exact{white-space:pre-wrap;overflow-wrap:anywhere;unicode-bidi:isolate;direction:ltr;font-family:ui-monospace,monospace;font-size:13px}nav{display:flex;gap:10px;flex-wrap:wrap;margin:24px 0}button,input{font:inherit;border:1px solid #415466;border-radius:8px;padding:10px 14px;background:#1d2b38;color:inherit}button{cursor:pointer}button:hover,button[aria-pressed=true]{background:#29534d;border-color:#72c7b8}label{display:flex;align-items:center;gap:12px;margin-left:auto;font-size:13px}input{width:290px}.layout{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(280px,1fr);gap:24px}.group,.project,aside{border:1px solid #32404c;border-radius:12px;padding:20px;margin-bottom:16px;background:#17212c}.record{display:block;width:100%;text-align:left;margin-top:10px;white-space:pre-wrap;overflow-wrap:anywhere;unicode-bidi:isolate;direction:ltr}.record small{display:block;margin-top:5px;font-size:12px}aside{align-self:start;position:sticky;top:20px}aside h3{color:#a2b5c6;font-size:12px}footer{font-size:12px;color:#a2b5c6;margin-top:25px}@media(max-width:800px){main{padding:20px}.layout{grid-template-columns:1fr}aside{position:static}label{margin-left:0}input{width:200px}}`;
