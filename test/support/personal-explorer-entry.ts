// Private preparation only. Real use requires separately reviewed read/browser consent.
import { pathToFileURL } from 'node:url';
import { realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import type { EventEmitter } from 'node:events';
import { runExplorerEntry } from './explorer-entry.js';
import { runPersonalExplorer, explorerPreflightSafety, validPersonalMapSource, type CanaryOptions } from './personal-canary.js';
import { serveLocalExplorer } from '../../src/explorer/server.js';
import { escapeStored } from '../../src/explorer/view.js';

type Context={enabled:boolean;nodeVersion:string;executable:string;scratchParent:string};
function active(signal:AbortSignal):void {if(signal.aborted)throw new Error('Preflight refused');}
// Pure input preparation: source/recovery metadata and helper startup are excluded.
export async function preparePersonalExplorer(input:(prompt:string)=>Promise<string>,display:(text:string)=>void,
  context:Context,signal:AbortSignal):Promise<CanaryOptions>{
  try{
  active(signal);
  if(!context.enabled||context.nodeVersion!=='24.18.1'||!validPersonalMapSource(context.executable)||
    !/\\pwsh\.exe$/i.test(context.executable.replaceAll('/','\\'))||!validPersonalMapSource(context.scratchParent))throw new Error('Preflight refused');
  display('One separately authorized titled-thread acquisition and local browser display. Use an unrecorded terminal.\n'+
    'Close local ChatGPT Desktop and Codex normally. Browser chatgpt.com may remain open.\n'+
    'Full copies expose unselected data. IDs, exact CWDs and stored titles may appear in the local browser.\n'+
    'Projects remain unavailable. No JSON source, export or persistence is permitted.\n');
  const source=await input('Enter the exact separately authorized database path (visible locally):');
  active(signal);if(!validPersonalMapSource(source))throw new Error('Input refused');
  display('Temporary parent: '+escapeStored(context.scratchParent)+'\nClosure names: ChatGPT,Codex\n'+
    'Recovery policy: Windows Local Application Data / WorkspaceSurveyor-Canary-Recovery.\n');
  if(await input('Confirm fresh title/value/browser permission by typing AUTHORIZE ONE TITLED BROWSER RUN:')!==
    'AUTHORIZE ONE TITLED BROWSER RUN')throw new Error('Consent refused');
  active(signal);
  return {executable:context.executable,analysis:'explorer',selection:{kind:'personal',private:{source,
    scratchParent:context.scratchParent,writers:['ChatGPT','Codex'],consent:true,actualValueConsent:true,
    titleConsent:true,browserConsent:true}}};
  }catch{throw new Error('Preflight refused');}
}

type Input=Pick<NodeJS.ReadStream,'isTTY'|'isRaw'|'readable'|'readableEnded'|'destroyed'>&Pick<EventEmitter,'on'|'off'>&{
  setRawMode:(value:boolean)=>unknown;setEncoding:(encoding:BufferEncoding)=>unknown;resume:()=>unknown;pause:()=>unknown};
type Output=Pick<NodeJS.WriteStream,'isTTY'|'write'>;
// Bounded visible prompts; cancellation owns restoration even before input arrives.
export async function visibleExplorerInput(prompt:string,signal:AbortSignal,input:Input=process.stdin,
  output:Output=process.stdout):Promise<string>{
  active(signal);
  if(!input.isTTY||!output.isTTY||!input.readable||input.readableEnded||input.destroyed)throw new Error('Input refused');
  return new Promise<string>((resolve,reject)=>{
    let value='',settled=false;const wasRaw=!!input.isRaw;
    const finish=(ok:boolean)=>{
      if(settled)return;settled=true;
      input.off('data',read);input.off('end',cancel);input.off('close',cancel);input.off('error',cancel);
      signal.removeEventListener('abort',cancel);
      try{input.setRawMode(wasRaw);input.pause();output.write('\n');}catch{ok=false;}
      if(ok)resolve(value);else reject(new Error('Input refused'));
    };
    const cancel=()=>finish(false);
    const read=(chunk:string)=>{
      try{
      for(const char of chunk){
        if(settled)return;
        if(char==='\r'||char==='\n'){finish(true);return;}
        if(char==='\b'||char==='\u007f'){
          if(value.length){value=[...value].slice(0,-1).join('');output.write('\b \b');}continue;
        }
        if(/[\x00-\x1f\x80-\x9f\p{Cf}\u2028\u2029]/u.test(char)||value.length+char.length>2048){cancel();return;}
        value+=char;output.write(char);
      }
      }catch{cancel();}
    };
    try{
      input.on('data',read);input.on('end',cancel);input.on('close',cancel);input.on('error',cancel);
      signal.addEventListener('abort',cancel,{once:true});
      output.write(prompt+'\n');if(settled)return;
      input.setEncoding('utf8');if(settled)return;input.setRawMode(true);
      if(settled){input.setRawMode(wasRaw);input.pause();return;}
      if(signal.aborted||input.readableEnded||input.destroyed||!input.readable){cancel();return;}input.resume();
    }catch{cancel();}
  });
}

export async function manualPersonalExplorer():Promise<void>{
  process.exitCode=await runExplorerEntry({personal:true,signals:process,start:serveLocalExplorer,write:text=>console.log(text),
    createFixture:()=>({acquire:async signal=>{
      let options:CanaryOptions;
      try{
        if(process.argv.length!==2||!process.stdin.isTTY||!process.stdout.isTTY||
          process.env.WORKSPACE_SURVEYOR_PERSONAL_CANARY!=='1'||process.env.WORKSPACE_SURVEYOR_PERSONAL_EXPLORER!=='1')throw new Error('Preflight refused');
        options=await preparePersonalExplorer(prompt=>visibleExplorerInput(prompt,signal),text=>process.stdout.write(text),{
          enabled:true,nodeVersion:process.versions.node,executable:process.env.WORKSPACE_SURVEYOR_HELPER_PWSH??'',
          scratchParent:realpathSync(tmpdir())},signal);
        active(signal);
      }catch{return {safety:explorerPreflightSafety};}
      // After the coordinator starts, cancellation withholds delivery but never aborts cleanup.
      return runPersonalExplorer(options);
    }})});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)void manualPersonalExplorer();
