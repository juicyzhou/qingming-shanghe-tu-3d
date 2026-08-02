import { QUESTS } from './quests.js';
import { ITEM_NAMES } from '../game/Inventory.js';
import { STALLS } from '../world/layout.js';
import { pick } from '../core/rand.js';

const AMBIENT = [
  '今儿个日头正好，正是赶集的好时候。',
  '客官从城外来吧？汴京的市面可热闹。',
  '这汴河的水，日夜不断地淌，养活了满城人。',
  '桥那头的虹桥，可是汴京一景。',
  '小本买卖，客官随便看看。',
  '要论热闹，还得数桥西的集市。',
];

const ROLE_LINES = {
  waiter: ['客官里边请！', '今日店里有新酿的好酒。', '楼上雅座，客官请上。'],
  tea: ['客官来碗热茶，解解乏。', '这是今年的头茬新茶。'],
  scholar: ['读万卷书，行万里路。', '兄台可是赴京赶考？', '有道是：书中自有黄金屋。'],
  boatman: ['浪里讨生活，凭的就是一身本事。', '船行千里，靠的是好桨好橹。'],
  porter: ['嘿哟，加把劲儿！', '扛完这批货，就有酒钱了。'],
  farmer: ['春种秋收，天理循环。', '这河水浇地，庄稼长得旺。'],
  woman: ['客官慢走，注意脚下。', '家里的男人出船去了。'],
  child: ['哥哥姐姐好！', '糖人可好看啦！'],
  vendor: ['上好的货色，童叟无欺！', '便宜卖了便宜卖咯！'],
  storyteller: ['话说那日……哎，且听下回分解。', '说书人的嘴，跑江湖的腿。'],
  doctor: ['望闻问切，医者仁心。', '这位客官气色不错。'],
  yamen: ['城门重地，闲人莫近。', '奉公守法，各安其分。'],
  general: ['防微杜渐，守土有责。', '汴京重地，日夜严防。'],
  cook: ['客官尝尝，热乎的！', '今日新出锅的，香得很。'],
  acrobat: ['各位看官，且看小可这一手！', '走南闯北，混口饭吃。'],
  guest: ['这汴京，百看不厌。', '桥下江水东流去。'],
  weaver: ['江南的丝，北地的布，都是上等货。', '客官要裁衣么？'],
  fish: ['今早刚打的河鱼，鲜得很！', '汴河的鱼，肥美过人。'],
  huolang: ['针头线脑，日用杂货，样样俱全。', '货郎担子，走街串巷。'],
};

// 生成某 NPC 的对话分页
export function buildScript(npc, game) {
  const pages = [];
  const q = game.quests;
  const inv = game.inventory;

  // 1) 接任务
  for (const qd of QUESTS) {
    if (qd.giver === npc.npcId && q.status(qd.id) === 'available') {
      pages.push({
        title: npc.name,
        text: `“${qd.giverLine} 事成之后，自有酬劳奉上。”`,
        options: [
          { label: '好，我答应', action: () => q.accept(qd.id) },
          { label: '容我再想想' },
        ],
      });
    }
  }

  // 2) 交付 / 推进当前目标
  for (const [qid, st] of Object.entries(q.state)) {
    if (st.status !== 'active') continue;
    const obj = q.currentObjective(qid);
    if (obj.type === 'talk' && obj.npc === npc.npcId) {
      if (obj.needItem && !inv.has(obj.needItem)) {
        pages.push({
          title: npc.name,
          text: `“客官，${ITEM_NAMES[obj.needItem] || '那物事'}可带来了？”`,
          options: [{ label: '这就去取' }],
        });
      } else {
        const line = npc.npcId === 'tea_stand' ? '多谢客官，这茶闻着就香。'
          : (qid === 'find_storyteller' && npc.npcId === 'shuoshuren' ? '好好，我这便回棚去，劳烦你回话。'
            : (npc.npcId === 'shoujiang' ? '公文收到，替我谢过刘三。' : '正是此物，多谢客官。'));
        pages.push({
          title: npc.name,
          text: `“${line}”`,
          options: [{ label: '交付', action: () => { q.talkTo(npc.npcId); game.hud.update(); } }],
        });
      }
    } else if (obj.type === 'minigame' && obj.npc === npc.npcId) {
      pages.push({
        title: npc.name,
        text: '“我一人撑不动这货船，客官可会推桨？跟着我的号子，一下一下来。”',
        options: [{
          label: '好，我来帮你（节奏撑船）',
          action: () => game.hud.startMinigame(
            () => { q.minigameComplete(qid); game.hud.update(); },
            () => {}
          ),
        }],
      });
    } else if (obj.type === 'buy' && obj.npc === npc.npcId) {
      if (inv.has('tea')) {
        pages.push({ title: npc.name, text: '“茶已买好，趁热给茶肆送去。”', options: [{ label: '告辞' }] });
      } else if (inv.coins >= obj.cost) {
        pages.push({
          title: npc.name,
          text: '“新采的春茶，30 文一包，客官来一包？”',
          options: [
            { label: `买一包（${obj.cost} 文）`, action: () => { q.buy('tea', obj.cost); game.hud.update(); } },
            { label: '太贵了' },
          ],
        });
      } else {
        pages.push({ title: npc.name, text: '“还差些铜钱，客官凑齐再来。”', options: [{ label: '告辞' }] });
      }
    }
  }

  // 3) 招客任务：路人被引来糖人摊
  const attractActive = Object.keys(q.state).some(k => {
    const s = q.state[k]; return s.status === 'active' && q.currentObjective(k).type === 'attract';
  });
  if (attractActive && npc.npcId !== 'tangren') {
    const sugar = STALLS.find(s => s.id === 'sugarman');
    if (sugar && Math.hypot(npc.position.x - sugar.x, npc.position.z - sugar.z) < 12) {
      pages.push({
        title: npc.name,
        text: '“糖人？倒是有阵子没见了，我去看看热闹。”',
        options: [{ label: '好，随我来', action: () => { q.attract(npc.npcId); game.hud.update(); } }],
      });
    }
  }

  // 4) 已完成任务的感谢
  const helped = QUESTS.some(qd => qd.giver === npc.npcId && q.isDone(qd.id));
  if (helped && pages.length === 0) {
    pages.push({ title: npc.name, text: '“上次多亏客官，往后常来啊。”', options: [{ label: '告辞' }] });
  }

  // 5) 默认台词
  if (pages.length === 0) {
    pages.push({
      title: npc.name,
      text: `“${pick(ROLE_LINES[npc.def.role] || AMBIENT)}”`,
      options: [{ label: '告辞' }],
    });
  }

  return pages;
}
