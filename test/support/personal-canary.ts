// Private research runner; never imported by product code. No personal run in tests.
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { randomUUID, createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { existsSync, lstatSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmdirSync,
  unlinkSync, writeFileSync, openSync, readSync, fstatSync, closeSync, mkdirSync, opendirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DatabaseSync, constants } from 'node:sqlite';
import { inspectQualificationAnalysis, type Qualification, type QualificationTest } from './personal-qualification.js';
import type { AdapterResult } from './thread-cwd-adapter.js';
import { LocalMapDelivery, LocalMapCapability } from './local-thread-cwd-capability.js';
import { ExplorerSnapshot, reconcile } from '../../src/explorer/model.js';
import type { ReaderResult, LimitDetail } from '../../src/explorer/readers.js';
import { explorerDesktopClosure } from './explorer-closure.js';

export const canaryLimits = Object.freeze({ file: 16 * 1024 * 1024, selected: 32 * 1024 * 1024,
  scratch: 64 * 1024 * 1024 + 8192, files: 7, directories: 3 });
const names = ['database.sqlite', 'database.sqlite-wal', 'database.sqlite-shm'] as const;
const explorerNames = [...names, 'global-state.json', 'session-index.jsonl'] as const;
const explorerSets=[1,3].flatMap(n=>[['global-state.json'],['session-index.jsonl'],['global-state.json','session-index.jsonl']].map(extra=>[...names.slice(0,n),...extra]));
export const explorerScratchLimits = Object.freeze({...canaryLimits, files:11});
const steps = ['prepared', 'recovery-ready', 'held', 'copied', 'verified'] as const;
const reasons = ['selection', 'closure', 'limit', 'containment', 'unstable', 'analysis', 'unsupported', 'helper', 'cleanup', 'io'] as const;
type Reason = typeof reasons[number];
type AcquisitionStage='input'|'recovery-preflight'|'closure-preflight'|'source-selection'|'scratch-initialization'|'recovery-initialization'|
  'helper-preparation'|'recovery-persistence'|'source-acquisition'|'copy-validation'|'analysis'|'source-verification'|'helper-release';
type ScratchInitialization='not-started'|'validating'|'creation-attempted'|'created';
type CanaryLimit=LimitDetail|'source-file-bytes'|'source-total-bytes'|'scratch-file-bytes'|'scratch-total-bytes'|'scratch-entries'|'recovery-controls'|'recovery-entries';
export type CanaryFault = 'none' | 'protected' | 'descriptor' | 'partial-copy' | 'diagnostic' |
  'recovery-create' | 'recovery-descriptor' | 'recovery-write' | 'recovery-flush' | 'recovery-readback';
type Entry = { name: typeof explorerNames[number]; size: number; digest: string };
type Stat = { dev: bigint; ino: bigint; size: bigint; mtime: bigint; ctime: bigint };
type Final = { stage: 'finished'; run: string; outcome: 'ok' | 'io' | 'acl-refused' | 'sharing-refused' |
  'closure-refused' | 'unstable'; closed: boolean; copied: boolean; phase: string; fault: string;
  partialWritten: boolean; opened: number; recoveryCheck?:RecoveryCheck; refusal?:RecoveryCategory };
type Frame = { stage: 'prepared' | 'recovery-ready' | 'recovery-verified' | 'legacy-prepared' | 'legacy-ready' | 'copied' | 'verified'; run: string; count: number; protected: true } |
  { stage: 'held'; run: string; count: number; manifest: Entry[] } |
  { stage:'recovery-held'|'legacy-held'; run:string; payload:string } | { stage:'location';run:string;store:string;legacy?:string } |
  { stage:'legacy-held';run:string;payload:string;security:string } |
  { stage:'recovery-deleted'|'recovery-paused';run:string;count:number;deleted:boolean } | Final;
export type CanaryResult = Readonly<{ status: 'passed' | 'refused'; reason: Reason | 'none';
  cleanup: 'removed' | 'residual'; files: number; schemaReadable: boolean; sourcesStable: boolean;
  recovery: 'removed' | 'available' | 'unavailable';
  qualification?: Qualification | null;
  mapping?: AdapterResult['summary'] | null;
  attemptConsumed?: boolean;
  limit?:CanaryLimit;failureStage?:'source-selection'|'copy-validation'|'analysis'|'source-verification';
  evidence: { stages: readonly string[]; phase: string; fault: string; partialWritten: boolean;
    opened: number; exitConfirmed: boolean; diagnosticsDiscarded: boolean;
    acquisition?:Readonly<{stage:AcquisitionStage;reason:Reason|'none';scratchInitialization:ScratchInitialization;
      recoveryPreflight:'not-checked'|'clear'|'occupied';helperLaunched:boolean;
      helperExit:'not-launched'|'confirmed'|'unconfirmed';helperOutcome:Final['outcome']|'not-reported';
      cleanupRecovery:RecoveryStatus|'not-attempted'}> } }>;
class Refusal extends Error {
  constructor(readonly reason: Reason,readonly limit?:CanaryLimit,readonly recoveryCategory?:RecoveryCategory) { super('Canary refused'); this.stack = 'CanaryRefusal'; }
}
function stop(reason: Reason,limit?:CanaryLimit): never { throw new Refusal(reason,limit); }
function recoveryStop(category:RecoveryCategory,reason:Reason='cleanup'):never{throw new Refusal(reason,undefined,category);}
function safeReason(error: unknown): Reason { return error instanceof Refusal ? error.reason : 'io'; }
export function contains(parent: string, child: string): boolean {
  const part = relative(resolve(parent), resolve(child));
  return part === '' || (!isAbsolute(part) && part !== '..' && !part.startsWith(`..${sep}`));
}
function overlap(a: string, b: string): boolean { return contains(a, b) || contains(b, a); }
function checked(path: string, directory: boolean): void {
  if (!isAbsolute(path) || /^(?:\\\\|\/\/)/.test(path) || /[<>"|?*\x00-\x1f]/.test(path) ||
      (process.platform === 'win32' && !/^[A-Za-z]:[\\/][^:]*$/.test(path))) stop('containment');
  let current = resolve(path);
  for (let depth = 0; ; depth++) {
    if (depth > 64) stop('containment');
    const stat = lstatSync(current);
    if (stat.isSymbolicLink() || (current === resolve(path) &&
        (directory ? !stat.isDirectory() : !stat.isFile() || stat.nlink !== 1))) stop('containment');
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  if (relative(resolve(path), realpathSync(path)) !== '') stop('containment');
}
function metadata(path: string,kind:'source'|'scratch'='source'): Stat {
  checked(path, false);
  const s = lstatSync(path, { bigint: true });
  if (s.size > BigInt(canaryLimits.file)) stop('limit',kind==='source'?'source-file-bytes':'scratch-file-bytes');
  return { dev: s.dev, ino: s.ino, size: s.size, mtime: s.mtimeNs, ctime: s.ctimeNs };
}
function same(a: readonly Stat[], b: readonly Stat[]): boolean {
  return a.length === b.length && a.every((s, i) => {
    const t = b[i]; return t !== undefined && Object.keys(s).every(k => s[k as keyof Stat] === t[k as keyof Stat]);
  });
}
export function selectedPaths(source: string): string[] {
  checked(source, false);
  const present = (path: string): boolean => {
    try { lstatSync(path); return true; } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
  };
  if (present(source + '-journal')) stop('selection');
  const wal = present(source + '-wal'), shm = present(source + '-shm');
  if (wal !== shm) stop('selection');
  const paths = wal ? [source, source + '-wal', source + '-shm'] : [source];
  let size = 0n;
  for (const path of paths) size += metadata(path).size;
  if (size > BigInt(canaryLimits.selected)) stop('limit','source-total-bytes');
  return paths;
}

// Owns scratch only. No source argument, source registration or recursive deletion.
export class CanaryScratch {
  constructor(readonly copyNames:readonly string[]=names,readonly profile:'canary'|'explorer'='canary',private readonly selectedWal?:boolean) {
    if(profile==='canary'&&copyNames!==names)stop('selection');
    if(profile==='explorer'&&!explorerSets.some(set=>set.join(',')===copyNames.join(',')))stop('selection');
    this.copyNames=Object.freeze([...copyNames]);
  }
  root: string | undefined;
  #initialization:ScratchInitialization='not-started';
  get initialization():ScratchInitialization{return this.#initialization;}
  readonly nonce = randomUUID();
  private identity: { dev: bigint; ino: bigint } | undefined;
  private markerRemoved = false;
  private removed = false;
  initialize(): void {
    this.#initialization='validating';
    const parent = realpathSync(tmpdir());
    checked(parent, true);
    if (overlap(parent, process.cwd()) || parent.split(/[\\/]/).some(p => p.toLowerCase() === '.codex')) stop('containment');
    // Set before dispatch: a creation exception is still uncertain, even without a returned path.
    this.#initialization='creation-attempted';
    this.root = mkdtempSync(join(parent, 'workspace-surveyor-canary-'));
    this.identity = lstatSync(this.root, { bigint: true });
    writeFileSync(join(this.root, 'owner'), this.nonce, { flag: 'wx' });
    this.owned();
    this.#initialization='created';
  }
  private rootCheck(): void {
    if (!this.root || !this.identity || this.removed) stop('containment');
    checked(this.root, true);
    const actual = lstatSync(this.root, { bigint: true });
    if (actual.dev !== this.identity.dev || actual.ino !== this.identity.ino) stop('containment');
  }
  owned(): void {
    this.rootCheck();
    const owner = join(this.root!, 'owner'); checked(owner, false);
    if (lstatSync(owner).size !== this.nonce.length || readFileSync(owner, 'utf8') !== this.nonce) stop('containment');
  }
  path(area: 'acquisition' | 'analysis', index: number): string {
    if (!Number.isInteger(index) || index < 0 || index >= this.copyNames.length) stop('selection');
    this.owned(); checked(join(this.root!, area), true);
    return join(this.root!, area, this.copyNames[index]!);
  }
  sqliteLocation():string {
    // Only verified owned analysis copies. Never apply immutable mode to a source or omit a selected WAL.
    const inventory=this.entries(),files=inventory.files,path=this.path('analysis',0);
    const wal=files.includes(path+'-wal'),shm=files.includes(path+'-shm');
    if(wal!==shm)stop('containment');
    if(this.selectedWal!==undefined&&wal!==this.selectedWal)stop('containment');
    if(inventory.directories.includes(join(this.root!,'acquisition'))){
      const acquisition=join(this.root!,'acquisition','database.sqlite');
      if(files.includes(acquisition+'-wal')!==wal||files.includes(acquisition+'-shm')!==shm)stop('containment');
    }
    return wal?path:pathToFileURL(path).href+'?immutable=1';
  }
  entries(): { files: string[]; directories: string[] } {
    this.owned();
    const files = [join(this.root!, 'owner')]; const directories: string[] = [];
    const rootEntries = readdirSync(this.root!);
    if (rootEntries.some(n => !['owner','acquisition','analysis'].includes(n))) stop('containment');
    let bytes = lstatSync(files[0]!).size;
    for (const area of ['acquisition','analysis'] as const) {
      const directory = join(this.root!, area);
      if (!rootEntries.includes(area)) continue;
      checked(directory, true); directories.push(directory);
      for (const name of readdirSync(directory)) {
        if (!this.copyNames.some(n => n === name)) stop('containment');
        const path = join(directory, name); const stat = metadata(path,'scratch');
        bytes += Number(stat.size); files.push(path);
      }
    }
    if (files.length > (this.profile==='explorer'?explorerScratchLimits.files:canaryLimits.files) || directories.length + 1 > canaryLimits.directories) stop('limit','scratch-entries');
    if(bytes>canaryLimits.scratch)stop('limit','scratch-total-bytes');
    return { files, directories };
  }
  cleanup(fault?: (phase: 'child' | 'root') => void): 'removed' | 'residual' {
    if (this.removed) return 'removed';
    try {
      if (!this.markerRemoved) {
        const entries = this.entries(); // Authenticate every entry before any deletion.
        for (const file of entries.files) {
          if (file === join(this.root!, 'owner')) continue;
          this.owned(); checked(file, false); unlinkSync(file);
        }
        for (const dir of entries.directories) { this.owned(); checked(dir, true); fault?.('child'); rmdirSync(dir); }
        this.owned(); unlinkSync(join(this.root!, 'owner')); this.markerRemoved = true;
      }
      this.rootCheck(); if (readdirSync(this.root!).length) stop('containment');
      fault?.('root'); rmdirSync(this.root!); this.removed = true; return 'removed';
    } catch { return 'residual'; }
  }
}
function digestCopy(path: string): string {
  const before = metadata(path,'scratch'), handle = openSync(path, 'r');
  try {
    const actual = fstatSync(handle, { bigint: true });
    if (actual.dev !== before.dev || actual.ino !== before.ino || actual.size !== before.size) stop('unstable');
    const bytes = Buffer.alloc(Number(before.size) + 1); let count = 0;
    while (count < bytes.length) { const n = readSync(handle, bytes, count, bytes.length - count, null); if (!n) break; count += n; }
    if (BigInt(count) !== before.size || !same([before],[metadata(path,'scratch')])) stop('unstable');
    return createHash('sha256').update(bytes.subarray(0,count)).digest('hex');
  } finally { closeSync(handle); }
}
export function inspectCanaryAnalysis(scratch: CanaryScratch, test?: (db: DatabaseSync) => void): boolean {
  const path = scratch.path('analysis',0); metadata(path,'scratch');
  const db = new DatabaseSync(scratch.sqliteLocation(),{readOnly:true,allowExtension:false,defensive:true,timeout:0,
    enableDoubleQuotedStringLiterals:false,limits:{length:1024*1024,sqlLength:1024*1024,column:512,attach:0}});
  try {
    db.exec('PRAGMA trusted_schema=OFF; PRAGMA query_only=ON');
    db.setAuthorizer((action, table, _column, database) => {
      if (action === constants.SQLITE_SELECT) return constants.SQLITE_OK;
      if (action === constants.SQLITE_READ && database === 'main' && _column === '' &&
          ['sqlite_master','sqlite_schema'].includes(table ?? '')) return constants.SQLITE_OK;
      if (action === constants.SQLITE_PRAGMA && table === 'schema_version' && _column === null) return constants.SQLITE_OK;
      return constants.SQLITE_DENY;
    });
    test?.(db);
    db.prepare('PRAGMA schema_version').get();
    db.prepare('SELECT 1 FROM main.sqlite_schema LIMIT 1').get();
    return true;
  } finally { db.close(); }
}
export function parseCanaryFrame(raw: string, nonce: string, copyNames:readonly string[]=names,recovery=false,disposal=false): Frame {
  if (Buffer.byteLength(raw) > 8192) stop('helper');
  let value: unknown; try { value=JSON.parse(raw); } catch { stop('helper'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) stop('helper');
  const x=value as Record<string,unknown>, keys=Object.keys(x).sort().join(',');
  if (x.run !== nonce) stop('helper');
  const count=(v:unknown):v is number=>typeof v==='number' && Number.isInteger(v) && v>=0 && v<= copyNames.length;
  if (['prepared','recovery-ready','recovery-verified','legacy-prepared','legacy-ready','copied','verified'].includes(String(x.stage)) && keys==='count,protected,run,stage' &&
      x.protected===true && count(x.count) && (['prepared','recovery-ready','recovery-verified','legacy-prepared','legacy-ready'].includes(String(x.stage)) ? x.count===0 : x.count>0)) return x as Frame;
  if (x.stage==='held' && keys==='count,manifest,run,stage' && count(x.count) && x.count>0 &&
      Array.isArray(x.manifest) && x.manifest.length===x.count) {
    let total=0;
    x.manifest.forEach((v:unknown,i:number)=>{
      if(!v || typeof v!=='object' || Array.isArray(v))stop('helper');
      const e=v as Record<string,unknown>;
      if(Object.keys(e).sort().join(',')!=='digest,name,size' || e.name!==copyNames[i] ||
          typeof e.size!=='number' || !Number.isInteger(e.size) || e.size<0 || e.size>canaryLimits.file ||
          typeof e.digest!=='string' || !/^[a-f0-9]{64}$/.test(e.digest))stop('helper');
      total+=e.size;
    });
    if ((copyNames.some(n=>n==='global-state.json'||n==='session-index.jsonl')?x.count!==copyNames.length:x.count!==1&&x.count!==3) || total>canaryLimits.selected)stop('helper');
    return x as Frame;
  }
  if(['recovery-held','legacy-held'].includes(String(x.stage)) && keys==='payload,run,stage' && typeof x.payload==='string' && Buffer.byteLength(x.payload)<=6144)return x as Frame;
  if(disposal&&x.stage==='legacy-held'&&keys==='payload,run,security,stage'&&typeof x.payload==='string'&&Buffer.byteLength(x.payload)<=3072&&
    typeof x.security==='string'&&/^[a-f0-9]{64}$/.test(x.security))return x as Frame;
  if(x.stage==='location' && keys==='run,stage,store' && typeof x.store==='string' && x.store.length<=2048)return x as Frame;
  if(x.stage==='location' && keys==='legacy,run,stage,store' && typeof x.store==='string' && x.store.length<=2048&&typeof x.legacy==='string'&&Buffer.byteLength(x.legacy)<=3072)return x as Frame;
  if(['recovery-deleted','recovery-paused'].includes(String(x.stage)) && keys==='count,deleted,run,stage' &&
      Number.isInteger(x.count) && Number(x.count)>=1 && Number(x.count)<=(disposal?18:copyNames.length===5?14:copyNames.includes('global-state.json')||copyNames.includes('session-index.jsonl')?12:10) && typeof x.deleted==='boolean' &&
      (x.stage!=='recovery-paused'||x.deleted===true))return x as Frame;
  const recoveryFinal=recovery&&keys==='closed,copied,fault,opened,outcome,partialWritten,phase,recoveryCheck,refusal,run,stage'&&
    recoveryChecks.includes(x.recoveryCheck as RecoveryCheck)&&recoveryCategories.includes(x.refusal as RecoveryCategory)&&['input','recovery'].includes(String(x.phase));
  if(x.stage==='finished' && (keys==='closed,copied,fault,opened,outcome,partialWritten,phase,run,stage'||recoveryFinal) &&
      ['ok','io','acl-refused','sharing-refused','closure-refused','unstable'].includes(String(x.outcome)) &&
      ['input','closure','protect','persistence','open','held','copy','verify','release','location','recovery'].includes(String(x.phase)) &&
      ['none','after-protection','destination-descriptor','after-partial-write','diagnostic','recovery-create','recovery-descriptor','recovery-write','recovery-flush','recovery-readback'].includes(String(x.fault)) &&
      typeof x.closed==='boolean' && typeof x.copied==='boolean' && typeof x.partialWritten==='boolean' &&
      x.partialWritten===(x.fault==='after-partial-write') && count(x.opened))return x as Final;
  stop('helper');
}
export function prepareCanaryRequest(request:object):Buffer {
  try { const bytes=Buffer.from(JSON.stringify(request)+'\n','utf8');
    const value=JSON.parse(bytes.toString('utf8')) as Record<string,unknown>;
    let reserve=1024;
    if(value.operation==='acquire'){
      const explorer=value.profile==='explorer';
      const extra=explorer?[...(value.globalState!==undefined?['global-state.json']:[]),...(value.sessionIndex!==undefined?['session-index.jsonl']:[])]:[];
      if(typeof value.root!=='string'||typeof value.nonce!=='string'||!([1,3].map(n=>n+extra.length)).includes(Number(value.count))||(explorer&&!extra.length))stop('helper');
      const id={dev:'9'.repeat(20),ino:'9'.repeat(20)};
      const entries=[{name:'owner',kind:'file',...id},...['acquisition','analysis'].flatMap(area=>[
        {name:area,kind:'directory',...id},...([...names.slice(0,Number(value.count)-extra.length),...extra]).map(name=>({name:area+'/'+name,kind:'file',...id}))])];
      const payload=JSON.stringify({version:explorer?2:1,...(explorer?{profile:'explorer'}:{}),store:id,root:{path:value.root,...id},nonce:value.nonce,entries});
      reserve=Buffer.byteLength(JSON.stringify({command:'persist',payload})+'\n');
      for(const command of ['acquire','copy','verify','release'])reserve+=Buffer.byteLength(JSON.stringify({command})+'\n');
      if(typeof value.store==='string'&&value.store.endsWith('-Active'))reserve+=Buffer.byteLength(JSON.stringify({command:'accept-legacy'})+'\n');
    }
    if(bytes.length+reserve>8192)stop('helper');return bytes;
  }catch{stop('helper');}
}
export class CanarySession {
  private child:ChildProcessWithoutNullStreams|undefined; private done:Promise<void>=Promise.resolve(); private ended=false; private exited=false; private code:number|null=null;
  private input=0; private output=0; private buffer=''; private next:(()=>void)|undefined;
  private queue:Frame[]=[]; private timer:NodeJS.Timeout|undefined;
  private initial:Buffer;
  private recoveryProtocol:boolean;
  private disposalProtocol:boolean;
  constructor(request:object,private executable:string,private nonce:string,private corrupt?: (s:string)=>string,
    private order:readonly string[]=steps,private copyNames:readonly string[]=names) {
    this.initial=prepareCanaryRequest(request);const operation=(request as {operation?:unknown}).operation;
    this.disposalProtocol=operation==='dispose-legacy'||operation==='preview-legacy';
    this.recoveryProtocol=this.disposalProtocol||['recover','diagnose-recovery','preserve-legacy','retire-legacy','validate-legacy'].includes(String(operation));
  }
  get processExited():boolean{return !this.child||this.exited;}
  get spawned():boolean{return this.child!==undefined;}
  allowExplorerRecovery():void { this.copyNames=explorerNames; }
  unsafe=false; diagnostics=false; final:Final|undefined; reached:string[]=[];
  start(afterSpawn?:()=>void):void {
    if(this.child)stop('helper');
    const script=fileURLToPath(new URL('../../../test/support/personal-canary-helper.ps1',import.meta.url));
    this.child=spawn(this.executable,['-NoLogo','-NoProfile','-NonInteractive','-File',script],
      {shell:false,windowsHide:true,stdio:['pipe','pipe','pipe']});
    this.done=new Promise(done=>this.child!.once('close',code=>{this.exited=true;this.code=code;this.next?.();done();}));
    this.child.on('error',()=>{this.unsafe=true;this.cancel();});
    this.child.stdin.on('error',()=>{this.unsafe=true;this.next?.();});
    for(const stream of [this.child.stdout,this.child.stderr])stream.on('error',()=>{this.unsafe=true;this.cancel();});
    this.child.stderr.on('data',()=>{this.diagnostics=true;this.unsafe=true;this.cancel();});
    this.child.stdout.setEncoding('utf8');
    this.child.stdout.on('data',(chunk:string)=>{
      this.output+=Buffer.byteLength(chunk);
      if(this.output>8192){this.buffer='';this.unsafe=true;this.cancel();return;}
      this.buffer+=chunk;let end:number;
      while((end=this.buffer.indexOf('\n'))>=0){
        const line=this.buffer.slice(0,end).trimEnd();this.buffer=this.buffer.slice(end+1);
        try{
          const f=parseCanaryFrame(this.corrupt?.(line)??line,this.nonce,this.copyNames,this.recoveryProtocol,this.disposalProtocol);
          if(this.final)stop('helper');
          if(f.stage==='finished')this.final=f;
          else {if(f.stage!==this.order[this.reached.length])stop('helper');this.reached.push(f.stage);}
          this.queue.push(f);this.next?.();
        }catch{this.unsafe=true;this.cancel();}
      }
    });
    this.timer=setTimeout(()=>{this.unsafe=true;this.cancel();},30_000);
    afterSpawn?.();
    this.input=this.initial.length;this.child.stdin.write(this.initial);
  }
  send(value:object):void {
    const line=JSON.stringify(value)+'\n';this.input+=Buffer.byteLength(line);
    if(this.unsafe||this.ended||this.input>8192)stop('helper');this.child!.stdin.write(line);
  }
  cancel():void{if(!this.ended){this.ended=true;this.child?.stdin.end();}this.next?.();}
  async expect(stage:Frame['stage'],count?:number):Promise<Frame>{
    while(!this.queue.length&&!this.exited&&!this.unsafe){await new Promise<void>(done=>{this.next=done;});this.next=undefined;}
    const f=this.queue.shift();if(this.unsafe||!f||f.stage!==stage||(count!==undefined&&(!('count' in f)||f.count!==count)))stop('helper');return f;
  }
  async finish():Promise<boolean>{
    if(!this.child)return true;
    this.cancel();let grace:NodeJS.Timeout|undefined;
    await Promise.race([this.done,new Promise<void>(done=>{grace=setTimeout(done,10_000);})]);
    if(grace)clearTimeout(grace);clearTimeout(this.timer);
    if(!this.exited){this.child.unref();this.child.stdin.destroy();this.child.stdout.destroy();this.child.stderr.destroy();return false;}
    if(this.buffer.trim()||this.code!==0)this.unsafe=true;
    return this.final?.closed===true;
  }
}
function recoveryEntries(path:string):string[]{
  const directory=opendirSync(path);const entries:string[]=[];
  try{for(let entry=directory.readSync();entry;entry=directory.readSync()){
    if(entries.length>=10)stop('limit','recovery-entries');entries.push(entry.name);
  }}finally{directory.closeSync();}return entries;
}
type Identity={dev:string;ino:string};
type RecoveryEntry=Identity & {name:string;kind:'file'|'directory'};
type RecoveryPayload={version:1|2;profile?:'explorer';store:Identity;root:Identity & {path:string};nonce:string;entries:RecoveryEntry[]};
export type RecoveryStatus='removed'|'busy'|'refused'|'residual'|'unavailable';
const recoveryCategories=['none','selection','path-safety','structural-inventory','identity-ownership','access-security',
  'authentication','scratch-validation','scratch-inventory','scratch-limit','scratch-entry-disappeared','scratch-inspection',
  'helper-protocol','io','lifetime-unconfirmed','cleanup'] as const;
type RecoveryCategory=typeof recoveryCategories[number];
const recoveryChecks=['selection','location','controls','control-security','authentication','payload','scratch-validation',
  'protocol','deletion','release','control-retirement'] as const;
type RecoveryCheck=typeof recoveryChecks[number];
export type RecoveryReport=Readonly<{status:RecoveryStatus|'verified';check:RecoveryCheck;category:RecoveryCategory;
  helperExit:'not-launched'|'confirmed'|'unconfirmed';deletionAuthorized:boolean}>;
export type CleanupPhase='file'|'child'|'marker'|'root'|'metadata';
const controlNames=['key','record'];
function identity(path:string,directory:boolean):Identity {
  checked(path,directory);const s=lstatSync(path,{bigint:true});return {dev:s.dev.toString(),ino:s.ino.toString()};
}
function identified(path:string,directory:boolean,id:Identity):void {
  const actual=identity(path,directory);if(actual.dev!==id.dev||actual.ino!==id.ino)recoveryStop('identity-ownership','containment');
}
function missing(path:string):boolean {
  try{lstatSync(path);return false;}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return true;throw e;}
}
function recoveryLocation(store:string,root?:string,source?:string):void {
  checked(dirname(store),true);
  if(!isAbsolute(store)||resolve(store)!==store||overlap(store,process.cwd())||
    store.split(/[\\/]/).some(p=>p.toLowerCase()==='.codex')||
    (root&&overlap(store,root))||(source&&overlap(store,dirname(source))))stop('containment');
}
function controlInventory(store:string,disposal=false):{directory:Identity;key:Identity;record:Identity} {
  checked(store,true);
  const members=recoveryEntries(store).sort().join(',');
  if(members!=='key,record'&&!(disposal&&members==='disposal,key,record'))recoveryStop('structural-inventory');
  if(lstatSync(join(store,'key')).size!==32||lstatSync(join(store,'record')).size>8192)stop('limit','recovery-controls');
  return {directory:identity(store,true),key:identity(join(store,'key'),false),record:identity(join(store,'record'),false)};
}
export function recoveryPayload(scratch:CanaryScratch,store:string):string {
  const all=scratch.entries();
  const entries:RecoveryEntry[]=[...all.files.map(path=>({name:relative(scratch.root!,path).split(sep).join('/'),kind:'file' as const,...identity(path,false)})),
    ...all.directories.map(path=>({name:relative(scratch.root!,path).split(sep).join('/'),kind:'directory' as const,...identity(path,true)}))].sort((a,b)=>a.name.localeCompare(b.name));
  return JSON.stringify({version:scratch.profile==='explorer'?2:1,...(scratch.profile==='explorer'?{profile:'explorer'}:{}),store:identity(store,true),root:{path:scratch.root,...identity(scratch.root!,true)},nonce:scratch.nonce,entries});
}
function parseRecoveryPayload(raw:string,store:string):RecoveryPayload {
  if(Buffer.byteLength(raw)>6144)stop('cleanup');
  const x=JSON.parse(raw) as RecoveryPayload;
  const keys=(v:unknown,wanted:string):boolean=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===wanted;
  const validId=(v:Identity):boolean=>typeof v.dev==='string'&&/^\d{1,20}$/.test(v.dev)&&typeof v.ino==='string'&&/^[1-9]\d{0,19}$/.test(v.ino);
  const explorer=x.version===2&&x.profile==='explorer';
  if(!keys(x,explorer?'entries,nonce,profile,root,store,version':'entries,nonce,root,store,version')||(!explorer&&x.version!==1)||!keys(x.store,'dev,ino')||!validId(x.store)||
    !keys(x.root,'dev,ino,path')||!validId(x.root)||typeof x.root.path!=='string'||
    typeof x.nonce!=='string'||!/^[a-f0-9-]{36}$/.test(x.nonce)||!Array.isArray(x.entries))stop('cleanup');
  recoveryLocation(store,x.root.path);
  if(dirname(x.root.path)!==realpathSync(tmpdir())||!/^workspace-surveyor-canary-[A-Za-z0-9]+$/.test(relative(dirname(x.root.path),x.root.path)))stop('containment');
  identified(store,true,x.store);
  const selected=explorer?explorerSets.find(set=>x.entries.length===3+2*set.length&&set.every(name=>x.entries.some(e=>e.name==='acquisition/'+name)&&x.entries.some(e=>e.name==='analysis/'+name))):
    x.entries.length===5?names.slice(0,1):x.entries.length===9?[...names]:undefined;if(!selected)stop('cleanup');
  const expected=new Map<string,string>([['owner','file'],['acquisition','directory'],['analysis','directory']]);
  for(const area of ['acquisition','analysis'])for(const name of selected)expected.set(area+'/'+name,'file');
  for(const entry of x.entries){
    if(!keys(entry,'dev,ino,kind,name')||!validId(entry)||expected.get(entry.name)!==entry.kind)stop('cleanup');
    expected.delete(entry.name);
  }
  if(expected.size)stop('cleanup');return x;
}
function readAuthenticatedRecord(store:string):RecoveryPayload {
  controlInventory(store);const key=readFileSync(join(store,'key'));const raw=readFileSync(join(store,'record'),'utf8');
  const envelope=JSON.parse(raw) as {payload:string;mac:string};
  if(Object.keys(envelope).sort().join(',')!=='mac,payload'||typeof envelope.payload!=='string'||
    typeof envelope.mac!=='string'||!/^[a-f0-9]{64}$/.test(envelope.mac))stop('cleanup');
  const tag=createHmac('sha256',key).update(envelope.payload,'utf8').digest();
  if(!timingSafeEqual(tag,Buffer.from(envelope.mac,'hex')))stop('cleanup');
  return parseRecoveryPayload(envelope.payload,store);
}
type LegacyManifest={version:1;status:'preserved-unverified';original:string;controls:ReturnType<typeof controlInventory>;
  seal:ReturnType<typeof controlInventory>;recordHash:string;root:RecoveryPayload['root'];nonce:string;
  entries:(RecoveryEntry & {size:number;registered:boolean})[]};
const legacyByteLimit=64*1024*1024+1024*1024; // Retention only; acquisition/recovery budgets do not change.
function legacyPaths(original:string){return {seal:original+'-Legacy',active:original+'-Active'};}
function legacyEntries(p:RecoveryPayload):LegacyManifest['entries']{
  identified(p.root.path,true,p.root);const entries:LegacyManifest['entries']=[];
  const add=(name:string,directory:boolean)=>{
    if(entries.length>=17||!/^(?:(?:acquisition|analysis)\/)?[A-Za-z0-9_.-]{1,64}$/.test(name)||name==='.'||name==='..')stop('containment');
    const path=join(p.root.path,name),id=identity(path,directory),registered=p.entries.find(e=>e.name===name);
    if(registered&&(registered.kind!==(directory?'directory':'file')||id.dev!==registered.dev||id.ino!==registered.ino))stop('containment');
    const size=directory?0:lstatSync(path).size;if(size>canaryLimits.file)stop('limit');
    entries.push({name,kind:directory?'directory':'file',...id,size,registered:!!registered});
  };
  for(const name of recoveryEntries(p.root.path)){
    if(name==='acquisition'||name==='analysis'){
      add(name,true);for(const child of recoveryEntries(join(p.root.path,name)))add(name+'/'+child,false);
    }else add(name,false);
  }
  // Preservation requires the complete signed inventory. RECOVER separately
  // permits authenticated partial cleanup; that policy does not apply here.
  for(const signed of p.entries){
    const observed=entries.find(e=>e.name===signed.name);
    if(!observed||!observed.registered||observed.kind!==signed.kind||observed.dev!==signed.dev||observed.ino!==signed.ino)stop('containment');
  }
  if(entries.reduce((n,e)=>n+e.size,0)>legacyByteLimit)stop('limit');
  if(!entries.some(e=>e.name==='owner'&&e.registered))stop('containment');
  const marker=join(p.root.path,'owner');if(lstatSync(marker).size!==36||readFileSync(marker,'utf8')!==p.nonce)stop('containment');
  return entries.sort((a,b)=>a.name.localeCompare(b.name));
}
function validateLegacy(raw:string,original:string,remaining=true,disposal=false):LegacyManifest{
  if(Buffer.byteLength(raw)>3072)stop('limit');const x=JSON.parse(raw) as LegacyManifest;
  if(Object.keys(x).sort().join(',')!=='controls,entries,nonce,original,recordHash,root,seal,status,version'||
    x.version!==1||x.status!=='preserved-unverified'||x.original!==original||!Array.isArray(x.entries)||x.entries.length>17||
    !/^[a-f0-9]{64}$/.test(x.recordHash)||!/^[a-f0-9-]{36}$/.test(x.nonce))stop('containment');
  if(!x.root||Object.keys(x.root).sort().join(',')!=='dev,ino,path'||typeof x.root.path!=='string'||
    !/^\d{1,20}$/.test(x.root.dev)||!/^[1-9]\d{0,19}$/.test(x.root.ino)||dirname(x.root.path)!==realpathSync(tmpdir())||
    !/^workspace-surveyor-canary-[A-Za-z0-9]+$/.test(relative(dirname(x.root.path),x.root.path)))stop('containment');
  recoveryLocation(original,x.root.path);const paths=legacyPaths(original);recoveryLocation(paths.seal,x.root.path);
  for(const group of [x.controls,x.seal]){
    if(!group||Object.keys(group).sort().join(',')!=='directory,key,record')stop('containment');
    for(const id of Object.values(group))if(!id||Object.keys(id).sort().join(',')!=='dev,ino'||!/^\d{1,20}$/.test(id.dev)||!/^[1-9]\d{0,19}$/.test(id.ino))stop('containment');
  }
  if(JSON.stringify(controlInventory(paths.seal,disposal))!==JSON.stringify(x.seal))stop('containment');
  const seen=new Set<string>();
  for(const e of x.entries){
    if(Object.keys(e).sort().join(',')!=='dev,ino,kind,name,registered,size'||typeof e.registered!=='boolean'||
      !/^\d{1,20}$/.test(e.dev)||!/^[1-9]\d{0,19}$/.test(e.ino)||!Number.isSafeInteger(e.size)||e.size<0||e.size>canaryLimits.file||
      !/^(?:(?:acquisition|analysis)\/)?[A-Za-z0-9_.-]{1,64}$/.test(e.name)||e.name==='.'||e.name==='..'||seen.has(e.name)||
      (e.kind!=='file'&&(e.kind!=='directory'||!['acquisition','analysis'].includes(e.name)||e.size!==0)))stop('containment');seen.add(e.name);
  }
  if(remaining){
    if(JSON.stringify(controlInventory(original))!==JSON.stringify(x.controls))stop('containment');
    // Before accepting this declaration the exclusive helper checks its complete
    // registered subset against the original authenticated inventory. Never reopen
    // its held record; Node verifies all those namespace identities/metadata here.
    const p:RecoveryPayload={version:1,store:x.controls.directory,root:x.root,nonce:x.nonce,
      entries:x.entries.filter(e=>e.registered).map(({name,kind,dev,ino})=>({name,kind,dev,ino}))};
    if(JSON.stringify(legacyEntries(p))!==JSON.stringify(x.entries))stop('containment');
  }
  return x;
}
export async function resolveOriginalRecoveryStore(executable:string,localExplorer=false):Promise<string>{
  if(!localExplorer&&(process.env.WORKSPACE_SURVEYOR_LEGACY_PRESERVATION!=='1'||process.env.WORKSPACE_SURVEYOR_PERSONAL_CANARY!=='1'))stop('selection');
  const nonce=randomUUID(),session=new CanarySession({operation:localExplorer?'locate-original-explorer':'locate-original',nonce},executable,nonce,undefined,['location']);
  try{session.start();const f=await session.expect('location');if(f.stage!=='location')stop('helper');
    if(!await session.finish()||session.unsafe||session.final?.outcome!=='ok')stop('helper');return f.store;
  }finally{await session.finish();}
}
export async function preserveLegacyStore(options:{executable:string;store:string;synthetic:boolean;localExplorer?:true;
  hook?:(stage:'prepared'|'ready')=>void}):Promise<{status:'preserved'|'refused'|'unconfirmed';deletionAuthorized:false;category:RecoveryCategory;check:RecoveryCheck}>{
  let session:CanarySession|undefined,status:'preserved'|'refused'|'unconfirmed'='refused';
  let category:RecoveryCategory='none',check:RecoveryCheck='selection';
  try{
    if(!options.localExplorer&&process.env.WORKSPACE_SURVEYOR_LEGACY_PRESERVATION!=='1'||(options.synthetic?
      options.localExplorer||process.env.WORKSPACE_SURVEYOR_RUN_CANARY_PREPARATION!=='1':options.hook||options.store!==await resolveOriginalRecoveryStore(options.executable,options.localExplorer)))stop('selection');
    check='controls';recoveryLocation(options.store);const controls=controlInventory(options.store),nonce=randomUUID();
    session=new CanarySession({operation:'preserve-legacy',store:options.store,nonce,mode:options.synthetic?'synthetic':options.localExplorer?'explorer':'personal',probe:'none'},
      options.executable,nonce,undefined,['recovery-held','legacy-prepared','legacy-ready']);
    check='control-security';session.start();const held=await session.expect('recovery-held');if(held.stage!=='recovery-held')stop('helper');
    check='scratch-validation';
    const original=parseRecoveryPayload(held.payload,options.store),entries=legacyEntries(original);
    const recordHash=createHash('sha256').update(held.payload,'utf8').digest('hex');
    const preliminary={version:1,status:'preserved-unverified',original:options.store,controls,recordHash,root:original.root,nonce:original.nonce,entries};
    const preliminaryPayload=JSON.stringify(preliminary);if(Buffer.byteLength(preliminaryPayload)>3072)stop('limit');
    check='protocol';session.send({command:'prepare-legacy',payload:preliminaryPayload});await session.expect('legacy-prepared',0);options.hook?.('prepared');
    const value:LegacyManifest={version:1,status:'preserved-unverified',original:options.store,controls,
      seal:controlInventory(legacyPaths(options.store).seal),recordHash,root:original.root,nonce:original.nonce,entries};
    const payload=JSON.stringify(value);if(Buffer.byteLength(payload)>3072)stop('limit');
    session.send({command:'persist-legacy',payload});await session.expect('legacy-ready',0);options.hook?.('ready');
    const paths=legacyPaths(options.store),key=readFileSync(join(paths.seal,'key')),envelope=JSON.parse(readFileSync(join(paths.seal,'record'),'utf8'));
    if(envelope.payload!==payload||envelope.mac!==createHmac('sha256',key).update(payload).digest('hex'))stop('containment');
    validateLegacy(payload,options.store);session.send({command:'release'});
    if(!await session.finish()||session.unsafe||session.final?.outcome!=='ok')stop('helper');status='preserved';
  }catch(error){category=recoveryFailureCategory(error,check,session?.final);}
  finally{if(session&&!await session.finish())status='unconfirmed';}
  return {status,deletionAuthorized:false,category,check};
}
// Future retirement is separate authorization. It never deletes legacy scratch
// or tolerates a surviving original/active store. Only declaration controls retire.
export async function retireLegacyDeclaration(options:{executable:string;store:string;synthetic:boolean}):Promise<RecoveryStatus>{
  let session:CanarySession|undefined,status:RecoveryStatus='refused';
  try{
    if(options.synthetic?process.env.WORKSPACE_SURVEYOR_RUN_CANARY_PREPARATION!=='1':
      process.env.WORKSPACE_SURVEYOR_LEGACY_RETIREMENT!=='1'||options.store!==await resolveOriginalRecoveryStore(options.executable))stop('selection');
    const nonce=randomUUID(),paths=legacyPaths(options.store);
    session=new CanarySession({operation:'retire-legacy',store:options.store,nonce,mode:options.synthetic?'synthetic':'personal',probe:'none'},
      options.executable,nonce,undefined,['legacy-held']);session.start();
    const frame=await session.expect('legacy-held');if(frame.stage!=='legacy-held')stop('helper');
    const manifest=validateLegacy(frame.payload,options.store,false);
    // Root absence is not evidence of an unverified object's disposition.
    // Keep its durable identity references until independent proof is reviewed.
    if(manifest.entries.some(e=>!e.registered))stop('cleanup');
    if(!missing(options.store)||!missing(manifest.root.path)||!missing(paths.active))stop('cleanup');
    session.send({command:'verify-legacy-absence'});session.send({command:'release'});
    if(!await session.finish()||session.unsafe||session.final?.outcome!=='ok')stop('helper');
    if(!missing(options.store)||!missing(manifest.root.path)||!missing(paths.active))stop('cleanup');
    if(JSON.stringify(controlInventory(paths.seal))!==JSON.stringify(manifest.seal))stop('containment');
    for(const name of controlNames)identified(join(paths.seal,name),false,manifest.seal[name as 'key'|'record']);
    unlinkSync(join(paths.seal,'record'));unlinkSync(join(paths.seal,'key'));
    identified(paths.seal,true,manifest.seal.directory);if(recoveryEntries(paths.seal).length)stop('cleanup');rmdirSync(paths.seal);status='removed';
  }catch{/* No scratch deletion, fallback or retry. */}
  finally{if(session&&!await session.finish())status='residual';}
  return status;
}
async function verifyLegacyGuard(executable:string,original:string,synthetic:boolean):Promise<void>{
  const nonce=randomUUID(),session=new CanarySession({operation:'validate-legacy',store:original,nonce,
    mode:synthetic?'synthetic':'personal',probe:'none'},executable,nonce,undefined,['legacy-held']);
  try{
    session.start();const held=await session.expect('legacy-held');if(held.stage!=='legacy-held')stop('helper');
    validateLegacy(held.payload,original);session.send({command:'release'});
    if(!await session.finish()||session.unsafe||session.final?.outcome!=='ok')stop('helper');
  }finally{if(!await session.finish())stop('helper');}
}
// Deliberate disposal is distinct from RECOVER: the caller authorizes disposition
// of the exact preserved inventory, without asserting creation ownership.
function disposalIntent(raw:string){return JSON.stringify({version:1,action:'user-directed-disposal',
  manifestHash:createHash('sha256').update(raw,'utf8').digest('hex')});}
function verifiedDisposalIntent(seal:string,raw:string):{id:Identity;completed:number}|undefined{
  const path=join(seal,'disposal');if(missing(path))return undefined;
  const id=identity(path,false);if(lstatSync(path).size>4096)stop('limit');
  const text=readFileSync(path,'utf8');if(!text.endsWith('\n'))stop('containment');
  const lines=text.slice(0,-1).split('\n');if(lines.length>19)stop('limit');
  const key=readFileSync(join(seal,'key'));if(key.length!==32)stop('containment');
  for(let i=0;i<lines.length;i++){
    const envelope=JSON.parse(lines[i]!) as {payload:string;mac:string};
    const expected=i===0?disposalIntent(raw):JSON.stringify({manifestHash:createHash('sha256').update(raw,'utf8').digest('hex'),index:i});
    if(Object.keys(envelope).sort().join(',')!=='mac,payload'||envelope.payload!==expected||!/^[a-f0-9]{64}$/.test(envelope.mac))stop('containment');
    const mac=createHmac('sha256',key).update(envelope.payload).digest('hex');
    if(!timingSafeEqual(Buffer.from(mac),Buffer.from(envelope.mac)))stop('containment');
  }
  return {id,completed:lines.length-1};
}
function disposalMembers(value:LegacyManifest){return [...value.entries.filter(e=>e.kind==='file'&&e.name!=='owner'),
  ...value.entries.filter(e=>e.kind==='directory'),{name:'owner',kind:'file'},{name:'root',kind:'directory'}];}
function remainingLegacy(value:LegacyManifest,completed:number):void{
  const members=disposalMembers(value);if(completed>members.length)stop('containment');
  if(!missing(value.root.path)){
    identified(value.root.path,true,value.root);
    for(const entry of value.entries.filter(e=>e.kind==='directory')){
      const path=join(value.root.path,entry.name);if(!missing(path))identified(path,true,entry);
    }
  }
  for(let i=0;i<members.length;i++){
    const name=members[i]!.name,path=name==='root'?value.root.path:join(value.root.path,name);
    if(missing(path)!==(i<completed))stop('containment');
  }
  if(missing(value.root.path))return;
  identified(value.root.path,true,value.root);const actual:string[]=[];
  for(const name of recoveryEntries(value.root.path)){
    actual.push(name);
    if(name==='acquisition'||name==='analysis'){
      const entry=value.entries.find(e=>e.name===name);if(!entry||entry.kind!=='directory')stop('containment');
      identified(join(value.root.path,name),true,entry);
      for(const child of recoveryEntries(join(value.root.path,name)))actual.push(name+'/'+child);
    }
  }
  if(actual.length>17)stop('containment');
  for(const name of actual){
    const entry=value.entries.find(e=>e.name===name);if(!entry)stop('containment');
    const path=join(value.root.path,name);identified(path,entry.kind==='directory',entry);
    if(entry.kind==='file'&&lstatSync(path).size!==entry.size)stop('containment');
  }
  const owner=join(value.root.path,'owner');
  if(!missing(owner)){if(lstatSync(owner).size!==36||readFileSync(owner,'utf8')!==value.nonce)stop('containment');}
  else if(actual.length)stop('containment');
}
function disposalOriginalControls(value:LegacyManifest,completed:number):void{
  // Matching authenticated bytes do not excuse replacement control identities.
  // Missing controls are tolerated only after all scratch deletion receipts exist.
  const retired=completed===disposalMembers(value).length;
  if(missing(value.original)){if(!retired)stop('containment');return;}
  identified(value.original,true,value.controls.directory);
  const names=recoveryEntries(value.original);
  if(names.some(name=>!controlNames.includes(name))||!retired&&names.length!==2)stop('containment');
  for(const name of names)identified(join(value.original,name),false,value.controls[name as 'key'|'record']);
}
export type LegacyInventoryPreview=Readonly<{root:string;previouslyRemoved:number;totalBytes:number;
  objects:readonly Readonly<{path:string;kind:'file'|'directory';size:number|null;registered:boolean}>[]}>;
const legacyPreviews=new WeakMap<LegacyInventoryPreview,{store:string;fingerprint:string}>();
function previewFingerprint(manifest:LegacyManifest,raw:string,security:string,completed:number):string{
  const paths=[manifest.original,join(manifest.original,'key'),join(manifest.original,'record'),legacyPaths(manifest.original).seal,
    ...['key','record','disposal'].map(name=>join(legacyPaths(manifest.original).seal,name)),manifest.root.path,
    ...manifest.entries.map(e=>join(manifest.root.path,e.name))];
  const metadata=paths.map(path=>{
    if(missing(path))return null;
    const s=lstatSync(path,{bigint:true});return [s.dev,s.ino,s.size,s.mtimeNs,s.ctimeNs,s.mode,s.nlink].map(String);
  });
  return createHash('sha256').update(JSON.stringify({raw,security,completed,metadata})).digest('hex');
}
async function inspectLegacy(options:{executable:string;store:string;synthetic:boolean},expected?:LegacyInventoryPreview,
  verified?:()=>Promise<boolean>):Promise<LegacyInventoryPreview|undefined>{
  let session:CanarySession|undefined,result:LegacyInventoryPreview|undefined;
  try{
    if(options.synthetic?process.env.WORKSPACE_SURVEYOR_RUN_CANARY_PREPARATION!=='1':
      process.env.WORKSPACE_SURVEYOR_LEGACY_INSPECTION!=='1'||options.store!==await resolveOriginalRecoveryStore(options.executable))stop('selection');
    recoveryLocation(options.store);const nonce=randomUUID();
    session=new CanarySession({operation:'preview-legacy',store:options.store,nonce,mode:options.synthetic?'synthetic':'personal',probe:'none'},
      options.executable,nonce,undefined,['legacy-held']);session.start();
    const held=await session.expect('legacy-held');if(held.stage!=='legacy-held'||!('security' in held))stop('helper');
    const manifest=validateLegacy(held.payload,options.store,false,true),progress=verifiedDisposalIntent(legacyPaths(options.store).seal,held.payload);
    const completed=progress?.completed??0;remainingLegacy(manifest,completed);disposalOriginalControls(manifest,completed);
    const fingerprint=previewFingerprint(manifest,held.payload,held.security,completed);
    if(expected){const binding=legacyPreviews.get(expected);if(!binding||binding.store!==options.store||binding.fingerprint!==fingerprint)stop('containment');}
    const objects=disposalMembers(manifest).slice(completed).map(e=>Object.freeze({
      path:e.name==='root'?manifest.root.path:join(manifest.root.path,e.name),kind:e.kind as 'file'|'directory',
      size:e.kind==='file'?manifest.entries.find(m=>m.name===e.name)!.size:null,
      registered:e.name==='root'||manifest.entries.find(m=>m.name===e.name)!.registered}));
    const preview=Object.freeze({root:manifest.root.path,previouslyRemoved:completed,
      totalBytes:objects.reduce((n,e)=>n+(e.size??0),0),objects:Object.freeze(objects)});
    if(verified&&(!expected||!await verified()))stop('selection');
    remainingLegacy(manifest,completed);disposalOriginalControls(manifest,completed);
    if(previewFingerprint(manifest,held.payload,held.security,completed)!==fingerprint)stop('containment');
    session.send({command:'release'});
    if(!await session.finish()||session.unsafe||session.final?.outcome!=='ok')stop('helper');
    legacyPreviews.set(preview,{store:options.store,fingerprint});result=preview;
  }catch{/* Inspection has no creation, deletion, recovery or publication command. */}
  finally{if(session&&!await session.finish())result=undefined;}
  return result;
}
export async function previewLegacyIncident(options:{executable:string;store:string;synthetic:boolean}):Promise<LegacyInventoryPreview|undefined>{
  return inspectLegacy(options);
}
// The approved active cleanup may run only after the displayed binding matches,
// while read-only legacy lifetime and file handles remain retained.
export async function withVerifiedLegacyPreview(options:{executable:string;store:string;synthetic:boolean},preview:LegacyInventoryPreview,
  verified:()=>Promise<boolean>):Promise<boolean>{return !!await inspectLegacy(options,preview,verified);}
export type LegacyDisposalSummary=Readonly<{registeredEntries:number;unregisteredEntries:number;remainingEntries:number;retainedBytes:number;resuming:boolean}>;
export async function disposeLegacyIncident(options:{executable:string;store:string;synthetic:boolean;
  preview?:LegacyInventoryPreview;authorize:(summary:LegacyDisposalSummary)=>Promise<boolean>;fault?:(phase:'intent'|'member'|'controls')=>void}):Promise<{
    status:'closed'|'refused'|'partial';helperExit:'not-launched'|'confirmed'|'unconfirmed';disposalAuthorized:boolean}> {
  let session:CanarySession|undefined,authorized=false,status:'closed'|'refused'|'partial'='refused';
  try{
    if(options.synthetic?process.env.WORKSPACE_SURVEYOR_RUN_CANARY_PREPARATION!=='1':
      options.fault||!options.preview||process.env.WORKSPACE_SURVEYOR_LEGACY_DISPOSAL!=='1'||options.store!==await resolveOriginalRecoveryStore(options.executable))stop('selection');
    const paths=legacyPaths(options.store);recoveryLocation(options.store);if(!missing(paths.active))stop('cleanup');
    const nonce=randomUUID(),order=['legacy-held','legacy-ready'];
    session=new CanarySession({operation:'dispose-legacy',store:options.store,nonce,mode:options.synthetic?'synthetic':'personal',probe:'none'},
      options.executable,nonce,undefined,order);session.start();
    const held=await session.expect('legacy-held');if(held.stage!=='legacy-held')stop('helper');
    const manifest=validateLegacy(held.payload,options.store,false,true);
    const priorIntent=verifiedDisposalIntent(paths.seal,held.payload);remainingLegacy(manifest,priorIntent?.completed??0);
    disposalOriginalControls(manifest,priorIntent?.completed??0);
    if(options.preview){
      const binding=legacyPreviews.get(options.preview);
      if(!binding||binding.store!==options.store||!('security' in held)||
        binding.fingerprint!==previewFingerprint(manifest,held.payload,held.security,priorIntent?.completed??0))stop('containment');
    }
    const remaining=disposalMembers(manifest).slice(priorIntent?.completed??0).filter(e=>e.name!=='root');
    if(!await options.authorize({registeredEntries:manifest.entries.filter(e=>e.registered).length,
      unregisteredEntries:manifest.entries.filter(e=>!e.registered).length,
      remainingEntries:remaining.length,retainedBytes:manifest.entries.filter(e=>remaining.some(r=>r.name===e.name)).reduce((n,e)=>n+e.size,0),resuming:!!priorIntent}))stop('selection');
    session.send({command:'authorize-disposal'});await session.expect('legacy-ready',0);
    const intent=verifiedDisposalIntent(paths.seal,held.payload);if(!intent)stop('containment');authorized=true;
    options.fault?.('intent');
    const members=disposalMembers(manifest);let count=0,completed=intent.completed;
    for(const member of members){
      remainingLegacy(manifest,completed);identified(join(paths.seal,'disposal'),false,intent.id);
      disposalOriginalControls(manifest,completed);
      if(!missing(paths.active))stop('cleanup');
      const path=member.name==='root'?manifest.root.path:join(manifest.root.path,member.name),existed=!missing(path);
      order.push('recovery-deleted');session.send({command:'delete-recovery',name:member.name});
      const frame=await session.expect('recovery-deleted',++count);
      if(!('deleted' in frame)||frame.deleted!==existed||!missing(path))stop('cleanup');
      const progress=verifiedDisposalIntent(paths.seal,held.payload);
      if(!progress||progress.completed!==Math.max(count,completed))stop('cleanup');
      identified(join(paths.seal,'disposal'),false,intent.id);completed=progress.completed;options.fault?.('member');
    }
    if(!missing(manifest.root.path))stop('cleanup');session.send({command:'release'});
    if(!await session.finish()||session.unsafe||session.final?.outcome!=='ok')stop('helper');
    // Only after confirmed helper exit and positive scratch absence may controls
    // retire. A metadata interruption is reported, never an automatic repair.
    options.fault?.('controls');
    const absent=()=>{if(!missing(manifest.root.path)||!missing(paths.active))stop('cleanup');};
    const retire=(store:string,controls:LegacyManifest['controls'],extra=false)=>{
      absent();if(missing(store))return;identified(store,true,controls.directory);
      const names=recoveryEntries(store);if(names.some(n=>!['record','key',...(extra?['disposal']:[])].includes(n)))stop('containment');
      for(const name of names)identified(join(store,name),false,name==='disposal'?intent.id:controls[name as 'key'|'record']);
      for(const name of ['record','key',...(extra?['disposal']:[])]){
        absent();identified(store,true,controls.directory);const path=join(store,name);
        if(!missing(path)){identified(path,false,name==='disposal'?intent.id:controls[name as 'key'|'record']);unlinkSync(path);}
      }
      identified(store,true,controls.directory);if(recoveryEntries(store).length)stop('cleanup');rmdirSync(store);
    };
    retire(options.store,manifest.controls);retire(paths.seal,manifest.seal,true);absent();
    if(!missing(options.store)||!missing(paths.seal))stop('cleanup');status='closed';
  }catch{status=authorized?'partial':'refused';}
  finally{if(session&&!await session.finish())status='partial';}
  return {status,helperExit:!session?.spawned?'not-launched':session.processExited?'confirmed':'unconfirmed',disposalAuthorized:authorized};
}
function validateRemaining(p:RecoveryPayload):void {
  if(missing(p.root.path))return;
  identified(p.root.path,true,p.root);
  const actual:string[]=[];
  for(const n of recoveryEntries(p.root.path)){
    if(!['owner','acquisition','analysis'].includes(n))recoveryStop('scratch-inventory');
    actual.push(n);
    if(n!=='owner'){
      const entry=p.entries.find(e=>e.name===n)!;identified(join(p.root.path,n),true,entry);
      for(const child of recoveryEntries(join(p.root.path,n)))actual.push(n+'/'+child);
    }
  }
  if(actual.length>(p.version===2?13:9))stop('limit','recovery-entries');let total=0;
  for(const name of actual){const entry=p.entries.find(e=>e.name===name);if(!entry)recoveryStop('scratch-inventory');
    const path=join(p.root.path,name);identified(path,entry.kind==='directory',entry);
    if(entry.kind==='file'){const size=lstatSync(path).size;if(size>canaryLimits.file)stop('limit','scratch-file-bytes');total+=size;}
  }
  if(total>canaryLimits.scratch)stop('limit','scratch-total-bytes');
  const marker=join(p.root.path,'owner');
  if(missing(marker)){if(actual.length)recoveryStop('identity-ownership');}
  else if(lstatSync(marker).size!==36||readFileSync(marker,'utf8')!==p.nonce)recoveryStop('identity-ownership');
}
// Node authorizes fixed steps only. The exclusive-handle owner performs every
// synchronous scratch deletion; no Node scratch-deletion fallback exists here.
async function removeRecoveredScratch(p:RecoveryPayload,session:CanarySession,order:string[],
  options:RecoveryOptions):Promise<void> {
  const members=[...p.entries.filter(e=>e.kind==='file'&&e.name!=='owner').map(e=>({name:e.name,phase:'file' as const})),
    ...p.entries.filter(e=>e.kind==='directory').map(e=>({name:e.name,phase:'child' as const})),
    {name:'owner',phase:'marker' as const},{name:'root',phase:'root' as const}];
  let index=0,paused=false;
  for(const member of members){
    validateRemaining(p);
    const path=member.name==='root'?p.root.path:join(p.root.path,member.name);
    const existed=!missing(path);
    if(existed)options.fault?.(member.phase);
    index++;await options.step?.({stage:'before',count:index},session);
    const pause=existed&&!paused&&member.phase==='file'&&options.probe!==undefined;
    if(pause)order.push('recovery-paused');order.push('recovery-deleted');
    session.send({command:'delete-recovery',name:member.name});
    if(pause){const f=await session.expect('recovery-paused',index);
      if(!('deleted' in f)||!f.deleted)stop('helper');paused=true;
      await options.step?.({stage:'paused',count:index},session);
    }
    const f=await session.expect('recovery-deleted',index);
    if(!('deleted' in f)||f.deleted!==existed||!missing(path))stop('cleanup');
    await options.step?.({stage:'deleted',count:index},session);
  }
  validateRemaining(p);if(!missing(p.root.path))stop('cleanup');
}
export async function resolvePersonalRecoveryStore(executable:string):Promise<string> {
  return locatePersonalRecoveryStore(executable);
}
export async function resolveExplorerRecoveryStore(executable:string):Promise<string>{return locatePersonalRecoveryStore(executable,undefined,true);}
async function locatePersonalRecoveryStore(executable:string,attempt?:{consumed:boolean},localExplorer=false):Promise<string> {
  if(!localExplorer&&process.env.WORKSPACE_SURVEYOR_PERSONAL_CANARY!=='1')stop('selection');
  const nonce=randomUUID(),session=new CanarySession({operation:'locate',nonce},executable,nonce,undefined,['location']);
  try{
    if(attempt)attempt.consumed=true; // Request construction succeeded; helper startup begins now.
    session.start();const frame=await session.expect('location');if(frame.stage!=='location')stop('helper');
    if(frame.legacy){const original=frame.store.slice(0,-7);if(!frame.store.endsWith('-Active'))stop('containment');validateLegacy(frame.legacy,original,false);}
    if(!await session.finish()||session.unsafe||session.final?.outcome!=='ok')stop('helper');
    recoveryLocation(frame.store);return frame.store;
  }finally{await session.finish();}
}
type RecoveryOptions={executable:string;store:string;synthetic:boolean;localExplorer?:true;originalLegacy?:true;activeLegacy?:true;
  fault?:(phase:CleanupPhase)=>void;locked?:()=>void|Promise<void>;
  probe?:'slow'|'short';step?:(event:{stage:'before'|'paused'|'deleted';count:number},session:CanarySession)=>void|Promise<void>};
export async function recoverCanary(options:RecoveryOptions):Promise<RecoveryStatus>{
  const result=await recoverCanaryWithEvidence(options);
  return result.status==='verified'?'refused':result.status;
}
export async function diagnoseCanaryRecovery(options:Pick<RecoveryOptions,'executable'|'store'|'synthetic'>):Promise<RecoveryReport>{
  return recoveryOperation(options,true);
}
export async function recoverCanaryWithEvidence(options:RecoveryOptions):Promise<RecoveryReport>{
  return recoveryOperation(options,false);
}
function recoveryFailureCategory(error:unknown,check:RecoveryCheck,final?:Final):RecoveryCategory{
  if(error instanceof Refusal&&error.recoveryCategory)return error.recoveryCategory;
  const code=(error as NodeJS.ErrnoException|null)?.code;
  if(code==='EACCES'||code==='EPERM')return 'access-security';
  if(error instanceof Refusal){
    if(error.reason==='containment')return 'path-safety';
    if(error.reason==='selection')return 'selection';
    if(error.reason==='helper')return final?.refusal&&final.refusal!=='none'?final.refusal:'helper-protocol';
    if(error.reason==='limit'&&check==='scratch-validation')return 'scratch-limit';
  }
  if(check==='controls'||check==='payload'||error instanceof SyntaxError)return 'structural-inventory';
  if(check==='scratch-validation'){
    // Initial ordinary root absence returns before here. ENOENT here is a failed later check.
    if(code==='ENOENT')return 'scratch-entry-disappeared';
    if(code==='ENOTDIR')return 'path-safety';
    return 'scratch-inspection';
  }
  if(check==='deletion'||check==='control-retirement')return 'cleanup';
  return 'io';
}
async function recoveryOperation(options:RecoveryOptions,diagnose:boolean):Promise<RecoveryReport>{
  let session:CanarySession|undefined;let cleanupBegan=false;let status:RecoveryStatus='refused';
  let check:RecoveryCheck='selection',category:RecoveryCategory='none',verified=false;
  try{
    if(diagnose&&(!options.synthetic&&process.env.WORKSPACE_SURVEYOR_RECOVERY_DIAGNOSTIC!=='1'||
      options.fault||options.locked||options.probe||options.step))stop('selection');
    if(process.platform!=='win32'||!isAbsolute(options.executable)||!lstatSync(options.executable).isFile())stop('selection');
    if(options.synthetic){if(process.env.WORKSPACE_SURVEYOR_RUN_CANARY_PREPARATION!=='1')stop('selection');}
    else{check='location';
      if(options.activeLegacy&&(options.originalLegacy||process.env.WORKSPACE_SURVEYOR_LEGACY_ACTIVE_RECOVERY!=='1'))stop('selection');
      if(options.fault||options.locked||options.probe||options.step||options.store!==(options.activeLegacy?
        (await resolveOriginalRecoveryStore(options.executable))+'-Active':options.originalLegacy?
        await resolveOriginalRecoveryStore(options.executable):await locatePersonalRecoveryStore(options.executable,undefined,options.localExplorer===true)))stop('selection');}
    if(options.probe!==undefined&&!['slow','short'].includes(options.probe))stop('selection');
    check='location';recoveryLocation(options.store);if(missing(options.store))return {
      status:'unavailable',check,category:'structural-inventory',helperExit:'not-launched',deletionAuthorized:false};
    check='controls';
    const controls=controlInventory(options.store);const nonce=randomUUID();
    const order=['recovery-held','recovery-verified'];
    check='control-security';session=new CanarySession({operation:diagnose?'diagnose-recovery':'recover',store:options.store,nonce,mode:options.synthetic?'synthetic':'personal',
      probe:options.probe??'none'},options.executable,nonce,undefined,order);
    session.start();const f=await session.expect('recovery-held');if(f.stage!=='recovery-held')stop('helper');
    check='payload';const payload=parseRecoveryPayload(f.payload,options.store);
    check='scratch-validation';validateRemaining(payload);
    if(payload.version===2)session.allowExplorerRecovery();
    await options.locked?.();session.send({command:'verify-recovery'});await session.expect('recovery-verified',0);
    if(!diagnose){check='deletion';cleanupBegan=true;await removeRecoveredScratch(payload,session,order,options);}
    check='release';
    session.send({command:'release'});
    if(!await session.finish()||session.unsafe||session.final?.outcome!=='ok'||session.final.phase!=='recovery'||
      session.final.opened!==0||session.final.copied||session.final.fault!=='none')stop('helper');
    if(diagnose){verified=true;}
    else{
    if(!missing(payload.root.path))stop('cleanup');
    check='control-retirement';
    const current=controlInventory(options.store);
    if(JSON.stringify(current)!==JSON.stringify(controls))stop('cleanup');
    options.fault?.('metadata');
    for(const name of controlNames){identified(options.store,true,controls.directory);identified(join(options.store,name),false,controls[name as 'key'|'record']);}
    // The record remains until scratch is positively absent. No broad deletion.
    unlinkSync(join(options.store,'record'));unlinkSync(join(options.store,'key'));
    identified(options.store,true,controls.directory);if(recoveryEntries(options.store).length)stop('cleanup');rmdirSync(options.store);
    if(!missing(options.store))stop('cleanup');status='removed';
    }
  }catch(error){
    category=recoveryFailureCategory(error,check,session?.final);
    if(error instanceof Refusal&&error.reason==='helper'&&session?.final?.recoveryCheck)check=session.final.recoveryCheck;
    status=cleanupBegan?'residual':session?.final?.outcome==='sharing-refused'?'busy':'refused';
    if(status==='busy')category='access-security';
  }
  finally{if(session&&!await session.finish()){status='residual';verified=false;category='lifetime-unconfirmed';}}
  return {status:verified?'verified':status,check,category,
    helperExit:!session?.spawned?'not-launched':session.processExited?'confirmed':'unconfirmed',deletionAuthorized:cleanupBegan};
}
// Only for pre-persistence failures: the current process owns this newly created,
// empty-of-source-data directory. Never used to recover a previous run.
function removeBootstrapStore(store:string,id:Identity):boolean {
  try{identified(store,true,id);const entries=recoveryEntries(store);if(entries.some(n=>!controlNames.includes(n)))return false;
    for(const name of entries){const path=join(store,name);checked(path,false);if(lstatSync(path).size>8192)return false;}
    for(const name of entries)unlinkSync(join(store,name));rmdirSync(store);return missing(store);
  }catch{return false;}
}

export type SyntheticSelection = { source:string; ownerRoot:string; ownerNonce:string };
type PersonalSelection = { source:string; consent:true; actualValueConsent?:true; displayConsent?:true;
  titleConsent?:true; browserConsent?:true; scratchParent:string; writers:readonly string[] };
export type CanaryOptions = {
  legacySynthetic?:true;
  executable:string;
  analysis?: 'qualification' | 'thread-cwd' | 'explorer';
  // Fixed DB + one Desktop registry JSON; personal callbacks remain forbidden.
  explorer?: {globalState:string;sessionIndex?:string};
  qualificationHook?: QualificationTest;
  selection: {kind:'synthetic';fixture:SyntheticSelection} | {kind:'personal';private:PersonalSelection};
  fault?:CanaryFault;
  closure?:()=> 'absent'|'present'|'unknown';
  hook?:(phase:'initialized'|'prepared'|'recovery-ready'|'held'|'copied'|'analyzed'|'verified'|'exited',scratch:CanaryScratch)=>void|Promise<void>;
  inspectHook?:(db:DatabaseSync)=>void;
  cleanupFault?:(phase:CleanupPhase)=>void;
  afterSpawn?:()=>void;
  corruptFrame?:(raw:string)=>string;
  simulateExitUncertainty?:boolean;
};
let blocked=false;
let residual: {scratch:CanaryScratch; safe:boolean; synthetic:boolean;store?:string;executable?:string} | undefined;
export function forgetRecoveredSyntheticResidual(root:string):void {
  if(!residual?.synthetic||residual.scratch.root!==root||existsSync(root))stop('cleanup');residual=undefined;
}
export async function retryCanaryCleanup():Promise<'removed'|'residual'> {
  if(!residual||!residual.safe)return 'residual';
  const result=residual.store&&residual.executable?
    await recoverCanary({store:residual.store,executable:residual.executable,synthetic:residual.synthetic}):'residual';
  if(result==='removed'){residual=undefined;return 'removed';}return 'residual';
}
export async function runCanary(options:CanaryOptions):Promise<CanaryResult>{
  if(options.analysis!=='thread-cwd')return runCanaryOperation(options);
  const attempt={consumed:false};
  try{return await runCanaryOperation(options,attempt);}
  catch{
    // Even an unexpected teardown exception cannot reset a consumed attempt.
    return {status:'refused',reason:'io',cleanup:attempt.consumed?'residual':'removed',
      recovery:attempt.consumed?'unavailable':'removed',files:0,schemaReadable:false,sourcesStable:false,
      mapping:null,attemptConsumed:attempt.consumed,
      evidence:{stages:[],phase:'input',fault:'none',partialWritten:false,opened:0,exitConfirmed:false,diagnosticsDiscarded:true}};
  }
}
export function validPersonalMapSource(source:string):boolean {
  // Syntax only: no source metadata/content access before the consent boundary.
  return typeof source==='string'&&source.length<=2048&&/^[A-Za-z]:[\\/][^:]*$/.test(source)&&
    !/[<>"|?*\x00-\x1f\x7f-\x9f\u2028\u2029]/.test(source);
}
// Fixed private operation. No caller callback or arbitrary destination receives values.
export async function runThreadCwdDisplay(options:CanaryOptions):Promise<LocalMapDelivery>{
  const attempt={consumed:false};const delivery:{capability?:LocalMapCapability}={};
  try{
    if(options.analysis!=='thread-cwd'||(options.selection.kind==='personal'&&
      (process.env.WORKSPACE_SURVEYOR_PERSONAL_THREAD_CWD_DISPLAY!=='1'||options.selection.private.displayConsent!==true)))stop('selection');
    const safety=await runCanaryOperation(options,attempt,delivery);
    return new LocalMapDelivery(safety,delivery.capability);
  }catch(error){
    delivery.capability?.discard();delete delivery.capability;
    return new LocalMapDelivery({status:'refused',reason:safeReason(error),cleanup:attempt.consumed?'residual':'removed',
      recovery:attempt.consumed?'unavailable':'removed',files:0,schemaReadable:false,sourcesStable:false,
      mapping:null,attemptConsumed:attempt.consumed,
      evidence:{stages:[],phase:'input',fault:'none',partialWritten:false,opened:0,exitConfirmed:false,diagnosticsDiscarded:true}});
  }
}
async function runCanaryOperation(options:CanaryOptions,attempt?:{consumed:boolean},delivery?:{capability?:LocalMapCapability},explorerDelivery?:{result?:ReaderResult}):Promise<CanaryResult>{
  let scratch=new CanaryScratch();let session:CanarySession|undefined;let reason:Reason|'none'='io';
  let cleanup:'removed'|'residual'='removed', readable=false,stable=false, candidate=false,exit=false,count=0;
  const synthetic=options.selection.kind==='synthetic';
  const explorer=options.analysis==='explorer';
  let explorerJson=explorer&&options.explorer!==undefined;
  let explorerIndex=explorer&&options.explorer?.sessionIndex!==undefined;
  let explorerResult:ReaderResult|undefined,limit:CanaryLimit|undefined;
  let failureStage:NonNullable<CanaryResult['failureStage']>='source-selection';
  let acquisitionStage:AcquisitionStage='input',acquisitionReason:Reason|'none'='none';
  let recoveryPreflight:'not-checked'|'clear'|'occupied'='not-checked';
  let cleanupRecovery:RecoveryStatus|'not-attempted'='not-attempted';
  let store:string|undefined,storeId:Identity|undefined,lease:number|undefined,persisted=false;
  let recovery:CanaryResult['recovery']='removed';
  let qualification:Qualification|undefined;
  let mapping:AdapterResult|undefined;
  let adapter:typeof import('./thread-cwd-adapter.js')|undefined;
  const from=attempt||explorer?new Date().toISOString():undefined;
  const namespace=attempt||explorer?(synthetic&&explorer?'synthetic-':'source-')+randomUUID():undefined;
  try{
    if (options.analysis !== undefined && options.analysis !== 'qualification' && options.analysis !== 'thread-cwd' && !explorer) stop('selection');
    if(options.legacySynthetic&&!synthetic)stop('selection');
    if(options.explorer&&!explorer)stop('selection');
    if(explorer&&(!explorerDelivery||options.inspectHook||options.qualificationHook))stop('selection');
    if(explorer&&synthetic&&process.env.WORKSPACE_SURVEYOR_RUN_EXPLORER_PREPARATION!=='1')stop('selection');
    if(explorer&&!synthetic&&((options.explorer&&(!validPersonalMapSource(options.explorer.globalState)||(options.explorer.sessionIndex!==undefined&&!validPersonalMapSource(options.explorer.sessionIndex))))||options.selection.kind!=='personal'||
      options.selection.private.consent!==true||options.selection.private.actualValueConsent!==true||
      options.selection.private.titleConsent!==true||options.selection.private.browserConsent!==true||
      options.fault||options.closure||options.hook||options.cleanupFault||options.corruptFrame||
      options.simulateExitUncertainty||options.afterSpawn))stop('selection');
    if (options.qualificationHook && options.analysis !== 'qualification') stop('selection');
    if(attempt&&options.inspectHook)stop('selection');
    if(!synthetic&&attempt&&!explorer&&(process.env.WORKSPACE_SURVEYOR_PERSONAL_CANARY!=='1'||
      process.env.WORKSPACE_SURVEYOR_PERSONAL_THREAD_CWD!=='1'||options.selection.kind!=='personal'||
      options.selection.private.consent!==true||options.selection.private.actualValueConsent!==true))stop('selection');
    if (!synthetic && options.analysis === 'qualification' &&
        process.env.WORKSPACE_SURVEYOR_PERSONAL_QUALIFICATION !== '1') stop('selection');
    if(blocked||process.platform!=='win32'||!isAbsolute(options.executable)||!/pwsh\.exe$/i.test(options.executable))stop('selection');
    if(!lstatSync(options.executable).isFile())stop('selection');
    const source=options.selection.kind==='synthetic'?options.selection.fixture.source:options.selection.private.source;
    if(synthetic){
      if(process.env.WORKSPACE_SURVEYOR_RUN_CANARY_PREPARATION!=='1'||options.selection.kind!=='synthetic')stop('selection');
      if(attempt){
        if(!explorer&&(!options.closure||options.closure()!=='absent'||options.closure()!=='absent'))stop('closure');
        attempt.consumed=true; // First harness-source access models the personal boundary.
      }
      const fixture=options.selection.fixture;checked(fixture.ownerRoot,true);
      const owner=join(fixture.ownerRoot,'owner');checked(owner,false);
      if(!/^[a-f0-9-]{36}$/.test(fixture.ownerNonce)||lstatSync(owner).size!==36||readFileSync(owner,'utf8')!==fixture.ownerNonce||
          !contains(join(fixture.ownerRoot,'sources'),source))stop('selection');
      if(!attempt&&!explorer){
        if(!options.closure)stop('closure');
        if(options.closure()!=='absent'||options.closure()!=='absent')stop('closure');
      }
    }else{
      if(options.selection.kind!=='personal'||(!explorer&&process.env.WORKSPACE_SURVEYOR_PERSONAL_CANARY!=='1')||
          options.selection.private.consent!==true||options.fault||options.closure||options.hook||options.inspectHook||
          options.cleanupFault||options.corruptFrame||options.simulateExitUncertainty||options.afterSpawn||options.qualificationHook)stop('selection');
      if(attempt&&(!validPersonalMapSource(source)||options.selection.private.writers.join(',')!=='ChatGPT,Codex'))stop('selection');
      if(realpathSync(options.selection.private.scratchParent)!==realpathSync(tmpdir())||
          options.selection.private.writers.length<1||options.selection.private.writers.length>12||
          options.selection.private.writers.some(n=>!/^[A-Za-z0-9_.-]{1,64}$/.test(n)))stop('selection');
    }
    acquisitionStage='recovery-preflight';
    store=options.selection.kind==='synthetic'?join(options.selection.fixture.ownerRoot,'recovery')+(options.legacySynthetic?'-Active':''):await locatePersonalRecoveryStore(options.executable,attempt,explorer);
    recoveryLocation(store,undefined,source);if(!missing(store)){recoveryPreflight='occupied';cleanup='residual';recovery='unavailable';stop('selection');}
    recoveryPreflight='clear';
    if(explorer){
      // Recovery and legacy validation take precedence over this advisory early refusal.
      // No source selection, scratch allocation or recovery-store creation has happened yet.
      acquisitionStage='closure-preflight';
      if(synthetic){
        for(let check=0;check<2;check++){
          const closure=options.closure?.()??'unknown';
          if(closure==='unknown')stop('helper');
          if(closure!=='absent')stop('closure');
        }
      }else{
        const closure=await explorerDesktopClosure(options.executable);
        if(closure==='unknown')stop('helper');
        if(closure!=='absent')stop('closure');
      }
    }
    acquisitionStage='source-selection';
    // ENOENT alone disables optional Projects. Other source/safety failures still refuse.
    if(explorerJson){
      if(options.selection.kind==='synthetic'&&!contains(join(options.selection.fixture.ownerRoot,'sources'),options.explorer!.globalState))stop('selection');
      if(missing(options.explorer!.globalState))explorerJson=false;
    }
    if(explorerIndex){
      if(options.selection.kind==='synthetic'&&!contains(join(options.selection.fixture.ownerRoot,'sources'),options.explorer!.sessionIndex!))stop('selection');
      if(missing(options.explorer!.sessionIndex!))explorerIndex=false;
    }
    const select=():string[]=>{
      const paths=selectedPaths(source);
      if(explorerJson){
        const globalState=options.explorer!.globalState;
        if((options.selection.kind==='synthetic'&&!contains(join(options.selection.fixture.ownerRoot,'sources'),globalState))||
          paths.some(p=>overlap(p,globalState)))stop('selection');
        checked(globalState,false);recoveryLocation(store!,undefined,globalState);
        paths.push(globalState);
        if(paths.reduce((size,p)=>size+metadata(p).size,0n)>BigInt(canaryLimits.selected))stop('limit','source-total-bytes');
      }
      if(explorerIndex){
        const index=options.explorer!.sessionIndex!;
        if(paths.some(p=>overlap(p,index)))stop('selection');
        checked(index,false);recoveryLocation(store!,undefined,index);paths.push(index);
        if(paths.reduce((size,p)=>size+metadata(p).size,0n)>BigInt(canaryLimits.selected))stop('limit','source-total-bytes');
      }
      return paths;
    };
    const paths=select();const before=paths.map(p=>metadata(p));count=paths.length;
    const selectedWal=paths.includes(source+'-wal');
    if(explorerJson||explorerIndex)scratch=new CanaryScratch([...names.slice(0,count-Number(explorerJson)-Number(explorerIndex)),...(explorerJson?['global-state.json']:[]),...(explorerIndex?['session-index.jsonl']:[])],'explorer',selectedWal);
    else scratch=new CanaryScratch(names,'canary',selectedWal);
    acquisitionStage='scratch-initialization';cleanup='residual';
    try{scratch.initialize();}catch(error){
      // Validation has no creation side effects. Do not misreport that refusal as cleanup uncertainty.
      // Once creation was dispatched, retain the fail-closed residual status, even if root is unknown.
      if(scratch.initialization==='validating')cleanup='removed';
      throw error;
    }
    await options.hook?.('initialized',scratch);
    if(overlap(dirname(source),scratch.root!)||overlap(source,scratch.root!))stop('containment');
    acquisitionStage='recovery-initialization';
    recoveryLocation(store,scratch.root,source);mkdirSync(store);storeId=identity(store,true);
    const fault=options.fault??'none';if(!['none','protected','descriptor','partial-copy','diagnostic','recovery-create','recovery-descriptor','recovery-write','recovery-flush','recovery-readback'].includes(fault))stop('selection');
    const writers=options.selection.kind==='personal'?[...options.selection.private.writers]:[];
    if(explorerJson&&overlap(dirname(options.explorer!.globalState),scratch.root!))stop('containment');
    if(explorerIndex&&overlap(dirname(options.explorer!.sessionIndex!),scratch.root!))stop('containment');
    acquisitionStage='helper-preparation';
    session=new CanarySession({operation:'acquire',store,count,root:scratch.root,nonce:scratch.nonce,source,mode:synthetic?'synthetic':'personal',writers,fault,
      ...(explorerJson||explorerIndex?{profile:'explorer',...(explorerJson?{globalState:options.explorer!.globalState}:{}),...(explorerIndex?{sessionIndex:options.explorer!.sessionIndex}: {})}:{})},options.executable,scratch.nonce,options.corruptFrame,
        store.endsWith('-Active')?['legacy-held',...steps]:steps,scratch.copyNames);
    session.start(options.afterSpawn);
    let legacyPayload:string|undefined;
    if(store.endsWith('-Active')){const held=await session.expect('legacy-held');if(held.stage!=='legacy-held')stop('helper');
      legacyPayload=held.payload;const legacy=validateLegacy(legacyPayload,store.slice(0,-7));
      if([source,...(explorerJson?[options.explorer!.globalState]:[]),...(explorerIndex?[options.explorer!.sessionIndex!]:[])].some(path=>
        overlap(dirname(path),legacy.root.path)||overlap(path,legacy.original)||overlap(path,legacyPaths(legacy.original).seal)))stop('containment');
      session.send({command:'accept-legacy'});}
    await session.expect('prepared',0);await options.hook?.('prepared',scratch);
    identified(store,true,storeId);scratch.owned();
    if(!same(before,select().map(p=>metadata(p))))stop('unstable');
    acquisitionStage='recovery-persistence';
    const payload=recoveryPayload(scratch,store);
    session.send({command:'persist',payload});await session.expect('recovery-ready',0);
    if(JSON.stringify(readAuthenticatedRecord(store))!==JSON.stringify(JSON.parse(payload)))stop('cleanup');
    lease=openSync(join(store,'record'),'r');
    const held=fstatSync(lease,{bigint:true});const recordId=identity(join(store,'record'),false);
    if(held.dev.toString()!==recordId.dev||held.ino.toString()!==recordId.ino)stop('cleanup');
    persisted=true;recovery='available';await options.hook?.('recovery-ready',scratch);
    acquisitionStage='source-acquisition';session.send({command:'acquire'});
    const frame=await session.expect('held',count);if(frame.stage!=='held')stop('helper');
    const manifest=frame.manifest;
    if(manifest.some((e,i)=>BigInt(e.size)!==before[i]?.size))stop('unstable');
    await options.hook?.('held',scratch);
    if(synthetic&&options.closure?.()!=='absent')stop('closure');
    if(!same(before,select().map(p=>metadata(p))))stop('unstable');
    session.send({command:'copy'});await session.expect('copied',count);
    acquisitionStage='copy-validation';failureStage='copy-validation';scratch.entries();
    for(let i=0;i<count;i++)for(const area of ['acquisition','analysis'] as const)
      if(digestCopy(scratch.path(area,i))!==manifest[i]?.digest)stop('unstable');
    await options.hook?.('copied',scratch);
    acquisitionStage='analysis';failureStage='analysis';
    try{
      if(explorer){
        const reader=await import('../../src/explorer/readers.js');
        explorerResult=reader.readExplorerCopies(scratch,{namespace:namespace!,from:from!,through:new Date().toISOString()},
          explorerJson?count-1-Number(explorerIndex):undefined,explorerJson?'desktop-v1':'unavailable',explorerIndex?count-1:undefined);
        readable=explorerResult.status==='ready';
      }else if(options.analysis==='thread-cwd'){
        adapter=await import('./thread-cwd-adapter.js');
        mapping=adapter.readThreadCwdCopy(scratch,{namespace:namespace!,from:from!,through:new Date().toISOString()});
        readable=mapping.summary.reason!=='analysis';
      }else if(options.analysis==='qualification'){
        qualification=inspectQualificationAnalysis(scratch,options.qualificationHook);readable=true;
      }else{readable=inspectCanaryAnalysis(scratch,options.inspectHook);}
    }catch{stop('analysis');}
    await options.hook?.('analyzed',scratch);acquisitionStage='source-verification';failureStage='source-verification';
    if(!same(before,select().map(p=>metadata(p))))stop('unstable');
    for(let i=0;i<count;i++)if(digestCopy(scratch.path('acquisition',i))!==manifest[i]?.digest)stop('unstable');
    session.send({command:'verify'});await session.expect('verified',count);
    if(legacyPayload)validateLegacy(legacyPayload,store.slice(0,-7));
    await options.hook?.('verified',scratch);
    if(synthetic&&options.closure?.()!=='absent')stop('closure');
    if(!same(before,select().map(p=>metadata(p))))stop('unstable');
    acquisitionStage='helper-release';session.send({command:'release'});candidate=true;
    exit=await session.finish();
    if(!exit||session.unsafe||session.final?.outcome!=='ok'||session.final.phase!=='release'||
        session.final.opened!==count||!session.final.copied||session.final.fault!=='none')stop('helper');
    if(!same(before,select().map(p=>metadata(p))))stop('unstable');
    if(synthetic&&options.closure?.()!=='absent')stop('closure');
    stable=true;reason='none';
  }catch(error){reason=safeReason(error);acquisitionReason=reason;limit=error instanceof Refusal?error.limit:undefined;candidate=false;}
  finally{
    if(session){exit=await session.finish();if(!session.processExited){blocked=true;reason='helper';candidate=false;}}
    if(session?.unsafe||!exit&&session?.spawned){reason='helper';candidate=false;}
    if(options.simulateExitUncertainty){candidate=false;reason='helper';}
    // SQLite is closed before this point. A missing frame is never cleanup permission.
    // On actual exit, OS handle closure allows a separate exclusive recovery attempt.
    if(scratch.root&&(!session||session.processExited)&&!options.simulateExitUncertainty){
      try{await options.hook?.('exited',scratch);}catch{candidate=false;reason='io';}
      if(lease!==undefined){closeSync(lease);lease=undefined;}
      if(persisted&&store){
        if(exit&&!session?.unsafe){const result=await recoverCanary({store,executable:options.executable,synthetic,...(explorer&&!synthetic?{localExplorer:true as const}:{}),
          ...(options.cleanupFault?{fault:options.cleanupFault}:{})});cleanupRecovery=result;cleanup=result==='removed'?'removed':'residual';}
      }else{
        cleanup=scratch.cleanup(options.cleanupFault);
        if(store&&storeId&&!removeBootstrapStore(store,storeId))cleanup='residual';
      }
    }
    if(lease!==undefined&&(!session||session.processExited)){closeSync(lease);lease=undefined;}
    // Cleanup may legitimately proceed even when legacy validation fails. A new
    // snapshot still requires a fresh, closed guard after its own cleanup.
    if(candidate&&cleanup==='removed'&&store?.endsWith('-Active')){
      try{await verifyLegacyGuard(options.executable,store.slice(0,-7),synthetic);}catch{candidate=false;reason='helper';}
    }
    if(acquisitionReason==='none'&&reason!=='none')acquisitionReason=reason;
    if(cleanup!=='removed'){
      candidate=false;reason='cleanup';recovery='unavailable';
      if(persisted&&store){try{readAuthenticatedRecord(store);recovery='available';}catch{}}
      if(scratch.root)residual={scratch,safe:(!session||session.processExited)&&!options.simulateExitUncertainty,synthetic,
        ...(persisted&&store?{store,executable:options.executable}:{})};
    }else{recovery='removed';}
  }
  const f=session?.final;
  // Withhold findings on any acquisition, verification, exit or cleanup failure.
  const qualified = candidate ? qualification : null;
  if(candidate&&qualification?.structure==='unsupported'){candidate=false;reason='unsupported';}
  let mapSummary:AdapterResult['summary']|null=null;
  if(attempt&&!explorer&&candidate&&stable&&exit&&cleanup==='removed'&&recovery==='removed'&&mapping&&adapter){
    if(mapping.summary.status==='ready'){
      mapping=new adapter.AdapterResult(mapping.summary,mapping.readClaims(),{namespace:namespace!,from:from!,through:new Date().toISOString()});
    }else{
      candidate=false;
      reason=mapping.summary.reason==='limit'?'limit':mapping.summary.reason==='unsupported-schema'?'unsupported':'analysis';
    }
    mapSummary=mapping.summary;
    if(delivery&&candidate&&mapping.summary.status==='ready')delivery.capability=new LocalMapCapability(mapping);
  }else if(attempt&&!explorer&&candidate){candidate=false;reason='analysis';}
  mapping=undefined; // Standard results stay summary-only; display delivery is a separate private capability.
  if(explorerResult){
    if(candidate&&stable&&exit&&cleanup==='removed'&&recovery==='removed'&&explorerResult.status==='ready'){
      // Fixed browser bridges alone receive this cleanup-gated one-use capability.
      const data=explorerResult.snapshot!.take()!;
      explorerResult.snapshot=new ExplorerSnapshot(reconcile({...data.provenance,through:new Date().toISOString()},
        data.coverage,data.threads,data.projects,data.assignments,data.projectlessIds));
      explorerDelivery!.result=explorerResult;
    }else{explorerResult.snapshot?.discard();candidate=false;if(reason==='none'){
      reason=explorerResult.reason==='limit'?'limit':explorerResult.reason==='schema'?'unsupported':'analysis';
      limit=explorerResult.limit;failureStage='analysis';acquisitionStage='analysis';acquisitionReason=reason;}}
  }
  return {status:candidate?'passed':'refused',reason,cleanup,recovery,files:explorer&&session?.reached.includes('copied')?count:candidate?count:0,
    ...(options.analysis==='qualification'?{qualification:qualified??null}:{}),
    ...(attempt?{...(!explorer?{mapping:mapSummary}:{}),attemptConsumed:attempt.consumed}:{}),
    ...(explorer&&limit?{limit,failureStage}:{}),
    schemaReadable:explorer?(explorerResult?.structureAccepted??false):candidate&&readable,sourcesStable:explorer?stable:candidate&&stable,
    evidence:{stages:session?.reached??[],phase:f?.phase??'input',fault:f?.fault??'none',partialWritten:f?.partialWritten??false,
      opened:f?.opened??0,exitConfirmed:exit&&!options.simulateExitUncertainty,diagnosticsDiscarded:session?.diagnostics??false,
      ...(explorer?{acquisition:{stage:acquisitionStage,reason:acquisitionReason,scratchInitialization:scratch.initialization,recoveryPreflight,
        helperLaunched:session?.spawned??false,helperExit:!session?.spawned?'not-launched':session.processExited&&!options.simulateExitUncertainty?'confirmed':'unconfirmed',
        helperOutcome:f?.outcome??'not-reported',cleanupRecovery}}:{})}};
}

export async function runSyntheticExplorer(options:CanaryOptions):Promise<{safety:CanaryResult|null;snapshot?:ExplorerSnapshot;summary?:ReaderResult['summary']}> {
  if(options.selection.kind!=='synthetic'||options.analysis!=='explorer'||!options.explorer)return {safety:null};
  const delivery:{result?:ReaderResult}={};
  try{
    const safety=await runCanaryOperation(options,undefined,undefined,delivery),read=delivery.result;
    if(safety.status!=='passed'||!read?.snapshot){read?.snapshot?.discard();return {safety};}
    return {safety,snapshot:read.snapshot,...(read.summary?{summary:read.summary}:{})};
  }catch{delivery.result?.snapshot?.discard();return {safety:null};}
}

export type ExplorerDelivery={safety:CanaryResult;snapshot?:ExplorerSnapshot;summary?:ReaderResult['summary']};
export const explorerPreflightSafety:CanaryResult=Object.freeze({status:'refused',reason:'selection',cleanup:'removed',
  recovery:'removed',files:0,schemaReadable:false,sourcesStable:false,attemptConsumed:false,
  evidence:{stages:[],phase:'input',fault:'none',partialWritten:false,opened:0,exitConfirmed:false,diagnosticsDiscarded:false}});
// Dedicated personal browser action; fixed registry decoding, no caller callbacks.
export async function runPersonalExplorer(options:CanaryOptions):Promise<ExplorerDelivery>{
  return runTitledExplorer(options,false);
}
// Harness-owned mirror of the new operation, never selects personal sources/processes.
export async function runTitledExplorerPreparation(options:CanaryOptions):Promise<ExplorerDelivery>{
  return runTitledExplorer(options,true);
}
async function runTitledExplorer(options:CanaryOptions,synthetic:boolean):Promise<ExplorerDelivery>{
  const attempt={consumed:false},delivery:{result?:ReaderResult}={};
  try{
    if(options.analysis!=='explorer'||options.selection.kind!==(synthetic?'synthetic':'personal')||
      (!synthetic&&options.explorer&&(!validPersonalMapSource(options.explorer.globalState)||(options.explorer.sessionIndex!==undefined&&!validPersonalMapSource(options.explorer.sessionIndex)))))stop('selection');
    const safety=await runCanaryOperation(options,attempt,undefined,delivery),read=delivery.result;
    if(safety.status!=='passed'||!read?.snapshot){read?.snapshot?.discard();return {safety};}
    return {safety,snapshot:read.snapshot,...(read.summary?{summary:read.summary}:{})};
  }catch(error){
    delivery.result?.snapshot?.discard();
    return {safety:{...explorerPreflightSafety,reason:safeReason(error),attemptConsumed:attempt.consumed,
      cleanup:attempt.consumed?'residual':'removed',recovery:attempt.consumed?'unavailable':'removed',
      evidence:{...explorerPreflightSafety.evidence,diagnosticsDiscarded:true}}};
  }
}
