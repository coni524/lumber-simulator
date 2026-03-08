import { state } from './state.js';
import { initThree, initOrbitControls } from './scene.js';
import { buildCatalog, buildTypeSelect, bindPropertyInputs, initToolbar, initKeyboard } from './ui.js';
import { initInteraction } from './interaction.js';
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
initIO();

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  state.renderer.render(state.scene, state.camera);
}
animate();
