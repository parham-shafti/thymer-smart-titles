#!/usr/bin/env node
// Evaluate JS in Thymer's Electron window via Chrome DevTools Protocol.
// Usage: node cdp.js 'expression'   or   node cdp.js -f script.js
const fs = require('fs');

async function main() {
  let expr = process.argv[2] === '-f' ? fs.readFileSync(process.argv[3], 'utf8') : process.argv[2];
  if (!expr) { console.error('usage: cdp.js <expr> | -f <file>'); process.exit(1); }

  const targets = await fetch('http://localhost:9222/json').then(r => r.json());
  const page = targets.find(t => t.type === 'page' && t.url.includes('thymer.com'));
  if (!page) { console.error('No Thymer page target found'); process.exit(1); }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  const result = await new Promise((res, rej) => {
    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id === 1) res(data.result);
    };
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: { expression: expr, returnByValue: true, awaitPromise: true },
    }));
    setTimeout(() => rej(new Error('timeout')), 15000);
  });

  ws.close();
  if (result.exceptionDetails) {
    console.error('EXCEPTION:', JSON.stringify(result.exceptionDetails, null, 2));
    process.exit(2);
  }
  const v = result.result.value;
  console.log(typeof v === 'string' ? v : JSON.stringify(v, null, 2));
}

main().catch(e => { console.error(e.message); process.exit(1); });
