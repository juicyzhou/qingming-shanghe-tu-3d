// P3-4 体验埋点：本地轻量统计（零外部请求，符合"离线可玩"）。
// 跟踪：会话数 / 累计停留 / 首任务接受与完成 / 任务/小玩法计数。
// 查看：?analytics=1 面板 或 window.__analytics()；可导出 JSON / 清空。
export class Analytics {
  constructor() {
    this.s = {};
    this._load();
    this._started = false;
    this._a1 = false;  // 本会话是否已计"接首个任务"
    this._c1 = false;  // 本会话是否已计"完成首个任务"
    this._pendingMs = 0;
    this._startTs = 0;
  }

  _load() {
    try { this.s = JSON.parse(localStorage.getItem('qmsht_stats') || '{}') || {}; } catch { this.s = {}; }
  }
  _save() {
    try { localStorage.setItem('qmsht_stats', JSON.stringify(this.s)); } catch {}
  }
  _add(k, n = 1) {
    this.s[k] = (this.s[k] || 0) + n;
    this._save();
  }

  // 会话开始（进入画卷）
  begin() {
    if (this._started) return;
    this._started = true;
    this._a1 = false; this._c1 = false;
    this._pendingMs = 0;
    this._startTs = Date.now();
  }

  // 每帧心跳：累计停留时长，累计满 30s 落盘一次（防崩溃丢数据）
  beat() {
    if (!this._started) return;
    this._pendingMs += Date.now() - this._startTs;
    this._startTs = Date.now();
    if (this._pendingMs >= 30000) {
      this._add('totalMs', this._pendingMs);
      this._pendingMs = 0;
    }
  }

  // 会话结束（卸载/隐藏）
  end() {
    this.beat();
    if (this._started) {
      if (this._pendingMs > 0) this._add('totalMs', this._pendingMs);
      this._add('sessions', 1);
      this._started = false;
      this._pendingMs = 0;
    }
  }

  // ---- 事件 ----
  markFirstAccept() { if (this._started && !this._a1) { this._a1 = true; this._add('accepted1', 1); } }
  markFirstComplete() { if (this._started && !this._c1) { this._c1 = true; this._add('completed1', 1); } }
  inc(k) { this._add(k, 1); }

  // ---- 指标 ----
  metrics() {
    const s = this.s;
    const sessions = s.sessions || 0;
    const accepted1 = s.accepted1 || 0;
    const completed1 = s.completed1 || 0;
    const totalMs = s.totalMs || 0;
    const fmt = (ms) => {
      const sec = Math.round(ms / 1000);
      return `${Math.floor(sec / 60)}分${sec % 60}秒`;
    };
    return {
      sessions,
      totalMs,
      avgMs: sessions ? Math.round(totalMs / sessions) : 0,
      avgStay: sessions ? fmt(Math.round(totalMs / sessions)) : '—',
      accepted1,
      completed1,
      acceptRate: sessions ? Math.round((accepted1 / sessions) * 100) + '%' : '—',      // 接首任务的会话占比
      firstQuestRate: accepted1 ? Math.round((completed1 / accepted1) * 100) + '%' : '—', // 首任务完成率（完成/接受）
      questsDone: s.questsDone || 0,
      interiors: s.interiors || 0,
      minigameWins: s.minigameWins || 0,
      riddlesSolved: s.riddlesSolved || 0,
      allLandmarks: s.allLandmarks || 0,
    };
  }

  reset() {
    this.s = {};
    try { localStorage.removeItem('qmsht_stats'); } catch {}
    this._started = false; this._a1 = false; this._c1 = false; this._pendingMs = 0;
  }
}
