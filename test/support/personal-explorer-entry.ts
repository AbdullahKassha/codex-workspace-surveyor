// Explicit local read-only launch; never started automatically or by tests on real state.
import { pathToFileURL } from 'node:url';
import { realpathSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { runExplorerEntry } from './explorer-entry.js';
import { runPersonalExplorer, explorerPreflightSafety, validPersonalMapSource, type CanaryOptions } from './personal-canary.js';
import { serveLocalExplorer } from '../../src/explorer/server.js';
import { escapeStored } from '../../src/explorer/view.js';
import { enrichExplorerSnapshot, validDiscoveryRoot } from '../../src/explorer/discovery.js';

type Context={enabled:boolean;nodeVersion:string;executable:string;scratchParent:string;home:string};
function active(signal:AbortSignal):void {if(signal.aborted)throw new Error('Preflight refused');}
// Pure selection preparation: no source, settings or recovery access/helper startup.
export async function preparePersonalExplorer(args:readonly string[],display:(text:string)=>void,
  context:Context,signal:AbortSignal):Promise<CanaryOptions & {discoveryRoot?:string}>{
  try{
    active(signal);
    if(!context.enabled||context.nodeVersion.split('.')[0]!=='24'||!validPersonalMapSource(context.executable)||
      !/\\pwsh\.exe$/i.test(context.executable.replaceAll('/','\\'))||!validPersonalMapSource(context.scratchParent))throw new Error('Preflight refused');
    if(args.length%2!==0||args.length>8)throw new Error('Preflight refused');
    const selected=new Map<string,string>();
    for(let i=0;i<args.length;i+=2){const key=args[i]!,value=args[i+1]!;
      if(!['--source','--global-state','--session-index','--discovery-root'].includes(key)||selected.has(key)||
        (key==='--discovery-root'?!validDiscoveryRoot(value):!validPersonalMapSource(value)))throw new Error('Preflight refused');
      selected.set(key,value);}
    if(['--source','--global-state','--session-index'].some(key=>!selected.has(key))&&!validPersonalMapSource(context.home))throw new Error('Preflight refused');
    const source=selected.get('--source')??join(context.home,'.codex','state_5.sqlite');
    const globalState=selected.get('--global-state')??join(context.home,'.codex','.codex-global-state.json');
    const sessionIndex=selected.get('--session-index')??join(context.home,'.codex','session_index.jsonl');
    if(!validPersonalMapSource(source)||!validPersonalMapSource(globalState)||!validPersonalMapSource(sessionIndex))throw new Error('Preflight refused');
    display('Local read-only titled-thread browser. Launching requests inspection; no background inspection or automatic retry.\n'+
      'Close local ChatGPT Desktop and Codex normally. Browser chatgpt.com may remain open.\n'+
      'Full copies expose unselected data. IDs, exact CWDs and stored titles may appear in the local browser.\n'+
      'Local Projects, titles, CWDs and inferred user-facing Threads. No saved selection or dataset export/persistence.\n'+
      'Selected database: '+escapeStored(source)+'\n'+
      'Selected Project metadata: '+escapeStored(globalState)+' (override with --global-state)\n'+
      'Selected title metadata: '+escapeStored(sessionIndex)+' (override with --session-index)\n'+
      (selected.has('--discovery-root')?'Folder discovery root: '+escapeStored(selected.get('--discovery-root')!)+'\nBounded folder and Git metadata inspection; exact declared locations and Git-referenced worktrees may be outside this root.\n':'Folder/Git discovery disabled; use --discovery-root <absolute-local-folder> for this invocation.\n')+
      'The default is a convention, not discovered storage. If missing or incompatible, select an exact path with --source; no alternative search occurs.\n'+
      'Temporary parent: '+escapeStored(context.scratchParent)+'\nClosure names: ChatGPT,Codex\n'+
      'Recovery policy: Windows Local Application Data / WorkspaceSurveyor-Canary-Recovery.\n');
    active(signal);
    return {...(selected.has('--discovery-root')?{discoveryRoot:selected.get('--discovery-root')!}:{}),executable:context.executable,analysis:'explorer',explorer:{globalState,sessionIndex},selection:{kind:'personal',private:{source,
      scratchParent:context.scratchParent,writers:['ChatGPT','Codex'],consent:true,actualValueConsent:true,
      titleConsent:true,browserConsent:true}}};
  }catch{throw new Error('Preflight refused');}
}

export async function manualPersonalExplorer(launch?:{
  args:readonly string[];
  openBrowser:(url:string,signal:AbortSignal)=>Promise<boolean>;
  write:(text:string)=>void;
}):Promise<void>{
  process.exitCode=await runExplorerEntry({personal:true,signals:process,start:serveLocalExplorer,write:launch?.write??(text=>console.log(text)),
    ...(launch?{openBrowser:launch.openBrowser}:{}),
    createFixture:()=>({acquire:async signal=>{
      let options:CanaryOptions & {discoveryRoot?:string};
      try{
        if(!process.stdin.isTTY||!process.stdout.isTTY)throw new Error('Preflight refused');
        const executable=process.env.WORKSPACE_SURVEYOR_HELPER_PWSH??join(process.env.ProgramFiles??'','PowerShell','7','pwsh.exe');
        options=await preparePersonalExplorer(launch?.args??process.argv.slice(2),launch?()=>{}:text=>process.stdout.write(text),{
          enabled:true,nodeVersion:process.versions.node,executable,scratchParent:realpathSync(tmpdir()),home:homedir()},signal);
        active(signal);
        if(launch)launch.write(options.discoveryRoot?
          'Folder discovery root: '+escapeStored(options.discoveryRoot)+'\nBounded folder and Git metadata inspection; exact declared locations and Git-referenced worktrees may be outside this root.':
          'Standalone folder discovery is not enabled: %USERPROFILE%\\Documents\\Codex is unavailable. Project/Thread inspection remains enabled. No alternative root was searched.');
      }catch{return {safety:explorerPreflightSafety};}
      // After the coordinator starts, cancellation withholds delivery but never aborts cleanup.
      const result=await runPersonalExplorer(options);
      // Enrichment starts only after the unchanged coordinator has verified and
      // removed protected copies and released its acquisition/recovery handles.
      if(result.snapshot&&options.discoveryRoot){
        try{result.snapshot=await enrichExplorerSnapshot(result.snapshot,{root:options.discoveryRoot,signal,executable:options.executable});}
        catch{result.snapshot.discard();delete result.snapshot;}
      }
      return result;
    }})});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)void manualPersonalExplorer();
