import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join, resolve, dirname, parse } from 'node:path';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { discoverRelationships, discoveryLimits, insidePath, validDiscoveryRoot, filesystemFailure, lstatPath } from '../src/explorer/discovery.js';
import { reconcile, locationKey, type ExplorerData, type ProjectClaim, type ThreadClaim } from '../src/explorer/model.js';
import { clientCode } from '../src/explorer/view.js';
import { workspacePresentation, folderCoverage, standaloneParent } from '../src/explorer/presentation.js';
import { preparePersonalExplorer } from './support/personal-explorer-entry.js';
import { directoryFixture as fixture, fixtureGit as gitFixture } from './support/discovery-fixture.js';

const provenance={namespace:'synthetic-folders',from:'2026-10-10T00:00:00Z',through:'2026-10-10T00:00:01Z'};
const coverage={rowsRead:0,omittedRows:0,ambiguousIds:0,titles:'accepted' as const,projects:'desktop-registry' as const,correspondence:'qualified' as const,unconsumedColumns:false};
const empty=(projects:ProjectClaim[]=[],threads:ThreadClaim[]=[],projectless:string[]=[])=>reconcile(provenance,coverage,threads,projects,[],projectless);
const thread=(id:string,cwd:string):ThreadClaim=>({id,cwd,title:'Invented '+id,ambiguous:false,sourceState:'ordinary',archived:false});
const syntheticAttributes=async()=>16;
const folder=(d:ExplorerData,path:string)=>d.discovery!.folders.findIndex(f=>locationKey(f.path)===locationKey(path));
const component=(d:ExplorerData,path:string)=>d.components.findIndex(c=>c.folders?.includes(folder(d,path)));
const discover=(d:ExplorerData,root:string,extra:Partial<Parameters<typeof discoverRelationships>[1]>={})=>discoverRelationships(d,{root,attributes:syntheticAttributes,...extra});

test('only exact Windows namespaced drive roots change lstat representation',()=>{
  for(const root of ['\\\\?\\C:\\','\\\\?\\z:\\'])assert.equal(lstatPath(root),process.platform==='win32'?root.slice(4):root);
  for(const path of ['C:\\','\\\\?\\C:\\Synthetic','\\\\?\\C:','\\\\?\\UNC\\server\\share\\','\\\\.\\C:\\','\\\\?\\Volume{invented}\\','\\\\?\\C:/'])assert.equal(lstatPath(path),path);
  assert.deepEqual(filesystemFailure({code:'EISDIR'}),{state:'inspection-error',reason:'inspection-error'});
});

test('real namespaced drive-root EISDIR does not fail a namespaced descendant; ancestor protections remain', {skip:process.platform!=='win32'},async()=>{
  const f=fixture();try{
    const target=f.mkdir(join(f.root,'namespaced-first')),root=parse(target).root,namespacedRoot='\\\\?\\'+root,namespaced='\\\\?\\'+target;
    assert.ok((await fs.promises.lstat(root)).isDirectory());
    // Reproduce the affected Node runtime directly, outside discovery.
    await assert.rejects(fs.promises.lstat(namespacedRoot),{code:'EISDIR'});
    const seen:string[]=[],data=empty([],[thread('namespaced',namespaced)],['namespaced']);
    const d=await discover(data,f.root,{attributes:async path=>{seen.push(path);return 16;}});
    assert.equal(d.discovery!.folders[folder(d,target)]!.state,'exists');assert.equal(d.discovery!.folders[folder(d,target)]!.path,namespaced);
    assert.equal(d.threads[0]!.cwd,namespaced);assert.ok(seen.includes(namespacedRoot));
    assert.equal(d.discovery!.diagnostics.some(n=>n.path===namespaced&&n.reason==='inspection-error'),false);
    // Managed attributes still inspect the original namespaced ancestor.
    for(const value of [1040,'access-denied','inspection-error'] as const){
      const failure=await discover(data,f.root,{attributes:async path=>path===namespacedRoot?value:16});
      assert.equal(failure.discovery!.folders[folder(failure,target)]!.state,value===1040?'reparse':value==='access-denied'?'inaccessible':'inspection-error');
    }
    const missing=namespaced+'\\absent',absent=await discover(empty([],[thread('missing',missing)],['missing']),f.root);
    assert.equal(absent.discovery!.folders[folder(absent,missing)]!.state,'missing');
    const link=join(f.root,'junction');fs.symlinkSync(target,link,'junction');const through='\\\\?\\'+link;
    const reparse=await discover(empty([],[thread('junction',through)],['junction']),f.root);
    assert.equal(reparse.discovery!.folders[folder(reparse,through)]!.state,'reparse');
  }finally{f.cleanup();}
});

test('physical discovery preserves standalone/nested components, Project existence and projectless CWD',async()=>{
  const f=fixture();try{
    const p=f.mkdir(join(f.root,'project')),free=f.mkdir(join(f.root,'projectless')),standalone=f.mkdir(join(f.root,'dated','new-chat'));
    const outputs=f.mkdir(join(standalone,'outputs')),work=f.mkdir(join(standalone,'work')),outside=f.mkdir(join(f.owner,'outside')),missing=join(f.root,'missing');
    const base=empty([{id:'p',label:'Existing',roots:[p]},{id:'missing',label:'Missing',roots:[missing]},{id:'outside',label:'Outside',roots:[outside]}],[thread('free',free)],['free']);
    const d=await discover(base,f.root);
    assert.deepEqual(d.memberships,['projectless']);assert.deepEqual(d.projects,base.projects);assert.deepEqual(d.threads,base.threads);
    for(const path of [p,free,standalone,outputs,work,outside])assert.equal(d.discovery!.folders[folder(d,path)]!.state,'exists');
    assert.equal(d.discovery!.folders[folder(d,missing)]!.state,'missing');assert.equal(d.discovery!.folders[folder(d,outside)]!.inspection,'exact-only');
    assert.ok(d.components[component(d,p)]!.projects.includes(0));assert.ok(d.components[component(d,free)]!.threads.includes(0));
    assert.deepEqual(d.components[component(d,standalone)]!.projects,[]);assert.notEqual(component(d,standalone),component(d,p));
    assert.notEqual(component(d,standalone),component(d,outputs));assert.notEqual(component(d,outputs),component(d,work));
    assert.ok(d.discovery!.relations.some(r=>r.kind==='directory-containment'&&r.subject.index===folder(d,outputs)&&r.target.index===folder(d,standalone)));
  }finally{f.cleanup();}
});

test('path comparisons preserve boundaries, ASCII/extended equivalence and Unicode distinctions',async()=>{
  assert.equal(insidePath('C:\\Synthetic\\a-two','C:\\Synthetic\\a'),false);
  assert.equal(insidePath('\\\\?\\C:\\SYNTHETIC\\a\\child','c:\\synthetic\\a'),true);
  assert.equal(insidePath('C:\\Synthetic\\İ\\child','C:\\Synthetic\\i\u0307'),false);
  assert.notEqual(locationKey('C:\\Synthetic\\İ'),locationKey('C:\\Synthetic\\i\u0307'));
  const f=fixture();try{
    const a=f.mkdir(join(f.root,'a')),b=f.mkdir(join(f.root,'a-two')),u=f.mkdir(join(f.root,'İ')),v=f.mkdir(join(f.root,'i\u0307'));
    const aliases=process.platform==='win32'?[a,a.toUpperCase(),'\\\\?\\'+a]:[a];
    const d=await discover(empty([{id:'p',label:'P',roots:aliases},{id:'u',label:'U',roots:[u]},{id:'v',label:'V',roots:[v]}]),f.root);
    assert.equal(d.discovery!.folders.filter(x=>locationKey(x.path)===locationKey(a)).length,1);
    assert.deepEqual(d.discovery!.folders[folder(d,a)]!.aliases,aliases);assert.notEqual(component(d,a),component(d,b));assert.notEqual(component(d,u),component(d,v));
  }finally{f.cleanup();}
});

test('exclusions, depth, entry/entity/work budgets and pre-cancellation are bounded',async()=>{
  const f=fixture();try{
    for(const name of ['node_modules','.git','dist','build','.next'])f.mkdir(join(f.root,name,'hidden'));
    const deep=f.mkdir(join(f.root,'one','two','three'));
    const d=await discover(empty(),f.root,{root:f.root,limits:{depth:2}});
    assert.equal(folder(d,deep),-1);assert.equal(folder(d,join(f.root,'node_modules','hidden')),-1);
    assert.equal(d.discovery!.folders[folder(d,join(f.root,'node_modules'))]!.inspection,'excluded');assert.equal(d.discovery!.status,'limited');
    for(const limits of [{folders:2},{entries:2},{operations:2}]){
      const limited=await discover(empty(),f.root,{root:f.root,limits});assert.equal(limited.discovery!.status,'limited');
      assert.ok(limited.discovery!.folders.length<=(limits.folders??discoveryLimits.folders));assert.ok(limited.discovery!.entries<=(limits.entries??discoveryLimits.entries)+1);
    }
    const controller=new AbortController();controller.abort();const cancelled=await discover(empty(),f.root,{root:f.root,signal:controller.signal});
    assert.equal(cancelled.discovery!.status,'cancelled');assert.equal(cancelled.discovery!.folders.length,0);
    await assert.rejects(discover(empty(),f.root,{root:f.root,limits:{depth:0}}));
  }finally{f.cleanup();}
});

test('junction/symlink directories and ancestors are not traversed',async()=>{
  const f=fixture();try{
    const outside=f.mkdir(join(f.owner,'private')),secret=f.mkdir(join(outside,'must-not-enumerate')),link=join(f.root,'junction');
    fs.symlinkSync(outside,link,process.platform==='win32'?'junction':'dir');
    const declared=join(link,'must-not-enumerate');
    const d=await discover(empty([{id:'p',label:'Reparse',roots:[declared]}]),f.root);
    assert.equal(d.discovery!.folders[folder(d,link)]!.state,'reparse');assert.equal(d.discovery!.folders[folder(d,declared)]!.state,'reparse');
    assert.equal(folder(d,secret),-1);assert.equal(folder(d,outside),-1);
  }finally{f.cleanup();}
});

test('all Windows reparse attributes and unavailable attribute service refuse conservatively',async()=>{
  const f=fixture();try{
    const special=f.mkdir(join(f.root,'other-reparse')),hidden=f.mkdir(join(special,'hidden'));
    const d=await discover(empty(),f.root,{root:f.root,attributes:async path=>path===special?1040:16});
    assert.equal(d.discovery!.folders[folder(d,special)]!.state,'reparse');assert.equal(folder(d,hidden),-1);
    const unavailable=await discover(empty([{id:'p',label:'Unavailable',roots:[special]}]),f.root,{root:f.root,attributes:async()=>null});
    assert.equal(unavailable.discovery!.folders[folder(unavailable,special)]!.state,'uninspected');assert.equal(unavailable.discovery!.git.length,0);
    if(process.platform==='win32'){
      const absent=await discoverRelationships(empty(),{root:f.root,executable:join(f.owner,'absent-pwsh.exe')});
      assert.equal(absent.discovery!.folders[0]!.state,'uninspected');
    }
  }finally{f.cleanup();}
});

function inventory(root:string):Map<string,string>{
  const found=new Map<string,string>();let count=0;
  const walk=(path:string)=>{assert.ok(++count<500);const stat=fs.lstatSync(path);if(stat.isSymbolicLink()){found.set(path,'link:'+fs.readlinkSync(path));return;}
    found.set(path,stat.isDirectory()?'directory':createHash('sha256').update(fs.readFileSync(path)).digest('hex'));
    if(stat.isDirectory())for(const name of fs.readdirSync(path))walk(join(path,name));};walk(root);return found;
}

test('authentic disposable Git main/linked/out-of-scope trees connect; unrelated and nongit remain separate without mutations',async()=>{
  const f=fixture();try{
    const run=gitFixture(f),main=f.mkdir(join(f.root,'main')),other=f.mkdir(join(f.root,'other')),plain=f.mkdir(join(f.root,'plain')),linked=join(f.owner,'outside-linked');
    run(main,'init','--initial-branch=fixture-main');run(main,'commit','--allow-empty','-m','Invented fixture');run(main,'worktree','add','-b','fixture-linked',linked);
    run(other,'init','--initial-branch=fixture-other');
    const child=f.mkdir(join(linked,'nested')),mainChild=f.mkdir(join(main,'nested')),nonGitChild=f.mkdir(join(plain,'nested'));
    const base=empty([{id:'main',label:'Main Project',roots:[main]}],[thread('linked',child)],['linked']);
    const before=inventory(f.owner);
    // No Git executable is invoked during discovery (even with no PATH).
    const path=process.env.PATH;process.env.PATH='';let d:ExplorerData;
    try{d=await discoverRelationships(base,{root:f.root,...(process.platform==='win32'?{executable:join(process.env.ProgramFiles!,'PowerShell','7','pwsh.exe')}:{})});}
    finally{if(path===undefined)delete process.env.PATH;else process.env.PATH=path;}
    assert.deepEqual(inventory(f.owner),before);
    const mainGit=d.discovery!.git.find(g=>g.folder===folder(d,main)),linkedGit=d.discovery!.git.find(g=>g.folder===folder(d,linked));
    assert.equal(mainGit?.kind,'main');assert.equal(linkedGit?.kind,'linked');assert.equal(mainGit?.state,'verified');assert.equal(linkedGit?.state,'verified');
    assert.equal(mainGit?.commonIdentity,linkedGit?.commonIdentity);assert.equal(mainGit?.common,linkedGit?.common);
    assert.equal(component(d,main),component(d,linked));assert.equal(component(d,main),component(d,child));
    assert.equal(component(d,main),component(d,mainChild));assert.notEqual(component(d,plain),component(d,nonGitChild));
    assert.notEqual(component(d,main),component(d,other));assert.notEqual(component(d,main),component(d,plain));
    assert.equal(d.discovery!.git.some(g=>g.folder===folder(d,plain)),false);assert.equal(d.discovery!.git.some(g=>g.folder===folder(d,nonGitChild)),false);
    assert.deepEqual(d.memberships,['projectless']);assert.equal(d.discovery!.folders[folder(d,linked)]!.origin,'git-metadata');
    // Starting with just the linked tree also finds the exact nominated main tree.
    const fromLinked=await discover(empty(),linked);assert.equal(component(fromLinked,main),component(fromLinked,linked));
    assert.deepEqual(inventory(f.owner),before);
  }finally{f.cleanup();}
});

test('authentic separate-git-dir and unresolved markers block ancestor fallback at nested roots and descendant CWDs',async()=>{
  const f=fixture();try{
    const run=gitFixture(f),main=f.mkdir(join(f.root,'main')),nested=f.mkdir(join(main,'separate')),admin=join(f.owner,'separate-admin'),linked=join(f.owner,'linked');
    run(main,'init','--initial-branch=fixture-main');run(main,'commit','--allow-empty','-m','Invented fixture');run(main,'worktree','add','-b','fixture-linked',linked);
    run(nested,'init','--initial-branch=fixture-separate','--separate-git-dir='+admin);
    const descendant=f.mkdir(join(nested,'working')),ordinary=f.mkdir(join(main,'working')),supported=f.mkdir(join(nested,'supported')),other=f.mkdir(join(f.root,'other'));
    run(supported,'init','--initial-branch=fixture-supported');run(other,'init','--initial-branch=fixture-other');
    const threads=[thread('nested-root',nested),thread('nested-descendant',descendant),thread('ordinary',ordinary),thread('linked',linked)];
    const data=reconcile(provenance,coverage,threads,[{id:'main',label:'Main Project',roots:[main]},{id:'nested',label:'Separate Project',roots:[nested]},
      {id:'other',label:'Unrelated Project',roots:[other]},{id:'supported',label:'Supported nested Project',roots:[supported]}],
      [{threadId:'nested-descendant',projectId:'nested',projectKind:'local'}],['nested-root','ordinary','linked']);
    const before=inventory(f.owner),d=await discover(data,f.root);assert.deepEqual(inventory(f.owner),before);
    assert.equal(d.discovery!.git.find(g=>g.folder===folder(d,nested))!.state,'unsupported');
    const mainGit=d.discovery!.git.findIndex(g=>g.folder===folder(d,main)&&g.state==='verified');assert.ok(mainGit>=0);
    for(const subject of [{kind:'project',index:1},{kind:'thread',index:0},{kind:'thread',index:1},{kind:'folder',index:folder(d,nested)},{kind:'folder',index:folder(d,descendant)}]){
      assert.equal(d.discovery!.relations.some(r=>r.kind==='inside-git-tree'&&r.subject.kind===subject.kind&&r.subject.index===subject.index),false);
    }
    assert.notEqual(component(d,main),component(d,nested));assert.notEqual(component(d,main),component(d,other));assert.notEqual(component(d,nested),component(d,supported));
    assert.equal(component(d,main),component(d,linked));assert.equal(component(d,main),component(d,ordinary));
    assert.ok(d.components[component(d,nested)]!.threads.includes(1));assert.ok(d.components[component(d,main)]!.projects.includes(0));
    assert.ok(d.discovery!.relations.some(r=>r.kind==='inside-git-tree'&&r.subject.kind==='thread'&&r.subject.index===2&&r.target.index===mainGit));
    assert.ok(d.discovery!.git.some(g=>g.folder===folder(d,supported)&&g.state==='verified'));
    const denied=await discover(data,f.root,{attributes:async path=>path===join(nested,'.git')?'access-denied':16});
    assert.equal(denied.discovery!.git.find(g=>g.folder===folder(denied,nested))!.state,'inaccessible');assert.notEqual(component(denied,main),component(denied,nested));
    assert.equal(denied.discovery!.relations.some(r=>r.kind==='inside-git-tree'&&r.subject.kind==='thread'&&r.subject.index===1),false);
    // The boundary is retained even when the Git count stops inspection before
    // an unsupported observation can be completed.
    const limited=await discover(data,f.root,{limits:{git:1}});assert.equal(limited.discovery!.status,'limited');
    assert.notEqual(component(limited,main),component(limited,nested));assert.equal(limited.discovery!.relations.some(r=>r.kind==='inside-git-tree'&&r.subject.kind==='project'&&r.subject.index===1),false);
    assert.deepEqual(inventory(f.owner),before);
  }finally{f.cleanup();}
});

test('dangling/unsupported/reparse Git metadata stays diagnostic and cannot invent a common repository',async()=>{
  const f=fixture();try{
    const run=gitFixture(f),main=f.mkdir(join(f.root,'main')),linked=join(f.owner,'linked');
    run(main,'init','--initial-branch=fixture-main');run(main,'commit','--allow-empty','-m','Invented fixture');run(main,'worktree','add','-b','fixture-linked',linked);
    // Delete only this fixture's working tree, retain authentic dangling admin metadata.
    assert.equal(dirname(resolve(linked)),resolve(f.owner));fs.rmSync(linked,{recursive:true});
    const bad=f.mkdir(join(f.root,'bad'));fs.writeFileSync(join(bad,'.git'),'gitdir: '+join(f.owner,'missing-admin'));
    const unsupported=f.mkdir(join(f.root,'unsupported')),admin=f.mkdir(join(f.owner,'separate-admin'));fs.writeFileSync(join(unsupported,'.git'),'gitdir: '+admin);
    const metaLink=f.mkdir(join(f.root,'meta-link'));fs.symlinkSync(join(main,'.git'),join(metaLink,'.git'),process.platform==='win32'?'junction':'dir');
    const d=await discover(empty(),f.root);
    assert.equal(d.discovery!.folders[folder(d,linked)]!.state,'missing');assert.ok(d.discovery!.diagnostics.some(n=>n.reason==='dangling-worktree-missing'));
    for(const p of [bad,unsupported,metaLink])assert.equal(d.discovery!.git.find(g=>g.folder===folder(d,p))?.state==='verified',false);
    assert.notEqual(component(d,main),component(d,bad));assert.notEqual(component(d,main),component(d,unsupported));
  }finally{f.cleanup();}
});

test('oversized/hardlinked Git pointer files and unreciprocated metadata are refused',async()=>{
  const f=fixture();try{
    const run=gitFixture(f),main=f.mkdir(join(f.root,'main')),linked=join(f.owner,'linked');
    run(main,'init','--initial-branch=fixture-main');run(main,'commit','--allow-empty','-m','Invented fixture');run(main,'worktree','add','-b','fixture-linked',linked);
    const marker=join(linked,'.git'),slot=fs.readFileSync(marker,'utf8').trim().slice(8);
    fs.writeFileSync(join(slot,'gitdir'),join(f.owner,'wrong','.git'));
    const oversized=f.mkdir(join(f.root,'oversized'));fs.writeFileSync(join(oversized,'.git'),'x'.repeat(16385));
    const hard=f.mkdir(join(f.root,'hard'));fs.linkSync(marker,join(hard,'.git'));
    const d=await discover(empty([{id:'l',label:'Linked',roots:[linked]}]),f.root);
    assert.equal(d.discovery!.git.some(g=>g.folder===folder(d,linked)&&g.state==='verified'),false);
    for(const p of [hard,oversized])assert.equal(d.discovery!.git.find(g=>g.folder===folder(d,p))?.state,'unsupported');
    assert.notEqual(component(d,main),component(d,linked));
  }finally{f.cleanup();}
});

test('discovery-root launch option is explicit, invocation-only and rejects broad/malformed roots',async()=>{
  const f=fixture();try{
    const context={home:'C:\\Synthetic\\Home',enabled:true,nodeVersion:'24.18.1',executable:'C:\\Synthetic\\pwsh.exe',scratchParent:'C:\\Synthetic\\Temp'};
    const signal=new AbortController().signal,selected=await preparePersonalExplorer(['--discovery-root',f.root],()=>{},context,signal);
    assert.equal(selected.discoveryRoot,f.root);assert.equal((await preparePersonalExplorer([],()=>{},context,signal)).discoveryRoot,undefined);
    for(const args of [['--discovery-root'],['--discovery-root','relative'],['--discovery-root',f.root,'--discovery-root',f.root]])await assert.rejects(preparePersonalExplorer(args,()=>{},context,signal));
    assert.equal(validDiscoveryRoot(process.platform==='win32'?'C:\\':'/'),false);
  }finally{f.cleanup();}
});

test('inaccessible Git metadata and invalid HEAD content cannot establish repository identity',async()=>{
  const f=fixture();try{
    const run=gitFixture(f),main=f.mkdir(join(f.root,'main'));run(main,'init','--initial-branch=fixture-main');
    const blocked=await discover(empty(),f.root,{attributes:async path=>path===join(main,'.git','HEAD')?null:16});
    assert.equal(blocked.discovery!.git.find(g=>g.folder===folder(blocked,main))?.state,'unsupported');
    fs.writeFileSync(join(main,'.git','HEAD'),'not a Git HEAD\n');const malformed=await discover(empty(),f.root);
    assert.equal(malformed.discovery!.git.find(g=>g.folder===folder(malformed,main))?.state,'unsupported');
    assert.equal(Object.isFrozen(malformed.discovery),true);assert.equal(Object.isFrozen(malformed.discovery!.folders),true);
  }finally{f.cleanup();}
});

test('one-way external metadata does not inspect an unrelated repository inventory',async()=>{
  const f=fixture();try{
    const run=gitFixture(f),main=f.mkdir(join(f.root,'main')),foreign=f.mkdir(join(f.owner,'foreign')),foreignLinked=join(f.owner,'foreign-linked');
    run(main,'init','--initial-branch=fixture-main');run(foreign,'init','--initial-branch=foreign-main');run(foreign,'commit','--allow-empty','-m','Invented fixture');run(foreign,'worktree','add','-b','foreign-linked',foreignLinked);
    const slot=f.mkdir(join(main,'.git','worktrees','bad-slot'));fs.writeFileSync(join(slot,'gitdir'),join(foreign,'.git')+'\n');
    const d=await discover(empty(),f.root);assert.equal(folder(d,foreignLinked),-1);
    assert.equal(d.discovery!.git.some(g=>g.folder===folder(d,foreign)&&g.state==='verified'),false);
    assert.ok(d.discovery!.diagnostics.some(n=>n.reason==='worktree-reference-unverified'));
  }finally{f.cleanup();}
});

test('cancellation during inspection stops further dispatch and preserves Codex evidence',async()=>{
  const f=fixture();try{
    f.mkdir(join(f.root,'first'));f.mkdir(join(f.root,'second'));const controller=new AbortController();let checks=0;
    const base=empty(),d=await discover(base,f.root,{signal:controller.signal,attributes:async()=>{if(++checks===10)controller.abort();return 16;}});
    assert.equal(d.discovery!.status,'cancelled');assert.deepEqual(d.threads,base.threads);assert.deepEqual(d.projects,base.projects);assert.equal(checks,10);
  }finally{f.cleanup();}
});

class Element {constructor(readonly tag=''){} children:Element[]=[];textContent='';className='';attributes:Record<string,string>={};onclick:(()=>void)|undefined;oninput:((event:{target:{value:string}})=>void)|undefined;
  open=false;ontoggle:(()=>void)|undefined;
  setAttribute(name:string,value:string){this.attributes[name]=value;}
  append(...children:Element[]){this.children.push(...children);}replaceChildren(...children:Element[]){this.children=children;}get childElementCount(){return this.children.length;}}
test('browser preserves numbered components and shows folder status, Git evidence, native find surfaces and Details',async()=>{
  const f=fixture();try{
    const run=gitFixture(f),main=f.mkdir(join(f.root,'main')),linked=join(f.owner,'linked'),plain=f.mkdir(join(f.root,'plain'));
    run(main,'init','--initial-branch=fixture-main');run(main,'commit','--allow-empty','-m','Invented fixture');run(main,'worktree','add','-b','fixture-linked',linked);
    const missing=join(f.root,'missing'),d=await discover(empty([{id:'p',label:'Missing Project',roots:[missing]}]),f.root);
    const elements=new Map<string,Element>(),get=(id:string)=>{let e=elements.get(id);if(!e){e=new Element();elements.set(id,e);}return e;};
    await runInNewContext(clientCode,{AbortController,document:{getElementById:get,createElement:()=>new Element(),createElementNS:()=>new Element()},location:{hash:'#synthetic',pathname:'/'},history:{replaceState(){}},addEventListener(){},fetch:async()=>({ok:true,json:async()=>d})});
    const texts=(e:Element):string[]=>[e.textContent,...e.children.flatMap(texts)];
    const find=(e:Element,value:string):Element|undefined=>e.onclick&&(e.textContent===value||e.children.some(c=>c.textContent===value))?e:e.children.map(c=>find(c,value)).find(Boolean);
    assert.ok(get('relationships').children.some(e=>e.attributes['data-workspace-group']==='1'));assert.ok(texts(get('relationships')).includes('Worktree'));
    assert.ok(texts(get('relationships')).includes('Missing folder'));
    find(get('relationships'),'Repository')!.onclick!();assert.ok(texts(get('details')).includes('Git metadata folder'));assert.equal(texts(get('details')).includes('Common Git directory'),false);assert.equal(texts(get('details')).includes('Linked worktrees'),false);assert.ok(texts(get('details')).includes('Main repository'));
    get('expand-threads').onclick!();assert.ok(texts(get('relationships')).includes('plain'));assert.ok(texts(get('relationships')).includes('main'));
    find(get('relationships'),'plain')!.onclick!();assert.ok(texts(get('details')).includes(plain));assert.equal(texts(get('details')).includes('Folder status'),false);
    get('close').onclick!();assert.equal(get('relationships').childElementCount,0);assert.equal(get('details').childElementCount,0);
    assert.ok(plain);
  }finally{f.cleanup();}
});

const texts=(e:Element):string[]=>[e.textContent,...e.children.flatMap(texts)];
const find=(e:Element,value:string):Element|undefined=>e.onclick&&(e.textContent===value||e.children.some(c=>c.textContent===value))?e:e.children.map(c=>find(c,value)).find(Boolean);
const nodes=(e:Element):Element[]=>[e,...e.children.flatMap(nodes)];
async function browser(data:ExplorerData){
  const elements=new Map<string,Element>(),get=(id:string)=>{let e=elements.get(id);if(!e){e=new Element();elements.set(id,e);}return e;};
  await runInNewContext(clientCode,{AbortController,document:{getElementById:get,createElement:(tag:string)=>new Element(tag),createElementNS:(_ns:string,tag:string)=>new Element(tag)},location:{hash:'#synthetic',pathname:'/'},history:{replaceState(){}},addEventListener(){},fetch:async()=>({ok:true,json:async()=>data})});
  return {get,groups:()=>get('relationships').children.filter(e=>e.attributes['data-workspace-group']!==undefined)};
}

test('Git Details explain verified common identity and location evidence without asserting a Codex boundary',async()=>{
  const f=fixture();try{
    const run=gitFixture(f),main=f.mkdir(join(f.root,'main')),linked=join(f.owner,'linked');
    run(main,'init','--initial-branch=fixture-main');run(main,'commit','--allow-empty','-m','Invented fixture');run(main,'worktree','add','-b','fixture-linked',linked);
    const child=f.mkdir(join(linked,'working')),d=await discover(empty([{id:'p',label:'Atlas',roots:[main]}],[thread('linked',child)],['linked']),f.root);
    const before=JSON.stringify(d),ui=await browser(d);
    find(ui.get('relationships'),'Thread linked')!.onclick!();
    assert.equal(texts(ui.get('details')).some(v=>v.includes('lexical path comparison')),false);
    assert.equal(find(ui.get('details'),'View worktree →'),undefined);assert.equal(find(ui.get('details'),'View repository →'),undefined);
    find(ui.get('relationships'),'Worktree')!.onclick!();
    for(const value of ['Linked worktree','Git verification','verified','Administrative directory','Common Git directory'])assert.ok(texts(ui.get('details')).includes(value));
    assert.ok(nodes(ui.get('details')).some(e=>e.tag==='details'&&texts(e).includes('Technical information')));
    find(ui.get('relationships'),'Atlas')!.onclick!();assert.equal(find(ui.get('details'),'View repository →'),undefined);
    find(ui.get('relationships'),'Repository')!.onclick!();assert.ok(texts(ui.get('details')).includes('Main repository'));
    assert.ok(texts(ui.get('details')).some(s=>s.includes('not Codex Project membership or an effective instruction boundary')));
    assert.deepEqual(d.memberships,['projectless']);assert.equal(ui.groups().length,1);assert.equal(JSON.stringify(d),before);
  }finally{f.cleanup();}
});

test('unverified Git links preserve missing, inaccessible and unsupported evidence without repository or marker claims',async()=>{
  const f=fixture();try{
    const path=f.mkdir(join(f.root,'uncertain'));f.mkdir(join(path,'.git'));
    const observed=await discover(empty([{id:'p',label:'Atlas',roots:[path]}]),f.root);
    assert.equal(observed.discovery!.git[0]!.state,'missing');
    for(const state of ['unsupported','missing','inaccessible'] as const){
      const d={...observed,discovery:{...observed.discovery!,git:observed.discovery!.git.map(g=>({...g,state,
        detail:'Invented '+state+' inspection result'}))}},before=JSON.stringify(d),ui=await browser(d);
      find(ui.get('relationships'),'Atlas')!.onclick!();assert.equal(find(ui.get('details'),'View Git evidence →'),undefined);
      assert.equal(find(ui.get('details'),'View repository →'),undefined);assert.equal(find(ui.get('details'),'View worktree →'),undefined);
      find(ui.get('relationships'),'Git '+state)!.onclick!();
      for(const value of ['Unverified Git metadata','Git metadata '+state+'. Repository identity was not verified.','Git verification',state])assert.ok(texts(ui.get('details')).includes(value));
      const normal=(e:Element):string[]=>[e.textContent,...e.children.filter(child=>child.tag!=='details').flatMap(normal)];
      assert.equal(normal(ui.get('details')).some(v=>/invalid repository|marker.*(present|exists)|boundary.*selected/i.test(v)),false);
      find(ui.get('details'),'Inspect evidence')!.onclick!();assert.ok(texts(ui.get('relationships')).includes('Invented '+state+' inspection result'));
      assert.equal(JSON.stringify(d),before);
    }
  }finally{f.cleanup();}
});

test('group Source branch preserves Git nesting and declares only actual registered roots without duplicate locations',async()=>{
  const f=fixture();try{
    const run=gitFixture(f),main=f.mkdir(join(f.root,'main')),linked=join(f.owner,'linked');
    run(main,'init','--initial-branch=fixture-main');run(main,'commit','--allow-empty','-m','Invented fixture');run(main,'worktree','add','-b','fixture-linked',linked);
    for(const roots of [[main],[linked],[main,linked]]){
      const d=await discover(empty([{id:'p',label:'Invented Project',roots}],[thread('main',main),thread('linked',linked)],['main','linked']),f.root);
      const ui=await browser(d),group=ui.groups()[0]!,tree=group.children.find(e=>e.className==='relationship-tree')!,source=tree.children.find(e=>e.className==='source-folders')!;
      assert.ok(source);assert.equal(nodes(group).filter(e=>e.className==='location-row').length,2);
      assert.equal(nodes(tree.children.find(e=>e.className==='project-block')!).some(e=>e.className==='source-folders'),false);
      const mainRow=nodes(group).find(e=>e.className==='location-row'&&find(e,'main'))!,worktrees=mainRow.children.find(e=>e.className==='worktree-list')!;
      assert.ok(worktrees);assert.ok(find(worktrees,'linked'));assert.ok(texts(worktrees).includes('Worktree'));
      for(const row of nodes(group).filter(e=>e.className==='location-row')){
        const path=texts(row).includes('main')&&!texts(row).includes('linked')?main:row===mainRow?main:linked;
        assert.equal(row.children.some(e=>e.className==='source-projects'),false);
        assert.equal(workspacePresentation(d)[0]!.locations.find(l=>locationKey(l.path)===locationKey(path))!.projects.includes(0),roots.includes(path));
      }
      if(roots.includes(main))assert.ok(nodes(source).includes(mainRow));else{assert.equal(nodes(source).includes(mainRow),false);assert.ok(find(source,'linked'));}
      if(roots.length===2)assert.equal(nodes(source).some(e=>e.className.includes('root-reference')),false);
      assert.ok(texts(group).includes('Projectless'));assert.equal(d.memberships[0],'projectless');assert.equal(d.memberships[1],'projectless');
    }
  }finally{f.cleanup();}
});

test('Workspace omits ordinary directories without changing evidence; nested independent roots survive',async()=>{
  const f=fixture();try{
    const p=f.mkdir(join(f.root,'project')),nested=f.mkdir(join(p,'nested-project')),free=f.mkdir(join(p,'thread-root'));
    for(const name of ['src','test','docs','outputs','work'])f.mkdir(join(p,name,'child'));
    f.mkdir(join(nested,'src'));f.mkdir(join(free,'work'));
    const base=empty([{id:'p',label:'Main',roots:[p]},{id:'n',label:'Independent nested',roots:[nested]}],[thread('free',free)],['free']);
    const d=await discover(base,f.root),before=JSON.stringify(d),shown=workspacePresentation(d);
    assert.equal(shown.length,3);assert.equal(JSON.stringify(d),before);
    const main=shown.find(c=>c.projects.includes(0))!;
    assert.deepEqual(main.folders,[folder(d,p)]);assert.equal(main.locations.some(l=>l.path===join(p,'src','child')),false);
    assert.equal(main.folders.includes(folder(d,nested)),false);assert.equal(main.folders.includes(folder(d,free)),false);
    assert.notEqual(component(d,p),component(d,nested));assert.deepEqual(d.memberships,['projectless']);
    const ui=await browser(d);assert.equal(ui.groups().length,3);
    assert.equal(find(ui.groups()[0]!,'src'),undefined);assert.equal(find(ui.groups()[0]!,'child'),undefined);
    assert.equal(texts(ui.get('relationships')).some(t=>t.includes('inventory')),false);
    assert.ok(d.discovery!.folders.some(f=>f.path===join(p,'src','child')));
    ui.get('expand-threads').onclick!();assert.equal(ui.groups().length,3);assert.equal(texts(ui.get('relationships')).includes(join(p,'docs','child')),false);
  }finally{f.cleanup();}
});

test('standalone branch has one location without child-directory UI and contiguous group numbering',async()=>{
  const f=fixture();try{
    const standalone=f.mkdir(join(f.root,'dated-container','new-chat'));
    f.mkdir(join(standalone,'outputs'));f.mkdir(join(standalone,'work'));
    const single=f.mkdir(join(f.root,'another-folder'));f.mkdir(join(single,'outputs'));
    const d=await discover(empty(),f.root),shown=workspacePresentation(d);
    assert.equal(shown.length,2);assert.ok(shown.some(c=>c.folders.includes(folder(d,standalone))));
    assert.ok(shown.some(c=>c.folders.includes(folder(d,single))));
    assert.equal(shown.some(c=>c.folders.includes(folder(d,join(standalone,'outputs')))),false);
    const ui=await browser(d);assert.deepEqual(ui.groups().map(g=>g.attributes['data-workspace-group']),['1','2']);
    const group=ui.groups().find(g=>find(g,'new-chat'))!;
    assert.ok(texts(group).includes('dated-container'));const projected=shown.find(c=>c.locations.some(l=>l.path===standalone))!;
    assert.equal(standaloneParent(d,shown,projected,projected.locations[0]!)!.path,join(f.root,'dated-container'));
    assert.equal(projected.locations.length,1);assert.equal(projected.folders.includes(folder(d,join(f.root,'dated-container'))),false);
    assert.equal(find(group,'outputs'),undefined);assert.equal(find(group,'work'),undefined);
    assert.equal(ui.get('relationships').children.some(e=>e.tag==='details'),false);
    assert.ok(d.discovery!.folders.some(f=>f.path===join(standalone,'outputs')));
    const before=JSON.stringify(d);find(ui.get('relationships'),'new-chat')!.onclick!();
    assert.ok(texts(ui.get('details')).includes('No associated Project or Thread found in this snapshot.'));
    assert.equal(texts(ui.get('details')).includes('No associated Project or Thread found.'),false);assert.equal(JSON.stringify(d),before);
  }finally{f.cleanup();}
});

test('missing outside-scope Project existence remains exact evidence; internal review records remain Diagnostics only',async()=>{
  const f=fixture();try{
    const missing=join(f.owner,'missing-parent','project'),existing=f.mkdir(join(f.owner,'existing-outside')),free=f.mkdir(join(f.root,'free'));
    const internal={...thread('internal',join(f.root,'never-nominate')),title:'Invented internal review',sourceState:'subagent' as const};
    const d=await discover(empty([{id:'missing',label:'Missing registry Project',roots:[missing]},{id:'existing',label:'Outside registry Project',roots:[existing]}],[thread('free',free),internal],['free']),f.root);
    assert.equal(folder(d,internal.cwd!),-1);assert.deepEqual(d.visibility,['inferred','internal']);
    const m=d.discovery!.folders[folder(d,missing)]!;
    assert.equal(m.state,'missing');assert.equal(folderCoverage(m,f.root),'children not inspected · outside selected discovery scope');
    const ui=await browser(d);assert.equal(ui.groups().length,3);
    assert.equal(ui.groups().some(g=>texts(g).includes(internal.title!)),false);
    assert.ok(texts(ui.get('relationships')).includes('Missing folder'));
    find(ui.get('relationships'),'project')!.onclick!();assert.ok(texts(ui.get('details')).includes('This path was checked; surrounding folders were not scanned.'));
    ui.get('diagnostics').onclick!();assert.ok(texts(ui.get('relationships')).includes('Internal records (1)'));
    const internalRecords=nodes(ui.get('relationships')).find(e=>e.children[0]?.textContent==='Internal records (1)')!;
    assert.equal(internalRecords.open,false);assert.equal(find(ui.get('relationships'),'Thread internal'),undefined);
    internalRecords.open=true;internalRecords.ontoggle?.();assert.ok(find(ui.get('relationships'),'Thread internal'));
    assert.deepEqual(workspacePresentation(d).find(c=>c.threads.includes(0))!.projects,[]);
  }finally{f.cleanup();}
});

test('verified nested Git identities and linked worktrees stay meaningful while implementation folders are absent',async()=>{
  const f=fixture();try{
    const run=gitFixture(f),project=f.mkdir(join(f.root,'project')),main=f.mkdir(join(project,'nested-repository')),linked=join(f.owner,'linked'),other=f.mkdir(join(f.root,'other'));
    run(main,'init','--initial-branch=fixture-main');run(main,'commit','--allow-empty','-m','Invented fixture');run(main,'worktree','add','-b','fixture-linked',linked);run(other,'init','--initial-branch=fixture-other');
    const src=f.mkdir(join(main,'src')),work=f.mkdir(join(linked,'work')),nested=f.mkdir(join(main,'workspace'));
    const d=await discover(empty([{id:'p',label:'Parent Project',roots:[project]},{id:'nested',label:'Nested workspace',roots:[nested]}],[thread('linked',linked)],['linked']),f.root);
    const shown=workspacePresentation(d);assert.equal(shown.length,3);
    const repo=shown.find(c=>c.folders.includes(folder(d,main)))!;
    assert.ok(repo.folders.includes(folder(d,linked)));assert.ok(repo.threads.includes(0));assert.deepEqual(repo.projects,[1]);
    assert.equal(repo.locations.some(l=>l.path===src),false);assert.equal(folder(d,work),-1); // External worktree children were not enumerated.
    assert.notEqual(component(d,project),component(d,main));
    const ui=await browser(d);assert.equal(ui.groups().length,3);const group=ui.groups().find(g=>find(g,'main')||find(g,'nested-repository'))!;
    assert.ok(texts(group).includes('Worktree'));assert.equal(find(group,'src'),undefined);
    find(ui.get('relationships'),'Nested workspace')!.onclick!();assert.equal(find(ui.get('details'),'View repository →'),undefined);
    find(ui.get('relationships'),'workspace')!.onclick!();assert.ok(find(ui.get('relationships'),'Repository')!.className.includes('related'));
  }finally{f.cleanup();}
});


test('access denial, attribute service failure and contents-enumeration errors remain distinct',async()=>{
  assert.equal(filesystemFailure({code:'ENOENT'}).state,'missing');assert.equal(filesystemFailure({code:'ENOTDIR'}).state,'not-directory');
  for(const code of ['EACCES','EPERM'])assert.deepEqual(filesystemFailure({code}),{state:'inaccessible',reason:'access-denied'});
  for(const code of ['EIO','EMFILE','ENFILE','ENOMEM','EINVAL',undefined])assert.equal(filesystemFailure({code}).state,'inspection-error');
  const f=fixture();try{
    const target=f.mkdir(join(f.root,'workspace')),base=empty([{id:'p',label:'P',roots:[target]}]);
    const unavailable=await discover(base,f.root,{attributes:async p=>p===target?null:16});
    assert.equal(unavailable.discovery!.folders[folder(unavailable,target)]!.state,'uninspected');
    assert.ok(unavailable.discovery!.diagnostics.some(d=>d.path===target&&d.reason==='attributes-unavailable'));
    const denied=await discover(base,f.root,{attributes:async p=>p===target?'access-denied':16});
    assert.equal(denied.discovery!.folders[folder(denied,target)]!.state,'inaccessible');
    const failed=await discover(base,f.root,{attributes:async p=>p===target?'inspection-error':16});
    assert.equal(failed.discovery!.folders[folder(failed,target)]!.state,'inspection-error');
    assert.ok(failed.discovery!.diagnostics.some(d=>d.path===target&&d.reason==='inspection-error'&&d.stage==='managed-attributes'&&d.at==='target'));
    const ui=await browser(failed);assert.ok(texts(ui.get('notices')).some(t=>t.includes('working folders')));find(ui.get('relationships'),'workspace')!.onclick!();
    find(ui.get('details'),'Inspect evidence')!.onclick!();
    const problems=nodes(ui.get('relationships')).find(e=>e.children[0]?.textContent.startsWith('Inspection problems ·'))!;
    Reflect.set(problems,'open',true);(Reflect.get(problems,'ontoggle') as ()=>void)();
    assert.ok(texts(ui.get('relationships')).includes('Inspection stage'));assert.ok(texts(ui.get('relationships')).includes('managed-attributes · target'));
    const ancestor=await discover(base,f.root,{attributes:async p=>p===f.owner?'inspection-error':16});
    assert.ok(ancestor.discovery!.diagnostics.some(d=>d.path===target&&d.stage==='managed-attributes'&&d.at==='ancestor'));
    for(const code of ['EIO','EACCES']){
      const contents=await discover(base,f.root,{openDirectory:async()=>{throw Object.assign(new Error('synthetic'),{code});}});
      assert.equal(contents.discovery!.folders[folder(contents,f.root)]!.state,'exists');
      assert.equal(contents.discovery!.folders[folder(contents,f.root)]!.inspection,'contents-unavailable');
      assert.equal(contents.discovery!.status,'limited');assert.ok(contents.discovery!.diagnostics.some(d=>d.reason==='contents-'+filesystemFailure({code}).reason&&d.stage==='directory-open'&&d.at==='target'));
    }
  }finally{f.cleanup();}
});

test('standalone parent context needs a single observed containment edge and never merges sibling roots or semantic entities',async()=>{
  const f=fixture();try{
    const first=f.mkdir(join(f.root,'first-container','workspace')),second=f.mkdir(join(f.root,'second-container','workspace'));
    f.mkdir(join(first,'outputs'));f.mkdir(join(second,'work'));
    const siblingA=f.mkdir(join(f.root,'shared-container','a')),siblingB=f.mkdir(join(f.root,'shared-container','b'));
    const d=await discover(empty([{id:'p',label:'Nested Project',roots:[siblingA]}]),f.root),groups=workspacePresentation(d),before=JSON.stringify(d);
    const one=groups.find(c=>c.locations.some(l=>l.path===first))!,two=groups.find(c=>c.locations.some(l=>l.path===second))!;
    assert.notEqual(one,two);assert.equal(standaloneParent(d,groups,one,one.locations[0]!)!.path,join(f.root,'first-container'));
    assert.equal(standaloneParent(d,groups,two,two.locations[0]!)!.path,join(f.root,'second-container'));
    const sibling=groups.find(c=>c.locations.some(l=>l.path===siblingB))!;assert.equal(standaloneParent(d,groups,sibling,sibling.locations[0]!),null);
    const project=groups.find(c=>c.projects.includes(0))!;assert.equal(standaloneParent(d,groups,project,project.locations[0]!),null);
    const missingEdge={...d,discovery:{...d.discovery!,relations:d.discovery!.relations.filter(r=>r.kind!=='directory-containment')}};assert.equal(standaloneParent(missingEdge,groups,one,one.locations[0]!),null);
    assert.equal(JSON.stringify(d),before);assert.equal(one.projects.length,0);assert.equal(one.threads.length,0);
    const ui=await browser(d);assert.equal(ui.groups().length,groups.length);assert.deepEqual(ui.groups().map(g=>g.attributes['data-workspace-group']),groups.map(g=>String(g.number)));
    assert.equal(find(ui.groups().find(g=>texts(g).includes('first-container'))!,'outputs'),undefined);assert.notEqual(component(d,first),component(d,second));
  }finally{f.cleanup();}
});

test('actual managed reader survives full discovery ordering, repeated scans and qualified Windows path variants', {skip:process.platform!=='win32'}, async()=>{
  const f=fixture();try{
    const target=f.mkdir(join(f.root,'empty-workspace')),unicode=f.mkdir(join(f.root,'readable-Ω'));
    for(let i=0;i<12;i++)f.mkdir(join(f.root,'container-'+i,'child'));
    const aliases=[target,target+'\\',target.toUpperCase(),'\\\\?\\'+target,target.replaceAll('\\','/')];
    const base=empty([{id:'p',label:'Synthetic Project',roots:[unicode]}],aliases.map((p,i)=>thread('variant-'+i,p)),aliases.map((_,i)=>'variant-'+i));
    for(let scan=0;scan<3;scan++){
      const d=await discoverRelationships(base,{root:f.root,executable:process.env.WORKSPACE_SURVEYOR_HELPER_PWSH??join(process.env.ProgramFiles??'','PowerShell','7','pwsh.exe')});
      assert.equal(d.discovery!.folders[folder(d,target)]!.state,'exists');assert.equal(d.discovery!.folders[folder(d,unicode)]!.state,'exists');
      assert.deepEqual(d.discovery!.folders[folder(d,target)]!.aliases,aliases);assert.equal(d.discovery!.folders[folder(d,target)]!.inspection,'enumerated');
      assert.equal(d.discovery!.diagnostics.some(n=>n.stage!==undefined),false);assert.equal(d.discovery!.status,'complete');assert.deepEqual(d.memberships,aliases.map(()=>'projectless'));
    }
  }finally{f.cleanup();}
});
