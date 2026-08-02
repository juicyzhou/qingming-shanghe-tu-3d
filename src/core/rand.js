// 确定性随机数（mulberry32）——保证每次构建场景一致
export function createRng(seed = 1) {
  let s = seed >>> 0;
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rand = createRng(20260802);
export const ri = (min, max) => Math.floor(rand() * (max - min + 1)) + min; // inclusive
export const rf = (min, max) => rand() * (max - min) + min;
export const pick = (arr) => arr[Math.floor(rand() * arr.length)];
