import * as THREE from 'three';

export function createWoodTexture(baseColor, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width || 512;
  canvas.height = height || 256;
  const ctx = canvas.getContext('2d');

  // Parse base color
  const c = new THREE.Color(baseColor);
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);

  // Fill base
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw wood grain lines along X (length direction)
  for (let i = 0; i < 60; i++) {
    const y = Math.random() * canvas.height;
    const variation = (Math.random() - 0.5) * 30;
    const lineR = Math.max(0, Math.min(255, r + variation - 20));
    const lineG = Math.max(0, Math.min(255, g + variation - 15));
    const lineB = Math.max(0, Math.min(255, b + variation - 10));
    ctx.strokeStyle = `rgba(${lineR},${lineG},${lineB},${0.3 + Math.random() * 0.4})`;
    ctx.lineWidth = 0.5 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    // Slightly wavy lines
    for (let x = 0; x < canvas.width; x += 20) {
      const wobble = Math.sin(x * 0.02 + i) * (2 + Math.random() * 3);
      ctx.lineTo(x, y + wobble);
    }
    ctx.stroke();
  }

  // Draw annual ring patterns (darker streaks)
  for (let i = 0; i < 8; i++) {
    const y = (canvas.height / 8) * i + Math.random() * 20;
    ctx.strokeStyle = `rgba(${Math.max(0,r-40)},${Math.max(0,g-35)},${Math.max(0,b-25)},0.25)`;
    ctx.lineWidth = 2 + Math.random() * 4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x < canvas.width; x += 10) {
      ctx.lineTo(x, y + Math.sin(x * 0.01 + i * 0.5) * 5);
    }
    ctx.stroke();
  }

  // Add subtle noise for texture
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let j = 0; j < imgData.data.length; j += 4) {
    const noise = (Math.random() - 0.5) * 12;
    imgData.data[j] = Math.max(0, Math.min(255, imgData.data[j] + noise));
    imgData.data[j+1] = Math.max(0, Math.min(255, imgData.data[j+1] + noise));
    imgData.data[j+2] = Math.max(0, Math.min(255, imgData.data[j+2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createFloorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Light gray base
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(0, 0, 512, 512);

  // Diamond grid pattern
  ctx.strokeStyle = '#d0d0d0';
  ctx.lineWidth = 1;
  const spacing = 32;
  for (let i = -512; i < 1024; i += spacing) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 512, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i + 512, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  return tex;
}
