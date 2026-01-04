// Generar iconos PNG para Safari iOS
const sharp = require('sharp');
const fs = require('fs');

async function generatePNGIcons() {
  const sizes = [
    { size: 180, name: 'apple-touch-icon.png' },
    { size: 192, name: 'icon-192.png' },
    { size: 512, name: 'icon-512.png' }
  ];

  for (const { size, name } of sizes) {
    // Crear un SVG con el tamaño correcto
    const svg = `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0c0c1d;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a1a2e;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#grad)" rx="${size * 0.2}"/>
  <text x="${size / 2}" y="${size * 0.65}" font-size="${size * 0.6}" text-anchor="middle" fill="#ffd700" font-family="Arial, sans-serif" font-weight="bold">🌙</text>
</svg>`;

    // Convertir SVG a PNG
    await sharp(Buffer.from(svg))
      .png()
      .toFile(name);
    
    console.log(`✅ Generado: ${name} (${size}x${size})`);
  }
  
  console.log('\n🎉 Todos los iconos PNG generados correctamente!');
}

generatePNGIcons().catch(console.error);