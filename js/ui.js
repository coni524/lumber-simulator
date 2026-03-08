import * as THREE from 'three';
import { state, keysPressed } from './state.js';
import { LUMBER_CATALOG } from './lumber.js';
import {
  createPart, selectPart, rebuildMesh, checkCollision,
  updatePropertiesPanel, updatePartsList, updateStatusBar,
  createGroupFromSelection, ungroupSelected
} from './parts.js';
import { showDimensions, showOverallDimensions, removeDimensions } from './dimensions.js';
import { deleteSelected, duplicateSelected, copySelected, pasteSelected } from './interaction.js';

export function buildCatalog() {
  const list = document.getElementById('catalog-list');
  for (const cat of LUMBER_CATALOG) {
    const sec = document.createElement('div');
    sec.className = 'catalog-section';
    sec.textContent = cat.category;
    list.appendChild(sec);
    for (const item of cat.items) {
      const el = document.createElement('div');
      el.className = 'catalog-item';
      el.innerHTML = `<div class="name">${item.name}</div><div class="dims">${item.width}×${item.height}mm / L=${item.defaultLength}mm</div>`;
      el.addEventListener('click', () => {
        const part = createPart(item.id);
        if (part) selectPart(part);
      });
      list.appendChild(el);
    }
  }
}

export function buildTypeSelect() {
  const sel = document.getElementById('prop-type');
  sel.innerHTML = '';
  for (const cat of LUMBER_CATALOG) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = cat.category;
    for (const item of cat.items) {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = `${item.name} (${item.width}×${item.height}mm)`;
      optgroup.appendChild(opt);
    }
    sel.appendChild(optgroup);
  }
}

export function bindPropertyInputs() {
  const fields = ['prop-name','prop-type','prop-length','prop-px','prop-py','prop-pz','prop-rx','prop-ry','prop-rz','prop-color'];
  for (const id of fields) {
    document.getElementById(id).addEventListener('change', () => {
      if (!state.selectedPart) return;

      // Save previous state for collision rollback
      const prev = {
        name: state.selectedPart.name,
        lumberId: state.selectedPart.lumberId,
        length: state.selectedPart.length,
        x: state.selectedPart.x, y: state.selectedPart.y, z: state.selectedPart.z,
        rx: state.selectedPart.rx, ry: state.selectedPart.ry, rz: state.selectedPart.rz,
        color: state.selectedPart.color,
      };

      state.selectedPart.name = document.getElementById('prop-name').value;
      const newType = document.getElementById('prop-type').value;
      state.selectedPart.lumberId = newType;
      state.selectedPart.length = parseInt(document.getElementById('prop-length').value) || 100;
      state.selectedPart.x = parseInt(document.getElementById('prop-px').value) || 0;
      state.selectedPart.y = parseInt(document.getElementById('prop-py').value) || 0;
      state.selectedPart.z = parseInt(document.getElementById('prop-pz').value) || 0;
      state.selectedPart.rx = parseInt(document.getElementById('prop-rx').value) || 0;
      state.selectedPart.ry = parseInt(document.getElementById('prop-ry').value) || 0;
      state.selectedPart.rz = parseInt(document.getElementById('prop-rz').value) || 0;
      state.selectedPart.color = document.getElementById('prop-color').value;

      rebuildMesh(state.selectedPart);

      // Check collision and revert if overlapping
      if (checkCollision(state.selectedPart)) {
        state.selectedPart.name = prev.name;
        state.selectedPart.lumberId = prev.lumberId;
        state.selectedPart.length = prev.length;
        state.selectedPart.x = prev.x; state.selectedPart.y = prev.y; state.selectedPart.z = prev.z;
        state.selectedPart.rx = prev.rx; state.selectedPart.ry = prev.ry; state.selectedPart.rz = prev.rz;
        state.selectedPart.color = prev.color;
        rebuildMesh(state.selectedPart);
        updatePropertiesPanel();
      }

      showDimensions(state.selectedPart);
      updatePartsList();
    });
  }
}

export function initToolbar() {
  // Toolbar mode buttons
  document.querySelectorAll('.tb-btn[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentMode = btn.dataset.mode;
      document.querySelectorAll('.tb-btn[data-mode]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('sb-mode').textContent = `モード: ${
        state.currentMode === 'select' ? '選択' : state.currentMode === 'move' ? '移動' : '回転'
      }`;
    });
  });

  // Snap toggle
  document.getElementById('snap-toggle').addEventListener('click', function() {
    state.partSnapEnabled = !state.partSnapEnabled;
    this.classList.toggle('active', state.partSnapEnabled);
  });

  // Overall dimensions toggle
  document.getElementById('dims-toggle').addEventListener('click', function() {
    state.showOverallDimensions = !state.showOverallDimensions;
    this.classList.toggle('active', state.showOverallDimensions);
    if (!state.selectedPart) {
      if (state.showOverallDimensions) {
        showOverallDimensions();
      } else {
        removeDimensions();
      }
    }
  });
}

export function initKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    keysPressed[e.key.toLowerCase()] = true;
    if (e.key === ' ') e.preventDefault();
    // Group shortcuts (must be before bare g/G check)
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'g' || e.key === 'G')) { e.preventDefault(); createGroupFromSelection(); return; }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'g' || e.key === 'G')) { e.preventDefault(); ungroupSelected(); return; }
    if (!e.ctrlKey && !e.metaKey && (e.key === 'v' || e.key === 'V')) { document.querySelector('[data-mode="select"]').click(); }
    if (!e.ctrlKey && !e.metaKey && (e.key === 'g' || e.key === 'G')) { document.querySelector('[data-mode="move"]').click(); }
    if (!e.ctrlKey && !e.metaKey && (e.key === 'r' || e.key === 'R')) { document.querySelector('[data-mode="rotate"]').click(); }
    if (e.key === 'Delete' || e.key === 'Backspace') { deleteSelected(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) { e.preventDefault(); duplicateSelected(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) { e.preventDefault(); copySelected(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) { e.preventDefault(); pasteSelected(); }
  });
  document.addEventListener('keyup', (e) => {
    keysPressed[e.key.toLowerCase()] = false;
  });
  // Clear keys on window blur to prevent stuck keys
  window.addEventListener('blur', () => {
    for (const key in keysPressed) keysPressed[key] = false;
  });
}

export function bindGroupButtons() {
  document.getElementById('btn-group').addEventListener('click', () => createGroupFromSelection());
  document.getElementById('btn-ungroup').addEventListener('click', () => ungroupSelected());
}
