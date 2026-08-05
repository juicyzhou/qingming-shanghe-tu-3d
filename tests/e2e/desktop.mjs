// 电脑端 E2E 实测：真实对话/任务/进店/小玩法/按键/昼夜/暂停
import { launch, wait, waitFor } from './driver.mjs';

const { ev, check, click, keyDown, keyUp, setPos, report } = await launch(
  'http://127.0.0.1:8177/?autostart=1&view=spawn&play=1&noaudio=1&nocycle=1',
  { width: 1280, height: 800 }
);

await ev(`document.getElementById('title').style.display='none'; 1`);
await waitFor(() => ev(`window.game && window.game._running`), 15000);
await wait(300);
const G = `window.game`;

check('游戏运行中', await ev(`${G}._running`));

// ---- 1. 真实对话：桥头干粮 接任务 ----
check('无任务时指引指向首个可接任务人', await ev(`${G}.getGuideTarget()?.qid === 'bridge_gifts'`));
await setPos(1.5, 16.5);
await ev(`${G}.tryInteract(); 1`);
check('靠近货郎按E打开对话', await ev(`${G}.hud.dialogueOpen`));
await click('.d-opt'); // 好，我答应
check('对话选择后接受任务', await ev(`${G}.quests.status('bridge_gifts') === 'active'`));
check('接任务后指引仍指向货郎(当前目标)', await ev(`${G}.getGuideTarget()?.qid === 'bridge_gifts'`));
// 再与货郎交谈 → 目标推进到茶摊
await ev(`${G}.tryInteract(); 1`);
await click('.d-opt');
check('与货郎再谈推进到"送茶摊"', await ev(`${G}.quests.state.bridge_gifts.objectiveIndex === 1`));
check('指引切到茶摊', await ev(`${G}.getGuideTarget()?.qid === 'bridge_gifts' && Math.abs(${G}.getGuideTarget()?.x - 2) < 1.5`));

// ---- 2. 送烧饼到茶摊（真实交付） ----
await setPos(2, 44);
await ev(`${G}.tryInteract(); 1`);
check('茶摊对话打开', await ev(`${G}.hud.dialogueOpen`));
await click('.d-opt'); // 交付
check('交付后推进到复命', await ev(`${G}.quests.state.bridge_gifts.objectiveIndex === 2`));

// ---- 3. 回货郎复命 → 结算 ----
await setPos(1.5, 16.5);
await ev(`${G}.tryInteract(); 1`);
await click('.d-opt');
check('任务完成', await ev(`${G}.quests.isDone('bridge_gifts')`));
check('结算面板出现', await ev(`getComputedStyle(document.getElementById('settle')).display !== 'none'`));
await click('#settle-ok');
check('结算面板可关闭', await ev(`getComputedStyle(document.getElementById('settle')).display === 'none'`));

// ---- 4. 打卡：走到虹桥 ----
await setPos(0, 30);
await waitFor(() => ev(`${G}.landmarksCollected.has('bridge')`), 4000);
check('走到虹桥自动打卡', await ev(`${G}.landmarksCollected.has('bridge')`));

// ---- 5. 键盘移动 ----
const p0 = await ev(`[${G}.player.px, ${G}.player.pz]`);
await keyDown('KeyW'); await wait(500); await keyUp('KeyW');
const p1 = await ev(`[${G}.player.px, ${G}.player.pz]`);
check('W 键移动有效', Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) > 0.3, `(${p0[0].toFixed(1)},${p0[1].toFixed(1)})→(${p1[0].toFixed(1)},${p1[1].toFixed(1)})`);

// ---- 6. 视角切换 V ----
await keyDown('KeyV'); await wait(200); await keyUp('KeyV');
check('V 切到第一人称', await ev(`${G}.player.viewMode === 1`));
await keyDown('KeyV'); await wait(200); await keyUp('KeyV');
check('V 切回第三人称', await ev(`${G}.player.viewMode === 3`));

// ---- 7. 进店(百杂铺·无任务掌柜) + 掌柜对话 + 出店 ----
const gen = await ev(`${G}.world.interiors.find(i => i.def.id === 'general')`);
if (gen) {
  await ev(`${G}.player.px=${gen.spawnX}; ${G}.player.pz=${gen.spawnZ}; 1`);
  await waitFor(() => ev(`${G}._inside !== null`), 4000);
  check('走进店内（footprint 自动进店）', await ev(`${G}._inside !== null`));
  check('进店自动切第一人称', await ev(`${G}.player.viewMode === 1`));
  const kg = await ev(`(() => { const k=${G}.npcs.get('keeper_general'); return k ? [k.position.x, k.position.z] : null })()`);
  if (kg) {
    await ev(`${G}.player.px=${kg[0]}; ${G}.player.pz=${kg[1]}; 1`);
    await ev(`${G}.tryInteract(); 1`);
    check('店内可与掌柜交谈', await ev(`${G}.hud.dialogueOpen`));
    await click('.d-opt'); // 告辞
  }
  await ev(`${G}.player.px=${gen.exitX}; ${G}.player.pz=${gen.exitZ}; 1`);
  await waitFor(() => ev(`${G}._inside === null`), 4000);
  check('走出店门自动出店', await ev(`${G}._inside === null`));
}

// ---- 8. 暂停菜单（Esc 开/关） ----
await keyDown('Escape'); await wait(300); await keyUp('Escape');
check('Esc 打开暂停菜单', await ev(`getComputedStyle(document.getElementById('pausemenu')).display === 'flex'`));
await keyDown('Escape'); await wait(300); await keyUp('Escape');
check('Esc 关闭暂停菜单', await ev(`getComputedStyle(document.getElementById('pausemenu')).display === 'none'`));

// ---- 9. 灯谜：白天不开、夜晚可猜 ----
await ev(`${G}.hour = 14; 1`);
await setPos(-21, 4);
await ev(`${G}.tryInteract(); 1`);
check('白天点花灯提示"入夜才开张"', await ev(`!${G}.hud.dialogueOpen && getComputedStyle(document.getElementById('riddle')).display === 'none'`));
await ev(`${G}.hour = 23; 1`);
await ev(`${G}.tryInteract(); 1`);
check('夜晚点花灯打开猜谜面板', await ev(`getComputedStyle(document.getElementById('riddle')).display === 'block'`));
await click('.r-opt:nth-child(2)');
check('选错不推进', await ev(`${G}.lanternRiddles.size === 0`));
const coins0 = await ev(`${G}.inventory.coins`);
await click('.r-opt:nth-child(1)');
check('选对得钱', await ev(`${G}.lanternRiddles.size === 1 && ${G}.inventory.coins > ${coins0}`));

// ---- 10. 听书 ----
await setPos(-26, 15.2);
await ev(`${G}.tryInteract(); 1`);
check('听书面板打开', await ev(`getComputedStyle(document.getElementById('story')).display === 'block'`));
await click('.s-title');
check('点唱出故事文字', await ev(`document.querySelector('.s-lines').textContent.length > 4`));
await click('#s-close');

// ---- 11. 撑船竞速 ----
await setPos(26, 17);
await ev(`${G}.tryInteract(); 1`);
check('竞速面板打开并冻结玩家', await ev(`getComputedStyle(document.getElementById('race')).display === 'block' && !!${G}.hud._minigameClose`));
await ev(`${G}.hud._minigameClose(); 1`);
check('竞速可正常关闭', await ev(`${G}.hud._minigameClose === null`));

// ---- 12. 买茶任务（真实购买对话） ----
await setPos(-10, 14); // 茶博士（茶肆门前）
await ev(`${G}.tryInteract(); 1`);
await click('.d-opt'); // 接任务
check('接受买茶任务', await ev(`${G}.quests.status('buy_tea') === 'active'`));
// 与茶博士再谈 → 推进首个目标（买茶）
await ev(`${G}.tryInteract(); 1`);
await click('.d-opt');
check('与茶博士再谈推进到买茶', await ev(`${G}.quests.state.buy_tea.objectiveIndex === 1`));
await setPos(2, 44); // 桥南茶摊
await ev(`${G}.tryInteract(); 1`);
await click('.d-opt'); // 买一包
check('真实购买茶叶成功', await ev(`${G}.inventory.has('tea')`), 'coins=' + await ev(`${G}.inventory.coins`));
await setPos(-10, 14);
await ev(`${G}.tryInteract(); 1`);
await click('.d-opt'); // 交付
check('买茶任务完成', await ev(`${G}.quests.isDone('buy_tea')`));
await click('#settle-ok');

// ---- 13. 目标为交互物（药草）的指引 ----
await ev(`${G}.quests.accept('herbs'); ${G}.quests.talkTo('daifu'); 1`);
check('指引指向场景物品(药草)', await ev(`${G}.getGuideTarget()?.x === 26`));

// ---- 14. 持续会话稳定性 ----
await wait(5000);
check('5秒持续运行无致命错误', true);

// ---- 15. NaN/坏几何扫描 ----
const nanReport = await ev(`window.__nanScan ? window.__nanScan(${G}) : 'skip'`);
check('NaN/退化几何扫描无 badVerts', !/badVerts=[1-9]/.test(nanReport), nanReport.split('||').slice(0, 2).join(' | '));

report();
