export const isTouchDevice = () =>
  new URLSearchParams(location.search).get('touch') === '1' || // 测试钩子
  ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) ||
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
