import { DatabaseSync, constants } from 'node:sqlite';
import { readFileSync, lstatSync } from 'node:fs';
import { reconcile, ExplorerSnapshot, type Provenance, type ThreadClaim, type ProjectClaim, type AssignmentClaim } from './model.js';

// A concrete acquisition-owned analysis capability, never source discovery/SQL input.
export interface AnalysisCopies { path(area:'analysis', index:number):string; entries():unknown }
export const explorerLimits = Object.freeze({rows:1000,fieldBytes:16384,textBytes:1048576,jsonBytes:16777216,projects:1000,roots:1000,assignments:1000});
export type ReaderResult = {status:'ready'|'unavailable';reason:'none'|'schema'|'limit'|'analysis';snapshot?:ExplorerSnapshot;
  summary?:{rowsRead:number;claims:number;omittedRows:number;ambiguousIds:number;titles:'accepted'|'unavailable';projects:'synthetic-qualified'|'unavailable';unconsumedColumns:boolean}};
const sql = {structure:"PRAGMA main.table_list('threads');",
  columns:"SELECT cid, name, type, hidden FROM pragma_table_xinfo('threads', 'main') LIMIT 64;",
  titled:'SELECT id, cwd, title FROM main.threads LIMIT 1001;',plain:'SELECT id, cwd FROM main.threads LIMIT 1001;'} as const;
class Refusal extends Error { constructor(readonly reason:ReaderResult['reason']) {super('Explorer reader refused');this.stack='ExplorerRefusal';} }
function refuse(reason:ReaderResult['reason']):never {throw new Refusal(reason);}
const object=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);

// This format is deliberately INVENTED. It is not an inferred Desktop registry.
// Real global state remains unavailable until its exact shape is qualified.
function syntheticProjects(bytes:string, charge:(s:string)=>void):{projects:ProjectClaim[];assignments:AssignmentClaim[]} {
  const x:unknown=JSON.parse(bytes);
  if(!object(x)||x.format!=='workspace-surveyor-invented-projects-v1'||!Array.isArray(x.projects)||!Array.isArray(x.assignments))refuse('schema');
  if(x.projects.length>explorerLimits.projects||x.assignments.length>explorerLimits.assignments)refuse('limit');
  let roots=0;
  const projects=x.projects.map((p:unknown):ProjectClaim=>{
    if(!object(p)||typeof p.id!=='string'||!p.id||!(p.label===null||typeof p.label==='string')||!Array.isArray(p.roots)||
      p.roots.some(r=>typeof r!=='string'||!r))refuse('schema');
    roots+=p.roots.length;if(roots>explorerLimits.roots)refuse('limit');
    charge(p.id);if(typeof p.label==='string')charge(p.label);for(const r of p.roots)charge(r as string);
    return {id:p.id,label:p.label as string|null,roots:p.roots as string[]};
  });
  const assignments=x.assignments.map((a:unknown):AssignmentClaim=>{
    if(!object(a)||typeof a.threadId!=='string'||!a.threadId||typeof a.projectId!=='string'||!a.projectId)refuse('schema');
    charge(a.threadId);charge(a.projectId);return {threadId:a.threadId,projectId:a.projectId};
  });
  return {projects,assignments};
}
export function readExplorerCopies(copies:AnalysisCopies, provenance:Provenance,
  globalIndex?:number, projectPolicy:'unavailable'|'invented-v1'='unavailable'):ReaderResult {
  let db:DatabaseSync|undefined;let result:ReaderResult={status:'unavailable',reason:'analysis'};
  try {
    if(!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(provenance.namespace)||!Number.isFinite(Date.parse(provenance.from))||
      !Number.isFinite(Date.parse(provenance.through))||Date.parse(provenance.through)<Date.parse(provenance.from))refuse('analysis');
    copies.entries();
    db=new DatabaseSync(copies.path('analysis',0),{readOnly:true,allowExtension:false,defensive:true,timeout:0,
      enableDoubleQuotedStringLiterals:false,limits:{length:1048576,sqlLength:4096,column:512,attach:0}});
    db.exec('PRAGMA trusted_schema=OFF; PRAGMA query_only=ON');
    const query=(phase:'structure'|'columns'|'rows',statement:string)=>{
      db!.setAuthorizer((action,first,second,database,trigger)=>{
        if(trigger!==null)return constants.SQLITE_DENY;
        if(phase==='structure')return action===constants.SQLITE_PRAGMA&&first==='table_list'&&second==='threads'&&database==='main'?constants.SQLITE_OK:constants.SQLITE_DENY;
        if(action===constants.SQLITE_SELECT)return constants.SQLITE_OK;
        if(phase==='columns'&&((action===constants.SQLITE_PRAGMA&&first==='table_xinfo'&&second==='threads'&&database==='main')||
          (action===constants.SQLITE_READ&&database==='main'&&first==='pragma_table_xinfo'&&['cid','name','type','hidden'].includes(second??''))))return constants.SQLITE_OK;
        if(phase==='rows'&&action===constants.SQLITE_READ&&database==='main'&&first==='threads'&&['id','cwd','title'].includes(second??''))return constants.SQLITE_OK;
        return constants.SQLITE_DENY;
      });
      return db!.prepare(statement);
    };
    const tables=query('structure',sql.structure).all(), table=tables[0];
    if(tables.length!==1||!table||table.schema!=='main'||table.name!=='threads'||table.type!=='table'||
      !Number.isInteger(table.ncol)||Number(table.ncol)<2||Number(table.ncol)>64)refuse('schema');
    const columns=query('columns',sql.columns).all();
    if(columns.length!==table.ncol||columns.some((c,i)=>c.cid!==i||typeof c.name!=='string'||typeof c.type!=='string'||c.hidden!==0))refuse('schema');
    const textColumn=(name:string)=>columns.filter(c=>c.name===name&&String(c.type).trim().toUpperCase()==='TEXT').length===1;
    if(!textColumn('id')||!textColumn('cwd'))refuse('schema');
    const titles:'accepted'|'unavailable'=textColumn('title')?'accepted':'unavailable';
    let used=0,rowsRead=0,omittedRows=0;const identities=new Map<string,number>(), threads:ThreadClaim[]=[];
    const charge=(s:string)=>{const size=Buffer.byteLength(s);if(size>explorerLimits.fieldBytes||(used+=size)>explorerLimits.textBytes)refuse('limit');};
    const iterator=query('rows',titles==='accepted'?sql.titled:sql.plain).iterate();
    try{for(const r of iterator){
      if(++rowsRead>explorerLimits.rows)refuse('limit');
      for(const v of [r.id,r.cwd,r.title])if(typeof v==='string')charge(v);
      if(typeof r.id==='string'&&r.id)identities.set(r.id,(identities.get(r.id)??0)+1);
      if(typeof r.id!=='string'||!r.id||typeof r.cwd!=='string'||!r.cwd){omittedRows++;continue;}
      threads.push({id:r.id,cwd:r.cwd,title:typeof r.title==='string'&&r.title.length?r.title:null,ambiguous:false});
    }}finally{iterator.return?.();}
    const claims=threads.map(t=>({...t,ambiguous:identities.get(t.id)!>1}));
    const ambiguousIds=[...identities.values()].filter(n=>n>1).length;
    let projects:ProjectClaim[]=[],assignments:AssignmentClaim[]=[],projectStatus:'unavailable'|'synthetic-qualified'='unavailable';
    if(projectPolicy==='invented-v1'){
      if(globalIndex===undefined)refuse('analysis');const path=copies.path('analysis',globalIndex);
      const size=lstatSync(path).size;if(size>explorerLimits.jsonBytes)refuse('limit');
      const bytes=readFileSync(path);if(bytes.length!==size)refuse('analysis');
      // Unsupported JSON disables Projects without replacing them with folders.
      try{({projects,assignments}=syntheticProjects(new TextDecoder('utf-8',{fatal:true}).decode(bytes),charge));projectStatus='synthetic-qualified';}
      catch(e){if(e instanceof Refusal&&e.reason==='limit')throw e;projects=[];assignments=[];}
    }
    const unconsumedColumns=columns.length>(titles==='accepted'?3:2);
    const coverage={rowsRead,omittedRows,ambiguousIds,titles,projects:projectStatus,unconsumedColumns,
      correspondence:projectStatus==='synthetic-qualified'?'qualified' as const:'unknown' as const};
    result={status:'ready',reason:'none',summary:{rowsRead,claims:claims.length,omittedRows,ambiguousIds,titles,projects:projectStatus,unconsumedColumns},
      snapshot:new ExplorerSnapshot(reconcile(provenance,coverage,claims,projects,assignments))};
  }catch(e){result={status:'unavailable',reason:e instanceof Refusal?e.reason:'analysis'};}
  finally{try{db?.close();}catch{result.snapshot?.discard();result={status:'unavailable',reason:'analysis'};}}
  return result;
}
