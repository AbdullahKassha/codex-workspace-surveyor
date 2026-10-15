import { DatabaseSync, constants } from 'node:sqlite';
import { readFileSync, lstatSync } from 'node:fs';
import { reconcile, ExplorerSnapshot, type Provenance, type ThreadClaim, type ProjectClaim, type AssignmentClaim, type Coverage } from './model.js';

// A concrete acquisition-owned analysis capability, never source discovery/SQL input.
export interface AnalysisCopies { path(area:'analysis', index:number):string; entries():unknown; sqliteLocation?():string }
export const explorerLimits = Object.freeze({rows:1000,fieldBytes:16384,textBytes:1048576,
  titleBytes:4096,titleTextBytes:262144,jsonBytes:16777216,projects:1000,roots:1000,assignments:1000});
export type LimitDetail='reader-rows'|'reader-id-bytes'|'reader-cwd-bytes'|'reader-required-text'|'project-count'|'project-text'|'json-bytes';
export type ReaderResult = {status:'ready'|'unavailable';reason:'none'|'schema'|'limit'|'analysis';snapshot?:ExplorerSnapshot;
  limit?:LimitDetail;structureAccepted?:boolean;
  summary?:{rowsRead:number;claims:number;omittedRows:number;ambiguousIds:number;titles:'accepted'|'unavailable';projects:'desktop-registry'|'unavailable';unconsumedColumns:boolean;shortenedTitles?:number;unavailableTitles?:number}};
const sql = {structure:"PRAGMA main.table_list('threads');",
  columns:"SELECT cid, name, type, hidden FROM pragma_table_xinfo('threads', 'main') LIMIT 64;",
  encoding:'PRAGMA main.encoding;'} as const;
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

// Fixed Desktop registry shape observed in the authorized metadata inspection.
function desktopProjects(bytes:string, charge:(s:string)=>void):{projects:ProjectClaim[];assignments:AssignmentClaim[];projectlessIds:string[]} {
  const x:unknown=JSON.parse(bytes);
  if(!object(x)||!object(x['local-projects'])||!object(x['thread-project-assignments'])||!Array.isArray(x['projectless-thread-ids']))refuse('schema');
  const registry=Object.entries(x['local-projects']),references=Object.entries(x['thread-project-assignments']),projectless=x['projectless-thread-ids'];
  if(registry.length>explorerLimits.projects||references.length>explorerLimits.assignments||projectless.length>explorerLimits.assignments)refuse('limit','project-count');
  let roots=0;
  const projects=registry.map(([id,p]):ProjectClaim=>{
    if(!id||!object(p)||p.id!==id||typeof p.name!=='string'||!Array.isArray(p.rootPaths)||p.rootPaths.some(r=>typeof r!=='string'||!r))refuse('schema');
    roots+=p.rootPaths.length;if(roots>explorerLimits.roots)refuse('limit','project-count');
    charge(id);charge(p.name);for(const r of p.rootPaths)charge(r as string);
    return {id,label:p.name,roots:p.rootPaths as string[]};
  });
  const assignments=references.map(([threadId,a]):AssignmentClaim=>{
    if(!threadId||!object(a)||typeof a.projectId!=='string'||!a.projectId||typeof a.projectKind!=='string'||!a.projectKind)refuse('schema');
    charge(threadId);charge(a.projectId);charge(a.projectKind);return {threadId,projectId:a.projectId,projectKind:a.projectKind};
  });
  const projectlessIds=projectless.map((id:unknown)=>{if(typeof id!=='string'||!id)refuse('schema');charge(id);return id;});
  return {projects,assignments,projectlessIds:[...new Set(projectlessIds)]};
}

function sourceState(value:unknown,encoding:string|undefined):NonNullable<ThreadClaim['sourceState']> {
  if(!encoding||!(value instanceof Uint8Array)||value.length>4096)return 'unknown';
  try {
    const text=new TextDecoder(encoding,{fatal:true,ignoreBOM:true}).decode(value);
    // Origin alone never establishes visibility; model reconciliation requires corroboration.
    if(['cli','vscode','exec','appServer','app-server'].includes(text))return 'ordinary';
    const source:unknown=JSON.parse(text);
    if(object(source)&&Object.keys(source).length===1&&Object.hasOwn(source,'subagent')&&
      (object(source.subagent)||typeof source.subagent==='string'&&source.subagent.length>0))return 'subagent';
  }catch{}
  return 'unknown';
}

function indexTimestamp(value:unknown):bigint|undefined {
  if(typeof value!=='string')return;
  const m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if(!m)return;
  const year=Number(m[1]),month=Number(m[2]),day=Number(m[3]);
  const days=[31,year%4===0&&(year%100!==0||year%400===0)?29:28,31,30,31,30,31,31,30,31,30,31];
  if(month<1||month>12||day<1||day>days[month-1]!||Number(m[4])>23||Number(m[5])>59||Number(m[6])>59)return;
  const seconds=Date.parse(value.replace(/\.\d+(?=Z|[+-])/,'')).valueOf();
  if(!Number.isFinite(seconds))return;
  return BigInt(seconds)*1000000n+BigInt((m[7]||'').padEnd(9,'0'));
}
// Title enrichment only: exact IDs already retained from SQLite. Never supplies visibility.
function enrichTitles(copies:AnalysisCopies,index:number|undefined,threads:ThreadClaim[]):NonNullable<Coverage['sessionIndex']> {
  const report: {status:'accepted'|'partial'|'unavailable'|'limit';records:number;invalidRecords:number;duplicates:number;unmatchedIds:number;conflicts:number;enriched:number}=
    {status:'unavailable',records:0,invalidRecords:0,duplicates:0,unmatchedIds:0,conflicts:0,enriched:0};
  type Candidate={time:bigint;name:string|null;updated:string;conflict:boolean;invalid:boolean};
  const selected=new Map<string,Candidate>(),known=new Set(threads.map(t=>t.id)),seen=new Set<string>();
  if(index!==undefined)try{
    const path=copies.path('analysis',index),size=lstatSync(path).size;
    if(size>explorerLimits.jsonBytes){report.status='limit';throw 0;}
    const bytes=readFileSync(path);if(bytes.length!==size)throw 0;
    const lines=new TextDecoder('utf-8',{fatal:true}).decode(bytes).split('\n');
    if(lines.length>10001){report.status='limit';throw 0;}
    report.status='accepted';
    for(const line of lines){
      if(!line.trim())continue;
      report.records++;
      if(Buffer.byteLength(line)>65536){report.status='limit';throw 0;}
      let row:unknown;try{row=JSON.parse(line);}catch{report.invalidRecords++;continue;}
      if(!object(row)||typeof row.id!=='string'||!row.id||Buffer.byteLength(row.id)>explorerLimits.fieldBytes){report.invalidRecords++;continue;}
      if(seen.has(row.id))report.duplicates++;else{seen.add(row.id);if(!known.has(row.id))report.unmatchedIds++;}
      const updated=row.updated_at;
      const timestamp=indexTimestamp(updated),validTime=timestamp!==undefined;
      const validName=typeof row.thread_name==='string'&&Buffer.byteLength(row.thread_name)<=explorerLimits.titleBytes&&!/[\uD800-\uDFFF]/u.test(row.thread_name);
      if(!validTime||!validName)report.invalidRecords++;
      if(!known.has(row.id))continue;
      const prior=selected.get(row.id),invalid=!validTime||!validName||!!prior?.invalid;
      const time=timestamp??0n,name=validName?(row.thread_name as string).trim()||null:null;
      if(!prior||time>prior.time)selected.set(row.id,{time,name,updated:validTime?updated as string:'',conflict:false,invalid});
      else{prior.invalid=invalid;if(time===prior.time){if(name!==prior.name)prior.conflict=true;if(typeof updated==='string'&&updated<prior.updated)prior.updated=updated;}}
    }
    if(report.invalidRecords)report.status='partial';
  }catch{selected.clear();if(report.status!=='limit')report.status='unavailable';}
  let used=0;
  for(let i=0;i<threads.length;i++){
    const t=threads[i]!,candidate=selected.get(t.id);
    let resolution:NonNullable<ThreadClaim['titleResolution']>=report.status==='unavailable'?'unavailable':report.status==='limit'?'limit':
      !candidate?'missing':candidate.invalid?'invalid':candidate.conflict?'conflict':!candidate.name?'missing':'latest';
    if(resolution==='conflict')report.conflicts++;
    if(resolution==='latest'&&used+Buffer.byteLength(candidate!.name!)>explorerLimits.titleTextBytes)resolution='limit';
    if(resolution==='latest'){
      used+=Buffer.byteLength(candidate!.name!);report.enriched++;
      threads[i]={...t,storedTitle:t.title,title:candidate!.name,titleState:'complete',titleSource:'session-index',titleUpdatedAt:candidate!.updated,titleResolution:resolution};
    }else threads[i]={...t,titleSource:t.title?'sqlite':'unavailable',titleResolution:resolution};
  }
  return report;
}
export function readExplorerCopies(copies:AnalysisCopies, provenance:Provenance,
  globalIndex?:number, projectPolicy:'unavailable'|'desktop-v1'='unavailable',sessionIndex?:number):ReaderResult {
  let db:DatabaseSync|undefined;let result:ReaderResult={status:'unavailable',reason:'analysis'};let structureAccepted=false;
  try {
    if(!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(provenance.namespace)||!Number.isFinite(Date.parse(provenance.from))||
      !Number.isFinite(Date.parse(provenance.through))||Date.parse(provenance.through)<Date.parse(provenance.from))refuse('analysis');
    copies.entries();
    db=new DatabaseSync(copies.sqliteLocation?.()??copies.path('analysis',0),{readOnly:true,allowExtension:false,defensive:true,timeout:0,
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
        if(phase==='rows'&&action===constants.SQLITE_READ&&database==='main'&&first==='threads'&&['id','cwd','title','source','archived'].includes(second??''))return constants.SQLITE_OK;
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
    const sourceAccepted=textColumn('source');
    const archivedAccepted=columns.some(c=>c.name==='archived'&&String(c.type).trim().toUpperCase()==='INTEGER');
    // SQLite resolves the active encoding including WAL page one. No source/header
    // parsing or alternative query targets; only these three encodings are qualified.
    const encodingValue=titles==='accepted'||sourceAccepted?query('encoding',sql.encoding).get()?.encoding:undefined;
    const encoding=typeof encodingValue==='string'&&['UTF-8','UTF-16le','UTF-16be'].includes(encodingValue)?encodingValue.toLowerCase():undefined;
    let used=0,titleUsed=0,rowsRead=0,omittedRows=0,shortenedTitles=0,unavailableTitles=0;
    const identities=new Map<string,number>(), threads:ThreadClaim[]=[];
    const charge=(s:string,field:'id'|'cwd'|'project')=>{const size=Buffer.byteLength(s);
      if(size>explorerLimits.fieldBytes)refuse('limit',field==='project'?'project-text':field==='id'?'reader-id-bytes':'reader-cwd-bytes');
      if((used+=size)>explorerLimits.textBytes)refuse('limit',field==='project'?'project-text':'reader-required-text');};
    // Eight finite projections, composed only from fixed literals after schema qualification.
    const fields=['id','cwd'];
    if(titles==='accepted')fields.push("CASE WHEN typeof(title) = 'text' THEN substr(CAST(title AS BLOB), 1, 4100) ELSE NULL END AS title");
    if(sourceAccepted)fields.push("CASE WHEN typeof(source) = 'text' THEN substr(CAST(source AS BLOB), 1, 4097) ELSE NULL END AS source");
    if(archivedAccepted)fields.push("CASE WHEN typeof(archived) = 'integer' AND archived IN (0,1) THEN archived ELSE NULL END AS archived");
    const iterator=query('rows','SELECT '+fields.join(', ')+' FROM main.threads LIMIT 1001;').iterate();
    try{for(const r of iterator){
      if(++rowsRead>explorerLimits.rows)refuse('limit','reader-rows');
      if(typeof r.id==='string')charge(r.id,'id');if(typeof r.cwd==='string')charge(r.cwd,'cwd');
      if(typeof r.id==='string'&&r.id)identities.set(r.id,(identities.get(r.id)??0)+1);
      if(typeof r.id!=='string'||!r.id){omittedRows++;continue;}
      let title:string|null=null,titleState:ThreadClaim['titleState']='unavailable';
      if(encoding&&r.title instanceof Uint8Array&&r.title.length){
        const preview=titlePreview(r.title,encoding);
        if(preview&&titleUsed+Buffer.byteLength(preview.text)<=explorerLimits.titleTextBytes){
          titleUsed+=Buffer.byteLength(preview.text);title=preview.text;titleState=preview.shortened?'shortened':'complete';}
      }
      if(titleState==='shortened')shortenedTitles++;if(titleState==='unavailable')unavailableTitles++;
      threads.push({id:r.id,cwd:typeof r.cwd==='string'&&r.cwd?r.cwd:null,title,titleState,ambiguous:false,
        sourceState:sourceState(r.source,encoding),archived:r.archived===0?false:r.archived===1?true:null});
    }}finally{iterator.return?.();}
    const titleIndex=enrichTitles(copies,sessionIndex,threads);
    const claims=threads.map(t=>({...t,ambiguous:identities.get(t.id)!>1}));
    const ambiguousIds=[...identities.values()].filter(n=>n>1).length;
    let projects:ProjectClaim[]=[],assignments:AssignmentClaim[]=[],projectlessIds:string[]=[],projectStatus:'unavailable'|'desktop-registry'='unavailable';
    if(projectPolicy==='desktop-v1'){
      if(globalIndex===undefined)refuse('analysis');const path=copies.path('analysis',globalIndex);
      const size=lstatSync(path).size;if(size>explorerLimits.jsonBytes)refuse('limit','json-bytes');
      const bytes=readFileSync(path);if(bytes.length!==size)refuse('analysis');
      // Unsupported JSON disables Projects without replacing them with folders.
      try{({projects,assignments,projectlessIds}=desktopProjects(new TextDecoder('utf-8',{fatal:true}).decode(bytes),s=>charge(s,'project')));projectStatus='desktop-registry';}
      catch(e){if(e instanceof Refusal&&e.reason==='limit')throw e;projects=[];assignments=[];}
    }
    const unconsumedColumns=columns.length>2+Number(titles==='accepted')+Number(sourceAccepted)+Number(archivedAccepted);
    const coverage={rowsRead,omittedRows,ambiguousIds,titles,shortenedTitles,unavailableTitles,sessionIndex:titleIndex,projects:projectStatus,unconsumedColumns,
      correspondence:projectStatus==='desktop-registry'?'qualified' as const:'unknown' as const};
    result={status:'ready',reason:'none',structureAccepted,summary:{rowsRead,claims:claims.length,omittedRows,ambiguousIds,titles,shortenedTitles,unavailableTitles,projects:projectStatus,unconsumedColumns},
      snapshot:new ExplorerSnapshot(reconcile(provenance,coverage,claims,projects,assignments,projectlessIds))};
  }catch(e){result={status:'unavailable',reason:e instanceof Refusal?e.reason:'analysis',structureAccepted,...(e instanceof Refusal&&e.limit?{limit:e.limit}:{})};}
  finally{try{db?.close();}catch{result.snapshot?.discard();result={status:'unavailable',reason:'analysis'};}}
  return result;
}
