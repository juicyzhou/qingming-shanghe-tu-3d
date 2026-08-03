// 宣传短视频帧序列捕获脚本
// 驱动游戏内自由相机沿脚本化路径飞行，逐帧截图 → 供 ffmpeg 编码为视频。
//
// 用法：
//   node capture-cinematic.mjs [输出目录] [总帧数] [fps] [宽] [高]
//   例：node capture-cinematic.mjs ./frames 180 15 720 1280
//
// 编码成竖版视频（小红书，需本机安装 ffmpeg）：
//   ffmpeg -framerate 15 -i ./frames/f_%04d.png -c:v libx264 -pix_fmt yuv420p -crf 20 shu_xiaoshu.mp4
//
// 说明：帧序列捕获完成后，可在剪辑软件中叠加 BGM / 字幕再导出。

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';

const outdir = process.argv[2] || './frames';
const TOTAL = parseInt(process.argv[3] || '180', 10); // 总帧数（15fps × 12s = 180）
const FPS = parseInt(process.argv[4] || '15', 10);
const W = parseInt(process.argv[5] || '720', 10);
const H = parseInt(process.argv[6] || '1280', 10);
const PORT = 9339;

mkdirSync(outdir, { recursive: true });
mkdirSync('/tmp/cdp-cine', { recursive: true });

// 相机路径：世界坐标 [posX,posY,posZ, targetX,targetY,targetZ]，镜头依次飞过
const WAYPOINTS = [
  [0, 70, 60, 0, 0, -10],      // 高空全景：虹桥/汴河/主街
  [-8, 26, 46, 0, 0, 10],      // 下降掠过桥南
  [14, 12, 30, 0, 3, 24],      // 桥上横越汴河
  [0, 6, 12, 0, 1, -10],       // 街面高度向北推进
  [0, 4, -20, 0, 1, -60],      // 主街穿行（两侧店铺）
  [-22, 8, -50, 0, 2, -70],    // 集市/店面一侧
  [0, 16, -70, 0, 1, -92],     // 朝城门方向
  [0, 70, 60, 0, 0, -10],      // 拉高回到全景
];
const ease = (t) => t * t * (3 - 2 * t); // smoothstep

const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  `--remote-debugging-port=${PORT}`, '--headless=new', '--no-sandbox', '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader', '--run-all-compositor-stages-before-draw', '--disable-gpu',
  `--window-size=${W},${H}`, '--hide-scrollbars', `--user-data-dir=/tmp/cdp-cine`, 'about:blank',
], { stdio: 'ignore' });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  for (let i = 0; i < 60; i++) { try { await fetch(`http://127.0.0.1:${PORT}/json/version`); break; } catch { await sleep(200); } }
  const pages = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const ws = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map();
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}) => new Promise(res => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })); });
  const evalJS = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result?.result?.value;

  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', {
    url: `http://127.0.0.1:8177/?autostart=1&noaudio=1&cinematic=1&view=aerial`,
  });
  await sleep(6500); // 世界构建 + 首帧
  await evalJS(`document.getElementById('hud').style.display='none'; 1`);
  await sleep(600);

  const seg = TOTAL / (WAYPOINTS.length - 1);
  for (let f = 0; f < TOTAL; f++) {
    const s = Math.min(f / seg, WAYPOINTS.length - 1.001);
    const i0 = Math.floor(s), i1 = i0 + 1;
    const t = ease(s - i0);
    const a = WAYPOINTS[i0], b = WAYPOINTS[i1];
    const px = a[0] + (b[0] - a[0]) * t, py = a[1] + (b[1] - a[1]) * t, pz = a[2] + (b[2] - a[2]) * t;
    const tx = a[3] + (b[3] - a[3]) * t, ty = a[4] + (b[4] - a[4]) * t, tz = a[5] + (b[5] - a[5]) * t;
    await evalJS(`const c=window.game.camera; c.position.set(${px},${py},${pz}); c.lookAt(${tx},${ty},${tz}); c.updateMatrixWorld(true); 1`);
    await sleep(1000 / FPS * 0.5); // 让渲染推进
    const { result } = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`${outdir}/f_${String(f).padStart(4, '0')}.png`, Buffer.from(result.data, 'base64'));
    if (f % 20 === 0) console.log(`frame ${f}/${TOTAL}`);
  }
  console.log(`DONE ${TOTAL} 帧 → ${outdir}（可用 ffmpeg 编码，见 promo/README.md）`);
  ws.close(); chrome.kill();
}
main().catch((e) => { console.error('ERR', e.message); chrome.kill(); });
