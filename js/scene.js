import * as THREE from 'three';
import { state } from './state.js';
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
    // Raycast for selection on left click
    if (e.button === 0 && state.currentMode === 'select') {
      updateMouse(e);
      state.raycaster.setFromCamera(state.mouse, state.camera);
      const meshes = state.parts.map(p => p.mesh);
      const hits = state.raycaster.intersectObjects(meshes);
      if (hits.length > 0) {
        const part = state.parts.find(p => p.mesh === hits[0].object);
        if (part) { selectPartFn(part); }
        return;
      } else {
        selectPartFn(null);
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

// These will be set by interaction.js to avoid circular dependencies
let selectPartFn = () => {};
let startDrag = () => {};
let onDragFn = () => {};
let endDragFn = () => {};
let updateMouse = () => {};

export function setSceneCallbacks({ selectPart, startDragCb, onDrag, endDrag, updateMouseCb }) {
  selectPartFn = selectPart;
  startDrag = startDragCb;
  onDragFn = onDrag;
  endDragFn = endDrag;
  updateMouse = updateMouseCb;
}
