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

  // ---- 主街石板路：北岸段 + 南岸段（由虹桥连接，路面加宽至 13） ----
  const roadMat = toon({ color: 0xcfc0a2, map: roadTexture() });
  const roadGeo = flat(new THREE.PlaneGeometry(13, 1));
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

// 天空：白天太阳、夜晚星月（Sprite/Points，透明度由 Game 随昼夜切换）
export function buildSky(scene) {
  const group = new THREE.Group();

  // 太阳（暖光晕）
  const sunTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 8, 64, 64, 60);
    grad.addColorStop(0, 'rgba(255,240,190,1)');
    grad.addColorStop(0.4, 'rgba(255,205,120,0.85)');
    grad.addColorStop(1, 'rgba(255,185,85,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  sun.scale.set(36, 36, 1);
  sun.position.set(95, 152, 60); // 沿日照方向高空
  group.add(sun);

  // 月亮（冷白光 + 月牙阴影）
  const moonTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 10, 64, 64, 56);
    grad.addColorStop(0, 'rgba(238,243,255,0.95)');
    grad.addColorStop(0.45, 'rgba(220,230,250,0.5)');
    grad.addColorStop(1, 'rgba(205,220,245,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(233,222,200,0.55)'; // 月牙阴影
    g.beginPath(); g.arc(88, 54, 34, 0, Math.PI * 2); g.fill();
    return new THREE.CanvasTexture(c);
  })();
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  moon.scale.set(22, 22, 1);
  moon.position.set(-120, 168, -70);
  group.add(moon);

  // 星星（穹顶点云，夜晚浮现）
  const N = 260;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(0.3 + Math.random() * 0.7); // 上方穹顶
    const r = 230;
    pos[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
    pos[i * 3 + 1] = Math.cos(phi) * r + 10;
    pos[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const dotTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 16;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.beginPath(); g.arc(8, 8, 2.5, 0, Math.PI * 2); g.fill();
    return new THREE.CanvasTexture(c);
  })();
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xffffff, map: dotTex, transparent: true, opacity: 0,
    size: 2.4, sizeAttenuation: false, depthWrite: false, fog: false,
  }));
  group.add(stars);

  scene.add(group);
  return { sun, moon, stars };
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
  // 北山（近层，再推远；黛青色，远山如黛）
  ridge(g, -95, -136, 110, 13, 34, '#5f786a');
  ridge(g, -25, -144, 130, 15, 42, '#5f786a');
  ridge(g, 65, -138, 105, 13, 36, '#5f786a');
  // 南山（近层，再推远）
  ridge(g, -95, 146, 115, 13, 36, '#5f786a');
  ridge(g, -20, 154, 130, 15, 42, '#5f786a');
  ridge(g, 70, 148, 105, 13, 34, '#5f786a');
  // 更远的淡山（第二层，更淡更灰，层次在雾里；落在 ±200 地面内）
  const far = new THREE.Group();
  ridge(far, -70, -168, 160, 18, 38, '#8a9c90');
  ridge(far, 55, -174, 180, 20, 42, '#8a9c90');
  ridge(far, -65, 172, 165, 18, 40, '#8a9c90');
  ridge(far, 60, 178, 180, 20, 42, '#8a9c90');
  scene.add(g);
  scene.add(far);
}
