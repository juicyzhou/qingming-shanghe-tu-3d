import * as THREE from 'three';
import { makeWater } from '../render/shaders.js';
import { toon } from '../render/materials.js';
import { RIVER } from './layout.js';

// 汴河：水面 + 两岸沙滩
export function buildRiver(scene) {
  const group = new THREE.Group();

  const width = RIVER.zMax - RIVER.zMin; // 14
  const halfLen = RIVER.halfW;

  // 水面
  const waterMat = makeWater();
  const water = new THREE.Mesh(new THREE.PlaneGeometry(halfLen * 2, width), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, RIVER.y, (RIVER.zMin + RIVER.zMax) / 2);
  group.add(water);
  group.userData.waterMat = waterMat;

  // 北岸沙滩
  const sandMat = toon({ color: 0xc4ac7c });
  const sandN = new THREE.Mesh(new THREE.PlaneGeometry(halfLen * 2, 3), sandMat);
  sandN.rotation.x = -Math.PI / 2;
  sandN.position.set(0, 0.04, RIVER.zMin - 1.5);
  group.add(sandN);
  const sandS = sandN.clone();
  sandS.position.z = RIVER.zMax + 1.5;
  group.add(sandS);

  // 船影水痕（装饰带）
  const foam = toon({ color: 0xd9cc9c, transparent: true, opacity: 0.5 });
  const f = new THREE.Mesh(new THREE.PlaneGeometry(halfLen * 2, 1.2), foam);
  f.rotation.x = -Math.PI / 2;
  f.position.set(0, RIVER.y + 0.02, RIVER.zMin);
  group.add(f);

  scene.add(group);
  return group;
}
