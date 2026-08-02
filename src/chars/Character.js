import * as THREE from 'three';
import { toon, flat } from '../render/materials.js';

// 参数化木偶角色：按身高/胖瘦生成身体，肢体以枢轴绕动实现程序化行走动画
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
    const armW = H * 0.085, armL = H * 0.29;
    const legW = H * 0.105, thighL = H * 0.235, shinL = H * 0.26;
    const hipY = H * 0.56, shoulderY = H * 0.88, headCenter = H * 0.975;

    const skinMat = toon({ color: this.app.skin });
    const clothMat = toon({ color: this.app.cloth });
    const pantsMat = toon({ color: this.app.pants });
    const trimMat = toon({ color: this.app.trim || 0x2a2018 });

    this._cached = { hipY, torsoH, headCenter, torsoD };

    // ---- 躯干 ----
    this.body = new THREE.Mesh(flat(new THREE.BoxGeometry(torsoW, torsoH, torsoD)), clothMat);
    this.body.position.y = hipY + torsoH / 2;
    this.add(this.body);
    // 腰带
    const belt = new THREE.Mesh(flat(new THREE.BoxGeometry(torsoW + 0.02, H * 0.05, torsoD + 0.02)), trimMat);
    belt.position.y = hipY + H * 0.02;
    this.add(belt);
    // 肩带/围裙
    if (this.app.apron) {
      const apron = new THREE.Mesh(flat(new THREE.BoxGeometry(torsoW * 0.82, torsoH * 0.85, 0.03)), toon({ color: this.app.apron }));
      apron.position.set(0, hipY + torsoH / 2 - 0.02, torsoD / 2 + 0.02);
      this.add(apron);
    }

    // ---- 头 ----
    const headW = H * 0.205, headH = H * 0.24, headD = H * 0.21;
    this.headGroup = new THREE.Group();
    this.headGroup.position.y = headCenter;
    const face = toon({ map: this.app.faceTex });
    const skinFace = skinMat;
    const head = new THREE.Mesh(new THREE.BoxGeometry(headW, headH, headD), [
      skinFace, skinFace, skinFace, skinFace, face, skinFace,
    ]);
    this.headGroup.add(head);
    this._applyHeadStyle(headW, headH);
    this.add(this.headGroup);

    // ---- 手臂（肩枢轴） ----
    this.shoulderL = this._limbPivot(-torsoW / 2 - armW / 2 + 0.01, shoulderY);
    this.shoulderR = this._limbPivot(torsoW / 2 + armW / 2 - 0.01, shoulderY);
    for (const [p, s] of [[this.shoulderL, -1], [this.shoulderR, 1]]) {
      const arm = new THREE.Mesh(flat(new THREE.BoxGeometry(armW, armL, armW)), clothMat);
      arm.position.y = -armL / 2;
      p.add(arm);
      if (this.app.sleeveColor) {
        const cuff = new THREE.Mesh(flat(new THREE.BoxGeometry(armW + 0.02, armL * 0.22, armW + 0.02)), toon({ color: this.app.sleeveColor }));
        cuff.position.y = -armL * 0.82;
        p.add(cuff);
      }
      // 手
      const hand = new THREE.Mesh(flat(new THREE.BoxGeometry(armW * 0.95, H * 0.06, armW * 0.95)), skinFace);
      hand.position.y = -armL + H * 0.03;
      p.add(hand);
      this.add(p);
    }

    // ---- 腿（髋 + 膝双段） ----
    this.hipL = this._limbPivot(-legW * 0.62, hipY);
    this.hipR = this._limbPivot(legW * 0.62, hipY);
    for (const [hp, side] of [[this.hipL, -1], [this.hipR, 1]]) {
      const thigh = new THREE.Mesh(flat(new THREE.BoxGeometry(legW, thighL, legW)), pantsMat);
      thigh.position.y = -thighL / 2;
      hp.add(thigh);
      const knee = new THREE.Group();
      knee.position.y = -thighL;
      const shin = new THREE.Mesh(flat(new THREE.BoxGeometry(legW * 0.9, shinL, legW * 0.9)), pantsMat);
      shin.position.y = -shinL / 2;
      knee.add(shin);
      const foot = new THREE.Mesh(flat(new THREE.BoxGeometry(legW * 1.15, H * 0.05, H * 0.13)), toon({ color: this.app.shoe || 0x2a2018 }));
      foot.position.set(0, -shinL + H * 0.025, H * 0.035);
      knee.add(foot);
      hp.add(knee);
      this.add(hp);
    }

  }

  _limbPivot(x, y) {
    const p = new THREE.Group();
    p.position.set(x, y, 0);
    return p;
  }

  // 发型 + 帽饰（辨识度核心）
  _applyHeadStyle(headW, headH) {
    const H = this.H;
    const hat = this.app.hat;
    const hairMat = toon({ color: this.app.hair });

    // 发髻/双髻/顶髻
    const hair = this.app.hairStyle;
    const bun = (x, y, r) => {
      const m = new THREE.Mesh(flat(new THREE.SphereGeometry(r, 8, 6)), hairMat);
      m.position.set(x, y, 0);
      this.headGroup.add(m);
    };
    if (hair === 'topknot') bun(0, headH * 0.6, H * 0.055);
    else if (hair === 'double') { bun(-headW * 0.35, headH * 0.55, H * 0.05); bun(headW * 0.35, headH * 0.55, H * 0.05); }
    else if (hair === 'bald') {
      const cap = new THREE.Mesh(flat(new THREE.SphereGeometry(headW * 0.72, 10, 6)), toon({ color: this.app.skin }));
      cap.position.y = headH * 0.15;
      cap.scale.y = 0.8;
      this.headGroup.add(cap);
      for (const dx of [-0.08, 0, 0.08]) {
        const scar = new THREE.Mesh(flat(new THREE.SphereGeometry(H * 0.012, 5, 4)), toon({ color: 0x8a4a3a }));
        scar.position.set(dx, headH * 0.72, headW * 0.72);
        this.headGroup.add(scar);
      }
    } else if (hair === 'long') {
      const back = new THREE.Mesh(flat(new THREE.BoxGeometry(headW * 0.6, headH * 0.5, 0.05)), hairMat);
      back.position.set(0, -headH * 0.05, -headD2(headW));
      this.headGroup.add(back);
    }
    // 顶发
    const topHair = new THREE.Mesh(flat(new THREE.SphereGeometry(headW * 0.78, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2)), hairMat);
    topHair.position.y = headH * 0.25;
    this.headGroup.add(topHair);

    // 帽子
    const darkCap = toon({ color: 0x1c1814 });
    if (hat === 'futou') {
      const cap = new THREE.Mesh(flat(new THREE.BoxGeometry(headW * 0.8, H * 0.07, headW * 0.95)), darkCap);
      cap.position.y = headH * 0.5;
      this.headGroup.add(cap);
      for (const s of [-1, 1]) {
        const wing = new THREE.Mesh(flat(new THREE.BoxGeometry(H * 0.05, H * 0.012, H * 0.2)), darkCap);
        wing.position.set(s * headW * 0.2, headH * 0.52, -headD2(headW) * 0.4);
        this.headGroup.add(wing);
      }
    } else if (hat === 'straw') {
      const cone = new THREE.Mesh(flat(new THREE.ConeGeometry(headW * 1.0, H * 0.16, 8)), toon({ color: 0xc9b478 }));
      cone.position.y = headH * 0.62;
      this.headGroup.add(cone);
    } else if (hat === 'official') {
      const cap = new THREE.Mesh(flat(new THREE.BoxGeometry(headW * 0.85, H * 0.09, headW * 0.85)), toon({ color: 0x1a1612 }));
      cap.position.y = headH * 0.55;
      this.headGroup.add(cap);
      for (const s of [-1, 1]) {
        const wing = new THREE.Mesh(flat(new THREE.BoxGeometry(H * 0.22, H * 0.012, H * 0.02)), toon({ color: 0x1a1612 }));
        wing.position.set(s * H * 0.12, headH * 0.56, 0);
        this.headGroup.add(wing);
      }
    } else if (hat === 'guanyin') {
      const cap = new THREE.Mesh(flat(new THREE.BoxGeometry(headW * 0.8, H * 0.1, headW * 0.92)), toon({ color: 0xcaa24a }));
      cap.position.y = headH * 0.55;
      this.headGroup.add(cap);
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

function headD2(w) { return w * 1.0; }
