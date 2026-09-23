# Origin of the visual design

Source: `arozoire/weekly-schedule-card`, commit
`04a537d8a09c54555e13edad239a9e39adbbaf24` (version 1.5.3).

`src/weekly-layout.css` copies the CSS declarations from the `_mainStyles`
method of upstream `src/weekly-schedule-card.js` (lines 20–114). The extra
`.sc-*` declarations are new read-only view styles. The read-only card and
WebSocket adapter are new files; the legacy base card, Quick Timer engine,
automations, persistence, RESET and other views are intentionally excluded
because importing them would activate the old execution paths.

The upstream MIT license is preserved in `LICENSE`. This is a separate custom
element and a separate static asset within the Schedule Creator integration.
