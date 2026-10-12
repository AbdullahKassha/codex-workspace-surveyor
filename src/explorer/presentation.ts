import { locationKey, windowsPathKey, type ExplorerData, type FolderObservation, type GitObservation, type ThreadClaim } from './model.js';

// Existing inert link-label normalization. This is formatting, not qualification.
export function displayTitle(t:{title:string|null;titleSource?:string}):string {
  const value=t.title||'';
  return t.titleSource==='session-index'?value:value.replace(/(?<!!)\[([^\]\r\n]+)\]\((?:[^()\r\n]|\\[()])*\)/g,'$1');
}
export function friendlyTitle(t:ThreadClaim):{label:string;qualification:'session-index'|'skill-link'|'unavailable'} {
  const generic={label:'Thread '+t.id.slice(0,8),qualification:'unavailable' as const};
  if(t.titleSource==='session-index'&&t.titleResolution==='latest'&&t.title?.trim()) {
    const compact=t.title.replace(/\s+/gu,' ').trim(),chars=[...compact];
    return {label:chars.length>120?chars.slice(0,119).join('')+'…':compact,qualification:'session-index'};
  }
  if(t.titleSource!=='sqlite'||t.titleState!=='complete'||!t.title||
    !/^\[\$[A-Za-z0-9][A-Za-z0-9_-]*\]\((?:[^()\r\n]|\\[()])*\)(?: [^\r\n]*)?$/.test(t.title))return generic;
  const normalized=displayTitle(t).trim();
  if(!normalized||[...normalized].length>120||/[\x00-\x1f\x7f-\x9f\u2028\u2029\p{Cf}\p{Cs}]/u.test(normalized)||/[\[\]<>`*_]/.test(normalized.replace(/^\$[A-Za-z0-9_-]+/,'')))return generic;
  return {label:normalized,qualification:'skill-link'};
}
export function folderStatus(f?:FolderObservation):string {
  if(!f)return 'Folder not checked';
  return ({exists:f.inspection==='contents-unavailable'?'Contents not inspected':'',missing:'Missing folder',inaccessible:'Folder inaccessible', 'inspection-error':'Folder check failed',reparse:'Folder not inspected',
    'not-directory':'Path is not a folder',uninspected:'Folder not checked'} as const)[f.state];
}

// A displayed parent expresses only the named, observed relationship. Shared
// locations stay at group level, with references from each user/declarer.
export function locationPlacement(data:ExplorerData,c:WorkspacePresentation,l:WorkspaceLocation):{kind:'thread'|'location';index?:number;path?:string}|null {
  const linked=l.git.find(i=>data.discovery!.git[i]!.state==='verified'&&data.discovery!.git[i]!.kind==='linked');
  if(linked!==undefined){const main=c.locations.find(other=>other!==l&&other.git.some(i=>data.discovery!.git[i]!.state==='verified'&&data.discovery!.git[i]!.kind==='main'&&data.discovery!.git[i]!.commonIdentity===data.discovery!.git[linked]!.commonIdentity));if(main)return {kind:'location',path:main.path};}
  if(!l.projects.length&&l.threads.length===1&&!data.relations.some(r=>r.kind==='assigned-project'&&r.subject===l.threads[0]))return {kind:'thread',index:l.threads[0]!};
  return null;
}
// Routine bounds describe coverage, not a failure. Only observed problems at
// the selected root or displayed working locations need a Workspace notice.
export function discoveryNotice(data:ExplorerData,groups:WorkspacePresentation[]):string|null {
  const d=data.discovery;if(!d)return null;
  if(d.status==='cancelled')return 'Discovery was cancelled. Review diagnostics';
  const root=d.folders.find(f=>locationKey(f.path)===locationKey(d.root));
  if(root&&(root.state!=='exists'||root.inspection==='contents-unavailable'))return 'Discovery root could not be inspected. Review diagnostics';
  if(groups.some(c=>c.locations.some(l=>l.folder!==null&&['inaccessible','inspection-error','uninspected'].includes(d.folders[l.folder]!.state))))return 'Some working folders could not be checked. Review diagnostics';
  return null;
}
export function membershipStatus(value:string):string {
  return ({conflicting:'Conflicting relationship',dangling:'Associated Project unavailable',unknown:'Unknown membership',
    'no-assignment-observed':'Unknown membership'} as Record<string,string>)[value]||'';
}
// Explain snapshot evidence only; these helpers neither observe paths nor add relationships.
export function membershipExplanation(data:ExplorerData,index:number):string {
  const assigned=data.relations.find(r=>r.kind==='assigned-project'&&r.subject===index);
  switch(data.memberships[index]) {
    case 'stored-assignment':return assigned?'Stored assignment links this Thread to '+(data.projects[assigned.target]!.label||'Unnamed Project')+'.':'Project membership remains unknown.';
    case 'projectless':return 'Explicitly recorded as projectless.';
    case 'no-assignment-observed':return 'No assignment was observed; Project membership remains unknown.';
    case 'conflicting':return 'Stored relationship evidence conflicts; Project membership could not be resolved.';
    case 'dangling':return 'A stored assignment references an unavailable Project.';
    default:return data.coverage.projects==='unavailable'||data.coverage.correspondence!=='qualified'?
      'Qualified Project assignment information is unavailable; membership remains unknown.':'The stored assignment could not establish Local Project membership.';
  }
}
export function cwdExplanations(data:ExplorerData,index:number):string[] {
  const t=data.threads[index]!,result:string[]=[];
  if(t.cwd===null)return result;
  const assigned=data.relations.find(r=>r.kind==='assigned-project'&&r.subject===index);
  if(assigned) {
    const p=data.projects[assigned.target]!,matches=data.relations.some(r=>r.subject===index&&r.target===assigned.target&&
      (r.kind==='matches-exact-root'||r.kind==='matches-normalized-root'));
    if(p.roots.length&&!matches)result.push('The stored working directory differs from all declared Source folders. The stored Project assignment remains '+(p.label||'Unnamed Project')+'.');
  }
  const matches=data.relations.filter(r=>r.subject===index&&(r.kind==='matches-exact-root'||r.kind==='matches-normalized-root'));
  if(matches.length) {
    result.push('Its stored CWD matches a Source folder declared by '+matches.map(r=>data.projects[r.target]!.label||'Unnamed Project').join(', ')+'.');
    if(data.memberships[index]!=='stored-assignment'||!assigned||matches.some(r=>r.target!==assigned.target))
      result.push('Matching a Source folder does not establish Project membership.');
  }
  // Use Folder Details' component/location population, not all stored CWD claims.
  const component=data.components.find(c=>c.threads.includes(index));
  const location=component&&workspaceLocations(data,{...component,folders:component.folders??[]})
    .find(l=>locationKey(l.path)===locationKey(t.cwd!));
  const count=location?.threads.length??0;
  if(data.visibility[index]==='inferred'&&count>1)result.push(count+' qualifying Threads report this folder as their stored working directory.');
  return result;
}
export function sourceFolderExplanation(data:ExplorerData,index:number):string {
  return (data.projects[index]!.label||'Unnamed Project')+' declares this Source folder.';
}
export function folderExplanations(data:ExplorerData,location:WorkspaceLocation):string[] {
  const result=location.projects.map(i=>sourceFolderExplanation(data,i)),count=location.threads.length;
  if(count)result.push(count===1?'One qualifying Thread reports this folder as its stored working directory.':
    count+' qualifying Threads report this folder as their stored working directory.');
  const assignments=location.threads.map(i=>data.memberships[i]==='stored-assignment'?
    data.relations.find(r=>r.kind==='assigned-project'&&r.subject===i)?.target:undefined);
  const unambiguous=assignments.length>0&&assignments[0]!==undefined&&assignments.every(i=>i===assignments[0])&&
    (location.projects.length===0||location.projects.length===1&&location.projects[0]===assignments[0]);
  if(location.projects.length>1||!unambiguous&&(count>1||location.projects.length>0&&count>0))
    result.push('Sharing this folder does not establish Project membership.');
  return result;
}
export function gitLinkLabel(g:GitObservation):string {
  return g.state==='verified'?(g.kind==='linked'?'View worktree':'View repository'):'View Git evidence';
}
export function gitExplanation(data:ExplorerData,index:number):string {
  const g=data.discovery!.git[index]!;
  if(g.state!=='verified')return 'Git repository identity was not established from the inspected metadata.';
  const related=g.commonIdentity!==undefined&&data.discovery!.git.some((other,i)=>i!==index&&other.state==='verified'&&other.commonIdentity===g.commonIdentity);
  return related?'Verified Git metadata links these checkouts to the same repository.':
    'Standard '+(g.kind==='linked'?'linked-worktree':'main-repository')+' metadata was verified.';
}
export function projectThreads(data:ExplorerData,index:number):number[] {
  return data.relations.flatMap(r=>r.kind==='assigned-project'&&r.target===index&&data.visibility[r.subject]==='inferred'?[r.subject]:[]);
}
export function hasExpandableThreads(data:ExplorerData,groups:WorkspacePresentation[]):boolean {
  return groups.some(c=>c.projects.some(p=>projectThreads(data,p).filter(i=>c.threads.includes(i)).length>5));
}

// Context is one observed containment edge, never a component or owner. A
// single-child container may accompany its standalone root, but scope roots,
// displayed entities and shared parents cannot provide this context.
export function standaloneParent(data:ExplorerData,groups:WorkspacePresentation[],c:WorkspacePresentation,l:WorkspaceLocation):FolderObservation|null {
  const d=data.discovery;if(!d||c.projects.length||c.threads.length||c.locations.length!==1||l.git.length||l.folder===null)return null;
  const f=d.folders[l.folder],parent=f?.parent;if(parent===undefined)return null;
  const p=d.folders[parent];if(!p||p.origin!=='discovery'||p.state!=='exists'||p.inspection!=='enumerated'||locationKey(p.path)===locationKey(d.root))return null;
  if(['src','test','tests','docs','outputs','work','lib','assets','public','scripts','node_modules','.git','dist','build','out','target','coverage','bin','obj'].includes(p.path.split(/[\\/]/).filter(Boolean).at(-1)!.toLowerCase()))return null;
  if(groups.some(g=>g.locations.some(other=>locationKey(other.path)===locationKey(p.path))))return null;
  if(d.folders.filter(other=>other.parent===parent).length!==1)return null;
  if(!d.relations.some(r=>r.kind==='directory-containment'&&r.subject.kind==='folder'&&r.subject.index===l.folder&&r.target.kind==='folder'&&r.target.index===parent&&r.evidence==='observed-directory'))return null;
  return p;
}

// Lexical presentation only; never adds a relationship or follows a path.
export function folderContains(child:string,parent:string):boolean {
  const c=locationKey(child),p=locationKey(parent),separator=windowsPathKey(child)!==null&&windowsPathKey(parent)!==null?'\\':'/';
  return c===p||c.startsWith(p.endsWith(separator)?p:p+separator);
}

export function folderCoverage(f:FolderObservation,root:string):string {
  const scope=folderContains(f.path,root)?'within selected discovery scope':'outside selected discovery scope';
  const inspection=f.inspection==='enumerated'?'direct children enumerated':f.inspection==='exact-only'?'exact path only; children not enumerated':
    f.inspection==='uninspected'?'children not inspected':f.inspection+'; descent stopped';
  return inspection+' · '+scope;
}

export type WorkspaceLocation={path:string;folder:number|null;git:number[];projects:number[];threads:number[]};
export type WorkspacePresentation={number:number;projects:readonly number[];threads:readonly number[];folders:readonly number[];locations:WorkspaceLocation[]};
export function workspaceLocations(data:ExplorerData,c:{projects:readonly number[];threads:readonly number[];folders:readonly number[]}):WorkspaceLocation[] {
  const found=new Map<string,WorkspaceLocation>(),d=data.discovery;
  const add=(path:string)=>{
    const key=locationKey(path);let location=found.get(key);if(location)return location;
    const folder=d?d.folders.findIndex(f=>f.aliases.some(p=>locationKey(p)===key)):-1;
    location={path:folder>=0?d!.folders[folder]!.path:path,folder:folder>=0?folder:null,
      git:d?d.git.flatMap((g,i)=>g.folder===folder?[i]:[]):[],projects:[],threads:[]};found.set(key,location);return location;
  };
  c.projects.forEach(i=>data.projects[i]!.roots.forEach(p=>{const l=add(p);if(!l.projects.includes(i))l.projects.push(i);}));
  c.threads.forEach(i=>{const p=data.threads[i]!.cwd;if(p!==null)add(p).threads.push(i);});
  c.folders.forEach(i=>add(d!.folders[i]!.path));return [...found.values()];
}
export function workspacePresentation(data:ExplorerData):WorkspacePresentation[] {
  if(!data.discovery)return data.components.map((c,i)=>({...c,number:i+1,folders:[],locations:workspaceLocations(data,{...c,folders:[]})}));
  const d=data.discovery,folders=d.folders,anchors=new Set<number>();
  const nominate=(path:string)=>{const i=folders.findIndex(f=>f.aliases.some(p=>locationKey(p)===locationKey(path)));if(i>=0)anchors.add(i);};
  data.projects.forEach(p=>p.roots.forEach(nominate));
  data.threads.forEach((t,i)=>{if(data.visibility[i]==='inferred'&&t.cwd)nominate(t.cwd);});
  d.git.forEach(g=>{if(g.state==='verified'||folders[g.folder]?.origin==='git-metadata')anchors.add(g.folder);});
  // Nearest observed physical ancestor, independent of semantic components.
  const parents=folders.map((f,i)=>{
    let parent=-1;
    folders.forEach((p,j)=>{if(i!==j&&locationKey(f.path)!==locationKey(p.path)&&folderContains(f.path,p.path)&&
      (parent<0||folderContains(p.path,folders[parent]!.path)))parent=j;});return parent;
  });
  const children=folders.map((_,i)=>parents.flatMap((p,j)=>p===i?[j]:[]));
  const eligible=(i:number)=>folders[i]!.origin==='discovery'&&folders[i]!.state==='exists'&&folders[i]!.inspection!=='excluded';
  const ordinary=new Set(['src','test','tests','docs','outputs','work','lib','assets','public','scripts','node_modules','.git','dist','build','out','target','coverage','bin','obj']);
  const hasAnchor=(i:number)=>[...anchors].some(a=>folderContains(folders[a]!.path,folders[i]!.path));
  const beneathAnchor=(i:number)=>[...anchors].some(a=>a!==i&&folderContains(folders[i]!.path,folders[a]!.path));
  // Unassociated branches are displayed once. Compress structural single-child
  // containers, stopping before ordinary implementation/output directories.
  const select=(i:number):void=>{
    if(anchors.has(i)||beneathAnchor(i))return;
    const kids=children[i]!.filter(eligible);
    if(locationKey(folders[i]!.path)===locationKey(d.root)||hasAnchor(i)||!eligible(i)){kids.forEach(select);return;}
    if(kids.length===1&&!ordinary.has(folders[kids[0]!]!.path.split(/[\\/]/).filter(Boolean).at(-1)!.toLowerCase())){select(kids[0]!);return;}
    anchors.add(i);
  };
  parents.forEach((p,i)=>{if(p<0)select(i);});
  return data.components.filter(c=>c.projects.length||c.threads.length||(c.folders||[]).some(i=>anchors.has(i)))
    .map((c,i)=>{const selected={projects:c.projects,threads:c.threads,folders:(c.folders||[]).filter(j=>anchors.has(j))};
      return {...selected,number:i+1,locations:workspaceLocations(data,selected)};});
}
