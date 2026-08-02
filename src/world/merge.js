import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { flat } from '../render/materials.js';

// 按材质收集几何并在最后合并 → 显著减少 draw call
export class Merger {
  constructor() { this.buckets = new Map(); }
  add(mat, geo, x, y, z, rx = 0, ry = 0, rz = 0) {
    const g = flat(geo);
    const m4 = new THREE.Matrix4().makeRotationX(rx);
    if (ry) m4.multiply(new THREE.Matrix4().makeRotationY(ry));
    if (rz) m4.multiply(new THREE.Matrix4().makeRotationZ(rz));
    m4.setPosition(x, y, z);
    g.applyMatrix4(m4);
    const arr = this.buckets.get(mat);
    if (arr) arr.push(g); else this.buckets.set(mat, [g]);
  }
  meshes() {
    const out = [];
    for (const [mat, geoms] of this.buckets) {
      out.push(geoms.length === 1
        ? new THREE.Mesh(geoms[0], mat)
        : new THREE.Mesh(mergeGeometries(geoms, false), mat));
    }
    return out;
  }
}
