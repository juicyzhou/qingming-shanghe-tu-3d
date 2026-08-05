import { faceTexture, CLOTH_PALETTE } from '../render/materials.js';
import { rand, ri, rf, pick } from '../core/rand.js';

export const SKIN_TONES = ['#f2c79e', '#e8b98a', '#dca878', '#d29b68', '#c88e5a', '#b97a48'];
export const HAIR_COLORS = ['#241a14', '#33241a', '#3d2a1c', '#4a3422', '#6b5138', '#1a1a1a'];

// 角色模板：不同职业的服装配色 / 帽式（宋制） / 道具倾向
export const ROLE_PRESETS = {
  huolang:     { hat: 'straw', cloth: [0x8a6d3b, 0x6e8a4f, 0x7a5a34], trim: 0xc04a30, apron: 0xc9b478 },
  vendor:      { hat: 'straw', cloth: [0x955f8f, 0xb07c36, 0x54725a], trim: 0x2a2018 },
  waiter:      { hat: 'jin',   cloth: [0x2f6d4f, 0x4a6b9a, 0x6e8a4f, 0x955f8f, 0xb0622f], trim: 0xc9a24a, apron: 0xe0d0a0, sleeveColor: 0xffffff },
  tea:         { hat: 'jin',   cloth: [0x3c7a82, 0x5d6f9e, 0x54725a, 0x8a6d3b], trim: 0xc9a24a },
  scholar:     { hat: 'dongpo', cloth: [0x4a6b9a, 0x3a5a8a, 0x5d6f9e, 0x7a5aa0, 0x2f6d4f], trim: 0xe8dcb0, sleeveColor: 0xffffff },
  monk:        { hat: 'none',  cloth: [0xa86e54, 0xb07c36, 0x955f8f], trim: 0xf0e0a0 },
  boatman:     { hat: 'straw', cloth: [0x7a5a34, 0x8a6d3b, 0x6e4f2c, 0x3c7a82], trim: 0x4a3a28, apron: 0x6e8a4f },
  porter:      { hat: 'jin',   cloth: [0x6e5a3c, 0x5a4a30, 0x955f8f], trim: 0x2a2018 },
  yamen:       { hat: 'guan',  cloth: [0xb04a4a, 0x8a3a3a], trim: 0xc9b478, sleeveColor: 0xffffff },
  general:     { hat: 'guan',  cloth: [0x3a3a52, 0x4a4a62, 0x2c4a4a], trim: 0xcaa24a },
  storyteller: { hat: 'jin',   cloth: [0xb07c36, 0xa8642e, 0x5d6f9e], trim: 0xe8dcb0 },
  doctor:      { hat: 'dongpo', cloth: [0x5d6f9e, 0x4a5a8a, 0x2f6d4f], trim: 0xe8dcb0 },
  farmer:      { hat: 'straw', cloth: [0x8a7a5a, 0x6e8a4f, 0xa8642e], trim: 0x4a3a28, apron: 0xa0906a },
  child:       { hat: 'none',  cloth: [0xd8b23c, 0xc04a30, 0x3f7a4a, 0x5d6f9e, 0x955f8f], trim: 0xffffff },
  official:    { hat: 'guan',  cloth: [0x4a4a5a, 0x5a4a4a, 0x3a3a52], trim: 0xcaa24a },
  woman:       { hat: 'none',  cloth: [0xa84a5a, 0x7a5aa0, 0xc04a30, 0x3c7a82, 0xb0622f, 0x955f8f], trim: 0xf0e0a0, sleeveColor: 0xffffff },
  cook:        { hat: 'guanyin', cloth: [0xa86e54, 0x8a6d3b, 0x6e8a4f], trim: 0x4a3a28, apron: 0xd8c8a0 },
  acrobat:     { hat: 'jin',   cloth: [0xd04a30, 0xb07c36, 0x4a6b9a], trim: 0xf0e0a0, sleeveColor: 0xe0d0a0 },
  guest:       { hat: 'none',  cloth: CLOTH_PALETTE, trim: 0x2a2018 },
  weaver:      { hat: 'guanyin', cloth: [0x3c7a82, 0x5d9a8a, 0x955f8f], trim: 0xe8dcb0 },
  fish:        { hat: 'straw', cloth: [0x6e8a4f, 0x7a5a34, 0x4a6b9a], trim: 0x4a3a28, apron: 0xc9b478 },
};

// 生成一份外观配置（可传 seed 保证同一 NPC 每次一致）
export function generateAppearance(role = 'guest', seed = 0) {
  const r = Math.random.bind(Math);
  // 用角色+seed 派生确定性随机
  let s = (seed >>> 0) || 1;
  const rr = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const pick = (arr) => arr[Math.floor(rr() * arr.length)];

  const preset = ROLE_PRESETS[role] || ROLE_PRESETS.guest;
  const sex = role === 'woman' || role === 'cook' ? 'f' : (role === 'child' ? pick(['m', 'f']) : 'm');
  const isWoman = sex === 'f';
  const height = role === 'child' ? rr() * 0.32 + 1.18 : rr() * 0.22 + 1.55;

  // 宋制发型：男子束发、女子高髻/双髻、孩童总角/束发、僧光头
  const hairStyle = role === 'monk' ? 'bald'
    : isWoman ? pick(['gaoji', 'double'])
    : role === 'child' ? pick(['zongjiao', 'topknot']) : 'topknot';

  const faceCfg = {
    skin: pick(SKIN_TONES),
    hair: pick(HAIR_COLORS),
    old: role === 'farmer' || role === 'doctor' || rr() < 0.22,
    smile: rr() < 0.35,
    browTilt: rr() < 0.3 ? -0.03 : 0,
    blush: isWoman || role === 'child',
    beard: !isWoman && role !== 'monk' && role !== 'child' ? pick(['none', 'none', 'none', 'goatee', 'mustache', 'full']) : 'none',
  };

  return {
    role,
    sex,
    height,
    girth: rr() * 0.3 + 0.85,
    skin: faceCfg.skin,
    hair: faceCfg.hair,
    hairStyle,
    hat: preset.hat,
    crown: !!preset.crown,            // 束发玉冠（翩翩公子）
    cloth: typeof preset.cloth === 'number' ? preset.cloth : pick(preset.cloth),
    trim: preset.trim,
    apron: preset.apron || null,
    sleeveColor: preset.sleeveColor || null,
    shoe: 0x2a2018,
    faceCfg,
    faceTex: faceTexture(faceCfg),
  };
}

// 玩家外观：一位进京赶考的书生（东坡巾 · 青衫直裰）
export function playerAppearance() {
  const app = generateAppearance('scholar', 20260802);
  app.hat = 'dongpo';                   // 书生方巾帽
  app.crown = false;
  app.hairStyle = 'topknot';
  app.cloth = 0x3a5a8a;
  app.trim = 0xe8dcb0;
  app.faceCfg.skin = '#e8b98a';
  app.faceCfg.beard = 'none';
  app.faceTex = faceTexture(app.faceCfg);
  return app;
}
