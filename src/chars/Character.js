import * as THREE from 'three';
import { toon, flat } from '../render/materials.js';

// ============================================================
//  宋代汉服角色：交领长袍 / 襦裙 / 宽袖 / 幞头 / 高髻
//  身材比例按汉服剪影：男肩宽身直袍垂，女高腰裙摆散开
// ============================================================
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
    this.shoulderL.rotation.x = 0;
    this.shoulderR.rotation.x = 0;
    this.hipL.rotation.x = 0;
    this.hipR.rotation.x = 0;
    this.body.position.y = this._cached.bodyY;
    this.body.rotation.set(0, 0, 0);
  }

  _build() {
    const H = this.H, g = this.app.girth;
    const isWoman = this.app.sex === 'f';
    const shoulderY = H * 0.82;
    const headR = H * 0.105;
    const headCenter = H * 1.03;
    const innerMat = toon({ color: 0xf2ecda }); // 交领白内衬

    const skinMat = toon({ color: this.app.skin });
    const clothMat = toon({ color: this.app.cloth });
    const trimMat = toon({ color: this.app.trim || 0x2a2018 });

    // ---- 身体组（袍服，随行走整体起伏/摆动） ----
    this.body = new THREE.Group();
    const bodyY = H * 0.44;
    this.body.position.y = bodyY;
    this.add(this.body);
    this._cached = { bodyY, headCenter };

    // ---- 袍服（男：交领长袍；女：短襦 + 高腰散摆裙） ----
    if (isWoman) {
      // 裙：高腰 A 字散摆（襦裙之裙）
      const skirt = new THREE.Mesh(new THREE.LatheGeometry([
        new THREE.Vector2(H * 0.17 * g, H * 0.16),   // 腰
        new THREE.Vector2(H * 0.20 * g, -H * 0.10),  // 胯
        new THREE.Vector2(H * 0.26 * g, -H * 0.38),  // 摆
      ], 16), clothMat);
      this.body.add(skirt);
      // 襦：短上衣，盖住裙腰
      const jacket = new THREE.Mesh(new THREE.LatheGeometry([
        new THREE.Vector2(H * 0.15 * g, H * 0.38),   // 肩
        new THREE.Vector2(H * 0.165 * g, H * 0.16),  // 下摆（裙腰处）
      ], 16), clothMat);
      this.body.add(jacket);
      // 腰带（系于襦下摆 / 裙腰）
      const sash = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.17 * g, H * 0.17 * g, H * 0.04, 16), trimMat);
      sash.position.y = H * 0.15;
      this.body.add(sash);
    } else {
      // 直裰长袍：修身合体（肩略宽→腰收→摆微展），翩翩公子般挺拔
      const robe = new THREE.Mesh(new THREE.LatheGeometry([
        new THREE.Vector2(H * 0.16 * g, H * 0.38),   // 肩
        new THREE.Vector2(H * 0.138 * g, H * 0.12),  // 腰（收束显身段）
        new THREE.Vector2(H * 0.15 * g, -H * 0.14),  // 胯
        new THREE.Vector2(H * 0.175 * g, -H * 0.38), // 摆（微展，行走飘动）
      ], 16), clothMat);
      this.body.add(robe);
      // 腰带（束腰显身段）
      const sash = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.142 * g, H * 0.142 * g, H * 0.05, 16), trimMat);
      sash.position.y = H * 0.10;
      this.body.add(sash);
    }

    // ---- 交领白内衬（颈圈，露出领口白边） ----
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.09, H * 0.14 * g, H * 0.16, 14), innerMat);
    collar.position.y = H * 0.38;
    this.body.add(collar);

    // ---- 胸前交领 V 带（右衽） ----
    for (const s of [-1, 1]) {
      const lapel = new THREE.Mesh(new THREE.BoxGeometry(H * 0.028, H * 0.17, 0.015), innerMat);
      lapel.rotation.z = s * 0.42;
      lapel.position.set(s * H * 0.018, H * 0.30, H * 0.155 * g);
      this.body.add(lapel);
    }

    // ---- 围裙（货郎/船夫/厨娘等） ----
    if (this.app.apron) {
      const apron = new THREE.Mesh(new THREE.BoxGeometry(H * 0.2 * g, H * 0.32, 0.02), toon({ color: this.app.apron }));
      apron.position.set(0, -H * 0.14, H * 0.152 * g);
      this.body.add(apron);
    }

    // ---- 袍下鞋履（藏在摆内，行走微露） ----
    this.hipL = this._limbPivot(-H * 0.055, H * 0.40);
    this.hipR = this._limbPivot(H * 0.055, H * 0.40);
    for (const hp of [this.hipL, this.hipR]) {
      const shoe = new THREE.Mesh(flat(new THREE.BoxGeometry(H * 0.075, H * 0.045, H * 0.13)), toon({ color: this.app.shoe }));
      shoe.position.y = -H * 0.36;
      hp.add(shoe);
      this.add(hp);
    }

    // ---- 头（圆球） + 脖子 ----
    this.headGroup = new THREE.Group();
    this.headGroup.position.y = headCenter;
    const head = new THREE.Mesh(new THREE.SphereGeometry(headR, 20, 14), toon({ map: this.app.faceTex }));
    this.headGroup.add(head);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.42, headR * 0.5, H * 0.16, 10), skinMat);
    neck.position.y = headCenter - headR * 0.82;
    this.add(neck);
    this._applyHeadStyle(headR);
    this.add(this.headGroup);

    // ---- 直袖（肩枢轴：修身直袖 + 细白内衬 + 露手），江湖利落 ----
    const shoulderW = (isWoman ? H * 0.32 : H * 0.36) * g;
    const sTopR = isWoman ? H * 0.04 : H * 0.048;
    const sCuffR = isWoman ? H * 0.05 : H * 0.058;   // 近直袖（微展），不臃肿
    const sLen = isWoman ? H * 0.34 : H * 0.38;
    this.shoulderL = this._limbPivot(-shoulderW / 2, shoulderY);
    this.shoulderR = this._limbPivot(shoulderW / 2, shoulderY);
    for (const p of [this.shoulderL, this.shoulderR]) {
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(sTopR, sCuffR, sLen, 10), clothMat);
      sleeve.position.y = -sLen / 2;
      p.add(sleeve);
      // 袖口细白内衬
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(sCuffR * 1.02, sCuffR * 1.1, H * 0.04, 10), toon({ color: this.app.sleeveColor || 0xf2ecda }));
      cuff.position.y = -sLen + H * 0.022;
      p.add(cuff);
      // 袖口露出的手（小巧）
      const hand = new THREE.Mesh(new THREE.SphereGeometry(sCuffR * 0.72, 8, 6), skinMat);
      hand.position.y = -sLen + H * 0.045;
      p.add(hand);
      this.add(p);
    }
  }

  _limbPivot(x, y) {
    const p = new THREE.Group();
    p.position.set(x, y, 0);
    return p;
  }

  // 宋制发型 + 帽饰（按圆头半径 headR 定位）
  _applyHeadStyle(headR) {
    const H = this.H;
    const hat = this.app.hat;
    const hair = this.app.hairStyle;
    const hairMat = toon({ color: this.app.hair });
    const gold = toon({ color: 0xcaa24a });

    const bun = (x, y, r) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), hairMat);
      m.position.set(x, y, 0);
      this.headGroup.add(m);
    };
    const pin = (x, y) => { // 束发簪
      const p = new THREE.Mesh(new THREE.BoxGeometry(H * 0.012, H * 0.07, H * 0.012), gold);
      p.position.set(x, y, 0);
      this.headGroup.add(p);
    };
    const flower = (x, y) => { // 簪花
      const f = new THREE.Mesh(new THREE.SphereGeometry(H * 0.018, 6, 5), toon({ color: 0xd84a4a }));
      f.position.set(x, y, headR * 0.55);
      this.headGroup.add(f);
    };

    // ---- 发 ----
    if (hair === 'bald') {
      const bald = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.04, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon({ color: this.app.skin }));
      bald.position.y = headR * 0.10;
      this.headGroup.add(bald);
      for (const dx of [-0.07, 0, 0.07]) {
        const scar = new THREE.Mesh(new THREE.SphereGeometry(H * 0.012, 5, 4), toon({ color: 0x8a4a3a }));
        scar.position.set(dx, headR * 0.9, headR * 0.6);
        this.headGroup.add(scar);
      }
    } else {
      // 发帽（覆盖头顶至发际线）
      const cap = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.02, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), hairMat);
      cap.position.y = headR * 0.10;
      this.headGroup.add(cap);

      if (hair === 'topknot') {            // 男子束发（插簪）
        bun(0, headR * 0.78, H * 0.045);
        if (this.app.crown) {
          // 翩翩公子：束发玉冠（金环束发 + 顶珠）
          const ring = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.058, H * 0.058, H * 0.038, 12), gold);
          ring.position.y = headR * 0.58;
          this.headGroup.add(ring);
          const bead = new THREE.Mesh(new THREE.SphereGeometry(H * 0.015, 6, 5), gold);
          bead.position.y = headR * 0.88;
          this.headGroup.add(bead);
        } else {
          pin(0, headR * 0.78);
        }
      } else if (hair === 'gaoji') {       // 女子高髻（竖立 + 簪花）
        const gaoji = new THREE.Mesh(new THREE.SphereGeometry(H * 0.055, 12, 10), hairMat);
        gaoji.scale.y = 1.7;
        gaoji.position.y = headR * 0.95;
        this.headGroup.add(gaoji);
        flower(headR * 0.3, headR * 1.3);
        flower(-headR * 0.28, headR * 0.6);
      } else if (hair === 'double') {      // 女子双髻（+簪花）
        bun(-headR * 0.72, headR * 0.8, H * 0.048);
        bun(headR * 0.72, headR * 0.8, H * 0.048);
        flower(-headR * 0.72, headR * 1.1);
        flower(headR * 0.72, headR * 1.1);
      } else if (hair === 'zongjiao') {    // 孩童总角（两侧小揪）
        bun(-headR * 0.8, headR * 0.95, H * 0.038);
        bun(headR * 0.8, headR * 0.95, H * 0.038);
      }
    }

    // ---- 帽（宋制） ----
    const darkMat = toon({ color: 0x1c1814 });
    if (hat === 'guan') {
      // 乌纱帽：贴合圆帽 + 细金沿（官/将/衙），去夸张翅膀
      const cap = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.98, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), darkMat);
      cap.position.y = headR * 0.34;
      this.headGroup.add(cap);
      const band = new THREE.Mesh(flat(new THREE.CylinderGeometry(headR * 1.0, headR * 1.0, H * 0.02, 14)), gold);
      band.position.y = headR * 0.16;
      this.headGroup.add(band);
    } else if (hat === 'dongpo') {
      // 东坡巾：软方帽 + 帽缘横带
      const square = new THREE.Mesh(flat(new THREE.BoxGeometry(headR * 1.5, H * 0.13, headR * 1.5)), darkMat);
      square.position.y = headR * 0.58;
      this.headGroup.add(square);
      const band = new THREE.Mesh(flat(new THREE.BoxGeometry(headR * 1.7, H * 0.026, headR * 1.7)), toon({ color: 0x3a3226 }));
      band.position.y = headR * 0.14;
      this.headGroup.add(band);
    } else if (hat === 'jin') {
      // 布巾：裹头圆筒
      const wrap = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.05, headR * 0.98, H * 0.12, 12), toon({ color: this.app.cloth }));
      wrap.position.y = headR * 0.28;
      this.headGroup.add(wrap);
    } else if (hat === 'straw') {
      // 斗笠：锥顶 + 宽沿
      const cone = new THREE.Mesh(flat(new THREE.ConeGeometry(headR * 1.5, H * 0.13, 12)), toon({ color: 0xc9b478 }));
      cone.position.y = headR * 0.36;
      this.headGroup.add(cone);
      const brim = new THREE.Mesh(flat(new THREE.CylinderGeometry(headR * 2.4, headR * 2.4, H * 0.018, 16)), toon({ color: 0xd9c47f }));
      brim.position.y = headR * 0.30;
      this.headGroup.add(brim);
    } else if (hat === 'guanyin') {
      // 包髻（厨娘/织女头巾）
      const wrap = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.06, headR * 0.96, H * 0.14, 12), toon({ color: 0xcaa24a }));
      wrap.position.y = headR * 0.34;
      this.headGroup.add(wrap);
    }
  }

  // 行走/站立动画（长袍随行摆动）
  update(dt, speed) {
    const moveSpeed = Math.min(Math.abs(speed), 6);
    this.phase += dt * (1.6 + moveSpeed * 1.5);
    const walk = moveSpeed > 0.05;
    const swing = walk ? Math.sin(this.phase) : 0;
    const amp = walk ? Math.min(1, moveSpeed * 0.55) : 0;

    // 宽袖反向摆臂
    this.shoulderL.rotation.x = walk ? -swing * 0.5 * amp : Math.sin(this.phase * 0.5) * 0.03;
    this.shoulderR.rotation.x = walk ? swing * 0.5 * amp : -Math.sin(this.phase * 0.5) * 0.03;

    // 袍服：行走起伏 + 轻微左右摆动
    this.body.position.y = this._cached.bodyY +
      (walk ? Math.abs(Math.sin(this.phase)) * 0.028 : Math.sin(this.phase * 0.5) * 0.010);
    this.body.rotation.z = walk ? swing * 0.022 * amp : 0;
    this.body.rotation.x = walk ? Math.sin(this.phase * 0.5) * 0.012 * amp : 0;

    // 袍下足部微移（藏于摆内）
    const fa = walk ? 0.1 * amp : 0;
    this.hipL.rotation.x = -swing * fa;
    this.hipR.rotation.x = swing * fa;

    this.speed = speed;
  }

  setHeading(angle) {
    this.heading = angle;
    this.rotation.y = angle;
  }
}
