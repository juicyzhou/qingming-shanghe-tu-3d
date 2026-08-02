// Web Audio 程序化合成：古风拨弦 BGM + 交互音效（零音频文件）
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.bgmTimer = null;
    this.nextNoteTime = 0;
    this.noteIdx = 0;
    this.stepAcc = 0;
    this.enabled = true;
  }

  // 浏览器自动播放策略：首次用户手势后调用
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0.0;
    this.bgmGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.8;
    this.sfxGain.connect(this.master);
    this.startBgm();
  }

  // 任意用户手势后补恢复被拦截的音频
  enableOnGesture() {
    const resume = () => this.ensure();
    addEventListener('pointerdown', resume, { once: true });
    addEventListener('keydown', resume, { once: true });
  }

  // ---- 拨弦音色（筝/琵琶式：快速衰减包络 + 泛音） ----
  pluck(freq, time, dur = 0.9, vol = 0.5, dest = null, type = 'triangle') {
    if (!this.ctx) return;
    const t = time || this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    // 轻微滑音起音
    osc.frequency.setValueAtTime(freq * 1.01, t);
    osc.frequency.exponentialRampToValueAtTime(freq, t + 0.03);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    // 泛音
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 3;
    const g2 = this.ctx.createGain();
    g2.gain.value = 0.12 * vol;
    osc2.connect(g2);
    g2.connect(gain);
    osc2.start(t); osc2.stop(t + dur + 0.05);

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2600;
    osc.connect(gain); gain.connect(lp); lp.connect(dest || this.bgmGain);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  // 宫商角徵羽（C 五声）
  static PENTA = [261.63, 293.66, 329.63, 392.0, 440.0];
  static PENTA2 = [523.25, 587.33, 659.25, 783.99, 880.0];

  startBgm() {
    if (this.bgmTimer || !this.ctx) return;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    // 旋律型：宫角徵羽宫 循环（中速）
    this.melody = [0, 2, 3, 4, 2, 1, 0, 3, 4, 2, 3, 1];
    this.bassMelody = [0, 0, 3, 4, 2, 2, 1, 1];
    const self = this;
    const tick = () => {
      if (!self.ctx) return;
      while (self.nextNoteTime < self.ctx.currentTime + 0.6) {
        self.scheduleNote(self.nextNoteTime);
        self.nextNoteTime += 0.55;
      }
    };
    // 淡入 BGM 音量
    this.bgmGain.gain.linearRampToValueAtTime(0.16, this.ctx.currentTime + 2.0);
    this.bgmTimer = setInterval(tick, 260);
    tick();
  }

  scheduleNote(t) {
    const m = this.melody[this.noteIdx % this.melody.length];
    this.pluck(AudioSys.PENTA[m] * 0.5, t, 1.1, 0.55);
    this.pluck(AudioSys.PENTA[m], t, 0.7, 0.16);
    // 低音铺底（隔拍）
    if (this.noteIdx % 2 === 0) {
      const b = AudioSys.PENTA[this.bassMelody[(this.noteIdx / 2) % this.bassMelody.length]] * 0.25;
      this.pluck(b, t, 1.6, 0.4, this.bgmGain, 'sine');
    }
    // 稀疏高音点缀
    if (this.noteIdx % 4 === 2) {
      this.pluck(AudioSys.PENTA2[(this.noteIdx >> 2) % 5] * 1.5, t + 0.28, 0.5, 0.05);
    }
    this.noteIdx++;
  }

  setBgm(on) {
    if (!this.ctx) return;
    this.bgmGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.bgmGain.gain.linearRampToValueAtTime(on ? 0.16 : 0.0, this.ctx.currentTime + 0.8);
  }

  // ---- 音效 ----
  step() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine'; osc.frequency.value = 90 + Math.random() * 20;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.035, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    osc.connect(g); g.connect(this.sfxGain);
    osc.start(t); osc.stop(t + 0.1);
  }

  blip() {
    if (!this.ctx || !this.enabled) return;
    this.pluck(740, null, 0.12, 0.12, this.sfxGain, 'sine');
  }

  coin() {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    this.pluck(988, t, 0.2, 0.2, this.sfxGain, 'sine');
    this.pluck(1319, t + 0.07, 0.3, 0.2, this.sfxGain, 'sine');
  }

  chime() {
    if (!this.ctx || !this.enabled) return;
    // 五声上行琶音
    [0, 1, 2, 4, 5].forEach((i, k) => {
      this.pluck(AudioSys.PENTA2[i], this.ctx.currentTime + k * 0.09, 0.6, 0.16, this.sfxGain);
    });
  }

  click() {
    if (!this.ctx || !this.enabled) return;
    this.pluck(520, null, 0.06, 0.1, this.sfxGain, 'square');
  }

  swing() {
    if (!this.ctx || !this.enabled) return;
    this.pluck(180, null, 0.18, 0.25, this.sfxGain, 'sawtooth');
  }
}
