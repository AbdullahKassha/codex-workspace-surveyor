// Synthetic demonstration and shared private browser lifecycle. No product CLI command.
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import type { EventEmitter } from 'node:events';
import { explorerFixture } from './explorer-fixture.js';
import { runSyntheticExplorer, type CanaryResult } from './personal-canary.js';
import { serveLocalExplorer, type LocalExplorer } from '../../src/explorer/server.js';
import type { ExplorerSnapshot } from '../../src/explorer/model.js';
import type { ReaderResult } from '../../src/explorer/readers.js';

// Private lifecycle seam: tests supply controlled promises, never personal sources.
type EntryDependencies={
  personal?:true;
  createFixture:()=>{
    acquire:(preflightCancellation:AbortSignal)=>Promise<{snapshot?:ExplorerSnapshot;safety:CanaryResult|null;summary?:ReaderResult['summary']}>;
    teardown?:()=>Promise<boolean>;
  };
  start:typeof serveLocalExplorer;
  signals:Pick<EventEmitter,'on'|'off'>;
  write:(text:string)=>void;
};
export async function runExplorerEntry(deps:EntryDependencies):Promise<number>{
  let cancelled=false,reason='none',safety:CanaryResult|null=null;
  const preflightCancellation=new AbortController();
  let summary:ReaderResult['summary'];
  const fixtureCleanup:{beforeDelivery:'not-run'|'removed'|'residual';final:'not-run'|'removed'|'residual'}={beforeDelivery:'not-run',final:'not-run'};
  let fixture:ReturnType<EntryDependencies['createFixture']>|undefined;
  let snapshot:ExplorerSnapshot|undefined,server:LocalExplorer|undefined,closing:Promise<boolean>|undefined;
  const cleanup=async(phase:keyof typeof fixtureCleanup):Promise<boolean>=>{
    if(!fixture?.teardown)return true;
    try{fixtureCleanup[phase]=await fixture.teardown()?'removed':'residual';}
    catch{fixtureCleanup[phase]='residual';}
    return fixtureCleanup[phase]==='removed';
  };
  const close=():Promise<boolean>=>{
    if(!server)return Promise.resolve(true);
    return closing??=(async()=>{try{await server.close();return true;}catch{return false;}})();
  };
  const stop=()=>{cancelled=true;preflightCancellation.abort();void close();};
  deps.signals.on('SIGINT',stop);deps.signals.on('SIGTERM',stop);
  try{
    fixture=deps.createFixture();
    const run=async()=>{
      if(cancelled)return;
      const result=await fixture!.acquire(preflightCancellation.signal);safety=result.safety;snapshot=result.snapshot;summary=result.summary;
      if(cancelled)return;
      if(!snapshot||deps.personal&&safety?.status!=='passed'){reason='acquisition';return;}
      // Sources and scratch are gone before a browser channel is opened.
      if(!await cleanup('beforeDelivery')){reason='fixture-cleanup';return;}
      if(cancelled)return;
      server=await deps.start(snapshot);
      // Startup owns the consumed snapshot until it returns or refuses.
      if(cancelled)return;
      deps.write(deps.personal?'Verified local snapshot; helper exited and protected copies removed. You may reopen Desktop for comparison. Open this temporary session; close it in the page:':
        'Invented demonstration only. Open this temporary local session; close it in the page:');
      if(cancelled)return;
      deps.write(server.url);await server.closed;
    };
    await run();
  }catch{reason=deps.personal?'explorer':'synthetic-explorer';}
  finally{
    snapshot?.discard();
    try{
      if(!await close())reason=deps.personal?'explorer':'synthetic-explorer';
      if(!await cleanup('final'))reason='synthetic-residual';
    }finally{deps.signals.off('SIGINT',stop);deps.signals.off('SIGTERM',stop);}
  }
  // No await between completed cleanup, listener removal, final decision and reporting.
  // Preserve acquisition evidence verbatim; fixture teardown cannot rewrite it.
  const failed=cancelled||reason!=='none';
  deps.write(JSON.stringify({status:failed?'refused':'passed',reason:cancelled?'cancelled':reason,cancelled,safety,fixtureCleanup,
    ...(!failed&&summary?{explorer:summary}:{})}));
  return failed?1:0;
}

async function main():Promise<void>{
  if(process.env.WORKSPACE_SURVEYOR_RUN_EXPLORER_PREPARATION!=='1'||process.env.WORKSPACE_SURVEYOR_RUN_CANARY_PREPARATION!=='1'){
    console.log(JSON.stringify({status:'refused',reason:'synthetic-opt-in'}));process.exitCode=1;return;
  }
  process.exitCode=await runExplorerEntry({signals:process,write:text=>console.log(text),start:serveLocalExplorer,createFixture:()=>{
    const fixture=explorerFixture();
    return {teardown:fixture.teardown,acquire:()=>runSyntheticExplorer({executable:process.env.WORKSPACE_SURVEYOR_HELPER_PWSH??'',analysis:'explorer',
      explorer:{globalState:fixture.globalState},selection:fixture.selection,closure:()=> 'absent',
      hook:(phase,scratch)=>{if(phase==='initialized')fixture.scratches.push(scratch);}})};
  }});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
