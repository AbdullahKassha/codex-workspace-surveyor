// Explicit disposable real-Git browser demo. No Codex source or recovery access.
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { directoryFixture, fixtureGit } from './discovery-fixture.js';
import { runExplorerEntry } from './explorer-entry.js';
import { serveLocalExplorer } from '../../src/explorer/server.js';
import { ExplorerSnapshot, reconcile, type ThreadClaim } from '../../src/explorer/model.js';
import { enrichExplorerSnapshot } from '../../src/explorer/discovery.js';

export async function runFolderExplorerDemo():Promise<number>{
  return runExplorerEntry({signals:process,write:text=>console.log(text),start:serveLocalExplorer,createFixture:()=>{
    const f=directoryFixture();let removed=false;
    const teardown=async()=>{if(!removed){f.cleanup();removed=true;}return true;};
    return {teardown,acquire:async signal=>{
      const git=fixtureGit(f),main=f.mkdir(join(f.root,'main-repository')),linked=join(f.owner,'linked-worktree'),other=f.mkdir(join(f.root,'unrelated-repository'));
      git(main,'init','--initial-branch=fixture-main');git(main,'commit','--allow-empty','-m','Invented fixture');git(main,'worktree','add','-b','fixture-linked',linked);
      git(other,'init','--initial-branch=fixture-other');
      const separate=f.mkdir(join(main,'separate-repository')),separateWorking=f.mkdir(join(separate,'working'));
      git(separate,'init','--initial-branch=fixture-separate','--separate-git-dir='+join(f.owner,'separate-admin'));
      const standalone=f.mkdir(join(f.root,'dated-container','standalone')),projectless=f.mkdir(join(f.root,'projectless')),plainProject=f.mkdir(join(f.root,'plain-project'));
      f.mkdir(join(standalone,'outputs'));f.mkdir(join(standalone,'work'));f.mkdir(join(main,'src'));
      for(const name of ['src','test','docs'])f.mkdir(join(plainProject,name,'nested'));
      const secondSource=f.mkdir(join(f.root,'second-source')),threadWorking=f.mkdir(join(f.root,'thread-working'));
      const missing=join(f.owner,'missing-parent','missing-project');const now=new Date().toISOString();
      const identifier=(n:number)=>'00000000-0000-0000-0000-'+n.toString().padStart(12,'0');
      const current=(n:number,cwd:string,title:string):ThreadClaim=>({id:identifier(n),cwd,title,titleSource:'session-index',titleResolution:'latest',titleState:'complete',ambiguous:false,sourceState:'ordinary',archived:false});
      const threads=[current(1,linked,'Review changes'),current(2,process.platform==='win32'?'\\\\?\\'+projectless:projectless,'Projectless notes'),current(3,main,'Main development'),
        ...Array.from({length:7},(_,i)=>current(i+4,plainProject,'Work item '+(i+1))),
        {...current(11,projectless,'Invented internal review'),sourceState:'subagent' as const},current(12,plainProject,'Unresolved relationship'),
        current(13,separate,'Separate repository root'),current(14,separateWorking,'Separate repository development')];
      threads[3]={...threads[3]!,title:'[$skill-installer](C:\\Synthetic\\skill\\SKILL.md) hatch pet',titleSource:'sqlite',titleResolution:'missing'};
      threads[4]={...threads[4]!,title:'Synthetic initial prompt\n'.repeat(100),titleSource:'sqlite',titleResolution:'missing'};
      threads[5]={...threads[5]!,cwd:threadWorking};threads[6]={...threads[6]!,cwd:secondSource};
      const data=reconcile({namespace:'synthetic-folder-demo',from:now,through:now},{rowsRead:threads.length,omittedRows:0,ambiguousIds:0,titles:'accepted',projects:'desktop-registry',correspondence:'qualified',unconsumedColumns:false},threads,
        [{id:'invented-main',label:'Invented main Project',roots:[main]},{id:'invented-missing',label:'Invented missing Project',roots:[missing]},
         {id:'invented-plain',label:'Invented ordinary Project',roots:[plainProject,secondSource]},
         {id:'invented-shared',label:'Invented shared Project',roots:[secondSource]},
         {id:'invented-separate',label:'Invented separate Project',roots:[separate]}],
        [{threadId:identifier(3),projectId:'invented-main',projectKind:'local'},...threads.slice(3,10).map(t=>({threadId:t.id,projectId:'invented-plain',projectKind:'local'})),
         {threadId:identifier(14),projectId:'invented-separate',projectKind:'local'}],
        [identifier(1),identifier(2),identifier(11),identifier(13)]);
      const snapshot=await enrichExplorerSnapshot(new ExplorerSnapshot(data),{root:f.root,signal});
      // Exact fixture teardown precedes browser delivery. Display is an observation
      // of those disposable trees while they existed, not their current existence.
      return {snapshot,safety:null};
    }};
  }});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))process.exitCode=await runFolderExplorerDemo();
