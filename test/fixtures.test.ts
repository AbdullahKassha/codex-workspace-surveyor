import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { scenarios } from '../src/scenarios.js';
import { sameProject } from '../src/model.js';
import { interpret } from '../src/interpret.js';

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf8');

for (const scenario of scenarios) {
  test(`${scenario.name}: fixtures and explanation references are internally valid and synthetic`, () => {
    assert.equal(scenario.synthetic, true);
    assert.equal(scenario.context.platform, 'Windows illustration');
    for (const key of ['appVersion', 'agentVersion', 'windowsBuild', 'schema'] as const) assert.equal(scenario.context[key], 'unknown');
    const sources = new Map(scenario.sources.map(s => [s.id, s]));
    assert.equal(sources.size, scenario.sources.length);
    assert.equal(new Set(scenario.threads).size, scenario.threads.length);
    for (const id of [...sources.keys(), ...scenario.threads]) assert.match(id, /^synthetic-/);
    scenario.projects.forEach((p, i) => {
      assert.match(p.id, /^synthetic-/);
      assert.match(p.namespace, /^synthetic-/);
      assert.equal(scenario.projects.findIndex(other => sameProject(p, other)), i);
    });
    const ids = new Set(scenario.observations.map(o => o.id));
    assert.equal(ids.size, scenario.observations.length);
    for (const o of scenario.observations) {
      assert.match(o.id, /^synthetic-/);
      assert.ok(sources.has(o.sourceId));
      assert.notEqual(sources.get(o.sourceId)?.coverage, 'unavailable');
      assert.match(o.observedAt, /^2000-01-01T00:0[01]:00Z$/);
      if ('path' in o) assert.match(o.path, /^C:\\Synthetic\\/);
      if ('thread' in o) assert.ok(scenario.threads.includes(o.thread));
      if (o.kind === 'root') assert.ok(scenario.projects.some(p => sameProject(p, o.project)));
      if (o.kind === 'assignment' && o.membership.kind === 'assigned') {
        const assigned = o.membership.project;
        assert.ok(scenario.projects.some(p => sameProject(p, assigned)));
      }
    }
    const research = read('docs/research/windows-2026-10-04.md');
    for (const explanation of interpret(scenario).explanations) {
      assert.ok(explanation.subjects.length > 0);
      assert.ok(explanation.evidence.length > 0);
      for (const id of explanation.observationIds) assert.ok(ids.has(id));
      for (const id of explanation.evidence) assert.ok(research.includes(`id="${id.toLowerCase()}"`));
    }
  });
}

test('package metadata exposes only the approved private development surface', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.name, 'codex-workspace-surveyor');
  assert.equal(pkg.private, true);
  assert.equal(pkg.version, '0.1.0');
  assert.match(pkg.description, /Workspace Surveyor for Codex/);
  assert.match(pkg.description, /not affiliated with, endorsed by, or sponsored by OpenAI/);
  assert.match(pkg.repository.url, /\/codex-workspace-surveyor\.git$/);
  assert.deepEqual(Object.keys(pkg.scripts).sort(), ['build', 'cli', 'test', 'typecheck']);
  assert.deepEqual(Object.keys(pkg.devDependencies).sort(), ['@types/node', 'typescript']);
  assert.equal(pkg.dependencies, undefined);
  for (const field of ['bin', 'exports', 'main', 'types', 'workspaces']) assert.equal(pkg[field], undefined);
  for (const version of Object.values(pkg.devDependencies)) assert.match(String(version), /^\d+\.\d+\.\d+$/);
});

test('runtime import surface stays local and lacks acquisition capabilities', () => {
  // A regression guard, supplemented by manual review; not a sandbox proof.
  const files = readdirSync(new URL('src/', root)).filter(name => name.endsWith('.ts'));
  for (const file of files) {
    const source = read(`src/${file}`);
    for (const match of source.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) {
      assert.match(match[1]!, /^\.\/[a-z-]+\.js$/, file);
    }
    assert.doesNotMatch(source, /\b(?:require|import)\s*\(|\b(?:fetch|eval|WebSocket|Function)\s*\(|\bprocess\.(?:env|cwd|chdir|getBuiltinModule)|\bnode:/, file);
    if (file !== 'cli.ts') assert.doesNotMatch(source, /\bprocess\./, file);
  }
});
