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
    this.volume = 1; // 用户音量（P0-3，可记忆）
    try { this.volume = parseFloat(localStorage.getItem('qmsht_vol')) || 1; } catch {}
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
    this.master.gain.value = 0.9 * this.volume;
    this.master.connect(this.ctx.destination);
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0.0;
    this.bgmGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.8;
    this.sfxGain.connect(this.master);
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0.0;
    this.ambientGain.connect(this.master);
    this.startBgm();
  }

  // 任意用户手势后补恢复被拦截的音频
  enableOnGesture() {
    const resume = () => this.ensure();
    addEventListener('pointerdown', resume, { once: true });
    addEventListener('keydown', resume, { once: true });
  }

  // 音频可用性检查：无音频设备的环境 currentTime 可能为 NaN，统一防御
  _ok() {
    return !!(this.ctx && this.enabled && isFinite(this.ctx.currentTime));
  }

  // ---- 拨弦音色（筝/琵琶式：快速衰减包络 + 泛音） ----
  pluck(freq, time, dur = 0.9, vol = 0.5, dest = null, type = 'triangle') {
    if (!this._ok()) return;
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
    if (!isFinite(this.ctx.currentTime)) return; // 无音频设备的怪环境：跳过调度，避免 NaN 崩溃
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

  // 总音量 0~1（P0-3 暂停菜单滑块），持久化
  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = 0.9 * this.volume;
    try { localStorage.setItem('qmsht_vol', String(this.volume)); } catch {}
  }

  setBgm(on) {
    if (!this.ctx) return;
    this.bgmGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.bgmGain.gain.linearRampToValueAtTime(on ? 0.16 : 0.0, this.ctx.currentTime + 0.8);
  }

  // ---- 音效 ----
  // 脚步随地面变化（P1-2）：wood 木板 / soft 草地 / stone 石板
  step(type) {
    if (!this._ok()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    let freq = 100, vol = 0.035, dur = 0.08, otype = 'sine';
    if (type === 'wood') { freq = 135; vol = 0.05; dur = 0.07; otype = 'sine'; }
    else if (type === 'soft') { freq = 190; vol = 0.026; dur = 0.05; otype = 'triangle'; }
    else { freq = 105 + Math.random() * 15; vol = 0.04; dur = 0.06; }
    osc.type = otype; osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(this.sfxGain);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  // ---- 环境音（P1-2）：水流 + 市井嘈杂 + 鸟鸣，天然分层 ----
  startAmbient() {
    if (!this.ctx || this._ambientOn) return;
    if (!isFinite(this.ctx.currentTime)) return; // 同 startBgm 的防御
    this._ambientOn = true;
    const t0 = this.ctx.currentTime;
    // 噪声缓冲（2 秒白噪声，供水流/市井/纸张复用）
    const noise = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const nd = noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const loop = (filter, freq, gain, lfoHz, lfoDepth) => {
      const src = this.ctx.createBufferSource();
      src.buffer = noise; src.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = filter; f.frequency.value = freq;
      if (filter === 'bandpass') f.Q.value = 0.8;
      const g = this.ctx.createGain();
      g.gain.value = gain;
      if (lfoHz) { // 缓慢起伏 = 水波拍岸 / 人声涌动
        const lfo = this.ctx.createOscillator(); lfo.frequency.value = lfoHz;
        const lg = this.ctx.createGain(); lg.gain.value = lfoDepth;
        lfo.connect(lg); lg.connect(g.gain); lfo.start(t0);
      }
      src.connect(f); f.connect(g); g.connect(this.ambientGain);
      src.start(t0);
    };
    // 汴河水声：低频滤波噪声 + 缓慢起伏
    loop('lowpass', 380, 0.16, 0.05, 0.06);
    // 市井人声：中频带通噪声，极轻
    loop('bandpass', 1700, 0.028, 0.11, 0.012);
    // 鸟鸣：随机间隔的清脆短音
    const chirp = () => {
      if (!this.ctx || !this._ambientOn) return;
      this._chirp();
      const next = 3 + Math.random() * 9;
      this._birdTimer = setTimeout(chirp, next * 1000);
    };
    this._birdTimer = setTimeout(chirp, 2.5 * 1000);
    // 淡入环境音
    this.ambientGain.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 3);
  }

  _chirp() {
    if (!this._ok()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2300, t);
    osc.frequency.exponentialRampToValueAtTime(3600, t + 0.05);
    osc.frequency.exponentialRampToValueAtTime(2700, t + 0.11);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    osc.connect(g); g.connect(this.ambientGain);
    osc.start(t); osc.stop(t + 0.16);
  }

  _noiseBurst(dur = 0.1, vol = 0.05) {
    if (!this._ok()) return null;
    const t = this.ctx.currentTime;
    const buf = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    return { src, t };
  }

  // 开门吱呀（进/出店）
  creak() {
    if (!this._ok()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(330, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.24);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 850;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.055, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc.connect(lp); lp.connect(g); g.connect(this.sfxGain);
    osc.start(t); osc.stop(t + 0.32);
  }

  // 翻页（对话打开/换页）
  flip() {
    if (!this._ok()) return;
    const { src, t } = this._noiseBurst(0.13, 0.08);
    if (!src) return;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 2500; bp.Q.value = 1.4;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.06, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    src.connect(bp); bp.connect(g); g.connect(this.sfxGain);
    src.start(t); src.stop(t + 0.15);
  }

  // 盖章（任务完成落款）
  stamp() {
    if (!this._ok()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(58, t + 0.09);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.connect(g); g.connect(this.sfxGain);
    osc.start(t); osc.stop(t + 0.18);
    const { src: s2, t: t2 } = this._noiseBurst(0.1, 0.05);
    if (s2) {
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 2200;
      const g2 = this.ctx.createGain();
      g2.gain.setValueAtTime(0, t2);
      g2.gain.linearRampToValueAtTime(0.04, t2 + 0.005);
      g2.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.1);
      s2.connect(hp); hp.connect(g2); g2.connect(this.sfxGain);
      s2.start(t2); s2.stop(t2 + 0.12);
    }
  }

  // P2-5 雨声层：中高频噪声，随天气淡入/淡出
  setRain(on) {
    if (!this.ctx || !isFinite(this.ctx.currentTime)) return;
    if (on && !this._rainNode) {
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'highpass'; bp.frequency.value = 900;
      const g = this.ctx.createGain();
      g.gain.value = 0;
      src.connect(bp); bp.connect(g); g.connect(this.master);
      src.start();
      this._rainNode = { src, g };
    }
    if (this._rainNode) {
      this._rainNode.g.gain.cancelScheduledValues(this.ctx.currentTime);
      this._rainNode.g.gain.linearRampToValueAtTime(on ? 0.07 : 0, this.ctx.currentTime + 1.5);
    }
  }

  // 成交（购买成功）
  deal() {
    if (!this._ok()) return;
    const t = this.ctx.currentTime;
    this.pluck(880, t, 0.15, 0.16, this.sfxGain, 'sine');
    this.pluck(1174, t + 0.05, 0.22, 0.13, this.sfxGain, 'sine');
  }

  blip() {
    if (!this._ok()) return;
    this.pluck(740, null, 0.12, 0.12, this.sfxGain, 'sine');
  }

  coin() {
    if (!this._ok()) return;
    const t = this.ctx.currentTime;
    this.pluck(988, t, 0.2, 0.2, this.sfxGain, 'sine');
    this.pluck(1319, t + 0.07, 0.3, 0.2, this.sfxGain, 'sine');
  }

  chime() {
    if (!this._ok()) return;
    // 五声上行琶音（宫商角徵羽，索引 0~4；此前 [0,1,2,4,5] 越界取到 undefined → NaN 崩溃）
    [0, 1, 2, 3, 4].forEach((i, k) => {
      this.pluck(AudioSys.PENTA2[i], this.ctx.currentTime + k * 0.09, 0.6, 0.16, this.sfxGain);
    });
  }

  click() {
    if (!this._ok()) return;
    this.pluck(520, null, 0.06, 0.1, this.sfxGain, 'square');
  }

  swing() {
    if (!this._ok()) return;
    this.pluck(180, null, 0.18, 0.25, this.sfxGain, 'sawtooth');
  }
}
