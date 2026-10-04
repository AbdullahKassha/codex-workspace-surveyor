import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { run } from '../src/command.js';
import { scenarios } from '../src/scenarios.js';

const root = new URL('../../', import.meta.url);
const cli = fileURLToPath(new URL('dist/src/cli.js', root));
function invoke(args: string[], input?: string) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', timeout: 10_000, cwd: fileURLToPath(root), ...(input === undefined ? {} : { input }) });
}

for (const scenario of scenarios) {
  test(`${scenario.name}: compiled CLI matches reviewed text golden and is deterministic`, () => {
    const result = invoke(['demo', scenario.name]);
    assert.ifError(result.error);
    assert.equal(result.status, 0);
    assert.equal(result.stderr, '');
    const expected = readFileSync(new URL(`test/goldens/${scenario.name}.txt`, root), 'utf8').replace(/\r\n/g, '\n');
    assert.equal(result.stdout, expected);
    assert.equal(invoke(['demo', scenario.name]).stdout, expected);
    assert.match(result.stdout, /^SYNTHETIC DEMONSTRATION — no Codex state inspected\./);
    assert.match(result.stdout, /Workspace Surveyor for Codex/);
  });
}

test('default equals explicit overview, and help/list identify all scenarios', () => {
  assert.equal(invoke(['demo']).stdout, invoke(['demo', 'overview']).stdout);
  for (const args of [[], ['--help'], ['demo', '--help'], ['demo', '--list']]) {
    const result = invoke(args);
    assert.equal(result.status, 0);
    assert.equal(result.stderr, '');
    for (const scenario of scenarios) assert.ok(result.stdout.includes(scenario.name));
  }
});

test('invalid input returns usage status without reflecting arguments or reading stdin', () => {
  assert.equal(invoke(['demo'], 'SYNTHETIC_PRIVATE_STDIN_CANARY').stdout, invoke(['demo']).stdout);
  for (const args of [
    ['scan'], ['demo', 'unknown'], ['demo', 'overview', 'extra'], ['demo', '--json'],
    ['--help', 'extra'], ['demo', '--list', 'extra'], ['demo', '-'],
    ['demo', 'C:\\Synthetic\\PRIVATE_CANARY\u001b[31m'],
  ]) {
    const result = invoke(args);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /Invalid command or scenario/);
    assert.match(result.stderr, /npm run cli -- demo/);
    assert.doesNotMatch(result.stderr, /PRIVATE_CANARY|\u001b/);
  }
});

test('unexpected internal failure returns status 1 without error data or partial output', () => {
  // A throwing argument accessor exercises the catch path without adding runtime hooks.
  const args = new Proxy<string[]>([], { get() { throw new Error('SYNTHETIC_PRIVATE_CANARY'); } });
  const result = run(args);
  assert.equal(result.exitCode, 1);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, 'Internal error while explaining a bundled synthetic scenario.\n');
  assert.doesNotMatch(result.stderr, /CANARY|stack/);
});
