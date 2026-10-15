// Explicit user-directed disposition. Never attributes unregistered creation.
import { pathToFileURL } from 'node:url';
import { basename, join } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { lstatSync, realpathSync } from 'node:fs';
import { hiddenInput } from './personal-canary-entry.js';
import { disposeLegacyIncident, recoverCanaryWithEvidence, resolveOriginalRecoveryStore, previewLegacyIncident,
  withVerifiedLegacyPreview, type LegacyInventoryPreview } from './personal-canary.js';
import { preparePersonalExplorer, acquirePersonalSnapshot } from './personal-explorer-entry.js';
import { windowsDiscoveryArgs } from './windows-explorer-entry.js';
import type { RefreshResult } from '../../src/explorer/session.js';

export async function closeLegacyIncident(steps:{dispose:()=>ReturnType<typeof disposeLegacyIncident>;refresh:()=>Promise<RefreshResult>}){
  const disposition=await steps.dispose();
  if(disposition.status!=='closed'||disposition.helperExit!=='confirmed'||!disposition.disposalAuthorized)return {status:'blocked',disposition};
  const refresh=await steps.refresh();const data=refresh.failure?undefined:refresh.snapshot?.take();refresh.snapshot?.discard();
  const populated=!!data&&(data.projects.length>0||data.visibility.some(v=>v==='inferred'));
  return {status:populated?'closed-and-operational':'closed-verification-failed',disposition,legacyUnresolved:false,
    verification:populated?'populated-snapshot':refresh.failure??'no-populated-snapshot'};
}
function terminalValue(value:string):string{
  return /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(value)?JSON.stringify(value).replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu,
    c=>'\\u{'+c.codePointAt(0)!.toString(16)+'}')+' (escaped)':value;
}
export function legacyInventoryText(preview:LegacyInventoryPreview):string{
  return ['Authenticated legacy inventory (local display only).',
    'Incident root: '+terminalValue(preview.root),
    ...preview.objects.flatMap((object,i)=>[String(i+1)+'. '+object.kind+' | '+(object.registered?'registered':'unregistered')+
      ' | '+(object.size===null?'size not applicable':object.size+' bytes'),
      '   Name: '+terminalValue(basename(object.path)),'   Path: '+terminalValue(object.path)]),
    'Objects remaining (including root): '+preview.objects.length+'; aggregate file bytes: '+preview.totalBytes+'.',
    'Previously receipted removals: '+preview.previouslyRemoved+'.',
    'Unregistered objects have no authenticated creation provenance. Preview grants no disposal permission.',
    'The root and listed objects are the legacy disposition targets. Stage 2 also permits protected control retirement,',
    'any necessary authenticated active-copy recovery, and one normal verification acquisition/cleanup.'].join('\n')+'\n';
}
export async function reviewLegacyClosure(steps:{inspect:()=>Promise<LegacyInventoryPreview|undefined>;
  display:(preview:LegacyInventoryPreview)=>void;confirm:()=>Promise<boolean>;
  revalidate:(preview:LegacyInventoryPreview)=>Promise<boolean>;
  dispose:(preview:LegacyInventoryPreview)=>ReturnType<typeof disposeLegacyIncident>;refresh:()=>Promise<RefreshResult>}){
  const preview=await steps.inspect();if(!preview)return {status:'blocked',stage:'inspection'};
  steps.display(preview);if(!await steps.confirm())return {status:'cancelled',stage:'confirmation'};
  if(!await steps.revalidate(preview))return {status:'blocked',stage:'revalidation'};
  return closeLegacyIncident({dispose:()=>steps.dispose(preview),refresh:steps.refresh});
}
export async function manualLegacyDisposal():Promise<void>{
  if(process.env.WORKSPACE_SURVEYOR_PERSONAL_CANARY!=='1'||process.env.WORKSPACE_SURVEYOR_LEGACY_PRESERVATION!=='1'||
    process.env.WORKSPACE_SURVEYOR_LEGACY_INSPECTION!=='1'||
    process.platform!=='win32'||process.versions.node.split('.')[0]!=='24'||process.argv.length!==2||
    !process.stdin.isTTY||!process.stdout.isTTY){
    process.stdout.write('Legacy inspection not enabled or host unsuitable; no operation started.\n');process.exitCode=2;return;
  }
  try{
    const executable=process.env.WORKSPACE_SURVEYOR_HELPER_PWSH??join(process.env.ProgramFiles??'','PowerShell','7','pwsh.exe');
    process.stdout.write('Close Surveyor, Codex and ChatGPT Desktop normally and keep writers closed.\n'+
      'Inspect only authenticated recovery controls, ownership markers and bounded temporary metadata. No old database/session bodies are read.\n'+
      'Stage 1 authenticates and displays the exact bounded legacy inventory locally. No recovery, writes, disposal or Refresh.\n'+
      'Use an unrecorded terminal; do not redirect output or start a transcript. Paths will appear in local terminal scrollback.\n'+
      'Stage 2 separately authorizes disposal of the displayed incident, including unregistered objects whose creator is unknown.\n'+
      'Maximum: one existing temporary root, 17 entries, 65 MiB. Changed, unsafe or unexpected objects stop disposal.\n'+
      'Persist authenticated disposal intent before deletion; retire controls only after positive absence and confirmed helper exit.\n'+
      'Then verify one new normal full-copy snapshot and authenticated cleanup. No retries, permission repair or source mutation.\n');
    if(await hiddenInput('Type INSPECT THIS PRESERVED INCIDENT to authorize read-only inspection:').catch(()=> '')!==
      'INSPECT THIS PRESERVED INCIDENT'){
      process.stdout.write('Legacy inspection declined; no operation started.\n');process.exitCode=1;return;
    }
    const store=await resolveOriginalRecoveryStore(executable),active=store+'-Active';
    const inspection={store,executable,synthetic:false};
    const result=await reviewLegacyClosure({inspect:()=>previewLegacyIncident(inspection),
      display:preview=>process.stdout.write(legacyInventoryText(preview)),
      confirm:async()=>await hiddenInput('Type DISPOSE THE DISPLAYED INCIDENT AND VERIFY ONE SNAPSHOT to authorize irreversible disposal, or anything else to cancel:').catch(()=> '')===
        'DISPOSE THE DISPLAYED INCIDENT AND VERIFY ONE SNAPSHOT',
      revalidate:preview=>withVerifiedLegacyPreview(inspection,preview,async()=>{
        if(process.env.WORKSPACE_SURVEYOR_LEGACY_DISPOSAL!=='1'||process.env.WORKSPACE_SURVEYOR_LEGACY_ACTIVE_RECOVERY!=='1')return false;
        let activePresent=false;
        try{lstatSync(active);activePresent=true;}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
        if(!activePresent)return true;
        const recovery=await recoverCanaryWithEvidence({store:active,executable,synthetic:false,activeLegacy:true});
        if(recovery.status==='removed'&&recovery.category==='none'&&recovery.helperExit==='confirmed'&&recovery.deletionAuthorized)return true;
        process.stdout.write('Active recovery: '+JSON.stringify(recovery)+'\n');return false;
      }),
      dispose:preview=>disposeLegacyIncident({store,executable,synthetic:false,preview,authorize:async()=>true}),
      refresh:async()=>{
        const options=await preparePersonalExplorer(windowsDiscoveryArgs([],process.env.USERPROFILE),()=>{},
          {enabled:true,nodeVersion:process.versions.node,executable,scratchParent:realpathSync(tmpdir()),home:homedir()},new AbortController().signal);
        return acquirePersonalSnapshot(options,new AbortController().signal,()=>{},true,text=>process.stdout.write(text+'\n'));
      }});
    process.stdout.write('Legacy closure: '+JSON.stringify(result)+'\n');process.exitCode=result.status==='closed-and-operational'?0:1;
  }catch{
    process.stdout.write('Legacy closure stopped; completion was not established. Keep controls; no automatic retry or fallback.\n');process.exitCode=1;
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)void manualLegacyDisposal();
