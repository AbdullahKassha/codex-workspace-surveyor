import { lstat, open, opendir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { dirname, isAbsolute, join, parse, resolve } from 'node:path';
import { homedir } from 'node:os';
import { ExplorerSnapshot, locationKey, windowsPathKey, type ExplorerData, type DiscoveryObservation, type DiscoveryDiagnostic,
  type FolderObservation, type GitObservation, type PhysicalRelation } from './model.js';

export const discoveryLimits=Object.freeze({depth:4,folders:600,entries:6000,operations:30000,milliseconds:20000,git:100});
const excluded=new Set(['.git','node_modules','dist','build','out','target','coverage','.next','.cache','.venv','venv','vendor','bin','obj']);
type Limits={depth:number;folders:number;entries:number;operations:number;milliseconds:number;git:number};
export type DiscoveryOptions={root:string;signal?:AbortSignal;executable?:string;limits?:Partial<Limits>;
  access?:Readonly<{metadataRoots:readonly string[]}>;
  // Internal test seam; never selected from personal command arguments.
  attributes?:(path:string)=>Promise<number|null|'access-denied'|'missing'|'inspection-error'>;
  openDirectory?:typeof opendir};
export function validDiscoveryPath(path:string):boolean {
  return path.length<=16384&&!/[\x00-\x1f]/.test(path)&&isAbsolute(path)&&
    (process.platform!=='win32'||windowsPathKey(path)!==null&&!locationKey(path).startsWith('\\\\'));
}
export function validDiscoveryRoot(path:string):boolean {
  return validDiscoveryPath(path)&&locationKey(path)!==locationKey(parse(path).root)&&locationKey(path)!==locationKey(homedir());
}
export function insidePath(child:string,parent:string):boolean {
  const c=locationKey(child),p=locationKey(parent);
  const separator=windowsPathKey(child)!==null&&windowsPathKey(parent)!==null?'\\':'/';
  return c===p||c.startsWith(p.replace(/[\\/]$/,'')+separator);
}
function pointerPath(base:string,value:string):string {
  if(process.platform==='win32'&&!isAbsolute(value)&&(/:/.test(value)||/^[\\/]/.test(value)))throw new Error('unsupported');
  const path=resolve(base,value);if(!validDiscoveryPath(path))throw new Error('unsupported');return path;
}
function validHead(value:string):boolean {
  return /^[a-f0-9]{40}$|^[a-f0-9]{64}$/i.test(value)||value.startsWith('ref: refs/')&&
    !/[\x00-\x20~^:?*\[\\]/.test(value.slice(5))&&!value.includes('..')&&!value.includes('@{')&&!value.includes('//')&&!/[/.]$/.test(value);
}

// Node lstat covers symlinks/junctions. On Windows additionally refuse *every*
// ReparsePoint attribute, including tags Node does not interpret as symlinks.
// One read-only managed process, fixed code, no profiles or command interpolation.
// Pipe strings are UTF-8. Windows' inherited console code page is not a valid
// decoder for Node's writes; pin encodings inside this child only.
function attributeReader(executable:string|undefined){
  const script="[Console]::InputEncoding=[Text.UTF8Encoding]::new($false,$true); [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); $ErrorActionPreference='Stop'; while ($null -ne ($line=[Console]::ReadLine())) { try { $p=ConvertFrom-Json -InputObject $line; if ($p -isnot [string]) { throw 'invalid' }; $a=[int][IO.File]::GetAttributes($p); [Console]::WriteLine($a) } catch { $e=$_.Exception; while ($null -ne $e.InnerException) { $e=$e.InnerException }; if ($e -is [UnauthorizedAccessException]) { [Console]::WriteLine('access-denied') } elseif ($e -is [IO.FileNotFoundException] -or $e -is [IO.DirectoryNotFoundException]) { [Console]::WriteLine('missing') } else { [Console]::WriteLine('inspection-error') } } }";
  if(!executable)return {read:async(_path:string)=>null,close:async()=>{}};
  const child=spawn(executable,['-NoLogo','-NoProfile','-NonInteractive','-Command',script],{stdio:['pipe','pipe','pipe'],windowsHide:true});
  type Attribute=number|null|'access-denied'|'missing'|'inspection-error';
  let pending:((value:Attribute)=>void)|undefined,failed=false;
  const lines=createInterface({input:child.stdout});
  lines.on('line',line=>{const done=pending;pending=undefined;done?.(/^\d{1,10}$/.test(line)?Number(line):line==='access-denied'||line==='missing'||line==='inspection-error'?line:null);});
  child.stderr.on('data',()=>{}); // Never retain or forward managed diagnostics.
  const ended=new Promise<void>(done=>{const end=()=>{failed=true;pending?.(null);pending=undefined;done();};child.once('error',end);child.once('close',end);});
  child.stdin.on('error',()=>{failed=true;pending?.(null);pending=undefined;});
  return {read:(path:string):Promise<Attribute>=>failed?Promise.resolve(null):new Promise(done=>{
    pending=done;child.stdin.write(JSON.stringify(path)+'\n',error=>{if(error){failed=true;pending?.(null);pending=undefined;}});
  }),close:async()=>{child.stdin.end();await ended;lines.close();}};
}

class Stop extends Error {}
type State=FolderObservation['state'];
export function filesystemFailure(error:unknown):{state:State;reason:string} {
  const code=(error as NodeJS.ErrnoException)?.code;
  if(code==='ENOENT')return {state:'missing',reason:'missing'};
  if(code==='ENOTDIR')return {state:'not-directory',reason:'not-directory'};
  if(code==='EACCES'||code==='EPERM')return {state:'inaccessible',reason:'access-denied'};
  return {state:'inspection-error',reason:code==='EIO'?'io-error':['EMFILE','ENFILE','ENOMEM'].includes(code||'')?'resource-unavailable':'inspection-error'};
}

// Node on Windows can return EISDIR for the exact namespaced drive root.
// Only that root's lstat representation changes; stored paths, ancestors and
// managed ReparsePoint checks retain their original strings. UNC/device and
// descendant namespace paths are deliberately left alone.
export function lstatPath(path:string):string {
  return process.platform==='win32'&&/^\\\\\?\\[A-Za-z]:\\$/.test(path)?path.slice(4):path;
}

// All findings stay in the one-use browser snapshot; no source/repository writes.
export async function discoverRelationships(data:ExplorerData,options:DiscoveryOptions):Promise<ExplorerData>{
  if(!validDiscoveryRoot(options.root))throw new Error('Discovery root refused');
  if(options.access&&(options.access.metadataRoots.length>16||options.access.metadataRoots.some(root=>!validDiscoveryRoot(root))||
    !options.access.metadataRoots.some(root=>insidePath(options.root,root))))throw new Error('Discovery scope refused');
  const limits={...discoveryLimits,...options.limits};
  for(const key of Object.keys(limits) as (keyof Limits)[])if(!Number.isInteger(limits[key])||limits[key]<1||limits[key]>discoveryLimits[key])throw new Error('Discovery limits refused');
  const folders:FolderObservation[]=[],git:GitObservation[]=[],relations:PhysicalRelation[]=[],diagnostics:DiscoveryDiagnostic[]=[];
  const folderByKey=new Map<string,number>(),examined=new Set<number>(),commonVisited=new Set<string>(),gitBoundaries=new Set<number>();
  let operations=0,entries=0,status:DiscoveryObservation['status']='complete';const started=Date.now(),from=new Date(started).toISOString();
  const service=process.platform==='win32'&&!options.attributes&&!options.signal?.aborted?attributeReader(options.executable??join(process.env.ProgramFiles??'','PowerShell','7','pwsh.exe')):undefined;
  const attributes=options.attributes??service?.read;
  const step=()=>{if(options.signal?.aborted){status='cancelled';throw new Stop();}
    if(operations>=limits.operations||Date.now()-started>limits.milliseconds){status='limited';throw new Stop();}operations++;};
  const note=(path:string,reason:string,stage?:DiscoveryDiagnostic['stage'],at?:DiscoveryDiagnostic['at'])=>{if(diagnostics.length<limits.folders)diagnostics.push({path,reason,...(stage?{stage}:{}),...(at?{at}:{})});};
  const safeStat=async(path:string):Promise<{state:State;stat?:Awaited<ReturnType<typeof lstat>>;identity?:FolderObservation['identity']}>=>{
    if(!validDiscoveryPath(path))return {state:'uninspected'};
    if(options.access&&!options.access.metadataRoots.some(root=>insidePath(path,root))){note(path,'outside-approved-scope');return {state:'uninspected'};}
    const chain:string[]=[];let current=path;for(let i=0;;i++){
      if(i>64)return {state:'uninspected'};chain.push(current);const parent=dirname(current);if(parent===current)break;current=parent;
    }
    let last:Awaited<ReturnType<typeof lstat>>|undefined;
    for(const member of chain.reverse()){
      step();try{last=await lstat(lstatPath(member));}catch(error){const failure=filesystemFailure(error);if(failure.state!=='missing')note(path,failure.reason,'node-lstat',member===path?'target':'ancestor');return {state:failure.state};}
      if(last.isSymbolicLink())return {state:'reparse'};
      if(attributes){step();const value=await attributes(member);if(typeof value!=='number'){
        note(path,value===null?'attributes-unavailable':value,'managed-attributes',member===path?'target':'ancestor');return {state:value==='access-denied'?'inaccessible':value==='missing'?'missing':value==='inspection-error'?'inspection-error':'uninspected'};
      }if(value&1024)return {state:'reparse'};}
      if(member!==path&&!last.isDirectory())return {state:'not-directory'};
    }
    // Node's numeric Windows file IDs can exceed its exact integer range.
    // Capture the actual directory identity without rounding it for selection.
    if(options.access&&last!.isDirectory()){
      step();const precise=await lstat(lstatPath(path),{bigint:true});
      if(!precise.isDirectory()||precise.isSymbolicLink()||Number(precise.dev)!==last!.dev||Number(precise.ino)!==last!.ino)return {state:'uninspected'};
      return {state:'exists',stat:last!,identity:{device:String(precise.dev),file:String(precise.ino)}};
    }
    return {state:'exists',stat:last!};
  };
  const directory=async(path:string)=>{const s=await safeStat(path);return s.state==='exists'&&!s.stat!.isDirectory()?{state:'not-directory' as const}:s;};
  const addFolder=async(path:string,origin:FolderObservation['origin']):Promise<number>=>{
    const key=locationKey(path),previous=folderByKey.get(key);
    if(previous!==undefined){const f=folders[previous]!;folders[previous]={...f,
      origin:origin==='discovery'?'discovery':f.origin==='declared'?origin:f.origin,
      aliases:f.aliases.includes(path)?f.aliases:[...f.aliases,path]};return previous;}
    if(folders.length>=limits.folders){status='limited';throw new Stop();}
    const s=await directory(path),i=folders.length;
    folders.push({path,aliases:[path],origin,state:s.state,inspection:s.state==='exists'?'exact-only':'uninspected',
      ...('identity' in s&&s.identity?{identity:s.identity}:{})});folderByKey.set(key,i);return i;
  };
  const metadataText=async(path:string):Promise<string>=>{
    const s=await safeStat(path);if(s.state!=='exists')throw new Error(s.state);
    if(!s.stat!.isFile()||s.stat!.size>16384||s.stat!.nlink!==1)throw new Error('unsupported');
    step();const handle=await open(path,constants.O_RDONLY|(process.platform==='win32'?0:constants.O_NOFOLLOW));
    try{const before=await handle.stat();if(before.dev!==s.stat!.dev||before.ino!==s.stat!.ino||before.size!==s.stat!.size)throw new Error('unsupported');
      const bytes=Buffer.alloc(16385);step();const {bytesRead}=await handle.read(bytes,0,bytes.length,0);const after=await handle.stat();
      const checked=await safeStat(path);if(bytesRead>16384||bytesRead!==before.size||before.size!==after.size||before.mtimeMs!==after.mtimeMs||before.ctimeMs!==after.ctimeMs||checked.state!=='exists'||checked.stat!.ino!==before.ino||checked.stat!.dev!==before.dev)throw new Error('unsupported');
      const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(0,bytesRead)).replace(/\r?\n$/,'');
      if(!text||/[\x00-\x1f]/.test(text))throw new Error('unsupported');return text;
    }finally{await handle.close();}
  };
  const list=async(path:string,visit:(name:string,ordinaryFile:boolean)=>Promise<void>)=>{
    const checked=await directory(path);if(checked.state!=='exists'){note(path,checked.state);return false;}
    step();let stream:Awaited<ReturnType<typeof opendir>>;
    try{stream=await (options.openDirectory??opendir)(path,{bufferSize:16});}catch(error){note(path,'contents-'+filesystemFailure(error).reason,'directory-open','target');return false;}
    let iterated=false,stage:DiscoveryDiagnostic['stage']='directory-identity';
    try{
      const again=await directory(path);
      if(again.state!=='exists'||again.stat!.dev!==checked.stat!.dev||again.stat!.ino!==checked.stat!.ino){note(path,'directory-changed','directory-identity','target');return false;}
      iterated=true;stage='directory-read';
      for await(const entry of stream){step();if(entries>=limits.entries){status='limited';throw new Stop();}entries++;stage='directory-entry';await visit(entry.name,entry.isFile()&&!entry.isSymbolicLink());stage='directory-read';}
      return true;
    }catch(error){if(error instanceof Stop)throw error;note(path,'contents-'+filesystemFailure(error).reason,stage,'target');return false;}
    finally{if(!iterated)await stream.close();}
  };
  const inspectGit=async(folder:number,expected?:{admin:string;common:string}):Promise<void>=>{
    if(examined.has(folder)||folders[folder]!.state!=='exists')return;examined.add(folder);
    const path=folders[folder]!.path,marker=join(path,'.git'),mark=await safeStat(marker);
    if(mark.state==='missing')return;
    // An observed or unresolved marker is a boundary even if its identity is
    // unsupported, unavailable, or the remaining Git inspection budget ends.
    gitBoundaries.add(folder);
    if(git.length>=limits.git){status='limited';throw new Stop();}
    let admin=marker,common=marker,kind:GitObservation['kind']='main';
    try{
      if(mark.state!=='exists')throw new Error(mark.state);
      if(mark.stat!.isFile()){
        const text=await metadataText(marker);if(!text.startsWith('gitdir: '))throw new Error('unsupported');
        admin=pointerPath(path,text.slice(8));const d=await directory(admin);if(d.state!=='exists')throw new Error(d.state);
        const commonMarker=await safeStat(join(admin,'commondir'));
        // Submodules/separate-git-dir files are not linked worktrees.
        if(commonMarker.state==='missing')throw new Error('unsupported');
        common=pointerPath(admin,await metadataText(join(admin,'commondir')));kind='linked';
        if(locationKey(dirname(admin))!==locationKey(join(common,'worktrees')))throw new Error('unsupported');
        const backlink=await metadataText(join(admin,'gitdir'));
        if(locationKey(pointerPath(admin,backlink))!==locationKey(marker))throw new Error('unsupported');
      }else if(!mark.stat!.isDirectory())throw new Error('unsupported');
      else if((await safeStat(join(admin,'commondir'))).state!=='missing')throw new Error('unsupported');
      if(expected&&(locationKey(admin)!==locationKey(expected.admin)||locationKey(common)!==locationKey(expected.common)))throw new Error('unsupported');
      const c=await directory(common),head=await safeStat(join(admin,'HEAD')),objects=await directory(join(common,'objects')),refs=await directory(join(common,'refs'));
      if(c.state!=='exists'||head.state!=='exists'||objects.state!=='exists'||refs.state!=='exists')throw new Error([c,head,objects,refs].find(s=>s.state!=='exists')!.state);
      if(!head.stat!.isFile()||c.stat!.ino===0)throw new Error('unsupported');
      if(!validHead(await metadataText(join(admin,'HEAD'))))throw new Error('unsupported');
      const identity=locationKey(common)+'|'+c.stat!.dev+':'+c.stat!.ino;
      git.push({folder,kind,state:'verified',admin,common,commonIdentity:identity,detail:'Valid HEAD and objects/refs directories; reciprocal linked-worktree metadata where applicable'});
      if(commonVisited.has(identity))return;commonVisited.add(identity);
      // A common directory ending in .git only nominates a possible main tree;
      // it becomes a relationship after its own .git structure is verified.
      if(locationKey(common)===locationKey(join(dirname(common),'.git'))){const main=await addFolder(dirname(common),'git-metadata');await inspectGit(main,{admin:common,common});}
      const inventory=join(common,'worktrees'),inventoryState=await directory(inventory);
      if(inventoryState.state==='missing')return;
      if(inventoryState.state!=='exists'){note(inventory,inventoryState.state);return;}
      await list(inventory,async name=>{
        const slot=join(inventory,name),s=await directory(slot);if(s.state!=='exists'){note(slot,s.state);return;}
        try{
          const backlink=await metadataText(join(slot,'gitdir')),markerPath=pointerPath(slot,backlink);
          if(locationKey(markerPath)!==locationKey(join(dirname(markerPath),'.git')))throw new Error('unsupported');
          const f=await addFolder(dirname(markerPath),'git-metadata');await inspectGit(f,{admin:slot,common});
          if(folders[f]!.state!=='exists')note(markerPath,'dangling-worktree-'+folders[f]!.state);
          else if(!git.some(g=>g.folder===f&&g.state==='verified'&&g.commonIdentity===identity))note(markerPath,'worktree-reference-unverified');
        }catch(error){if(error instanceof Stop)throw error;note(slot,'unsupported-worktree-metadata');}
      });
    }catch(error){if(error instanceof Stop)throw error;const reason=error instanceof Error?error.message:'';
      git.push({folder,kind:'unsupported',state:reason==='missing'?'missing':reason==='inaccessible'?'inaccessible':'unsupported',detail:reason==='reparse'?'reparse metadata refused':'Git metadata unavailable or unsupported'});
    }
  };
  const queue:{folder:number;depth:number}[]=[];let enumerating:number|undefined;
  try{
    const root=await addFolder(options.root,'discovery');queue.push({folder:root,depth:0});
    if(folders[root]!.state!=='exists'){status='limited';note(options.root,folders[root]!.state);}
    // Exact declared roots and ordinary CWDs may be outside enumeration scope;
    // inspect their existence and bounded .git ancestors, never sibling trees.
    const declared=[...data.projects.flatMap(p=>p.roots),...data.threads.flatMap((t,i)=>data.visibility[i]==='inferred'&&t.cwd!==null?[t.cwd]:[])];
    for(const path of declared){const f=await addFolder(path,'declared');if(folders[f]!.state!=='exists')continue;
      let current=path;for(let depth=0;depth<12;depth++){
        const index=await addFolder(current,'declared');await inspectGit(index);
        if(git.some(g=>g.folder===index)||locationKey(current)===locationKey(options.root))break;
        const parent=dirname(current);if(parent===current||locationKey(parent)===locationKey(parse(parent).root))break;current=parent;
        // Ancestors are only nominated for Git inspection, not shown as folders.
      }
    }
    for(let q=0;q<queue.length;q++){
      const {folder,depth}=queue[q]!,f=folders[folder]!;if(f.state!=='exists')continue;await inspectGit(folder);
      if(depth>=limits.depth){status='limited';folders[folder]={...folders[folder]!,inspection:'depth-limit'};note(f.path,'depth-limit');continue;}
      enumerating=folder;
      const completed=await list(f.path,async(name,ordinaryFile)=>{
        if(name.toLowerCase()==='.git'||ordinaryFile)return;const path=join(f.path,name),s=await safeStat(path);
        if(s.state==='exists'&&!s.stat!.isDirectory())return;
        if(s.state!=='exists'&&s.state!=='reparse'){note(path,s.state);return;}
        const child=await addFolder(path,'discovery');folders[child]={...folders[child]!,parent:folder};
        relations.push({kind:'directory-containment',subject:{kind:'folder',index:child},target:{kind:'folder',index:folder},evidence:'observed-directory'});
        if(s.state==='reparse'){note(path,'reparse-skipped');return;}
        if(excluded.has(name.toLowerCase())){folders[child]={...folders[child]!,inspection:'excluded'};note(path,'excluded-tree');return;}
        queue.push({folder:child,depth:depth+1});
      });
      folders[folder]={...folders[folder]!,inspection:completed?'enumerated':'contents-unavailable'};if(!completed)status='limited';enumerating=undefined;
    }
  }catch(error){if(!(error instanceof Stop))throw error;note(options.root,options.signal?.aborted?'cancelled':'discovery-limit');
    if(enumerating!==undefined)folders[enumerating]={...folders[enumerating]!,inspection:'entry-limit'};}
  finally{await service?.close();}
  // Containment is evidence only and never unions components. No broad ancestor
  // (or registry membership inference) can bridge unrelated Projects.
  const physical=(kind:'project'|'thread'|'folder',index:number,path:string)=>{
    const folder=folderByKey.get(locationKey(path));if(folder!==undefined&&kind!=='folder')relations.push({kind:'physical-location',subject:{kind,index},target:{kind:'folder',index:folder},evidence:'observed-path'});
    const boundary=[...gitBoundaries].filter(i=>insidePath(path,folders[i]!.path))
      .sort((a,b)=>locationKey(folders[b]!.path).length-locationKey(folders[a]!.path).length)[0];
    const closest=git.findIndex(g=>g.folder===boundary&&g.state==='verified');
    if(closest>=0&&folder!==undefined&&folders[folder]!.state==='exists')relations.push({kind:'inside-git-tree',subject:{kind,index},target:{kind:'git',index:closest},evidence:'lexical-containment'});
  };
  data.projects.forEach((p,i)=>p.roots.forEach(path=>physical('project',i,path)));
  data.threads.forEach((t,i)=>{if(data.visibility[i]==='inferred'&&t.cwd!==null)physical('thread',i,t.cwd);});
  folders.forEach((f,i)=>{if(f.state==='exists'&&f.origin!=='declared')physical('folder',i,f.path);});
  git.forEach((g,i)=>{if(g.state==='verified')git.slice(0,i).forEach((other,j)=>{
    if(other.state==='verified'&&other.commonIdentity===g.commonIdentity)relations.push({kind:'same-git-repository',subject:{kind:'git',index:i},target:{kind:'git',index:j},evidence:'verified-git-metadata'});
  });});
  const offsets={project:0,thread:data.projects.length,folder:data.projects.length+data.threads.length,git:data.projects.length+data.threads.length+folders.length};
  const parents=Array.from({length:offsets.git+git.length},(_,i)=>i),root=(n:number):number=>{while(parents[n]!==n)n=parents[n]!;return n;};
  const connect=(a:number,b:number)=>{parents[root(a)]=root(b);};
  data.components.forEach(c=>{const nodes=[...c.projects.map(i=>offsets.project+i),...c.threads.map(i=>offsets.thread+i)];nodes.slice(1).forEach(n=>connect(nodes[0]!,n));});
  git.forEach((g,i)=>connect(offsets.folder+g.folder,offsets.git+i));
  relations.forEach(r=>{if(r.kind!=='directory-containment')connect(offsets[r.subject.kind]+r.subject.index,offsets[r.target.kind]+r.target.index);});
  const groups=new Map<number,{projects:number[];threads:number[];folders:number[];git:number[]}>();
  const add=(kind:keyof typeof offsets,index:number)=>{const n=root(offsets[kind]+index);let g=groups.get(n);if(!g){g={projects:[],threads:[],folders:[],git:[]};groups.set(n,g);}g[`${kind==='git'?'git':kind+'s'}` as keyof typeof g].push(index);};
  data.projects.forEach((_,i)=>add('project',i));data.threads.forEach((_,i)=>{if(data.visibility[i]==='inferred')add('thread',i);});
  // Inspection-only ancestors that have no Git evidence are not discovered entities.
  folders.forEach((f,i)=>{if(f.origin!=='declared'||declaredLocation(data,f.path)||git.some(g=>g.folder===i))add('folder',i);});git.forEach((_,i)=>add('git',i));
  const observation:DiscoveryObservation=freeze({root:options.root,from,through:new Date().toISOString(),folders,git,relations,diagnostics,status,operations,entries,limits});
  return Object.freeze({...data,discovery:observation,components:freeze([...groups.values()]),limitations:Object.freeze([...data.limitations.filter(v=>!v.includes('Filesystem, repositories and worktrees are uninspected.')),
    'Folder existence and Git metadata are bounded point-in-time observations. Containment never establishes Codex membership.',
    'No reparse points are intentionally followed. Concurrent namespace replacement can invalidate observations; traversal is not an atomic filesystem snapshot.',
    'Only standard main/linked Git layouts are supported. No config, remotes, index, object contents or Git commands are read/executed.'])});
}
function freeze<T>(value:T):T {if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
function declaredLocation(data:ExplorerData,path:string):boolean{return data.projects.some(p=>p.roots.some(r=>locationKey(r)===locationKey(path)))||data.threads.some((t,i)=>data.visibility[i]==='inferred'&&t.cwd!==null&&locationKey(t.cwd)===locationKey(path));}
export async function enrichExplorerSnapshot(snapshot:ExplorerSnapshot,options:DiscoveryOptions):Promise<ExplorerSnapshot>{
  const data=snapshot.take();if(!data)throw new Error('Explorer unavailable');return new ExplorerSnapshot(await discoverRelationships(data,options));
}
