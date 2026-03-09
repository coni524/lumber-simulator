import * as THREE from 'three';
import { state, keysPressed } from './state.js';
import { createFloorTexture } from './textures.js';

export function initThree() {
  const canvas = document.getElementById('three-canvas');
  state.scene = new THREE.Scene();
  state.scene.background = new THREE.Color(0xf0f0f0);

  // Camera
  state.camera = new THREE.PerspectiveCamera(50, 1, 1, 50000);
  state.camera.position.set(1500, 1200, 2000);
  state.camera.lookAt(0, 300, 0);

  // Renderer
  state.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  state.renderer.setPixelRatio(window.devicePixelRatio);
  state.renderer.shadowMap.enabled = true;
  state.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Lights - brighter, more natural
  const ambient = new THREE.AmbientLight(0xffffff, 0.65);
  state.scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
  dirLight.position.set(2000, 3000, 1500);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  dirLight.shadow.camera.left = -3000;
  dirLight.shadow.camera.right = 3000;
  dirLight.shadow.camera.top = 3000;
  dirLight.shadow.camera.bottom = -3000;
  dirLight.shadow.bias = -0.001;
  dirLight.shadow.radius = 4;
  state.scene.add(dirLight);

  const hemiLight = new THREE.HemisphereLight(0xb1e1ff, 0xb97a20, 0.4);
  state.scene.add(hemiLight);

  // Visible floor with diamond grid texture, receives shadows
  const floorTex = createFloorTexture();
  const floorGeo = new THREE.PlaneGeometry(8000, 8000);
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    roughness: 0.9,
    metalness: 0.0,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.5;
  floor.receiveShadow = true;
  floor.name = 'floor';
  state.scene.add(floor);

  // Grid overlay on floor (light gray lines)
  const gridHelper = new THREE.GridHelper(4000, 40, 0xbbbbbb, 0xcccccc);
  gridHelper.position.y = 0.5;
  state.scene.add(gridHelper);

  // Axes helper
  const axesHelper = new THREE.AxesHelper(300);
  state.scene.add(axesHelper);

  resize();
  window.addEventListener('resize', resize);
}

function resize() {
  const vp = document.getElementById('viewport');
  const w = vp.clientWidth;
  const h = vp.clientHeight;
  state.camera.aspect = w / h;
  state.camera.updateProjectionMatrix();
  state.renderer.setSize(w, h);
}

export function initOrbitControls() {
  const canvas = state.renderer.domElement;

  canvas.addEventListener('mousedown', (e) => {
    if (state.currentMode !== 'select' && state.selectedPart) {
      // Check if clicking on a part for transform
      updateMouse(e);
      state.raycaster.setFromCamera(state.mouse, state.camera);
      const meshes = state.parts.map(p => p.mesh);
      const hits = state.raycaster.intersectObjects(meshes);
      if (hits.length > 0 && hits[0].object === state.selectedPart.mesh) {
        startDrag(e, hits[0]);
        return;
      }
    }
    // Raycast for selection on left click (+ drag to move)
    if (e.button === 0 && state.currentMode === 'select') {
      updateMouse(e);
      state.raycaster.setFromCamera(state.mouse, state.camera);
      const meshes = state.parts.map(p => p.mesh);
      const hits = state.raycaster.intersectObjects(meshes);
      if (hits.length > 0) {
        const part = state.parts.find(p => p.mesh === hits[0].object);
        if (part) {
          if (e.metaKey || e.ctrlKey) {
            // Cmd+click (Mac) / Ctrl+click: start length stretch
            selectPartFn(part);
            startStretchFn(e, part, hits[0]);
            return;
          }
          if (e.shiftKey) {
            // Shift+click on part: defer multi-select vs pan
            state._pendingMultiSelect = { part, hit: hits[0], startX: e.clientX, startY: e.clientY };
          } else {
            selectPartFn(part);
            state._selectDragMode = 'move';
            startDrag(e, hits[0]);
          }
        }
        return;
      } else {
        if (!e.shiftKey) selectPartFn(null);
      }
    }

    // Right-click on a part: face-axis rotation (group-aware)
    if (e.button === 2) {
      updateMouse(e);
      state.raycaster.setFromCamera(state.mouse, state.camera);
      const meshes = state.parts.map(p => p.mesh);
      const hits = state.raycaster.intersectObjects(meshes);
      if (hits.length > 0) {
        const part = state.parts.find(p => p.mesh === hits[0].object);
        if (part) {
          selectPartFn(part);
          state._selectDragMode = 'faceRotate';
          // Map face normal to rotation axis:
          //   end face (X normal) → Z rotation
          //   top/bottom face (Y normal) → X rotation
          //   side face (Z normal) → Y rotation
          const localNormal = hits[0].face.normal;
          const localRotAxis = new THREE.Vector3(localNormal.y, localNormal.z, localNormal.x);
          state._faceRotateNormal = localRotAxis.clone()
            .applyQuaternion(hits[0].object.quaternion).normalize();
          state._faceRotateStartRot = part.mesh.quaternion.clone();

          // Compute screen-space center of the object for arc-based rotation
          const rect = canvas.getBoundingClientRect();
          const center3D = part.mesh.position.clone().project(state.camera);
          state._faceRotateCenterX = (center3D.x * 0.5 + 0.5) * rect.width + rect.left;
          state._faceRotateCenterY = (-center3D.y * 0.5 + 0.5) * rect.height + rect.top;
          // Initial angle from object center to click point
          state._faceRotateStartAngle = Math.atan2(
            e.clientY - state._faceRotateCenterY,
            e.clientX - state._faceRotateCenterX
          );

          // Check if face normal points towards or away from camera to set rotation sign
          const camDir = state.camera.getWorldDirection(new THREE.Vector3());
          state._faceRotateSign = (state._faceRotateNormal.dot(camDir) > 0) ? 1 : -1;
          // Invert for X rotation (top/bottom face drag)
          if (Math.abs(localNormal.y) > 0.5) state._faceRotateSign *= -1;

          // Save start state for all selected parts (group rotation)
          const pivot = part.mesh.position.clone();
          state._faceRotateParts = state.selectedParts
            .filter(p => p !== part)
            .map(p => ({
              part: p,
              startQuat: p.mesh.quaternion.clone(),
              offsetFromPivot: p.mesh.position.clone().sub(pivot),
            }));
          state.isDragging = true;
        }
        return;
      }
    }

    if (e.button === 0 || e.button === 1) {
      if (e.button === 1 || e.shiftKey) { state.orbitState.panning = true; }
      else { state.orbitState.rotating = true; }
      state.orbitState.lastX = e.clientX;
      state.orbitState.lastY = e.clientY;
    } else if (e.button === 2) {
      state.orbitState.panning = true;
      state.orbitState.lastX = e.clientX;
      state.orbitState.lastY = e.clientY;
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (state._pendingMultiSelect) {
      const dx = e.clientX - state._pendingMultiSelect.startX;
      const dy = e.clientY - state._pendingMultiSelect.startY;
      if (Math.sqrt(dx * dx + dy * dy) > 5) {
        // Moved too far — cancel multi-select, start drag move
        const pending = state._pendingMultiSelect;
        state._pendingMultiSelect = null;
        // If part is already selected, start group drag; otherwise select first
        if (!state.selectedParts.includes(pending.part)) {
          selectPartFn(pending.part);
        } else {
          state.selectedPart = pending.part;
        }
        state._selectDragMode = 'move';
        startDrag(e, pending.hit);
      }
      return;
    }
    if (state.isDragging) { onDragFn(e); return; }
    const dx = e.clientX - state.orbitState.lastX;
    const dy = e.clientY - state.orbitState.lastY;
    if (state.orbitState.rotating) {
      state.orbitState.theta -= dx * 0.005;
      state.orbitState.phi = Math.max(0.1, Math.min(Math.PI - 0.1, state.orbitState.phi - dy * 0.005));
      updateCameraFromOrbit();
    } else if (state.orbitState.panning) {
      const right = new THREE.Vector3();
      const up = new THREE.Vector3();
      state.camera.getWorldDirection(up);
      right.crossVectors(up, state.camera.up).normalize();
      up.copy(state.camera.up).normalize();
      const panSpeed = state.orbitState.distance * 0.001;
      state.orbitState.target.add(right.multiplyScalar(-dx * panSpeed));
      state.orbitState.target.add(up.multiplyScalar(dy * panSpeed));
      updateCameraFromOrbit();
    }
    state.orbitState.lastX = e.clientX;
    state.orbitState.lastY = e.clientY;
  });

  canvas.addEventListener('mouseup', () => {
    if (state._pendingMultiSelect) {
      togglePartSelectionFn(state._pendingMultiSelect.part);
      state._pendingMultiSelect = null;
      return;
    }
    state.orbitState.rotating = false;
    state.orbitState.panning = false;
    if (state.isDragging) endDragFn();
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    state.orbitState.distance *= 1 + e.deltaY * 0.001;
    state.orbitState.distance = Math.max(200, Math.min(15000, state.orbitState.distance));
    updateCameraFromOrbit();
  }, { passive: false });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // Initial camera from orbit state
  state.orbitState.theta = Math.atan2(
    state.camera.position.x - state.orbitState.target.x,
    state.camera.position.z - state.orbitState.target.z
  );
  state.orbitState.phi = Math.acos(Math.max(-1, Math.min(1,
    (state.camera.position.y - state.orbitState.target.y) / state.orbitState.distance
  )));
  updateCameraFromOrbit();
}

export function updateCameraFromOrbit() {
  const x = state.orbitState.target.x + state.orbitState.distance * Math.sin(state.orbitState.phi) * Math.sin(state.orbitState.theta);
  const y = state.orbitState.target.y + state.orbitState.distance * Math.cos(state.orbitState.phi);
  const z = state.orbitState.target.z + state.orbitState.distance * Math.sin(state.orbitState.phi) * Math.cos(state.orbitState.theta);
  state.camera.position.set(x, y, z);
  state.camera.lookAt(state.orbitState.target);
}

const MOVE_SPEED = 15;

export function updateCameraMovement() {
  let moved = false;
  // Forward direction projected onto XZ plane
  const forward = new THREE.Vector3(
    Math.sin(state.orbitState.theta),
    0,
    Math.cos(state.orbitState.theta)
  ).normalize();
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

  if (keysPressed['w']) { state.orbitState.target.add(forward.clone().multiplyScalar(-MOVE_SPEED)); moved = true; }
  if (keysPressed['s']) { state.orbitState.target.add(forward.clone().multiplyScalar(MOVE_SPEED)); moved = true; }
  if (keysPressed['a']) { state.orbitState.target.add(right.clone().multiplyScalar(MOVE_SPEED)); moved = true; }
  if (keysPressed['d']) { state.orbitState.target.add(right.clone().multiplyScalar(-MOVE_SPEED)); moved = true; }
  if (keysPressed[' '] && !keysPressed['shift']) { state.orbitState.target.y += MOVE_SPEED; moved = true; }
  if (keysPressed[' '] && keysPressed['shift']) { state.orbitState.target.y = Math.max(0, state.orbitState.target.y - MOVE_SPEED); moved = true; }

  if (moved) updateCameraFromOrbit();
}

// These will be set by interaction.js to avoid circular dependencies
let selectPartFn = () => {};
let togglePartSelectionFn = () => {};
let startDrag = () => {};
let onDragFn = () => {};
let endDragFn = () => {};
let updateMouse = () => {};
let startStretchFn = () => {};

export function setSceneCallbacks({ selectPart, togglePartSelection, startDragCb, onDrag, endDrag, updateMouseCb, startStretchCb }) {
  selectPartFn = selectPart;
  togglePartSelectionFn = togglePartSelection;
  startDrag = startDragCb;
  onDragFn = onDrag;
  endDragFn = endDrag;
  updateMouse = updateMouseCb;
  if (startStretchCb) startStretchFn = startStretchCb;
}
