import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clean, messageFor } from '../src/editor.js';
import { readAction } from '../src/forms.js';
import { ScheduleCreatorStateAdapter } from '../src/state-adapter.js';
const tick = () => new Promise((resolve) => setImmediate(resolve));
test('nested changes preserve advanced fields and remove server IDs', () => {
  assert.deepEqual(clean({ id:'a', condition:{id:'b',children:[{id:'c',value:'on'}]},end_action:null }), {condition:{children:[{value:'on'}]},end_action:null});
});
test('action data exclude entity targets', () => {
  const elements = { start_pro:{checked:false},start_command:{value:'set_percentage'},start_percentage:{value:'45'} };
  assert.deepEqual(readAction({elements},'start','fan'), {domain:'fan',action:'set_percentage',data:{percentage:45}});
  elements.start_pro.checked = true; elements.start_json = { value:'{"domain":"fan","action":"turn_on","data":{"entity_id":"fan.a"}}' };
  assert.throws(() => readAction({elements},'start','fan'), /target/);
});
test('writes use separate revisions and block double submits', async () => {
  const calls = []; let resolve;
  const adapter = new ScheduleCreatorStateAdapter(() => {});
  adapter.connect({ connection: {subscribeMessage:()=>Promise.resolve(()=>{}),sendMessagePromise(m){calls.push(m);if(m.type.endsWith('get_state')) return Promise.resolve({revision:3,runtime_summary:{revision:11}});return new Promise((r)=>{resolve=r;});}} });
  await tick();
  const pending = adapter.mutate('profile/create',{name:'A'});
  assert.equal(await adapter.mutate('profile/create',{name:'B'}),false);
  assert.equal(calls.filter((m)=>m.type.endsWith('/create')).length,1);
  assert.equal(calls.at(-1).expected_revision,3);
  resolve({}); await pending;
  const timer = adapter.mutate('quick_timer/create',{entity_id:'switch.a'},{runtime:true});
  assert.equal(calls.at(-1).expected_revision,11);
  resolve({}); await timer; adapter.disconnect();
});
test('disconnect ignores stale write failure', async () => {
  let reject;
  const adapter = new ScheduleCreatorStateAdapter(() => {});
  adapter.connect({ connection: {subscribeMessage:()=>Promise.resolve(()=>{}),sendMessagePromise:(m)=>m.type.endsWith('get_state')?Promise.resolve({revision:3,runtime_summary:{revision:4}}):new Promise((_,fail)=>{reject=fail;})} });
  await tick();const pending=adapter.mutate('profile/create',{name:'A'});
  adapter.disconnect();reject({code:'revision_conflict'});
  assert.equal(await pending,false);assert.equal(adapter.writeError,null);
});
test('a render failure before sending releases busy and identifies the local phase',async()=>{
 const calls=[];let fail=false;
 const adapter=new ScheduleCreatorStateAdapter(()=>{if(fail){fail=false;throw new Error('Method not implemented.');}});
 adapter.connect({connection:{subscribeMessage:()=>Promise.resolve(()=>{}),sendMessagePromise:(msg)=>{calls.push(msg);return Promise.resolve({revision:1,runtime_summary:{revision:1}});}}});
 await tick();fail=true;
 assert.equal(await adapter.mutate('schedule/create',{name:'Test'}),false);
 assert.equal(adapter.busy,false);
 assert.equal(calls.filter((m)=>m.type.endsWith('/create')).length,0);
 assert.match(adapter.writeError.phase,/prima dell’invio/);
 assert.equal(adapter.writeError.acknowledged,false);
 assert.match(adapter.writeError.stack,/Method not implemented/);
 adapter.disconnect();
});
test('post-save rendering failure is distinguished from a rejected save',async()=>{
 const adapter=new ScheduleCreatorStateAdapter(()=>{});
 adapter.connect({connection:{subscribeMessage:()=>Promise.resolve(()=>{}),sendMessagePromise:()=>Promise.resolve({revision:1,runtime_summary:{revision:1}})}});
 await tick();adapter.refresh=async()=>{throw new Error('Method not implemented.');};
 await adapter.mutate('schedule/create',{name:'Test'});
 assert.equal(adapter.writeError.acknowledged,true);
 assert.match(messageFor(adapter.writeError),/ha confermato il salvataggio/);
 adapter.disconnect();
});
