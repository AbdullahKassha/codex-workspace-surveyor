// Opted-in research only: ordinary byte reads, never a SQLite connection to a source.
// P1 known limitation: a stale but valid SHM endpoint can admit a logically mixed copy.
// The protocol is not validated for production; see the deterministic gate regression.
import fs from 'node:fs';
import { join } from 'node:path';
import { owned, copyLimits, type Binding } from './best-effort-copy.js';

// Strictly reject malformed/stale tail frames rather than silently falling back to an older commit.
// SQLite fileformat2 sections 4.1–4.4. This is a test-only validator, not a new database reader.
export function committedWal(bytes:Buffer):number {
  if(bytes.length<32)throw Error('wal');
  const magic=bytes.readUInt32BE(0),page=bytes.readUInt32BE(8),little=magic===0x377f0682;
  if(![0x377f0682,0x377f0683].includes(magic)||bytes.readUInt32BE(4)!==3007000||
      page<512||page>65536||(page&(page-1))!==0||(bytes.length-32)%(page+24)!==0)throw Error('wal');
  let a=0,b=0,commit=0;
  const sum=(data:Buffer)=>{for(let i=0;i<data.length;i+=8){
    a=(a+(little?data.readUInt32LE(i):data.readUInt32BE(i))+b)>>>0;
    b=(b+(little?data.readUInt32LE(i+4):data.readUInt32BE(i+4))+a)>>>0;}};
  sum(bytes.subarray(0,24));if(a!==bytes.readUInt32BE(24)||b!==bytes.readUInt32BE(28))throw Error('wal');
  for(let i=32;i<bytes.length;i+=page+24){
    if(bytes.readUInt32BE(i)===0||!bytes.subarray(i+8,i+16).equals(bytes.subarray(16,24)))throw Error('wal');
    sum(bytes.subarray(i,i+8));sum(bytes.subarray(i+24,i+24+page));
    if(a!==bytes.readUInt32BE(i+16)||b!==bytes.readUInt32BE(i+20))throw Error('wal');
    if(bytes.readUInt32BE(i+4)!==0)commit=i+24+page;
  }
  if(!commit)throw Error('no-commit');return commit;
}
type Phase='db'|'wal'|'verify-wal';
export type ValidatedCopy={status:'candidate';bytes:number;ms:number}|{status:'refused';reason:'unavailable-epoch'|'changed-or-invalid';ms:number};
export async function epochCopy(b:Binding,order:'db-first'|'wal-first'='db-first',hook?:(phase:Phase,offset:number)=>Promise<void>,endpoint:'strict-file'|'published'='strict-file'):Promise<ValidatedCopy>{
  const start=performance.now(),fds:number[]=[];let epoch=false;
  try{
    owned(b);const source=join(b.root,'builder'),dest=join(b.root,'scratch/acquisition');
    if(fs.readdirSync(dest).length)throw Error('destination');
    const check=(path:string)=>{const s=fs.lstatSync(path);if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size>copyLimits.file)throw Error('shape');return s;};
    const active=()=>{if(performance.now()-start>copyLimits.dispatchMs)throw Error('deadline');};
    const absentJournal=()=>{try{fs.lstatSync(join(source,'standalone.sqlite-journal'));throw Error('journal');}
      catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}};
    absentJournal();const database=join(source,'standalone.sqlite'),walPath=database+'-wal';
    const identity=[check(database),check(walPath)];
    for(const p of [database,walPath]){const fd=fs.openSync(p,'r');fds.push(fd);const s=fs.fstatSync(fd),i=identity[fds.length-1]!;
      if(i.dev!==s.dev||i.ino!==s.ino||!s.isFile()||s.nlink!==1)throw Error('identity');}
    const walHeader=()=>{active();const header=Buffer.alloc(32);if(fs.readSync(fds[1]!,header,0,32,0)!==32)throw Error('epoch');return header;};
    const initial=walHeader();committedWalHeader(initial);epoch=true;
    // Optional exact 96-byte WAL-index header read: excludes lock bytes starting at offset 120.
    // No mapping, SQLite source open, write, or read-mark update. Its two header copies/checksum must agree.
    const shmPath=database+'-shm';
    if(endpoint==='published'){const id=check(shmPath),fd=fs.openSync(shmPath,'r');fds.push(fd);identity.push(id);
      const held=fs.fstatSync(fd);if(id.dev!==held.dev||id.ino!==held.ino||!held.isFile()||held.nlink!==1)throw Error('identity');}
    let published:{frames:number;pages:number;a:number;b:number}|undefined;
    const walLength=()=>{
      if(endpoint==='strict-file')return fs.fstatSync(fds[1]!).size;
      const h=Buffer.alloc(96);if(fs.readSync(fds[2]!,h,0,96,0)!==96||!h.subarray(0,48).equals(h.subarray(48,96)))throw Error('index');
      let a=0,c=0;for(let i=0;i<40;i+=8){a=(a+h.readUInt32LE(i)+c)>>>0;c=(c+h.readUInt32LE(i+4)+a)>>>0;}
      const page=h.readUInt16LE(14)===1?65536:h.readUInt16LE(14);
      if(h.readUInt32LE(0)!==3007000||h[12]!==1||h[13]!==Number(initial.readUInt32BE(0)===0x377f0683)||
        page!==initial.readUInt32BE(8)||!h.subarray(32,40).equals(initial.subarray(16,24))||a!==h.readUInt32LE(40)||c!==h.readUInt32LE(44))throw Error('index');
      published={frames:h.readUInt32LE(16),pages:h.readUInt32LE(20),a:h.readUInt32LE(24),b:h.readUInt32LE(28)};
      if(!published.frames||!published.pages)throw Error('index');
      return 32+published.frames*(page+24);
    };
    let work=0;
    const read=async(fd:number,length:number,phase:Phase)=>{
      if(length>copyLimits.file||work+length>4*copyLimits.total)throw Error('bounds');work+=length;
      const bytes=Buffer.alloc(length);await hook?.(phase,0);
      for(let offset=0;offset<length;){active();const n=fs.readSync(fd,bytes,offset,Math.min(4096,length-offset),offset);
        if(!n)throw Error('short-read');offset+=n;await hook?.(phase,offset);}return bytes;
    };
    let dbBytes:Buffer,wal:Buffer;
    if(order==='db-first'){dbBytes=await read(fds[0]!,identity[0]!.size,'db');wal=await read(fds[1]!,walLength(),'wal');}
    else{wal=await read(fds[1]!,walLength(),'wal');dbBytes=await read(fds[0]!,identity[0]!.size,'db');}
    if(!wal.subarray(0,32).equals(initial)||!walHeader().equals(initial))throw Error('epoch');
    const end=committedWal(wal);
    if(published){const last=wal.length-(initial.readUInt32BE(8)+24);
      if(end!==wal.length||wal.readUInt32BE(last+4)!==published.pages||wal.readUInt32BE(last+16)!==published.a||wal.readUInt32BE(last+20)!==published.b)throw Error('published-end');}
    if(!dbBytes.subarray(0,16).equals(Buffer.from('SQLite format 3\0'))||dbBytes[18]!==2||dbBytes[19]!==2)throw Error('mode');
    // Re-read the captured prefix to detect overwrite; matching samples alone are not the consistency argument.
    const verify=await read(fds[1]!,wal.length,'verify-wal');
    if(!verify.equals(wal)||!walHeader().equals(initial))throw Error('changed');
    for(let i=0;i<identity.length;i++){const s=check(i===0?database:i===1?walPath:shmPath),id=identity[i]!;
      if(s.dev!==id.dev||s.ino!==id.ino||(i===0&&s.size!==id.size))throw Error('lifecycle');}
    absentJournal();owned(b);active();
    const metadata=['metadata.json','session_index.jsonl'].map(name=>{const p=join(source,name),s=check(p),fd=fs.openSync(p,'r');
      try{const data=Buffer.alloc(s.size);if(fs.readSync(fd,data,0,data.length,0)!==data.length)throw Error('metadata');return {name,data};}finally{fs.closeSync(fd);}});
    if(dbBytes.length+end+metadata.reduce((n,m)=>n+m.data.length,0)>copyLimits.total)throw Error('bounds');
    for(const m of [{name:'standalone.sqlite',data:dbBytes},{name:'standalone.sqlite-wal',data:wal.subarray(0,end)},...metadata]){
      active();fs.writeFileSync(join(dest,m.name),m.data,{flag:'wx'});}
    return {status:'candidate',bytes:dbBytes.length+end,ms:performance.now()-start};
  }catch{return {status:'refused',reason:epoch?'changed-or-invalid':'unavailable-epoch',ms:performance.now()-start};}
  finally{for(const fd of fds)fs.closeSync(fd);}
}
function committedWalHeader(b:Buffer){
  // The regular validator also checks header checksums; a valid header without a commit is sufficient to start bracketing.
  const page=b.readUInt32BE(8);if(![0x377f0682,0x377f0683].includes(b.readUInt32BE(0))||
    b.readUInt32BE(4)!==3007000||page<512||page>65536||(page&(page-1))!==0)throw Error('epoch');
}
