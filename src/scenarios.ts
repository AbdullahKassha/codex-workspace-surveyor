import type { DirectoryStatus, Project, Scenario } from './model.js';

// Every identifying value and timestamp below is invented, never a source export.
const context = {
  platform: 'Windows illustration', appVersion: 'unknown', agentVersion: 'unknown',
  windowsBuild: 'unknown', schema: 'unknown',
} as const;
const early = '2000-01-01T00:00:00Z';
const later = '2000-01-01T00:01:00Z';
const path = 'C:\\Synthetic\\atlas';
const a: Project = { namespace: 'synthetic-app', id: 'synthetic-alpha' };
const b: Project = { namespace: 'synthetic-metadata', id: 'synthetic-beta' };
const sameId: Project = { namespace: 'synthetic-metadata', id: 'synthetic-alpha' };
const provenance = (id: string, sourceId: string, observedAt = early) => ({ id, sourceId, observedAt });

const overview: Scenario = {
  name: 'overview', synthetic: true, context,
  description: 'Shared reported paths, separate project namespaces, and unknown membership.',
  sources: [
    { id: 'synthetic-app-source', description: 'Invented project and assignment reports', scope: 'Listed app claims only', coverage: 'complete-within-fixture' },
    { id: 'synthetic-metadata-source', description: 'Invented metadata reports; not a SQLite schema', scope: 'Listed roots and stored CWDs; membership incomplete', coverage: 'partial' },
    { id: 'synthetic-directory-source', description: 'Stipulated directory status; no filesystem check', scope: 'One reported path', coverage: 'complete-within-fixture' },
  ],
  projects: [a, b], threads: ['synthetic-thread-alpha', 'synthetic-thread-beta'],
  observations: [
    { ...provenance('synthetic-o01', 'synthetic-app-source'), kind: 'root', project: a, path },
    { ...provenance('synthetic-o02', 'synthetic-metadata-source'), kind: 'root', project: b, path },
    { ...provenance('synthetic-o03', 'synthetic-app-source'), kind: 'assignment', thread: 'synthetic-thread-alpha', membership: { kind: 'assigned', project: a } },
    { ...provenance('synthetic-o04', 'synthetic-metadata-source'), kind: 'assignment', thread: 'synthetic-thread-beta', membership: { kind: 'unknown', reason: 'An invented null-like membership field is inconclusive.' } },
    { ...provenance('synthetic-o05', 'synthetic-metadata-source'), kind: 'cwd', thread: 'synthetic-thread-alpha', channel: 'stored', path },
    { ...provenance('synthetic-o06', 'synthetic-metadata-source'), kind: 'cwd', thread: 'synthetic-thread-beta', channel: 'stored', path },
    { ...provenance('synthetic-o07', 'synthetic-directory-source'), kind: 'directory', path, status: 'present' },
  ],
};

const disagreement: Scenario = {
  name: 'disagreement', synthetic: true, context,
  description: 'Conflicting reports remain unresolved; observation order does not establish cause.',
  sources: [
    { id: 'synthetic-report-a', description: 'Invented first report', scope: 'Listed roots, assignment and stored CWD', coverage: 'complete-within-fixture' },
    { id: 'synthetic-report-b', description: 'Invented later report', scope: 'Listed roots, assignment and UI-reported CWD', coverage: 'partial' },
    { id: 'synthetic-directory-source', description: 'No directory evidence supplied', scope: 'Reported CWD paths', coverage: 'unavailable' },
  ],
  projects: [a, sameId, b], threads: ['synthetic-thread-alpha'],
  observations: [
    { ...provenance('synthetic-d01', 'synthetic-report-a'), kind: 'root', project: a, path },
    { ...provenance('synthetic-d02', 'synthetic-report-b', later), kind: 'root', project: sameId, path },
    { ...provenance('synthetic-d03', 'synthetic-report-b', later), kind: 'root', project: b, path },
    { ...provenance('synthetic-d04', 'synthetic-report-a'), kind: 'assignment', thread: 'synthetic-thread-alpha', membership: { kind: 'assigned', project: a } },
    { ...provenance('synthetic-d05', 'synthetic-report-b', later), kind: 'assignment', thread: 'synthetic-thread-alpha', membership: { kind: 'assigned', project: sameId } },
    { ...provenance('synthetic-d06', 'synthetic-report-a'), kind: 'cwd', thread: 'synthetic-thread-alpha', channel: 'stored', path },
    { ...provenance('synthetic-d07', 'synthetic-report-b', later), kind: 'cwd', thread: 'synthetic-thread-alpha', channel: 'ui', path: 'C:\\Synthetic\\atlas-reported-later' },
  ],
};

// Explicitly invented cases. Generation only avoids repeating provenance literals;
// it never discovers paths, obtains the current time, or generates random identities.
const statuses = ['present', 'accessible-absence', 'inaccessible', 'offline', 'unsupported', 'uninspected'] as const satisfies readonly DirectoryStatus[];
const coverage: Scenario = {
  name: 'coverage', synthetic: true, context,
  description: 'Accessible absence differs from uncertainty; incomplete membership proves nothing.',
  sources: [
    { id: 'synthetic-thread-source', description: 'Invented thread metadata', scope: 'Six listed stored CWDs; only two membership reports', coverage: 'partial' },
    { id: 'synthetic-directory-source', description: 'Simulated statuses, not filesystem results', scope: 'Six listed paths only', coverage: 'partial' },
    { id: 'synthetic-ui-source', description: 'No UI reports supplied', scope: 'UI membership and CWD', coverage: 'unavailable' },
  ],
  projects: [], threads: statuses.map(status => `synthetic-thread-${status}`),
  observations: [
    { ...provenance('synthetic-c01', 'synthetic-thread-source'), kind: 'assignment', thread: 'synthetic-thread-present', membership: { kind: 'projectless' } },
    { ...provenance('synthetic-c02', 'synthetic-thread-source'), kind: 'assignment', thread: 'synthetic-thread-accessible-absence', membership: { kind: 'unknown', reason: 'An invented null-like field does not establish projectlessness.' } },
    ...statuses.flatMap((status, index) => [
      { ...provenance(`synthetic-c${index + 10}`, 'synthetic-thread-source'), kind: 'cwd' as const, thread: `synthetic-thread-${status}`, channel: 'stored' as const, path: `C:\\Synthetic\\coverage\\${status}` },
      { ...provenance(`synthetic-c${index + 20}`, 'synthetic-directory-source'), kind: 'directory' as const, path: `C:\\Synthetic\\coverage\\${status}`, status },
    ]),
  ],
};

export const scenarios: readonly Scenario[] = [overview, disagreement, coverage];
