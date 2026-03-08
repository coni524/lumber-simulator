import { state } from './state.js';
import { createPart, updatePropertiesPanel, updatePartsList, updateStatusBar, updateGroupsList } from './parts.js';
import { removeDimensions } from './dimensions.js';
import { updateCameraFromOrbit } from './scene.js';

function exportProject() {
  return JSON.stringify({
    version: 2,
    name: 'Lumber Project',
    created: new Date().toISOString(),
    parts: state.parts.map(p => ({
      id: p.id,
      name: p.name,
      lumberId: p.lumberId,
      length: p.length,
      color: p.color,
      position: { x: p.x, y: p.y, z: p.z },
      rotation: { x: p.rx, y: p.ry, z: p.rz },
    })),
    groups: state.groups.map(g => ({
      id: g.id,
      name: g.name,
      partIds: [...g.partIds],
    })),
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
    if (Array.isArray(p.mesh.material)) {
      p.mesh.material.forEach(m => m.dispose());
    } else {
      p.mesh.material.dispose();
    }
  }
  state.parts = [];
  state.selectedPart = null;
  state.selectedParts = [];
  state.partCounter = 0;
  state.groups = [];
  state.groupCounter = 0;

  const idMap = {};
  if (data.parts) {
    for (const pd of data.parts) {
      const part = createPart(pd.lumberId, {
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
      if (part && pd.id !== undefined) {
        idMap[pd.id] = part.id;
      }
    }
  }

  // Restore groups with remapped IDs
  if (data.groups) {
    for (const gd of data.groups) {
      state.groupCounter++;
      const remappedIds = gd.partIds
        .map(oldId => idMap[oldId])
        .filter(id => id !== undefined);
      if (remappedIds.length > 0) {
        state.groups.push({
          id: state.groupCounter,
          name: gd.name || `グループ #${state.groupCounter}`,
          partIds: remappedIds,
        });
      }
    }
  }

  updatePropertiesPanel();
  updatePartsList();
  updateGroupsList();
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
