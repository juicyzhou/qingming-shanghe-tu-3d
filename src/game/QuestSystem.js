import { QUESTS, questById } from '../data/quests.js';

export class QuestSystem {
  constructor(game) {
    this.game = game;
    this.state = {};
    for (const q of QUESTS) this.state[q.id] = { status: 'available', objectiveIndex: 0, count: 0 };
    this.stats = { completed: 0, coinsEarned: 0, reputation: 0 };
    this.markDirty = true;
  }

  status(id) { return this.state[id].status; }
  isActive(id) { return this.state[id].status === 'active'; }
  isDone(id) { return this.state[id].status === 'done'; }

  currentObjective(id) {
    const q = questById(id);
    const st = this.state[id];
    return q.objectives[st.objectiveIndex];
  }

  objectiveText(id) {
    const q = questById(id);
    const st = this.state[id];
    const obj = q.objectives[st.objectiveIndex];
    const done = st.status === 'done';
    let t = done ? `✅ ${q.title} · 已完成` : `${st.objectiveIndex + 1}/${q.objectives.length} ${obj.text}`;
    if (obj.count) t += `（${st.count}/${obj.count}）`;
    return t;
  }

  // 接受任务
  accept(id) {
    const st = this.state[id];
    if (st.status !== 'available') return;
    st.status = 'active';
    const q = questById(id);
    if (id === 'bridge_gifts') this.game.inventory.add('mantou', 2);
    if (id === 'gate_message') this.game.inventory.add('document', 1);
    this.markDirty = true;
    this.game.audio?.blip();
    this.game.hud.toast(`接到任务：${q.title}`);
  }

  _advance(id) {
    const st = this.state[id];
    const q = questById(id);
    st.objectiveIndex++;
    this.markDirty = true;
    if (st.objectiveIndex >= q.objectives.length) this._complete(id);
    else this.game.audio?.blip();
  }

  _complete(id) {
    const st = this.state[id];
    const q = questById(id);
    st.status = 'done';
    const inv = this.game.inventory;
    if (q.reward.coins) { inv.earn(q.reward.coins); this.stats.coinsEarned += q.reward.coins; }
    for (const it of (q.reward.items || [])) inv.add(it.id, it.n);
    this.stats.completed++;
    this.stats.reputation += 10;
    this.markDirty = true;
    this.game.audio?.chime(); // 完成琶音
    this.game.hud.settle(q, this.game);
    this.game.hud.update(this.game);
  }

  // 事件：与某 NPC 对话
  talkTo(npcId) {
    let advanced = false;
    for (const [qid, st] of Object.entries(this.state)) {
      if (st.status !== 'active') continue;
      const obj = this.currentObjective(qid);
      if (obj.type !== 'talk' || obj.npc !== npcId) continue;
      if (obj.needItem && !this.game.inventory.has(obj.needItem)) continue;
      if (obj.consume && obj.needItem) this.game.inventory.spendItem(obj.needItem);
      // 说书人回归
      if (qid === 'find_storyteller' && npcId === 'shuoshuren' && st.objectiveIndex === 1) {
        const npc = this.game.npcs.get('shuoshuren');
        if (npc && npc.home) npc.moveTo(npc.home.x, npc.home.z);
      }
      this._advance(qid);
      advanced = true;
      break;
    }
    return advanced;
  }

  // 事件：与场景物品互动（物品 id 默认等于场景物 id，特例映射历史 id）
  interact(interactableId) {
    const itemByObj = { herb: 'herb', cloth_bundle: 'cloth' };
    const itemId = itemByObj[interactableId] || interactableId;
    let advanced = false;
    for (const [qid, st] of Object.entries(this.state)) {
      if (st.status !== 'active') continue;
      const obj = this.currentObjective(qid);
      if (obj.type !== 'interact' || obj.interactable !== interactableId) continue;
      this.game.inventory.add(itemId, 1);
      this._advance(qid);
      advanced = true;
      break;
    }
    return advanced;
  }

  // P2-4 猜谜：选对谜底推进，选错仅提示
  riddleAnswer(qid, chosenIdx) {
    const st = this.state[qid];
    if (!st || st.status !== 'active') return false;
    const obj = this.currentObjective(qid);
    if (obj.type !== 'riddle') return false;
    if (obj.answer === chosenIdx) {
      this.game.audio?.chime();
      this.game.hud.toast('正是此谜底！先生抚掌而笑，赠你卦资');
      this._advance(qid);
      this.game.hud.update(this.game);
      return true;
    }
    this.game.audio?.click();
    this.game.hud.toast('先生摇头：不对不对，再猜猜');
    return false;
  }

  // 购买
  buy(item, cost) {
    if (!this.game.inventory.pay(cost)) return false;
    this.game.inventory.add(item, 1);
    this.game.audio?.deal(); // P1-4 成交音
    let advanced = false;
    for (const [qid, st] of Object.entries(this.state)) {
      if (st.status !== 'active') continue;
      const obj = this.currentObjective(qid);
      if (obj.type === 'buy' && obj.item === item) { this._advance(qid); advanced = true; break; }
    }
    return advanced;
  }

  // 节奏撑船小玩法完成
  minigameComplete(questId) {
    const st = this.state[questId];
    if (!st || st.status !== 'active') return;
    const obj = this.currentObjective(questId);
    if (obj.type === 'minigame') this._advance(questId);
  }

  // 招客计数
  attract(customerId) {
    let advanced = false;
    for (const [qid, st] of Object.entries(this.state)) {
      if (st.status !== 'active') continue;
      const obj = this.currentObjective(qid);
      if (obj.type !== 'attract') continue;
      st.count++;
      this.game.audio?.blip();
      if (st.count >= obj.count) this._advance(qid);
      advanced = true;
      break;
    }
    return advanced;
  }

  activeList() {
    return Object.entries(this.state)
      .filter(([, st]) => st.status === 'active')
      .map(([qid, st]) => ({ qid, title: questById(qid).title, text: this.objectiveText(qid) }));
  }

  doneCount() { return this.stats.completed; }
}
