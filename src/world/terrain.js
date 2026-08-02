import * as THREE from 'three';
import { dirtTexture, grassTexture, roadTexture, toon } from '../render/materials.js';
import { flat } from '../render/materials.js';
import { BRIDGE, GATE, RIVER } from './layout.js';

// 地面：整块沙土 + 主街石板路 + 河岸草坡
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
  const bankN = new THREE.Mesh(flat(new THREE.PlaneGeometry(180, 6)), grass);
  bankN.rotation.x = -Math.PI / 2;
  bankN.position.set(-40, 0.02, RIVER.zMin - 2.2);
  group.add(bankN);
  const bankS = new THREE.Mesh(flat(new THREE.PlaneGeometry(180, 6)), grass);
  bankS.rotation.x = -Math.PI / 2;
  bankS.position.set(-40, 0.02, RIVER.zMax + 2.2);
  group.add(bankS);

  // ---- 主街石板路（南北向，被虹桥与城门断开的两段 + 桥面段） ----
  const roadMat = toon({ color: 0xcfc0a2, map: roadTexture() });
  const roadGeo = flat(new THREE.PlaneGeometry(9, 1));
  function addRoad(cx, cz, len) {
    const r = new THREE.Mesh(roadGeo, roadMat);
    r.rotation.x = -Math.PI / 2;
    r.scale.set(1, len, 1);
    r.position.set(cx, 0.03, cz);
    group.add(r);
  }
  addRoad(0, (GATE.z + 4 + BRIDGE.z0) / 2, BRIDGE.z0 - (GATE.z + 4));  // 北段：-88 ~ 18
  addRoad(0, (BRIDGE.z1 + 120) / 2, 120 - BRIDGE.z1);                  // 南段：42 ~ 120
  // 桥面石板（在桥结构之上）由 bridge.js 处理

  // ---- 集市广场（西侧沙地） ----
  const market = new THREE.Mesh(
    flat(new THREE.PlaneGeometry(30, 34)),
    toon({ color: 0xb39a74, map: dirtTexture() })
  );
  market.rotation.x = -Math.PI / 2;
  market.position.set(-22, 0.02, 10);
  group.add(market);

  scene.add(group);
}
