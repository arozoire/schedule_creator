import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
const bundle = readFileSync(new URL('../../custom_components/schedule_creator/frontend/schedule-creator-card.js', import.meta.url), 'utf8');
const src = new URL('../src/', import.meta.url);
const tick = () => new Promise((r) => setImmediate(r));
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

function load() {
  const dom = new JSDOM('<body></body>', {runScripts: 'dangerously', virtualConsole: new VirtualConsole()});
  dom.window.structuredClone = structuredClone;
  dom.window.eval(bundle);
  return dom;
}

test('every interface text has a translation in each language', () => {
  const dom = load();
  try {
    const strings = dom.window.translations();
    const keys = new Set();
    for (const file of readdirSync(src).filter((f) => f.endsWith('.js') && !f.startsWith('i18n'))) {
      for (const match of readFileSync(new URL(file, src), 'utf8').matchAll(/\bt\('((?:[^'\\]|\\.)*)'/g)) keys.add(match[1].replace(/\\'/g, "'"));
    }
    assert.ok(keys.size > 400);
    for (const lang of ['en', 'fr', 'de', 'es']) {
      const missing = [...keys].filter((key) => !(key in strings[lang]));
      assert.deepEqual(missing, [], `${lang} is missing translations`);
      for (const [key, value] of Object.entries(strings[lang])) assert.equal(placeholders(value), placeholders(key), `${lang}: ${key}`);
    }
  } finally { dom.window.close(); }
});

test('the language follows Home Assistant, the card option and falls back to English', () => {
  const dom = load();
  try {
    const {setLanguage, t} = dom.window;
    assert.equal(setLanguage({language: 'de'}, {}), 'de');
    assert.equal(t('Fino alle {time}', {time: '18:00'}), 'Bis 18:00');
    assert.equal(setLanguage({language: 'de'}, {language: 'fr'}), 'fr');
    assert.equal(setLanguage({language: 'pt-BR'}, {}), 'en');
    assert.equal(setLanguage({language: 'it'}, {}), 'it');
    assert.equal(t('Fino alle {time}', {time: '18:00'}), 'Fino alle 18:00');
  } finally { dom.window.close(); }
});

test('the card in English shows no Italian text', async () => {
  const dom = load();
  const schedule = {id: 's', profile_id: 'p', group_id: 'g', name: 'Evening', enabled: true, target_entity_ids: ['light.sofa'], time_slots: [{weekdays: [0, 1, 2, 3, 4], start: '18:00', end: '22:00'}], start_action: {domain: 'light', action: 'turn_on', data: {brightness_pct: 60}}, end_action: {domain: 'light', action: 'turn_off', data: {}}, condition: {operator: 'numeric_greater', entity_id: 'sensor.lux', value: 100, lower: null, upper: null, children: [], minimum_duration_seconds: 600, hysteresis: 10}, start_notification: null, end_notification: null, override_policy: 'cooperative', inclusion_dates: [], exclusion_dates: []};
  const state = {revision: 2, integration_version: '', config: {profiles: [{id: 'p', name: 'Home', active: true, profile_type: 'exclusive'}], groups: [{id: 'g', profile_id: 'p', name: 'Living', entity_ids: ['light.sofa']}], schedules: [schedule], settings: {}}, runtime_summary: {revision: 3}, quick_timers: [], operational: {occurrences: [{id: 'o', schedule_id: 's', state: 'active', condition_branch: 'false', end_utc: new Date(Date.now() + 3600000).toISOString()}], leases: []}, failures: [{at: new Date().toISOString(), kind: 'target_action', phase: 'schedule_end', entity_id: 'light.sofa', schedule_id: 's', schedule_name: 'Evening', quick_timer: false, error_code: 'service_failed', attempts: 3}], stats: {s: {activations: 2, muted: 1, last_activation: null, last_muted: null}}};
  const states = {'light.sofa': {entity_id: 'light.sofa', state: 'on', attributes: {friendly_name: 'Sofa', supported_color_modes: ['brightness']}}, 'sensor.lux': {entity_id: 'sensor.lux', state: '80', attributes: {friendly_name: 'Lux', unit_of_measurement: 'lx'}}};
  const hass = {language: 'en', user: {is_admin: true}, states, services: {light: {turn_on: {}, turn_off: {}}}, config: {time_zone: 'Europe/Rome'}, connection: {subscribeMessage: () => Promise.resolve(() => {}), sendMessagePromise: () => Promise.resolve(state)}};
  const card = dom.window.document.createElement('schedule-creator-card'); card.setConfig({}); card.hass = hass; dom.window.document.body.append(card);
  await tick();
  const italian = /\b(della|delle|nessun[ao]?|scegli|salva|modifica|elimina|annulla|oggi|fasci[ae]|attività|profil[oi]|grupp[oi]|dispositiv[oi]|condizion[ei]|notific[ah]e?|azione|stato|settimana|quando|inizio|fine|luminosità|accendi|spegni|giorni|minuti|tutti|feriali|isteresi|diventa|torna|rimuovi|ripristin[ao]|importa|backup salvato|attiv[ao])\b/i;
  const scan = (label) => {
    const root = card.shadowRoot;
    const texts = [root.textContent, ...[...root.querySelectorAll('[title],[aria-label],[placeholder]')].map((n) => `${n.getAttribute('title') || ''} ${n.getAttribute('aria-label') || ''} ${n.getAttribute('placeholder') || ''}`)].join(' ')
      .replace(/Evening|Home|Living|Sofa|Lux|Schedule Creator|Quick Timer|Weekly Schedule Card|weekly-schedule-card|Scheduler|RESET/g, '');
    const found = texts.match(italian);
    assert.equal(found, null, `${label}: Italian word “${found?.[0]}” in: …${found ? texts.slice(Math.max(0, found.index - 60), found.index + 60) : ''}…`);
  };
  try {
    card.shadowRoot.querySelectorAll('details').forEach((d) => { d.open = true; });
    scan('main view');
    for (const [command, id] of [['editSchedule', 's'], ['newProfile', ''], ['newGroup', ''], ['newRestore', ''], ['newImport', ''], ['newReset', ''], ['newTimer', '']]) {
      card.openEditor(command, id);
      card.shadowRoot.querySelectorAll('details').forEach((d) => { d.open = true; });
      scan(command);
      card.closeEditor();
    }
  } finally { card.remove(); dom.window.close(); }
});
