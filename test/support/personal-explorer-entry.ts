// Explicit local read-only launch; never started automatically or by tests on real state.
import { pathToFileURL } from 'node:url';
import { realpathSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { runExplorerEntry } from './explorer-entry.js';
import { runPersonalExplorer, explorerPreflightSafety, validPersonalMapSource, type CanaryOptions } from './personal-canary.js';
import { serveLocalExplorer } from '../../src/explorer/server.js';
import { escapeStored } from '../../src/explorer/view.js';

type Context={enabled:boolean;nodeVersion:string;executable:string;scratchParent:string;home:string};
function active(signal:AbortSignal):void {if(signal.aborted)throw new Error('Preflight refused');}
// Pure selection preparation: no source, settings or recovery access/helper startup.
export async function preparePersonalExplorer(args:readonly string[],display:(text:string)=>void,
  context:Context,signal:AbortSignal):Promise<CanaryOptions>{
  try{
    active(signal);
    if(!context.enabled||context.nodeVersion.split('.')[0]!=='24'||!validPersonalMapSource(context.executable)||
      !/\\pwsh\.exe$/i.test(context.executable.replaceAll('/','\\'))||!validPersonalMapSource(context.scratchParent))throw new Error('Preflight refused');
    if(args.length!==0&&(args.length!==2||args[0]!=='--source'))throw new Error('Preflight refused');
    if(args.length===0&&!validPersonalMapSource(context.home))throw new Error('Preflight refused');
    const source=args.length===0?join(context.home,'.codex','state_5.sqlite'):args[1]!;
    if(!validPersonalMapSource(source))throw new Error('Preflight refused');
    display('Local read-only titled-thread browser. Launching requests inspection; no background inspection or automatic retry.\n'+
      'Close local ChatGPT Desktop and Codex normally. Browser chatgpt.com may remain open.\n'+
      'Full copies expose unselected data. IDs, exact CWDs and stored titles may appear in the local browser.\n'+
      'Projects remain unavailable. No saved selection, JSON source or dataset export/persistence.\n'+
      'Selected database: '+escapeStored(source)+'\n'+
      'The default is a convention, not discovered storage. If missing or incompatible, select an exact path with --source; no alternative search occurs.\n'+
      'Temporary parent: '+escapeStored(context.scratchParent)+'\nClosure names: ChatGPT,Codex\n'+
      'Recovery policy: Windows Local Application Data / WorkspaceSurveyor-Canary-Recovery.\n');
    active(signal);
    return {executable:context.executable,analysis:'explorer',selection:{kind:'personal',private:{source,
      scratchParent:context.scratchParent,writers:['ChatGPT','Codex'],consent:true,actualValueConsent:true,
      titleConsent:true,browserConsent:true}}};
  }catch{throw new Error('Preflight refused');}
}

export async function manualPersonalExplorer():Promise<void>{
  process.exitCode=await runExplorerEntry({personal:true,signals:process,start:serveLocalExplorer,write:text=>console.log(text),
    createFixture:()=>({acquire:async signal=>{
      let options:CanaryOptions;
      try{
        if(!process.stdin.isTTY||!process.stdout.isTTY)throw new Error('Preflight refused');
        const executable=process.env.WORKSPACE_SURVEYOR_HELPER_PWSH??join(process.env.ProgramFiles??'','PowerShell','7','pwsh.exe');
        options=await preparePersonalExplorer(process.argv.slice(2),text=>process.stdout.write(text),{
          enabled:true,nodeVersion:process.versions.node,executable,scratchParent:realpathSync(tmpdir()),home:homedir()},signal);
        active(signal);
      }catch{return {safety:explorerPreflightSafety};}
      // After the coordinator starts, cancellation withholds delivery but never aborts cleanup.
      return runPersonalExplorer(options);
    }})});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)void manualPersonalExplorer();
