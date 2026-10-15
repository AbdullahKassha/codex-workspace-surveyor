// Standalone invented-data experiment. Not imported by Explorer or protected acquisition.
import fs from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { SyntheticRun } from './synthetic-acquisition.js';

export const copyLimits={file:16*1024*1024,total:32*1024*1024,dispatchMs:5000,chunk:4096} as const;
export const copyNames=['standalone.sqlite','standalone.sqlite-wal','metadata.json','session_index.jsonl'] as const;
type Name=typeof copyNames[number];
export type Binding={root:string;nonce:string;dev:number;ino:number};
export function bind(run:SyntheticRun):Binding {
  if(!(run instanceof SyntheticRun))throw Error('fixture');
  const s=fs.lstatSync(run.root);return {root:run.root,nonce:fs.readFileSync(join(run.root,'owner'),'utf8'),dev:s.dev,ino:s.ino};
}
export function owned(b:Binding):void {
  const s=fs.lstatSync(b.root),o=fs.lstatSync(join(b.root,'owner'));
  if(!s.isDirectory()||s.isSymbolicLink()||s.dev!==b.dev||s.ino!==b.ino||!o.isFile()||o.isSymbolicLink()||o.nlink!==1||
      o.size!==b.nonce.length||fs.readFileSync(join(b.root,'owner'),'utf8')!==b.nonce)throw Error('fixture');
  for(const area of ['builder','scratch','scratch/acquisition','scratch/analysis']){
    const p=join(b.root,area),d=fs.lstatSync(p);
    if(!d.isDirectory()||d.isSymbolicLink()||fs.realpathSync(p)!==p)throw Error('fixture');
  }
}
function stat(path:string){
  try{const s=fs.lstatSync(path);if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size>copyLimits.file)throw Error('shape');return s;}
  catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return undefined;throw e;}
}
const sameIdentity=(a:fs.Stats|undefined,b:fs.Stats|undefined)=>a===undefined?b===undefined:
  b!==undefined&&a.dev===b.dev&&a.ino===b.ino;
export type CopyResult={status:'copied';bytes:number;changed:boolean;shmObserved:boolean}|{status:'refused';reason:'copy-or-lifecycle'|'cancelled'|'deadline'};
// Test barriers are in-process only. Names/locations are fixed; no personal-source registration.
export async function copyBytes(b:Binding,hook?:(name:Name,offset:number)=>Promise<void>,signal?:AbortSignal):Promise<CopyResult>{
  let total=0,changed=false;const until=performance.now()+copyLimits.dispatchMs;
  const cancelled=Error('cancelled'),deadline=Error('deadline');
  const active=()=>{if(signal?.aborted)throw cancelled;if(performance.now()>until)throw deadline;owned(b);};
  try{
    active();const source=join(b.root,'builder'),dest=join(b.root,'scratch/acquisition');
    if(fs.readdirSync(dest).length)throw Error('destination');
    if(stat(join(source,'standalone.sqlite-journal')))throw Error('journal');
    const before=copyNames.map(n=>stat(join(source,n))),shm=stat(join(source,'standalone.sqlite-shm'));
    if(!before[0]||!before[2]||!before[3])throw Error('missing');
    for(let i=0;i<copyNames.length;i++){
      active();const name=copyNames[i]!,initial=before[i];if(!initial)continue;
      const path=join(source,name),fd=fs.openSync(path,'r'); // Pinned Windows libuv: READ|WRITE|DELETE sharing.
      try{
        const held=fs.fstatSync(fd);if(!sameIdentity(initial,held)||!held.isFile()||held.nlink!==1||held.size>copyLimits.file)throw Error('identity');
        total+=held.size;if(total>copyLimits.total)throw Error('limit');
        const bytes=Buffer.alloc(held.size);let offset=0;
        await hook?.(name,offset);
        while(offset<bytes.length){active();const n=fs.readSync(fd,bytes,offset,Math.min(copyLimits.chunk,bytes.length-offset),offset);
          if(!n)throw Error('short-read');offset+=n;await hook?.(name,offset);}
        const after=fs.fstatSync(fd);if(!sameIdentity(held,stat(path))||after.size<held.size)throw Error('lifecycle');
        // Appended WAL frames are intentionally outside this bounded prefix. Detect an observed WAL reset.
        if(name.endsWith('-wal')&&bytes.length>=32){const header=Buffer.alloc(32);
          if(fs.readSync(fd,header,0,32,0)!==32||!header.equals(bytes.subarray(0,32)))throw Error('wal-reset');}
        changed ||= after.size!==held.size||after.mtimeMs!==held.mtimeMs||after.ctimeMs!==held.ctimeMs;
        active();fs.writeFileSync(join(dest,name),bytes,{flag:'wx'});
      }finally{fs.closeSync(fd);}
    }
    active();const after=copyNames.map(n=>stat(join(source,n)));
    if(before.some((s,i)=>!sameIdentity(s,after[i]))||!sameIdentity(shm,stat(join(source,'standalone.sqlite-shm')))||
       stat(join(source,'standalone.sqlite-journal')))throw Error('lifecycle');
    changed ||= before.some((s,i)=>s&&after[i]&&(s.size!==after[i]!.size||s.mtimeMs!==after[i]!.mtimeMs||s.ctimeMs!==after[i]!.ctimeMs));
    return {status:'copied',bytes:total,changed,shmObserved:shm!==undefined};
  }catch(e){return {status:'refused',reason:e===cancelled?'cancelled':e===deadline?'deadline':'copy-or-lifecycle'};}
}
export type Inspection={status:'usable'|'refused';integrity:boolean;invariant:boolean;dbGeneration?:number;otherGeneration?:number;jsonGeneration?:number;indexGeneration?:number};
export function inspectCopy(b:Binding):Inspection {
  let db:DatabaseSync|undefined;
  try{
    owned(b);const acquisition=join(b.root,'scratch/acquisition'),analysis=join(b.root,'scratch/analysis');
    if(fs.readdirSync(analysis).length)throw Error('destination');
    for(const name of copyNames){const p=join(acquisition,name);if(stat(p))fs.copyFileSync(p,join(analysis,name),fs.constants.COPYFILE_EXCL);}
    const path=join(analysis,'standalone.sqlite');
    // Missing SHM is rebuilt ONLY in the owned analysis directory. Acquisition bytes remain untouched.
    // A no-WAL copy is immutable; never apply this flag to an original or omit an observed WAL.
    db=new DatabaseSync(stat(path+'-wal')?path:pathToFileURL(path).href+'?immutable=1',{readOnly:true,allowExtension:false,defensive:true,timeout:0});
    db.exec('PRAGMA trusted_schema=OFF; PRAGMA query_only=ON');
    const integrity=db.prepare('PRAGMA integrity_check').all().every(r=>r.integrity_check==='ok');
    if(!integrity)return {status:'refused',integrity:false,invariant:false};
    const a=Number(db.prepare('SELECT generation FROM first').get()!.generation),c=Number(db.prepare('SELECT generation FROM second').get()!.generation);
    const json=JSON.parse(fs.readFileSync(join(analysis,'metadata.json'),'utf8')) as {generation:number};
    const lines=fs.readFileSync(join(analysis,'session_index.jsonl'),'utf8').trimEnd().split('\n').map(s=>JSON.parse(s) as {generation:number});
    const index=lines.at(-1)!;
    if(!Number.isSafeInteger(json.generation)||!Number.isSafeInteger(index.generation))throw Error('metadata');
    // Fixture-specific invariant is an oracle, NOT an assertion about real Codex schemas.
    return {status:a===c?'usable':'refused',integrity,invariant:a===c,dbGeneration:a,otherGeneration:c,jsonGeneration:json.generation,indexGeneration:index.generation};
  }catch{return {status:'refused',integrity:false,invariant:false};}
  finally{db?.close();}
}
