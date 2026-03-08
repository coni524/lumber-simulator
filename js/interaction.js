import * as THREE from 'three';
import { state, GRID_SNAP } from './state.js';
import {
  selectPart, createPart, checkCollision, syncPartFromMesh,
  updatePropertiesPanel, updatePartsList, updateStatusBar, snapToAdjacentParts
} from './parts.js';
import { showDimensions, removeDimensions } from './dimensions.js';
import { setSceneCallbacks } from './scene.js';

export function updateMouse(e) {
  const rect = state.renderer.domElement.getBoundingClientRect();
  state.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  state.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
}

export function startDrag(e, hit) {
  state.isDragging = true;
  if (state.currentMode === 'move') {
    // Drag on Y plane through the object
    state.dragPlane.setFromNormalAndCoplanarPoint(
      state.camera.getWorldDirection(new THREE.Vector3()).clone().setY(0).normalize().length() < 0.1
        ? new THREE.Vector3(0, 0, 1)
        : new THREE.Vector3(0, 1, 0),
      state.selectedPart.mesh.position
    );
    state.raycaster.setFromCamera(state.mouse, state.camera);
    const pt = new THREE.Vector3();
    state.raycaster.ray.intersectPlane(state.dragPlane, pt);
    state.dragOffset.copy(state.selectedPart.mesh.position).sub(pt);
    state.transformStartPos.copy(state.selectedPart.mesh.position);
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
  if (state.currentMode === 'move') {
    state.raycaster.setFromCamera(state.mouse, state.camera);
    const pt = new THREE.Vector3();
    if (state.raycaster.ray.intersectPlane(state.dragPlane, pt)) {
      pt.add(state.dragOffset);
      // Snap to grid
      pt.x = Math.round(pt.x / GRID_SNAP) * GRID_SNAP;
      pt.y = Math.max(0, Math.round(pt.y / GRID_SNAP) * GRID_SNAP);
      pt.z = Math.round(pt.z / GRID_SNAP) * GRID_SNAP;
      // Snap to adjacent parts
      if (state.partSnapEnabled) {
        snapToAdjacentParts(state.selectedPart, pt);
      }
      // Save previous position and try new one
      const prevPos = state.selectedPart.mesh.position.clone();
      state.selectedPart.mesh.position.copy(pt);
      if (checkCollision(state.selectedPart)) {
        state.selectedPart.mesh.position.copy(prevPos);
      } else {
        syncPartFromMesh(state.selectedPart);
        updatePropertiesPanel();
      }
      showDimensions(state.selectedPart);
    }
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
}

export function deleteSelected() {
  if (!state.selectedPart) return;
  removeDimensions();
  state.scene.remove(state.selectedPart.mesh);
  state.selectedPart.mesh.geometry.dispose();
  state.selectedPart.mesh.material.dispose();
  state.parts = state.parts.filter(p => p !== state.selectedPart);
  state.selectedPart = null;
  updatePropertiesPanel();
  updatePartsList();
  updateStatusBar();
}

export function duplicateSelected() {
  if (!state.selectedPart) return;
  const p = state.selectedPart;
  let newX = p.x + 100, newY = p.y, newZ = p.z + 100;
  if (state.partSnapEnabled) {
    const dir = new THREE.Vector3(1, 0, 0).applyQuaternion(p.mesh.quaternion);
    newX = p.x + dir.x * p.length;
    newY = p.y + dir.y * p.length;
    newZ = p.z + dir.z * p.length;
  }
  const newPart = createPart(p.lumberId, {
    length: p.length,
    color: p.color,
    x: newX,
    y: newY,
    z: newZ,
    rx: p.rx, ry: p.ry, rz: p.rz,
  });
  if (newPart) selectPart(newPart);
}

// Register callbacks with scene.js to avoid circular dependency
export function initInteraction() {
  setSceneCallbacks({
    selectPart,
    startDragCb: startDrag,
    onDrag,
    endDrag,
    updateMouseCb: updateMouse,
  });

  // Expose to window for onclick handlers in HTML
  window.deleteSelected = deleteSelected;
  window.duplicateSelected = duplicateSelected;
}
