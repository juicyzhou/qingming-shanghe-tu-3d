import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toon, flat, woodTexture, signTexture, bannerTexture } from '../render/materials.js';
import { STALLS, TREES, RIVER } from './layout.js';
import { rf } from '../core/rand.js';
import { Merger } from './merge.js';

const wood = () => toon({ color: 0x8a6a44, map: woodTexture() });
const darkWood = () => toon({ color: 0x6e4f2c });
const colMat = () => toon({ color: 0x7d3f1f });

// ---- 树（实例化：干/叶两类 InstancedMesh） ----
function treeParts(kind) {
  const trunk = [], foliage = [];
  const add = (arr, geo, x, y, z, ry = 0) => {
    const g = flat(geo);
    const m = new THREE.Matrix4().makeRotationY(ry);
    m.setPosition(x, y, z);
    g.applyMatrix4(m);
    arr.push(g);
  };
  const trunkH = kind === 'willow' ? 2.7 : 3.0;
  add(trunk, new THREE.CylinderGeometry(0.14, 0.22, trunkH, 6), 0, trunkH / 2, 0);
  if (kind === 'willow') {
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const r = 1.4;
      const leaf = flat(new THREE.SphereGeometry(1.05, 6, 5));
      leaf.scale(1, 0.7, 1);
      const m = new THREE.Matrix4().makeRotationY(ang);
      m.setPosition(Math.cos(ang) * r, trunkH + 0.6, Math.sin(ang) * r);
      leaf.applyMatrix4(m);
      foliage.push(leaf);
    }
    for (let i = 0; i < 6; i++) {
      add(foliage, new THREE.CylinderGeometry(0.025, 0.03, 1.1, 4), (i % 3 - 1) * 0.9, trunkH - 0.15, Math.floor(i / 3) * 0.9 - 0.45, 0.3);
    }
  } else {
    let y = trunkH - 0.2;
    for (const s of [1.7, 1.3, 0.9]) { add(foliage, new THREE.ConeGeometry(s, 1.6, 7), 0, y, 0); y += 0.9; }
  }
  return { trunk: mergeGeometries(trunk, false), foliage: mergeGeometries(foliage, false) };
}

function instanceTrees(scene) {
  const kinds = [
    { kind: 'willow', trunkM: toon({ color: 0x6e4f2c }), folM: toon({ color: 0x9aa25c }) },
    { kind: 'pine', trunkM: toon({ color: 0x6e4f2c }), folM: toon({ color: 0x5f7a4f }) },
  ];
  for (const k of kinds) {
    const list = TREES.filter(t => t.kind === k.kind);
    if (!list.length) continue;
    const { trunk, foliage } = treeParts(k.kind);
    const trunkMesh = new THREE.InstancedMesh(trunk, k.trunkM, list.length);
    const folMesh = new THREE.InstancedMesh(foliage, k.folM, list.length);
    list.forEach((t, i) => {
      const scale = 0.85 + (i % 5) * 0.07;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (i * 1.3) % (Math.PI * 2), 0));
      const m = new THREE.Matrix4().compose(new THREE.Vector3(t.x, 0, t.z), q, new THREE.Vector3(scale, scale, scale));
      trunkMesh.setMatrixAt(i, m);
      folMesh.setMatrixAt(i, m);
    });
    trunkMesh.instanceMatrix.needsUpdate = true;
    folMesh.instanceMatrix.needsUpdate = true;
    scene.add(trunkMesh, folMesh);
  }
}

// ---- 摊位（合并几何，每摊 ~5 draw call） ----
function buildStall(s) {
  const g = new THREE.Group();
  const M = new Merger();
  const canopyMat = toon({ color: s.id === 'story' ? '#8a4a2a' : '#a8b878', transparent: true, opacity: 0.95 });
  const darkW = darkWood();
  const woodM = wood();

  if (s.id === 'story') {
    M.add(darkW, new THREE.BoxGeometry(3.2, 0.4, 2.6), 0, 0.2, 0);
    M.add(toon({ color: 0x4a3a26 }), new THREE.BoxGeometry(3.0, 1.8, 0.15), -0.2, 1.3, -1.15);
    M.add(toon({ map: signTexture('说书场', 220, 64, '#24443b', '#f0e6c8') }), new THREE.PlaneGeometry(1.6, 0.6), 0.2, 2.0, -1.07, 0, Math.PI / 2);
    for (const [x, z] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) {
      M.add(darkW, new THREE.CylinderGeometry(0.07, 0.09, 2.1, 5), x, 1.05, z);
    }
    M.add(canopyMat, new THREE.BoxGeometry(3.2, 0.12, 2.8), 0, 2.15, 0, 0.06);
  } else {
    M.add(woodM, new THREE.BoxGeometry(2.0, 0.9, 1.2), 0, 0.45, 0);
    const goodsMat = [0xc04a30, 0x3f7a4a, 0xd8b23c, 0x7a5aa0, 0x5d6f9e, 0xa86e54];
    for (let i = 0; i < 6; i++) {
      M.add(toon({ color: goodsMat[i % goodsMat.length] }), new THREE.BoxGeometry(0.24, 0.2, 0.24), -0.7 + i * 0.28, 0.92, rf(-0.2, 0.2));
    }
    if (s.id === 'sugarman') M.add(darkW, new THREE.CylinderGeometry(0.05, 0.05, 1.6, 5), 1.3, 0.8, 0);
    if (s.id === 'tea_stand') {
      M.add(toon({ color: 0x4a3a26 }), new THREE.CylinderGeometry(0.35, 0.4, 0.5, 6), 1.0, 0.3, 0.2);
      M.add(toon({ color: 0x2f4f2f }), new THREE.CylinderGeometry(0.18, 0.22, 0.3, 6), 1.0, 0.65, 0.2);
    }
    for (const [x, z] of [[-1.1, -0.7], [1.1, -0.7], [-1.1, 0.7], [1.1, 0.7]]) {
      M.add(darkW, new THREE.CylinderGeometry(0.06, 0.08, 1.9, 5), x, 0.95, z);
    }
    M.add(canopyMat, new THREE.BoxGeometry(2.6, 0.1, 1.8), 0, 1.92, 0, 0.08);
    if (s.id === 'tea_stand') {
      M.add(toon({ map: bannerTexture('茶', '#2f6d4f'), transparent: true }), new THREE.PlaneGeometry(0.8, 1.6), -1.35, 1.4, 0.3, 0, Math.PI / 2);
    }
  }
  for (const mesh of M.meshes()) g.add(mesh);
  g.position.set(s.x, 0, s.z);
  g.userData.stallId = s.id;
  return g;
}

// ---- 汴河货船（合并几何，整船 ~5 draw call） ----
export function buildBoat({ x, z, len = 9 }) {
  const g = new THREE.Group();
  const M = new Merger();
  const hullMat = toon({ color: 0x7a5a34, map: woodTexture() });
  M.add(hullMat, new THREE.CylinderGeometry(len / 2, len / 2.6, 2.4, 8, 1), 0, 0.5, 0, Math.PI / 2); // 船体
  M.add(hullMat, new THREE.BoxGeometry(1.2, 0.9, 1.6), 0, 1.05, len / 2 - 0.4, -0.5);            // 船首
  for (const side of [-1, 1]) {
    M.add(toon({ color: 0x6e4f2c }), new THREE.BoxGeometry(len - 1, 0.5, 0.2), side * (1.1), 1.2, 0); // 舷
  }
  M.add(toon({ color: 0xb8915a }), new THREE.BoxGeometry(4.5, 1.0, 1.6), 0, 1.7, 0);               // 货舱
  M.add(toon({ color: 0x8a4a2a }), new THREE.BoxGeometry(4.9, 0.15, 1.9), 0, 2.25, 0, 0.05);      // 舱盖
  M.add(darkWood(), new THREE.CylinderGeometry(0.06, 0.08, 4.4, 5), 0.8, 2.4, 0);                 // 桅
  M.add(toon({ color: 0xe0d0a0, transparent: true, opacity: 0.9 }), new THREE.PlaneGeometry(2.2, 2.6), 0.8, 2.9, 0.8, 0, 0.2); // 帆
  for (const mesh of M.meshes()) g.add(mesh);
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
  instanceTrees(scene); // 树木实例化（不再逐个建组）
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
  // 沿街灯笼（合并为共享网格，仅 4 draw call）
  const LM = new Merger();
  const poleM = darkWood();
  const lampM = toon({ color: 0xc84a2a });
  const glowM = toon({ color: 0xffc080, transparent: true, opacity: 0.35 });
  for (let z = -78; z <= 12; z += 12) {
    for (const x of [5.6, -5.6]) {
      LM.add(poleM, new THREE.CylinderGeometry(0.06, 0.08, 3.2, 5), x, 1.6, z);
      LM.add(lampM, new THREE.SphereGeometry(0.3, 8, 6), x, 3.0, z);
      LM.add(glowM, new THREE.SphereGeometry(0.42, 8, 6), x, 3.0, z);
    }
  }
  for (const mesh of LM.meshes()) group.add(mesh);
  scene.add(group);
  return { boatA, boatB, boatC };
}
