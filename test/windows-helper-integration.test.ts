import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { closeSync, existsSync, lstatSync, openSync, readFileSync, readdirSync, renameSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { basename, join } from 'node:path';
import { release } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { exerciseSynthetic, SyntheticRun, syntheticFailure } from './support/synthetic-acquisition.js';
import { privacyCanary, fixtureNames } from './support/synthetic-fixtures.js';
import { exerciseSyntheticWithWindowsHelper, parseIntegrationFrame } from './support/windows-helper-integration.js';
import type { IntegrationResult } from './support/windows-helper-integration.js';

const enabled = process.platform === 'win32' && process.env.WORKSPACE_SURVEYOR_RUN_HELPER_INTEGRATION === '1';
const empirical = { skip: !enabled, concurrency: false };
function privateFree(value: unknown): void {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  assert.equal(/SYNTHETIC_PRIVATE_|workspace-surveyor-synthetic-|[A-Z]:[\\/]|S-1-\d|\bSDDL\b/i.test(text), false,
    'Only allowlisted synthetic evidence may escape');
}
function removed(result: IntegrationResult): void {
  privateFree(result);
  assert.equal(result.cleanup.status, 'removed');
  assert.equal(result.evidence.exitConfirmed, true);
}
function success(result: IntegrationResult, files: number): void {
  removed(result);
  assert.deepEqual(result.outcome, { synthetic: true, protection: 'windows-helper-synthetic', status: 'acquired', files });
  assert.deepEqual(result.evidence.stages, ['protected-ready', 'handles-held', 'copies-verified', 'verified-held']);
  assert.equal(result.evidence.helperOutcome, 'ok');
}

test('integration remains explicit and native acquisition still refuses', async () => {
  assert.equal(exerciseSynthetic(['metadata.json']).outcome.reason, 'protection-unverified');
  const old = process.env.WORKSPACE_SURVEYOR_RUN_HELPER_INTEGRATION;
  delete process.env.WORKSPACE_SURVEYOR_RUN_HELPER_INTEGRATION;
  try {
    const result = await exerciseSyntheticWithWindowsHelper(['metadata.json']);
    privateFree(result);
    assert.equal(result.outcome.status, 'refused');
    assert.deepEqual(result.evidence.stages, []);
    assert.equal(result.cleanup.status, 'removed');
  } finally {
    if (old !== undefined) process.env.WORKSPACE_SURVEYOR_RUN_HELPER_INTEGRATION = old;
  }
});

test('finite integration frames reject raw diagnostics, extra keys, wrong runs and oversize input', () => {
  for (const raw of [privacyCanary, JSON.stringify({ stage: 'handles-held', run: 'other', count: 1, protected: true }),
    JSON.stringify({ stage: 'handles-held', run: 'invented', count: 1, protected: true, error: privacyCanary }),
    ' '.repeat(8193)]) {
    let caught: unknown;
    try { parseIntegrationFrame(raw, 'invented'); } catch (error) { caught = error; }
    assert.ok(caught instanceof Error);
    privateFree(String(caught)); privateFree(caught.stack!);
  }
});

test('unknown errors cannot expose fields, getters or proxy exceptions through failure classification', () => {
  const unsafe = Object.defineProperties(new Error(privacyCanary), {
    reason: { get() { throw new Error(privacyCanary); } }, cleanup: { get() { throw new Error(privacyCanary); } },
  });
  const proxy = new Proxy({}, { getPrototypeOf() { throw new Error(privacyCanary); } });
  for (const error of [unsafe, proxy, privacyCanary]) {
    const details = syntheticFailure(error);
    assert.deepEqual(details, { reason: 'io' }); privateFree(details);
  }
});

for (const selected of [['standalone.sqlite'], ['metadata.json'], ['wal.sqlite'], [...fixtureNames]]) {
  test(`protected synthetic integration: ${selected.join(', ')}`, empirical, async () => {
    let observed = false;
    const result = await exerciseSyntheticWithWindowsHelper(selected, { hook(phase, run) {
      if (phase === 'copies-verified') {
        observed = true;
        assert.equal(run.writes.length, 0, 'Node never supplies acquisition data');
        for (const name of readdirSync(run.acquisition)) {
          assert.equal(readFileSync(join(run.acquisition, name)).equals(readFileSync(join(run.sources, name))), true,
            'Acquisition bytes equal the synthetic source');
          assert.equal(readFileSync(join(run.analysis, name)).equals(readFileSync(join(run.sources, name))), true,
            'Analysis starts as a separate equal copy');
        }
      }
    } });
    success(result, selected.reduce((count, name) => count + (name === 'wal.sqlite' ? 3 : 1), 0));
    assert.equal(observed, true);
    privateFree({ node: process.versions.node, libuv: process.versions.uv, architecture: process.arch,
      platform: process.platform, windows: release(), ...result.evidence });
  });
}

test('WAL-only committed row survives retained-set integration and analysis leaves acquisition unchanged', empirical, async () => {
  let reached = false;
  let acquired: Buffer | undefined;
  const result = await exerciseSyntheticWithWindowsHelper(['wal.sqlite'], { hook(phase, run) {
    if (phase === 'copies-verified') acquired = readFileSync(join(run.acquisition, 'wal.sqlite-shm'));
    if (phase === 'after-analysis') {
      reached = true;
      // Fixture analysis already checks the WAL-only row. Open only the analysis copy.
      const db = new DatabaseSync(join(run.analysis, 'wal.sqlite'), { readOnly: true, allowExtension: false, defensive: true });
      try { assert.equal(db.prepare('SELECT count(*) AS n FROM invented_threads').get()?.n, 2); }
      finally { db.close(); }
      assert.equal(readFileSync(join(run.acquisition, 'wal.sqlite-shm')).equals(acquired!), true);
    }
  } });
  success(result, 3);
  assert.equal(reached, true);
});

test('protected handles permit readers and deny writers, rename and unlink through final verification', empirical, async () => {
  let held = 0; let released = false;
  const result = await exerciseSyntheticWithWindowsHelper(['metadata.json'], { hook(phase, run) {
    const path = join(run.sources, 'metadata.json');
    if (['handles-held', 'copies-verified', 'verified-held'].includes(phase)) {
      held++;
      const reader = openSync(path, 'r'); closeSync(reader);
      for (const attempt of [() => { const writer = openSync(path, 'r+'); closeSync(writer); }, () => renameSync(path, join(run.sources, 'standalone.sqlite-journal')),
        () => unlinkSync(path)]) {
        assert.throws(attempt, error => ['EBUSY', 'EACCES', 'EPERM'].includes((error as NodeJS.ErrnoException).code ?? ''));
      }
    }
    if (phase === 'after-exit') {
      const writer = openSync(path, 'r+'); closeSync(writer);
      const target = join(run.sources, 'standalone.sqlite-journal');
      renameSync(path, target); unlinkSync(target);
      released = true;
    }
  } });
  success(result, 1); assert.equal(held, 3); assert.equal(released, true);
});

test('writer on a later WAL companion refuses the complete set before destination creation', empirical, async () => {
  let writer: number | undefined; let reached = false; let released = false;
  const result = await exerciseSyntheticWithWindowsHelper(['wal.sqlite'], { hook(phase, run) {
    if (phase === 'after-baseline') { writer = openSync(join(run.sources, 'wal.sqlite-shm'), 'r+'); reached = true; }
    if (phase === 'after-exit') {
      if (writer !== undefined) { closeSync(writer); writer = undefined; }
      assert.deepEqual(readdirSync(run.acquisition), []); assert.deepEqual(readdirSync(run.analysis), []);
      const first = openSync(join(run.sources, 'wal.sqlite'), 'r+'); closeSync(first); released = true;
    }
  } });
  if (writer !== undefined) closeSync(writer);
  removed(result); assert.equal(result.outcome.status, 'refused');
  assert.equal(result.evidence.phase, 'open'); assert.equal(result.evidence.helperOutcome, 'sharing-refused');
  assert.equal(result.evidence.opened, 2); assert.equal(reached && released, true);
});

test('whole-run file count reserves both copies before acquisition, without exceeding the cap', empirical, async () => {
  let reached = false; let empty = false;
  const result = await exerciseSyntheticWithWindowsHelper(['wal.sqlite'], { hook(phase, run) {
    if (phase === 'handles-held') {
      reached = true;
      for (const name of ['wal.sqlite-wal', 'wal.sqlite-shm', 'standalone.sqlite-wal', 'standalone.sqlite-shm',
        'wal.sqlite-journal', 'standalone.sqlite-journal']) writeFileSync(join(run.root, 'builder', name), 'invented');
      for (const name of ['standalone.sqlite-wal', 'standalone.sqlite-shm']) writeFileSync(join(run.sources, name), 'invented');
      // Seventeen owned files fit now; six selected copies would exceed twenty-one.
    }
    if (phase === 'after-exit') empty = readdirSync(run.acquisition).length === 0 && readdirSync(run.analysis).length === 0;
  } });
  removed(result); assert.equal(result.outcome.reason, 'limit'); assert.equal(reached && empty, true);
  assert.deepEqual(result.evidence.stages, ['protected-ready', 'handles-held']);
});

for (const kind of ['mutation', 'companion', 'measurement'] as const) {
  test(`pre-lock ${kind} refuses without copies`, empirical, async () => {
    let reached = false; let empty = false;
    const result = await exerciseSyntheticWithWindowsHelper(['standalone.sqlite'], { hook(phase, run) {
      if (phase === 'after-baseline') {
        reached = true;
        if (kind === 'mutation') writeFileSync(join(run.sources, 'standalone.sqlite'), 'invented changed source');
        if (kind === 'companion') writeFileSync(join(run.sources, 'standalone.sqlite-wal'), 'invented new companion');
        if (kind === 'measurement') throw new Error(privacyCanary);
      }
      if (phase === 'after-exit') empty = readdirSync(run.acquisition).length === 0 && readdirSync(run.analysis).length === 0;
    } });
    removed(result); assert.equal(result.outcome.status, 'refused'); assert.equal(reached && empty, true);
    assert.deepEqual(result.evidence.stages, ['protected-ready']);
  });
}

for (const fault of ['protected', 'root-dacl', 'destination-dacl', 'analysis-dacl', 'partial-copy', 'diagnostic'] as const) {
  test(`helper integration fault evidence: ${fault}`, empirical, async () => {
    let inspected = false; let independentEvidence = false;
    const result = await exerciseSyntheticWithWindowsHelper(['metadata.json'], { fault, hook(phase, run) {
      if (phase !== 'after-exit') return;
      inspected = true;
      if (fault === 'protected' || fault === 'root-dacl') independentEvidence = !existsSync(run.sources);
      if (fault === 'destination-dacl') independentEvidence = lstatSync(join(run.acquisition, 'metadata.json')).size === 0;
      if (fault === 'partial-copy') {
        independentEvidence = lstatSync(join(run.acquisition, 'metadata.json')).size === 16 &&
          readFileSync(join(run.acquisition, 'metadata.json')).equals(readFileSync(join(run.sources, 'metadata.json')).subarray(0, 16)) &&
          readdirSync(run.analysis).length === 0;
      }
      if (fault === 'analysis-dacl' || fault === 'diagnostic') independentEvidence = readdirSync(run.acquisition).length === 1;
    } });
    removed(result); assert.equal(result.outcome.status, 'refused'); assert.equal(inspected && independentEvidence, true);
    const expected = {
      protected: ['protected', 'after-protection'], 'root-dacl': ['protected', 'root-descriptor'],
      'destination-dacl': ['copy', 'destination-descriptor'], 'partial-copy': ['copy', 'after-partial-write'],
      'analysis-dacl': ['verify', 'analysis-descriptor'], diagnostic: ['verify', 'diagnostic'],
    }[fault];
    assert.equal(result.evidence.phase, expected[0]); assert.equal(result.evidence.fault, expected[1]);
    assert.equal(result.evidence.partialWritten, fault === 'partial-copy');
    assert.equal(result.evidence.diagnosticsCaptured, fault === 'diagnostic');
  });
}

test('analysis can change its own bytes while acquisition stays unchanged', empirical, async () => {
  let reached = false;
  const result = await exerciseSyntheticWithWindowsHelper(['metadata.json'], { hook(phase, run) {
    if (phase === 'after-analysis') {
      reached = true;
      const acquisition = readFileSync(join(run.acquisition, 'metadata.json'));
      writeFileSync(join(run.analysis, 'metadata.json'), 'invented post-analysis change');
      assert.equal(readFileSync(join(run.acquisition, 'metadata.json')).equals(acquisition), true);
    }
  } });
  success(result, 1); assert.equal(reached, true);
});

test('integration initialization lstat failure produces sanitized diagnostics and an authenticated test-owned residual', empirical, async t => {
  const original = fs.lstatSync;
  let owned: { root: string; dev: number; ino: number } | undefined;
  const mocked = t.mock.method(fs, 'lstatSync', (...args: Parameters<typeof fs.lstatSync>) => {
    const path = args[0];
    if (typeof path === 'string' && basename(path).startsWith('workspace-surveyor-synthetic-')) {
      const stat = original(path);
      owned = { root: path, dev: stat.dev, ino: stat.ino };
      throw new Error(`${privacyCanary} ${path}`);
    }
    return Reflect.apply(original, fs, args);
  });
  syncBuiltinESMExports();
  let diagnostics = '';
  const capture = (chunk: unknown): boolean => { diagnostics += String(chunk); return true; };
  const stdout = t.mock.method(process.stdout, 'write', capture);
  const stderr = t.mock.method(process.stderr, 'write', capture);
  let result: IntegrationResult;
  try {
    result = await exerciseSyntheticWithWindowsHelper(['metadata.json']);
    console.error(result);
  } finally {
    stdout.mock.restore(); stderr.mock.restore(); mocked.mock.restore(); syncBuiltinESMExports();
    if (owned) {
      const actual = lstatSync(owned.root);
      assert.equal(actual.dev === owned.dev && actual.ino === owned.ino && actual.isDirectory() && !actual.isSymbolicLink(), true);
      assert.deepEqual(readdirSync(owned.root), []);
      rmdirSync(owned.root); // Only this test independently authenticated the failed empty initialization.
    }
  }
  assert.ok(owned); privateFree(result); privateFree(diagnostics);
  assert.equal(result.outcome.status, 'refused'); assert.equal(result.cleanup.status, 'residual');
  assert.deepEqual(result.evidence.stages, []);
});

test('acquisition mutation is refused before final acceptance', empirical, async () => {
  let reached = false;
  const result = await exerciseSyntheticWithWindowsHelper(['metadata.json'], { hook(phase, run) {
    if (phase === 'after-analysis') { reached = true; writeFileSync(join(run.acquisition, 'metadata.json'), 'invented mutation'); }
  } });
  removed(result); assert.equal(result.outcome.status, 'refused'); assert.equal(reached, true);
  assert.equal(result.evidence.stages.includes('verified-held'), false);
});

for (const kind of ['malformed', 'duplicate', 'oversize', 'eof'] as const) {
  test(`helper integration ${kind} failure refuses and cleans`, empirical, async () => {
    let reached = false;
    const result = await exerciseSyntheticWithWindowsHelper(['metadata.json'], {
      corruptFrame(raw) {
        if (raw.includes('protected-ready')) {
          reached = true;
          if (kind === 'malformed') return privacyCanary;
          if (kind === 'oversize') return ' '.repeat(8193);
        }
        if (kind === 'duplicate' && raw.includes('copies-verified')) { reached = true; return raw.replace('copies-verified', 'handles-held'); }
        return raw;
      },
      hook(phase) { if (kind === 'eof' && phase === 'handles-held') { reached = true; throw new Error(privacyCanary); } },
    });
    removed(result); assert.equal(result.outcome.status, 'refused'); assert.equal(reached, true);
  });
}

test('unavailable selected host refuses before creating a run', empirical, async () => {
  const executable = process.env.WORKSPACE_SURVEYOR_HELPER_PWSH;
  delete process.env.WORKSPACE_SURVEYOR_HELPER_PWSH;
  try {
    const result = await exerciseSyntheticWithWindowsHelper(['metadata.json']);
    privateFree(result); assert.equal(result.outcome.status, 'refused'); assert.deepEqual(result.evidence.stages, []);
    assert.equal(result.cleanup.status, 'removed');
  } finally { if (executable) process.env.WORKSPACE_SURVEYOR_HELPER_PWSH = executable; }
});

for (const field of ['opened', 'copied', 'phase'] as const) {
  test(`inconsistent finished ${field} cannot certify acquisition`, empirical, async () => {
    let reached = false;
    const result = await exerciseSyntheticWithWindowsHelper(['metadata.json'], { corruptFrame(raw) {
      const frame = JSON.parse(raw) as Record<string, unknown>;
      if (frame.stage === 'finished') {
        reached = true;
        frame[field] = field === 'opened' ? 0 : field === 'copied' ? false : 'copy';
        return JSON.stringify(frame);
      }
      return raw;
    } });
    removed(result); assert.equal(result.outcome.status, 'refused'); assert.equal(reached, true);
    assert.equal(result.evidence.stages.includes('verified-held'), true);
  });
}

test('unsupported selection never starts a helper', empirical, async () => {
  const result = await exerciseSyntheticWithWindowsHelper(['invented-external.sqlite']);
  privateFree(result); assert.equal(result.outcome.reason, 'selection'); assert.equal(result.cleanup.status, 'removed');
  assert.deepEqual(result.evidence.stages, []);
});

test('synthetic exit uncertainty withholds results and cleanup until independent exit confirmation', empirical, async () => {
  let saved: SyntheticRun | undefined;
  const result = await exerciseSyntheticWithWindowsHelper(['metadata.json'], {
    simulateExitUncertainty: true, hook(phase, run) { if (phase === 'after-exit') saved = run; },
  });
  privateFree(result); assert.equal(result.outcome.status, 'refused'); assert.equal(result.cleanup.status, 'residual');
  assert.equal(result.evidence.exitConfirmed, false); assert.ok(saved);
  // Injection represents uncertainty; the test separately observed actual helper exit.
  assert.equal(existsSync(saved.root), true); assert.equal(saved.cleanup().status, 'removed');
});

test('child deletion failure preserves authentication for exact-run retry and unrelated sentinel survival', empirical, async () => {
  const sentinel = new SyntheticRun('windows-helper-synthetic');
  let saved: SyntheticRun | undefined; let reached = false;
  try {
    const result = await exerciseSyntheticWithWindowsHelper(['metadata.json'], {
      hook(phase, run) { if (phase === 'after-exit') saved = run; },
      cleanupFault(phase) {
        if (phase === 'before-child-rmdir') { reached = true; throw new Error(privacyCanary); }
      },
    });
    privateFree(result); assert.equal(result.outcome.status, 'refused'); assert.equal(result.cleanup.status, 'residual');
    assert.equal(reached, true); assert.ok(saved);
    assert.equal(existsSync(join(saved.root, 'owner')), true); assert.equal(existsSync(sentinel.root), true);
    assert.equal(saved.cleanup().status, 'removed');
  } finally { assert.equal(sentinel.cleanup().status, 'removed'); }
});

test('integration remains outside product imports and supports no helper fallback or public surface', () => {
  const root = new URL('../../', import.meta.url);
  for (const file of readdirSync(new URL('src/', root))) {
    if (file.endsWith('.ts')) assert.doesNotMatch(readFileSync(new URL(`src/${file}`, root), 'utf8'),
      /windows-helper|synthetic-acquisition|child_process|support\//);
  }
  const coordinator = readFileSync(new URL('test/support/windows-helper-integration.ts', root), 'utf8');
  assert.doesNotMatch(coordinator, /\.kill\(|ExecutionPolicy|execSync|powershell\.exe|rmSync/);
  assert.match(coordinator, /shell: false, windowsHide: true/);
  assert.match(coordinator, /WORKSPACE_SURVEYOR_RUN_HELPER_INTEGRATION/);
});
