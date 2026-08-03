import * as THREE from 'three';
import { Game } from './core/Game.js';
import { collides } from './world/layout.js';
import { LANTERN_RIDDLES } from './data/minigames.js';
import { WATER_UNIFORMS } from './render/shaders.js';

// P3-3 微信内置浏览器检测（诊断/兼容分支用）
window.__inWeChat = /MicroMessenger/i.test(navigator.userAgent);
if (window.__inWeChat) console.log('[qmsht] 微信内置浏览器模式');

// P3-4 埋点：控制台直接读取指标（供测试/巡检）
window.__analytics = () => (window.game ? window.game.analytics.metrics() : null);

window.__loadProgress?.(25, '正在装裱画卷…');

// URL 调试参数（须在 Game 构建前就绪，供 ?analytics=1 等提前分支使用）
const TEST_PARAMS = new URLSearchParams(location.search);

// P0-4 WebGL 兼容检测：不支持时显示友好提示页（替代白屏）
function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

function showWebGLFallback() {
  window.__loadProgress?.(100);
  document.getElementById('glfallback').style.display = 'flex';
}

const app = document.getElementById('app');
if (!webglAvailable()) {
  showWebGLFallback();
} else {
  try {
    window.__loadProgress?.(50, '正在唤起汴京…');
    window.game = new Game(app);
    // P3-4 体验数据面板（?analytics=1 打开）
    if (TEST_PARAMS.get('analytics') === '1') window.game.hud.showAnalytics(window.game);
    window.__loadProgress?.(100, '长卷展开，万事俱备…');
  } catch (err) {
    console.error('[qmsht] 初始化失败:', err);
    showWebGLFallback();
  }
}

// 自动启动（测试用）：?autostart=1 直接进入游戏
if (TEST_PARAMS.get('autostart') === '1') {
  setTimeout(() => {
    const g = window.game;
    if (TEST_PARAMS.get('selftest') === '1') {
      g.start();
      const div = document.createElement('div');
      div.id = 'probe-report';
      div.textContent = window.__selftest(g);
      document.body.appendChild(div);
      g._running = false; // 自测无需持续渲染
      return;
    }
    if (TEST_PARAMS.get('qa') === '1') {
      g.start();
      const div = document.createElement('div');
      div.id = 'probe-report';
      div.textContent = window.__qa(g);
      document.body.appendChild(div);
      g._running = false;
      return;
    }
    if (TEST_PARAMS.get('repro') === '1') {
      g.start();
      const div = document.createElement('div');
      div.id = 'probe-report';
      div.textContent = window.__repro(g);
      document.body.appendChild(div);
      g._running = false;
      return;
    }
    if (TEST_PARAMS.get('nan') === '1') {
      g.start();
      const div = document.createElement('div');
      div.id = 'probe-report';
      div.textContent = window.__nanScan(g);
      document.body.appendChild(div);
      g._running = false;
      return;
    }
    if (TEST_PARAMS.get('features') === '1') {
      g.start();
      const div = document.createElement('div');
      div.id = 'probe-report';
      div.textContent = window.__features(g);
      document.body.appendChild(div);
      g._running = false;
      return;
    }
    // 先设自由相机，再启动 → 首帧即目标取景（截图/探针用）
    const view = TEST_PARAMS.get('view') || 'aerial';
    if (TEST_PARAMS.get('t')) g._t = parseFloat(TEST_PARAMS.get('t')); // 设定动画相位
    if (view === 'spawn') {
      g.player._freeCam = false;               // 默认出生视角（第三人称）
      g.player.px = 0; g.player.pz = -18;
      g.player.yaw = Math.PI; g.player.pitch = -0.12;
    } else {
      g.player._freeCam = true;
      g.player.px = 0; g.player.pz = 30;
    }
    if (view === 'street') {
      g.player.px = -18; g.player.pz = 10;            // 集市街头
      g.camera.position.set(-18, 3.2, 4);
      g.camera.lookAt(0, 1.2, 12);
    } else if (view === 'street2') {
      g.player.px = 0; g.player.pz = -22;             // 主街纵览：店铺两侧+街上行人
      g.camera.position.set(0, 3.6, -30);
      g.camera.lookAt(0, 1.4, -68);
    } else if (view === 'street3') {
      g.player.px = 0; g.player.pz = -46;             // 斜向主街：两侧店铺 + 行人
      g.camera.position.set(2.5, 3.0, -44);
      g.camera.lookAt(-8, 1.6, -58);
    } else if (view === 'bridge') {
      g.player.px = 0; g.player.pz = 30;              // 桥上俯瞰河流/船只
      g.camera.position.set(8, 7.5, 36);
      g.camera.lookAt(-14, 1, 20);
    } else if (view === 'shop') {
      g.player.px = 0; g.player.pz = -55;             // 近看店铺立面
      g.camera.position.set(3.2, 2.6, -60);
      g.camera.lookAt(-11, 2.6, -68);
    } else if (view === 'interior') {
      const idx = Math.min(parseInt(TEST_PARAMS.get('idx') || '0', 10) || 0, g.world.interiors.length - 1);
      const int0 = g.world.interiors[idx];
      g._enterInterior(int0);
      if (TEST_PARAMS.get('fp') === '1') {
        g.player._freeCam = false;               // 真实第一人称
        g.player.px = int0.spawnX; g.player.pz = int0.spawnZ;
        g.player.yaw = (int0.def.x > 0 ? 1 : -1) * Math.PI / 2; // 面向店内
        g.player.pitch = -0.05;
      }
      g.player.px = int0.spawnX; g.player.pz = int0.spawnZ;
      const ilook = TEST_PARAMS.get('look') || 'back';
      const ix = int0.def.x, iz = int0.def.z;
      if (ilook === 'up') {
        g.camera.position.set(ix, 1.2, iz);
        g.camera.lookAt(ix, 3.5, iz);              // 仰视天花板
      } else if (ilook === 'corner') {
        g.camera.position.set(ix - 2, 1.2, iz + 2);
        g.camera.lookAt(ix + 4, 1.5, iz - 4);      // 看角落
      } else {
        g.camera.position.set(ix - 0.5, 1.5, iz);
        g.camera.lookAt(ix - int0.def.w / 2, 1.5, iz); // 看背墙
      }
    } else {
      g.camera.position.set(0, 82, 58);               // 鸟瞰全景
      g.camera.lookAt(0, 0, -12);
    }
    g.camera.fov = 60; g.camera.updateProjectionMatrix();
    // E2E 实测：?play=1 以正常玩家控制持续运行（不被 40 帧测试截停）
    if (TEST_PARAMS.get('play') === '1') {
      g.start();
      return;
    }
    // P3-2 宣传视频：?cinematic=1 保持循环运行（不被 40 帧测试截停），相机由外部脚本驱动
    if (TEST_PARAMS.get('cinematic') === '1') {
      g.player._freeCam = true;
      g.start();
      return;
    }
    const orig = g._loop.bind(g);
    let frames = 0;
    g._loop = () => {
      frames++;
      if (frames > 40) { g._running = false; return; }
      orig();
      if (frames === 40) {
        const div = document.createElement('div');
        div.id = 'probe-report';
        div.textContent = window.__probe(g);
        document.body.appendChild(div);
      }
    };
    g.start();
  }, 400);
}

window.__features = (g) => {
  // P0-1 任务指引 / P0-2 开场引导 / P0-3 暂停 / P1-1 成就分享卡
  const out = [];
  // 1) 无进行中任务 → 指向第一个可接任务的发放人（王货郎）
  const t0 = g.getGuideTarget();
  out.push('guide0=' + (t0 && t0.title === '桥头干粮' ? 'huolang' : 'FAIL:' + (t0 && t0.title)));
  // 2) 接任务后 → 指向当前目标（王货郎）
  g.quests.accept('bridge_gifts');
  const t1 = g.getGuideTarget();
  out.push('guide1=' + (t1 && t1.qid === 'bridge_gifts' && t1.title === '桥头干粮' ? 'ok' : 'FAIL'));
  // 3) 目标推进后指向茶摊（NPC 目标切换）
  g.quests.talkTo('huolang');
  const t2 = g.getGuideTarget();
  out.push('guide2=' + (t2 && t2.qid === 'bridge_gifts' && g.quests.state.bridge_gifts.objectiveIndex === 1 ? 'ok' : 'FAIL'));
  // 完成 bridge_gifts，避免其仍占据"第一个进行中任务"
  g.quests.talkTo('tea_stand'); g.quests.talkTo('huolang');
  // 4) 目标为场景交互物（药草）→ 有坐标
  g.quests.accept('herbs'); g.quests.talkTo('daifu');
  const t3 = g.getGuideTarget();
  out.push('guide3=' + (t3 && Math.hypot(t3.x - 9.5, t3.z - 18.6) < 3 ? 'herb' : 'FAIL'));
  // 5) 指引箭头渲染
  g.hud.updateGuide(g);
  const arrowOn = g.hud.cache.gArrow.style.display === 'flex' || g.hud.cache.gArrow.style.display === 'block';
  const tagTxt = g.hud.cache.gTag.textContent;
  out.push('arrow=' + arrowOn + ' tag=' + (tagTxt && tagTxt.includes('m') ? 'dist' : 'FAIL'));
  // 6) P0-3 暂停开关 + 菜单显示
  g.togglePause();
  const pauseOn = g._paused === true && g.hud.cache.pausemenu.style.display === 'flex';
  g.togglePause();
  const pauseOff = g._paused === false && g.hud.cache.pausemenu.style.display === 'none';
  out.push('pause=' + pauseOn + '/' + pauseOff);
  // 7) P0-2 开场引导渲染
  let introDone = false;
  g.hud.showIntro(g, () => { introDone = true; });
  const introShown = g.hud.cache.intro.style.display === 'flex' && !!document.getElementById('intro-next');
  // 点到底（触发 onDone）
  let guard = 0;
  while (document.getElementById('intro-next') && guard++ < 10) {
    document.getElementById('intro-next').click();
  }
  out.push('intro=' + introShown + ' done=' + introDone);
  // 8) P1-1 成就分享卡渲染（生成 PNG + 可下载按钮）
  g.hud.showAchievement(g);
  const img = g.hud.cache.achieve.querySelector('img');
  const dlBtn = g.hud.cache.achieve.querySelector('#ach-dl');
  out.push('achieve=' + (img && img.src.startsWith('data:image/png') ? 'png' : 'FAIL') + ' dl=' + !!dlBtn);
  g.hud.cache.achieve.style.display = 'none';
  return out.join(' | ');
};

window.__selftest = (g) => {
  const out = [];
  const Q = g.quests, I = g.inventory;
  // 1) 桥头干粮：接→送茶摊→复命
  Q.accept('bridge_gifts');
  out.push('accept=' + Q.status('bridge_gifts') + ' mantou=' + I.has('mantou'));
  Q.talkTo('huolang');
  out.push('s1=' + Q.state.bridge_gifts.objectiveIndex);
  Q.talkTo('tea_stand');
  out.push('s2=' + Q.state.bridge_gifts.objectiveIndex);
  Q.talkTo('huolang');
  out.push('giftDone=' + Q.isDone('bridge_gifts') + ' coins=' + I.coins);
  // 2) 买茶：接→买→送回
  I.coins = 100;
  Q.accept('buy_tea');
  Q.talkTo('cha_bo');
  out.push('t1=' + Q.state.buy_tea.objectiveIndex);
  Q.buy('tea', 30);
  out.push('teaBought=' + I.has('tea') + ' coins=' + I.coins);
  Q.talkTo('cha_bo');
  out.push('teaDone=' + Q.isDone('buy_tea'));
  // 3) 招客：接→招3客→复命
  Q.accept('attract_customers');
  Q.talkTo('tangren');
  Q.attract('n1'); Q.attract('n2'); Q.attract('n3');
  out.push('attractObj=' + Q.state.attract_customers.objectiveIndex);
  Q.talkTo('tangren');
  out.push('attractDone=' + Q.isDone('attract_customers'));
  // 4) 药草：接→采→送回
  Q.accept('herbs');
  Q.talkTo('daifu');
  Q.interact('herb');
  out.push('herb=' + I.has('herb'));
  Q.talkTo('daifu');
  out.push('herbDone=' + Q.isDone('herbs'));
  // 5) 撑船：接→玩法→复命
  Q.accept('boat_pole');
  Q.talkTo('chuanfu');
  Q.minigameComplete('boat_pole');
  out.push('boatObj=' + Q.state.boat_pole.objectiveIndex);
  Q.talkTo('chuanfu');
  out.push('boatDone=' + Q.isDone('boat_pole'));
  // 6) 传话：接→送守将→复命
  Q.accept('gate_message');
  Q.talkTo('yayi');
  out.push('doc=' + I.has('document'));
  Q.talkTo('shoujiang');
  out.push('gateObj=' + Q.state.gate_message.objectiveIndex);
  Q.talkTo('yayi');
  out.push('gateDone=' + Q.isDone('gate_message'));
  // 7) 寻说书人：接→寻人(回家)→复命
  Q.accept('find_storyteller');
  Q.talkTo('tangren');
  Q.talkTo('shuoshuren');
  const st = g.npcs.get('shuoshuren');
  out.push('storyObj=' + Q.state.find_storyteller.objectiveIndex + ' moved=' + (st.position.z < 16).toString());
  Q.talkTo('tangren');
  out.push('storyDone=' + Q.isDone('find_storyteller'));
  // 8) 送布：接→取布→送回
  Q.accept('deliver_cloth');
  Q.talkTo('buzhuang');
  Q.interact('cloth_bundle');
  out.push('cloth=' + I.has('cloth'));
  Q.talkTo('buzhuang');
  out.push('clothDone=' + Q.isDone('deliver_cloth'));
  // 9) P2-4 新增任务：客栈添柴 / 醉仙楼送酒 / 米铺送粮
  Q.accept('inn_wood');
  Q.talkTo('keeper_inn');
  Q.interact('wood');
  out.push('wood=' + I.has('wood'));
  Q.talkTo('keeper_inn');
  out.push('innWood=' + Q.isDone('inn_wood'));
  Q.accept('tavern_wine');
  Q.talkTo('keeper_tavern');
  Q.interact('wine_jar');
  Q.talkTo('chuanfu');
  Q.talkTo('keeper_tavern');
  out.push('tavernWine=' + Q.isDone('tavern_wine'));
  Q.accept('rice_deliver');
  Q.talkTo('keeper_rice');
  Q.interact('rice_sack');
  Q.talkTo('keeper_inn');
  Q.talkTo('keeper_rice');
  out.push('riceDeliver=' + Q.isDone('rice_deliver'));
  // 10) P2-4 猜谜：选错不推进、选对推进、复命完成
  Q.accept('riddle');
  Q.talkTo('suanming');
  const wrongStuck = !Q.riddleAnswer('riddle', 2) && Q.status('riddle') === 'active' && Q.state.riddle.objectiveIndex === 1;
  const rightAdvance = Q.riddleAnswer('riddle', 0) && Q.state.riddle.objectiveIndex === 2;
  Q.talkTo('suanming');
  out.push('riddle=' + (wrongStuck && rightAdvance && Q.isDone('riddle') ? 'ok' : 'FAIL'));
  // 11) P2-4 说书人长线：取稿→交稿→送信→复命
  Q.accept('storyteller_script');
  Q.talkTo('shuoshuren');
  Q.interact('script');
  Q.talkTo('shuoshuren');
  Q.talkTo('shoujiang');
  Q.talkTo('shuoshuren');
  out.push('storyScript=' + Q.isDone('storyteller_script'));
  out.push('SUMMARY done=' + Q.stats.completed + '/' + Object.keys(Q.state).length + ' coins=' + I.coins + ' rep=' + Q.stats.reputation);
  // 12) P2-3 打卡：走到虹桥自动盖章
  g.landmarksCollected.clear();
  g.player.px = 0; g.player.pz = 30;
  g._updateLandmarks();
  const lmBridge = g.landmarksCollected.has('bridge');
  const lmCount = g.landmarksCollected.size;
  out.push('landmark=' + (lmBridge && lmCount === 1 ? 'ok' : `FAIL(${lmCount})`));
  // 13) P2-2 作息：夜因子 深夜≈1、午后≈0；时辰映射
  const nfNight = g._nightFactor();
  g.hour = 22; const nf22 = g._nightFactor();
  g.hour = 14; const nf14 = g._nightFactor();
  out.push(`night=${nf22 > 0.9 ? 'on' : 'FAIL(' + nf22.toFixed(2) + ')'} day=${nf14 < 0.1 ? 'off' : 'FAIL(' + nf14.toFixed(2) + ')'} (${nfNight.toFixed(2)})`);
  // 14) P2-1 小玩法：场景物 / 灯谜昼夜门控+奖励 / 听书 / 竞速
  const hasIt = ['lantern', 'storybooth', 'raceboat'].every(id => g.world.interactables.some(i => i.id === id));
  g.hour = 14; const lampDay = g._nightFactor() < 0.5;
  g.hour = 23; const lampNight = g._nightFactor() > 0.5;
  g.lanternRiddles.clear();
  const c0 = I.coins;
  const ans1 = g.answerLanternRiddle(0);
  const ansDup = g.answerLanternRiddle(0);
  out.push('mini-it=' + (hasIt ? 'ok' : 'FAIL'));
  out.push('lantern=' + (lampDay && lampNight && ans1 && !ansDup && I.coins === c0 + 25 ? 'ok' : `FAIL(${lampDay}/${lampNight}/${ans1}/${ansDup}/${I.coins - c0})`));
  for (let i = 1; i < LANTERN_RIDDLES.length; i++) g.answerLanternRiddle(i);
  out.push('lanternAll=' + (g.lanternRiddles.size === LANTERN_RIDDLES.length ? 'ok' : 'FAIL'));
  const rep0 = g.quests.stats.reputation;
  g.inventory.coins = 100;
  const tipOk = g.storyReward('tip');
  g.inventory.coins = 0;
  const tipPoor = g.storyReward('tip');
  const applaudOk = g.storyReward('applaud');
  out.push('story=' + (tipOk && !tipPoor && applaudOk && g.quests.stats.reputation === rep0 + 15 ? 'ok' : `FAIL(${tipOk}/${tipPoor}/${applaudOk}/${g.quests.stats.reputation - rep0})`));
  g.inventory.coins = 100;
  const c1 = I.coins;
  g.finishRace(true);
  g.finishRace(false);
  out.push('race=' + (I.coins === c1 + 40 ? 'ok' : `FAIL(${I.coins - c1})`));
  // 15) P2-5 天气：雨/雪/晴平滑过渡 + 水面光斑联动
  g.weather.nextChange = 1e9; // 禁用自动换天，保证确定性
  g.hour = 14;                // 保证白天测光斑（此前测试把时辰留在 23）
  g.weather.set('rain');
  for (let i = 0; i < 40; i++) g.weather.update(0.5, 14, i * 0.5); // 20s 虚拟推进
  g._syncWeather();
  const rainOk = g.weather.raininess > 0.9;
  const sparkleRain = WATER_UNIFORMS.uSparkle.value; // 雨天光斑应减弱
  g.weather.set('snow');
  for (let i = 0; i < 40; i++) g.weather.update(0.5, 14, i * 0.5);
  g._syncWeather();
  const snowOk = g.weather.snowiness > 0.9;
  g.weather.set('clear');
  for (let i = 0; i < 60; i++) g.weather.update(0.5, 14, i * 0.5);
  g._syncWeather();
  const clearOk = g.weather.raininess < 0.1 && g.weather.snowiness < 0.1;
  const sparkleDay = WATER_UNIFORMS.uSparkle.value; // 晴日正午光斑满值
  out.push('weather=' + (rainOk && snowOk && clearOk ? 'ok' : `FAIL(${g.weather.raininess.toFixed(2)}/${g.weather.snowiness.toFixed(2)})`));
  out.push('sparkle=' + (sparkleDay > 0.5 && sparkleRain < sparkleDay ? 'ok' : `FAIL(day=${sparkleDay.toFixed(2)} rain=${sparkleRain.toFixed(2)})`));
  // 16) P3-4 埋点：首任务接受/完成率、会话、停留累计（走真实 accept→完成链路）
  g.analytics.reset();
  g.analytics.begin();
  g.quests.state.bridge_gifts.status = 'available'; // 重置一条任务为可接
  g.quests.state.bridge_gifts.objectiveIndex = 0;
  Q.accept('bridge_gifts');                     // 首任务接受
  Q.talkTo('huolang'); Q.talkTo('tea_stand'); Q.talkTo('huolang'); // 完成首任务
  g.analytics.beat(); g.analytics.end();        // 结束一个会话
  g.analytics.begin();
  const am = g.analytics.metrics();
  out.push('analytics=' + (am.accepted1 === 1 && am.completed1 === 1 && am.questsDone >= 1 && am.sessions === 1 && am.firstQuestRate === '100%'
    ? 'ok' : 'FAIL(' + JSON.stringify(am) + ')'));
  // 场景统计
  let meshes = 0; g.scene.traverse(o => meshes++);
  const npcOk = g.npcList.every(npc => npc.children.length > 8);
  const npcGrounded = g.npcList.slice(0, 5).every(npc => npc.position.y > -0.5 && npc.position.y < 7.2);
  out.push(`STATS npcs=${g.npcList.length} playerChildren=${g.player.children.length} meshes=${meshes} npcOk=${npcOk} grounded=${npcGrounded}`);
  // 步行进出店（footprint 检测）
  const int0 = g.world.interiors[0];
  g.player.px = int0.spawnX; g.player.pz = int0.spawnZ;   // 走到店内
  g.update(0.016);
  const walkIn = g.player.inside === int0 && int0.group.visible === true && int0.exterior.visible === false && g.player.viewMode === 1;
  g.player.px = int0.exitX; g.player.pz = int0.exitZ;     // 走出店门
  g.update(0.016);
  const walkOut = g.player.inside === null && int0.group.visible === false && int0.exterior.visible === true;
  out.push(`INTERIOR walkIn=${walkIn} walkOut=${walkOut} doors=${g.world.interiors.length}`);
  // 门洞可通行、墙体阻挡
  const tFacing = int0.def.x > 0 ? -1 : 1;
  const gapClear = !collides(int0.doorX, int0.doorZ);
  const wallBlock = collides(int0.def.x - tFacing * (int0.def.w / 2) + 0.1, int0.def.z);
  out.push(`COLLIDE gapClear=${gapClear} wallBlock=${wallBlock}`);
  // 对话开关 + 指针锁暂停/恢复（防卡死）
  g.player.px = 1.5; g.player.pz = 16.5; // 站在王货郎旁
  g.input.locked = true;
  g.tryInteract();
  const dlgOpen = g.hud.dialogueOpen;
  const suspend = g.input.suspendLock === true;
  const npcPaused = g._dialogNpc !== null && g._dialogNpc.dialogOpen === true;
  g._closeDialogue();
  const dlgClosed = g.hud.dialogueOpen === false;
  const restore = g.input.suspendLock === false;
  const npcResumed = g._dialogNpc === null;
  out.push(`DIALOG open=${dlgOpen} suspend=${suspend} npcPaused=${npcPaused} closed=${dlgClosed} restore=${restore} npcResumed=${npcResumed}`);
  // 第一人称相机朝向必须等于移动正前方（sin yaw, cos yaw）
  g.player.viewMode = 1; g.player.yaw = 0.5; g.player.pitch = 0;
  g.player.px = 0; g.player.pz = 0;
  g.player.update(0.016, g.input);
  const camFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(g.camera.quaternion);
  const expFwd = new THREE.Vector3(Math.sin(0.5), 0, Math.cos(0.5));
  const fwdAlign = Math.abs(camFwd.x - expFwd.x) < 0.05 && Math.abs(camFwd.z - expFwd.z) < 0.05;
  out.push(`VIEW fwdAlign=${fwdAlign} cam=(${camFwd.x.toFixed(2)},${camFwd.z.toFixed(2)}) exp=(${expFwd.x.toFixed(2)},${expFwd.z.toFixed(2)})`);
  g.player.viewMode = 3;
  return out.join(' | ');
};

window.__nanScan = (g) => {
  const out = [];
  let bad = 0;
  const offenders = [];
  g.scene.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const pos = o.geometry.attributes.position;
    if (!pos) return;
    const arr = pos.array;
    let hasBad = false, minV = 1e9, maxV = -1e9;
    for (let i = 0; i < arr.length; i++) {
      const v = arr[i];
      if (!Number.isFinite(v)) { hasBad = true; break; }
      if (v < minV) minV = v; if (v > maxV) maxV = v;
    }
    // 法线 NaN（退化三角形导致）
    let badNormal = false;
    const nor = o.geometry.attributes.normal;
    if (nor) {
      const na = nor.array;
      for (let i = 0; i < na.length; i++) {
        if (!Number.isFinite(na[i])) { badNormal = true; break; }
      }
    }
    // 退化三角形（顶点重复）
    let degTri = 0;
    if (!o.geometry.index) {
      const stride = 3;
      for (let t = 0; t < pos.count; t += 3) {
        const i0 = t * stride, i1 = i0 + stride, i2 = i1 + stride;
        const a0 = arr[i0], a1 = arr[i0 + 1], a2 = arr[i0 + 2];
        const b0 = arr[i1], b1 = arr[i1 + 1], b2 = arr[i1 + 2];
        const c0 = arr[i2], c1 = arr[i2 + 1], c2 = arr[i2 + 2];
        if ((a0 === b0 && a1 === b1 && a2 === b2) ||
            (a0 === c0 && a1 === c1 && a2 === c2) ||
            (b0 === c0 && b1 === c1 && b2 === c2)) degTri++;
      }
    }
    const chain = (() => { let p = o.parent, ch = ''; while (p && p !== g.scene) { ch = '>' + (p.type) + ch; p = p.parent; } return ch; })();
    if (hasBad) {
      bad++;
      offenders.push(`POS_NAN ${o.geometry.type} chain=${chain}`);
    } else if (badNormal) {
      bad++;
      offenders.push(`NORMAL_NAN ${o.geometry.type} chain=${chain}`);
    } else if (degTri > 0) {
      offenders.push(`DEG_TRI x${degTri} ${o.geometry.type} chain=${chain}`);
    } else if (maxV > 500 || maxV < -500) {
      offenders.push(`HUGE ${o.geometry.type} chain=${chain} maxV=${Math.round(maxV)}`);
    }
  });
  out.push('badVerts=' + bad);
  out.push('offenders=' + (offenders.length ? offenders.join(' ; ') : 'NONE'));
  // matrixWorld / 挂载异常
  const broken = [];
  g.scene.traverse((o) => {
    if (o.isMesh && (!o.matrixWorld || !o.parent)) {
      broken.push(`${o.type} mw=${!!o.matrixWorld} parent=${o.parent ? o.parent.type : 'null'} geo=${o.geometry?.type}`);
    }
  });
  out.push('broken=' + (broken.length ? broken.join(' ; ') : 'NONE'));
  // 也检查材质
  let badMat = 0;
  g.scene.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    if (!m) { badMat++; out.push('noMat:' + (o.parent?.type)); }
    else if (m.uniforms && m.uniforms.uMap && m.uniforms.uMap.value && m.uniforms.uMap.value.image && !(m.uniforms.uMap.value.image instanceof HTMLCanvasElement)) {
      badMat++;
    }
  });
  out.push('noMaterial=' + badMat);
  return out.join(' || ');
};

window.__repro = (g) => {
  const out = [];
  const int = g.world.interiors[0]; // 客栈（第一个室内）
  // 模拟真实走入：从门外走进 → footprint 触发进入
  const facing = int.def.x > 0 ? -1 : 1;
  g.player.px = int.doorX - facing * 0.6;
  g.player.pz = int.doorZ;
  g.player.viewMode = 3;
  g.update(0.016); // 走进门槛 → _updateInteriorTransition 进入
  const entered = g.player.inside === int;
  out.push('entered=' + entered);
  g.player.viewMode = 1;
  // 第一人称环视：多 yaw/pitch 逐帧扫描灰蓝平面
  const scan = (raw) => {
    const sn = document.createElement('canvas');
    sn.width = g.renderer.domElement.width;
    sn.height = g.renderer.domElement.height;
    const c2 = sn.getContext('2d');
    if (raw) { try { g.renderer.render(g.scene, g.camera); } catch {} }
    else { try { g.composer.render(); } catch { g.renderer.render(g.scene, g.camera); } }
    c2.drawImage(g.renderer.domElement, 0, 0);
    const id = c2.getImageData(0, 0, sn.width, sn.height).data;
    const pts = [];
    for (let y = 0; y < sn.height; y += 3) {
      for (let x = 0; x < sn.width; x += 3) {
        const i = (y * sn.width + x) * 4;
        const r = id[i], gg = id[i + 1], b = id[i + 2];
        const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
        if (mx - mn < 45 && 45 < mx && mx < 220 && b >= gg && gg >= r) pts.push([x, y]);
      }
    }
    return { pts, w: sn.width, h: sn.height };
  };
  // 原始 vs 后处理 对比（一次，yaw=0）
  g.player.yaw = 0; g.player.pitch = 0;
  g.player.update(0.016, g.input);
  const rawCnt = scan(true).pts.length;
  const compCnt = scan(false).pts.length;
  out.push(`raw=${rawCnt} comp=${compCnt}`);
  const found = [];
  let maxGB = 0, maxImg = '';
  for (const yaw of [0, 0.6, 1.2, 1.8, 2.4, 3.0, -0.6, -1.2, -1.8, -2.4, 3.2, -3.0]) {
    for (const pitch of [-0.15, 0, 0.2]) {
      g.player.yaw = yaw; g.player.pitch = pitch;
      g.player.update(0.016, g.input);
      const { pts, w: sw, h: sh } = scan(true); // 用原始渲染（无后处理）
      if (pts.length > maxGB) {
        maxGB = pts.length;
        try {
          const sm = document.createElement('canvas');
          sm.width = 520; sm.height = 340;
          const sc = sm.getContext('2d');
          sc.drawImage(g.renderer.domElement, 0, 0, 520, 340);
          maxImg = sm.toDataURL('image/jpeg', 0.85);
        } catch { maxImg = ''; }
      }
      if (pts.length > 20) {
        const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        const x0 = Math.min(...xs), y0 = Math.min(...ys), x1 = Math.max(...xs), y1 = Math.max(...ys);
        // 四角射线检测
        const rayAt = (sx, sy) => {
          try {
            const ndcX = (sx / sw) * 2 - 1, ndcY = -(sy / sh) * 2 + 1;
            const v3 = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(g.camera);
            const dir = v3.sub(g.camera.position).normalize();
            g.scene.updateMatrixWorld(true);
            const rc = new THREE.Raycaster(g.camera.position, dir);
            rc.far = 80;
            const hits = rc.intersectObjects(g.scene.children, true);
            const names = [];
            for (const h of hits.slice(0, 3)) {
              const mat = h.object.material;
              const col = mat && mat.uniforms && mat.uniforms.uColor ? mat.uniforms.uColor.value.getHexString() : (mat?.type || '?');
              const visible = h.object.visible ? '' : '(隐)';
              names.push(col + visible + '@' + h.object.parent?.type);
            }
            return names.join('|') || 'NOHIT';
          } catch (e) { return 'err:' + e.message; }
        };
        const hits = [rayAt(x0, y0), rayAt(x1, y0), rayAt(x0, y1), rayAt(x1, y1)].join(' ');
        found.push(`y${yaw.toFixed(1)}[${x0},${y0}-${x1},${y1}]${hits}`);
      }
    }
  }
  out.push('gb=' + (found.length ? found.length : 'NONE'));
  out.push('REGIONS=' + found.slice(0, 4).join(' ; '));
  out.push('MAXIMG' + maxImg);
  return out.join(' || ');
};

window.__qa = (g) => {
  const out = [];
  // 1) 10 家店铺全部可进/可出
  let okIn = true, okOut = true;
  for (const int of g.world.interiors) {
    g.player.px = int.spawnX; g.player.pz = int.spawnZ;
    g.update(0.016);
    if (g.player.inside !== int) { okIn = false; out.push('enterFail:' + int.def.id); }
    g.player.px = int.exitX; g.player.pz = int.exitZ;
    g.update(0.016);
    if (g.player.inside) { okOut = false; out.push('exitFail:' + int.def.id); }
  }
  out.push('interiorIn=' + okIn + ' out=' + okOut);
  // 2) 出生点无障碍
  out.push('spawnClear=' + !collides(0, -18));
  // 3) NPC 落水检查
  const inWater = g.npcList.filter(n => n.position.z > 23.5 && n.position.z < 36.5).map(n => n.name);
  out.push('npcsInRiver=' + inWater.length + (inWater.length ? ':' + inWater.join(',') : ''));
  // 4) 关键 NPC 所在点可步行
  for (const id of ['cha_bo', 'daifu', 'buzhuang', 'huolang', 'chuanfu', 'yayi', 'shoujiang', 'tangren']) {
    const npc = g.npcs.get(id);
    if (npc) out.push(id + 'Reach=' + (!collides(npc.position.x, npc.position.z)));
  }
  // 5) 关键 NPC 对话开关无异常
  let dlgOk = true;
  for (const id of ['huolang', 'cha_bo', 'daifu', 'buzhuang', 'chuanfu', 'yayi', 'shoujiang', 'tangren', 'tea_stand', 'shuoshuren']) {
    const npc = g.npcs.get(id);
    if (!npc) continue;
    g.player.px = npc.position.x; g.player.pz = npc.position.z;
    try {
      g.tryInteract();
      const open = g.hud.dialogueOpen;
      g._closeDialogue();
      if (!open) dlgOk = false;
    } catch { dlgOk = false; out.push('dlgErr:' + id); }
  }
  out.push('dialogs=' + dlgOk);
  // 6) 第三人称相机朝向=移动正前（等相机平滑收敛）
  g.player.viewMode = 3; g.player.yaw = 1.0; g.player.pitch = 0;
  for (let i = 0; i < 60; i++) g.player.update(0.016, g.input);
  const cam3 = new THREE.Vector3(0, 0, -1).applyQuaternion(g.camera.quaternion);
  const exp3 = new THREE.Vector3(Math.sin(1.0), 0, Math.cos(1.0));
  out.push('cam3Align=' + (Math.abs(cam3.x - exp3.x) < 0.05 && Math.abs(cam3.z - exp3.z) < 0.05));
  // 7) 鼠标右移 → 相机前向应朝「角色右侧 F×U」旋转（右转）
  g.player.viewMode = 3; g.player.yaw = 0.8; g.player.pitch = 0;
  g.player.px = 0; g.player.pz = -18;
  for (let i = 0; i < 40; i++) g.player.update(0.016, g.input);
  const Rvec = new THREE.Vector3(-Math.cos(g.player.yaw), 0, Math.sin(g.player.yaw)); // 角色右侧
  const F0 = new THREE.Vector3(0, 0, -1).applyQuaternion(g.camera.quaternion);
  const d0 = F0.dot(Rvec);
  g.input.mouse.dx = 300; g.input.mouse.dy = 0;
  g.player.update(0.016, g.input);
  const F1 = new THREE.Vector3(0, 0, -1).applyQuaternion(g.camera.quaternion);
  const d1 = F1.dot(Rvec);
  out.push(`lookRight turnRight=${d1 > d0} (dot ${d0.toFixed(2)}→${d1.toFixed(2)})`);
  // 8) 按 D → 玩家应移向屏幕右侧（世界点→屏幕投影 x 增大）
  g.input.mouse.dx = 0; g.player.yaw = Math.PI; g.player.pitch = 0;
  g.player.px = 0; g.player.pz = -18;
  for (let i = 0; i < 40; i++) g.player.update(0.016, g.input);
  const proj0 = new THREE.Vector3(g.player.px, 1, g.player.pz).project(g.camera).x;
  g.input.keys.add('KeyD');
  for (let i = 0; i < 15; i++) g.player.update(0.016, g.input);
  g.input.keys.delete('KeyD');
  const proj1 = new THREE.Vector3(g.player.px, 1, g.player.pz).project(g.camera).x;
  out.push(`strafeScreen right=${proj1 > proj0} (${proj0.toFixed(2)}→${proj1.toFixed(2)})`);
  // 9) 四方向全面检测：W/S=远离/靠近相机，D/A=屏幕右/左
  const moveCheck = (key, yaw) => {
    g.player.viewMode = 3; g.player.yaw = yaw; g.player.pitch = 0;
    g.player.px = 0; g.player.pz = -18;
    for (let i = 0; i < 40; i++) g.player.update(0.016, g.input);
    const d0 = g.camera.position.distanceTo(new THREE.Vector3(g.player.px, 0, g.player.pz));
    const sx0 = new THREE.Vector3(g.player.px, 1, g.player.pz).project(g.camera).x;
    g.input.keys.add(key);
    for (let i = 0; i < 15; i++) g.player.update(0.016, g.input);
    g.input.keys.delete(key);
    const d1 = g.camera.position.distanceTo(new THREE.Vector3(g.player.px, 0, g.player.pz));
    const sx1 = new THREE.Vector3(g.player.px, 1, g.player.pz).project(g.camera).x;
    return [d1 - d0, sx1 - sx0];
  };
  const Wm = moveCheck('KeyW', Math.PI), Sm = moveCheck('KeyS', Math.PI);
  const Dm = moveCheck('KeyD', Math.PI), Am = moveCheck('KeyA', Math.PI);
  out.push(`move4 W:away=${Wm[0] > 0} S:toward=${Sm[0] < 0} D:right=${Dm[1] > 0} A:left=${Am[1] < 0}`);
  // 10) 第一人称：按 W 应沿相机前向移动
  g.player.viewMode = 1; g.player.yaw = 0.3; g.player.pitch = 0;
  g.player.px = 0; g.player.pz = -18;
  g.input.keys.add('KeyW');
  for (let i = 0; i < 15; i++) g.player.update(0.016, g.input);
  g.input.keys.delete('KeyW');
  const camFp = new THREE.Vector3(0, 0, -1).applyQuaternion(g.camera.quaternion);
  const mDir = new THREE.Vector3(g.player.px - 0, 0, g.player.pz - (-18)).normalize(); // 位移方向
  out.push(`fpW align=${Math.abs(camFp.x - mDir.x) < 0.1 && Math.abs(camFp.z - mDir.z) < 0.1}`);
  // 9) 触屏交谈按钮：有目标显示、无目标隐藏
  if (g.touch && g.touch.enabled) {
    g.player.px = 1.5; g.player.pz = 16.5;
    g._updatePrompt();
    const showBtn = g.touch.btnE.style.display === 'flex';
    g.player.px = -60; g.player.pz = 120;
    g._updatePrompt();
    const hideBtn = g.touch.btnE.style.display === 'none';
    out.push(`btnInteract show=${showBtn} hide=${hideBtn}`);
  }
  // 11) 掌柜不与室内家具交叉
  let keeperOk = true;
  for (const int of g.world.interiors) {
    const k = g.npcs.get('keeper_' + int.def.id);
    if (!k) continue;
    for (const f of int.furnitureColliders) {
      if (Math.abs(k.position.x - f.x) < f.hw + 0.3 && Math.abs(k.position.z - f.z) < f.hd + 0.3) {
        keeperOk = false;
        out.push('keeperOverlap:' + int.def.id);
      }
    }
  }
  out.push(`keeperFree=${keeperOk}`);
  return out.join(' | ');
};

window.__probe = (g) => {
  // 采样世界关键坐标点在屏幕上的颜色
  const { renderer, camera } = g;
  const snap = document.createElement('canvas');
  snap.width = renderer.domElement.width;
  snap.height = renderer.domElement.height;
  const ctx = snap.getContext('2d');
  try { g.composer.render(); } catch { try { g.renderer.render(g.scene, g.camera); } catch {} } // 后处理帧
  ctx.drawImage(renderer.domElement, 0, 0);
  const v = new THREE.Vector3();
  const sample = (x, y, z, label) => {
    v.set(x, y, z).project(camera);
    const sx = Math.round((v.x * 0.5 + 0.5) * snap.width);
    const sy = Math.round((-v.y * 0.5 + 0.5) * snap.height);
    if (sx < 0 || sy < 0 || sx >= snap.width || sy >= snap.height) return `${label}:OFFSCREEN`;
    const d = ctx.getImageData(sx, sy, 1, 1).data;
    return `${label}@(${x},${y},${z})=rgb(${d[0]},${d[1]},${d[2]})`;
  };
  const parts = [];
  parts.push(`cam=(${camera.position.x.toFixed(1)},${camera.position.y.toFixed(1)},${camera.position.z.toFixed(1)})`);
  parts.push(`ply=(${g.player.px.toFixed(1)},${g.player.pz.toFixed(1)}) free=${g.player._freeCam}`);
  parts.push('meshes=' + (() => { let n = 0; g.scene.traverse(o => n++); return n; })());
  const worldVis = (o) => { let p = o; while (p) { if (p.visible === false) return false; p = p.parent; } return true; };
  let vm = 0, vt = 0, npcM = 0;
  g.scene.traverse(o => { if (o.isMesh && worldVis(o)) { vm++; vt += (o.geometry.attributes.position ? o.geometry.attributes.position.count : 0); } });
  for (const npc of g.npcList) if (worldVis(npc)) npc.traverse(o => { if (o.isMesh) npcM++; });
  parts.push(`visMeshes=${vm} visTris=${vt} visNpcMeshes=${npcM}`);
  parts.push(sample(20, 0.3, 30, 'river'));
  parts.push(sample(0, 0.05, -40, 'roadN'));
  parts.push(sample(11.5, 6.5, -70, 'roof'));
  parts.push(sample(8.6, 2.5, -70, 'wall'));
  parts.push(sample(0, 6.8, 30, 'bridge'));
  parts.push(sample(-18, 2.0, 6, 'stall'));
  // 店铺立面细节（view=shop 时可见）
  parts.push(sample(-9.0, 2.5, -70, 'clinicWall'));
  parts.push(sample(-11.5, 5.6, -70, 'clinicRoof'));
  parts.push(sample(-6.9, 1.5, -70, 'clinicBanner'));
  parts.push(sample(-11.5, 3.3, -70, 'clinicSign'));
  parts.push(sample(-10.3, 2.6, -70, 'clinicBeam'));
  // 屋内探针（view=interior 时可见）
  parts.push(sample(16.4, 1.5, -70, 'intWall'));
  parts.push(sample(13, 2.9, -69, 'intCeil'));
  parts.push(sample(13, 0.1, -69, 'intFloor'));
  // 门/布幌（view=shop 时可见）
  parts.push(sample(-6.4, 1.2, -70, 'clinicDoor'));
  parts.push(sample(-5.8, 2.1, -73.3, 'clinicBanner2'));
  // 背墙卷轴/墙面定位（view=interior）
  parts.push(sample(16.9, 1.6, -67.75, 'scrollN'));
  parts.push(sample(16.9, 1.6, -72.25, 'scrollS'));
  parts.push(sample(16.9, 1.6, -70, 'wallMid'));
  parts.push(sample(16.9, 2.8, -70, 'wallTop'));
  // 反光检测：统计 >244 亮度像素占比；灰色平面：低饱和、中亮度
  try {
    const idata = ctx.getImageData(0, 0, snap.width, snap.height).data;
    let bright = 0, nn = 0, gray = 0, blueGray = 0;
    let gx0 = 1e9, gy0 = 1e9, gx1 = -1, gy1 = -1;
    const bgPts = [];
    for (let y = 0; y < snap.height; y += 3) {
      for (let x = 0; x < snap.width; x += 3) {
        const i = (y * snap.width + x) * 4;
        const r = idata[i], g = idata[i + 1], b = idata[i + 2];
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        if (mx > 244) bright++;
        if (mx - mn < 30 && mx > 60 && mx < 220) {
          gray++;
          if (x < gx0) gx0 = x; if (x > gx1) gx1 = x;
          if (y < gy0) gy0 = y; if (y > gy1) gy1 = y;
        }
        if (mx - mn < 45 && b >= g && g >= r && mx > 45 && mx < 225) {
          blueGray++;
          if (bgPts.length < 6) bgPts.push(`${x},${y}`);
        }
        nn++;
      }
    }
    parts.push(`glare=${(100 * bright / nn).toFixed(1)}%`);
    parts.push(`gray=${(100 * gray / nn).toFixed(1)}% bbox=(${gx0},${gy0})-(${gx1},${gy1})`);
    parts.push(`blueGray=${blueGray} @${bgPts.join(' ')}`);
    // 导出当前帧为 base64（截图用）
    try {
      const small = document.createElement('canvas');
      small.width = 720;
      small.height = Math.round(720 * snap.height / snap.width);
      const sctx = small.getContext('2d');
      sctx.drawImage(snap, 0, 0, small.width, small.height);
      parts.push('IMG' + small.toDataURL('image/jpeg', 0.85));
    } catch { parts.push('IMGnone'); }
    // 灰色区域原始采样
    const rawP = (sx, sy, lbl) => {
      const dd = ctx.getImageData(sx, sy, 1, 1).data;
      return `${lbl}=(${dd[0]},${dd[1]},${dd[2]})`;
    };
    parts.push(rawP(375, 180, 'gr1'));
    parts.push(rawP(380, 195, 'gr2'));
    parts.push(rawP(390, 180, 'gr3'));
    parts.push(rawP(380, 240, 'mid'));
  } catch { parts.push('glare=na'); }
  return parts.join(' | ');
};


// 移动端基础支持：点击任意处请求指针锁定前，先显示可玩提示
window.addEventListener('error', (e) => {
  console.error('[qmsht]', e.message);
  if (e.error && e.error.stack) console.error('[qmsht-stack]', e.error.stack.split('\n').slice(0, 6).join(' | '));
});
