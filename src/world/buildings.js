import * as THREE from 'three';
import {
  toon, flat, woodTexture, wallTexture, roofTexture,
  bannerTexture, signTexture, doorTexture, windowTexture,
} from '../render/materials.js';
import { BUILDINGS, GATE, EXTRA_COLLIDERS } from './layout.js';
import { buildInterior } from './interiors.js';

const wood = () => toon({ color: 0x8a6a44, map: woodTexture() });
const darkWood = () => toon({ color: 0x6e4f2c });
const colMat = () => toon({ color: 0x7d3f1f });
const wallM = () => toon({ color: 0xd5c7a2, map: wallTexture() });
const roofM = () => toon({ color: 0x3d3d3d, map: roofTexture(), side: THREE.DoubleSide });

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// 屋面高度：脊高 h，檐口 0.35，四角上翘（飞檐）
function roofY(x, z, W, D, h) {
  const t = Math.abs(z) / D;                      // 0 脊 → 1 檐
  let y = h - (h - 0.35) * Math.pow(t, 1.3);
  const corner = smoothstep(0.55, 1.0, Math.abs(x) / W);
  const nearEave = smoothstep(0.72, 1.0, t);
  y += 0.55 * Math.pow(corner, 1.5) * nearEave;   // 檐角上翘
  return y;
}

// 双坡飞檐屋面（分段曲面 + 脊饰）
function roofMesh(w, d, h, mat) {
  const W = w / 2 + 0.9, D = d / 2 + 0.9;
  const N = 12, M = 16;
  const grid = [];
  for (let i = 0; i <= N; i++) {
    const x = -W + (2 * W) * (i / N);
    const row = [];
    for (let j = 0; j <= M; j++) {
      const z = -D + (2 * D) * (j / M);
      row.push([x, roofY(x, z, W, D, h), z]);
    }
    grid.push(row);
  }
  const pos = [], uv = [];
  const push = (a, b, c) => {
    pos.push(...a, ...b, ...c);
    uv.push((a[0] + W) / (2 * W), (a[2] + D) / (2 * D));
    uv.push((b[0] + W) / (2 * W), (b[2] + D) / (2 * D));
    uv.push((c[0] + W) / (2 * W), (c[2] + D) / (2 * D));
  };
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
    const a = grid[i][j], b = grid[i + 1][j], c = grid[i + 1][j + 1], d2 = grid[i][j + 1];
    push(a, b, c); push(a, c, d2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.position.y = 0; // 由调用方抬高
  return m;
}

// 屋脊线 + 两端吻兽
function ridgeDecor(w, h, mat, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const ridge = new THREE.Mesh(flat(new THREE.CylinderGeometry(0.09, 0.09, w + 0.3, 6)), colMat());
  ridge.rotation.z = Math.PI / 2;
  g.add(ridge);
  for (const s of [-1, 1]) {
    const beast = new THREE.Mesh(flat(new THREE.BoxGeometry(0.22, 0.26, 0.2)), mat);
    beast.position.set(s * (w / 2 + 0.15), 0.02, 0);
    beast.rotation.z = s * 0.3;
    g.add(beast);
  }
  return g;
}

function columnBase(x, y, z, r = 0.2) {
  return new THREE.Mesh(flat(new THREE.CylinderGeometry(r, r * 1.25, 0.22, 8)), darkWood());
  // 位置由调用方 set
}

function part(geo, mat, x, y, z, rx = 0, rz = 0) {
  const m = new THREE.Mesh(flat(geo), mat);
  m.position.set(x, y, z);
  m.rotation.x = rx; m.rotation.z = rz;
  return m;
}

// ============================================================
//  店屋主体：檐柱 + 木构立面 + 门/窗 + 飞檐屋面 +（可选二层）
// ============================================================
function buildShop(b) {
  const g = new THREE.Group();
  const w = b.w, d = b.d;
  const twoStory = b.id === 'tavern' || b.id === 'inn';
  const G1 = 3.4;                    // 首层墙高
  const F = w / 2;                   // facade 局部 +x

  // ---- 墙身 ----
  const body = new THREE.Mesh(flat(new THREE.BoxGeometry(w, G1, d)), wallM());
  body.position.y = G1 / 2;
  g.add(body);

  // ---- 檐柱 + 柱础（四角 + 门两侧） ----
  const columnPos = [[-F + 0.25, -d / 2 + 0.25], [F - 0.25, -d / 2 + 0.25], [-F + 0.25, d / 2 - 0.25], [F - 0.25, d / 2 - 0.25]];
  for (const [cx, cz] of columnPos) {
    const col = part(new THREE.CylinderGeometry(0.16, 0.18, G1, 7), colMat(), cx, G1 / 2, cz);
    g.add(col);
    const base = columnBase();
    base.position.set(cx, 0.11, cz);
    g.add(base);
  }

  // ---- 立面木构（前脸横纵梁） ----
  const beamMat = darkWood();
  for (let z = -d / 2 + 0.3; z <= d / 2 - 0.3; z += 1.35) {
    if (Math.abs(z) < 0.95) continue;              // 门洞处留空
    g.add(part(new THREE.BoxGeometry(0.1, G1, 0.1), beamMat, F + 0.03, G1 / 2, z));
  }
  g.add(part(new THREE.BoxGeometry(0.1, 0.14, d), beamMat, F + 0.03, G1 - 0.32, 0));  // 檐下横梁
  g.add(part(new THREE.BoxGeometry(0.1, 0.12, d), beamMat, F + 0.03, 1.5, 0));        // 中枋

  // ---- 门（开张：暗门洞 + 斜开门扇）+ 门框 + 台阶 ----
  const doorwayMat = toon({ color: 0x241a0e });
  const doorway = new THREE.Mesh(flat(new THREE.PlaneGeometry(1.7, 2.4)), doorwayMat);
  doorway.rotation.y = Math.PI / 2;         // 与墙面平行、朝外
  doorway.position.set(F - 0.16, 1.2, 0);
  g.add(doorway);
  const hinge = new THREE.Group();
  hinge.position.set(F + 0.02, 1.2, -0.85); // 门轴在门洞一侧
  const doorLeafMat = toon({ map: doorTexture(), side: THREE.DoubleSide });
  const doorLeaf = new THREE.Mesh(flat(new THREE.PlaneGeometry(1.7, 2.4)), doorLeafMat);
  doorLeaf.rotation.y = Math.PI / 2;        // 门扇平面对齐墙面（宽沿 z）
  doorLeaf.position.set(0, 0, 0.85);
  hinge.add(doorLeaf);
  hinge.rotation.y = -1.15;                 // 门扇向内打开，从外可见
  g.add(hinge);
  g.add(part(new THREE.BoxGeometry(0.14, 2.5, 2.0), colMat(), F - 0.04, 1.25, 0));    // 门框
  g.add(part(new THREE.BoxGeometry(2.1, 0.18, 1.2), darkWood(), F + 0.9, 0.09, 0));  // 台阶

  // ---- 窗（暖光格窗） ----
  const winMat = toon({ map: windowTexture() });
  for (const sz of [-1, 1]) {
    g.add(part(new THREE.BoxGeometry(0.12, 0.18, 1.5), beamMat, F + 0.04, 2.6, sz * (d / 2 - 1.2))); // 窗框
    const win = new THREE.Mesh(flat(new THREE.PlaneGeometry(1.3, 1.1)), winMat);
    win.position.set(F + 0.05, 2.6, sz * (d / 2 - 1.2));
    g.add(win);
  }

  // ---- 招牌（横匾 + 托臂） ----
  const sign = new THREE.Mesh(flat(new THREE.PlaneGeometry(2.8, 0.66)), toon({ map: signTexture(b.sign) }));
  sign.position.set(F + 0.08, 3.15, 0);
  g.add(sign);
  for (const sz of [-1, 1]) {
    const arm = part(new THREE.BoxGeometry(0.1, 0.08, 0.35), colMat(), F + 0.06, 3.15, sz * 1.0);
    arm.rotation.z = -0.2;
    g.add(arm);
  }

  // ---- 布幌 + 灯 ----
  const pole = part(new THREE.CylinderGeometry(0.06, 0.06, 1.7, 5), colMat(), F + 0.9, 3.1, -d / 2 + 0.7);
  pole.rotation.z = Math.PI / 2;
  g.add(pole);
  const banner = new THREE.Mesh(flat(new THREE.PlaneGeometry(0.9, 2.6)), toon({ map: bannerTexture(b.banner, b.bannerColor), transparent: true }));
  banner.position.set(F + 0.9, 2.1, -d / 2 + 0.7);
  g.add(banner);
  const flag = part(new THREE.PlaneGeometry(1.1, 0.55), toon({ color: b.bannerColor }), F + 0.9, 3.3, -d / 2 + 0.7);
  g.add(flag);

  // 门前红灯笼
  for (const sz of [-1, 1]) {
    g.add(part(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 5), darkWood(), F - 0.55, 2.2, sz * 1.15));
    g.add(part(new THREE.SphereGeometry(0.2, 7, 5), toon({ color: 0xc84a2a }), F - 0.55, 1.3, sz * 1.15));
  }

  // ---- 雨搭（门顶斜篷） ----
  const awning = part(new THREE.PlaneGeometry(2.6, 1.6), toon({ color: b.bannerColor, transparent: true, opacity: 0.95 }), F + 0.85, 3.0, 0, 0, 0.35);
  g.add(awning);

  // ---- 屋面（飞檐） ----
  const roof = roofMesh(w + 0.4, d + 0.4, 1.8, roofM());
  roof.position.y = G1 + 0.1;
  g.add(roof);
  g.add(ridgeDecor(w + 0.4, 1.8, roofM(), 0, G1 + 0.1 + 1.8, 0));

  // ---- 二层（茶楼/客栈） ----
  if (twoStory) {
    const w2 = w - 1.0, d2 = d - 1.0;
    const y2 = G1 + 0.85;
    // 上层墙
    const upper = new THREE.Mesh(flat(new THREE.BoxGeometry(w2, 1.7, d2)), wallM());
    upper.position.y = y2;
    g.add(upper);
    // 上层窗
    for (const sz of [-1, 1]) {
      g.add(part(new THREE.BoxGeometry(0.12, 0.16, 1.3), beamMat, F + 0.02, y2 + 0.25, sz * (d2 / 2 - 0.7)));
      const win = new THREE.Mesh(flat(new THREE.PlaneGeometry(1.1, 0.95)), winMat);
      win.position.set(F + 0.05, y2 + 0.25, sz * (d2 / 2 - 0.7));
      g.add(win);
    }
    // 檐下横梁
    g.add(part(new THREE.BoxGeometry(0.1, 0.12, d), beamMat, F + 0.03, y2 + 0.95, 0));
    // 上层柱
    for (const [cx, cz] of [[-w2 / 2, -d2 / 2], [w2 / 2, -d2 / 2], [-w2 / 2, d2 / 2], [w2 / 2, d2 / 2]]) {
      g.add(part(new THREE.CylinderGeometry(0.12, 0.14, 1.7, 6), colMat(), cx, y2, cz));
    }
    // 平座栏杆（沿首层顶外圈）
    const railPosts = [], rails = [];
    const ry = G1 + 0.45, rH = 0.9;
    for (let x = -w / 2 + 0.2; x <= w / 2 - 0.2; x += 1.1) {
      if (Math.abs(x) < 1.0) continue;
      railPosts.push(part(new THREE.BoxGeometry(0.08, rH, 0.08), beamMat, x, ry, -d / 2 + 0.12));
      railPosts.push(part(new THREE.BoxGeometry(0.08, rH, 0.08), beamMat, x, ry, d / 2 - 0.12));
    }
    for (let z = -d / 2 + 0.2; z <= d / 2 - 0.2; z += 1.1) {
      if (Math.abs(z) < 1.0) continue;
      railPosts.push(part(new THREE.BoxGeometry(0.08, rH, 0.08), beamMat, -w / 2 + 0.12, ry, z));
      railPosts.push(part(new THREE.BoxGeometry(0.08, rH, 0.08), beamMat, w / 2 - 0.12, ry, z));
    }
    rails.push(part(new THREE.BoxGeometry(w + 0.3, 0.1, 0.1), beamMat, 0, ry + rH - 0.05, -d / 2 + 0.12));
    rails.push(part(new THREE.BoxGeometry(w + 0.3, 0.1, 0.1), beamMat, 0, ry + rH - 0.05, d / 2 - 0.12));
    rails.push(part(new THREE.BoxGeometry(0.1, 0.1, d + 0.3), beamMat, -w / 2 + 0.12, ry + rH - 0.05, 0));
    rails.push(part(new THREE.BoxGeometry(0.1, 0.1, d + 0.3), beamMat, w / 2 - 0.12, ry + rH - 0.05, 0));
    for (const p of railPosts) g.add(p);
    for (const r of rails) g.add(r);
    // 上层屋面
    const roof2 = roofMesh(w + 0.4, d + 0.4, 1.5, roofM());
    roof2.position.y = y2 + 1.7;
    g.add(roof2);
    g.add(ridgeDecor(w + 0.4, 1.5, roofM(), 0, y2 + 1.7 + 1.5, 0));
  }

  // ---- 定位 ----
  g.position.set(b.x, 0, b.z);
  if (b.x > 0) g.rotation.y = Math.PI;
  g.userData.buildingId = b.id;
  g.userData.buildingName = b.name;
  return g;
}

// 城门楼
function buildGate(scene) {
  const g = new THREE.Group();
  const brick = toon({ color: 0xc9b890, map: wallTexture() });
  const roofMat = roofM();
  const half = GATE.passageHalf;
  const base = new THREE.Mesh(flat(new THREE.BoxGeometry(16, 6, 6)), brick);
  base.position.set(0, 3, GATE.z);
  g.add(base);
  const tunnel = new THREE.Mesh(flat(new THREE.BoxGeometry(half * 2, 4, 7)), toon({ color: 0x4a3a26 }));
  tunnel.position.set(0, 2, GATE.z);
  g.add(tunnel);
  g.add(part(new THREE.BoxGeometry(half * 2 + 0.6, 0.5, 6.6), colMat(), 0, 4.1, GATE.z));
  // 城楼二层
  const tower = new THREE.Mesh(flat(new THREE.BoxGeometry(12, 2.6, 5)), wallM());
  tower.position.set(0, 6 + 1.3, GATE.z);
  g.add(tower);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    g.add(part(new THREE.CylinderGeometry(0.14, 0.16, 2.8, 6), colMat(), sx * 5.5, 8.6, GATE.z + sz * 2.2));
  }
  const roof = roofMesh(14, 6.6, 1.6, roofMat);
  roof.position.set(0, 9.8, GATE.z);
  g.add(roof);
  g.add(ridgeDecor(14, 1.6, roofMat, 0, 9.8 + 1.6, GATE.z));
  const plaque = new THREE.Mesh(flat(new THREE.PlaneGeometry(3.4, 0.9)), toon({ map: signTexture('汴京·东水门', 320, 88, '#24443b', '#e8dcb0') }));
  plaque.position.set(0, 5.0, GATE.z - 3.05);
  g.add(plaque);
  // 城墙
  const wallMat = toon({ color: 0xc0ac80, map: wallTexture() });
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(flat(new THREE.BoxGeometry(70, 4.2, 2.4)), wallMat);
    wall.position.set(side * (16 / 2 + 35), 2.1, GATE.z);
    g.add(wall);
  }
  scene.add(g);
}

// 汴河栈桥（码头）
function buildDock(scene) {
  const g = new THREE.Group();
  const deckMat = wood();
  for (let i = 0; i < 8; i++) {
    const p = part(new THREE.BoxGeometry(6, 0.2, 0.9), deckMat, 10, 0.32, 16.5 + i * 0.7);
    g.add(p);
  }
  for (const [x, z] of [[8.2, 16.8], [11.8, 16.8], [8.2, 20.2], [11.8, 20.2]]) {
    g.add(part(new THREE.CylinderGeometry(0.14, 0.16, 1.4, 6), darkWood(), x, 0.6, z));
  }
  scene.add(g);
}

// 每店注册「带门洞的墙」碰撞：背墙 + 两侧墙 + 门面两段
function registerBuildingWalls(b) {
  const facing = b.x > 0 ? -1 : 1;
  const doorX = b.x + facing * (b.w / 2);
  const gap = 0.85;                       // 门洞半宽（z 向）
  const t = 0.22;                         // 墙厚（x 或 z 半宽）
  const push = (cx, cz, hw, hd) => EXTRA_COLLIDERS.push({ minX: cx - hw, maxX: cx + hw, minZ: cz - hd, maxZ: cz + hd });
  push(b.x - facing * (b.w / 2), b.z, t, b.d / 2);                    // 背墙
  push(b.x, b.z - b.d / 2, b.w / 2, t);                               // 侧墙1
  push(b.x, b.z + b.d / 2, b.w / 2, t);                               // 侧墙2
  push(doorX, b.z - (b.d / 2 + gap) / 2, t, (b.d / 2 - gap) / 2);     // 门左
  push(doorX, b.z + (b.d / 2 + gap) / 2, t, (b.d / 2 - gap) / 2);     // 门右
}

export function buildBuildings(scene) {
  const interiors = [];
  for (const b of BUILDINGS) {
    const exterior = buildShop(b);
    scene.add(exterior);
    const { group, colliders } = buildInterior(b);
    group.visible = false;
    scene.add(group);
    registerBuildingWalls(b);
    const facing = b.x > 0 ? -1 : 1;
    const doorX = b.x + facing * (b.w / 2);
    const doorZ = b.z;
    interiors.push({
      def: b,
      exterior,
      group,
      furnitureColliders: colliders,
      doorX, doorZ,
      spawnX: doorX - facing * 1.4,
      spawnZ: doorZ,
      exitX: doorX + facing * 1.2,
      exitZ: doorZ,
    });
  }
  buildGate(scene);
  buildDock(scene);
  return interiors;
}
