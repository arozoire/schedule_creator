import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
const bundle = readFileSync(new URL('../../custom_components/schedule_creator/frontend/schedule-creator-card.js', import.meta.url), 'utf8');
const tick = () => new Promise((r) => setImmediate(r));

function card(operational, failures = []) {
  const dom = new JSDOM('<body></body>', {runScripts: 'dangerously', virtualConsole: new VirtualConsole()});
  dom.window.structuredClone = structuredClone;
  dom.window.eval(bundle);
  const schedule = {id: 's', profile_id: 'p', group_id: 'g', name: 'Sera', enabled: true, target_entity_ids: ['light.sofa'], time_slots: [{weekdays: [0, 1, 2, 3, 4, 5, 6], start: '00:00', end: '23:59'}], start_action: {domain: 'light', action: 'turn_on', data: {}}, end_action: null, condition: null};
  const state = {revision: 2, integration_version: '', config: {profiles: [{id: 'p', name: 'Casa', active: true}], groups: [{id: 'g', profile_id: 'p', name: 'Sala', entity_ids: ['light.sofa']}], schedules: [schedule]}, runtime_summary: {revision: 3}, quick_timers: [], operational, failures};
  const hass = {user: {is_admin: true}, states: {'light.sofa': {entity_id: 'light.sofa', state: 'on', attributes: {friendly_name: 'Luce divano'}}}, services: {}, config: {}, connection: {subscribeMessage: () => Promise.resolve(() => {}), sendMessagePromise: () => Promise.resolve(state)}};
  const element = dom.window.document.createElement('schedule-creator-card'); element.setConfig({}); element.hass = hass; dom.window.document.body.append(element);
  return {dom, element, close: () => { element.remove(); dom.window.close(); }};
}
const occurrence = {id: 'o', schedule_id: 's', state: 'active', condition_branch: 'unknown', end_utc: new Date(Date.now() + 3600000).toISOString()};

test('a running slot without the lease is shown as waiting', async () => {
  const t = card({occurrences: [occurrence], leases: [{entity_id: 'light.sofa', controller_type: 'quick_timer', occurrence_id: null, state: 'active'}]});
  await tick();
  try {
    assert.match(t.element.shadowRoot.querySelector('.sc-now-tile.is-paused').textContent, /In attesa/);
    const {liveOccurrence} = t.dom.window;
    const state = t.element.adapter.state;
    assert.equal(liveOccurrence(state, state.config.schedules, 'light.sofa'), null);
    state.operational.leases = [{entity_id: 'light.sofa', controller_type: 'normal_schedule', occurrence_id: 'o', state: 'active'}];
    assert.equal(liveOccurrence(state, state.config.schedules, 'light.sofa').occurrence.id, 'o');
    t.element.render();
    assert.match(t.element.shadowRoot.querySelector('.sc-now-tile.is-running').textContent, /Adesso/);
  } finally { t.close(); }
});

test('failed commands are announced and listed in Activity', async () => {
  const t = card({occurrences: [], leases: []}, [{at: new Date().toISOString(), kind: 'target_action', phase: null, entity_id: 'light.sofa', schedule_id: 's', schedule_name: 'Sera', quick_timer: false, error_code: 'service_failed', attempts: 3}]);
  await tick();
  try {
    const root = t.element.shadowRoot;
    assert.match([...root.querySelectorAll('.sc-warning')].map((n) => n.textContent).join(' '), /Un comando non è riuscito/);
    assert.match(root.querySelector('.sc-operational summary').textContent, /1 errori/);
    assert.match(root.querySelector('.sc-failures').textContent, /Sera · Luce divano · azione iniziale: il servizio ha restituito un errore o non ha risposto \(3 tentativi\)/);
  } finally { t.close(); }
});

test('updates of unrelated entities do not re-render the cards', async () => {
  const t = card({occurrences: [], leases: []});
  await tick();
  try {
    let renders = 0;
    const original = t.element.render.bind(t.element);
    t.element.render = () => { renders += 1; original(); };
    const hass = t.element._hass;
    t.element.hass = {...hass, states: {...hass.states, 'sensor.power': {entity_id: 'sensor.power', state: '120', attributes: {}}}};
    assert.equal(renders, 0);
    const next = t.element._hass;
    t.element.hass = {...next, states: {...next.states, 'light.sofa': {entity_id: 'light.sofa', state: 'off', attributes: {friendly_name: 'Luce divano'}}}};
    assert.equal(renders, 1);
  } finally { t.close(); }
});
