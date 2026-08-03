import * as THREE from 'three';
import { Character } from './Character.js';
import { generateAppearance } from './appearance.js';
import { tryMove, groundHeight } from '../world/layout.js';
import { rf } from '../core/rand.js';

export const ROLE_LABEL = {
  huolang: '货郎', vendor: '摊贩', waiter: '店小二', tea: '茶博士', scholar: '书生',
  monk: '僧人', boatman: '船夫', porter: '脚夫', yamen: '衙役', general: '守将',
  storyteller: '说书人', doctor: '大夫', farmer: '农夫', child: '孩童', official: '官员',
  woman: '女眷', cook: '摊主', acrobat: '卖艺人', guest: '行人', weaver: '掌柜', fish: '渔夫',
  diviner: '卦师', watcher: '巡夜',
};

function makeLabel(name, role) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 72;
  const g = c.getContext('2d');
  // 纸签
  g.fillStyle = 'rgba(245,236,210,0.97)';
  g.beginPath();
  g.roundRect(8, 6, 240, 60, 10);
  g.fill();
  g.strokeStyle = 'rgba(90,70,40,0.7)';
  g.lineWidth = 2;
  g.stroke();
  const tag = ROLE_LABEL[role] || '行人';
  g.fillStyle = '#5a4630';
  g.font = 'bold 34px "Kaiti SC","KaiTi","FangSong",serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(name, 128, 22);
  g.fillStyle = '#8a6d4a';
  g.font = '24px "Kaiti SC","KaiTi","FangSong",serif';
  g.fillText(tag, 128, 50);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.0, 0.56, 1);
  return sprite;
}

export class Npc extends Character {
  constructor(def, index) {
    super(generateAppearance(def.role, 9000 + index * 7 + (def.name ? def.name.charCodeAt(0) * 31 : 0)));
    this.def = def;
    this.npcId = def.id;
    this.index = index;
    this.name = def.name;
    this.homeX = def.x;
    this.homeZ = def.z;
    this.behavior = def.behavior || 'stand';
    this.home = def.opts.home || null;
    this.position.set(def.x, 0, def.z);
    this.setHeading(def.heading ?? (Math.random() * Math.PI * 2));

    this.label = makeLabel(def.name, def.role);
    this.label.position.y = this.H + 0.5;
    this.add(this.label);

    this._wanderTarget = null;
    this._wanderTimer = rf(0, 4);
    this._idleTimer = 0;
    this.dialogOpen = false;
    this.atHome = true;
    this.questMark = null; // 头顶任务标记 sprite
  }

  addQuestMark() {
    if (this.questMark) return;
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#d8b23c';
    g.beginPath();
    g.arc(32, 32, 26, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#6e4f2c'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#6e4f2c';
    g.font = 'bold 40px "KaiTi",serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('?', 32, 34);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.questMark = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    this.questMark.scale.set(0.5, 0.5, 1);
    this.questMark.position.y = this.H + 0.95;
    this.add(this.questMark);
  }

  clearQuestMark() {
    if (this.questMark) {
      this.remove(this.questMark);
      this.questMark = null;
    }
  }

  // 移动 NPC 到指定点（任务用）
  moveTo(x, z) {
    this.position.x = x;
    this.position.z = z;
  }

  update(dt, player) {
    const dx = player.position.x - this.position.x;
    const dz = player.position.z - this.position.z;
    const distToPlayer = Math.hypot(dx, dz);

    let speed = 0;
    // 漫游 AI
    if (this.behavior === 'wander' && !this.dialogOpen && this.atHome) {
      this._wanderTimer -= dt;
      if (!this._wanderTarget && this._wanderTimer <= 0) {
        this._wanderTarget = [
          this.homeX + rf(-6, 6),
          this.homeZ + rf(-6, 6),
        ];
        this._wanderTimer = rf(2, 5);
      }
      if (this._wanderTarget) {
        const tdx = this._wanderTarget[0] - this.position.x;
        const tdz = this._wanderTarget[1] - this.position.z;
        const d = Math.hypot(tdx, tdz);
        if (d < 0.4) {
          this._wanderTarget = null;
        } else {
          speed = 1.4;
          const nx = (tdx / d) * speed * dt;
          const nz = (tdz / d) * speed * dt;
          const [mx, mz] = tryMove(this.position.x, this.position.z, nx, nz, 0.3);
          this.position.x = mx;
          this.position.z = mz;
          this.setHeading(Math.atan2(tdx, tdz));
        }
      }
    }

    // 玩家靠近时面向玩家
    if (distToPlayer < 4.2 && !this.dialogOpen) {
      this.setHeading(Math.atan2(dx, dz));
      speed = 0;
    }

    // 地形高度
    this.position.y = groundHeight(this.position.x, this.position.z);
    super.update(dt, speed);
  }
}
