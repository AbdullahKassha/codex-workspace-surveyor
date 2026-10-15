// Single incident, explicit local approval. No deletion of unregistered objects.
import { pathToFileURL } from 'node:url';
import { homedir, tmpdir } from 'node:os';
import { realpathSync } from 'node:fs';
import { join } from 'node:path';
import { hiddenInput } from './personal-canary-entry.js';
import { preserveLegacyStore, resolveOriginalRecoveryStore, recoverCanaryWithEvidence, type RecoveryReport } from './personal-canary.js';
import { preparePersonalExplorer, acquirePersonalSnapshot } from './personal-explorer-entry.js';
import { windowsDiscoveryArgs } from './windows-explorer-entry.js';
import type { RefreshResult } from '../../src/explorer/session.js';

export async function resolveLegacyIncident(steps:{recover:()=>Promise<RecoveryReport>;
  preserve:()=>ReturnType<typeof preserveLegacyStore>;refresh:()=>Promise<RefreshResult>}){
  const recovery=await steps.recover();let legacyUnresolved=false;
  let preservation:Awaited<ReturnType<typeof preserveLegacyStore>>|undefined;
  if(recovery.status!=='removed'||recovery.category!=='none'||recovery.helperExit!=='confirmed'||!recovery.deletionAuthorized){
    if(recovery.status!=='refused'||recovery.check!=='scratch-validation'||recovery.category!=='scratch-inventory'||
      recovery.helperExit!=='confirmed'||recovery.deletionAuthorized)return {status:'blocked',recovery};
    preservation=await steps.preserve();if(preservation.status!=='preserved'||preservation.category!=='none')return {status:'blocked',recovery,preservation};
    legacyUnresolved=true;
  }
  const refresh=await steps.refresh();const data=refresh.failure?undefined:refresh.snapshot?.take();refresh.snapshot?.discard();
  const populated=!!data&&(data.projects.length>0||data.visibility.some(v=>v==='inferred'));
  return {status:populated?'operational':'verification-failed',legacyUnresolved,recovery,...(preservation?{preservation}:{}),
    verification:populated?'populated-snapshot':refresh.failure??'no-populated-snapshot'};
}

export async function manualLegacyPreservation():Promise<void>{
  if(process.env.WORKSPACE_SURVEYOR_PERSONAL_CANARY!=='1'||process.env.WORKSPACE_SURVEYOR_LEGACY_PRESERVATION!=='1'||
    process.platform!=='win32'||process.versions.node.split('.')[0]!=='24'||process.argv.length!==2||
    !process.stdin.isTTY||!process.stdout.isTTY){
    process.stdout.write('Legacy preservation not enabled or host unsuitable; no operation started.\n');process.exitCode=2;return;
  }
  try{
    const executable=process.env.WORKSPACE_SURVEYOR_HELPER_PWSH??join(process.env.ProgramFiles??'','PowerShell','7','pwsh.exe');
    process.stdout.write('Close Surveyor, Codex and ChatGPT Desktop normally and keep them closed.\n'+
      'Make one authenticated recovery attempt; remove only registered objects if all existing recovery invariants pass.\n'+
      'Only an inventory refusal with no deletion and confirmed exit permits preserving one incident in place.\n'+
      'Read authenticated controls and bounded scratch metadata/security; create one protected unresolved-state declaration.\n'+
      'Only after authenticated recovery or verified preservation, make one normal full-copy acquisition and authenticated cleanup of its new temporary copies.\n'+
      'If preservation is used, the old incident remains unresolved. No browser, private paths or copied contents are printed.\n');
    if(await hiddenInput('Type RESOLVE ONE LEGACY INCIDENT AND VERIFY ONE SNAPSHOT only after founder approval:')!==
      'RESOLVE ONE LEGACY INCIDENT AND VERIFY ONE SNAPSHOT'){
      process.stdout.write('Legacy preservation refused; no operation started.\n');process.exitCode=1;return;
    }
    const store=await resolveOriginalRecoveryStore(executable);
    const result=await resolveLegacyIncident({recover:()=>recoverCanaryWithEvidence({executable,store,synthetic:false,originalLegacy:true}),
      preserve:()=>preserveLegacyStore({executable,store,synthetic:false}),refresh:async()=>{
        const options=await preparePersonalExplorer(windowsDiscoveryArgs([],process.env.USERPROFILE),()=>{},
          {enabled:true,nodeVersion:process.versions.node,executable,scratchParent:realpathSync(tmpdir()),home:homedir()},new AbortController().signal);
        return acquirePersonalSnapshot(options,new AbortController().signal,()=>{},true,text=>process.stdout.write(text+'\n'));
      }});
    process.stdout.write('Legacy incident: '+JSON.stringify(result)+'\n');process.exitCode=result.status==='operational'?0:1;
  }catch{
    process.stdout.write('Legacy preservation stopped; completion was not established. No retry or fallback.\n');process.exitCode=1;
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)void manualLegacyPreservation();
