import * as THREE from 'three';
import { state, GRID_SNAP, SNAP_THRESHOLD, COLLISION_MARGIN, MAX_GROUPS } from './state.js';
import { findLumberDef } from './lumber.js';
import { createWoodTexture } from './textures.js';
import { showDimensions, removeDimensions, showOverallDimensions } from './dimensions.js';

export function checkCollision(part, exclude = []) {
  const box = new THREE.Box3().setFromObject(part.mesh);
  box.min.addScalar(COLLISION_MARGIN);
  box.max.addScalar(-COLLISION_MARGIN);
  const excludeSet = exclude.length > 0 ? new Set(exclude) : null;
  for (const other of state.parts) {
    if (other === part) continue;
    if (excludeSet && excludeSet.has(other)) continue;
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

const GROUND_MATERIAL = new THREE.MeshStandardMaterial({
  color: 0xff69b4,
  roughness: 0.8,
  metalness: 0.0,
  transparent: true,
  opacity: 0.5,
});

function createFaceMaterials(color, woodTex, lengthRepeat) {
  const baseMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    color: new THREE.Color(color),
    roughness: 0.8,
    metalness: 0.0,
  });
  // BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z
  return [baseMat, baseMat, baseMat, baseMat, baseMat, baseMat];
}

export function updateGroundFaces() {
  const threshold = 1; // tolerance in mm
  for (const part of state.parts) {
    const mesh = part.mesh;
    if (!Array.isArray(mesh.material)) continue;

    const quat = mesh.quaternion;
    // BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z
    const faceLocalNormals = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
    ];
    const halfSizes = [
      part.length / 2, part.length / 2,
      part.height / 2, part.height / 2,
      part.width / 2, part.width / 2,
    ];

    // Compute the object's lowest Y from all 8 corners of the bounding box
    const hx = part.length / 2, hy = part.height / 2, hz = part.width / 2;
    let minY = Infinity;
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const corner = new THREE.Vector3(sx * hx, sy * hy, sz * hz).applyQuaternion(quat);
          const worldY = mesh.position.y + corner.y;
          if (worldY < minY) minY = worldY;
        }
      }
    }
    // Object is grounded only when its lowest point is at Y=0
    const isObjectGrounded = Math.abs(minY) < threshold;

    const baseMat = mesh.material.find(m => m !== GROUND_MATERIAL) || mesh.material[0];

    for (let i = 0; i < 6; i++) {
      const worldNormal = faceLocalNormals[i].clone().applyQuaternion(quat);
      const faceCenterY = mesh.position.y + worldNormal.y * halfSizes[i];
      // Face is grounded: object bottom at Y=0 AND this face points down AND face is near Y=0
      const isGrounded = isObjectGrounded && worldNormal.y < -0.5 && faceCenterY < threshold;
      mesh.material[i] = isGrounded ? GROUND_MATERIAL : baseMat;
    }
  }
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
  const mats = createFaceMaterials(color, woodTex);
  const mesh = new THREE.Mesh(geo, mats);
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
  if (Array.isArray(part.mesh.material)) {
    part.mesh.material.forEach(m => { if (m !== GROUND_MATERIAL) m.dispose(); });
  } else {
    part.mesh.material.dispose();
  }

  const geo = new THREE.BoxGeometry(part.length, def.height, def.width);
  const woodTex = createWoodTexture(part.color);
  woodTex.repeat.set(Math.max(1, part.length / 500), 1);
  const mats = createFaceMaterials(part.color, woodTex);
  const mesh = new THREE.Mesh(geo, mats);
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
  // Unhighlight all previously selected parts
  for (const p of state.selectedParts) unhighlightPart(p);
  if (state.selectedPart && !state.selectedParts.includes(state.selectedPart)) {
    unhighlightPart(state.selectedPart);
  }

  if (part) {
    // If clicking a part already in the multi-selection, just switch anchor
    if (state.selectedParts.length > 1 && state.selectedParts.includes(part)) {
      state.selectedPart = part;
      showDimensions(part);
      updatePropertiesPanel();
      updatePartsList();
      return;
    }
    // If part belongs to a group, select the entire group
    const group = findGroupForPart(part);
    if (group) {
      state.selectedPart = part;
      state.selectedParts = [];
      for (const partId of group.partIds) {
        const gp = state.parts.find(p => p.id === partId);
        if (gp) {
          state.selectedParts.push(gp);
          highlightPart(gp);
        }
      }
    } else {
      state.selectedPart = part;
      state.selectedParts = [part];
      highlightPart(part);
    }
    showDimensions(part);
  } else {
    state.selectedPart = null;
    state.selectedParts = [];
    showOverallDimensions();
  }
  updatePropertiesPanel();
  updatePartsList();
}

export function togglePartSelection(part) {
  // Resolve the group this part belongs to (if any)
  const group = findGroupForPart(part);
  const partsToToggle = group
    ? group.partIds.map(id => state.parts.find(p => p.id === id)).filter(Boolean)
    : [part];

  const isSelected = state.selectedParts.includes(part);
  if (isSelected) {
    // Remove all group members from selection
    for (const p of partsToToggle) {
      const idx = state.selectedParts.indexOf(p);
      if (idx >= 0) state.selectedParts.splice(idx, 1);
      unhighlightPart(p);
    }
    if (partsToToggle.includes(state.selectedPart)) {
      state.selectedPart = state.selectedParts.length > 0
        ? state.selectedParts[state.selectedParts.length - 1] : null;
    }
  } else {
    // Add all group members to selection
    for (const p of partsToToggle) {
      if (!state.selectedParts.includes(p)) {
        state.selectedParts.push(p);
        highlightPart(p);
      }
    }
    state.selectedPart = part;
  }
  if (state.selectedPart) {
    showDimensions(state.selectedPart);
  } else {
    removeDimensions();
  }
  updatePropertiesPanel();
  updatePartsList();
}

export function selectGroup(group) {
  for (const p of state.selectedParts) unhighlightPart(p);
  state.selectedParts = [];
  state.selectedPart = null;
  for (const partId of group.partIds) {
    const part = state.parts.find(p => p.id === partId);
    if (part) {
      state.selectedParts.push(part);
      highlightPart(part);
    }
  }
  if (state.selectedParts.length > 0) {
    state.selectedPart = state.selectedParts[0];
    showDimensions(state.selectedPart);
  }
  updatePropertiesPanel();
  updatePartsList();
}

export function highlightPart(part) {
  const mats = Array.isArray(part.mesh.material) ? part.mesh.material : [part.mesh.material];
  mats.forEach(m => { m.emissive = new THREE.Color(0xe94560); m.emissiveIntensity = 0.15; });
}

export function unhighlightPart(part) {
  if (part && part.mesh) {
    const mats = Array.isArray(part.mesh.material) ? part.mesh.material : [part.mesh.material];
    mats.forEach(m => { m.emissive = new THREE.Color(0x000000); m.emissiveIntensity = 0; });
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

export function snapToAdjacentParts(part, position, exclude = []) {
  const partFaces = getPartFaces(part, position);

  // Collect all snap candidates (face-to-face AND coplanar/flush)
  const candidates = [];
  const excludeSet = exclude.length > 0 ? new Set(exclude) : null;

  for (const other of state.parts) {
    if (other === part) continue;
    if (excludeSet && excludeSet.has(other)) continue;
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
  const multiSel = document.getElementById('multi-selection');

  if (!state.selectedPart) {
    noSel.style.display = 'block';
    editor.style.display = 'none';
    if (multiSel) multiSel.style.display = 'none';
    return;
  }

  noSel.style.display = 'none';

  if (state.selectedParts.length > 1) {
    editor.style.display = 'none';
    if (multiSel) {
      multiSel.style.display = 'block';
      document.getElementById('multi-count').textContent = `${state.selectedParts.length} パーツ選択中`;
    }
  } else {
    if (multiSel) multiSel.style.display = 'none';
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
}

export function updatePartsList() {
  const list = document.getElementById('parts-list');
  list.innerHTML = '';
  for (const part of state.parts) {
    const el = document.createElement('div');
    const isSelected = state.selectedParts.includes(part);
    el.className = 'part-item' + (isSelected ? ' selected' : '');
    const nameSpan = document.createElement('span');
    nameSpan.textContent = part.name;
    const infoSpan = document.createElement('span');
    infoSpan.style.cssText = 'color:#888;font-size:11px';
    infoSpan.textContent = `${part.lumberId} L=${part.length}`;
    el.appendChild(nameSpan);
    el.appendChild(infoSpan);
    el.addEventListener('click', () => selectPart(part));
    list.appendChild(el);
  }
}

export function updateStatusBar() {
  document.getElementById('sb-count').textContent = `パーツ: ${state.parts.length}`;
}

// ── Group management ──

export function createGroupFromSelection() {
  if (state.selectedParts.length < 2) return null;

  const selectedIds = new Set(state.selectedParts.map(p => p.id));

  // Find existing groups that overlap with the selection
  const overlapping = state.groups.filter(g => g.partIds.some(id => selectedIds.has(id)));

  if (overlapping.length > 0) {
    // Merge: collect all partIds from overlapping groups + current selection
    const mergedIds = new Set(selectedIds);
    for (const g of overlapping) {
      for (const id of g.partIds) mergedIds.add(id);
    }
    // Remove old groups
    state.groups = state.groups.filter(g => !overlapping.includes(g));
    // Use the earliest group's name, or generate new
    const name = overlapping[0].name;
    const group = { id: overlapping[0].id, name, partIds: [...mergedIds] };
    state.groups.push(group);
    updateGroupsList();
    return group;
  }

  // No overlap — create new group
  if (state.groups.length >= MAX_GROUPS) return null;
  state.groupCounter++;
  const group = {
    id: state.groupCounter,
    name: `グループ #${state.groupCounter}`,
    partIds: [...selectedIds],
  };
  state.groups.push(group);
  updateGroupsList();
  return group;
}

export function ungroupSelected() {
  const selectedIds = new Set(state.selectedParts.map(p => p.id));
  state.groups = state.groups.filter(g => !g.partIds.some(id => selectedIds.has(id)));
  updateGroupsList();
}

export function findGroupForPart(part) {
  return state.groups.find(g => g.partIds.includes(part.id)) || null;
}

export function removePartFromGroups(partId) {
  for (const group of state.groups) {
    group.partIds = group.partIds.filter(id => id !== partId);
  }
  state.groups = state.groups.filter(g => g.partIds.length > 0);
}

export function deleteGroup(group) {
  state.groups = state.groups.filter(g => g !== group);
  updateGroupsList();
}

export function updateGroupsList() {
  const list = document.getElementById('groups-list');
  if (!list) return;
  list.innerHTML = '';
  for (const group of state.groups) {
    const el = document.createElement('div');
    el.className = 'group-item';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'group-name';
    nameSpan.textContent = group.name;
    nameSpan.addEventListener('click', () => selectGroup(group));
    const infoSpan = document.createElement('span');
    infoSpan.className = 'group-info';
    const countSpan = document.createElement('span');
    countSpan.className = 'group-count';
    countSpan.textContent = group.partIds.length;
    const delBtn = document.createElement('button');
    delBtn.className = 'group-del';
    delBtn.title = 'グループ解除';
    delBtn.textContent = '\u00d7';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteGroup(group);
    });
    infoSpan.appendChild(countSpan);
    infoSpan.appendChild(delBtn);
    el.appendChild(nameSpan);
    el.appendChild(infoSpan);
    list.appendChild(el);
  }
  const countEl = document.getElementById('group-count');
  if (countEl) countEl.textContent = `${state.groups.length}/${MAX_GROUPS}`;
}
