import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
const bundle = readFileSync(new URL('../../custom_components/schedule_creator/frontend/schedule-creator-card.js', import.meta.url), 'utf8');
const tick = () => new Promise((r) => setImmediate(r));

function setup(config, {admin = true, timers = []} = {}) {
  const dom = new JSDOM('<body></body>', {url: 'http://ha.local/lovelace/casa', runScripts: 'dangerously', virtualConsole: new VirtualConsole()});
  dom.window.structuredClone = structuredClone;
  dom.window.eval(bundle);
  const states = {
    'climate.room': {entity_id: 'climate.room', state: 'off', attributes: {friendly_name: 'AC Camera', hvac_modes: ['off', 'cool', 'heat'], fan_modes: ['low', 'high'], supported_features: 9, min_temp: 16, max_temp: 30, temperature: 22}},
    'light.sofa': {entity_id: 'light.sofa', state: 'off', attributes: {friendly_name: 'Luce divano', supported_color_modes: ['brightness']}},
    'switch.plug': {entity_id: 'switch.plug', state: 'off', attributes: {friendly_name: 'Presa'}},
  };
  const services = {climate: {set_hvac_mode: {}, set_temperature: {}}, light: {turn_on: {}, turn_off: {}}, switch: {turn_on: {}, turn_off: {}}};
  const snapshot = {revision: 1, config: {profiles: [], groups: [], schedules: []}, runtime_summary: {revision: 7}, quick_timers: timers, operational: {}};
  const writes = [];
  const hass = {user: {is_admin: admin}, states, services, config: {time_zone: 'Europe/Rome'}, connection: {subscribeMessage: () => Promise.resolve(() => {}), sendMessagePromise: (msg) => { if (msg.type.endsWith('get_state')) return Promise.resolve(snapshot); writes.push(JSON.parse(JSON.stringify(msg))); return Promise.resolve({revision: 8}); }}};
  const card = dom.window.document.createElement('schedule-creator-quick-timer-card');
  card.setConfig(config); card.hass = hass; dom.window.document.body.append(card);
  const root = card.shadowRoot;
  const pick = (name, value) => { const n = root.querySelector(`[name="${name}"][value="${value}"]`); assert.ok(n, `missing ${name}=${value}`); n.checked = true; n.dispatchEvent(new dom.window.Event('change', {bubbles: true})); };
  const submit = () => root.querySelector('form').dispatchEvent(new dom.window.Event('submit', {bubbles: true, cancelable: true}));
  return {dom, card, root, writes, pick, submit, close: () => { card.remove(); dom.window.close(); }};
}

test('quick timer card starts a climate timer with the desired state', async () => {
  const t = setup({entity: 'climate.room', presets: [15, 30, 60]});
  try {
    await tick();
    assert.match(t.root.querySelector('.qt-title').textContent, /AC Camera/);
    assert.match(t.root.querySelector('.qt-live').textContent, /Spento/);
    t.pick('timer_mode', 'cool');
    t.root.querySelector('[data-min="15"]').click();
    assert.equal(t.root.querySelector('.qt-start').textContent, 'Freddo 22° per 15 minuti');
    t.submit(); await tick();
    assert.deepEqual(t.writes[0], {type: 'schedule_creator/quick_timer/create', expected_revision: 7, entity_id: 'climate.room', duration_seconds: 900, action: {domain: 'climate', action: 'apply_state', data: {state: 'cool', temperature: 22}}});
  } finally { t.close(); }
});

test('without a configured entity the card offers a searchable list', async () => {
  const t = setup({});
  try {
    await tick();
    const search = t.root.querySelector('[name="qt_search"]');
    search.value = 'presa'; search.dispatchEvent(new t.dom.window.Event('input', {bubbles: true}));
    assert.equal(t.root.querySelector('[value="light.sofa"]').closest('label').hidden, true);
    t.pick('qt_entity', 'switch.plug');
    assert.match(t.root.querySelector('.qt-title').textContent, /Presa/);
    const minutes = t.root.querySelector('.qt-minutes');
    minutes.value = '90'; minutes.dispatchEvent(new t.dom.window.Event('input', {bubbles: true}));
    assert.equal(t.root.querySelector('.qt-start').textContent, 'Accendi per 90 minuti');
    t.submit(); await tick();
    assert.equal(t.writes[0].duration_seconds, 5400);
    assert.deepEqual(t.writes[0].action, {domain: 'switch', action: 'turn_on', data: {}});
  } finally { t.close(); }
});

test('an active timer shows a countdown and can be cancelled', async () => {
  const timer = {id: 'tm', entity_id: 'light.sofa', state: 'active', expires_at: new Date(Date.now() + 125000).toISOString(), action: {domain: 'light', action: 'turn_on', data: {brightness_pct: 60}}};
  const t = setup({entity: 'light.sofa'}, {timers: [timer]});
  try {
    await tick();
    assert.match(t.root.querySelector('.qt-countdown').textContent, /^2:0[45]$/);
    assert.match(t.root.querySelector('.qt-active').textContent, /Accendi 60%/);
    t.root.querySelector('[data-cancel="tm"]').click(); await tick();
    assert.deepEqual(t.writes[0], {type: 'schedule_creator/quick_timer/cancel', expected_revision: 7, quick_timer_id: 'tm'});
  } finally { t.close(); }
});

test('non-admin users only see timers', async () => {
  const t = setup({entity: 'switch.plug'}, {admin: false});
  try {
    await tick();
    assert.equal(t.root.querySelector('.qt-start'), null);
    assert.match(t.root.textContent, /Serve un amministratore/);
  } finally { t.close(); }
});
