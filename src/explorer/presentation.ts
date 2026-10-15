import { locationKey, windowsPathKey, type ExplorerData, type FolderObservation, type GitObservation, type ThreadClaim, type InstructionEntry } from './model.js';

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
// Display/copy only. Leave device/UNC, long and ambiguous spellings untouched.
export function readablePath(raw:string):string {
  if(!/^\\\\\?\\[A-Za-z]:\\/.test(raw))return raw;
  const conventional=raw.slice(4);
  return conventional.length<260&&!/[\p{Cf}\p{Cs}\x7f-\x9f]/u.test(raw)&&
    conventional.split('\\').every(part=>part.length<=255)&&windowsPathKey(raw)!==null&&
    windowsPathKey(raw)===windowsPathKey(conventional)?conventional:raw;
}
export function pathName(path:string):string {return readablePath(path).split(/[\\/]/).filter(Boolean).at(-1)||readablePath(path);}
export function threadDetailsNotes(data:ExplorerData,index:number):string[] {
  const result:string[]=[],assigned=data.relations.find(r=>r.kind==='assigned-project'&&r.subject===index);
  const membership=data.memberships[index];
  if(membership!=='stored-assignment')result.push(membership==='projectless'?'No Project assigned.':
    membership==='conflicting'?'Project membership is conflicting.':membership==='dangling'?'The assigned Project is unavailable.':'Project membership is unknown.');
  const matches=data.relations.filter(r=>r.subject===index&&(r.kind==='matches-exact-root'||r.kind==='matches-normalized-root'));
  if(assigned&&data.threads[index]!.cwd!==null){const project=data.projects[assigned.target]!;
    if(project.roots.length&&!matches.some(r=>r.target===assigned.target))
      result.push('Working folder differs from '+(project.label||'the assigned Project')+"'s Source folders.");
    else if(!project.roots.length)result.push('Source folders for the assigned Project are unavailable.');
  }
  const other=matches.filter(r=>!assigned||r.target!==assigned.target);
  if(other.length)result.push('This folder is also declared by '+other.map(r=>data.projects[r.target]!.label||'Unnamed Project').join(', ')+'. Folder sharing does not establish Project membership.');
  return result;
}
export function folderDetailsNotes(data:ExplorerData,location:WorkspaceLocation):string[] {
  const result:string[]=[];
  if(location.projects.length>1)result.push('Shared Source folder for '+location.projects.map(i=>data.projects[i]!.label||'Unnamed Project').join(', ')+'.');
  if(folderExplanations(data,location).includes('Sharing this folder does not establish Project membership.'))
    result.push('Folder sharing does not establish Project membership.');
  if(!location.projects.length&&!location.threads.length&&!location.git.length)result.push('No associated Project or Thread found in this snapshot.');
  return result;
}
export function instructionPresentation(data:ExplorerData,index:number):{explanations:string[];files:string[];additional:number} {
  const observation=data.instructionScope,cwd=data.threads[index]?.cwd;
  if(!observation||!cwd)return {explanations:['Instruction locations were not checked.'],files:[],additional:0};
  if(data.visibility[index]!=='inferred')return {explanations:['Instruction locations were not checked for this record.'],files:[],additional:0};
  const row=observation.cwds.find(row=>locationKey(row.cwd)===locationKey(cwd));
  if(!row)return {explanations:['Instruction locations were not checked; the working-folder limit was reached.'],files:[],additional:0};
  const entries=row.ancestry.slice().reverse().flatMap(directory=>directory.instructions.map(i=>observation.entries[i]!));
  const files=entries.filter(entry=>entry.state==='present'&&entry.type==='file');
  const explanations:string[]=[];
  if(row.candidate)explanations.push('Under the documented default rule, Codex may stop searching for parent instructions at '+pathName(row.candidate)+' because this folder contains .git.');
  else if(row.stop==='scope-boundary'&&locationKey(row.stoppedAt)===locationKey(observation.root)&&row.ancestry.length>0&&
    locationKey(row.ancestry[0]!.path)===locationKey(row.cwd)&&locationKey(row.ancestry.at(-1)!.path)===locationKey(observation.root)&&
    row.ancestry.every((directory,index)=>{
      const folder=observation.entries[directory.directory],marker=directory.marker===undefined?undefined:observation.entries[directory.marker];
      return (index===0||locationKey(row.ancestry[index-1]!.path).replace(/[\\/][^\\/]+$/,'')===locationKey(directory.path))&&
        folder?.state==='present'&&folder.type==='directory'&&marker?.state==='absent'&&marker.at==='target';
    }))explanations.push('No .git marker found in the folders checked. Folders above '+pathName(observation.root)+' were not checked.');
  else {
    const reasons:Record<string,string>={'scope-boundary':'Parent folders were not fully checked; inspection reached its scope boundary.',
      'outside-scope':'Working folder is outside the inspection scope.','invalid-cwd':'Working folder could not be checked.',
      'cwd-limit':'Working-folder limit reached.','depth-limit':'Parent folders were not fully checked; the folder-depth limit was reached.',
      obstruction:'Search incomplete: a folder or .git entry could not be checked.',
      'operations-limit':'Search incomplete: the check limit was reached.','time-limit':'Search incomplete: the time limit was reached.',
      cancelled:'Instruction search was cancelled.','inspection-error':'Instruction search could not finish.'};
    explanations.push(reasons[row.stop]||'Instruction search is incomplete.');
  }
  if(!files.length)explanations.push(row.ancestry.length>0&&row.ancestry.every(directory=>directory.instructions.length===2&&
    directory.instructions.every(i=>{const entry=observation.entries[i]!;return entry.state==='absent'||
      entry.state==='present'&&(entry.type==='directory'||entry.type==='other');}))?
    'No instruction files found in the folders checked.':'Instruction-file checks are incomplete.');
  if(entries.some(e=>!['present','absent'].includes(e.state))||row.ancestry.some(directory=>directory.instructions.length!==2))
    if(files.length)explanations.push('Some instruction-file checks are incomplete.');
  explanations.push('Actual Desktop settings have not been checked.');
  return {explanations,files:files.slice(0,4).map(e=>e.path),additional:Math.max(0,files.length-4)};
}
export function instructionEntryText(entry:InstructionEntry):string {
  // The shared probe records the failed lookup path even for ordinary ENOENT.
  // For a completed target absence this is the checked target, not a blocker.
  if(entry.state==='absent'&&entry.at==='target'&&entry.reason==='missing'&&
    (!entry.obstruction||entry.obstruction===entry.path))return entry.path+' · Absent · target checked';
  return entry.path+' · '+entry.state+(entry.type?' · '+entry.type:'')+(entry.size===undefined?'':' · '+entry.size+' bytes')+
    (entry.reason?' · '+entry.reason:'')+(entry.obstruction?' · '+entry.at+' obstruction: '+entry.obstruction:'');
}
export function technicalHelp(topic:string,state=''):string {
  if(topic==='Visibility')return ({inferred:'Surveyor considers this Thread eligible for Workspace based on stored Codex data. It has not directly confirmed that the Thread is currently visible inside Codex Desktop.',
    internal:'Stored data identifies an internal or subagent record. Surveyor keeps it out of the ordinary Workspace; this is not a direct Desktop visibility check.',
    archived:'The stored record is marked archived, so Surveyor keeps it out of the ordinary Workspace. This does not prove its current Desktop state.',
    unknown:'The stored data is insufficient or conflicting for ordinary Workspace eligibility. The record remains available for troubleshooting.'} as Record<string,string>)[state]||'Workspace eligibility comes from stored record classification, not a direct Desktop visibility check.';
  if(topic==='Membership')return ({'stored-assignment':"Codex's stored Project assignment associates this Thread with the named Codex Project. This is not guessed from the working-folder name or location.",
    projectless:'Codex data explicitly records no Project assignment. A matching Source folder does not assign the Thread to that Project.',
    conflicting:'Stored assignment or identity evidence conflicts, so Surveyor cannot resolve a single Project membership.',
    dangling:'An assignment names a Project that is unavailable in this snapshot. It does not prove that the Project has been deleted.',
    'no-assignment-observed':'No assignment was observed. Surveyor keeps membership unknown rather than treating the Thread as explicitly projectless.',
    unknown:'Project data, correspondence or assignment evidence is insufficient to establish membership.'} as Record<string,string>)[state]||'Project membership is determined from stored assignment evidence.';
  if(topic==='Title source')return state==='session-index'?'The displayed Thread title came from Codex\'s session index, rather than its folder name. The usual location is %USERPROFILE%\\.codex\\session_index.jsonl; this snapshot does not retain the actual source path.':
    state==='sqlite'?'Title metadata came from the acquired SQLite copy. Surveyor only displays qualified friendly titles; other text stays unavailable to prevent exposing prompt contents.':'A qualified friendly title was not available in the acquired snapshot.';
  if(topic==='Title resolution')return ({latest:'One latest valid session-index name was matched to this retained Thread ID. This qualifies the displayed name, not Workspace visibility.',
    missing:'No matching session-index name was found in the records checked.',conflict:'Competing latest names prevented a single qualified title.',
    invalid:'The matching name did not pass the title checks.',limit:'The bounded title lookup did not complete within its limits.',
    unavailable:'Session-index title enrichment was unavailable.'} as Record<string,string>)[state]||'No session-index title resolution was recorded.';
  if(topic==='Display qualification')return state==='session-index'?'A valid latest session-index name qualified the friendly display title.':state==='skill-link'?'A narrowly qualified skill-link title supplied the display label. Its link destination was not followed and other SQLite text is not exposed.':'No friendly title passed the display checks; Surveyor uses a generic Thread label.';
  if(topic==='Path source')return state==='declared'?'This path was nominated by a stored Source folder or qualifying Thread working folder. It does not by itself establish that the folder exists.':state==='git-metadata'?'Supported Git metadata referenced this location. Its separate inspection and verification results determine what was established.':'Bounded folder discovery encountered this path within the selected scope. This does not assign it to a Codex Project.';
  if(topic==='Stored working directory'||topic==='Working folder')return 'CWD means working directory: the folder path stored with the Thread in Codex data. It is not a measurement of a running process, current folder existence or Project membership.';
  if(topic==='Git verification')return state==='verified'?'Surveyor verified its supported subset of ordinary Git metadata, including reciprocal links for linked worktrees. This establishes the reported repository/worktree association, not Codex Project membership or an effective instruction boundary. Source: DOC-025, official Git layout/worktree documentation.':
    state==='unsupported'?'This metadata layout is outside the supported verification subset. It is not a judgment that the repository is invalid, and does not independently prove a root marker exists.':
    state==='inaccessible'?'Access prevented Git verification. This does not prove a repository or root marker is present or absent.':'Required Git metadata was not found in the inspected locations. Git identity remains unverified; independent marker checks are separate.';
  if(topic==='Root-marker assumption')return 'This interpretation assumes the documented default .git marker. Marker presence is observed independently of Git repository validity. Custom markers or disabled parent search could change the result; effective Desktop configuration was not inspected. A candidate requires ordinary marker presence and completed negative checks at all nearer folders. Source: DOC-005 and DOC-006, reviewed official Codex documentation.';
  if(topic==='Search stopping reason')return ({marker:'The first ordinary .git file or folder was reached after negative checks at every nearer folder. Higher ancestors were not inspected.',
    'scope-boundary':'Inspection reached the permitted folder boundary. Higher ancestors were not checked, so this is not a completed search with no root.',
    obstruction:'A folder or marker could not be checked as an ordinary entry. The exact failure location is retained below.',
    'outside-scope':'The stored working folder is outside the approved inspection scope, so no ancestry was inspected.',
    'invalid-cwd':'The stored working folder did not qualify as a safe local inspection target.',
    'depth-limit':'The maximum number of ancestor folders was checked; remaining parents are unknown.',
    'operations-limit':'The metadata-operation budget stopped further checks.', 'time-limit':'The dispatch deadline stopped new checks; it does not promise interruption of an outstanding operating-system call.',
    cancelled:'Cancellation prevented further dispatch. Earlier checks remain recorded.', 'inspection-error':'Inspection could not finish; successfully acquired evidence remains retained.'} as Record<string,string>)[state]||'The recorded limit prevented further checks; remaining locations are uninspected.';
  if(topic==='Instruction coverage')return state==='complete'?'Marker checks reached a candidate under the documented default assumption. Instruction-file checks can still be incomplete. File presence and size do not prove readability, selection, loading or historical behavior.':'Search coverage is incomplete for the recorded stopping reason. Unchecked ancestors or failed checks can change the candidate; reaching the discovery root is not evidence of a CWD-only boundary.';
  if(topic==='Instruction files')return 'Only AGENTS.override.md and AGENTS.md metadata was checked. The documented order checks override first, then standard and configured fallback names; empty files and size limits can affect selection. Contents, fallback settings and global guidance were not inspected. No file is claimed selected, loaded or applied. Source: DOC-006.';
  if(topic==='Inspection status')return state==='exists'?'Folder metadata was observed. The separate coverage describes whether direct children were enumerated; metadata success does not establish content readability.':
    state==='missing'?'A completed check did not find the folder. This is different from being unable to reach or inspect it.':state==='reparse'?'The path was refused as a link or reparse point to preserve the inspection boundary. Its target was not followed.':
    state==='inaccessible'?'Access prevented folder inspection. The result does not establish ordinary presence or absence.':state==='not-directory'?'The checked entry was not an ordinary directory.':'The folder check was unavailable or incomplete; technical results retain its reason and location.';
  if(topic==='Path relationships')return 'These relationships compare path spellings or observed parent entries. A path-based relationship does not establish physical identity through links, Codex Project membership or instruction loading. Raw references remain available for debugging.';
  if(topic==='Git metadata folders')return 'The administrative folder stores metadata for this checkout. The shared folder stores repository-wide metadata; they usually coincide for a main repository and differ for linked worktrees. Source: DOC-025.';
  if(topic==='Snapshot coverage')return 'This snapshot contains bounded acquired records and separate filesystem observations, with their own time intervals and limits. A source namespace is an opaque identity for comparing snapshots, not a source path. Coverage and unresolved references do not prove that unobserved entities were deleted or that all Desktop state was captured.';
  return '';
}

export type DiagnosticRelationGroup={label:string;rows:{text:string;raw:string;subject:string;target:string;related:string[]}[]};
export function diagnosticRelationGroups(data:ExplorerData,selected:{kind:string;index?:number;path?:string}):DiagnosticRelationGroup[] {
  const found=new Map<string,DiagnosticRelationGroup>();
  const selectedRefs=new Set([selected.kind+':'+selected.index]);
  if(selected.kind==='location'){
    data.locations.forEach((path,index)=>{if(locationKey(path)===locationKey(selected.path||''))selectedRefs.add('location:'+index);});
    data.discovery?.folders.forEach((folder,index)=>{if(locationKey(folder.path)===locationKey(selected.path||''))selectedRefs.add('folder:'+index);});
  }
  const ref=(kind:string,index:number):string=>kind==='project'?'Project '+(data.projects[index]?.label||'Unnamed Project'):
    kind==='thread'?(data.threads[index]?((friendlyTitle(data.threads[index]!).qualification==='unavailable'?'':'Thread ')+friendlyTitle(data.threads[index]!).label):'Thread unavailable'):
    kind==='git'?((data.discovery?.git[index]?.state==='verified'?(data.discovery.git[index]!.kind==='linked'?'Linked worktree ':'Main repository '):'Unverified Git metadata ')+readablePath(data.discovery?.folders[data.discovery.git[index]?.folder??-1]?.path||'unavailable')):
    'Folder '+readablePath(kind==='location'?data.locations[index]||'unavailable':data.discovery?.folders[index]?.path||'unavailable');
  const add=(key:string,label:string,text:string,raw:string,subject:string,target:string)=>{let group=found.get(key);if(!group){group={label,rows:[]};found.set(key,group);}group.rows.push({text,raw,subject,target,related:[...new Set([subject,target])].filter(ref=>!selectedRefs.has(ref))});};
  for(const r of data.relations){
    const subject=r.kind==='declares-root'?'project':'thread',target=['assigned-project','matches-exact-root','matches-normalized-root'].includes(r.kind)?'project':'location';
    const relevant=selected.kind===subject&&selected.index===r.subject||selected.kind===target&&selected.index===r.target||
      selected.kind==='location'&&target==='location'&&selected.path!==undefined&&locationKey(data.locations[r.target]||'')===locationKey(selected.path)||
      selected.kind==='project'&&target==='project'&&selected.index===r.target;
    if(!relevant)continue;
    const verbs:Record<string,string>={'assigned-project':'Assigned Project','declares-root':'Declared Source folders','reports-cwd':'Reported working folders',
      'shares-exact-cwd':'Shared stored working folders','matches-exact-root':'Exact Source-folder matches','matches-normalized-root':'Equivalent Windows path matches'};
    add('stored:'+r.kind,verbs[r.kind]||r.kind,ref(subject,r.subject)+' → '+ref(target,r.target),r.kind+' · '+r.evidence+' · '+subject+':'+r.subject+' → '+target+':'+r.target,subject+':'+r.subject,target+':'+r.target);
  }
  const folder=selected.kind==='location'?data.discovery?.folders.findIndex(f=>locationKey(f.path)===locationKey(selected.path||'')):undefined;
  for(const r of data.discovery?.relations||[]){
    if(!(selected.kind===r.subject.kind&&selected.index===r.subject.index||selected.kind===r.target.kind&&selected.index===r.target.index||selected.kind==='location'&&(r.subject.kind==='folder'&&r.subject.index===folder||r.target.kind==='folder'&&r.target.index===folder)))continue;
    const verbs:Record<string,string>={'physical-location':'Recorded folder associations','inside-git-tree':'Paths within Git working tree','same-git-repository':'Verified repository associations','directory-containment':'Observed parent-folder relationships'};
    const groupTarget=r.target.kind==='git'?ref('git',r.target.index):'';
    add('filesystem:'+r.kind+':'+(r.target.kind==='git'?r.target.index:''),(verbs[r.kind]||r.kind)+(groupTarget?' — '+groupTarget:''),
      ref(r.subject.kind,r.subject.index)+' → '+ref(r.target.kind,r.target.index),r.kind+' · '+r.evidence+' · '+r.subject.kind+':'+r.subject.index+' → '+r.target.kind+':'+r.target.index,r.subject.kind+':'+r.subject.index,r.target.kind+':'+r.target.index);
  }
  return [...found.values()];
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
