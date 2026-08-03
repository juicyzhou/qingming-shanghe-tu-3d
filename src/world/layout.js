// 城镇布局数据：街道、店铺、汴河、虹桥、城门 + 碰撞/地形高度
import { rand, rf } from '../core/rand.js';

export const RIVER = { zMin: 23, zMax: 37, y: 0.3, halfW: 200 };
export const BRIDGE = { z0: 18, z1: 42, halfW: 4.8, peak: 6.8 };
export const GATE = { z: -92, passageHalf: 3.5, wallHalf: 80 };

// 虹桥弧线：给定 z → 桥面高度（两端 0，中拱 6.8）
export function bridgeHeightAt(z) {
  const t = (z - BRIDGE.z0) / (BRIDGE.z1 - BRIDGE.z0);
  if (t < 0 || t > 1) return 0;
  return BRIDGE.peak * Math.pow(Math.sin(Math.PI * t), 1.05);
}

// 全局地面高度（含虹桥与栈桥）
export function groundHeight(x, z) {
  if (z >= 15.5 && z <= 21 && x >= 7 && x <= 18) return 0.42; // 栈桥
  if (Math.abs(x) <= BRIDGE.halfW && z >= BRIDGE.z0 && z <= BRIDGE.z1) {
    return bridgeHeightAt(z);
  }
  return 0;
}

// 脚底材质（P1-2 脚步音色）：wood 木板 / soft 草地 / stone 石板
export function groundType(x, z) {
  if (z >= 15.5 && z <= 21 && x >= 7 && x <= 18) return 'wood'; // 栈桥
  if (Math.abs(x) <= BRIDGE.halfW && z >= BRIDGE.z0 && z <= BRIDGE.z1) return 'wood'; // 虹桥
  if (z > 20 && z < 40) return 'soft'; // 河岸草地
  return 'stone';
}

// ============================ 店铺数据 ============================
export const BUILDINGS = [
  // 北街东侧
  { id: 'tavern',  name: '醉仙楼',   sign: '醉仙楼', x: 11.5, z: -70, w: 11, d: 9,  banner: '酒', bannerColor: '#b8402a' },
  { id: 'tea',     name: '清风茶肆', sign: '清风茶肆', x: 11.5, z: -55, w: 10, d: 8,  banner: '茶', bannerColor: '#2f6d4f' },
  { id: 'inn',     name: '悦来客栈', sign: '悦来客栈', x: 11.5, z: -40, w: 12, d: 10, banner: '宿', bannerColor: '#b07c36' },
  // 北街西侧
  { id: 'clinic',  name: '回春堂',   sign: '回春堂', x: -11.5, z: -70, w: 10, d: 8,  banner: '药', bannerColor: '#8a4a3a' },
  { id: 'cloth',   name: '锦绣布庄', sign: '锦绣布庄', x: -11.5, z: -55, w: 11, d: 9,  banner: '布', bannerColor: '#3c7a82' },
  { id: 'incense', name: '宝香斋',   sign: '宝香斋', x: -11.5, z: -40, w: 9,  d: 8,  banner: '香', bannerColor: '#a86e54' },
  // 中街东侧
  { id: 'general', name: '百杂铺',   sign: '百杂铺', x: 11, z: -6, w: 10, d: 8,  banner: '杂', bannerColor: '#6e8a4f' },
  { id: 'snack',   name: '桂香点心', sign: '桂香点心', x: 11, z: 7,  w: 9,  d: 7,  banner: '食', bannerColor: '#b0622f' },
  // 中街西侧
  { id: 'butcher', name: '张记肉铺', sign: '张记肉铺', x: -11, z: -6, w: 9,  d: 7,  banner: '肉', bannerColor: '#b04a4a' },
  { id: 'rice',    name: '丰源米铺', sign: '丰源米铺', x: -11, z: 7,  w: 10, d: 8,  banner: '米', bannerColor: '#8a6d3b' },
];

// 运行时填充：店铺墙（带门洞）+ 室内家具 —— 由 buildings/interiors 注册
export const EXTRA_COLLIDERS = [];

// ============================ 摊位数据 ============================
export const STALLS = [
  { id: 'sugarman',  x: -18, z: 6,  label: '糖人摊' },
  { id: 'story',     x: -26, z: 14, label: '说书棚' },
  { id: 'veg',       x: -22, z: -2, label: '蔬菜摊' },
  { id: 'clothstall', x: -30, z: 2,  label: '布摊' },
  { id: 'carpenter', x: -16, z: 16, label: '木器摊' },
  { id: 'divine',    x: -28, z: 20, label: '卦摊' },
  { id: 'cool',      x: -8,  z: 20, label: '凉粉摊' },
  { id: 'tea_stand', x: 3,   z: 46, label: '桥头茶摊' },
  { id: 'fruit',     x: -10, z: 48, label: '果摊' },
  { id: 'fish',      x: -20, z: 52, label: '鱼摊' },
];

export const stallColliders = STALLS.map(s => ({
  minX: s.x - 1.6, maxX: s.x + 1.6, minZ: s.z - 1.6, maxZ: s.z + 1.6,
}));

// ============================ 树木 ============================
export const TREES = [];
function treeSeed(x, z, r = 1.6) {
  TREES.push({ x, z, r, kind: rand() < 0.55 ? 'willow' : 'pine' });
}
// 北岸柳行
for (let x = -60; x <= 60; x += 6) {
  if (Math.abs(x) < 9) continue;         // 避开桥
  const tx = x + rf(-0.8, 0.8);
  const tz = 19.2 + rf(-1, 1);
  if (tx > 6.5 && tx < 18.5 && tz > 15 && tz < 21.5) continue; // 栈桥区域不留树
  treeSeed(tx, tz);
}
// 南岸柳行
for (let x = -60; x <= 50; x += 7) {
  if (Math.abs(x) < 9) continue;
  treeSeed(x + rf(-0.8, 0.8), 40.6 + rf(-1, 1));
}
// 集市外围
treeSeed(-34, 6); treeSeed(-32, 16); treeSeed(-24, -8); treeSeed(-18, -10); treeSeed(-8, 24);
// 南街两侧
for (let z = 50; z <= 100; z += 8) {
  treeSeed(6.5, z); treeSeed(-6.5, z + 3);
}
// 北街外围
treeSeed(20, -78); treeSeed(-19, -80); treeSeed(20, -50); treeSeed(-19, -52);

export const treeColliders = TREES.map(t => ({ x: t.x, z: t.z, r: t.r + 0.4 }));

// ============================ 碰撞判定 ============================
const sColl = stallColliders, tColl = treeColliders;

export function collides(x, z) {
  // 汴河（虹桥桥面通行）
  if (z >= RIVER.zMin && z <= RIVER.zMax) {
    if (Math.abs(x) <= BRIDGE.halfW && z >= BRIDGE.z0 && z <= BRIDGE.z1) return false;
    return true;
  }
  // 城墙
  if (z >= GATE.z - 2.5 && z <= GATE.z + 2.5) {
    if (Math.abs(x) <= GATE.passageHalf) return false;
    return true;
  }
  // 店铺墙（带门洞） + 室内家具
  for (let i = 0; i < EXTRA_COLLIDERS.length; i++) {
    const c = EXTRA_COLLIDERS[i];
    if (x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ) return true;
  }
  for (let i = 0; i < sColl.length; i++) {
    const c = sColl[i];
    if (x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ) return true;
  }
  for (let i = 0; i < tColl.length; i++) {
    const c = tColl[i];
    if (Math.abs(x - c.x) < c.r && Math.abs(z - c.z) < c.r) return true;
  }
  return false;
}

// 尝试移动：分轴碰撞回退
export function tryMove(px, pz, dx, dz, radius = 0.4) {
  let nx = px + dx;
  if (!collides(nx, pz)) px = nx;
  let nz = pz + dz;
  if (!collides(px, nz)) pz = nz;
  return [px, pz];
}
