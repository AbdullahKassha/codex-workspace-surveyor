// Private terminal-only presentation. Stored strings never become terminal controls.
import type { AdapterResult } from './thread-cwd-adapter.js';
import { finished, type Readable, type Writable } from 'node:stream';
import { LocalMapCapability } from './local-thread-cwd-capability.js';

type Input=Pick<NodeJS.ReadStream,'isTTY'|'isRaw'> & {setRawMode(raw:boolean):unknown} &
  Pick<Readable,'resume'|'pause'|'on'|'off'|'readableEnded'|'destroyed'|'readable'>;
type Output=Pick<NodeJS.WriteStream,'isTTY'|'columns'|'rows'> & Pick<Writable,'destroyed'|'closed'|'errored'> & {
  write(value:string,callback?:(error?:Error|null)=>void):boolean;
  on(event:'error'|'close',listener:()=>void):unknown;off(event:'error'|'close',listener:()=>void):unknown;
};
// A failed run can return while _destroy is still pending. One guard owns that
// lifecycle until finished reports it; another run must not add more listeners.
const settlingOutputs=new WeakSet<Output>();
export type ViewerTerminal={input:Input;output:Output;supported:boolean};
export type ViewStatus='closed'|'refused'|'failed';
export const viewerControls=Object.freeze({enter:'\x1b[?1049h\x1b[?25l',clear:'\x1b[2J\x1b[H',exit:'\x1b[2J\x1b[H\x1b[?25h\x1b[?1049l'});
export function supportedTerminal(env:NodeJS.ProcessEnv):boolean{
  return Boolean(env.WT_SESSION)||/^(?:xterm|screen|tmux)(?:[-].*)?$|^(?:vt100|ansi)$/.test(env.TERM??'');
}
function* quotedTokens(value:string):Generator<string>{
  yield '"';
  for(let i=0;i<value.length;i++){
    const n=value.charCodeAt(i),c=value[i]!;
    yield c==='"'||c==='\\'?'\\'+c:n>=32&&n<=126?c:'\\u'+n.toString(16).padStart(4,'0');
  }
  yield '"';
}
export function quoteStored(value:string):string{return [...quotedTokens(value)].join('');}
function* wrapped(tokens:Iterable<string>,width:number):Generator<string>{
  let line='  ';
  for(const token of tokens){if(line.length+token.length>width){yield line;line='  + ';}line+=token;}
  yield line;
}
function* mapLines(map:AdapterResult,width:number):Generator<string>{
  const p=map.readProvenance();
  if(!p)throw new Error('Viewer refused');
  for(const [label,value] of [['Source-local namespace',p.namespace],['Interval begins',p.from],['Interval ends after cleanup',p.through]] as const){
    yield label+':';yield* wrapped(quotedTokens(value),width);
  }
  yield 'Groups use exact stored strings.';
  yield 'Continuation prefix: +; escapes preserve UTF-16.';
  const claims=map.readClaims(),groups=map.readGroups();
  if(groups.length===0)yield 'No retained claims in this selected table copy.';
  for(let i=0;i<groups.length;i++){
    const group=groups[i]!;yield `Group ${i+1} / ${groups.length} stored CWD:`;
    yield* wrapped(quotedTokens(group.storedCwd),width);
    for(const index of group.claimIndexes){
      const claim=claims[index];if(!claim||claim.storedCwd!==group.storedCwd)throw new Error('Viewer refused');
      yield `Record ${index+1}${claim.ambiguousId?' [AMBIGUOUS ID]':''}:`;
      yield* wrapped(quotedTokens(claim.recordId),width);
    }
  }
}
function key(input:Input,signal:AbortSignal):Promise<'next'|'previous'|'quit'>{
  return new Promise((resolve,reject)=>{
    const finish=(value:'next'|'previous'|'quit')=>{remove();resolve(value);};
    const read=(chunk:Buffer|string)=>{for(const c of chunk.toString()){
      if(c==='q'||c==='\x03'){finish('quit');return;}
      if(c==='n'||c===' '){finish('next');return;}if(c==='p'){finish('previous');return;}
    }};
    const end=()=>finish('quit');const error=()=>{remove();reject(new Error('Viewer failed'));};
    const remove=()=>{input.off('data',read);input.off('end',end);input.off('close',end);input.off('error',error);signal.removeEventListener('abort',error);};
    if(signal.aborted){error();return;}
    if(input.readableEnded||input.destroyed||!input.readable){end();return;}
    signal.addEventListener('abort',error,{once:true});
    input.on('data',read);input.on('end',end);input.on('close',end);input.on('error',error);
    // Recheck after registration; EOF need not emit another event for a late listener.
    if(input.readableEnded||input.destroyed||!input.readable)end();else input.resume();
  });
}
export async function viewLocalMap(capability:LocalMapCapability,terminal:ViewerTerminal):Promise<ViewStatus>{
  const {input,output}=terminal;let map:AdapterResult|undefined;
  if(settlingOutputs.has(output)||output.closed){capability.discard();return 'failed';}
  let entered=false,rawAttempted=false;const oldRaw=input.isRaw??false;let status:ViewStatus='failed';
  const abort=new AbortController();let outputNotified=false;
  const outputError=()=>{if(output.closed)outputNotified=true;abort.abort();};
  const outputClose=()=>{outputNotified=true;};
  let listening=false,inputListening=false;
  const write=(value:string)=>{if(abort.signal.aborted)throw new Error('Viewer failed');output.write(value);if(abort.signal.aborted)throw new Error('Viewer failed');};
  try{
    output.on('error',outputError);output.on('close',outputClose);listening=true;
    input.on('error',outputError);inputListening=true;
    if(!terminal.supported||!input.isTTY||!output.isTTY||!Number.isInteger(output.columns)||
      !Number.isInteger(output.rows)||output.columns<40||output.rows<24)return 'refused';
    map=capability.take();if(!map||map.summary.status!=='ready'||!map.readProvenance())return 'refused';
    const width=Math.min(output.columns,240)-1,height=Math.min(output.rows,100),s=map.summary;
    const header=['LOCAL RECORD -> STORED CWD CLAIMS',`Policy: ${s.policy}`,
      `Table traversal: ${s.traversal}`,`Interpretation: ${s.interpretation}`,
      `Rows ${s.rowsRead}; claims ${s.claims}; omitted ${s.omittedRows}; ambiguous ${s.ambiguousIds}`,
      `Groups ${s.cwdGroups}; unconsumed columns: ${s.unconsumedColumns?'yes':'no'}`,
      'Record claims only; meaning and paths unverified.'];
    const headerLines=header.flatMap(l=>{const parts:string[]=[];for(let i=0;i<l.length;i+=width)parts.push(l.slice(i,i+width));return parts;});
    const body=height-headerLines.length-2;if(body<1)return 'refused';
    const lines=mapLines(map,width);const pages:string[][]=[];let complete=false,page=0;
    const getPage=(index:number):string[]=>{
      while(pages.length<=index&&!complete){const values:string[]=[];
        while(values.length<body){const next=lines.next();if(next.done){complete=true;break;}values.push(next.value);}
        if(values.length)pages.push(values);
      }
      return pages[index]??[];
    };
    rawAttempted=true;input.setRawMode(true);entered=true;write(viewerControls.enter);
    while(true){
      if(output.columns<width+1||output.rows<height)throw new Error('Viewer resized');
      const content=getPage(page);
      write(viewerControls.clear+headerLines.join('\r\n')+'\r\n'+
        content.join('\r\n')+'\r\n'+`Page ${page+1}: n next, p back, q quit`);
      const action=await key(input,abort.signal);if(action==='quit'){status='closed';break;}
      if(action==='previous')page=Math.max(0,page-1);
      else if(getPage(page+1).length)page++;
    }
  }catch{status='failed';}
  finally{
    capability.discard();map=undefined;
    if(rawAttempted)try{input.setRawMode(oldRaw);}catch{status='failed';}
    try{input.pause();}catch{status='failed';}
    if(entered){
      try{await new Promise<void>((resolve,reject)=>{
        output.write(viewerControls.exit,error=>{if(error)reject(new Error('Viewer failed'));else resolve();});
      });}catch{status='failed';}
    }
    if(inputListening&&input.destroyed){
      // Already-destroyed input can still have a pending error notification.
      await new Promise<void>(resolve=>{
        const cleanup=finished(input as unknown as Readable,{writable:false},()=>{cleanup();resolve();});
      });
    }
    if(abort.signal.aborted)status='failed';
    if(listening)try{
      if(output.destroyed||output.errored){
        status='failed';settlingOutputs.add(output);
        // Do not wait for a terminal to end, or end/destroy caller-owned output.
        // A failing stream owns its guard through asynchronous destruction and
        // error notification, even after the sanitized viewer result is returned.
        let cleanup:(()=>void)|undefined,settled=false;
        const settle=()=>{
          // With emitClose:false, finished can report an errored Writable
          // before asynchronous _destroy completes. Its closed state and the
          // actual error/close notification, not that early callback, own release.
          if(settled||(output.destroyed&&(!output.closed||!outputNotified)))return;
          settled=true;cleanup?.();
          try{output.off('error',notify);output.off('close',notify);output.off('error',outputError);output.off('close',outputClose);}
          catch{/* Failure stays handled. */}finally{settlingOutputs.delete(output);}
        };
        const notify=()=>{outputNotified=true;settle();};
        output.on('error',notify);output.on('close',notify);
        cleanup=finished(output as unknown as Writable,{readable:false},()=>{cleanup?.();settle();});
      }else{output.off('error',outputError);output.off('close',outputClose);}
    }catch{status='failed';}
    if(inputListening)try{input.off('error',outputError);}catch{status='failed';}
  }
  return status;
}
