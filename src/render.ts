import type { Interpretation, Observation } from './model.js';
import { projectLabel } from './model.js';

// Escape terminal controls and directional formatting without altering stored values.
export function escapeText(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f-\u009f\u2028-\u202e\u2066-\u2069]/g,
    char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

function relationshipText(observation: Observation): string {
  switch (observation.kind) {
    case 'root': return `${projectLabel(observation.project)} reports root ${observation.path}`;
    case 'cwd': return `${observation.thread} reports ${observation.channel === 'ui' ? 'UI-reported' : 'stored'} CWD ${observation.path}`;
    case 'directory': return `${observation.path}: simulated ${observation.status}`;
    case 'assignment': {
      const m = observation.membership;
      if (m.kind === 'assigned') return `${observation.thread} reports assignment to ${projectLabel(m.project)}`;
      if (m.kind === 'projectless') return `${observation.thread} explicitly reports projectless`;
      return `${observation.thread} membership unknown: ${m.reason}`;
    }
  }
}

export function render(result: Interpretation): string {
  const { scenario } = result;
  const lines = [
    'SYNTHETIC DEMONSTRATION — no Codex state inspected.',
    'Workspace Surveyor for Codex', '',
    `Scenario: ${escapeText(scenario.name)}`,
    escapeText(scenario.description),
    `Context: ${scenario.context.platform}; all timestamps are invented and illustrative.`,
    `Codex app: ${scenario.context.appVersion}; agent: ${scenario.context.agentVersion}; Windows build: ${scenario.context.windowsBuild}; real schemas: ${scenario.context.schema}.`,
    'Runtime CWD: unobserved.', '',
    'Source coverage (complete means complete within the stated fixture scope only):',
    ...scenario.sources.map(source => `- ${escapeText(source.id)}: ${source.coverage}; ${escapeText(source.scope)}. ${escapeText(source.description)}.`),
    '', 'Reported relationships (synthetic stipulations):',
    ...result.relationships.map(o => `- [${escapeText(o.id)}] ${escapeText(relationshipText(o))}\n  Source: ${escapeText(o.sourceId)}; illustrative time: ${escapeText(o.observedAt)}`),
    '', 'Explanations (design interpretations):',
  ];
  for (const explanation of result.explanations) {
    lines.push(
      `- [${explanation.severity.toUpperCase()}] ${explanation.kind}; uncertainty: ${explanation.uncertainty}`,
      `  Subjects: ${explanation.subjects.map(escapeText).join(', ')}`,
      `  Observations: ${explanation.observationIds.length ? explanation.observationIds.map(escapeText).join(', ') : 'none supplied for this relationship; see source coverage'}`,
      `  ${escapeText(explanation.reasoning)}`,
      `  Limits: ${escapeText(explanation.limitations)}`,
      `  Basis: ${explanation.evidence.map(escapeText).join(', ')} — founder-observed evidence; historical versions unknown.`,
    );
  }
  lines.push('', 'Evidence references (repository documents; historical motivation only):');
  const evidence = [...new Set(result.explanations.flatMap(e => e.evidence))].sort();
  lines.push(...evidence.map(id => `- ${id}: docs/research/windows-2026-10-04.md#${id.toLowerCase()}`));
  lines.push('', 'Limitations:',
    '- Synthetic examples are not empirical evidence or reproductions of Codex behavior.',
    '- Path comparisons use exact strings only; physical identity and aliases are unresolved.',
    '- Partial/unavailable coverage and omitted observations prove neither deletion nor corruption.',
    '- No supported real audit, cleanup advice, migration, or Project Boundary Diagnostics is provided.',
  );
  return `${lines.join('\n')}\n`;
}
