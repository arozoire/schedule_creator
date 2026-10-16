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

test('a failed subscription falls back to periodic reads instead of an error', async () => {
  let reads = 0;
  const connection = {
    subscribeMessage: () => Promise.reject({ code: 'internal_error', message: 'Unable to subscribe' }),
    sendMessagePromise: () => { reads++; return Promise.resolve({ revision: reads, config: { profiles: [] } }); },
  };
  const warn = console.warn; console.warn = () => {};
  const adapter = new ScheduleCreatorStateAdapter(() => {});
  adapter.pollMs = 5;
  try {
    adapter.connect({ connection });
    await new Promise((resolve) => setTimeout(resolve, 40));
    assert.equal(adapter.error, null);
    assert.equal(adapter.polling, true);
    assert.ok(adapter.state.revision >= 2, 'state is read again periodically');
    adapter.disconnect();
    const after = reads;
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(reads, after, 'no reads after disconnect');
  } finally { console.warn = warn; adapter.disconnect(); }
});
