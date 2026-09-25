import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
const bundle = readFileSync(new URL('../../custom_components/schedule_creator/frontend/schedule-creator-card.js', import.meta.url), 'utf8');
const tick = () => new Promise((r) => setImmediate(r));
const schedule = (id, profile, entity, slot, action, extra = {}) => ({id, profile_id: profile, group_id: 'g', name: id, enabled: true, target_entity_ids: [entity], time_slots: [slot], start_action: action, end_action: null, ...extra});
const load = () => { const dom = new JSDOM('<body></body>', {runScripts: 'dangerously', virtualConsole: new VirtualConsole()}); dom.window.structuredClone = structuredClone; dom.window.eval(bundle); return dom; };
const close = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.01;

test('week blocks keep overnight slots whole and split only the Sunday wrap', () => {
  const dom = load();
  const {weekBlocks, splitByDay} = dom.window;
  const night = schedule('n', 'p', 'light.a', {weekdays: [4, 6], start: '22:00', end: '02:00'}, {domain: 'light', action: 'turn_on', data: {}});
  const blocks = JSON.parse(JSON.stringify(weekBlocks([night], 'light.a').map((b) => [b.start, b.end])));
  assert.deepEqual(blocks, [[0, 120], [7080, 7320], [9960, 10080]]);
  assert.equal(JSON.stringify(splitByDay({start: 7080, end: 7320}).map((b) => [b.start, b.end])), '[[7080,7200],[7200,7320]]');
  dom.window.close();
});

test('serpentine lanes meet at midnight and stay parallel through the U-turn', () => {
  const dom = load();
  const L = dom.window.serpentineLayout(680, 3);
  for (let d = 0; d < 6; d++) assert.ok(close(L.point(d * 1440 + 1440, L.lane(0)), L.point((d + 1) * 1440, L.lane(0))));
  for (const m of [1380, 1440, 1500, 2880, 2940]) {
    const outer = L.point(m, L.lane(0)), inner = L.point(m, L.lane(2)), mid = L.point(m, L.lane(1));
    assert.ok(Math.abs(Math.hypot(outer[0] - mid[0], outer[1] - mid[1]) - 13) < 0.01, `gap at ${m}`);
    assert.ok(Math.abs(Math.hypot(inner[0] - mid[0], inner[1] - mid[1]) - 13) < 0.01, `gap at ${m}`);
  }
  // Monday runs left to right, Tuesday right to left.
  assert.ok(L.point(600, 0)[0] < L.point(900, 0)[0]);
  assert.ok(L.point(1440 + 600, 0)[0] > L.point(1440 + 900, 0)[0]);
  dom.window.close();
});

test('serpentine and ring cards draw active profiles and hand editing to the main card', async () => {
  const dom = load();
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const all = [0, 1, 2, 3, 4, 5, 6];
  const state = {revision: 1, runtime_summary: {revision: 1}, quick_timers: [], operational: {occurrences: []}, config: {
    profiles: [{id: 'home', name: 'A casa', active: true}, {id: 'away', name: 'Fuori', active: false}], groups: [],
    schedules: [
      schedule('ac', 'home', 'climate.room', {weekdays: all, start: '13:00', end: '17:00'}, {domain: 'climate', action: 'apply_state', data: {state: 'cool', temperature: 23}}),
      schedule('lamp', 'home', 'light.sofa', {weekdays: [4], start: '22:00', end: '01:00'}, {domain: 'light', action: 'turn_on', data: {brightness_pct: 60}}),
      schedule('ignored', 'away', 'switch.garden', {weekdays: all, start: '08:00', end: '09:00'}, {domain: 'switch', action: 'turn_on', data: {}}),
    ]}};
  const states = {'climate.room': {state: 'off', attributes: {friendly_name: 'AC Camera'}}, 'light.sofa': {state: 'off', attributes: {friendly_name: 'Luce divano'}}};
  const hass = {user: {is_admin: true}, states, config: {time_zone: zone}, connection: {subscribeMessage: () => Promise.resolve(() => {}), sendMessagePromise: () => Promise.resolve(state)}};
  const doc = dom.window.document;
  const main = doc.createElement('schedule-creator-card'); main.setConfig({}); main.hass = hass; doc.body.append(main);
  const serp = doc.createElement('schedule-creator-serpentine-card'); serp.setConfig({}); serp.hass = hass; doc.body.append(serp);
  const ring = doc.createElement('schedule-creator-ring-card'); ring.setConfig({title: 'Anello'}); ring.hass = hass; doc.body.append(ring);
  await tick();
  try {
    const sr = serp.shadowRoot, rr = ring.shadowRoot;
    assert.deepEqual([...sr.querySelectorAll('.wk-chip')].map((n) => n.textContent), ['AC Camera', 'Luce divano']);
    assert.equal(sr.querySelectorAll('.wk-hit').length, 8); // 7 AC blocks + 1 overnight lamp block
    assert.equal(rr.querySelectorAll('.wk-arc').length, 9); // the overnight block splits at midnight
    assert.equal(rr.querySelector('.wk-title').textContent, 'Anello');
    assert.ok(sr.querySelector('.wk-now') && rr.querySelector('.wk-now'));
    const lamp = [...sr.querySelectorAll('.wk-hit')].find((n) => n.getAttribute('aria-label').startsWith('Luce divano'));
    lamp.dispatchEvent(new dom.window.MouseEvent('click', {bubbles: true}));
    const detail = sr.querySelector('.wk-detail');
    assert.match(detail.textContent, /Ven 22:00–01:00/);
    detail.querySelector('[data-edit]').click();
    assert.equal(main.shadowRoot.querySelector('[name="name"]').value, 'lamp');
    detail.querySelector('[data-close]')?.click();
    assert.equal(sr.querySelector('.wk-detail'), null);
  } finally { main.remove(); serp.remove(); ring.remove(); dom.window.close(); }
});

test('week cards hide the edit button when no editor can open it', async () => {
  const dom = load();
  const state = {revision: 1, runtime_summary: {revision: 1}, quick_timers: [], operational: {occurrences: []}, config: {profiles: [{id: 'home', name: 'A casa', active: true}], groups: [],
    schedules: [schedule('ac', 'home', 'climate.room', {weekdays: [0], start: '13:00', end: '17:00'}, {domain: 'climate', action: 'apply_state', data: {state: 'cool', temperature: 23}})]}};
  const hass = {user: {is_admin: true}, states: {}, config: {}, connection: {subscribeMessage: () => Promise.resolve(() => {}), sendMessagePromise: () => Promise.resolve(state)}};
  const ring = dom.window.document.createElement('schedule-creator-ring-card'); ring.setConfig({}); ring.hass = hass; dom.window.document.body.append(ring);
  await tick();
  try {
    ring.shadowRoot.querySelector('.wk-arc').dispatchEvent(new dom.window.MouseEvent('click', {bubbles: true}));
    assert.ok(ring.shadowRoot.querySelector('.wk-detail'));
    assert.equal(ring.shadowRoot.querySelector('[data-edit]'), null);
    ring.setConfig({edit_path: '/lovelace/schedule'});
    assert.ok(ring.shadowRoot.querySelector('[data-edit]'));
  } finally { ring.remove(); dom.window.close(); }
});
