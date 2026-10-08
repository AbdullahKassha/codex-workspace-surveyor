import { inspect } from 'node:util';

// Internal observations, independent of acquisition protocols and presentation.
export type Provenance = Readonly<{ namespace: string; from: string; through: string }>;
export type ThreadClaim = Readonly<{ id: string; cwd: string; title: string | null; ambiguous: boolean }>;
export type ProjectClaim = Readonly<{ id: string; label: string | null; roots: readonly string[] }>;
export type AssignmentClaim = Readonly<{ threadId: string; projectId: string }>;
export type Membership = 'stored-assignment' | 'no-assignment-observed' | 'unknown' | 'conflicting' | 'dangling';
export type Coverage = Readonly<{ rowsRead: number; omittedRows: number; ambiguousIds: number;
  titles: 'accepted' | 'unavailable'; projects: 'synthetic-qualified' | 'unavailable';
  unconsumedColumns: boolean; correspondence: 'qualified' | 'unknown' }>;
export type Relation = Readonly<{ kind: 'reports-cwd' | 'assigned-project' | 'declares-root' | 'shares-exact-cwd' | 'matches-exact-root';
  subject: number; target: number; evidence: 'stored' | 'derived-exact-string' }>;
export type ExplorerData = Readonly<{ provenance: Provenance; projectNamespace: string; hostContext:'selected-local-host'; policy:'named-threads-v1'; coverage: Coverage;
  threads: readonly ThreadClaim[]; projects: readonly ProjectClaim[]; assignments: readonly AssignmentClaim[];
  locations: readonly string[]; memberships: readonly Membership[]; relations: readonly Relation[];
  danglingAssignments: number; limitations: readonly string[] }>;

export function reconcile(provenance: Provenance, coverage: Coverage, threads: readonly ThreadClaim[],
  projects: readonly ProjectClaim[], assignments: readonly AssignmentClaim[]): ExplorerData {
  const locations = [...new Set([...threads.map(t => t.cwd), ...projects.flatMap(p => [...p.roots])])];
  const relations: Relation[] = [];
  threads.forEach((t, i) => relations.push({kind:'reports-cwd', subject:i, target:locations.indexOf(t.cwd), evidence:'stored'}));
  projects.forEach((p, i) => p.roots.forEach(root => relations.push({kind:'declares-root', subject:i, target:locations.indexOf(root), evidence:'stored'})));
  const memberships: Membership[] = threads.map((t, i) => {
    if (coverage.projects === 'unavailable' || coverage.correspondence !== 'qualified') return 'unknown';
    const matches = assignments.filter(a => a.threadId === t.id);
    if (!matches.length) return 'no-assignment-observed';
    if (t.ambiguous || new Set(matches.map(a => a.projectId)).size > 1) return 'conflicting';
    const targets = projects.flatMap((p,j) => p.id === matches[0]!.projectId ? [j] : []);
    if (!targets.length) return 'dangling';
    if (targets.length !== 1) return 'conflicting';
    relations.push({kind:'assigned-project',subject:i,target:targets[0]!,evidence:'stored'});
    return 'stored-assignment';
  });
  threads.forEach((t,i) => {
    if (threads.some((other,j) => j !== i && other.cwd === t.cwd))
      relations.push({kind:'shares-exact-cwd',subject:i,target:locations.indexOf(t.cwd),evidence:'derived-exact-string'});
    projects.forEach((p,j) => { if (p.roots.includes(t.cwd))
      relations.push({kind:'matches-exact-root',subject:i,target:j,evidence:'derived-exact-string'}); });
  });
  const data: ExplorerData = {provenance:{...provenance}, projectNamespace:provenance.namespace + ':global-projects', hostContext:'selected-local-host',policy:'named-threads-v1',coverage:{...coverage},
    threads:threads.map(t=>({...t})), projects:projects.map(p=>({...p,roots:[...p.roots]})), assignments:assignments.map(a=>({...a})),
    locations, memberships, relations,
    danglingAssignments:assignments.filter(a=>!threads.some(t=>t.id===a.threadId)||!projects.some(p=>p.id===a.projectId)).length,
    limitations:['Selected copied table only; record visibility and classification unknown.',
      'Stored locations are uninspected exact strings; repository/worktree and runtime identity unknown.',
      'Missing assignment is not projectlessness; a snapshot does not establish stable CWD.',
      'Exact-root matches do not establish membership. Additional columns are unconsumed observations, not proven drift.']};
  for (const t of data.threads) Object.freeze(t);
  for (const p of data.projects) { Object.freeze(p.roots); Object.freeze(p); }
  for (const a of data.assignments) Object.freeze(a);
  for (const r of data.relations) Object.freeze(r);
  for (const v of [data.provenance,data.coverage,data.threads,data.projects,data.assignments,data.locations,data.memberships,data.relations,data.limitations]) Object.freeze(v);
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
