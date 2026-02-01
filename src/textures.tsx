import { CanvasTexture, NearestFilter } from 'three';

export function createNumberAtlas(): CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // 3x3 Grid (Indices 0-8)
  // 0 is empty (or maybe mine?), 1-8 are numbers.
  const step = size / 3; 

  const colors = [
    '', // 0 (unused)
    '#0000FF', // 1: Blue
    '#008000', // 2: Green
    '#FF0000', // 3: Red
    '#000080', // 4: Dark Blue
    '#800000', // 5: Maroon
    '#008080', // 6: Cyan
    '#000000', // 7: Black
    '#808080', // 8: Gray
  ];

  ctx.fillStyle = '#C0C0C0'; // Minesweeper gray background (stone color)
  ctx.fillRect(0, 0, size, size);

  ctx.font = 'bold 100px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 1; i <= 8; i++) {
    const col = (i - 1) % 3;
    const row = Math.floor((i - 1) / 3);
    
    const x = col * step;
    const y = row * step;

    // Draw border for debugging or style
    ctx.strokeStyle = '#808080';
    ctx.strokeRect(x, y, step, step);

    // Draw Number
    ctx.fillStyle = colors[i];
    ctx.fillText(i.toString(), x + step / 2, y + step / 2);
  }

  const texture = new CanvasTexture(canvas);
  texture.magFilter = NearestFilter; // Pixelated look
  texture.minFilter = NearestFilter;
  return texture;
}
