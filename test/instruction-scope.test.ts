import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import promises from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { join, dirname } from 'node:path';
import { reconcile, ExplorerSnapshot, type ExplorerData, type ThreadClaim } from '../src/explorer/model.js';
import { observeInstructionScope, instructionLimits, type InstructionOptions } from '../src/explorer/instruction-scope.js';
import { createMetadataProbe, discoverRelationships, enrichExplorerSnapshot } from '../src/explorer/discovery.js';
import { workspacePresentation, instructionPresentation } from '../src/explorer/presentation.js';
import { directoryFixture, fixtureGit } from './support/discovery-fixture.js';

const provenance={namespace:'synthetic-instructions',from:'2026-10-12T00:00:00Z',through:'2026-10-12T00:00:01Z'};
const coverage={rowsRead:0,omittedRows:0,ambiguousIds:0,titles:'accepted' as const,projects:'desktop-registry' as const,correspondence:'qualified' as const,unconsumedColumns:false};
const thread=(cwd:string,id='fixture',extra:Partial<ThreadClaim>={}):ThreadClaim=>({id,cwd,title:null,ambiguous:false,sourceState:'ordinary',archived:false,...extra});
const data=(threads:ThreadClaim[])=>reconcile(provenance,coverage,threads,[],[],threads.map(t=>t.id));
const attributes=async()=>16;
const observe=(d:ExplorerData,root:string,extra:Partial<InstructionOptions>={})=>observeInstructionScope(d,{root,attributes,...extra});

test('empty directories and ordinary marker files support only a conditional boundary independently of Git validity',async()=>{
  const f=directoryFixture();try{
    for(const kind of ['directory','file']){
      const cwd=f.mkdir(join(f.root,kind));if(kind==='directory')f.mkdir(join(cwd,'.git'));else fs.writeFileSync(join(cwd,'.git'),'Invented unsupported pointer');
      fs.writeFileSync(join(cwd,'AGENTS.md'),'INSTRUCTION_CONTENT_CANARY');
      const base=data([thread(cwd)]),git=await discoverRelationships(base,{root:f.root,attributes});
      assert.notEqual(git.discovery!.git.find(g=>git.discovery!.folders[g.folder]!.path===cwd)?.state,'verified');
      const d=await observe(base,f.root),row=d.cwds[0]!;assert.equal(row.candidate,cwd);assert.equal(row.complete,true);
      assert.equal(d.entries[row.ancestry[0]!.marker!]!.type,kind);assert.equal(d.entries[row.ancestry[0]!.marker!]!.state,'present');
      assert.equal(JSON.stringify(d).includes('INSTRUCTION_CONTENT_CANARY'),false);assert.equal(d.policy.effective,'unknown');
    }
  }finally{f.cleanup();}
});

test('nearest marker stops ancestry, instructions are observed there and overlapping CWD checks are deduplicated',async()=>{
  const f=directoryFixture();try{
    const parent=f.mkdir(join(f.root,'parent')),child=f.mkdir(join(parent,'child')),leaf=f.mkdir(join(child,'leaf'));
    f.mkdir(join(parent,'.git'));f.mkdir(join(child,'.git'));fs.writeFileSync(join(parent,'AGENTS.md'),'Not eligible under assumed nearer marker');
    fs.writeFileSync(join(child,'AGENTS.md'),'Invented');fs.writeFileSync(join(child,'AGENTS.override.md'),'');
    const d=await observe(data([thread(leaf,'a'),thread(child,'b'),thread(leaf,'c')]),f.root);
    assert.equal(d.cwds.length,2);assert.equal(d.qualifyingCwds,2);assert.deepEqual(d.cwds.map(row=>row.candidate),[child,child]);
    assert.equal(d.entries.some(e=>e.path===join(parent,'AGENTS.md')),false);
    assert.equal(d.entries.filter(e=>e.path===join(child,'AGENTS.md')).length,1);
    const ui=instructionPresentation({...data([thread(leaf)]),instructionScope:d},0);
    assert.deepEqual(ui.files,[join(child,'AGENTS.override.md'),join(child,'AGENTS.md')]);
    assert.equal(d.entries.find(e=>e.path===join(child,'AGENTS.override.md'))!.size,0);
    assert.ok(ui.explanations.some(s=>s.includes('Codex may stop searching for parent instructions')));assert.ok(ui.explanations.some(s=>s.includes('Actual Desktop settings have not been checked')));
    assert.equal(ui.explanations.some(s=>/selected|loaded|applied/.test(s)),false);
  }finally{f.cleanup();}
});

test('scope edge with no marker preserves checked absence and never invents CWD fallback',async()=>{
  const f=directoryFixture();try{
    const cwd=f.mkdir(join(f.root,'working')),d=await observe(data([thread(cwd)]),f.root);
    assert.equal(d.cwds[0]!.stop,'scope-boundary');assert.equal(d.cwds[0]!.complete,false);assert.equal(d.cwds[0]!.candidate,undefined);
    assert.ok(d.entries.filter(e=>e.purpose==='marker').every(e=>e.state==='absent'&&e.at==='target'));
    assert.ok(instructionPresentation({...data([thread(cwd)]),instructionScope:d},0).explanations.includes('No instruction files found in the folders checked.'));
  }finally{f.cleanup();}
});

test('external and invalid CWDs dispatch no metadata reads, including without reusable-session access policy',async()=>{
  const f=directoryFixture();try{
    const external=f.mkdir(join(f.owner,'external')),seen:string[]=[],d=await observe(data([thread(external,'a'),thread('relative','b')]),f.root,{attributes:async path=>{seen.push(path);return 16;}});
    assert.deepEqual(d.cwds.map(row=>row.stop),['outside-scope','invalid-cwd']);assert.equal(d.operations,0);assert.deepEqual(seen,[]);assert.deepEqual(d.entries,[]);
  }finally{f.cleanup();}
});

test('inaccessible target marker is not presence and cannot fall through to a farther marker',async()=>{
  const f=directoryFixture();try{
    const cwd=f.mkdir(join(f.root,'working'));f.mkdir(join(f.root,'.git'));f.mkdir(join(cwd,'.git'));
    fs.writeFileSync(join(cwd,'AGENTS.md'),'Invented');
    const d=await observe(data([thread(cwd)]),f.root,{attributes:async path=>path===join(cwd,'.git')?'access-denied':16});
    const marker=d.entries.find(e=>e.purpose==='marker')!;assert.equal(marker.state,'inaccessible');assert.equal(marker.at,'target');
    assert.equal(d.cwds[0]!.stop,'obstruction');assert.equal(d.cwds[0]!.candidate,undefined);
    assert.ok(d.entries.some(e=>e.path===join(cwd,'AGENTS.md')&&e.state==='present'));assert.equal(d.entries.some(e=>e.path===join(f.root,'.git')),false);
  }finally{f.cleanup();}
});

test('blocked or disappearing ancestors produce uninspected targets rather than marker absence',async()=>{
  const f=directoryFixture();try{
    const cwd=f.mkdir(join(f.root,'working'));
    for(const failure of ['access-denied','missing','inspection-error'] as const){
      const d=await observe(data([thread(cwd)]),f.root,{attributes:async path=>path===f.root?failure:16});
      assert.equal(d.entries[0]!.state,'uninspected');assert.equal(d.entries[0]!.at,'ancestor');assert.equal(d.entries[0]!.obstruction,f.root);
      assert.equal(d.cwds[0]!.candidate,undefined);assert.equal(d.cwds[0]!.stop,'obstruction');
    }
    const blocked=f.mkdir(join(f.root,'blocked'));fs.writeFileSync(join(blocked,'ordinary-file'),'Invented');
    const d=await observe(data([thread(join(blocked,'ordinary-file','child'))]),f.root);assert.equal(d.entries[0]!.state,'uninspected');assert.equal(d.entries[0]!.reason,'not-directory');
  }finally{f.cleanup();}
});

test('target and ancestor reparse refusal and unavailable attribute service remain uninspected',async()=>{
  const f=directoryFixture();try{
    const cwd=f.mkdir(join(f.root,'working'));f.mkdir(join(cwd,'.git'));
    for(const blocked of [cwd,join(cwd,'.git')]){
      const d=await observe(data([thread(cwd)]),f.root,{attributes:async path=>path===blocked?1040:16});
      assert.equal(d.cwds[0]!.candidate,undefined);assert.ok(d.entries.some(e=>e.state==='uninspected'&&e.reason==='reparse-refused'));
    }
    const link=join(f.root,'linked');fs.symlinkSync(cwd,link,process.platform==='win32'?'junction':'dir');
    const d=await observe(data([thread(join(link,'child'))]),f.root);assert.equal(d.entries[0]!.state,'uninspected');assert.equal(d.entries[0]!.at,'ancestor');
    const unavailable=await observe(data([thread(cwd)]),f.root,{attributes:async()=>null});assert.equal(unavailable.entries[0]!.state,'uninspected');assert.equal(unavailable.operations,2);
  }finally{f.cleanup();}
});

test('instruction non-files and inaccessible metadata do not become observed instruction-file paths',async()=>{
  const f=directoryFixture();try{
    f.mkdir(join(f.root,'.git'));f.mkdir(join(f.root,'AGENTS.md'));fs.writeFileSync(join(f.root,'AGENTS.override.md'),'Invented');
    const base=data([thread(f.root)]),d=await observe(base,f.root,{attributes:async path=>path===join(f.root,'AGENTS.override.md')?'access-denied':16});
    assert.equal(d.cwds[0]!.candidate,f.root);assert.equal(d.status,'partial');assert.deepEqual(instructionPresentation({...base,instructionScope:d},0).files,[]);
    assert.equal(d.entries.find(e=>e.path===join(f.root,'AGENTS.md'))!.type,'directory');
    assert.equal(d.entries.find(e=>e.path===join(f.root,'AGENTS.override.md'))!.state,'inaccessible');
  }finally{f.cleanup();}
});

test('CWD, ancestry and operation bounds retain explicit partial coverage',async()=>{
  const f=directoryFixture();try{
    const a=f.mkdir(join(f.root,'a')),b=f.mkdir(join(f.root,'b'));
    const bounded=await observe(data([thread(a,'a'),thread(b,'b')]),f.root,{instructionLimits:{cwds:1,depth:1}});
    assert.equal(bounded.cwds.length,1);assert.equal(bounded.qualifyingCwds,2);assert.equal(bounded.cwds[0]!.stop,'depth-limit');assert.equal(bounded.status,'partial');
    assert.ok(instructionPresentation({...data([thread(a,'a'),thread(b,'b')]),instructionScope:bounded},1).explanations[0]!.includes('working-folder limit'));
    const limit=await observe(data([thread(a)]),f.root,{instructionLimits:{operations:1}});assert.equal(limit.operations,1);assert.equal(limit.cwds[0]!.stop,'operations-limit');assert.equal(limit.cwds[0]!.candidate,undefined);
    await assert.rejects(observe(data([]),f.root,{instructionLimits:{operations:instructionLimits.operations+1}}));
  }finally{f.cleanup();}
});

test('deadline and cancellation stop new dispatch while retaining completed evidence and closing the probe',async()=>{
  const f=directoryFixture();try{
    let clock=0,closed=0;const cwd=f.mkdir(join(f.root,'working'));
    const timed=await observe(data([thread(cwd)]),f.root,{now:()=>clock,metadataProbe:(options,step)=>{
      const probe=createMetadataProbe(options,step);return {check:async path=>{const result=await probe.check(path);clock=5000;return result;},close:async()=>{closed++;await probe.close();}};
    }});
    assert.equal(timed.cwds[0]!.stop,'time-limit');assert.equal(timed.entries[0]!.state,'present');assert.equal(closed,1);
    const abort=new AbortController();let requests=0;
    const cancelled=await observe(data([thread(cwd)]),f.root,{signal:abort.signal,metadataProbe:(options,step)=>{
      const probe=createMetadataProbe(options,step);return {check:async path=>{requests++;const result=await probe.check(path);abort.abort();return result;},close:probe.close};
    }});
    assert.equal(requests,1);assert.equal(cancelled.status,'cancelled');assert.equal(cancelled.cwds[0]!.stop,'cancelled');
    const before=await observe(data([thread(cwd)]),f.root,{signal:abort.signal});assert.equal(before.operations,0);assert.equal(before.entries.length,0);
  }finally{f.cleanup();}
});

test('archived, internal and unknown records add no inspected CWDs',async()=>{
  const f=directoryFixture();try{
    const base=data([thread(f.root,'visible'),thread(join(f.root,'archived'),'archived',{archived:true}),
      thread(join(f.root,'internal'),'internal',{sourceState:'subagent'}),thread(join(f.root,'unknown'),'unknown',{sourceState:'unknown'})]);
    const d=await observe(base,f.root);assert.equal(d.qualifyingCwds,1);assert.deepEqual(d.cwds.map(row=>row.cwd),[f.root]);
  }finally{f.cleanup();}
});

test('unassigned ordinary records are ineligible before scope checks; explicit projectlessness outside scope dispatches no reads',async()=>{
  const root=join(process.cwd(),'synthetic-discovery-scope'),outside=dirname(root);
  for(const cwd of [root,outside]){
    const t=thread(cwd,'synthetic-unassigned'),base=reconcile(provenance,coverage,[t],[],[]);
    let opened=false;
    const refuseProbe=()=>{opened=true;throw new Error('Unexpected metadata probe');};
    const unresolved=await observe(base,root,{metadataProbe:refuseProbe});
    assert.deepEqual(unresolved.cwds,[]);assert.deepEqual(unresolved.entries,[]);assert.equal(unresolved.operations,0);
    assert.equal(unresolved.qualifyingCwds,0);assert.equal(opened,false);
    assert.deepEqual(base.memberships,['no-assignment-observed']);assert.deepEqual(base.visibility,['unknown']);
    if(cwd===outside){
      const qualified=await observe(data([t]),root,{metadataProbe:refuseProbe});
      assert.equal(qualified.cwds[0]!.stop,'outside-scope');assert.equal(qualified.qualifyingCwds,1);
      assert.deepEqual(qualified.entries,[]);assert.equal(qualified.operations,0);assert.equal(opened,false);
    }
  }
});

test('collector opens no content or directory inventories and preserves synthetic source bytes and metadata',async()=>{
  const f=directoryFixture();try{
    f.mkdir(join(f.root,'.git'));const path=join(f.root,'AGENTS.md');fs.writeFileSync(path,'PRIVATE_INSTRUCTION_CONTENT_CANARY');
    fs.writeFileSync(join(f.root,'config.toml'),'PRIVATE_CONFIGURATION_CANARY');const before=fs.statSync(path);
    const guards=['open','readFile','opendir','writeFile'] as const;
    try{
      for(const key of guards)mock.method(promises,key,()=>{assert.fail('Instruction pass must not use '+key);});syncBuiltinESMExports();
      const d=await observe(data([thread(f.root)]),f.root);assert.equal(d.cwds[0]!.candidate,f.root);
      assert.equal(JSON.stringify(d).includes('CANARY'),false);
    }finally{mock.restoreAll();syncBuiltinESMExports();}
    const after=fs.statSync(path);assert.equal(after.mtimeMs,before.mtimeMs);assert.equal(after.ctimeMs,before.ctimeMs);
    assert.equal(fs.readFileSync(path,'utf8'),'PRIVATE_INSTRUCTION_CONTENT_CANARY');
  }finally{f.cleanup();}
});

test('enrichment preserves verified main/linked relationships, visibility and numbered Workspace structure',async()=>{
  const f=directoryFixture();try{
    const run=fixtureGit(f),main=f.mkdir(join(f.root,'main')),linked=join(f.root,'linked');
    run(main,'init','--initial-branch=fixture-main');run(main,'commit','--allow-empty','-m','Invented fixture');run(main,'worktree','add','-b','fixture-linked',linked);
    fs.writeFileSync(join(main,'AGENTS.md'),'Invented');fs.writeFileSync(join(linked,'AGENTS.md'),'Invented');
    const base=data([thread(main,'main'),thread(linked,'linked')]),options={root:f.root,attributes};
    const before=await discoverRelationships(base,options),snapshot=await enrichExplorerSnapshot(new ExplorerSnapshot(base),options),after=snapshot.take()!;
    assert.deepEqual(after.components,before.components);assert.deepEqual(after.relations,before.relations);assert.deepEqual(after.visibility,before.visibility);assert.deepEqual(after.memberships,before.memberships);
    assert.deepEqual(after.discovery!.git,before.discovery!.git);assert.deepEqual(after.discovery!.relations,before.discovery!.relations);
    assert.deepEqual(workspacePresentation(after),workspacePresentation(before));assert.deepEqual(after.instructionScope!.cwds.map(row=>row.candidate),[main,linked]);
    assert.equal(after.instructionScope!.entries.some(e=>e.path.includes(join('.git','worktrees'))),false);assert.equal(dirname(linked),f.root);
  }finally{f.cleanup();}
});

test('unexpected probe failure leaves acquired evidence usable and never forwards raw errors',async()=>{
  const f=directoryFixture();try{
    const base=data([thread(f.root)]),d=await observe(base,f.root,{metadataProbe:()=>({check:async()=>{throw new Error('PRIVATE_ERROR_CANARY');},close:async()=>{}})});
    assert.equal(d.cwds[0]!.stop,'inspection-error');assert.equal(d.status,'partial');assert.equal(JSON.stringify(d).includes('PRIVATE_ERROR_CANARY'),false);
    assert.deepEqual({...base,instructionScope:d}.components,base.components);
  }finally{f.cleanup();}
});

test('default CWD limit and the existing access policy bound dispatch independently of Git scope',async()=>{
  const f=directoryFixture();try{
    const threads=Array.from({length:101},(_,i)=>thread(join(f.root,'missing-'+i),String(i)));
    const d=await observe(data(threads),f.root);assert.equal(d.cwds.length,100);assert.equal(d.qualifyingCwds,101);assert.equal(d.status,'partial');
    const allowed=f.mkdir(join(f.root,'allowed')),blocked=f.mkdir(join(f.root,'blocked'));let calls=0;
    const restricted=await observe(data([thread(blocked)]),f.root,{access:{metadataRoots:[allowed]},attributes:async()=>{calls++;return 16;}});
    assert.equal(restricted.cwds[0]!.stop,'outside-scope');assert.equal(restricted.operations,0);assert.equal(calls,0);
  }finally{f.cleanup();}
});

test('actual managed Windows metadata reader closes after the additional instruction pass', {skip:process.platform!=='win32'},async()=>{
  const f=directoryFixture();try{
    const cwd=f.mkdir(join(f.root,'managed-中-Ω'));f.mkdir(join(cwd,'.git'));fs.writeFileSync(join(cwd,'AGENTS.md'),'Synthetic contents');
    const d=await observeInstructionScope(data([thread(cwd)]),{root:f.root});
    assert.equal(d.cwds[0]!.candidate,cwd);assert.equal(d.status,'complete');assert.equal(d.entries.find(e=>e.path===join(cwd,'AGENTS.md'))!.state,'present');
  }finally{f.cleanup();}
});
