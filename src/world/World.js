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
  herbG.position.set(9.5, 0.45, 18.6); // 抬到栈桥面之上
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
  clothG.position.set(14.2, 0.42, 20.4);
  group.add(clothG);
  items.push({ id: 'cloth_bundle', label: '布匹', x: 14.2, z: 20.4, group: clothG });

  // P2-4 新增可交互物品：木柴 / 酒坛 / 米袋 / 手稿
  // 木柴（木器摊旁）
  const woodG = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const log = new THREE.Mesh(flat(new THREE.CylinderGeometry(0.12, 0.12, 1.2, 6)),
      toon({ color: '#6a4a2c' }));
    log.position.set((i % 2) * 0.3 - 0.15, 0.15, Math.floor(i / 2) * 0.26);
    log.rotation.z = (i % 2) * 0.4;
    woodG.add(log);
  }
  woodG.position.set(-16, 0.1, 16.8);
  group.add(woodG);
  items.push({ id: 'wood', label: '木柴', x: -16, z: 16.8, group: woodG });

  // 酒坛（醉仙楼门口）
  const wineG = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const jar = new THREE.Mesh(flat(new THREE.CylinderGeometry(0.3, 0.22, 0.6, 8)),
      toon({ color: i % 2 ? '#8a4a2a' : '#a06a3a' }));
    jar.position.set((i - 1) * 0.5, 0.3, 0);
    const lid = new THREE.Mesh(flat(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 8)),
      toon({ color: '#5a3a20' }));
    lid.position.y = 0.64;
    jar.add(lid);
    wineG.add(jar);
  }
  wineG.position.set(13.8, 0.1, -67.5);
  group.add(wineG);
  items.push({ id: 'wine_jar', label: '酒坛', x: 13.8, z: -67.5, group: wineG });

  // 米袋（米铺门口）
  const riceG = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const sack = new THREE.Mesh(flat(new THREE.SphereGeometry(0.32, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5)),
      toon({ color: '#c8b088' }));
    sack.scale.y = 1.4;
    sack.position.set((i - 1) * 0.55, 0.22, 0);
    riceG.add(sack);
  }
  riceG.position.set(-8.2, 0.1, 9.5);
  group.add(riceG);
  items.push({ id: 'rice_sack', label: '米袋', x: -8.2, z: 9.5, group: riceG });

  // 手稿（布庄旁）
  const scriptG = new THREE.Group();
  const scroll = new THREE.Mesh(flat(new THREE.CylinderGeometry(0.14, 0.14, 0.9, 8)),
    toon({ color: '#e8e0cc' }));
  scroll.rotation.x = Math.PI / 2;
  scroll.position.y = 0.15;
  scriptG.add(scroll);
  scriptG.position.set(-8.6, 0.1, -52.4);
  group.add(scriptG);
  items.push({ id: 'script', label: '手稿', x: -8.6, z: -52.4, group: scriptG });

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
