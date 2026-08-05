import * as THREE from 'three';
import { dirtTexture, grassTexture, roadTexture, toon } from '../render/materials.js';
import { flat } from '../render/materials.js';
import { BRIDGE, RIVER } from './layout.js';

// 地面：整块沙土 + 主街石板路（经拱桥连接两岸）+ 河岸草坡
export function buildTerrain(scene) {
  const group = new THREE.Group();

  // ---- 底土 ----
  const ground = new THREE.Mesh(
    flat(new THREE.PlaneGeometry(420, 400)),
    toon({ color: 0xb3a078, map: dirtTexture() })
  );
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  // ---- 河岸草带 ----
  const grass = toon({ color: 0xa9a05c, map: grassTexture() });
  const bankN = new THREE.Mesh(flat(new THREE.PlaneGeometry(200, 7)), grass);
  bankN.rotation.x = -Math.PI / 2;
  bankN.position.set(-40, 0.02, RIVER.zMin - 3);
  group.add(bankN);
  const bankS = new THREE.Mesh(flat(new THREE.PlaneGeometry(200, 7)), grass);
  bankS.rotation.x = -Math.PI / 2;
  bankS.position.set(-40, 0.02, RIVER.zMax + 3);
  group.add(bankS);

  // ---- 主街石板路：北岸段 + 南岸段（由虹桥连接） ----
  const roadMat = toon({ color: 0xcfc0a2, map: roadTexture() });
  const roadGeo = flat(new THREE.PlaneGeometry(9, 1));
  function addRoad(cx, cz, len) {
    const r = new THREE.Mesh(roadGeo, roadMat);
    r.rotation.x = -Math.PI / 2;
    r.scale.set(1, len, 1);
    r.position.set(cx, 0.03, cz);
    group.add(r);
  }
  addRoad(0, (BRIDGE.z0 - 18) / 2, BRIDGE.z0 - (-18));   // 北段：-18 ~ 18
  addRoad(0, (BRIDGE.z1 + 74) / 2, 74 - BRIDGE.z1);      // 南段：42 ~ 74
  // 桥面石板（在桥结构之上）由 bridge.js 处理

  // ---- 集市广场（桥北西侧沙地） ----
  const market = new THREE.Mesh(
    flat(new THREE.PlaneGeometry(34, 34)),
    toon({ color: 0xb39a74, map: dirtTexture() })
  );
  market.rotation.x = -Math.PI / 2;
  market.position.set(-22, 0.02, 8);
  group.add(market);

  scene.add(group);
}

// 远山：北南两列黛青山脊，远景入画
export function buildMountains(scene) {
  const g = new THREE.Group();
  // 远山色（青灰，随雾渐远）
  const mk = (color) => toon({ color });
  const ridge = (x, z, w, h) => {
    const m = new THREE.Mesh(flat(new THREE.ConeGeometry(w, h, 14, 1)), mk('#8a967a'));
    m.position.set(x, h / 2 - 0.5, z);
    m.scale.z = 3.2; // 拉成山脊
    g.add(m);
  };
  // 北山
  for (const [x, z, w, h] of [[-95, -135, 46, 34], [-40, -142, 60, 40], [35, -138, 52, 36], [95, -133, 44, 30]]) ridge(x, z, w, h);
  // 南山
  for (const [x, z, w, h] of [[-90, 135, 50, 38], [-30, 142, 62, 42], [40, 136, 50, 34], [95, 140, 44, 30]]) ridge(x, z, w, h);
  // 更远的淡山（第二层，更雾）
  const far = new THREE.Group();
  for (const [x, z, w, h] of [[-70, -175, 80, 34], [60, -178, 90, 40], [-60, 178, 90, 38], [70, 175, 80, 32]]) {
    const m = new THREE.Mesh(flat(new THREE.ConeGeometry(w, h, 12, 1)), toon({ color: '#a4a887' }));
    m.position.set(x, h / 2 - 0.5, z);
    m.scale.z = 4;
    far.add(m);
  }
  scene.add(g);
  scene.add(far);
}
