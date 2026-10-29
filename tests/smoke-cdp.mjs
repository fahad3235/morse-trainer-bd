// CDP headless-Chrome smoke test. Run: node tests/smoke-cdp.mjs
// Requires /opt/meta-chromium/chrome. Uses a temp profile under /tmp.
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const PORT = Number(process.env.CDP_PORT || 9223);
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PAGE = 'file://' + path.join(ROOT, 'index.html');
// Hatch-patched chrome only starts in a foreground process group, so when
// CDP_PORT is set the caller launches chrome itself (foreground, under
// timeout) and this script only connects. Otherwise spawn chrome directly.
let chrome = null;
if (!process.env.CDP_PORT) {
  chrome = spawn(process.env.CHROME_BIN || '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell', [
    '--no-sandbox', '--disable-gpu',
    `--remote-debugging-port=${PORT}`, '--user-data-dir=/tmp/mt-hs-profile', 'about:blank',
  ], { stdio: 'ignore' });
}

let ws, msgId = 0;
const pending = new Map();
const errors = [];
function send(method, params = {}) {
  const id = ++msgId;
  return new Promise((res) => { pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
}
async function ev(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  const res = r.result;
  if (res.exceptionDetails) throw new Error('JS exception: ' + JSON.stringify(res.exceptionDetails.exception?.description || res.exceptionDetails));
  return res.result.value;
}
function check(name, cond, extra = '') {
  console.log((cond ? 'ok - ' : 'FAIL - ') + name + (cond ? '' : ' :: ' + extra));
  if (!cond) process.exitCode = 1;
}
try {
  let target = null;
  for (let i = 0; i < 75 && !target; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(PAGE)}`, { method: 'PUT' });
      target = await r.json();
    } catch { await sleep(200); }
  }
  if (!target) throw new Error('no CDP target');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res) => { ws.onopen = res; });
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
    if (d.method === 'Runtime.exceptionThrown') errors.push(JSON.stringify(d.params.exceptionDetails.exception?.description || d.params));
    if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') errors.push(d.params.entry.text);
  };
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await sleep(1500);

  check('title', (await ev('document.title')).includes('Morse Trainer'));
  check('chart cards = 54', (await ev('document.querySelectorAll(".char-card").length')) === 54, await ev('document.querySelectorAll(".char-card").length'));
  check('quiz options = 4', (await ev('document.querySelectorAll("#quizOptions .opt").length')) === 4);
  await ev(`document.getElementById("transInput").value="SOS"; document.getElementById("transInput").dispatchEvent(new Event("input",{bubbles:true}))`);
  check('encode SOS -> ... --- ...', (await ev('document.getElementById("transOutput").value')) === '... --- ...');
  await ev('document.getElementById("modeDecode").click()');
  await ev(`document.getElementById("transInput").value="... --- ..."; document.getElementById("transInput").dispatchEvent(new Event("input",{bubbles:true}))`);
  check('decode ... --- ... -> SOS', (await ev('document.getElementById("transOutput").value')) === 'SOS');
  await ev(`document.getElementById("transInput").value="hello"; document.getElementById("transInput").dispatchEvent(new Event("input",{bubbles:true}))`);
  check('invalid morse shows note', (await ev('document.getElementById("transNote").textContent.length')) > 0);
  await ev('document.getElementById("langBtn").click()');
  const tag = await ev('document.querySelector("[data-i18n=tagline]").textContent');
  check('BN toggle changes tagline', tag.includes('মর্স'), tag);
  check('BN digits on score', (await ev('document.getElementById("quizScore").textContent')) === '০');
  await ev('document.getElementById("langBtn").click()');
  await ev('document.querySelector("#quizOptions .opt").click()');
  check('quiz click disables options', (await ev('[...document.querySelectorAll("#quizOptions .opt")].every(b=>b.disabled)')) === true);
  check('quiz feedback shown', (await ev('document.getElementById("quizFeedback").textContent.length')) > 0);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await sleep(500);
  const sw = await ev('document.documentElement.scrollWidth');
  check('390px no horizontal overflow', sw <= 390, 'scrollWidth=' + sw);
  await send('Emulation.clearDeviceMetricsOverride');
  await sleep(300);
  check('no console/page errors', errors.length === 0, errors.join(' | ').slice(0, 500));
  console.log('SMOKE DONE');
} catch (e) {
  console.error('SMOKE ERROR:', e.message);
  process.exitCode = 1;
} finally {
  try { ws?.close(); } catch {}
  try { if (chrome) chrome.kill('SIGKILL'); } catch {}
}
