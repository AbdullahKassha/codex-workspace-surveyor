// Visible Windows launch adapter. Acquisition and source selection stay in the existing entry.
import { spawn } from 'node:child_process';
import { lstatSync, statSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Nominate only this convention; the existing discovery pipeline still checks
// containment, reparse points and all enumeration limits before inspecting it.
export function windowsDiscoveryArgs(args:readonly string[],profile:string|undefined,
  isDirectory:(path:string)=>boolean=path=>{const entry=lstatSync(path);return entry.isDirectory()&&!entry.isSymbolicLink();}):readonly string[]{
  if(args.length%2!==0||args.length>6||args.some((arg,index)=>index%2===0&&arg==='--discovery-root')||!profile||!isAbsolute(profile))return args;
  const root=join(profile,'Documents','Codex');
  try{if(isDirectory(root))return [...args,'--discovery-root',root];}catch{/* Unavailable: no alternative root or automatic retry. */}
  return args;
}

// The session URL travels through stdin, never a shell command or process argument.
export const browserCommand="$ErrorActionPreference='Stop'; try { $url=[Console]::ReadLine(); if ($url -cnotmatch '^http://127\\.0\\.0\\.1:[0-9]{1,5}/#[a-f0-9]{64}$') { exit 1 }; $info=[Diagnostics.ProcessStartInfo]::new($url); $info.UseShellExecute=$true; $opened=[Diagnostics.Process]::Start($info); if ($null -ne $opened) { $opened.Dispose() }; exit 0 } catch { exit 1 }";
export async function openWindowsBrowser(executable:string,url:string,signal:AbortSignal,launch=spawn):Promise<boolean>{
  if(signal.aborted||!/^http:\/\/127\.0\.0\.1:[0-9]{1,5}\/#([a-f0-9]{64})$/.test(url))return false;
  return new Promise(resolve=>{
    const child=launch(executable,['-NoLogo','-NoProfile','-NonInteractive','-Command',browserCommand],
      {shell:false,windowsHide:true,stdio:['pipe','ignore','ignore']});
    let settled=false;
    const finish=(opened:boolean)=>{
      if(settled)return;settled=true;clearTimeout(timer);signal.removeEventListener('abort',cancel);
      child.stdin.destroy();child.unref();resolve(opened);
    };
    const cancel=()=>finish(false),timer=setTimeout(cancel,5000);
    child.on('error',cancel);child.stdin.on('error',cancel);child.on('close',code=>finish(code===0));
    signal.addEventListener('abort',cancel,{once:true});
    if(signal.aborted)cancel();else child.stdin.end(url+'\n');
  });
}

export function launchPrerequisite(context:{platform:string;nodeVersion:string;terminal:boolean;executable:string},
  isFile:(path:string)=>boolean):string|undefined {
  if(context.platform!=='win32')return 'This launcher requires native Windows.';
  if(context.nodeVersion.split('.')[0]!=='24')return 'Node.js 24 is required on PATH. Use the README setup, then launch again.';
  if(!context.terminal)return 'Launch by double-clicking Workspace Surveyor.cmd in a visible console. For a terminal, use the standalone entry.';
  if(!isAbsolute(context.executable)||!/\\pwsh\.exe$/i.test(context.executable.replaceAll('/','\\'))||!isFile(context.executable))
    return 'PowerShell 7 is unavailable. Use the README setup; for a nonstandard installation set WORKSPACE_SURVEYOR_HELPER_PWSH to its absolute pwsh.exe path.';
  return undefined;
}

// Only allowlisted outcomes are translated; no paths, tokens, raw errors or private values.
export function launchReport(raw:string):string {
  try{
    const r=JSON.parse(raw);
    const cleanup=r.safety?.cleanup,recovery=r.safety?.recovery;
    const uncertain=cleanup!==undefined&&cleanup!=='removed'||recovery!==undefined&&recovery!=='removed'||
      Object.values(r.fixtureCleanup??{}).includes('residual');
    let message=r.cancelled?'Inspection cancelled. No further browser delivery.':r.status==='passed'?'Local session finished.':
      r.safety?.reason==='closure'||r.safety?.evidence?.phase==='closure'?
        'Inspection refused: close Codex and ChatGPT Desktop normally, then launch again. Nothing was closed automatically.':
      r.safety?.reason==='limit'?'Inspection refused: a source or metadata limit was exceeded. No snapshot was delivered. Use the standalone entry for sanitized diagnostics.':
      r.reason==='acquisition'?'Inspection refused. Close Codex and ChatGPT Desktop normally; check source availability and compatibility. Use the standalone entry for sanitized diagnostics.':
        'Local session could not be delivered. Use the standalone entry for sanitized diagnostics.';
    if(uncertain)message+=' Cleanup/recovery was not confirmed. Another inspection may still be acquiring, or recovery controls may remain. Wait for the other inspection to finish; if refusal persists, use the documented explicit recovery procedure. Do not delete controls manually.';
    else if(r.safety?.attemptConsumed===false)message+=' Acquisition did not start.';
    else if(cleanup==='removed'&&recovery==='removed')message+=' Protected temporary-copy cleanup and recovery removal confirmed.';
    return message;
  }catch{return 'Launch could not be completed. Use the standalone entry for sanitized diagnostics.';}
}

async function main():Promise<void>{
  try{
    const executable=process.env.WORKSPACE_SURVEYOR_HELPER_PWSH??join(process.env.ProgramFiles??'','PowerShell','7','pwsh.exe');
    const refused=launchPrerequisite({platform:process.platform,nodeVersion:process.versions.node,
      terminal:!!process.stdin.isTTY&&!!process.stdout.isTTY,executable},path=>{try{return statSync(path).isFile();}catch{return false;}});
    if(refused){console.log(refused);process.exitCode=1;return;}
    console.log('Close Codex and ChatGPT Desktop normally before inspection. Browser chatgpt.com may remain open.');
    console.log('Preparing one protected local snapshot. Full copies may contain unselected private data. IDs, titles and paths are displayed in the temporary local browser. No automatic retry.');
    const {manualPersonalExplorer}=await import('./personal-explorer-entry.js');
    await manualPersonalExplorer({args:windowsDiscoveryArgs(process.argv.slice(2),process.env.USERPROFILE),
      openBrowser:(url,signal)=>openWindowsBrowser(executable,url,signal),
      write:text=>console.log(text.startsWith('{')?launchReport(text):text)});
  }catch{console.log('Launch could not be completed. Check compiled output and prerequisites using the README setup or standalone entry.');process.exitCode=1;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)void main();
