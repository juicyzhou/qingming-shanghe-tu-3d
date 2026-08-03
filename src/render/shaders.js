import * as THREE from 'three';

// ============================================================
//  水面 shader —— 汴河：暖色水、软波、细碎高光
// ============================================================

export const WATER_UNIFORMS = {
  uTime: { value: 0 },
  uColorA: { value: new THREE.Color('#b9aa78') },
  uColorB: { value: new THREE.Color('#a2945f') },
  uFoam: { value: new THREE.Color('#e8dcb0') },
  uFogColor: { value: new THREE.Color('#e7d8b4') },
  uFogNear: { value: 55 },
  uFogFar: { value: 200 },
  uSparkle: { value: 0.6 }, // P2-5 太阳光斑强度（随昼夜/晴雨）
  uRain: { value: 0 },       // P2-5 雨天（0~1，水色变暗、波纹密）
};

export const waterVert = /* glsl */`
varying vec2 vUv;
varying vec3 vWorld;
varying float vFogDepth;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vFogDepth = -mv.z;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

export const waterFrag = /* glsl */`
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uFoam;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uSparkle;
uniform float uRain;
varying vec2 vUv;
varying vec3 vWorld;
varying float vFogDepth;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = vUv * 8.0;
  // 慢波（雨时波纹更密）
  float wr = 1.0 + uRain * 2.5;
  float w1 = sin(uv.x * 3.0 * wr + uTime * 0.5);
  float w2 = sin(uv.y * 5.0 * wr + uTime * 0.4);
  float wave = w1 * 0.5 + w2 * 0.5;
  vec3 col = mix(uColorA, uColorB, wave * 0.5 + 0.5);
  // 涟漪高光
  vec2 g = fract(uv + vec2(uTime * 0.06, 0.0));
  float glint = step(0.88, hash(g)) * 0.35 * step(0.5, hash(g + 7.0));
  col += uFoam * glint;
  // P2-5 太阳光斑：更亮、更细碎、随时间闪烁（晴日正午最强，夜/雨减弱）
  float s3 = pow(hash(floor(uv * 4.0) + floor(uTime * 1.9)), 5.0);
  float sparkle = step(0.9, s3) * uSparkle * 0.6;
  col += vec3(1.0, 0.96, 0.82) * sparkle;
  // P2-5 雨天：水色变暗
  col = mix(col, col * 0.78, uRain);
  // 岸边泛白
  float shore = smoothstep(0.55, 0.62, abs(fract(vUv.y) - 0.5) * 2.0);
  col = mix(col, uFoam, shore * 0.35);
  // 深浅抖动
  col *= 0.9 + 0.1 * sin(vWorld.x * 0.7 + uTime * 0.8);
  float fogFactor = smoothstep(uFogNear, uFogFar, vFogDepth);
  col = mix(col, uFogColor, clamp(fogFactor, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
}`;

export function makeWater() {
  const uniforms = { ...WATER_UNIFORMS };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: waterVert,
    fragmentShader: waterFrag,
  });
  mat.userData.uniforms = uniforms;
  return mat;
}
