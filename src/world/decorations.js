import * as THREE from 'three';
import { toon, flat, woodTexture, signTexture, bannerTexture } from '../render/materials.js';
import { STALLS, TREES, RIVER } from './layout.js';
import { rf } from '../core/rand.js';

const wood = () => toon({ color: 0x8a6a44, map: woodTexture() });
const darkWood = () => toon({ color: 0x6e4f2c });
const colMat = () => toon({ color: 0x7d3f1f });

// ---- 树 ----
function buildTree(t) {
  const g = new THREE.Group();
  const trunkMat = toon({ color: 0x6e4f2c });
  const trunkH = t.kind === 'willow' ? rf(2.2, 3.0) : rf(2.6, 3.6);
  const trunk = new THREE.Mesh(flat(new THREE.CylinderGeometry(0.14, 0.22, trunkH, 6)), trunkMat);
  trunk.position.y = trunkH / 2;
  g.add(trunk);

  if (t.kind === 'willow') {
    // 垂柳：低垂叶团
    const leafMat = toon({ color: 0x9aa25c });
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2 + rf(-0.4, 0.4);
      const r = rf(1.1, 1.7);
      const leaf = new THREE.Mesh(
        flat(new THREE.SphereGeometry(rf(0.9, 1.4), 6, 5)),
        leafMat
      );
      leaf.position.set(Math.cos(ang) * r, trunkH + rf(0.3, 0.9), Math.sin(ang) * r);
      leaf.scale.y = 0.7;
      g.add(leaf);
    }
    // 垂条
    const strandMat = toon({ color: 0x8a9850 });
    for (let i = 0; i < 6; i++) {
      const strand = new THREE.Mesh(flat(new THREE.CylinderGeometry(0.02, 0.03, rf(0.8, 1.5), 4)), strandMat);
      strand.position.set(rf(-0.8, 0.8), trunkH - 0.2, rf(-0.8, 0.8));
      g.add(strand);
    }
  } else {
    // 松柏
    const coneMat = toon({ color: 0x5f7a4f });
    let y = trunkH - 0.2;
    for (const s of [1.7, 1.3, 0.9]) {
      const cone = new THREE.Mesh(flat(new THREE.ConeGeometry(s, 1.6, 7)), coneMat);
      cone.position.y = y;
      g.add(cone);
      y += 0.9;
    }
  }
  g.position.set(t.x, 0, t.z);
  g.userData.isTree = true;
  return g;
}

// ---- 摊位 ----
function buildStall(s) {
  const g = new THREE.Group();
  const canopyMat = toon({ color: s.id === 'story' ? '#8a4a2a' : '#a8b878', transparent: true, opacity: 0.95 });

  if (s.id === 'story') {
    // 说书棚：台 + 背景屏 + 顶
    const platform = new THREE.Mesh(flat(new THREE.BoxGeometry(3.2, 0.4, 2.6)), darkWood());
    platform.position.y = 0.2;
    g.add(platform);
    const screen = new THREE.Mesh(flat(new THREE.BoxGeometry(3.0, 1.8, 0.15)), toon({ color: 0x4a3a26 }));
    screen.position.set(-0.2, 1.3, -1.15);
    g.add(screen);
    const board = new THREE.Mesh(flat(new THREE.PlaneGeometry(1.6, 0.6)), toon({ map: signTexture('说书场', 220, 64, '#24443b', '#f0e6c8') }));
    board.position.set(0.2, 2.0, -1.07);
    g.add(board);
    for (const [x, z] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) {
      const p = new THREE.Mesh(flat(new THREE.CylinderGeometry(0.07, 0.09, 2.1, 5)), darkWood());
      p.position.set(x, 1.05, z);
      g.add(p);
    }
    const top = new THREE.Mesh(flat(new THREE.BoxGeometry(3.2, 0.12, 2.8)), canopyMat);
    top.position.set(0, 2.15, 0);
    top.rotation.x = 0.06;
    g.add(top);
  } else {
    // 普通摊位：台 + 货 + 伞篷
    const table = new THREE.Mesh(flat(new THREE.BoxGeometry(2.0, 0.9, 1.2)), wood());
    table.position.y = 0.45;
    g.add(table);
    // 货物
    const goodsMat = [0xc04a30, 0x3f7a4a, 0xd8b23c, 0x7a5aa0, 0x5d6f9e, 0xa86e54];
    for (let i = 0; i < 6; i++) {
      const item = new THREE.Mesh(
        flat(new THREE.BoxGeometry(0.24, 0.2, 0.24)),
        toon({ color: goodsMat[i % goodsMat.length] })
      );
      item.position.set(-0.7 + i * 0.28, 0.92, rf(-0.2, 0.2));
      g.add(item);
    }
    if (s.id === 'sugarman') {
      // 糖人稻草架
      const straw = new THREE.Mesh(flat(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 5)), darkWood());
      straw.position.set(1.3, 0.8, 0);
      g.add(straw);
    }
    if (s.id === 'tea_stand') {
      // 茶炉
      const stove = new THREE.Mesh(flat(new THREE.CylinderGeometry(0.35, 0.4, 0.5, 6)), toon({ color: 0x4a3a26 }));
      stove.position.set(1.0, 0.3, 0.2);
      g.add(stove);
      const pot = new THREE.Mesh(flat(new THREE.CylinderGeometry(0.18, 0.22, 0.3, 6)), toon({ color: 0x2f4f2f }));
      pot.position.set(1.0, 0.65, 0.2);
      g.add(pot);
    }
    // 四柱 + 篷
    for (const [x, z] of [[-1.1, -0.7], [1.1, -0.7], [-1.1, 0.7], [1.1, 0.7]]) {
      const p = new THREE.Mesh(flat(new THREE.CylinderGeometry(0.06, 0.08, 1.9, 5)), darkWood());
      p.position.set(x, 0.95, z);
      g.add(p);
    }
    const top = new THREE.Mesh(flat(new THREE.BoxGeometry(2.6, 0.1, 1.8)), canopyMat);
    top.position.set(0, 1.92, 0);
    top.rotation.x = 0.08;
    g.add(top);
    // 布幌
    if (s.id === 'tea_stand') {
      const banner = new THREE.Mesh(flat(new THREE.PlaneGeometry(0.8, 1.6)), toon({ map: bannerTexture('茶', '#2f6d4f'), transparent: true }));
      banner.position.set(-1.35, 1.4, 0.3);
      g.add(banner);
    }
  }
  g.position.set(s.x, 0, s.z);
  g.userData.stallId = s.id;
  return g;
}

// ---- 汴河货船 ----
export function buildBoat({ x, z, len = 9 }) {
  const g = new THREE.Group();
  const hullMat = toon({ color: 0x7a5a34, map: woodTexture() });
  // 船体（梭形：圆角底）
  const hull = new THREE.Mesh(flat(new THREE.CylinderGeometry(len / 2, len / 2.6, 2.4, 8, 1)), hullMat);
  hull.rotation.x = Math.PI / 2;
  hull.scale.y = 0.85;
  hull.position.y = 0.5;
  g.add(hull);
  // 船首上翘
  const bow = new THREE.Mesh(flat(new THREE.BoxGeometry(1.2, 0.9, 1.6)), hullMat);
  bow.position.set(0, 1.05, len / 2 - 0.4);
  bow.rotation.x = -0.5;
  g.add(bow);
  // 舷
  for (const side of [-1, 1]) {
    const sidePlank = new THREE.Mesh(flat(new THREE.BoxGeometry(len - 1, 0.5, 0.2)), toon({ color: 0x6e4f2c }));
    sidePlank.position.set(side * (2.4 / 2 - 0.1), 1.2, 0);
    g.add(sidePlank);
  }
  // 货舱棚
  const cargo = new THREE.Mesh(flat(new THREE.BoxGeometry(4.5, 1.0, 1.6)), toon({ color: 0xb8915a }));
  cargo.position.set(0, 1.7, 0);
  g.add(cargo);
  const cover = new THREE.Mesh(flat(new THREE.BoxGeometry(4.9, 0.15, 1.9)), toon({ color: 0x8a4a2a }));
  cover.position.set(0, 2.25, 0);
  cover.rotation.x = 0.05;
  g.add(cover);
  // 桅 + 帆（布）
  const mast = new THREE.Mesh(flat(new THREE.CylinderGeometry(0.06, 0.08, 4.4, 5)), darkWood());
  mast.position.set(0.8, 2.4, 0);
  g.add(mast);
  const sail = new THREE.Mesh(flat(new THREE.PlaneGeometry(2.2, 2.6)), toon({ color: 0xe0d0a0, transparent: true, opacity: 0.9 }));
  sail.position.set(0.8, 2.9, 0.8);
  sail.rotation.y = 0.2;
  g.add(sail);
  g.position.set(x, RIVER.y + 0.05, z);
  g.userData.boat = true;
  return g;
}

// ---- 井 / 车 / 灯 ----
function buildWell(x, z) {
  const g = new THREE.Group();
  const rim = new THREE.Mesh(flat(new THREE.CylinderGeometry(0.7, 0.8, 0.5, 8)), toon({ color: 0x9a8a68 }));
  rim.position.y = 0.25;
  g.add(rim);
  const water = new THREE.Mesh(flat(new THREE.CircleGeometry(0.6, 8)), toon({ color: 0x4a5a6a }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.32;
  g.add(water);
  const frame = new THREE.Mesh(flat(new THREE.BoxGeometry(1.6, 0.1, 0.1)), darkWood());
  frame.position.y = 1.3;
  g.add(frame);
  g.position.set(x, 0, z);
  return g;
}

function buildCart(x, z) {
  const g = new THREE.Group();
  const box = new THREE.Mesh(flat(new THREE.BoxGeometry(1.4, 0.8, 0.9)), wood());
  box.position.y = 0.55;
  g.add(box);
  for (const side of [-1, 1]) {
    const wheel = new THREE.Mesh(flat(new THREE.CylinderGeometry(0.4, 0.4, 0.12, 8)), toon({ color: 0x4a3a26 }));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(side * 0.85, 0.4, 0);
    g.add(wheel);
  }
  g.position.set(x, 0, z);
  return g;
}

function buildLantern(x, z) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(flat(new THREE.CylinderGeometry(0.06, 0.08, 3.2, 5)), darkWood());
  pole.position.y = 1.6;
  g.add(pole);
  const lamp = new THREE.Mesh(flat(new THREE.SphereGeometry(0.3, 8, 6)), toon({ color: 0xc84a2a }));
  lamp.position.y = 3.0;
  g.add(lamp);
  const glow = new THREE.Mesh(flat(new THREE.SphereGeometry(0.42, 8, 6)), toon({ color: 0xffc080, transparent: true, opacity: 0.35 }));
  glow.position.y = 3.0;
  g.add(glow);
  g.position.set(x, 0, z);
  return g;
}

export function buildDecorations(scene) {
  const group = new THREE.Group();
  for (const t of TREES) group.add(buildTree(t));
  for (const s of STALLS) group.add(buildStall(s));
  // 货船
  const boatA = buildBoat({ x: 16, z: 29, len: 9 });
  const boatB = buildBoat({ x: -26, z: 32, len: 7 });
  const boatC = buildBoat({ x: 40, z: 26, len: 6 });
  group.add(boatA, boatB, boatC);
  // 井 / 车
  group.add(buildWell(-6, -30));
  group.add(buildWell(6, 30));
  group.add(buildCart(-8, -18));
  group.add(buildCart(9, 22));
  // 沿街灯笼
  for (let z = -78; z <= 12; z += 12) {
    group.add(buildLantern(5.6, z));
    group.add(buildLantern(-5.6, z));
  }
  scene.add(group);
  return { boatA, boatB, boatC };
}
