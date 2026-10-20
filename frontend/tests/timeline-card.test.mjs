import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
const bundle = readFileSync(new URL('../../custom_components/schedule_creator/frontend/schedule-creator-card.js', import.meta.url), 'utf8');
const tick = () => new Promise((r) => setImmediate(r));
const schedule = (id, profile, entity, slot, action, extra = {}) => ({id, profile_id: profile, group_id: 'g', name: id, enabled: true, target_entity_ids: [entity], time_slots: [slot], start_action: action, end_action: null, ...extra});

test('day blocks split overnight slots and skip disabled schedules', () => {
  const dom = new JSDOM('<body></body>', {runScripts: 'dangerously', virtualConsole: new VirtualConsole()});
  dom.window.eval(bundle);
  const {dayBlocks, shortAction} = dom.window;
  const night = schedule('n', 'p', 'light.a', {weekdays: [0], start: '22:00', end: '02:00'}, {domain: 'light', action: 'turn_on', data: {}});
  const off = schedule('x', 'p', 'light.a', {weekdays: [1], start: '08:00', end: '09:00'}, {domain: 'light', action: 'turn_on', data: {}}, {enabled: false});
  assert.equal(JSON.stringify(dayBlocks([night, off], 'light.a', 0).map((b) => [b.start, b.end])), '[[1320,1440]]');
  assert.equal(JSON.stringify(dayBlocks([night, off], 'light.a', 1).map((b) => [b.start, b.end])), '[[0,120]]');
  assert.equal(shortAction({domain: 'climate', action: 'apply_state', data: {state: 'cool', temperature: 23}}), '23°');
  assert.equal(shortAction({domain: 'light', action: 'turn_on', data: {brightness_pct: 60}}), '60%');
  dom.window.close();
});

test('timeline card shows one row per entity across all active profiles', async () => {
  const dom = new JSDOM('<body></body>', {runScripts: 'dangerously', virtualConsole: new VirtualConsole()});
  dom.window.structuredClone = structuredClone;
  dom.window.eval(bundle);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const day = (new Date().getDay() + 6) % 7;
  const all = [0, 1, 2, 3, 4, 5, 6];
  const state = {revision: 1, runtime_summary: {revision: 1}, quick_timers: [], operational: {occurrences: []}, config: {
    profiles: [{id: 'home', name: 'A casa', active: true}, {id: 'night', name: 'Notte', active: true}, {id: 'away', name: 'Fuori', active: false}],
    groups: [],
    schedules: [
      schedule('ac', 'home', 'climate.room', {weekdays: all, start: '13:00', end: '17:00'}, {domain: 'climate', action: 'apply_state', data: {state: 'cool', temperature: 23}}),
      schedule('lamp', 'night', 'light.sofa', {weekdays: all, start: '20:00', end: '23:00'}, {domain: 'light', action: 'turn_on', data: {brightness_pct: 60}}),
      schedule('ignored', 'away', 'switch.garden', {weekdays: all, start: '08:00', end: '09:00'}, {domain: 'switch', action: 'turn_on', data: {}}),
    ]}};
  const states = {'climate.room': {state: 'off', attributes: {friendly_name: 'AC Camera'}}, 'light.sofa': {state: 'off', attributes: {friendly_name: 'Luce divano'}}, 'switch.garden': {state: 'off', attributes: {friendly_name: 'Giardino'}}};
  const hass = {user: {is_admin: true}, states, config: {time_zone: zone}, connection: {subscribeMessage: () => Promise.resolve(() => {}), sendMessagePromise: () => Promise.resolve(state)}};
  const card = dom.window.document.createElement('schedule-creator-timeline-card');
  card.setConfig({}); card.hass = hass; dom.window.document.body.append(card);
  await tick();
  try {
    const root = card.shadowRoot;
    assert.match(root.querySelector('.tl-eyebrow').textContent, /A casa, Notte/);
    assert.deepEqual([...root.querySelectorAll('.tl-name strong')].map((n) => n.textContent), ['AC Camera', 'Luce divano']);
    assert.equal(root.querySelector('.tl-block').textContent, '23°');
    assert.ok(root.querySelector('.tl-now'));
    assert.equal(root.querySelector('.tl-day.is-selected').dataset.day, String(day));
    root.querySelector(`.tl-day[data-day="${(day + 1) % 7}"]`).click();
    assert.equal(root.querySelector('.tl-now'), null);
  } finally { card.remove(); dom.window.close(); }
});

test('the week view shows one row per weekday with the schedules of active profiles', async () => {
  const dom = new JSDOM('<body></body>', {runScripts: 'dangerously', virtualConsole: new VirtualConsole(), url: 'http://localhost/'});
  dom.window.structuredClone = structuredClone;
  dom.window.eval(bundle);
  const work = [0, 1, 2, 3, 4];
  const state = {revision: 1, runtime_summary: {revision: 1}, quick_timers: [], operational: {occurrences: []}, config: {
    profiles: [{id: 'home', name: 'A casa', active: true}, {id: 'away', name: 'Fuori', active: false}], groups: [],
    schedules: [
      schedule('Mattina', 'home', 'climate.room', {weekdays: work, start: '06:30', end: '08:30'}, {domain: 'climate', action: 'apply_state', data: {state: 'heat', temperature: 21}}),
      schedule('Tapparelle', 'home', 'cover.blind', {weekdays: work, start: '07:00', end: '07:30'}, {domain: 'cover', action: 'open_cover', data: {}}),
      schedule('Fuori', 'away', 'switch.garden', {weekdays: work, start: '08:00', end: '09:00'}, {domain: 'switch', action: 'turn_on', data: {}}),
    ]}};
  const hass = {user: {is_admin: true}, states: {}, config: {}, connection: {subscribeMessage: () => Promise.resolve(() => {}), sendMessagePromise: () => Promise.resolve(state)}};
  const card = dom.window.document.createElement('schedule-creator-timeline-card');
  card.setConfig({view: 'week'}); card.hass = hass; dom.window.document.body.append(card);
  await tick();
  try {
    const root = card.shadowRoot;
    assert.equal(root.querySelectorAll('.wr-row').length, 7);
    const monday = root.querySelectorAll('.wr-row')[0];
    assert.deepEqual([...monday.querySelectorAll('.wr-block')].map((b) => b.getAttribute('title').split(' · ')[0]), ['Mattina', 'Tapparelle']);
    // The two overlap, so they sit in two lanes; the weekend rows are empty.
    assert.notEqual(monday.querySelectorAll('.wr-block')[0].style.top, monday.querySelectorAll('.wr-block')[1].style.top);
    assert.equal(root.querySelectorAll('.wr-row')[6].querySelectorAll('.wr-block').length, 0);
    assert.deepEqual([...root.querySelectorAll('.tl-legend')].map((n) => n.textContent), ['Mattina', 'Tapparelle']);
    // The switch goes back to the day view and is remembered by the browser.
    root.querySelector('button[data-view="day"]').click();
    assert.equal(root.querySelectorAll('.wr-row').length, 0);
    assert.ok(root.querySelector('.tl-days'));
    assert.equal(dom.window.localStorage.getItem('schedule-creator.timeline-view'), 'day');
  } finally { card.remove(); dom.window.close(); }
});
