// Private, separately authorized standalone entry. Never imported by product code.
import { pathToFileURL } from 'node:url';
import { realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { runCanary, validPersonalMapSource, type CanaryOptions } from './personal-canary.js';

type TerminalInput=Pick<NodeJS.ReadStream,'isTTY'|'setRawMode'|'setEncoding'|'resume'|'pause'|'on'|'off'>;
type TerminalOutput=Pick<NodeJS.WriteStream,'isTTY'|'write'>;
export async function visibleMapInput(prompt:string,input:TerminalInput=process.stdin,output:TerminalOutput=process.stdout):Promise<string>{
  if(!input.isTTY||!output.isTTY)throw new Error('Local terminal required');
  output.write(prompt+'\n');
  return new Promise<string>((done,reject)=>{
    let value='';let finished=false;
    const finish=(ok:boolean):void=>{
      if(finished)return;finished=true;
      input.off('data',read);input.off('end',cancel);input.off('error',cancel);
      input.setRawMode(false);input.pause();output.write('\n');
      if(ok)done(value);else reject(new Error('Input refused'));
    };
    const cancel=():void=>finish(false);
    const read=(data:string):void=>{
      for(const char of data){
        if(char==='\r'||char==='\n'){finish(true);return;}
        if(char==='\b'||char==='\u007f'){
          if(value.length){value=[...value].slice(0,-1).join('');output.write('\b \b');}continue;
        }
        if(/[\x00-\x1f\x80-\x9f\u2028\u2029]/.test(char)||value.length+char.length>2048){finish(false);return;}
        value+=char;output.write(char);
      }
    };
    input.setRawMode(true);input.setEncoding('utf8');
    input.on('data',read);input.on('end',cancel);input.on('error',cancel);input.resume();
  });
}

export const mapPreflightRefusal=Object.freeze({status:'refused',reason:'preflight',attemptConsumed:false,mapping:null});
type Context={enabled:boolean;nodeVersion:string;executable:string;scratchParent:string};
// Pure preparation seam: tests provide invented input, with no personal operation.
export async function preparePersonalMap(input:(prompt:string)=>Promise<string>,display:(text:string)=>void,context:Context):Promise<CanaryOptions>{
  if(!context.enabled||context.nodeVersion!=='24.18.1'||!validPersonalMapSource(context.executable)||
    !/\\pwsh\.exe$/i.test(context.executable.replaceAll('/','\\'))||!validPersonalMapSource(context.scratchParent))throw new Error('Preflight refused');
  display('One separately authorized private map attempt. Use an unrecorded terminal.\n'+
    'Close local ChatGPT Desktop and Codex normally; keep them closed until completion.\n'+
    'Full copies can contain unselected sensitive data. Actual ID/CWD values stay in memory.\n');
  const source=await input('Enter the exact separately authorized database path (visible locally):');
  if(!validPersonalMapSource(source))throw new Error('Input refused');
  display('Temporary parent: '+context.scratchParent+'\nClosure names: ChatGPT,Codex\n'+
    'Recovery policy: Windows Local Application Data / WorkspaceSurveyor-Canary-Recovery.\n');
  if(await input('Confirm actual-value access and the approved scope by typing AUTHORIZE ONE PRIVATE MAP RUN:')!=='AUTHORIZE ONE PRIVATE MAP RUN')throw new Error('Consent refused');
  return {executable:context.executable,analysis:'thread-cwd',selection:{kind:'personal',private:{
    source,scratchParent:context.scratchParent,writers:['ChatGPT','Codex'],consent:true,actualValueConsent:true}}};
}

export async function manualThreadCwd():Promise<void>{
  let options:CanaryOptions;
  try{
    if(process.argv.length!==2||!process.stdin.isTTY||!process.stdout.isTTY||
      process.env.WORKSPACE_SURVEYOR_PERSONAL_CANARY!=='1'||process.env.WORKSPACE_SURVEYOR_PERSONAL_THREAD_CWD!=='1')throw new Error('Preflight refused');
    options=await preparePersonalMap(visibleMapInput,text=>process.stdout.write(text),{
      enabled:true,nodeVersion:process.versions.node,executable:process.env.WORKSPACE_SURVEYOR_HELPER_PWSH??'',
      scratchParent:realpathSync(tmpdir())});
  }catch{
    process.stdout.write(JSON.stringify(mapPreflightRefusal)+'\n');process.exitCode=1;return;
  }
  // runCanary owns the boundary flag, including unexpected post-boundary exceptions.
  const result=await runCanary(options);
  process.stdout.write(JSON.stringify(result)+'\n');process.exitCode=result.status==='passed'?0:1;
  if(result.cleanup==='residual')process.stdout.write('Residual state. Use the existing RECOVER entry only under the new run\'s explicit recovery allowance.\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)void manualThreadCwd();
