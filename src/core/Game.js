import * as THREE from 'three';
import { Input } from './Input.js';
import { AudioSys } from './Audio.js';
import { createComposer } from '../render/composer.js';
import { World } from '../world/World.js';
import { Player } from '../chars/Player.js';
import { Npc, ROLE_LABEL } from '../chars/Npc.js';
import { NPC_DEFS } from '../data/npcs.js';
import { QUESTS, questById } from '../data/quests.js';
import { LANDMARKS } from '../data/landmarks.js';
import { LANTERN_RIDDLES } from '../data/minigames.js';
import { LIGHT_UNIFORMS, FOG_UNIFORMS } from '../render/materials.js';
import { reputationLevel, reputationTitle } from '../game/HUD.js';
import { WATER_UNIFORMS } from '../render/shaders.js';
import { Weather } from '../render/weather.js';
import { sunDirection, moonDirection } from '../render/sky.js';
import { Inventory } from '../game/Inventory.js';
import { QuestSystem } from '../game/QuestSystem.js';
import { Analytics } from '../game/Analytics.js';
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

    // ---- 实时阴影：太阳定向光（仅用于生成阴影，toon 着色器手动采样） ----
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = touch ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    this.sunLight = new THREE.DirectionalLight(0xffffff, 0);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(touch ? 1024 : 2048, touch ? 1024 : 2048);
    const sCam = this.sunLight.shadow.camera;
    sCam.near = 20; sCam.far = 450;
    sCam.left = -80; sCam.right = 80; sCam.top = 80; sCam.bottom = -80;

    // ---- 场景 / 相机 ----
    this.scene = new THREE.Scene();
    // P1-2 傍晚暖光（默认暮色，?day=1 恢复正午；与 materials.js 的 uSunDir/uSunColor 同步）
    this.dusk = new URLSearchParams(location.search).get('day') !== '1';
    this.scene.background = new THREE.Color(this.dusk ? '#e2cfa8' : '#e7d8b4');
    this.scene.fog = new THREE.Fog(this.dusk ? '#e2cfa8' : '#e7d8b4', 60, 210);
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 500);

    // ---- 光照（暖色） ----
    const sun = new THREE.DirectionalLight('#fff2d8', 1.15);
    sun.position.set(30, 60, 20);
    this.scene.add(sun);
    this.scene.add(new THREE.HemisphereLight('#fff6e0', '#b7a080', 0.55));
    // 阴影光源（跟随太阳方向）
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);
    // 阴影矩阵恒有效（nocycle 测试模式不跑 _applyTimeLighting 也不崩溃）
    LIGHT_UNIFORMS.uShadowMatrix.value = this.sunLight.shadow.matrix;
    this.sunLight.position.set(30, 60, 20);
    this.sunLight.target.position.set(0, 0, 0);
    this.sunLight.target.updateMatrixWorld();

    // ---- 后处理（触屏设备跳过描边以提升帧率；nocomposer 直接渲染用于诊断） ----
    const qp = new URLSearchParams(location.search);
    this.composer = qp.get('nocomposer') === '1' ? null :
      createComposer(renderer, this.scene, this.camera, { outline: qp.get('simple') !== '1' && !touch });
    // P1-5 桌面描边可选：读取用户上次选择（默认开）
    if (this.composer?.outlinePass && localStorage.getItem('qmsht_outline') === '0') {
      this.composer.outlinePass.enabled = false;
    }

    // ---- 系统 ----
    this.input = new Input(this.canvas);
    this.audio = new AudioSys();
    this.audio.enableOnGesture(); // P3-3 任意手势兜底解锁音频（微信 WKWebView 常见）
    this.hud = new HUD();
    this.hud._audio = this.audio; // 供 HUD 播放翻页/小玩法音效
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
    this.player.onStep = (gt) => this.audio.step(gt); // P1-2 脚步随地面变化
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
      // P2-2 作息标记：夜巡人夜间出现；摊贩/摊主白天出摊，入夜收摊（任务 NPC 恒显）
      const DAY_ROLES = new Set(['vendor', 'cook', 'acrobat', 'storyteller', 'fish', 'farmer', 'porter', 'diviner']);
      this.npcList.forEach((npc, i) => {
        npc._thin = i;
        if (npc.npcId === 'gengfu' || npc.npcId === 'xunye') npc.nightOnly = true;
        else if (DAY_ROLES.has(npc.def.role) && !npc.npcId.startsWith('keeper_')) npc.dayOnly = true;
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
    // P3-4 体验埋点（本地，零外部请求）
    this.analytics = new Analytics();
    const fin = () => this.analytics.end();
    addEventListener('beforeunload', fin);
    addEventListener('pagehide', fin);

    this._t = 0;
    this._clock = new THREE.Clock();
    this._running = false;
    this._hudAcc = 0;
    this._dialogNpc = null;
    this._inside = null;              // 当前进入的店铺 interior
    this._prevViewMode = 3;
    this._paused = false;             // 暂停菜单（P0-3）
    this._introActive = false;        // 开场引导进行中（P0-2）
    // P1-3 自适应分辨率：低帧率自动降档，恢复后升回（触屏上限 2、桌面 1.5）
    this._PIXEL_LEVELS = [1, 1.25, 1.5, 2];
    this._maxPixelLevel = touch ? 3 : 2;
    this._pixelLevel = this._maxPixelLevel;
    this._frameSamples = [];
    // P2-2 时辰时钟：默认未时午后，一日 = 8 分钟（?hour= 设起始，?daylen= 设日长秒，?nocycle=1 关昼夜）
    this.hour = parseFloat(qp.get('hour') ?? '14') % 24;
    this.dayLenSec = parseFloat(qp.get('daylen') ?? '480');
    this.cycle = qp.get('nocycle') !== '1';
    // 昼夜颜色锚点（白昼=当前暮色画风，夜晚=灯笼暖调 + 深蓝夜空）
    this._ambDay = new THREE.Color('#f4dfbe'); this._ambNight = new THREE.Color('#5a3a28');
    this._sunDay = new THREE.Color('#ffe8bf'); this._sunNight = new THREE.Color('#7a4a2e');
    this._bgDay = new THREE.Color('#e2cfa8'); this._bgNight = new THREE.Color('#1d2030');
    // P2-3 打卡收集
    this.landmarksCollected = new Set();
    // P2-1 夜市灯谜：已解谜题下标
    this.lanternRiddles = new Set();
    // 经济/收集：画卷碎片、花灯点亮、声望等级
    this.paintingPieces = 0;
    this.lanternsLit = 0;
    this._repLevel = reputationLevel(this.quests.stats.reputation);
    // P2-5 天气（雨/雪粒子 + 随机换天）
    this.weather = new Weather(
      () => ({ x: this.player.px, y: this.player.groundY, z: this.player.pz }),
      this.scene
    );
    const wq = qp.get('weather');
    if (wq === 'rain' || wq === 'snow' || wq === 'clear') this.weather.set(wq);

    this.hud.showTitle(() => this.start());
    this.hud.setPrompt('');
    addEventListener('resize', () => this._resize());
    this._resize(); // 启动即应用竖屏 FOV（P1-3）

    // 网格参与实时阴影（穹顶/水/精灵除外）
    this.scene.traverse(o => {
      if (!o.isMesh) return;
      if (o.geometry && o.geometry.parameters && o.geometry.parameters.radius === 400) return; // 穹顶
      o.castShadow = true;
      o.receiveShadow = true;
    });
    if (this.world.river) this.world.river.castShadow = false; // 水面不投影
  }

  start() {
    if (new URLSearchParams(location.search).get('noaudio') !== '1') {
      this.audio.ensure();
      this.audio.startAmbient(); // P1-2 环境音：水流/市井/鸟鸣
    }
    this.analytics.begin(); // P3-4 会话开始
    // 横屏进入画卷时自动全屏（在用户手势内；拒绝静默忽略）
    if (window.innerWidth > window.innerHeight && document.fullscreenEnabled) {
      try { const el = document.documentElement; const p = el.requestFullscreen && el.requestFullscreen(); if (p && p.catch) p.catch(() => {}); } catch {}
    }
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

  // P1-5 墨线描边开关（桌面，触屏恒关）
  outlineOn() {
    return !!(this.composer && this.composer.outlinePass && this.composer.outlinePass.enabled);
  }

  setOutline(on) {
    const op = this.composer && this.composer.outlinePass;
    if (!op) return;
    op.enabled = !!on;
    try { localStorage.setItem('qmsht_outline', on ? '1' : '0'); } catch {}
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
    this._updateAdaptive(); // P1-3 低帧率自适应降档
  }

  // P1-3 自适应像素比：平均帧耗时 >36ms（<27fps）降一档，<20ms 连续 3 窗升回（不超上限）
  _updateAdaptive() {
    if (this._pixelLevel === 0 && this._frameSamples.length > 90) return; // 已最低，停止采样
    const now = performance.now();
    if (!this._lastFrameNow) { this._lastFrameNow = now; return; }
    this._frameSamples.push(now - this._lastFrameNow);
    this._lastFrameNow = now;
    if (this._frameSamples.length < 30) return;
    const avg = this._frameSamples.reduce((a, b) => a + b, 0) / this._frameSamples.length;
    this._frameSamples = [];
    if (avg > 36 && this._pixelLevel > 0) {
      this._setPixelLevel(this._pixelLevel - 1);
    } else if (avg < 20 && this._pixelLevel < this._maxPixelLevel) {
      this._fastCount = (this._fastCount || 0) + 1;
      if (this._fastCount >= 3) { this._fastCount = 0; this._setPixelLevel(this._pixelLevel + 1); }
    } else {
      this._fastCount = 0;
    }
  }

  _setPixelLevel(l) {
    if (l === this._pixelLevel || l < 0 || l > this._maxPixelLevel) return;
    this._pixelLevel = l;
    this.renderer.setPixelRatio(this._PIXEL_LEVELS[l]);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    if (this.composer) this.composer.setSize(window.innerWidth, window.innerHeight);
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
    this.analytics.beat(); // P3-4 停留时长心跳
    if (this._paused || this._introActive) {
      // 暂停/引导：世界与 NPC 保持轻动画，不响应玩家输入与交互；
      // 但暂停时仍响应 Esc（否则暂停后无法用键盘退出）
      if (this._paused && this.input.wasPressed('Escape')) this.togglePause();
      for (const npc of this.npcList) npc.update(dt, this.player);
      this.world.update(dt, this._t);
      this.weather.update(dt, this.hour, this._t);
      this._syncWeather();
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

    // P2-2 时辰推进 + 昼夜光照
    if (this.cycle) {
      this.hour = (this.hour + (dt / this.dayLenSec) * 24) % 24;
      this._applyTimeLighting();
    }
    this._updateLandmarks(); // P2-3 打卡检测
    // P2-5 天气：雨雪粒子 + 水面/光照/音效联动
    this.weather.update(dt, this.hour, this._t);
    this._syncWeather();

    this._updateInteriorTransition(); // 步行进出店铺

    // 性能：远处 NPC 隐藏（任务相关 NPC 始终显示）+ P2-2 作息
    const camPos = this.camera.position;
    const nf = this._nightFactor();
    for (let i = 0; i < this.npcList.length; i++) {
      const npc = this.npcList[i];
      npc.update(dt, this.player);
      let vis = !!npc.questMark || npc.position.distanceTo(camPos) < 48;
      if (npc.nightOnly) vis = nf > 0.5 && vis;
      else if (nf > 0.5 && !npc.questMark && !npc.npcId.startsWith('keeper_')) {
        if (npc.dayOnly || (i % 2 === 0)) vis = false; // 摊贩收摊 + 街人抽稀
      }
      npc.visible = vis;
    }
    this.world.update(dt, this._t);

    this._updatePrompt();
    this._refreshMarks();

    this._hudAcc += dt;
    if (this._hudAcc > 0.25) { this._hudAcc = 0; this.hud.update(this); }
    this.hud.updateGuide(this); // 任务指引箭头（P0-1）
  }

  // P2-2 夜因子：0=白天 → 1=深夜（18:30 入夜、21 全黑、5:00 破晓、7 天亮）
  _nightFactor() {
    const h = this.hour;
    if (h >= 18.5 && h <= 24) return Math.min(1, (h - 18.5) / 2.5);
    if (h >= 0 && h <= 5) return 1;
    if (h > 5 && h <= 7) return Math.max(0, 1 - (h - 5) / 2);
    return 0;
  }

  // P2-2 昼夜光照：太阳东升西落、月光清冷；白昼保持暖色画风，入夜建筑靠"灯笼暖光"+月光
  // P2-5 雨天再整体微暗
  _applyTimeLighting() {
    const nf = this._nightFactor();
    const day = 1 - nf;
    const rainDim = 1 - (this.weather ? this.weather.raininess : 0) * 0.14;
    const sunDir = sunDirection(this.hour);   // 6~18时东升西落，夜间 null
    const moonDir = moonDirection(this.hour); // 18~6时月亮，白天 null
    const sunH = sunDir ? sunDir.y : 0;
    const dayFactor = Math.max(0, Math.min(1, (sunH + 0.05) * 2.5)); // 0=夜 1=正午

    // 太阳方向与颜色（随东升西落；近地平线暖橙，正午亮白）
    if (sunDir) LIGHT_UNIFORMS.uSunDir.value.copy(sunDir);
    const warm = Math.exp(-Math.pow((sunH - 0.15) * 2.2, 2)); // 晨昏偏橙
    const sunColor = new THREE.Color('#fff4dc').lerp(new THREE.Color('#ffb36a'), warm * 0.85);
    LIGHT_UNIFORMS.uSunColor.value.copy(sunColor)
      .multiplyScalar(0.8 * (0.05 + 0.95 * dayFactor) * rainDim);

    // 环境光：白天暖，夜晚灯笼暖 + 冷调底
    const amb = new THREE.Color('#f6e6c8').lerp(new THREE.Color('#5a3a28'), nf);
    LIGHT_UNIFORMS.uAmbient.value.copy(amb).multiplyScalar(0.5 * (0.7 + 0.3 * dayFactor) * rainDim);

    // 清冷月光
    if (moonDir) LIGHT_UNIFORMS.uMoonDir.value.copy(moonDir);
    LIGHT_UNIFORMS.uMoonStrength.value = nf;
    LIGHT_UNIFORMS.uMoonColor.value.copy(new THREE.Color('#9fb8d8'));

    // 阴影光源跟随太阳
    if (this.sunLight && sunDir) {
      this.sunLight.position.copy(sunDir).multiplyScalar(200);
      this.sunLight.target.position.set(0, 0, 0);
      this.sunLight.target.updateMatrixWorld();
      LIGHT_UNIFORMS.uShadowMatrix.value = this.sunLight.shadow.matrix;
      if (this.sunLight.shadow.map) {
        LIGHT_UNIFORMS.uShadowMap.value = this.sunLight.shadow.map.texture;
        LIGHT_UNIFORMS.uHasShadow.value = 1;
      }
    } else if (this.sunLight) {
      LIGHT_UNIFORMS.uHasShadow.value = 0; // 夜间无太阳影
    }

    // 雾/背景 = 地平线天空色（白天暖、夜晚暗蓝），远处景物融入天际
    const bg = new THREE.Color('#f2e2be').lerp(new THREE.Color('#2c3352'), nf);
    FOG_UNIFORMS.uFogColor.value.copy(bg);
    this.scene.background.copy(bg);
    if (this.scene.fog) this.scene.fog.color.copy(bg);

    // 天空系统（穹顶/日月/云/光锥）
    if (this.world && this.world.sky) this.world.sky.update(this.hour, nf);
  }

  // P2-5 天气联动：水面光斑/雨色 + 雨声
  _syncWeather() {
    const r = this.weather.raininess;
    WATER_UNIFORMS.uRain.value = r;
    WATER_UNIFORMS.uSparkle.value = (1 - this._nightFactor()) * (1 - 0.7 * r);
    this.audio?.setRain(r > 0.45);
  }

  // P2-3 打卡：走进景点范围自动盖章；集齐弹画卷图鉴成就卡
  _updateLandmarks() {
    if (this.landmarksCollected.size >= LANDMARKS.length) return;
    for (const lm of LANDMARKS) {
      if (this.landmarksCollected.has(lm.id)) continue;
      if (Math.hypot(lm.x - this.player.px, lm.z - this.player.pz) < lm.r) {
        this.landmarksCollected.add(lm.id);
        this.audio?.chime();
        this.hud.toast(`打卡「${lm.name}」· ${lm.desc}`);
        this.hud.update(this);
        if (this.landmarksCollected.size === LANDMARKS.length) {
          this.hud.toast('汴京十二景集齐，画卷完整展开！');
          this.analytics.inc('allLandmarks'); // P3-4
          setTimeout(() => this.hud.showAchievement(this, 'landmarks'), 900);
        }
      }
    }
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
      if (item.id === 'lantern') {
        // P2-1 花灯：入夜才开张
        this.hud.setPrompt(this._nightFactor() > 0.5
          ? `<b>花灯谜</b> · ${actPick} 猜谜赢钱`
          : `<b>花灯</b> · 入夜可来猜谜`);
      } else {
        this.hud.setPrompt(`<b>${item.label}</b> · ${actPick}`);
      }
    } else {
      this.hud.setPrompt('');
    }
  }

  tryInteract() {
    if (this.hud.dialogueOpen) { this._closeDialogue(); return; }
    if (this.hud._minigameClose) return; // 竞速进行中
    // P2-1 听书/猜谜面板已开 → E 关闭
    if (this.hud.cache.story.style.display !== 'none') { this.hud.cache.story.style.display = 'none'; return; }
    if (this.hud.cache.riddle.style.display !== 'none') { this.hud.cache.riddle.style.display = 'none'; return; }
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
      // P2-1 小玩法场景物（非任务物品）
      if (item.id === 'storybooth') { this.hud.openStory(this); return; }
      if (item.id === 'raceboat') { this.hud.startRace(this); return; }
      if (item.id === 'lantern') {
        if (this._nightFactor() > 0.5) { this.hud.openLanternRiddle(this); return; }
        this.audio?.click();
        this.hud.toast('灯谜摊要入夜才开张');
        return;
      }
      const ok = this.quests.interact(item.id);
      this.audio.blip();
      this.hud.toast(ok ? `采得${item.label}，放入包袱` : `一${item.label}，似乎有人需要它`);
      this.hud.update(this);
    }
  }

  // ---- P2-1 小玩法结算逻辑（HUD 面板调用，可单测） ----
  answerLanternRiddle(idx) {
    const r = LANTERN_RIDDLES[idx];
    if (!r) return false;
    if (this.lanternRiddles.has(idx)) return false;
    this.lanternRiddles.add(idx);
    this.analytics.inc('riddlesSolved'); // P3-4
    this.inventory.earn(25);
    this.quests.stats.reputation += 5;
    this.audio?.coin();
    this.hud.toast(`灯花一爆，飘出 25 文铜钱！（${this.lanternRiddles.size}/${LANTERN_RIDDLES.length}）`);
    if (this.lanternRiddles.size === LANTERN_RIDDLES.length) {
      this.inventory.earn(30);
      this.hud.toast('六盏灯谜全解，夜市无灯不亮！再得 30 文');
    }
    this.hud.update(this);
    return true;
  }

  finishRace(win) {
    if (win) {
      this.inventory.earn(40);
      this.quests.stats.reputation += 5;
      this.analytics.inc('minigameWins'); // P3-4
      this.audio?.coin();
      this.hud.toast('赢了竞速！+40 文');
    } else {
      this.audio?.click();
      this.hud.toast('只差一点，下次再来');
    }
    this.hud.update(this);
  }

  storyReward(type) {
    if (type === 'tip') {
      if (!this.inventory.pay(10)) { this.audio?.click(); this.hud.toast('囊中羞涩，且听下一段'); return false; }
      this.quests.stats.reputation += 10;
      this.audio?.coin();
      this.hud.toast('打赏十文，说书人拱手道谢（声望 +10）');
    } else {
      this.quests.stats.reputation += 5;
      this.audio?.blip();
      this.hud.toast('满堂喝彩，说书人点头致意（声望 +5）');
    }
    this._checkReputationLevel();
    this.hud.update(this);
    return true;
  }

  // ---- 经济系统（百杂铺杂货摊） ----
  shopOwned(type) {
    return type === 'painting' ? this.paintingPieces : (type === 'lantern' ? this.lanternsLit : 0);
  }

  shopBuy(type) {
    const prices = { painting: 30, lantern: 20, incense: 15 };
    const cost = prices[type];
    if (!this.inventory.pay(cost)) { this.audio?.click(); this.hud.toast('囊中羞涩，改日再来'); return false; }
    if (type === 'painting') {
      this.paintingPieces++;
      this.audio?.coin();
      this.hud.toast(`购得画卷碎片（${this.paintingPieces}/5）`);
      if (this.paintingPieces >= 5) { this.hud.toast('珍藏画卷拼齐，汴京风物尽收卷中！'); this.hud.showAchievement(this, 'painting'); }
    } else if (type === 'lantern') {
      this.lanternsLit++;
      this.audio?.coin();
      this._applyWorldChanges();
      this.hud.toast(`点起一盏花灯（${this.lanternsLit}/5）`);
      if (this.lanternsLit >= 5) this.hud.toast('集市五灯齐亮，夜市灯火通明！');
    } else { // incense：香火 → 声望
      this.quests.stats.reputation += 10;
      this.audio?.chime();
      this.hud.toast('上了一炷香，声望 +10');
      this._checkReputationLevel();
    }
    this.hud.update(this);
    return true;
  }

  // 声望升级检查（跨越等级时提示称号）
  _checkReputationLevel() {
    const lvl = reputationLevel(this.quests.stats.reputation);
    if (lvl > this._repLevel) {
      this._repLevel = lvl;
      this.audio?.chime();
      this.hud.toast(`声望提升：${reputationTitle(this.quests.stats.reputation)}！`);
      this.hud.update(this);
    }
  }

  // 世界痕迹感：按任务完成/收集进度点亮场景变化
  _applyWorldChanges() {
    const ch = this.world && this.world.worldChanges;
    if (!ch) return;
    for (const [qid, obj] of Object.entries(ch)) {
      if (qid === 'lanterns') continue;
      obj.visible = !!this.quests.isDone(qid);
    }
    const lights = ch.lanterns;
    if (lights) {
      lights.forEach(({ group, lamp }, i) => {
        group.visible = i < this.lanternsLit;
        if (i < this.lanternsLit && lamp.material && lamp.material.uniforms && lamp.material.uniforms.uColor) {
          lamp.material.uniforms.uColor.value.copy(lamp.userData.litColor);
        }
      });
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
    this.audio?.creak(); // P1-4 开门吱呀
    this.hud.toast(`走进${int.def.name}`);
    this.analytics.inc('interiors'); // P3-4
  }

  _exitInterior() {
    const int = this._inside;
    if (!int) return;
    int.group.visible = false;
    int.exterior.visible = true;
    this.player.inside = null;
    this.player.viewMode = this._prevViewMode;
    this._inside = null;
    this.audio?.creak(); // P1-4 开门吱呀
    this.hud.toast('走出店门');
  }

  // 任务指示：金 '?' 挂在可接任务人 / 目标人头顶
  _refreshMarks() {
    if (!this.quests.markDirty) return;
    this.quests.markDirty = false;
    this._applyWorldChanges(); // 世界痕迹感随任务进度刷新
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
    // P1-3 竖屏适配：窄画幅放大纵向视场，避免横向视野被压扁
    const portrait = window.innerHeight > window.innerWidth;
    this.camera.fov = portrait ? 78 : 62;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    if (this.composer) this.composer.setSize(window.innerWidth, window.innerHeight);
  }
}
