// Manual external entry only; never a product CLI command or automatic test.
import { pathToFileURL } from 'node:url';
import { realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { runCanary, recoverCanary, resolvePersonalRecoveryStore } from './personal-canary.js';

export async function hiddenInput(prompt:string):Promise<string>{
  if(!process.stdin.isTTY||!process.stdout.isTTY)throw new Error('Local terminal required');
  process.stdout.write(prompt+'\n');
  return new Promise<string>((done,reject)=>{
    let value='';process.stdin.setRawMode(true);process.stdin.setEncoding('utf8');process.stdin.resume();
    const finish=(ok:boolean):void=>{
      process.stdin.off('data',read);process.stdin.setRawMode(false);process.stdin.pause();
      if(ok)done(value);else reject(new Error('Input refused'));
    };
    const read=(data:string):void=>{
      for(const char of data){
        if(char==='\u0003'||char==='\u0004'||char==='\u001b'){finish(false);return;}
        if(char==='\r'||char==='\n'){finish(true);return;}
        if(char==='\u007f'||char==='\b'){value=value.slice(0,-1);continue;}
        if(char.charCodeAt(0)<32||value.length>=2048){finish(false);return;}
        value+=char;
      }
    };
    process.stdin.on('data',read);
  });
}
export async function manualCanary():Promise<void>{
  if(process.env.WORKSPACE_SURVEYOR_PERSONAL_CANARY!=='1'||process.argv.length!==2){
    process.stdout.write('Personal canary not enabled.\n');process.exitCode=2;return;
  }
  try{
    const executable=process.env.WORKSPACE_SURVEYOR_HELPER_PWSH;
    if(!executable)throw new Error('Host not selected');
    const action=await hiddenInput('Type CANARY, QUALIFY, or RECOVER only for the separately authorized action:');
    if(action==='RECOVER'){
      const store=await resolvePersonalRecoveryStore(executable);
      const status=await recoverCanary({executable,store,synthetic:false});
      process.stdout.write('Recovery: '+status+'\n');process.exitCode=status==='removed'?0:1;return;
    }
    if(action!=='CANARY'&&action!=='QUALIFY')throw new Error('Action refused');
    if(action==='QUALIFY'&&process.env.WORKSPACE_SURVEYOR_PERSONAL_QUALIFICATION!=='1')throw new Error('Qualification not enabled');
    process.stdout.write('One reviewed closed-app canary only. Close Codex, CLI sessions and Codex-enabled editors.\n'+
      'Do not restart them until completion. Full copies may include unselected sensitive content.\n'+
      'Input is hidden and retained only in memory. Do not use a recorded or transcribed terminal.\n');
    const source=await hiddenInput('Enter the exact separately authorized database path:');
    const scratchParent=await hiddenInput('Enter the exact separately authorized operating-system temporary parent:');
    if(realpathSync(scratchParent)!==realpathSync(tmpdir()))throw new Error('Scratch refused');
    const writers=(await hiddenInput('Enter the reviewed complete comma-separated writer executable names (without .exe):')).split(',');
    const phrase=action==='QUALIFY'?'AUTHORIZE ONE QUALIFICATION RUN':'AUTHORIZE ONE CANARY RUN';
    const consent=await hiddenInput('Confirm separate approval, full-copy exposure, complete closure and no restart by typing '+phrase+':');
    if(consent!==phrase)throw new Error('Consent refused');
    const result=await runCanary({executable,selection:{kind:'personal',private:{source,scratchParent,writers,consent:true}},
      ...(action==='QUALIFY'?{analysis:'qualification' as const}:{})});
    // Only fixed categories, booleans and counts. No diagnostic output from dependencies.
    process.stdout.write(JSON.stringify(result)+'\n');process.exitCode=result.status==='passed'?0:1;
    if(result.cleanup==='residual'){
      process.stdout.write('Residual artifacts. Restart this private entry and choose RECOVER. Authentication or lifetime uncertainty refuses cleanup.\n');
    }
  }catch{
    process.stdout.write('Personal canary refused; no findings.\n');process.exitCode=1;
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)void manualCanary();
