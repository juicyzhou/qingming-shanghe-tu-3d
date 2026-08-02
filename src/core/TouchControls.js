import { isTouchDevice } from './touch.js';

const CSS = `
  .t-joy{position:fixed;z-index:45;left:20px;bottom:26px;width:120px;height:120px;border-radius:50%;
    background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.4);pointer-events:auto;touch-action:none;}
  .t-joy-k{position:absolute;left:50%;top:50%;width:54px;height:54px;border-radius:50%;margin:-27px 0 0 -27px;
    background:rgba(255,255,255,.28);border:2px solid rgba(255,255,255,.5);transition:transform .04s;}
  .t-look{position:fixed;z-index:44;right:0;top:0;width:58%;height:100%;pointer-events:auto;touch-action:none;}
  .t-btn{position:fixed;z-index:46;width:62px;height:62px;border-radius:50%;border:2px solid rgba(255,255,255,.5);
    background:rgba(70,45,20,.4);color:#f3e8cd;font-family:"Kaiti SC","KaiTi",serif;font-size:14px;
    display:flex;align-items:center;justify-content:center;pointer-events:auto;user-select:none;-webkit-user-select:none;
    box-shadow:0 2px 8px rgba(0,0,0,.3);}
  .t-e{right:22px;bottom:118px;background:rgba(140,58,32,.6);}
  .t-v{right:22px;top:86px;}
  .t-j{right:100px;top:86px;}
  .t-mg{position:fixed;z-index:47;left:50%;bottom:22%;transform:translateX(-50%);width:180px;height:64px;
    border-radius:16px;border:2px solid #f3e8cd;background:rgba(140,58,32,.75);color:#f3e8cd;
    font-family:"Kaiti SC","KaiTi",serif;font-size:20px;letter-spacing:4px;pointer-events:auto;}
`;

function el(tag, cls, text) {
  const d = document.createElement(tag);
  d.className = cls;
  if (text) d.textContent = text;
  return d;
}

// 触屏控制：左虚拟摇杆移动 + 右侧拖动看视角 + 交互/视角/任务按钮
export class TouchControls {
  constructor(input) {
    this.input = input;
    this.enabled = isTouchDevice();
    if (!this.enabled) return;
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);

    this.joyBase = el('div', 't-joy');
    this.joyKnob = el('div', 't-joy-k');
    this.joyBase.appendChild(this.joyKnob);
    document.body.appendChild(this.joyBase);

    this.look = el('div', 't-look');
    document.body.appendChild(this.look);

    this.btnE = el('button', 't-btn t-e', '交谈');
    this.btnV = el('button', 't-btn t-v', '视角');
    this.btnJ = el('button', 't-btn t-j', '任务');
    document.body.appendChild(this.btnE);
    document.body.appendChild(this.btnV);
    document.body.appendChild(this.btnJ);
    this.btnE.addEventListener('click', (e) => { e.preventDefault(); input.tapKey('KeyE'); });
    this.btnV.addEventListener('click', (e) => { e.preventDefault(); input.tapKey('KeyV'); });
    this.btnJ.addEventListener('click', (e) => { e.preventDefault(); input.tapKey('KeyJ'); });

    this._bindJoystick();
    this._bindLook();
  }

  // 撑船等小玩法：显示一个大按钮，点击触发空格
  minigameButton(onTap) {
    if (!this.enabled) return null;
    const b = el('button', 't-mg', '推 桨');
    b.addEventListener('click', (e) => { e.preventDefault(); onTap(); });
    document.body.appendChild(b);
    return b;
  }

  _bindJoystick() {
    const R = 52;
    const clear = () => {
      this._joyOrigin = null;
      this.joyKnob.style.transform = 'translate(0,0)';
      for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD']) this.input.keys.delete(k);
    };
    this.joyBase.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      this._joyOrigin = { x: t.clientX, y: t.clientY };
      e.preventDefault();
    }, { passive: false });
    this.joyBase.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      if (!this._joyOrigin) return;
      let dx = t.clientX - this._joyOrigin.x;
      let dy = t.clientY - this._joyOrigin.y;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
      this.joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
      const vx = dx / R, vy = dy / R;
      for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD']) this.input.keys.delete(k);
      const dead = 0.28;
      if (vy < -dead) this.input.keys.add('KeyW');
      if (vy > dead) this.input.keys.add('KeyS');
      if (vx > dead) this.input.keys.add('KeyD');
      if (vx < -dead) this.input.keys.add('KeyA');
      e.preventDefault();
    }, { passive: false });
    this.joyBase.addEventListener('touchend', clear);
    this.joyBase.addEventListener('touchcancel', clear);
  }

  _bindLook() {
    let lx = 0, ly = 0, active = false;
    this.look.addEventListener('touchstart', (e) => {
      active = true;
      const t = e.touches[0];
      lx = t.clientX; ly = t.clientY;
      e.preventDefault();
    }, { passive: false });
    this.look.addEventListener('touchmove', (e) => {
      if (!active) return;
      const t = e.touches[0];
      const dx = t.clientX - lx, dy = t.clientY - ly;
      this.input.mouse.dx += dx * 5;
      this.input.mouse.dy += dy * 5;
      lx = t.clientX; ly = t.clientY;
      e.preventDefault();
    }, { passive: false });
    const end = () => { active = false; };
    this.look.addEventListener('touchend', end);
    this.look.addEventListener('touchcancel', end);
  }
}
