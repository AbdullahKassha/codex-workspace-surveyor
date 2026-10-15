import { ExplorerSnapshot, type ExplorerData } from './model.js';

export type RefreshFailure='closure'|'acquisition'|'cleanup'|'discovery'|'unavailable';
export type RefreshResult={snapshot?:ExplorerSnapshot;failure?:RefreshFailure};
export type RecoveryAction='running'|'removed'|'preserved'|'blocked';
export type SessionState=Readonly<{version:number;revision:number;scope:string;phase:'idle'|'acquiring'|'discovery'|'cancelling'|'closing'|'closed';
  updatedAt:string|null;legacyUnresolved?:true;recoveryAction?:RecoveryAction;recoveryAvailable?:true;attempt:Readonly<{startedAt:string;finishedAt:string|null;outcome:'running'|'success'|'failure'|'cancelled';failure:RefreshFailure|null}>|null}>;
export type SessionOptions={scope:string;acquire:(signal:AbortSignal,discovery:()=>void)=>Promise<RefreshResult>;
  recover?:()=>Promise<Exclude<RecoveryAction,'running'>>;idleMs?:number;maximumMs?:number;now?:()=>number;legacyUnresolved?:true};

// Owns replacement and cancellation, never sources or acquisition scratch.
export class ExplorerSession {
  #data:ExplorerData|undefined;#version=0;#revision=0;#phase:SessionState['phase']='idle';#updatedAt:string|null=null;
  #attempt:SessionState['attempt']=null;#abort:AbortController|undefined;#running:Promise<void>|undefined;#closing:Promise<void>|undefined;
  #listeners=new Set<()=>void>();#idle:NodeJS.Timeout|undefined;#maximum:NodeJS.Timeout;#now:()=>number;
  readonly scope:string;
  #recovery:RecoveryAction|undefined;#legacy=false;
  constructor(private readonly options:SessionOptions){
    this.options=Object.freeze({...options});
    if(!/^[a-f0-9]{64}$/.test(options.scope))throw new Error('Session scope refused');
    this.scope=options.scope;this.#now=options.now??Date.now;
    this.#legacy=options.legacyUnresolved===true;
    const maximum=options.maximumMs??12*60*60*1000,idle=options.idleMs??2*60*60*1000;
    if(!Number.isSafeInteger(maximum)||maximum<1||maximum>12*60*60*1000||!Number.isSafeInteger(idle)||idle<1||idle>2*60*60*1000)throw new Error('Session lifetime refused');
    this.#maximum=setTimeout(()=>{void this.close();},maximum);this.#maximum.unref();this.touch();
  }
  state():SessionState{return {version:this.#version,revision:this.#revision,scope:this.scope,phase:this.#phase,updatedAt:this.#updatedAt,
    attempt:this.#attempt?{...this.#attempt}:null,...(this.#legacy?{legacyUnresolved:true as const}:{}),
    ...(this.#recovery?{recoveryAction:this.#recovery}:{}),
    ...(this.options.recover&&this.#attempt?.failure==='cleanup'&&!this.#recovery?{recoveryAvailable:true as const}:{})};}
  snapshot():Readonly<{revision:number;scope:string;data:ExplorerData|null}>{return {revision:this.#revision,scope:this.scope,data:this.#data??null};}
  subscribe(listener:()=>void):()=>void{this.#listeners.add(listener);return ()=>{this.#listeners.delete(listener);};}
  #emit():void{this.#version++;for(const listener of this.#listeners){try{listener();}catch{/* Transport owns its errors. */}}}
  touch():void{if(['closing','closed'].includes(this.#phase))return;clearTimeout(this.#idle);
    this.#idle=setTimeout(()=>{void this.close();},this.options.idleMs??2*60*60*1000);this.#idle.unref();}
  reopen():'retained'|'accepted'|'busy'|'closed'{
    if(['closing','closed'].includes(this.#phase))return 'closed';
    this.touch();
    // Reopening is not Refresh. Keep freshness and any failed-attempt/recovery evidence intact.
    if(this.#data)return 'retained';
    if(this.#running||(this.#attempt?.failure==='cleanup'&&this.#recovery!=='removed'))return 'busy';
    return this.refresh();
  }
  refresh():'accepted'|'busy'|'closed'{
    if(['closing','closed'].includes(this.#phase))return 'closed';this.touch();if(this.#running)return 'busy';
    if(this.#recovery==='preserved'||this.#recovery==='blocked')return 'busy';
    this.#recovery=undefined;
    this.#phase='acquiring';this.#attempt={startedAt:new Date(this.#now()).toISOString(),finishedAt:null,outcome:'running',failure:null};
    const abort=new AbortController();this.#abort=abort;
    // Install the promise before dispatch: listeners cannot start another attempt.
    this.#running=Promise.resolve().then(async()=>{
      let candidate:ExplorerSnapshot|undefined,failure:RefreshFailure|undefined;
      try{
        const result=await this.options.acquire(abort.signal,()=>{if(!abort.signal.aborted){this.#phase='discovery';this.#emit();}});
        candidate=result.snapshot;failure=result.failure;
        if(!abort.signal.aborted&&!failure&&candidate){const data=candidate.take();if(!data)failure='unavailable';else{
          this.#data=data;this.#revision++;this.#updatedAt=new Date(this.#now()).toISOString();}}
        else if(!abort.signal.aborted&&!failure)failure='unavailable';
      }catch{failure='unavailable';}
      finally{
        candidate?.discard();this.#attempt={...this.#attempt!,finishedAt:new Date(this.#now()).toISOString(),
          outcome:abort.signal.aborted?'cancelled':failure?'failure':'success',failure:failure??null};
        this.#abort=undefined;this.#running=undefined;
        if(this.#phase!=='closing')this.#phase='idle';this.#emit();
      }
    });this.#emit();return 'accepted';
  }
  cancel():void{if(!this.#running||['closing','closed'].includes(this.#phase))return;
    if(this.#recovery==='running')return;
    this.touch();this.#abort?.abort();this.#phase='cancelling';this.#emit();}
  async settled():Promise<void>{await this.#running;}
  recover():'accepted'|'busy'|'unavailable'|'closed'{
    if(['closing','closed'].includes(this.#phase))return 'closed';
    if(this.#running)return 'busy';
    if(!this.options.recover||this.#attempt?.failure!=='cleanup'||this.#recovery)return 'unavailable';
    this.touch();this.#phase='acquiring';this.#recovery='running';
    this.#running=Promise.resolve().then(async()=>{
      try{const result=await this.options.recover!();
        this.#recovery=['removed','preserved','blocked'].includes(result)?result:'blocked';
        if(this.#recovery==='preserved')this.#legacy=true;
      }catch{this.#recovery='blocked';}
      finally{this.#running=undefined;if(this.#phase!=='closing')this.#phase='idle';this.#emit();}
    });this.#emit();return 'accepted';
  }
  close():Promise<void>{
    if(this.#closing)return this.#closing;
    this.#phase='closing';this.#data=undefined;this.#revision++;this.#abort?.abort();clearTimeout(this.#idle);clearTimeout(this.#maximum);
    this.#closing=Promise.resolve().then(async()=>{await this.#running;this.#phase='closed';this.#emit();this.#listeners.clear();});
    this.#emit();return this.#closing;
  }
}
