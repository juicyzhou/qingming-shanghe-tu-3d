import * as THREE from 'three';

// ============================================================
//  天空系统：穹顶渐变 + 太阳/月亮 + 云层 + 阳光光锥
//  成熟标准做法：全包围穹顶 shader，随太阳高度/夜因子插值
// ============================================================

// 太阳方向（从地面指向太阳）：6h 东升(-x) → 12h 南高 → 18h 西落(+x)
export function sunDirection(hour) {
  const t = (hour - 6) / 12; // 0..1
  if (hour < 6 || hour > 18) return null;
  const elev = Math.sin(t * Math.PI); // 0→1→0
  return new THREE.Vector3(-Math.cos(t * Math.PI), elev, Math.sin(t * Math.PI)).normalize();
}

// 月亮方向（夜间）：18h 东升 → 0h 南高 → 6h 西落
export function moonDirection(hour) {
  let t;
  if (hour >= 18 && hour <= 24) t = (hour - 18) / 6;
  else if (hour < 6) t = (hour + 6) / 6;
  else return null;
  const elev = Math.sin(t * Math.PI);
  return new THREE.Vector3(-Math.cos(t * Math.PI), elev, Math.sin(t * Math.PI)).normalize();
}

const skyVert = /* glsl */`
varying vec3 vWorld;
void main() {
  vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const skyFrag = /* glsl */`
uniform vec3 uSunDir;
uniform vec3 uTopDay;
uniform vec3 uHorizonDay;
uniform vec3 uDusk;
uniform vec3 uNightTop;
uniform vec3 uNightHorizon;
varying vec3 vWorld;
void main() {
  vec3 dir = normalize(vWorld);
  float h = dir.y; // -1..1
  float sunH = max(uSunDir.y, 0.0);
  float dayness = smoothstep(-0.04, 0.22, sunH); // 太阳高于地平线 → 白天
  // 白天：地平线暖 → 天顶蓝（指数低→更多蓝，让可见天空更清透）
  vec3 day = mix(uHorizonDay, uTopDay, pow(max(h, 0.0), 0.3));
  // 夜晚：地平线暗蓝 → 天顶深蓝
  vec3 night = mix(uNightHorizon, uNightTop, pow(max(h, 0.0), 0.5));
  // 晨昏暖橙（太阳贴近地平线时，地平线一圈泛红）
  float duskGlow = exp(-pow((sunH - 0.08) * 7.0, 2.0));
  day = mix(day, uDusk, duskGlow * 0.85);
  // 太阳方位光晕（克制：仅太阳附近微亮，不把整片天空冲白）
  float sd = max(dot(dir, normalize(uSunDir)), 0.0);
  float glow = pow(sd, 8.0);
  day += vec3(1.0, 0.85, 0.6) * glow * (0.05 + dayness * 0.10);
  // 昼夜融合
  vec3 col = mix(night, day, dayness);
  // 地平线以下快速暗化（防边缘穿帮）
  col = mix(col, uNightTop, smoothstep(0.02, -0.12, h));
  gl_FragColor = vec4(col, 1.0);
}`;

function radialSprite(canvasSize, stops, falloff) {
  const c = document.createElement('canvas');
  c.width = c.height = canvasSize;
  const g = c.getContext('2d');
  const r = canvasSize / 2;
  const grad = g.createRadialGradient(r, r, r * 0.08, r, r, r);
  grad.addColorStop(0, stops[0]);
  grad.addColorStop(0.45, stops[1]);
  grad.addColorStop(1, stops[2]);
  g.fillStyle = grad;
  g.fillRect(0, 0, canvasSize, canvasSize);
  return new THREE.CanvasTexture(c);
}

export class Sky {
  constructor(scene) {
    this.scene = scene;
    this.sunDir = new THREE.Vector3(0.5, 0.74, 0.3);
    this.dayness = 1;
    this.hour = 14;

    // ---- 穹顶 ----
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uSunDir: { value: this.sunDir.clone() },
        uTopDay: { value: new THREE.Color('#2f6db0') },
        uHorizonDay: { value: new THREE.Color('#f2e2be') },
        uDusk: { value: new THREE.Color('#f09550') },
        uNightTop: { value: new THREE.Color('#141a35') },
        uNightHorizon: { value: new THREE.Color('#2c3352') },
      },
      vertexShader: skyVert,
      fragmentShader: skyFrag,
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(400, 28, 18), this.skyMat);
    scene.add(dome);

    // ---- 太阳：亮白核心 + 暖色日冕（更真实） ----
    const sunTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 160;
      const g = c.getContext('2d');
      // 日冕（大而柔和）
      const corona = g.createRadialGradient(80, 80, 6, 80, 80, 78);
      corona.addColorStop(0, 'rgba(255,244,210,0.9)');
      corona.addColorStop(0.35, 'rgba(255,225,150,0.35)');
      corona.addColorStop(1, 'rgba(255,210,120,0)');
      g.fillStyle = corona; g.fillRect(0, 0, 160, 160);
      // 亮白核心（小、清晰）
      const core = g.createRadialGradient(80, 80, 0, 80, 80, 20);
      core.addColorStop(0, 'rgba(255,255,252,1)');
      core.addColorStop(0.7, 'rgba(255,248,225,0.95)');
      core.addColorStop(1, 'rgba(255,235,190,0)');
      g.fillStyle = core; g.beginPath(); g.arc(80, 80, 20, 0, Math.PI * 2); g.fill();
      return new THREE.CanvasTexture(c);
    })();
    this.sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, transparent: true, opacity: 0.95, depthWrite: false, fog: false }));
    this.sun.scale.set(26, 26, 1);
    scene.add(this.sun);

    // ---- 月亮 ----
    const moonTex = radialSprite(128,
      ['rgba(238,243,255,0.95)', 'rgba(220,230,252,0.5)', 'rgba(205,220,245,0)']);
    const mc = document.createElement('canvas'); mc.width = mc.height = 128;
    const mg = mc.getContext('2d');
    mg.drawImage(moonTex.image, 0, 0);
    mg.fillStyle = 'rgba(233,222,200,0.55)'; // 月牙阴影
    mg.beginPath(); mg.arc(90, 52, 34, 0, Math.PI * 2); mg.fill();
    this.moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(mc), transparent: true, opacity: 0, depthWrite: false, fog: false }));
    this.moon.scale.set(20, 20, 1);
    scene.add(this.moon);

    // ---- 星星（穹顶点云，夜晚浮现） ----
    const N = 320;
    const starPos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const theta = Math.random() * Math.PI * 2;
      const elev = (6 + Math.random() * 70) * Math.PI / 180; // 仰角 6°~76°
      const r = 240;
      starPos[i * 3] = Math.cos(elev) * Math.cos(theta) * r;
      starPos[i * 3 + 1] = Math.sin(elev) * r + 8;
      starPos[i * 3 + 2] = Math.cos(elev) * Math.sin(theta) * r;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    const dotTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 16;
      const g = c.getContext('2d');
      g.fillStyle = '#fff'; g.beginPath(); g.arc(8, 8, 2.6, 0, Math.PI * 2); g.fill();
      return new THREE.CanvasTexture(c);
    })();
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xffffff, map: dotTex, transparent: true, opacity: 0,
      size: 2.4, sizeAttenuation: false, depthWrite: false, fog: false,
    }));
    scene.add(this.stars);

    // ---- 云层：横向拉长的水平云带（非 billboard，平贴高空更像真云） ----
    const cloudTex = (() => {
      const c = document.createElement('canvas'); c.width = 512; c.height = 128;
      const g = c.getContext('2d');
      for (let i = 0; i < 16; i++) {
        const x = Math.random() * 512, y = 40 + Math.random() * 55;
        const rw = 26 + Math.random() * 55, rh = rw * (0.3 + Math.random() * 0.25);
        const grad = g.createRadialGradient(x, y, 1, x, y, rw);
        grad.addColorStop(0, 'rgba(255,255,255,0.9)');
        grad.addColorStop(0.6, 'rgba(255,255,255,0.4)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grad;
        g.save(); g.translate(x, y); g.scale(1, rh / rw);
        g.beginPath(); g.arc(0, 0, rw, 0, Math.PI * 2); g.fill();
        g.restore();
      }
      return new THREE.CanvasTexture(c);
    })();
    this.clouds = [];
    const cloudMat = new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, opacity: 0.55, depthWrite: false, fog: false, side: THREE.DoubleSide });
    for (let i = 0; i < 7; i++) {
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), cloudMat);
      const a = Math.random() * Math.PI * 2;
      const r = 150 + Math.random() * 90;
      const w = 150 + Math.random() * 130;
      pl.scale.set(w, w * 0.32, 1);
      pl.position.set(Math.cos(a) * r, 95 + Math.random() * 60, Math.sin(a) * r);
      pl.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.2; // 近乎水平
      pl.rotation.z = Math.random() * Math.PI;
      scene.add(pl);
      this.clouds.push(pl);
    }

    // ---- 阳光光柱（细窄锥形光束，从太阳洒向大地；避免糊住天空） ----
    const rayGeo = new THREE.CylinderGeometry(1.2, 5, 110, 12, 1, true);
    this.ray = new THREE.Mesh(rayGeo, new THREE.MeshBasicMaterial({
      color: 0xffe3b0, transparent: true, opacity: 0, depthWrite: false, fog: false,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    }));
    scene.add(this.ray);
  }

  // 每帧：按时辰更新穹顶/日月/云/光锥
  update(hour, nightFactor) {
    this.hour = hour;
    this.dayness = 1 - nightFactor;
    const sunDir = sunDirection(hour);
    const moonDir = moonDirection(hour);

    // 穹顶太阳方向（夜间给低角，避免天空无方向）
    const domeSun = sunDir ? sunDir.clone() : new THREE.Vector3(0, -0.2, 1).normalize();
    this.skyMat.uniforms.uSunDir.value.copy(domeSun);

    // 太阳 sprite：白天随太阳位置
    if (sunDir) {
      this.sun.position.copy(sunDir).multiplyScalar(190);
      this.sun.material.opacity = 0.95;
      this.sun.visible = true;
    } else {
      this.sun.visible = false;
    }
    // 月亮：夜间随月亮位置
    if (moonDir) {
      this.moon.position.copy(moonDir).multiplyScalar(200);
      this.moon.material.opacity = nightFactor > 0.1 ? 0.85 : 0;
      this.moon.visible = nightFactor > 0.1;
    } else {
      this.moon.visible = false;
    }

    // 星星：夜晚浮现
    this.stars.material.opacity = nightFactor * 0.8;

    // 云：随昼亮/夜暗，缓慢漂移
    const cloudOp = this.dayness * 0.55 + 0.02;
    this.clouds.forEach((c, i) => {
      c.position.x += 0.05; // 东→西漂
      if (c.position.x > 280) c.position.x = -280;
      c.material.opacity = cloudOp * (0.7 + 0.3 * Math.sin(this.hour * 2 + i));
    });

    // 阳光光柱：仅低角度（日出/日落）显现的金色光束；正午太阳在头顶不显示（真实）
    if (sunDir && sunDir.y > 0.06 && sunDir.y < 0.4) {
      const axis = sunDir.clone().negate(); // 从太阳指向原点
      this.ray.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.normalize());
      this.ray.position.copy(sunDir).multiplyScalar(55);
      this.ray.material.opacity = 0.16 * Math.min(1, (sunDir.y - 0.06) * 4) * this.dayness;
      this.ray.visible = true;
    } else {
      this.ray.visible = false;
    }
  }
}
