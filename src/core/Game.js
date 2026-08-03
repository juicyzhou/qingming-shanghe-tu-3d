import * as THREE from 'three';
import { Input } from './Input.js';
import { AudioSys } from './Audio.js';
import { createComposer } from '../render/composer.js';
import { World } from '../world/World.js';
import { Player } from '../chars/Player.js';
import { Npc, ROLE_LABEL } from '../chars/Npc.js';
import { NPC_DEFS } from '../data/npcs.js';
import { QUESTS, questById } from '../data/quests.js';
import { Inventory } from '../game/Inventory.js';
import { QuestSystem } from '../game/QuestSystem.js';
import { HUD } from '../game/HUD.js';
import { buildScript } from '../data/dialogue.js';
import { isTouchDevice } from './touch.js';
import { TouchControls } from './TouchControls.js';

export class Game {
  constructor(container) {
    // ---- 渲染器 ----
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    const touch = isTouchDevice();
    // 移动端像素比上限 2（原先=1 在 DPR2~3 手机上过于模糊）；桌面 1.5
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touch ? 2 : 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
    this.renderer = renderer;
    this.canvas = renderer.domElement;

    // ---- 场景 / 相机 ----
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#e7d8b4');
    this.scene.fog = new THREE.Fog('#e7d8b4', 60, 210);
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 500);

    // ---- 光照（暖色） ----
    const sun = new THREE.DirectionalLight('#fff2d8', 1.15);
    sun.position.set(30, 60, 20);
    this.scene.add(sun);
    this.scene.add(new THREE.HemisphereLight('#fff6e0', '#b7a080', 0.55));

    // ---- 后处理（触屏设备跳过描边以提升帧率；nocomposer 直接渲染用于诊断） ----
    const qp = new URLSearchParams(location.search);
    this.composer = qp.get('nocomposer') === '1' ? null :
      createComposer(renderer, this.scene, this.camera, { outline: qp.get('simple') !== '1' && !touch });

    // ---- 系统 ----
    this.input = new Input(this.canvas);
    this.audio = new AudioSys();
    this.hud = new HUD();
    this.touch = new TouchControls(this.input); // 触屏虚拟摇杆/按钮（非触屏为 no-op）
    this.touch.onPause = () => this.togglePause(); // 触屏"菜单"按钮
    this.world = new World(this.scene);

    if (qp.get('debug') === '1') { // 调试：点按钮射线检测屏幕中心
      const b = document.createElement('button');
      b.textContent = '射线';
      b.style.cssText = 'position:fixed;left:50%;bottom:12%;transform:translateX(-50%);z-index:80;padding:10px 22px;font-size:16px;border-radius:10px;border:2px solid #8a6a44;background:#8a3a20;color:#f3e8cd;';
      b.onclick = () => this._debugRay();
      document.body.appendChild(b);
    }

    // ---- 玩家 ----
    this.player = new Player();
    this.player.camera = this.camera;
    this.scene.add(this.player);

    // ---- NPC ----
    this.npcs = new Map();
    this.npcList = [];
    if (qp.get('nonpc') !== '1') {
      NPC_DEFS.forEach((def, i) => {
        const npc = new Npc(def, i);
        this.scene.add(npc);
        this.npcs.set(def.id || `npc_${i}`, npc);
        this.npcList.push(npc);
      });
      // 掌柜站到各店内室预留空位（避免与家具交叉）
      for (const int of this.world.interiors) {
        const k = this.npcs.get('keeper_' + int.def.id);
        if (k) {
          k.position.set(int.keeperPos[0], 0, int.keeperPos[1]);
          k.homeX = int.keeperPos[0]; k.homeZ = int.keeperPos[1];
          k.setHeading(int.keeperHeading);
        }
      }
      if (qp.get('nolabel') === '1') { // 测试：隐藏姓名标签
        for (const npc of this.npcList) if (npc.label) npc.label.visible = false;
      }
    }

    // ---- 玩法 ----
    this.inventory = new Inventory();
    this.quests = new QuestSystem(this);

    this._t = 0;
    this._clock = new THREE.Clock();
    this._running = false;
    this._hudAcc = 0;
    this._dialogNpc = null;
    this._inside = null;              // 当前进入的店铺 interior
    this._prevViewMode = 3;
    this._paused = false;             // 暂停菜单（P0-3）
    this._introActive = false;        // 开场引导进行中（P0-2）

    this.hud.showTitle(() => this.start());
    this.hud.setPrompt('');
    addEventListener('resize', () => this._resize());
  }

  start() {
    if (new URLSearchParams(location.search).get('noaudio') !== '1') this.audio.ensure();
    this.hud.update(this);
    this._running = true;
    this._clock.start();
    // 开场引导（P0-2）：自动化测试 & 看过一遍的老玩家直接进游戏
    const auto = new URLSearchParams(location.search).get('autostart') === '1';
    const seenIntro = localStorage.getItem('qmsht_intro') === '1';
    if (auto || seenIntro) {
      this.input.requestLock();
    } else {
      this._introActive = true;
      this.input.suspendLock = true;
      this.input.exitLock(); // 引导期间不锁定指针，保证可点按钮
      this.hud.showIntro(this, () => this._endIntro());
    }
    this._loop();
  }

  // 引导结束：恢复指针锁定并进入漫游
  _endIntro() {
    this._introActive = false;
    this.input.suspendLock = false;
    this.input.requestLock();
    localStorage.setItem('qmsht_intro', '1');
    this.hud.update(this);
  }

  // 暂停/继续（P0-3）
  togglePause() {
    if (this._introActive || this.hud.dialogueOpen || this.hud._minigameClose) return;
    this._paused = !this._paused;
    if (this._paused) {
      this._prevLocked = this.input.locked;
      this.input.exitLock(); // 释放指针以便操作菜单
      this.hud.openPause(this);
    } else {
      this.hud.closePause();
      if (this._prevLocked) this.input.requestLock();
    }
  }

  _loop() {
    if (!this._running) return;
    requestAnimationFrame(() => this._loop());
    const dt = Math.min(this._clock.getDelta(), 0.05);
    this._t += dt;
    this.update(dt);
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
  }

  _debugRay() {
    try {
      const rc = new THREE.Raycaster();
      rc.setFromCamera(new THREE.Vector2(0, 0), this.camera);
      rc.far = 60;
      const cand = [];
      this.scene.traverse(o => { if (o.isMesh && o.matrixWorld && o.visible) cand.push(o); });
      const hits = rc.intersectObjects(cand, false);
      if (hits.length) {
        const h = hits[0];
        const m = h.object.material;
        let info = `${h.object.geometry?.type || '?'} @(${h.point.x.toFixed(1)},${h.point.y.toFixed(1)},${h.point.z.toFixed(1)})`;
        if (m && m.uniforms && m.uniforms.uColor) info += ` hex=${m.uniforms.uColor.value.getHexString()}`;
        if (m && m.map) info += ' map=y';
        this.hud.toast('命中: ' + info);
      } else this.hud.toast('命中: 无');
    } catch (e) { this.hud.toast('射线err'); }
  }

  update(dt) {
    if (this._paused || this._introActive) {
      // 暂停/引导：世界与 NPC 保持轻动画，不响应玩家输入与交互
      for (const npc of this.npcList) npc.update(dt, this.player);
      this.world.update(dt, this._t);
      return;
    }
    if (this.input.wasPressed('KeyF')) this._debugRay();
    if (this.input.wasPressed('KeyV') && !this.hud.dialogueOpen && !this._inside) this.player.toggleView();
    if (this.input.wasPressed('KeyJ')) this.hud.toggleQuestLog(this);
    if (this.input.wasPressed('KeyE')) this.tryInteract();
    if (this.input.wasPressed('Escape')) {
      if (this.hud.dialogueOpen) this._closeDialogue();
      else if (this.hud._minigameClose) { this.hud._minigameClose(); this.hud._minigameClose = null; }
      else this.togglePause();
    }

    if (!this.hud.dialogueOpen && !this.hud._minigameClose) {
      this.player.update(dt, this.input);
    }

    this._updateInteriorTransition(); // 步行进出店铺

    // 性能：远处 NPC 隐藏（任务相关 NPC 始终显示）
    const camPos = this.camera.position;
    for (const npc of this.npcList) {
      npc.update(dt, this.player);
      npc.visible = !!npc.questMark || npc.position.distanceTo(camPos) < 48;
    }
    this.world.update(dt, this._t);

    this._updatePrompt();
    this._refreshMarks();

    this._hudAcc += dt;
    if (this._hudAcc > 0.25) { this._hudAcc = 0; this.hud.update(this); }
    this.hud.updateGuide(this); // 任务指引箭头（P0-1）
  }

  _nearestNpc(maxDist) {
    let best = null, bd = maxDist;
    for (const npc of this.npcList) {
      const d = Math.hypot(npc.position.x - this.player.px, npc.position.z - this.player.pz);
      if (d < bd) { bd = d; best = npc; }
    }
    return best;
  }

  _nearestInteractable(maxDist) {
    let best = null, bd = maxDist;
    for (const it of this.world.interactables) {
      const d = Math.hypot(it.x - this.player.px, it.z - this.player.pz);
      if (d < bd) { bd = d; best = it; }
    }
    return best;
  }

  _updatePrompt() {
    const act = isTouchDevice() ? '点「交谈」' : '按 <b>E</b>';
    const actPick = isTouchDevice() ? '点「交谈」' : '按 <b>E</b> 采集';
    if (this.hud.dialogueOpen) { this.hud.setPrompt(''); this.touch?.setInteractVisible(false); return; }
    // 交谈按钮只在有可交互目标时显示（触屏）
    const npc = this._nearestNpc(2.6);
    const item = this._nearestInteractable(2.3);
    this.touch?.setInteractVisible(!!(npc || item));
    if (this._inside) {
      const int = this._inside;
      const d = Math.hypot(this.player.px - int.doorX, this.player.pz - int.doorZ);
      this.hud.setPrompt(d < 2.2 ? `走到门口离开${int.def.name}` : '');
      return;
    }
    const door = this._nearestDoor(2.2);
    if (door) { this.hud.setPrompt(`<b>${door.def.name}</b> 开张中 · 直接走进店门`); return; }
    if (npc) {
      this.hud.setPrompt(`<b>${npc.name}</b>（${ROLE_LABEL[npc.def.role] || '行人'}）· ${act} 交谈`);
    } else if (item) {
      this.hud.setPrompt(`<b>${item.label}</b> · ${actPick}`);
    } else {
      this.hud.setPrompt('');
    }
  }

  tryInteract() {
    if (this.hud.dialogueOpen) { this._closeDialogue(); return; }
    const npc = this._nearestNpc(2.6);
    if (npc) {
      this.audio.blip();
      npc.dialogOpen = true;
      this._dialogNpc = npc;
      this.input.suspendLock = true;
      this.input.exitLock();
      const pages = buildScript(npc, this);
      this.hud.openDialogue(npc, this, pages, () => this._closeDialogue());
      return;
    }
    const item = this._nearestInteractable(2.3);
    if (item) {
      const ok = this.quests.interact(item.id);
      this.audio.blip();
      this.hud.toast(ok ? `采得${item.label}，放入包袱` : `一${item.label}，似乎有人需要它`);
      this.hud.update(this);
    }
  }

  // ---- 对话关闭（统一收尾，保证状态复位） ----
  _closeDialogue() {
    if (!this.hud.dialogueOpen) return;
    if (this._dialogNpc) this._dialogNpc.dialogOpen = false;
    this._dialogNpc = null;
    this.hud.closeDialogue();
    this.input.suspendLock = false;
    if (this.player.viewMode === 1) this.input.requestLock(); // 手势内恢复第一人称锁定
    this.quests.markDirty = true;
    this.hud.update(this);
  }

  // ---- 店门 ----
  _nearestDoor(maxDist) {
    if (!this.world.interiors) return null;
    let best = null, bd = maxDist;
    for (const it of this.world.interiors) {
      const d = Math.hypot(it.doorX - this.player.px, it.doorZ - this.player.pz);
      if (d < bd) { bd = d; best = it; }
    }
    return best;
  }

  // 步行进出检测：玩家进入某店占地 → 自动进店；走出占地 → 自动出店
  _updateInteriorTransition() {
    const inside = this.world.interiors.find(int => {
      const hw = int.def.w / 2, hd = int.def.d / 2;
      return this.player.px > int.def.x - hw && this.player.px < int.def.x + hw &&
             this.player.pz > int.def.z - hd && this.player.pz < int.def.z + hd;
    });
    if (inside && this._inside !== inside) this._enterInterior(inside);
    else if (!inside && this._inside) this._exitInterior();
  }

  _enterInterior(int) {
    this._inside = int;
    int.group.visible = true;
    int.exterior.visible = false;
    this.player.inside = int;
    if (this.player.viewMode !== 1) {   // 始终先记住进店前的视角，出店恢复
      this._prevViewMode = this.player.viewMode;
      this.player.viewMode = 1;
    }
    this.audio?.blip();
    this.hud.toast(`走进${int.def.name}`);
  }

  _exitInterior() {
    const int = this._inside;
    if (!int) return;
    int.group.visible = false;
    int.exterior.visible = true;
    this.player.inside = null;
    this.player.viewMode = this._prevViewMode;
    this._inside = null;
    this.audio?.blip();
    this.hud.toast('走出店门');
  }

  // 任务指示：金 '?' 挂在可接任务人 / 目标人头顶
  _refreshMarks() {
    if (!this.quests.markDirty) return;
    this.quests.markDirty = false;
    for (const npc of this.npcList) npc.clearQuestMark();
    for (const [qid, st] of Object.entries(this.quests.state)) {
      const def = QUESTS.find(q => q.id === qid);
      if (!def) continue;
      if (st.status === 'available') {
        const g = this.npcs.get(def.giver);
        if (g) g.addQuestMark();
      } else if (st.status === 'active') {
        const obj = this.quests.currentObjective(qid);
        if (obj.npc) { const t = this.npcs.get(obj.npc); if (t) t.addQuestMark(); }
      }
    }
  }

  // 任务指引目标（P0-1）：取第一个进行中任务的当前目标；
  // 无进行中任务则指向第一个可接任务的发放人（引导去接首个任务）
  getGuideTarget() {
    let qid = null;
    const active = this.quests.activeList()[0];
    if (active) qid = active.qid;
    else {
      for (const q of QUESTS) {
        if (this.quests.state[q.id].status === 'available') { qid = q.id; break; }
      }
    }
    if (!qid) return null;
    const q = questById(qid);
    const obj = this.quests.currentObjective(qid);
    let x = null, y = 1.4, z = 0;
    if (obj.npc) {
      const npc = this.npcs.get(obj.npc);
      if (npc) { x = npc.position.x; y = npc.position.y + 1.4; z = npc.position.z; }
    } else if (obj.interactable) {
      const it = this.world.interactables.find(i => i.id === obj.interactable);
      if (it) { x = it.x; z = it.z; y = 0.8; }
    }
    if (x == null) return null;
    return { qid, title: q.title, text: obj.text, x, y, z };
  }

  _resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }
}
