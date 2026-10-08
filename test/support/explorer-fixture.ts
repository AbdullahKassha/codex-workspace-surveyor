// Invented data and exact-run teardown only. Never selects a personal source.
import fs from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { SyntheticRun } from './synthetic-acquisition.js';
import { CanaryScratch, recoverCanary, forgetRecoveredSyntheticResidual } from './personal-canary.js';

export const inventedProjects={format:'workspace-surveyor-invented-projects-v1',projects:[
  {id:'project-atlas',label:'Atlas',roots:['C:\\Synthetic\\atlas','C:\\Synthetic\\atlas\\docs']},
  {id:'project-notes',label:'Notes',roots:['C:\\Synthetic\\notes']}],assignments:[
  {threadId:'record-a',projectId:'project-atlas'},{threadId:'record-b',projectId:'project-atlas'},
  {threadId:'record-c',projectId:'project-notes'}]};
export function explorerFixture(build?:(db:DatabaseSync)=>void,wal=false,json:unknown=inventedProjects){
  const run=new SyntheticRun('simulated-owner-restricted');const scratches:CanaryScratch[]=[];
  const source=join(run.sources,'standalone.sqlite'),globalState=join(run.sources,'metadata.json');
  const builder=join(run.root,'builder','standalone.sqlite');
  const selection={kind:'synthetic' as const,fixture:{source,ownerRoot:run.root,ownerNonce:fs.readFileSync(join(run.root,'owner'),'utf8')}};
  const teardown=async(confirmedExitedDescriptorFault=false)=>{
    let scratchRemoved=true;
    for(const scratch of scratches){
      if(!scratch.root||!fs.existsSync(scratch.root))continue;
      const store=join(run.root,'recovery');
      if(fs.existsSync(store)){
        const result=await recoverCanary({store,executable:process.env.WORKSPACE_SURVEYOR_HELPER_PWSH??'',synthetic:true});
        if(result!=='removed'){
          // Independent harness ownership is used only for the deliberately
          // damaged descriptor case after the acquisition helper has exited.
          // Never loosen permissions. Never retire controls before scratch absence.
          if(!confirmedExitedDescriptorFault||scratch.cleanup()!=='removed'){scratchRemoved=false;continue;}
          const entries=fs.readdirSync(store);
          if(entries.length!==2||entries.some(n=>!['key','record'].includes(n)))return false;
          for(const name of entries){const s=fs.lstatSync(join(store,name));if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.size>8192)return false;}
          for(const name of ['record','key'])fs.unlinkSync(join(store,name));fs.rmdirSync(store);
        }
        forgetRecoveredSyntheticResidual(scratch.root);
      }else if(scratch.cleanup()!=='removed')scratchRemoved=false;
    }
    // Preserve authenticated controls and fixture identity if scratch is residual.
    if(!scratchRemoved)return false;
    return run.cleanup().status==='removed';
  };
  try{
    fs.unlinkSync(builder);const db=new DatabaseSync(builder);
    try{
      if(wal)db.exec('PRAGMA journal_mode=WAL; PRAGMA wal_autocheckpoint=0');
      if(build)build(db);else{
        db.exec('CREATE TABLE threads(id TEXT,cwd TEXT,title TEXT,ignored TEXT)');
        const insert=db.prepare('INSERT INTO threads VALUES(?,?,?,?)');
        for(const row of [['record-a','C:\\Synthetic\\atlas','Fix parser boundaries'],['record-b','C:\\Synthetic\\atlas','Document acquisition'],
          ['record-c','C:\\Synthetic\\atlas\\docs','Review notes'],['record-d','C:\\Synthetic\\2026-10-01\\workspace','Untangle workspace naming']])insert.run(...row,'SYNTHETIC_UNCONSUMED');
      }
      for(const suffix of wal?['','-wal','-shm']:[''])fs.copyFileSync(builder+suffix,source+suffix);
    }finally{db.close();}
    fs.writeFileSync(globalState,JSON.stringify(json));
  }catch{
    // No protected scratch exists during fixture construction.
    run.cleanup();throw new Error('Invented fixture construction refused');
  }
  return {run,source,globalState,scratches,selection,teardown};
}
