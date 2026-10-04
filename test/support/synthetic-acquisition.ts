// Internal TEST HARNESS ONLY. No CLI import, external source registration, or real adapter.
import {
  closeSync, fstatSync, lstatSync, mkdirSync, mkdtempSync, openSync,
  readSync, readdirSync, realpathSync, rmdirSync, unlinkSync, writeFileSync,
} from 'node:fs';
import type { BigIntStats } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { constructFixtures, fixtureNames, inspectFixtureAnalysis } from './synthetic-fixtures.js';

export const limits = Object.freeze({ fileBytes: 128 * 1024, totalBytes: 256 * 1024, files: 5 });
export type Protection = 'native' | 'simulated-owner-restricted';
export type Reason = 'selection' | 'containment' | 'protection-unverified' | 'unsupported-companions' |
  'limit' | 'unstable' | 'io' | 'unsupported-analysis';
export type Outcome = Readonly<{
  synthetic: true;
  protection: Protection;
  status: 'acquired' | 'refused';
  reason?: Reason;
  files: number;
}>;
export type Cleanup = Readonly<{ synthetic: true; status: 'removed' | 'residual' }>;
export type Phase = 'before-read' | 'after-baseline' | 'before-copy' | 'after-copy' | 'before-analysis' |
  'before-cleanup' | 'before-child-rmdir' | 'before-root-rmdir';
type Fault = (phase: Phase, run: SyntheticRun) => void;
type Measurement = Readonly<{
  name: string; size: bigint; dev: bigint; ino: bigint; mtime: bigint; ctime: bigint; digest: string;
}>;
class Refusal extends Error {
  constructor(readonly reason: Reason) { super(reason); }
}
class InitializationFailure extends Error {
  readonly cleanup: Cleanup;

  constructor(cleanup: Cleanup) {
    super(cleanup.status === 'removed'
      ? 'Synthetic run initialization failed; artifacts removed'
      : 'Synthetic run initialization failed; residual synthetic artifacts');
    this.name = 'InitializationFailure';
    this.cleanup = Object.freeze(cleanup);
    // No raw cause or stack locations, even when a caller prints this exception.
    this.stack = `${this.name}: ${this.message}`;
  }
}
const reject = (reason: Reason): never => { throw new Refusal(reason); };

export function contains(parent: string, child: string): boolean {
  const delta = relative(resolve(parent), resolve(child));
  return delta === '' || (!isAbsolute(delta) && delta !== '..' && !delta.startsWith(`..${sep}`));
}
export function overlaps(a: string, b: string): boolean { return contains(a, b) || contains(b, a); }

// Identity/path checks are bounded to this run. No filesystem ancestry discovery.
function checked(path: string, root: string, directory: boolean): void {
  if (!contains(root, path)) reject('containment');
  let current = resolve(path);
  while (true) {
    const stat = lstatSync(current);
    if (stat.isSymbolicLink() || (current === resolve(path) &&
        (directory ? !stat.isDirectory() : !stat.isFile() || stat.nlink !== 1))) reject('containment');
    if (current === resolve(root)) break;
    current = dirname(current);
  }
  if (relative(resolve(path), realpathSync(path)) !== '') reject('containment');
}

// These are bytes/metadata, not a serialized audit or a public contract.
function readBounded(path: string): { bytes: Buffer; stat: BigIntStats } {
  const fd = openSync(path, 'r');
  try {
    const stat = fstatSync(fd, { bigint: true });
    if (!stat.isFile() || stat.nlink !== 1n) reject('containment');
    if (stat.size > BigInt(limits.fileBytes)) reject('limit');
    // Fixed cap + one byte detects growth without an unbounded readFile allocation.
    const bytes = Buffer.alloc(limits.fileBytes + 1);
    let length = 0;
    while (length < bytes.length) {
      const count = readSync(fd, bytes, length, bytes.length - length, null);
      if (count === 0) break;
      length += count;
    }
    if (length > limits.fileBytes) reject('limit');
    const after = fstatSync(fd, { bigint: true });
    if (BigInt(length) !== stat.size || after.size !== stat.size || after.mtimeNs !== stat.mtimeNs ||
        after.ctimeNs !== stat.ctimeNs || after.dev !== stat.dev || after.ino !== stat.ino) reject('unstable');
    return { bytes: bytes.subarray(0, length), stat };
  } finally {
    closeSync(fd);
  }
}

function measure(path: string, name: string): Measurement {
  const { bytes, stat } = readBounded(path);
  const pathStat = lstatSync(path, { bigint: true });
  if (!pathStat.isFile() || pathStat.nlink !== 1n || pathStat.dev !== stat.dev || pathStat.ino !== stat.ino ||
      pathStat.size !== stat.size || pathStat.mtimeNs !== stat.mtimeNs || pathStat.ctimeNs !== stat.ctimeNs) reject('unstable');
  return { name, size: stat.size, dev: stat.dev, ino: stat.ino,
    mtime: stat.mtimeNs, ctime: stat.ctimeNs, digest: createHash('sha256').update(bytes).digest('hex') };
}
function equal(a: readonly Measurement[], b: readonly Measurement[]): boolean {
  return a.length === b.length && a.every((item, index) => {
    const other = b[index];
    return other !== undefined && Object.keys(item).every(key =>
      item[key as keyof Measurement] === other[key as keyof Measurement]);
  });
}

function createRunRoot(): string {
  try {
    const temporary = realpathSync(tmpdir());
    // No home discovery: reject redirected test-temp locations before writing.
    if (overlaps(temporary, process.cwd()) || temporary.split(/[\\/]/).some(part => part.toLowerCase() === '.codex')) {
      throw new Error('Unsupported location');
    }
    return mkdtempSync(join(temporary, 'workspace-surveyor-synthetic-'));
  } catch {
    // Root creation itself cannot establish whether an OS failure left artifacts.
    throw new InitializationFailure({ synthetic: true, status: 'residual' });
  }
}

export class SyntheticRun {
  readonly root: string;
  readonly sources: string;
  readonly scratch: string;
  readonly acquisition: string;
  readonly analysis: string;
  readonly protection: Protection;
  readonly writes: string[] = [];
  private readonly token = randomUUID();
  private readonly rootIdentity: { dev: number; ino: number } | undefined;
  private attempted = false;
  private removed = false;
  private ownerRemoved = false;

  constructor(protection: Protection = 'native') {
    this.protection = protection;
    this.root = createRunRoot();
    this.sources = join(this.root, 'sources');
    this.scratch = join(this.root, 'scratch');
    this.acquisition = join(this.scratch, 'acquisition');
    this.analysis = join(this.scratch, 'analysis');
    // Invented bytes only. mode is NOT Windows ACL evidence.
    try {
      this.rootIdentity = lstatSync(this.root);
      writeFileSync(join(this.root, 'owner'), this.token, { flag: 'wx', mode: 0o600 });
      for (const dir of ['builder', 'sources', 'scratch']) mkdirSync(join(this.root, dir), { mode: 0o700 });
      constructFixtures(join(this.root, 'builder'), this.sources);
      // Runtime immutability prevents accidental source re-registration through fields.
      for (const key of ['root', 'sources', 'scratch', 'acquisition', 'analysis', 'protection']) {
        Object.defineProperty(this, key, { writable: false, configurable: false });
      }
    } catch {
      const cleanup = this.cleanup();
      throw new InitializationFailure(cleanup);
    }
  }

  private checkRootIdentity(): void {
    const identity = this.rootIdentity;
    if (this.removed || identity === undefined) return reject('containment');
    checked(this.root, this.root, true);
    const stat = lstatSync(this.root);
    if (stat.dev !== identity.dev || stat.ino !== identity.ino) reject('containment');
  }

  private owned(): void {
    this.checkRootIdentity();
    checked(join(this.root, 'owner'), this.root, false);
    if (readBounded(join(this.root, 'owner')).bytes.toString() !== this.token) reject('containment');
  }

  private fileSet(selected: readonly string[]): string[] {
    const files: string[] = [];
    for (const name of selected) {
      checked(join(this.sources, name), this.sources, false);
      files.push(name);
      if (name.endsWith('.sqlite')) {
        const present = (suffix: string): boolean => {
          try { lstatSync(join(this.sources, name + suffix)); return true; }
          catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
            throw error;
          }
        };
        if (present('-journal')) reject('unsupported-companions');
        const wal = present('-wal');
        const shm = present('-shm');
        // M2a.1 supports only a standalone DB or both existing companions.
        if (wal !== shm) reject('unsupported-companions');
        if (wal) files.push(name + '-wal', name + '-shm');
      }
    }
    if (files.length > limits.files) reject('limit');
    for (const name of files) checked(join(this.sources, name), this.sources, false);
    return files;
  }

  private baseline(selected: readonly string[]): Measurement[] {
    const values = this.fileSet(selected).map(name => measure(join(this.sources, name), name));
    if (values.reduce((sum, item) => sum + item.size, 0n) > BigInt(limits.totalBytes)) reject('limit');
    return values;
  }

  private write(destination: string, bytes: Buffer): void {
    this.owned();
    checked(dirname(destination), this.scratch, true);
    if (overlaps(this.sources, destination)) reject('containment');
    this.writes.push(destination);
    writeFileSync(destination, bytes, { flag: 'wx', mode: 0o600 });
  }

  acquire(selected: readonly string[], fault?: Fault): Outcome {
    const refuse = (reason: Reason): Outcome => ({ synthetic: true, protection: this.protection,
      status: 'refused', reason, files: 0 });
    if (this.attempted) return refuse('selection');
    this.attempted = true;
    try {
      if (selected.length === 0 || new Set(selected).size !== selected.length ||
          selected.some(name => !fixtureNames.some(allowed => allowed === name))) reject('selection');
      this.owned();
      checked(this.sources, this.root, true);
      checked(this.scratch, this.root, true);
      if (overlaps(realpathSync(this.sources), realpathSync(this.scratch))) reject('containment');
      // Node-only Windows DACL verification/sharing controls are not established.
      // The sole passing branch is deliberately fault-injected synthetic protection.
      if (this.protection !== 'simulated-owner-restricted') reject('protection-unverified');
      fault?.('before-read', this);
      const before = this.baseline(selected);
      fault?.('after-baseline', this);
      if (!equal(before, this.baseline(selected))) reject('unstable');
      for (const dir of [this.acquisition, this.analysis]) mkdirSync(dir, { mode: 0o700 });
      fault?.('before-copy', this);
      for (const item of before) {
        checked(join(this.sources, item.name), this.sources, false);
        const { bytes } = readBounded(join(this.sources, item.name));
        if (createHash('sha256').update(bytes).digest('hex') !== item.digest) reject('unstable');
        this.write(join(this.acquisition, item.name), bytes);
      }
      fault?.('after-copy', this);
      if (!equal(before, this.baseline(selected))) reject('unstable');
      for (const item of before) {
        checked(join(this.acquisition, item.name), this.scratch, false);
        const { bytes } = readBounded(join(this.acquisition, item.name));
        if (createHash('sha256').update(bytes).digest('hex') !== item.digest) reject('unstable');
        this.write(join(this.analysis, item.name), bytes);
      }
      const acquired = before.map(item => measure(join(this.acquisition, item.name), item.name));
      fault?.('before-analysis', this);
      try {
        this.owned();
        for (const item of before) checked(join(this.analysis, item.name), this.scratch, false);
        inspectFixtureAnalysis(selected.map(name => join(this.analysis, name)));
      } catch (error) {
        if (error instanceof Refusal) throw error;
        reject('unsupported-analysis');
      }
      if (!equal(acquired, before.map(item => measure(join(this.acquisition, item.name), item.name))) ||
          !equal(before, this.baseline(selected))) reject('unstable');
      return { synthetic: true, protection: this.protection, status: 'acquired', files: before.length };
    } catch (error) {
      // No raw errors, hashes, row values, paths, stacks, or selection reflection.
      return refuse(error instanceof Refusal ? error.reason : 'io');
    }
  }

  cleanup(fault?: Fault): Cleanup {
    if (this.removed) return { synthetic: true, status: 'removed' };
    try {
      if (this.ownerRemoved) {
        // Only this authenticated in-memory run may retry final empty-root removal.
        // It may not delete any newly introduced contents without an owner marker.
        this.removeEmptyRoot(fault);
        return { synthetic: true, status: 'removed' };
      }
      this.owned();
      fault?.('before-cleanup', this);
      // Verify ALL entries before deleting ANY. No recursive rm or foreign sweep.
      const files: string[] = [];
      const directories: string[] = [];
      const knownNames = [...fixtureNames,
        'wal.sqlite-wal', 'wal.sqlite-shm', 'standalone.sqlite-wal', 'standalone.sqlite-shm',
        'standalone.sqlite-journal', 'wal.sqlite-journal'];
      const allowedFiles = new Set<string>(['owner', ...['builder', 'sources', 'scratch/acquisition', 'scratch/analysis']
        .flatMap(dir => knownNames.map(name => `${dir}/${name}`))]);
      const walk = (dir: string): void => {
        checked(dir, this.root, true);
        for (const name of readdirSync(dir)) {
          const path = join(dir, name);
          const stat = lstatSync(path);
          if (stat.isDirectory() && !stat.isSymbolicLink()) {
            const location = relative(this.root, path).split(sep).join('/');
            if (!['builder', 'sources', 'scratch', 'scratch/acquisition', 'scratch/analysis'].includes(location)) reject('containment');
            walk(path);
            directories.push(path);
          } else {
            checked(path, this.root, false);
            if (!allowedFiles.has(relative(this.root, path).split(sep).join('/'))) reject('containment');
            files.push(path);
          }
        }
      };
      walk(this.root);
      this.owned();
      const owner = join(this.root, 'owner');
      for (const path of files) {
        if (path === owner) continue;
        checked(path, this.root, false);
        unlinkSync(path);
      }
      for (const path of directories) {
        fault?.('before-child-rmdir', this);
        this.owned();
        checked(path, this.root, true);
        rmdirSync(path);
      }
      this.owned();
      unlinkSync(owner);
      this.ownerRemoved = true;
      this.removeEmptyRoot(fault);
      return { synthetic: true, status: 'removed' };
    } catch {
      return { synthetic: true, status: 'residual' };
    }
  }

  private removeEmptyRoot(fault?: Fault): void {
    fault?.('before-root-rmdir', this);
    this.checkRootIdentity();
    if (readdirSync(this.root).length !== 0) reject('containment');
    rmdirSync(this.root);
    this.removed = true;
  }
}

// Default path always runs cleanup, including handled refusals. Paths stay test-local.
export function exerciseSynthetic(
  selected: readonly string[], protection: Protection = 'native', fault?: Fault,
): Readonly<{ outcome: Outcome; cleanup: Cleanup }> {
  let run: SyntheticRun | undefined;
  let outcome: Outcome;
  let cleanup: Cleanup = { synthetic: true, status: 'residual' };
  try {
    run = new SyntheticRun(protection);
    outcome = run.acquire(selected, fault);
  } catch (error) {
    outcome = { synthetic: true, protection, status: 'refused', reason: 'io', files: 0 };
    // Constructor failures may leave a run which was never assigned to `run`.
    // Unknown initialization failures conservatively retain residual status.
    if (error instanceof InitializationFailure) cleanup = error.cleanup;
  } finally {
    if (run !== undefined) cleanup = run.cleanup(fault);
  }
  return { outcome, cleanup };
}
