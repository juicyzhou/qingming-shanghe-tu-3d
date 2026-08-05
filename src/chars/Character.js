import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { toon, flat } from '../render/materials.js';

// 烘焙圆角箱到局部坐标（用于同材质合并，减少 draw call）
function bakeRounded(w, h, d, seg, rad, x, y, z) {
  const g = new RoundedBoxGeometry(w, h, d, seg, rad);
  const m = new THREE.Matrix4();
  m.setPosition(x, y, z);
  g.applyMatrix4(m);
  return g;
}

// 参数化木偶角色：圆球头 + 圆角躯干/四肢，肢体以枢轴绕动实现程序化行走动画
export class Character extends THREE.Group {
  constructor(app) {
    super();
    this.app = app;
    this.H = app.height;
    this.phase = 0;
    this.speed = 0;
    this.heading = 0;
    this.isPlayer = false;
    this._build();
    this._poseIdle();
  }

  _poseIdle() {
    // 初始静止姿态（不调用多态 update，避免子类签名差异）
    this.shoulderL.rotation.x = 0;
    this.shoulderR.rotation.x = 0;
    this.hipL.rotation.x = 0;
    this.hipR.rotation.x = 0;
    this.body.position.y = this._cached.hipY + this._cached.torsoH / 2;
  }

  _build() {
    const H = this.H, g = this.app.girth;
    const torsoW = H * 0.32 * g, torsoH = H * 0.36, torsoD = H * 0.20;
    const armW = H * 0.085, armL = H * 0.30;
    const legW = H * 0.105, thighL = H * 0.235, shinL = H * 0.26;
    const hipY = H * 0.56, shoulderY = H * 0.88;
    const headR = H * 0.108;          // 圆头半径
    const headCenter = H * 1.03;      // 头中心（含脖子高度）

    const skinMat = toon({ color: this.app.skin });
    const clothMat = toon({ color: this.app.cloth });
    const pantsMat = toon({ color: this.app.pants });
    const trimMat = toon({ color: this.app.trim || 0x2a2018 });

    this._cached = { hipY, torsoH, headCenter, torsoD };

    // ---- 脖子 ----
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.42, headR * 0.5, H * 0.10, 10), skinMat);
    neck.position.y = headCenter - headR * 0.82;
    this.add(neck);

    // ---- 躯干（圆角箱，柔和轮廓） ----
    this.body = new THREE.Mesh(new RoundedBoxGeometry(torsoW, torsoH, torsoD, 2, H * 0.06), clothMat);
    this.body.position.y = hipY + torsoH / 2;
    this.add(this.body);
    // 腰带
    const belt = new THREE.Mesh(new RoundedBoxGeometry(torsoW + 0.02, H * 0.05, torsoD + 0.02, 2, H * 0.02), trimMat);
    belt.position.y = hipY + H * 0.02;
    this.add(belt);
    // 肩带/围裙
    if (this.app.apron) {
      const apron = new THREE.Mesh(new RoundedBoxGeometry(torsoW * 0.82, torsoH * 0.85, 0.04, 2, H * 0.02), toon({ color: this.app.apron }));
      apron.position.set(0, hipY + torsoH / 2 - 0.02, torsoD / 2 + 0.01);
      this.add(apron);
    }

    // ---- 头（圆球，正脸带贴五官贴图） ----
    this.headGroup = new THREE.Group();
    this.headGroup.position.y = headCenter;
    const head = new THREE.Mesh(new THREE.SphereGeometry(headR, 20, 14), toon({ map: this.app.faceTex }));
    this.headGroup.add(head);
    this._applyHeadStyle(headR);
    this.add(this.headGroup);

    // ---- 手臂（肩枢轴；上臂+前臂同色合并，手为肤色球） ----
    this.shoulderL = this._limbPivot(-torsoW / 2 - armW / 2 + 0.01, shoulderY);
    this.shoulderR = this._limbPivot(torsoW / 2 + armW / 2 - 0.01, shoulderY);
    for (const p of [this.shoulderL, this.shoulderR]) {
      const armGeo = mergeGeometries([
        bakeRounded(armW, armL * 0.72, armW, 2, H * 0.028, 0, -armL * 0.36, 0),     // 上臂
        bakeRounded(armW * 0.82, armL * 0.40, armW * 0.82, 2, H * 0.022, 0, -armL * 0.82, 0), // 前臂(略细)
      ], false);
      const arm = new THREE.Mesh(armGeo, clothMat);
      p.add(arm);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(armW * 0.72, 10, 8), skinMat);
      hand.position.y = -armL + H * 0.015;
      p.add(hand);
      if (this.app.sleeveColor) {
        const cuff = new THREE.Mesh(new RoundedBoxGeometry(armW + 0.03, armL * 0.16, armW + 0.03, 2, H * 0.02), toon({ color: this.app.sleeveColor }));
        cuff.position.y = -armL * 0.76;
        p.add(cuff);
      }
      this.add(p);
    }

    // ---- 腿（髋大腿 + 膝段小腿/脚合并） ----
    this.hipL = this._limbPivot(-legW * 0.62, hipY);
    this.hipR = this._limbPivot(legW * 0.62, hipY);
    for (const hp of [this.hipL, this.hipR]) {
      const thigh = new THREE.Mesh(bakeRounded(legW, thighL, legW, 2, H * 0.03, 0, -thighL / 2, 0), pantsMat);
      hp.add(thigh);
      const knee = new THREE.Group();
      knee.position.y = -thighL;
      const shinFootGeo = mergeGeometries([
        bakeRounded(legW * 0.86, shinL, legW * 0.86, 2, H * 0.024, 0, -shinL / 2, 0),        // 小腿
        bakeRounded(legW * 1.1, H * 0.06, H * 0.15, 2, H * 0.02, 0, -shinL + H * 0.03, H * 0.04), // 脚
      ], false);
      knee.add(new THREE.Mesh(shinFootGeo, pantsMat));
      hp.add(knee);
      this.add(hp);
    }
  }

  _limbPivot(x, y) {
    const p = new THREE.Group();
    p.position.set(x, y, 0);
    return p;
  }

  // 发型 + 帽饰（辨识度核心；按圆头半径 headR 定位）
  _applyHeadStyle(headR) {
    const H = this.H;
    const hat = this.app.hat;
    const hair = this.app.hairStyle;
    const hairMat = toon({ color: this.app.hair });

    if (hair === 'bald') {
      // 僧人头巾（皮肤色包顶）
      const bald = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.04, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon({ color: this.app.skin }));
      bald.position.y = headR * 0.10;
      this.headGroup.add(bald);
      for (const dx of [-0.07, 0, 0.07]) {
        const scar = new THREE.Mesh(new THREE.SphereGeometry(H * 0.012, 5, 4), toon({ color: 0x8a4a3a }));
        scar.position.set(dx, headR * 0.9, headR * 0.62);
        this.headGroup.add(scar);
      }
    } else {
      // 发帽：覆盖头顶至发际线的半球，勾勒发型轮廓
      const cap = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.03, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), hairMat);
      cap.position.y = headR * 0.10;
      this.headGroup.add(cap);

      // 发髻/双髻
      const bun = (x, y, r) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), hairMat);
        m.position.set(x, y, 0);
        this.headGroup.add(m);
      };
      if (hair === 'topknot') {
        bun(0, headR * 0.85, H * 0.052);
      } else if (hair === 'double') {
        bun(-headR * 0.66, headR * 0.78, H * 0.048);
        bun(headR * 0.66, headR * 0.78, H * 0.048);
      } else if (hair === 'long') {
        const back = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.1, headR * 0.9, 0.05), hairMat);
        back.position.set(0, -headR * 0.5, -headR * 0.92);
        this.headGroup.add(back);
      }
    }

    // 帽子（戴在发帽之上）
    const darkCap = toon({ color: 0x1c1814 });
    if (hat === 'futou') {
      const capM = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.7, H * 0.065, headR * 1.9), darkCap);
      capM.position.y = headR * 0.62;
      this.headGroup.add(capM);
      for (const s of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(H * 0.05, H * 0.012, H * 0.22), darkCap);
        wing.position.set(s * headR * 1.05, headR * 0.66, -headR * 0.55);
        this.headGroup.add(wing);
      }
    } else if (hat === 'straw') {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(headR * 2.0, H * 0.15, 10), toon({ color: 0xc9b478 }));
      cone.position.y = headR * 0.72;
      this.headGroup.add(cone);
    } else if (hat === 'official') {
      const capM = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.8, H * 0.09, headR * 1.8), toon({ color: 0x1a1612 }));
      capM.position.y = headR * 0.7;
      this.headGroup.add(capM);
      for (const s of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(H * 0.26, H * 0.012, H * 0.02), toon({ color: 0x1a1612 }));
        wing.position.set(s * H * 0.13, headR * 0.72, 0);
        this.headGroup.add(wing);
      }
    } else if (hat === 'guanyin') {
      const capM = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.8, H * 0.1, headR * 1.9), toon({ color: 0xcaa24a }));
      capM.position.y = headR * 0.66;
      this.headGroup.add(capM);
    }
  }

  // 行走/站立动画
  update(dt, speed) {
    const moveSpeed = Math.min(Math.abs(speed), 6);
    this.phase += dt * (1.6 + moveSpeed * 1.5);
    const walk = moveSpeed > 0.05;
    const swing = walk ? Math.sin(this.phase) : 0;
    const amp = walk ? Math.min(1, moveSpeed * 0.55) : 0;

    // 手臂反向摆动
    this.shoulderL.rotation.x = walk ? -swing * 0.7 * amp : Math.sin(this.phase * 0.5) * 0.03;
    this.shoulderR.rotation.x = walk ? swing * 0.7 * amp : -Math.sin(this.phase * 0.5) * 0.03;

    // 腿（髋正摆 + 膝反向弯）
    const hipSwing = swing * 0.85 * amp;
    this.hipL.rotation.x = hipSwing;
    this.hipR.rotation.x = -hipSwing;
    const kneeL = this.hipL.children[this.hipL.children.length - 1];
    const kneeR = this.hipR.children[this.hipR.children.length - 1];
    kneeL.rotation.x = walk ? -Math.max(0, swing) * 0.7 : 0;
    kneeR.rotation.x = walk ? Math.max(0, -swing) * 0.7 : 0;

    // 躯干起伏
    this.body.position.y = this._cached.hipY + this._cached.torsoH / 2 +
      (walk ? Math.abs(Math.sin(this.phase)) * 0.03 : Math.sin(this.phase * 0.5) * 0.012);

    this.speed = speed;
  }

  setHeading(angle) {
    this.heading = angle;
    this.rotation.y = angle;
  }
}
