// Private synthetic M2b preparation. Never imported by the CLI or personal entry.
import { DatabaseSync, constants } from 'node:sqlite';
import { inspect } from 'node:util';
import { CanaryScratch, runCanary, type CanaryOptions, type CanaryResult } from './personal-canary.js';

export const adapterLimits = Object.freeze({ rows: 1000, fieldBytes: 16 * 1024, textBytes: 1024 * 1024 });
const policy = 'threads-id-cwd-v1' as const;
export type AdapterProvenance = Readonly<{ namespace: string; from: string; through: string }>;
type Claim = Readonly<{ recordId: string; storedCwd: string; ambiguousId: boolean }>;
type Group = Readonly<{ storedCwd: string; claimIndexes: readonly number[] }>;
type Reason = 'none' | 'unsupported-schema' | 'limit' | 'analysis' | 'safety';
type Summary = Readonly<{
  status: 'ready' | 'unavailable'; reason: Reason; policy: typeof policy;
  traversal: 'complete-within-selected-table' | 'unavailable';
  interpretation: 'complete-within-selected-table' | 'partial' | 'unavailable';
  rowsRead: number; claims: number; omittedRows: number; ambiguousIds: number; cwdGroups: number;
  unconsumedColumns: boolean | null;
}>;
const unavailableSummary = (reason: Reason): Summary => Object.freeze({status:'unavailable',reason,policy,
  traversal:'unavailable',interpretation:'unavailable',rowsRead:0,claims:0,omittedRows:0,
  ambiguousIds:0,cwdGroups:0,unconsumedColumns:null});

// Intentional internal access is explicit. JSON, console inspection and diagnostics
// contain no record strings or caller-provided provenance, even for successful reads.
export class AdapterResult {
  readonly summary: Summary;
  #claims: readonly Claim[];
  #groups: readonly Group[];
  #provenance: AdapterProvenance | null;
  constructor(summary: Summary, claims: readonly Claim[] = [], provenance: AdapterProvenance | null = null) {
    this.summary=Object.freeze({...summary});
    this.#claims=Object.freeze(claims.map(c=>Object.freeze({...c})));
    const groups=new Map<string,number[]>();
    this.#claims.forEach((c,i)=>{const indexes=groups.get(c.storedCwd)??[];indexes.push(i);groups.set(c.storedCwd,indexes);});
    this.#groups=Object.freeze([...groups].map(([storedCwd,indexes])=>Object.freeze({storedCwd,claimIndexes:Object.freeze(indexes)})));
    this.#provenance=provenance ? Object.freeze({...provenance}) : null;
    Object.freeze(this);
  }
  readClaims(): readonly Claim[] { return this.#claims; }
  readGroups(): readonly Group[] { return this.#groups; }
  readProvenance(): AdapterProvenance | null { return this.#provenance; }
  toJSON(): Summary { return this.summary; }
  [inspect.custom](): Summary { return this.summary; }
}
const unavailable=(reason: Reason): AdapterResult=>new AdapterResult(unavailableSummary(reason));
class Refusal extends Error {
  constructor(readonly reason: Reason) {super('Adapter refused');this.stack='AdapterRefusal';}
}
function stop(reason: Reason): never {throw new Refusal(reason);}
function provenanceValid(p: AdapterProvenance): boolean {
  return /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(p.namespace) &&
    /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(p.from) &&
    /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(p.through) &&
    Number.isFinite(Date.parse(p.from)) && Date.parse(p.through)>=Date.parse(p.from);
}
type Phase='structure'|'columns'|'rows';
type Probe=(phase: Phase, attempt: (sql: string)=>void)=>void;
const statements=Object.freeze({
  structure:"PRAGMA main.table_list('threads');",
  columns:"SELECT cid, name, type, hidden FROM pragma_table_xinfo('threads', 'main') LIMIT 64;",
  rows:'SELECT id, cwd FROM main.threads LIMIT 1001;',
});

// Unit entry accepts an owned scratch capability, never a path. The coordinator
// below confines integration to synthetic selection and withholds this result.
export function readThreadCwdCopy(scratch: CanaryScratch, provenance: AdapterProvenance, probe?: Probe): AdapterResult {
  let db: DatabaseSync|undefined;
  let result=unavailable('analysis');
  try {
    if(!(scratch instanceof CanaryScratch)||!provenanceValid(provenance))stop('analysis');
    scratch.entries();
    db=new DatabaseSync(scratch.sqliteLocation(),{readOnly:true,allowExtension:false,defensive:true,
      timeout:0,enableDoubleQuotedStringLiterals:false,
      limits:{length:1024*1024,sqlLength:4096,column:512,attach:0}});
    db.exec('PRAGMA trusted_schema=OFF; PRAGMA query_only=ON');
    const prepare=(phase: Phase,sql: string)=>{
      if(sql!==statements[phase])stop('analysis');
      db!.setAuthorizer((action,first,second,database,trigger)=>{
        if(trigger!==null)return constants.SQLITE_DENY;
        if(phase==='structure')return action===constants.SQLITE_PRAGMA&&first==='table_list'&&second==='threads'&&database==='main'
          ?constants.SQLITE_OK:constants.SQLITE_DENY;
        if(action===constants.SQLITE_SELECT)return constants.SQLITE_OK;
        if(phase==='columns'){
          if(action===constants.SQLITE_PRAGMA&&first==='table_xinfo'&&second==='threads'&&database==='main')return constants.SQLITE_OK;
          if(action===constants.SQLITE_READ&&database==='main'&&first==='pragma_table_xinfo'&&['cid','name','type','hidden'].includes(second??''))return constants.SQLITE_OK;
        }else if(action===constants.SQLITE_READ&&database==='main'&&first==='threads'&&['id','cwd'].includes(second??''))return constants.SQLITE_OK;
        return constants.SQLITE_DENY;
      });
      return db!.prepare(sql);
    };
    const query=(phase: Phase)=>{probe?.(phase,sql=>{prepare(phase,sql);});return prepare(phase,statements[phase]);};
    const tables=query('structure').iterate();
    let table: Record<string,unknown>|undefined;
    try{table=tables.next().value;if(!tables.next().done)stop('unsupported-schema');}finally{tables.return?.();}
    if(!table||table.schema!=='main'||table.name!=='threads'||table.type!=='table'||
      !Number.isInteger(table.ncol)||Number(table.ncol)<2||Number(table.ncol)>64||
      ![0,1].includes(Number(table.wr))||![0,1].includes(Number(table.strict)))stop('unsupported-schema');
    const columns=query('columns').all();
    if(columns.length!==table.ncol||columns.some((c,i)=>c.cid!==i||typeof c.name!=='string'||typeof c.type!=='string'||c.hidden!==0))stop('unsupported-schema');
    for(const name of ['id','cwd']){
      const matches=columns.filter(c=>c.name===name);
      if(matches.length!==1||String(matches[0]!.type).trim().toUpperCase()!=='TEXT')stop('unsupported-schema');
    }
    const rows=query('rows').iterate();
    const claims: {recordId:string;storedCwd:string;ambiguousId:boolean}[]=[];
    const identities=new Map<string,number>();
    let rowsRead=0,omittedRows=0,textBytes=0;
    try {
      for(const row of rows){
        if(++rowsRead>adapterLimits.rows)stop('limit');
        // Charge every encountered string, including omitted rows, so identity
        // tracking cannot evade the retained-text budget through invalid CWDs.
        for(const value of [row.id,row.cwd])if(typeof value==='string'){
          const bytes=Buffer.byteLength(value,'utf8');
          if(bytes>adapterLimits.fieldBytes)stop('limit');
          textBytes+=bytes;if(textBytes>adapterLimits.textBytes)stop('limit');
        }
        const validId=typeof row.id==='string'&&row.id.length>0;
        if(validId)identities.set(row.id as string,(identities.get(row.id as string)??0)+1);
        if(!validId||typeof row.cwd!=='string'||row.cwd.length===0){omittedRows++;continue;}
        claims.push({recordId:row.id as string,storedCwd:row.cwd,ambiguousId:false});
      }
    }finally{rows.return?.();}
    const ambiguousIds=[...identities.values()].filter(n=>n>1).length;
    for(const claim of claims)claim.ambiguousId=identities.get(claim.recordId)!>1;
    result=new AdapterResult({status:'ready',reason:'none',policy,traversal:'complete-within-selected-table',
      interpretation:omittedRows||ambiguousIds?'partial':'complete-within-selected-table',
      rowsRead,claims:claims.length,omittedRows,ambiguousIds,cwdGroups:new Set(claims.map(c=>c.storedCwd)).size,
      unconsumedColumns:columns.length>2},claims,provenance);
  }catch(error){
    const sqlite=error as {code?:unknown;errcode?:unknown}|null;
    // SQLITE_TOOBIG can fire before a string reaches the adapter's tighter bound.
    result=unavailable(error instanceof Refusal?error.reason:
      sqlite?.code==='ERR_SQLITE_ERROR'&&sqlite.errcode===18?'limit':'analysis');
  }
  finally{try{db?.close();}catch{result=unavailable('analysis');}}
  return result;
}

type SyntheticOptions=Omit<CanaryOptions,'selection'|'analysis'|'qualificationHook'|'inspectHook'> & {
  selection: Extract<CanaryOptions['selection'],{kind:'synthetic'}>;
};
export async function runSyntheticThreadCwd(options: SyntheticOptions, namespace: string): Promise<Readonly<{
  safety: CanaryResult|null; adapter: AdapterResult;
}>> {
  // Runtime gate is before runCanary, not merely a TypeScript restriction.
  if(options.selection.kind!=='synthetic'||'analysis' in options||'qualificationHook' in options||'inspectHook' in options||
    !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(namespace))return {safety:null,adapter:unavailable('safety')};
  const from=new Date().toISOString();
  let staged:AdapterResult|undefined;
  try {
    const safety=await runCanary({...options,hook:async(phase,scratch)=>{
      await options.hook?.(phase,scratch);
      if(phase==='copied')staged=readThreadCwdCopy(scratch,{namespace,from,through:new Date().toISOString()});
    }});
    if(safety.status!=='passed'||!safety.sourcesStable||!safety.schemaReadable||!safety.evidence.exitConfirmed||
      safety.cleanup!=='removed'||safety.recovery!=='removed'||!staged)return {safety,adapter:unavailable('safety')};
    // Interval deliberately encloses acquisition through verified cleanup.
    const adapter=staged.summary.status==='ready'
      ?new AdapterResult(staged.summary,staged.readClaims(),{namespace,from,through:new Date().toISOString()}):staged;
    return {safety,adapter};
  }catch{return {safety:null,adapter:unavailable('safety')};}
}
