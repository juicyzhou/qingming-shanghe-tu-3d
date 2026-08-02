// 键盘 / 鼠标 / 指针锁定 输入管理
import { isTouchDevice } from './touch.js';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();   // 边沿触发，每帧结束清空
    this.mouse = { dx: 0, dy: 0, x: 0, y: 0, down: false };
    this.locked = false;
    this.suspendLock = false; // 对话/屋内时暂停自动锁定，保证鼠标可点 UI

    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      this.pressed.add(e.code);
      // 常见功能键拦截
      if (['Space', 'KeyV', 'KeyE', 'KeyJ', 'KeyM'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));

    canvas.addEventListener('mousemove', (e) => {
      this.mouse.dx += e.movementX || 0;
      this.mouse.dy += e.movementY || 0;
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    canvas.addEventListener('mousedown', (e) => {
      this.mouse.down = true;
      this.pressed.add('Mouse0');
    });
    addEventListener('mouseup', () => { this.mouse.down = false; });

    canvas.addEventListener('click', () => {
      if (!isTouchDevice() && !this.suspendLock && !this.locked) this.requestLock();
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
    });
  }

  requestLock() {
    if (this.locked) return;
    try {
      const p = this.canvas.requestPointerLock && this.canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    } catch { /* 无手势时忽略 */ }
  }
  exitLock() {
    if (this.locked) document.exitPointerLock();
  }

  isDown(code) { return this.keys.has(code); }
  wasPressed(code) { return this.pressed.has(code); }
  // 触屏按钮：模拟一次按键
  tapKey(code) {
    this.keys.add(code);
    this.pressed.add(code);
  }

  endFrame() {
    this.mouse.dx = 0;
    this.mouse.dy = 0;
    this.pressed.clear();
  }
}
