import { state } from './state.js';
import { createPart, updatePropertiesPanel, updatePartsList, updateStatusBar } from './parts.js';
import { removeDimensions } from './dimensions.js';
import { updateCameraFromOrbit } from './scene.js';

function exportProject() {
  return JSON.stringify({
    version: 1,
    name: 'Lumber Project',
    created: new Date().toISOString(),
    parts: state.parts.map(p => ({
      name: p.name,
      lumberId: p.lumberId,
      length: p.length,
      color: p.color,
      position: { x: p.x, y: p.y, z: p.z },
      rotation: { x: p.rx, y: p.ry, z: p.rz },
    }))
  }, null, 2);
}

function importProject(json) {
  let data;
  try { data = JSON.parse(json); } catch(e) { alert('無効なJSONです'); return; }
  // Clear existing
  removeDimensions();
  for (const p of state.parts) {
    state.scene.remove(p.mesh);
    p.mesh.geometry.dispose();
    p.mesh.material.dispose();
  }
  state.parts = [];
  state.selectedPart = null;
  state.partCounter = 0;

  if (data.parts) {
    for (const pd of data.parts) {
      createPart(pd.lumberId, {
        name: pd.name,
        length: pd.length,
        color: pd.color,
        x: pd.position?.x || 0,
        y: pd.position?.y || 0,
        z: pd.position?.z || 0,
        rx: pd.rotation?.x || 0,
        ry: pd.rotation?.y || 0,
        rz: pd.rotation?.z || 0,
      });
    }
  }
  updatePropertiesPanel();
  updatePartsList();
  updateStatusBar();
}

export function initIO() {
  window.showExport = function() {
    document.getElementById('modal-title').textContent = 'エクスポート (JSON)';
    document.getElementById('modal-text').value = exportProject();
    document.getElementById('modal-text').readOnly = true;
    document.getElementById('modal-import-btn').style.display = 'none';
    document.getElementById('modal-overlay').style.display = 'flex';
  };

  window.showImport = function() {
    document.getElementById('modal-title').textContent = 'インポート (JSON)';
    document.getElementById('modal-text').value = '';
    document.getElementById('modal-text').readOnly = false;
    document.getElementById('modal-import-btn').style.display = 'inline-block';
    document.getElementById('modal-overlay').style.display = 'flex';
  };

  window.closeModal = function() {
    document.getElementById('modal-overlay').style.display = 'none';
  };

  window.copyModalText = function() {
    const ta = document.getElementById('modal-text');
    ta.select();
    navigator.clipboard.writeText(ta.value).then(() => {
      const btn = document.querySelector('.modal-btns .btn');
      btn.textContent = 'コピー完了!';
      setTimeout(() => btn.textContent = 'コピー', 1000);
    });
  };

  window.doImport = function() {
    const json = document.getElementById('modal-text').value;
    if (json.trim()) {
      importProject(json);
      window.closeModal();
    }
  };

  window.resetCamera = function() {
    state.orbitState.theta = 0.8;
    state.orbitState.phi = 0.9;
    state.orbitState.distance = 2800;
    state.orbitState.target.set(0, 300, 0);
    updateCameraFromOrbit();
  };
}
