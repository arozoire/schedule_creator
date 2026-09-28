// Visual editors of the dashboard cards: one builder, one field list per card.
import { t, setLanguage } from './i18n.js';
import { targetEntities, uiEscape } from './forms.js';

const CE_LANGUAGES = [['it', 'Italiano'], ['en', 'English'], ['fr', 'Français'], ['de', 'Deutsch'], ['es', 'Español']];
const ceName = (hass, id) => hass.states[id]?.attributes?.friendly_name || id;
const ceOptions = (hass, selected) => targetEntities(hass).filter((id) => !selected.includes(id)).sort((a, b) => ceName(hass, a).localeCompare(ceName(hass, b)));

// Each field reads its value from the config and writes it back; an empty value
// removes the option so the card falls back to its default.
const CE_FIELDS = {
  title: (label) => ({key: 'title', kind: 'text', label}),
  name: () => ({key: 'name', kind: 'text', label: 'Nome mostrato'}),
  language: () => ({key: 'language', kind: 'language'}),
  entity: () => ({key: 'entity', kind: 'entity'}),
  entities: () => ({key: 'entities', kind: 'entities'}),
  presets: () => ({key: 'presets', kind: 'presets'}),
  default_minutes: () => ({key: 'default_minutes', kind: 'number', label: 'Durata predefinita (minuti)', min: 1, max: 1440}),
  max_lanes: () => ({key: 'max_lanes', kind: 'number', label: 'Dispositivi al massimo', min: 1, max: 8, placeholder: '6'}),
  edit_path: () => ({key: 'edit_path', kind: 'text', label: 'Vista con la card principale', placeholder: '/lovelace/schedules', hint: 'Il pulsante Modifica apre lo schedule in questa vista.'}),
};

class ScheduleCreatorCardEditorBase extends HTMLElement {
  setConfig(config) { this.config = config || {}; if (!this.rendered) this.render(); }
  set hass(hass) { this._hass = hass; if (!this.rendered) this.render(); }
  update(key, value) {
    const config = {...this.config};
    if (value === '' || value == null || (Array.isArray(value) && !value.length)) delete config[key]; else config[key] = value;
    this.config = config;
    this.dispatchEvent(new CustomEvent('config-changed', {detail: {config}, bubbles: true, composed: true}));
  }
  field(f) {
    const E = uiEscape, value = this.config[f.key], hass = this._hass;
    const hint = f.hint ? `<small class="ce-hint">${t(f.hint)}</small>` : '';
    if (f.kind === 'text') return `<label>${t(f.label)}<input name="${f.key}" value="${E(value || '')}" placeholder="${E(f.placeholder || '')}">${hint}</label>`;
    if (f.kind === 'number') return `<label>${t(f.label)}<input name="${f.key}" type="number" min="${f.min}" max="${f.max}" value="${E(value ?? '')}" placeholder="${E(f.placeholder || '')}"></label>`;
    if (f.kind === 'presets') return `<label>${t('Durate rapide (minuti, separate da virgola)')}<input name="presets" value="${E((value || []).join(', '))}" placeholder="5, 10, 15, 30, 45, 60"></label>`;
    if (f.kind === 'language') return `<label>${t('Lingua')}<select name="language"><option value="">${t('Come l’utente di Home Assistant')}</option>${CE_LANGUAGES.map(([code, label]) => `<option value="${code}" ${code === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>`;
    if (f.kind === 'entity') return `<label>${t('Entità')}<select name="entity"><option value="">${t('Scegli nella card')}</option>${[...(value ? [value] : []), ...ceOptions(hass, value ? [value] : [])].map((id) => `<option value="${E(id)}" ${id === value ? 'selected' : ''}>${E(ceName(hass, id))}</option>`).join('')}</select></label>`;
    const list = Array.isArray(value) ? value : [];
    const rows = list.map((id, i) => `<li><span>${E(ceName(hass, id))}<small>${E(id)}</small></span><button type="button" data-move="${i}" data-by="-1" ${i ? '' : 'disabled'} aria-label="${t('Sposta su')}">↑</button><button type="button" data-move="${i}" data-by="1" ${i < list.length - 1 ? '' : 'disabled'} aria-label="${t('Sposta giù')}">↓</button><button type="button" data-remove="${i}" aria-label="${t('Rimuovi')}">✕</button></li>`).join('');
    return `<div class="ce-group"><span>${t('Dispositivi mostrati')}</span>${list.length ? `<ol>${rows}</ol>` : `<small class="ce-hint">${t('Tutti quelli dei profili attivi, in ordine alfabetico.')}</small>`}<select name="entities"><option value="">${t('Aggiungi un dispositivo…')}</option>${ceOptions(hass, list).map((id) => `<option value="${E(id)}">${E(ceName(hass, id))}</option>`).join('')}</select></div>`;
  }
  render() {
    if (!this.config || !this._hass) return;
    this.rendered = true;
    setLanguage(this._hass, this.config);
    this.innerHTML = `<style>.ce{display:grid;gap:14px;padding:12px}.ce label,.ce-group{display:grid;gap:4px;font-weight:500}.ce input,.ce select{font:inherit;padding:8px;border:1px solid var(--divider-color,#ccc);border-radius:6px;background:var(--card-background-color,#fff);color:var(--primary-text-color)}.ce-hint{font-weight:400;color:var(--secondary-text-color)}.ce ol{margin:0;padding:0;list-style:none;display:grid;gap:4px}.ce li{display:flex;gap:4px;align-items:center}.ce li span{flex:1;display:grid}.ce li small{color:var(--secondary-text-color)}.ce li button{min-width:36px;min-height:36px;border:1px solid var(--divider-color,#ccc);border-radius:6px;background:none;color:inherit;cursor:pointer}.ce li button:disabled{opacity:.35;cursor:default}</style><div class="ce">${this.constructor.fields.map((f) => this.field(f)).join('')}</div>`;
    this.querySelectorAll('input,select').forEach((node) => node.addEventListener('change', () => {
      const value = node.value.trim();
      if (node.name === 'entities') { if (value) this.update('entities', [...(this.config.entities || []), value]); this.render(); return; }
      if (node.name === 'presets') this.update('presets', value.split(',').map((x) => Number(x.trim())).filter((x) => Number.isFinite(x) && x >= 1));
      else if (node.type === 'number') this.update(node.name, value === '' ? '' : Number(value));
      else this.update(node.name, value);
      if (node.name === 'language' || node.name === 'entity') this.render();
    }));
    this.querySelectorAll('button[data-move],button[data-remove]').forEach((button) => button.addEventListener('click', () => {
      const list = [...(this.config.entities || [])];
      if (button.dataset.remove != null) list.splice(Number(button.dataset.remove), 1);
      else { const i = Number(button.dataset.move), j = i + Number(button.dataset.by); [list[i], list[j]] = [list[j], list[i]]; }
      this.update('entities', list); this.render();
    }));
  }
}

const ceEditor = (fields) => class extends ScheduleCreatorCardEditorBase { static fields = fields; };
export const ScheduleCreatorCardEditor = ceEditor([CE_FIELDS.title('Titolo della card'), CE_FIELDS.language()]);
export const ScheduleCreatorQuickTimerCardEditor = ceEditor([CE_FIELDS.entity(), CE_FIELDS.title('Titolo'), CE_FIELDS.name(), CE_FIELDS.presets(), CE_FIELDS.default_minutes(), CE_FIELDS.language()]);
export const ScheduleCreatorTimelineCardEditor = ceEditor([CE_FIELDS.title('Titolo'), CE_FIELDS.entities(), CE_FIELDS.language()]);
export const ScheduleCreatorWeekCardEditor = ceEditor([CE_FIELDS.title('Titolo'), CE_FIELDS.entities(), CE_FIELDS.max_lanes(), CE_FIELDS.edit_path(), CE_FIELDS.language()]);

for (const [tag, cls] of [
  ['schedule-creator-card-editor', ScheduleCreatorCardEditor],
  ['schedule-creator-quick-timer-card-editor', ScheduleCreatorQuickTimerCardEditor],
  ['schedule-creator-timeline-card-editor', ScheduleCreatorTimelineCardEditor],
  ['schedule-creator-week-card-editor', ScheduleCreatorWeekCardEditor],
]) if (!customElements.get(tag)) customElements.define(tag, cls);
