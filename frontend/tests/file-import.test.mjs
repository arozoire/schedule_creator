import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
const bundle = readFileSync(new URL('../../custom_components/schedule_creator/frontend/schedule-creator-card.js', import.meta.url), 'utf8');
const example = JSON.parse(readFileSync(new URL('../../docs/examples/heating-workdays.import.json', import.meta.url), 'utf8'));
const tick = () => new Promise((r) => setImmediate(r));
const plain = (value) => JSON.parse(JSON.stringify(value));

// What Home Assistant answers to import/file/preview for the example file.
const completed = {profiles: [{name: 'Home', profile_type: 'exclusive', icon: null, color: null, groups: [{name: 'Office', entity_ids: ['climate.office'], icon: null, color: null, schedules: [{
  name: 'Office · workdays', target_entity_ids: ['climate.office'],
  time_slots: [{weekdays: [0, 1, 2, 3, 4], start: '08:30', end: '18:00'}],
  start_action: {domain: 'climate', action: 'apply_state', data: {state: 'heat', temperature: 22}},
  end_action: {domain: 'climate', action: 'apply_state', data: {state: 'heat', temperature: 17}},
  condition: {operator: 'state_equals', entity_id: 'binary_sensor.workday_sensor', value: 'on'}}]}]}]};

function setup(answer) {
  const dom = new JSDOM('<body></body>', {runScripts: 'dangerously', virtualConsole: new VirtualConsole()});
  dom.window.structuredClone = structuredClone;
  dom.window.eval(bundle);
  const snapshot = {revision: 2, config: {profiles: [], groups: [], schedules: [], migration_metadata: {}}, runtime_summary: {revision: 1}, quick_timers: [], operational: {}};
  const sent = [];
  const states = {'climate.office': {entity_id: 'climate.office', state: 'heat', attributes: {friendly_name: 'Office'}}};
  const hass = {user: {is_admin: true}, states, services: {}, config: {}, connection: {subscribeMessage: () => Promise.resolve(() => {}), sendMessagePromise: (msg) => {
    if (msg.type.endsWith('get_state')) return Promise.resolve(snapshot);
    sent.push(plain(msg));
    return answer(msg);
  }}};
  const card = dom.window.document.createElement('schedule-creator-card'); card.setConfig({}); card.hass = hass; dom.window.document.body.append(card);
  return {dom, card, sent};
}

test('an import file is checked by Home Assistant, previewed and added', async () => {
  const {dom, card, sent} = setup((msg) => Promise.resolve(msg.type.endsWith('/preview') ? completed : {revision: 3, profile_ids: ['x'], schedules: 1}));
  await tick();
  try {
    const root = card.shadowRoot;
    root.querySelector('[data-command="newRestore"]').click(); // any file dialog accepts it
    await card.readBackupFile({files: [{name: 'heating.import.json', text: async () => JSON.stringify(example)}]});
    assert.equal(card.edit[0], 'import');
    assert.equal(sent[0].type, 'schedule_creator/import/file/preview');
    assert.deepEqual(sent[0].file, example);
    const text = root.querySelector('dialog').textContent;
    assert.match(text, /«Home»/);
    assert.match(text, /Office · workdays/);
    assert.match(text, /Lun–Ven 08:30–18:00/);
    assert.match(text, /binary_sensor\.workday_sensor/); // not in this HA
    assert.match(text, /disattiva le automazioni/);
    assert.doesNotMatch(text, /Salvato il/);
    root.querySelector('form').dispatchEvent(new dom.window.Event('submit', {bubbles: true, cancelable: true}));
    await tick();
    assert.equal(sent[1].type, 'schedule_creator/import/file');
    assert.equal(sent[1].expected_revision, 2);
    assert.deepEqual(sent[1].file, example);
  } finally { card.remove(); dom.window.close(); }
});

test('an invalid import file shows where it is wrong', async () => {
  const {dom, card} = setup(() => Promise.reject({code: 'invalid_import', message: 'profiles[0].groups[0].schedules[0].time_slots[0].start: is required ("HH:MM")'}));
  await tick();
  try {
    card.shadowRoot.querySelector('[data-command="newImport"]').click();
    await card.readBackupFile({files: [{name: 'bad.json', text: async () => JSON.stringify({format: 'schedule_creator.import', format_version: 1, profiles: []})}]});
    assert.equal(card.importData, null);
    assert.match(card.shadowRoot.textContent, /Il file di import non è valido: profiles\[0\]\.groups\[0\]\.schedules\[0\]\.time_slots\[0\]\.start/);
  } finally { card.remove(); dom.window.close(); }
});
