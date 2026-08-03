// 8 条任务线定义：目标类型 talk / interact / buy / minigame / attract
export const QUESTS = [
  {
    id: 'bridge_gifts', title: '桥头干粮',
    giver: 'huolang', giverLine: '桥头的王货郎需要帮忙。',
    reward: { coins: 30, items: [{ id: 'mantou', name: '烧饼', n: 2 }] },
    objectives: [
      { type: 'talk', npc: 'huolang', text: '与桥头王货郎交谈' },
      { type: 'talk', npc: 'tea_stand', text: '把烧饼送到桥南茶摊孙婆婆处', needItem: 'mantou', consume: false },
      { type: 'talk', npc: 'huolang', text: '回桥头向王货郎复命' },
    ],
  },
  {
    id: 'buy_tea', title: '茶肆茶叶',
    giver: 'cha_bo', giverLine: '清风茶肆的茶博士需要茶叶。',
    reward: { coins: 20, items: [] },
    objectives: [
      { type: 'talk', npc: 'cha_bo', text: '与清风茶肆茶博士交谈' },
      { type: 'buy', npc: 'tea_stand', item: 'tea', cost: 30, text: '去桥南茶摊买一包茶叶（30 文）' },
      { type: 'talk', npc: 'cha_bo', text: '把茶叶送回茶肆', needItem: 'tea', consume: true },
    ],
  },
  {
    id: 'find_storyteller', title: '寻访说书人',
    giver: 'tangren', giverLine: '集市糖人摊的糖人张需要帮忙找说书人。',
    reward: { coins: 40, items: [] },
    objectives: [
      { type: 'talk', npc: 'tangren', text: '与糖人摊糖人张交谈' },
      { type: 'talk', npc: 'shuoshuren', text: '在河岸找到说书人崔说书' },
      { type: 'talk', npc: 'tangren', text: '回说书棚向糖人张复命' },
    ],
  },
  {
    id: 'herbs', title: '大夫的药草',
    giver: 'daifu', giverLine: '回春堂赵大夫需要药草。',
    reward: { coins: 25, items: [] },
    objectives: [
      { type: 'talk', npc: 'daifu', text: '与回春堂赵大夫交谈' },
      { type: 'interact', interactable: 'herb', text: '在北岸桥东草丛采集药草' },
      { type: 'talk', npc: 'daifu', text: '把药草送回回春堂', needItem: 'herb', consume: true },
    ],
  },
  {
    id: 'boat_pole', title: '撑船过桥',
    giver: 'chuanfu', giverLine: '码头船老大要撑船过桥。',
    reward: { coins: 50, items: [] },
    objectives: [
      { type: 'talk', npc: 'chuanfu', text: '与码头船老大交谈' },
      { type: 'minigame', id: 'pole', npc: 'chuanfu', text: '节奏按键帮船老大撑船过虹桥' },
      { type: 'talk', npc: 'chuanfu', text: '向船老大复命' },
    ],
  },
  {
    id: 'gate_message', title: '城门传话',
    giver: 'yayi', giverLine: '城门口衙役需要传递公文。',
    reward: { coins: 35, items: [{ id: 'document', name: '公文', n: 1 }] },
    objectives: [
      { type: 'talk', npc: 'yayi', text: '与城门衙役刘三交谈' },
      { type: 'talk', npc: 'shoujiang', text: '把公文送到守将韩威处' },
      { type: 'talk', npc: 'yayi', text: '回城门向衙役复命' },
    ],
  },
  {
    id: 'deliver_cloth', title: '码头送布',
    giver: 'buzhuang', giverLine: '锦绣布庄沈掌柜需要码头上的布匹。',
    reward: { coins: 40, items: [] },
    objectives: [
      { type: 'talk', npc: 'buzhuang', text: '与锦绣布庄沈掌柜交谈' },
      { type: 'interact', interactable: 'cloth_bundle', text: '从栈桥尽头取布' },
      { type: 'talk', npc: 'buzhuang', text: '把布送回布庄', needItem: 'cloth', consume: true },
    ],
  },
  {
    id: 'attract_customers', title: '糖人招客',
    giver: 'tangren', giverLine: '糖人张生意冷清。',
    reward: { coins: 30, items: [] },
    objectives: [
      { type: 'talk', npc: 'tangren', text: '与糖人摊糖人张交谈' },
      { type: 'attract', count: 3, text: '在糖人摊旁与 3 位路人交谈招客' },
      { type: 'talk', npc: 'tangren', text: '回糖人摊复命' },
    ],
  },
  // ---- P2-4 新增 5 条：12~13 条任务线 ----
  {
    id: 'inn_wood', title: '客栈添柴',
    giver: 'keeper_inn', giverLine: '悦来客栈夜里客多，柴火不够烧了。',
    reward: { coins: 35, items: [] },
    objectives: [
      { type: 'talk', npc: 'keeper_inn', text: '与悦来客栈白掌柜交谈' },
      { type: 'interact', interactable: 'wood', text: '到木器摊旁取一捆木柴' },
      { type: 'talk', npc: 'keeper_inn', text: '把木柴送回客栈', needItem: 'wood', consume: true },
    ],
  },
  {
    id: 'tavern_wine', title: '醉仙楼送酒',
    giver: 'keeper_tavern', giverLine: '醉仙楼的一坛好酒，要送到码头货船上。',
    reward: { coins: 45, items: [] },
    objectives: [
      { type: 'talk', npc: 'keeper_tavern', text: '与醉仙楼冯掌柜交谈' },
      { type: 'interact', interactable: 'wine_jar', text: '在醉仙楼门口取一坛酒' },
      { type: 'talk', npc: 'chuanfu', text: '把酒坛送到码头船老大处', needItem: 'wine_jar', consume: false },
      { type: 'talk', npc: 'keeper_tavern', text: '回醉仙楼复命' },
    ],
  },
  {
    id: 'rice_deliver', title: '米铺送粮',
    giver: 'keeper_rice', giverLine: '丰源米铺的米要送到悦来客栈。',
    reward: { coins: 40, items: [] },
    objectives: [
      { type: 'talk', npc: 'keeper_rice', text: '与丰源米铺米家翁交谈' },
      { type: 'interact', interactable: 'rice_sack', text: '在米铺门口取一袋米' },
      { type: 'talk', npc: 'keeper_inn', text: '把米送到悦来客栈白掌柜处', needItem: 'rice_sack', consume: false },
      { type: 'talk', npc: 'keeper_rice', text: '回米铺复命' },
    ],
  },
  {
    id: 'riddle', title: '卦摊猜谜',
    giver: 'suanming', giverLine: '许半仙摆下谜题，说破谜底者分文不取。',
    reward: { coins: 30, items: [] },
    objectives: [
      { type: 'talk', npc: 'suanming', text: '与卦摊许半仙交谈' },
      { type: 'riddle', npc: 'suanming', question: '“人倚桥边，门开月出”，打一字。', choices: ['「汴」', '「京」', '「虹」'], answer: 0, text: '破解许半仙的谜题' },
      { type: 'talk', npc: 'suanming', text: '与许半仙交谈领取卦资' },
    ],
  },
  {
    id: 'storyteller_script', title: '说书人新书',
    giver: 'shuoshuren', giverLine: '说书人崔说书要写一段新书，缺一册旧手稿。',
    reward: { coins: 55, items: [] },
    objectives: [
      { type: 'talk', npc: 'shuoshuren', text: '与说书人崔说书交谈' },
      { type: 'interact', interactable: 'script', text: '到布庄沈掌柜处取一册手稿' },
      { type: 'talk', npc: 'shuoshuren', text: '把手稿交给说书人', needItem: 'script', consume: true },
      { type: 'talk', npc: 'shoujiang', text: '把说书人的回信送到城门守将处' },
      { type: 'talk', npc: 'shuoshuren', text: '回说书人处复命' },
    ],
  },
];

export function questById(id) {
  return QUESTS.find(q => q.id === id);
}
