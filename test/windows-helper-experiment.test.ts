import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import {
  closeSync, fstatSync, lstatSync, mkdtempSync, openSync, readFileSync, readdirSync,
  realpathSync, renameSync, rmdirSync, unlinkSync, writeFileSync, writeSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import { release, tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// An opt-in research subprocess only. No imports from, or changes to, the acquisition kernel.
const enabled = process.platform === 'win32' && process.env.WORKSPACE_SURVEYOR_RUN_HELPER_EXPERIMENT === '1';
const empirical = { skip: !enabled, concurrency: false };
const cases = ['acl', 'acl-refusal', 'reader', 'writer', 'rename', 'unlink', 'copy', 'partial',
  'fault-protected', 'fault-copy', 'fault-diagnostic'] as const;
type Case = typeof cases[number];
type Fault = 'none' | 'after-protection' | 'after-partial-write' | 'diagnostic';
type FaultEvidence = { phase: string; fault: Fault; partialWritten: boolean;
  partialDestinationVerified: boolean; diagnosticsCaptured: boolean };
type Frame = { stage: 'prepared'; protected: true; powershell: string; dotnet: string } |
  { stage: 'handles-held'; read: true } |
  { stage: 'sharing-refused'; sharing: true } |
  { stage: 'finished'; outcome: 'ok' | 'acl-refused' | 'sharing-refused' | 'io' | 'cancelled'; closed: boolean; copied: boolean;
    phase: string; category: string; fault: Fault; partialWritten: boolean };
type Result = { status: 'observed' | 'refused'; cleanup: 'removed' | 'residual'; outcome: string;
  copied: boolean; controls: boolean; unchanged: boolean; protected: boolean; category: string; retryRemoved: boolean;
  cleanupFaultReached: boolean } & FaultEvidence;
const invented = Buffer.from('SYNTHETIC_PRIVATE_HELPER_CANARY_INVENTED_BYTES');
const files = ['owner', 'sources/a.bin', 'sources/b.bin', 'sources/renamed.bin',
  'scratch/a.bin', 'scratch/b.bin', 'scratch/probe.bin'];
const directories = ['sources', 'scratch'];
let stopped = false;
class Stop extends Error {
  constructor() { super('Synthetic helper experiment refused'); this.stack = 'SyntheticHelperStop'; }
}
function refuse(): never { throw new Stop(); }
function contains(parent: string, child: string): boolean {
  const delta = relative(resolve(parent), resolve(child));
  return delta === '' || (!isAbsolute(delta) && delta !== '..' && !delta.startsWith(`..${sep}`));
}
function privateFree(value: string): boolean {
  return !/SYNTHETIC_PRIVATE_|workspace-surveyor-helper-|[A-Z]:[\\/]|\\\\|S-1-\d|\b(?:stack|SDDL|username)\b/i.test(value);
}
function frame(raw: string): Frame {
  if (!privateFree(raw)) refuse();
  let value: unknown;
  try { value = JSON.parse(raw); } catch { refuse(); }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) refuse();
  const item = value as Record<string, unknown>;
  const keys = Object.keys(item).sort().join(',');
  if (item.stage === 'prepared' && keys === 'dotnet,powershell,protected,stage' && item.protected === true &&
      typeof item.powershell === 'string' && /^7\.\d+\.\d+$/.test(item.powershell) &&
      typeof item.dotnet === 'string' && /^\d+\.\d+\.\d+$/.test(item.dotnet)) return item as Frame;
  if (item.stage === 'handles-held' && keys === 'read,stage' && item.read === true) return item as Frame;
  if (item.stage === 'sharing-refused' && keys === 'sharing,stage' && item.sharing === true) return item as Frame;
  if (item.stage === 'finished' && keys === 'category,closed,copied,fault,outcome,partialWritten,phase,stage' && typeof item.closed === 'boolean' &&
      typeof item.copied === 'boolean' && ['ok', 'acl-refused', 'sharing-refused', 'io', 'cancelled'].includes(String(item.outcome)) &&
      ['none', 'after-protection', 'after-partial-write', 'diagnostic'].includes(String(item.fault)) &&
      typeof item.partialWritten === 'boolean' && item.partialWritten === (item.fault === 'after-partial-write') &&
      ['input', 'root-protect', 'marker-protect', 'root-verify', 'marker-verify', 'fixtures', 'open', 'copy', 'release'].includes(String(item.phase)) &&
      ['none', 'argument', 'method', 'conversion', 'access', 'unsupported', 'io'].includes(String(item.category))) return item as Frame;
  refuse();
}
function faultReached(selected: Case, evidence: FaultEvidence): boolean {
  if (selected === 'fault-copy') return evidence.phase === 'copy' && evidence.fault === 'after-partial-write' &&
    evidence.partialWritten && evidence.partialDestinationVerified;
  if (selected === 'fault-protected') return evidence.phase === 'marker-verify' && evidence.fault === 'after-protection' && !evidence.partialWritten;
  if (selected === 'fault-diagnostic') return evidence.phase === 'marker-verify' && evidence.fault === 'diagnostic' &&
    !evidence.partialWritten && evidence.diagnosticsCaptured;
  return false;
}

class Run {
  root: string | undefined;
  private identity: { dev: bigint; ino: bigint } | undefined;
  readonly nonce = randomUUID();
  private markerRemoved = false;
  private removed = false;
  private readonly handles = new Set<number>();
  initialize(): void {
    const temporary = realpathSync(tmpdir());
    if (contains(temporary, process.cwd()) || contains(process.cwd(), temporary) ||
        temporary.split(/[\\/]/).some(part => part.toLowerCase() === '.codex')) refuse();
    this.root = mkdtempSync(join(temporary, 'workspace-surveyor-helper-'));
    this.identity = lstatSync(this.root, { bigint: true });
    this.check(this.root, true);
    writeFileSync(join(this.root, 'owner'), this.nonce, { flag: 'wx' });
    this.owned();
  }
  private check(path: string, directory: boolean): void {
    if (!this.root || !this.identity || this.removed || !contains(this.root, path)) refuse();
    const root = lstatSync(this.root, { bigint: true });
    if (!root.isDirectory() || root.isSymbolicLink() || root.dev !== this.identity.dev || root.ino !== this.identity.ino) refuse();
    let current = resolve(path);
    while (true) {
      const stat = lstatSync(current);
      if (stat.isSymbolicLink() || (current === resolve(path) &&
          (directory ? !stat.isDirectory() : !stat.isFile() || stat.nlink !== 1 || stat.size > 4096))) refuse();
      if (current === resolve(this.root)) break;
      current = dirname(current);
    }
    if (relative(resolve(path), realpathSync(path)) !== '') refuse();
  }
  owned(): void {
    if (!this.root) refuse();
    const marker = join(this.root, 'owner');
    this.check(marker, false);
    if (readFileSync(marker, 'utf8') !== this.nonce) refuse();
  }
  path(name: string, existing = true): string {
    if (!files.includes(name) || name === 'owner') refuse();
    this.owned();
    const path = join(this.root!, ...name.split('/'));
    this.check(dirname(path), true);
    if (existing) this.check(path, false);
    return path;
  }
  open(name: string, flags: 'r' | 'r+'): number {
    const path = this.path(name);
    const before = lstatSync(path, { bigint: true });
    const fd = openSync(path, flags);
    this.handles.add(fd);
    const actual = fstatSync(fd, { bigint: true });
    if (actual.dev !== before.dev || actual.ino !== before.ino || actual.size !== before.size) refuse();
    return fd;
  }
  close(fd: number): void { closeSync(fd); this.handles.delete(fd); }
  snapshot(): string {
    // Internal regression comparison only: identities/timestamps/bytes never leave this method.
    return ['sources/a.bin', 'sources/b.bin'].map(name => {
      const path = this.path(name);
      const stat = lstatSync(path, { bigint: true });
      if (!readFileSync(path).equals(invented)) refuse();
      return `${stat.dev}:${stat.ino}:${stat.size}:${stat.mtimeNs}:${stat.ctimeNs}`;
    }).join('|');
  }
  cleanup(fault = false, reached?: () => void): 'removed' | 'residual' {
    if (this.removed) return 'removed';
    for (const fd of this.handles) { try { this.close(fd); } catch { /* Refuse deletion below. */ } }
    if (this.handles.size || !this.root || !this.identity) return 'residual';
    try {
      if (!this.markerRemoved) {
        this.owned();
        const selected: string[] = [];
        const children: string[] = [];
        let total = 0;
        const walk = (dir: string): void => {
          this.check(dir, true);
          for (const name of readdirSync(dir)) {
            const path = join(dir, name);
            const location = relative(this.root!, path).split(sep).join('/');
            if (directories.includes(location)) { walk(path); children.push(path); }
            else {
              if (!files.includes(location)) refuse();
              this.check(path, false); total += lstatSync(path).size; selected.push(path);
              if (selected.length > 8 || total > 32768) refuse();
            }
          }
        };
        walk(this.root);
        if (children.length + 1 > 4) refuse();
        for (const path of selected) {
          if (path === join(this.root, 'owner')) continue;
          this.owned(); this.check(path, false); unlinkSync(path);
        }
        for (const child of children) {
          if (fault) { reached?.(); refuse(); }
          this.owned(); this.check(child, true); rmdirSync(child);
        }
        this.owned(); unlinkSync(join(this.root, 'owner')); this.markerRemoved = true;
      }
      this.check(this.root, true);
      if (readdirSync(this.root).length !== 0) refuse();
      rmdirSync(this.root); this.removed = true;
      return 'removed';
    } catch { return 'residual'; }
  }
}

class Session {
  private readonly child;
  private readonly frames: Frame[] = [];
  private pending: (() => void) | undefined;
  private buffer = '';
  private outputBytes = 0;
  private errorBytes = 0;
  private state: 'start' | 'prepared' | 'blocked' | 'held' | 'finished' = 'start';
  private exited = false;
  private exitCode: number | null = null;
  private readonly exit: Promise<void>;
  private readonly timer: NodeJS.Timeout;
  final: Extract<Frame, { stage: 'finished' }> | undefined;
  unsafe = false;
  context: { powershell: string; dotnet: string } | undefined;
  get diagnosticsCaptured(): boolean { return this.errorBytes > 0; }
  constructor(run: Run, selected: Case) {
    const executable = process.env.WORKSPACE_SURVEYOR_HELPER_PWSH;
    if (!executable || !isAbsolute(executable) || !/pwsh\.exe$/i.test(executable)) refuse();
    const request = JSON.stringify({ root: run.root, nonce: run.nonce, case: selected });
    if (Buffer.byteLength(request) + 128 > 8192) refuse();
    const script = fileURLToPath(new URL('../../test/support/windows-helper-experiment.ps1', import.meta.url));
    this.child = spawn(executable, ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', script], {
      shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.exit = new Promise(done => {
      this.child.once('close', code => { this.exited = true; this.exitCode = code; this.pending?.(); done(); });
    });
    this.child.on('error', () => { this.unsafe = true; this.pending?.(); });
    this.child.stdin.on('error', () => { this.unsafe = true; this.pending?.(); });
    this.child.stdout.on('data', (chunk: Buffer) => {
      this.outputBytes += chunk.length;
      if (this.outputBytes > 8192) { this.cancel(); return; }
      this.buffer += chunk.toString('utf8');
      let newline: number;
      while ((newline = this.buffer.indexOf('\n')) >= 0) {
        const line = this.buffer.slice(0, newline).trim(); this.buffer = this.buffer.slice(newline + 1);
        try {
          const next = frame(line);
          if (this.state === 'finished' || (next.stage === 'prepared' && this.state !== 'start') ||
              (next.stage === 'handles-held' && this.state !== 'prepared' && this.state !== 'blocked') ||
              (next.stage === 'sharing-refused' && (selected !== 'writer' || this.state !== 'prepared')) ||
              (next.stage === 'finished' && next.outcome === 'ok' && this.state !== 'held')) refuse();
          if (next.stage === 'prepared') { this.state = 'prepared'; this.context = next; }
          else if (next.stage === 'handles-held') this.state = 'held';
          else if (next.stage === 'sharing-refused') this.state = 'blocked';
          else { this.state = 'finished'; this.final = next; }
          this.frames.push(next); this.pending?.();
        } catch { this.cancel(); }
      }
    });
    this.child.stderr.on('data', (chunk: Buffer) => {
      // No diagnostic is forwarded or retained. Any stderr withholds observations.
      this.errorBytes += chunk.length;
      this.cancel();
    });
    this.child.stdout.on('error', () => this.cancel());
    this.child.stderr.on('error', () => this.cancel());
    this.timer = setTimeout(() => this.cancel(), 30000);
    this.child.stdin.write(`${request}\n`);
  }
  private cancel(): void {
    this.unsafe = true;
    if (!this.child.stdin.destroyed && !this.child.stdin.writableEnded) this.child.stdin.end();
    this.pending?.();
  }
  command(command: 'acquire' | 'release'): void {
    if (this.unsafe || this.exited) refuse();
    this.child.stdin.write(`${JSON.stringify({ command })}\n`);
  }
  async next(): Promise<Frame> {
    while (!this.frames.length) {
      if (this.exited || this.unsafe) refuse();
      await new Promise<void>(done => { this.pending = done; });
      this.pending = undefined;
    }
    return this.frames.shift()!;
  }
  async finish(): Promise<boolean> {
    if (!this.child.stdin.destroyed && !this.child.stdin.writableEnded) this.child.stdin.end();
    let grace: NodeJS.Timeout | undefined;
    const settled = await Promise.race([this.exit.then(() => true), new Promise<boolean>(done => {
      grace = setTimeout(() => done(false), 10000);
    })]);
    if (grace) clearTimeout(grace);
    clearTimeout(this.timer);
    if (!settled) {
      // No process killing, cleanup or next case while helper exit is unconfirmed.
      this.child.unref(); this.child.stdin.destroy(); this.child.stdout.destroy(); this.child.stderr.destroy();
      return false;
    }
    if (this.buffer.trim() !== '' || this.outputBytes > 8192 || this.errorBytes > 8192 || this.exitCode !== 0) this.unsafe = true;
    return this.final?.closed === true;
  }
}
function denied(operation: () => void): boolean {
  try { operation(); return false; }
  catch (error) {
    if (error instanceof Stop) throw error;
    return ['EACCES', 'EPERM', 'EBUSY'].includes(String((error as NodeJS.ErrnoException).code)) || refuse();
  }
}
async function execute(selected: Case, cleanupFault = false): Promise<Result> {
  if (stopped) refuse();
  const run = new Run();
  let session: Session | undefined;
  let controls = false, unchanged = false, protectedObserved = false;
  let failure = false, safeExit = true;
  let before: string | undefined;
  let writer: number | undefined;
  let cleanup: 'removed' | 'residual' = 'residual';
  let retryRemoved = false;
  let cleanupFaultReached = false;
  let partialDestinationVerified = false;
  try {
    run.initialize();
    session = new Session(run, selected);
    const first = await session.next();
    if (first.stage === 'prepared') {
      protectedObserved = true;
      before = run.snapshot();
      controls = true;
      if (selected === 'writer' || selected === 'partial') writer = run.open(selected === 'writer' ? 'sources/a.bin' : 'sources/b.bin', 'r+');
      session.command('acquire');
      let next = await session.next();
      if (selected === 'writer' && next.stage === 'sharing-refused' && writer !== undefined) {
        run.close(writer); writer = undefined;
        session.command('acquire');
        next = await session.next();
      } else if (selected === 'writer') refuse();
      if (next.stage === 'handles-held') {
        if (selected === 'reader') {
          const reader = run.open('sources/a.bin', 'r'); run.close(reader);
          controls = denied(() => { const fd = run.open('sources/a.bin', 'r+'); run.close(fd); });
        } else if (selected === 'rename') controls = denied(() => renameSync(run.path('sources/a.bin'), run.path('sources/renamed.bin', false)));
        else if (selected === 'unlink') controls = denied(() => unlinkSync(run.path('sources/a.bin')));
        if (!controls) refuse();
        if (selected === 'copy') controls = ['scratch/a.bin', 'scratch/b.bin'].every(name => readFileSync(run.path(name)).equals(invented));
        if (!controls) refuse();
        session.command('release');
        if ((await session.next()).stage !== 'finished') refuse();
      } else if (next.stage !== 'finished') refuse();
    } else if (first.stage !== 'finished') refuse();
  } catch { failure = true; }
  finally {
    if (session) safeExit = await session.finish();
    if (writer !== undefined) { try { run.close(writer); } catch { safeExit = false; } }
    if (safeExit) {
      try {
        if (before !== undefined) unchanged = before === run.snapshot();
        if (before !== undefined && !unchanged) { failure = true; stopped = true; }
        if (selected === 'fault-copy' && session?.final?.fault === 'after-partial-write') {
          const destination = run.path('scratch/a.bin');
          partialDestinationVerified = lstatSync(destination).size === invented.length &&
            readFileSync(destination).equals(invented) &&
            readdirSync(join(run.root!, 'scratch')).join(',') === 'a.bin';
          if (!partialDestinationVerified) refuse();
        }
        if (!failure && !session?.unsafe && session?.final?.outcome === 'ok') {
          // Released controls distinguish sharing restrictions from ordinary ACL denial.
          if (selected === 'reader' || selected === 'writer') {
            const fd = run.open('sources/a.bin', 'r+');
            if (writeSync(fd, invented, 0, 1, 0) !== 1) refuse();
            run.close(fd);
            if (!readFileSync(run.path('sources/a.bin')).equals(invented)) refuse();
          } else if (selected === 'rename') renameSync(run.path('sources/a.bin'), run.path('sources/renamed.bin', false));
          else if (selected === 'unlink') unlinkSync(run.path('sources/a.bin'));
        }
        if (selected === 'partial' || selected === 'acl-refusal') {
          controls = readdirSync(join(run.root!, 'scratch')).every(name => selected === 'acl-refusal' && name === 'probe.bin') &&
            (selected !== 'acl-refusal' || lstatSync(run.path('scratch/probe.bin')).size === 0);
        }
      } catch { failure = true; }
      cleanup = run.cleanup(cleanupFault, () => { cleanupFaultReached = true; });
      if (cleanupFault) {
        // Exact owning-run retry only; authenticate the retained marker after deletion began.
        if (cleanup !== 'residual') failure = true;
        try {
          run.owned();
          retryRemoved = run.cleanup() === 'removed';
          if (!retryRemoved) { stopped = true; failure = true; }
        } catch { stopped = true; failure = true; }
      } else if (cleanup === 'residual') stopped = true;
    } else stopped = true;
  }
  const outcome = session?.unsafe ? 'diagnostics-refused' : failure ? 'io' : session?.final?.outcome ?? 'io';
  const evidence: FaultEvidence = { phase: session?.final?.phase ?? 'input', fault: session?.final?.fault ?? 'none',
    partialWritten: session?.final?.partialWritten === true, partialDestinationVerified,
    diagnosticsCaptured: session?.diagnosticsCaptured === true };
  const observed = !failure && !session?.unsafe && safeExit && cleanup === 'removed' && outcome === 'ok';
  const expectedRefusal = (selected === 'partial' && outcome === 'sharing-refused') ||
    (selected === 'acl-refusal' && outcome === 'acl-refused') ||
    (faultReached(selected, evidence) && outcome === (selected === 'fault-diagnostic' ? 'diagnostics-refused' : 'io')) ||
    (cleanupFault && cleanupFaultReached && cleanup === 'residual' && !stopped);
  if (!observed && !expectedRefusal) stopped = true;
  const result: Result = { status: observed ? 'observed' : 'refused',
    outcome, cleanup, copied: session?.final?.copied === true && !failure && !session.unsafe && cleanup === 'removed',
    controls, unchanged, protected: protectedObserved && observed,
    ...evidence, category: session?.final?.category ?? 'io', retryRemoved, cleanupFaultReached };
  if (!privateFree(JSON.stringify(result))) refuse();
  // Runtime versions only; never retain account, source, descriptor or subprocess captures.
  if (result.status === 'observed' && selected === 'acl') console.log(JSON.stringify({
    node: process.versions.node, uv: process.versions.uv, arch: process.arch, platform: process.platform,
    windowsRelease: release(), powershell: session?.context?.powershell, dotnet: session?.context?.dotnet,
  }));
  return result;
}

for (const selected of ['acl', 'reader', 'rename', 'unlink', 'copy'] as const) {
  test(`Windows helper ${selected}: descriptor/read-sharing evidence and released control`, empirical, async t => {
    const result = await execute(selected);
    t.diagnostic(JSON.stringify(result));
    assert.equal(result.status, 'observed'); assert.equal(result.cleanup, 'removed');
    assert.equal(result.controls, true); assert.equal(result.unchanged, true); assert.equal(result.protected, true);
    assert.equal(result.copied, selected === 'copy');
  });
}
test('Windows helper writer-first refuses a writer and succeeds after release', empirical, async t => {
  const refused = await execute('writer');
  t.diagnostic(JSON.stringify(refused));
  assert.equal(refused.status, 'observed'); assert.equal(refused.outcome, 'ok');
  assert.equal(refused.cleanup, 'removed'); assert.equal(refused.unchanged, true);
});
test('Windows helper second-file sharing failure releases first handle without destinations', empirical, async t => {
  const result = await execute('partial'); t.diagnostic(JSON.stringify(result));
  assert.equal(result.outcome, 'sharing-refused'); assert.equal(result.controls, true);
  assert.equal(result.copied, false); assert.equal(result.cleanup, 'removed'); assert.equal(result.unchanged, true);
});
test('Windows helper refuses an actual additional scratch ACE without acquiring bytes', empirical, async t => {
  const result = await execute('acl-refusal'); t.diagnostic(JSON.stringify(result));
  assert.equal(result.outcome, 'acl-refused'); assert.equal(result.copied, false);
  assert.equal(result.controls, true); assert.equal(result.cleanup, 'removed');
});
for (const selected of ['fault-protected', 'fault-copy', 'fault-diagnostic'] as const) {
  test(`Windows helper ${selected}: exceptions/captured diagnostics are sanitized and handles closed`, empirical, async t => {
    const result = await execute(selected); t.diagnostic(JSON.stringify(result));
    assert.equal(result.status, 'refused'); assert.equal(result.cleanup, 'removed'); assert.equal(result.copied, false);
    assert.equal(result.outcome, selected === 'fault-diagnostic' ? 'diagnostics-refused' : 'io');
    assert.equal(faultReached(selected, result), true, 'Expected injected fault stage was not reached');
    assert.equal(result.partialDestinationVerified, selected === 'fault-copy');
    assert.equal(result.unchanged, selected === 'fault-copy');
    assert.equal(privateFree(JSON.stringify(result)), true);
  });
}
test('Windows helper cleanup failure after deletion retains authentication for exact retry', empirical, async t => {
  const result = await execute('copy', true); t.diagnostic(JSON.stringify(result));
  assert.equal(result.status, 'refused'); assert.equal(result.cleanup, 'residual'); assert.equal(result.copied, false);
  assert.equal(result.retryRemoved, true);
  assert.equal(result.cleanupFaultReached, true, 'Expected cleanup injection stage was not reached');
});
test('Windows helper protocol rejects paths, canaries, identifiers and extra fields', () => {
  const valid = { stage: 'finished', outcome: 'ok', closed: true, copied: false, phase: 'release', category: 'none',
    fault: 'none', partialWritten: false };
  for (const raw of [JSON.stringify({ ...valid, outcome: invented.toString() }),
    JSON.stringify({ ...valid, path: 'invented' }),
    JSON.stringify({ ...valid, fault: 'unknown' }), JSON.stringify({ ...valid, partialWritten: true }),
    'S-1-5-999-invented', 'not-json']) assert.throws(() => frame(raw), Stop);
  assert.equal(frame(JSON.stringify(valid)).stage, 'finished');
  for (const selected of ['fault-protected', 'fault-copy', 'fault-diagnostic'] as const) {
    const evidence: FaultEvidence = { phase: selected === 'fault-copy' ? 'copy' : 'marker-verify',
      fault: selected === 'fault-copy' ? 'after-partial-write' : selected === 'fault-protected' ? 'after-protection' : 'diagnostic',
      partialWritten: selected === 'fault-copy', partialDestinationVerified: selected === 'fault-copy', diagnosticsCaptured: selected === 'fault-diagnostic' };
    assert.equal(faultReached(selected, evidence), true);
    for (const phase of ['input', 'root-protect', 'marker-protect', 'root-verify', 'marker-verify', 'fixtures', 'open', 'copy', 'release']) {
      if (phase === evidence.phase) continue;
      assert.equal(faultReached(selected, { ...evidence, phase }), false, 'Wrong-phase refusal must fail');
    }
    assert.equal(faultReached(selected, { ...evidence, fault: 'none' }), false);
    if (selected === 'fault-copy') {
      assert.equal(faultReached(selected, { ...evidence, partialWritten: false }), false);
      assert.equal(faultReached(selected, { ...evidence, partialDestinationVerified: false }), false);
    } else if (selected === 'fault-diagnostic') assert.equal(faultReached(selected, { ...evidence, diagnosticsCaptured: false }), false);
  }
});
test('Windows helper remains opt-in/test-only; native kernel refusal and production surface unchanged', () => {
  const root = new URL('../../', import.meta.url);
  const helper = readFileSync(new URL('test/support/windows-helper-experiment.ps1', root), 'utf8');
  assert.doesNotMatch(helper, /Add-Type|DllImport|ExecutionPolicy|Start-Process|Get-Process|Get-ChildItem|Remove-Item|Get-Acl|Set-Acl/);
  for (const file of readdirSync(new URL('src/', root))) {
    if (file.endsWith('.ts')) assert.doesNotMatch(readFileSync(new URL(`src/${file}`, root), 'utf8'), /windows-helper|node:child_process/);
  }
  assert.match(readFileSync(new URL('test/support/synthetic-acquisition.ts', root), 'utf8'), /protection-unverified/);
});
