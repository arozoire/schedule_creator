// Interface language. Italian text is the key; other languages come from
// i18n-strings.js and fall back to Italian for anything missing.
import { STRINGS } from './i18n-strings.js';

export const LANGUAGES = ['it', 'en', 'fr', 'de', 'es'];
const LOCALES = {it: 'it-IT', en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES'};
let currentLanguage = 'it';

// Card option first, then the HA user language; unknown languages use English.
export function setLanguage(hass, config) {
  const wanted = String(config?.language || hass?.locale?.language || hass?.language || 'it').toLowerCase().slice(0, 2);
  currentLanguage = LANGUAGES.includes(wanted) ? wanted : 'en';
  return currentLanguage;
}
export const language = () => currentLanguage;
export function translations() { return STRINGS; }
export const locale = () => LOCALES[currentLanguage];

// t('Fino alle {time}', {time}) → "Until 18:00" in English.
export function t(text, params) {
  const translated = currentLanguage === 'it' ? text : STRINGS[currentLanguage]?.[text] ?? text;
  return params ? translated.replace(/\{(\w+)\}/g, (match, key) => (key in params ? String(params[key]) : match)) : translated;
}
