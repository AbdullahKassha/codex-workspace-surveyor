import { inspect } from 'node:util';

// Internal observations, independent of acquisition protocols and presentation.
export type Provenance = Readonly<{ namespace: string; from: string; through: string }>;
export type ThreadClaim = Readonly<{ id: string; cwd: string | null; title: string | null; titleState?:'complete'|'shortened'|'unavailable'; ambiguous: boolean;
  titleSource?:'session-index'|'sqlite'|'unavailable'; storedTitle?:string|null; titleUpdatedAt?:string;
  titleResolution?:'latest'|'missing'|'conflict'|'invalid'|'unavailable'|'limit';
  sourceState?:'ordinary'|'subagent'|'unknown'; archived?:boolean|null }>;
export type ProjectClaim = Readonly<{ id: string; label: string | null; roots: readonly string[] }>;
export type AssignmentClaim = Readonly<{ threadId: string; projectId: string; projectKind?:string }>;
export type Membership = 'stored-assignment' | 'projectless' | 'no-assignment-observed' | 'unknown' | 'conflicting' | 'dangling';
export type Visibility = 'inferred'|'unknown'|'internal'|'archived';
export type InstructionEntry = Readonly<{path:string; purpose:'directory'|'marker'|'instruction';
  state:'present'|'absent'|'inaccessible'|'uninspected'|'error'; type?:'file'|'directory'|'other'; size?:number;
  reason?:string; obstruction?:string; at?:'target'|'ancestor'}>;
export type InstructionCwd = Readonly<{cwd:string; ancestry:readonly Readonly<{path:string;directory:number;marker?:number;instructions:readonly number[]}>[];
  stop:'marker'|'scope-boundary'|'outside-scope'|'invalid-cwd'|'cwd-limit'|'depth-limit'|'obstruction'|'operations-limit'|'time-limit'|'cancelled'|'inspection-error';
  stoppedAt:string; complete:boolean; candidate?:string}>;
export type InstructionScopeObservation = Readonly<{root:string;from:string;through:string;
  policy:Readonly<{effective:'unknown';assumption:'documented-git';evidence:readonly ['DOC-005','DOC-006']}>;
  entries:readonly InstructionEntry[];cwds:readonly InstructionCwd[];qualifyingCwds:number;
  status:'complete'|'partial'|'cancelled'|'unavailable';operations:number;
  limits:Readonly<{cwds:number;depth:number;operations:number;milliseconds:number}>}>;
export type FolderObservation = Readonly<{path:string; aliases:readonly string[]; origin:'discovery'|'declared'|'git-metadata';
  identity?:Readonly<{device:string;file:string}>;
  state:'exists'|'missing'|'inaccessible'|'inspection-error'|'reparse'|'not-directory'|'uninspected';
  inspection:'enumerated'|'exact-only'|'excluded'|'depth-limit'|'entry-limit'|'contents-unavailable'|'uninspected'; parent?:number;}>;
export type GitObservation = Readonly<{folder:number; kind:'main'|'linked'|'unsupported'; state:'verified'|'missing'|'inaccessible'|'unsupported';
  admin?:string; common?:string; commonIdentity?:string; detail:string}>;
export type PhysicalRelation = Readonly<{kind:'physical-location'|'inside-git-tree'|'same-git-repository'|'directory-containment';
  subject:Readonly<{kind:'project'|'thread'|'folder'|'git';index:number}>;
  target:Readonly<{kind:'folder'|'git';index:number}>; evidence:'observed-path'|'observed-directory'|'lexical-containment'|'verified-git-metadata'}>;
export type DiscoveryDiagnostic=Readonly<{path:string;reason:string;
  stage?:'node-lstat'|'managed-attributes'|'directory-open'|'directory-read'|'directory-entry'|'directory-identity';at?:'target'|'ancestor'}>;
export type DiscoveryObservation = Readonly<{root:string; from:string;through:string;folders:readonly FolderObservation[]; git:readonly GitObservation[];
  relations:readonly PhysicalRelation[]; diagnostics:readonly DiscoveryDiagnostic[];
  status:'complete'|'limited'|'cancelled'; operations:number; entries:number; limits:Readonly<{depth:number;folders:number;entries:number;operations:number;milliseconds:number;git:number}>}>;
export type Coverage = Readonly<{ rowsRead: number; omittedRows: number; ambiguousIds: number;
  sessionIndex?:Readonly<{status:'accepted'|'partial'|'unavailable'|'limit';records:number;invalidRecords:number;duplicates:number;unmatchedIds:number;conflicts:number;enriched:number}>;
  titles: 'accepted' | 'unavailable'; shortenedTitles?:number;unavailableTitles?:number; projects: 'synthetic-qualified' | 'structure-qualified' | 'desktop-registry' | 'unavailable';
  unconsumedColumns: boolean; correspondence: 'qualified' | 'unknown' }>;
export type Relation = Readonly<{ kind: 'reports-cwd' | 'assigned-project' | 'declares-root' | 'shares-exact-cwd' | 'matches-exact-root'|'matches-normalized-root';
  subject: number; target: number; evidence: 'stored' | 'derived-exact-string'|'derived-windows-path' }>;
export type ExplorerData = Readonly<{ provenance: Provenance; projectNamespace: string; hostContext:'selected-local-host'; policy:'named-threads-preview-v1'; coverage: Coverage;
  threads: readonly ThreadClaim[]; projects: readonly ProjectClaim[]; assignments: readonly AssignmentClaim[];
  locations: readonly string[]; memberships: readonly Membership[]; relations: readonly Relation[];
  projectlessIds:readonly string[]; visibility:readonly Visibility[]; staleProjectless:number;
  components:readonly Readonly<{projects:readonly number[];threads:readonly number[];folders?:readonly number[];git?:readonly number[]}>[];
  discovery?:DiscoveryObservation; instructionScope?:InstructionScopeObservation;
  danglingAssignments: number; limitations: readonly string[] }>;

// Lexical comparison only. Refuse ambiguous Win32/device components; never touch paths.
export function windowsPathKey(raw:string):string|null {
  let path=raw;
  if(path.startsWith('\\\\?\\')) {
    path=path.slice(4);
    if(/^UNC\\/i.test(path))path='\\\\'+path.slice(4);
    else if(!/^[A-Za-z]:\\/.test(path))return null;
    if(path.includes('/'))return null;
  } else path=path.replaceAll('/','\\');
  if(/[\x00-\x1f<>"|?*]/.test(path))return null;
  const drive=/^[A-Za-z]:\\/.test(path),unc=path.startsWith('\\\\');
  if(!drive&&!unc)return null;
  const body=path.slice(drive?3:2).replace(/\\$/,'');
  const parts=body?body.split('\\'):[];
  if(unc&&parts.length<2||parts.some(p=>!p||/[. ]$|:/.test(p)||/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(p)))return null;
  // Fold ASCII only: Unicode lowercasing can expand distinct stored sequences.
  return ((drive?path.slice(0,3):'\\\\')+parts.join('\\')).replace(/[A-Z]/g,c=>String.fromCharCode(c.charCodeAt(0)+32));
}
export function locationKey(path:string):string {return windowsPathKey(path)??'exact:'+path;}

export function reconcile(provenance: Provenance, coverage: Coverage, threads: readonly ThreadClaim[],
  projects: readonly ProjectClaim[], assignments: readonly AssignmentClaim[], projectlessIds:readonly string[]=[]): ExplorerData {
  const locations = [...new Set([...threads.flatMap(t => t.cwd===null?[]:[t.cwd]), ...projects.flatMap(p => [...p.roots])])];
  const relations: Relation[] = [];
  threads.forEach((t, i) => {if(t.cwd!==null)relations.push({kind:'reports-cwd', subject:i, target:locations.indexOf(t.cwd), evidence:'stored'});});
  projects.forEach((p, i) => p.roots.forEach(root => relations.push({kind:'declares-root', subject:i, target:locations.indexOf(root), evidence:'stored'})));
  const memberships: Membership[] = threads.map((t, i) => {
    if (coverage.projects === 'unavailable' || coverage.correspondence !== 'qualified') return 'unknown';
    const matches = assignments.filter(a => a.threadId === t.id);
    if (!matches.length) return t.ambiguous?'conflicting':projectlessIds.includes(t.id)?'projectless':'no-assignment-observed';
    if(projectlessIds.includes(t.id))return 'conflicting';
    if(matches.some(a=>a.projectKind!==undefined&&a.projectKind!=='local'))return 'unknown';
    if (t.ambiguous || new Set(matches.map(a => a.projectId)).size > 1) return 'conflicting';
    const targets = projects.flatMap((p,j) => p.id === matches[0]!.projectId ? [j] : []);
    if (!targets.length) return 'dangling';
    if (targets.length !== 1) return 'conflicting';
    relations.push({kind:'assigned-project',subject:i,target:targets[0]!,evidence:'stored'});
    return 'stored-assignment';
  });
  threads.forEach((t,i) => {
    if(t.cwd===null)return;
    if (threads.some((other,j) => j !== i && other.cwd === t.cwd))
      relations.push({kind:'shares-exact-cwd',subject:i,target:locations.indexOf(t.cwd),evidence:'derived-exact-string'});
    projects.forEach((p,j) => { if (p.roots.includes(t.cwd!))
      relations.push({kind:'matches-exact-root',subject:i,target:j,evidence:'derived-exact-string'});
      else if(p.roots.some(root=>windowsPathKey(root)!==null&&windowsPathKey(root)===windowsPathKey(t.cwd!)))
        relations.push({kind:'matches-normalized-root',subject:i,target:j,evidence:'derived-windows-path'}); });
  });
  const visibility:Visibility[]=threads.map((t,i)=>t.sourceState==='subagent'?'internal':t.archived===true?'archived':
    !t.ambiguous&&t.archived===false&&t.sourceState==='ordinary'&&['stored-assignment','projectless'].includes(memberships[i]!)?'inferred':'unknown');
  // Only ordinary-view entities connect components; internal/unknown records cannot bridge groups.
  const parents=Array.from({length:projects.length+threads.length},(_,i)=>i);
  const root=(n:number):number=>{while(parents[n]!==n)n=parents[n]!;return n;};
  const connect=(a:number,b:number)=>{parents[root(a)]=root(b);};
  const at=new Map<string,number>();
  const locate=(path:string,n:number)=>{const key=locationKey(path),prior=at.get(key);if(prior!==undefined)connect(prior,n);else at.set(key,n);};
  projects.forEach((p,i)=>p.roots.forEach(path=>locate(path,i)));
  threads.forEach((t,i)=>{if(visibility[i]==='inferred'&&t.cwd!==null)locate(t.cwd,projects.length+i);});
  relations.forEach(r=>{if(r.kind==='assigned-project'&&visibility[r.subject]==='inferred')connect(r.target,projects.length+r.subject);});
  const groups=new Map<number,{projects:number[];threads:number[]}>();
  const group=(n:number)=>{const key=root(n);let g=groups.get(key);if(!g){g={projects:[],threads:[]};groups.set(key,g);}return g;};
  projects.forEach((_,i)=>group(i).projects.push(i));
  threads.forEach((_,i)=>{if(visibility[i]==='inferred')group(projects.length+i).threads.push(i);});
  const components=[...groups.values()].map(g=>Object.freeze({projects:Object.freeze(g.projects),threads:Object.freeze(g.threads)}));
  const data: ExplorerData = {provenance:{...provenance}, projectNamespace:provenance.namespace + ':global-projects', hostContext:'selected-local-host',policy:'named-threads-preview-v1',coverage:{...coverage},
    threads:threads.map(t=>({...t})), projects:projects.map(p=>({...p,roots:[...p.roots]})), assignments:assignments.map(a=>({...a})),
    locations, memberships, relations,projectlessIds:[...projectlessIds],visibility,components,
    staleProjectless:projectlessIds.filter(id=>!threads.some(t=>t.id===id)).length,
    danglingAssignments:assignments.filter(a=>!threads.some(t=>t.id===a.threadId)||!projects.some(p=>p.id===a.projectId)).length,
    limitations:['Ordinary groups contain metadata-inferred user-facing Threads, not proof of current UI visibility. Registry Projects are also inferred.',
      'Title acceptance checks stored structure; Desktop label semantics require a founder comparison.',
      'Original locations are preserved; Windows comparison is lexical, not physical identity or runtime CWD. Filesystem, repositories and worktrees are uninspected.',
      'Missing assignment is not projectlessness; a snapshot does not establish stable CWD.',
      'Exact-root matches do not establish membership. Additional columns are unconsumed observations, not proven drift.']};
  if(data.coverage.sessionIndex)Object.freeze(data.coverage.sessionIndex);
  for (const t of data.threads) Object.freeze(t);
  for (const p of data.projects) { Object.freeze(p.roots); Object.freeze(p); }
  for (const a of data.assignments) Object.freeze(a);
  for (const r of data.relations) Object.freeze(r);
  for (const v of [data.provenance,data.coverage,data.threads,data.projects,data.assignments,data.locations,data.memberships,data.relations,data.limitations,data.projectlessIds,data.visibility,data.components]) Object.freeze(v);
  return Object.freeze(data);
}

// Explicit one-use local delivery; ordinary inspection never serializes values.
export class ExplorerSnapshot {
  #data: ExplorerData | undefined;
  constructor(data: ExplorerData) { this.#data=data; }
  take(): ExplorerData | undefined { const data=this.#data; this.#data=undefined; return data; }
  discard(): void { this.#data=undefined; }
  toJSON(): object { return {capability:'local-explorer',available:this.#data!==undefined}; }
  [inspect.custom](): object { return this.toJSON(); }
}
