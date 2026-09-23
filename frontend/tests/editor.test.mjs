import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clean } from '../src/editor.js';
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
