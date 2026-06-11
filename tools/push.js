#!/usr/bin/env node
// Build plugin.js + plugin.json and hot-push to Thymer via window.refreshPlugin (CDP).
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

async function evaluate(expr) {
  const targets = await fetch('http://localhost:9222/json').then(r => r.json());
  const page = targets.find(t => t.type === 'page' && t.url.includes('thymer.com'));
  if (!page) throw new Error('No Thymer page target found');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  const result = await new Promise((res, rej) => {
    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id === 1) res(data.result);
    };
    ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, awaitPromise: true } }));
    setTimeout(() => rej(new Error('timeout')), 15000);
  });
  ws.close();
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}

async function main() {
  const src = fs.readFileSync(path.join(ROOT, 'plugin.js'), 'utf8');
  const json = fs.readFileSync(path.join(ROOT, 'plugin.json'), 'utf8');
  JSON.parse(json); // validate

  // Same shape as the SDK's esbuild output: IIFE exposing globalThis.plugins.Plugin
  const code = 'var plugins = (() => {\n'
    + src.replace(/^export\s+class\s+Plugin/m, 'class Plugin')
    + '\nreturn { Plugin };\n})();\n//# sourceURL=thymer-plugin.js';

  const expr = `window.refreshPlugin(${JSON.stringify(code)}, ${JSON.stringify(json)})`;
  const res = await evaluate(expr);
  console.log(JSON.stringify(res));
  if (!res || !res.success) process.exit(2);
}

main().catch(e => { console.error(e.message); process.exit(1); });
