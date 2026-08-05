// NPC 名单：40 位，关键任务角色带 id 供任务系统引用
import { BUILDINGS } from '../world/layout.js';

function n(id, name, role, x, z, opts = {}) {
  return { id, name, role, x, z, heading: opts.heading ?? Math.PI, behavior: opts.behavior ?? 'stand', opts };
}

// 各店掌柜（站在店内，服务开张的门面）
const SHOPKEEPERS = [
  { id: 'tavern',  name: '冯掌柜', role: 'waiter' },
  { id: 'tea',     name: '陈茶师', role: 'tea' },
  { id: 'inn',     name: '白掌柜', role: 'waiter' },
  { id: 'clinic',  name: '吴药师', role: 'doctor' },
  { id: 'cloth',   name: '孙织娘', role: 'weaver' },
  { id: 'incense', name: '香娘子', role: 'woman' },
  { id: 'general', name: '钱掌柜', role: 'vendor' },
  { id: 'snack',   name: '桂香婶', role: 'cook' },
  { id: 'butcher', name: '张屠户', role: 'vendor' },
  { id: 'rice',    name: '米家翁', role: 'vendor' },
];
const SHOPKEEPER_DEFS = SHOPKEEPERS.map((sk) => {
  const b = BUILDINGS.find(x => x.id === sk.id);
  if (!b) return null;
  const facing = b.x > 0 ? -1 : 1;
  // 位置由 Game 在室内建成后按 keeperPos 覆盖；此处先占位
  return n('keeper_' + sk.id, sk.name, sk.role, b.x, b.z, { heading: facing * Math.PI / 2 });
}).filter(Boolean);

export const NPC_DEFS = [
  // ---- 关键任务 NPC（新布局：桥两岸） ----
  n('huolang', '王货郎', 'huolang', 0, 16, { behavior: 'stand' }),            // 桥北头
  n('tea_stand', '孙婆婆', 'cook', 2, 44, { behavior: 'stand' }),              // 桥南茶摊
  n('cha_bo', '茶博士', 'tea', -5, 12, { behavior: 'stand' }),                 // 茶肆门前
  n('shuoshuren', '崔说书', 'storyteller', -22, 13, { behavior: 'stand', home: { x: -26, z: 14 }, heading: -1.2 }),
  n('daifu', '赵大夫', 'doctor', -4.5, 3, { behavior: 'stand' }),              // 药铺门前
  n('chuanfu', '船老大', 'boatman', 24, 19, { behavior: 'stand' }),            // 码头
  n('yayi', '衙役刘三', 'yamen', -1, 20, { behavior: 'stand' }),               // 桥北巡检
  n('shoujiang', '守将韩威', 'general', 2, 20.5, { behavior: 'stand', heading: 0 }),
  n('buzhuang', '沈掌柜', 'weaver', 4, 46, { behavior: 'stand' }),             // 布庄门前
  n('tangren', '糖人张', 'vendor', -17.6, 5.6, { behavior: 'stand' }),

  // ---- 街市群像（两岸） ----
  n('', '张铁柱', 'waiter', 5, 9),        // 北岸·醉仙楼旁
  n('', '李阿贵', 'waiter', -6, 13),      // 北岸·茶肆旁
  n('', '钱掌柜', 'guest', -7, 20),       // 桥北头
  n('', '孙二娘', 'woman', 6, 47),        // 南岸·布庄旁
  n('', '赵大郎', 'guest', -6, 50, { behavior: 'wander' }),  // 南岸·肉铺旁
  n('', '周五郎', 'porter', 22, 16),      // 码头
  n('', '郑三嫂', 'cook', -7, 45),        // 南岸·桥南
  n('', '吴秀才', 'scholar', 3, 20, { behavior: 'wander' }),  // 桥北头
  n('', '冯四哥', 'guest', 2, 0, { behavior: 'wander' }),
  n('', '陈婆婆', 'woman', -2, 2),
  n('', '褚小七', 'child', -2, -4, { behavior: 'wander' }),
  n('', '卫丫头', 'child', 3, 6, { behavior: 'wander' }),
  n('', '韩公子', 'guest', -3, 10),
  n('', '苗家嫂子', 'woman', 3, -8),
  n('', '秦木匠', 'vendor', -16, 16),
  n('suanming', '许半仙', 'diviner', -28, 20),   // 卦摊先生（P2-4 猜谜任务）
  n('', '刘婶', 'cook', -7.5, 20.5),
  n('', '潘货郎', 'huolang', -22, -2),
  n('', '罗班头', 'acrobat', -30, 8),
  n('', '高小猴', 'child', -24, 12, { behavior: 'wander' }),
  n('', '姬氏', 'woman', -24, 4),
  n('', '马渔头', 'fish', -20, 52),
  n('', '牛老大', 'farmer', -6, 48),
  n('', '羊官人', 'guest', 2, 52),
  n('', '苟童子', 'child', -2, 56, { behavior: 'wander' }),
  n('', '钱阿爸', 'farmer', 8, 44),
  n('', '毛脚夫', 'porter', 14, 20),
  n('', '宋渡工', 'boatman', 8, 41),
  n('', '荆客商', 'guest', 3, 62),
  n('', '沙氏', 'woman', -3, 68),
  n('', '樊书生', 'scholar', 3, 74, { behavior: 'wander' }),
  n('', '华小哥', 'child', -3, 80),
  n('', '常掌柜', 'guest', 2, 90),
  n('', '时人儿', 'guest', 4, 100),
  n('', '侯农夫', 'farmer', 10, 72),
  n('', '林牧童', 'child', -10, 68, { behavior: 'wander' }),
  ...SHOPKEEPER_DEFS,

  // ---- P2-2 夜巡人（入夜后出现在街上） ----
  n('gengfu', '巡夜老王', 'watcher', -3, 10, { behavior: 'wander', heading: Math.PI }),
  n('xunye', '夜巡张捕快', 'watcher', -16, 12, { behavior: 'wander' }),
];

export const NPC_COUNT = NPC_DEFS.length;
