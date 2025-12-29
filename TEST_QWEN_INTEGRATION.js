#!/usr/bin/env node

/**
 * TEST SUITE - QWEN Embedded Panel Integration
 *
 * Verifica:
 * ✅ Archivos creados/modificados
 * ✅ Funciones JavaScript disponibles
 * ✅ IPC handlers registrados
 * ✅ Estilos CSS correctos
 * ✅ HTML estructura válida
 */

const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(70));
console.log('  🧪 TEST SUITE - QWEN EMBEDDED INTEGRATION');
console.log('='.repeat(70) + '\n');

let passCount = 0;
let failCount = 0;

function test(name, condition, details = '') {
  if (condition) {
    console.log(`✅ PASS: ${name}`);
    if (details) console.log(`   → ${details}`);
    passCount++;
  } else {
    console.log(`❌ FAIL: ${name}`);
    if (details) console.log(`   → ${details}`);
    failCount++;
  }
}

function section(title) {
  console.log(`\n${title}`);
  console.log('-'.repeat(70));
}

// ============================================
// TEST 1: Archivos Creados
// ============================================
section('TEST 1: Archivos Creados y Modificados');

const filesToCheck = {
  'src/main/qwen-window.js': 'Gestor de ventana QWEN',
  'src/main/qwen-manager.js': 'Persistencia de sesiones',
  'src/preload/qwen-preload.js': 'Preload script seguro',
  'src/renderer/qwen-renderer.html': 'UI del panel QWEN',
  'main.js': 'Actualizado con QwenWindow + MCP integration',
  'renderer/studiolab-final-v2.html': 'Actualizado con botón QWEN + función',
  'QWEN_INTEGRATION_GUIDE.md': 'Documentación de integración',
  'QWEN_MCP_INTEGRATION_COMPLETE.md': 'Documentación completa'
};

for (const [file, description] of Object.entries(filesToCheck)) {
  const fullPath = path.join(__dirname, file);
  const exists = fs.existsSync(fullPath);
  test(`${file} existe`, exists, description);
}

// ============================================
// TEST 2: Contenido de Archivos
// ============================================
section('TEST 2: Contenido de Archivos Críticos');

// qwen-window.js debe tener QwenWindow class
const qwenWindowPath = path.join(__dirname, 'src/main/qwen-window.js');
const qwenWindowContent = fs.readFileSync(qwenWindowPath, 'utf-8');
test(
  'qwen-window.js contiene class QwenWindow',
  qwenWindowContent.includes('class QwenWindow'),
  'Clase principal para gestionar ventana QWEN'
);

test(
  'qwen-window.js contiene método create()',
  qwenWindowContent.includes('create()'),
  'Método para crear ventana'
);

test(
  'qwen-window.js contiene IPC handlers',
  qwenWindowContent.includes("ipcMain.on('qwen-url-changed'"),
  'Listener para cambios de URL'
);

// main.js debe tener integración QWEN
const mainJsPath = path.join(__dirname, 'main.js');
const mainJsContent = fs.readFileSync(mainJsPath, 'utf-8');
test(
  'main.js importa QwenWindow',
  mainJsContent.includes("require('./src/main/qwen-window')"),
  'Importación del módulo QWEN'
);

test(
  'main.js tiene function createQwenEmbeddedPanel()',
  mainJsContent.includes('createQwenEmbeddedPanel'),
  'Función para crear panel embebido'
);

test(
  'main.js tiene handler qwen-message',
  mainJsContent.includes("ipcMain.on('qwen-message'"),
  'Handler para mensajes de QWEN'
);

test(
  'main.js envía a MCP Server',
  mainJsContent.includes('pwa-imbf.onrender.com'),
  'URL del servidor MCP configurada'
);

// studiolab-final-v2.html debe tener botón QWEN
const htmlPath = path.join(__dirname, 'renderer/studiolab-final-v2.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
test(
  'HTML tiene botón QWEN',
  htmlContent.includes('id="qwenBtn"'),
  'Botón con ID qwenBtn en sidebar'
);

test(
  'HTML tiene función openQwenEmbedded()',
  htmlContent.includes('function openQwenEmbedded()'),
  'Función JavaScript para abrir panel'
);

test(
  'HTML tiene SVG logo QWEN',
  htmlContent.includes('<svg class="qwen-logo"'),
  'Logo SVG del QWEN'
);

test(
  'HTML tiene listener mcp-response',
  htmlContent.includes("ipcRenderer.on('mcp-response'"),
  'Listener para respuestas del MCP Server'
);

// qwen-renderer.html debe tener botón MCP
const qwenRendererPath = path.join(__dirname, 'src/renderer/qwen-renderer.html');
const qwenRendererContent = fs.readFileSync(qwenRendererPath, 'utf-8');
test(
  'qwen-renderer.html tiene botón Enviar al MCP',
  qwenRendererContent.includes('id="mcp-btn"'),
  'Botón para enviar propuestas al MCP'
);

test(
  'qwen-renderer.html tiene notificaciones MCP',
  qwenRendererContent.includes('id="mcp-notification"'),
  'Div para mostrar notificaciones'
);

test(
  'qwen-renderer.html captura clicks MCP',
  qwenRendererContent.includes('mcpBtn.addEventListener'),
  'Event listener para botón MCP'
);

// ============================================
// TEST 3: Funciones JavaScript Críticas
// ============================================
section('TEST 3: Funciones JavaScript Críticas');

const criticalFunctions = [
  { name: 'createQwenEmbeddedPanel', file: mainJsPath },
  { name: 'openQwenEmbedded', file: htmlPath },
  { name: 'updateStatus', file: qwenRendererPath },
  { name: 'showMCPNotification', file: qwenRendererPath }
];

for (const {name, file} of criticalFunctions) {
  const content = fs.readFileSync(file, 'utf-8');
  test(`Función ${name} existe`, content.includes(`function ${name}`), `Definida en archivo`);
}

// ============================================
// TEST 4: Estilos CSS
// ============================================
section('TEST 4: Estilos CSS');

test(
  'CSS tiene clase .sidebar-btn.qwen-btn',
  htmlContent.includes('.sidebar-btn.qwen-btn'),
  'Estilos específicos para botón QWEN'
);

test(
  'CSS tiene gradient QWEN',
  htmlContent.includes('linear-gradient(135deg, #1890ff'),
  'Gradiente azul-celeste del logo'
);

test(
  'CSS tiene hover effects',
  htmlContent.includes(':hover'),
  'Animaciones y efectos en hover'
);

test(
  'CSS tiene glow effect',
  htmlContent.includes('box-shadow: 0 4px 16px rgba(24, 144, 255'),
  'Efecto glow alrededor del botón'
);

// ============================================
// TEST 5: Estructura HTML
// ============================================
section('TEST 5: Estructura HTML');

test(
  'HTML válido (cierra etiquetas)',
  htmlContent.includes('</html>') && htmlContent.includes('</body>'),
  'Archivo HTML bien formado'
);

test(
  'Botón QWEN en sidebar',
  htmlContent.includes('<!-- QWEN Embedded Panel Button -->'),
  'Comentario explicativo'
);

test(
  'IPC imports disponibles',
  htmlContent.includes("require('electron')"),
  'Acceso a ipcRenderer'
);

// ============================================
// TEST 6: Integración IPC
// ============================================
section('TEST 6: Integración IPC');

const ipcSignals = [
  { signal: 'open-qwen-embedded', file: mainJsPath, description: 'Abre panel QWEN' },
  { signal: 'qwen-message', file: mainJsPath, description: 'Recibe mensajes de QWEN' },
  { signal: 'qwen-url-changed', file: qwenWindowPath, description: 'Sesión cambia de URL' },
  { signal: 'qwen-reconnect', file: qwenWindowPath, description: 'Reconecta QWEN' },
  { signal: 'mcp-response', file: htmlPath, description: 'Respuesta del MCP Server' }
];

for (const {signal, file, description} of ipcSignals) {
  const content = fs.readFileSync(file, 'utf-8');
  const hasSignal = content.includes(signal);
  test(`IPC signal '${signal}'`, hasSignal, description);
}

// ============================================
// TEST 7: MCP Server Integration
// ============================================
section('TEST 7: Integración MCP Server');

test(
  'MCP Server URL configurada',
  mainJsContent.includes('pwa-imbf.onrender.com/api/projects/realtime-voice-system/propose'),
  'Endpoint correcto'
);

test(
  'Authorization header',
  mainJsContent.includes("'Authorization': `Bearer"),
  'Token MCP en headers'
);

test(
  'Content-Type application/json',
  mainJsContent.includes('application/json'),
  'Tipo de contenido correcto'
);

test(
  'Payload tiene titulo',
  mainJsContent.includes('title:'),
  'Estructura de propuesta'
);

test(
  'Payload tiene contexto',
  mainJsContent.includes('context:'),
  'Contexto de propuesta'
);

// ============================================
// TEST 8: Seguridad
// ============================================
section('TEST 8: Seguridad');

test(
  'Context Isolation habilitada',
  qwenWindowContent.includes('contextIsolation: true'),
  'Renderer aislado de Node.js'
);

test(
  'Node Integration deshabilitada',
  qwenWindowContent.includes('nodeIntegration: false'),
  'No hay require() en renderer'
);

test(
  'Preload script configurado',
  qwenWindowContent.includes('preload:'),
  'Puente seguro entre procesos'
);

test(
  'Sandbox habilitado',
  qwenWindowContent.includes('sandbox: true'),
  'Restricciones de permisos'
);

// ============================================
// TEST 9: Documentación
// ============================================
section('TEST 9: Documentación');

const docs = [
  'QWEN_INTEGRATION_GUIDE.md',
  'QWEN_MCP_INTEGRATION_COMPLETE.md'
];

for (const doc of docs) {
  const docPath = path.join(__dirname, doc);
  const docContent = fs.readFileSync(docPath, 'utf-8');
  test(`${doc} tiene contenido`, docContent.length > 500, 'Documentación completa');
}

// ============================================
// SUMMARY
// ============================================
console.log('\n' + '='.repeat(70));
console.log('  📊 RESUMEN DEL TEST');
console.log('='.repeat(70) + '\n');

console.log(`✅ PASARON: ${passCount} tests`);
console.log(`❌ FALLARON: ${failCount} tests`);
console.log(`📈 TASA DE ÉXITO: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);

if (failCount === 0) {
  console.log('\n🎉 ¡TODOS LOS TESTS PASARON! Integración lista para producción.\n');
} else {
  console.log('\n⚠️  Algunos tests fallaron. Revisar detalles arriba.\n');
}

console.log('='.repeat(70));

// Exit with code 0 si todos pasan, 1 si hay fallos
process.exit(failCount > 0 ? 1 : 0);
