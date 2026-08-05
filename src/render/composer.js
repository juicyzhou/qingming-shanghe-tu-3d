import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';

// 国画手绘风后处理链：场景 → 墨线描边 → 暖色校色 + 暗角 → 输出
export function createComposer(renderer, scene, camera, { outline: useOutline = true } = {}) {
  const size = renderer.getSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  // ---- 墨线描边（基于深度 + 法线边缘检测；半分辨率提升性能） ----
  if (useOutline) {
    const outline = new OutlinePass(
      new THREE.Vector2(Math.max(1, size.width / 2), Math.max(1, size.height / 2)),
      scene, camera
    );
    outline.edgeStrength = 1.4;
    outline.edgeGlow = 0.05;
    outline.edgeThickness = 1.0;
    outline.visibleEdgeColor = new THREE.Color('#35281c');
    outline.hiddenEdgeColor = new THREE.Color('#35281c');
    composer.addPass(outline);
    composer.outlinePass = outline; // P1-5 暴露给 Game 做运行时开关
  }

  // ---- 暖色校色 + 暗角 + 轻微纸感 ----
  const warmPass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uVignette: { value: 0.3 },
      uWarm: { value: 0.1 },
      uPaper: { value: 0.05 },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse;
      uniform float uVignette;
      uniform float uWarm;
      uniform float uPaper;
      varying vec2 vUv;
      void main() {
        vec4 c = texture2D(tDiffuse, vUv);
        vec3 col = c.rgb;
        // 天空遮罩：画面上部为天空，少暖化，保住蓝天/夜空的真实色
        float skyMask = smoothstep(0.22, 0.5, vUv.y);
        float warm = uWarm * (1.0 - skyMask * 0.88);
        // 暖化（压蓝、抬红黄）
        col.r += warm * 0.6;
        col.g += warm * 0.35;
        col.b -= warm * 0.5;
        // 纸感：略提亮暗部、柔化
        col = mix(col, col * col * 0.35 + col * 0.65, uPaper * (1.0 - skyMask * 0.7));
        // 暗角
        vec2 d = vUv - 0.5;
        float vig = 1.0 - uVignette * dot(d, d) * 4.0;
        col *= clamp(vig, 0.0, 1.0);
        gl_FragColor = vec4(col, c.a);
      }
    `,
  });
  composer.addPass(warmPass);

  // 色彩空间输出（最终渲染到屏幕）
  composer.addPass(new OutputPass());

  return composer;
}
