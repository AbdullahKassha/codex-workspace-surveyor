import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ExplorerSnapshot, reconcile } from '../src/explorer/model.js';
import { resolveRecoveryBlocker } from './support/recovery-resolution-entry.js';
import type { RecoveryReport } from './support/personal-canary.js';

const recovered:RecoveryReport={status:'removed',check:'control-retirement',category:'none',helperExit:'confirmed',deletionAuthorized:true};
function snapshot(populated=true){return new ExplorerSnapshot(reconcile(
  {namespace:'synthetic-resolution',from:'2026-10-14T00:00:00Z',through:'2026-10-14T00:00:01Z'},
  {rowsRead:0,omittedRows:0,ambiguousIds:0,titles:'accepted',projects:'unavailable',correspondence:'unknown',unconsumedColumns:false},
  [],populated?[{id:'invented',label:'Invented Project',roots:[]}]:[],[]));}
test('resolution performs one recovery and only one Refresh after removed; snapshot data never enters the report',async()=>{
  const order:string[]=[],candidate=snapshot();
  const result=await resolveRecoveryBlocker({recover:async()=>{order.push('recover');return recovered;},
    refresh:async()=>{order.push('refresh');return {snapshot:candidate};}});
  assert.deepEqual(order,['recover','refresh']);assert.equal(result.status,'restored');assert.equal(result.populated,true);
  assert.equal(candidate.take(),undefined);assert.doesNotMatch(JSON.stringify(result),/invented|Invented Project|snapshot:/);
});
test('resolution stops without Refresh or a second recovery on every non-removed status, including verified and unknown inventory',async()=>{
  for(const status of ['refused','busy','residual','unavailable','verified'] as const){let runs=0;
    const result=await resolveRecoveryBlocker({recover:async()=>{runs++;return {...recovered,status,category:'scratch-inventory',deletionAuthorized:false};},
      refresh:async()=>assert.fail('No Refresh permitted')});
    assert.equal(result.status,'blocked');assert.equal(runs,1);
  }
});
test('resolution refuses contradictory removal evidence without Refresh',async()=>{
  for(const evidence of [{helperExit:'unconfirmed' as const},{category:'cleanup' as const},{deletionAuthorized:false}]){
    const result=await resolveRecoveryBlocker({recover:async()=>({...recovered,...evidence}),refresh:async()=>assert.fail('No Refresh permitted')});
    assert.equal(result.status,'blocked');
  }
});
test('resolution refuses cancelled/failed or empty verification and never retries',async()=>{
  for(const failure of ['cleanup','closure','unavailable',undefined] as const){let runs=0;const candidate=snapshot(false);
    const result=await resolveRecoveryBlocker({recover:async()=>recovered,refresh:async()=>{runs++;return {snapshot:candidate,...(failure?{failure}:{})};}});
    assert.equal(result.status,failure?'verification-failed':'snapshot-empty');assert.equal(runs,1);assert.equal(candidate.take(),undefined);
  }
});
test('incident entry refuses without its distinct approval gates before any personal operation',()=>{
  const result=spawnSync(process.execPath,[fileURLToPath(new URL('./support/recovery-resolution-entry.js',import.meta.url))],
    {env:{...process.env,WORKSPACE_SURVEYOR_RECOVERY_RESOLUTION:'0',WORKSPACE_SURVEYOR_PERSONAL_CANARY:'0'},encoding:'utf8',windowsHide:true});
  assert.equal(result.status,2);assert.equal(result.stdout,'Recovery resolution not enabled or host unsuitable; no operation started.\n');
});
