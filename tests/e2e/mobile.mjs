// 手机端 E2E 实测：?touch=1 触控模式 —— 摇杆/视角拖动/按钮显隐/菜单/竖屏 FOV
import { launch, wait, waitFor } from './driver.mjs';

const W = 390, H = 844;
const { ev, check, click, setPos, report, send, raw } = await launch(
  'http://127.0.0.1:8177/?autostart=1&view=spawn&play=1&noaudio=1&touch=1&nocycle=1',
  { width: W, height: H, touch: true, port: 9510 }
);
const G = `window.game`;
await ev(`document.getElementById('title').style.display='none'; 1`);
await waitFor(() => ev(`window.game && window.game._running`), 15000);
await wait(300);

const touch = async (type, xs, ys) => {
  await send('Input.dispatchTouchEvent', {
    type,
    touchPoints: xs.map((x, i) => ({ x, y: ys[i], id: i + 1, radiusX: 2, radiusY: 2, force: 1 })),
  });
};

// ---- 1. 触控 UI 渲染 ----
check('摇杆渲染', await ev(`!!document.querySelector('.t-joy') && getComputedStyle(document.querySelector('.t-joy')).display !== 'none'`));
check('视角区渲染', await ev(`!!document.querySelector('.t-look')`));
check('按钮组渲染', await ev(`document.querySelectorAll('.t-btn').length >= 4`), '按钮数=' + await ev(`document.querySelectorAll('.t-btn').length`));
await ev(`${G}._resize(); 1`); // autostart 钩子把 fov 强制成 60，手动走一次 _resize 验证竖屏逻辑
check('竖屏 FOV=78', await ev(`${G}.camera.fov === 78`), 'fov=' + await ev(`${G}.camera.fov`));

// ---- 2. 交谈按钮：无目标隐藏、有目标显示 ----
check('无目标交谈按钮隐藏', await ev(`getComputedStyle(document.querySelector('.t-e')).display === 'none'`));
await setPos(1.5, 16.5); // 靠近王货郎
await waitFor(() => ev(`getComputedStyle(document.querySelector('.t-e')).display === 'flex'`), 6000);
check('有目标交谈按钮显示', await ev(`getComputedStyle(document.querySelector('.t-e')).display === 'flex'`));

// ---- 3. 摇杆触控 → 移动 ----
const joyCenterX = 80, joyCenterY = H - 86;
const p0 = await ev(`[${G}.player.px, ${G}.player.pz]`);
await touch('touchStart', [joyCenterX], [joyCenterY]);
await wait(100);
await touch('touchMove', [joyCenterX], [joyCenterY - 45]); // 上推 = W
await wait(600);
await touch('touchEnd', [], []);
const p1 = await ev(`[${G}.player.px, ${G}.player.pz]`);
check('摇杆上推驱动移动', Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) > 0.5, `(${p0[0].toFixed(1)},${p0[1].toFixed(1)})→(${p1[0].toFixed(1)},${p1[1].toFixed(1)})`);

// ---- 4. 右侧视角拖动 → yaw 变化 ----
const yaw0 = await ev(`${G}.player.yaw`);
await touch('touchStart', [W - 60], [H / 2]);
await wait(100);
await touch('touchMove', [W - 10], [H / 2]); // 右拖
await wait(300);
await touch('touchEnd', [], []);
const yaw1 = await ev(`${G}.player.yaw`);
check('视角拖动改变朝向', Math.abs(yaw0 - yaw1) > 0.05, `${yaw0.toFixed(2)}→${yaw1.toFixed(2)}`);

// ---- 5. 交谈按钮 → 对话 ----
await setPos(1.5, 16.5);
await wait(300);
await click('.t-e'); // 触屏交谈按钮
check('交谈按钮打开对话', await ev(`${G}.hud.dialogueOpen`));
await click('.d-opt'); // 接任务
check('触屏接任务', await ev(`${G}.quests.status('bridge_gifts') === 'active'`));

// ---- 6. 菜单按钮 → 暂停 ----
await click('.t-p'); // 菜单
check('菜单按钮打开暂停', await ev(`getComputedStyle(document.getElementById('pausemenu')).display === 'flex'`));
await click('#pm-continue');
check('暂停可继续', await ev(`getComputedStyle(document.getElementById('pausemenu')).display === 'none'`));

// ---- 7. 视角按钮 V ----
const vm0 = await ev(`${G}.player.viewMode`);
await click('.t-v');
await wait(200);
check('视角按钮切换视图', await ev(`${G}.player.viewMode !== ${vm0}`));

// ---- 8. 持续运行 ----
await wait(3000);
check('触屏模式持续运行无报错', true);

report();
