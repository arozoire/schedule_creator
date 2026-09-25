// Capture README screenshots from preview.html scenarios through the DevTools
// protocol of a Chromium browser started with --remote-debugging-port.
// Usage: node screenshots.mjs [port]   (serve the repository root on :8765 first)
import { writeFileSync, mkdirSync } from 'node:fs';

const port = process.argv[2] || 9333;
const shots = [
  ['main', 760, 1400], ['editor', 390, 844], ['action', 390, 844],
  ['conditions', 760, 1000], ['quicktimer', 420, 860], ['timeline', 760, 480],
  ['serpentine', 760, 880], ['ring', 760, 820],
];
const out = new URL('../docs/images/', import.meta.url);
mkdirSync(out, {recursive: true});

async function capture(name, width, height) {
  const target = await (await fetch(`http://localhost:${port}/json/new?about:blank`, {method: 'PUT'})).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => ws.addEventListener('open', resolve, {once: true}));
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id); }
  });
  const send = (method, params = {}) => new Promise((resolve) => { pending.set(++id, resolve); ws.send(JSON.stringify({id, method, params})); });
  await send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 2, mobile: width < 500});
  await send('Page.enable');
  await send('Page.navigate', {url: `http://localhost:8765/frontend/preview.html#shot=${name}`});
  for (let i = 0; i < 50; i++) {
    const ready = await send('Runtime.evaluate', {expression: 'document.body?.dataset.ready === "1"', returnByValue: true});
    if (ready.result.value) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  await new Promise((r) => setTimeout(r, 600));
  const shot = await send('Page.captureScreenshot', {format: 'png'});
  writeFileSync(new URL(`${name}.png`, out), Buffer.from(shot.data, 'base64'));
  ws.close();
  await fetch(`http://localhost:${port}/json/close/${target.id}`);
  console.log(`${name}.png ${width}x${height}`);
}

for (const [name, width, height] of shots) await capture(name, width, height);
