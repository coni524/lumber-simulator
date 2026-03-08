import * as THREE from 'three';
import { state, GRID_SNAP } from './state.js';
import {
  selectPart, togglePartSelection, createPart, checkCollision, syncPartFromMesh,
  updatePropertiesPanel, updatePartsList, updateStatusBar, updateGroupsList,
  snapToAdjacentParts, removePartFromGroups, highlightPart,
  createGroupFromSelection
} from './parts.js';
import { showDimensions, removeDimensions } from './dimensions.js';
import { setSceneCallbacks } from './scene.js';

export function updateMouse(e) {
  const rect = state.renderer.domElement.getBoundingClientRect();
  state.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  state.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
}

function setupMoveDrag(e, vertical) {
  if (vertical) {
    // Shift+drag: use camera-facing vertical plane for Y-axis movement
    const camDir = state.camera.getWorldDirection(new THREE.Vector3());
    const planeNormal = new THREE.Vector3(camDir.x, 0, camDir.z).normalize();
    if (planeNormal.length() < 0.1) planeNormal.set(0, 0, 1);
    state.dragPlane.setFromNormalAndCoplanarPoint(planeNormal, state.selectedPart.mesh.position);
  } else {
    state.dragPlane.setFromNormalAndCoplanarPoint(
      state.camera.getWorldDirection(new THREE.Vector3()).clone().setY(0).normalize().length() < 0.1
        ? new THREE.Vector3(0, 0, 1)
        : new THREE.Vector3(0, 1, 0),
      state.selectedPart.mesh.position
    );
  }
  state.raycaster.setFromCamera(state.mouse, state.camera);
  const pt = new THREE.Vector3();
  state.raycaster.ray.intersectPlane(state.dragPlane, pt);
  state.dragOffset.copy(state.selectedPart.mesh.position).sub(pt);
  state.transformStartPos.copy(state.selectedPart.mesh.position);
}

export function startDrag(e, hit) {
  state.isDragging = true;
  state._verticalDrag = e.shiftKey;
  if (state.currentMode === 'move' || state._selectDragMode === 'move') {
    setupMoveDrag(e, e.shiftKey);
    // Compute offsets for all selected parts relative to anchor
    state._dragPartOffsets = [];
    if (state.selectedParts.length > 1) {
      const anchorPos = state.selectedPart.mesh.position;
      for (const p of state.selectedParts) {
        if (p === state.selectedPart) continue;
        state._dragPartOffsets.push({
          part: p,
          offset: p.mesh.position.clone().sub(anchorPos),
        });
      }
    }
  } else if (state.currentMode === 'rotate') {
    state.transformStartPos.set(
      state.selectedPart.mesh.rotation.x,
      state.selectedPart.mesh.rotation.y,
      state.selectedPart.mesh.rotation.z
    );
    state.orbitState.lastX = e.clientX;
  }
}

export function onDrag(e) {
  if (!state.selectedPart) return;
  updateMouse(e);
  if (state.currentMode === 'move' || state._selectDragMode === 'move') {
    state.raycaster.setFromCamera(state.mouse, state.camera);
    const pt = new THREE.Vector3();
    if (state.raycaster.ray.intersectPlane(state.dragPlane, pt)) {
      pt.add(state.dragOffset);
      // Shift+drag: lock to Y axis only
      if (state._verticalDrag) {
        pt.x = state.transformStartPos.x;
        pt.z = state.transformStartPos.z;
      }
      // Snap to grid
      pt.x = Math.round(pt.x / GRID_SNAP) * GRID_SNAP;
      pt.y = Math.max(0, Math.round(pt.y / GRID_SNAP) * GRID_SNAP);
      pt.z = Math.round(pt.z / GRID_SNAP) * GRID_SNAP;

      // Build exclude list for multi-part drag
      const otherParts = (state._dragPartOffsets || []).map(o => o.part);
      const allMoving = [state.selectedPart, ...otherParts];

      // Snap to adjacent parts (exclude parts being dragged together)
      if (state.partSnapEnabled) {
        snapToAdjacentParts(state.selectedPart, pt, otherParts);
      }

      // Save previous positions
      const prevPos = state.selectedPart.mesh.position.clone();
      const prevPositions = otherParts.map(p => ({ part: p, pos: p.mesh.position.clone() }));

      // Apply new positions
      state.selectedPart.mesh.position.copy(pt);
      for (const entry of (state._dragPartOffsets || [])) {
        entry.part.mesh.position.copy(pt).add(entry.offset);
      }

      // Check collision for ALL moved parts (excluding each other)
      let anyCollision = checkCollision(state.selectedPart, otherParts);
      if (!anyCollision) {
        for (const entry of (state._dragPartOffsets || [])) {
          if (checkCollision(entry.part, allMoving.filter(p => p !== entry.part))) {
            anyCollision = true;
            break;
          }
        }
      }

      if (anyCollision) {
        state.selectedPart.mesh.position.copy(prevPos);
        for (const prev of prevPositions) prev.part.mesh.position.copy(prev.pos);
      } else {
        syncPartFromMesh(state.selectedPart);
        for (const entry of (state._dragPartOffsets || [])) syncPartFromMesh(entry.part);
        updatePropertiesPanel();
      }
      showDimensions(state.selectedPart);
    }
  } else if (state._selectDragMode === 'faceRotate') {
    // Arc-based rotation: angle from object screen center
    const currentAngle = Math.atan2(
      e.clientY - state._faceRotateCenterY,
      e.clientX - state._faceRotateCenterX
    );
    const rawDelta = currentAngle - state._faceRotateStartAngle;
    // Snap to 15-degree increments
    const snapped = Math.round(rawDelta / THREE.MathUtils.degToRad(15)) * THREE.MathUtils.degToRad(15);
    const angleRad = snapped * state._faceRotateSign;
    const rotQuat = new THREE.Quaternion().setFromAxisAngle(state._faceRotateNormal, angleRad);

    // Save previous state of all parts
    const prevAnchorQuat = state.selectedPart.mesh.quaternion.clone();
    const prevAnchorPos = state.selectedPart.mesh.position.clone();
    const others = state._faceRotateParts || [];
    const prevOthers = others.map(o => ({
      entry: o,
      quat: o.part.mesh.quaternion.clone(),
      pos: o.part.mesh.position.clone(),
    }));

    // Rotate anchor
    state.selectedPart.mesh.quaternion.copy(rotQuat.clone().multiply(state._faceRotateStartRot));

    // Rotate other group members around the anchor pivot
    const pivot = prevAnchorPos;
    for (const o of others) {
      o.part.mesh.quaternion.copy(rotQuat.clone().multiply(o.startQuat));
      const rotatedOffset = o.offsetFromPivot.clone().applyQuaternion(rotQuat);
      o.part.mesh.position.copy(pivot).add(rotatedOffset);
    }

    // Collision check (exclude group members from each other)
    const allMoving = [state.selectedPart, ...others.map(o => o.part)];
    let anyCollision = checkCollision(state.selectedPart, others.map(o => o.part));
    if (!anyCollision) {
      for (const o of others) {
        if (checkCollision(o.part, allMoving.filter(p => p !== o.part))) {
          anyCollision = true;
          break;
        }
      }
    }

    if (anyCollision) {
      state.selectedPart.mesh.quaternion.copy(prevAnchorQuat);
      state.selectedPart.mesh.position.copy(prevAnchorPos);
      for (const prev of prevOthers) {
        prev.entry.part.mesh.quaternion.copy(prev.quat);
        prev.entry.part.mesh.position.copy(prev.pos);
      }
    } else {
      syncPartFromMesh(state.selectedPart);
      for (const o of others) syncPartFromMesh(o.part);
      updatePropertiesPanel();
    }
    showDimensions(state.selectedPart);
  } else if (state.currentMode === 'rotate') {
    const dx = e.clientX - state.orbitState.lastX;
    const angle = Math.round((dx * 0.5) / 15) * 15;
    const prevRotY = state.selectedPart.mesh.rotation.y;
    state.selectedPart.mesh.rotation.y = state.transformStartPos.y + THREE.MathUtils.degToRad(angle);
    if (checkCollision(state.selectedPart)) {
      state.selectedPart.mesh.rotation.y = prevRotY;
    } else {
      syncPartFromMesh(state.selectedPart);
      updatePropertiesPanel();
    }
    showDimensions(state.selectedPart);
  }
}

export function endDrag() {
  state.isDragging = false;
  state._selectDragMode = null;
  state._verticalDrag = false;
  state._dragPartOffsets = [];
  state._faceRotateParts = [];
}

export function deleteSelected() {
  const partsToDelete = state.selectedParts.length > 0
    ? [...state.selectedParts]
    : (state.selectedPart ? [state.selectedPart] : []);
  if (partsToDelete.length === 0) return;

  removeDimensions();
  for (const part of partsToDelete) {
    state.scene.remove(part.mesh);
    part.mesh.geometry.dispose();
    if (Array.isArray(part.mesh.material)) {
      part.mesh.material.forEach(m => m.dispose());
    } else {
      part.mesh.material.dispose();
    }
    removePartFromGroups(part.id);
  }
  const deleteSet = new Set(partsToDelete);
  state.parts = state.parts.filter(p => !deleteSet.has(p));
  state.selectedPart = null;
  state.selectedParts = [];
  updatePropertiesPanel();
  updatePartsList();
  updateGroupsList();
  updateStatusBar();
}

export function duplicateSelected() {
  if (!state.selectedPart) return;

  if (state.selectedParts.length > 1) {
    // Multi-part duplicate with relative positions
    const anchor = state.selectedPart;
    const newParts = [];
    for (const p of state.selectedParts) {
      const relX = p.x - anchor.x;
      const relY = p.y - anchor.y;
      const relZ = p.z - anchor.z;
      const offsetX = p === anchor ? 100 : 0;
      const offsetZ = p === anchor ? 100 : 0;
      const newPart = createPart(p.lumberId, {
        length: p.length, color: p.color,
        x: p.x + offsetX + 100, y: p.y, z: p.z + offsetZ + 100,
        rx: p.rx, ry: p.ry, rz: p.rz,
      });
      if (newPart) newParts.push(newPart);
    }
    if (newParts.length > 0) {
      // Adjust positions relative to the first duplicated part
      const firstNew = newParts[0];
      for (let i = 1; i < newParts.length; i++) {
        const origRel = state.selectedParts[i];
        const relX = origRel.x - anchor.x;
        const relY = origRel.y - anchor.y;
        const relZ = origRel.z - anchor.z;
        newParts[i].mesh.position.set(firstNew.x + relX, firstNew.y + relY, firstNew.z + relZ);
        syncPartFromMesh(newParts[i]);
      }
      selectPart(newParts[0]);
      for (let i = 1; i < newParts.length; i++) {
        state.selectedParts.push(newParts[i]);
        highlightPart(newParts[i]);
      }
      updatePartsList();
      // Auto-create group from duplicated parts
      if (newParts.length > 1) createGroupFromSelection();
    }
  } else {
    const p = state.selectedPart;
    let newX = p.x + 100, newY = p.y, newZ = p.z + 100;
    if (state.partSnapEnabled) {
      const dir = new THREE.Vector3(1, 0, 0).applyQuaternion(p.mesh.quaternion);
      newX = p.x + dir.x * p.length;
      newY = p.y + dir.y * p.length;
      newZ = p.z + dir.z * p.length;
    }
    const newPart = createPart(p.lumberId, {
      length: p.length, color: p.color,
      x: newX, y: newY, z: newZ,
      rx: p.rx, ry: p.ry, rz: p.rz,
    });
    if (newPart) selectPart(newPart);
  }
}

let clipboard = null;

export function copySelected() {
  if (state.selectedParts.length > 1) {
    const anchor = state.selectedPart;
    clipboard = {
      isGroup: true,
      parts: state.selectedParts.map(p => ({
        lumberId: p.lumberId, length: p.length, color: p.color,
        rx: p.rx, ry: p.ry, rz: p.rz,
        relX: p.x - anchor.x, relY: p.y - anchor.y, relZ: p.z - anchor.z,
      })),
    };
  } else if (state.selectedPart) {
    const p = state.selectedPart;
    clipboard = { isGroup: false, lumberId: p.lumberId, length: p.length, color: p.color, rx: p.rx, ry: p.ry, rz: p.rz };
  }
}

export function pasteSelected() {
  if (!clipboard) return;
  if (clipboard.isGroup) {
    const newParts = [];
    for (const entry of clipboard.parts) {
      const newPart = createPart(entry.lumberId, {
        length: entry.length, color: entry.color,
        rx: entry.rx, ry: entry.ry, rz: entry.rz,
      });
      if (newPart) newParts.push({ part: newPart, relX: entry.relX, relY: entry.relY, relZ: entry.relZ });
    }
    // Apply relative offsets from the first created part
    if (newParts.length > 1) {
      const base = newParts[0].part;
      for (let i = 1; i < newParts.length; i++) {
        const { part, relX, relY, relZ } = newParts[i];
        part.mesh.position.set(base.x + relX, base.y + relY, base.z + relZ);
        syncPartFromMesh(part);
      }
    }
    // Select all pasted parts
    if (newParts.length > 0) {
      selectPart(newParts[0].part);
      for (let i = 1; i < newParts.length; i++) {
        state.selectedParts.push(newParts[i].part);
        highlightPart(newParts[i].part);
      }
      updatePartsList();
      if (newParts.length > 1) createGroupFromSelection();
    }
  } else {
    const newPart = createPart(clipboard.lumberId, {
      length: clipboard.length, color: clipboard.color,
      rx: clipboard.rx, ry: clipboard.ry, rz: clipboard.rz,
    });
    if (newPart) selectPart(newPart);
  }
}

// Register callbacks with scene.js to avoid circular dependency
export function initInteraction() {
  setSceneCallbacks({
    selectPart,
    togglePartSelection,
    startDragCb: startDrag,
    onDrag,
    endDrag,
    updateMouseCb: updateMouse,
  });

  // Expose to window for onclick handlers in HTML
  window.deleteSelected = deleteSelected;
  window.duplicateSelected = duplicateSelected;
}
