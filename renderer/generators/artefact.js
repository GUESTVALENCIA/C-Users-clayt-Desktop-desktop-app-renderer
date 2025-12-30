/**
 * ARTEFACT GENERATOR — Cley | Sandra Studio Ultimate
 * ═══════════════════════════════════════════════════════════════════════════
 * Genera artefactos (código, JSON, binarios) para descarga
 * ═══════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Crear artefacto
 */
async function create(payload, callback) {
  const { text = 'un componente reutilizable', type = 'code' } = payload;

  try {
    console.log('[ARTEFACT GEN] 🧩 Generando artefacto:', type);

    const outputDir = path.join(__dirname, '../outputs');
    await fs.mkdir(outputDir, { recursive: true });

    let artefactPath;
    let content;

    switch (type) {
      case 'code':
        artefactPath = path.join(outputDir, `artefact_${Date.now()}.js`);
        content = generateCode(text);
        break;

      case 'json':
        artefactPath = path.join(outputDir, `artefact_${Date.now()}.json`);
        content = generateJSON(text);
        break;

      case 'html':
        artefactPath = path.join(outputDir, `artefact_${Date.now()}.html`);
        content = generateHTML(text);
        break;

      default:
        artefactPath = path.join(outputDir, `artefact_${Date.now()}.txt`);
        content = generateText(text);
    }

    // Guardar artefacto
    await fs.writeFile(artefactPath, content, 'utf8');

    console.log('[ARTEFACT GEN] ✅ Artefacto generado:', artefactPath);

    callback({
      type: 'artefact',
      url: `file://${path.resolve(artefactPath)}`,
      path: artefactPath,
      contentType: type,
      action: 'download',
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('[ARTEFACT GEN] ❌ Error:', error.message);
    callback({
      error: 'Generación de artefacto falló',
      detail: error.message
    });
  }
}

/**
 * Generar código
 */
function generateCode(text) {
  return `/**
 * Artefacto generado por Sandra Studio Ultimate
 * ${text}
 */

export default function Artefact() {
  return {
    name: 'artefact',
    description: '${text}',
    createdAt: new Date().toISOString()
  };
}
`;
}

/**
 * Generar JSON
 */
function generateJSON(text) {
  return JSON.stringify({
    name: 'artefact',
    description: text,
    createdAt: new Date().toISOString(),
    version: '1.0.0',
    data: {}
  }, null, 2);
}

/**
 * Generar HTML
 */
function generateHTML(text) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Artefacto: ${text}</title>
  <style>
    body {
      font-family: system-ui;
      padding: 2rem;
      background: #0d0d0d;
      color: #fff;
    }
  </style>
</head>
<body>
  <h1>${text}</h1>
  <p>Artefacto generado por Sandra Studio Ultimate</p>
</body>
</html>`;
}

/**
 * Generar texto plano
 */
function generateText(text) {
  return `Artefacto: ${text}\n\nGenerado por Sandra Studio Ultimate\n${new Date().toISOString()}`;
}

module.exports = {
  create
};

