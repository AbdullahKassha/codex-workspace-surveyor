import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import type { spawn } from 'node:child_process';
import { explorerDesktopClosure } from './support/explorer-closure.js';

// No actual process enumeration: simulate the bounded read-only probe's transport.
function probe(){
  const child=Object.assign(new EventEmitter(),{stdout:new PassThrough(),stderr:new PassThrough(),unref(){}});
  const launch=((_exe:unknown,args:unknown,options:unknown)=>{
    assert.ok(Array.isArray(args));assert.equal(args[args.length-2],'-Command');
    assert.deepEqual(options,{shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});return child;
  }) as unknown as typeof spawn;
  return {child,result:explorerDesktopClosure('C:\\Invented\\pwsh.exe',launch)};
}
for(const value of ['absent','present'] as const)test('early Desktop probe requires confirmed exit for '+value,async()=>{
  const {child,result}=probe();let finished=false;void result.then(()=>{finished=true;});
  child.stdout.write(value+'\r\n');await Promise.resolve();assert.equal(finished,false);
  child.emit('close',0);assert.equal(await result,value);
});
for(const fault of ['malformed','duplicate','overflow','stderr','exit','error','stream-error'] as const)
test('early Desktop probe refuses uncertain '+fault,async()=>{
  const {child,result}=probe();
  if(fault==='error')child.emit('error',Error('invented'));
  else if(fault==='stream-error')child.stdout.emit('error',Error('invented'));
  else if(fault==='stderr')child.stderr.write('invented diagnostic');
  else child.stdout.write(fault==='overflow'?'x'.repeat(33):fault==='duplicate'?'absent\nabsent\n':fault==='malformed'?'absent':'absent\n');
  child.emit('close',fault==='exit'?1:0);assert.equal(await result,'unknown');
});
test('early Desktop probe timeout and spawn failure never permit acquisition',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});const {child,result}=probe();
  child.stdout.write('absent\n');t.mock.timers.tick(5000);assert.equal(await result,'unknown');
  child.emit('close',0);assert.equal(await result,'unknown');
  assert.equal(await explorerDesktopClosure('C:\\Invented\\pwsh.exe',(()=>{throw Error('invented');}) as typeof spawn),'unknown');
});
