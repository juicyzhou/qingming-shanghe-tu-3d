import * as THREE from 'three';
import { Input } from './Input.js';
import { AudioSys } from './Audio.js';
import { createComposer } from '../render/composer.js';
import { World } from '../world/World.js';
import { Player } from '../chars/Player.js';
import { Npc, ROLE_LABEL } from '../chars/Npc.js';
import { NPC_DEFS } from '../data/npcs.js';
import { QUESTS } from '../data/quests.js';
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touch ? 1 : 1.5)); // 触屏设备像素比=1
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

    // ---- 后处理（触屏设备跳过描边以提升帧率） ----
    const qp = new URLSearchParams(location.search);
    this.composer = createComposer(renderer, this.scene, this.camera, { outline: qp.get('simple') !== '1' && !touch });

    // ---- 系统 ----
    this.input = new Input(this.canvas);
    this.audio = new AudioSys();
    this.hud = new HUD();
    this.touch = new TouchControls(this.input); // 触屏虚拟摇杆/按钮（非触屏为 no-op）
    this.world = new World(this.scene);

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

    this.hud.showTitle(() => this.start());
    this.hud.setPrompt('');
    addEventListener('resize', () => this._resize());
  }

  start() {
    if (new URLSearchParams(location.search).get('noaudio') !== '1') this.audio.ensure();
    this.input.requestLock();
    this.hud.update(this);
    this._running = true;
    this._clock.start();
    this._loop();
  }

  _loop() {
    if (!this._running) return;
    requestAnimationFrame(() => this._loop());
    const dt = Math.min(this._clock.getDelta(), 0.05);
    this._t += dt;
    this.update(dt);
    this.composer.render();
    this.input.endFrame();
  }

  update(dt) {
    if (this.input.wasPressed('KeyV') && !this.hud.dialogueOpen && !this._inside) this.player.toggleView();
    if (this.input.wasPressed('KeyJ')) this.hud.toggleQuestLog(this);
    if (this.input.wasPressed('KeyE')) this.tryInteract();
    if (this.input.wasPressed('Escape')) {
      if (this.hud.dialogueOpen) this._closeDialogue();
      else this.input.exitLock();
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
    if (this.hud.dialogueOpen) { this.hud.setPrompt(''); return; }
    const act = isTouchDevice() ? '点「交谈」' : '按 <b>E</b>';
    const actPick = isTouchDevice() ? '点「交谈」' : '按 <b>E</b> 采集';
    if (this._inside) {
      const int = this._inside;
      const d = Math.hypot(this.player.px - int.doorX, this.player.pz - int.doorZ);
      this.hud.setPrompt(d < 2.2 ? `走到门口离开${int.def.name}` : '');
      return;
    }
    const door = this._nearestDoor(2.2);
    if (door) { this.hud.setPrompt(`<b>${door.def.name}</b> 开张中 · 直接走进店门`); return; }
    const npc = this._nearestNpc(2.6);
    const item = npc ? null : this._nearestInteractable(2.3);
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

  _resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }
}
