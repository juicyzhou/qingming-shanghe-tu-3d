import * as THREE from 'three';
import { BUILDINGS, STALLS, RIVER, BRIDGE, GATE } from '../world/layout.js';

const CSS = `
  #hud *{box-sizing:border-box;user-select:none;-webkit-user-select:none;}
  #hud{position:fixed;inset:0;pointer-events:none;font-family:"Kaiti SC","KaiTi","STKaiti","FangSong","SimSun",serif;color:#3a2c1a;z-index:50;}
  #hud .panel{background:linear-gradient(160deg,#f3e8cd,#e7d7b4);border:3px solid #8a6a44;border-radius:10px;
    box-shadow:0 4px 14px rgba(70,50,20,.35), inset 0 0 0 1px rgba(255,250,230,.5);}
  #hud .topbar{position:absolute;top:12px;left:14px;right:14px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;}
  #hud .coins{display:flex;align-items:center;gap:8px;padding:8px 14px;font-size:18px;font-weight:bold;}
  #hud .coin-ico{width:22px;height:22px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ffd76a,#c8912a 70%);box-shadow:0 1px 3px rgba(0,0,0,.4);position:relative;}
  #hud .coin-ico::after{content:"";position:absolute;inset:5px;border-radius:50%;border:1.5px dashed #8a5a16;}
  #hud .quest-track{min-width:210px;max-width:320px;padding:10px 14px;font-size:14px;line-height:1.7;}
  #hud .quest-track h3{margin:0 0 4px;font-size:15px;color:#6e4a20;border-bottom:1px dashed #a08050;padding-bottom:3px;}
  #hud .quest-track .qitem{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  #hud .quest-track .qitem.done{color:#5a6e3a;}
  #hud .minimap-wrap{text-align:right;}
  #hud canvas.minimap{background:#efe2c0;border:3px solid #8a6a44;border-radius:8px;box-shadow:0 4px 12px rgba(70,50,20,.3);}
  #hud .hint{position:absolute;top:118px;right:14px;font-size:12px;color:#7a5f38;text-align:right;line-height:1.9;}
  #hud .prompt{position:absolute;left:50%;bottom:12%;transform:translateX(-50%);padding:10px 20px;font-size:19px;
    background:rgba(243,232,205,.94);border:2px solid #8a6a44;border-radius:8px;box-shadow:0 3px 10px rgba(0,0,0,.25);}
  #hud .prompt b{color:#8a3a20;}
  #hud .toast{position:absolute;top:18%;left:50%;transform:translateX(-50%);padding:10px 22px;font-size:17px;
    background:rgba(58,44,26,.9);color:#f3e8cd;border-radius:8px;opacity:0;transition:opacity .3s;}
  #hud .dialogue{position:absolute;left:50%;bottom:8%;transform:translateX(-50%);width:min(720px,92vw);padding:16px 20px;}
  #hud .d-head{display:flex;align-items:center;gap:12px;border-bottom:2px dashed #b09058;padding-bottom:8px;margin-bottom:10px;}
  #hud .avatar{width:52px;height:52px;border-radius:50%;border:2px solid #8a6a44;background:#e8d9b8;flex:none;}
  #hud .d-name{font-size:18px;font-weight:bold;color:#4a2f10;}
  #hud .d-role{font-size:13px;color:#7a5f38;}
  #hud .d-text{font-size:17px;line-height:1.9;min-height:56px;margin-bottom:10px;}
  #hud .d-opts{display:flex;flex-direction:column;gap:6px;}
  #hud .d-opt{pointer-events:auto;cursor:pointer;text-align:left;padding:8px 14px;font-size:15px;font-family:inherit;
    background:#efe2c0;border:2px solid #a08050;border-radius:6px;color:#3a2c1a;transition:background .15s;}
  #hud .d-opt:hover{background:#e0cd9f;}
  #hud .settle{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(480px,92vw);padding:26px 30px;text-align:center;}
  #hud .settle h2{color:#8a3a20;font-size:26px;margin:0 0 6px;}
  #hud .settle .rew{font-size:18px;line-height:2;color:#4a2f10;}
  #hud .settle .rew b{color:#a05820;}
  #hud .btn{pointer-events:auto;cursor:pointer;display:inline-block;margin-top:14px;padding:10px 30px;font-size:17px;font-family:inherit;
    background:#8a3a20;color:#f3e8cd;border:2px solid #5a2008;border-radius:8px;}
  #hud .btn:hover{background:#a04a2a;}
  #hud .title{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;
    background:radial-gradient(ellipse at 50% 40%,rgba(240,228,200,.92),rgba(210,190,150,.96));pointer-events:auto;}
  #hud .title h1{font-size:54px;color:#5a2c10;letter-spacing:10px;margin:0;text-shadow:2px 2px 0 rgba(255,250,230,.8);}
  #hud .title .sub{font-size:20px;color:#7a4a20;margin-bottom:14px;letter-spacing:4px;}
  #hud .title .controls{font-size:15px;color:#4a3420;line-height:2.1;background:rgba(255,250,230,.6);padding:10px 26px;border-radius:8px;border:1px dashed #a08050;}
  #hud .title .big{font-size:22px;padding:12px 40px;margin-top:10px;}
  #hud .minigame{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,92vw);padding:20px 24px;text-align:center;}
  #hud .mg-bar{position:relative;height:30px;background:#e5d6b0;border:2px solid #8a6a44;border-radius:6px;overflow:hidden;}
  #hud .mg-zone{position:absolute;top:0;bottom:0;width:22%;left:39%;background:rgba(60,140,90,.45);border-left:2px solid #3a7a4a;border-right:2px solid #3a7a4a;}
  #hud .mg-marker{position:absolute;top:2px;bottom:2px;width:10px;background:#8a3a20;border-radius:2px;}
  #hud .mg-prog{margin-top:12px;font-size:16px;color:#6e4a20;}
  #hud .mg-tip{font-size:15px;color:#5a3a20;margin-top:6px;}
  #hud .questlog{position:absolute;top:80px;left:14px;width:300px;max-height:60vh;overflow:auto;padding:14px 16px;font-size:14px;line-height:1.8;}
  /* P0-1 任务指引：屏幕边缘箭头 + 距离标签 */
  #hud .g-arrow{position:absolute;width:36px;height:36px;z-index:52;color:#a05820;font-size:28px;
    display:flex;align-items:center;justify-content:center;pointer-events:none;
    text-shadow:0 0 6px rgba(243,232,205,.95),0 0 2px rgba(243,232,205,.95),0 1px 2px rgba(0,0,0,.25);
    transform-origin:50% 50%;}
  #hud .g-tag{position:absolute;left:50%;top:84px;transform:translateX(-50%);z-index:52;pointer-events:none;
    padding:4px 16px;font-size:14px;color:#4a2f10;white-space:nowrap;
    background:rgba(243,232,205,.94);border:2px solid #8a6a44;border-radius:999px;
    box-shadow:0 2px 8px rgba(70,50,20,.28);}
  /* P0-2 开场引导 */
  #hud .intro{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:60;
    background:radial-gradient(ellipse at 50% 40%,rgba(240,228,200,.97),rgba(205,185,145,.98));pointer-events:auto;}
  #hud .intro .ipanel{width:min(560px,90vw);padding:30px 36px;text-align:center;line-height:2;}
  #hud .intro h2{color:#5a2c10;font-size:26px;margin:0 0 12px;letter-spacing:6px;}
  #hud .intro .istep{font-size:17px;color:#4a3420;min-height:88px;}
  #hud .intro .istep b{color:#8a3a20;}
  #hud .intro .keys{font-size:15px;color:#4a3420;background:rgba(255,250,230,.6);padding:10px 22px;border-radius:8px;border:1px dashed #a08050;margin:8px 0;line-height:2.2;}
  #hud .intro .dots{margin-top:10px;letter-spacing:8px;color:#a08050;}
  #hud .intro .btn{margin-top:18px;}
  /* P0-3 暂停/设置菜单 */
  #hud .pausemenu{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:58;
    background:rgba(60,45,20,.3);pointer-events:auto;}
  #hud .pmenu-panel{width:min(320px,88vw);padding:24px 28px;text-align:center;}
  #hud .pmenu-panel h2{margin:0 0 14px;color:#5a2c10;font-size:24px;letter-spacing:8px;}
  #hud .vol-row{display:flex;align-items:center;gap:12px;justify-content:center;margin:10px 0 6px;font-size:15px;color:#4a3420;}
  #hud .vol-row input[type=range]{accent-color:#8a3a20;width:150px;}
  #hud .pmenu-panel .btn{display:block;width:100%;margin-top:10px;}
  #hud .btn.ghost{background:#efe2c0;color:#6e4a20;border-color:#a08050;}
  #hud .btn.ghost:hover{background:#e0cd9f;}
  /* P1-1 成就分享卡 */
  #hud .achieve{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:14px;background:rgba(60,45,20,.5);z-index:62;pointer-events:auto;}
  #hud .achieve img{width:min(300px,72vw);border:4px solid #8a6a44;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.45);}
  #hud .achieve .tip{font-size:13px;color:#f3e8cd;text-shadow:0 1px 3px rgba(0,0,0,.7);}
  #hud .achieve .row{display:flex;gap:12px;}
  #hud .questlog h3{margin:0 0 6px;color:#6e4a20;}
  #hud .questlog .row{display:flex;justify-content:space-between;gap:10px;border-bottom:1px dashed #c8b088;padding:3px 0;}
  #hud .questlog .row.done{color:#5a6e3a;text-decoration:line-through;}
  /* 触屏/小屏适配 */
  @media (pointer:coarse), (max-width:768px){
    #hud .coins{font-size:14px;padding:6px 10px;}
    #hud .coin-ico{width:16px;height:16px;}
    #hud .coin-ico::after{inset:3px;}
    #hud .quest-track{min-width:140px;max-width:180px;padding:6px 10px;font-size:12px;}
    #hud .hint{display:none;}
    #hud canvas.minimap{width:120px;height:120px;}
    #hud .dialogue{width:94vw;padding:12px 14px;font-size:15px;}
    #hud .d-text{font-size:15px;}
    #hud .d-opt{font-size:14px;padding:9px 12px;}
    #hud .prompt{font-size:15px;bottom:10%;padding:8px 14px;}
    #hud .title h1{font-size:40px;}
    #hud .settle{width:92vw;}
    #hud .g-tag{top:96px;font-size:12px;padding:3px 12px;}
    #hud .intro .istep{font-size:15px;min-height:80px;}
    #hud .intro h2{font-size:22px;}
  }
`;

export class HUD {
  constructor() {
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);

    const root = document.createElement('div');
    root.id = 'hud';
    document.body.appendChild(root);
    this.el = root;

    this.build();
    this._lastMinimap = 0;
  }

  build() {
    const h = this.el;
    h.innerHTML = `
      <div class="topbar">
        <div class="panel coins"><span class="coin-ico"></span><span id="coinval">20</span> 文</div>
        <div class="panel quest-track" id="questtrack"><h3>· 任务 ·</h3></div>
        <div class="minimap-wrap"><canvas class="minimap" width="170" height="170" id="minimap"></canvas></div>
      </div>
      <div class="hint">WASD 行走 · Shift 疾跑 · E 交谈/互动<br>V 切换视角 · J 任务 · 鼠标 视角</div>
      <div class="prompt" id="prompt" style="display:none"></div>
      <div class="toast" id="toast"></div>
      <div class="questlog panel" id="questlog" style="display:none"></div>
      <div class="dialogue panel" id="dialogue" style="display:none">
        <div class="d-head"><div class="avatar" id="d-avatar"></div>
          <div><div class="d-name" id="d-name"></div><div class="d-role" id="d-role"></div></div></div>
        <div class="d-text" id="d-text"></div>
        <div class="d-opts" id="d-opts"></div>
      </div>
      <div class="settle panel" id="settle" style="display:none"></div>
      <div class="minigame panel" id="minigame" style="display:none"></div>
      <div class="g-arrow" id="g-arrow" style="display:none">➤</div>
      <div class="g-tag" id="g-tag" style="display:none"></div>
      <div class="intro" id="intro" style="display:none"></div>
      <div class="pausemenu" id="pausemenu" style="display:none">
        <div class="panel pmenu-panel">
          <h2>暂 停</h2>
          <div class="vol-row">音量 <input type="range" id="vol" min="0" max="1" step="0.05"></div>
          <button class="btn" id="pm-continue">继续漫游</button>
          <button class="btn ghost" id="pm-restart">重新开始</button>
          <button class="btn ghost" id="pm-title">返回标题</button>
        </div>
      </div>
      <div class="achieve" id="achieve" style="display:none"></div>
      <div class="title" id="title">
        <h1>汴京漫游</h1>
        <div class="sub">· 清明上河图 · 3D 沉浸画卷 ·</div>
        <div class="controls">
          WASD 行走 · 鼠标 转动视角<br>E 交谈 / 互动 · V 切换第一/第三人称<br>J 任务清单 · Shift 疾跑<br>靠近任务人物即可接任务
        </div>
        <button class="btn big" id="startbtn">进入画卷</button>
      </div>
    `;

    this.cache = {
      coin: h.querySelector('#coinval'),
      questTrack: h.querySelector('#questtrack'),
      minimap: h.querySelector('#minimap'),
      prompt: h.querySelector('#prompt'),
      toast: h.querySelector('#toast'),
      questlog: h.querySelector('#questlog'),
      dialogue: h.querySelector('#dialogue'),
      dAvatar: h.querySelector('#d-avatar'),
      dName: h.querySelector('#d-name'),
      dRole: h.querySelector('#d-role'),
      dText: h.querySelector('#d-text'),
      dOpts: h.querySelector('#d-opts'),
      settle: h.querySelector('#settle'),
      minigame: h.querySelector('#minigame'),
      gArrow: h.querySelector('#g-arrow'),
      gTag: h.querySelector('#g-tag'),
      intro: h.querySelector('#intro'),
      pausemenu: h.querySelector('#pausemenu'),
      achieve: h.querySelector('#achieve'),
      title: h.querySelector('#title'),
    };
    this.dialogueOpen = false;
    this._toastTimer = null;
  }

  // ---- P0-1 任务指引：屏幕边缘箭头 + 距离 ----
  updateGuide(game) {
    const arrow = this.cache.gArrow, tag = this.cache.gTag;
    // 对话/小玩法进行时隐藏指引，避免遮挡
    if (game.hud.dialogueOpen || game.hud._minigameClose) {
      arrow.style.display = 'none'; tag.style.display = 'none'; return;
    }
    const t = game.getGuideTarget();
    if (!t) { arrow.style.display = 'none'; tag.style.display = 'none'; return; }
    const dx = t.x - game.player.px, dz = t.z - game.player.pz;
    const dist = Math.hypot(dx, dz);
    tag.textContent = `☛ ${t.title} · ${dist.toFixed(0)}m`;
    tag.style.display = 'block';
    if (dist < 2.5) { arrow.style.display = 'none'; return; } // 已在目标旁
    // 世界坐标 → 屏幕坐标
    game.camera.updateMatrixWorld(true);
    const v = new THREE.Vector3(t.x, t.y, t.z).project(game.camera);
    const sx = (v.x * 0.5 + 0.5) * innerWidth;
    const sy = (-v.y * 0.5 + 0.5) * innerHeight;
    const cx = innerWidth / 2, cy = innerHeight / 2;
    // 屏幕内侧框内（不贴边）→ 隐藏箭头（目标就在眼前）
    const off = 90;
    if (v.z < 1 && sx > off && sx < innerWidth - off && sy > off && sy < innerHeight - off) {
      arrow.style.display = 'none';
      return;
    }
    // 目标在相机背后时镜像方向，保证箭头指向正确的一侧
    let dirX = sx - cx, dirY = sy - cy;
    if (v.z >= 1) { dirX = -dirX; dirY = -dirY; }
    const ang = Math.atan2(dirY, dirX);
    const margin = 44;
    const halfW = innerWidth / 2 - margin, halfH = innerHeight / 2 - margin;
    const scale = Math.min(
      Math.abs(halfW / Math.max(Math.abs(Math.cos(ang)), 1e-6)),
      Math.abs(halfH / Math.max(Math.abs(Math.sin(ang)), 1e-6))
    );
    const bx = cx + Math.cos(ang) * scale;
    const by = cy + Math.sin(ang) * scale;
    arrow.style.display = 'flex';
    arrow.style.left = bx + 'px';
    arrow.style.top = by + 'px';
    arrow.style.transform = `translate(-50%,-50%) rotate(${ang}rad)`;
  }

  // ---- P0-2 开场引导：剧情 + 操作一屏一讲 ----
  showIntro(game, onDone) {
    const el = this.cache.intro;
    const touch = game.touch && game.touch.enabled;
    const steps = touch ? [
      { h: '汴京 · 序', body: '天禧三年春，你是一位进京赶考的举子，行至汴京城郊，虹桥在望。' },
      { h: '汴京 · 行', body: '汴河如带，市声渐起。桥头货郎朝你招手——似乎正需要帮手。' },
      { h: '操作 · 行走', body: '用<b>左下摇杆</b>行走，<b>右侧拖动</b>转动视角。', keys: '左摇杆 移动<br>右侧 拖动 视角' },
      { h: '操作 · 接任务', body: '靠近带 <b style="color:#a05820">?</b> 标记的人物，点 <b>交谈</b> 即可对话、接任务。', keys: '交谈 / 视角 / 任务 / 菜单 按钮' },
    ] : [
      { h: '汴京 · 序', body: '天禧三年春，你是一位进京赶考的举子，行至汴京城郊，虹桥在望。' },
      { h: '汴京 · 行', body: '汴河如带，市声渐起。桥头货郎朝你招手——似乎正需要帮手。' },
      { h: '操作 · 行走', body: '<b>WASD</b> 行走，<b>Shift</b> 疾跑，<b>鼠标</b> 转动视角。', keys: 'WASD 移动 · Shift 疾跑<br>鼠标 转动视角' },
      { h: '操作 · 接任务', body: '靠近带 <b style="color:#a05820">?</b> 标记的人物，按 <b>E</b> 对话、接任务。', keys: 'E 交谈/互动 · V 切换视角<br>J 任务清单 · 顶部箭头指向目标' },
    ];
    let i = 0;
    const render = () => {
      const s = steps[i];
      el.innerHTML = `
        <div class="ipanel">
          <h2>${s.h}</h2>
          <div class="istep">${s.body}</div>
          ${s.keys ? `<div class="keys">${s.keys}</div>` : ''}
          <div class="dots">${steps.map((_, k) => (k === i ? '●' : '○')).join('')}</div>
          <button class="btn" id="intro-next">${i === steps.length - 1 ? '开始漫游' : '下一页'}</button>
        </div>`;
      el.querySelector('#intro-next').onclick = () => {
        i++;
        if (i < steps.length) render();
        else { el.style.display = 'none'; onDone(); }
      };
    };
    el.style.display = 'flex';
    render();
  }

  // ---- P0-3 暂停/设置菜单 ----
  openPause(game) {
    const el = this.cache.pausemenu;
    el.style.display = 'flex';
    const vol = el.querySelector('#vol');
    vol.value = game.audio.volume || 0;
    vol.oninput = () => game.audio.setVolume(parseFloat(vol.value));
    el.querySelector('#pm-continue').onclick = () => game.togglePause();
    el.querySelector('#pm-restart').onclick = () => location.reload();
    el.querySelector('#pm-title').onclick = () => location.reload();
  }

  closePause() {
    this.cache.pausemenu.style.display = 'none';
  }

  // ---- P1-1 成就分享卡：Canvas 生成卡片图，可保存/长按分享 ----
  showAchievement(game) {
    const c = document.createElement('canvas');
    c.width = 640; c.height = 900;
    const ctx = c.getContext('2d');
    // 羊皮纸底
    const bg = ctx.createLinearGradient(0, 0, 0, 900);
    bg.addColorStop(0, '#f3e8cd'); bg.addColorStop(1, '#e0cd9f');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 640, 900);
    // 双线描框
    ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 8;
    ctx.strokeRect(12, 12, 616, 876);
    ctx.lineWidth = 2; ctx.strokeRect(24, 24, 592, 852);
    ctx.textAlign = 'center';
    // 标题
    ctx.fillStyle = '#5a2c10';
    ctx.font = 'bold 46px "Kaiti SC","KaiTi","STKaiti",serif';
    ctx.fillText('汴京漫游', 320, 108);
    ctx.font = '26px "Kaiti SC","KaiTi",serif';
    ctx.fillStyle = '#8a3a20';
    ctx.fillText('· 画卷集齐 ·', 320, 156);
    // 印章
    ctx.fillStyle = '#a03a28'; ctx.font = 'bold 34px serif';
    ctx.fillText('集', 514, 172);
    ctx.strokeStyle = '#a03a28'; ctx.lineWidth = 3; ctx.strokeRect(488, 126, 54, 54);
    // 游戏实拍（缩小贴入）
    try {
      ctx.save();
      ctx.beginPath(); ctx.rect(40, 190, 560, 300); ctx.clip();
      ctx.drawImage(game.renderer.domElement, 40, 190, 560, 300);
      ctx.restore();
      ctx.strokeStyle = '#a08050'; ctx.lineWidth = 2; ctx.strokeRect(40, 190, 560, 300);
    } catch { /* 无帧时略过截图 */ }
    // 统计
    ctx.fillStyle = '#4a3420';
    ctx.font = '26px "Kaiti SC","KaiTi",serif';
    const rows = [
      `完成任务  ${game.quests.doneCount()} / 8`,
      `声望      ${game.quests.stats.reputation}`,
      `赚得      ${game.quests.stats.coinsEarned} 文`,
      `结识人物  ${game.npcList.length} 位`,
    ];
    let yy = 560;
    for (const r of rows) { ctx.fillText(r, 320, yy); yy += 56; }
    ctx.fillStyle = '#7a5f38';
    ctx.font = '21px "Kaiti SC","KaiTi",serif';
    ctx.fillText('天禧三年 · 汴京城', 320, 820);
    ctx.fillText('—— 清明上河图 3D 漫游 ——', 320, 858);
    const dataUrl = c.toDataURL('image/png');
    const el = this.cache.achieve;
    el.innerHTML = `
      <img src="${dataUrl}" alt="画卷集齐成就卡">
      <div class="tip">${game.touch && game.touch.enabled ? '长按图片即可保存分享' : '右键保存图片 · 或点下方保存'}</div>
      <div class="row">
        <button class="btn" id="ach-dl">保存图片</button>
        <button class="btn ghost" id="ach-close">收下</button>
      </div>`;
    el.style.display = 'flex';
    el.querySelector('#ach-close').onclick = () => { el.style.display = 'none'; };
    el.querySelector('#ach-dl').onclick = () => {
      const a = document.createElement('a');
      a.href = dataUrl; a.download = '汴京漫游画卷.png';
      a.click();
    };
  }

  showTitle(onStart) {
    this.cache.title.querySelector('#startbtn').onclick = () => {
      this.cache.title.style.display = 'none';
      onStart();
    };
  }

  setPrompt(text) {
    const p = this.cache.prompt;
    if (text) { p.innerHTML = text; p.style.display = 'block'; }
    else p.style.display = 'none';
  }

  toast(msg) {
    const t = this.cache.toast;
    t.textContent = msg;
    t.style.opacity = 1;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => (t.style.opacity = 0), 2200);
  }

  update(game) {
    this.cache.coin.textContent = game.inventory.coins;
    const list = game.quests.activeList();
    const ht = this.cache.questTrack;
    ht.innerHTML = '<h3>· 任务 ·</h3>' + (list.length === 0
      ? '<div style="color:#8a7a58;font-size:13px">尚无进行中的任务<br>靠近带 <b style="color:#a05820">?</b> 标记的人接任务</div>'
      : list.map(q => `<div class="qitem">【${q.title}】${q.text}</div>`).join(''));
    this.drawMinimap(game);
  }

  // ---- 对话 ----
  openDialogue(npc, game, pages, onChoose) {
    this.dialogueOpen = true;
    const d = this.cache.dialogue;
    d.style.display = 'block';
    this.cache.dName.textContent = npc.name;
    this.cache.dRole.textContent = roleLabel(npc.def.role);
    this.cache.dAvatar.style.background = `radial-gradient(circle at 35% 30%, ${npc.app.skin}, ${npc.app.skin} 60%, #c9a070)`;
    this._pages = pages;
    this._npc = npc;
    this._game = game;
    this._onChoose = onChoose;
    this._page = 0;
    this._renderPage();
  }

  _renderPage() {
    const page = this._pages[this._page];
    const txt = this.cache.dText;
    const full = page.text;
    txt.textContent = '';
    let i = 0;
    const self = this;
    const timer = setInterval(() => {
      i += 2;
      txt.textContent = full.slice(0, i);
      if (i >= full.length) { clearInterval(timer); }
    }, 18);
    this._typeTimer = timer;
    const opts = this.cache.dOpts;
    opts.innerHTML = '';
    page.options.forEach((opt, idx) => {
      const b = document.createElement('button');
      b.className = 'd-opt';
      b.textContent = opt.label;
      b.onclick = () => {
        if (self._typeTimer) clearInterval(self._typeTimer);
        if (opt.action) opt.action();
        if (self._onChoose) self._onChoose(self._npc, self._game);
      };
      opts.appendChild(b);
    });
  }

  closeDialogue() {
    this.dialogueOpen = false;
    if (this._typeTimer) clearInterval(this._typeTimer);
    this.cache.dialogue.style.display = 'none';
  }

  // ---- 结算 ----
  settle(quest, game) {
    const s = this.cache.settle;
    const items = (quest.reward.items || []).map(it => `${it.n > 1 ? it.n : ''}${it.name}`).join('、');
    s.innerHTML = `
      <h2>任务完成</h2>
      <div class="rew">「${quest.title}」</div>
      <div class="rew">酬劳：<b>${quest.reward.coins || 0} 文</b>${items ? ` · ${items}` : ''}</div>
      <div class="rew" style="font-size:14px;color:#7a5f38">已完成任务 ${game.quests.stats.completed} · 声望 ${game.quests.stats.reputation}</div>
      <button class="btn" id="settle-ok">收下</button>`;
    s.style.display = 'block';
    s.querySelector('#settle-ok').onclick = () => {
      s.style.display = 'none';
      // P1-1：全部任务完成 → 弹「画卷集齐」成就分享卡
      const total = Object.keys(game.quests.state).length;
      if (game.quests.doneCount() >= total) this.showAchievement(game);
    };
  }

  // ---- 任务日志 ----
  toggleQuestLog(game) {
    const el = this.cache.questlog;
    if (el.style.display === 'none') {
      const all = game.quests.state;
      const qrows = Object.entries(all).map(([id, st]) => {
        const def = QUEST_TITLES[id] || { title: id };
        const done = st.status === 'done';
        return `<div class="row ${done ? 'done' : ''}"><span>${def.title}</span><span>${done ? '✓' : (st.status === 'active' ? '…' : '○')}</span></div>`;
      }).join('');
      el.innerHTML = `<h3>· 画卷成就 · 已完成 ${game.quests.doneCount()}/${Object.keys(all).length}</h3>${qrows}`;
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  }

  // ---- 撑船小玩法 ----
  startMinigame(onSuccess, onClose, touch) {
    const m = this.cache.minigame;
    m.innerHTML = `
      <h3 style="margin:0 0 12px;color:#5a2c10">帮船老大撑船过桥</h3>
      <div class="mg-bar"><div class="mg-zone"></div><div class="mg-marker" id="mg-marker"></div></div>
      <div class="mg-prog" id="mg-prog">0 / 5 桨</div>
      <div class="mg-tip">在绿色标区按下 <b>空格</b>${touch && touch.enabled ? '（或点下方推桨）' : ''}</div>`;
    m.style.display = 'block';
    let hits = 0, t = 0, dir = 1, running = true;
    const marker = m.querySelector('#mg-marker');
    const prog = m.querySelector('#mg-prog');
    const zoneL = 39, zoneW = 22;
    let x = 20;
    const hit = () => {
      if (!running) return;
      const inZone = x > zoneL && x < zoneL + zoneW;
      if (inZone) {
        hits++;
        this.toast('稳！');
        if (this._audio) this._audio.blip();
        prog.textContent = `${hits} / 5 桨`;
        if (hits >= 5) {
          running = false;
          if (mgBtn) mgBtn.remove();
          removeEventListener('keydown', keyFn);
          m.style.display = 'none';
          this._minigameClose = null;
          onSuccess();
        }
      } else {
        this.toast('桨偏了，再来');
        if (this._audio) this._audio.click();
      }
    };
    let mgBtn = null;
    if (touch && touch.enabled) mgBtn = touch.minigameButton(hit);
    const keyFn = (e) => { if (e.code === 'Space') hit(); };
    addEventListener('keydown', keyFn);
    const frame = () => {
      if (!running) return;
      x += dir * 55 * 0.016;
      if (x > 96 || x < 2) dir *= -1;
      marker.style.left = x + '%';
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    this._minigameClose = () => { running = false; removeEventListener('keydown', keyFn); m.style.display = 'none'; };
  }

  drawMinimap(game) {
    const c = this.cache.minimap;
    const g = c.getContext('2d');
    const S = 170;
    g.clearRect(0, 0, S, S);
    // 世界范围 → 画布
    const map = (x, z) => [S / 2 + x * (S / 150), S / 2 + z * (S / 150)];
    g.fillStyle = '#efe2c0';
    g.fillRect(0, 0, S, S);
    // 汴河
    g.fillStyle = 'rgba(150,160,120,0.75)';
    const [rx1, rz1] = map(-70, RIVER.zMin);
    const [rx2, rz2] = map(70, RIVER.zMax);
    g.fillRect(rx1, rz1, rx2 - rx1, rz2 - rz1);
    // 虹桥
    g.strokeStyle = '#7a5a34';
    g.lineWidth = 4;
    const [bx1, bz1] = map(-BRIDGE.halfW, BRIDGE.z0);
    const [bx2, bz2] = map(BRIDGE.halfW, BRIDGE.z1);
    g.strokeRect(Math.min(bx1, bx2), Math.min(bz1, bz2), Math.abs(bx2 - bx1), Math.abs(bz2 - bz1));
    // 店铺
    g.fillStyle = 'rgba(170,130,80,0.85)';
    for (const b of BUILDINGS) {
      const [x1, z1] = map(b.x - b.w / 2, b.z - b.d / 2);
      const [x2, z2] = map(b.x + b.w / 2, b.z + b.d / 2);
      g.fillRect(x1, z1, x2 - x1, z2 - z1);
    }
    // 摊位
    g.fillStyle = 'rgba(170,110,70,0.7)';
    for (const s of STALLS) {
      const [x, z] = map(s.x, s.z);
      g.fillRect(x - 2, z - 2, 4, 4);
    }
    // 城门
    g.fillStyle = '#5a4a3a';
    g.fillRect(map(-GATE.passageHalf - 6, GATE.z)[0], map(-6, GATE.z)[1], (GATE.passageHalf + 6) * 2 * (S / 150), 3);
    // NPC
    for (const npc of game.npcList) {
      const [x, z] = map(npc.position.x, npc.position.z);
      g.fillStyle = npc.questMark ? '#c8912a' : '#5a7a4a';
      g.beginPath();
      g.arc(x, z, npc.questMark ? 3.4 : 2.2, 0, Math.PI * 2);
      g.fill();
    }
    // 玩家
    const [px, pz] = map(game.player.px, game.player.pz);
    g.fillStyle = '#b8402a';
    g.beginPath();
    g.arc(px, pz, 4, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#5a2008';
    g.lineWidth = 1.5;
    g.stroke();
    // 任务目标金色点（P0-1）
    const gd = game.getGuideTarget();
    if (gd) {
      const [gx, gz] = map(gd.x, gd.z);
      g.fillStyle = '#ffd76a';
      g.beginPath();
      g.arc(gx, gz, 5.5, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#8a5a16';
      g.lineWidth = 1.5;
      g.stroke();
    }
    // 边框
    g.strokeStyle = '#8a6a44';
    g.lineWidth = 3;
    g.strokeRect(1, 1, S - 2, S - 2);
  }
}

const QUEST_TITLES = {
  bridge_gifts: '桥头干粮', buy_tea: '茶肆茶叶', find_storyteller: '寻访说书人',
  herbs: '大夫的药草', boat_pole: '撑船过桥', gate_message: '城门传话',
  deliver_cloth: '码头送布', attract_customers: '糖人招客',
};

function roleLabel(role) {
  const m = {
    huolang: '货郎', vendor: '摊贩', waiter: '店小二', tea: '茶博士', scholar: '书生',
    monk: '僧人', boatman: '船夫', porter: '脚夫', yamen: '衙役', general: '守将',
    storyteller: '说书人', doctor: '大夫', farmer: '农夫', child: '孩童', official: '官员',
    woman: '女眷', cook: '摊主', acrobat: '卖艺人', guest: '行人', weaver: '掌柜', fish: '渔夫',
  };
  return m[role] || '行人';
}
