// Disposable research worker only. No CLI, personal source or product import.
import fs from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { backup, DatabaseSync } from 'node:sqlite';
import { setTimeout as delay } from 'node:timers/promises';

type Message = { id:number; op:string; root?:string; nonce?:string; dev?:string; ino?:string;
  role?:'writer'|'reader'|'metadata'; area?:'builder'|'sources'; generation?:number; rate?:1|100; gate?:boolean };
let root='',nonce='',dev='',ino='',role='',area='builder',messages=0,active=false;
let db:DatabaseSync|undefined;
const sleepWord=new Int32Array(new SharedArrayBuffer(4));
const source=()=>join(root,area,'standalone.sqlite');
const destination=()=>join(root,'scratch','acquisition','standalone.sqlite');
const gate=()=>join(root,'scratch','analysis','session_index.jsonl');
const send=(value:object)=>{if(process.connected)process.send?.(value);};
function owned(){
  const s=fs.lstatSync(root,{bigint:true}),marker=fs.lstatSync(join(root,'owner'));
  if(!s.isDirectory()||s.isSymbolicLink()||String(s.dev)!==dev||String(s.ino)!==ino||
    !marker.isFile()||marker.isSymbolicLink()||marker.nlink!==1||marker.size!==nonce.length||
    fs.readFileSync(join(root,'owner'),'utf8')!==nonce)throw Error('ownership');
  for(const directory of [join(root,area),join(root,'scratch'),join(root,'scratch','acquisition'),join(root,'scratch','analysis')]){
    const stat=fs.lstatSync(directory);if(!stat.isDirectory()||stat.isSymbolicLink())throw Error('ownership');
  }
  for(const file of [source(),source()+'-wal',source()+'-shm',destination(),gate(),
    join(root,area,'metadata.json'),join(root,area,'session_index.jsonl')]){
    if(!fs.existsSync(file))continue;const stat=fs.lstatSync(file);
    if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||stat.size>16*1024*1024)throw Error('bounds');
  }
}
function close(){try{db?.close();}finally{db=undefined;}}
function reader(){
  db??=new DatabaseSync(source(),{readOnly:true,allowExtension:false,defensive:true,timeout:0});
  db.exec('PRAGMA trusted_schema=OFF; PRAGMA query_only=ON');return db;
}
function generation(connection:DatabaseSync){
  const row=connection.prepare('SELECT generation,check_value FROM live_probe').get()!;
  return {generation:Number(row.generation),consistent:Number(row.check_value)===Number(row.generation)*17};
}
function commit(value:number){
  const started=performance.now();db!.exec('BEGIN IMMEDIATE');
  db!.prepare('UPDATE live_probe SET generation=?,check_value=?').run(value,value*17);db!.exec('COMMIT');
  return performance.now()-started;
}
async function operation(m:Message):Promise<object>{
  if(m.op==='init'){
    if(root||typeof m.root!=='string'||typeof m.nonce!=='string'||!/^[a-f0-9-]{36}$/.test(m.nonce)||
      !['writer','reader','metadata'].includes(m.role??'')||!['builder','sources'].includes(m.area??'')||
      dirname(resolve(m.root))!==fs.realpathSync(tmpdir())||!resolve(m.root).startsWith(join(fs.realpathSync(tmpdir()),'workspace-surveyor-synthetic-')))
      throw Error('selection');
    root=m.root;nonce=m.nonce;dev=m.dev??'';ino=m.ino??'';role=m.role!;area=m.area!;owned();
    return {pid:process.pid,nonce};
  }
  if(!root)throw Error('selection');owned();
  if(m.op==='close'){close();return {closed:true};}
  if(m.op==='exit'){close();setImmediate(()=>process.exit(0));return {closed:true};}
  if(m.op==='crash')process.exit(73); // Deliberately skips SQLite disposal on this identified fixture child only.
  const g=m.generation??1;if(!Number.isInteger(g)||g<0||g>512)throw Error('bounds');
  if(role==='writer'){
    if(m.op==='open'){
      db=new DatabaseSync(source(),{allowExtension:false,defensive:true,timeout:0});
      db.exec('PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0; CREATE TABLE IF NOT EXISTS live_probe(generation INTEGER,check_value INTEGER); CREATE TABLE IF NOT EXISTS live_payload(value BLOB)');
      if(db.prepare('SELECT count(*) n FROM live_probe').get()!.n===0){
        db.exec('BEGIN; INSERT INTO live_probe VALUES(0,0)');
        const insert=db.prepare('INSERT INTO live_payload VALUES(zeroblob(4000))');for(let i=0;i<384;i++)insert.run();db.exec('COMMIT');
      }return generation(db);
    }
    if(m.op==='commit')return {milliseconds:commit(g),...generation(db!)};
    if(m.op==='uncommitted'){db!.exec('BEGIN IMMEDIATE');db!.prepare('UPDATE live_probe SET generation=?,check_value=?').run(g,g*17);return {held:true};}
    if(m.op==='rollback'){db!.exec('ROLLBACK');return generation(db!);}
    if(m.op==='checkpoint')return {checkpoint:db!.prepare('PRAGMA wal_checkpoint(TRUNCATE)').get()};
    if(m.op==='burst'){
      const latencies:number[]=[],failures:number[]=[];
      for(let i=1;i<=64;i++){
        try{latencies.push(commit(i));}catch(error){failures.push(Number((error as {errcode?:number}).errcode??-1));}
        await delay(1);
      }return {latencies,failures,...generation(db!)};
    }
  }
  if(role==='reader'){
    if(m.op==='cancel-before')return {cancelled:true,opened:db!==undefined};
    if(m.op==='read'){reader();return generation(db!);}
    if(m.op==='pin'){reader().exec('BEGIN');return generation(db!);}
    if(m.op==='backup'){
      reader();let steps=0,previous=Number.MAX_SAFE_INTEGER,restarts=0,paused=false;
      const started=performance.now();let failurePhase='backup';
      try{
        const pages=await backup(db!,destination(),{...(m.rate===1?{rate:1}:{}),progress:p=>{
          if(++steps>8192)throw Error('step-limit');if(performance.now()-started>10000)throw Error('deadline');
          if(p.remainingPages>=previous)restarts++;previous=p.remainingPages;
          if(m.gate&&!paused){
            paused=true;send({event:'step',remaining:p.remainingPages,total:p.totalPages});
            const until=performance.now()+5000;let value='wait';
            while(value==='wait'&&performance.now()<until){owned();value=fs.readFileSync(gate(),'utf8');if(value==='wait')Atomics.wait(sleepWord,0,0,2);}
            if(value!=='go')throw Error(value==='cancel'?'cancelled':'deadline');
          }
        }});
        failurePhase='copy-validation';
        const copy=new DatabaseSync(destination(),{readOnly:true,allowExtension:false,defensive:true,timeout:0});
        try{return {pages,steps,restarts,milliseconds:performance.now()-started,
          ...(copy.prepare("SELECT 1 FROM sqlite_schema WHERE name='live_probe'").get()?generation(copy):{}),
          integrity:copy.prepare('PRAGMA quick_check').get()!.quick_check==='ok'};}
        finally{copy.close();}
      }catch(error){const reason=(error as Error).message;return {cancelled:reason==='cancelled',boundedStop:['step-limit','deadline'].includes(reason),
        stopReason:['cancelled','step-limit','deadline'].includes(reason)?reason:'sqlite-io',failurePhase,
        code:Number((error as {errcode?:number}).errcode??-1),steps,restarts,milliseconds:performance.now()-started};}
    }
  }
  if(role==='metadata'){
    const json=join(root,area,'metadata.json'),index=join(root,area,'session_index.jsonl'),temporary=join(root,'scratch','analysis','metadata.json');
    if(m.op==='metadata-init'){fs.writeFileSync(json,JSON.stringify({generation:0}));fs.writeFileSync(index,'{"generation":0}\n');return {written:true};}
    if(m.op==='atomic'){fs.writeFileSync(temporary,JSON.stringify({generation:g}),{flag:'wx'});fs.renameSync(temporary,json);return {written:true};}
    if(m.op==='partial'){fs.writeFileSync(json,'{"generation":');return {written:true};}
    if(m.op==='append'){fs.appendFileSync(index,JSON.stringify({generation:g})+'\n');return {written:true};}
    if(m.op==='partial-index'){fs.appendFileSync(index,'{"generation":');return {written:true};}
    if(m.op==='truncate'){fs.writeFileSync(index,JSON.stringify({generation:g})+'\n');return {written:true};}
    if(m.op==='transient'){
      const bytes=fs.readFileSync(json),transient=source()+'-journal';
      fs.writeFileSync(json,'{"generation":99}');fs.writeFileSync(json,bytes);
      fs.writeFileSync(transient,'invented transient',{flag:'wx'});fs.unlinkSync(transient);
      return {writes:2,creates:1,deletes:1};
    }
  }
  throw Error('command');
}
if(process.env.WORKSPACE_SURVEYOR_RUN_LIVE_FEASIBILITY!=='1'||!process.send){process.exitCode=2;}
else{
  const timer=setTimeout(()=>{close();process.exit(74);},30000);timer.unref();
  process.on('disconnect',()=>{if(!active){close();process.exit(0);}});
  process.on('message',async(value:unknown)=>{
    if(++messages>2048||Buffer.byteLength(JSON.stringify(value))>4096||typeof value!=='object'||value===null||active){close();process.exit(75);}
    const m=value as Message;if(!Number.isSafeInteger(m.id)||typeof m.op!=='string'){close();process.exit(75);}
    active=true;
    try{send({id:m.id,ok:true,...await operation(m)});}
    catch(error){send({id:m.id,ok:false,category:['ownership','bounds','selection','command'].includes((error as Error).message)?(error as Error).message:'sqlite-io',code:Number((error as {errcode?:number}).errcode??-1)});}
    finally{active=false;if(!process.connected){close();process.exit(0);}}
  });
}
