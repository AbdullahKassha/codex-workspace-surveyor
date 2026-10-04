import test from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  appendFileSync, existsSync, linkSync, lstatSync, readFileSync, readdirSync,
  rmdirSync, symlinkSync, unlinkSync, writeFileSync,
} from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { basename, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { inspect } from 'node:util';
import { SyntheticRun, contains, exerciseSynthetic, limits, overlaps } from './support/synthetic-acquisition.js';
import { privacyCanary } from './support/synthetic-fixtures.js';

// All sources are newly constructed invented files. No Codex or personal data.
const simulated = 'simulated-owner-restricted';
function runFor(t: TestContext): SyntheticRun {
  const run = new SyntheticRun(simulated);
  t.after(() => assert.equal(run.cleanup().status, 'removed'));
  return run;
}
function sourceState(run: SyntheticRun) {
  return readdirSync(run.sources).sort().map(name => {
    const path = join(run.sources, name);
    const stat = lstatSync(path, { bigint: true });
    return { name, bytes: readFileSync(path), ino: stat.ino, size: stat.size,
      mtime: stat.mtimeNs, ctime: stat.ctimeNs };
  });
}
function privateFree(value: unknown): void {
  const text = value instanceof Error ? `${String(value)}\n${value.stack}\n${inspect(value)}` : JSON.stringify(value);
  assert.equal(/SYNTHETIC_PRIVATE_|PRIVATE_CONTENT_CANARY|PRIVATE_ERROR_CANARY|[A-Z]:\\|workspace-surveyor-synthetic-|sqlite_schema|private_note/.test(text),
    false, 'Private values must not appear in exceptions or diagnostics');
}

function captureDiagnostics(t: TestContext, operation: () => void): string {
  let text = '';
  const capture = (chunk: unknown): boolean => {
    text += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
    return true;
  };
  const stdout = t.mock.method(process.stdout, 'write', capture);
  const stderr = t.mock.method(process.stderr, 'write', capture);
  try { operation(); }
  finally { stdout.mock.restore(); stderr.mock.restore(); }
  return text;
}

function failRootIdentity(t: TestContext) {
  const original = fs.lstatSync;
  const residuals: { root: string; dev: number; ino: number }[] = [];
  const mocked = t.mock.method(fs, 'lstatSync', (...args: Parameters<typeof fs.lstatSync>) => {
    const target = args[0];
    if (typeof target === 'string' && basename(target).startsWith('workspace-surveyor-synthetic-')) {
      // Record test-owned identity independently; the constructor gets only a fault.
      const stat = original(target);
      residuals.push({ root: target, dev: stat.dev, ino: stat.ino });
      throw Object.assign(new Error(`SYNTHETIC_PRIVATE_INITIALIZATION_CANARY: ${target}`), {
        code: 'EACCES', path: target,
      });
    }
    return Reflect.apply(original, fs, args);
  });
  syncBuiltinESMExports();
  t.after(() => {
    mocked.mock.restore();
    syncBuiltinESMExports();
    // The kernel cannot authenticate these roots. Only the test that created and
    // independently recorded each empty root removes it; no general cleanup sweep.
    for (const { root, dev, ino } of residuals) {
      const stat = lstatSync(root);
      assert.equal(stat.isDirectory() && !stat.isSymbolicLink(), true);
      assert.equal(stat.dev === dev && stat.ino === ino, true);
      assert.equal(readdirSync(root).length, 0);
      rmdirSync(root);
    }
  });
  return residuals;
}

test('root-identity lstat failure is sanitized and conservatively reports residual initialization artifacts', t => {
  const residuals = failRootIdentity(t);
  let failure: unknown;
  const diagnostics = captureDiagnostics(t, () => {
    try { new SyntheticRun(simulated); }
    catch (error) {
      failure = error;
      // Representative caller diagnostics must be safe as well as JSON outcomes.
      console.error(error);
      console.log(String(error));
    }
  });
  assert.equal(residuals.length, 1);
  assert.equal(failure instanceof Error, true);
  assert.equal((failure as Error).message, 'Synthetic run initialization failed; residual synthetic artifacts');
  assert.equal('cause' in (failure as Error), false);
  privateFree(failure);
  privateFree(diagnostics);
  assert.equal(diagnostics.includes('residual synthetic artifacts'), true);
  assert.equal(existsSync(residuals[0]!.root), true);
});

test('wrapper handles constructor lstat failure with sanitized refusal and residual cleanup status', t => {
  const residuals = failRootIdentity(t);
  let result: ReturnType<typeof exerciseSynthetic> | undefined;
  const diagnostics = captureDiagnostics(t, () => {
    result = exerciseSynthetic(['metadata.json'], simulated);
    console.error(result);
  });
  assert.deepEqual(result, {
    outcome: { synthetic: true, protection: simulated, status: 'refused', reason: 'io', files: 0 },
    cleanup: { synthetic: true, status: 'residual' },
  });
  assert.equal(residuals.length, 1);
  assert.equal(existsSync(residuals[0]!.root), true);
  privateFree(result);
  privateFree(diagnostics);
});

test('native scratch protection is unverified: refusal precedes source copying', t => {
  const run = new SyntheticRun();
  t.after(() => assert.equal(run.cleanup().status, 'removed'));
  const result = run.acquire(['standalone.sqlite']);
  assert.equal(result.reason, 'protection-unverified');
  assert.equal(run.writes.length, 0);
  assert.equal(existsSync(run.acquisition), false);
  privateFree(result);
});

test('explicit simulated acquisition preserves standalone SQLite, JSON and WAL committed data', t => {
  const run = runFor(t);
  const before = sourceState(run);
  const result = run.acquire(['standalone.sqlite', 'metadata.json', 'wal.sqlite']);
  assert.deepEqual(result, { synthetic: true, protection: simulated, status: 'acquired', files: 5 });
  assert.deepEqual(sourceState(run), before);
  assert.equal(run.writes.length, 10);
  for (const path of run.writes) {
    assert.equal(contains(run.scratch, path), true);
    assert.equal(overlaps(run.sources, path), false);
  }
  for (const entry of before) {
    assert.deepEqual(readFileSync(join(run.acquisition, entry.name)), entry.bytes);
  }
  assert.equal(readFileSync(join(run.acquisition, 'metadata.json'), 'utf8').includes(privacyCanary), true);
  // The canary is acquired but never part of the result or analysis selection.
  privateFree(result);
});

test('analysis modifications leave both sources and untouched acquisition bytes unchanged', t => {
  const run = runFor(t);
  const before = sourceState(run);
  assert.equal(run.acquire(['standalone.sqlite']).status, 'acquired');
  const path = join(run.analysis, 'standalone.sqlite');
  const db = new DatabaseSync(path, { allowExtension: false, defensive: true });
  try { db.exec('DELETE FROM invented_threads'); } finally { db.close(); }
  assert.deepEqual(sourceState(run), before);
  assert.deepEqual(readFileSync(join(run.acquisition, 'standalone.sqlite')), before.find(v => v.name === 'standalone.sqlite')!.bytes);
  assert.notDeepEqual(readFileSync(path), readFileSync(join(run.acquisition, 'standalone.sqlite')));
});

test('isolated analysis copy without WAL lacks the WAL-dependent committed row', t => {
  const run = runFor(t);
  const before = sourceState(run);
  assert.equal(run.acquire(['wal.sqlite']).status, 'acquired');
  const acquisition = readdirSync(run.acquisition).sort().map(name => ({
    name, bytes: readFileSync(join(run.acquisition, name)),
  }));
  const path = join(run.analysis, 'wal.sqlite');
  const readIds = (): unknown[] => {
    const db = new DatabaseSync(path, { readOnly: true, allowExtension: false, defensive: true });
    try {
      db.exec('PRAGMA trusted_schema=OFF; PRAGMA query_only=ON');
      return db.prepare('SELECT id FROM invented_threads ORDER BY id LIMIT 3').all().map(row => row.id);
    } finally { db.close(); }
  };
  assert.deepEqual(readIds(), ['synthetic-base', 'synthetic-wal-only']);
  // All readers are closed. Re-establish ONLY the analysis database from untouched
  // acquisition bytes, without its companions; no checkpoint or fixture redesign.
  for (const suffix of ['-wal', '-shm']) {
    if (existsSync(path + suffix)) unlinkSync(path + suffix);
  }
  writeFileSync(path, readFileSync(join(run.acquisition, 'wal.sqlite')));
  assert.equal(existsSync(path + '-wal'), false);
  assert.equal(existsSync(path + '-shm'), false);
  assert.deepEqual(readIds(), ['synthetic-base']);
  assert.deepEqual(sourceState(run), before);
  for (const entry of acquisition) assert.deepEqual(readFileSync(join(run.acquisition, entry.name)), entry.bytes);
});

test('selection rejects empty, duplicate, unknown and external targets without reflecting input', t => {
  for (const selected of [[], ['metadata.json', 'metadata.json'], ['unknown'],
    ['../metadata.json'], ['C:\\Synthetic\\PRIVATE_CONTENT_CANARY.sqlite']]) {
    const run = runFor(t);
    const result = run.acquire(selected);
    assert.equal(result.reason, 'selection');
    assert.equal(run.writes.length, 0);
    privateFree(result);
  }
});

test('containment and overlap comparisons distinguish siblings and reject either ancestry direction', () => {
  assert.equal(overlaps('C:\\Synthetic\\Sources', 'C:\\Synthetic\\Sources'), true);
  assert.equal(overlaps('C:\\Synthetic\\Sources', 'C:\\Synthetic\\Sources\\Copy'), true);
  assert.equal(overlaps('C:\\Synthetic\\Sources\\Child', 'C:\\Synthetic\\Sources'), true);
  assert.equal(overlaps('C:\\Synthetic\\Sources', 'C:\\Synthetic\\Sources-extra'), false);
  assert.equal(contains('C:\\Synthetic\\Root', 'C:\\Synthetic\\Root\\..\\Outside'), false);
});

test('scratch redirection is refused; cleanup does not traverse a foreign synthetic run', t => {
  const run = runFor(t);
  const foreign = runFor(t);
  const before = sourceState(foreign);
  // A bounded synthetic junction; no symlink privilege or external targets needed.
  const redirected = join(run.scratch, 'acquisition');
  symlinkSync(foreign.sources, redirected, 'junction');
  const result = run.acquire(['metadata.json']);
  assert.equal(result.status, 'refused');
  assert.equal(run.writes.length, 0);
  assert.equal(run.cleanup().status, 'residual');
  assert.deepEqual(sourceState(foreign), before);
  unlinkSync(redirected); // Exact test-created junction only; do not follow it.
});

test('hard-linked selected files are refused before copying', t => {
  const run = runFor(t);
  const link = join(run.root, 'test-link');
  linkSync(join(run.sources, 'metadata.json'), link);
  const result = run.acquire(['metadata.json']);
  assert.equal(result.reason, 'containment');
  assert.equal(run.writes.length, 0);
  unlinkSync(link);
});

test('unsupported companion sets and rollback journals refuse rather than silently dropping files', t => {
  for (const missing of ['-wal', '-shm']) {
    const run = runFor(t);
    unlinkSync(join(run.sources, 'wal.sqlite' + missing));
    const result = run.acquire(['wal.sqlite']);
    assert.equal(result.reason, 'unsupported-companions');
    assert.equal(run.writes.length, 0);
  }
  const run = runFor(t);
  writeFileSync(join(run.sources, 'standalone.sqlite-journal'), 'synthetic journal');
  assert.equal(run.acquire(['standalone.sqlite']).reason, 'unsupported-companions');
});

test('file, total-byte and file-count limits refuse acquisition without truncating', t => {
  const file = runFor(t);
  writeFileSync(join(file.sources, 'metadata.json'), Buffer.alloc(limits.fileBytes + 1));
  assert.equal(file.acquire(['metadata.json']).reason, 'limit');
  const total = runFor(t);
  for (const name of ['standalone.sqlite', 'wal.sqlite', 'metadata.json']) {
    writeFileSync(join(total.sources, name), Buffer.alloc(100 * 1024));
  }
  assert.equal(total.acquire(['standalone.sqlite', 'wal.sqlite', 'metadata.json']).reason, 'limit');
  const count = runFor(t);
  for (const suffix of ['-wal', '-shm']) writeFileSync(join(count.sources, 'standalone.sqlite' + suffix), 'invented');
  assert.equal(count.acquire(['standalone.sqlite', 'wal.sqlite', 'metadata.json']).reason, 'limit');
  for (const run of [file, total, count]) assert.equal(run.writes.length, 0);
});

test('injected same-length changes are unstable at baseline, copying and post-copy boundaries', t => {
  for (const phase of ['after-baseline', 'before-copy', 'after-copy'] as const) {
    const run = runFor(t);
    const result = run.acquire(['metadata.json'], current => {
      if (current === phase) {
        const path = join(run.sources, 'metadata.json');
        const bytes = readFileSync(path);
        bytes[0] = 32;
        writeFileSync(path, bytes);
      }
    });
    assert.equal(result.reason, 'unstable');
    assert.equal(result.files, 0);
    privateFree(result);
  }
});

test('companion appearance and disappearance after copying withhold all findings', t => {
  const removed = runFor(t);
  const result = removed.acquire(['wal.sqlite'], phase => {
    if (phase === 'after-copy') unlinkSync(join(removed.sources, 'wal.sqlite-wal'));
  });
  assert.equal(result.status, 'refused');
  assert.equal(result.files, 0);
  const added = runFor(t);
  assert.equal(added.acquire(['standalone.sqlite'], phase => {
    if (phase === 'after-copy') {
      for (const suffix of ['-wal', '-shm']) writeFileSync(join(added.sources, 'standalone.sqlite' + suffix), 'invented');
    }
  }).reason, 'unstable');
});

test('injected unreadable/copy failures return fixed codes and default cleanup runs', () => {
  for (const point of ['before-read', 'before-copy'] as const) {
    const result = exerciseSynthetic(['metadata.json'], simulated, phase => {
      if (phase === point) throw new Error('SYNTHETIC_PRIVATE_ERROR_CANARY');
    });
    assert.equal(result.outcome.reason, 'io');
    assert.equal(result.cleanup.status, 'removed');
    privateFree(result);
  }
  // A real exclusive-destination collision after one file was already copied.
  const partial = exerciseSynthetic(['standalone.sqlite', 'metadata.json'], simulated, (phase, run) => {
    if (phase === 'before-copy') writeFileSync(join(run.acquisition, 'metadata.json'), privacyCanary, { flag: 'wx' });
  });
  assert.equal(partial.outcome.reason, 'io');
  assert.equal(partial.outcome.files, 0);
  assert.equal(partial.cleanup.status, 'removed');
  privateFree(partial);
});

test('malformed SQLite/JSON analysis refuses without echoing rows or exception data', t => {
  for (const name of ['standalone.sqlite', 'metadata.json']) {
    const run = runFor(t);
    writeFileSync(join(run.sources, name), privacyCanary);
    const result = run.acquire([name]);
    assert.equal(result.reason, 'unsupported-analysis');
    assert.equal(result.files, 0);
    privateFree(result);
  }
});

test('invented schema drift in an analysis copy disables metadata findings', t => {
  const run = runFor(t);
  const before = sourceState(run);
  const result = run.acquire(['standalone.sqlite'], phase => {
    if (phase === 'before-analysis') {
      const db = new DatabaseSync(join(run.analysis, 'standalone.sqlite'), { allowExtension: false, defensive: true });
      try { db.exec('ALTER TABLE invented_threads ADD COLUMN synthetic_extra TEXT'); }
      finally { db.close(); }
    }
  });
  assert.equal(result.reason, 'unsupported-analysis');
  assert.equal(result.files, 0);
  assert.deepEqual(sourceState(run), before);
  privateFree(result);
});

test('tampered acquisition bytes and analysis redirection are refused', t => {
  const run = runFor(t);
  assert.equal(run.acquire(['metadata.json'], phase => {
    if (phase === 'before-analysis') appendFileSync(join(run.acquisition, 'metadata.json'), ' ');
  }).reason, 'unstable');
  const escaped = runFor(t);
  const foreign = runFor(t);
  const selected = join(escaped.analysis, 'metadata.json');
  assert.equal(escaped.acquire(['metadata.json'], phase => {
    if (phase === 'before-analysis') {
      unlinkSync(selected);
      linkSync(join(foreign.sources, 'metadata.json'), selected);
    }
  }).reason, 'containment');
  unlinkSync(selected);
});

test('cleanup is idempotent and deletes only this run; injected failure reports residual', t => {
  const run = runFor(t);
  const sentinel = runFor(t);
  const before = sourceState(sentinel);
  assert.equal(run.acquire(['wal.sqlite']).status, 'acquired');
  assert.equal(run.cleanup(phase => {
    if (phase === 'before-cleanup') throw new Error(privacyCanary);
  }).status, 'residual');
  assert.equal(existsSync(run.root), true);
  assert.equal(run.cleanup().status, 'removed');
  assert.equal(existsSync(run.root), false);
  assert.equal(run.cleanup().status, 'removed');
  assert.deepEqual(sourceState(sentinel), before);
});

test('default wrapper reports cleanup failure even after a successful synthetic acquisition', () => {
  let residual: SyntheticRun | undefined;
  const result = exerciseSynthetic(['metadata.json'], simulated, (phase, run) => {
    if (phase === 'before-cleanup') {
      residual = run;
      throw new Error(privacyCanary);
    }
  });
  try {
    assert.equal(result.outcome.status, 'acquired');
    assert.equal(result.cleanup.status, 'residual');
    privateFree(result);
  } finally {
    assert.equal(residual?.cleanup().status, 'removed');
  }
});

test('child-directory deletion failure preserves owner authentication for a safe cleanup retry', t => {
  const run = runFor(t);
  assert.equal(run.acquire(['metadata.json']).status, 'acquired');
  const owner = readFileSync(join(run.root, 'owner'));
  const result = run.cleanup(phase => {
    if (phase === 'before-child-rmdir') throw new Error(privacyCanary);
  });
  assert.equal(result.status, 'residual');
  // File deletion has already begun and completed, unlike the pre-cleanup hook.
  assert.equal(readdirSync(run.sources).length, 0);
  assert.equal(readdirSync(run.acquisition).length, 0);
  assert.deepEqual(readFileSync(join(run.root, 'owner')), owner);
  privateFree(result);
  assert.equal(run.cleanup().status, 'removed');
  assert.equal(existsSync(run.root), false);
});

test('final root-rmdir failure retries only the authenticated empty root', t => {
  const run = runFor(t);
  assert.equal(run.acquire(['metadata.json']).status, 'acquired');
  assert.equal(run.cleanup(phase => {
    if (phase === 'before-root-rmdir') throw new Error(privacyCanary);
  }).status, 'residual');
  assert.equal(existsSync(join(run.root, 'owner')), false);
  assert.equal(readdirSync(run.root).length, 0);
  const introduced = join(run.root, 'metadata.json');
  writeFileSync(introduced, privacyCanary);
  assert.equal(run.cleanup().status, 'residual');
  assert.equal(readFileSync(introduced, 'utf8'), privacyCanary);
  unlinkSync(introduced); // Exact test-created file; kernel must not delete it.
  assert.equal(run.cleanup().status, 'removed');
});

test('unknown entries and owner-marker changes stop cleanup before any deletion', t => {
  const run = runFor(t);
  const unknown = join(run.scratch, 'unknown');
  writeFileSync(unknown, privacyCanary);
  const before = sourceState(run);
  assert.equal(run.cleanup().status, 'residual');
  assert.deepEqual(sourceState(run), before);
  unlinkSync(unknown);
  const owner = join(run.root, 'owner');
  const saved = readFileSync(owner);
  writeFileSync(owner, 'synthetic foreign owner');
  assert.equal(run.cleanup().status, 'residual');
  assert.deepEqual(sourceState(run), before);
  writeFileSync(owner, saved);
});

test('kernel and fixture builder stay test-only, with no subprocess/network or source SQLite opens', () => {
  const root = new URL('../../', import.meta.url);
  const kernel = readFileSync(new URL('test/support/synthetic-acquisition.ts', root), 'utf8');
  assert.doesNotMatch(kernel, /node:sqlite|child_process|\bfetch\s*\(|\bprocess\.env|\brmSync\s*\(/);
  const fixture = readFileSync(new URL('test/support/synthetic-fixtures.ts', root), 'utf8');
  assert.doesNotMatch(fixture, /new DatabaseSync\([^\n]*sources|SELECT \*|loadExtension\(|immutable/);
  for (const file of readdirSync(new URL('src/', root))) {
    if (file.endsWith('.ts')) assert.doesNotMatch(readFileSync(new URL(`src/${file}`, root), 'utf8'), /synthetic-acquisition|synthetic-fixtures|support\//);
  }
});
