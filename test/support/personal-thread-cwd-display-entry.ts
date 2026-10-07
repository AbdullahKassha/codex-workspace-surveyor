// Private local display preparation. Personal execution requires a fresh authorization.
import { pathToFileURL } from 'node:url';
import { realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { runThreadCwdDisplay, validPersonalMapSource, type CanaryOptions } from './personal-canary.js';
import { visibleMapInput, mapPreflightRefusal } from './personal-thread-cwd-entry.js';
import { viewLocalMap, supportedTerminal, quoteStored } from './local-thread-cwd-viewer.js';

type Context={enabled:boolean;terminalSupported:boolean;nodeVersion:string;executable:string;scratchParent:string};
export async function prepareLocalDisplay(input:(prompt:string)=>Promise<string>,display:(text:string)=>void,context:Context):Promise<CanaryOptions>{
  if(!context.enabled||!context.terminalSupported||context.nodeVersion!=='24.18.1'||!validPersonalMapSource(context.executable)||
    !/\\pwsh\.exe$/i.test(context.executable.replaceAll('/','\\'))||!validPersonalMapSource(context.scratchParent))throw new Error('Preflight refused');
  display('One separately authorized acquisition AND local value display. Use an unrecorded terminal.\n'+
    'Close local ChatGPT Desktop and Codex normally. Browser chatgpt.com may remain open.\n'+
    'Whole copies contain unselected data. The viewer shows escaped IDs and stored CWDs.\n'+
    'No file export, deliberate scrollback transcript or network output is created.\n'+
    'Terminal recording, screenshots and external capture cannot be prevented.\n');
  const source=await input('Enter the exact separately authorized database path (visible locally):');
  if(!validPersonalMapSource(source))throw new Error('Input refused');
  display('Temporary parent: '+quoteStored(context.scratchParent)+'\nClosure names: ChatGPT,Codex\n'+
    'Recovery policy: Windows Local Application Data / WorkspaceSurveyor-Canary-Recovery.\n');
  if(await input('Confirm fresh read-and-display permission by typing AUTHORIZE ONE LOCAL MAP DISPLAY:')!=='AUTHORIZE ONE LOCAL MAP DISPLAY')throw new Error('Consent refused');
  return {executable:context.executable,analysis:'thread-cwd',selection:{kind:'personal',private:{source,
    scratchParent:context.scratchParent,writers:['ChatGPT','Codex'],consent:true,actualValueConsent:true,displayConsent:true}}};
}
export async function manualLocalDisplay():Promise<void>{
  let options:CanaryOptions;
  try{
    if(process.argv.length!==2||!process.stdin.isTTY||!process.stdout.isTTY||
      !Number.isInteger(process.stdout.columns)||!Number.isInteger(process.stdout.rows)||process.stdout.columns<40||process.stdout.rows<24||
      process.env.WORKSPACE_SURVEYOR_PERSONAL_CANARY!=='1'||process.env.WORKSPACE_SURVEYOR_PERSONAL_THREAD_CWD!=='1'||
      process.env.WORKSPACE_SURVEYOR_PERSONAL_THREAD_CWD_DISPLAY!=='1')throw new Error('Preflight refused');
    options=await prepareLocalDisplay(visibleMapInput,text=>process.stdout.write(text),{enabled:true,
      terminalSupported:supportedTerminal(process.env),nodeVersion:process.versions.node,
      executable:process.env.WORKSPACE_SURVEYOR_HELPER_PWSH??'',scratchParent:realpathSync(tmpdir())});
  }catch{process.stdout.write(JSON.stringify({...mapPreflightRefusal,display:'refused'})+'\n');process.exitCode=1;return;}
  const delivery=await runThreadCwdDisplay(options);
  let display:'closed'|'refused'|'failed'|'unavailable'='unavailable';
  try{
    const capability=delivery.takeDisplay();
    if(capability)display=await viewLocalMap(capability,{input:process.stdin,output:process.stdout,supported:supportedTerminal(process.env)});
  }catch{display='failed';}finally{delivery.discard();}
  process.stdout.write(JSON.stringify({...delivery.safety,display})+'\n');
  process.exitCode=delivery.safety.status==='passed'&&display==='closed'?0:1;
  if(delivery.safety.cleanup==='residual')process.stdout.write('Residual state. Use RECOVER only under this run\'s explicit recovery allowance.\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)void manualLocalDisplay();
