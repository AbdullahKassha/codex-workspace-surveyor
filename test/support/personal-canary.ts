// Private research runner; never imported by product code. No personal run in tests.
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { randomUUID, createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { existsSync, lstatSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmdirSync,
  unlinkSync, writeFileSync, openSync, readSync, fstatSync, closeSync, mkdirSync, opendirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync, constants } from 'node:sqlite';
import { inspectQualificationAnalysis, type Qualification, type QualificationTest } from './personal-qualification.js';
import type { AdapterResult } from './thread-cwd-adapter.js';
import { LocalMapDelivery, LocalMapCapability } from './local-thread-cwd-capability.js';
import { ExplorerSnapshot, reconcile } from '../../src/explorer/model.js';
import type { ReaderResult } from '../../src/explorer/readers.js';

export const canaryLimits = Object.freeze({ file: 16 * 1024 * 1024, selected: 32 * 1024 * 1024,
  scratch: 64 * 1024 * 1024 + 8192, files: 7, directories: 3 });
const names = ['database.sqlite', 'database.sqlite-wal', 'database.sqlite-shm'] as const;
const explorerNames = [...names, 'global-state.json'] as const;
export const explorerScratchLimits = Object.freeze({...canaryLimits, files:9});
const steps = ['prepared', 'recovery-ready', 'held', 'copied', 'verified'] as const;
const reasons = ['selection', 'closure', 'limit', 'containment', 'unstable', 'analysis', 'unsupported', 'helper', 'cleanup', 'io'] as const;
type Reason = typeof reasons[number];
export type CanaryFault = 'none' | 'protected' | 'descriptor' | 'partial-copy' | 'diagnostic' |
  'recovery-create' | 'recovery-descriptor' | 'recovery-write' | 'recovery-flush' | 'recovery-readback';
type Entry = { name: typeof explorerNames[number]; size: number; digest: string };
type Stat = { dev: bigint; ino: bigint; size: bigint; mtime: bigint; ctime: bigint };
type Final = { stage: 'finished'; run: string; outcome: 'ok' | 'io' | 'acl-refused' | 'sharing-refused' |
  'closure-refused' | 'unstable'; closed: boolean; copied: boolean; phase: string; fault: string;
  partialWritten: boolean; opened: number };
type Frame = { stage: 'prepared' | 'recovery-ready' | 'recovery-verified' | 'copied' | 'verified'; run: string; count: number; protected: true } |
  { stage: 'held'; run: string; count: number; manifest: Entry[] } |
  { stage:'recovery-held'; run:string; payload:string } | { stage:'location';run:string;store:string } |
  { stage:'recovery-deleted'|'recovery-paused';run:string;count:number;deleted:boolean } | Final;
export type CanaryResult = Readonly<{ status: 'passed' | 'refused'; reason: Reason | 'none';
  cleanup: 'removed' | 'residual'; files: number; schemaReadable: boolean; sourcesStable: boolean;
  recovery: 'removed' | 'available' | 'unavailable';
  qualification?: Qualification | null;
  mapping?: AdapterResult['summary'] | null;
  attemptConsumed?: boolean;
  evidence: { stages: readonly string[]; phase: string; fault: string; partialWritten: boolean;
    opened: number; exitConfirmed: boolean; diagnosticsDiscarded: boolean } }>;
class Refusal extends Error {
  constructor(readonly reason: Reason) { super('Canary refused'); this.stack = 'CanaryRefusal'; }
}
function stop(reason: Reason): never { throw new Refusal(reason); }
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
function metadata(path: string): Stat {
  checked(path, false);
  const s = lstatSync(path, { bigint: true });
  if (s.size > BigInt(canaryLimits.file)) stop('limit');
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
  if (size > BigInt(canaryLimits.selected)) stop('limit');
  return paths;
}

// Owns scratch only. No source argument, source registration or recursive deletion.
export class CanaryScratch {
  constructor(readonly copyNames:readonly string[]=names,readonly profile:'canary'|'explorer'='canary') {
    if(profile==='canary'&&copyNames!==names)stop('selection');
    if(profile==='explorer'&&!['database.sqlite,global-state.json','database.sqlite,database.sqlite-wal,database.sqlite-shm,global-state.json'].includes(copyNames.join(',')))stop('selection');
    this.copyNames=Object.freeze([...copyNames]);
  }
  root: string | undefined;
  readonly nonce = randomUUID();
  private identity: { dev: bigint; ino: bigint } | undefined;
  private markerRemoved = false;
  private removed = false;
  initialize(): void {
    const parent = realpathSync(tmpdir());
    checked(parent, true);
    if (overlap(parent, process.cwd()) || parent.split(/[\\/]/).some(p => p.toLowerCase() === '.codex')) stop('containment');
    this.root = mkdtempSync(join(parent, 'workspace-surveyor-canary-'));
    this.identity = lstatSync(this.root, { bigint: true });
    writeFileSync(join(this.root, 'owner'), this.nonce, { flag: 'wx' });
    this.owned();
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
        const path = join(directory, name); const stat = metadata(path);
        bytes += Number(stat.size); files.push(path);
      }
    }
    if (files.length > (this.profile==='explorer'?explorerScratchLimits.files:canaryLimits.files) || directories.length + 1 > canaryLimits.directories || bytes > canaryLimits.scratch) stop('limit');
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
  const before = metadata(path), handle = openSync(path, 'r');
  try {
    const actual = fstatSync(handle, { bigint: true });
    if (actual.dev !== before.dev || actual.ino !== before.ino || actual.size !== before.size) stop('unstable');
    const bytes = Buffer.alloc(Number(before.size) + 1); let count = 0;
    while (count < bytes.length) { const n = readSync(handle, bytes, count, bytes.length - count, null); if (!n) break; count += n; }
    if (BigInt(count) !== before.size || !same([before],[metadata(path)])) stop('unstable');
    return createHash('sha256').update(bytes.subarray(0,count)).digest('hex');
  } finally { closeSync(handle); }
}
export function inspectCanaryAnalysis(scratch: CanaryScratch, test?: (db: DatabaseSync) => void): boolean {
  const path = scratch.path('analysis',0); metadata(path);
  const db = new DatabaseSync(path,{readOnly:true,allowExtension:false,defensive:true,timeout:0,
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
export function parseCanaryFrame(raw: string, nonce: string, copyNames:readonly string[]=names): Frame {
  if (Buffer.byteLength(raw) > 8192) stop('helper');
  let value: unknown; try { value=JSON.parse(raw); } catch { stop('helper'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) stop('helper');
  const x=value as Record<string,unknown>, keys=Object.keys(x).sort().join(',');
  if (x.run !== nonce) stop('helper');
  const count=(v:unknown):v is number=>typeof v==='number' && Number.isInteger(v) && v>=0 && v<= (copyNames.includes('global-state.json')?4:3);
  if (['prepared','recovery-ready','recovery-verified','copied','verified'].includes(String(x.stage)) && keys==='count,protected,run,stage' &&
      x.protected===true && count(x.count) && (['prepared','recovery-ready','recovery-verified'].includes(String(x.stage)) ? x.count===0 : x.count>0)) return x as Frame;
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
    if ((copyNames.includes('global-state.json')?x.count!==copyNames.length:x.count!==1&&x.count!==3) || total>canaryLimits.selected)stop('helper');
    return x as Frame;
  }
  if(x.stage==='recovery-held' && keys==='payload,run,stage' && typeof x.payload==='string' && Buffer.byteLength(x.payload)<=6144)return x as Frame;
  if(x.stage==='location' && keys==='run,stage,store' && typeof x.store==='string' && x.store.length<=2048)return x as Frame;
  if(['recovery-deleted','recovery-paused'].includes(String(x.stage)) && keys==='count,deleted,run,stage' &&
      Number.isInteger(x.count) && Number(x.count)>=1 && Number(x.count)<=(copyNames.includes('global-state.json')?12:10) && typeof x.deleted==='boolean' &&
      (x.stage!=='recovery-paused'||x.deleted===true))return x as Frame;
  if(x.stage==='finished' && keys==='closed,copied,fault,opened,outcome,partialWritten,phase,run,stage' &&
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
      if(typeof value.root!=='string'||typeof value.nonce!=='string'||!(explorer?[2,4]:[1,3]).includes(Number(value.count)))stop('helper');
      const id={dev:'9'.repeat(20),ino:'9'.repeat(20)};
      const entries=[{name:'owner',kind:'file',...id},...['acquisition','analysis'].flatMap(area=>[
        {name:area,kind:'directory',...id},...(explorer?[...names.slice(0,Number(value.count)-1),'global-state.json']:names.slice(0,Number(value.count))).map(name=>({name:area+'/'+name,kind:'file',...id}))])];
      const payload=JSON.stringify({version:explorer?2:1,...(explorer?{profile:'explorer'}:{}),store:id,root:{path:value.root,...id},nonce:value.nonce,entries});
      reserve=Buffer.byteLength(JSON.stringify({command:'persist',payload})+'\n');
      for(const command of ['acquire','copy','verify','release'])reserve+=Buffer.byteLength(JSON.stringify({command})+'\n');
    }
    if(bytes.length+reserve>8192)stop('helper');return bytes;
  }catch{stop('helper');}
}
export class CanarySession {
  private child:ChildProcessWithoutNullStreams|undefined; private done:Promise<void>=Promise.resolve(); private ended=false; private exited=false; private code:number|null=null;
  private input=0; private output=0; private buffer=''; private next:(()=>void)|undefined;
  private queue:Frame[]=[]; private timer:NodeJS.Timeout|undefined;
  private initial:Buffer;
  constructor(request:object,private executable:string,private nonce:string,private corrupt?: (s:string)=>string,
    private order:readonly string[]=steps,private copyNames:readonly string[]=names) { this.initial=prepareCanaryRequest(request); }
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
          const f=parseCanaryFrame(this.corrupt?.(line)??line,this.nonce,this.copyNames);
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
    if(entries.length>=10)stop('limit');entries.push(entry.name);
  }}finally{directory.closeSync();}return entries;
}
type Identity={dev:string;ino:string};
type RecoveryEntry=Identity & {name:string;kind:'file'|'directory'};
type RecoveryPayload={version:1|2;profile?:'explorer';store:Identity;root:Identity & {path:string};nonce:string;entries:RecoveryEntry[]};
export type RecoveryStatus='removed'|'busy'|'refused'|'residual'|'unavailable';
export type CleanupPhase='file'|'child'|'marker'|'root'|'metadata';
const controlNames=['key','record'];
function identity(path:string,directory:boolean):Identity {
  checked(path,directory);const s=lstatSync(path,{bigint:true});return {dev:s.dev.toString(),ino:s.ino.toString()};
}
function identified(path:string,directory:boolean,id:Identity):void {
  const actual=identity(path,directory);if(actual.dev!==id.dev||actual.ino!==id.ino)stop('containment');
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
function controlInventory(store:string):{directory:Identity;key:Identity;record:Identity} {
  checked(store,true);
  if(recoveryEntries(store).sort().join(',')!=='key,record')stop('cleanup');
  if(lstatSync(join(store,'key')).size!==32||lstatSync(join(store,'record')).size>8192)stop('limit');
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
  const count=explorer?(x.entries.length===7?1:x.entries.length===11?3:0):(x.entries.length===5?1:x.entries.length===9?3:0);if(!count)stop('cleanup');
  const expected=new Map<string,string>([['owner','file'],['acquisition','directory'],['analysis','directory']]);
  for(const area of ['acquisition','analysis'])for(const name of names.slice(0,count))expected.set(area+'/'+name,'file');
  if(explorer)for(const area of ['acquisition','analysis'])expected.set(area+'/global-state.json','file');
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
function validateRemaining(p:RecoveryPayload):void {
  if(missing(p.root.path))return;
  identified(p.root.path,true,p.root);
  const actual:string[]=[];
  for(const n of recoveryEntries(p.root.path)){
    if(!['owner','acquisition','analysis'].includes(n))stop('cleanup');
    actual.push(n);
    if(n!=='owner'){
      const entry=p.entries.find(e=>e.name===n)!;identified(join(p.root.path,n),true,entry);
      for(const child of recoveryEntries(join(p.root.path,n)))actual.push(n+'/'+child);
    }
  }
  if(actual.length>(p.version===2?11:9))stop('limit');let total=0;
  for(const name of actual){const entry=p.entries.find(e=>e.name===name);if(!entry)stop('cleanup');
    const path=join(p.root.path,name);identified(path,entry.kind==='directory',entry);
    if(entry.kind==='file'){const size=lstatSync(path).size;if(size>canaryLimits.file)stop('limit');total+=size;}
  }
  if(total>canaryLimits.scratch)stop('limit');
  const marker=join(p.root.path,'owner');
  if(missing(marker)){if(actual.length)stop('cleanup');}
  else if(lstatSync(marker).size!==36||readFileSync(marker,'utf8')!==p.nonce)stop('cleanup');
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
async function locatePersonalRecoveryStore(executable:string,attempt?:{consumed:boolean}):Promise<string> {
  if(process.env.WORKSPACE_SURVEYOR_PERSONAL_CANARY!=='1')stop('selection');
  const nonce=randomUUID(),session=new CanarySession({operation:'locate',nonce},executable,nonce,undefined,['location']);
  try{
    if(attempt)attempt.consumed=true; // Request construction succeeded; helper startup begins now.
    session.start();const frame=await session.expect('location');if(frame.stage!=='location')stop('helper');
    if(!await session.finish()||session.unsafe||session.final?.outcome!=='ok')stop('helper');
    recoveryLocation(frame.store);return frame.store;
  }finally{await session.finish();}
}
type RecoveryOptions={executable:string;store:string;synthetic:boolean;
  fault?:(phase:CleanupPhase)=>void;locked?:()=>void|Promise<void>;
  probe?:'slow'|'short';step?:(event:{stage:'before'|'paused'|'deleted';count:number},session:CanarySession)=>void|Promise<void>};
export async function recoverCanary(options:RecoveryOptions):Promise<RecoveryStatus>{
  let session:CanarySession|undefined;let cleanupBegan=false;let status:RecoveryStatus='refused';
  try{
    if(process.platform!=='win32'||!isAbsolute(options.executable)||!lstatSync(options.executable).isFile())stop('selection');
    if(options.synthetic){if(process.env.WORKSPACE_SURVEYOR_RUN_CANARY_PREPARATION!=='1')stop('selection');}
    else{if(options.fault||options.locked||options.probe||options.step||options.store!==await resolvePersonalRecoveryStore(options.executable))stop('selection');}
    if(options.probe!==undefined&&!['slow','short'].includes(options.probe))stop('selection');
    recoveryLocation(options.store);if(missing(options.store))return 'unavailable';
    const controls=controlInventory(options.store);const nonce=randomUUID();
    const order=['recovery-held','recovery-verified'];
    session=new CanarySession({operation:'recover',store:options.store,nonce,mode:options.synthetic?'synthetic':'personal',
      probe:options.probe??'none'},options.executable,nonce,undefined,order);
    session.start();const f=await session.expect('recovery-held');if(f.stage!=='recovery-held')stop('helper');
    const payload=parseRecoveryPayload(f.payload,options.store);validateRemaining(payload);
    if(payload.version===2)session.allowExplorerRecovery();
    await options.locked?.();session.send({command:'verify-recovery'});await session.expect('recovery-verified',0);
    cleanupBegan=true;await removeRecoveredScratch(payload,session,order,options);
    session.send({command:'release'});
    if(!await session.finish()||session.unsafe||session.final?.outcome!=='ok'||session.final.phase!=='recovery'||
      session.final.opened!==0||session.final.copied||session.final.fault!=='none')stop('helper');
    if(!missing(payload.root.path))stop('cleanup');
    const current=controlInventory(options.store);
    if(JSON.stringify(current)!==JSON.stringify(controls))stop('cleanup');
    options.fault?.('metadata');
    for(const name of controlNames){identified(options.store,true,controls.directory);identified(join(options.store,name),false,controls[name as 'key'|'record']);}
    // The record remains until scratch is positively absent. No broad deletion.
    unlinkSync(join(options.store,'record'));unlinkSync(join(options.store,'key'));
    identified(options.store,true,controls.directory);if(recoveryEntries(options.store).length)stop('cleanup');rmdirSync(options.store);
    if(!missing(options.store))stop('cleanup');status='removed';
  }catch{status=cleanupBegan?'residual':session?.final?.outcome==='sharing-refused'?'busy':'refused';}
  finally{if(session&&!await session.finish())status='residual';}
  return status;
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
type PersonalSelection = { source:string; consent:true; actualValueConsent?:true; displayConsent?:true; scratchParent:string; writers:readonly string[] };
export type CanaryOptions = {
  executable:string;
  analysis?: 'qualification' | 'thread-cwd' | 'explorer';
  // Fixed, synthetic-only source profile. No existing personal action accepts it.
  explorer?: {globalState:string};
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
  let explorerResult:ReaderResult|undefined;
  let store:string|undefined,storeId:Identity|undefined,lease:number|undefined,persisted=false;
  let recovery:CanaryResult['recovery']='removed';
  let qualification:Qualification|undefined;
  let mapping:AdapterResult|undefined;
  let adapter:typeof import('./thread-cwd-adapter.js')|undefined;
  const from=attempt||explorer?new Date().toISOString():undefined;
  const namespace=attempt||explorer?'source-'+randomUUID():undefined;
  try{
    if (options.analysis !== undefined && options.analysis !== 'qualification' && options.analysis !== 'thread-cwd' && !explorer) stop('selection');
    if(options.explorer&&!explorer)stop('selection');
    if(explorer&&(!explorerDelivery||!synthetic||!options.explorer||process.env.WORKSPACE_SURVEYOR_RUN_EXPLORER_PREPARATION!=='1'||options.inspectHook||options.qualificationHook))stop('selection');
    if (options.qualificationHook && options.analysis !== 'qualification') stop('selection');
    if(attempt&&options.inspectHook)stop('selection');
    if(!synthetic&&attempt&&(process.env.WORKSPACE_SURVEYOR_PERSONAL_CANARY!=='1'||
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
        if(!options.closure||options.closure()!=='absent'||options.closure()!=='absent')stop('closure');
        attempt.consumed=true; // First harness-source access models the personal boundary.
      }
      const fixture=options.selection.fixture;checked(fixture.ownerRoot,true);
      const owner=join(fixture.ownerRoot,'owner');checked(owner,false);
      if(!/^[a-f0-9-]{36}$/.test(fixture.ownerNonce)||lstatSync(owner).size!==36||readFileSync(owner,'utf8')!==fixture.ownerNonce||
          !contains(join(fixture.ownerRoot,'sources'),source))stop('selection');
      if(!attempt){
        if(!options.closure)stop('closure');
        if(options.closure()!=='absent'||options.closure()!=='absent')stop('closure');
      }
    }else{
      if(options.selection.kind!=='personal'||process.env.WORKSPACE_SURVEYOR_PERSONAL_CANARY!=='1'||
          options.selection.private.consent!==true||options.fault||options.closure||options.hook||options.inspectHook||
          options.cleanupFault||options.corruptFrame||options.simulateExitUncertainty||options.afterSpawn||options.qualificationHook)stop('selection');
      if(attempt&&(!validPersonalMapSource(source)||options.selection.private.writers.join(',')!=='ChatGPT,Codex'))stop('selection');
      if(realpathSync(options.selection.private.scratchParent)!==realpathSync(tmpdir())||
          options.selection.private.writers.length<1||options.selection.private.writers.length>12||
          options.selection.private.writers.some(n=>!/^[A-Za-z0-9_.-]{1,64}$/.test(n)))stop('selection');
    }
    store=options.selection.kind==='synthetic'?join(options.selection.fixture.ownerRoot,'recovery'):await locatePersonalRecoveryStore(options.executable,attempt);
    recoveryLocation(store,undefined,source);if(!missing(store)){cleanup='residual';recovery='unavailable';stop('selection');}
    const select=():string[]=>{
      const paths=selectedPaths(source);
      if(explorer){
        const globalState=options.explorer!.globalState;
        if(options.selection.kind!=='synthetic'||!contains(join(options.selection.fixture.ownerRoot,'sources'),globalState)||
          paths.some(p=>overlap(p,globalState)))stop('selection');
        paths.push(globalState);
        if(paths.reduce((size,p)=>size+metadata(p).size,0n)>BigInt(canaryLimits.selected))stop('limit');
      }
      return paths;
    };
    const paths=select();const before=paths.map(metadata);count=paths.length;
    if(explorer)scratch=new CanaryScratch([...names.slice(0,count-1),'global-state.json'],'explorer');
    cleanup='residual';scratch.initialize();await options.hook?.('initialized',scratch);
    if(overlap(dirname(source),scratch.root!)||overlap(source,scratch.root!))stop('containment');
    recoveryLocation(store,scratch.root,source);mkdirSync(store);storeId=identity(store,true);
    const fault=options.fault??'none';if(!['none','protected','descriptor','partial-copy','diagnostic','recovery-create','recovery-descriptor','recovery-write','recovery-flush','recovery-readback'].includes(fault))stop('selection');
    const writers=options.selection.kind==='personal'?[...options.selection.private.writers]:[];
    if(explorer&&overlap(dirname(options.explorer!.globalState),scratch.root!))stop('containment');
    session=new CanarySession({operation:'acquire',store,count,root:scratch.root,nonce:scratch.nonce,source,mode:synthetic?'synthetic':'personal',writers,fault,
      ...(explorer?{profile:'explorer',globalState:options.explorer!.globalState}:{})},options.executable,scratch.nonce,options.corruptFrame,steps,scratch.copyNames);
    session.start(options.afterSpawn);
    await session.expect('prepared',0);await options.hook?.('prepared',scratch);
    identified(store,true,storeId);scratch.owned();
    if(!same(before,select().map(metadata)))stop('unstable');
    const payload=recoveryPayload(scratch,store);
    session.send({command:'persist',payload});await session.expect('recovery-ready',0);
    if(JSON.stringify(readAuthenticatedRecord(store))!==JSON.stringify(JSON.parse(payload)))stop('cleanup');
    lease=openSync(join(store,'record'),'r');
    const held=fstatSync(lease,{bigint:true});const recordId=identity(join(store,'record'),false);
    if(held.dev.toString()!==recordId.dev||held.ino.toString()!==recordId.ino)stop('cleanup');
    persisted=true;recovery='available';await options.hook?.('recovery-ready',scratch);
    session.send({command:'acquire'});
    const frame=await session.expect('held',count);if(frame.stage!=='held')stop('helper');
    const manifest=frame.manifest;
    if(manifest.some((e,i)=>BigInt(e.size)!==before[i]?.size))stop('unstable');
    await options.hook?.('held',scratch);
    if(synthetic&&options.closure?.()!=='absent')stop('closure');
    if(!same(before,select().map(metadata)))stop('unstable');
    session.send({command:'copy'});await session.expect('copied',count);
    scratch.entries();
    for(let i=0;i<count;i++)for(const area of ['acquisition','analysis'] as const)
      if(digestCopy(scratch.path(area,i))!==manifest[i]?.digest)stop('unstable');
    await options.hook?.('copied',scratch);
    try{
      if(explorer){
        const reader=await import('../../src/explorer/readers.js');
        explorerResult=reader.readExplorerCopies(scratch,{namespace:namespace!,from:from!,through:new Date().toISOString()},count-1,'invented-v1');
        readable=explorerResult.status==='ready';
      }else if(options.analysis==='thread-cwd'){
        adapter=await import('./thread-cwd-adapter.js');
        mapping=adapter.readThreadCwdCopy(scratch,{namespace:namespace!,from:from!,through:new Date().toISOString()});
        readable=mapping.summary.reason!=='analysis';
      }else if(options.analysis==='qualification'){
        qualification=inspectQualificationAnalysis(scratch,options.qualificationHook);readable=true;
      }else{readable=inspectCanaryAnalysis(scratch,options.inspectHook);}
    }catch{stop('analysis');}
    await options.hook?.('analyzed',scratch);
    if(!same(before,select().map(metadata)))stop('unstable');
    for(let i=0;i<count;i++)if(digestCopy(scratch.path('acquisition',i))!==manifest[i]?.digest)stop('unstable');
    session.send({command:'verify'});await session.expect('verified',count);
    await options.hook?.('verified',scratch);
    if(synthetic&&options.closure?.()!=='absent')stop('closure');
    if(!same(before,select().map(metadata)))stop('unstable');
    session.send({command:'release'});candidate=true;
    exit=await session.finish();
    if(!exit||session.unsafe||session.final?.outcome!=='ok'||session.final.phase!=='release'||
        session.final.opened!==count||!session.final.copied||session.final.fault!=='none')stop('helper');
    if(!same(before,select().map(metadata)))stop('unstable');
    if(synthetic&&options.closure?.()!=='absent')stop('closure');
    stable=true;reason='none';
  }catch(error){reason=safeReason(error);candidate=false;}
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
        if(exit&&!session?.unsafe){const result=await recoverCanary({store,executable:options.executable,synthetic,
          ...(options.cleanupFault?{fault:options.cleanupFault}:{})});cleanup=result==='removed'?'removed':'residual';}
      }else{
        cleanup=scratch.cleanup(options.cleanupFault);
        if(store&&storeId&&!removeBootstrapStore(store,storeId))cleanup='residual';
      }
    }
    if(lease!==undefined&&(!session||session.processExited)){closeSync(lease);lease=undefined;}
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
  if(attempt&&candidate&&stable&&exit&&cleanup==='removed'&&recovery==='removed'&&mapping&&adapter){
    if(mapping.summary.status==='ready'){
      mapping=new adapter.AdapterResult(mapping.summary,mapping.readClaims(),{namespace:namespace!,from:from!,through:new Date().toISOString()});
    }else{
      candidate=false;
      reason=mapping.summary.reason==='limit'?'limit':mapping.summary.reason==='unsupported-schema'?'unsupported':'analysis';
    }
    mapSummary=mapping.summary;
    if(delivery&&candidate&&mapping.summary.status==='ready')delivery.capability=new LocalMapCapability(mapping);
  }else if(attempt&&candidate){candidate=false;reason='analysis';}
  mapping=undefined; // Standard results stay summary-only; display delivery is a separate private capability.
  if(explorerResult){
    if(candidate&&stable&&exit&&cleanup==='removed'&&recovery==='removed'&&explorerResult.status==='ready'){
      // Only the fixed synthetic bridge can take this one-use capability.
      const data=explorerResult.snapshot!.take()!;
      explorerResult.snapshot=new ExplorerSnapshot(reconcile({...data.provenance,through:new Date().toISOString()},
        data.coverage,data.threads,data.projects,data.assignments));
      explorerDelivery!.result=explorerResult;
    }else{explorerResult.snapshot?.discard();candidate=false;if(reason==='none')reason=explorerResult.reason==='limit'?'limit':explorerResult.reason==='schema'?'unsupported':'analysis';}
  }
  return {status:candidate?'passed':'refused',reason,cleanup,recovery,files:candidate?count:0,
    ...(options.analysis==='qualification'?{qualification:qualified??null}:{}),
    ...(attempt?{mapping:mapSummary,attemptConsumed:attempt.consumed}:{}),
    schemaReadable:candidate&&readable,sourcesStable:candidate&&stable,
    evidence:{stages:session?.reached??[],phase:f?.phase??'input',fault:f?.fault??'none',partialWritten:f?.partialWritten??false,
      opened:f?.opened??0,exitConfirmed:exit&&!options.simulateExitUncertainty,diagnosticsDiscarded:session?.diagnostics??false}};
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
