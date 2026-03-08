import * as THREE from 'three';
import { state } from './state.js';

function createTextSprite(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 36px Arial';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(120, 30, 1);
  return sprite;
}

function createDimensionLine(start, end, color, label, offsetDir) {
  const group = new THREE.Group();
  const offset = offsetDir.clone().multiplyScalar(40);
  const p1 = start.clone().add(offset);
  const p2 = end.clone().add(offset);

  // Main line
  const mat = new THREE.LineBasicMaterial({ color, linewidth: 2, depthTest: false });
  const geom = new THREE.BufferGeometry().setFromPoints([p1, p2]);
  const line = new THREE.Line(geom, mat);
  group.add(line);

  // Extension lines
  const ext1Geom = new THREE.BufferGeometry().setFromPoints([start, p1]);
  const ext2Geom = new THREE.BufferGeometry().setFromPoints([end, p2]);
  const extMat = new THREE.LineBasicMaterial({ color, linewidth: 1, depthTest: false, opacity: 0.5, transparent: true });
  group.add(new THREE.Line(ext1Geom, extMat));
  group.add(new THREE.Line(ext2Geom, extMat));

  // Arrow heads (small lines at ends)
  const dir = p2.clone().sub(p1).normalize();
  const arrowLen = 15;
  const perp = offsetDir.clone().multiplyScalar(8);
  // Arrow at p1
  const a1a = p1.clone().add(dir.clone().multiplyScalar(arrowLen)).add(perp);
  const a1b = p1.clone().add(dir.clone().multiplyScalar(arrowLen)).sub(perp);
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([p1, a1a]), mat));
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([p1, a1b]), mat));
  // Arrow at p2
  const a2a = p2.clone().sub(dir.clone().multiplyScalar(arrowLen)).add(perp);
  const a2b = p2.clone().sub(dir.clone().multiplyScalar(arrowLen)).sub(perp);
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([p2, a2a]), mat));
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([p2, a2b]), mat));

  // Label
  const mid = p1.clone().add(p2).multiplyScalar(0.5).add(offsetDir.clone().multiplyScalar(20));
  const sprite = createTextSprite(label, color === 0x2196F3 ? '#2196F3' : '#F44336');
  sprite.position.copy(mid);
  group.add(sprite);

  return group;
}

export function showDimensions(part) {
  removeDimensions();
  state.dimensionGroup = new THREE.Group();
  state.dimensionGroup.name = 'dimensions';

  const mesh = part.mesh;
  const pos = mesh.position.clone();

  // Get world-space corners considering rotation
  const box = new THREE.Box3().setFromObject(mesh);
  const min = box.min;
  const max = box.max;

  // Width (X) - blue
  const xStart = new THREE.Vector3(min.x, min.y, max.z);
  const xEnd = new THREE.Vector3(max.x, min.y, max.z);
  const xLen = Math.round(max.x - min.x);
  state.dimensionGroup.add(createDimensionLine(xStart, xEnd, 0x2196F3, `${xLen}mm`, new THREE.Vector3(0, 0, 1)));

  // Height (Y) - red
  const yStart = new THREE.Vector3(max.x, min.y, max.z);
  const yEnd = new THREE.Vector3(max.x, max.y, max.z);
  const yLen = Math.round(max.y - min.y);
  state.dimensionGroup.add(createDimensionLine(yStart, yEnd, 0xF44336, `${yLen}mm`, new THREE.Vector3(1, 0, 1).normalize()));

  // Depth (Z) - blue
  const zStart = new THREE.Vector3(max.x, min.y, min.z);
  const zEnd = new THREE.Vector3(max.x, min.y, max.z);
  const zLen = Math.round(max.z - min.z);
  state.dimensionGroup.add(createDimensionLine(zStart, zEnd, 0x2196F3, `${zLen}mm`, new THREE.Vector3(1, 0, 0)));

  state.scene.add(state.dimensionGroup);
}

export function removeDimensions() {
  if (state.dimensionGroup) {
    state.scene.remove(state.dimensionGroup);
    state.dimensionGroup.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
    });
    state.dimensionGroup = null;
  }
}
