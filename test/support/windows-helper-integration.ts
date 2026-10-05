// Internal synthetic experiment coordinator. Never imported by product code.
import { spawn } from 'node:child_process';
import { isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixtureNames } from './synthetic-fixtures.js';
import { SyntheticRun, syntheticFailure } from './synthetic-acquisition.js';
import type { Cleanup, Outcome, Phase, Reason } from './synthetic-acquisition.js';

export const helperFaults = ['none', 'protected', 'root-dacl', 'destination-dacl', 'analysis-dacl', 'partial-copy', 'diagnostic'] as const;
type HelperFault = typeof helperFaults[number];
export type IntegrationPhase = 'protected-ready' | 'fixtures-ready' | 'after-baseline' | 'handles-held' | 'copies-verified' |
  'after-analysis' | 'verified-held' | 'after-exit';
const stages = ['protected-ready', 'handles-held', 'copies-verified', 'verified-held'] as const;
const phases = ['input', 'root-protect', 'marker-protect', 'root-verify', 'marker-verify', 'protected',
  'manifest', 'open', 'held', 'copy', 'analysis', 'verify', 'verified', 'release'] as const;
const faults = ['none', 'after-protection', 'root-descriptor', 'destination-descriptor', 'analysis-descriptor', 'after-partial-write', 'diagnostic'] as const;
const outcomes = ['ok', 'acl-refused', 'sharing-refused', 'unstable', 'io', 'cancelled'] as const;
type Frame = { stage: typeof stages[number]; run: string; count: number; protected: true; powershell?: string; dotnet?: string } |
  { stage: 'finished'; run: string; outcome: typeof outcomes[number]; closed: boolean; copied: boolean;
    phase: typeof phases[number]; fault: typeof faults[number]; partialWritten: boolean; opened: number };
type Final = Extract<Frame, { stage: 'finished' }>;
class Stop extends Error {
  constructor() { super('Synthetic integration refused'); this.stack = 'SyntheticIntegrationStop'; }
}
function refuse(): never { throw new Stop(); }
const protection = 'windows-helper-synthetic' as const;
const refused = (reason: Reason = 'io'): Outcome => ({ synthetic: true, protection, status: 'refused', reason, files: 0 });
let stopped = false;

// Exact finite schemas; raw input, including diagnostics, is never reflected.
export function parseIntegrationFrame(raw: string, nonce: string): Frame {
  if (Buffer.byteLength(raw) > 8192) refuse();
  let value: unknown;
  try { value = JSON.parse(raw); } catch { refuse(); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) refuse();
  const item = value as Record<string, unknown>;
  const keys = Object.keys(item).sort().join(',');
  if (item.run !== nonce) refuse();
  const count = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 5;
  if (stages.some(stage => stage === item.stage) && item.protected === true && count(item.count)) {
    if (item.stage === 'protected-ready') {
      if (keys !== 'count,dotnet,powershell,protected,run,stage' || item.count !== 0 ||
          typeof item.powershell !== 'string' || !/^7\.\d+\.\d+$/.test(item.powershell) ||
          typeof item.dotnet !== 'string' || !/^\d+\.\d+\.\d+$/.test(item.dotnet)) refuse();
    } else if (keys !== 'count,protected,run,stage' || item.count === 0) refuse();
    return item as Frame;
  }
  if (item.stage === 'finished' && keys === 'closed,copied,fault,opened,outcome,partialWritten,phase,run,stage' &&
      typeof item.closed === 'boolean' && typeof item.copied === 'boolean' && count(item.opened) &&
      outcomes.some(outcome => outcome === item.outcome) && phases.some(phase => phase === item.phase) &&
      faults.some(fault => fault === item.fault) && typeof item.partialWritten === 'boolean' &&
      item.partialWritten === (item.fault === 'after-partial-write')) return item as Frame;
  refuse();
}

class Session {
  private readonly child;
  private readonly exit: Promise<void>;
  private readonly timer: NodeJS.Timeout;
  private exited = false;
  private code: number | null = null;
  private buffered = '';
  private accepted = 0;
  private input = 0;
  private index = 0;
  private pending: (() => void) | undefined;
  private readonly queue: Frame[] = [];
  private ending = false;
  unsafe = false;
  diagnosticsCaptured = false;
  final: Final | undefined;
  readonly reached: typeof stages[number][] = [];
  context: { powershell: string; dotnet: string } | undefined;

  constructor(request: ReturnType<SyntheticRun['helperRequest']>, fault: HelperFault, executable: string,
    private readonly corrupt?: (raw: string) => string) {
    if (Buffer.byteLength(JSON.stringify({ ...request, fault })) + 1 > 8192) refuse();
    const script = fileURLToPath(new URL('../../../test/support/windows-helper-experiment.ps1', import.meta.url));
    this.child = spawn(executable, ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', script],
      { shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    this.exit = new Promise(done => {
      this.child.once('close', code => { this.exited = true; this.code = code; this.pending?.(); done(); });
    });
    this.child.on('error', () => { this.unsafe = true; this.cancel(); });
    this.child.stdin.on('error', () => { this.unsafe = true; this.pending?.(); });
    for (const stream of [this.child.stdout, this.child.stderr]) {
      stream.on('error', () => { this.unsafe = true; this.cancel(); });
    }
    this.child.stderr.on('data', () => { this.diagnosticsCaptured = true; this.unsafe = true; this.cancel(); });
    this.child.stdout.setEncoding('utf8');
    this.child.stdout.on('data', (chunk: string) => {
      // Limit accepted/buffered output. Pipes still drain; total transport is not capped.
      this.accepted += Buffer.byteLength(chunk);
      if (this.accepted > 8192) { this.unsafe = true; this.buffered = ''; this.cancel(); return; }
      this.buffered += chunk;
      let end: number;
      while ((end = this.buffered.indexOf('\n')) !== -1) {
        const raw = this.buffered.slice(0, end).trimEnd();
        this.buffered = this.buffered.slice(end + 1);
        try {
          const frame = parseIntegrationFrame(this.corrupt?.(raw) ?? raw, request.nonce);
          if (this.final) refuse();
          if (frame.stage === 'finished') {
            if (frame.outcome === 'ok' && this.index !== stages.length) refuse();
            this.final = frame;
          } else {
            if (frame.stage !== stages[this.index]) refuse();
            this.index++;
            this.reached.push(frame.stage);
            if (frame.stage === 'protected-ready') this.context = { powershell: frame.powershell!, dotnet: frame.dotnet! };
          }
          this.queue.push(frame); this.pending?.();
        } catch { this.unsafe = true; this.cancel(); }
      }
    });
    this.timer = setTimeout(() => { this.unsafe = true; this.cancel(); }, 30_000);
    this.send({ ...request, fault });
  }
  send(value: unknown): void {
    const line = JSON.stringify(value) + '\n';
    this.input += Buffer.byteLength(line);
    if (this.input > 8192 || this.ending || this.unsafe) refuse();
    this.child.stdin.write(line);
  }
  cancel(): void {
    if (!this.ending) { this.ending = true; this.child.stdin.end(); }
    this.pending?.();
  }
  async expect(stage: typeof stages[number], count: number): Promise<void> {
    while (!this.queue.length && !this.exited && !this.unsafe) {
      await new Promise<void>(done => { this.pending = done; });
      this.pending = undefined;
    }
    const frame = this.queue.shift();
    if (this.unsafe || !frame || frame.stage !== stage || frame.count !== count) refuse();
  }
  async finish(): Promise<boolean> {
    this.cancel();
    let grace: NodeJS.Timeout | undefined;
    await Promise.race([this.exit, new Promise<void>(done => { grace = setTimeout(done, 10_000); })]);
    if (grace) clearTimeout(grace);
    clearTimeout(this.timer);
    if (!this.exited) {
      this.child.unref(); this.child.stdin.destroy(); this.child.stdout.destroy(); this.child.stderr.destroy();
      return false;
    }
    if (this.buffered.trim() || this.code !== 0) this.unsafe = true;
    return this.final?.closed === true;
  }
}

export type Options = {
  fault?: HelperFault;
  hook?: (phase: IntegrationPhase, run: SyntheticRun) => void | Promise<void>;
  cleanupFault?: (phase: Phase, run: SyntheticRun) => void;
  // Synthetic protocol/uncertainty injection only. Never forwarded to the helper.
  corruptFrame?: (raw: string) => string;
  simulateExitUncertainty?: boolean;
};
export type IntegrationResult = Readonly<{
  outcome: Outcome; cleanup: Cleanup;
  evidence: { stages: readonly typeof stages[number][]; phase: string; fault: string; partialWritten: boolean;
    opened: number; diagnosticsCaptured: boolean; exitConfirmed: boolean; helperOutcome: string;
    powershell?: string; dotnet?: string };
}>;
export async function exerciseSyntheticWithWindowsHelper(selected: readonly string[], options: Options = {}): Promise<IntegrationResult> {
  let run: SyntheticRun | undefined;
  let session: Session | undefined;
  let outcome = refused();
  let cleanup: Cleanup = { synthetic: true, status: 'removed' };
  let exitConfirmed = false;
  let candidate = false;
  try {
    const executable = process.env.WORKSPACE_SURVEYOR_HELPER_PWSH;
    if (stopped || process.platform !== 'win32' || process.env.WORKSPACE_SURVEYOR_RUN_HELPER_INTEGRATION !== '1' ||
        !executable || !isAbsolute(executable) || !/pwsh\.exe$/i.test(executable)) refuse();
    if (!selected.length || new Set(selected).size !== selected.length ||
        selected.some(name => !fixtureNames.some(allowed => allowed === name))) { outcome = refused('selection'); refuse(); }
    if (!helperFaults.some(fault => fault === (options.fault ?? 'none'))) refuse();
    cleanup = { synthetic: true, status: 'residual' };
    run = new SyntheticRun(protection);
    session = new Session(run.helperRequest(), options.fault ?? 'none', executable, options.corruptFrame);
    await session.expect('protected-ready', 0);
    await options.hook?.('protected-ready', run);
    run.buildProtectedFixtures();
    await options.hook?.('fixtures-ready', run);
    const before = run.helperBaseline(selected);
    await options.hook?.('after-baseline', run);
    run.verifyHelperSources(selected, before, true);
    session.send({ command: 'acquire', selected, manifest: before.map(item =>
      ({ name: item.name, size: Number(item.size), digest: item.digest })) });
    await session.expect('handles-held', before.length);
    await options.hook?.('handles-held', run);
    run.verifyHelperSources(selected, before, true);
    session.send({ command: 'copy' });
    await session.expect('copies-verified', before.length);
    const acquired = run.helperCopies(before);
    await options.hook?.('copies-verified', run);
    run.analyzeHelperCopies(selected, before);
    await options.hook?.('after-analysis', run);
    run.verifyHelperAcquisition(acquired);
    run.verifyHelperSources(selected, before);
    session.send({ command: 'verify' });
    await session.expect('verified-held', before.length);
    await options.hook?.('verified-held', run);
    run.verifyHelperAcquisition(acquired);
    run.verifyHelperSources(selected, before);
    session.send({ command: 'release' });
    outcome = { synthetic: true, protection, status: 'acquired', files: before.length };
    candidate = true;
  } catch (error) {
    const failure = syntheticFailure(error);
    if (outcome.reason !== 'selection') outcome = refused(failure.reason);
    if (!run && failure.cleanup) cleanup = failure.cleanup;
  } finally {
    if (session) {
      exitConfirmed = await session.finish();
      if (!exitConfirmed) stopped = true;
      if (session.unsafe || !exitConfirmed) outcome = refused();
      else if (session.final?.outcome !== 'ok' && outcome.status === 'acquired') outcome = refused();
      else if (outcome.status === 'acquired' && (session.final?.opened !== outcome.files ||
          session.final.copied !== true || session.final.phase !== 'release' || session.final.fault !== 'none')) outcome = refused();
    }
    if (run && (!session || exitConfirmed)) {
      try { await options.hook?.('after-exit', run); } catch { outcome = refused(); }
      if (!options.simulateExitUncertainty) cleanup = run.cleanup(options.cleanupFault);
    }
    if (options.simulateExitUncertainty) { exitConfirmed = false; outcome = refused(); }
    if (cleanup.status !== 'removed') outcome = refused();
  }
  if (!candidate && outcome.status === 'acquired') outcome = refused();
  const final = session?.final;
  return { outcome, cleanup, evidence: { stages: session?.reached ?? [], phase: final?.phase ?? 'input',
    fault: final?.fault ?? 'none', partialWritten: final?.partialWritten ?? false, opened: final?.opened ?? 0,
    diagnosticsCaptured: session?.diagnosticsCaptured ?? false, exitConfirmed, helperOutcome: final?.outcome ?? 'unverified',
    ...session?.context } };
}
