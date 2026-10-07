// Private one-use delivery. No product/public interface or serialized values.
import { inspect } from 'node:util';
import type { AdapterResult } from './thread-cwd-adapter.js';
import type { CanaryResult } from './personal-canary.js';

export class LocalMapCapability {
  #map:AdapterResult|undefined;
  constructor(map:AdapterResult){this.#map=map;Object.freeze(this);}
  take():AdapterResult|undefined{const map=this.#map;this.#map=undefined;return map;}
  discard():void{this.#map=undefined;}
  toJSON():Readonly<{kind:string}>{return {kind:'private-local-map'};}
  [inspect.custom]():unknown{return this.toJSON();}
}
export class LocalMapDelivery {
  readonly safety:CanaryResult;
  #capability:LocalMapCapability|undefined;
  constructor(safety:CanaryResult,capability?:LocalMapCapability){
    this.safety=safety;
    this.#capability=safety.status==='passed'&&safety.cleanup==='removed'&&safety.recovery==='removed'&&
      safety.sourcesStable&&safety.evidence.exitConfirmed&&safety.mapping?.status==='ready'?capability:undefined;
    if(!this.#capability)capability?.discard();Object.freeze(this);
  }
  takeDisplay():LocalMapCapability|undefined{const capability=this.#capability;this.#capability=undefined;return capability;}
  discard():void{this.#capability?.discard();this.#capability=undefined;}
  toJSON():CanaryResult{return this.safety;}
  [inspect.custom]():CanaryResult{return this.safety;}
}
