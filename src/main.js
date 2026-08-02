import * as THREE from 'three';
import { Game } from './core/Game.js';
import { collides } from './world/layout.js';

const app = document.getElementById('app');
window.game = new Game(app);

// 自动启动（测试用）：?autostart=1 直接进入游戏
const TEST_PARAMS = new URLSearchParams(location.search);
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
    // 先设自由相机，再启动 → 首帧即目标取景（截图/探针用）
    const view = TEST_PARAMS.get('view') || 'aerial';
    g.player._freeCam = true;
    g.player.px = 0; g.player.pz = 30;
    if (view === 'street') {
      g.player.px = -18; g.player.pz = 10;            // 集市街头
      g.camera.position.set(-18, 3.2, 4);
      g.camera.lookAt(0, 1.2, 12);
    } else if (view === 'shop') {
      g.player.px = 0; g.player.pz = -55;             // 近看店铺立面
      g.camera.position.set(3.2, 2.6, -60);
      g.camera.lookAt(-11, 2.6, -68);
    } else if (view === 'interior') {
      const int0 = g.world.interiors[0];
      g._enterInterior(int0);
      g.player.px = int0.spawnX; g.player.pz = int0.spawnZ;
      g.camera.position.set(int0.def.x - 0.5, 1.5, int0.def.z);
      g.camera.lookAt(int0.def.x - int0.def.w / 2, 1.5, int0.def.z); // 看背墙
    } else {
      g.camera.position.set(0, 82, 58);               // 鸟瞰全景
      g.camera.lookAt(0, 0, -12);
    }
    g.camera.fov = 60; g.camera.updateProjectionMatrix();
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
  out.push('SUMMARY done=' + Q.stats.completed + '/8 coins=' + I.coins + ' rep=' + Q.stats.reputation);
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

window.__probe = (g) => {
  // 采样世界关键坐标点在屏幕上的颜色
  const { renderer, camera } = g;
  const snap = document.createElement('canvas');
  snap.width = renderer.domElement.width;
  snap.height = renderer.domElement.height;
  const ctx = snap.getContext('2d');
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
  return parts.join(' | ');
};


// 移动端基础支持：点击任意处请求指针锁定前，先显示可玩提示
window.addEventListener('error', (e) => {
  console.error('[qmsht]', e.message);
  if (e.error && e.error.stack) console.error('[qmsht-stack]', e.error.stack.split('\n').slice(0, 6).join(' | '));
});
