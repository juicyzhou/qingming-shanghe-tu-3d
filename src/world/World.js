import * as THREE from 'three';
import { buildTerrain } from './terrain.js';
import { buildRiver } from './river.js';
import { buildBridge } from './bridge.js';
import { buildBuildings } from './buildings.js';
import { buildDecorations } from './decorations.js';
import { toon, flat } from '../render/materials.js';

function buildInteractables(scene) {
  const items = [];
  const group = new THREE.Group();

  // 药草（北岸桥东）
  const herbG = new THREE.Group();
  const leafMat = toon({ color: 0x4f8a4a });
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(
      flat(new THREE.BoxGeometry(0.18, 0.4, 0.18)),
      leafMat
    );
    leaf.position.set((i % 3 - 1) * 0.3, 0.2, Math.floor(i / 3) * 0.3 - 0.15);
    leaf.rotation.y = i;
    herbG.add(leaf);
  }
  herbG.position.set(9.5, 0, 18.6);
  group.add(herbG);
  items.push({ id: 'herb', label: '药草', x: 9.5, z: 18.6, group: herbG });

  // 布匹（栈桥尽头）
  const clothG = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const roll = new THREE.Mesh(
      flat(new THREE.CylinderGeometry(0.22, 0.22, 1.1, 8)),
      toon({ color: ['#e8e0cc', '#5d6f9e', '#b07c36'][i] })
    );
    roll.rotation.x = Math.PI / 2;
    roll.position.set(0, 0.25, (i - 1) * 0.5);
    clothG.add(roll);
  }
  clothG.position.set(14.2, 0.05, 20.4);
  group.add(clothG);
  items.push({ id: 'cloth_bundle', label: '布匹', x: 14.2, z: 20.4, group: clothG });

  scene.add(group);
  return items;
}

export class World {
  constructor(scene) {
    this.scene = scene;
    buildTerrain(scene);
    this.river = buildRiver(scene);
    buildBridge(scene);
    this.interiors = buildBuildings(scene); // 可进入店铺（门/内室）
    const deco = buildDecorations(scene);
    this.boats = [deco.boatA, deco.boatB, deco.boatC];
    this.interactables = buildInteractables(scene);
  }

  // 水面动画 + 船身浮动
  update(dt, t) {
    const wm = this.river.userData.waterMat;
    if (wm) wm.userData.uniforms.uTime.value = t;
    for (let i = 0; i < this.boats.length; i++) {
      const b = this.boats[i];
      b.position.y = 0.35 + Math.sin(t * 0.9 + i * 2.1) * 0.05;
      b.rotation.y = Math.sin(t * 0.12 + i) * 0.04;
    }
  }
}
