// Disposable browser acceptance only: invented sources and harness-owned recovery.
import { randomBytes } from 'node:crypto';
import { explorerFixture } from './explorer-fixture.js';
import { runSyntheticExplorer } from './personal-canary.js';
import { completeExplorerRefresh } from './personal-explorer-entry.js';
import { runReusableEntry } from './reusable-explorer-entry.js';

async function main():Promise<void>{
  if(process.platform!=='win32'||process.env.WORKSPACE_SURVEYOR_RUN_CANARY_PREPARATION!=='1'||
    process.env.WORKSPACE_SURVEYOR_RUN_EXPLORER_PREPARATION!=='1'||!process.env.WORKSPACE_SURVEYOR_HELPER_PWSH){
    console.log('Disposable browser fixture requires the documented Windows synthetic opt-ins.');process.exitCode=1;return;
  }
  const executable=process.env.WORKSPACE_SURVEYOR_HELPER_PWSH;
  const fixture=explorerFixture(undefined,false,undefined,
    ['record-a','record-b','record-c','record-d'].map((id,i)=>JSON.stringify({id,thread_name:'Invented task '+(i+1),updated_at:'2026-10-11T00:00:00Z'})).join('\n')+'\n');
  let attempt=0,release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});
  const input=(chunk:Buffer)=>{if(chunk.toString('utf8').trim()==='release')release();};
  process.stdin.on('data',input);process.stdin.once('end',release);process.once('SIGINT',release);process.once('SIGTERM',release);
  try{
    process.exitCode=await runReusableEntry({executable,scope:randomBytes(32).toString('hex'),channel:randomBytes(32).toString('hex'),write:console.log,
      openBrowser:async url=>{console.log('Invented fixture browser URL: '+url);return true;},
      acquire:async(signal,discovery)=>{
        const current=++attempt;console.log('Synthetic refresh attempt '+current);
        const result=await runSyntheticExplorer({executable,analysis:'explorer',explorer:{globalState:fixture.globalState,sessionIndex:fixture.sessionIndex},
          selection:fixture.selection,closure:()=>current===2?'present':'absent',hook:async(phase,scratch)=>{
            if(phase==='initialized')fixture.scratches.push(scratch);
            if(current===3&&phase==='held'){
              console.log('Synthetic attempt held; Cancel or Close releases the artificial hold while protected cleanup continues.');
              const timeout=setTimeout(release,5000);signal.addEventListener('abort',release,{once:true});
              try{await held;}finally{clearTimeout(timeout);signal.removeEventListener('abort',release);}
            }
          }});
        if(!result.safety){result.snapshot?.discard();return {failure:'unavailable'};}
        return completeExplorerRefresh({...result,safety:result.safety},{executable,discoveryRoot:fixture.run.sources},signal,discovery,true);
      }});
  }finally{
    release();process.stdin.off('data',input);process.stdin.off('end',release);process.stdin.pause();process.off('SIGINT',release);process.off('SIGTERM',release);
    const cleaned=await fixture.teardown();console.log(cleaned?'Exact owned fixture cleanup confirmed.':'Owned fixture cleanup unconfirmed; controls retained.');
    if(!cleaned)process.exitCode=1;
  }
}
void main().catch(()=>{console.log('Disposable browser fixture refused.');process.exitCode=1;});
