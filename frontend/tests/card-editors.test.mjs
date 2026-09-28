import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
const bundle = readFileSync(new URL('../../custom_components/schedule_creator/frontend/schedule-creator-card.js', import.meta.url), 'utf8');
const source = readFileSync(new URL('../src/card-editors.js', import.meta.url), 'utf8');
const load = () => { const dom = new JSDOM('<body></body>', {runScripts: 'dangerously', virtualConsole: new VirtualConsole()}); dom.window.structuredClone = structuredClone; dom.window.eval(bundle); return dom; };
const hass = {language: 'en', states: {
  'light.sofa': {entity_id: 'light.sofa', state: 'on', attributes: {friendly_name: 'Sofa'}},
  'cover.bedroom': {entity_id: 'cover.bedroom', state: 'open', attributes: {friendly_name: 'Bedroom'}},
  'sensor.lux': {entity_id: 'sensor.lux', state: '3', attributes: {}},
}, services: {light: {turn_on: {}}, cover: {open_cover: {}}}};

function editor(dom, card, config) {
  const node = dom.window.customElements.get(card).getConfigElement();
  const changes = [];
  node.addEventListener('config-changed', (e) => changes.push(e.detail.config));
  node.setConfig(config); node.hass = hass;
  dom.window.document.body.append(node);
  const change = (name, value) => { const field = node.querySelector(`[name="${name}"]`); field.value = value; field.dispatchEvent(new dom.window.Event('change')); };
  return {node, changes, change};
}

test('every card has a visual editor', () => {
  const dom = load();
  for (const card of ['schedule-creator-card', 'schedule-creator-quick-timer-card', 'schedule-creator-timeline-card', 'schedule-creator-serpentine-card', 'schedule-creator-ring-card'])
    assert.ok(dom.window.customElements.get(card).getConfigElement() instanceof dom.window.HTMLElement, card);
  dom.window.close();
});

test('the week editor picks, orders and removes devices and drops empty options', () => {
  const dom = load();
  const {node, changes, change} = editor(dom, 'schedule-creator-ring-card', {type: 'custom:schedule-creator-ring-card', max_lanes: 4});
  assert.match(node.textContent, /Devices shown/);
  assert.equal(node.querySelector('select[name="entities"]').querySelectorAll('option').length, 3, 'only controllable entities');
  change('entities', 'light.sofa'); change('entities', 'cover.bedroom');
  assert.deepEqual([...changes.at(-1).entities], ['light.sofa', 'cover.bedroom']);
  node.querySelector('button[data-move="1"][data-by="-1"]').click();
  assert.deepEqual([...changes.at(-1).entities], ['cover.bedroom', 'light.sofa']);
  node.querySelector('button[data-remove="0"]').click(); node.querySelector('button[data-remove="0"]').click();
  assert.ok(!('entities' in changes.at(-1)));
  change('max_lanes', ''); change('edit_path', '/lovelace/schedules'); change('language', 'de');
  assert.deepEqual({...changes.at(-1)}, {type: 'custom:schedule-creator-ring-card', edit_path: '/lovelace/schedules', language: 'de'});
  assert.match(node.textContent, /Angezeigte Geräte/);
  dom.window.close();
});

test('the Quick Timer editor keeps presets as numbers', () => {
  const dom = load();
  const {changes, change} = editor(dom, 'schedule-creator-quick-timer-card', {entity: ''});
  change('entity', 'cover.bedroom'); change('presets', '5, x, 20'); change('default_minutes', '20');
  assert.deepEqual({...changes.at(-1), presets: [...changes.at(-1).presets]}, {entity: 'cover.bedroom', presets: [5, 20], default_minutes: 20});
  dom.window.close();
});

test('editor labels are translated', () => {
  const dom = load();
  const strings = dom.window.translations();
  const keys = [...source.matchAll(/(?:label|hint): '([^']+)'|'(Titolo[^']*)'/g)].map((m) => m[1] || m[2]);
  assert.ok(keys.length >= 6);
  for (const lang of ['en', 'fr', 'de', 'es']) assert.deepEqual(keys.filter((k) => !(k in strings[lang])), [], lang);
  dom.window.close();
});
