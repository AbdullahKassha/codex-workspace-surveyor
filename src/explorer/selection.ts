import { locationKey, type ExplorerData } from './model.js';
export type Selection={kind:'project'|'thread'|'git';index:number}|{kind:'location';path:string};
export type SelectionBookmark={kind:Selection['kind'];key:string};
export function bookmarkSelection(data:ExplorerData,selection:Selection|null):SelectionBookmark|null{
  if(!selection)return null;
  if(selection.kind==='project'||selection.kind==='thread'){
    const rows=selection.kind==='project'?data.projects:data.threads,row=rows[selection.index];
    if(!row||rows.filter(r=>r.id===row.id).length!==1||('ambiguous' in row&&row.ambiguous))return null;
    return {kind:selection.kind,key:row.id};
  }
  if(selection.kind==='location'){
    const folders=data.discovery?.folders.filter(f=>locationKey(f.path)===locationKey(selection.path));
    const identity=folders?.length===1?folders[0]!.identity:undefined;
    return identity?{kind:'location',key:JSON.stringify([locationKey(selection.path),identity.device,identity.file])}:null;
  }
  const git=data.discovery?.git[selection.index];
  return git?.state==='verified'&&git.commonIdentity&&git.admin?
    {kind:'git',key:JSON.stringify([git.commonIdentity,locationKey(git.admin)])}:null;
}
export function restoreSelection(data:ExplorerData,bookmark:SelectionBookmark|null):Selection|null{
  if(!bookmark)return null;
  if(bookmark.kind==='project'||bookmark.kind==='thread'){
    const rows=bookmark.kind==='project'?data.projects:data.threads,indices=rows.flatMap((row,index)=>row.id===bookmark.key?[index]:[]);
    if(indices.length!==1||bookmark.kind==='thread'&&data.threads[indices[0]!]!.ambiguous)return null;
    return {kind:bookmark.kind,index:indices[0]!};
  }
  if(bookmark.kind==='location'){
    const folders=data.discovery?.folders.filter(f=>f.identity&&JSON.stringify([locationKey(f.path),f.identity.device,f.identity.file])===bookmark.key);
    return folders?.length===1?{kind:'location',path:folders[0]!.path}:null;
  }
  const indices=data.discovery?.git.flatMap((g,index)=>g.state==='verified'&&g.commonIdentity&&g.admin&&
    JSON.stringify([g.commonIdentity,locationKey(g.admin)])===bookmark.key?[index]:[]);
  return indices?.length===1?{kind:'git',index:indices[0]!}:null;
}
