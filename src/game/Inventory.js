// 背包 + 铜钱
export const ITEM_NAMES = {
  mantou: '烧饼',
  tea: '茶叶',
  herb: '药草',
  cloth: '布匹',
  document: '公文',
};

export class Inventory {
  constructor() {
    this.coins = 20;
    this.items = {}; // id -> count
  }

  add(id, n = 1) {
    this.items[id] = (this.items[id] || 0) + n;
  }
  has(id, n = 1) { return (this.items[id] || 0) >= n; }
  spendItem(id, n = 1) {
    if (!this.has(id, n)) return false;
    this.items[id] -= n;
    if (this.items[id] <= 0) delete this.items[id];
    return true;
  }

  earn(n) { this.coins += n; }
  pay(n) {
    if (this.coins < n) return false;
    this.coins -= n;
    return true;
  }

  itemList() {
    return Object.entries(this.items)
      .filter(([, n]) => n > 0)
      .map(([id, n]) => ({ id, name: ITEM_NAMES[id] || id, n }));
  }
}
