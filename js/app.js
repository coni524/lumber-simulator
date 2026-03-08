import { state } from './state.js';
import { initThree, initOrbitControls, updateCameraMovement } from './scene.js';
import { buildCatalog, buildTypeSelect, bindPropertyInputs, initToolbar, initKeyboard, bindGroupButtons } from './ui.js';
import { initInteraction } from './interaction.js';
import { updateGroundFaces } from './parts.js';
import { initIO } from './io.js';

// Initialize
initThree();
initInteraction(); // Must be before initOrbitControls to register callbacks
initOrbitControls();
buildCatalog();
buildTypeSelect();
bindPropertyInputs();
initToolbar();
initKeyboard();
bindGroupButtons();
initIO();

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  updateCameraMovement();
  updateGroundFaces();
  state.renderer.render(state.scene, state.camera);
}
animate();
