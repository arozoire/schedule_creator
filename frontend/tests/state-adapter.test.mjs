import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ScheduleCreatorStateAdapter } from '../src/state-adapter.js';

const tick = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

test('subscribes before reading, coalesces an event during the read', async () => {
  const reads = [];
  let event;
  let removed = 0;
  const connection = {
    subscribeMessage(callback, message) {
      assert.equal(message.type, 'schedule_creator/subscribe_runtime');
      event = callback;
      return Promise.resolve(() => { removed++; });
    },
    sendMessagePromise(message) {
      assert.equal(message.type, 'schedule_creator/get_state');
      const request = deferred();
      reads.push(request);
      return request.promise;
    },
  };
  const adapter = new ScheduleCreatorStateAdapter(() => {});
  adapter.connect({ connection });
  await tick();
  assert.equal(reads.length, 1);
  event({ revision: 1 });
  reads[0].resolve({ revision: 1 });
  await tick();
  assert.equal(reads.length, 2);
  assert.equal(adapter.state, null);
  reads[1].resolve({ revision: 2, config: { profiles: [] } });
  await tick();
  assert.equal(adapter.state.revision, 2);
  adapter.disconnect();
  assert.equal(removed, 1);
});

test('old connection and detached card cannot publish stale responses', async () => {
  const old = deferred();
  const current = deferred();
  let unsubscribed = 0;
  const connection = (request) => ({
    subscribeMessage: () => Promise.resolve(() => { unsubscribed++; }),
    sendMessagePromise: () => request.promise,
  });
  const adapter = new ScheduleCreatorStateAdapter(() => {});
  adapter.connect({ connection: connection(old) });
  await tick();
  adapter.connect({ connection: connection(current) });
  await tick();
  old.resolve({ revision: 99 });
  await tick();
  assert.equal(adapter.state, null);
  current.resolve({ revision: 3 });
  await tick();
  assert.equal(adapter.state.revision, 3);
  adapter.disconnect();
  assert.equal(unsubscribed, 2);
});

test('late subscription completion is released after removal', async () => {
  const pending = deferred();
  let released = 0;
  let reads = 0;
  const adapter = new ScheduleCreatorStateAdapter(() => {});
  adapter.connect({ connection: {
    subscribeMessage: () => pending.promise,
    sendMessagePromise: () => { reads++; },
  } });
  adapter.disconnect();
  pending.resolve(() => { released++; });
  await tick();
  assert.equal(released, 1);
  assert.equal(reads, 0);
});
