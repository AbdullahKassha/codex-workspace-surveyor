import test from 'node:test';
import assert from 'node:assert/strict';
import type { Observation, Scenario } from '../src/model.js';
import { sameProject } from '../src/model.js';
import { interpret } from '../src/interpret.js';
import { render, escapeText } from '../src/render.js';
import { scenarios } from '../src/scenarios.js';

function scenario(name: string): Scenario {
  const found = scenarios.find(s => s.name === name);
  assert.ok(found);
  return found;
}

test('sharing is informational and observations and identities are retained without mutation', () => {
  const input = scenario('overview');
  const before = structuredClone(input);
  const result = interpret(input);
  assert.deepEqual(result.relationships, input.observations);
  assert.deepEqual(input, before);
  assert.equal(result.scenario.projects.length, 2);
  const sharing = result.explanations.filter(e => e.kind === 'shared-cwd');
  assert.equal(sharing.length, 1);
  assert.equal(sharing[0]?.severity, 'info');
  assert.match(sharing[0]!.limitations, /do not establish.*duplicate threads, dependency, ownership/);
  assert.equal(result.explanations.some(e => e.severity === 'warning'), false);
});

test('equal identifiers in different namespaces and three equal roots remain separate', () => {
  const input = scenario('disagreement');
  assert.equal(input.projects[0]!.id, input.projects[1]!.id);
  assert.equal(sameProject(input.projects[0]!, input.projects[1]!), false);
  const result = interpret(input);
  assert.equal(result.scenario.projects.length, 3);
  const ambiguity = result.explanations.find(e => e.kind === 'project-ambiguity');
  assert.equal(ambiguity?.subjects.length, 3);
  assert.equal(ambiguity?.uncertainty, 'unresolved');
  assert.deepEqual(ambiguity?.observationIds, ['synthetic-d01', 'synthetic-d02', 'synthetic-d03']);
});

test('null-like membership, explicit projectlessness, and no membership observation stay distinct', () => {
  const result = interpret(scenario('coverage'));
  const memberships = result.explanations.filter(e => e.kind === 'membership');
  const explicit = memberships.find(e => e.subjects.includes('synthetic-thread-present'))!;
  const unknown = memberships.find(e => e.subjects.includes('synthetic-thread-accessible-absence'))!;
  const omitted = memberships.find(e => e.subjects.includes('synthetic-thread-offline'))!;
  assert.match(explicit.reasoning, /Projectlessness is explicitly reported/);
  assert.equal(explicit.severity, 'info');
  assert.match(unknown.reasoning, /Membership is unknown/);
  assert.equal(unknown.uncertainty, 'unresolved');
  assert.match(omitted.reasoning, /no assignment observation/);
  assert.deepEqual(omitted.observationIds, []);
  assert.match(omitted.limitations, /absence is not deletion/);
});

test('disagreement preserves sources and timing without claiming migration or current runtime', () => {
  const input = scenario('disagreement');
  const result = interpret(input);
  const membership = result.explanations.find(e => e.kind === 'membership')!;
  assert.match(membership.reasoning, /Assignment reports disagree/);
  assert.deepEqual(membership.observationIds, ['synthetic-d04', 'synthetic-d05']);
  const cwd = result.explanations.find(e => e.kind === 'cwd-disagreement')!;
  assert.deepEqual(cwd.observationIds, ['synthetic-d06', 'synthetic-d07']);
  assert.match(cwd.limitations, /does not prove a simultaneous contradiction/);
  const output = render(result);
  assert.match(output, /2000-01-01T00:00:00Z/);
  assert.match(output, /2000-01-01T00:01:00Z/);
  assert.match(output, /synthetic-report-a/);
  assert.match(output, /synthetic-report-b/);
  assert.match(output, /Runtime CWD: unobserved/);
});

test('explicit assignment and an inconclusive report coexist; neither source wins by default', () => {
  const input = scenario('overview');
  const result = interpret({ ...input, observations: input.observations.map(o =>
    o.kind === 'assignment' && o.membership.kind === 'unknown' ? { ...o, thread: 'synthetic-thread-alpha' } : o),
  });
  const membership = result.explanations.find(e => e.kind === 'membership' && e.subjects[0] === 'synthetic-thread-alpha')!;
  assert.match(membership.reasoning, /An explicit assignment is reported/);
  assert.equal(membership.observationIds.length, 2);
});

test('assigned and explicitly projectless reports preserve both claims and their provenance as a conflict', () => {
  const input = scenario('disagreement');
  const claims: readonly Observation[] = [
    {
      id: 'synthetic-assigned-claim', sourceId: 'synthetic-report-a', observedAt: '2000-01-01T00:00:00Z',
      kind: 'assignment', thread: 'synthetic-thread-alpha',
      membership: { kind: 'assigned', project: input.projects[0]! },
    },
    {
      id: 'synthetic-projectless-claim', sourceId: 'synthetic-report-b', observedAt: '2000-01-01T00:01:00Z',
      kind: 'assignment', thread: 'synthetic-thread-alpha', membership: { kind: 'projectless' },
    },
  ];
  for (const observations of [claims, [...claims].reverse()]) {
    const result = interpret({ ...input, observations });
    assert.deepEqual(result.relationships, observations);
    assert.equal(result.relationships.length, 2);
    const retained = result.relationships.filter(o => o.kind === 'assignment');
    assert.deepEqual(retained.map(o => o.membership.kind).sort(), ['assigned', 'projectless']);
    const membership = result.explanations.find(e => e.kind === 'membership')!;
    assert.equal(membership.uncertainty, 'unresolved');
    assert.deepEqual(membership.observationIds, observations.map(o => o.id));
    assert.match(membership.reasoning, /Assignment reports disagree/);
    assert.match(membership.reasoning, /without choosing an authoritative source/);
    assert.match(membership.reasoning, /Differing observation times do not establish a simultaneous contradiction or its cause/);
    assert.doesNotMatch(membership.reasoning, /Membership is unknown|An explicit assignment is reported|Projectlessness is explicitly reported/);
    const output = render(result);
    assert.ok(output.includes('synthetic-thread-alpha reports assignment to synthetic-app/synthetic-alpha\n  Source: synthetic-report-a; illustrative time: 2000-01-01T00:00:00Z'));
    assert.ok(output.includes('synthetic-thread-alpha explicitly reports projectless\n  Source: synthetic-report-b; illustrative time: 2000-01-01T00:01:00Z'));
  }
});

test('only stipulated accessible absence warrants a missing-CWD warning', () => {
  const result = interpret(scenario('coverage'));
  const status = result.explanations.filter(e => e.kind === 'cwd-status');
  assert.equal(status.length, 6);
  assert.deepEqual(status.filter(e => e.severity === 'warning').map(e => e.subjects[0]), ['synthetic-thread-accessible-absence']);
  for (const label of ['inaccessible', 'offline', 'unsupported', 'uninspected']) {
    const explanation = status.find(e => e.subjects.includes(`synthetic-thread-${label}`))!;
    assert.equal(explanation.severity, 'info');
    assert.equal(explanation.uncertainty, 'unresolved');
    assert.match(explanation.reasoning, /warning withheld/);
  }
  assert.match(status.find(e => e.severity === 'warning')!.reasoning, /recurrence is not guaranteed/);
});

test('missing or conflicting directory evidence withholds the warning', () => {
  const input = scenario('coverage');
  const absent = input.observations.find(o => o.kind === 'directory' && o.status === 'accessible-absence')!;
  assert.equal(absent.kind, 'directory');
  const conflicting: Observation = { ...absent, kind: 'directory', path: 'C:\\Synthetic\\coverage\\accessible-absence', status: 'present', id: 'synthetic-conflicting-status' };
  for (const observations of [input.observations.filter(o => o.kind !== 'directory'), [...input.observations, conflicting]]) {
    const explanations = interpret({ ...input, observations }).explanations;
    assert.equal(explanations.some(e => e.severity === 'warning'), false);
    assert.match(explanations.find(e => e.kind === 'cwd-status' && e.subjects[0] === 'synthetic-thread-accessible-absence')!.reasoning, /warning withheld/);
  }
});

test('path aliases, case differences, and similar prefixes acquire no equivalence', () => {
  const input = scenario('overview');
  for (const path of ['C:\\Synthetic\\ATLAS', '\\\\?\\C:\\Synthetic\\atlas', 'C:\\Synthetic\\atlas-other']) {
    const observations = input.observations.map(o =>
      o.id === 'synthetic-o06' || o.id === 'synthetic-o02' ? { ...o, path } : o);
    const result = interpret({ ...input, observations });
    assert.equal(result.explanations.some(e => e.kind === 'shared-cwd' || e.kind === 'project-ambiguity'), false);
    assert.match(result.explanations.find(e => e.kind === 'cwd-status' && e.subjects[0] === 'synthetic-thread-beta')!.reasoning, /no directory observation/);
  }
});

test('duplicate observations for one thread or project do not invent sharing or ambiguity', () => {
  const input = scenario('overview');
  const observations = input.observations.filter(o => o.id === 'synthetic-o01' || o.id === 'synthetic-o05');
  const result = interpret({ ...input, observations: [...observations, ...observations.map(o => ({ ...o, id: `${o.id}-duplicate` }))] });
  assert.equal(result.explanations.some(e => e.kind === 'shared-cwd' || e.kind === 'project-ambiguity'), false);
});

test('terminal controls are escaped in representative paths, identifiers, reasons, and other display values', () => {
  const control = '\u001b[31m\r\n\t\u009b\u202e';
  const escaped = '\\u001b[31m\\u000d\\u000a\\u0009\\u009b\\u202e';
  assert.equal(escapeText(control), escaped);
  const input = scenario('overview');
  const modified: Scenario = {
    ...input, name: `${input.name}${control}`, description: control,
    sources: input.sources.map(s => ({ ...s, id: `${s.id}${control}`, description: control, scope: `${s.scope}${control}` })),
    projects: input.projects.map(p => ({ namespace: `${p.namespace}${control}`, id: `${p.id}${control}` })),
    threads: input.threads.map(thread => `${thread}${control}`),
    observations: input.observations.map(o => {
      const provenance = { id: `${o.id}${control}`, sourceId: `${o.sourceId}${control}`, observedAt: `${o.observedAt}${control}` };
      switch (o.kind) {
        case 'root': return { ...o, ...provenance, path: `${o.path}${control}`, project: { namespace: `${o.project.namespace}${control}`, id: `${o.project.id}${control}` } };
        case 'cwd': return { ...o, ...provenance, thread: `${o.thread}${control}`, path: `${o.path}${control}` };
        case 'directory': return { ...o, ...provenance, path: `${o.path}${control}` };
        case 'assignment': {
          const membership = o.membership;
          return { ...o, ...provenance, thread: `${o.thread}${control}`, membership:
            membership.kind === 'assigned'
              ? { ...membership, project: { namespace: `${membership.project.namespace}${control}`, id: `${membership.project.id}${control}` } }
              : membership.kind === 'unknown' ? { ...membership, reason: `${membership.reason}${control}` } : membership,
          };
        }
      }
    }),
  };
  const before = structuredClone(modified);
  const output = render(interpret(modified));
  assert.doesNotMatch(output, /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u202e]/);
  for (const expected of [
    `reports root C:\\Synthetic\\atlas${escaped}`,
    `reports stored CWD C:\\Synthetic\\atlas${escaped}`,
    `C:\\Synthetic\\atlas${escaped}: simulated present`,
    `[synthetic-o01${escaped}]`,
    `Source: synthetic-app-source${escaped};`,
    `synthetic-app${escaped}/synthetic-alpha${escaped}`,
    `Subjects: synthetic-thread-alpha${escaped}`,
    `membership unknown: An invented null-like membership field is inconclusive.${escaped}`,
  ]) assert.ok(output.includes(expected), `Missing escaped display value: ${expected}`);
  assert.deepEqual(modified, before);
});
