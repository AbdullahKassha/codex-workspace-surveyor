import test from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import {
  accessSync, chmodSync, closeSync, constants, fstatSync, lstatSync, mkdirSync,
  mkdtempSync, openSync, readSync, readdirSync, realpathSync, renameSync,
  readFileSync, rmdirSync, unlinkSync, writeSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import { release, tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

// Deliberately mutable, invented control probes; never acquisition sources.
// No exported interface, SQLite, helper, competing process, or private input.
const windows = { skip: process.platform !== 'win32', concurrency: false };
const caps = Object.freeze({ files: 8, directories: 4, fileBytes: 4096, totalBytes: 32768 });
const names = ['permission.bin', 'reader-first.bin', 'writer-first.bin',
  'rename.bin', 'renamed.bin', 'delete.bin', 'exclusive.bin'] as const;
type Name = typeof names[number];
type Attempt = 'succeeded' | 'denied' | 'exists';
type Cleanup = 'removed' | 'residual';
type Value = boolean | number | Attempt;
type Observation = Readonly<Record<string, Value>>;
type Reason = 'io' | 'scope' | 'privacy';
type Fault = (phase: 'initialized' | 'before-child-rmdir' | 'before-root-rmdir') => void;
type Result = Readonly<{
  synthetic: true; status: 'observed' | 'stopped'; cleanup: Cleanup;
  reason?: Reason; observations?: readonly Observation[];
}>;
const initial = Buffer.from('SYNTHETIC_CONTROL_BYTES_00000000');
const updated = Buffer.from('SYNTHETIC_CONTROL_BYTES_11111111');
const canary = 'SYNTHETIC_PRIVATE_CONTROL_CANARY';
class Stop extends Error {
  constructor(readonly reason: Reason) {
    super('Synthetic control probe stopped');
    this.name = 'SyntheticControlStop';
    this.stack = `${this.name}: ${this.message}`;
  }
}
function contains(parent: string, child: string): boolean {
  const delta = relative(resolve(parent), resolve(child));
  return delta === '' || (!isAbsolute(delta) && delta !== '..' && !delta.startsWith(`..${sep}`));
}
function fail(): never { throw new Stop('scope'); }
function attempt(operation: () => void): Attempt {
  try { operation(); return 'succeeded'; }
  catch (error) {
    if (error instanceof Stop) throw error;
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'EEXIST') return 'exists';
    if (code === 'EACCES' || code === 'EPERM' || code === 'EBUSY') return 'denied';
    // Unknown failures stop the experiment; raw diagnostics never escape.
    throw new Stop('io');
  }
}
function privateFree(text: string): boolean {
  return !/SYNTHETIC_PRIVATE_|[A-Z]:[\\/]|workspace-surveyor-controls-|\\\\|\b(?:cause|stack|path)\b/.test(text);
}
function safeObservations(values: readonly Observation[]): boolean {
  const keys = new Set(['requested', 'directoryMode', 'fileMode', 'readAccess', 'writeAccess',
    'daclVerified', 'writerFirst', 'secondOpen', 'bytesMatch', 'exclusionDisproved',
    'renamed', 'originalPresent', 'destinationPresent', 'renameBytesMatch', 'unlinked',
    'deletePendingNamePresent', 'deletedAfterClose', 'deleteBytesMatch', 'secondCreate', 'writerOpen']);
  const modes = new Set(['requested', 'directoryMode', 'fileMode']);
  const attempts = new Set(['readAccess', 'writeAccess', 'secondOpen', 'renamed', 'unlinked', 'secondCreate', 'writerOpen']);
  return values.length <= 3 && values.every(value => Object.entries(value).every(([key, item]) =>
    keys.has(key) && (modes.has(key)
      ? typeof item === 'number' && Number.isInteger(item) && item >= 0 && item <= 0o777
      : attempts.has(key) ? ['succeeded', 'denied', 'exists'].includes(String(item)) : typeof item === 'boolean')));
}

class ProbeRun {
  root: string | undefined;
  private identity: { dev: bigint; ino: bigint } | undefined;
  private readonly token = Buffer.from(randomUUID());
  private readonly handles = new Set<number>();
  private created = 0;
  private bytes = this.token.length;
  private markerRemoved = false;
  private removed = false;

  initialize(): void {
    const temporary = realpathSync(tmpdir());
    if (contains(temporary, process.cwd()) || contains(process.cwd(), temporary) ||
        temporary.split(/[\\/]/).some(part => part.toLowerCase() === '.codex')) fail();
    this.root = mkdtempSync(join(temporary, 'workspace-surveyor-controls-'));
    this.identity = lstatSync(this.root, { bigint: true });
    this.check(this.root, true);
    const fd = openSync(join(this.root, 'owner'), 'wx', 0o600);
    this.handles.add(fd);
    if (writeSync(fd, this.token, 0, this.token.length, 0) !== this.token.length) fail();
    this.close(fd);
    this.created = 1;
    mkdirSync(join(this.root, 'fixtures'), { mode: 0o700 });
    this.owned();
  }

  private check(path: string, directory: boolean): void {
    const root = this.root;
    const identity = this.identity;
    if (!root || !identity || this.removed || !contains(root, path)) fail();
    const rootStat = lstatSync(root, { bigint: true });
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink() ||
        rootStat.dev !== identity.dev || rootStat.ino !== identity.ino) fail();
    let current = resolve(path);
    while (true) {
      const stat = lstatSync(current);
      if (stat.isSymbolicLink() || (current === resolve(path) &&
          (directory ? !stat.isDirectory() : !stat.isFile() || stat.nlink !== 1 || stat.size > caps.fileBytes))) fail();
      if (current === resolve(root)) break;
      current = dirname(current);
    }
    if (relative(resolve(path), realpathSync(path)) !== '') fail();
  }

  private owned(): void {
    if (!this.root) fail();
    const marker = join(this.root, 'owner');
    this.check(marker, false);
    const before = lstatSync(marker, { bigint: true });
    const fd = openSync(marker, 'r');
    this.handles.add(fd);
    try {
      const stat = fstatSync(fd, { bigint: true });
      if (stat.dev !== before.dev || stat.ino !== before.ino || stat.size !== BigInt(this.token.length)) fail();
      const bytes = Buffer.alloc(this.token.length + 1);
      const count = readSync(fd, bytes, 0, bytes.length, 0);
      if (count !== this.token.length || !bytes.subarray(0, count).equals(this.token)) fail();
    } finally { this.close(fd); }
  }

  path(name: Name): string {
    if (!this.root || !names.includes(name)) fail();
    this.owned();
    const parent = join(this.root, 'fixtures');
    this.check(parent, true);
    return join(parent, name);
  }

  create(name: Name, bytes: Buffer = initial, retain = false): number | undefined {
    if (bytes.length > caps.fileBytes || this.created + 1 > caps.files || this.bytes + bytes.length > caps.totalBytes) fail();
    const fd = openSync(this.path(name), 'wx', 0o600);
    this.handles.add(fd);
    this.created++;
    this.bytes += bytes.length;
    if (writeSync(fd, bytes, 0, bytes.length, 0) !== bytes.length) fail();
    if (retain) return fd;
    this.close(fd);
    return undefined;
  }

  open(name: Name, flags: 'r' | 'r+' | 'wx'): number {
    const path = this.path(name);
    this.check(path, false);
    const before = lstatSync(path, { bigint: true });
    const fd = openSync(path, flags);
    this.handles.add(fd);
    const stat = fstatSync(fd, { bigint: true });
    if (stat.dev !== before.dev || stat.ino !== before.ino || stat.size !== before.size) fail();
    return fd;
  }

  close(fd: number): void { closeSync(fd); this.handles.delete(fd); }

  update(fd: number): void {
    if (!this.handles.has(fd) || initial.length !== updated.length ||
        fstatSync(fd).size !== updated.length) fail();
    if (writeSync(fd, updated, 0, updated.length, 0) !== updated.length) fail();
  }

  matches(fd: number, expected: Buffer): boolean {
    if (!this.handles.has(fd) || expected.length > caps.fileBytes) fail();
    const bytes = Buffer.alloc(expected.length + 1);
    const count = readSync(fd, bytes, 0, bytes.length, 0);
    return count === expected.length && bytes.subarray(0, count).equals(expected);
  }

  unexpectedEntry(create: boolean): void {
    this.owned();
    const path = join(this.root!, 'unexpected');
    if (create) {
      if (this.created + 1 > caps.files || this.bytes + initial.length > caps.totalBytes) fail();
      const fd = openSync(path, 'wx', 0o600);
      this.handles.add(fd);
      this.created++; this.bytes += initial.length;
      if (writeSync(fd, initial, 0, initial.length, 0) !== initial.length) fail();
      this.close(fd);
    } else {
      // Only the injecting test can request removal of this fixed synthetic entry.
      this.check(path, false);
      unlinkSync(path);
    }
  }

  cleanup(fault?: Fault): Cleanup {
    if (this.removed) return 'removed';
    for (const fd of this.handles) {
      try { this.close(fd); } catch { /* Retain the handle and refuse deletion. */ }
    }
    if (this.handles.size > 0 || !this.root || !this.identity) return 'residual';
    try {
      const root = this.root;
      if (!this.markerRemoved) {
        this.owned();
        const files: string[] = [];
        const directories: string[] = [];
        let totalBytes = 0;
        let directoryCount = 1;
        const walk = (dir: string): void => {
          this.check(dir, true);
          for (const name of readdirSync(dir)) {
            const path = join(dir, name);
            const location = relative(root, path).split(sep).join('/');
            if (location === 'fixtures') {
              if (++directoryCount > caps.directories) fail();
              walk(path); directories.push(path);
            } else {
              if (location !== 'owner' && !names.some(known => location === `fixtures/${known}`)) fail();
              this.check(path, false);
              totalBytes += lstatSync(path).size;
              files.push(path);
              if (files.length > caps.files || totalBytes > caps.totalBytes) fail();
            }
          }
        };
        walk(root);
        this.owned();
        const owner = join(root, 'owner');
        for (const file of files) {
          if (file === owner) continue;
          this.owned(); this.check(file, false); unlinkSync(file);
        }
        for (const directory of directories) {
          fault?.('before-child-rmdir');
          this.owned(); this.check(directory, true); rmdirSync(directory);
        }
        this.owned(); unlinkSync(owner); this.markerRemoved = true;
      }
      fault?.('before-root-rmdir');
      this.check(root, true);
      if (readdirSync(root).length !== 0) fail();
      rmdirSync(root); this.removed = true;
      return 'removed';
    } catch { return 'residual'; }
  }
}

function execute(operation: (run: ProbeRun) => readonly Observation[], fault?: Fault, run = new ProbeRun()): Result {
  let observations: readonly Observation[] | undefined;
  let reason: Reason | undefined;
  let cleanup: Cleanup;
  try {
    run.initialize();
    fault?.('initialized');
    observations = operation(run);
    if (!safeObservations(observations) || !privateFree(JSON.stringify(observations))) throw new Stop('privacy');
  } catch (error) { reason = error instanceof Stop ? error.reason : 'io'; }
  finally { cleanup = run.cleanup(fault); }
  // Withhold all observations when initialization, operation or cleanup stops.
  return reason || cleanup === 'residual'
    ? { synthetic: true, status: 'stopped', reason: reason ?? 'io', cleanup }
    : { synthetic: true, status: 'observed', cleanup, observations: observations! };
}

function observed(t: TestContext, result: Result): readonly Observation[] {
  assert.equal(privateFree(JSON.stringify(result)), true, 'Unsafe synthetic diagnostic withheld');
  t.diagnostic(JSON.stringify(result));
  assert.equal(result.status, 'observed', 'Synthetic control probe stopped; inspect sanitized status');
  assert.equal(result.cleanup, 'removed', 'Residual synthetic artifacts; stop further experiments');
  return result.observations!;
}

test('Windows A: scratch mode/access observations never certify ACL protection', windows, t => {
  const result = execute(run => {
    run.create('permission.bin');
    const path = run.path('permission.bin');
    const snapshot = (requested: number): Observation => ({
      requested, directoryMode: lstatSync(dirname(path)).mode & 0o777,
      fileMode: lstatSync(path).mode & 0o777,
      readAccess: attempt(() => accessSync(path, constants.R_OK)),
      writeAccess: attempt(() => accessSync(path, constants.W_OK)),
      daclVerified: false,
    });
    const values = [snapshot(0o600)];
    chmodSync(path, 0o600); values.push(snapshot(0o600));
    chmodSync(path, 0o644); values.push(snapshot(0o644));
    return values;
  });
  assert.equal(observed(t, result).every(value => value.daclVerified === false), true);
});

function sharing(run: ProbeRun, writerFirst: boolean): readonly Observation[] {
  const name = writerFirst ? 'writer-first.bin' : 'reader-first.bin';
  run.create(name);
  const first = run.open(name, writerFirst ? 'r+' : 'r');
  let second: number | undefined;
  const secondOpen = attempt(() => { second = run.open(name, writerFirst ? 'r' : 'r+'); });
  if (second === undefined) return [{ writerFirst, secondOpen, bytesMatch: false, exclusionDisproved: false }];
  run.update(writerFirst ? first : second);
  const bytesMatch = run.matches(writerFirst ? second : first, updated);
  if (!bytesMatch) fail();
  return [{ writerFirst, secondOpen, bytesMatch, exclusionDisproved: true }];
}
test('Windows B: reader-first writer-exclusion counterexample', windows, t => {
  observed(t, execute(run => sharing(run, false)));
});
test('Windows C: writer-first reader-open counterexample', windows, t => {
  observed(t, execute(run => sharing(run, true)));
});
test('Windows D: one rename and one unlink while independent read handles remain open', windows, t => {
  observed(t, execute(run => {
    run.create('rename.bin'); run.create('delete.bin');
    const renameReader = run.open('rename.bin', 'r');
    const original = run.path('rename.bin');
    const destination = run.path('renamed.bin');
    const renamed = attempt(() => renameSync(original, destination));
    const present = (path: string): boolean => {
      try { lstatSync(path); return true; }
      catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; }
    };
    const originalPresent = present(original);
    const destinationPresent = present(destination);
    if (originalPresent !== (renamed !== 'succeeded') || destinationPresent !== (renamed === 'succeeded')) fail();
    const renameBytesMatch = run.matches(renameReader, initial);
    const deleteReader = run.open('delete.bin', 'r');
    const deletion = run.path('delete.bin');
    const unlinked = attempt(() => unlinkSync(deletion));
    // Windows may retain a delete-pending name until the last handle closes.
    const deletePendingNamePresent = present(deletion);
    const deleteBytesMatch = run.matches(deleteReader, initial);
    run.close(deleteReader);
    const deletedAfterClose = !present(deletion);
    if (!renameBytesMatch || !deleteBytesMatch || deletedAfterClose !== (unlinked === 'succeeded')) fail();
    return [{ renamed, originalPresent, destinationPresent, renameBytesMatch,
      unlinked, deletePendingNamePresent, deletedAfterClose, deleteBytesMatch }];
  }));
});
test('Windows E: exclusive creation does not imply exclusive handle sharing', windows, t => {
  const values = observed(t, execute(run => {
    run.create('exclusive.bin', initial, true);
    const secondCreate = attempt(() => { run.open('exclusive.bin', 'wx'); });
    let writer: number | undefined;
    const writerOpen = attempt(() => { writer = run.open('exclusive.bin', 'r+'); });
    let bytesMatch = false;
    if (writer !== undefined) {
      run.update(writer);
      const reader = run.open('exclusive.bin', 'r');
      bytesMatch = run.matches(reader, updated);
      if (!bytesMatch) fail();
    }
    return [{ secondCreate, writerOpen, bytesMatch }];
  }));
  assert.equal(values[0]?.secondCreate, 'exists', 'Exclusive creation observation differs; stop and review');
});

test('Windows probe post-initialization errors and captured diagnostics withhold canaries', windows, t => {
  const run = new ProbeRun();
  let captured = '';
  const capture = (chunk: unknown): boolean => { captured += String(chunk); return true; };
  const stdout = t.mock.method(process.stdout, 'write', capture);
  const stderr = t.mock.method(process.stderr, 'write', capture);
  let result: Result;
  try {
    result = execute(() => [], phase => {
      if (phase === 'initialized') throw Object.assign(new Error(`${canary}: ${run.root}`), {
        path: run.root, cause: new Error(canary),
      });
    }, run);
    console.error(result); console.log(result);
  } finally { stdout.mock.restore(); stderr.mock.restore(); }
  assert.equal(result.status, 'stopped');
  assert.equal(result.cleanup, 'removed');
  assert.equal('observations' in result, false);
  assert.equal(privateFree(captured), true, 'Captured diagnostic must withhold private values');
});
test('Windows probe cleanup retains ownership after partial deletion and reports residuals', windows, t => {
  const run = new ProbeRun();
  t.after(() => assert.equal(run.cleanup(), 'removed', 'Residual synthetic artifacts'));
  const result = execute(probe => {
    probe.create('permission.bin'); return [{ bytesMatch: true }];
  }, phase => { if (phase === 'before-child-rmdir') throw new Error(canary); }, run);
  assert.deepEqual(result, { synthetic: true, status: 'stopped', reason: 'io', cleanup: 'residual' });
  assert.equal(privateFree(JSON.stringify(result)), true);
  assert.equal(run.cleanup(), 'removed');
  assert.equal(run.cleanup(), 'removed');
});
test('Windows probe oversized content is refused before writing and exact cleanup succeeds', windows, t => {
  const result = execute(run => { run.create('permission.bin', Buffer.alloc(caps.fileBytes + 1)); return []; });
  assert.deepEqual(result, { synthetic: true, status: 'stopped', reason: 'scope', cleanup: 'removed' });
  assert.equal(privateFree(JSON.stringify(result)), true);
  t.diagnostic('Oversized synthetic content refused; artifacts removed');
});
test('Windows probe output allowlist withholds injected values before diagnostic emission', windows, () => {
  const result = execute(() => [{ readAccess: canary as Attempt }]);
  assert.deepEqual(result, { synthetic: true, status: 'stopped', reason: 'privacy', cleanup: 'removed' });
  assert.equal(privateFree(JSON.stringify(result)), true);
});
test('Windows probe unknown entries refuse cleanup without deleting another owned run', windows, t => {
  const run = new ProbeRun();
  const sentinel = new ProbeRun();
  t.after(() => {
    assert.equal(run.cleanup(), 'removed', 'Residual synthetic artifacts');
    assert.equal(sentinel.cleanup(), 'removed', 'Residual synthetic sentinel');
  });
  const result = execute(probe => {
    sentinel.initialize(); sentinel.create('permission.bin');
    probe.create('permission.bin');
    // A fixed, test-owned unexpected entry; never an external target.
    probe.unexpectedEntry(true);
    return [{ bytesMatch: true }];
  }, undefined, run);
  assert.equal(result.cleanup, 'residual');
  assert.equal('observations' in result, false);
  assert.equal(attempt(() => {
    if (!sentinel.matches(sentinel.open('permission.bin', 'r'), initial)) fail();
  }), 'succeeded', 'Unrelated owned synthetic sentinel must survive');
  // Retry only after the owning test removes its exact authenticated extra entry.
  assert.equal(attempt(() => run.unexpectedEntry(false)), 'succeeded', 'Exact synthetic entry removal requires ownership');
  assert.equal(run.cleanup(), 'removed');
});
test('Windows probe runtime context is restricted to non-identifying built-in fields', windows, t => {
  t.diagnostic(JSON.stringify({ node: process.versions.node, uv: process.versions.uv,
    arch: process.arch, platform: process.platform, windowsRelease: release() }));
  assert.equal(process.platform, 'win32');
});
test('Windows control probes remain test-only and use no helper, private input or undocumented open flags', () => {
  const root = new URL('../../', import.meta.url);
  const probe = readFileSync(new URL('test/windows-acquisition-controls.test.ts', root), 'utf8');
  assert.doesNotMatch(probe, /from ['"]node:(?:child_process|worker_threads|sqlite)['"]|process\.(?:binding|env)|\bfetch\s*\(|openSync\([^\n]*,\s*0x/);
  for (const file of readdirSync(new URL('src/', root))) {
    if (file.endsWith('.ts')) assert.equal(
      readFileSync(new URL(`src/${file}`, root), 'utf8').includes('windows-acquisition-controls'), false);
  }
});
