import { spawn } from 'node:child_process';

// Advisory, read-only early refusal. No paths, IDs, command lines or process control.
// The acquisition helper still performs all of its authoritative closure checks.
export const desktopClosureCommand="$ErrorActionPreference='Stop'; try { foreach ($name in @('ChatGPT','Codex')) { $items=[Diagnostics.Process]::GetProcessesByName($name); try { if ($items.Length -gt 0) { [Console]::Out.WriteLine('present'); exit 0 } } finally { foreach ($item in $items) { $item.Dispose() } } }; [Console]::Out.WriteLine('absent'); exit 0 } catch { exit 1 }";
export type DesktopClosure='absent'|'present'|'unknown';
export function explorerDesktopClosure(executable:string,launch=spawn):Promise<DesktopClosure>{
  return new Promise(resolve=>{
    let child:ReturnType<typeof spawn>;
    try{child=launch(executable,['-NoLogo','-NoProfile','-NonInteractive','-Command',desktopClosureCommand],
      {shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});}
    catch{resolve('unknown');return;}
    let output='',settled=false;
    const finish=(result:DesktopClosure)=>{
      if(settled)return;settled=true;clearTimeout(timer);
      child.stdout?.destroy();child.stderr?.destroy();child.unref();resolve(result);
    };
    const timer=setTimeout(()=>finish('unknown'),5000);
    child.on('error',()=>finish('unknown'));
    child.stdout?.on('error',()=>finish('unknown'));child.stderr?.on('error',()=>finish('unknown'));
    child.stderr?.on('data',()=>finish('unknown'));
    child.stdout?.on('data',(data:Buffer)=>{
      output+=data.toString('utf8');if(Buffer.byteLength(output)>32)finish('unknown');
    });
    // Only confirmed process exit and an exact bounded response can permit setup.
    child.on('close',code=>finish(code===0&&/^(absent|present)\r?\n$/.test(output)?output.trim() as DesktopClosure:'unknown'));
  });
}
