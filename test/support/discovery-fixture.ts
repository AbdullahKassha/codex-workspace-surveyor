// Owned disposable fixtures only; never invoked by the personal explorer.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join, resolve, dirname, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

export function directoryFixture(){
  const owner=fs.mkdtempSync(join(tmpdir(),'surveyor-discovery-')),root=join(owner,'scope');fs.mkdirSync(root);
  const identity=fs.lstatSync(owner);
  const mkdir=(path:string)=>{assert.ok(resolve(path).startsWith(resolve(owner)+sep));fs.mkdirSync(path,{recursive:true});return path;};
  const cleanup=()=>{const absolute=resolve(owner),parent=resolve(tmpdir());assert.equal(dirname(absolute),parent);assert.ok(absolute.startsWith(join(parent,'surveyor-discovery-')));
    const current=fs.lstatSync(absolute);assert.equal(current.isSymbolicLink(),false);assert.equal(current.dev,identity.dev);assert.equal(current.ino,identity.ino);
    fs.rmSync(absolute,{recursive:true,force:false});assert.equal(fs.existsSync(absolute),false);};
  return {owner,root,mkdir,cleanup};
}

export function fixtureGit(f:ReturnType<typeof directoryFixture>){
  const templates=f.mkdir(join(f.owner,'empty-templates')),hooks=f.mkdir(join(f.owner,'empty-hooks'));
  const environment:NodeJS.ProcessEnv={...process.env};
  for(const key of Object.keys(environment))if(key.startsWith('GIT_'))delete environment[key];
  Object.assign(environment,{GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:join(f.owner,'absent-config'),GIT_TEMPLATE_DIR:templates});
  return (cwd:string,...args:string[])=>{
    assert.ok(resolve(cwd).startsWith(resolve(f.owner)+sep));
    const result=spawnSync('git',['-c','core.hooksPath='+hooks,'-c','user.name=Invented Fixture','-c','user.email=fixture@example.invalid','-c','commit.gpgSign=false','-C',cwd,...args],
      {env:environment,windowsHide:true,encoding:'utf8',timeout:10000,maxBuffer:65536});
    assert.equal(result.status,0,'Disposable Git fixture command failed');return result.stdout.trim();
  };
}
