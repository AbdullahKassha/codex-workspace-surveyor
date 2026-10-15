import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHmac } from 'node:crypto';
import { explorerFixture } from './support/explorer-fixture.js';
import { preserveLegacyStore, retireLegacyDeclaration, recoverCanaryWithEvidence, forgetRecoveredSyntheticResidual,
  runTitledExplorerPreparation, type CanaryOptions } from './support/personal-canary.js';
import { ExplorerSession } from '../src/explorer/session.js';
import { resolveLegacyIncident } from './support/legacy-preservation-entry.js';
import { ExplorerSnapshot, reconcile } from '../src/explorer/model.js';

const empirical={skip:process.platform!=='win32'||process.env.WORKSPACE_SURVEYOR_RUN_CANARY_PREPARATION!=='1'||
  process.env.WORKSPACE_SURVEYOR_RUN_EXPLORER_PREPARATION!=='1',concurrency:false};
const executable=process.env.WORKSPACE_SURVEYOR_HELPER_PWSH??'';
function options(f:ReturnType<typeof explorerFixture>,extra:Partial<CanaryOptions>={}):CanaryOptions{
  return {executable,analysis:'explorer',selection:f.selection,explorer:{globalState:f.globalState},closure:()=> 'absent',
    ...extra,hook:(phase,scratch)=>{if(phase==='initialized')f.scratches.push(scratch);}};
}
function state(paths:string[]){return paths.map(path=>{const s=fs.lstatSync(path,{bigint:true});return {path,dev:s.dev,ino:s.ino,size:s.size,mtime:s.mtimeNs,bytes:s.isFile()?fs.readFileSync(path):null};});}
for(const scenario of ['normal','changed','interrupted-prepared','interrupted-ready','active-cleanup','busy','unsafe','security'] as const)
test('legacy preservation '+scenario+' keeps the obligation and never deletes unknown objects',empirical,async()=>{
  const f=explorerFixture(undefined,'checkpointed'),store=join(f.run.root,'recovery'),seal=store+'-Legacy',active=store+'-Active';
  const previous=process.env.WORKSPACE_SURVEYOR_LEGACY_PRESERVATION;let extra:string|undefined;
  try{
    process.env.WORKSPACE_SURVEYOR_LEGACY_PRESERVATION='1';
    const old=await runTitledExplorerPreparation(options(f,{cleanupFault:()=>{throw new Error('Invented cleanup interruption');}}));
    assert.equal(old.safety.cleanup,'residual');const root=f.scratches[0]!.root!;
    extra=join(root,'analysis','invented-extra');fs.writeFileSync(extra,'INVENTED_UNVERIFIED_BYTES');
    const paths=[store,join(store,'key'),join(store,'record'),root,extra];const before=state(paths);
    let interrupted=false;
    const preserved=await preserveLegacyStore({store,executable,synthetic:true,hook:stage=>{
      if(scenario==='interrupted-'+stage){interrupted=true;throw new Error('Invented interruption');}
    }});
    assert.equal(preserved.deletionAuthorized,false);assert.equal(preserved.status,interrupted?'refused':'preserved',JSON.stringify(preserved));
    assert.deepEqual(state(paths),before);assert.doesNotMatch(JSON.stringify(preserved),/INVENTED|invented-extra|recordHash|nonce/);
    if(scenario==='normal'){
      assert.equal(await retireLegacyDeclaration({store,executable,synthetic:true}),'refused');assert.deepEqual(state(paths),before);
    }
    if(scenario==='changed')fs.appendFileSync(extra,'changed');
    if(scenario==='unsafe'){fs.unlinkSync(extra);fs.linkSync(f.source,extra);}
    if(scenario==='security'){
      const result=spawnSync(executable,['-NoLogo','-NoProfile','-NonInteractive','-Command',
        "$ErrorActionPreference='Stop';$item=[IO.FileInfo]::new($env:TASK_OWNED_EXTRA);$acl=[IO.FileSystemAclExtensions]::GetAccessControl($item);"+
        "$other=[Security.Principal.SecurityIdentifier]::new([Security.Principal.WellKnownSidType]::WorldSid,$null);"+
        "[void]$acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($other,[Security.AccessControl.FileSystemRights]::Read,[Security.AccessControl.AccessControlType]::Allow));"+
        "[IO.FileSystemAclExtensions]::SetAccessControl($item,$acl)"],{env:{...process.env,TASK_OWNED_EXTRA:extra},windowsHide:true,encoding:'utf8'});
      assert.equal(result.status,0);assert.equal(result.stdout,'');
    }
    const attempt=()=>runTitledExplorerPreparation(options(f,{legacySynthetic:true,
      ...(scenario==='active-cleanup'?{cleanupFault:()=>{throw new Error('Invented active cleanup interruption');}}:{})}));
    const fresh=await attempt();
    if(scenario==='normal'||scenario==='interrupted-ready'||scenario==='busy'){
      assert.equal(fresh.safety.status,'passed');assert.equal(fresh.safety.cleanup,'removed');assert.equal(fresh.snapshot!.take()!.threads.length,4);
      assert.equal(fs.existsSync(active),false);
    }else{
      assert.equal(fresh.snapshot,undefined);assert.equal(fresh.safety.status,'refused');
      if(scenario==='changed'||scenario==='unsafe'||scenario==='security'||scenario==='interrupted-prepared'){
        assert.equal(fresh.safety.evidence.opened,0);assert.equal(fresh.safety.evidence.stages.includes('held'),false);
      }
    }
    if(scenario==='active-cleanup'){
      assert.equal(fresh.safety.recovery,'available');
      const result=await recoverCanaryWithEvidence({store:active,executable,synthetic:true});assert.equal(result.status,'removed');
      forgetRecoveredSyntheticResidual(f.scratches.at(-1)!.root!);
      assert.deepEqual(state(paths),before);
    }
    if(scenario==='busy'){
      // The active helper holds exclusive legacy lifetime throughout acquisition.
      const next=options(f,{legacySynthetic:true});const hook=next.hook;let observed=false;
      next.hook=async(phase,scratch)=>{await hook?.(phase,scratch);if(phase==='copied'){
        const result=await recoverCanaryWithEvidence({store,executable,synthetic:true});assert.equal(result.status,'busy');observed=true;
      }};
      const r=await runTitledExplorerPreparation(next);assert.equal(observed,true);assert.equal(r.safety.status,'passed');r.snapshot?.discard();
    }
    assert.equal(fs.existsSync(store),true);assert.equal(fs.existsSync(seal),true);assert.equal(fs.existsSync(extra),true);
    assert.equal(fs.readFileSync(join(store,'record')).equals(before[2]!.bytes!),true);
    const refusal=await recoverCanaryWithEvidence({store,executable,synthetic:true});assert.equal(refusal.category,'scratch-inventory');assert.equal(refusal.deletionAuthorized,false);
  }finally{
    // Only independently owned synthetic instrumentation/controls are removed here.
    if(extra&&fs.existsSync(extra))fs.unlinkSync(extra);
    if(fs.existsSync(active)){assert.equal((await recoverCanaryWithEvidence({store:active,executable,synthetic:true})).status,'removed');
      forgetRecoveredSyntheticResidual(f.scratches.at(-1)!.root!);}
    if(fs.existsSync(store)){assert.equal((await recoverCanaryWithEvidence({store,executable,synthetic:true})).status,'removed');
      if(scenario!=='active-cleanup')forgetRecoveredSyntheticResidual(f.scratches[0]!.root!);}
    if(fs.existsSync(seal)){
      if(scenario!=='interrupted-prepared')assert.equal(await retireLegacyDeclaration({store,executable,synthetic:true}),'refused');
      // Independent test instrumentation created and removed the extra object.
      // Production has no such evidence and retains this declaration instead.
      for(const name of ['record','key'])if(fs.existsSync(join(seal,name)))fs.unlinkSync(join(seal,name));fs.rmdirSync(seal);
    }
    assert.equal(await f.teardown(),true);
    if(previous===undefined)delete process.env.WORKSPACE_SURVEYOR_LEGACY_PRESERVATION;else process.env.WORKSPACE_SURVEYOR_LEGACY_PRESERVATION=previous;
  }
});
for(const scenario of ['missing-before','missing-after','reduced-declaration'] as const)
test('legacy preservation refuses '+scenario+' against the complete original signed inventory',empirical,async()=>{
  const f=explorerFixture(undefined,'checkpointed'),store=join(f.run.root,'recovery'),seal=store+'-Legacy',active=store+'-Active';
  const previous=process.env.WORKSPACE_SURVEYOR_LEGACY_PRESERVATION;
  let member:string|undefined,saved:string|undefined,extra:string|undefined,sealRecord:Buffer|undefined;
  try{
    process.env.WORKSPACE_SURVEYOR_LEGACY_PRESERVATION='1';
    const old=await runTitledExplorerPreparation(options(f,{cleanupFault:()=>{throw new Error('Invented interruption');}}));
    assert.equal(old.safety.cleanup,'residual');const root=f.scratches[0]!.root!;
    const originalRecord=fs.readFileSync(join(store,'record'));
    const original=JSON.parse(JSON.parse(originalRecord.toString('utf8')).payload) as {entries:{name:string;kind:string}[]};
    const signed=original.entries.find(e=>e.kind==='file'&&e.name.startsWith('analysis/'))!;
    assert.ok(signed);member=join(root,signed.name);saved=join(f.run.root,'saved-signed-member');
    extra=join(root,'analysis','invented-extra');fs.writeFileSync(extra,'INVENTED_UNVERIFIED_BYTES');
    const signedIdentity=state([member]);
    if(scenario==='missing-before'){
      // Moving this independently owned fixture member keeps its identity available
      // for exact restoration, without fabricating replacement ownership.
      fs.renameSync(member,saved);
      const result=await resolveLegacyIncident({
        recover:()=>recoverCanaryWithEvidence({store,executable,synthetic:true}),
        preserve:async()=>{
          const r=await preserveLegacyStore({store,executable,synthetic:true});
          assert.equal(r.status,'refused');assert.equal(r.check,'scratch-validation');assert.equal(r.deletionAuthorized,false);return r;
        },refresh:async()=>assert.fail('A missing signed member must not authorize acquisition')});
      assert.equal(result.status,'blocked');assert.equal(f.scratches.length,1);
      assert.equal(fs.existsSync(seal),false);assert.equal(fs.existsSync(active),false);
    }else{
      assert.equal((await preserveLegacyStore({store,executable,synthetic:true})).status,'preserved');
      sealRecord=fs.readFileSync(join(seal,'record'));fs.renameSync(member,saved);
      if(scenario==='reduced-declaration'){
        // Even a correctly sealed reduced declaration cannot redefine the old
        // authenticated inventory. This reproduces the original guard defect.
        const envelope=JSON.parse(sealRecord.toString('utf8'));
        const declaration=JSON.parse(envelope.payload);
        declaration.entries=declaration.entries.filter((e:{name:string})=>e.name!==signed.name);
        const payload=JSON.stringify(declaration);
        fs.writeFileSync(join(seal,'record'),JSON.stringify({payload,
          mac:createHmac('sha256',fs.readFileSync(join(seal,'key'))).update(payload).digest('hex')}));
      }
      const fresh=await runTitledExplorerPreparation(options(f,{legacySynthetic:true}));
      assert.equal(fresh.safety.status,'refused');assert.equal(fresh.snapshot,undefined);
      assert.equal(fresh.safety.evidence.opened,0);assert.equal(fresh.safety.evidence.stages.includes('held'),false);
      assert.equal(fs.existsSync(active),false);assert.equal(fs.existsSync(seal),true);
    }
    assert.deepEqual(fs.readFileSync(join(store,'record')),originalRecord);
    assert.equal(fs.existsSync(extra),true);
    fs.renameSync(saved,member);assert.deepEqual(state([member]),signedIdentity);saved=undefined;
  }finally{
    // Restore only this test's exact owned instrumentation before authenticated
    // teardown; no uncertain reviewer fixtures or personal artifacts are touched.
    if(saved&&member&&fs.existsSync(saved))fs.renameSync(saved,member);
    if(sealRecord&&fs.existsSync(seal))fs.writeFileSync(join(seal,'record'),sealRecord);
    if(extra&&fs.existsSync(extra))fs.unlinkSync(extra);
    if(fs.existsSync(store)){
      assert.equal((await recoverCanaryWithEvidence({store,executable,synthetic:true})).status,'removed');
      forgetRecoveredSyntheticResidual(f.scratches[0]!.root!);
    }
    if(fs.existsSync(seal)){
      assert.equal(await retireLegacyDeclaration({store,executable,synthetic:true}),'refused');
      for(const name of ['record','key'])fs.unlinkSync(join(seal,name));fs.rmdirSync(seal);
    }
    assert.equal(await f.teardown(),true);
    if(previous===undefined)delete process.env.WORKSPACE_SURVEYOR_LEGACY_PRESERVATION;else process.env.WORKSPACE_SURVEYOR_LEGACY_PRESERVATION=previous;
  }
});

test('legacy personal entry refuses before access without its consolidated opt-ins',()=>{
  const result=spawnSync(process.execPath,[fileURLToPath(new URL('./support/legacy-preservation-entry.js',import.meta.url))],
    {env:{...process.env,WORKSPACE_SURVEYOR_LEGACY_PRESERVATION:'0',WORKSPACE_SURVEYOR_PERSONAL_CANARY:'0'},encoding:'utf8',windowsHide:true});
  assert.equal(result.status,2);assert.match(result.stdout,/no operation started/);
});
test('legacy obligation remains in session status through snapshot attempts and close',async()=>{
  const session=new ExplorerSession({scope:'c'.repeat(64),legacyUnresolved:true,acquire:async()=>({failure:'acquisition'})});
  assert.equal(session.state().legacyUnresolved,true);session.refresh();await session.settled();assert.equal(session.state().legacyUnresolved,true);
  await session.close();assert.equal(session.state().legacyUnresolved,true);
});
test('legacy incident workflow preserves only a confirmed non-destructive inventory refusal and verifies once',async()=>{
  const inventory={status:'refused',check:'scratch-validation',category:'scratch-inventory',helperExit:'confirmed',deletionAuthorized:false} as const;
  const preserved={status:'preserved',check:'protocol',category:'none',deletionAuthorized:false} as const;
  const make=()=>new ExplorerSnapshot(reconcile({namespace:'invented',from:'2026-10-14T00:00:00Z',through:'2026-10-14T00:00:01Z'},
    {rowsRead:0,omittedRows:0,ambiguousIds:0,titles:'unavailable',projects:'unavailable',correspondence:'unknown',unconsumedColumns:false},
    [],[{id:'INVENTED_PRIVATE_ID',label:'INVENTED_PRIVATE_TITLE',roots:[]}],[]));
  for(const recovery of [inventory,{...inventory,status:'removed' as const,category:'none' as const,deletionAuthorized:true}]){
    const order:string[]=[];const snapshot=make();
    const result=await resolveLegacyIncident({recover:async()=>{order.push('recover');return recovery;},
      preserve:async()=>{order.push('preserve');return preserved;},refresh:async()=>{order.push('refresh');return {snapshot};}});
    assert.deepEqual(order,recovery.status==='removed'?['recover','refresh']:['recover','preserve','refresh']);
    assert.equal(result.status,'operational');assert.equal('legacyUnresolved' in result&&result.legacyUnresolved,recovery.status!=='removed');
    assert.equal(snapshot.take(),undefined);assert.doesNotMatch(JSON.stringify(result),/INVENTED_PRIVATE/);
  }
  for(const change of [{helperExit:'unconfirmed' as const},{deletionAuthorized:true},{category:'path-safety' as const},{status:'busy' as const}]){
    const result=await resolveLegacyIncident({recover:async()=>({...inventory,...change}),preserve:async()=>assert.fail('No preservation'),refresh:async()=>assert.fail('No Refresh')});
    assert.equal(result.status,'blocked');
  }
  const failed=await resolveLegacyIncident({recover:async()=>inventory,preserve:async()=>({...preserved,status:'refused'}),refresh:async()=>assert.fail('No Refresh')});
  assert.equal(failed.status,'blocked');
});
