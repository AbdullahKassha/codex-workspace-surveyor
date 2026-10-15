// Incident-specific private workflow. No personal execution without separate approval.
import { pathToFileURL } from 'node:url';
import { realpathSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { hiddenInput } from './personal-canary-entry.js';
import { recoverCanaryWithEvidence, resolvePersonalRecoveryStore, type RecoveryReport } from './personal-canary.js';
import { acquirePersonalSnapshot, preparePersonalExplorer } from './personal-explorer-entry.js';
import { windowsDiscoveryArgs } from './windows-explorer-entry.js';
import type { RefreshResult } from '../../src/explorer/session.js';

type Resolution=Readonly<{status:'restored'|'blocked'|'verification-failed'|'snapshot-empty';
  recovery:RecoveryReport;refresh?:RefreshResult['failure'];populated?:boolean}>;
// One recovery (which includes assessment), then at most one normal Refresh.
// No diagnostic/recovery retries, inventory exceptions, alternative store or cleanup fallback.
export async function resolveRecoveryBlocker(steps:{recover:()=>Promise<RecoveryReport>;refresh:()=>Promise<RefreshResult>}):Promise<Resolution>{
  const recovery=await steps.recover();
  if(recovery.status!=='removed'||recovery.helperExit!=='confirmed'||recovery.category!=='none'||!recovery.deletionAuthorized)return {status:'blocked',recovery};
  const result=await steps.refresh();
  if(result.failure||!result.snapshot){result.snapshot?.discard();return {status:'verification-failed',recovery,...(result.failure?{refresh:result.failure}:{})};}
  const data=result.snapshot.take();result.snapshot.discard();
  if(!data)return {status:'verification-failed',recovery};
  const populated=data.projects.length>0||data.visibility.some(v=>v==='inferred');
  return {status:populated?'restored':'snapshot-empty',recovery,populated};
}

export async function manualRecoveryResolution():Promise<void>{
  if(process.env.WORKSPACE_SURVEYOR_RECOVERY_RESOLUTION!=='1'||process.env.WORKSPACE_SURVEYOR_PERSONAL_CANARY!=='1'||
    process.argv.length!==2||process.platform!=='win32'||process.versions.node.split('.')[0]!=='24'||
    !process.stdin.isTTY||!process.stdout.isTTY){
    process.stdout.write('Recovery resolution not enabled or host unsuitable; no operation started.\n');process.exitCode=2;return;
  }
  try{
    const executable=process.env.WORKSPACE_SURVEYOR_HELPER_PWSH??join(process.env.ProgramFiles??'','PowerShell','7','pwsh.exe');
    process.stdout.write('One separately approved recovery and, only after removal, one normal Refresh.\n'+
      'Close Surveyor sessions, Codex and ChatGPT Desktop normally before proceeding. No process is closed automatically.\n'+
      'Only authenticated registered temporary objects may be removed. Unknown entries stop this workflow untouched.\n'+
      'Refresh makes full protected copies of the standard Codex database, Project metadata and optional title index.\n'+
      'Findings stay in memory; only sanitized recovery status and snapshot-presence results are printed. No browser is opened.\n');
    if(await hiddenInput('Type AUTHORIZE ONE RECOVERY AND ONE REFRESH only after founder approval:')!=='AUTHORIZE ONE RECOVERY AND ONE REFRESH'){
      process.stdout.write('Recovery resolution refused; no operation started.\n');process.exitCode=1;return;
    }
    // Prepare the exact existing launcher selection before any personal source/store access.
    // Root nomination is the same bounded conventional folder check as the normal launcher.
    const args=windowsDiscoveryArgs([],process.env.USERPROFILE);
    const options=await preparePersonalExplorer(args,()=>{},{enabled:true,nodeVersion:process.versions.node,executable,
      scratchParent:realpathSync(tmpdir()),home:homedir()},new AbortController().signal);
    const store=await resolvePersonalRecoveryStore(executable);
    const result=await resolveRecoveryBlocker({recover:()=>recoverCanaryWithEvidence({executable,store,synthetic:false}),
      refresh:()=>acquirePersonalSnapshot(options,new AbortController().signal,()=>{},true,text=>process.stdout.write(text+'\n'))});
    process.stdout.write('Recovery resolution: '+JSON.stringify(result)+'\n');
    if(result.status==='blocked'&&result.recovery.category==='scratch-inventory')process.stdout.write(
      result.recovery.deletionAuthorized?
        'Recovery stopped after authorized steps. Unregistered objects remain untouched; controls were retained. No retry.\n':
        'Authenticated scratch contains unregistered entries. Their ownership is unproven; no mutation was authorized and controls were retained.\n');
    process.exitCode=result.status==='restored'?0:1;
  }catch{process.stdout.write('Recovery resolution stopped; no retry or fallback. Completion was not established.\n');process.exitCode=1;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)void manualRecoveryResolution();
