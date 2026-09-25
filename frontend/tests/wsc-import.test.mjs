import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
const bundle = readFileSync(new URL('../../custom_components/schedule_creator/frontend/schedule-creator-card.js', import.meta.url), 'utf8');
const tick = () => new Promise((r) => setImmediate(r));
const plain = (value) => JSON.parse(JSON.stringify(value));

// Shaped like a real weekly-schedule-card backup (maintenance → save configuration).
const marker = (entity, calls) => [{service: 'logbook.log', entity_id: entity, service_data: {name: 'WSC conditional v1', message: JSON.stringify(calls)}}];
const scheduler = (weekdays, start, stop, actions, extra = {}) => ({weekdays, start_date: null, end_date: null, timeslots: [{start, stop, conditions: [], condition_type: null, track_conditions: false, actions}], repeat_type: 'repeat', name: 'Scheduler …', tags: [], enabled: true, ...extra});
function backup() {
  return {
    schema: 'weekly-schedule-card/backup', version: 1, createdAt: '2026-09-25T06:26:00.000Z',
    profileData: {groups: [], activeProfiles: ['default'], profiles: [{
      id: 'default', name: 'Home', exclusive: true,
      groups: [
        {id: 'g1', name: 'Tende', color: '#9C27B0', entities: [{entity: 'cover.blind', name: 'Tenda studio'}]},
        {id: 'g2', name: 'AC', color: '#E91E63', entities: [{entity: 'climate.room', name: 'AC Camera'}]},
      ],
      schedules: ['switch.schedule_blind', 'switch.schedule_ac', 'switch.schedule_valve', 'switch.schedule_attr', 'switch.schedule_once', 'switch.schedule_light'],
      scheduleLinks: [
        {id: 'switch.schedule_blind', stopAction: 'set_position', stopValue: 50, notifyService: 'mobile_app_phone', notifyTrigger: 'both', notifyMessage: 'Tenda giù', notifyMessageEnd: 'Tenda su'},
        {id: 'switch.schedule_ac', stopAction: 'turn_off', conditions: [{entity: 'sensor.temperature', operator: '>', value: '24', attribute: '', hysteresis: '1'}], condCombinator: 'and', extras: {hvacMode: 'cool', fanMode: 'Auto'}},
        {id: 'switch.schedule_valve', stopAction: 'close'},
        {id: 'switch.schedule_attr', stopAction: 'turn_off', conditions: [{entity: 'sun.sun', operator: '>', value: '10', attribute: 'elevation', hysteresis: ''}]},
        {id: 'switch.schedule_once', oneShot: true},
        {id: 'switch.schedule_light', stopAction: 'set_brightness', stopValue: 20, overrideEnabled: true},
      ],
    }]},
    schedules: [
      {entityId: 'switch.schedule_blind', config: scheduler(['workday'], '06:45', '06:47', [{service: 'cover.set_cover_position', entity_id: 'cover.blind', service_data: {position: 13}}])},
      {entityId: 'switch.schedule_ac', config: scheduler(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], '22:00', '02:00', marker('climate.room', [
        {entity_id: 'climate.room', service: 'climate.set_temperature', service_data: {temperature: 26}},
        {entity_id: 'climate.room', service: 'climate.set_hvac_mode', service_data: {hvac_mode: 'cool'}},
        {entity_id: 'climate.room', service: 'climate.set_fan_mode', service_data: {fan_mode: 'Auto'}}]))},
      {entityId: 'switch.schedule_valve', config: scheduler(['tue', 'thu', 'sat'], '06:10', '06:25', [{service: 'valve.open_valve', entity_id: 'valve.garden', service_data: {}}], {enabled: false})},
      {entityId: 'switch.schedule_attr', config: scheduler(['sat'], '10:00', '12:00', [{service: 'switch.turn_on', entity_id: 'switch.a', service_data: {}}])},
      {entityId: 'switch.schedule_once', config: scheduler(['mon'], '10:00', '11:00', [{service: 'switch.turn_on', entity_id: 'switch.a', service_data: {}}], {repeat_type: 'single'})},
      {entityId: 'switch.schedule_light', config: scheduler(['weekend'], '19:00', '23:00', [{service: 'homeassistant.turn_on', entity_id: 'light.sofa', service_data: {}}])},
    ],
    automations: [], helpers: [],
  };
}

test('weekly-schedule-card schedules become Schedule Creator drafts with honest notes', () => {
  const dom = new JSDOM('<body></body>', {runScripts: 'dangerously', virtualConsole: new VirtualConsole()});
  dom.window.eval(bundle);
  try {
    const {convertWscBackup, wscImportPayload} = dom.window;
    const out = plain(convertWscBackup(dom.window.JSON.parse(JSON.stringify(backup())), {existingProfileNames: ['home'], entityName: (id) => id}));
    const [profile] = out.profiles;
    assert.equal(profile.name, 'Home (WSC)');
    assert.equal(profile.profile_type, 'exclusive');
    assert.equal(profile.wasActive, true);
    assert.deepEqual(profile.groups.map((g) => [g.name, g.entity_ids]), [['Tende', ['cover.blind']], ['AC', ['climate.room']], ['Altri dispositivi', ['valve.garden', 'switch.a', 'light.sofa']]]);
    const byName = Object.fromEntries(out.rows.map((r) => [r.name || r.source, r]));
    const all = profile.groups.flatMap((g) => g.schedules);

    const blind = all.find((s) => s.target_entity_ids[0] === 'cover.blind');
    assert.equal(blind.name, 'Tenda studio · Posizione 13%');
    assert.deepEqual(blind.time_slots, [{weekdays: [0, 1, 2, 3, 4], start: '06:45', end: '06:47'}]);
    assert.deepEqual(blind.end_action, {domain: 'cover', action: 'set_cover_position', data: {position: 50}});
    assert.deepEqual(blind.start_notification, {action: 'notify.mobile_app_phone', title: '', message: 'Tenda giù'});
    assert.equal(blind.end_notification.message, 'Tenda su');
    assert.equal(byName['Tenda studio · Posizione 13%'].status, 'note'); // workday → Mon–Fri

    const ac = all.find((s) => s.target_entity_ids[0] === 'climate.room');
    assert.deepEqual(ac.start_action, {domain: 'climate', action: 'apply_state', data: {state: 'cool', temperature: 26, fan_mode: 'Auto'}});
    assert.deepEqual(ac.end_action, {domain: 'climate', action: 'apply_state', data: {state: 'off'}});
    assert.deepEqual(ac.time_slots[0], {weekdays: [0, 1, 2, 3, 4, 5, 6], start: '22:00', end: '02:00'});
    assert.equal(ac.condition.operator, 'numeric_greater');
    assert.equal(ac.condition.value, 24);
    assert.equal(ac.condition.hysteresis, 1);
    assert.equal(ac.enabled, true);

    const valve = all.find((s) => s.target_entity_ids[0] === 'valve.garden');
    assert.deepEqual([valve.start_action.action, valve.end_action.action, valve.enabled], ['open_valve', 'close_valve', false]);

    const attr = all.find((s) => s.target_entity_ids[0] === 'switch.a');
    assert.equal(attr.enabled, false);
    assert.equal(attr.condition, null);
    assert.equal(out.rows.find((r) => r.entity === 'switch.a').status, 'off');

    const light = all.find((s) => s.target_entity_ids[0] === 'light.sofa');
    assert.deepEqual(light.start_action, {domain: 'light', action: 'turn_on', data: {}});
    assert.deepEqual(light.end_action, {domain: 'light', action: 'turn_on', data: {brightness_pct: 20}});
    assert.equal(light.override_policy, 'manual_override');
    assert.deepEqual(light.time_slots[0].weekdays, [5, 6]);

    assert.equal(out.rows.filter((r) => r.status === 'skip').length, 1);
    assert.equal(all.length, 5);
    const payload = plain(wscImportPayload(out, backup()));
    assert.equal(payload.source, 'weekly-schedule-card');
    assert.equal(payload.source_created_at, '2026-09-25T06:26:00.000Z');
    assert.equal('wasActive' in payload.profiles[0], false);
  } finally { dom.window.close(); }
});

test('the card previews a weekly-schedule-card backup and sends one import', async () => {
  const dom = new JSDOM('<body></body>', {url: 'http://ha.local/lovelace/casa', runScripts: 'dangerously', virtualConsole: new VirtualConsole()});
  dom.window.structuredClone = structuredClone;
  dom.window.eval(bundle);
  const snapshot = {revision: 3, config: {profiles: [{id: 'p', name: 'Home', active: true}], groups: [], schedules: [], migration_metadata: {}}, runtime_summary: {revision: 6}, quick_timers: [], operational: {}};
  const writes = [];
  const states = {'cover.blind': {entity_id: 'cover.blind', state: 'open', attributes: {friendly_name: 'Tenda'}}, 'climate.room': {entity_id: 'climate.room', state: 'off', attributes: {}}, 'sensor.temperature': {entity_id: 'sensor.temperature', state: '22', attributes: {}}};
  const hass = {user: {is_admin: true}, states, services: {}, config: {time_zone: 'Europe/Rome'}, connection: {subscribeMessage: () => Promise.resolve(() => {}), sendMessagePromise: (msg) => { if (msg.type.endsWith('get_state')) return Promise.resolve(snapshot); writes.push(plain(msg)); return Promise.resolve({revision: 4, profile_ids: ['x'], schedules: 5}); }}};
  const card = dom.window.document.createElement('schedule-creator-card'); card.setConfig({}); card.hass = hass; dom.window.document.body.append(card);
  await tick();
  try {
    const root = card.shadowRoot;
    root.querySelector('[data-command="newImport"]').click();
    const submit = () => root.querySelector('form').dispatchEvent(new dom.window.Event('submit', {bubbles: true, cancelable: true}));
    submit(); await tick();
    assert.equal(writes.length, 0);
    await card.readBackupFile({files: [{name: 'wsc.json', text: async () => JSON.stringify(backup())}]});
    const text = root.querySelector('dialog').textContent;
    assert.match(text, /Importa da Weekly Schedule Card/);
    assert.match(text, /«Home \(WSC\)»/);
    assert.match(text, /era attivo nella weekly-schedule-card/);
    assert.match(text, /valve\.garden/); // missing in this HA
    assert.match(text, /spegni gli stessi schedule/);
    assert.equal(root.querySelectorAll('.sc-import-row').length, 6);
    assert.equal(root.querySelectorAll('.sc-import-row.is-skip').length, 1);
    submit(); await tick();
    assert.equal(writes.length, 1);
    assert.equal(writes[0].type, 'schedule_creator/import/merge');
    assert.equal(writes[0].expected_revision, 3);
    assert.equal(writes[0].profiles[0].groups.flatMap((g) => g.schedules).length, 5);
  } finally { card.remove(); dom.window.close(); }
});

test('a weekly-schedule-card file chosen in restore switches to import', async () => {
  const dom = new JSDOM('<body></body>', {runScripts: 'dangerously', virtualConsole: new VirtualConsole()});
  dom.window.structuredClone = structuredClone;
  dom.window.eval(bundle);
  const snapshot = {revision: 1, config: {profiles: [], groups: [], schedules: []}, runtime_summary: {revision: 1}, quick_timers: [], operational: {}};
  const hass = {user: {is_admin: true}, states: {}, services: {}, config: {}, connection: {subscribeMessage: () => Promise.resolve(() => {}), sendMessagePromise: () => Promise.resolve(snapshot)}};
  const card = dom.window.document.createElement('schedule-creator-card'); card.setConfig({}); card.hass = hass; dom.window.document.body.append(card);
  await tick();
  try {
    card.shadowRoot.querySelector('[data-command="newRestore"]').click();
    await card.readBackupFile({files: [{name: 'wsc.json', text: async () => JSON.stringify(backup())}]});
    assert.equal(card.edit[0], 'import');
    assert.match(card.shadowRoot.querySelector('dialog').textContent, /«Home»/);
  } finally { card.remove(); dom.window.close(); }
});

test('valves are edited like covers', () => {
  const dom = new JSDOM('<body></body>', {runScripts: 'dangerously', virtualConsole: new VirtualConsole()});
  dom.window.eval(bundle);
  try {
    const {actionToUi, describeAction, controllable} = dom.window;
    const caps = {domain: 'valve', states: [], modes: ['open', 'close', 'position']};
    assert.equal(JSON.stringify(actionToUi('valve', {domain: 'valve', action: 'set_valve_position', data: {position: 40}}, caps)), '{"mode":"position","position":40}');
    assert.equal(actionToUi('valve', {domain: 'valve', action: 'open_valve', data: {}}, caps).mode, 'open');
    assert.equal(describeAction({domain: 'valve', action: 'close_valve', data: {}}), 'Chiudi');
    assert.equal(controllable({services: {valve: {open_valve: {}}}}, 'valve.garden'), true);
  } finally { dom.window.close(); }
});

test('Scheduler sunrise and sunset times become sun-based slots', () => {
  const dom = new JSDOM('<body></body>', {runScripts: 'dangerously', virtualConsole: new VirtualConsole()});
  dom.window.eval(bundle);
  try {
    const source = backup();
    source.schedules[0].config.timeslots[0].start = 'sunset-00:30:00';
    source.schedules[0].config.timeslots[0].stop = '23:00:00';
    const out = plain(dom.window.convertWscBackup(dom.window.JSON.parse(JSON.stringify(source)), {sun: {sunrise: 400, sunset: 1150}}));
    const blind = out.profiles[0].groups.flatMap((g) => g.schedules).find((s) => s.target_entity_ids[0] === 'cover.blind');
    assert.deepEqual(blind.time_slots[0], {weekdays: [0, 1, 2, 3, 4], start: '18:40', end: '23:00', start_sun: 'sunset', start_offset_minutes: -30});
    const {readSlots, boundaryLabel} = dom.window;
    assert.equal(boundaryLabel(blind.time_slots[0], 'start'), 'Tramonto −30′');
    assert.equal(boundaryLabel(blind.time_slots[0], 'end'), '23:00');
    const elements = {slot_0_start: {value: '05:00'}, slot_0_end: {value: '09:00'}, slot_0_start_sun: {value: 'sunrise'}, slot_0_start_offset: {value: '20'}, slot_0_end_sun: {value: ''}};
    const form = {elements, querySelectorAll: () => [{dataset: {slot: '0'}, querySelectorAll: () => [{value: '0'}]}]};
    assert.equal(JSON.stringify(readSlots(form, {sunrise: 400, sunset: 1150})), '[{"weekdays":[0],"start":"07:00","end":"09:00","start_sun":"sunrise","start_offset_minutes":20}]'); // 06:40 sunrise + 20 min
  } finally { dom.window.close(); }
});
