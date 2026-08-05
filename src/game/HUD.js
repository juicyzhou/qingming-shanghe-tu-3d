import * as THREE from 'three';
import { BUILDINGS, STALLS, RIVER, BRIDGE } from '../world/layout.js';
import { LANDMARKS } from '../data/landmarks.js';
import { LANTERN_RIDDLES, STORIES } from '../data/minigames.js';

const CSS = `
  #hud *{box-sizing:border-box;user-select:none;-webkit-user-select:none;}
  #hud{position:fixed;inset:0;pointer-events:none;font-family:"Kaiti SC","KaiTi","STKaiti","FangSong","SimSun",serif;color:#3a2c1a;z-index:50;}
  #hud .panel{background:linear-gradient(160deg,#f3e8cd,#e7d7b4);border:3px solid #8a6a44;border-radius:10px;
    box-shadow:0 4px 14px rgba(70,50,20,.35), inset 0 0 0 1px rgba(255,250,230,.5);}
  #hud .topbar{position:absolute;top:12px;left:14px;right:14px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;}
  #hud .rep-coins{display:flex;flex-direction:column;align-items:flex-start;padding:7px 12px;gap:3px;}
  #hud .rep-coins .rep{font-size:13px;font-weight:bold;color:#8a3a20;line-height:1.2;white-space:nowrap;}
  #hud .coins{display:flex;align-items:center;gap:6px;font-size:17px;font-weight:bold;line-height:1;}
  #hud .coin-ico{width:20px;height:20px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ffd76a,#c8912a 70%);box-shadow:0 1px 3px rgba(0,0,0,.4);position:relative;}
  #hud .coin-ico::after{content:"";position:absolute;inset:5px;border-radius:50%;border:1.5px dashed #8a5a16;}
  #hud .quest-track{min-width:210px;max-width:320px;padding:10px 14px;font-size:14px;line-height:1.7;}
  #hud .quest-track h3{margin:0 0 4px;font-size:15px;color:#6e4a20;border-bottom:1px dashed #a08050;padding-bottom:3px;}
  #hud .quest-track .qitem{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  #hud .quest-track .qitem.done{color:#5a6e3a;}
  #hud .minimap-wrap{text-align:right;}
  #hud canvas.minimap{width:150px;height:150px;background:#efe2c0;border:3px solid #8a6a44;border-radius:8px;box-shadow:0 4px 12px rgba(70,50,20,.3);}
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
  #hud .questlog{position:absolute;top:80px;left:14px;width:320px;max-height:62vh;overflow:auto;padding:14px 16px;font-size:14px;line-height:1.8;}
  /* P2-3 打卡图鉴 */
  #hud .lmbox{margin-top:14px;border-top:2px dashed #b09058;padding-top:10px;}
  #hud .lmbox canvas{display:block;margin:8px auto 4px;border:2px solid #8a6a44;border-radius:6px;background:#f6ecce;}
  #hud .lm-list{font-size:12px;line-height:2;color:#8a7a58;}
  #hud .lm-list .got{color:#a05820;font-weight:bold;}
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
  /* P2-1 听书点唱 */
  #hud .story{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,92vw);padding:24px 28px;text-align:center;}
  #hud .story h2{color:#5a2c10;font-size:24px;letter-spacing:4px;margin:0 0 14px;}
  #hud .story .s-lines{font-size:17px;line-height:2;color:#4a3420;min-height:96px;display:flex;align-items:center;justify-content:center;}
  #hud .story .s-opts{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:14px;}
  #hud .story .s-opts .btn{margin-top:0;padding:8px 22px;font-size:15px;}
  #hud .story .s-titles{display:flex;flex-direction:column;gap:8px;}
  #hud .story .s-title{pointer-events:auto;cursor:pointer;padding:12px 18px;font-size:17px;font-family:inherit;
    background:#efe2c0;border:2px solid #a08050;border-radius:8px;color:#3a2c1a;}
  #hud .story .s-title:hover{background:#e0cd9f;}
  /* P2-1 夜市猜灯谜 */
  #hud .riddle{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(520px,92vw);padding:26px 30px;text-align:center;}
  #hud .riddle h2{color:#8a3a20;font-size:22px;letter-spacing:4px;margin:0 0 8px;}
  #hud .riddle .r-prog{font-size:13px;color:#7a5f38;margin-bottom:12px;}
  #hud .riddle .r-q{font-size:18px;line-height:1.9;color:#4a3420;margin-bottom:16px;min-height:54px;}
  #hud .riddle .r-opts{display:flex;flex-direction:column;gap:8px;}
  #hud .riddle .r-opt{pointer-events:auto;cursor:pointer;padding:11px 16px;font-size:16px;font-family:inherit;
    background:#efe2c0;border:2px solid #a08050;border-radius:8px;color:#3a2c1a;}
  #hud .riddle .r-opt:hover{background:#e0cd9f;}
  /* P2-1 撑船竞速 */
  #hud .race{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,92vw);padding:22px 26px;text-align:center;}
  #hud .race h2{color:#5a2c10;font-size:22px;letter-spacing:4px;margin:0 0 12px;}
  #hud .race .lane{display:flex;align-items:center;gap:10px;margin:7px 0;}
  #hud .race .lane .lname{width:56px;font-size:14px;color:#6e4a20;flex:none;}
  #hud .race .lane .track{position:relative;flex:1;height:26px;background:#cfe0cc;border:2px solid #6a7a5a;border-radius:6px;overflow:hidden;}
  #hud .race .lane .boat{position:absolute;left:0;top:0;bottom:0;width:26px;background:#b8402a;border-radius:4px 4px 4px 4px;transition:left .05s;}
  #hud .race .lane .boat.oppo{background:#4a6a8a;}
  #hud .race .finish{position:absolute;right:-2px;top:-2px;bottom:-2px;width:3px;background:#5a2008;}
  #hud .race .mg-prog{margin-top:10px;}
  #hud .race .t-push{position:fixed;left:50%;bottom:22%;transform:translateX(-50%);width:170px;height:60px;
    border-radius:16px;border:2px solid #f3e8cd;background:rgba(140,58,32,.8);color:#f3e8cd;
    font-family:inherit;font-size:20px;letter-spacing:4px;pointer-events:auto;z-index:63;}
  /* P3-4 体验数据面板 */
  #hud .analytics{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
    z-index:61;background:rgba(60,45,20,.42);pointer-events:auto;}
  #hud .analytics h2{margin:0 0 12px;color:#5a2c10;font-size:22px;letter-spacing:4px;}
  #hud .analytics table{width:100%;font-size:15px;line-height:2;color:#4a3420;border-collapse:collapse;}
  #hud .analytics td{padding:2px 0;border-bottom:1px dashed #c8b088;}
  #hud .analytics td:last-child{text-align:right;color:#8a3a20;font-weight:bold;}
  #hud .analytics .row{display:flex;gap:10px;justify-content:center;margin-top:14px;}
  /* 主线结局 */
  #hud .ending{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
    z-index:63;background:radial-gradient(ellipse at 50% 45%,rgba(240,228,200,.98),rgba(200,178,140,.99));pointer-events:auto;}
  #hud .ending .ending-panel{width:min(520px,92vw);padding:34px 38px;text-align:center;}
  #hud .ending h2{color:#8a3a20;font-size:34px;letter-spacing:10px;margin:0 0 18px;}
  #hud .ending .e-text{font-size:18px;line-height:2.2;color:#4a3420;text-align:left;}
  #hud .ending .e-text b{color:#a03a28;font-size:22px;letter-spacing:4px;}
  #hud .ending .e-stats{margin-top:20px;font-size:15px;color:#7a5f38;line-height:1.9;border-top:2px dashed #b09058;padding-top:12px;}
  #hud .ending .row{display:flex;gap:12px;justify-content:center;margin-top:18px;}
  #hud .questlog h3{margin:0 0 6px;color:#6e4a20;}
  #hud .questlog .row{display:flex;justify-content:space-between;gap:10px;border-bottom:1px dashed #c8b088;padding:3px 0;}
  #hud .questlog .row.done{color:#5a6e3a;text-decoration:line-through;}
  /* 触屏/小屏适配 */
  @media (pointer:coarse), (max-width:768px){
    #hud .rep-coins{padding:6px 10px;}
    #hud .rep-coins .rep{font-size:12px;}
    #hud .coins{font-size:14px;}
    #hud .coin-ico{width:16px;height:16px;}
    #hud .coin-ico::after{inset:3px;}
    #hud .quest-track{min-width:110px;max-width:150px;padding:6px 10px;font-size:12px;}
    #hud .hint{display:none;}
    #hud canvas.minimap{width:140px;height:140px;}
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
        <div class="panel rep-coins">
          <div class="rep" id="rep">白衣书生</div>
          <div class="coins"><span class="coin-ico"></span><span id="coinval">20</span> 文</div>
        </div>
        <div class="panel quest-track" id="questtrack"><h3>· 任务 ·</h3></div>
        <div class="minimap-wrap"><canvas class="minimap" width="200" height="200" id="minimap"></canvas></div>
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
      <div class="story panel" id="story" style="display:none"></div>
      <div class="riddle panel" id="riddle" style="display:none"></div>
      <div class="race panel" id="race" style="display:none"></div>
      <div class="g-arrow" id="g-arrow" style="display:none">➤</div>
      <div class="g-tag" id="g-tag" style="display:none"></div>
      <div class="intro" id="intro" style="display:none"></div>
      <div class="pausemenu" id="pausemenu" style="display:none">
        <div class="panel pmenu-panel">
          <h2>暂 停</h2>
          <div class="vol-row">音量 <input type="range" id="vol" min="0" max="1" step="0.05"></div>
          <button class="btn ghost" id="pm-outline" style="display:none">墨线描边：开</button>
          <button class="btn" id="pm-continue">继续漫游</button>
          <button class="btn ghost" id="pm-restart">重新开始</button>
          <button class="btn ghost" id="pm-title">返回标题</button>
        </div>
      </div>
      <div class="achieve" id="achieve" style="display:none"></div>
      <div class="analytics" id="analytics" style="display:none"></div>
      <div class="ending" id="ending" style="display:none"></div>
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
      rep: h.querySelector('#rep'),
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
      story: h.querySelector('#story'),
      riddle: h.querySelector('#riddle'),
      race: h.querySelector('#race'),
      gArrow: h.querySelector('#g-arrow'),
      gTag: h.querySelector('#g-tag'),
      intro: h.querySelector('#intro'),
      pausemenu: h.querySelector('#pausemenu'),
      achieve: h.querySelector('#achieve'),
      analytics: h.querySelector('#analytics'),
      ending: h.querySelector('#ending'),
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
    // P1-5 墨线描边开关（仅桌面/有描边 pass 时显示）
    const ob = el.querySelector('#pm-outline');
    if (game.composer && game.composer.outlinePass) {
      const sync = () => { ob.textContent = `墨线描边：${game.outlineOn() ? '开' : '关'}`; };
      sync();
      ob.style.display = 'block';
      ob.onclick = () => { game.setOutline(!game.outlineOn()); sync(); };
    }
  }

  closePause() {
    this.cache.pausemenu.style.display = 'none';
  }

  // ---- P3-4 体验数据面板（本地埋点，?analytics=1 打开） ----
  showAnalytics(game) {
    const el = this.cache.analytics;
    const m = game.analytics.metrics();
    el.innerHTML = `
      <div class="panel">
        <h2>体验数据 · 本地</h2>
        <table>
          <tr><td>总会话</td><td>${m.sessions}</td></tr>
          <tr><td>平均停留</td><td>${fmtDuration(m.avgMs)}</td></tr>
          <tr><td>累计停留</td><td>${fmtDuration(m.totalMs)}</td></tr>
          <tr><td>接首任务的会话</td><td>${m.accepted1}（${m.acceptRate}）</td></tr>
          <tr><td>完成首任务的会话</td><td>${m.completed1}</td></tr>
          <tr><td>首任务完成率</td><td>${m.firstQuestRate}</td></tr>
          <tr><td>累计完成任务</td><td>${m.questsDone}</td></tr>
          <tr><td>进店次数</td><td>${m.interiors}</td></tr>
          <tr><td>小玩法获胜</td><td>${m.minigameWins}</td></tr>
          <tr><td>灯谜破解</td><td>${m.riddlesSolved}</td></tr>
          <tr><td>画卷图鉴集齐</td><td>${m.allLandmarks} 次</td></tr>
        </table>
        <div class="row">
          <button class="btn" id="an-exp">导出 JSON</button>
          <button class="btn ghost" id="an-reset">清空</button>
          <button class="btn ghost" id="an-close">关闭</button>
        </div>
      </div>`;
    el.style.display = 'flex';
    el.querySelector('#an-close').onclick = () => { el.style.display = 'none'; };
    el.querySelector('#an-reset').onclick = () => { game.analytics.reset(); this.showAnalytics(game); };
    el.querySelector('#an-exp').onclick = () => {
      const a = document.createElement('a');
      a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(game.analytics.metrics(), null, 2));
      a.download = '汴京漫游体验数据.json';
      a.click();
    };
  }

  // ---- 主线结局：进京赶考完成 ----
  showEnding(game) {
    const el = this.cache.ending;
    el.innerHTML = `
      <div class="panel ending-panel">
        <h2>金榜题名</h2>
        <div class="e-text">
          你备好书稿、路引与盘缠，在汴河口登上了东行的客船。<br>
          回望虹桥渐远，汴河的灯影碎成一片金光……<br><br>
          三月之后，春闱放榜。你拨开人潮，抬头去看——<br>
          <b>「汴京漫游 · 金榜题名」</b>
        </div>
        <div class="e-stats">
          完成任务 ${game.quests.stats.completed}/${Object.keys(game.quests.state).length}
          · 打卡 ${game.landmarksCollected.size}/12
          · 声望 ${reputationTitle(game.quests.stats.reputation)}
          · 余钱 ${game.inventory.coins} 文
        </div>
        <div class="row">
          <button class="btn" id="e-share">分享这一刻</button>
          <button class="btn ghost" id="e-stay">再游汴京</button>
        </div>
      </div>`;
    el.style.display = 'flex';
    el.querySelector('#e-stay').onclick = () => { el.style.display = 'none'; };
    el.querySelector('#e-share').onclick = () => this.showAchievement(game, 'quests');
  }

  // ---- P1-1 成就分享卡：Canvas 生成卡片图，可保存/长按分享 ----
  // mode: 'quests'（全任务完成）/ 'landmarks'（打卡图鉴集齐）/ 'painting'（珍藏画卷）
  showAchievement(game, mode = 'quests') {
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
    ctx.fillText(
      mode === 'landmarks' ? '· 画卷图鉴 · 集齐'
        : (mode === 'painting' ? '· 珍藏画卷 · 集齐' : '· 画卷集齐 ·'),
      320, 156);
    // 印章
    ctx.fillStyle = '#a03a28'; ctx.font = 'bold 34px serif';
    ctx.fillText(mode === 'landmarks' ? '览' : (mode === 'painting' ? '藏' : '集'), 514, 172);
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
    const total = Object.keys(game.quests.state).length;
    const rows = mode === 'landmarks'
      ? [
        `打卡景点  ${game.landmarksCollected.size} / ${LANDMARKS.length}`,
        `完成任务  ${game.quests.doneCount()} / ${total}`,
        `声望      ${game.quests.stats.reputation}`,
        `赚得      ${game.quests.stats.coinsEarned} 文`,
      ]
      : mode === 'painting'
        ? [
          `珍藏画卷  ${game.paintingPieces} / 5`,
          `完成任务  ${game.quests.doneCount()} / ${total}`,
          `打卡景点  ${game.landmarksCollected.size} / ${LANDMARKS.length}`,
          `声望      ${game.quests.stats.reputation}`,
        ]
        : [
          `完成任务  ${game.quests.doneCount()} / ${total}`,
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
    // 声望称号（铜钱上方，原时辰栏已移除）
    this.cache.rep.textContent = reputationTitle(game.quests.stats.reputation);
    const list = game.quests.activeList();
    const ht = this.cache.questTrack;
    ht.innerHTML = '<h3>· 任务 ·</h3>' + (list.length === 0
      ? '<div style="color:#8a7a58;font-size:13px">尚无进行中的任务<br>靠近带 <b style="color:#a05820">?</b> 标记的人接任务</div>'
      : list.map(q => `<div class="qitem">【${q.title}】${q.text}</div>`).join(''));
    this.drawMinimap(game);
  }

  // P2-3 打卡图鉴滚动条：横向画卷 + 12 枚印章
  drawLandmarksScroll(game) {
    const c = document.getElementById('lm-canvas');
    if (!c) return;
    const g = c.getContext('2d');
    const W = c.width, H = c.height;
    g.clearRect(0, 0, W, H);
    // 画卷底
    g.fillStyle = '#f6ecce';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = '#8a6a44'; g.lineWidth = 2;
    g.strokeRect(2, 2, W - 4, H - 4);
    // 每景一印章
    const n = LANDMARKS.length;
    const cell = (W - 16) / n;
    LANDMARKS.forEach((lm, i) => {
      const got = game.landmarksCollected.has(lm.id);
      const x = 8 + i * cell + cell / 2;
      const y = H / 2;
      // 章体
      g.save();
      g.translate(x, y);
      if (got) {
        g.fillStyle = '#a03a28';
        g.fillRect(-12, -12, 24, 24);
        g.fillStyle = '#f6ecce';
        g.font = 'bold 13px serif';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('汴', 0, 1);
      } else {
        g.strokeStyle = '#c0a878';
        g.lineWidth = 1.5;
        g.strokeRect(-12, -12, 24, 24);
      }
      g.restore();
    });
  }

  // ---- 对话 ----
  openDialogue(npc, game, pages, onChoose) {
    this.dialogueOpen = true;
    if (this._audio) this._audio.flip(); // P1-4 翻页
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
    if (this._page > 0 && this._audio) this._audio.flip(); // P1-4 翻页
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

  // ---- P2-1 听书点唱：选段 → 逐句讲 → 鼓掌/打赏 ----
  openStory(game) {
    const el = this.cache.story;
    el.style.display = 'block';
    el.innerHTML = `
      <h2>说书棚 · 点唱</h2>
      <div class="s-titles">
        ${STORIES.map((s, i) => `<button class="s-title" data-i="${i}">《${s.title}》</button>`).join('')}
      </div>`;
    el.querySelectorAll('.s-title').forEach(b => {
      b.onclick = () => this._playStory(game, parseInt(b.dataset.i, 10));
    });
  }

  _playStory(game, i) {
    const s = STORIES[i];
    const el = this.cache.story;
    let line = 0;
    const render = () => {
      const isLast = line === s.lines.length - 1;
      el.innerHTML = `
        <h2>《${s.title}》</h2>
        <div class="s-lines">${s.lines[line]}</div>
        <div class="s-opts">
          ${isLast
            ? '<button class="btn" id="s-tip">打赏十文</button><button class="btn ghost" id="s-applaud">鼓掌叫好</button>'
            : '<button class="btn" id="s-next">下一句</button>'}
          <button class="btn ghost" id="s-close">告辞</button>
        </div>`;
      el.querySelector('#s-close').onclick = () => { el.style.display = 'none'; };
      if (!isLast) {
        el.querySelector('#s-next').onclick = () => { line++; render(); };
      } else {
        el.querySelector('#s-tip').onclick = () => { game.storyReward('tip'); el.style.display = 'none'; };
        el.querySelector('#s-applaud').onclick = () => { game.storyReward('applaud'); el.style.display = 'none'; };
      }
    };
    render();
  }

  // ---- P2-1 夜市猜灯谜：6 题池，答对得钱，集齐全解 ----
  openLanternRiddle(game) {
    const el = this.cache.riddle;
    let idx = -1;
    for (let i = 0; i < LANTERN_RIDDLES.length; i++) {
      if (!game.lanternRiddles.has(i)) { idx = i; break; }
    }
    if (idx === -1) { // 全解
      el.innerHTML = `<h2>夜市灯谜</h2>
        <div class="r-q">六盏灯谜尽数解破，今夜的汴京灯火通明。</div>
        <button class="btn" id="r-close">赏灯去</button>`;
      el.style.display = 'block';
      el.querySelector('#r-close').onclick = () => { el.style.display = 'none'; };
      return;
    }
    const r = LANTERN_RIDDLES[idx];
    el.style.display = 'block';
    el.innerHTML = `
      <h2>夜市灯谜</h2>
      <div class="r-prog">已解 ${game.lanternRiddles.size}/${LANTERN_RIDDLES.length}</div>
      <div class="r-q">${r.q}</div>
      <div class="r-opts">
        ${r.choices.map((c, i) => `<button class="r-opt" data-a="${i}">${c}</button>`).join('')}
      </div>`;
    el.querySelectorAll('.r-opt').forEach(b => {
      b.onclick = () => {
        if (parseInt(b.dataset.a, 10) === r.a) {
          game.answerLanternRiddle(idx);
          el.style.display = 'none';
        } else {
          if (this._audio) this._audio.click();
          b.style.opacity = '0.35';
          b.style.pointerEvents = 'none';
          this.toast('灯笼晃了晃：不对不对');
        }
      };
    });
  }

  // ---- P2-1 撑船竞速：比手速，先到岸者胜 ----
  startRace(game) {
    const el = this.cache.race;
    el.style.display = 'block';
    const TOUCH = game.touch && game.touch.enabled;
    el.innerHTML = `
      <h2>汴河竞速</h2>
      <div class="lane"><span class="lname">你的舟</span><div class="track"><div class="boat" id="rc-you"></div><div class="finish"></div></div></div>
      <div class="lane"><span class="lname">王桨手</span><div class="track"><div class="boat oppo" id="rc-oppo"></div><div class="finish"></div></div></div>
      <div class="mg-prog" id="rc-prog">${TOUCH ? '连点「推桨」' : '连按 空格'} 先到岸者胜</div>`;
    let you = 0, oppo = 0, running = true;
    const GOAL = 10;
    const youEl = el.querySelector('#rc-you'), oppoEl = el.querySelector('#rc-oppo');
    const prog = el.querySelector('#rc-prog');
    const setPos = (boat, v) => { boat.style.left = Math.min(96, v / GOAL * 96) + '%'; };
    let pushBtn = null;
    const end = (win) => {
      if (!running) return;
      running = false;
      clearInterval(timer);
      removeEventListener('keydown', keyFn);
      if (pushBtn) pushBtn.remove();
      prog.textContent = win ? '你赢了！' : '对手先到岸…';
      el.style.display = 'none';
      this._minigameClose = null;
      game.finishRace(win);
    };
    const push = () => {
      if (!running) return;
      you += 1 + Math.random() * 1.2;
      setPos(youEl, you);
      if (this._audio) this._audio.blip();
      if (you >= GOAL) end(true);
    };
    if (TOUCH) {
      pushBtn = document.createElement('button');
      pushBtn.className = 't-push'; pushBtn.textContent = '推 桨';
      pushBtn.addEventListener('click', (e) => { e.preventDefault(); push(); });
      document.body.appendChild(pushBtn);
    }
    const keyFn = (e) => { if (e.code === 'Space') { e.preventDefault(); push(); } };
    addEventListener('keydown', keyFn);
    const timer = setInterval(() => { // 对手自动前进
      if (!running) return;
      oppo += 0.9 + Math.random() * 0.5;
      setPos(oppoEl, oppo);
      if (oppo >= GOAL) end(false);
    }, 700);
    this._minigameClose = () => {
      running = false; clearInterval(timer);
      removeEventListener('keydown', keyFn);
      if (pushBtn) pushBtn.remove();
      el.style.display = 'none';
      this._minigameClose = null;
    };
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
    if (this._audio) this._audio.stamp(); // P1-4 盖章落款
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
      const got = game.landmarksCollected.size;
      const lmList = LANDMARKS.map(lm =>
        `<span class="${game.landmarksCollected.has(lm.id) ? 'got' : ''}">${lm.name}${game.landmarksCollected.has(lm.id) ? '✓' : '·'}</span>`).join(' ');
      el.innerHTML = `<h3>· 画卷成就 · 已完成 ${game.quests.doneCount()}/${Object.keys(all).length}</h3>${qrows}
        <div class="lmbox">
          <h3>· 打卡图鉴 · ${got}/${LANDMARKS.length}</h3>
          <canvas id="lm-canvas" width="270" height="52"></canvas>
          <div class="lm-list">${lmList}</div>
        </div>`;
      el.style.display = 'block';
      this.drawLandmarksScroll(game);
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
    const S = c.width; // 200，更高分辨率更清晰
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
  inn_wood: '客栈添柴', tavern_wine: '醉仙楼送酒', rice_deliver: '米铺送粮',
  riddle: '卦摊猜谜', storyteller_script: '说书人新书',
  main_exam: '进京赶考',
};

// 声望等级与称号（供 HUD/Game 共用）
export function reputationLevel(rep) {
  if (rep >= 100) return 3;
  if (rep >= 60) return 2;
  if (rep >= 30) return 1;
  return 0;
}
export function reputationTitle(rep) {
  return ['白衣书生', '小有名声', '汴京熟客', '满城传扬'][reputationLevel(rep)];
}

// P3-4 毫秒 → 「X分Y秒」
function fmtDuration(ms) {
  const sec = Math.max(0, Math.round((ms || 0) / 1000));
  return `${Math.floor(sec / 60)}分${sec % 60}秒`;
}

function roleLabel(role) {
  const m = {
    huolang: '货郎', vendor: '摊贩', waiter: '店小二', tea: '茶博士', scholar: '书生',
    monk: '僧人', boatman: '船夫', porter: '脚夫', yamen: '衙役', general: '守将',
    storyteller: '说书人', doctor: '大夫', farmer: '农夫', child: '孩童', official: '官员',
    woman: '女眷', cook: '摊主', acrobat: '卖艺人', guest: '行人', weaver: '掌柜', fish: '渔夫',
  };
  return m[role] || '行人';
}
