import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toon, flat, woodTexture, roofTexture } from '../render/materials.js';
import { BRIDGE, bridgeHeightAt } from './layout.js';

function slopeAt(z) {
  const e = 0.02;
  return Math.atan2(bridgeHeightAt(z + e) - bridgeHeightAt(z - e), 2 * e);
}

function box(mat4s, w, h, d, x, y, z, rx = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Matrix4();
  m.makeRotationX(rx); m.multiply(new THREE.Matrix4().makeRotationZ(rz));
  m.setPosition(x, y, z);
  g.applyMatrix4(m);
  mat4s.push(g);
}

// 虹桥：木板桥面 + 双侧拱梁与交叉斜撑 + 桥中亭
export function buildBridge(scene) {
  const group = new THREE.Group();
  const deckMat = toon({ color: 0x9a7548, map: woodTexture() });
  const railMat = toon({ color: 0x6e4f2c });
  const braceMat = toon({ color: 0x7d5a34 });
  const roofMat = toon({ color: 0x4a3a3a, map: roofTexture() });

  const N = 34;
  const zs = [];
  for (let i = 0; i <= N; i++) zs.push(BRIDGE.z0 + (BRIDGE.z1 - BRIDGE.z0) * (i / N));

  // ---- 桥面木板 ----
  const deck = [];
  for (let i = 0; i < N; i++) {
    const z = (zs[i] + zs[i + 1]) / 2;
    box(deck, BRIDGE.halfW * 2 + 0.6, 0.16, 0.62, 0, bridgeHeightAt(z) + 0.06, z, slopeAt(z));
  }
  const deckMesh = new THREE.Mesh(mergeGeometries(deck, false), deckMat);
  group.add(deckMesh);

  // ---- 两侧栏杆（立柱 + 上横梁 + 交叉撑） ----
  const posts = [], rails = [], braces = [];
  for (const side of [-1, 1]) {
    const px = side * (BRIDGE.halfW - 0.55);
    for (let i = 0; i <= N; i++) {
      const z = zs[i];
      const y = bridgeHeightAt(z);
      const s = slopeAt(z);
      box(posts, 0.22, 1.05, 0.22, px, y + 0.55, z, s);
      // 斜撑（相邻柱交叉）
      if (i < N) {
        const z2 = zs[i + 1];
        const y2 = bridgeHeightAt(z2);
        const midz = (z + z2) / 2, midy = (y + y2) / 2 + 0.5;
        const dz = z2 - z;
        for (const sgn of [-1, 1]) {
          const dy = (y2 - y) + sgn * 1.0;   // 两根交叉斜撑
          const len = Math.hypot(dz, dy);
          const ang = Math.atan2(dy, dz);
          const g = new THREE.BoxGeometry(0.12, 0.12, len);
          const m = new THREE.Matrix4();
          m.makeRotationX(ang);
          m.setPosition(px, midy, midz);
          g.applyMatrix4(m);
          braces.push(g);
        }
      }
    }
    // 上横梁沿弧
    const rail = [];
    for (let i = 0; i < N; i++) {
      const z = (zs[i] + zs[i + 1]) / 2;
      box(rail, 0.18, 0.22, 0.7, px, bridgeHeightAt(z) + 1.05, z, slopeAt(z));
    }
    rails.push(mergeGeometries(rail, false));
  }
  const postMesh = new THREE.Mesh(mergeGeometries(posts, false), railMat);
  const railMesh = new THREE.Mesh(mergeGeometries(rails, false), railMat);
  const braceMesh = new THREE.Mesh(mergeGeometries(braces, false), braceMat);
  group.add(postMesh, railMesh, braceMesh);

  // ---- 桥中遮阳亭 ----
  const canopy = new THREE.Group();
  const colMat = toon({ color: 0x8a4a2a });
  const zc = (BRIDGE.z0 + BRIDGE.z1) / 2; // 30
  for (const side of [-1, 1]) {
    for (const off of [-1, 1]) {
      const col = new THREE.Mesh(
        flat(new THREE.CylinderGeometry(0.12, 0.14, 2.6, 6)),
        colMat
      );
      col.position.set(side * 2.6, bridgeHeightAt(zc + off * 2.2) + 1.4, zc + off * 2.2);
      canopy.add(col);
    }
  }
  // 亭顶
  const roofGeo = flat(new THREE.BoxGeometry(7.2, 0.18, 4.4));
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, bridgeHeightAt(zc) + 2.7, zc);
  canopy.add(roof);
  const ridge = new THREE.Mesh(flat(new THREE.CylinderGeometry(0.1, 0.1, 6.6, 6)), colMat);
  ridge.rotation.z = Math.PI / 2;
  ridge.position.set(0, bridgeHeightAt(zc) + 2.85, zc);
  canopy.add(ridge);
  group.add(canopy);

  scene.add(group);
  return group;
}
