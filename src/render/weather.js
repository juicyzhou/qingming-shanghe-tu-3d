import * as THREE from 'three';

// ============================================================
//  天气系统：雨 / 雪 粒子（跟随玩家）+ 平滑过渡
//  暴露 raininess / snowiness（0~1）供水面/光照/音效联动
// ============================================================

function softDotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(16, 16, 2, 16, 16, 14);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

export class Weather {
  constructor(follow, scene) {
    this.follow = follow;      // () => {x,y,z} 跟随点（玩家头部）
    this.scene = scene;
    this.target = 'clear';     // clear / rain / snow
    this.raininess = 0;        // 0~1
    this.snowiness = 0;        // 0~1
    this.timer = 0;
    this.nextChange = 40 + Math.random() * 50; // 40~90 秒换一次天

    // 雨：斜落线雨丝
    this._rain = this._makeRain();
    // 雪：柔白点
    this._snow = this._makeSnow();

    this.group = new THREE.Group();
    this.group.add(this._rain.lines);
    this.group.add(this._snow.points);
    scene.add(this.group);
  }

  // 手动指定天气（测试/联调用）
  set(type) { this.target = type; }

  _makeRain() {
    const N = 500, LEN = 0.55;
    const pos = new Float32Array(N * 6);
    const attr = new THREE.BufferAttribute(pos, 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', attr);
    const mat = new THREE.LineBasicMaterial({
      color: 0xa8b4c8, transparent: true, opacity: 0, depthWrite: false,
    });
    const lines = new THREE.LineSegments(geo, mat);
    const meta = new Float32Array(N * 4); // x, z, 初始相位, 下落速度
    for (let i = 0; i < N; i++) {
      meta[i * 4] = (Math.random() - 0.5) * 120;
      meta[i * 4 + 1] = (Math.random() - 0.5) * 90;
      meta[i * 4 + 2] = Math.random() * 70;
      meta[i * 4 + 3] = 55 + Math.random() * 45;
    }
    this._rainMeta = meta;
    return { lines, attr, N, LEN };
  }

  _makeSnow() {
    const N = 420;
    const pos = new Float32Array(N * 3);
    const attr = new THREE.BufferAttribute(pos, 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', attr);
    const mat = new THREE.PointsMaterial({
      color: 0xffffff, map: softDotTexture(), transparent: true, opacity: 0,
      size: 0.24, sizeAttenuation: true, depthWrite: false,
    });
    const points = new THREE.Points(geo, mat);
    const meta = new Float32Array(N * 4); // x, z, 初始相位, 摇摆相位
    for (let i = 0; i < N; i++) {
      meta[i * 4] = (Math.random() - 0.5) * 120;
      meta[i * 4 + 1] = (Math.random() - 0.5) * 90;
      meta[i * 4 + 2] = Math.random() * 70;
      meta[i * 4 + 3] = Math.random() * Math.PI * 2;
    }
    this._snowMeta = meta;
    return { points, attr, N };
  }

  // 随机换天：晴 55% / 雨 30% / 雪 15%（夜晚更易下雪）
  _roll(hour) {
    const r = Math.random();
    const night = hour >= 19 || hour < 6;
    if (r < 0.55) return 'clear';
    if (r < 0.85) return 'rain';
    return (night || r < 0.93) ? 'snow' : 'rain';
  }

  update(dt, hour, t) {
    // 定期换天
    this.timer += dt;
    if (this.timer >= this.nextChange) {
      this.timer = 0;
      this.nextChange = 40 + Math.random() * 50;
      this.target = this._roll(hour);
    }
    // 平滑过渡（约 2.5s 收敛）
    const k = Math.min(1, dt / 2.5);
    this.raininess += ((this.target === 'rain' ? 1 : 0) - this.raininess) * k;
    this.snowiness += ((this.target === 'snow' ? 1 : 0) - this.snowiness) * k;

    // 跟随玩家
    const f = this.follow();
    this.group.position.set(f.x, f.y + 2, f.z);

    // 雨丝下落
    if (this.raininess > 0.001) {
      const { attr, N, LEN } = this._rain;
      const meta = this._rainMeta, pos = attr.array;
      for (let i = 0; i < N; i++) {
        const x = meta[i * 4], z = meta[i * 4 + 1], sp = meta[i * 4 + 3];
        const y = ((meta[i * 4 + 2] + t * sp) % 70) - 5;
        pos[i * 6] = x; pos[i * 6 + 1] = y; pos[i * 6 + 2] = z;
        pos[i * 6 + 3] = x; pos[i * 6 + 4] = y - LEN; pos[i * 6 + 5] = z;
      }
      attr.needsUpdate = true;
      this._rain.lines.material.opacity = 0.42 * this.raininess;
    }

    // 雪花飘落 + 摇摆
    if (this.snowiness > 0.001) {
      const { attr, N } = this._snow;
      const meta = this._snowMeta, pos = attr.array;
      for (let i = 0; i < N; i++) {
        const x = meta[i * 4] + Math.sin(t * 0.9 + meta[i * 4 + 3]) * 0.5;
        const z = meta[i * 4 + 1] + Math.cos(t * 0.7 + meta[i * 4 + 3]) * 0.5;
        const y = ((meta[i * 4 + 2] + t * 1.7) % 70) - 5;
        pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      }
      attr.needsUpdate = true;
      this._snow.points.material.opacity = 0.8 * this.snowiness;
    }
  }
}
