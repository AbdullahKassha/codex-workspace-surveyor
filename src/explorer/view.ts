import { locationKey, windowsPathKey } from './model.js';
import { bookmarkSelection, restoreSelection } from './selection.js';
import { displayTitle, friendlyTitle, folderContains, folderCoverage, folderStatus, membershipStatus, projectThreads,
  membershipExplanation, cwdExplanations, sourceFolderExplanation, folderExplanations, gitLinkLabel, gitExplanation, instructionPresentation, instructionEntryText,
  readablePath, pathName, threadDetailsNotes, folderDetailsNotes,
  technicalHelp, diagnosticRelationGroups,
  workspaceLocations, workspacePresentation, locationPlacement, discoveryNotice, hasExpandableThreads, standaloneParent } from './presentation.js';
export { displayTitle } from './presentation.js';

export function threadLink(id:string):string|null {
  return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)?'codex://threads/'+encodeURIComponent(id):null;
}
export function escapeStored(value:string):string {
  return [...value].map(c=>{const n=c.codePointAt(0)!;return n<32||(n>=127&&n<=159)||/\p{Cf}/u.test(c)||(n>=0xd800&&n<=0xdfff)||
    (n>=0x202a&&n<=0x202e)||(n>=0x2066&&n<=0x2069)||n===0x200e||n===0x200f||n===0x061c||
    n===0x2028||n===0x2029 ? `\\u{${n.toString(16)}}` : c==='\\' ? '\\\\' : c;}).join('');
}
export function displayText(value:string):string {
  return [...value].map(c=>c==='\\'?c:escapeStored(c)).join('');
}
export function snapshotUpdatedLabel(iso:string|null,now=Date.now(),locale?:string):string {
  const date=new Date(iso??''),current=new Date(now),age=now-date.getTime();
  if(!Number.isFinite(age))return 'Last updated time unavailable';
  if(age<0)return 'Last updated time is in the future; check the local clock';
  const today=date.getFullYear()===current.getFullYear()&&date.getMonth()===current.getMonth()&&date.getDate()===current.getDate();
  const when=today?'today at '+new Intl.DateTimeFormat(locale,{hour:'numeric',minute:'2-digit'}).format(date):
    new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short'}).format(date);
  const relative=age<60000?'just now':new Intl.RelativeTimeFormat(locale,{numeric:'always'}).format(
    -Math.floor(age/(age<3600000?60000:age<86400000?3600000:86400000)),age<3600000?'minute':age<86400000?'hour':'day');
  return 'Last updated '+when+' · '+relative;
}
export const clientCode = `
const escapeStored=${escapeStored.toString()};
const displayText=${displayText.toString()};
const windowsPathKey=${windowsPathKey.toString()};
const locationKey=${locationKey.toString()};
const folderContains=${folderContains.toString()};
const folderCoverage=${folderCoverage.toString()};
const displayTitle=${displayTitle.toString()};
const friendlyTitle=${friendlyTitle.toString()};
const folderStatus=${folderStatus.toString()};
const membershipStatus=${membershipStatus.toString()};
const membershipExplanation=${membershipExplanation.toString()};
const cwdExplanations=${cwdExplanations.toString()};
const sourceFolderExplanation=${sourceFolderExplanation.toString()};
const folderExplanations=${folderExplanations.toString()};
const gitLinkLabel=${gitLinkLabel.toString()};
const gitExplanation=${gitExplanation.toString()};
const instructionPresentation=${instructionPresentation.toString()};
const instructionEntryText=${instructionEntryText.toString()};
const readablePath=${readablePath.toString()};
const pathName=${pathName.toString()};
const threadDetailsNotes=${threadDetailsNotes.toString()};
const folderDetailsNotes=${folderDetailsNotes.toString()};
const technicalHelp=${technicalHelp.toString()};
const diagnosticRelationGroups=${diagnosticRelationGroups.toString()};
const projectThreads=${projectThreads.toString()};
const workspaceLocations=${workspaceLocations.toString()};
const workspacePresentation=${workspacePresentation.toString()};
const locationPlacement=${locationPlacement.toString()};
const discoveryNotice=${discoveryNotice.toString()};
const hasExpandableThreads=${hasExpandableThreads.toString()};
const standaloneParent=${standaloneParent.toString()};
const threadLink=${threadLink.toString()};
const token=location.hash.slice(1);history.replaceState(null,'',location.pathname);
let data=null,groups=[],view='workspace',allThreads=false,closed=false,selection=null,returnFocus=null;
let diagnosticSections=[];
const expanded=new Set(),snapshotLoad=new AbortController();
const byId=id=>document.getElementById(id);
const text=(tag,value,className)=>{const e=document.createElement(tag);e.textContent=displayText(String(value));if(className)e.className=className;return e;};
const button=(label,action,className='quiet')=>{const e=text('button',label,className);e.type='button';e.onclick=action;return e;};
const name=path=>path.split(/[\\\\/]/).filter(Boolean).at(-1)||path;
const shortPath=path=>{const parts=path.split(/[\\\\/]/).filter(Boolean),sep=windowsPathKey(path)!==null?'\\\\':'/';return parts.length>3?'…'+sep+parts.slice(-3).join(sep):path;};
const locations=()=>groups.flatMap(g=>g.locations);
const locationAt=path=>locations().find(l=>locationKey(l.path)===locationKey(path));
const locationRef=path=>'location:'+locationKey(path);
const selectedRef=()=>!selection?null:selection.kind==='location'?locationRef(selection.path):selection.kind+':'+selection.index;
function icon(kind){
 const shapes={project:'M3 3h6v6H3z M13 3h6v6h-6z M3 13h6v6H3z M13 13h6v6h-6z',thread:'M3 4h16v11H9l-5 4v-4H3z M7 8h8 M7 11h5',folder:'M2 6h7l2 3h9v10H2z M2 6V3h7l2 3h9v3',repository:'M4 3h12l3 3v14H4z M8 7h5 M8 11h7 M8 15h7',worktree:'M6 3v14 M6 8h10V3 M6 14h10v5 M3 17h6 M13 3h6 M13 19h6'};
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 22 22');svg.setAttribute('aria-hidden','true');svg.setAttribute('class','entity-icon icon-'+kind);
 const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',shapes[kind]);path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','1.5');path.setAttribute('stroke-linejoin','round');svg.append(path);return svg;
}
function relatedRefs(){
 const refs=new Set();if(!selection||!data)return refs;refs.add(selectedRef());
 const addLocation=path=>{refs.add(locationRef(path));locationAt(path)?.git.forEach(i=>refs.add('git:'+i));};
 const addGit=i=>{const g=data.discovery?.git[i];if(g){refs.add('git:'+i);refs.add(locationRef(data.discovery.folders[g.folder].path));}};
 if(selection.kind==='thread'){const t=data.threads[selection.index];if(t.cwd)addLocation(t.cwd);data.relations.filter(r=>r.kind==='assigned-project'&&r.subject===selection.index).forEach(r=>refs.add('project:'+r.target));}
 else if(selection.kind==='project'){data.projects[selection.index].roots.forEach(addLocation);projectThreads(data,selection.index).forEach(i=>refs.add('thread:'+i));}
 else if(selection.kind==='location'){const l=locationAt(selection.path);l?.projects.forEach(i=>refs.add('project:'+i));l?.threads.forEach(i=>refs.add('thread:'+i));l?.git.forEach(addGit);}
 else if(selection.kind==='git'){const g=data.discovery.git[selection.index];addGit(selection.index);if(g.state==='verified')data.discovery.git.forEach((other,i)=>{if(other.state==='verified'&&other.commonIdentity===g.commonIdentity)addGit(i);});}
 data.discovery?.relations.filter(r=>r.kind==='inside-git-tree').forEach(r=>{
  const subject=r.subject.kind==='folder'?locationRef(data.discovery.folders[r.subject.index].path):r.subject.kind+':'+r.subject.index;
  if((selection.kind==='thread'||selection.kind==='project'||selection.kind==='location')&&subject===selectedRef())addGit(r.target.index);
  if(selection.kind==='git'&&r.target.index===selection.index)refs.add(subject);
 });return refs;
}
function entity(kind,label,ref,action){
 const e=button('',action,'entity-select');e.append(icon(kind),text('span',label,'entity-name'));e.setAttribute('aria-label',kind+' '+displayText(label));e.setAttribute('aria-pressed',String(selectedRef()===ref));
 if(relatedRefs().has(ref))e.className+=' related';return e;
}
function select(kind,value,origin){
 if(closed||!data)return;selection=kind==='location'?{kind,path:value}:{kind,index:value};
 if(!origin&&kind==='thread')data.relations.filter(r=>r.kind==='assigned-project'&&r.subject===value).forEach(r=>expanded.add(r.target));
 returnFocus=origin||null;render();
 if(!origin){let target=kind+'-'+value;if(kind==='location'){const group=groups.find(g=>g.locations.some(l=>locationKey(l.path)===locationKey(value)));if(group)target='location-'+group.number+'-'+group.locations.findIndex(l=>locationKey(l.path)===locationKey(value));}returnFocus=byId(target)||byId('workspace');}
 if(view==='diagnostics')byId('diagnostic-heading').focus?.();else{renderDetails();byId('details-heading').focus?.();}
}
function openDiagnostics(){if(closed)return;view='diagnostics';render();if(selection)byId('diagnostic-heading').focus?.();}
function returnWorkspace(){
 if(closed)return;view='workspace';
 if(selection?.kind==='thread'&&data.visibility[selection.index]!=='inferred'&&!(data.visibility[selection.index]==='unknown'&&data.threads[selection.index].sourceState==='ordinary'&&data.threads[selection.index].archived===false)){dismissDetails();byId('workspace').focus?.();return;}
 render();if(selection){renderDetails();byId('details-heading').focus?.();}else byId('workspace').focus?.();
}
function dismissDetails(){
 if(closed)return;const focus=returnFocus;selection=null;returnFocus=null;byId('details').replaceChildren();byId('details').hidden=true;byId('layout').className='layout';render();
 if(focus?.isConnected)focus.focus?.();else if(focus?.id)byId(focus.id).focus?.();
}
function helpControl(label,topic,state){
 const help=document.createElement('details');help.className='context-help';help.open=false;const toggle=text('summary','ⓘ');toggle.setAttribute('aria-label','About '+label+(state?' ('+state+')':''));help.append(toggle,text('p',technicalHelp(topic,state),'help-text'));
 const sources=topic==='Git verification'||topic==='Git metadata folders'?[['Git repository layout','https://git-scm.com/docs/gitrepository-layout']]:topic==='Root-marker assumption'?[['Reviewed Codex root-marker documentation','https://learn.chatgpt.com/docs/config-file/config-advanced#project-root-detection']]:topic==='Instruction files'?[['Reviewed Codex instruction-discovery documentation','https://learn.chatgpt.com/docs/agent-configuration/agents-md#how-codex-discovers-guidance']]:[];
 sources.forEach(([label,url])=>{const link=text('a',label);link.href=url;link.target='_blank';link.rel='noopener noreferrer';help.append(link);});return help;
}
function fieldHeading(panel,label,topic,state){const row=document.createElement('div');row.className='field-heading';row.append(text('h3',label));if(topic)row.append(helpControl(label,topic,state));panel.append(row);}
function disclosure(panel,label,render){const section=document.createElement('details');section.className='evidence-group';section.open=false;section.append(text('summary',label));panel.append(section);
 diagnosticSections.push(section);if(render){let loaded=false;section.ontoggle=()=>{if(!closed&&data&&section.open&&!loaded){loaded=true;render(section);}};}return section;}
function toggleDiagnosticSections(open){if(closed||!data)return;for(const section of diagnosticSections){section.open=open;section.ontoggle?.();}
 const help=node=>{if(node.className==='context-help')node.open=open;for(const child of node.children)help(child);};help(byId('diagnostic-content'));
}
function pagedRows(panel,rows,render){if(!rows.length)return;let shown=0,last;
 const more=button('Show next 25',()=>{if(closed||!data)return;append();if(more.hidden)last.focus?.();else more.focus?.();},'show-more');
 const remaining=button('Show all remaining',()=>{if(closed||!data)return;append(rows.length);last.focus?.();},'show-more');
 const progress=text('p','','muted');progress.hidden=rows.length<=25;progress.setAttribute('role','status');panel.append(progress,more,remaining);
 function append(limit=25){const end=Math.min(shown+limit,rows.length),batch=document.createElement('section');batch.tabIndex=-1;batch.setAttribute('aria-label','Entries '+(shown+1)+'–'+end);for(let i=shown;i<end;i++)render(batch,rows[i]);panel.append(batch);last=batch;shown=end;more.hidden=remaining.hidden=shown>=rows.length;more.textContent='Show next '+Math.min(25,rows.length-shown)+' ('+(rows.length-shown)+' remaining)';remaining.textContent='Show all remaining ('+(rows.length-shown)+')';progress.textContent=counted(shown,'entry','entries')+' shown of '+rows.length;}
 append();
}
const counted=(count,singular,plural=singular+'s')=>count+' '+(count===1?singular:plural);
function relationEvidence(panel){const relations=diagnosticRelationGroups(data,selection),count=relations.reduce((n,g)=>n+g.rows.length,0);if(!count)return;
 const section=document.createElement('section');section.className='relationship-evidence';fieldHeading(section,'Relationships','Path relationships');panel.append(section);
 relations.forEach(group=>{const body=document.createElement('section');body.className='relationship-summary';section.append(body);body.append(text('h4',group.label));
  const related=new Set(group.rows.flatMap(row=>row.related)).size;
  body.append(text('p',(related?counted(related,'related entity','related entities')+' · ':'')+counted(group.rows.length,'observation'),'muted'));
  const labels=[...new Set(group.rows.map(row=>row.text))];pagedRows(body,labels,(batch,label)=>batch.append(text('p',label,'relationship-label')));
  disclosure(body,'Exact relationship evidence · '+counted(group.rows.length,'observation'),raw=>pagedRows(raw,group.rows,(page,row)=>page.append(text('p',row.raw,'exact'))));
 });
}
function gitMetadataFields(panel,g){if(g.admin&&g.common&&locationKey(g.admin)===locationKey(g.common))field(panel,'Git metadata folder',readablePath(g.admin),undefined,'Git metadata folders');
 else{if(g.admin)field(panel,'Administrative directory',readablePath(g.admin),undefined,'Git metadata folders');if(g.common)field(panel,'Common Git directory',readablePath(g.common));}}
function field(panel,label,value,copyLabel,topic,state){
 fieldHeading(panel,label,topic,state);
 if(!copyLabel){panel.append(text('p',value,'exact'));return;}
 const row=document.createElement('div');row.className='value-row';row.append(text('p',value,'exact'));panel.append(row);if(copyLabel){const copy=button('⧉',async()=>{
  if(closed||!data)return;const status=text('p','','copy-status');panel.append(status);
  status.setAttribute('role','status');
  try{if(typeof navigator==='undefined'||!navigator.clipboard?.writeText)throw 0;await navigator.clipboard.writeText(value);if(!closed)status.textContent='Copied';}
  catch{if(!closed)status.textContent='Copy unavailable. Select the value above and copy it manually.';}
 },'copy-icon');copy.setAttribute('aria-label',copyLabel);copy.setAttribute('title',copyLabel);row.append(copy);}
}
function pathField(panel,label,value){field(panel,label,readablePath(value),'Copy '+label.toLowerCase(),label==='Working folder'?'Working folder':undefined);}
function technicalInformation(panel){const section=document.createElement('details');section.className='technical-information';section.open=false;section.append(text('summary','Technical information'));panel.append(section);return section;}
function entityType(){return selection.kind==='git'?(data.discovery.git[selection.index].state==='verified'?(data.discovery.git[selection.index].kind==='linked'?'Linked worktree':'Main repository'):'Unverified Git metadata'):selection.kind==='location'?'Folder':selection.kind==='thread'?'Thread':'Project';}
function entityHeading(){return selection.kind==='thread'?friendlyTitle(data.threads[selection.index]).label:selection.kind==='project'?data.projects[selection.index].label||'Unnamed Project':selection.kind==='location'?name(selection.path):name(data.discovery.folders[data.discovery.git[selection.index].folder].path);}
function relatedButton(panel,kind,value,label){panel.append(button(label+' →',()=>select(kind,value)));}
function threadOpen(i,label='Open in Codex ↗'){
 const href=threadLink(data.threads[i].id);if(!href||data.visibility[i]!=='inferred')return null;
 const link=text('a',label,label==='↗'?'open-thread':'primary-action');link.href=href;link.setAttribute('aria-label','Open '+displayText(friendlyTitle(data.threads[i]).label)+' in Codex');return link;
}
function appendStatus(panel,value){if(value)panel.append(text('p',value,'warning'));}
function exceptionalGitLinks(panel,path,indices){
 const own=groups.find(c=>c.locations.some(l=>locationKey(l.path)===locationKey(path)));
 indices.forEach(index=>{if(!own?.locations.some(l=>l.git.includes(index))){const g=data.discovery.git[index];
  relatedButton(panel,'git',index,(g.state==='verified'?(g.kind==='linked'?'Worktree: ':'Repository: '):'Git evidence: ')+name(data.discovery.folders[g.folder].path));}});
}
function renderDetails(){
 if(closed||!data||!selection)return;const panel=byId('details');panel.hidden=false;panel.replaceChildren();byId('layout').className='layout has-selection';
 const top=document.createElement('div');top.className='detail-top';top.append(text('small',entityType()),button('Back',dismissDetails,'detail-back'));panel.append(top);
 const title=text('h2',entityHeading());title.id='details-heading';title.tabIndex=-1;panel.append(title);
 if(selection.kind==='thread'){
  const i=selection.index,t=data.threads[i],open=threadOpen(i);if(open)panel.append(open);
  if(t.cwd)pathField(panel,'Working folder',t.cwd);else field(panel,'Working folder','Unavailable');
  threadDetailsNotes(data,i).forEach(value=>panel.append(text('p',value,'muted')));
  if(t.cwd){const l=locationAt(t.cwd);if(l)appendStatus(panel,folderStatus(l.folder===null?undefined:data.discovery.folders[l.folder]));
   exceptionalGitLinks(panel,t.cwd,data.discovery?.relations.filter(r=>r.kind==='inside-git-tree'&&r.subject.kind==='thread'&&r.subject.index===i).map(r=>r.target.index)||[]);}
  const instructions=instructionPresentation(data,i);fieldHeading(panel,'Possible project instructions','Root-marker assumption');
  instructions.files.forEach(path=>{const note=text('p',name(path)+' found in '+name(path.slice(0,-name(path).length-1))+'.','muted');note.setAttribute('title',displayText(readablePath(path)));panel.append(note);});
  instructions.explanations.forEach(value=>panel.append(text('p',value,'muted')));
  if(instructions.additional)panel.append(text('p',instructions.additional+' more files in Diagnostics.','muted'));
  const technical=technicalInformation(panel);field(technical,'Thread ID',t.id,'Copy Thread ID');if(t.cwd&&readablePath(t.cwd)!==t.cwd)field(technical,'Original stored path',t.cwd,'Copy original stored path','Stored working directory');
 }else if(selection.kind==='project'){
  const i=selection.index,p=data.projects[i];if(!p.roots.length)appendStatus(panel,'Root unavailable');
  p.roots.forEach(path=>{pathField(panel,'Source folder',path);const l=locationAt(path);appendStatus(panel,folderStatus(l?.folder==null?undefined:data.discovery.folders[l.folder]));
   if(l&&l.projects.length>1)panel.append(text('p','Source folder shared with '+l.projects.filter(j=>j!==i).map(j=>data.projects[j].label||'Unnamed Project').join(', ')+'.','muted'));});
  if(p.roots.length)exceptionalGitLinks(panel,p.roots[0],data.discovery?.relations.filter(r=>r.kind==='inside-git-tree'&&r.subject.kind==='project'&&r.subject.index===i).map(r=>r.target.index)||[]);
  const technical=technicalInformation(panel);field(technical,'Project ID',p.id,'Copy Project ID');p.roots.filter(path=>readablePath(path)!==path).forEach(path=>field(technical,'Original Source-folder spelling',path));
 }else if(selection.kind==='location'){
  const l=locationAt(selection.path),f=l?.folder==null?undefined:data.discovery.folders[l.folder];pathField(panel,'Path',selection.path);appendStatus(panel,folderStatus(f));
  if(f&&data.discovery&&!folderContains(f.path,data.discovery.root))panel.append(text('p',f.state==='uninspected'?'Outside discovery scope; this path was not checked.':'This path was checked; surrounding folders were not scanned.','muted'));
  if(l)folderDetailsNotes(data,l).forEach(value=>panel.append(text('p',value,'muted')));
  exceptionalGitLinks(panel,selection.path,data.discovery?.relations.filter(r=>r.kind==='inside-git-tree'&&r.subject.kind==='folder'&&r.subject.index===l?.folder).map(r=>r.target.index)||[]);
  if(f||readablePath(selection.path)!==selection.path){const technical=technicalInformation(panel);if(readablePath(selection.path)!==selection.path)field(technical,'Original path',selection.path);if(f)field(technical,'Inspection coverage',folderCoverage(f,data.discovery.root),undefined,'Inspection status',f.state);}
 }else{
  const i=selection.index,g=data.discovery.git[i],path=data.discovery.folders[g.folder].path;pathField(panel,'Working root',path);appendStatus(panel,folderStatus(data.discovery.folders[g.folder]));
  if(g.state!=='verified')appendStatus(panel,'Git metadata '+g.state+'. Repository identity was not verified.');
  if(g.state==='verified'){
   const related=data.discovery.git.flatMap((other,j)=>j!==i&&other.state==='verified'&&other.commonIdentity===g.commonIdentity?[j]:[]);if(g.kind==='linked'&&!related.some(j=>data.discovery.git[j].kind==='main'))appendStatus(panel,'Main location unavailable');
   exceptionalGitLinks(panel,path,related);
  }
  const technical=technicalInformation(panel);field(technical,'Git verification',g.state,undefined,'Git verification',g.state);gitMetadataFields(technical,g);
 }
 panel.append(button('Inspect evidence',openDiagnostics,'technical-link'));
}
function sameOwner(a,b){return a?.kind===b?.kind&&(a?.kind==='location'?locationKey(a.path)===locationKey(b.path):a?.index===b?.index);}
function appendTreeLocations(parent,c,owner){
 const items=c.locations.filter(l=>sameOwner(locationPlacement(data,c,l),owner));if(!items.length)return;
 const branch=document.createElement('div');branch.className=owner?.kind==='location'?'worktree-list':'location-branch';
 items.forEach(l=>branch.append(locationRow(l,c)));parent.append(branch);
}
function threadRow(i,component){
 const t=data.threads[i],row=document.createElement('div');row.className='thread-row';const line=document.createElement('div');line.className='thread-line';
 const b=entity('thread',friendlyTitle(t).label,'thread:'+i,()=>select('thread',i,b));b.id='thread-'+i;line.append(b);
 const open=threadOpen(i,'↗');if(open)line.append(open);if(data.memberships[i]==='projectless')line.append(text('small','Projectless','entity-type'));appendStatus(line,membershipStatus(data.memberships[i]));row.append(line);
 if(component&&t.cwd){const l=component.locations.find(l=>locationKey(l.path)===locationKey(t.cwd)),placement=l&&locationPlacement(data,component,l),assigned=data.relations.find(r=>r.kind==='assigned-project'&&r.subject===i);
  if(l&&!(placement?.kind==='thread'&&placement.index===i)&&!l.projects.includes(assigned?.target))line.append(button('Uses '+name(l.path),()=>select('location',l.path),'uses-location'));
  appendTreeLocations(row,component,{kind:'thread',index:i});
 }return row;
}
function threadList(parent,indexes,component,projectIndex){
 const limited=!allThreads&&projectIndex!==undefined&&!expanded.has(projectIndex);(limited?indexes.slice(0,5):indexes).forEach(i=>parent.append(threadRow(i,component)));
 if(projectIndex!==undefined&&indexes.length>5&&!allThreads)parent.append(button(limited?'Show '+(indexes.length-5)+' more Threads':'Show fewer Threads',()=>{if(expanded.has(projectIndex))expanded.delete(projectIndex);else expanded.add(projectIndex);render();},'show-more'));
}
function locationRow(l,c){
 const row=document.createElement('div');row.className='location-row';const line=document.createElement('div');line.className='location-line';
 const b=entity('folder',name(l.path),locationRef(l.path),()=>select('location',l.path,b));b.id='location-'+c.number+'-'+c.locations.indexOf(l);line.append(b);
 l.git.forEach(i=>{const g=data.discovery.git[i],label=g.state==='verified'?(g.kind==='linked'?'Worktree':'Repository'):'Git '+g.state;
  const facet=entity(g.kind==='linked'?'worktree':'repository',label,'git:'+i,()=>select('git',i,facet));facet.className+=' git-facet';facet.id='git-'+i;line.append(facet);
  if(g.state==='verified'&&g.kind==='linked'&&!c.locations.some(other=>other.git.some(j=>data.discovery.git[j].state==='verified'&&data.discovery.git[j].kind==='main'&&data.discovery.git[j].commonIdentity===g.commonIdentity)))appendStatus(line,'Main location unavailable');});
 row.append(line,text('p',shortPath(l.path),'path-preview'));
 if(l.projects.length&&(c.projects.length>1||l.projects.some(i=>!c.projects.includes(i)))){const refs=document.createElement('div');refs.className='source-projects';l.projects.forEach(i=>refs.append(button(data.projects[i].label||'Unnamed Project',()=>select('project',i),'uses-location')));row.append(refs);}
 appendStatus(row,folderStatus(l.folder===null?undefined:data.discovery.folders[l.folder]));appendTreeLocations(row,c,{kind:'location',path:l.path});return row;
}
function componentCard(c){
 const section=document.createElement('section');section.className='component';section.setAttribute('data-workspace-group',String(c.number));
 const title=c.threads.length?friendlyTitle(data.threads[c.threads[0]]):null;
 const identity=c.projects.length?'Project '+(data.projects[c.projects[0]].label||'Unnamed Project'):title?(title.qualification==='unavailable'?'':'Thread ')+title.label:'Folder '+name(c.locations[0]?.path||'unavailable');
 section.setAttribute('aria-label',displayText(identity+' relationships'));const tree=document.createElement('div');tree.className='relationship-tree';
 c.projects.forEach(i=>{const p=data.projects[i],project=document.createElement('section');project.className='project-block';const line=document.createElement('div');line.className='project-line';const b=entity('project',p.label||'Unnamed Project','project:'+i,()=>select('project',i,b));b.id='project-'+i;line.append(b,text('small','Codex Project','entity-type'));project.append(line);
  const branches=document.createElement('div');branches.className='project-branches';
  const threads=projectThreads(data,i).filter(t=>c.threads.includes(t)),list=document.createElement('div');list.className='member-list';if(threads.length)list.append(text('small','Threads','source-label'));else list.append(text('p','No qualifying assigned Threads observed','muted'));threadList(list,threads,c,i);branches.append(list);
  project.append(branches);if(!p.roots.length)appendStatus(project,'Root unavailable');tree.append(project);});
 const separate=c.threads.filter(i=>!c.projects.some(p=>projectThreads(data,p).includes(i)));threadList(tree,separate,c);
 const roots=c.locations.filter(l=>l.projects.length);if(roots.length){const source=document.createElement('div');source.className='source-folders';const line=document.createElement('div');line.className='location-line';line.append(icon('folder'),text('span','Source folders','entity-name'));source.append(line);
  const branch=document.createElement('div');branch.className='location-branch';roots.forEach(l=>{const placement=locationPlacement(data,c,l);if(placement===null)branch.append(locationRow(l,c));else if(!roots.some(root=>locationKey(root.path)===locationKey(placement.path)))branch.append(button(name(l.path),()=>select('location',l.path),'uses-location root-reference'));});source.append(branch);tree.append(source);}
 c.locations.filter(l=>!l.projects.length&&locationPlacement(data,c,l)===null).forEach(l=>{const parent=standaloneParent(data,groups,c,l);if(!parent){tree.append(locationRow(l,c));return;}
  const context=document.createElement('div');context.className='folder-context';const line=document.createElement('div');line.className='location-line';line.setAttribute('aria-label','Parent folder '+displayText(name(parent.path)));line.append(icon('folder'),text('span',name(parent.path),'entity-name'));const child=document.createElement('div');child.className='location-branch';child.append(locationRow(l,c));context.append(line,child);tree.append(context);});
 section.append(tree);return section;
}
function diagnosticThreads(parent,title,indexes){if(!indexes.length)return;disclosure(parent,title+' ('+indexes.length+')',section=>pagedRows(section,indexes,(batch,i)=>batch.append(threadRow(i))));}
function instructionEvidence(box){
 const i=selection.index,d=data.instructionScope,t=data.threads[i],finding=instructionPresentation(data,i);
 fieldHeading(box,'Possible project instructions','Root-marker assumption');finding.files.forEach(path=>box.append(text('p',readablePath(path),'relationship-label')));
 finding.explanations.forEach(value=>box.append(text('p',value,'muted')));
 if(finding.additional)box.append(text('p',counted(finding.additional,'more observed file')+' in exact instruction checks.','muted'));
 if(!d)return;
 const row=d.cwds.find(row=>t.cwd&&locationKey(row.cwd)===locationKey(t.cwd));
 const entries=row?row.ancestry.flatMap(directory=>[directory.directory,...(directory.marker===undefined?[]:[directory.marker]),...directory.instructions].map(index=>d.entries[index])):[];
 disclosure(box,'Exact instruction checks · '+counted(entries.length,'observation'),instructions=>{
  field(instructions,'Root-marker assumption','Documented default .git rule; effective settings unknown',undefined,'Root-marker assumption');
  field(instructions,'Instruction observation interval (UTC)',d.from+' → '+d.through);fieldHeading(instructions,'Instruction files','Instruction files');
  if(row){field(instructions,'Instruction stopping reason',row.stop+' · '+readablePath(row.stoppedAt),undefined,'Search stopping reason',row.stop);
   field(instructions,'Instruction coverage',row.complete?'Complete to candidate marker':'Incomplete',undefined,'Instruction coverage',row.complete?'complete':'partial');
   pagedRows(instructions,entries,(batch,e)=>{const display={...e,path:readablePath(e.path),...(e.obstruction?{obstruction:readablePath(e.obstruction)}:{})};
    field(batch,e.purpose+' check',instructionEntryText(display));batch.append(text('p',JSON.stringify(e),'exact'));});
  }else field(instructions,'Instruction coverage',!t.cwd?'Stored working directory unavailable':data.visibility[i]!=='inferred'?'Record does not qualify for instruction inspection':'CWD limit; this location was not inspected',undefined,'Instruction coverage','partial');
 });
}
function renderDiagnostics(list){
 diagnosticSections=[];
 list.append(text('h2','Diagnostics'),text('p','Technical observations for this snapshot.','muted'));
 const controls=document.createElement('div');controls.className='diagnostic-controls';
 for(const [label,open] of [['Expand all',true],['Collapse all',false]]){const control=button(label,()=>toggleDiagnosticSections(open));control.setAttribute('aria-controls','diagnostic-content');control.setAttribute('title',label+' evidence sections; large lists remain paginated');controls.append(control);}list.append(controls);
 const content=document.createElement('section');content.id='diagnostic-content';content.setAttribute('aria-label','Diagnostic summaries and evidence');list.append(content);list=content;
 if(selection){const box=document.createElement('section');box.className='diagnostic-evidence';const heading=text('h3','Technical evidence — '+entityHeading()+' ('+entityType()+')');heading.id='diagnostic-heading';heading.tabIndex=-1;box.append(button('Back to Workspace',returnWorkspace,'detail-back'),heading);
  if(selection.kind==='thread'){const t=data.threads[selection.index];field(box,'Working folder',t.cwd?readablePath(t.cwd):'Unavailable');threadDetailsNotes(data,selection.index).forEach(value=>box.append(text('p',value,'muted')));}
  else if(selection.kind==='project')data.projects[selection.index].roots.forEach(path=>field(box,'Source folder',readablePath(path)));
  else if(selection.kind==='location'){field(box,'Folder',readablePath(selection.path));const l=locationAt(selection.path),f=l?.folder==null?undefined:data.discovery.folders[l.folder];appendStatus(box,folderStatus(f));if(l)folderDetailsNotes(data,l).forEach(value=>box.append(text('p',value,'muted')));}
  else{const g=data.discovery.git[selection.index];field(box,'Working root',readablePath(data.discovery.folders[g.folder].path));box.append(text('p',gitExplanation(data,selection.index),'muted'));if(g.state!=='verified')appendStatus(box,'Git metadata '+g.state+'. Repository identity was not verified.');}
  const record=disclosure(box,'Record metadata');
  if(selection.kind==='thread'){const t=data.threads[selection.index];field(record,'Thread ID',t.id,'Copy Thread ID');
   field(record,'Working-folder source','Stored CWD in acquired Thread data',undefined,'Stored working directory');
   for(const [label,value] of [['Visibility',data.visibility[selection.index]],['Membership',data.memberships[selection.index]],['Title source',t.titleSource||'unavailable'],['Title resolution',t.titleResolution||'unavailable']])field(record,label,value,undefined,label,value);
   field(record,'Display qualification',friendlyTitle(t).qualification,undefined,'Display qualification',friendlyTitle(t).qualification);
   if(t.cwd&&readablePath(t.cwd)!==t.cwd)field(record,'Original stored path',t.cwd);
  }else if(selection.kind==='project'){const p=data.projects[selection.index];field(record,'Project ID',p.id,'Copy Project ID');}
  else if(selection.kind==='location'){const l=locationAt(selection.path),f=l?.folder==null?undefined:data.discovery.folders[l.folder];
   if(f){field(record,'Inspection status',f.state,undefined,'Inspection status',f.state);field(record,'Inspection coverage',folderCoverage(f,data.discovery.root));field(record,'Path source',f.origin,undefined,'Path source',f.origin);
    disclosure(box,'Exact folder observation',raw=>field(raw,'Observation',JSON.stringify(f)));
    const results=data.discovery.diagnostics.filter(n=>locationKey(n.path)===locationKey(f.path));if(results.length)disclosure(box,'Inspection problems · '+results.length,body=>pagedRows(body,results,(batch,n)=>{field(batch,'Inspection result',n.reason);if(n.stage)field(batch,'Inspection stage',n.stage+(n.at?' · '+n.at:''));field(batch,'Checked path',readablePath(n.path));}));
   }
  }else{const g=data.discovery.git[selection.index];field(record,'Git verification',g.state,undefined,'Git verification',g.state);gitMetadataFields(record,g);
   field(record,'Git evidence',g.detail);disclosure(box,'Exact Git observation',raw=>field(raw,'Observation',JSON.stringify(g)));
  }
  relationEvidence(box);
  if(selection.kind==='thread')instructionEvidence(box);list.append(box);
 }
 diagnosticThreads(list,'Unresolved records',data.threads.flatMap((t,i)=>data.visibility[i]==='unknown'?[i]:[]));diagnosticThreads(list,'Internal records',data.threads.flatMap((t,i)=>data.visibility[i]==='internal'?[i]:[]));diagnosticThreads(list,'Archived records',data.threads.flatMap((t,i)=>data.visibility[i]==='archived'?[i]:[]));
 const coverage=disclosure(list,'Coverage and methodology');fieldHeading(coverage,'About snapshot coverage','Snapshot coverage');field(coverage,'Observation interval',data.provenance.from+' → '+data.provenance.through);field(coverage,'Source namespace',data.provenance.namespace);field(coverage,'Source coverage',JSON.stringify(data.coverage));field(coverage,'Disconnected references',data.danglingAssignments+' dangling assignments; '+data.staleProjectless+' stale projectless references');data.limitations.forEach(v=>coverage.append(text('p',v,'muted')));
 if(data.discovery){const d=data.discovery;field(coverage,'Discovery scope',d.root);field(coverage,'Discovery coverage',d.status+' · '+counted(d.folders.length,'observation')+' · '+counted(d.entries,'entry','entries')+' · '+counted(d.operations,'operation'));field(coverage,'Discovery limits',JSON.stringify(d.limits));}
 if(data.instructionScope){const d=data.instructionScope;field(coverage,'Instruction scope',d.root);field(coverage,'Instruction coverage',d.status+' · '+d.cwds.length+'/'+d.qualifyingCwds+' CWDs · '+d.entries.length+' checks · '+d.operations+' operations');field(coverage,'Instruction limits',JSON.stringify(d.limits));}
 const assignments=data.assignments.filter(a=>!data.threads.some(t=>t.id===a.threadId)||a.projectKind!=='local'||!data.projects.some(p=>p.id===a.projectId));if(assignments.length||data.staleProjectless)disclosure(list,'Unresolved and stale references',refs=>{pagedRows(refs,assignments,(batch,a)=>batch.append(text('p',a.threadId+' → '+a.projectId,'exact')));if(data.staleProjectless)refs.append(text('p',data.staleProjectless+' stale projectless references'));});
 if(data.discovery?.diagnostics.length)disclosure(list,'Discovery warnings',warnings=>pagedRows(warnings,data.discovery.diagnostics,(batch,n)=>batch.append(text('p',n.path+' · '+n.reason+(n.stage?' · '+n.stage+(n.at?' ('+n.at+')':''):''),'exact'))));
}
function render(){
 if(closed||!data)return;diagnosticSections=[];const list=byId('relationships'),notices=byId('notices');list.replaceChildren();notices.replaceChildren();byId('workspace').ariaPressed=String(view==='workspace');byId('diagnostics').ariaPressed=String(view==='diagnostics');byId('view-heading').textContent=view==='workspace'?'Workspace':'Diagnostics';
 byId('expand-threads').hidden=view!=='workspace'||!hasExpandableThreads(data,groups);byId('expand-threads').textContent=allThreads?'Collapse all Threads':'Show all Threads';byId('expand-threads').setAttribute('aria-pressed',String(allThreads));
 byId('details').hidden=view==='diagnostics'||!selection;byId('layout').className=view==='workspace'&&selection?'layout has-selection':'layout';
 if(view==='diagnostics'){renderDiagnostics(list);return;}if(data.provenance.namespace.startsWith('synthetic-'))notices.append(text('p','Invented demonstration','muted'));
 if(data.coverage.projects==='unavailable')notices.append(text('p','Project information unavailable. Some relationships need review.','warning'));
 const discoveryWarning=discoveryNotice(data,groups);if(discoveryWarning)notices.append(button(discoveryWarning,()=>{view='diagnostics';render();},'notice-action'));
 const unknown=data.threads.flatMap((t,i)=>data.visibility[i]==='unknown'?[i]:[]),review=unknown.filter(i=>data.threads[i].sourceState==='ordinary'&&data.threads[i].archived===false);if(unknown.length>review.length)notices.append(button('Some records could not be classified. Review diagnostics',()=>{view='diagnostics';render();},'notice-action'));
 let count=0;groups.forEach(c=>{list.append(componentCard(c));count++;});
 if(review.length){const section=document.createElement('section');section.className='needs-review';section.append(text('h2','Needs review'));review.forEach(i=>section.append(threadRow(i)));list.append(section);count++;}if(!count)list.append(text('p','No meaningful workspace entities found.','empty-state'));
}
function closeLocal(){if(closed)return false;closed=true;snapshotLoad.abort();data=null;groups=[];diagnosticSections=[];selection=null;returnFocus=null;expanded.clear();byId('expand-threads').hidden=true;byId('relationships').replaceChildren();byId('details').replaceChildren();byId('details').hidden=true;byId('notices').replaceChildren();byId('layout').className='layout';byId('coverage').textContent='Session closed; browser memory is not a secure-erasure guarantee.';return true;}
async function closeView(){if(!closeLocal())return;try{await fetch('/close',{method:'POST',headers:{'X-Surveyor-Session':token},cache:'no-store',keepalive:true});}catch{}}
byId('workspace').onclick=returnWorkspace;byId('diagnostics').onclick=openDiagnostics;byId('expand-threads').onclick=()=>{if(closed||!data||!hasExpandableThreads(data,groups))return;allThreads=!allThreads;if(!allThreads)expanded.clear();render();};byId('close').onclick=closeView;
addEventListener('pagehide',()=>{void closeView();});addEventListener('keydown',event=>{if(event.key==='Escape'){if(view==='diagnostics')returnWorkspace();else dismissDetails();}});
(async()=>{try{const response=await fetch('/snapshot',{headers:{'X-Surveyor-Session':token},cache:'no-store',signal:snapshotLoad.signal});if(closed)return;if(!response.ok)throw 0;
 const loaded=await response.json();if(closed)return;data=loaded;groups=workspacePresentation(data);byId('details').hidden=true;byId('coverage').textContent='';render();
 }catch{if(!closed)byId('coverage').textContent='Dataset unavailable or local session refused.';}})();
`;
export const explorerHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Workspace Surveyor</title><link rel="stylesheet" href="/style.css"></head><body>
<header><div class="brand">Workspace Surveyor <span>for Codex</span></div><nav aria-label="Views"><button id="workspace" aria-pressed="true">Workspace</button><button id="diagnostics" aria-pressed="false">Diagnostics</button><button id="close">Close session</button></nav></header>
<main><div class="workspace-top"><h1 id="view-heading">Workspace</h1><button id="expand-threads" class="show-more" aria-pressed="false" hidden>Show all Threads</button></div><div id="notices" role="status"></div><div id="layout" class="layout"><div id="relationships"></div><aside id="details" aria-label="Entity details" hidden></aside></div><footer><p id="coverage" role="status">Loading snapshot…</p></footer></main><script src="/client.js" defer></script></body></html>`;
export const explorerCss = `
details:not([open])>:not(summary){display:none}
.diagnostic-controls{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.diagnostic-controls button{font-size:12px}.relationship-summary{margin:14px 0}.relationship-label{font-size:12px;line-height:1.5;overflow-wrap:anywhere;unicode-bidi:isolate;direction:ltr;margin:6px 0}
:root{font-family:system-ui,-apple-system,sans-serif;color:#252b2e;background:#fafaf8;color-scheme:light}*{box-sizing:border-box}body{margin:0}[hidden]{display:none!important}header{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:18px 32px;border-bottom:1px solid #e6e8e4;background:#fff}.brand{font-size:17px;font-weight:600;letter-spacing:-.3px}.brand span{font-size:12px;font-weight:400;color:#727a7b;margin-left:7px}nav{display:flex;gap:4px}main{max-width:1100px;padding:26px 32px;margin:auto}
button{font:inherit;color:inherit}button{cursor:pointer;border:0;background:transparent;border-radius:6px;padding:7px 9px}button:hover,a:hover{background:#edf0ec}button:focus-visible,a:focus-visible,summary:focus-visible{outline:2px solid #25856c;outline-offset:3px}nav button{font-size:12px;color:#697271}nav button[aria-pressed=true]{color:#263d35;background:#eaf0ea}.workspace-top{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:21px}h1{font-size:22px;font-weight:600;letter-spacing:-.4px;margin:0}h2{font-size:13px;font-weight:500}h3{font-size:12px;font-weight:500}
.layout{display:block}.layout.has-selection{display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:35px}.layout>*{min-width:0}.component{border-top:1px solid #e3e7e1;padding:15px 0 18px}.component>h2{color:#68716f;margin:0 0 10px}.relationship-tree{display:block}.project-block+.project-block,.relationship-tree>.thread-row+.thread-row{margin-top:12px}.entity-select{display:inline-flex;align-items:center;gap:8px;text-align:left;max-width:100%;padding:5px 7px;margin-left:-7px;font-size:14px;min-width:0;vertical-align:middle}.entity-icon{width:18px;height:18px;flex:none}.icon-project{color:#6474aa}.icon-thread{color:#32836c}.icon-folder{color:#b28c3d}.icon-repository{color:#617180}.icon-worktree{color:#927293}.entity-name{overflow-wrap:anywhere;unicode-bidi:isolate;direction:ltr}.project-line>.entity-select{font-weight:600}.entity-select.related{background:#f0f4ee}.entity-select[aria-pressed=true]{background:#e2eee5;color:#1e513b}.entity-type{font-size:10px;color:#79807e;margin-left:8px}.project-line,.thread-line,.location-line{display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0}.project-branches,.location-branch,.worktree-list{margin:3px 0 0 8px;padding-left:22px;border-left:1px solid #d9e1d6}.member-list>.thread-row,.source-folders>.location-row,.location-branch>.location-row,.worktree-list>.location-row{position:relative}.member-list>.thread-row:before,.source-folders>.location-row:before,.location-branch>.location-row:before,.worktree-list>.location-row:before{content:'';position:absolute;left:-22px;top:16px;width:15px;border-top:1px solid #d9e1d6}.thread-row{padding:2px 0}.thread-line .entity-name{font-size:13px}.open-thread{color:#728078;font-size:14px;padding:3px 6px;text-decoration:none;border-radius:4px}.uses-location{font-size:11px;color:#687c70;padding:3px 6px;overflow-wrap:anywhere}.member-list{margin:0}.source-folders{margin-top:9px}.source-folders>.location-line,.folder-context>.location-line{font-size:14px;gap:8px;padding:5px 0}.source-label{display:block;font-size:10px;color:#79807e;margin:0 0 2px}.source-projects{margin-left:20px}.root-reference{display:block;margin:3px 0}.show-more{font-size:11px;color:#597565;margin:4px 0}.location-row{padding:5px 0 7px;min-width:0}.path-preview{font-size:11px;color:#7a817d;margin:0 0 0 26px;overflow-wrap:anywhere;unicode-bidi:isolate;direction:ltr}.git-facet{font-size:10px;color:#738077;margin-left:6px;padding:3px 5px}.git-facet .entity-icon{width:14px;height:14px}.muted,small{color:#79817b}.muted{font-size:11px}.warning{color:#966126;font-size:11px;margin:5px 0}.notice-action{color:#946c36;text-align:left;font-size:11px;padding-left:0}.needs-review{border-top:1px solid #e6decf;padding:15px 0}.empty-state{padding:25px 0;color:#727b74;font-size:13px}
.field-heading{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap}.field-heading h3{margin-bottom:5px}.context-help{border:0;margin:0;padding:0}.context-help summary{list-style:none;padding:4px 6px;min-width:28px;min-height:28px;font-size:12px}.context-help summary::-webkit-details-marker{display:none}.context-help[open]{flex-basis:100%}.context-help .help-text{font-size:12px;line-height:1.5;max-width:65ch;margin:6px 0;padding:8px 12px;border-left:2px solid #bdcabd}.context-help a{display:block;font-size:11px;margin:6px 0}.evidence-group>summary{line-height:1.5;overflow-wrap:anywhere}.evidence-group .evidence-group{margin-left:12px}.value-row{display:flex;align-items:flex-start;gap:5px;min-width:0}.value-row .exact{flex:1;min-width:0}.copy-icon{flex:none;padding:4px 6px;min-width:28px;min-height:28px;color:#728178}.technical-information{margin-top:18px}.technical-information summary{font-size:11px}.technical-information .technical-link{margin-top:8px}.instruction-checks{border-top:1px solid #e0e5df;margin-top:14px}.diagnostic-evidence h4{font-size:12px;margin:18px 0 8px;overflow-wrap:anywhere}aside{align-self:start;position:sticky;top:20px;max-height:calc(100vh - 40px);overflow:auto;border-left:1px solid #e0e5de;padding:5px 0 18px 24px}aside h2{font-size:18px;line-height:1.45;margin:14px 0;overflow-wrap:anywhere}aside h3{color:#788079;font-size:11px;margin:18px 0 5px}aside .quiet{font-size:11px;padding-left:0;display:block;color:#597361}.detail-top{display:flex;align-items:center;justify-content:space-between}.detail-top small{font-size:11px}.detail-back{font-size:11px;color:#728178}.exact{white-space:pre-wrap;overflow-wrap:anywhere;unicode-bidi:isolate;direction:ltr;font-family:ui-monospace,monospace;font-size:11px;margin:6px 0}.primary-action{display:inline-block;padding:8px 11px;border-radius:6px;background:#e5eee5;color:#2d6342;font-size:12px;text-decoration:none}.technical-link{margin-top:20px;font-size:10px;color:#7d8b80;padding-left:0}.copy-status{font-size:11px;color:#5d7764}details{border-top:1px solid #e0e5df;margin-top:12px;padding:7px 0}summary{cursor:pointer;font-size:12px;color:#68786c;padding:7px 0}.diagnostic-evidence{border-left:2px solid #bdcabd;padding-left:15px}.diagnostic-evidence h3{font-size:11px;color:#728674}footer{font-size:10px;color:#819081;margin-top:15px}footer:has(p:empty){display:none}
@media(max-width:899px){header{padding:14px 18px;flex-wrap:wrap;gap:9px}.brand span{display:none}main{padding:20px 18px}.workspace-top{align-items:flex-start;flex-direction:column;gap:13px}.layout.has-selection{display:block}.layout.has-selection #relationships{display:none}aside{position:static;max-height:none;border-left:0;padding:0}.project-branches,.location-branch,.worktree-list{padding-left:18px}.member-list>.thread-row:before,.source-folders>.location-row:before,.location-branch>.location-row:before,.worktree-list>.location-row:before{left:-18px;width:12px}.entity-type{margin-left:0}}
.session-header{display:grid;grid-template-columns:minmax(0,1fr) auto}.header-navigation{display:flex;align-items:center;gap:24px;flex-wrap:wrap;min-width:0}.header-navigation nav{flex-wrap:wrap}.header-actions{display:flex;align-items:center;justify-content:flex-end;gap:16px;flex-wrap:wrap;min-width:0;font-size:12px}.session-menu{position:relative;margin:0;padding:0 0 0 16px;border-top:0;border-left:1px solid #e6e8e4}.session-menu summary{padding:7px 9px;border-radius:6px;color:#697271}.session-menu summary:hover{background:#edf0ec}.session-menu summary:focus-visible{outline:2px solid #25856c;outline-offset:3px}.session-popover{position:absolute;right:0;top:calc(100% + 8px);z-index:2;width:232px;max-width:calc(100vw - 36px);padding:12px;border:1px solid #e0e5df;border-radius:6px;background:#fff}.session-popover p{margin:0 0 8px;font-size:11px;color:#727a7b;overflow-wrap:anywhere}.session-popover button{width:100%;text-align:left}.refresh-status{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:12px 0}.refresh-status p{margin:0;min-width:0;overflow-wrap:anywhere}.refresh-status button{font-size:11px;color:#597565}
@media(max-width:520px){.session-header{grid-template-columns:minmax(0,1fr);gap:12px}.header-navigation{gap:9px}.header-actions{justify-self:end}}
`;

// Reuse the accepted Workspace renderer; only the transport/lifecycle differs.
const renderer=clientCode.slice(clientCode.indexOf('let data=null'),clientCode.indexOf('async function closeView()'))
 .replace("'Observation interval'","'Acquisition interval (UTC)'")
 .replace("field(coverage,'Source namespace'","field(coverage,'Snapshot completed (UTC)',currentUpdatedAt||'Unavailable');if(data.discovery)field(coverage,'Folder observation interval (UTC)',data.discovery.from+' → '+data.discovery.through);field(coverage,'Source namespace'");
export const reusableClientCode=clientCode.slice(0,clientCode.indexOf('const token='))+`
const bookmarkSelection=${bookmarkSelection.toString()};
const restoreSelection=${restoreSelection.toString()};
const snapshotUpdatedLabel=${snapshotUpdatedLabel.toString()};
const storageKey='workspace-surveyor-session';
let token=location.hash.slice(1);
try{if(/^[a-f0-9]{64}$/.test(token))sessionStorage.setItem(storageKey,token);else token=sessionStorage.getItem(storageKey)||'';}catch{}
history.replaceState(null,'',location.pathname);
`+renderer+`
let latestVersion=-1,latestRevision=-1,currentRevision=-1,currentScope='',currentUpdatedAt=null,latestState=null,lastActivity=0;
let connected=false,connectionWarning='Connecting to local session…';
const eventsAbort=new AbortController();
function forgetCredential(){try{sessionStorage.removeItem(storageKey);}catch{}}
function finishView(message){const menu=byId('session-menu'),restoreFocus=menu.open||document.activeElement===byId('cancel');menu.open=false;
 closeLocal();forgetCredential();token='';clearInterval(ageTimer);byId('refresh').disabled=true;byId('recover').disabled=true;byId('recover').hidden=true;byId('recovery-note').hidden=true;byId('cancel').disabled=true;byId('cancel').hidden=true;byId('close').disabled=true;byId('session-status').textContent=message;
 if(restoreFocus)byId('session-status').focus?.();}
function disconnected(){if(closed)return;connected=false;connectionWarning='Connection unavailable; the displayed snapshot may be stale. Reload to reconnect.';
 byId('session-status').textContent=connectionWarning;byId('refresh').disabled=true;byId('recover').disabled=true;byId('cancel').disabled=true;byId('cancel').hidden=true;byId('close').disabled=true;
 if(document.activeElement===byId('cancel'))byId('session-status').focus?.();}
function showStatus(){
 if(!latestState||closed)return;
 const s=latestState,a=s.attempt;
 const stages={idle:'Ready.',acquiring:'Acquiring and verifying a protected snapshot. Desktop must be closed.',discovery:'Inspecting approved folders and Git metadata.',cancelling:'Cancelling; waiting for protected cleanup.'};
 const failures={closure:'Close Codex and ChatGPT Desktop normally, then request Refresh.',acquisition:'Acquisition refused; check source availability and compatibility.',cleanup:'Cleanup or recovery was not confirmed. Use the documented explicit recovery procedure; do not delete controls manually.',discovery:'Folder inspection failed.',unavailable:'Refresh could not complete.'};
 let message=stages[s.phase]||'Session closing.';
 if(s.phase==='idle'&&a?.outcome==='failure')message=failures[a.failure]||failures.unavailable;
 if(s.phase==='idle'&&a?.outcome==='cancelled')message=a.failure==='cleanup'?failures.cleanup:'Refresh cancelled.';
 if(s.recoveryAvailable)message='Temporary copies need attention. Recover them before trying Refresh again.';
 if(s.recoveryAction==='running')message='Recovering temporary copies; waiting for verification and cleanup.';
 if(s.recoveryAction==='removed')message='Temporary copies were recovered and cleanup confirmed. Use Refresh to acquire a new snapshot.';
 if(s.recoveryAction==='preserved')message='Temporary copies remain protected and unresolved. Close this session and launch Surveyor again to continue.';
 if(s.recoveryAction==='blocked')message='Recovery could not finish safely. Close session and use the documented incident procedure; do not delete files manually.';
 if(data&&(s.phase!=='idle'||a?.outcome!=='success'||currentRevision!==s.revision))message+=' Showing the previous successful snapshot.';
 byId('legacy-notice').hidden=s.legacyUnresolved!==true;
 byId('session-status').textContent=connected?message:connectionWarning;
 byId('coverage').textContent=data?snapshotUpdatedLabel(currentUpdatedAt):'No successful snapshot yet. Use Refresh when Desktop is closed.';
 const active=connected&&['acquiring','discovery'].includes(s.phase)&&s.recoveryAction!=='running';byId('refresh').disabled=!connected||s.phase!=='idle'||s.recoveryAvailable===true||['preserved','blocked'].includes(s.recoveryAction);
 byId('recover').hidden=s.recoveryAvailable!==true;byId('recover').disabled=!connected||s.phase!=='idle';byId('recovery-note').hidden=s.recoveryAvailable!==true;
 byId('cancel').disabled=!active;byId('cancel').hidden=!active;byId('close').disabled=!connected;
 if(byId('recover').hidden&&document.activeElement===byId('recover'))byId('session-status').focus?.();
 if(!active&&document.activeElement===byId('cancel'))byId('session-status').focus?.();
}
async function control(path){
 if(closed||!token||!connected)return;
 try{const response=await fetch(path,{method:'POST',headers:{'X-Surveyor-Session':token},cache:'no-store'});
  if(response.status===403||response.status===410)finishView('Local session unavailable. Launch Workspace Surveyor again.');
  return response.ok;
 }catch{disconnected();}
}
async function loadSnapshot(revision,scope,updatedAt){
 try{const response=await fetch('/snapshot',{headers:{'X-Surveyor-Session':token},cache:'no-store',signal:snapshotLoad.signal});
  if(closed)return;if(!response.ok)throw 0;const loaded=await response.json();
  if(closed||loaded.revision!==latestRevision||loaded.scope!==scope||revision!==latestRevision)return;
  const same=currentScope===scope,bookmark=same&&data?bookmarkSelection(data,selection):null;
  const expandedIds=same&&data?[...expanded].flatMap(i=>data.projects[i]&&data.projects.filter(p=>p.id===data.projects[i].id).length===1?[data.projects[i].id]:[]):[];
  data=loaded.data;currentScope=scope;currentRevision=loaded.revision;currentUpdatedAt=data?updatedAt:null;returnFocus=null;expanded.clear();
  if(!same||!data)allThreads=false;
  if(data){expandedIds.forEach(id=>{const rows=data.projects.flatMap((p,i)=>p.id===id?[i]:[]);if(rows.length===1)expanded.add(rows[0]);});
   selection=restoreSelection(data,bookmark);
   if(view==='workspace'&&selection?.kind==='thread'&&data.visibility[selection.index]!=='inferred'&&
     !(data.visibility[selection.index]==='unknown'&&data.threads[selection.index].sourceState==='ordinary'&&data.threads[selection.index].archived===false))selection=null;
   if(!selection)byId('details').replaceChildren();
   groups=workspacePresentation(data);render();if(selection&&view==='workspace')renderDetails();
  }else{selection=null;groups=[];byId('relationships').replaceChildren();byId('details').replaceChildren();byId('details').hidden=true;}
  showStatus();
 }catch{if(connected&&!closed&&revision===latestRevision&&scope===latestState?.scope)byId('session-status').textContent='Snapshot delivery failed; retaining the previous view. Reload to reconnect.';}
}
function receiveState(s){
 if(!s||!Number.isSafeInteger(s.version)||s.version<=latestVersion)return;latestVersion=s.version;latestState=s;connected=true;
 if(s.phase==='closing'||s.phase==='closed'){finishView(s.phase==='closing'?'Session closing; waiting for protected cleanup.':
   s.recoveryAction==='preserved'?'Session closed. Legacy copies remain protected and unresolved. Launch Surveyor again to continue.':
   s.attempt?.failure==='cleanup'&&s.recoveryAction!=='removed'?'Session closed. Cleanup or recovery was not confirmed; see the console and documented recovery procedure.':'Session closed.');if(s.phase==='closed')eventsAbort.abort();return;}
 if(closed)return;latestRevision=s.revision;showStatus();if(currentRevision!==s.revision)void loadSnapshot(s.revision,s.scope,s.updatedAt);
}
async function followState(){
 try{const response=await fetch('/events',{headers:{'X-Surveyor-Session':token},cache:'no-store',signal:eventsAbort.signal});
  if(!response.ok||!response.body)throw 0;const reader=response.body.getReader(),decoder=new TextDecoder();let pending='';
  while(!eventsAbort.signal.aborted){const chunk=await reader.read();if(chunk.done)break;pending+=decoder.decode(chunk.value,{stream:true});
   let newline;while((newline=pending.indexOf('\\n'))>=0){const line=pending.slice(0,newline);pending=pending.slice(newline+1);if(line.length>4096)throw 0;receiveState(JSON.parse(line));}
   if(pending.length>4096)throw 0;
  }
  if(!closed&&!eventsAbort.signal.aborted)disconnected();
 }catch{if(!closed&&!eventsAbort.signal.aborted)disconnected();}
}
byId('workspace').onclick=()=>{if(data)returnWorkspace();};byId('diagnostics').onclick=()=>{if(data)openDiagnostics();};
byId('expand-threads').onclick=()=>{if(closed||!data||!hasExpandableThreads(data,groups))return;allThreads=!allThreads;if(!allThreads)expanded.clear();render();};
byId('refresh').onclick=()=>{byId('refresh').disabled=true;void control('/refresh');};byId('cancel').onclick=()=>{void control('/cancel');};
byId('recover').onclick=()=>{byId('recover').disabled=true;void control('/recover');};
byId('close').onclick=async()=>{if(await control('/close')&&!closed)finishView('Session closing; waiting for protected cleanup.');};
function activity(event){if(!event.isTrusted||closed||Date.now()-lastActivity<30000)return;lastActivity=Date.now();void control('/activity');}
addEventListener('click',event=>{activity(event);if(byId('session-menu').open&&event.target&&!byId('session-menu').contains(event.target))byId('session-menu').open=false;});
addEventListener('keydown',event=>{activity(event);if(event.key==='Escape'){
 if(byId('session-menu').open){byId('session-menu').open=false;byId('session-toggle').focus?.();event.preventDefault?.();return;}
 if(view==='diagnostics'&&data)returnWorkspace();else dismissDetails();}});
const ageTimer=setInterval(showStatus,30000);
addEventListener('pagehide',()=>{snapshotLoad.abort();eventsAbort.abort();clearInterval(ageTimer);});
if(/^[a-f0-9]{64}$/.test(token))void followState();else finishView('Local session refused. Open it using Workspace Surveyor.cmd.');
`;
export const reusableExplorerHtml=explorerHtml.replace(/<header>[\s\S]*?<\/header>/,`<header class="session-header"><div class="header-navigation"><div class="brand">Workspace Surveyor <span>for Codex</span></div><nav aria-label="Views"><button id="workspace" aria-pressed="true">Workspace</button><button id="diagnostics" aria-pressed="false">Diagnostics</button></nav></div><div class="header-actions"><button id="refresh">Refresh</button><details id="session-menu" class="session-menu"><summary id="session-toggle">Session</summary><div class="session-popover"><p id="session-close-note">Closing the session disconnects all connected tabs.</p><button id="close" aria-describedby="session-close-note">Close session</button></div></details></div></header>`)
  .replace('<div id="notices"','<div class="refresh-status"><p id="session-status" class="muted" role="status" tabindex="-1">Starting local session…</p><button id="cancel" hidden disabled>Cancel refresh</button><button id="recover" hidden disabled aria-describedby="recovery-note">Recover temporary copies</button></div><p id="recovery-note" class="muted" hidden>Recover authenticated Surveyor copies. If their inventory cannot be verified, preserve one protected incident instead (up to 65 MiB). Original Codex files are not changed.</p><p id="legacy-notice" role="status" hidden>Legacy private copies remain preserved and unresolved. Snapshot cleanup does not resolve that incident.</p><div id="notices"');
