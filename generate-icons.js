// Генератор иконок PWA без внешних зависимостей
// Создаёт PNG через Canvas API (Node 18+)

const { createCanvas } = (() => {
  try { return require('canvas'); } catch { return null; }
})() || {};

const fs = require('fs');
const path = require('path');

function makeSVG(emoji, bg, size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size*0.22}" fill="${bg}"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
    font-size="${size*0.52}" font-family="Apple Color Emoji,Segoe UI Emoji,sans-serif">${emoji}</text>
</svg>`;
}

const icons = [
  { file: 'icon-192.png',        emoji: '💪', bg: '#1a1d27', size: 192 },
  { file: 'icon-512.png',        emoji: '💪', bg: '#1a1d27', size: 512 },
  { file: 'icon-client-192.png', emoji: '🏋️', bg: '#111318', size: 192 },
  { file: 'icon-client-512.png', emoji: '🏋️', bg: '#111318', size: 512 },
];

icons.forEach(({ file, emoji, bg, size }) => {
  const svg = makeSVG(emoji, bg, size);
  const outPath = path.join(__dirname, 'public', file.replace('.png', '.svg'));
  fs.writeFileSync(outPath, svg, 'utf8');
  console.log('Wrote', outPath);
});

console.log('SVG icons generated. Use them as fallback or convert to PNG manually.');
