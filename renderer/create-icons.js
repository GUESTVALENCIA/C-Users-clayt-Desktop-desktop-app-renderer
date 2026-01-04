// Script para crear iconos PWA básicos usando Node.js
const fs = require('fs');
const path = require('path');

// Crear iconos SVG simples que se pueden convertir a PNG
const icon192SVG = `<svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0c0c1d;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a1a2e;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="192" height="192" fill="url(#grad)"/>
  <text x="96" y="120" font-size="100" text-anchor="middle" fill="#ffd700">🌙</text>
</svg>`;

const icon512SVG = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0c0c1d;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a1a2e;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#grad)"/>
  <text x="256" y="320" font-size="280" text-anchor="middle" fill="#ffd700">🌙</text>
</svg>`;

// Guardar como SVG (se pueden usar directamente o convertir a PNG)
fs.writeFileSync('icon-192.svg', icon192SVG);
fs.writeFileSync('icon-512.svg', icon512SVG);

console.log('✅ Iconos SVG creados: icon-192.svg, icon-512.svg');
console.log('💡 Nota: Para PWA necesitas PNG. Usa un convertidor online o el archivo icon-generator.html');
