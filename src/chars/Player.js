import * as THREE from 'three';
import { Character } from './Character.js';
import { playerAppearance } from './appearance.js';
import { tryMove, groundHeight } from '../world/layout.js';

const WALK = 3.2, RUN = 5.4;

export class Player extends Character {
  constructor() {
    super(playerAppearance());
    this.isPlayer = true;
    this.viewMode = 3;              // 3=第三人称 1=第一人称
    this.yaw = Math.PI;             // 视角水平角（0 朝 +z）
    this.pitch = -0.12;
    this.px = 0;                    // 世界坐标
    this.pz = -18;
    this.speed = 0;
    this.camPos = new THREE.Vector3(0, 2.2, -14); // 相机平滑缓冲
    this.stepAcc = 0;
    this.setHeading(Math.PI); // 初始面向城门方向（-z）
    this.inside = null; // 当前所在的店铺内室
  }

  toggleView() {
    this.viewMode = this.viewMode === 3 ? 1 : 3;
    this.pitch = -0.12;
  }

  get groundY() { return this.inside ? 0 : groundHeight(this.px, this.pz); }

  // 头部位置（第一人称眼睛/第三人称注视点）
  headPos(target) {
    target.set(this.px, this.groundY + this.H * 0.94, this.pz);
    return target;
  }

  update(dt, input) {
    // ---- 视角（右移鼠标/右拖 → 右转） ----
    const sens = 0.0021;
    this.yaw -= input.mouse.dx * sens;
    this.pitch -= input.mouse.dy * sens;
    this.pitch = Math.max(-0.9, Math.min(0.6, this.pitch));

    // ---- 移动：角色右侧 = 前向 F × 上向 U = (−cos yaw, 0, sin yaw) ----
    const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const right = new THREE.Vector3(-Math.cos(this.yaw), 0, Math.sin(this.yaw));
    const dir = new THREE.Vector3();
    if (input.isDown('KeyW')) dir.add(fwd);
    if (input.isDown('KeyS')) dir.sub(fwd);
    if (input.isDown('KeyD')) dir.add(right);
    if (input.isDown('KeyA')) dir.sub(right);

    const run = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    const speed = run ? RUN : WALK;
    const moving = dir.lengthSq() > 0.001;
    dir.normalize();

    if (moving) {
      const [mx, mz] = tryMove(this.px, this.pz, dir.x * speed * dt, dir.z * speed * dt, 0.38);
      const dist = Math.hypot(mx - this.px, mz - this.pz);
      this.px = mx; this.pz = mz;
      this.setHeading(Math.atan2(dir.x, dir.z));
      this.stepAcc += dist;
      if (this.stepAcc > 0.9) { this.stepAcc = 0; if (this.onStep) this.onStep(); }
    } else {
      this.stepAcc = 0;
    }

    this.position.x = this.px;
    this.position.z = this.pz;
    this.position.y = this.groundY;
    super.update(dt, moving ? (run ? RUN : WALK) : 0);

    // ---- 相机 ----
    this._applyCamera(dt);
  }

  _applyCamera(dt) {
    const cam = this.camera; // 由 Game 注入
    if (!cam) return;
    if (this._freeCam) return; // 测试用自由相机
    const groundY = this.groundY;
    if (this.viewMode === 1) {
      // 第一人称：头部位置 + 朝向（相机 -z 必须对准移动正前方 sin/cos yaw）
      cam.position.set(this.px, groundY + this.H * 0.92, this.pz);
      cam.rotation.order = 'YXZ';
      cam.rotation.set(this.pitch, this.yaw + Math.PI, 0);
      this.camPos.copy(cam.position);
    } else {
      // 第三人称：背后跟随 + 平滑
      const back = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
      const desired = new THREE.Vector3(
        this.px - back.x * 5.2,
        groundY + 2.4 - this.pitch * 2.6,
        this.pz - back.z * 5.2
      );
      const k = 1 - Math.pow(0.001, dt); // 平滑系数
      this.camPos.lerp(desired, Math.min(1, k * 8));
      cam.position.copy(this.camPos);
      cam.lookAt(this.px, groundY + 1.35, this.pz);
      cam.rotation.order = 'YXZ';
    }
  }
}
