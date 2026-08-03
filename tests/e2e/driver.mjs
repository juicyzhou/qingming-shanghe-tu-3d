// E2E 实测驱动：连接 headless Chrome，提供 ev/click/key/wait/check/console 监控
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

export async function launch(url, { width = 1280, height = 800, touch = false, port = 9500 } = {}) {
  mkdirSync('/tmp/cdp-e2e', { recursive: true });
  const args = [
    `--remote-debugging-port=${port}`, '--headless=new', '--no-sandbox',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--run-all-compositor-stages-before-draw', '--disable-gpu',
    `--window-size=${width},${height}`,
    `--user-data-dir=/tmp/cdp-e2e-${port}`,
    'about:blank',
  ];
  if (touch) args.push('--touch-events=enabled');
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args, { stdio: 'ignore' });
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 60; i++) {
    try { await fetch(`http://127.0.0.1:${port}/json/version`); break; } catch { await sleep(200); }
  }
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const ws = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map();
  const errors = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    if (m.method === 'Runtime.exceptionThrown') {
      errors.push((m.params.exceptionDetails?.exception?.description || '').slice(0, 400));
    }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errors.push(m.params.args.map(a => a.value || a.description || '').join(' ').slice(0, 400));
    }
  };
  const send = (method, params = {}) => new Promise(res => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })); });
  const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
  const raw = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result;
  await send('Runtime.enable'); await send('Page.enable');
  if (touch) {
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: true, screenWidth: width, screenHeight: height });
  } else {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  }
  await send('Page.navigate', { url });
  // 等待游戏就绪
  await waitFor(() => ev(`!!window.game && !!window.game.player`), 30000);

  const checks = [];
  const check = (name, pass, extra = '') => {
    checks.push({ name, pass: !!pass, extra });
    console.log(`  ${pass ? '✅' : '❌'} ${name}${extra ? '  → ' + extra : ''}`);
  };
  const click = (sel) => ev(`(() => { const b = document.querySelector('${sel}'); if (!b) return false; b.click(); return true; })()`);
  const keyDown = (code) => ev(`window.dispatchEvent(new KeyboardEvent('keydown',{code:'${code}',key:'${code}'})); 1`);
  const keyUp = (code) => ev(`window.dispatchEvent(new KeyboardEvent('keyup',{code:'${code}'})); 1`);
  const setPos = (x, z) => ev(`window.game.player.px=${x}; window.game.player.pz=${z}; 1`);
  const toast = () => ev(`document.getElementById('toast').textContent`);

  const report = () => {
    const fails = checks.filter(c => !c.pass);
    console.log(`\n==== 结果：${checks.length - fails.length}/${checks.length} 通过，${fails.length} 失败 ====`);
    if (errors.length) {
      console.log(`\n⚠️  控制台错误 ${errors.length} 条:`);
      errors.slice(0, 8).forEach((e, i) => console.log(`  [${i + 1}] ${e}`));
    } else {
      console.log('\n✅ 控制台无错误');
    }
    ws.close(); chrome.kill();
    process.exit(fails.length ? 1 : 0);
  };

  return { ev, raw, send, check, click, keyDown, keyUp, setPos, toast, report, errors, waitFor, wait };
}

export function waitFor(fn, timeout = 20000) {
  return new Promise((res, rej) => {
    const t0 = Date.now();
    const tick = async () => {
      try { if (await fn()) return res(true); } catch {}
      if (Date.now() - t0 > timeout) return res(false);
      setTimeout(tick, 150);
    };
    tick();
  });
}

export const wait = (ms) => new Promise(r => setTimeout(r, ms));
