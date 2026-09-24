import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const source = (name) => readFileSync(new URL(`src/${name}`, import.meta.url), 'utf8');
const css = source('weekly-layout.css');
const adapter = source('state-adapter.js').replace('export class ScheduleCreatorStateAdapter', 'class ScheduleCreatorStateAdapter');
const editor = source('editor.js').replaceAll('export const ', 'const ').replaceAll('export function ', 'function ');
const forms = source('forms.js').replaceAll('export const ', 'const ').replaceAll('export function ', 'function ');
const timeline = source('timeline.js').replaceAll('export function ', 'function ');
const card = source('schedule-creator-card.js')
  .replace("import { ScheduleCreatorStateAdapter } from './state-adapter.js';", '')
  .replace(/^import .* from '\.\/.*';$/gm, '')
  .replace("'__SC_CSS__'", JSON.stringify(css));
const output = new URL('../custom_components/schedule_creator/frontend/', import.meta.url);
mkdirSync(output, { recursive: true });
writeFileSync(new URL('schedule-creator-card.js', output), `${adapter.trimEnd()}\n${editor.trimEnd()}\n${forms.trimEnd()}\n${timeline.trimEnd()}\n${card.trimEnd()}\n`);
