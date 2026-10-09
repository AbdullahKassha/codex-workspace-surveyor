import { DatabaseSync, constants } from 'node:sqlite';
import { readFileSync, lstatSync } from 'node:fs';
import { reconcile, ExplorerSnapshot, type Provenance, type ThreadClaim, type ProjectClaim, type AssignmentClaim } from './model.js';

// A concrete acquisition-owned analysis capability, never source discovery/SQL input.
export interface AnalysisCopies { path(area:'analysis', index:number):string; entries():unknown }
export const explorerLimits = Object.freeze({rows:1000,fieldBytes:16384,textBytes:1048576,
  titleBytes:4096,titleTextBytes:262144,jsonBytes:16777216,projects:1000,roots:1000,assignments:1000});
export type LimitDetail='reader-rows'|'reader-id-bytes'|'reader-cwd-bytes'|'reader-required-text'|'project-count'|'project-text'|'json-bytes';
export type ReaderResult = {status:'ready'|'unavailable';reason:'none'|'schema'|'limit'|'analysis';snapshot?:ExplorerSnapshot;
  limit?:LimitDetail;structureAccepted?:boolean;
  summary?:{rowsRead:number;claims:number;omittedRows:number;ambiguousIds:number;titles:'accepted'|'unavailable';projects:'synthetic-qualified'|'unavailable';unconsumedColumns:boolean;shortenedTitles?:number;unavailableTitles?:number}};
const sql = {structure:"PRAGMA main.table_list('threads');",
  columns:"SELECT cid, name, type, hidden FROM pragma_table_xinfo('threads', 'main') LIMIT 64;",
  encoding:'PRAGMA main.encoding;',
  // Four lookahead bytes qualify characters crossing the preview boundary.
  titled:"SELECT id, cwd, CASE WHEN typeof(title) = 'text' THEN substr(CAST(title AS BLOB), 1, 4100) ELSE NULL END AS title FROM main.threads LIMIT 1001;",
  plain:'SELECT id, cwd FROM main.threads LIMIT 1001;'} as const;
class Refusal extends Error { constructor(readonly reason:ReaderResult['reason'],readonly limit?:LimitDetail) {super('Explorer reader refused');this.stack='ExplorerRefusal';} }
function refuse(reason:ReaderResult['reason'],limit?:LimitDetail):never {throw new Refusal(reason,limit);}
const object=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);

function titlePreview(bytes:Uint8Array,encoding:string):{text:string;shortened:boolean}|undefined {
  try {
    const bounded=bytes.length===4100;
    // Fatal streaming decode rejects malformed sequences; only a genuinely
    // incomplete final sequence at the bounded lookahead edge can be buffered.
    const decoded=new TextDecoder(encoding,{fatal:true,ignoreBOM:true}).decode(bytes,{stream:bounded});
    let text='',size=0,encodedSize=0;
    for(const character of decoded){const next=Buffer.byteLength(character),encoded=encoding==='utf-8'?next:character.length*2;
      if(size+next>explorerLimits.titleBytes||encodedSize+encoded>explorerLimits.titleBytes)break;
      text+=character;size+=next;encodedSize+=encoded;}
    // Lookahead validates boundary characters but never becomes displayed content.
    return text?{text,shortened:bytes.length>encodedSize}:undefined;
  }catch{return;}
}

// This format is deliberately INVENTED. It is not an inferred Desktop registry.
// Real global state remains unavailable until its exact shape is qualified.
function syntheticProjects(bytes:string, charge:(s:string)=>void):{projects:ProjectClaim[];assignments:AssignmentClaim[]} {
  const x:unknown=JSON.parse(bytes);
  if(!object(x)||x.format!=='workspace-surveyor-invented-projects-v1'||!Array.isArray(x.projects)||!Array.isArray(x.assignments))refuse('schema');
  if(x.projects.length>explorerLimits.projects||x.assignments.length>explorerLimits.assignments)refuse('limit','project-count');
  let roots=0;
  const projects=x.projects.map((p:unknown):ProjectClaim=>{
    if(!object(p)||typeof p.id!=='string'||!p.id||!(p.label===null||typeof p.label==='string')||!Array.isArray(p.roots)||
      p.roots.some(r=>typeof r!=='string'||!r))refuse('schema');
    roots+=p.roots.length;if(roots>explorerLimits.roots)refuse('limit','project-count');
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
  let db:DatabaseSync|undefined;let result:ReaderResult={status:'unavailable',reason:'analysis'};let structureAccepted=false;
  try {
    if(!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(provenance.namespace)||!Number.isFinite(Date.parse(provenance.from))||
      !Number.isFinite(Date.parse(provenance.through))||Date.parse(provenance.through)<Date.parse(provenance.from))refuse('analysis');
    copies.entries();
    db=new DatabaseSync(copies.path('analysis',0),{readOnly:true,allowExtension:false,defensive:true,timeout:0,
      // SQLite's record limit also applies before substr can project a title.
      // Bound engine records by the existing maximum acquired file size.
      enableDoubleQuotedStringLiterals:false,limits:{length:16777216,sqlLength:4096,column:512,attach:0}});
    db.exec('PRAGMA trusted_schema=OFF; PRAGMA query_only=ON');
    const query=(phase:'structure'|'columns'|'encoding'|'rows',statement:string)=>{
      db!.setAuthorizer((action,first,second,database,trigger)=>{
        if(trigger!==null)return constants.SQLITE_DENY;
        if(phase==='structure')return action===constants.SQLITE_PRAGMA&&first==='table_list'&&second==='threads'&&database==='main'?constants.SQLITE_OK:constants.SQLITE_DENY;
        if(phase==='encoding')return action===constants.SQLITE_PRAGMA&&first==='encoding'&&second===null&&database==='main'?constants.SQLITE_OK:constants.SQLITE_DENY;
        if(action===constants.SQLITE_SELECT)return constants.SQLITE_OK;
        if(phase==='rows'&&action===constants.SQLITE_FUNCTION&&['typeof','substr'].includes(second??''))return constants.SQLITE_OK;
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
    structureAccepted=true;
    const titles:'accepted'|'unavailable'=textColumn('title')?'accepted':'unavailable';
    // SQLite resolves the active encoding including WAL page one. No source/header
    // parsing or alternative query targets; only these three encodings are qualified.
    const encodingValue=titles==='accepted'?query('encoding',sql.encoding).get()?.encoding:undefined;
    const encoding=typeof encodingValue==='string'&&['UTF-8','UTF-16le','UTF-16be'].includes(encodingValue)?encodingValue.toLowerCase():undefined;
    let used=0,titleUsed=0,rowsRead=0,omittedRows=0,shortenedTitles=0,unavailableTitles=0;
    const identities=new Map<string,number>(), threads:ThreadClaim[]=[];
    const charge=(s:string,field:'id'|'cwd'|'project')=>{const size=Buffer.byteLength(s);
      if(size>explorerLimits.fieldBytes)refuse('limit',field==='project'?'project-text':field==='id'?'reader-id-bytes':'reader-cwd-bytes');
      if((used+=size)>explorerLimits.textBytes)refuse('limit',field==='project'?'project-text':'reader-required-text');};
    const iterator=query('rows',titles==='accepted'?sql.titled:sql.plain).iterate();
    try{for(const r of iterator){
      if(++rowsRead>explorerLimits.rows)refuse('limit','reader-rows');
      if(typeof r.id==='string')charge(r.id,'id');if(typeof r.cwd==='string')charge(r.cwd,'cwd');
      if(typeof r.id==='string'&&r.id)identities.set(r.id,(identities.get(r.id)??0)+1);
      if(typeof r.id!=='string'||!r.id||typeof r.cwd!=='string'||!r.cwd){omittedRows++;continue;}
      let title:string|null=null,titleState:ThreadClaim['titleState']='unavailable';
      if(encoding&&r.title instanceof Uint8Array&&r.title.length){
        const preview=titlePreview(r.title,encoding);
        if(preview&&titleUsed+Buffer.byteLength(preview.text)<=explorerLimits.titleTextBytes){
          titleUsed+=Buffer.byteLength(preview.text);title=preview.text;titleState=preview.shortened?'shortened':'complete';}
      }
      if(titleState==='shortened')shortenedTitles++;if(titleState==='unavailable')unavailableTitles++;
      threads.push({id:r.id,cwd:r.cwd,title,titleState,ambiguous:false});
    }}finally{iterator.return?.();}
    const claims=threads.map(t=>({...t,ambiguous:identities.get(t.id)!>1}));
    const ambiguousIds=[...identities.values()].filter(n=>n>1).length;
    let projects:ProjectClaim[]=[],assignments:AssignmentClaim[]=[],projectStatus:'unavailable'|'synthetic-qualified'='unavailable';
    if(projectPolicy==='invented-v1'){
      if(globalIndex===undefined)refuse('analysis');const path=copies.path('analysis',globalIndex);
      const size=lstatSync(path).size;if(size>explorerLimits.jsonBytes)refuse('limit','json-bytes');
      const bytes=readFileSync(path);if(bytes.length!==size)refuse('analysis');
      // Unsupported JSON disables Projects without replacing them with folders.
      try{({projects,assignments}=syntheticProjects(new TextDecoder('utf-8',{fatal:true}).decode(bytes),s=>charge(s,'project')));projectStatus='synthetic-qualified';}
      catch(e){if(e instanceof Refusal&&e.reason==='limit')throw e;projects=[];assignments=[];}
    }
    const unconsumedColumns=columns.length>(titles==='accepted'?3:2);
    const coverage={rowsRead,omittedRows,ambiguousIds,titles,shortenedTitles,unavailableTitles,projects:projectStatus,unconsumedColumns,
      correspondence:projectStatus==='synthetic-qualified'?'qualified' as const:'unknown' as const};
    result={status:'ready',reason:'none',structureAccepted,summary:{rowsRead,claims:claims.length,omittedRows,ambiguousIds,titles,shortenedTitles,unavailableTitles,projects:projectStatus,unconsumedColumns},
      snapshot:new ExplorerSnapshot(reconcile(provenance,coverage,claims,projects,assignments))};
  }catch(e){result={status:'unavailable',reason:e instanceof Refusal?e.reason:'analysis',structureAccepted,...(e instanceof Refusal&&e.limit?{limit:e.limit}:{})};}
  finally{try{db?.close();}catch{result.snapshot?.discard();result={status:'unavailable',reason:'analysis'};}}
  return result;
}
