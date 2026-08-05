import * as THREE from 'three';
import { buildTerrain, buildMountains } from './terrain.js';
import { Sky } from '../render/sky.js';
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
  herbG.position.set(26, 0.45, 18.5); // 码头旁北岸
  group.add(herbG);
  items.push({ id: 'herb', label: '药草', x: 26, z: 18.5, group: herbG });

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
  clothG.position.set(26, 0.42, 20);
  group.add(clothG);
  items.push({ id: 'cloth_bundle', label: '布匹', x: 26, z: 20, group: clothG });

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
  wineG.position.set(9, 0.1, 4); // 醉仙楼门前
  group.add(wineG);
  items.push({ id: 'wine_jar', label: '酒坛', x: 9, z: 4, group: wineG });

  // 米袋（米铺门口）
  const riceG = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const sack = new THREE.Mesh(flat(new THREE.SphereGeometry(0.32, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5)),
      toon({ color: '#c8b088' }));
    sack.scale.y = 1.4;
    sack.position.set((i - 1) * 0.55, 0.22, 0);
    riceG.add(sack);
  }
  riceG.position.set(-9, 0.1, 56); // 米铺门前
  group.add(riceG);
  items.push({ id: 'rice_sack', label: '米袋', x: -9, z: 56, group: riceG });

  // 手稿（布庄旁）
  const scriptG = new THREE.Group();
  const scroll = new THREE.Mesh(flat(new THREE.CylinderGeometry(0.14, 0.14, 0.9, 8)),
    toon({ color: '#e8e0cc' }));
  scroll.rotation.x = Math.PI / 2;
  scroll.position.y = 0.15;
  scriptG.add(scroll);
  scriptG.position.set(9.5, 0.1, 44); // 布庄门前
  group.add(scriptG);
  items.push({ id: 'script', label: '手稿', x: 9.5, z: 44, group: scriptG });

  // P2-1 小玩法场景物：说书棚（听书）/ 花灯（猜谜）/ 竞速舟（赛船）
  // 说书棚醒木台（说书棚）
  const boothG = new THREE.Group();
  const podium = new THREE.Mesh(flat(new THREE.BoxGeometry(1.0, 0.7, 0.6)), toon({ color: '#8a6a44' }));
  podium.position.y = 0.35;
  boothG.add(podium);
  const block = new THREE.Mesh(flat(new THREE.BoxGeometry(0.22, 0.1, 0.18)), toon({ color: '#5a3a20' }));
  block.position.set(0, 0.75, 0.25);
  boothG.add(block);
  boothG.position.set(-26, 0, 15.2);
  group.add(boothG);
  items.push({ id: 'storybooth', label: '听书', x: -26, z: 15.2, group: boothG });

  // 花灯（夜市猜谜，集市口）
  const lanternG = new THREE.Group();
  const pole = new THREE.Mesh(flat(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6)), toon({ color: '#4a3a26' }));
  pole.position.y = 1.1;
  lanternG.add(pole);
  const lamp = new THREE.Mesh(flat(new THREE.SphereGeometry(0.32, 8, 6)), toon({ color: '#c8602a' }));
  lamp.position.y = 2.2;
  lanternG.add(lamp);
  const string = new THREE.Mesh(flat(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 4)), toon({ color: '#7a5a34' }));
  string.position.y = 2.5;
  lanternG.add(string);
  lanternG.position.set(-21, 0, 4);
  group.add(lanternG);
  items.push({ id: 'lantern', label: '花灯', x: -21, z: 4, group: lanternG });

  // 竞速舟（码头边，撑船竞速）
  const raceG = new THREE.Group();
  const hull = new THREE.Mesh(flat(new THREE.ConeGeometry(0.5, 1.6, 6)), toon({ color: '#b06a3a' }));
  hull.rotation.x = Math.PI / 2;
  hull.position.y = 0.35;
  raceG.add(hull);
  const flag = new THREE.Mesh(flat(new THREE.BoxGeometry(0.02, 0.5, 0.3)), toon({ color: '#d8402a' }));
  flag.position.set(0, 0.9, 0.75);
  raceG.add(flag);
  raceG.position.set(26, 0.1, 17); // 码头旁
  group.add(raceG);
  items.push({ id: 'raceboat', label: '竞速', x: 26, z: 17, group: raceG });

  // 主线路引（城门内侧，进京赶考用）
  const permitG = new THREE.Group();
  const pscroll = new THREE.Mesh(flat(new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8)), toon({ color: '#e8e0cc' }));
  pscroll.rotation.x = Math.PI / 2;
  pscroll.position.y = 0.18;
  const pseal = new THREE.Mesh(flat(new THREE.BoxGeometry(0.18, 0.04, 0.14)), toon({ color: '#a03a28' }));
  pseal.position.set(0, 0.4, 0.08);
  permitG.add(pscroll);
  permitG.add(pseal);
  permitG.position.set(0, 0.1, 21.5); // 桥北巡检处（原城门路引迁此）
  group.add(permitG);
  items.push({ id: 'permit', label: '路引', x: 0, z: 21.5, group: permitG });

  scene.add(group);
  return items;
}

// 世界痕迹感：任务完成后出现的可见变化（初始隐藏，由 Game 按任务进度点亮）
function buildWorldChanges(scene) {
  const changes = {};
  const grp = new THREE.Group();
  const hide = (o) => { o.visible = false; grp.add(o); };

  // 客栈添柴完成 → 客栈烟囱冒烟
  {
    const smoke = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const puff = new THREE.Mesh(flat(new THREE.SphereGeometry(0.38 + i * 0.12, 6, 5)),
        toon({ color: '#cfd6e0', transparent: true, opacity: 0.32 }));
      puff.position.set((i - 1.5) * 0.22, 4.6 + i * 0.55, -0.2);
      puff.scale.y = 1.5;
      smoke.add(puff);
    }
    smoke.position.set(14, 3.6, 19.5); // 客栈（桥北东）烟囱
    hide(smoke);
    changes.inn_wood = smoke;
  }
  // 米铺送粮完成 → 米铺门口多两袋米
  {
    const sacks = new THREE.Group();
    for (let i = 0; i < 2; i++) {
      const sack = new THREE.Mesh(flat(new THREE.SphereGeometry(0.34, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5)),
        toon({ color: '#c8b088' }));
      sack.scale.y = 1.4;
      sack.position.set(-16.5 + i * 0.6, 0.24, 58);
      sacks.add(sack);
    }
    hide(sacks);
    changes.rice_deliver = sacks;
  }
  // 醉仙楼送酒完成 → 码头多一坛酒
  {
    const jar = new THREE.Mesh(flat(new THREE.CylinderGeometry(0.3, 0.22, 0.6, 8)), toon({ color: '#8a4a2a' }));
    jar.position.set(26, 0.32, 20.5);
    const lid = new THREE.Mesh(flat(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 8)), toon({ color: '#5a3a20' }));
    lid.position.set(26, 0.66, 20.5);
    const g2 = new THREE.Group();
    g2.add(jar); g2.add(lid);
    hide(g2);
    changes.tavern_wine = g2;
  }
  // 码头送布完成 → 布庄门口多两卷布
  {
    const cloth = new THREE.Group();
    for (let i = 0; i < 2; i++) {
      const roll = new THREE.Mesh(flat(new THREE.CylinderGeometry(0.2, 0.2, 1.0, 8)),
        toon({ color: ['#e8e0cc', '#5d6f9e'][i] }));
      roll.rotation.x = Math.PI / 2;
      roll.position.set(9.5 + i * 0.5, 0.22, 44);
      cloth.add(roll);
    }
    hide(cloth);
    changes.deliver_cloth = cloth;
  }
  // 花灯：集市 5 盏，买灯后逐盏点亮（亮=暖橙，暗=灰）
  {
    const lights = [];
    for (let i = 0; i < 5; i++) {
      const lamp = new THREE.Mesh(flat(new THREE.SphereGeometry(0.28, 8, 6)),
        toon({ color: '#6a6258' }));
      const pole = new THREE.Mesh(flat(new THREE.CylinderGeometry(0.05, 0.05, 1.9, 6)), toon({ color: '#4a3a26' }));
      pole.position.y = 0.95;
      const g2 = new THREE.Group();
      g2.add(pole);
      g2.add(lamp);
      g2.position.set(-20 + i * 2.2, 0, 2 + (i % 2));
      lamp.userData.litColor = new THREE.Color('#ff9a4a'); // 亮灯后的暖色
      hide(g2);
      lights.push({ group: g2, lamp });
    }
    changes.lanterns = lights;
  }

  scene.add(grp);
  return changes;
}

export class World {
  constructor(scene) {
    this.scene = scene;
    buildTerrain(scene);
    buildMountains(scene); // 远山
    this.sky = new Sky(scene); // 天空穹顶/日月/云/光锥
    this.river = buildRiver(scene);
    buildBridge(scene);
    this.interiors = buildBuildings(scene); // 可进入店铺（门/内室）
    const deco = buildDecorations(scene);
    this.boats = [deco.boatA, deco.boatB, deco.boatC];
    this.interactables = buildInteractables(scene);
    this.worldChanges = buildWorldChanges(scene); // 世界痕迹感
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
