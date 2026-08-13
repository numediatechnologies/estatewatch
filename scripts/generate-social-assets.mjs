import { mkdir, writeFile } from 'node:fs/promises';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const source = await loadImage('scripts/assets/estatewatch-social-source.png');
await mkdir('public/social', { recursive: true });

const assets = [
  { name: 'estatewatch-og.png', width: 1200, height: 630 },
  { name: 'estatewatch-square.png', width: 1080, height: 1080 },
  { name: 'estatewatch-vertical.png', width: 1080, height: 1350 },
];

for (const asset of assets) {
  const canvas = createCanvas(asset.width, asset.height);
  const context = canvas.getContext('2d');
  context.drawImage(source, 0, 0, asset.width, asset.height);
  const scale = asset.width / 1200;
  const x = 72 * scale;
  const y = asset.height === 630 ? 225 * scale : 260 * scale;
  context.fillStyle = '#f8fafc';
  context.font = `700 ${Math.round(48 * scale)}px Arial`;
  context.fillText('Stay ahead of', x, y);
  context.fillStyle = '#fbbf24';
  context.fillText('deceased estate notices', x, y + 58 * scale);
  context.fillStyle = '#cbd5e1';
  context.font = `500 ${Math.round(21 * scale)}px Arial`;
  context.fillText('Practical alerts for South African professionals', x, y + 108 * scale);
  context.fillStyle = '#fbbf24';
  context.font = `800 ${Math.round(24 * scale)}px Arial`;
  const logoY = asset.height - 66 * scale;
  context.fillText('ESTATEWATCH', x, logoY);
  const eyeX = x + 220 * scale;
  context.strokeStyle = '#fbbf24';
  context.lineWidth = Math.max(2, 3 * scale);
  context.beginPath();
  context.moveTo(eyeX - 11 * scale, logoY - 8 * scale);
  context.bezierCurveTo(eyeX - 6 * scale, logoY - 15 * scale, eyeX + 6 * scale, logoY - 15 * scale, eyeX + 11 * scale, logoY - 8 * scale);
  context.bezierCurveTo(eyeX + 6 * scale, logoY - 1 * scale, eyeX - 6 * scale, logoY - 1 * scale, eyeX - 11 * scale, logoY - 8 * scale);
  context.stroke();
  context.fillStyle = '#fbbf24';
  context.beginPath();
  context.arc(eyeX, logoY - 8 * scale, 4 * scale, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#0f172a';
  context.beginPath();
  context.arc(eyeX, logoY - 8 * scale, 1.5 * scale, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#cbd5e1';
  context.font = `500 ${Math.round(16 * scale)}px Arial`;
  context.fillText('by MarketDirect.co.za', x, asset.height - 40 * scale);
  await writeFile(`public/social/${asset.name}`, canvas.toBuffer('image/png'));
}
