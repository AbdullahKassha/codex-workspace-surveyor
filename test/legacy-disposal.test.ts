import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { explorerFixture } from './support/explorer-fixture.js';
import { disposeLegacyIncident, preserveLegacyStore, runTitledExplorerPreparation,
  forgetRecoveredSyntheticResidual, previewLegacyIncident, withVerifiedLegacyPreview, CanarySession } from './support/personal-canary.js';
import { closeLegacyIncident, reviewLegacyClosure, legacyInventoryText } from './support/legacy-disposal-entry.js';
import { ExplorerSnapshot, reconcile } from '../src/explorer/model.js';

const empirical={skip:process.platform!=='win32'||process.env.WORKSPACE_SURVEYOR_RUN_CANARY_PREPARATION!=='1'||
  process.env.WORKSPACE_SURVEYOR_RUN_EXPLORER_PREPARATION!=='1',concurrency:false};
const executable=process.env.WORKSPACE_SURVEYOR_HELPER_PWSH??'';
for(const scenario of ['normal','maximum','declined','changed','unexpected','hard-link','missing','replacement','reparse','replaced-control','busy','intent','member','controls','unreceipted-missing','damaged-receipt','control-partial'] as const)
test('explicit legacy disposal '+scenario+' keeps disposition separate from ownership',empirical,async()=>{
  const f=explorerFixture(undefined,'checkpointed'),store=join(f.run.root,'recovery'),seal=store+'-Legacy';
  const prior=process.env.WORKSPACE_SURVEYOR_LEGACY_PRESERVATION;let extra='',unexpected='',saved='',savedControl='';let lease:number|undefined;
  let finished=false,unregistered=1;const phases:string[]=[];
  const sources=[f.source,f.globalState].map(path=>({path,bytes:fs.readFileSync(path),stat:fs.lstatSync(path,{bigint:true})}));
  const dispose=(fault?:'intent'|'member'|'controls')=>disposeLegacyIncident({store,executable,synthetic:true,
    authorize:async summary=>{assert.equal(summary.unregisteredEntries,unregistered);return true;},
    fault:phase=>{phases.push(phase);if(phase===fault){
      if(scenario==='control-partial')fs.unlinkSync(join(store,'record'));
      throw new Error('INVENTED_INTERRUPTION');
    }}});
  try{
    process.env.WORKSPACE_SURVEYOR_LEGACY_PRESERVATION='1';
    const old=await runTitledExplorerPreparation({executable,analysis:'explorer',selection:f.selection,explorer:{globalState:f.globalState},closure:()=> 'absent',
      hook:(phase,scratch)=>{if(phase==='initialized')f.scratches.push(scratch);},cleanupFault:()=>{throw new Error('INVENTED_INTERRUPTION');}});
    assert.equal(old.safety.cleanup,'residual');const root=f.scratches[0]!.root!;
    extra=join(root,'analysis','invented-extra');fs.writeFileSync(extra,'INVENTED_UNVERIFIED');
    if(scenario==='maximum'){
      const signed=JSON.parse(JSON.parse(fs.readFileSync(join(store,'record'),'utf8')).payload).entries.length as number;
      unregistered=17-signed;
      for(let i=1;i<unregistered;i++)fs.writeFileSync(join(root,i%2?'acquisition':'analysis','extra-'+i),'INVENTED_UNVERIFIED');
    }
    assert.equal((await preserveLegacyStore({store,executable,synthetic:true})).status,'preserved');
    const record=fs.readFileSync(join(store,'record')),declaration=fs.readFileSync(join(seal,'record'));
    if(scenario==='replaced-control'){
      savedControl=join(f.run.root,'saved-record');fs.renameSync(join(store,'record'),savedControl);
      fs.copyFileSync(savedControl,join(store,'record'));
      const acl=spawnSync(executable,['-NoProfile','-NonInteractive','-Command',
        "$ErrorActionPreference='Stop';try{$taskOld=[IO.FileInfo]::new($env:INVENTED_OLD);$taskNew=[IO.FileInfo]::new($env:INVENTED_NEW);"+
        "$taskAcl=[IO.FileSystemAclExtensions]::GetAccessControl($taskOld);[IO.FileSystemAclExtensions]::SetAccessControl($taskNew,$taskAcl)}catch{[Console]::WriteLine('synthetic-acl-copy-refused');exit 1}"],
        {env:{...process.env,INVENTED_OLD:savedControl,INVENTED_NEW:join(store,'record')},encoding:'utf8',windowsHide:true});
      assert.equal(acl.status,0);assert.equal(acl.stdout,'');
    }
    if(scenario==='changed')fs.appendFileSync(extra,'changed');
    if(scenario==='unexpected'){unexpected=join(root,'invented-later');fs.writeFileSync(unexpected,'INVENTED_LATER');}
    if(scenario==='missing'){saved=join(f.run.root,'saved-extra');fs.renameSync(extra,saved);}
    if(scenario==='replacement'||scenario==='reparse'){
      saved=join(f.run.root,'saved-extra');fs.renameSync(extra,saved);
      if(scenario==='replacement')fs.writeFileSync(extra,'INVENTED_UNVERIFIED');else fs.symlinkSync(f.run.sources,extra,'junction');
    }
    if(scenario==='hard-link'){fs.linkSync(extra,join(f.run.root,'extra-link'));}
    if(scenario==='busy')lease=fs.openSync(join(seal,'record'),'r');
    const first=scenario==='declined'?await disposeLegacyIncident({store,executable,synthetic:true,authorize:async()=>false}):
      await dispose(scenario==='unreceipted-missing'||scenario==='damaged-receipt'?'intent':scenario==='control-partial'?'controls':
        ['intent','member','controls'].includes(scenario)?scenario as 'intent'|'member'|'controls':undefined);
    assert.equal(first.helperExit,'confirmed');assert.doesNotMatch(JSON.stringify(first),/INVENTED|nonce|[A-Z]:\\|manifestHash/);
    if(scenario==='normal'||scenario==='maximum'){assert.equal(first.status,'closed');finished=true;}
    else{
      const interrupted=['intent','member','controls','unreceipted-missing','damaged-receipt','control-partial'].includes(scenario);
      assert.equal(first.status,interrupted?'partial':'refused');assert.equal(first.disposalAuthorized,interrupted);
      if(scenario!=='control-partial')assert.deepEqual(fs.readFileSync(join(store,'record')),record);
      assert.deepEqual(fs.readFileSync(join(seal,'record')),declaration);
      assert.equal(fs.existsSync(join(seal,'disposal')),interrupted);
      if(!interrupted)assert.equal(fs.existsSync(extra),scenario!=='missing');
      if(interrupted){
        if(scenario==='unreceipted-missing'){
          saved=join(f.run.root,'saved-extra');fs.renameSync(extra,saved);
          const refused=await dispose();assert.equal(refused.status,'refused');assert.equal(refused.disposalAuthorized,false);
          assert.equal(fs.existsSync(seal),true);fs.renameSync(saved,extra);saved='';
        }
        if(scenario==='damaged-receipt'){
          const path=join(seal,'disposal'),intact=fs.readFileSync(path);
          try{fs.appendFileSync(path,'INVENTED_TRUNCATED_RECEIPT');
            const refused=await dispose();assert.equal(refused.status,'refused');assert.equal(refused.disposalAuthorized,false);
            assert.equal(fs.existsSync(extra),true);
          }finally{fs.writeFileSync(path,intact);}
        }
        // The immutable declaration plus flushed authenticated intent supports an
        // independently started coordinator; no in-memory deletion list is needed.
        const worker="import {disposeLegacyIncident} from './dist/test/support/personal-canary.js';"+
          "console.log(JSON.stringify(await disposeLegacyIncident({store:process.env.INVENTED_STORE,executable:process.env.WORKSPACE_SURVEYOR_HELPER_PWSH,synthetic:true,authorize:async()=>true})));";
        const next=spawnSync(process.execPath,['--input-type=module','--eval',worker],{
          env:{...process.env,INVENTED_STORE:store},encoding:'utf8',windowsHide:true});
        assert.equal(next.status,0);assert.equal(next.stderr,'');assert.equal(JSON.parse(next.stdout).status,'closed');finished=true;
      }
    }
    for(const source of sources){assert.deepEqual(fs.readFileSync(source.path),source.bytes);
      const stat=fs.lstatSync(source.path,{bigint:true});assert.equal(stat.ino,source.stat.ino);assert.equal(stat.mtimeNs,source.stat.mtimeNs);}
    if(finished){assert.equal(fs.existsSync(root),false);assert.equal(fs.existsSync(store),false);assert.equal(fs.existsSync(seal),false);
      forgetRecoveredSyntheticResidual(root);
      // Repeated checkpointed-WAL acquisitions use the original lifecycle again.
      for(let i=0;i<2;i++){
        const fresh=await runTitledExplorerPreparation({executable,analysis:'explorer',selection:f.selection,explorer:{globalState:f.globalState},closure:()=> 'absent',
          hook:(phase,scratch)=>{if(phase==='initialized')f.scratches.push(scratch);}});
        assert.equal(fresh.safety.status,'passed');assert.equal(fresh.safety.cleanup,'removed');fresh.snapshot?.discard();
      }
    }
  }finally{
    if(lease!==undefined)fs.closeSync(lease);
    if(savedControl&&fs.existsSync(savedControl)){fs.unlinkSync(join(store,'record'));fs.renameSync(savedControl,join(store,'record'));}
    if(saved&&fs.existsSync(saved)){
      if(scenario==='reparse'&&fs.existsSync(extra))fs.rmdirSync(extra);
      if(scenario==='replacement'&&fs.existsSync(extra))fs.unlinkSync(extra);
      fs.renameSync(saved,extra);
    }
    if(unexpected&&fs.existsSync(unexpected))fs.unlinkSync(unexpected);
    if(scenario==='changed'&&fs.existsSync(extra))fs.writeFileSync(extra,'INVENTED_UNVERIFIED');
    if(scenario==='hard-link'&&fs.existsSync(join(f.run.root,'extra-link')))fs.unlinkSync(join(f.run.root,'extra-link'));
    if(!finished&&fs.existsSync(seal)){
      const cleanup=await dispose();assert.equal(cleanup.status,'closed',JSON.stringify({cleanup,phases}));forgetRecoveredSyntheticResidual(f.scratches[0]!.root!);
    }
    assert.equal(await f.teardown(),true);
    if(prior===undefined)delete process.env.WORKSPACE_SURVEYOR_LEGACY_PRESERVATION;else process.env.WORKSPACE_SURVEYOR_LEGACY_PRESERVATION=prior;
  }
});

test('personal disposal refuses before access without the separate authorization gate',async()=>{
  const prior=process.env.WORKSPACE_SURVEYOR_LEGACY_DISPOSAL;
  try{delete process.env.WORKSPACE_SURVEYOR_LEGACY_DISPOSAL;
    const r=await disposeLegacyIncident({store:'C:\\Invented\\recovery',executable:'C:\\Invented\\pwsh.exe',synthetic:false,
      authorize:async()=>assert.fail('No personal access or authorization dispatch')});
    assert.equal(r.status,'refused');assert.equal(r.helperExit,'not-launched');assert.equal(r.disposalAuthorized,false);
  }finally{if(prior!==undefined)process.env.WORKSPACE_SURVEYOR_LEGACY_DISPOSAL=prior;}
});

test('closure verifies once only after confirmed disposition, and never hides partial progress',async()=>{
  for(const status of ['refused','partial'] as const){
    const r=await closeLegacyIncident({dispose:async()=>({status,helperExit:'confirmed',disposalAuthorized:status==='partial'}),
      refresh:async()=>assert.fail('No acquisition before positive closure')});assert.equal(r.status,'blocked');
  }
  let calls=0;
  const closed={status:'closed',helperExit:'confirmed',disposalAuthorized:true} as const;
  const snapshot=new ExplorerSnapshot(reconcile({namespace:'invented',from:'2026-10-14T00:00:00Z',through:'2026-10-14T00:00:01Z'},
    {rowsRead:0,omittedRows:0,ambiguousIds:0,titles:'unavailable',projects:'unavailable',correspondence:'unknown',unconsumedColumns:false},
    [],[{id:'INVENTED_PRIVATE',label:'INVENTED_PRIVATE',roots:[]}],[]));
  const r=await closeLegacyIncident({dispose:async()=>closed,refresh:async()=>{calls++;return {snapshot};}});
  assert.equal(r.status,'closed-and-operational');assert.equal(calls,1);assert.equal(snapshot.take(),undefined);
  assert.doesNotMatch(JSON.stringify(r),/INVENTED_PRIVATE/);
  const failed=await closeLegacyIncident({dispose:async()=>closed,refresh:async()=>({failure:'closure'})});
  assert.equal(failed.status,'closed-verification-failed');
});

for(const scenario of ['cancel','approved','changed','bad-auth','security-change','existing-journal','partial-journal','changed-before-dispose','preview-command'] as const)
test('two-stage legacy preview '+scenario+' performs no mutation before a separate decision',empirical,async()=>{
  const f=explorerFixture(undefined,'checkpointed'),store=join(f.run.root,'recovery'),seal=store+'-Legacy',active=store+'-Active';
  const prior=process.env.WORKSPACE_SURVEYOR_LEGACY_PRESERVATION;let closed=false,extra='',sealBytes:Buffer|undefined;
  const paths:string[]=[];
  const state=()=>paths.map(path=>{const s=fs.lstatSync(path,{bigint:true});return {path,ino:s.ino,dev:s.dev,size:s.size,
    mtime:s.mtimeNs,bytes:s.isFile()?fs.readFileSync(path):null};});
  const options={store,executable,synthetic:true};
  try{
    process.env.WORKSPACE_SURVEYOR_LEGACY_PRESERVATION='1';
    const old=await runTitledExplorerPreparation({executable,analysis:'explorer',selection:f.selection,explorer:{globalState:f.globalState},closure:()=> 'absent',
      hook:(phase,scratch)=>{if(phase==='initialized')f.scratches.push(scratch);},cleanupFault:()=>{throw new Error('INVENTED_INTERRUPTION');}});
    assert.equal(old.safety.cleanup,'residual');const root=f.scratches[0]!.root!;
    extra=join(root,'analysis','invented-extra');fs.writeFileSync(extra,'INVENTED_UNVERIFIED');
    assert.equal((await preserveLegacyStore(options)).status,'preserved');
    const journal=scenario==='existing-journal'||scenario==='partial-journal';
    if(journal){
      const r=await disposeLegacyIncident({...options,authorize:async()=>true,fault:phase=>{
        if(phase===(scenario==='partial-journal'?'member':'intent'))throw new Error('INVENTED_INTERRUPTION');
      }});
      assert.equal(r.status,'partial');paths.push(join(seal,'disposal'));
    }
    // An occupied active slot is deliberately present during Stage 1. Its exact
    // independently owned sentinel must survive preview and cancellation.
    fs.mkdirSync(active);fs.writeFileSync(join(active,'invented-sentinel'),'INVENTED_ACTIVE');
    paths.push(store,join(store,'key'),join(store,'record'),seal,join(seal,'key'),join(seal,'record'),root,
      join(root,'owner'),join(root,'acquisition'),join(root,'analysis'),extra,active,join(active,'invented-sentinel'));
    const before=state();let displayed=false,confirmed=false,activeRecovery=0,disposals=0,refreshes=0;
    sealBytes=fs.readFileSync(join(seal,'record'));
    if(scenario==='bad-auth')fs.writeFileSync(join(seal,'record'),'INVENTED_MALFORMED_CONTROL');
    const result=await reviewLegacyClosure({inspect:async()=>{
        const read=fs.readFileSync,send=CanarySession.prototype.send;
        const allowed=new Set([join(root,'owner'),join(seal,'key'),join(seal,'disposal')]);
        fs.readFileSync=((path:fs.PathOrFileDescriptor,...args:unknown[])=>{
          assert.equal(allowed.has(String(path)),true,'Inspection must not read copied bodies or source files');
          return Reflect.apply(read,fs,[path,...args]);
        }) as typeof fs.readFileSync;syncBuiltinESMExports();
        if(scenario==='preview-command')CanarySession.prototype.send=function(value:object){
          return send.call(this,(value as {command?:string}).command==='release'?{command:'authorize-disposal'}:value);
        };
        try{return await previewLegacyIncident(options);}finally{fs.readFileSync=read;syncBuiltinESMExports();CanarySession.prototype.send=send;}
      },
      display:preview=>{
        assert.notEqual(scenario,'bad-auth');displayed=true;assert.deepEqual(state(),before);
        assert.equal(fs.existsSync(join(seal,'disposal')),journal);
        assert.equal(preview.previouslyRemoved,scenario==='partial-journal'?1:0);
        const row=preview.objects.find(e=>e.path===extra)!;assert.equal(row.registered,false);assert.equal(row.kind,'file');
        assert.equal(row.size,fs.lstatSync(extra).size);assert.ok(preview.objects.some(e=>e.path===root&&e.kind==='directory'&&e.registered));
        assert.equal(preview.totalBytes,preview.objects.reduce((n,e)=>n+(e.size??0),0));
        const text=legacyInventoryText(preview);assert.ok(text.includes(extra));assert.ok(text.includes('Name: invented-extra'));
        assert.ok(text.includes('unregistered'));assert.doesNotMatch(text,/nonce|recordHash|manifestHash|INVENTED_UNVERIFIED/);
      },confirm:async()=>{
        assert.equal(displayed,true);confirmed=true;assert.equal(activeRecovery,0);assert.equal(disposals,0);assert.deepEqual(state(),before);
        if(scenario==='changed'){const s=fs.statSync(extra);fs.utimesSync(extra,s.atime,new Date(s.mtimeMs+2000));}
        if(scenario==='security-change'){
          const r=spawnSync(executable,['-NoProfile','-NonInteractive','-Command',
            "$ErrorActionPreference='Stop';try{$a=[IO.FileInfo]::new($env:INVENTED_OLD);$b=[IO.FileInfo]::new($env:INVENTED_NEW);"+
            "$before=[IO.FileSystemAclExtensions]::GetAccessControl($b).GetSecurityDescriptorBinaryForm();"+
            "$s=[IO.FileSystemAclExtensions]::GetAccessControl($a);$s.SetAccessRuleProtection($true,$false);[IO.FileSystemAclExtensions]::SetAccessControl($b,$s);"+
            "$after=[IO.FileSystemAclExtensions]::GetAccessControl($b).GetSecurityDescriptorBinaryForm();"+
            "if([Convert]::ToBase64String($before) -cne [Convert]::ToBase64String($after)){[Console]::WriteLine('descriptor-changed')}else{[Console]::WriteLine('descriptor-unchanged')}}catch{exit 1}"],
            {env:{...process.env,INVENTED_OLD:join(root,'owner'),INVENTED_NEW:extra},windowsHide:true,encoding:'utf8'});
          assert.equal(r.status,0);
          assert.equal(r.stdout.trim(),'descriptor-changed');
        }
        return scenario!=='cancel';
      },revalidate:preview=>withVerifiedLegacyPreview(options,preview,async()=>{
        assert.equal(confirmed,true);activeRecovery++;
        // This sentinel is harness-owned, not a fabricated recovery claim. The
        // production callback uses unchanged authenticated active RECOVER.
        fs.unlinkSync(join(active,'invented-sentinel'));fs.rmdirSync(active);return true;
      }),dispose:async preview=>{disposals++;assert.equal(activeRecovery,1);
        if(scenario==='changed-before-dispose'){const s=fs.statSync(extra);fs.utimesSync(extra,s.atime,new Date(s.mtimeMs+2000));}
        return disposeLegacyIncident({...options,preview,authorize:async()=>true});
      },refresh:async()=>{refreshes++;return {failure:'closure'};}});
    if(scenario==='approved'||journal){
      assert.equal(result.status,'closed-verification-failed');assert.equal(disposals,1);assert.equal(refreshes,1);closed=true;
      forgetRecoveredSyntheticResidual(root);assert.equal(fs.existsSync(seal),false);assert.equal(fs.existsSync(root),false);
    }else{
      assert.equal(result.status,scenario==='cancel'?'cancelled':'blocked');assert.equal(disposals,scenario==='changed-before-dispose'?1:0);
      assert.equal(activeRecovery,scenario==='changed-before-dispose'?1:0);assert.equal(refreshes,0);
      assert.equal(fs.existsSync(join(active,'invented-sentinel')),scenario!=='changed-before-dispose');
      if(scenario==='cancel')assert.deepEqual(state(),before);
      if(scenario==='bad-auth'||scenario==='preview-command'){assert.equal(displayed,false);assert.equal(confirmed,false);}
      assert.equal(fs.existsSync(join(seal,'disposal')),false);
    }
  }finally{
    if(fs.existsSync(active)){fs.unlinkSync(join(active,'invented-sentinel'));fs.rmdirSync(active);}
    if(!closed&&fs.existsSync(seal)){
      if(sealBytes)fs.writeFileSync(join(seal,'record'),sealBytes);
      const r=await disposeLegacyIncident({...options,authorize:async()=>true});assert.equal(r.status,'closed');
      forgetRecoveredSyntheticResidual(f.scratches[0]!.root!);
    }
    assert.equal(await f.teardown(),true);
    if(prior===undefined)delete process.env.WORKSPACE_SURVEYOR_LEGACY_PRESERVATION;else process.env.WORKSPACE_SURVEYOR_LEGACY_PRESERVATION=prior;
  }
});

test('inventory display keeps terminal controls inert and confirmation cancellation never invokes recovery',async()=>{
  const preview={root:'C:\\Invented\\root',previouslyRemoved:0,totalBytes:0,
    objects:[{path:'C:\\Invented\\root\\bad\u001b[31m\u202e',kind:'file' as const,size:0,registered:false}]};
  const text=legacyInventoryText(preview);assert.doesNotMatch(text,/[\u001b\u202e]/);assert.match(text,/escaped/);
  const order:string[]=[];
  const r=await reviewLegacyClosure({inspect:async()=>{order.push('inspect');return preview;},display:()=>{order.push('display');},
    confirm:async()=>{order.push('confirm');return false;},revalidate:async()=>assert.fail('No recovery on cancellation'),
    dispose:async()=>assert.fail('No disposal on cancellation'),refresh:async()=>assert.fail('No Refresh on cancellation')});
  assert.equal(r.status,'cancelled');assert.deepEqual(order,['inspect','display','confirm']);
});

test('personal inventory preview refuses before access without its inspection opt-in',async()=>{
  const previous=process.env.WORKSPACE_SURVEYOR_LEGACY_INSPECTION;
  try{delete process.env.WORKSPACE_SURVEYOR_LEGACY_INSPECTION;
    assert.equal(await previewLegacyIncident({store:'C:\\Invented\\recovery',executable:'C:\\Invented\\pwsh.exe',synthetic:false}),undefined);
  }finally{if(previous!==undefined)process.env.WORKSPACE_SURVEYOR_LEGACY_INSPECTION=previous;}
});
