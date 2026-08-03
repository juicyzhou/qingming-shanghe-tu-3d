import * as THREE from 'three';
import { rand, rf, ri, pick } from '../core/rand.js';

// ============================================================
//  Canvas 贴图工厂 —— 全部程序化绘制，零外部图片文件
// ============================================================

const CACHE = {};

function makeCanvasTexture(canvas, repeat = null) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat.x, repeat.y);
  }
  tex.needsUpdate = true;
  return tex;
}

function cached(key, fn) {
  if (!CACHE[key]) CACHE[key] = fn();
  return CACHE[key];
}

const FONT_CN = '"Kaiti SC","KaiTi","STKaiti","FangSong","SimSun",serif';
const FONT_SEAL = '"FangSong","Kaiti SC","KaiTi","SimSun",serif';

// ---------- 纸张底色 ----------
export function paperTexture() {
  return cached('paper', () => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#efe4c8';
    g.fillRect(0, 0, 256, 256);
    // 纸纤维噪点
    for (let i = 0; i < 900; i++) {
      const a = rf(0.02, 0.08);
      g.fillStyle = `rgba(${ri(120, 165)},${ri(100, 140)},${ri(70, 105)},${a})`;
      g.fillRect(rand() * 256, rand() * 256, rf(1, 2.6), rf(1, 2.6));
    }
    for (let i = 0; i < 30; i++) {
      g.fillStyle = `rgba(255,252,240,${rf(0.05, 0.12)})`;
      g.fillRect(rand() * 256, rand() * 256, rf(3, 14), rf(0.8, 1.6));
    }
    return makeCanvasTexture(c);
  });
}

// ---------- 石板路 ----------
export function roadTexture() {
  return cached('road', () => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#c8b898';
    g.fillRect(0, 0, 256, 256);
    // 错缝石板
    const cell = 64;
    for (let row = 0; row < 4; row++) {
      const off = row % 2 === 0 ? 0 : cell / 2;
      for (let col = -1; col < 5; col++) {
        const x = col * cell + off;
        const y = row * cell;
        const tone = ri(185, 215);
        g.fillStyle = `rgb(${tone},${tone - 14},${tone - 34})`;
        g.fillRect(x + 2, y + 2, cell - 4, cell - 4);
        // 裂缝
        if (rand() < 0.5) {
          g.strokeStyle = `rgba(${ri(120,150)},${ri(100,130)},${ri(75,100)},0.5)`;
          g.beginPath();
          g.moveTo(x + rf(6, 20), y + rf(4, 12));
          g.lineTo(x + rf(20, 44), y + rf(30, 54));
          g.stroke();
        }
      }
    }
    // 整体磨损
    for (let i = 0; i < 500; i++) {
      g.fillStyle = `rgba(${ri(150,190)},${ri(130,170)},${ri(100,135)},${rf(0.03, 0.09)})`;
      g.fillRect(rand() * 256, rand() * 256, rf(1, 3), rf(1, 3));
    }
    return makeCanvasTexture(c, { x: 6, y: 6 });
  });
}

// ---------- 泥土 ----------
export function dirtTexture() {
  return cached('dirt', () => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#a98e66';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1400; i++) {
      const t = rf(0, 1);
      const base = t < 0.4 ? '#8d744f' : t < 0.8 ? '#b49a74' : '#c8b088';
      g.fillStyle = base;
      g.globalAlpha = rf(0.15, 0.45);
      g.beginPath();
      g.arc(rand() * 256, rand() * 256, rf(1, 5), 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    return makeCanvasTexture(c, { x: 8, y: 8 });
  });
}

// ---------- 草地 ----------
export function grassTexture() {
  return cached('grass', () => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#b8a878';
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2000; i++) {
      const col = pick(['#a7a060', '#b7b275', '#8f8f52', '#c0b878', '#9aa255']);
      g.fillStyle = col;
      g.globalAlpha = rf(0.25, 0.7);
      const x = rand() * 256, y = rand() * 256, len = rf(3, 7);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + rf(-1.5, 1.5), y - len);
      g.lineTo(x + 1.5, y);
      g.fill();
    }
    g.globalAlpha = 1;
    return makeCanvasTexture(c, { x: 10, y: 10 });
  });
}

// ---------- 木板墙 ----------
export function woodTexture() {
  return cached('wood', () => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#8a6a44';
    g.fillRect(0, 0, 128, 128);
    const plank = 26;
    for (let i = 0; i < 6; i++) {
      const tone = pick(['#7d5f3c', '#936f45', '#8b6840', '#845f3a', '#997649']);
      g.fillStyle = tone;
      g.fillRect(0, i * plank + 1, 128, plank - 2);
      // 木纹
      g.strokeStyle = `rgba(60,40,20,${rf(0.15, 0.35)})`;
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        const yy = i * plank + rf(4, plank - 4);
        g.moveTo(0, yy);
        g.bezierCurveTo(32, yy + rf(-3, 3), 70, yy + rf(-3, 3), 128, yy + rf(-2, 2));
        g.stroke();
      }
      // 板缝
      g.fillStyle = 'rgba(50,32,16,0.55)';
      g.fillRect(0, i * plank + plank - 1, 128, 2);
    }
    return makeCanvasTexture(c, { x: 2, y: 2 });
  });
}

// ---------- 白墙（山墙/泥墙） ----------
export function wallTexture() {
  return cached('wall', () => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#d9cba8';
    g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 500; i++) {
      g.fillStyle = `rgba(${ri(170, 210)},${ri(160, 195)},${ri(130, 165)},${rf(0.08, 0.25)})`;
      g.fillRect(rand() * 128, rand() * 128, rf(2, 6), rf(2, 6));
    }
    return makeCanvasTexture(c, { x: 2, y: 2 });
  });
}

// ---------- 屋面瓦片 ----------
export function roofTexture() {
  return cached('roof', () => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#3a3a3a';
    g.fillRect(0, 0, 128, 128);
    const row = 16;
    for (let i = 0; i < 8; i++) {
      const off = i % 2 === 0 ? 0 : 16;
      for (let j = -1; j < 9; j++) {
        const tone = pick([70, 78, 62, 84, 68]);
        g.fillStyle = `rgb(${tone},${tone},${tone + 4})`;
        g.beginPath();
        g.arc(j * 32 + off + 16, i * row + row / 2, row * 0.62, Math.PI, 0);
        g.fill();
      }
    }
    return makeCanvasTexture(c, { x: 3, y: 2 });
  });
}

// ---------- 布幌（竖长条店幌） ----------
export function bannerTexture(text, bgColor = '#b8402a', fgColor = '#f7edd0', w = 48, h = 160) {
  const key = `banner_${text}_${bgColor}`;
  return cached(key, () => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = bgColor;
    g.fillRect(0, 0, w, h);
    // 布纹
    for (let i = 0; i < 200; i++) {
      g.fillStyle = `rgba(255,255,255,${rf(0.04, 0.1)})`;
      g.fillRect(rand() * w, rand() * h, 1.2, rf(2, 6));
    }
    g.strokeStyle = 'rgba(120,40,20,0.6)';
    g.lineWidth = 1.5;
    g.strokeRect(2, 2, w - 4, h - 4);
    // 文字
    g.fillStyle = fgColor;
    g.font = `bold ${Math.floor(w * 0.62)}px ${FONT_CN}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.save();
    g.translate(w / 2, h / 2);
    const chars = [...text];
    if (chars.length === 1) {
      g.fillText(chars[0], 0, 0);
    } else {
      // 竖排
      for (let i = 0; i < chars.length; i++) {
        g.save();
        g.translate(0, (i - (chars.length - 1) / 2) * (w * 0.86));
        g.rotate(0);
        g.fillText(chars[i], 0, 0);
        g.restore();
      }
    }
    g.restore();
    // 旗杆边
    g.fillStyle = 'rgba(60,30,10,0.8)';
    g.fillRect(0, 0, 2.5, h);
    return makeCanvasTexture(c);
  });
}

// ---------- 横挂牌匾 ----------
export function signTexture(text, w = 220, h = 56, bg = '#24443b', fg = '#e8dcb0') {
  const key = `sign_${text}`;
  return cached(key, () => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = fg;
    g.lineWidth = 3;
    g.strokeRect(3, 3, w - 6, h - 6);
    g.strokeStyle = 'rgba(0,0,0,0.25)';
    g.lineWidth = 1;
    g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = fg;
    g.font = `bold ${h * 0.58}px ${FONT_CN}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 2);
    return makeCanvasTexture(c);
  });
}

// ---------- 人脸贴图 ----------
export function faceTexture(cfg = {}) {
  const key = `face_${JSON.stringify(cfg)}`;
  if (CACHE[key]) return CACHE[key];
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  const skin = cfg.skin || '#e8b98a';
  g.fillStyle = skin;
  g.fillRect(0, 0, s, s);

  const hairColor = cfg.hair || '#3a2a22';
  // 刘海/发际
  g.fillStyle = hairColor;
  g.fillRect(0, 0, s, 30);
  for (let i = 0; i < 7; i++) {
    g.beginPath();
    g.arc(rand() * s, 18 + rf(0, 14), rf(8, 16), 0, Math.PI);
    g.fill();
  }

  // 眉毛
  const browY = 46;
  g.strokeStyle = cfg.eyebrow || hairColor;
  g.lineWidth = cfg.old ? 3 : 2.2;
  const browTilt = cfg.browTilt || 0;
  g.beginPath();
  g.moveTo(s * 0.24, browY + browTilt);
  g.lineTo(s * 0.46, browY - 2 - browTilt);
  g.stroke();
  g.beginPath();
  g.moveTo(s * 0.54, browY - 2 - browTilt);
  g.lineTo(s * 0.76, browY + browTilt);
  g.stroke();

  // 眼睛
  const eyeY = 58;
  const eyeX1 = s * 0.30, eyeX2 = s * 0.70;
  const eyeW = cfg.eyeW || 7;
  g.fillStyle = '#2a2018';
  g.beginPath();
  g.ellipse(eyeX1, eyeY, eyeW, cfg.eyeTall || 3.6, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.ellipse(eyeX2, eyeY, eyeW, cfg.eyeTall || 3.6, 0, 0, Math.PI * 2);
  g.fill();
  // 眼白点
  g.fillStyle = 'rgba(255,250,240,0.85)';
  g.beginPath();
  g.arc(eyeX1 + 1.5, eyeY - 1.4, 1.5, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.arc(eyeX2 + 1.5, eyeY - 1.4, 1.5, 0, Math.PI * 2);
  g.fill();

  // 鼻子
  g.strokeStyle = cfg.noseLine || 'rgba(160,105,65,0.7)';
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(s * 0.5, 62);
  g.lineTo(s * 0.46, 76);
  g.quadraticCurveTo(s * 0.52, 80, s * 0.58, 74);
  g.stroke();

  // 嘴
  g.strokeStyle = 'rgba(150,70,60,0.9)';
  g.lineWidth = 2.2;
  g.beginPath();
  g.moveTo(s * 0.38, cfg.old ? 92 : 88);
  g.quadraticCurveTo(s * 0.5, cfg.smile ? 97 : 92, s * 0.62, cfg.old ? 92 : 88);
  g.stroke();

  // 胡须 / 皱纹 / 腮红
  if (cfg.beard) {
    g.fillStyle = cfg.beardColor || hairColor;
    // 络腮
    g.beginPath();
    g.ellipse(s * 0.5, 104, 34, cfg.beard === 'full' ? 18 : 10, 0, 0, Math.PI);
    g.fill();
    // 八字胡
    g.lineWidth = 3.4;
    g.beginPath();
    g.moveTo(s * 0.36, 82);
    g.lineTo(s * 0.28, 88);
    g.moveTo(s * 0.64, 82);
    g.lineTo(s * 0.72, 88);
    g.stroke();
  }
  if (cfg.old) {
    g.strokeStyle = 'rgba(150,100,70,0.5)';
    g.lineWidth = 1.3;
    for (const x of [0.2, 0.8]) {
      g.beginPath();
      g.moveTo(s * x, 30);
      g.lineTo(s * (x - 0.05), 40);
      g.lineTo(s * x, 50);
      g.stroke();
    }
  }
  if (cfg.blush) {
    g.fillStyle = 'rgba(220,120,100,0.22)';
    g.beginPath();
    g.arc(s * 0.27, 76, 8, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(s * 0.73, 76, 8, 0, Math.PI * 2);
    g.fill();
  }

  const tex = makeCanvasTexture(c);
  CACHE[key] = tex;
  return tex;
}

// ---------- 室内挂轴（水墨山水） ----------
export function scrollTexture(variant = 0) {
  const key = `scroll_${variant}`;
  return cached(key, () => {
    const c = document.createElement('canvas');
    c.width = 72; c.height = 160;
    const g = c.getContext('2d');
    g.fillStyle = '#efe6cd';
    g.fillRect(0, 0, 72, 160);
    // 远山（暖赭，避免灰蓝）
    g.fillStyle = '#b09a78';
    g.beginPath();
    g.moveTo(0, 130); g.lineTo(18, 96); g.lineTo(34, 118); g.lineTo(52, 86); g.lineTo(72, 122); g.lineTo(72, 130); g.fill();
    // 近山（暖绿）
    g.fillStyle = '#8a7a52';
    g.beginPath();
    g.moveTo(0, 160); g.lineTo(20, 128); g.lineTo(40, 150); g.lineTo(60, 124); g.lineTo(72, 138); g.lineTo(72, 160); g.fill();
    // 日
    g.fillStyle = 'rgba(190,60,40,0.75)';
    g.beginPath(); g.arc(52, 40, 9, 0, Math.PI * 2); g.fill();
    // 题字
    g.fillStyle = 'rgba(60,50,30,0.6)';
    g.font = '11px "Kaiti SC","FangSong",serif';
    g.textAlign = 'left';
    g.fillText('远山含黛', 8, 20);
    // 裱边
    g.strokeStyle = '#8a6a44'; g.lineWidth = 2; g.strokeRect(1, 1, 70, 158);
    const tex = makeCanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  });
}

// ---------- 店门 ----------
export function doorTexture() {
  return cached('door', () => {
    const c = document.createElement('canvas');
    c.width = 96; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#6e4a28';
    g.fillRect(0, 0, 96, 128);
    // 门板纹理
    for (let i = 0; i < 6; i++) {
      g.fillStyle = pick(['#7d5a33', '#67431f', '#8a6538', '#5f3d1c']);
      g.fillRect(2, i * 21 + 1, 92, 20);
      g.strokeStyle = 'rgba(50,30,12,0.6)';
      g.strokeRect(2, i * 21 + 1, 92, 20);
    }
    // 门钉
    for (let r = 0; r < 5; r++) for (let col = 0; col < 4; col++) {
      g.fillStyle = '#b8915a';
      g.beginPath();
      g.arc(16 + col * 21, 12 + r * 24, 3, 0, Math.PI * 2);
      g.fill();
    }
    // 门环
    g.strokeStyle = '#b8915a';
    g.lineWidth = 3;
    g.strokeRect(40, 60, 16, 16);
    g.strokeStyle = '#4a2f10';
    g.lineWidth = 2;
    g.strokeRect(0, 0, 96, 128);
    return makeCanvasTexture(c);
  });
}

// ---------- 窗（木格窗） ----------
export function windowTexture(warm = true) {
  const key = `window_${warm}`;
  return cached(key, () => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = warm ? '#7a5a2c' : '#4a3a28';
    g.fillRect(0, 0, 64, 64);
    // 暖光
    g.fillStyle = 'rgba(255,214,150,0.5)';
    g.fillRect(0, 0, 64, 64);
    // 格栅
    g.strokeStyle = '#3a2a16';
    g.lineWidth = 5;
    const grid = 4;
    for (let i = 0; i <= grid; i++) {
      const p = i * (64 / grid);
      g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 64); g.stroke();
      g.beginPath(); g.moveTo(0, p); g.lineTo(64, p); g.stroke();
    }
    g.strokeStyle = '#2a1c0c';
    g.lineWidth = 2;
    g.strokeRect(1, 1, 62, 62);
    return makeCanvasTexture(c);
  });
}

// ---------- 武器/货物占位色 ----------
export const CLOTH_PALETTE = [
  '#a4432e', '#2f6d4f', '#5d6f9e', '#b07c36', '#7a5aa0',
  '#3c7a82', '#b04a4a', '#6e8a4f', '#8a6d3b', '#955f8f',
  '#4a6b9a', '#b0622f', '#54725a', '#a86e54', '#7a8c35',
];

// ============================================================
//  Toon 手绘风着色器 —— 暖色量化光照 + 边缘光
// ============================================================

// P1-2 傍晚暖光：默认暮色（太阳略低、更暖、环境微提）；?day=1 恢复正午（用于 A/B 对比/审美偏好）
const __dusk = new URLSearchParams(location.search).get('day') !== '1';

export const LIGHT_UNIFORMS = {
  uSunDir: { value: new THREE.Vector3(__dusk ? 0.5 : 0.45, __dusk ? 0.74 : 0.85, __dusk ? 0.34 : 0.3).normalize() },
  uSunColor: { value: new THREE.Color(__dusk ? '#ffe8bf' : '#fff0d0').multiplyScalar(0.8) },
  uAmbient: { value: new THREE.Color(__dusk ? '#f4dfbe' : '#f5e6c8').multiplyScalar(__dusk ? 0.53 : 0.5) },
  uRimColor: { value: new THREE.Color('#ffd9a0') },
  uRimPower: { value: 2.4 },
  uSteps: { value: 3.0 },
  uBoost: { value: 0 },    // 室内环境光增益，避免背阴面压成灰暗
  uOpacity: { value: 1 },  // 透明度
  uUseAlpha: { value: 0 }, // 是否使用贴图 alpha（卷轴等镂空）
};

// 手动雾效（避免 three 内置 fog 系统与自定义 shader 的 uniform 冲突）
export const FOG_UNIFORMS = {
  uFogColor: { value: new THREE.Color(__dusk ? '#e2cfa8' : '#e7d8b4') },
  uFogNear: { value: 55 },
  uFogFar: { value: 200 },
};

const toonVert = /* glsl */`
varying vec3 vNormal;
varying vec3 vView;
varying vec2 vUv;
varying float vFogDepth;
void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(cameraPosition - (modelMatrix * vec4(position, 1.0)).xyz);
  vFogDepth = -mvPosition.z;
  gl_Position = projectionMatrix * mvPosition;
}`;

const toonFrag = /* glsl */`
uniform vec3 uColor;
uniform sampler2D uMap;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uAmbient;
uniform vec3 uRimColor;
uniform float uRimPower;
uniform float uSteps;
uniform float uBoost;
uniform float uOpacity;
uniform float uUseAlpha;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
varying vec3 vNormal;
varying vec3 vView;
varying vec2 vUv;
varying float vFogDepth;
void main() {
  vec4 tex = texture2D(uMap, vUv);
  vec3 base = uColor;
  base *= tex.rgb;
  float alpha = uOpacity;
  if (uUseAlpha > 0.5) { alpha *= tex.a; if (alpha < 0.1) discard; } // 卷轴镂空
  // 法线/视线 NaN 防护（真实 GPU 上 normalize(0) 会产生垃圾三角形）
  vec3 n = vNormal;
  if (!(length(n) > 1e-5)) n = vec3(0.0, 0.0, 1.0);
  n = normalize(n);
  vec3 vv = vView;
  if (!(length(vv) > 1e-5)) vv = vec3(0.0, 0.0, 1.0);
  vv = normalize(vv);
  vec3 sd = normalize(uSunDir);
  float ndl = max(dot(n, sd), 0.0);
  float d = floor(ndl * max(uSteps, 0.001) + 0.55) / max(uSteps, 0.001); // 量化明暗
  d = max(d, 0.15);                                // 暗部保底
  vec3 col = uAmbient * (1.0 + uBoost) + uSunColor * d;
  // 边缘光：仅向阳面、强度克制
  float rim = pow(1.0 - max(dot(n, vv), 0.0), uRimPower);
  rim *= smoothstep(0.05, 0.3, ndl);
  col += uRimColor * rim * 0.3;
  col *= base;
  // 柔和高光压缩（防过曝发白，同时保持暖色饱和）
  col = 1.0 - exp(-col * 1.5);
  float fogFactor = smoothstep(uFogNear, uFogFar, max(vFogDepth, 0.0));
  col = mix(col, uFogColor, clamp(fogFactor, 0.0, 1.0));
  gl_FragColor = vec4(col, alpha);
}`;

const WHITE_TEX = new THREE.CanvasTexture((() => {
  const c = document.createElement('canvas'); c.width = c.height = 2;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 2, 2);
  return c;
})());

// 每个材质共享同一份光照/雾 uniforms 的 value 对象 → 全局调光一次即全部生效
export function toon({ color = 0xffffff, map = null, transparent = false, opacity = 1, side = null, boost = 0, useAlpha = false } = {}) {
  const uniforms = Object.assign({}, {
    uColor: { value: new THREE.Color(color) },
    uMap: { value: map || WHITE_TEX },
  }, LIGHT_UNIFORMS, FOG_UNIFORMS);
  if (boost > 0) uniforms.uBoost = { value: boost };      // 室内材质独立环境光增益
  if (transparent) uniforms.uOpacity = { value: opacity }; // 透明材质独立透明度
  if (useAlpha) uniforms.uUseAlpha = { value: 1 };         // 卷轴等镂空
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: toonVert,
    fragmentShader: toonFrag,
    transparent,
    opacity,
  });
  if (side) mat.side = side;
  return mat;
}

// 转为平直分段着色（低模棱角感）并重算法线
export function flat(geometry) {
  const nonIndexed = geometry.toNonIndexed();
  nonIndexed.computeVertexNormals();
  return nonIndexed;
}

// 简易标准色盒（供不需要贴图的小件）
export function solid({ color = 0xffffff, roughness = 1, metalness = 0 } = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}
