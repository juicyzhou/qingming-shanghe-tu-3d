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
varying vec2 vUv;
varying vec3 vWorld;
varying float vFogDepth;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = vUv * 8.0;
  // 慢波
  float w1 = sin(uv.x * 3.0 + uTime * 0.5);
  float w2 = sin(uv.y * 5.0 + uTime * 0.4);
  float wave = w1 * 0.5 + w2 * 0.5;
  vec3 col = mix(uColorA, uColorB, wave * 0.5 + 0.5);
  // 涟漪高光
  vec2 g = fract(uv + vec2(uTime * 0.06, 0.0));
  float glint = step(0.88, hash(g)) * 0.35 * step(0.5, hash(g + 7.0));
  col += uFoam * glint;
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
