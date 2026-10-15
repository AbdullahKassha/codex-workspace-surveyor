import { dirname, join } from 'node:path';
import { locationKey, type ExplorerData, type InstructionEntry, type InstructionCwd, type InstructionScopeObservation } from './model.js';
import { createMetadataProbe, insidePath, validDiscoveryPath, type DiscoveryOptions, type MetadataResult } from './discovery.js';

export const instructionLimits=Object.freeze({cwds:100,depth:12,operations:5000,milliseconds:5000});
type Limits={cwds:number;depth:number;operations:number;milliseconds:number};
type StopReason=InstructionCwd['stop'];
class InstructionStop extends Error {constructor(readonly reason:StopReason){super(reason);}}

// Internal seams only. No configuration or content reader is part of this pass.
export type InstructionOptions=DiscoveryOptions & {instructionLimits?:Partial<Limits>;now?:()=>number;
  metadataProbe?:typeof createMetadataProbe};
export async function observeInstructionScope(data:ExplorerData,options:InstructionOptions):Promise<InstructionScopeObservation> {
  const limits={...instructionLimits,...options.instructionLimits};
  for(const key of Object.keys(limits) as (keyof Limits)[])if(!Number.isInteger(limits[key])||limits[key]<1||limits[key]>instructionLimits[key])throw new Error('Instruction limits refused');
  const now=options.now??Date.now,started=now(),entries:InstructionEntry[]=[],cwds:InstructionCwd[]=[],cache=new Map<string,number>();
  const paths=new Map<string,string>();
  data.threads.forEach((t,i)=>{if(data.visibility[i]==='inferred'&&t.cwd!==null&&!paths.has(locationKey(t.cwd)))paths.set(locationKey(t.cwd),t.cwd);});
  let operations=0,halt:StopReason|undefined,status:InstructionScopeObservation['status']='complete';
  let probe:ReturnType<typeof createMetadataProbe>|undefined;
  const step=()=>{
    if(options.signal?.aborted)throw new InstructionStop('cancelled');
    if(operations>=limits.operations)throw new InstructionStop('operations-limit');
    if(now()-started>=limits.milliseconds)throw new InstructionStop('time-limit');
    operations++;
  };
  const check=async(path:string,purpose:InstructionEntry['purpose']):Promise<number>=>{
    const key=purpose+'|'+locationKey(path),old=cache.get(key);if(old!==undefined)return old;
    let entry:InstructionEntry;
    try{
      // Refuse new dispatch before starting the managed metadata reader as well.
      if(halt)throw new InstructionStop(halt);
      if(options.signal?.aborted)throw new InstructionStop('cancelled');
      if(now()-started>=limits.milliseconds)throw new InstructionStop('time-limit');
      probe??=(options.metadataProbe??createMetadataProbe)(options,step);
      const result:MetadataResult=await probe.check(path);
      const details={...(result.reason?{reason:result.reason}:{}),...(result.obstruction?{obstruction:result.obstruction}:{}),...(result.at?{at:result.at}:{})};
      if(result.state==='exists'&&result.stat){
        const type=result.stat.isFile()?'file':result.stat.isDirectory()?'directory':'other';
        entry={path,purpose,state:'present',type,...(purpose==='instruction'&&type==='file'?{size:Number(result.stat.size)}:{}),...details};
      }else entry={path,purpose,state:result.at==='ancestor'?'uninspected':result.state==='missing'?'absent':
        result.state==='inaccessible'?'inaccessible':result.state==='inspection-error'?'error':'uninspected',...details};
    }catch(error){
      halt=error instanceof InstructionStop?error.reason:'inspection-error';
      entry={path,purpose,state:'uninspected',reason:halt};
    }
    const index=entries.length;entries.push(entry);cache.set(key,index);return index;
  };
  try{
    for(const cwd of [...paths.values()].slice(0,limits.cwds)){
      const ancestry:InstructionCwd['ancestry'][number][]= [];let current=cwd,stop:StopReason='depth-limit',candidate:string|undefined;
      if(halt||options.signal?.aborted)stop=halt??'cancelled';
      else if(!validDiscoveryPath(cwd))stop='invalid-cwd';
      else if(!insidePath(cwd,options.root)||options.access&&!options.access.metadataRoots.some(root=>insidePath(cwd,root)))stop='outside-scope';
      else for(let depth=0;depth<limits.depth;depth++){
        const directory=await check(current,'directory');
        const row:{path:string;directory:number;marker?:number;instructions:number[]}={path:current,directory,instructions:[]};ancestry.push(row);
        if(halt){stop=halt;break;}
        if(entries[directory]!.state!=='present'||entries[directory]!.type!=='directory'){stop='obstruction';break;}
        row.marker=await check(join(current,'.git'),'marker');
        if(halt){stop=halt;break;}
        // A blocked marker prevents a boundary conclusion, but instruction
        // metadata in this already-reached directory can still be observed.
        for(const name of ['AGENTS.override.md','AGENTS.md']){row.instructions.push(await check(join(current,name),'instruction'));if(halt)break;}
        if(halt){stop=halt;break;}
        const marker=entries[row.marker]!;
        if(marker.state==='present'&&(marker.type==='file'||marker.type==='directory')){candidate=current;stop='marker';break;}
        if(marker.state!=='absent'){stop='obstruction';break;}
        if(locationKey(current)===locationKey(options.root)){stop='scope-boundary';break;}
        if(depth+1===limits.depth){stop='depth-limit';break;}
        const parent=dirname(current);
        if(parent===current||!insidePath(parent,options.root)){stop='scope-boundary';break;}
        current=parent;
      }
      cwds.push({cwd,ancestry,stop,stoppedAt:current,complete:stop==='marker',...(candidate?{candidate}:{})});
      if(stop!=='marker'||ancestry.some(row=>row.instructions.some(i=>!['present','absent'].includes(entries[i]!.state))))status='partial';
    }
    if(paths.size>limits.cwds)status='partial';
  }finally{
    try{await probe?.close();}catch{halt='inspection-error';status=entries.length?'partial':'unavailable';}
  }
  if(halt==='cancelled'||options.signal?.aborted)status='cancelled';
  else if(halt==='inspection-error')status=entries.length?'partial':'unavailable';
  return {root:options.root,from:new Date(started).toISOString(),through:new Date(now()).toISOString(),
    policy:{effective:'unknown',assumption:'documented-git',evidence:['DOC-005','DOC-006']},entries,cwds,
    qualifyingCwds:paths.size,status,operations,limits};
}
