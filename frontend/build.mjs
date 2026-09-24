import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

// Normalize Windows checkouts so the shipped bundle matches the Linux CI build.
const source = (name) => readFileSync(new URL(`src/${name}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
// Modules are concatenated into one classic script: drop imports and exports.
const module = (name) => source(name)
  .replace(/^import .* from '\.\/.*';$/gm, '')
  .replace(/^export (class|const|function) /gm, '$1 ');
const manifest = JSON.parse(readFileSync(new URL('../custom_components/schedule_creator/manifest.json', import.meta.url), 'utf8'));
const css = source('weekly-layout.css');
const card = module('schedule-creator-card.js')
  .replace("'__SC_CSS__'", JSON.stringify(css))
  .replace(/const CARD_VERSION = '[^']*';/, `const CARD_VERSION = ${JSON.stringify(manifest.version)};`);
const output = new URL('../custom_components/schedule_creator/frontend/', import.meta.url);
mkdirSync(output, { recursive: true });
const parts = ['state-adapter.js', 'editor.js', 'forms.js', 'action-editor.js', 'schedule-editor.js', 'timeline.js'].map((name) => module(name).trimEnd());
const quickTimer = module('quick-timer-card.js').replace("'__SC_QT_CSS__'", JSON.stringify(css + source('quick-timer.css')));
const timelineCard = module('timeline-card.js').replace("'__SC_TL_CSS__'", JSON.stringify(source('timeline-card.css')));
writeFileSync(new URL('schedule-creator-card.js', output), `${[...parts, card.trimEnd(), quickTimer.trimEnd(), timelineCard.trimEnd()].join('\n')}\n`);
