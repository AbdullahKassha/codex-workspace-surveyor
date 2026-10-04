import type { Explanation, Interpretation, Observation, Scenario } from './model.js';
import { projectLabel, sameProject } from './model.js';

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];
const ids = (claims: readonly Observation[]): string[] => claims.map(claim => claim.id);

function sharedCwds(scenario: Scenario): Explanation[] {
  const cwds = scenario.observations.filter(o => o.kind === 'cwd').filter(o => o.channel === 'stored');
  return unique(cwds.map(o => o.path)).flatMap(path => {
    const claims = cwds.filter(o => o.path === path);
    const threads = unique(claims.map(o => o.thread));
    return threads.length < 2 ? [] : [{
      kind: 'shared-cwd', severity: 'info', uncertainty: 'limited',
      subjects: threads, observationIds: ids(claims),
      reasoning: `Threads report the same stored-CWD string: ${path}. Sharing is not inherently a problem.`,
      limitations: 'Matching reported paths do not establish physical identity, duplicate threads, dependency, ownership, or intent. No move or cleanup follows.',
      evidence: ['WIN-003', 'WIN-009'],
    }];
  });
}

function projectAmbiguity(scenario: Scenario): Explanation[] {
  const roots = scenario.observations.filter(o => o.kind === 'root');
  return unique(roots.map(o => o.path)).flatMap(path => {
    const claims = roots.filter(o => o.path === path);
    const projects = claims.map(o => o.project).filter((project, index, all) =>
      all.findIndex(other => sameProject(project, other)) === index);
    return projects.length < 2 ? [] : [{
      kind: 'project-ambiguity', severity: 'info', uncertainty: 'unresolved',
      subjects: projects.map(projectLabel), observationIds: ids(claims),
      reasoning: `Separate project identities report the same root string: ${path}. Candidate correspondence remains ambiguous; no identities are merged.`,
      limitations: 'Namespace plus identifier defines the fixture identity. Equal identifier strings across namespaces and equal roots do not establish a unique mapping or file ownership.',
      evidence: ['WIN-001', 'WIN-004'],
    }];
  });
}

function membershipAndCwd(scenario: Scenario): Explanation[] {
  return scenario.threads.flatMap(thread => {
    const assignments = scenario.observations.filter(o => o.kind === 'assignment').filter(o => o.thread === thread);
    const explicit = assignments.filter(o => o.membership.kind !== 'unknown');
    const first = explicit[0]?.membership;
    const conflict = first !== undefined && explicit.some(({ membership: other }) => {
      if (first.kind !== other.kind) return true;
      return first.kind === 'assigned' && other.kind === 'assigned' && !sameProject(first.project, other.project);
    });
    let reasoning: string;
    if (conflict) {
      reasoning = 'Assignment reports disagree. All claims are retained; membership remains unresolved without choosing an authoritative source. Differing observation times do not establish a simultaneous contradiction or its cause.';
    } else if (first?.kind === 'assigned') {
      reasoning = `An explicit assignment is reported to ${projectLabel(first.project)}. Unknown reports do not cancel it; no universal source hierarchy is inferred.`;
    } else if (first?.kind === 'projectless') {
      reasoning = 'Projectlessness is explicitly reported within the fixture. It is not inherently a defect and does not imply a missing CWD.';
    } else {
      reasoning = assignments.length === 0
        ? 'Membership is unknown: no assignment observation was supplied. Omission does not establish projectlessness.'
        : 'Membership is unknown: inconclusive reports do not establish projectlessness.';
    }
    const result: Explanation[] = [{
      kind: 'membership', severity: 'info', uncertainty: conflict || !first ? 'unresolved' : 'limited',
      subjects: [thread], observationIds: ids(assignments), reasoning,
      limitations: 'Assignment and CWD are separate claims. Coverage and observation times limit conclusions; absence is not deletion, and differing reports do not establish corruption or its cause.',
      evidence: ['WIN-005', 'WIN-006', 'WIN-016'],
    }];
    const cwds = scenario.observations.filter(o => o.kind === 'cwd').filter(o => o.thread === thread);
    if (unique(cwds.map(o => o.path)).length > 1) {
      result.push({
        kind: 'cwd-disagreement', severity: 'info', uncertainty: 'unresolved',
        subjects: [thread], observationIds: ids(cwds),
        reasoning: 'CWD reports contain different path strings. Preserve their stored/UI channels, sources, and observation times without selecting a current location.',
        limitations: 'Different times or path aliases may explain differences. This does not prove a simultaneous contradiction, a migration, its trigger, or runtime CWD.',
        evidence: ['WIN-016'],
      });
    }
    return result;
  });
}

function cwdStatus(scenario: Scenario): Explanation[] {
  const cwds = scenario.observations.filter(o => o.kind === 'cwd').filter(o => o.channel === 'stored');
  return unique(cwds.map(o => o.path)).map(path => {
    const references = cwds.filter(o => o.path === path);
    const checks = scenario.observations.filter(o => o.kind === 'directory').filter(o => o.path === path);
    const statuses = unique(checks.map(o => o.status));
    const absent = statuses.length === 1 && statuses[0] === 'accessible-absence';
    let reasoning: string;
    if (absent) {
      reasoning = `The fixture stipulates accessible local-path absence for ${path}. This illustrates a missing stored-CWD risk. WIN-015 reported replacement-workspace behavior in one founder experiment; recurrence is not guaranteed.`;
    } else if (statuses.length === 1 && statuses[0] === 'present') {
      reasoning = `The fixture stipulates that ${path} was present at the reported time. No missing-CWD warning is warranted.`;
    } else {
      const status = statuses.length === 0 ? 'no directory observation' : statuses.join(', ');
      reasoning = `Missing-CWD warning withheld for ${path}: ${status}. Absence is not established by this evidence.`;
    }
    return {
      kind: 'cwd-status', severity: absent ? 'warning' : 'info',
      uncertainty: statuses.length === 1 && (absent || statuses[0] === 'present') ? 'limited' : 'unresolved',
      subjects: unique(references.map(o => o.thread)), observationIds: ids([...references, ...checks]), reasoning,
      limitations: 'Statuses are synthetic stipulations, not live checks. Times do not establish current availability, cause, abandonment, or deletion safety. Runtime CWD is unobserved; no verification turn is requested.',
      evidence: ['WIN-015'],
    };
  });
}

export function interpret(scenario: Scenario): Interpretation {
  return {
    scenario,
    relationships: [...scenario.observations],
    explanations: [
      ...sharedCwds(scenario), ...projectAmbiguity(scenario),
      ...membershipAndCwd(scenario), ...cwdStatus(scenario),
    ],
  };
}
