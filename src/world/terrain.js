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

// 远山：北南两列黛青山脊，远景入画（单位圆锥按轴向缩放，山脊长轴沿 x、厚度沿 z）
// fogScale 减雾：远山作为背景层，不受远处雾过度淹没，保持"青山入画"可见
export function buildMountains(scene) {
  const g = new THREE.Group();
  const ridge = (group, x, z, lenX, thickZ, h, color) => {
    const m = new THREE.Mesh(flat(new THREE.ConeGeometry(1, 1, 14, 1)), toon({ color, fogScale: 0.4 }));
    m.scale.set(lenX, h, thickZ);          // x=山脊长度, y=高度, z=厚度
    m.position.set(x, h / 2 - 0.5, z);     // 底座贴地
    group.add(m);
  };
  // 北山（近层，位于游玩区以北；黛青色，远山如黛）
  ridge(g, -95, -118, 110, 13, 34, '#5f786a');
  ridge(g, -25, -126, 130, 15, 42, '#5f786a');
  ridge(g, 65, -120, 105, 13, 36, '#5f786a');
  // 南山（近层，位于游玩区以南）
  ridge(g, -95, 132, 115, 13, 36, '#5f786a');
  ridge(g, -20, 140, 130, 15, 42, '#5f786a');
  ridge(g, 70, 134, 105, 13, 34, '#5f786a');
  // 更远的淡山（第二层，更淡更灰，层次在雾里）
  const far = new THREE.Group();
  ridge(far, -70, -158, 170, 22, 40, '#8a9c90');
  ridge(far, 55, -164, 190, 24, 44, '#8a9c90');
  ridge(far, -65, 170, 175, 22, 42, '#8a9c90');
  ridge(far, 60, 176, 190, 24, 44, '#8a9c90');
  scene.add(g);
  scene.add(far);
}
