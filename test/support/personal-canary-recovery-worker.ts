// Synthetic restart test only. Private bounded pipes; never forward them as diagnostics.
import { lstatSync } from 'node:fs';
import { recoverCanary, runCanary } from './personal-canary.js';

async function main():Promise<void>{
  if(process.env.WORKSPACE_SURVEYOR_RUN_CANARY_PREPARATION!=='1')throw new Error('Refused');
  let input='';for await(const chunk of process.stdin){input+=String(chunk);if(Buffer.byteLength(input)>8192)throw new Error('Refused');}
  const request=JSON.parse(input);
  if(request.operation==='recover'){
    const status=await recoverCanary({store:request.store,executable:request.executable,synthetic:true});
    process.stdout.write(JSON.stringify({stage:'result',status})+'\n');return;
  }
  if(request.operation!=='run'||!['cleanup','missing','malformed'].includes(request.failure))throw new Error('Refused');
  const result=await runCanary({executable:request.executable,selection:{kind:'synthetic',fixture:request.fixture},closure:()=> 'absent',
    hook:(phase,scratch)=>{if(phase==='initialized'){
      const id=lstatSync(scratch.root!,{bigint:true});
      process.stdout.write(JSON.stringify({stage:'owned',root:scratch.root,nonce:scratch.nonce,dev:id.dev.toString(),ino:id.ino.toString()})+'\n');
    }},
    ...(request.failure==='cleanup'?{cleanupFault:(phase:string)=>{if(phase==='file')throw new Error('SYNTHETIC_PRIVATE_RECOVERY');}}:
      {corruptFrame:(raw:string)=>JSON.parse(raw).stage==='finished'?(request.failure==='missing'?'':JSON.stringify({...JSON.parse(raw),private:'SYNTHETIC_PRIVATE_RECOVERY'})):raw})});
  process.stdout.write(JSON.stringify({stage:'result',result})+'\n');
}
main().catch(()=>{process.stdout.write('{"stage":"refused"}\n');process.exitCode=1;});
