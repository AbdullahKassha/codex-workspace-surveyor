import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { ExplorerSession, type SessionOptions } from '../../src/explorer/session.js';
import { serveReusableExplorer, type LocalExplorer } from '../../src/explorer/server.js';
import { escapeStored } from '../../src/explorer/view.js';
import { acquirePersonalSnapshot, preparePersonalExplorer } from './personal-explorer-entry.js';
import { SessionBroker } from './session-broker.js';
import { resolveExplorerRecoveryStore, recoverCanaryWithEvidence, preserveLegacyStore, resolveOriginalRecoveryStore, type RecoveryReport } from './personal-canary.js';

export async function finishExplorerRecovery(recovery:RecoveryReport,preserve? :()=>Promise<'preserved'|'blocked'>):Promise<'removed'|'preserved'|'blocked'>{
  if(recovery.status==='removed'&&recovery.category==='none'&&recovery.helperExit==='confirmed'&&recovery.deletionAuthorized)return 'removed';
  if(recovery.status!=='refused'||recovery.check!=='scratch-validation'||recovery.category!=='scratch-inventory'||
    recovery.helperExit!=='confirmed'||recovery.deletionAuthorized||!preserve)return 'blocked';
  try{return await preserve()==='preserved'?'preserved':'blocked';}catch{return 'blocked';}
}

// Explicit application action only; never called by startup, Refresh or reads.
export async function recoverExplorerCopies(executable:string):Promise<'removed'|'preserved'|'blocked'>{
  try{
    const store=await resolveExplorerRecoveryStore(executable);
    const recovery=await recoverCanaryWithEvidence({store,executable,synthetic:false,localExplorer:true});
    return await finishExplorerRecovery(recovery,store.endsWith('-Active')?undefined:async()=>{
      if(store!==await resolveOriginalRecoveryStore(executable,true))return 'blocked';
      const preservation=await preserveLegacyStore({store,executable,synthetic:false,localExplorer:true});
      return preservation.status==='preserved'&&preservation.category==='none'?'preserved':'blocked';
    });
  }catch{return 'blocked';}
}

export async function runReusableEntry(options:SessionOptions & {executable:string;write:(text:string)=>void;
  openBrowser:(url:string,signal:AbortSignal)=>Promise<boolean>;channel?:string}):Promise<number>{
  const session=new ExplorerSession(options);let local:LocalExplorer|undefined,broker:SessionBroker|undefined,cancelled=false;
  const delivery=new AbortController();
  const open=async(url:string)=>{
    let opened=false;try{opened=await options.openBrowser(url,delivery.signal);}catch{/* Manual delivery remains available. */}
    if(!opened&&!delivery.signal.aborted){options.write('Browser opening could not be confirmed. Open this temporary session URL:');options.write(url);}
  };
  const stop=()=>{cancelled=true;delivery.abort();void session.close();};
  process.on('SIGINT',stop);process.on('SIGTERM',stop);
  try{
    const owner=await SessionBroker.start(options.executable,options.scope,()=>{
      if(session.reopen()==='closed')throw new Error('Session closing');
    },()=>{cancelled=true;options.write('Session coordination ended unexpectedly; closing after protected cleanup.');delivery.abort();void session.close();},options.channel);
    if(owner.kind==='attached'){
      await session.close();if(delivery.signal.aborted)return 1;
      await open(owner.url);
      options.write('Existing session opened. Any retained snapshot keeps its original update time; use Refresh for newer data.');return cancelled?1:0;
    }
    broker=owner.broker;if(delivery.signal.aborted)return 1;
    local=await serveReusableExplorer(session);await broker.ready(local.url);
    if(delivery.signal.aborted)return 1;
    options.write('Workspace ready. Refresh requires Codex and ChatGPT Desktop to be closed normally. Close session in the page or press Ctrl+C here.');
    await open(local.url);
    if(!delivery.signal.aborted&&!session.state().attempt)session.refresh();
    await local.closed;
    options.write('Local session closed; any active acquisition has settled.');
    if(session.state().recoveryAction==='preserved')options.write('Temporary copies remain protected and unresolved. Launch Surveyor again to use the independent acquisition lifecycle.');
    else if(session.state().attempt?.failure==='cleanup'&&session.state().recoveryAction!=='removed')options.write('Protected cleanup/recovery was not confirmed. Use the documented explicit recovery procedure; do not delete controls manually.');
    return cancelled||session.state().attempt?.outcome!=='success'&&!['removed','preserved'].includes(session.state().recoveryAction??'')?1:0;
  }catch{options.write('Session coordination refused. Another session may be starting, closing, or using a different selection/version. Wait for it to finish or close that session normally; no inspection was retried.');return 1;}
  finally{
    delivery.abort();await session.close();await local?.close();await broker?.stop();
    process.off('SIGINT',stop);process.off('SIGTERM',stop);
  }
}
export async function manualReusableExplorer(args:readonly string[],launch:{openBrowser:(url:string,signal:AbortSignal)=>Promise<boolean>;write:(text:string)=>void}):Promise<void>{
  if(!process.stdin.isTTY||!process.stdout.isTTY){launch.write('Use Workspace Surveyor.cmd in a visible console.');process.exitCode=1;return;}
  const executable=process.env.WORKSPACE_SURVEYOR_HELPER_PWSH??join(process.env.ProgramFiles??'','PowerShell','7','pwsh.exe');
  let options;
  try{options=await preparePersonalExplorer(args,()=>{},{enabled:true,nodeVersion:process.versions.node,executable,
    scratchParent:realpathSync(tmpdir()),home:homedir()},new AbortController().signal);}
  catch{launch.write('Source selection refused; use the documented standalone arguments.');process.exitCode=1;return;}
  if(options.selection.kind==='personal'){Object.freeze(options.selection.private.writers);Object.freeze(options.selection.private);}
  Object.freeze(options.explorer);Object.freeze(options.selection);Object.freeze(options);
  let legacyUnresolved:false|true=false;
  try{legacyUnresolved=(await resolveExplorerRecoveryStore(executable)).endsWith('-Active');}
  catch{launch.write('Recovery or legacy-preservation controls could not be validated. No acquisition started. Close any other Surveyor session normally, then use the documented incident procedure; do not delete controls manually.');process.exitCode=1;return;}
  if(legacyUnresolved)launch.write('Legacy private copies remain preserved and unresolved. This session uses a separate authenticated lifecycle; its cleanup does not resolve the legacy incident.');
  launch.write(options.discoveryRoot?'Folder discovery root: '+escapeStored(options.discoveryRoot)+'\nMetadata reads are limited to this approved invocation scope. External declared/Git locations remain uninspected.':
    'Standalone folder discovery is not enabled: %USERPROFILE%\\Documents\\Codex is unavailable. Project/Thread inspection remains enabled. No alternative root was searched.');
  const scope=createHash('sha256').update(JSON.stringify({version:'session-2b-v1',repository:realpathSync(process.cwd()),options,
    ...(legacyUnresolved?{legacyUnresolved:true}:{})})).digest('hex');
  process.exitCode=await runReusableEntry({...launch,scope,executable,...(legacyUnresolved?{legacyUnresolved:true as const}:{}),
    recover:()=>recoverExplorerCopies(executable),acquire:(signal,discovery)=>acquirePersonalSnapshot(options,signal,discovery,true,launch.write)});
}
