import * as THREE from 'three';

export const state = {
  scene: null,
  camera: null,
  renderer: null,
  parts: [],
  selectedPart: null,
  partCounter: 0,
  currentMode: 'select',
  isDragging: false,
  dragPlane: new THREE.Plane(),
  dragOffset: new THREE.Vector3(),
  mouse: new THREE.Vector2(),
  raycaster: new THREE.Raycaster(),
  transformStartPos: new THREE.Vector3(),
  partSnapEnabled: true,
  dimensionGroup: null,
  orbitState: {
    rotating: false,
    panning: false,
    lastX: 0,
    lastY: 0,
    theta: 0.8,
    phi: 0.9,
    distance: 2800,
    target: new THREE.Vector3(0, 300, 0),
  },
};

export const GRID_SNAP = 10;
export const SNAP_THRESHOLD = 50;
export const COLLISION_MARGIN = 2;
