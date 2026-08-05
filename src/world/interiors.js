import * as THREE from 'three';
import { toon, flat, woodTexture, wallTexture, doorTexture, windowTexture, scrollTexture } from '../render/materials.js';
import { EXTRA_COLLIDERS } from './layout.js';

// ============================================================
//  店铺内室：可进入的屋内空间 + 各店专属陈设（世界坐标）
// ============================================================

// 室内材质统一加暖色环境光增益，避免背阴墙/顶被压成灰暗平面
const BOOST = 0.9;
const wood = () => toon({ color: 0x9a7548, map: woodTexture(), boost: BOOST });
const darkWood = () => toon({ color: 0x6e4f2c, boost: BOOST });
const wallMat = () => toon({ color: 0xd5c7a2, map: wallTexture(), boost: BOOST });

const colliders = [];
const addCol = (x, z, hw, hd) => colliders.push({ x, z, hw, hd });

function part(geo, mat, x, y, z, rx = 0, rz = 0) {
  const m = new THREE.Mesh(flat(geo), mat);
  m.position.set(x, y, z);
  m.rotation.x = rx; m.rotation.z = rz;
  return m;
}

// ---- 家具 ----
function table(x, z, w = 1.4, d = 0.8, h = 0.85, topMat = wood()) {
  const g = new THREE.Group();
  g.add(part(new THREE.BoxGeometry(w, 0.08, d), topMat, 0, h, 0));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    g.add(part(new THREE.CylinderGeometry(0.05, 0.05, h, 5), darkWood(), sx * (w / 2 - 0.1), h / 2, sz * (d / 2 - 0.08)));
  }
  g.position.set(x, 0, z);
  addCol(x, z, w / 2, d / 2);
  return g;
}

function stool(x, z, r = 0.34) {
  const g = new THREE.Group();
  g.add(part(new THREE.CylinderGeometry(r, r, 0.08, 7), wood(), 0, 0.4, 0));
  g.add(part(new THREE.CylinderGeometry(0.04, 0.05, 0.4, 5), darkWood(), 0, 0.2, 0));
  g.position.set(x, 0, z);
  addCol(x, z, r, r);
  return g;
}

function counter(x, z, w = 2.2, h = 1.05, d = 0.7) {
  const g = new THREE.Group();
  g.add(part(new THREE.BoxGeometry(w, h, d), wood(), 0, h / 2, 0));
  g.add(part(new THREE.BoxGeometry(w + 0.08, 0.1, d + 0.08), toon({ color: 0x8a4a2a }), 0, h + 0.02, 0));
  g.position.set(x, 0, z);
  addCol(x, z, w / 2, d / 2);
  return g;
}

function shelf(x, z, w = 2.0, h = 1.8, rows = 3) {
  const g = new THREE.Group();
  const frameMat = darkWood();
  g.add(part(new THREE.BoxGeometry(w, 0.08, 0.28), frameMat, 0, h, 0));
  g.add(part(new THREE.BoxGeometry(0.08, h, 0.28), frameMat, -w / 2 + 0.04, h / 2, 0));
  g.add(part(new THREE.BoxGeometry(0.08, h, 0.28), frameMat, w / 2 - 0.04, h / 2, 0));
  for (let i = 0; i < rows; i++) {
    g.add(part(new THREE.BoxGeometry(w, 0.06, 0.26), frameMat, 0, h * (i + 1) / (rows + 1), 0));
    // 架上小物
    const n = 3;
    for (let k = 0; k < n; k++) {
      const item = part(new THREE.BoxGeometry(0.3, 0.2, 0.2), toon({ color: [0xc04a30, 0x3f7a4a, 0xd8b23c, 0x7a5aa0, 0x5d6f9e][(i + k) % 5] }), -w / 4 + k * (w / 4), h * (i + 1) / (rows + 1) + 0.12, 0);
      g.add(item);
    }
  }
  g.position.set(x, 0, z);
  addCol(x, z, w / 2, 0.2);
  return g;
}

function cabinet(x, z, w = 1.6, h = 1.9, d = 0.6) {
  const g = new THREE.Group();
  g.add(part(new THREE.BoxGeometry(w, h, d), toon({ color: 0x8a4a2a }), 0, h / 2, 0));
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 3; c++) {
      g.add(part(new THREE.BoxGeometry(w / 3 - 0.08, h / 5 - 0.1, 0.05), toon({ color: 0xd8c8a0 }), -w / 3 + c * (w / 3), h - h / 10 - r * (h / 5), d / 2 + 0.01));
    }
  }
  g.position.set(x, 0, z);
  addCol(x, z, w / 2, d / 2);
  return g;
}

function barrel(x, z, r = 0.45, h = 0.9) {
  const g = new THREE.Group();
  g.add(part(new THREE.CylinderGeometry(r * 0.8, r, h, 9), wood(), 0, h / 2, 0));
  g.add(part(new THREE.CylinderGeometry(r * 0.85, r * 0.85, 0.05, 9), toon({ color: 0x6e4f2c }), 0, h + 0.02, 0));
  g.position.set(x, 0, z);
  addCol(x, z, r, r);
  return g;
}

function sack(x, z, r = 0.4, h = 0.7) {
  const g = new THREE.Group();
  const m = part(new THREE.SphereGeometry(r, 8, 6), toon({ color: 0xc9b478 }), 0, h / 2, 0);
  m.scale.y = 1.1;
  g.add(m);
  g.position.set(x, 0, z);
  addCol(x, z, r, r);
  return g;
}

function jar(x, z, r = 0.4, h = 0.7, col = 0x6e4f2c) {
  const g = new THREE.Group();
  g.add(part(new THREE.CylinderGeometry(r * 0.7, r, h, 8), toon({ color: col }), 0, h / 2, 0));
  g.add(part(new THREE.CylinderGeometry(r * 0.5, r * 0.5, 0.1, 8), toon({ color: 0x4a3a26 }), 0, h + 0.05, 0));
  g.position.set(x, 0, z);
  addCol(x, z, r, r);
  return g;
}

function bed(x, z, w = 1.6, d = 2.0) {
  const g = new THREE.Group();
  g.add(part(new THREE.BoxGeometry(w, 0.3, d), wood(), 0, 0.15, 0));
  g.add(part(new THREE.BoxGeometry(w - 0.1, 0.12, d - 0.1), toon({ color: 0xe0d0a0 }), 0, 0.32, 0));   // 床褥
  g.add(part(new THREE.BoxGeometry(0.5, 0.1, 0.4), toon({ color: 0x8a4a2a }), 0, 0.45, d / 2 - 0.25)); // 枕
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    g.add(part(new THREE.CylinderGeometry(0.06, 0.07, 0.42, 5), darkWood(), sx * (w / 2 - 0.1), 0.21, sz * (d / 2 - 0.1)));
  }
  g.position.set(x, 0, z);
  addCol(x, z, w / 2, d / 2);
  return g;
}

function screen(x, z, w = 1.6, h = 1.4) {
  const g = new THREE.Group();
  const frameMat = darkWood();
  for (let i = 0; i < 3; i++) {
    g.add(part(new THREE.BoxGeometry(0.06, h, 0.05), frameMat, -w / 2 + i * (w / 2), h / 2, 0));
  }
  g.add(part(new THREE.BoxGeometry(w, 0.08, 0.05), frameMat, 0, h - 0.04, 0));
  const panelMat = toon({ color: 0x6a7a52, side: THREE.DoubleSide }); // 双面暖灰绿，避免背面消失
  for (let i = 0; i < 3; i++) {
    g.add(part(new THREE.PlaneGeometry(w / 2 - 0.06, h - 0.1), panelMat, -w / 2 + w / 4 + i * (w / 2), h / 2, 0));
  }
  g.position.set(x, 0, z);
  addCol(x, z, w / 2, 0.12);
  return g;
}

function butcherBlock(x, z, w = 1.1, h = 0.8) {
  const g = new THREE.Group();
  g.add(part(new THREE.CylinderGeometry(0.55, 0.55, h, 9), wood(), 0, h / 2, 0));
  g.add(part(new THREE.CylinderGeometry(0.6, 0.6, 0.1, 9), toon({ color: 0xc8b088 }), 0, h + 0.05, 0));
  g.position.set(x, 0, z);
  addCol(x, z, 0.6, 0.6);
  return g;
}

function hanging(x, y, z, kind) {
  const g = new THREE.Group();
  const n = kind === 'meat' ? 3 : 4;
  const color = kind === 'meat' ? 0xb04a4a : 0x4f8a4a;
  for (let i = 0; i < n; i++) {
    const item = part(new THREE.SphereGeometry(0.09, 5, 4), toon({ color }), (i - (n - 1) / 2) * 0.22, y - 0.22, 0);
    item.scale.y = 1.4;
    g.add(item);
    g.add(part(new THREE.CylinderGeometry(0.008, 0.008, 0.18, 4), darkWood(), (i - (n - 1) / 2) * 0.22, y - 0.09, 0));
  }
  g.position.set(x, 0, z);
  return g;
}

function clothRolls(x, z, w = 2.0, rows = 2) {
  const g = new THREE.Group();
  const colors = ['#e8e0cc', '#5d6f9e', '#b07c36', '#a84a5a', '#3f7a4a'];
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < 5; i++) {
      const roll = part(new THREE.CylinderGeometry(0.16, 0.16, 0.8, 7), toon({ color: colors[(i + r) % colors.length] }), (i - 2) * 0.4, 0.25 + r * 0.5, 0);
      roll.rotation.z = Math.PI / 2;
      g.add(roll);
    }
  }
  g.position.set(x, 0, z);
  addCol(x, z, w / 2, 0.5);
  return g;
}

function lowTable(x, z, w = 1.5, h = 0.4) {
  const g = new THREE.Group();
  g.add(part(new THREE.BoxGeometry(w, 0.07, 0.8), toon({ color: 0x8a4a2a }), 0, h, 0));
  g.add(part(new THREE.BoxGeometry(0.07, h, 0.7), darkWood(), -w / 2 + 0.05, h / 2, 0));
  g.add(part(new THREE.BoxGeometry(0.07, h, 0.7), darkWood(), w / 2 - 0.05, h / 2, 0));
  // 茶具
  g.add(part(new THREE.CylinderGeometry(0.09, 0.11, 0.12, 7), toon({ color: 0x3f7a4a }), -0.2, h + 0.08, 0.1));
  g.add(part(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 6), toon({ color: 0xc9b478 }), 0.25, h + 0.1, -0.1));
  g.position.set(x, 0, z);
  addCol(x, z, w / 2, 0.45);
  return g;
}

function lantern(x, y, z) {
  const g = new THREE.Group();
  g.add(part(new THREE.SphereGeometry(0.16, 7, 5), toon({ color: 0xc84a2a }), 0, y, 0));
  g.add(part(new THREE.SphereGeometry(0.24, 7, 5), toon({ color: 0xffc080, transparent: true, opacity: 0.4 }), 0, y, 0));
  g.position.set(x, 0, z);
  return g;
}

// ============================================================
//  按店铺类型组装内室
// ============================================================

// 各店掌柜站位（避开家具的预留空位，经碰撞核对）
// 掌柜站位（新布局：两岸店铺；b.z - facing*hd + 1.4 即默认门口内侧）
const KEEPER_POS = {
  tavern: [10.0, 8.4], tea: [-10.0, 8.9], inn: [10.0, 17.9],
  clinic: [-10.0, 0.9], cloth: [10.0, 51.4], incense: [-10.0, 59.9],
  general: [-10.0, 15.9], snack: [10.0, 58.9], butcher: [-10.0, 43.9], rice: [-10.0, 51.4],
};

export function buildInterior(b) {
  colliders.length = 0;
  const g = new THREE.Group();
  const cx = b.x, cz = b.z;
  const hw = b.w / 2, hd = b.d / 2;
  const WALL_H = 3.0;
  const facing = b.x > 0 ? -1 : 1;      // 门朝向
  const doorX = cx + facing * hw;

  // 地面
  const floor = new THREE.Mesh(flat(new THREE.PlaneGeometry(b.w, b.d)), wood());
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, 0.02, cz);
  g.add(floor);

  // 四面墙（门所在面留门洞）；单面、正面朝室内，从内永远看到正确法线
  const mkWall = (w, h, x, y, z, rotY) => {
    const wall = new THREE.Mesh(flat(new THREE.PlaneGeometry(w, h)), wallMat());
    wall.position.set(x, y, z);
    wall.rotation.y = rotY;
    return wall;
  };
  const gap = 0.85;                      // 门洞半宽（沿 z，与碰撞一致）
  const backX = cx - facing * hw;        // 门对面的墙
  const backRotY = facing * Math.PI / 2;   // 背墙正面朝室内
  const frontRotY = -facing * Math.PI / 2; // 门面墙正面朝室内
  g.add(mkWall(b.d, WALL_H, backX, WALL_H / 2, cz, backRotY));                       // 背墙
  g.add(mkWall(b.w, WALL_H, cx, WALL_H / 2, cz - hd, 0));                            // 侧墙1（朝内 +z）
  g.add(mkWall(b.w, WALL_H, cx, WALL_H / 2, cz + hd, Math.PI));                      // 侧墙2（朝内 -z）
  g.add(mkWall(hd - gap, WALL_H, doorX, WALL_H / 2, cz - (hd + gap) / 2, frontRotY)); // 门左
  g.add(mkWall(hd - gap, WALL_H, doorX, WALL_H / 2, cz + (hd + gap) / 2, frontRotY)); // 门右
  // 门楣 + 门槛（跨 z）
  g.add(part(new THREE.BoxGeometry(0.18, 0.3, gap * 2), darkWood(), doorX, WALL_H - 0.15, cz));
  g.add(part(new THREE.BoxGeometry(0.2, 0.1, gap * 2), darkWood(), doorX, 0.05, cz));

  // 天花板
  const ceil = new THREE.Mesh(flat(new THREE.PlaneGeometry(b.w, b.d)), wood());
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(cx, WALL_H, cz);
  g.add(ceil);

  // 角落立柱
  const colMat = toon({ color: 0x7d3f1f });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    g.add(part(new THREE.CylinderGeometry(0.1, 0.12, WALL_H, 6), colMat, cx + sx * (hw - 0.15), WALL_H / 2, cz + sz * (hd - 0.15)));
  }

  // 屋内灯笼
  g.add(lantern(cx, 2.4, cz + 0.5));

  // ---- 各店陈设 ----
  const bx = cx - hw, bz2 = cz - hd; // 左/后 参考点
  const bxr = cx + hw, bzf = cz + hd;
  switch (b.id) {
    case 'tavern':
      g.add(counter(cx - hw + 1.4, cz, 2.0, 1.0));
      g.add(table(cx + 0.2, cz - 1.0)); g.add(stool(cx - 0.4, cz - 1.2)); g.add(stool(cx + 0.8, cz - 1.2));
      g.add(table(cx + 0.5, cz + 1.2)); g.add(stool(cx + 0.1, cz + 1.5));
      g.add(jar(bx + 0.8, bz2 + 1.0, 0.42, 0.9)); g.add(jar(bx + 1.6, bz2 + 1.0, 0.42, 0.9)); g.add(jar(bx + 2.4, bz2 + 1.0, 0.4, 0.85));
      g.add(shelf(bxr - 1.0, cz + 1.4, 1.6, 1.7));
      g.add(lantern(cx, 2.6, cz - 1.2));
      break;
    case 'tea':
      g.add(lowTable(cx - 0.8, cz)); g.add(lowTable(cx + 0.9, cz + 0.6));
      g.add(shelf(bx + 1.2, bz2 + 1.4, 1.8, 1.7));
      g.add(counter(cx, bzf - 1.0, 2.2, 1.0));
      g.add(barrel(bxr - 1.0, cz - 0.5, 0.4, 0.7));
      break;
    case 'inn':
      g.add(counter(cx + 1.5, bzf - 0.9, 2.0, 1.05));
      g.add(bed(bx + 1.3, cz - 1.0));
      g.add(screen(bx + 0.8, cz + 0.8, 1.6, 1.4));
      g.add(sack(bx + 2.0, bzf - 1.2, 0.4, 0.65));
      g.add(lantern(cx, 2.5, cz - 1.2));
      break;
    case 'clinic':
      g.add(cabinet(bx + 1.4, cz - 0.6, 2.2, 2.0));
      g.add(counter(cx + 0.6, bzf - 0.8, 2.0, 1.0));
      g.add(table(bx + 2.2, cz + 1.0, 1.2, 0.7));
      g.add(stool(bx + 1.8, cz + 1.4));
      g.add(hanging(cx - 1.0, 2.4, cz - 1.4, 'herb'));
      g.add(hanging(cx + 1.2, 2.4, cz - 1.4, 'herb'));
      break;
    case 'cloth':
      g.add(clothRolls(bx + 1.5, cz, 2.0, 2));
      g.add(table(cx, cz - 0.8, 1.8, 0.9, 0.9));
      g.add(counter(cx - 1.0, bzf - 0.8, 1.8, 1.0));
      g.add(clothRolls(bxr - 1.2, cz + 0.8, 1.4, 1));
      break;
    case 'incense':
      g.add(shelf(bx + 1.2, cz, 1.8, 1.9, 4));
      g.add(table(cx, bzf - 1.0, 1.0, 0.6, 0.8, toon({ color: 0x8a4a2a })));
      g.add(lantern(cx, 2.6, cz - 0.6));
      g.add(sack(bxr - 1.2, cz - 0.4, 0.35, 0.6));
      break;
    case 'general':
      g.add(shelf(bx + 1.2, cz - 0.6, 1.8, 1.9, 4));
      g.add(shelf(bxr - 1.4, cz + 0.8, 1.6, 1.7, 3));
      g.add(counter(cx, bzf - 0.8, 2.0, 1.0));
      g.add(barrel(bx + 2.0, bzf - 1.0, 0.42, 0.85));
      g.add(sack(bxr - 1.8, cz - 0.8, 0.38, 0.65));
      break;
    case 'snack':
      g.add(counter(cx, bzf - 0.8, 2.4, 1.0));
      g.add(shelf(bx + 1.2, cz + 0.6, 1.6, 1.6, 3));
      g.add(barrel(bx + 1.6, bzf - 1.2, 0.4, 0.8));
      g.add(stool(cx - 1.2, cz));
      break;
    case 'butcher':
      g.add(butcherBlock(cx + 0.6, cz - 0.5));
      g.add(counter(bx + 1.0, bzf - 0.7, 1.6, 1.0));
      g.add(hanging(bx + 1.4, 2.4, cz - 1.4, 'meat'));
      g.add(hanging(bx + 2.2, 2.4, cz - 1.4, 'meat'));
      g.add(barrel(bxr - 1.1, cz + 0.9, 0.42, 0.85));
      break;
    case 'rice':
      g.add(barrel(bx + 0.8, cz, 0.5, 1.0)); g.add(barrel(bx + 1.9, cz, 0.5, 1.0));
      g.add(barrel(bx + 0.8, cz + 1.3, 0.45, 0.9)); g.add(barrel(bx + 1.9, cz + 1.3, 0.45, 0.9));
      g.add(sack(bxr - 1.2, cz - 0.4, 0.45, 0.75));
      g.add(counter(cx + 1.0, bzf - 0.8, 1.6, 1.0));
      break;
  }

  // 背墙挂轴 + 门槛地垫（通用陈设）——不透明，避免透明通道闪烁
  const scrollMat = toon({ map: scrollTexture(b.id.length % 3), side: THREE.DoubleSide });
  for (const sz of [-1, 1]) {
    const sc = new THREE.Mesh(flat(new THREE.PlaneGeometry(0.62, 1.5)), scrollMat);
    sc.position.set(backX + facing * 0.08, 1.6, cz + sz * (hd * 0.5));
    sc.rotation.y = Math.PI / 2;
    g.add(sc);
  }
  const mat = new THREE.Mesh(flat(new THREE.BoxGeometry(0.03, 0.05, 1.7)), toon({ color: 0x8a4a2a }));
  mat.position.set(doorX + facing * 0.12, 0.026, cz);
  g.add(mat);

  g.userData.isInterior = true;
  for (const c of colliders) EXTRA_COLLIDERS.push(c); // 家具加入全局碰撞
  return {
    group: g,
    colliders: colliders.slice(),
    keeperPos: KEEPER_POS[b.id] || [b.x, b.z - facing * hd + 1.4],
    keeperHeading: facing * Math.PI / 2,   // 面向店门
  };
}
