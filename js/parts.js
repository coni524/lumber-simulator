import * as THREE from 'three';
import { state, GRID_SNAP, SNAP_THRESHOLD, COLLISION_MARGIN } from './state.js';
import { findLumberDef } from './lumber.js';
import { createWoodTexture } from './textures.js';
import { showDimensions, removeDimensions } from './dimensions.js';

export function checkCollision(part) {
  const box = new THREE.Box3().setFromObject(part.mesh);
  box.min.addScalar(COLLISION_MARGIN);
  box.max.addScalar(-COLLISION_MARGIN);
  for (const other of state.parts) {
    if (other === part) continue;
    const otherBox = new THREE.Box3().setFromObject(other.mesh);
    if (box.intersectsBox(otherBox)) return true;
  }
  return false;
}

function addWoodGrain(mesh, length, height, width) {
  const edges = new THREE.EdgesGeometry(mesh.geometry);
  const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000, opacity: 0.15, transparent: true }));
  mesh.add(line);
}

export function createPart(lumberId, opts = {}) {
  const def = findLumberDef(lumberId);
  if (!def) return null;

  state.partCounter++;
  const length = opts.length || def.defaultLength;
  const color = opts.color || def.color;
  const name = opts.name || `${def.name} #${state.partCounter}`;

  // Create mesh - lumber lies along X axis, width=Z, height=Y
  const geo = new THREE.BoxGeometry(length, def.height, def.width);
  const woodTex = createWoodTexture(color);
  woodTex.repeat.set(Math.max(1, length / 500), 1);
  const mat = new THREE.MeshStandardMaterial({
    map: woodTex,
    color: new THREE.Color(color),
    roughness: 0.8,
    metalness: 0.0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  // Position at ground level by default
  mesh.position.set(
    opts.x || 0,
    opts.y !== undefined ? opts.y : def.height / 2,
    opts.z || 0
  );
  if (opts.rx !== undefined) mesh.rotation.x = THREE.MathUtils.degToRad(opts.rx);
  if (opts.ry !== undefined) mesh.rotation.y = THREE.MathUtils.degToRad(opts.ry);
  if (opts.rz !== undefined) mesh.rotation.z = THREE.MathUtils.degToRad(opts.rz);

  // Add wood grain lines
  addWoodGrain(mesh, length, def.height, def.width);

  state.scene.add(mesh);

  const part = {
    id: state.partCounter,
    name,
    lumberId,
    length,
    width: def.width,
    height: def.height,
    color,
    x: mesh.position.x,
    y: mesh.position.y,
    z: mesh.position.z,
    rx: opts.rx || 0,
    ry: opts.ry || 0,
    rz: opts.rz || 0,
    mesh,
  };
  state.parts.push(part);

  // Avoid collision with existing parts by shifting along X
  if (checkCollision(part)) {
    const step = Math.max(length, def.width) + GRID_SNAP;
    for (let offset = step; offset <= 10000; offset += step) {
      mesh.position.x = offset;
      if (!checkCollision(part)) break;
      mesh.position.x = -offset;
      if (!checkCollision(part)) break;
    }
    syncPartFromMesh(part);
    part.x = mesh.position.x;
    part.y = mesh.position.y;
    part.z = mesh.position.z;
  }

  updateStatusBar();
  updatePartsList();
  return part;
}

export function syncPartFromMesh(part) {
  part.x = Math.round(part.mesh.position.x);
  part.y = Math.round(part.mesh.position.y);
  part.z = Math.round(part.mesh.position.z);
  part.rx = Math.round(THREE.MathUtils.radToDeg(part.mesh.rotation.x));
  part.ry = Math.round(THREE.MathUtils.radToDeg(part.mesh.rotation.y));
  part.rz = Math.round(THREE.MathUtils.radToDeg(part.mesh.rotation.z));
}

export function syncMeshFromPart(part) {
  part.mesh.position.set(part.x, part.y, part.z);
  part.mesh.rotation.set(
    THREE.MathUtils.degToRad(part.rx),
    THREE.MathUtils.degToRad(part.ry),
    THREE.MathUtils.degToRad(part.rz)
  );
}

export function rebuildMesh(part) {
  const def = findLumberDef(part.lumberId);
  if (!def) return;
  // Remove old mesh
  state.scene.remove(part.mesh);
  part.mesh.geometry.dispose();
  part.mesh.material.dispose();

  const geo = new THREE.BoxGeometry(part.length, def.height, def.width);
  const woodTex = createWoodTexture(part.color);
  woodTex.repeat.set(Math.max(1, part.length / 500), 1);
  const mat = new THREE.MeshStandardMaterial({
    map: woodTex,
    color: new THREE.Color(part.color),
    roughness: 0.8,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  addWoodGrain(mesh, part.length, def.height, def.width);

  mesh.position.set(part.x, part.y, part.z);
  mesh.rotation.set(
    THREE.MathUtils.degToRad(part.rx),
    THREE.MathUtils.degToRad(part.ry),
    THREE.MathUtils.degToRad(part.rz)
  );
  state.scene.add(mesh);
  part.mesh = mesh;
  part.width = def.width;
  part.height = def.height;

  if (state.selectedPart === part) highlightPart(part);
}

export function selectPart(part) {
  // Unhighlight previous
  if (state.selectedPart) unhighlightPart(state.selectedPart);
  state.selectedPart = part;
  if (part) {
    highlightPart(part);
    showDimensions(part);
  } else {
    removeDimensions();
  }
  updatePropertiesPanel();
  updatePartsList();
}

export function highlightPart(part) {
  part.mesh.material.emissive = new THREE.Color(0xe94560);
  part.mesh.material.emissiveIntensity = 0.15;
}

export function unhighlightPart(part) {
  if (part && part.mesh) {
    part.mesh.material.emissive = new THREE.Color(0x000000);
    part.mesh.material.emissiveIntensity = 0;
  }
}

export function getPartFaces(part, position) {
  const quat = part.mesh.quaternion;
  const hx = part.length / 2;
  const hy = part.height / 2;
  const hz = part.width / 2;

  const defs = [
    { c: [hx,0,0], n: [1,0,0], t1: [0,1,0], t2: [0,0,1], hs1: hy, hs2: hz },
    { c: [-hx,0,0], n: [-1,0,0], t1: [0,1,0], t2: [0,0,1], hs1: hy, hs2: hz },
    { c: [0,hy,0], n: [0,1,0], t1: [1,0,0], t2: [0,0,1], hs1: hx, hs2: hz },
    { c: [0,-hy,0], n: [0,-1,0], t1: [1,0,0], t2: [0,0,1], hs1: hx, hs2: hz },
    { c: [0,0,hz], n: [0,0,1], t1: [1,0,0], t2: [0,1,0], hs1: hx, hs2: hy },
    { c: [0,0,-hz], n: [0,0,-1], t1: [1,0,0], t2: [0,1,0], hs1: hx, hs2: hy },
  ];

  return defs.map(f => ({
    center: new THREE.Vector3(...f.c).applyQuaternion(quat).add(position),
    normal: new THREE.Vector3(...f.n).applyQuaternion(quat),
    t1: new THREE.Vector3(...f.t1).applyQuaternion(quat),
    t2: new THREE.Vector3(...f.t2).applyQuaternion(quat),
    hs1: f.hs1,
    hs2: f.hs2,
  }));
}

export function facesOverlap(fA, fB, margin) {
  const diff = fB.center.clone().sub(fA.center);
  const gap = diff.dot(fA.normal);
  const d = diff.clone().sub(fA.normal.clone().multiplyScalar(gap));

  const axes = [fA.t1, fA.t2, fB.t1, fB.t2];
  for (const axis of axes) {
    const projD = Math.abs(d.dot(axis));
    const extA = Math.abs(fA.t1.dot(axis)) * fA.hs1 + Math.abs(fA.t2.dot(axis)) * fA.hs2;
    const extB = Math.abs(fB.t1.dot(axis)) * fB.hs1 + Math.abs(fB.t2.dot(axis)) * fB.hs2;
    if (projD > extA + extB + margin) return false;
  }
  return true;
}

export function snapToAdjacentParts(part, position) {
  const partFaces = getPartFaces(part, position);

  // Collect all snap candidates (face-to-face AND coplanar/flush)
  const candidates = [];

  for (const other of state.parts) {
    if (other === part) continue;
    const otherFaces = getPartFaces(other, other.mesh.position);

    for (const fA of partFaces) {
      for (const fB of otherFaces) {
        const dot = fA.normal.dot(fB.normal);
        const diff = fB.center.clone().sub(fA.center);

        if (dot < -0.95) {
          // Anti-parallel faces: face-to-face touch snap
          const gap = diff.dot(fA.normal);
          const absGap = Math.abs(gap);
          if (absGap > SNAP_THRESHOLD) continue;
          if (!facesOverlap(fA, fB, SNAP_THRESHOLD)) continue;
          candidates.push({
            normal: fA.normal.clone(),
            shift: fA.normal.clone().multiplyScalar(gap),
            absGap,
          });
        } else if (dot > 0.95) {
          // Parallel same-direction faces: flush / coplanar snap
          const gap = diff.dot(fA.normal);
          const absGap = Math.abs(gap);
          if (absGap < 0.5 || absGap > SNAP_THRESHOLD) continue;
          // Proximity check: parts must be nearby in perpendicular direction
          const perp = diff.clone().sub(fA.normal.clone().multiplyScalar(gap));
          const perpDist = perp.length();
          const maxDim = Math.max(part.length, part.width, part.height,
                                  other.length, other.width, other.height);
          if (perpDist > maxDim + SNAP_THRESHOLD) continue;
          candidates.push({
            normal: fA.normal.clone(),
            shift: fA.normal.clone().multiplyScalar(gap),
            absGap,
          });
        }
      }
    }
  }

  // Sort by smallest gap first
  candidates.sort((a, b) => a.absGap - b.absGap);

  // Apply best snap per independent direction (allows multi-axis snap)
  const applied = [];
  for (const cand of candidates) {
    const dominated = applied.some(a => Math.abs(cand.normal.dot(a.normal)) > 0.5);
    if (!dominated) {
      applied.push(cand);
      position.add(cand.shift);
    }
  }

  return position;
}

export function updatePropertiesPanel() {
  const noSel = document.getElementById('no-selection');
  const editor = document.getElementById('prop-editor');
  if (!state.selectedPart) {
    noSel.style.display = 'block';
    editor.style.display = 'none';
    return;
  }
  noSel.style.display = 'none';
  editor.style.display = 'block';

  document.getElementById('prop-name').value = state.selectedPart.name;
  document.getElementById('prop-type').value = state.selectedPart.lumberId;
  document.getElementById('prop-length').value = state.selectedPart.length;
  document.getElementById('prop-px').value = state.selectedPart.x;
  document.getElementById('prop-py').value = state.selectedPart.y;
  document.getElementById('prop-pz').value = state.selectedPart.z;
  document.getElementById('prop-rx').value = state.selectedPart.rx;
  document.getElementById('prop-ry').value = state.selectedPart.ry;
  document.getElementById('prop-rz').value = state.selectedPart.rz;
  document.getElementById('prop-color').value = state.selectedPart.color;
}

export function updatePartsList() {
  const list = document.getElementById('parts-list');
  list.innerHTML = '';
  for (const part of state.parts) {
    const el = document.createElement('div');
    el.className = 'part-item' + (part === state.selectedPart ? ' selected' : '');
    el.innerHTML = `<span>${part.name}</span><span style="color:#888;font-size:11px">${part.lumberId} L=${part.length}</span>`;
    el.addEventListener('click', () => selectPart(part));
    list.appendChild(el);
  }
}

export function updateStatusBar() {
  document.getElementById('sb-count').textContent = `パーツ: ${state.parts.length}`;
}
