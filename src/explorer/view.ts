// No observed values are interpolated into HTML or executable source.
export function escapeStored(value:string):string {
  return [...value].map(c=>{const n=c.codePointAt(0)!;return n<32||(n>=127&&n<=159)||/\p{Cf}/u.test(c)||(n>=0xd800&&n<=0xdfff)||
    (n>=0x202a&&n<=0x202e)||(n>=0x2066&&n<=0x2069)||n===0x200e||n===0x200f||n===0x061c||
    n===0x2028||n===0x2029 ? `\\u{${n.toString(16)}}` : c==='\\' ? '\\\\' : c;}).join('');
}
export const clientCode = `
const escapeStored=${escapeStored.toString()};
const token=location.hash.slice(1);history.replaceState(null,'',location.pathname);
let data=null,view='locations',query='',closed=false;
const snapshotLoad=new AbortController();
const byId=id=>document.getElementById(id);
const text=(tag,value,className)=>{const e=document.createElement(tag);e.textContent=escapeStored(String(value));if(className)e.className=className;return e;};
const label=t=>t.title?(t.titleState==='shortened'?t.title+' … [shortened]':t.title):'Untitled record [title unavailable]';
const locationLabel=p=>p.split(/[\\\\/]/).filter(Boolean).at(-1)||p;
const matches=t=>!query||label(t).toLocaleLowerCase().includes(query)||t.cwd.toLocaleLowerCase().includes(query);
function details(index){
 if(closed||!data)return;
 const t=data.threads[index],panel=byId('details');panel.replaceChildren(text('h2',label(t)));
 for(const [name,value] of [['Title display',t.titleState||'complete'],['Record ID',t.id],['Exact stored CWD',t.cwd],['Membership evidence',data.memberships[index]],
 ['Identity',t.ambiguous?'Ambiguous duplicate ID — claims preserved':'Source-local opaque ID; UI visibility unknown'],
 ['Source namespace',data.provenance.namespace],['Project namespace',data.projectNamespace],['Acquisition interval',data.provenance.from+' → '+data.provenance.through]]){
  panel.append(text('h3',name),text('p',value,'exact'));
 }
 const assignments=data.assignments.filter(a=>a.threadId===t.id);
 for(const a of assignments){panel.append(text('h3','Stored assignment reference'),text('p',a.projectId,'exact'));}
 const roots=data.relations.filter(r=>r.kind==='matches-exact-root'&&r.subject===index).map(r=>data.projects[r.target].label||'Unnamed Project');
 panel.append(text('h3','Exact root matches (derived, not membership)'),text('p',roots.length?roots.join(' · '):'No exact-string root match observed'));
 const assigned=data.relations.find(r=>r.kind==='assigned-project'&&r.subject===index);
 if(assigned&&!data.projects[assigned.target].roots.includes(t.cwd))panel.append(text('p','Assigned Project roots and stored CWD differ as strings; physical relationship is uninspected.','warning'));
 panel.append(text('p','No stored path is followed. Repository, worktree, runtime CWD and classification remain unknown.','muted'));
}
function record(t,i){const b=text('button',label(t),'record');b.type='button';b.append(text('small',data.memberships[i]+(t.ambiguous?' · ambiguous ID':'')));b.onclick=()=>details(i);return b;}
function group(parent,cwd,indexes){
 const block=document.createElement('section');block.className='group';block.append(text('h3',locationLabel(cwd)),text('p',cwd,'exact muted'));
 const visible=indexes.filter(i=>matches(data.threads[i]));if(!visible.length&&query)return;
 block.append(text('small',visible.length+' record claims · exact-string group'));
 visible.forEach(i=>block.append(record(data.threads[i],i)));parent.append(block);
}
function render(){
 if(closed||!data)return;const list=byId('relationships');list.replaceChildren();
 byId('locations').ariaPressed=String(view==='locations');byId('projects').ariaPressed=String(view==='projects');
 if(view==='locations'){
  const groups=new Map();data.threads.forEach((t,i)=>{const indexes=groups.get(t.cwd)||[];indexes.push(i);groups.set(t.cwd,indexes);});
  for(const [cwd,indexes] of groups)group(list,cwd,indexes);
 }else{
  if(data.coverage.projects==='unavailable')list.append(text('p','Local Project data unavailable: current registry keys/types and cross-source correspondence are not qualified. No folders are inferred as Projects.','warning'));
  data.projects.forEach((p,pi)=>{
   const section=document.createElement('section');section.className='project';section.append(text('h2',p.label||'Unnamed Project'),text('p','Source-local Project ID: '+p.id,'exact'),text('small','Declared roots; filesystem uninspected'));
   p.roots.forEach(root=>section.append(text('p',root,'exact')));
   const assigned=data.relations.filter(r=>r.kind==='assigned-project'&&r.target===pi).map(r=>r.subject);
   const cwds=[...new Set(assigned.map(i=>data.threads[i].cwd))];cwds.forEach(cwd=>group(section,cwd,assigned.filter(i=>data.threads[i].cwd===cwd)));
   if(!assigned.length)section.append(text('p','No uniquely resolved assignments observed in this selected snapshot.','muted'));
   list.append(section);
  });
  const unresolved=data.threads.flatMap((t,i)=>data.memberships[i]!=='stored-assignment'?[i]:[]);
  if(unresolved.length){list.append(text('h2','Records without a resolved stored assignment'));
   for(const cwd of new Set(unresolved.map(i=>data.threads[i].cwd)))group(list,cwd,unresolved.filter(i=>data.threads[i].cwd===cwd));}
  const dangling=data.assignments.filter(a=>!data.threads.some(t=>t.id===a.threadId)||!data.projects.some(p=>p.id===a.projectId));
  if(dangling.length){list.append(text('h2','Dangling stored assignment references'));
   dangling.forEach(a=>list.append(text('p',a.threadId+' → '+a.projectId,'exact')));}
 }
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
byId('search').oninput=e=>{query=e.target.value.toLocaleLowerCase();render();};byId('close').onclick=closeView;
addEventListener('pagehide',()=>{void closeView();});
(async()=>{try{
 const response=await fetch('/snapshot',{headers:{'X-Surveyor-Session':token},cache:'no-store',signal:snapshotLoad.signal});if(closed)return;if(!response.ok)throw 0;
 const loaded=await response.json();if(closed)return;data=loaded;const c=data.coverage;
 byId('coverage').textContent=c.rowsRead+' rows traversed in selected table · '+data.threads.length+' retained claims · '+c.omittedRows+' omissions · '+c.ambiguousIds+' ambiguous IDs · '+data.danglingAssignments+' dangling references · titles '+c.titles+' · '+(c.shortenedTitles||0)+' shortened titles · '+(c.unavailableTitles||0)+' unavailable titles · Projects '+c.projects+' · unconsumed columns '+c.unconsumedColumns;
 byId('limitations').replaceChildren(...data.limitations.map(v=>text('p',v)));
 if(c.projects==='synthetic-qualified')byId('notice').textContent='INVENTED demonstration data. Project format is synthetic; real decoding remains unavailable.';
 render();
 }catch{if(!closed)byId('coverage').textContent='Dataset unavailable or local session refused.';}})();
`;
export const explorerHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Workspace Surveyor</title><link rel="stylesheet" href="/style.css"></head><body>
<header><div class="brand">Workspace Surveyor <span>for Codex</span></div><button id="close">Close local session</button></header>
<main><p id="notice" class="warning">Local snapshot · read-only · no filesystem actions</p><h1>Understand where your threads belong</h1><p class="muted">Stored assignments and locations, with uncertainty kept visible.</p>
<p id="coverage" role="status">Loading selected snapshot…</p><nav><button id="locations" aria-pressed="true">Locations</button><button id="projects" aria-pressed="false">Projects</button><label>Search titles or locations <input id="search" type="search" autocomplete="off" placeholder="Find a thread or stored location"></label></nav>
<div class="layout"><div id="relationships"></div><aside id="details"><h2>Record details</h2><p>Select a titled record to inspect its evidence.</p></aside></div><footer id="limitations"></footer></main><script src="/client.js" defer></script></body></html>`;
export const explorerCss = `:root{font-family:system-ui,sans-serif;color:#e4e9ef;background:#111820;color-scheme:dark}*{box-sizing:border-box}body{margin:0}header{display:flex;justify-content:space-between;align-items:center;padding:20px 5%;border-bottom:1px solid #32404c}.brand{font-size:20px;font-weight:650}.brand span{font-weight:400;font-size:13px;color:#a2b5c6}main{max-width:1280px;margin:auto;padding:28px 36px}h1{font-size:30px;margin:16px 0 8px}h2{font-size:20px}h3{font-size:16px;margin-bottom:6px}.muted,small{color:#a2b5c6}.warning{color:#ffd68c}.exact{white-space:pre-wrap;overflow-wrap:anywhere;unicode-bidi:isolate;direction:ltr;font-family:ui-monospace,monospace;font-size:13px}nav{display:flex;gap:10px;flex-wrap:wrap;margin:24px 0}button,input{font:inherit;border:1px solid #415466;border-radius:8px;padding:10px 14px;background:#1d2b38;color:inherit}button{cursor:pointer}button:hover,button[aria-pressed=true]{background:#29534d;border-color:#72c7b8}label{display:flex;align-items:center;gap:12px;margin-left:auto;font-size:13px}input{width:290px}.layout{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(280px,1fr);gap:24px}.group,.project,aside{border:1px solid #32404c;border-radius:12px;padding:20px;margin-bottom:16px;background:#17212c}.record{display:block;width:100%;text-align:left;margin-top:10px;white-space:pre-wrap;overflow-wrap:anywhere;unicode-bidi:isolate;direction:ltr}.record small{display:block;margin-top:5px;font-size:12px}aside{align-self:start;position:sticky;top:20px}aside h3{color:#a2b5c6;font-size:12px}footer{font-size:12px;color:#a2b5c6;margin-top:25px}@media(max-width:800px){main{padding:20px}.layout{grid-template-columns:1fr}aside{position:static}label{margin-left:0}input{width:200px}}`;
