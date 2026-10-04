// Internal M1 types only: synthetic stipulations, not Codex schemas or public APIs.
export type Project = Readonly<{ namespace: string; id: string }>;

export type Source = Readonly<{
  id: string;
  description: string;
  scope: string;
  coverage: 'complete-within-fixture' | 'partial' | 'unavailable';
}>;

type Provenance = Readonly<{ id: string; sourceId: string; observedAt: string }>;
export type Membership =
  | Readonly<{ kind: 'assigned'; project: Project }>
  | Readonly<{ kind: 'projectless' }>
  | Readonly<{ kind: 'unknown'; reason: string }>;

export type DirectoryStatus =
  | 'present' | 'accessible-absence' | 'inaccessible'
  | 'offline' | 'unsupported' | 'uninspected';

export type Observation = Provenance & (
  | Readonly<{ kind: 'root'; project: Project; path: string }>
  | Readonly<{ kind: 'assignment'; thread: string; membership: Membership }>
  | Readonly<{ kind: 'cwd'; thread: string; channel: 'stored' | 'ui'; path: string }>
  | Readonly<{ kind: 'directory'; path: string; status: DirectoryStatus }>
);

export type Scenario = Readonly<{
  name: string;
  synthetic: true;
  description: string;
  context: Readonly<{
    platform: 'Windows illustration';
    appVersion: 'unknown';
    agentVersion: 'unknown';
    windowsBuild: 'unknown';
    schema: 'unknown';
  }>;
  sources: readonly Source[];
  projects: readonly Project[];
  threads: readonly string[];
  observations: readonly Observation[];
}>;

export type Explanation = Readonly<{
  kind: 'shared-cwd' | 'project-ambiguity' | 'membership' | 'cwd-disagreement' | 'cwd-status';
  severity: 'info' | 'warning';
  uncertainty: 'limited' | 'unresolved';
  subjects: readonly string[];
  observationIds: readonly string[];
  reasoning: string;
  limitations: string;
  evidence: readonly string[];
}>;

export type Interpretation = Readonly<{
  scenario: Scenario;
  relationships: readonly Observation[];
  explanations: readonly Explanation[];
}>;

export function sameProject(a: Project, b: Project): boolean {
  return a.namespace === b.namespace && a.id === b.id;
}

export function projectLabel(project: Project): string {
  return `${project.namespace}/${project.id}`;
}
