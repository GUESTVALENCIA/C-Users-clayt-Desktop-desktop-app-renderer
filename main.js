const { app, BrowserWindow, BrowserView, ipcMain, shell, Menu, globalShortcut } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const { existsSync } = require('fs');

// ============ QWEN HEALTH CHECK - ELIMINADO (causaba errores con setInterval) ============
// Reemplazado con verificación basada en eventos de Electron

// ============ CARGAR VARIABLES DE ENTORNO (.env) ============
try {
  require('dotenv').config();
  console.log('[Main] ✅ Variables de entorno cargadas desde .env');
  console.log(`   - GROQ_API_KEY: ${process.env.GROQ_API_KEY ? '✅ Configurada' : '❌ No configurada'}`);
  console.log(`   - ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✅ Configurada' : '❌ No configurada'}`);
  console.log(`   - DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Configurada' : '❌ No configurada'}`);
} catch (e) {
  console.warn('[Main] Advertencia: No se pudo cargar .env:', e.message);
}

// ============ API ROTATION SYSTEM - Gestión de credenciales ============
let apiRotationSystem;
try {
  const { APIRotationSystem } = require('./api-rotation-system');
  apiRotationSystem = new APIRotationSystem({
    rotationInterval: 3600000, // 1 hora
    failureThreshold: 3
  });

  console.log('[Main] ✅ API Rotation System inicializado');
  const stats = apiRotationSystem.getStats();
  console.log('[Main] 📊 Resumen de APIs:');
  Object.entries(stats).forEach(([provider, data]) => {
    if (data.total > 0) {
      console.log(`   - ${provider}: ${data.active}/${data.total} activas`);
    }
  });

  // Exponer globalmente para acceso desde IPC
  global.apiRotationSystem = apiRotationSystem;

  // Mostrar reporte de salud
  const healthReport = apiRotationSystem.getHealthReport();
  if (healthReport.warnings.length > 0) {
    console.warn('[Main] ⚠️ ADVERTENCIAS DE APIs:');
    healthReport.warnings.forEach(w => console.warn(`   ${w}`));
  }
} catch (e) {
  console.warn('[Main] API Rotation System no disponible:', e.message);
  apiRotationSystem = null;
}

// ============ MCP SERVER - HERRAMIENTAS GENÉRICAS ============
let mcpServer;
try {
  mcpServer = require('./mcp-server');
  mcpServer.startMCPServer();
  console.log('[Main] ✅ MCP Server de Herramientas cargado e iniciado');
} catch (e) {
  console.warn('[Main] MCP Server no disponible:', e.message);
  mcpServer = null;
}

// ============ CHAT SERVICE - APIs Integradas ============
let chatService;
try {
  chatService = require('./chat-service');
  console.log('[Main] ✅ Chat Service cargado');
} catch (e) {
  console.warn('[Main] Chat Service no disponible:', e.message);
  chatService = null;
}

// ============ MCP UNIVERSAL CLIENT - Sincronización en tiempo real ============
const { MCPClient } = require('./mcp-client');
let mcpUniversalClient = null;

// ============ AI MODELS MANAGER - Modelos Embebidos ============
const { AIModelsManager } = require('./ai-models-manager');
let aiModelsManager = null;

// ============ AUTO ORCHESTRATOR - Multi-Agent Consensus ============
const { AutoOrchestrator } = require('./auto-orchestrator');
let autoOrchestrator = null;

// ============ RESPONSE CACHE - Optimización de respuestas ============
const { ResponseCache } = require('./response-cache');
let responseCache = null;

// ============ TIMEOUT MANAGER - Timeouts dinámicos ============
const { TimeoutManager } = require('./timeout-manager');
let timeoutManager = null;

// ============ AUDIT SYSTEM - Auditoría con login ============
const { AuditSystem } = require('./audit-system');

// ============ QWEN WEBSOCKET INTERCEPTOR - Captura en bloque (NO DOM scraping) ============
const { setupQwenWebSocketInterceptor, stopQwenInterceptor, isInterceptorActive } = require('./qwen-websocket-interceptor');

// ============ API DISCOVERY SERVICE - Descubrimiento de APIs gratuitas ============
const { APIDiscoveryService } = require('./api-discovery-service');
let apiDiscoveryService = null;

// ============ GROQ SERVICE - API ultra rápida y gratuita ============
const { GroqService } = require('./groq-service');
let groqService = null;
let auditSystem = null;

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('[Main] ❌ Uncaught Exception:', error);
  console.error('[Main] Stack:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Main] ❌ Unhandled Rejection at:', promise, 'reason:', reason);
});
// AI Gateway experimental (aislado)
let AIGateway;
try {
  AIGateway = require('../experimental/ai-gateway/gateway');
} catch (e) {
  console.warn('[Main] AI Gateway experimental no disponible:', e.message);
  AIGateway = null;
}

// ==== CallCenter ====
let CallCenter;
let callCenter;
try {
  CallCenter = require('../callcenter/service');
} catch (e) {
  console.warn('[Main] CallCenter no disponible:', e.message);
  CallCenter = null;
}

// ==== QWEN Omni Gateway (HTTP 8085) ====
let qwenGateway;
try {
  qwenGateway = require('./qwen-omni-server');
} catch (e) {
  console.warn('[Main] QWEN Omni gateway no disponible:', e.message);
  qwenGateway = null;
}

// ============ QWEN EMBEDDING (vs Code Style) ============
// Sistema eliminado - ahora usa BrowserView embebido del MCP Universal
// El sistema anterior abría ventanas externas y bloqueaba el sistema
// Ahora se usa directamente el BrowserView con cookies persistentes

// ==== QWEN Model Catalog ====
const QWEN_MODELS = [
  { id: 'qwen3-max', name: 'Qwen3-Max', context: 262144 },
  { id: 'qwen3-vl-235b-a22b', name: 'Qwen3-VL-235B-A22B', context: 262144 },
  { id: 'qwen3-235b-a22b-2507', name: 'Qwen3-235B-A22B-2507', context: 131072 },
  { id: 'qwen3-vl-30b-a3b', name: 'Qwen3-VL-30B-A3B', context: 131072 },
  { id: 'qwen3-vl-32b', name: 'Qwen3-VL-32B', context: 131072 },
  { id: 'qwen3-30b-a3b-2507', name: 'Qwen3-30B-A3B-2507', context: 131072 },
  { id: 'qwen3-next-80b-a3b', name: 'Qwen3-Next-80B-A3B', context: 262144 },
  { id: 'qwen3-omni-flash', name: 'Qwen3-Omni-Flash', context: 65536 },
  { id: 'qwen3-coder', name: 'Qwen3-Coder', context: 1048576 },
  { id: 'qwen3-coder-flash', name: 'Qwen3-Coder-Flash', context: 262144 },
  { id: 'qvq-max', name: 'QVQ-Max', context: 131072 },
  { id: 'qwq-32b', name: 'QwQ-32B', context: 131072 },
  { id: 'qwen25-plus', name: 'Qwen2.5-Plus', context: 131072 },
  { id: 'qwen25-72b-instruct', name: 'Qwen2.5-72B-Instruct', context: 131072 },
  { id: 'qwen25-coder-32b-instruct', name: 'Qwen2.5-Coder-32B-Instruct', context: 131072 },
  { id: 'qwen25-14b-instruct-1m', name: 'Qwen2.5-14B-Instruct-1M', context: 1000000 },
  { id: 'qwen25-turbo', name: 'Qwen2.5-Turbo', context: 1000000 },
  { id: 'qwen25-vl-32b-instruct', name: 'Qwen2.5-VL-32B-Instruct', context: 131072 },
  { id: 'qwen25-omni-7b', name: 'Qwen2.5-Omni-7B', context: 30720 }
];

const DEFAULT_MODEL = 'qwen3-omni-flash';
// Nota: se eliminan las ventanas/URLs del portal oficial; QWEN funciona solo vía gateway/API.

// ============ MCP SERVER NEON - Memoria Persistente ============
let neonMCPServer = null;

function startNeonMCPServer() {
  try {
    const { spawn } = require('child_process');
    const path = require('path');
    const neonServerPath = path.join(__dirname, 'mcp-server-neon.py');

    if (!fs.existsSync(neonServerPath)) {
      console.warn('[Main] ⚠️  mcp-server-neon.py no encontrado. Memoria NEON no disponible.');
      return;
    }

    // Verificar si DATABASE_URL está configurado
    if (!process.env.DATABASE_URL) {
      console.warn('[Main] ⚠️ DATABASE_URL no configurada en variables de entorno');
      console.warn('[Main] ⚠️ MCP Server NEON requiere DATABASE_URL para funcionar');
      return;
    }
    const DATABASE_URL = process.env.DATABASE_URL;

    console.log('[Main] 🚀 Iniciando MCP Server NEON...');
    neonMCPServer = spawn('python', [neonServerPath], {
      cwd: __dirname,
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL }
    });

    neonMCPServer.stdout.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) console.log(`[MCP-NEON] ${msg}`);
    });

    neonMCPServer.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      // Solo mostrar errores reales, no advertencias
      if (msg && !msg.includes('⚠️') && !msg.includes('Advertencia')) {
        console.error(`[MCP-NEON] ${msg}`);
      }
    });

    neonMCPServer.on('close', (code) => {
      if (code !== 0 && code !== null) {
        console.warn(`[Main] ⚠️  MCP Server NEON terminó con código ${code}`);
      }
    });

    console.log('[Main] ✅ MCP Server NEON iniciado en puerto 8765');
  } catch (e) {
    console.warn('[Main] ⚠️  No se pudo iniciar MCP Server NEON:', e.message);
  }
}

// --- Utils git ---
function sh(cmd, cwd) {
  return execSync(cmd, { cwd, stdio: 'pipe', encoding: 'utf8' }).trim();
}
function repoRoot() {
  // Asume que main.js vive en desktop-app/, sube 1 nivel
  const root = path.resolve(__dirname, '..');
  if (existsSync(path.join(root, '.git'))) return root;
  try {
    return sh('git rev-parse --show-toplevel', root);
  } catch (e) {
    console.warn('[Main] git no disponible, usando raiz local:', e.message);
    return root;
  }
}

// ==== Estado QWEN persistente ====
function getStatePath() {
  try { return path.join(app.getPath('userData'), 'studiolab-qwen-state.json'); }
  catch { return path.join(__dirname, 'studiolab-qwen-state.json'); }
}

function loadQwenState() {
  const p = getStatePath();
  try {
    if (existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  } catch (e) {
    console.warn('[QWEN] No se pudo leer estado:', e.message);
  }
  return { model: DEFAULT_MODEL, auto: false, tokens: 0, tokensMax: 65536, logged: false };
}

function saveQwenState(state) {
  try {
    fs.writeFileSync(getStatePath(), JSON.stringify(state, null, 2), 'utf8');
  } catch (e) {
    console.warn('[QWEN] No se pudo guardar estado:', e.message);
  }
}

function getModelMeta(id) {
  return QWEN_MODELS.find(m => m.id === id) || QWEN_MODELS.find(m => m.id === DEFAULT_MODEL) || QWEN_MODELS[0];
}

let qwenState = loadQwenState();
// Sistema QWEN embebido - BrowserView (necesario porque qwen.ai bloquea iframes con X-Frame-Options)
let qwenBrowserView = null; // BrowserView para QWEN (evita restricciones de X-Frame-Options)
let qwenCookieInterval = null; // Interval ID para limpiar cuando se oculte el BrowserView

function emitStatus() {
  try {
    mainWindow?.webContents.send('app-status', {
      model: qwenState.model,
      auto: qwenState.auto,
      tokens: qwenState.tokens || 0,
      tokensMax: qwenState.tokensMax || getModelMeta(qwenState.model).context,
      logged: qwenState.logged || false
    });
  } catch { }
}

function setModel(modelId, manual = false) {
  const meta = getModelMeta(modelId);
  qwenState.model = meta.id;
  qwenState.tokensMax = meta.context;
  if (manual) qwenState.auto = false;
  saveQwenState(qwenState);
  emitStatus();
}

function maybeAutoSwitch() {
  if (!qwenState.auto) return;
  const usage = (qwenState.tokens || 0) / (qwenState.tokensMax || 1);
  if (usage < 0.9) return;
  // buscar siguiente con mayor contexto
  const sorted = [...QWEN_MODELS].sort((a, b) => b.context - a.context);
  const currentIdx = sorted.findIndex(m => m.id === qwenState.model);
  const bigger = sorted.find((m, idx) => idx < currentIdx && m.context > (qwenState.tokensMax || 0));
  if (bigger) {
    setModel(bigger.id, false);
    console.log('[QWEN] Auto-switch a', bigger.id);
  } else {
    emitStatus(); // solo emite aviso
  }
}

function updateUsage(tokens) {
  qwenState.tokens = Math.max(0, Number(tokens) || 0);
  maybeAutoSwitch();
  saveQwenState(qwenState);
  emitStatus();
}

function openOpera(url) {
  const operaPaths = [
    'C:\\\\Program Files\\\\Opera\\\\opera.exe',
    'C:\\\\Program Files (x86)\\\\Opera\\\\opera.exe',
    'C:\\\\Users\\\\clayt\\\\AppData\\\\Local\\\\Programs\\\\Opera\\\\launcher.exe'
  ];
  for (const operaPath of operaPaths) {
    try {
      if (existsSync(operaPath)) {
        spawn(operaPath, [url], { detached: true });
        return true;
      }
    } catch (e) {
      console.warn('Opera path not found:', operaPath, e.message);
    }
  }
  return false;
}

// ==================== QWEN - Sistema Embebido (como VS Code) ====================

// ==================== QWEN STREAMING SUPPORT ====================

// Funciones para manejar streaming de diferentes tipos de contenido
function setupQwenStreaming() {
  // Configurar el manejo de streaming de audio, video, imágenes y texto
  console.log('[QWEN] Streaming configurado para audio/video/imágenes/texto');

  // Establecer la persistencia de sesiones para todos los tipos de contenido
  const session = mainWindow?.webContents?.session;
  if (session) {
    // Permitir acceso a medios sin interacción del usuario
    session.setPermissionRequestHandler((webContents, permission, callback) => {
      if (permission === 'media') {
        callback(true); // Permitir acceso a medios
      } else {
        callback(false); // Denegar otros permisos
      }
    });

    // Configurar dispositivos multimedia
    session.setDevicePermissionHandler((details) => {
      if (details.mediaType === 'video' || details.mediaType === 'audio') {
        return true;
      }
      return false;
    });
  }
}


let mainWindow;
function createWindow() {
  console.log('[Main] Creando ventana...');
  try {
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      show: false, // No mostrar hasta que esté lista
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false, // Deshabilitar para permitir que webviews carguen contenido externo
        webviewTag: true,
        allowRunningInsecureContent: true,
      }
    });

    try { mainWindow.setMenuBarVisibility(false); } catch { }

    // CRÍTICO: Permitir popups para OAuth de QWEN3
    // Los webviews necesitan popups para autenticación (Google, GitHub, etc)
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      console.log('[Main] Popup OAuth detectado:', url.substring(0, 50) + '...');

      // PERMITIR popups OAuth (reconocer patrones)
      const isOAuthFlow = url.includes('accounts.google.com') ||
        url.includes('github.com/login') ||
        url.includes('qwen') ||
        url.includes('alibaba') ||
        url.includes('auth') ||
        url.includes('oauth');

      if (isOAuthFlow) {
        console.log('[Main] ✅ Permitiendo popup OAuth');
        // Crear ventana popup para OAuth
        const popup = new BrowserWindow({
          parent: mainWindow,
          modal: false,
          show: false,
          width: 600,
          height: 700,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: false,
            webSecurity: false,
            enableRemoteModule: false
          }
        });
        popup.loadURL(url);
        popup.once('ready-to-show', () => popup.show());
        popup.on('closed', () => popup.destroy());
        return { action: 'allow' };
      }

      // Bloquear otros popups
      console.log('[Main] 🚫 Bloqueando popup no autorizado');
      return { action: 'deny' };
    });

    // Manejar errores de carga
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      // Ignorar errores de iframes embebidos (no son errores de la ventana principal)
      if (validatedURL && (validatedURL.includes('qwenlm.ai') || validatedURL.includes('qwen.ai'))) {
        console.warn('[Main] ⚠️  Error en iframe embebido (ignorado):', errorCode, validatedURL);
        return; // No es un error crítico - el iframe maneja sus propios errores
      }
      console.error('[Main] Error cargando:', errorCode, errorDescription, validatedURL);
    });

    // CRÍTICO: Bloquear navegaciones no deseadas en la ventana principal
    mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
      // Permitir navegaciones de webviews embebidos (como QWEN3) Y archivos locales
      if (navigationUrl.startsWith('file://') ||
        navigationUrl.startsWith('data:') ||
        navigationUrl.startsWith('about:') ||
        navigationUrl.includes('qwenlm.ai') ||
        navigationUrl.includes('qwen.ai') ||
        navigationUrl.includes('alibaba.com')) {
        return; // Permitir - estos son contextos embebidos de QWEN3
      }
      // Bloquear TODAS las demás navegaciones a URLs externas
      console.log('[Main] 🚫 Bloqueando navegación no permitida en ventana principal:', navigationUrl);
      event.preventDefault();
    });

    // CRÍTICO: Permitir que webviews naveguen a URLs externas (QWEN3)
    // IMPORTANTE: Mantener configuración MINIMAL para evitar crashes
    mainWindow.webContents.on('will-attach-webview', (event, webPreferences, params) => {
      console.log('[Main] 📦 Configurando webview con permisos MÍNIMOS para QWEN3...');
      // Configuración MINIMAL - solo lo necesario
      webPreferences.nodeIntegration = false;
      webPreferences.contextIsolation = false; // IMPORTANTE: Deshabilitar para evitar conflictos
      webPreferences.webSecurity = false; // Permitir contenido HTTPS externo
      // NO agregar preload, NO agregar enableRemoteModule, NO agregar sandbox
      delete webPreferences.preload; // Remover preload si existe
      delete webPreferences.sandbox; // Remover sandbox si existe
    });

    mainWindow.webContents.on('crashed', () => {
      console.error('[Main] Renderer process crashed');
    });

    // Mostrar ventana cuando esté lista
    mainWindow.once('ready-to-show', () => {
      console.log('[Main] Ventana lista, mostrando...');
      // Asegurar que NO hay BrowserView residual al iniciar (solo si no es QWEN3 activo)
      // Si QWEN3 está activo, mantenerlo; si no, limpiar cualquier BrowserView residual
      const existingView = mainWindow.getBrowserView();
      if (existingView && existingView !== qwenBrowserView) {
        console.log('[Main] Eliminando BrowserView residual que no es QWEN3');
        mainWindow.setBrowserView(null);
        try {
          if (existingView.webContents && !existingView.webContents.isDestroyed()) {
            existingView.webContents.destroy();
          }
        } catch (e) {
          console.log('[Main] Error destruyendo BrowserView residual:', e.message);
        }
      }
      mainWindow.show();
      mainWindow.focus();
      try { emitStatus(); } catch { }
      try {
        mainWindow.webContents.send('services-ready', {
          mcpPort: mcpServer?.MCP_PORT || 19875,
          qwenPort: qwenGateway?.PORT || 8085,
          model: qwenState.model,
          auto: qwenState.auto
        });
      } catch { }

      // No crear BrowserView de Qwen, mantener solo la funcionalidad principal
    });

    // ========================================
    // CARGAR INDEX OFICIAL: studiolab-final-v2.html
    // ========================================
    const INDEX_OFFICIAL_PATH = 'C:\\Users\\clayt\\Desktop\\desktop-app\\renderer\\studiolab-final-v2.html';
    const indexPathFromDirname = path.resolve(__dirname, 'renderer', 'studiolab-final-v2.html');

    // Intentar primero la ruta oficial, luego la relativa
    let indexPath = null;
    if (existsSync(INDEX_OFFICIAL_PATH)) {
      indexPath = INDEX_OFFICIAL_PATH;
      console.log('[Main] ✅ Usando ruta oficial directa');
    } else if (existsSync(indexPathFromDirname)) {
      indexPath = indexPathFromDirname;
      console.log('[Main] ✅ Usando ruta relativa a __dirname');
    }

    console.log('[Main] ========================================');
    console.log('[Main] INDEX OFICIAL: studiolab-final-v2.html');
    console.log('[Main] __dirname:', __dirname);
    console.log('[Main] Ruta oficial:', INDEX_OFFICIAL_PATH, '-> Existe:', existsSync(INDEX_OFFICIAL_PATH));
    console.log('[Main] Ruta relativa:', indexPathFromDirname, '-> Existe:', existsSync(indexPathFromDirname));
    console.log('[Main] Ruta seleccionada:', indexPath);
    console.log('[Main] ========================================');

    if (!indexPath || !existsSync(indexPath)) {
      const errorMsg = `ERROR CRÍTICO: studiolab-final-v2.html NO ENCONTRADO\n\nRuta oficial: ${INDEX_OFFICIAL_PATH}\nRuta relativa: ${indexPathFromDirname}`;
      console.error('[Main] ❌', errorMsg);
      mainWindow.loadURL(`data:text/html;charset=utf-8,<html><head><meta charset="utf-8"></head><body style="background:#000;color:#fff;font-family:monospace;padding:40px;white-space:pre-wrap;"><h1 style="color:#f00">ERROR: Index no encontrado</h1><pre>${errorMsg.replace(/\n/g, '<br>')}</pre></body></html>`);
      return;
    }

    console.log('[Main] ✅ CARGANDO INDEX OFICIAL desde:', indexPath);
    mainWindow.loadFile(indexPath).then(() => {
      console.log('[Main] ✅✅✅ INDEX OFICIAL CARGADO EXITOSAMENTE ✅✅✅');
      console.log('[Main] Archivo: studiolab-final-v2.html');
      console.log('[Main] Ruta:', indexPath);
    }).catch(err => {
      const errorMsg = `Error al cargar: ${err.message}\n\nRuta: ${indexPath}`;
      console.error('[Main] ❌ ERROR al cargar index oficial:', err);
      console.error('[Main] Stack:', err.stack);
      mainWindow.loadURL(`data:text/html;charset=utf-8,<html><head><meta charset="utf-8"></head><body style="background:#000;color:#fff;font-family:monospace;padding:40px;white-space:pre-wrap;"><h1 style="color:#f00">ERROR AL CARGAR INDEX</h1><pre>${errorMsg.replace(/\n/g, '<br>')}</pre></body></html>`);
    });

    // Abrir DevTools en desarrollo
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      mainWindow.webContents.openDevTools();
    }

    // Configurar streaming de Qwen después de que la ventana esté lista
    setTimeout(() => {
      setupQwenStreaming();
    }, 500);
  } catch (err) {
    console.error('[Main] Error creando ventana:', err);
  }
}


// Manejadores IPC para streaming de Qwen
ipcMain.handle('qwen:startAudioStream', async (event, options = {}) => {
  console.log('[QWEN] Iniciando streaming de audio', options);
  // Implementación real del streaming de audio iría aquí
  return { success: true, message: 'Streaming de audio iniciado' };
});

ipcMain.handle('qwen:startVideoStream', async (event, options = {}) => {
  console.log('[QWEN] Iniciando streaming de video', options);
  // Implementación real del streaming de video iría aquí
  return { success: true, message: 'Streaming de video iniciado' };
});

ipcMain.handle('qwen:startImageStream', async (event, options = {}) => {
  console.log('[QWEN] Iniciando streaming de imagen', options);
  // Implementación real del streaming de imagen iría aquí
  return { success: true, message: 'Streaming de imagen iniciado' };
});

ipcMain.handle('qwen:startTextStream', async (event, options = {}) => {
  console.log('[QWEN] Iniciando streaming de texto', options);
  // Implementación real del streaming de texto iría aquí
  return { success: true, message: 'Streaming de texto iniciado' };
});

app.whenReady().then(() => {
  console.log('[Main] ✅ Electron app ready');
  try { Menu.setApplicationMenu(null); } catch { }
  console.log('[Main] Directorio actual:', __dirname);
  console.log('[Main] AIGateway disponible:', AIGateway !== null);
  console.log('[Main] CallCenter disponible:', CallCenter !== null);

  // Normalizar modelo guardado
  const currentModel = getModelMeta(qwenState.model || DEFAULT_MODEL);
  qwenState.model = currentModel.id;
  qwenState.tokensMax = currentModel.context;
  saveQwenState(qwenState);

  // Nota: QWEN no requiere API Keys - usa ventana embebida con autenticación OAuth

  // ============ INICIAR MCP SERVER UNIFICADO ============
  if (mcpServer) {
    try {
      const port = mcpServer.startMCPServer();
      console.log(`[Main] ✅ MCP Server Unificado iniciado en puerto ${port}`);
    } catch (e) {
      console.error('[Main] Error iniciando MCP Server:', e.message);
    }
  }

  // ============ INICIAR QWEN OMNI GATEWAY ============
  if (qwenGateway && qwenGateway.startQwenServer) {
    try {
      qwenGateway.startQwenServer();
      console.log('[Main] o. QWEN Omni gateway HTTP iniciado en puerto', qwenGateway.PORT || 8085);
    } catch (e) {
      console.error('[Main] Error iniciando QWEN Omni gateway:', e.message);
    }
  }

  // ============ INICIAR MCP SERVER NEON ============
  startNeonMCPServer();

  // ============ INICIAR MONITOR QWEN EMBEBIDO ============
  // Comentado para no interferir con la aplicación principal
  // try { createQwenMonitor(false); } catch (e) { console.warn('No se pudo iniciar monitor QWEN:', e.message); }

  createWindow();

  // ============ REGISTRAR ATAJO F12 Y CTRL+SHIFT+I ============
  // Intentar registrar F12 - puede fallar si Windows lo captura (ej: Calculator)
  const openQwenDevTools = () => {
    if (qwenBrowserView && !qwenBrowserView.webContents.isDestroyed()) {
      if (qwenBrowserView.webContents.isDevToolsOpened()) {
        qwenBrowserView.webContents.closeDevTools();
        console.log('[QWEN] 🔧 DevTools cerrado');
      } else {
        qwenBrowserView.webContents.openDevTools({ mode: 'detach' });
        console.log('[QWEN] 🔧 DevTools abierto');
      }
      return true;
    }
    return false;
  };

  // Intentar registrar F12 como atajo global
  try {
    const f12Registered = globalShortcut.register('F12', () => {
      console.log('[Global F12] ✅ Tecla F12 presionada');
      if (!openQwenDevTools() && mainWindow && !mainWindow.isDestroyed()) {
        // Si QWEN no está disponible, abrir DevTools de la ventana principal
        if (mainWindow.webContents.isDevToolsOpened()) {
          mainWindow.webContents.closeDevTools();
        } else {
          mainWindow.webContents.openDevTools({ mode: 'detach' });
        }
      }
    });

    // Verificar si realmente se registró
    const isF12Registered = globalShortcut.isRegistered('F12');
    if (f12Registered && isF12Registered) {
      console.log('[Main] ✅ Atajo global F12 registrado correctamente');
    } else {
      console.warn('[Main] ⚠️ F12 NO se pudo registrar - Windows puede estar capturándolo');
      console.warn('[Main] 💡 SOLUCIÓN: Desactiva el atajo F12 en Windows Calculator o usa Ctrl+Shift+I');
    }
  } catch (e) {
    console.warn('[Main] ⚠️ Error registrando F12:', e.message);
  }

  globalShortcut.register('CommandOrControl+Shift+I', () => {
    if (qwenBrowserView && !qwenBrowserView.webContents.isDestroyed()) {
      // Verificar si DevTools ya está abierto
      if (qwenBrowserView.webContents.isDevToolsOpened()) {
        qwenBrowserView.webContents.closeDevTools();
        console.log('[QWEN] 🔧 DevTools cerrado (Ctrl+Shift+I)');
      } else {
        qwenBrowserView.webContents.openDevTools({ mode: 'detach' });
        console.log('[QWEN] 🔧 DevTools abierto (Ctrl+Shift+I)');
      }
    } else {
      // Si QWEN no está abierto, abrir DevTools de la ventana principal
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.webContents.isDevToolsOpened()) {
          mainWindow.webContents.closeDevTools();
          console.log('[Main] 🔧 DevTools cerrado');
        } else {
          mainWindow.webContents.openDevTools({ mode: 'detach' });
          console.log('[Main] 🔧 DevTools abierto (Ctrl+Shift+I)');
        }
      }
    }
  });
  console.log('[Main] ✅ Atajo Ctrl+Shift+I registrado como fallback');

  // ============ CONECTAR MCP UNIVERSAL CLIENT ============
  // Esto sincroniza StudioLab con todos los otros editores (VS Code, Cursor, Antigravity)
  mcpUniversalClient = new MCPClient('wss://pwa-imbf.onrender.com');

  mcpUniversalClient.connect(process.env.MCP_AUTH_TOKEN || 'default-token')
    .then(() => {
      console.log('[Main] ✅ StudioLab sincronizado con MCP Universal');

      // Escuchar propuestas de otros agentes
      mcpUniversalClient.on('PROPOSAL_CREATED', (data) => {
        if (mainWindow) {
          mainWindow.webContents.send('mcp:newProposal', data);
        }
      });

      // Escuchar actualizaciones de implementación
      mcpUniversalClient.on('IMPLEMENTATION_PROGRESS', (data) => {
        if (mainWindow) {
          mainWindow.webContents.send('mcp:implementationUpdate', data);
        }
      });

      // Escuchar reviews
      mcpUniversalClient.on('REVIEW_SUBMITTED', (data) => {
        if (mainWindow) {
          mainWindow.webContents.send('mcp:reviewReceived', data);
        }
      });
    })
    .catch((error) => {
      console.error('[Main] ❌ Error conectando a MCP Universal:', error.message);
      console.warn('[Main] Sistema funcionará en modo local sin sincronización');
    });

  // Exponer mcpUniversalClient globalmente para IPC handlers
  global.mcpUniversalClient = mcpUniversalClient;

  // ============ INICIALIZAR AI MODELS MANAGER ============
  // ============ INICIALIZAR AI MODELS MANAGER ============
  try {
    if (mainWindow) {
      aiModelsManager = new AIModelsManager(mainWindow);
      global.aiModelsManager = aiModelsManager;

      // Registrar modelos básicos
      // Nota: QWEN tiene su propia gestión
      aiModelsManager.createModelView('chatgpt', 'https://chat.openai.com', 'chatgpt');
      aiModelsManager.createModelView('gemini', 'https://gemini.google.com', 'gemini');
      aiModelsManager.createModelView('deepseek', 'https://chat.deepseek.com', 'deepseek');

      console.log('[Main] ✅ AI Models Manager inicializado');
    }
  } catch (e) {
    console.error('[Main] ❌ Error inicializando AI Models Manager:', e);
  }

  // ============ INICIALIZAR AUTO ORCHESTRATOR ============
  // Sistema de orquestación multi-agente que coordina consultas paralelas
  autoOrchestrator = new AutoOrchestrator();
  global.autoOrchestrator = autoOrchestrator;
  console.log('[Main] ✅ Auto Orchestrator inicializado');

  // ============ INICIALIZAR CACHE DE RESPUESTAS ============
  responseCache = new ResponseCache({ ttl: 3600000, maxSize: 100 });
  global.responseCache = responseCache;
  console.log('[Main] ✅ Response Cache inicializado');

  // ============ INICIALIZAR TIMEOUT MANAGER ============
  timeoutManager = new TimeoutManager({ baseTimeout: 30000 });
  global.timeoutManager = timeoutManager;
  console.log('[Main] ✅ Timeout Manager inicializado');

  // ============ INICIALIZAR AUDIT SYSTEM ============
  auditSystem = new AuditSystem({ auditDir: path.join(__dirname, '.audit') });
  global.auditSystem = auditSystem;
  // Crear usuario admin por defecto si no existe
  if (!auditSystem.users.has('admin')) {
    auditSystem.registerUser('admin', 'admin2024!', 'admin');
  }
  console.log('[Main] ✅ Audit System inicializado');

  // Sistema QWEN embebido - se inicializa cuando el usuario hace clic (no precargar)
  // Arrancar vigilancia y eventos de API al inicializar
  try { watchCritical(); } catch (e) { console.warn('watchCritical failed:', e.message); }
  try { tapServiceApiEvents(); } catch (e) { console.warn('tapServiceApiEvents failed:', e.message); }
  // Inicializar CallCenter
  if (CallCenter) {
    try {
      // Si tienes un serviceManager global, pásalo; si no, este ctor funciona igual
      const mm = global.serviceManager?.get?.('multimodal');
      const rs = global.serviceManager?.get?.('roles-system');
      callCenter = new CallCenter({
        serviceManager: global.serviceManager,
        multimodal: mm,
        rolesSystem: rs
      });
      console.log('✅ CallCenter inicializado');
    } catch (e) { console.warn('CallCenter init failed:', e.message); }
  } else {
    console.warn('⚠️ CallCenter no disponible (módulo no encontrado)');
  }

  // ============ API DISCOVERY SERVICE INITIALIZATION ============
  try {
    apiDiscoveryService = new APIDiscoveryService();
    global.apiDiscoveryService = apiDiscoveryService;
    const stats = apiDiscoveryService.getStats();
    console.log(`✅ API Discovery cargado: ${stats.total} APIs en ${stats.categories} categorías`);
    console.log(`   - ${stats.freeAPIs} APIs completamente gratuitas`);
    console.log(`   - ${stats.https} APIs con HTTPS`);
  } catch (e) {
    console.warn('⚠️ API Discovery Service no disponible:', e.message);
  }

  // ============ GROQ SERVICE INITIALIZATION ============
  try {
    groqService = new GroqService();
    global.groqService = groqService;
    const groqStats = groqService.getStats();
    console.log(`✅ Groq Service inicializado`);
    console.log(`   - API disponible: ${groqStats.isAvailable}`);
    console.log(`   - Modelos: ${groqStats.modelsAvailable}`);

    // Test de conexión en background
    groqService.testConnection().then(result => {
      if (result.available) {
        console.log(`✅ Groq API conectada y funcionando`);
      } else {
        console.warn(`⚠️ Groq API error: ${result.error}`);
      }
    }).catch(e => {
      console.warn('[Groq] Error en test:', e.message);
    });
  } catch (e) {
    console.warn('⚠️ Groq Service no disponible:', e.message);
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Función auxiliar para guardar cookies de Qwen
async function saveQwenCookies(qwenSession, cookiesPath) {
  try {
    const cookies = await qwenSession.cookies.get({});
    const cookiesData = cookies.map(cookie => ({
      url: cookie.url || `https://${cookie.domain}`,
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      expirationDate: cookie.expirationDate
    }));

    await fs.promises.writeFile(cookiesPath, JSON.stringify(cookiesData, null, 2));
    console.log(`[QWEN3] 💾 ${cookies.length} cookies guardadas en ${cookiesPath}`);
  } catch (e) {
    console.warn('[QWEN3] ⚠️ Error guardando cookies:', e.message);
  }
}

app.on('window-all-closed', async function () {
  // LIMPIAR intervalo de cookies antes de cerrar
  if (qwenCookieInterval) {
    clearInterval(qwenCookieInterval);
    qwenCookieInterval = null;
    console.log('[QWEN3] Intervalo de cookies limpiado al cerrar');
  }

  // Guardar cookies de Qwen antes de cerrar
  if (qwenBrowserView && !qwenBrowserView.webContents.isDestroyed()) {
    try {
      const qwenSession = qwenBrowserView.webContents.session;
      const cookiesPath = path.join(app.getPath('userData'), 'qwen-cookies.json');
      await saveQwenCookies(qwenSession, cookiesPath);
      console.log('[QWEN3] 💾 Cookies guardadas antes de cerrar');
    } catch (e) {
      console.warn('[QWEN3] ⚠️ Error guardando cookies al cerrar:', e.message);
    }
  }

  // Limpiar CUALQUIER BrowserView antes de cerrar
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      const currentView = mainWindow.getBrowserView();
      if (currentView) {
        mainWindow.setBrowserView(null);
        try {
          if (currentView.webContents && !currentView.webContents.isDestroyed()) {
            currentView.webContents.destroy();
          }
        } catch (e) {
          console.log('[Main] Error destruyendo webContents:', e.message);
        }
      }
    } catch (e) {
      // mainWindow ya fue destruida, ignorar
      console.log('[Main] Error limpiando BrowserView al cerrar:', e.message);
    }
  }
  // Limpiar referencia
  qwenBrowserView = null;

  // Detener interceptor WebSocket
  stopQwenInterceptor();

  if (process.platform !== 'darwin') app.quit();
});

// ============ DESREGISTRAR ATAJOS AL CERRAR ============
app.on('will-quit', () => {
  // Desregistrar todos los atajos globales
  globalShortcut.unregisterAll();
  console.log('[Main] ✅ Atajos globales desregistrados');
});

// ============ RESTORE MANAGER IPC ============
let RESTORE_MODE = 'safe'; // 'safe' | 'hard'
let AUTO_RECOVERY_ENABLED = true;

ipcMain.handle('restore:list', async () => {
  const root = repoRoot();
  try {
    const out = sh(`git for-each-ref refs/tags/rp --format="%(refname:short)|%(objectname)|%(taggerdate:iso8601)|%(subject)"`, root);
    const items = (out ? out.split('\n') : []).map(line => {
      const [tag, sha, date, meta] = line.split('|');
      return { tag: tag.replace(/^rp\//, ''), sha, date, meta };
    });
    return { success: true, items };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('restore:create', async (_evt, label) => {
  const root = repoRoot();
  try {
    const ts = new Date();
    const pad = n => String(n).padStart(2, '0');
    const name = `rp/${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}${label ? '-' + String(label).replace(/\s+/g, '_') : ''}`;
    const sha = sh('git rev-parse HEAD', root);
    const meta = JSON.stringify({ type: 'restore_point', created_at: ts.toISOString(), sha, label }, null, 2);
    sh(`git tag -a "${name}" -m '${meta}'`, root);
    sh('git push --tags', root);
    return { success: true, tag: name.replace(/^rp\//, ''), sha };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('restore:set-mode', async (_evt, mode) => {
  RESTORE_MODE = (mode === 'hard') ? 'hard' : 'safe';
  return { success: true, mode: RESTORE_MODE };
});

ipcMain.handle('restore:apply', async (_evt, tag) => {
  const root = repoRoot();
  try {
    sh('git fetch --all --tags', root);
    const full = tag.startsWith('rp/') ? tag : `rp/${tag}`;
    const sha = sh(`git rev-list -n 1 "${full}"`, root);
    if (RESTORE_MODE === 'hard') {
      sh(`git reset --hard "${sha}"`, root);
      sh('git clean -fd', root);
      sh('git push --force', root);
      return { success: true, mode: 'hard', sha };
    }
    // SAFE
    sh(`git read-tree --reset -u "${sha}^{tree}"`, root);
    sh(`git commit -m "restore: apply snapshot ${full} (${sha.substring(0, 7)})"`, root);
    sh(`git push`, root);
    return { success: true, mode: 'safe', sha };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Auto-recovery ON/OFF
ipcMain.handle('auto-recovery:set', async (_e, on) => {
  AUTO_RECOVERY_ENABLED = !!on;
  return { success: true, enabled: AUTO_RECOVERY_ENABLED };
});
ipcMain.handle('auto-recovery:get', async () => ({ success: true, enabled: AUTO_RECOVERY_ENABLED }));


// -------------------- Alarmas: vigilancia de archivos críticos --------------------

const CRITICAL_FILES = [
  'desktop-app/main.js',
  'desktop-app/preload.js',
  'desktop-app/renderer/studiolab-final-v2.html',
  'services/multimodal-conversation-service.js',
  'services/deepgram-service.js',
  'services/cartesia-service.js',
  'core/roles-system.js',
  'vercel-app/public/index.html',
  'vercel-app/vercel.json'
].map(p => path.resolve(repoRoot(), p));

function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }
let baseline = new Map();
function snapshotBaseline() {
  baseline.clear();
  for (const f of CRITICAL_FILES) {
    try {
      const h = sha256(fs.readFileSync(f));
      baseline.set(f, h);
    } catch { }
  }
}

function emitAlarm(payload) {
  try { mainWindow?.webContents.send('alarm:event', payload); } catch { }
  try { autoRecoveryMaybe(payload); } catch { }
}

function watchCritical() {
  snapshotBaseline();
  for (const f of CRITICAL_FILES) {
    try {
      fs.watch(f, { persistent: true }, (_ev, _fname) => {
        setTimeout(() => {
          let status = 'modified', oldH = baseline.get(f), newH = null;
          try { newH = sha256(fs.readFileSync(f)); } catch { status = 'deleted'; }
          emitAlarm({ type: 'file', status, path: f, oldHash: oldH, newHash: newH, ts: Date.now(), message: `Archivo crítico ${status}: ${path.relative(repoRoot(), f)}` });
          if (newH) baseline.set(f, newH);
        }, 60);
      });
    } catch { }
  }
}

// -------------------- Puente para alarmas de API --------------------

function tapServiceApiEvents() {
  try {
    const multimodal = global.serviceManager?.get?.('multimodal') || (global.serviceManager && global.serviceManager.get && global.serviceManager.get('multimodal'));
    const deepgram = global.serviceManager?.get?.('deepgram') || (global.serviceManager && global.serviceManager.get && global.serviceManager.get('deepgram'));
    const cartesia = global.serviceManager?.get?.('cartesia') || (global.serviceManager && global.serviceManager.get && global.serviceManager.get('cartesia'));
    const counters = { deepgram: [], cartesia: [], sttCloses: [] };

    deepgram?.on?.('stt:open', () => emitAlarm({ type: 'api', service: 'deepgram', status: 'open', ts: Date.now(), message: 'Deepgram conectado' }));
    deepgram?.on?.('stt:close', () => {
      emitAlarm({ type: 'api', service: 'deepgram', status: 'close', ts: Date.now(), message: 'Deepgram cerrado' });
      const now = Date.now();
      counters.sttCloses.push(now);
      counters.sttCloses = counters.sttCloses.filter(t => now - t <= 90000);
      if (counters.sttCloses.length >= 3) emitAlarm({ type: 'policy', status: 'stt_unstable', ts: now, message: 'STT inestable (3 cierres/≤90s)' });
    });
    deepgram?.on?.('api:error', (e) => {
      emitAlarm({ type: 'api', service: 'deepgram', status: 'error', detail: String(e && e.message || e), ts: Date.now(), message: 'Deepgram error' });
      const now = Date.now();
      counters.deepgram.push(now);
      counters.deepgram = counters.deepgram.filter(t => now - t <= 60000);
      if (counters.deepgram.length >= 3) emitAlarm({ type: 'policy', status: 'asr_errors', service: 'deepgram', ts: now, message: 'ASR errores repetidos (≥3/≤60s)' });
    });
    cartesia?.on?.('api:error', (e) => {
      emitAlarm({ type: 'api', service: 'cartesia', status: 'error', detail: String(e && e.message || e), ts: Date.now(), message: 'Cartesia error' });
      const now = Date.now();
      counters.cartesia.push(now);
      counters.cartesia = counters.cartesia.filter(t => now - t <= 60000);
      if (counters.cartesia.length >= 3) emitAlarm({ type: 'policy', status: 'tts_errors', service: 'cartesia', ts: now, message: 'TTS errores repetidos (≥3/≤60s)' });
    });
    multimodal?.on?.('role:changed', ({ sessionId, roleId }) => emitAlarm({ type: 'role', status: 'changed', sessionId, roleId, ts: Date.now(), message: `Cambio de rol activo: ${roleId}` }));
  } catch { }
}

// --- Estrategia de auto-restauración ---
function getLatestSnapshotTag() {
  try {
    const root = repoRoot();
    const lines = sh(`git for-each-ref refs/tags/rp --format="%(refname:short)" | sort -r`, root).split('\n').filter(Boolean);
    return (lines[0] || '').replace(/^rp\//, '');
  } catch { return null; }
}

function autoRestoreNow(reason = 'auto') {
  if (!AUTO_RECOVERY_ENABLED) return;
  const tag = getLatestSnapshotTag();
  if (!tag) return;
  try {
    const root = repoRoot();
    sh('git fetch --all --tags', root);
    const full = tag.startsWith('rp/') ? tag : `rp/${tag}`;
    const sha = sh(`git rev-list -n 1 "${full}"`, root);
    if (RESTORE_MODE === 'hard') {
      sh(`git reset --hard "${sha}"`, root);
      sh('git clean -fd', root);
      sh('git push --force', root);
    } else {
      sh(`git read-tree --reset -u "${sha}^{tree}"`, root);
      sh(`git commit -m "auto-restore(${reason}): ${full} (${sha.substring(0, 7)})"`, root);
      sh(`git push`, root);
    }
    emitAlarm({ type: 'restore', status: RESTORE_MODE, ts: Date.now(), message: `Auto-restore por ${reason} → ${full}` });
  } catch (e) {
    emitAlarm({ type: 'restore', status: 'failed', ts: Date.now(), message: `Auto-restore fallido (${reason}): ${e.message}` });
  }
}

function autoRecoveryMaybe(a) {
  if (!AUTO_RECOVERY_ENABLED) return;
  if (a.type === 'file' && a.status === 'deleted') return autoRestoreNow('file_deleted');
  if (a.type === 'policy' && (a.status === 'asr_errors' || a.status === 'tts_errors')) return autoRestoreNow(a.status);
  if (a.type === 'policy' && a.status === 'stt_unstable') return autoRestoreNow('stt_unstable');
}

// -------------------- IPC helpers for conversational lifecycle (optional) --------------------
ipcMain.handle('speech-ended', async () => {
  try {
    const multimodal = global.serviceManager?.get?.('multimodal');
    if (multimodal && typeof multimodal.speechEnded === 'function') {
      multimodal.speechEnded();
    }
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('start-conversational-call', async () => {
  try {
    const multimodal = global.serviceManager?.get?.('multimodal');
    if (multimodal && typeof multimodal.startConversation === 'function') {
      return multimodal.startConversation({ mode: 'voice', continuous: false });
    }
    return { success: false, error: 'Multimodal service not available' };
  } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('end-conversational-call', async () => {
  try {
    const multimodal = global.serviceManager?.get?.('multimodal');
    if (multimodal && typeof multimodal.stopConversation === 'function') {
      return multimodal.stopConversation();
    }
    return { success: false, error: 'Multimodal service not available' };
  } catch (e) { return { success: false, error: e.message }; }
});

// Multimodal full handlers (used by renderer)
ipcMain.handle('start-multimodal-conversation', async (_e, { mode = 'text', continuous = false, userId = null } = {}) => {
  try {
    const multimodal = global.serviceManager?.get?.('multimodal');
    const deepgram = global.serviceManager?.get?.('deepgram');
    if (!multimodal) return { success: false, error: 'Multimodal service not available' };

    // Forward STT connection events to renderer
    if (deepgram) {
      deepgram.on?.('stt:open', () => { try { mainWindow?.webContents.send('stt-connection-change', { connected: true }); } catch { } });
      deepgram.on?.('stt:close', () => { try { mainWindow?.webContents.send('stt-connection-change', { connected: false }); } catch { } });
      deepgram.on?.('transcript', (payload) => { try { mainWindow?.webContents.send('transcript:update', payload); } catch { } });
    }

    if (typeof multimodal.startConversation === 'function') {
      return await multimodal.startConversation({ mode, continuous, userId });
    } else if (typeof multimodal.startMultimodalConversation === 'function') {
      return await multimodal.startMultimodalConversation({ mode, continuous, userId });
    } else {
      return { success: false, error: 'Multimodal start not implemented' };
    }
  } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('stop-multimodal-conversation', async () => {
  try {
    const multimodal = global.serviceManager?.get?.('multimodal');
    if (!multimodal) return { success: false, error: 'Multimodal service not available' };
    if (typeof multimodal.stopConversation === 'function') return await multimodal.stopConversation();
    if (typeof multimodal.stopMultimodalConversation === 'function') return await multimodal.stopMultimodalConversation();
    return { success: false, error: 'Multimodal stop not implemented' };
  } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('multimodal-send-voice', async (_e, buffer, meta) => {
  try {
    const multimodal = global.serviceManager?.get?.('multimodal');
    if (!multimodal) return { success: false, error: 'Multimodal service not available' };
    if (typeof multimodal.sendVoice === 'function') return await multimodal.sendVoice(buffer, meta);
    if (typeof multimodal.multimodalSendVoice === 'function') return await multimodal.multimodalSendVoice(buffer, meta);
    return { success: false, error: 'sendVoice not implemented' };
  } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('send-audio-stream', async (_e, b64) => {
  try {
    const deepgram = global.serviceManager?.get?.('deepgram');
    if (deepgram && typeof deepgram.sendAudioToLive === 'function') {
      try { deepgram.sendAudioToLive(Buffer.from(b64, 'base64')); } catch (e) { return { success: false, error: String(e) }; }
      return { success: true };
    }
    return { success: false, error: 'Deepgram not available' };
  } catch (e) { return { success: false, error: e.message }; }
});

// ---- IPC CallCenter ----
ipcMain.handle('cc:listRoutes', async () => {
  try {
    if (!callCenter) return { success: false, error: 'CallCenter not initialized' };
    return { success: true, data: callCenter.listRoutes() };
  } catch (e) { return { success: false, error: e.message }; }
});

// ---- IPC: AI Gateway (EXPERIMENTAL) ----
ipcMain.handle('ai:listModels', async () => {
  try {
    if (!AIGateway) {
      return { success: false, error: 'AI Gateway experimental no disponible' };
    }
    const list = AIGateway.listModels();
    return { success: true, models: list };
  } catch (e) {
    console.error('[AI:ListModels] Error:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('ai:chat', async (_e, { provider, model, messages }) => {
  try {
    if (!AIGateway) {
      return { success: false, error: 'AI Gateway experimental no disponible' };
    }
    if (!provider || !model || !messages) {
      return { success: false, error: 'provider, model y messages son requeridos' };
    }
    const res = await AIGateway.chat({ provider, model, messages });
    return { success: true, text: res.text, raw: res.raw };
  } catch (e) {
    console.error('[AI:Chat] Error:', e);
    return { success: false, error: e.message };
  }
});

ipcMain.handle('cc:startByRole', async (_evt, { roleId, sessionId }) => {
  try {
    if (!callCenter) return { success: false, error: 'CallCenter not initialized' };
    const sid = sessionId || `cc_${Date.now()}`;
    const r = await callCenter.startByRole({ sessionId: sid, roleId });
    return { success: true, ...r };
  } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('cc:startByCampaign', async (_evt, { campaignId, sessionId }) => {
  try {
    if (!callCenter) return { success: false, error: 'CallCenter not initialized' };
    const sid = sessionId || `cc_${Date.now()}`;
    const r = await callCenter.startByCampaign({ sessionId: sid, campaignId });
    return { success: true, ...r };
  } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('cc:end', async (_evt, { sessionId }) => {
  try {
    if (!callCenter) return { success: false, error: 'CallCenter not initialized' };
    const r = await callCenter.end({ sessionId });
    return { success: true, ...r };
  } catch (e) { return { success: false, error: e.message }; }
});




// ============ IPC HANDLERS PARA MCP/QWEN ============
ipcMain.handle('mcp:call', async (_e, { tool, params }) => {
  try {
    if (!mcpServer || !mcpServer.tools[tool]) {
      return { success: false, error: `Tool not found: ${tool}` };
    }
    return await mcpServer.tools[tool](params || {});
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('mcp:listTools', async () => {
  if (!mcpServer) return { success: false, error: 'MCP not available' };
  return { success: true, tools: Object.keys(mcpServer.tools) };
});

ipcMain.handle('mcp:getPort', async () => {
  return { success: true, port: mcpServer?.MCP_PORT || 19875 };
});

// Memoria directa
ipcMain.handle('memory:list', async () => {
  if (!mcpServer) return { success: false, error: 'MCP not available' };
  return await mcpServer.tools.memory_list();
});

ipcMain.handle('memory:store', async (_e, { key, value, tags }) => {
  if (!mcpServer) return { success: false, error: 'MCP not available' };
  return await mcpServer.tools.memory_store({ key, value, tags });
});

ipcMain.handle('memory:get', async (_e, { key }) => {
  if (!mcpServer) return { success: false, error: 'MCP not available' };
  return await mcpServer.tools.memory_get({ key });
});

ipcMain.handle('memory:search', async (_e, { query }) => {
  if (!mcpServer) return { success: false, error: 'MCP not available' };
  return await mcpServer.tools.memory_search({ query });
});

// Archivos
ipcMain.handle('fs:read', async (_e, { filePath }) => {
  if (!mcpServer) return { success: false, error: 'MCP not available' };
  return await mcpServer.tools.read_file({ filePath });
});

ipcMain.handle('fs:write', async (_e, { filePath, content }) => {
  if (!mcpServer) return { success: false, error: 'MCP not available' };
  return await mcpServer.tools.write_file({ filePath, content });
});

ipcMain.handle('fs:list', async (_e, { dirPath }) => {
  if (!mcpServer) return { success: false, error: 'MCP not available' };
  return await mcpServer.tools.list_files({ dirPath });
});

// Comandos
ipcMain.handle('cmd:execute', async (_e, { command }) => {
  if (!mcpServer) return { success: false, error: 'MCP not available' };
  return await mcpServer.tools.execute_command({ command });
});

ipcMain.handle('code:execute', async (_e, { code, language }) => {
  if (!mcpServer) return { success: false, error: 'MCP not available' };
  return await mcpServer.tools.execute_code({ code, language });
});


// ============ CHAT SERVICE - HANDLER PARA TODOS LOS PROVEEDORES ============

// ============ AI MODELS & AUTO ORCHESTRATOR IPSs ============

ipcMain.handle('ai-models:show', async (_e, { modelId, width }) => {
  if (!aiModelsManager) return { success: false, error: 'AI Manager not initialized' };

  // Ocultar QWEN si está visible
  if (qwenBrowserView) {
    mainWindow.setBrowserView(null);
  }

  return aiModelsManager.showModel(modelId, width);
});

ipcMain.handle('ai-models:hide', async () => {
  if (!aiModelsManager) return { success: false, error: 'AI Manager not initialized' };
  return aiModelsManager.hideAll();
});

ipcMain.handle('ai-models:list', async () => {
  if (!aiModelsManager) return { success: false, error: 'AI Manager not initialized' };
  return { success: true, models: aiModelsManager.listModels() };
});

ipcMain.handle('auto:query', async (_e, { message }) => {
  if (!autoOrchestrator) return { success: false, error: 'Auto Orchestrator not initialized' };

  // Usar AI Models Manager y Chat Service
  return await autoOrchestrator.query(
    message,
    mcpUniversalClient,
    aiModelsManager,
    mainWindow
  );
});

ipcMain.handle('auto:getActiveQueries', async () => {
  if (!autoOrchestrator) return { success: false, error: 'AI Manager not initialized' };
  return { success: true, queries: autoOrchestrator.getActiveQueries() };
});

ipcMain.handle('chat:send', async (_e, { provider, message, role, model, options = {} }) => {
  // QWEN funciona a través del webview embebido en el HTML
  // El usuario chatea directamente en el panel QWEN, no desde aquí
  if (provider === 'qwen') {
    return { success: false, error: 'QWEN funciona en el panel embebido. Usa el botón QWEN para abrir el panel.' };
  }

  try {
    if (!chatService) {
      return { success: false, error: 'Chat Service no disponible' };
    }

    const apiKeys = {
      groq: process.env.GROQ_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY
    };

    if (!apiKeys[provider]) {
      return { success: false, error: `API Key no configurada para proveedor: ${provider}` };
    }

    // Preparar opciones con el modelo si se proporciona
    const chatOptions = { ...options };
    if (model) {
      chatOptions.model = model;
    }

    const result = await chatService.sendMessage(provider, message, role, apiKeys, chatOptions);

    console.log(`[Chat] ${provider}: ✅ Respuesta enviada (${(result.response || '').substring(0, 50)}...)`);

    return result;
  } catch (e) {
    console.error('[Chat:Send] Error:', e.message);
    return { success: false, error: e.message };
  }
});

// ============ SEND MESSAGE (compat: renderer expects 'send-message') ============
ipcMain.handle('send-message', async (_e, { message, role, mode = 'text' } = {}) => {
  try {
    const payload = {
      userId: 'studiolab',
      modelId: qwenState.model,
      role: role || 'user',
      mode,
      message: String(message || '')
    };

    const res = await fetch('http://localhost:8085/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    const content = data?.response || data?.text || data?.output?.text || '';

    if (mainWindow && content) {
      mainWindow.webContents.send('response-ready', { content, meta: { modelId: qwenState.model } });
    }

    return { success: res.ok, ...data, content };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ============ QWEN STATE / MODELOS ============
ipcMain.handle('qwen:getState', async () => {
  return { success: true, state: qwenState, models: QWEN_MODELS };
});

ipcMain.handle('qwen:getModels', async () => {
  return { success: true, models: QWEN_MODELS };
});

ipcMain.handle('qwen:getCurrentModel', async () => {
  const meta = getModelMeta(qwenState.model || DEFAULT_MODEL);
  return { success: true, model: meta.id, meta };
});

ipcMain.handle('qwen:updateTokens', async (_e, { tokens }) => {
  updateUsage(tokens || 0);
  return { success: true, tokens: qwenState.tokens || 0 };
});

ipcMain.handle('qwen:setModel', async (_e, { modelId, manual = true }) => {
  if (!modelId) return { success: false, error: 'modelId requerido' };
  setModel(modelId, !!manual);
  return { success: true, model: qwenState.model };
});

ipcMain.handle('qwen:setAutoMode', async (_e, { enabled }) => {
  qwenState.auto = !!enabled;
  saveQwenState(qwenState);
  emitStatus();
  return { success: true, auto: qwenState.auto };
});

ipcMain.handle('qwen:contextUsage', async (_e, { tokens }) => {
  updateUsage(tokens || 0);
  return { success: true };
});

// URL por defecto de QWEN
const QWEN_BASE_URL = 'https://chat.qwenlm.ai/'; // URL oficial de la web

ipcMain.handle('qwen:openPortal', async (_e, { url }) => {
  // QWEN se muestra embebido en el HTML, NO en ventana separada
  // Esta función solo retorna éxito para compatibilidad
  return { success: true, message: 'QWEN se muestra embebido en la interfaz' };
});

// ============ QWEN → MCP SERVER INTEGRATION ============
// Escuchar mensajes desde QWEN embebido y enviarlos al servidor MCP (pwa-imbf.onrender.com)
ipcMain.on('qwen-message', async (event, { message, context = {} }) => {
  try {
    console.log('[QWEN→MCP] 📤 Enviando mensaje de QWEN al servidor MCP...');

    const payload = {
      title: '💬 Propuesta de QWEN Embebido',
      description: message,
      context: {
        source: 'qwen-embedded-panel',
        timestamp: new Date().toISOString(),
        sessionId: context.sessionId || 'qwen-main',
        userId: context.userId || 'studiolab',
        ...context
      },
      files: []
    };

    // Enviar al servidor MCP en Render
    const mcpServerUrl = 'https://pwa-imbf.onrender.com/api/projects/realtime-voice-system/propose';
    const authToken = process.env.MCP_TOKEN || process.env.MCP_AUTH_TOKEN || 'default-token';

    const response = await fetch(mcpServerUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (response.ok) {
      console.log('[QWEN→MCP] ✅ Propuesta enviada exitosamente');
      console.log('[QWEN→MCP] Respuesta:', result);

      // QWEN ahora usa iframe embebido - no necesita mensajes IPC
    } else {
      throw new Error(`Servidor MCP retornó ${response.status}: ${result.message || 'Error desconocido'}`);
    }
  } catch (error) {
    console.error('[QWEN→MCP] ❌ Error enviando propuesta:', error.message);

    // QWEN ahora usa iframe embebido - no necesita mensajes IPC
  }
});

ipcMain.handle('qwen:login', async () => {
  // QWEN ahora se muestra embebido en el HTML, no en ventana separada
  return { success: true, message: 'QWEN se muestra embebido en la interfaz' };
});

// ============ QWEN3 EMBEDDED - USANDO BROWSERVIEW ============
// RAZÓN: chat.qwenlm.ai tiene X-Frame-Options: DENY
// Webview tags respetan X-Frame-Options, BrowserView no
// BrowserView es lo que usa VS Code internamente

// Función auxiliar para guardar cookies de Qwen
async function saveQwenCookies(qwenSession, cookiesPath) {
  try {
    const cookies = await qwenSession.cookies.get({});
    const cookiesData = cookies.map(cookie => ({
      url: cookie.url || `https://${cookie.domain}`,
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      expirationDate: cookie.expirationDate
    }));

    await fs.promises.writeFile(cookiesPath, JSON.stringify(cookiesData, null, 2));
    console.log(`[QWEN3] 💾 ${cookies.length} cookies guardadas en ${cookiesPath}`);
  } catch (e) {
    console.warn('[QWEN3] ⚠️ Error guardando cookies:', e.message);
  }
}

ipcMain.handle('qwen:toggle', async (_e, params) => {
  // Compatibilidad: puede recibir { show: boolean } o directamente boolean
  const show = typeof params === 'object' ? params.show : params;
  console.log('[QWEN3] Toggle BrowserView:', show ? 'SHOW' : 'HIDE');

  // Si mostramos Qwen, ocultamos otros modelos
  if (show && aiModelsManager) {
    aiModelsManager.hideAll();
  }

  if (!mainWindow || mainWindow.isDestroyed()) {
    console.error('[QWEN3] Ventana principal no disponible');
    return { success: false, error: 'Ventana no disponible' };
  }

  if (show) {
    // MOSTRAR QWEN3 BrowserView con SESIÓN PERSISTENTE
    if (!qwenBrowserView) {
      console.log('[QWEN3] Creando BrowserView para QWEN con sesión persistente...');

      // Obtener sesión persistente ANTES de crear BrowserView
      const { session } = require('electron');
      const qwenSession = session.fromPartition('persist:qwen3');

      qwenBrowserView = new BrowserView({
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: true,  // Seguridad habilitada
          allowRunningInsecureContent: false,
          enableRemoteModule: false,
          sandbox: true,  // Sandbox habilitado para seguridad
          session: qwenSession  // Asignar partición persistente (guarda cookies automáticamente)
        }
      });

      // NOTA: setIgnoreMouseEvents no está disponible en BrowserView.webContents
      // El BrowserView se mantiene visible mediante setBrowserView y bounds
      // La comunicación bidireccional se mantiene activa mediante los scripts inyectados
      console.log('[QWEN3] ✅ BrowserView creado - comunicación bidireccional activa');

      // Cargar cookies guardadas si existen
      const cookiesPath = path.join(app.getPath('userData'), 'qwen-cookies.json');
      try {
        if (fs.existsSync(cookiesPath)) {
          const cookiesData = await fs.promises.readFile(cookiesPath, 'utf8');
          const cookies = JSON.parse(cookiesData);
          console.log(`[QWEN3] 📦 Cargando ${cookies.length} cookies guardadas...`);

          for (const cookie of cookies) {
            try {
              await qwenSession.cookies.set({
                url: cookie.url || 'https://qwenlm.ai',
                name: cookie.name,
                value: cookie.value,
                domain: cookie.domain,
                path: cookie.path || '/',
                secure: cookie.secure !== false,
                httpOnly: cookie.httpOnly !== false,
                expirationDate: cookie.expirationDate
              });
            } catch (e) {
              // Ignorar errores de cookies inválidas
            }
          }
          console.log('[QWEN3] ✅ Cookies cargadas correctamente');
        }
      } catch (e) {
        console.warn('[QWEN3] ⚠️ Error cargando cookies:', e.message);
      }

      // CRÍTICO: Configurar handler de popups OAuth en BrowserView
      // Esto permite que los popups OAuth se abran correctamente con la URL web de Qwen
      qwenBrowserView.webContents.setWindowOpenHandler(({ url }) => {
        console.log('[QWEN3] Popup OAuth detectado:', url.substring(0, 50) + '...');

        // Detectar OAuth flows
        const isOAuthFlow = url.includes('accounts.google.com') ||
          url.includes('github.com/login') ||
          url.includes('oauth') ||
          url.includes('auth') ||
          url.includes('qwenlm.ai/auth') ||
          url.includes('qwen.ai/auth');

        if (isOAuthFlow) {
          console.log('[QWEN3] ✅ Permitiendo popup OAuth con sesión persistente');
          // Crear popup con la MISMA sesión persistente para compartir cookies
          const popup = new BrowserWindow({
            parent: mainWindow,
            modal: false,
            show: false,
            width: 600,
            height: 700,
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true,
              webSecurity: true,
              session: qwenSession  // MISMA sesión persistente - CRÍTICO para compartir cookies
            }
          });
          popup.loadURL(url);
          popup.once('ready-to-show', () => {
            popup.show();
            console.log('[QWEN3] ✅ Popup OAuth mostrado');
          });
          popup.on('closed', () => {
            console.log('[QWEN3] Popup OAuth cerrado');
            popup.destroy();
          });
          return { action: 'allow' };
        }

        // Bloquear otros popups
        console.log('[QWEN3] 🚫 Bloqueando popup no autorizado');
        return { action: 'deny' };
      });

      // URL CORRECTA: https://qwenlm.ai (redirige automáticamente a chat.qwenlm.ai)
      const qwenUrl = 'https://qwenlm.ai';
      qwenBrowserView.webContents.loadURL(qwenUrl);
      console.log(`[QWEN3] 🔄 Cargando ${qwenUrl}...`);

      // ============ INTERCEPTAR F12 EN BROWSERVIEW ============
      // Interceptar F12 directamente en el BrowserView para abrir DevTools
      // NOTA: Si Windows Calculator u otra app captura F12, este handler puede no ejecutarse
      qwenBrowserView.webContents.on('before-input-event', (event, input) => {
        // Si se presiona F12, abrir/cerrar DevTools
        if (input.key === 'F12' && input.type === 'keyDown') {
          event.preventDefault(); // Prevenir que llegue a la página
          event.stopImmediatePropagation(); // Detener propagación
          console.log('[QWEN F12] ✅ Interceptado en BrowserView, abriendo DevTools...');
          if (qwenBrowserView.webContents.isDevToolsOpened()) {
            qwenBrowserView.webContents.closeDevTools();
            console.log('[QWEN] 🔧 DevTools cerrado (F12 desde BrowserView)');
          } else {
            qwenBrowserView.webContents.openDevTools({ mode: 'detach' });
            console.log('[QWEN] 🔧 DevTools abierto (F12 desde BrowserView)');
          }
        }
      });

      // También interceptar en la ventana principal cuando QWEN tiene foco
      // Esto es un fallback si el BrowserView no captura el evento
      if (mainWindow) {
        mainWindow.webContents.on('before-input-event', (event, input) => {
          // Solo si QWEN está visible y activo
          if (qwenBrowserView && !qwenBrowserView.webContents.isDestroyed() &&
            mainWindow.getBrowserView() === qwenBrowserView) {
            if (input.key === 'F12' && input.type === 'keyDown') {
              event.preventDefault();
              event.stopImmediatePropagation();
              console.log('[Main F12] ✅ Evento F12 detectado en ventana principal, redirigiendo a QWEN...');
              if (qwenBrowserView.webContents.isDevToolsOpened()) {
                qwenBrowserView.webContents.closeDevTools();
                console.log('[QWEN] 🔧 DevTools cerrado (F12 desde main)');
              } else {
                qwenBrowserView.webContents.openDevTools({ mode: 'detach' });
                console.log('[QWEN] 🔧 DevTools abierto (F12 desde main)');
              }
            }
          }
        });
      }

      qwenBrowserView.webContents.on('did-finish-load', () => {
        console.log('[QWEN3] ✅ QWEN cargado exitosamente en BrowserView');

        // Guardar cookies después de cargar (por si hay nuevas)
        saveQwenCookies(qwenSession, cookiesPath).catch(e => {
          console.warn('[QWEN3] ⚠️ Error guardando cookies:', e.message);
        });

        // ============ CONFIGURAR INTERCEPTOR WEBSOCKET DE QWEN ============
        // Usar Chrome DevTools Protocol para capturar respuestas en BLOQUE
        // NO más DOM scraping que causa errores y captura letra por letra
        setTimeout(async () => {
          if (qwenBrowserView && !qwenBrowserView.webContents.isDestroyed()) {
            try {
              const result = await setupQwenWebSocketInterceptor(qwenBrowserView, mainWindow);
              if (result.success) {
                console.log('[QWEN3] ✅ WebSocket/Network Interceptor ACTIVO');
                console.log('[QWEN3] 📡 Capturando respuestas en BLOQUE (no letra por letra)');
              } else {
                console.log('[QWEN3] ⚠️ Interceptor no pudo iniciar:', result.error);
              }
            } catch (error) {
              console.error('[QWEN3] ⚠️ Error configurando interceptor:', error.message);
            }
          }
        }, 2000); // Esperar 2 segundos para que la página esté completamente cargada
      });

      qwenBrowserView.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        console.error('[QWEN3] ❌ Error cargando QWEN:', errorCode, errorDescription);
        console.error('[QWEN3] URL intentada:', validatedURL);
      });

      // PROTECCIÓN: Prevenir que el BrowserView se oculte accidentalmente
      qwenBrowserView.webContents.on('will-navigate', (event, url) => {
        console.log('[QWEN3] 🧭 Navegación detectada:', url.substring(0, 50));
        // Mantener comunicación activa durante navegaciones
        // El BrowserView se mantiene visible mediante setBrowserView en el código
      });

      // Guardar cookies periódicamente (cada 30 segundos) - LIMPIAR cuando se oculte
      if (qwenCookieInterval) clearInterval(qwenCookieInterval);
      qwenCookieInterval = setInterval(() => {
        if (qwenBrowserView && !qwenBrowserView.webContents.isDestroyed()) {
          saveQwenCookies(qwenSession, cookiesPath).catch(e => {
            // Silenciar errores en guardado automático
          });
        } else {
          // Si el BrowserView fue destruido, limpiar el intervalo
          if (qwenCookieInterval) {
            clearInterval(qwenCookieInterval);
            qwenCookieInterval = null;
          }
        }
      }, 30000);

      // Guardar cookies al navegar (después de login/verificación)
      qwenBrowserView.webContents.on('did-navigate', async (event, url) => {
        console.log('[QWEN3] 🧭 Navegado a:', url);

        // Si se redirige a login o verificación, esperar a que termine
        if (url.includes('/auth/login') || url.includes('/verify')) {
          console.log('[QWEN3] ⚠️ Redirección a login/verificación detectada');
        } else {
          // Guardar cookies después de navegar
          await saveQwenCookies(qwenSession, cookiesPath).catch(() => { });
        }
      });
    }

    // Asignar al mainWindow ANTES de configurar bounds
    mainWindow.setBrowserView(qwenBrowserView);

    // Función para actualizar posición y tamaño del BrowserView
    const updateQwenBounds = () => {
      if (!qwenBrowserView || qwenBrowserView.webContents.isDestroyed()) return;
      if (!mainWindow || mainWindow.isDestroyed()) return;

      try {
        // Obtener tamaño del contenido de la ventana (sin marcos de ventana)
        const [contentWidth, contentHeight] = mainWindow.getContentSize();

        // Panel lateral derecho ocupando 40% del ancho
        const panelWidth = Math.floor(contentWidth * 0.4);
        const panelX = contentWidth - panelWidth;  // Posición X: desde la derecha del área de contenido
        const panelY = 0;  // Posición Y: desde arriba del área de contenido (0 = sin offset)
        const panelHeight = contentHeight;  // Alto completo del área de contenido

        qwenBrowserView.setBounds({
          x: panelX,
          y: panelY,
          width: panelWidth,
          height: panelHeight
        });

        console.log(`[QWEN3] Panel posicionado: x=${panelX}, y=${panelY}, w=${panelWidth}, h=${panelHeight} (content: ${contentWidth}x${contentHeight})`);
      } catch (e) {
        console.error('[QWEN3] Error actualizando bounds:', e.message);
      }
    };

    // Configurar posición inicial (esperar un frame para que la ventana esté lista)
    setTimeout(() => {
      updateQwenBounds();
    }, 100);

    // Actualizar posición cuando cambie el tamaño de la ventana
    const resizeHandler = () => updateQwenBounds();
    mainWindow.on('resize', resizeHandler);

    // Guardar referencia al handler para poder removerlo después
    if (!qwenBrowserView._resizeHandler) {
      qwenBrowserView._resizeHandler = resizeHandler;
    }

    console.log('[QWEN3] ✅ BrowserView visible como panel lateral');

    // Emitir evento para actualizar UI en el renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('qwen:view-shown');
    }

    return { success: true, message: 'QWEN visible (panel lateral)' };

  } else {
    // OCULTAR QWEN3 BrowserView y guardar cookies antes de ocultar
    if (qwenBrowserView && !qwenBrowserView.webContents.isDestroyed()) {
      const qwenSession = qwenBrowserView.webContents.session;
      const cookiesPath = path.join(app.getPath('userData'), 'qwen-cookies.json');

      // LIMPIAR el intervalo de guardado de cookies
      if (qwenCookieInterval) {
        clearInterval(qwenCookieInterval);
        qwenCookieInterval = null;
        console.log('[QWEN3] Intervalo de cookies limpiado');
      }

      // Guardar cookies antes de ocultar
      await saveQwenCookies(qwenSession, cookiesPath).catch(e => {
        console.warn('[QWEN3] ⚠️ Error guardando cookies al ocultar:', e.message);
      });

      // Remover listener de resize si existe
      if (qwenBrowserView._resizeHandler && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.removeListener('resize', qwenBrowserView._resizeHandler);
        qwenBrowserView._resizeHandler = null;
      }

      // Remover el BrowserView de la ventana (esto lo oculta completamente)
      mainWindow.setBrowserView(null);

      // Detener interceptor WebSocket (reemplaza stopQwenResponseCapture)
      stopQwenInterceptor();

      console.log('[QWEN3] ✅ BrowserView oculto completamente (cookies guardadas, intervalo limpiado, interceptor detenido)');

      // Emitir evento para actualizar UI en el renderer
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('qwen:view-hidden');
      }
    } else if (qwenCookieInterval) {
      // Si el BrowserView ya fue destruido pero el intervalo aún existe, limpiarlo
      clearInterval(qwenCookieInterval);
      qwenCookieInterval = null;
      console.log('[QWEN3] Intervalo de cookies limpiado (BrowserView ya destruido)');

      // Emitir evento incluso si el BrowserView ya fue destruido
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('qwen:view-hidden');
      }
    }
    return { success: true, message: 'QWEN oculto' };
  }
});

// ============ QWEN: OBSERVER SIMPLIFICADO Y ROBUSTO ============
// Versión simplificada que garantiza funcionamiento sin bloqueos
function setupSimplifiedQwenObserver(browserView) {
  if (!browserView || browserView.webContents.isDestroyed()) return;

  const observerScript = `
    (function() {
      if (window.qwenObserverActive) return;
      window.qwenObserverActive = true;
      
      console.log('[QWEN Observer] ✅ Versión simplificada iniciada');
      
      window.qwenState = { lastText: '', lastHash: '', messageCount: 0 };
      
      function simpleHash(text) {
        if (!text) return '';
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
          hash = ((hash << 5) - hash) + text.charCodeAt(i);
          hash = hash & hash;
        }
        return hash.toString(36);
      }
      
      function extractLastMessage() {
        try {
          const selectors = ['[data-role="assistant"]', '[class*="assistant"]', '[class*="message"]'];
          let allTexts = [];
          
          for (const sel of selectors) {
            const elements = document.querySelectorAll(sel);
            elements.forEach(el => {
              if (el.tagName === 'BUTTON' || el.closest('button')) return;
              if (el.querySelector('button, input, textarea')) return;
              
              const text = (el.innerText || el.textContent || '').trim();
              if (text.length < 20) return;
              if (text.match(/^(copy|like|dislike|share|regenerate)$/i)) return;
              if (text.includes('El contenido generado')) return;
              
              allTexts.push({ text: text, rect: el.getBoundingClientRect() });
            });
          }
          
          allTexts.sort((a, b) => b.rect.top - a.rect.top);
          return allTexts.length > 0 ? allTexts[0].text : '';
        } catch (e) {
          return '';
        }
      }
      
      function detectCode(text) {
        if (!text) return { hasCode: false, blocks: [] };
        // Usar String.fromCharCode para backticks en regex
        const backtick = String.fromCharCode(96);
        const hasCode = new RegExp(backtick + backtick + backtick + '|' + backtick + '[^' + backtick + ']+' + backtick + '|Write-Host|Get-|Set-|function |def |class |import ').test(text);
        const blocks = [];
        const markdownPattern = new RegExp(backtick + backtick + backtick + '([\\\\w]+)?\\\\n([\\\\s\\\\S]*?)' + backtick + backtick + backtick, 'g');
        const markdownMatch = text.match(markdownPattern);
        if (markdownMatch) {
          markdownMatch.forEach(match => {
            const langPattern = new RegExp(backtick + backtick + backtick + '(\\\\w+)?');
            const codePattern = new RegExp(backtick + backtick + backtick + '[\\\\w]*\\\\n([\\\\s\\\\S]*?)' + backtick + backtick + backtick);
            const langMatch = match.match(langPattern);
            const codeMatch = match.match(codePattern);
            if (codeMatch) {
              blocks.push({
                code: codeMatch[1],
                language: langMatch ? langMatch[1] || 'text' : 'text',
                format: 'markdown'
              });
            }
          });
        }
        return { hasCode, blocks };
      }
      
      // Almacenar historial de mensajes para detectar nuevos
      window.qwenMessageHistory = window.qwenMessageHistory || [];
      
      function updateResponse() {
        const currentText = extractLastMessage();
        const currentHash = simpleHash(currentText);
        
        // Solo actualizar si el texto cambió Y es diferente al último mensaje del historial
        if (currentHash !== window.qwenState.lastHash && currentText.length > 0) {
          // Verificar si es un mensaje nuevo (no está en el historial)
          const isNewMessage = !window.qwenMessageHistory.some(msg => 
            msg.text === currentText || currentText.includes(msg.text) && currentText.length > msg.text.length * 1.5
          );
          
          // Si es un mensaje nuevo, agregarlo al historial
          if (isNewMessage && window.qwenMessageHistory.length > 0) {
            // Marcar mensaje anterior como completo
            const lastMsg = window.qwenMessageHistory[window.qwenMessageHistory.length - 1];
            if (lastMsg) {
              lastMsg.isComplete = true;
            }
          }
          
          window.qwenState.lastText = currentText;
          window.qwenState.lastHash = currentHash;
          window.qwenState.messageCount++;
          
          const codeInfo = detectCode(currentText);
          
          // Agregar al historial si es nuevo
          if (isNewMessage) {
            window.qwenMessageHistory.push({
              text: currentText,
              hash: currentHash,
              timestamp: Date.now(),
              isComplete: false
            });
            
            // Mantener solo los últimos 5 mensajes
            if (window.qwenMessageHistory.length > 5) {
              window.qwenMessageHistory.shift();
            }
          }
          
          window.qwenLastResponse = {
            text: currentText,
            fullText: currentText,
            state: 'complete',
            hasCode: codeInfo.hasCode,
            codeBlocks: codeInfo.blocks,
            timestamp: Date.now(),
            isNewMessage: isNewMessage  // Flag para indicar si es mensaje nuevo
          };
          
          console.log('[QWEN Observer] ✅ Actualizado:', currentText.substring(0, 50), codeInfo.hasCode ? '(código)' : '', isNewMessage ? '[NUEVO]' : '[ACTUALIZACIÓN]');
        }
      }
      
      const observer = new MutationObserver(updateResponse);
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      setInterval(updateResponse, 500);
      updateResponse();
      
      console.log('[QWEN Observer] ✅ Observador simplificado activo');
    })();
  `;

  browserView.webContents.executeJavaScript(observerScript).catch(err => {
    console.error('[QWEN] Error inyectando observer simplificado:', err);
  });
}

// Sistema de captura simplificado
function startSimplifiedQwenCapture() {
  if (qwenResponseInterval) return;

  let lastSentText = '';
  let lastSentHash = '';

  console.log('[QWEN Capture] 🚀 Iniciando captura simplificada...');

  qwenResponseInterval = setInterval(async () => {
    if (!qwenBrowserView || qwenBrowserView.webContents.isDestroyed()) {
      if (qwenResponseInterval) {
        clearInterval(qwenResponseInterval);
        qwenResponseInterval = null;
      }
      return;
    }

    try {
      const response = await qwenBrowserView.webContents.executeJavaScript(`
        (function() {
          return window.qwenLastResponse || { text: '', state: 'idle', hasCode: false, codeBlocks: [] };
        })();
      `);

      if (response && response.text && response.text.length > 0) {
        const currentHash = response.text.length.toString() + response.text.substring(0, 50);
        const isNewMessage = response.isNewMessage || false;

        // Solo enviar si es diferente Y (es mensaje nuevo O es actualización del mismo mensaje)
        if (currentHash !== lastSentHash && response.text !== lastSentText) {
          // Si es mensaje nuevo, resetear hash del último enviado
          if (isNewMessage) {
            lastSentHash = ''; // Reset para permitir nuevo mensaje
            console.log('[QWEN Capture] 🆕 NUEVO MENSAJE detectado');
          }

          lastSentText = response.text;
          lastSentHash = currentHash;

          console.log('[QWEN Capture] 📤 Enviando:', response.text.length, 'chars', response.hasCode ? '(código)' : '', isNewMessage ? '[NUEVO]' : '[ACTUALIZACIÓN]');

          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('qwen:response', {
              type: response.hasCode ? 'code' : 'text',
              content: response.text,
              state: response.state || 'complete',
              stream: false,
              isCode: response.hasCode,
              codeBlocks: response.codeBlocks || [],
              isNewMessage: isNewMessage  // Flag para el renderer
            });
          }
        }
      }
    } catch (err) {
      // Silenciar errores (página puede no estar lista aún)
    }
  }, 1000); // Verificar cada segundo
}

// ============ QWEN: COMUNICACIÓN BIDIRECCIONAL (MEJORADO V2) ============
function setupQwenBidirectionalCommunication(browserView) {
  if (!browserView || browserView.webContents.isDestroyed()) return;

  const communicationScript = `
    (function() {
      if (window.qwenBidirectionalSetup) return;
      window.qwenBidirectionalSetup = true;
      
      console.log('[QWEN Observer V2] 🚀 Iniciando sistema de captura MEJORADO...');

      // Estado global
      window.qwenState = {
        currentState: 'idle',
        lastResponse: '',
        lastResponseText: '',
        lastUserMessage: '',
        responseStartTime: 0,
        lastChangeTime: 0,
        images: [],
        videos: [],
        audio: [],
        messageCount: 0
      };

      // Función MEJORADA para extraer bloques de código con formato
      function extractCodeBlocks(element) {
        const codeBlocks = [];
        try {
          // Buscar bloques de código en el elemento (ampliado)
          const codeElements = element.querySelectorAll('pre code, pre, [class*="code"], [class*="syntax"], [class*="highlight"], [data-language]');
          
          codeElements.forEach(codeEl => {
            const codeText = codeEl.textContent || codeEl.innerText || '';
            if (!codeText.trim()) return;
            
            // Detectar lenguaje con múltiples estrategias
            let language = 'text';
            
            // Estrategia 1: Atributo data-language (QWEN lo usa)
            if (codeEl.dataset.language) {
              language = codeEl.dataset.language.toLowerCase();
            } 
            // Estrategia 2: Clases CSS
            else {
              const classList = Array.from(codeEl.classList);
              const parentPre = codeEl.closest('pre');
              const parentClassList = parentPre ? Array.from(parentPre.classList) : [];
              
              // Buscar lenguaje en clases
              const langMatch = [...classList, ...parentClassList].find(cls => 
                cls.includes('language-') || cls.includes('lang-') || 
                cls.match(/^(javascript|js|python|py|powershell|ps1|bash|shell|sh|html|css|json|xml|sql|typescript|ts|java|cpp|c\\+\\+|csharp|cs|go|rust|php|ruby|rb|swift|kotlin|kt)$/i)
              );
              
              if (langMatch) {
                language = langMatch.replace(/^(language-|lang-)/i, '').toLowerCase()
                  .replace('js', 'javascript')
                  .replace('py', 'python')
                  .replace('ps1', 'powershell')
                  .replace('sh', 'shell')
                  .replace('ts', 'typescript')
                  .replace('cs', 'csharp')
                  .replace('rb', 'ruby')
                  .replace('kt', 'kotlin')
                  .replace('c++', 'cpp');
              }
            }
            
            // Estrategia 3: Detectar lenguaje por contenido si no se encontró
            if (language === 'text') {
              // JavaScript/TypeScript
              if (codeText.match(/\\b(const|let|var|function|=>|async|await|import|export|class|extends)\\b/)) {
                language = codeText.includes('interface ') || codeText.includes(': string') || codeText.includes(': number') ? 'typescript' : 'javascript';
              }
              // Python
              else if (codeText.match(/\\b(def |class |import |from |print\\(|if __name__|elif |except:|finally:|with )\\b/)) {
                language = 'python';
              }
              // PowerShell (MEJORADO - más patrones)
              else if (codeText.match(/\\$[A-Za-z]|Get-|Set-|New-|Write-Host|Write-Output|Stop-Process|Start-Process|Remove-Item|Test-Path|-eq|-ne|-gt|-lt|-like|-match|\\$processesToKill|\\$processes|\\$ErrorActionPreference|# SCRIPT|# Compatible con Windows/)) {
                language = 'powershell';
              }
              // PowerShell también por comentarios característicos
              else if (codeText.match(/^#.*SCRIPT.*\\n|^#.*Compatible con Windows/i)) {
                language = 'powershell';
              }
              // Bash/Shell
              else if (codeText.match(/^#!/) || codeText.match(/\\b(echo |cd |ls |grep |sed |awk |chmod |sudo )\\b/)) {
                language = 'bash';
              }
              // HTML
              else if (codeText.match(/<\\/?[a-z][\\s\\S]*>/i)) {
                language = 'html';
              }
              // CSS
              else if (codeText.match(/\\{[^}]*:[^}]*\\}/) && codeText.match(/[#.]\\w+|^\\w+\\s*\\{/m)) {
                language = 'css';
              }
              // JSON
              else if (codeText.trim().match(/^[\\[\\{]/) && codeText.trim().match(/[\\]\\}]$/)) {
                try {
                  JSON.parse(codeText);
                  language = 'json';
                } catch (e) {}
              }
            }
            
            // Detectar si es markdown (triple backticks con lenguaje)
            const backtick = String.fromCharCode(96);
            const markdownPattern = new RegExp('^' + backtick + backtick + backtick + '(\\w+)?\\n([\\s\\S]*?)' + backtick + backtick + backtick + '$', 'm');
            const markdownMatch = codeText.match(markdownPattern);
            if (markdownMatch) {
              language = markdownMatch[1] || language;
              codeBlocks.push({
                code: markdownMatch[2],
                language: language,
                format: 'markdown',
                raw: codeText
              });
            } else {
              codeBlocks.push({
                code: codeText,
                language: language,
                format: 'raw',
                raw: codeText
              });
            }
          });
          
          // También buscar bloques de código inline en el texto (backticks simples)
          if (codeBlocks.length === 0) {
            const backtick = String.fromCharCode(96);
            const inlinePattern = new RegExp(backtick + '([^' + backtick + ']+)' + backtick, 'g');
            const text = element.textContent || '';
            let match;
            while ((match = inlinePattern.exec(text)) !== null) {
              if (match[1] && match[1].length > 3) { // Solo código inline significativo
                codeBlocks.push({
                  code: match[1],
                  language: 'inline',
                  format: 'inline',
                  raw: match[0]
                });
              }
            }
          }
          
        } catch (e) {
          console.error('[QWEN Code Extract] Error:', e);
        }
        return codeBlocks;
      }

      // Función para extraer el ÚLTIMO mensaje del asistente (VERSIÓN MEJORADA PARA QWEN)
      function extractLastAssistantMessage() {
        try {
          // BLACKLIST COMPLETA de textos de UI de QWEN (EXPANDIDA)
          const UI_EXACT_MATCHES = [
            // Botones de QWEN
            'pensamiento', 'buscar', 'edición de imagen', 'desarrollo web',
            'generación de imágenes', 'generación de video', 'artefactos',
            'thinking', 'search', 'image editing', 'web development',
            'image generation', 'video generation', 'artifacts',
            // Textos exactos de botones mágicos (añadidos según plan)
            'Edición de imagen',
            'desarrollo web',
            'Generación de imágenes',
            'Generación de Video',
            'Artefactos',
            // Acciones y botones (EXPANDIDO)
            'copy', 'like', 'dislike', 'regenerate', 'share', 'edit', 'delete',
            'copiar', 'me gusta', 'no me gusta', 'regenerar', 'compartir', 'editar', 'eliminar',
            '[image:', '[image]', 'image:', 'img.alicdn.com', 'alicdn.com',
            // Saludos/UI
            '¿cómo puedo ayudarte hoy?', '¿cómo puedo ayudarte', 
            '¿en qué puedo ayudarte?', 'how can i help',
            'qwen3-max', 'qwen3', 'qwen', 'qwen-max', 'qwen-turbo',
            'buenos días', 'buenas tardes', 'buenas noches',
            'hola, cley', 'hola cley',
            // Disclaimers
            'el contenido generado por ia puede no ser preciso',
            'ai-generated content may not be accurate',
            'contenido generado', 'generated content',
            // Emojis comunes de UI
            '✨', '🌟', '☀️', '🔍', '📝', '🎬', '🖼️', '⚡', '🌐',
            // Navegación
            'nuevo chat', 'new chat', 'historial', 'history', 'ajustes', 'settings',
            'perfil', 'profile', 'cerrar sesión', 'logout', 'sign out',
            // Chips/Tags
            'chip', 'tag', 'badge', 'label'
          ];
          
          // ============ FILTROS DE LIMPIEZA AVANZADOS (Pipeline QWEN + Claude) ============
          const NOISE_PATTERNS = [
            // URLs (PRIORIDAD ALTA - eliminar primero) - MEJORADOS según plan
            /https?:\\/\\/[^\\s]+/gi,           // URLs completas (incluye alicdn.com)
            /www\\.[^\\s]+/gi,                   // URLs sin protocolo
            /img\\.alicdn\\.com[^\\s\)\\]]+/gi,       // URLs específicas de Alibaba (más completo)
            /https?:\\/\\/img\\.alicdn\\.com[^\\s\)\\]]+/gi,  // URLs completas de Alibaba
            /\\[IMAGE:\\s*[^\\]]+\\]/gi,             // [IMAGE: url] tags con espacios
            /\\[IMAGE\\]/gi,                     // [IMAGE] tags sueltos
            /IMAGE:\\s*https?:\\/\\/[^\\s]+/gi,       // IMAGE: url (sin corchetes)
            
            // Botones y acciones de QWEN
            /\\b(Copy|Like|Dislike|Share|Regenerate|Edit|Delete)\\b/gi,  // Botones de acción
            /\\b(Copiar|Me gusta|No me gusta|Compartir|Regenerar|Editar|Eliminar)\\b/gi,  // Botones en español
            
            // HTML y atributos
            /\\[.*?\\]/g,                        // [botones], [iconos], etc.
            /data-[\\w-]+="[^"]*"/gi,           // atributos data-*
            /class="[^"]*"/gi,                  // clases CSS
            /aria-[\\w-]+="[^"]*"/gi,           // accesibilidad
            /<[^>]+>/g,                         // HTML tags residuales
            /\\{[^}]*\\}/g,                      // JSON residual
            /style="[^"]*"/gi,                  // estilos inline
            /id="[^"]*"/gi,                     // IDs
            /onclick="[^"]*"/gi,                // eventos
            
            // Caracteres especiales
            /&nbsp;/gi,                         // espacios HTML
            /&[a-z]+;/gi,                       // entidades HTML
            /\\\\n|\\\\r|\\\\t/g,                    // escapes de línea
            /^\\s*[-•●○▪▸►]\\s*/gm,              // bullets de lista
            /\\s{3,}/g,                          // 3+ espacios → uno
            
            // Timestamps y fechas
            /\\d{1,2}:\\d{2}\\s*(AM|PM|am|pm)?\\s*\\.?/g,  // Timestamps (3:51 AM)
            /\\d{1,2}\\/\\d{1,2}\\/\\d{2,4}/g,    // Fechas (12/30/2024)
            /^\\s*\\.\\s*/gm,                     // Puntos sueltos al inicio
          ];
          
          // Función para limpiar texto de UI (MEJORADA)
          function cleanUIText(text) {
            if (!text) return '';
            
            let cleaned = text;
            
            // Paso 1: Aplicar todos los patrones de ruido
            for (const pattern of NOISE_PATTERNS) {
              cleaned = cleaned.replace(pattern, ' ');
            }
            
            // Paso 2: Eliminar coincidencias exactas de UI (case-insensitive)
            let lowerCleaned = cleaned.toLowerCase();
            for (const ui of UI_EXACT_MATCHES) {
              const uiLower = ui.toLowerCase();
              while (lowerCleaned.includes(uiLower)) {
                const idx = lowerCleaned.indexOf(uiLower);
                cleaned = cleaned.substring(0, idx) + cleaned.substring(idx + ui.length);
                lowerCleaned = cleaned.toLowerCase();
              }
            }
            
            // Paso 3: Normalizar espacios y líneas
            cleaned = cleaned
              .replace(/\\n{3,}/g, '\\n\\n')       // Máximo 2 saltos de línea
              .replace(/\\s{2,}/g, ' ')            // Espacios múltiples → uno
              .replace(/^\\s+|\\s+$/gm, '')        // Trim cada línea
              .trim();
            
            // Paso 4: Filtrar líneas muy cortas o sospechosas (MEJORADO según plan)
            const lines = cleaned.split('\\n').filter(line => {
              const trimmed = line.trim();
              if (!trimmed) return false;
              if (trimmed.length < 5) return false;
              
              // Descartar líneas que son solo URLs o tags de imagen (según plan)
              if (/^\\[IMAGE:/.test(trimmed)) return false;
              if (/^IMAGE:/.test(trimmed)) return false;
              if (/img\\.alicdn\\.com/.test(trimmed)) return false;
              if (/^https?:\\/\\/img\\.alicdn\\.com/.test(trimmed)) return false;
              
              // Descartar líneas que son solo emojis
              if (/^[\\p{Emoji}\\s]+$/u.test(trimmed)) return false;
              
              // Descartar líneas que parecen botones (expandido)
              const buttonPattern = /^(copy|like|dislike|share|regenerate|edit|delete|copiar|me gusta|no me gusta|compartir|regenerar|editar|eliminar)$/i;
              if (buttonPattern.test(trimmed)) return false;
              
              // Descartar líneas que contienen URLs de imágenes
              if (/https?:\\/\\//i.test(trimmed) || /img\\.alicdn\\.com/i.test(trimmed) || /\\[IMAGE:/i.test(trimmed)) return false;
              
              // Descartar líneas que son solo URLs
              if (/^https?:\\/\\/[^\\s]+$/i.test(trimmed)) return false;
              
              return true;
            });
            
            return lines.join(' ').trim();
          }
          
          // Función para detectar si es texto de UI (botones/menús) - MEJORADA según plan
          function isPureUIElement(el) {
            // Si es un botón, es UI
            if (el.tagName === 'BUTTON') return true;
            // Si tiene role de botón/navegación, es UI
            const role = el.getAttribute('role');
            if (role && ['button', 'navigation', 'menu', 'menuitem', 'tab', 'tablist'].includes(role)) return true;
            // Si tiene onclick o es clickeable, probablemente es UI
            if (el.onclick || el.getAttribute('onclick')) return true;
            // Si su clase indica que es UI
            const cls = (el.className || '').toLowerCase();
            if (cls.includes('btn') || cls.includes('button') || cls.includes('nav') || 
                cls.includes('toolbar') || cls.includes('menu') || cls.includes('chip') ||
                cls.includes('tag') || cls.includes('badge')) return true;
            
            // NUEVO: Detectar botones mágicos usando selectores de QWEN_BUTTONS (según plan)
            const magicButtonSelectors = 'button[aria-label*="video" i], button[aria-label*="imagen" i], button[aria-label*="artefacto" i], button[aria-label*="edición" i], button[aria-label*="web" i], [class*="chip"], [class*="tag"]';
            const magicButtons = el.querySelectorAll(magicButtonSelectors);
            if (magicButtons.length > 0) return true; // Es un contenedor de botones mágicos
            
            return false;
          }
          
          // ESTRATEGIA 1: Buscar el último mensaje del asistente por estructura
          // QWEN usa divs con data-role o clases específicas
          const assistantSelectors = [
            '[data-role="assistant"]',
            '[data-message-role="assistant"]',
            '[class*="assistant"]',
            '[class*="bot-response"]',
            '[class*="ai-message"]',
            '[class*="response-content"]',
            '[class*="markdown-body"]',
            '[class*="prose"]'
          ];
          
          let allMessages = [];
          
          for (const selector of assistantSelectors) {
            try {
              const elements = document.querySelectorAll(selector);
              elements.forEach(el => {
                if (isPureUIElement(el)) return;
                if (el.querySelector('textarea, input[type="text"]')) return;
                
                // IGNORAR elementos que contienen imágenes o botones de acción
                const hasImages = el.querySelector('img[src*="alicdn"], img[src*="http"]');
                const hasActionButtons = el.querySelector('button, [role="button"]');
                if (hasImages || hasActionButtons) return;
                
                const rawText = (el.innerText || '').trim();
                
                // Verificar que el texto no sea solo URLs o botones
                if (/^https?:\\/\\//i.test(rawText) || /^\\s*(copy|like|dislike|share|regenerate|edit|delete)\\s*$/i.test(rawText)) return;
                
                // NUEVO: Extraer bloques de código antes de limpiar
                const codeBlocks = extractCodeBlocks(el);
                const hasCode = codeBlocks.length > 0;
                
                const cleanedText = cleanUIText(rawText);
                
                // Validación final: asegurar que NO es principalmente botones mágicos (según plan)
                const magicButtonTexts = [
                  'edición de imagen', 'desarrollo web', 'generación de imágenes',
                  'generación de video', 'artefactos', 'image editing', 'web development',
                  'image generation', 'video generation', 'artifacts'
                ];
                const lowerCleaned = cleanedText.toLowerCase();
                const isMostlyMagicButtons = magicButtonTexts.some(btnText => {
                  return lowerCleaned.includes(btnText.toLowerCase()) && 
                         cleanedText.length < 200; // Si es corto y contiene botón mágico, ignorar
                });
                if (isMostlyMagicButtons) return; // Ignorar este mensaje
                
                // Solo considerar si tiene contenido real después de limpiar O tiene código
                if (cleanedText.length > 30 || hasCode) {
                  allMessages.push({
                    text: cleanedText,
                    raw: rawText,
                    element: el,
                    rect: el.getBoundingClientRect(),
                    codeBlocks: codeBlocks,  // NUEVO: incluir bloques de código
                    hasCode: hasCode  // NUEVO: flag de código
                  });
                }
              });
            } catch (e) {}
          }
          
          // ESTRATEGIA 2: Si no encontramos con selectores específicos, buscar en main
          // MEJORADO: Más estricto para evitar capturar botones y UI
          if (allMessages.length === 0) {
            const mainContent = document.querySelector('main') || document.body;
            const allDivs = mainContent.querySelectorAll('div');
            
            allDivs.forEach(div => {
              // FILTROS ESTRICTOS: Ignorar cualquier cosa que parezca UI
              if (isPureUIElement(div)) return;
              if (div.querySelector('textarea, input[type="text"]')) return;
              if (div.offsetHeight < 30) return;
              
              // Verificar que no sea un contenedor de UI (muchos botones hijos)
              const buttons = div.querySelectorAll('button, [role="button"], [class*="btn"], [class*="button"]');
              if (buttons.length > 0) return; // CAMBIO: Si tiene CUALQUIER botón, ignorar
              
              // Verificar que no tenga chips, tags, badges (UI de QWEN)
              const chips = div.querySelectorAll('[class*="chip"], [class*="tag"], [class*="badge"]');
              if (chips.length > 0) return;
              
              // Verificar que no sea un toolbar o menú
              const cls = (div.className || '').toLowerCase();
              if (cls.includes('toolbar') || cls.includes('menu') || cls.includes('nav') || 
                  cls.includes('header') || cls.includes('footer') || cls.includes('sidebar')) return;
              
              // Verificar que el texto no sea solo nombres de botones
              const rawText = (div.innerText || '').trim();
              const lowerText = rawText.toLowerCase();
              
              // Ignorar si el texto contiene solo nombres de botones conocidos
              const buttonNames = ['video', 'imagen', 'artefacto', 'edición', 'web', 'pensamiento', 'buscar',
                                   'copy', 'like', 'dislike', 'share', 'regenerate', 'edit', 'delete'];
              const isOnlyButtonNames = buttonNames.some(btn => {
                // Verificar si el texto es solo el nombre del botón (case-insensitive)
                const trimmed = rawText.trim().toLowerCase();
                const btnLower = btn.toLowerCase();
                return trimmed === btnLower;
              });
              if (isOnlyButtonNames) return;
              
              // NUEVO: Extraer bloques de código antes de limpiar
              const codeBlocks = extractCodeBlocks(div);
              const hasCode = codeBlocks.length > 0;
              
              const cleanedText = cleanUIText(rawText);
              
              // Validación final: asegurar que NO es principalmente botones mágicos (según plan)
              const magicButtonTexts = [
                'edición de imagen', 'desarrollo web', 'generación de imágenes',
                'generación de video', 'artefactos', 'image editing', 'web development',
                'image generation', 'video generation', 'artifacts'
              ];
              const lowerCleaned = cleanedText.toLowerCase();
              const isMostlyMagicButtons = magicButtonTexts.some(btnText => {
                return lowerCleaned.includes(btnText.toLowerCase()) && 
                       cleanedText.length < 200; // Si es corto y contiene botón mágico, ignorar
              });
              if (isMostlyMagicButtons) return; // Ignorar este mensaje
              
              // Solo mensajes con contenido sustancial Y que no sean solo UI O tiene código
              if ((cleanedText.length > 50 && cleanedText.split(' ').length > 10) || hasCode) {
                // Verificar que no sea principalmente texto de UI después de limpiar
                const uiWords = ['generación', 'video', 'imagen', 'artefacto', 'edición', 'web', 
                                'pensamiento', 'buscar', 'copy', 'like', 'dislike'];
                const uiWordCount = uiWords.filter(word => lowerText.includes(word)).length;
                if (uiWordCount > 3 && !hasCode) return; // Si tiene más de 3 palabras de UI y NO tiene código, ignorar
                
                allMessages.push({
                  text: cleanedText,
                  raw: rawText,
                  element: div,
                  rect: div.getBoundingClientRect(),
                  codeBlocks: codeBlocks,  // NUEVO: incluir bloques de código
                  hasCode: hasCode  // NUEVO: flag de código
                });
              }
            });
          }
          
          // Ordenar por posición Y (más abajo = más reciente)
          allMessages.sort((a, b) => b.rect.top - a.rect.top);
          
          // Tomar el mensaje más reciente (más abajo en la página)
          if (allMessages.length > 0) {
            const lastMessage = allMessages[0];
            const messageText = lastMessage.text;
            
            // NUEVO: Si tiene código, incluir información de código en el estado global
            if (lastMessage.hasCode && lastMessage.codeBlocks && lastMessage.codeBlocks.length > 0) {
              window.qwenState.lastCodeBlocks = lastMessage.codeBlocks;
              window.qwenState.hasCode = true;
              console.log('[QWEN Observer V3] 💻 Código detectado:', lastMessage.codeBlocks.length, 'bloques');
            } else {
              window.qwenState.lastCodeBlocks = [];
              window.qwenState.hasCode = false;
            }
            
            console.log('[QWEN Observer V3] ✅ Mensaje limpio:', messageText.substring(0, 100) + '...');
            return messageText;
          }
          
          return '';
        } catch (e) {
          console.error('[QWEN Observer V2] Error:', e);
          return '';
        }
      }

      // Detectar si QWEN está pensando/generando
      function isThinking() {
        const bodyText = (document.body.innerText || '').toLowerCase();
        // Buscar indicadores de carga
        const loadingIndicators = document.querySelectorAll('[class*="loading"], [class*="spinner"], [class*="thinking"], [class*="generating"]');
        if (loadingIndicators.length > 0) {
          for (const ind of loadingIndicators) {
            if (ind.offsetParent !== null) return true;
          }
        }
        // Buscar texto de "pensando"
        if (bodyText.includes('pensando') || bodyText.includes('thinking')) {
          return true;
        }
        return false;
      }

      // Detectar si QWEN está ejecutando código (MEJORADO según plan)
      function isExecutingCode() {
        // Buscar bloques de código con indicadores de ejecución más específicos
        const codeBlocks = document.querySelectorAll('pre code, [class*="code-block"], [class*="syntax-highlight"], [class*="code"]');
        if (codeBlocks.length > 0) {
          // Verificar si hay indicadores de ejecución
          const hasExecution = Array.from(codeBlocks).some(block => {
            const text = block.textContent || '';
            const parent = block.closest('pre, div, section');
            const parentText = parent ? parent.textContent : '';
            
            // Indicadores más específicos de ejecución
            return text.includes('>>>') || text.includes('$') || 
                   text.includes('Running') || text.includes('Executing') ||
                   text.includes('Output:') || text.includes('Result:') ||
                   text.includes('Error:') || text.includes('Warning:') ||
                   parentText.includes('Ejecutando') || parentText.includes('Running');
          });
          if (hasExecution) return true;
        }
        
        // Buscar en mensajes del asistente con bloques de código
        const assistantMessages = document.querySelectorAll('[data-role="assistant"], [class*="assistant"]');
        for (const msg of assistantMessages) {
          const text = msg.textContent || '';
          // Detectar bloques de código markdown con indicadores de ejecución
          // Usar String.fromCharCode para evitar problemas con backticks en template literal
          const backtick = String.fromCharCode(96); // backtick character
          const codeBlockPattern = new RegExp(backtick + backtick + backtick + '[\\s\\S]*?' + backtick + backtick + backtick);
          if (codeBlockPattern.test(text) && (text.includes('>>>') || text.includes('$') || 
              text.includes('Output:') || text.includes('Result:'))) {
            return true;
          }
        }
        
        // Buscar indicadores de ejecución en el texto general
        const bodyText = document.body.innerText || '';
        if (bodyText.includes('Ejecutando') || bodyText.includes('Running') ||
            bodyText.includes('>>>') || bodyText.match(/\\$\\s+\\w+/) ||
            bodyText.includes('Output:') || bodyText.includes('Result:')) {
          return true;
        }
        
        return false;
      }

      // Extraer media (FILTRADO: solo imágenes locales, NO alicdn.com)
      function extractMedia() {
        const media = { images: [], videos: [], audio: [] };
        try {
          document.querySelectorAll('img[src]').forEach(img => {
            if (img.src && !img.src.startsWith('data:') && img.width > 100) {
              // FILTRAR imágenes de Alibaba/alicdn.com
              if (!img.src.includes('alicdn.com') && !img.src.includes('alibaba')) {
              media.images.push(img.src);
              } else {
                console.log('[QWEN Observer] 🚫 Imagen de Alibaba filtrada:', img.src.substring(0, 50));
              }
            }
          });
          document.querySelectorAll('video[src], video source[src]').forEach(v => {
            const src = v.src || v.getAttribute('src');
            if (src && !src.includes('alicdn.com') && !src.includes('alibaba')) {
              media.videos.push(src);
            }
          });
          document.querySelectorAll('audio[src], audio source[src]').forEach(a => {
            const src = a.src || a.getAttribute('src');
            if (src && !src.includes('alicdn.com') && !src.includes('alibaba')) {
              media.audio.push(src);
            }
          });
        } catch (e) {}
        return media;
      }

      // Actualizar estado global con eventos de debug
      function updateState(state, text) {
        const media = extractMedia();
        window.qwenState.currentState = state;
        window.qwenState.lastResponseText = text || '';
        window.qwenState.lastChangeTime = Date.now();
        window.qwenState.images = media.images;
        window.qwenState.videos = media.videos;
        window.qwenState.audio = media.audio;
        
        // Detectar bloques de código en el estado actual
        const codeBlocks = window.qwenState.lastCodeBlocks || [];
        const hasCode = window.qwenState.hasCode || false;
        
        window.qwenLastResponse = {
          text: text || '',
          state: state,
          images: media.images,
          videos: media.videos,
          audio: media.audio,
          timestamp: Date.now(),
          codeBlocks: codeBlocks,  // Incluir bloques de código
          hasCode: hasCode  // Flag de código
        };
        
        // Emitir evento para el monitor de debug
        if (window.qwenObserverDebug) {
          window.qwenObserverDebug({
            type: 'state_change',
            state: state,
            text: text,
            hasCode: hasCode,
            codeBlockCount: codeBlocks.length,
            mediaCount: media.images.length + media.videos.length + media.audio.length
          });
        }
        
        console.log('[QWEN Observer V2] Estado:', state, '- Texto:', (text || '').substring(0, 50) + '...');
      }

      // Observador principal con STREAMING en tiempo real y detección de estabilidad
      let lastText = '';
      let lastTextHash = '';
      let stableCount = 0;
      let thinkingStartTime = 0;
      let isFirstMessage = true;
      let firstMessageRetries = 0;
      let streamBuffer = '';  // Buffer para acumular el stream
      let lastStreamPosition = 0;  // Última posición enviada
      let isStreaming = false;  // Flag para saber si estamos en modo stream
      let streamStartTime = 0;  // Tiempo de inicio del stream
      let lastChunkTime = 0;  // Tiempo del último chunk enviado
      
      // NUEVO: Sistema de estabilidad para código (MEJORADO - menos restrictivo)
      let codeStability = {
        lastCodeText: '',
        lastCodeHash: '',
        stableSince: 0,
        isStable: false,
        stabilityThreshold: 500,  // REDUCIDO: 500ms sin cambios = estable (antes 2000ms)
        unstableCount: 0,  // Contador de cambios rápidos (QWEN editando)
        lastUpdateTime: 0  // Última vez que se actualizó
      };
      
      // Función simple para generar hash (idempotencia)
      function simpleHash(text) {
        if (!text) return '';
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
          const char = text.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        return hash.toString(36);
      }
      
      // NUEVA función para detectar si QWEN está realmente pensando o atascado
      function isReallyThinking() {
        // Buscar indicadores visuales de pensamiento activo
        const indicators = [
          '[class*="loading"]',
          '[class*="spinner"]', 
          '[class*="thinking"]',
          '[class*="generating"]',
          '.dots-loader',
          '.typing-indicator'
        ];
        
        for (const selector of indicators) {
          const elements = document.querySelectorAll(selector);
          for (const el of elements) {
            // Verificar que el elemento es visible
            if (el.offsetParent !== null && el.offsetWidth > 0 && el.offsetHeight > 0) {
              // Verificar si tiene animación activa
              const style = window.getComputedStyle(el);
              if (style.animationName !== 'none' || style.animation !== 'none') {
                return true;
              }
            }
          }
        }
        
        // También verificar por texto de "thinking" pero solo si es visible
        const textElements = Array.from(document.querySelectorAll('*')).filter(el => {
          const text = (el.textContent || '').toLowerCase();
          return (text === 'thinking' || text === 'pensando' || text === 'generando...' || text === 'generating...') &&
                 el.offsetParent !== null;
        });
        
        return textElements.length > 0;
      }
      
      const checkForChanges = () => {
        const thinking = isReallyThinking();
        const executingCode = isExecutingCode();
        const currentText = extractLastAssistantMessage();
        const currentHash = simpleHash(currentText);
        const now = Date.now();
        
        // ========= DETECCIÓN DE CÓDIGO Y ESTABILIDAD (MEJORADO) =========
        // Primero, detectar si hay código en el mensaje actual
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = currentText;
        const currentCodeBlocks = extractCodeBlocks(tempDiv);
        const hasCodeNow = currentCodeBlocks.length > 0 || executingCode;
        
        // Si hay código, verificar estabilidad (PERO permitir streaming progresivo)
        if (hasCodeNow && currentText) {
          const currentCodeText = currentCodeBlocks.map(b => b.code).join('\n\n');
          const currentCodeHash = simpleHash(currentCodeText);
          
          // Si el código cambió, resetear contador de estabilidad
          if (currentCodeHash !== codeStability.lastCodeHash) {
            codeStability.lastCodeText = currentCodeText;
            codeStability.lastCodeHash = currentCodeHash;
            codeStability.stableSince = now;
            codeStability.isStable = false;
            codeStability.unstableCount++;
            codeStability.lastUpdateTime = now;
            
            // Solo bloquear si hay MUCHOS cambios MUY rápidos (QWEN editando activamente)
            // Pero permitir streaming normal
            if (codeStability.unstableCount > 5 && (now - codeStability.lastUpdateTime) < 200) {
              console.log('[QWEN Observer] ⚠️ Código muy inestable (QWEN editando activamente), esperando...');
              // NO retornar aquí - permitir que continúe con streaming
            }
          } else {
            // Código no cambió, verificar si ya está estable
            const timeSinceLastChange = now - codeStability.stableSince;
            if (timeSinceLastChange >= codeStability.stabilityThreshold) {
              if (!codeStability.isStable) {
                codeStability.isStable = true;
                codeStability.unstableCount = 0;
                console.log('[QWEN Observer] ✅ Código ESTABLE detectado');
              }
            }
          }
        } else {
          // No hay código, resetear sistema de estabilidad
          codeStability.isStable = false;
          codeStability.unstableCount = 0;
        }
        
        // ========= DETECCIÓN DE BORRADO/EDICIÓN =========
        // Si el texto se redujo, QWEN está editando/borrando (estado transitorio)
        if (currentText && lastText && currentText.length < lastText.length) {
          console.log('[QWEN Observer] ⚠️ Texto reducido (QWEN editando), ignorando estado transitorio');
          // Resetear estabilidad porque está editando
          if (hasCodeNow) {
            codeStability.isStable = false;
            codeStability.stableSince = now;
            codeStability.unstableCount++;
          }
          return; // NO capturar mientras está borrando
        }
        
        // ========= STREAMING DETECTION =========
        // Si el texto está creciendo, estamos en modo streaming
        if (currentText && currentText.length > lastText.length) {
          if (!isStreaming) {
            isStreaming = true;
            streamStartTime = now;
            streamBuffer = currentText;
            lastStreamPosition = 0;
            console.log('[QWEN Observer] 🚀 STREAMING iniciado, longitud inicial:', currentText.length);
          }
          
          // Extraer solo la parte nueva del texto
          const newContent = currentText.substring(lastStreamPosition);
          
          // Si hay contenido nuevo Y ha pasado suficiente tiempo desde el último chunk (100ms para fluidez)
          if (newContent && (now - lastChunkTime) > 100) {
            // PERMITIR streaming incluso si el código no está completamente estable
            // Solo loguear si no está estable, pero NO bloquear
            if (hasCodeNow && !codeStability.isStable) {
              console.log('[QWEN Observer] ⏳ Código en progreso (streaming permitido)');
              // NO retornar - permitir streaming progresivo
            }
            
            // Actualizar estado con el chunk nuevo
            window.qwenState.currentState = 'streaming';
            window.qwenState.lastResponseText = currentText; // Texto completo
            window.qwenState.lastChangeTime = now;
            
            // Preparar payload para streaming
            const streamPayload = {
              text: newContent,  // Solo el chunk nuevo
              fullText: currentText,  // Texto completo para referencia
              state: 'streaming',
              isCode: hasCodeNow || executingCode,
              codeBlocks: currentCodeBlocks,  // Usar bloques detectados
              timestamp: now,
              chunkIndex: Math.floor(lastStreamPosition / 100),  // Índice del chunk
              isFirstChunk: lastStreamPosition === 0,
              isStable: codeStability.isStable  // Indicar si el código está estable
            };
            
            // Actualizar window.qwenLastResponse para el sistema principal
            window.qwenLastResponse = streamPayload;
            
            // Actualizar posiciones
            lastStreamPosition = currentText.length;
            lastText = currentText;
            lastTextHash = currentHash;
            lastChunkTime = now;
            streamBuffer = currentText;
            
            console.log('[QWEN Observer] 📤 STREAM chunk:', newContent.length, 'chars, total:', currentText.length, hasCodeNow ? '(código)' : '');
            
            // Emitir evento de debug
            if (window.qwenObserverDebug) {
              window.qwenObserverDebug({
                type: 'stream_chunk',
                chunkSize: newContent.length,
                totalSize: currentText.length,
                hasCode: hasCodeNow,
                isStable: codeStability.isStable
              });
            }
            
            return; // Salir temprano, estamos en streaming
          }
        }
        // Si el texto dejó de crecer, verificar si está completo (TIEMPO REDUCIDO)
        else if (isStreaming && currentText && (now - lastChunkTime) > 800) {  // REDUCIDO de 1000ms a 800ms
          // Si hay código, dar un poco más de tiempo pero NO bloquear indefinidamente
          if (hasCodeNow && !codeStability.isStable && (now - lastChunkTime) < 2000) {
            // Código aún no está estable, pero dar más tiempo (máximo 2 segundos adicionales)
            console.log('[QWEN Observer] ⏳ Esperando código estable... (tiempo restante:', Math.floor((2000 - (now - lastChunkTime))/1000), 's)');
            // NO retornar - permitir que se complete después del timeout
          } else {
            // Código está estable, o timeout alcanzado, o no hay código - marcar como completo
            isStreaming = false;
            console.log('[QWEN Observer] ✅ STREAMING completado, longitud final:', currentText.length, hasCodeNow ? '(código)' : '');
            updateState('complete', currentText);
            
            // Reset variables de streaming
            streamBuffer = '';
            lastStreamPosition = 0;
            streamStartTime = 0;
            codeStability.isStable = false;  // Reset para próximo mensaje
            codeStability.unstableCount = 0;
            
            if (window.qwenObserverDebug) {
              window.qwenObserverDebug({
                type: 'stream_complete',
                totalSize: currentText.length,
                duration: now - streamStartTime,
                hadCode: hasCodeNow,
                wasStable: codeStability.isStable
              });
            }
            return;
          }
        }
        
        // ========= LÓGICA NORMAL (NO STREAMING) =========
        // DEBUG: Enviar evento al monitor
        if (window.qwenObserverDebug && !isStreaming) {
          window.qwenObserverDebug({
            type: 'check',
            thinking,
            executingCode,
            hasText: !!currentText,
            textLength: currentText?.length || 0,
            isFirstMessage,
            thinkingTime: thinking ? Date.now() - thinkingStartTime : 0
          });
        }
        
        // Si está ejecutando código, marcar como tipo 'code' (PERO NO BLOQUEAR)
        if (executingCode && currentText) {
          updateState('executing-code', currentText);
          isFirstMessage = false;
          // NO retornar - permitir que continúe el flujo para capturar el código
        }
        
        // NUEVO: Manejo especial del primer mensaje (MEJORADO - menos restrictivo)
        if (isFirstMessage) {
        if (thinking && !currentText) {
            if (thinkingStartTime === 0) {
              thinkingStartTime = Date.now();
              console.log('[QWEN Observer] 🤔 Primer saludo: Empezando a pensar...');
            }
            
            // REDUCIDO: Si lleva más de 5 segundos pensando sin respuesta, intentar forzar actualización
            const thinkingTime = Date.now() - thinkingStartTime;
            if (thinkingTime > 5000) {  // REDUCIDO de 8000ms a 5000ms
              console.warn('[QWEN Observer] ⚠️ Primer saludo atascado por', Math.floor(thinkingTime/1000), 'segundos');
              
              // Intentar buscar respuesta de otra forma (más agresivo)
              const alternativeText = extractLastAssistantMessage();  // Intentar de nuevo
              
              if (alternativeText && alternativeText.length > 10) {
                // Forzar actualización con el texto encontrado
                console.log('[QWEN Observer] 🔍 Primer saludo encontrado (forzado):', alternativeText.substring(0, 50));
                lastText = alternativeText;
                lastTextHash = simpleHash(alternativeText);
                updateState('responding', alternativeText);
                isFirstMessage = false;
                thinkingStartTime = 0;
                firstMessageRetries = 0;
                // NO retornar aquí - permitir que continúe el flujo normal
              }
              
              // Si han pasado más de 10 segundos, resetear (REDUCIDO de 15s)
              if (thinkingTime > 10000 && firstMessageRetries < 3) {
                console.warn('[QWEN Observer] ⚠️ Reseteando detección del primer saludo (intento', firstMessageRetries + 1, ')');
                thinkingStartTime = 0;
                firstMessageRetries++;
                // Emitir evento para debug
                if (window.qwenObserverDebug) {
                  window.qwenObserverDebug({
                    type: 'first_greeting_stuck',
                    retries: firstMessageRetries
                  });
                }
              }
            }
            
          updateState('thinking', '');
          stableCount = 0;
            lastTextHash = '';
          } else if (currentText && currentText.length > 10) {  // Asegurar que hay contenido real
            // ¡Primer mensaje recibido!
            console.log('[QWEN Observer] ✅ Primer saludo recibido:', currentText.substring(0, 50));
          lastText = currentText;
            lastTextHash = currentHash;
          window.qwenState.messageCount++;
          updateState('responding', currentText);
          stableCount = 0;
            isFirstMessage = false;
            thinkingStartTime = 0;
            firstMessageRetries = 0;
            // NO retornar - permitir que continúe con streaming si aplica
          }
        }
        // Manejo normal para mensajes posteriores
        else {
          if (thinking && !currentText) {
            updateState('thinking', '');
            stableCount = 0;
            lastTextHash = '';
          } else if (currentText && currentHash !== lastTextHash) {
            // Hash diferente = contenido realmente nuevo
            lastText = currentText;
            lastTextHash = currentHash;
            window.qwenState.messageCount++;
            updateState('responding', currentText);
            stableCount = 0;
          } else if (currentText && currentHash === lastTextHash && !thinking) {
            // Hash igual = mismo contenido, incrementar contador de estabilidad
          stableCount++;
          // Si el texto no cambia por 3 checks (1.5s), considerarlo completo
          if (stableCount >= 3) {
            updateState('complete', currentText);
            }
          }
        }
      };

      // 🔄 DESCONECTAR OBSERVER ANTERIOR SI EXISTE (evitar bucles)
      if (window.qwenObserverInstance) {
        console.log('[QWEN Observer] 🔄 Desconectando observer anterior...');
        window.qwenObserverInstance.disconnect();
        window.qwenObserverInstance = null;
      }
      
      if (window.qwenCheckInterval) {
        clearInterval(window.qwenCheckInterval);
        window.qwenCheckInterval = null;
      }

      // Verificación cada 500ms (con guardia de idempotencia)
      window.qwenCheckInterval = setInterval(checkForChanges, 500);

      // MutationObserver para cambios del DOM (con disconnect previo)
      window.qwenObserverInstance = new MutationObserver(() => {
        checkForChanges();
      });

      window.qwenObserverInstance.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });

      // Configurar función de debug para enviar eventos al monitor
      window.qwenObserverDebug = function(data) {
        console.log('[QWEN Debug]', data);
        // Esta función será sobrescrita desde el main process
      };
      
      console.log('[QWEN Observer V2] ✅ Sistema iniciado correctamente (observer desconectado previo si existía)');
      checkForChanges(); // Primera verificación
    })();
  `;

  browserView.webContents.executeJavaScript(communicationScript).catch(err => {
    console.error('[QWEN] Error configurando comunicación bidireccional:', err);
  });

  // Configurar canal de debug para el monitor
  browserView.webContents.executeJavaScript(`
    window.qwenObserverDebug = function(data) {
      // Enviar al main process para reenviar al monitor
      console.log('[QWEN Debug Event]', data);
    };
  `);
}

// ============ QWEN: INYECTAR OBSERVADOR DE RESPUESTAS (MEJORADO) ============
function injectQwenResponseObserver(browserView) {
  if (!browserView || browserView.webContents.isDestroyed()) return;

  // Primero configurar comunicación bidireccional
  setupQwenBidirectionalCommunication(browserView);

  // El observador ahora usa el sistema bidireccional configurado arriba
  console.log('[QWEN Observer] ✅ Observador mejorado activado (usa comunicación bidireccional)');
}

// ============ QWEN: LEER RESPUESTAS DESDE BROWSERVIEW ============
let qwenResponseInterval = null;
let qwenBrowserViewReady = false;

// ============ NUEVO: CAPTURA CON WEBSOCKET INTERCEPTOR ============
async function startQwenResponseCapture() {
  console.log('[QWEN Capture] 🚀 Iniciando captura con WebSocket interceptor...');

  // Verificar que el BrowserView existe
  if (!qwenBrowserView || qwenBrowserView.webContents.isDestroyed()) {
    console.error('[QWEN Capture] ❌ BrowserView no disponible');
    return;
  }

  // ✅ INICIALIZAR INTERCEPTOR WEBSOCKET
  try {
    const result = await setupQwenWebSocketInterceptor(qwenBrowserView, mainWindow);

    if (result.success) {
      console.log('[QWEN Capture] ✅ Interceptor WebSocket activado correctamente');

      // Configurar listeners para recibir respuestas del interceptor
      if (mainWindow && !mainWindow.isDestroyed()) {
        // Las respuestas ahora vienen del interceptor vía IPC
        // No necesitamos polling, el interceptor nos notifica automáticamente
        console.log('[QWEN Capture] ✅ Sistema de captura listo (sin polling)');
      }
    } else {
      throw new Error(result.error || 'Interceptor falló');
    }
  } catch (error) {
    console.error('[QWEN Capture] ❌ Error al iniciar interceptor:', error.message);
    console.log('[QWEN Capture] ⚠️ Fallback: usando sistema de DOM scraping');
    startQwenResponseCaptureLegacy(); // Fallback al sistema antiguo si falla
  }
}

// ============ SISTEMA ANTIGUO (LEGACY) - SOLO COMO FALLBACK ============
async function startQwenResponseCaptureLegacy() {
  if (qwenResponseInterval) return; // Ya está capturando

  let lastCapturedText = '';
  let lastTextHash = ''; // Hash para idempotencia
  let lastState = 'idle';
  let captureCount = 0;
  let consecutiveDuplicates = 0; // Contador de duplicados consecutivos
  let firstGreetingTimeout = null; // Timeout para primer saludo
  let greetingRetryCount = 0; // Contador de reintentos del primer saludo
  let lastSentHash = ''; // Hash del último mensaje enviado (para evitar duplicados)
  let lastSentTime = 0; // Timestamp del último envío
  const DEBOUNCE_MS = 1000; // 1 segundo mínimo entre envíos
  const MAX_GREETING_RETRIES = 2;

  console.log('[QWEN Capture LEGACY] ⚠️ Usando sistema antiguo de DOM scraping...');

  // Función simple para generar hash del texto (para idempotencia)
  function simpleHash(text) {
    let hash = 0;
    if (!text) return '';
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32bit integer
    }
    return hash.toString(36);
  }

  // Función mejorada para hash con contexto temporal (evita duplicados)
  function enhancedHash(text, state) {
    const baseHash = simpleHash(text);
    const stateHash = simpleHash(state || '');
    const timeHash = Math.floor(Date.now() / 1000).toString(36); // Hash por segundo
    return simpleHash(baseHash + stateHash + timeHash);
  }

  // Esperar a que el BrowserView esté completamente listo
  qwenBrowserViewReady = false;

  qwenResponseInterval = setInterval(async () => {
    captureCount++;

    // Log cada 10 iteraciones para debug
    if (captureCount % 10 === 0) {
      console.log(`[QWEN Capture] ⏱️ Check #${captureCount}`);
    }

    // Verificar que el BrowserView existe y no está destruido
    if (!qwenBrowserView) {
      if (qwenResponseInterval) {
        clearInterval(qwenResponseInterval);
        qwenResponseInterval = null;
      }
      qwenBrowserViewReady = false;
      return;
    }

    // Verificar que webContents existe y no está destruido
    if (!qwenBrowserView.webContents || qwenBrowserView.webContents.isDestroyed()) {
      if (qwenResponseInterval) {
        clearInterval(qwenResponseInterval);
        qwenResponseInterval = null;
      }
      qwenBrowserViewReady = false;
      return;
    }

    // Verificar que el frame esté listo antes de intentar ejecutar JavaScript
    try {
      // Verificar que el documento esté cargado
      const isReady = await qwenBrowserView.webContents.executeJavaScript(`
        (function() {
          return document.readyState === 'complete' && 
                 typeof window.qwenLastResponse !== 'undefined';
        })();
      `).catch(() => false);

      if (!isReady) {
        // Si no está listo, esperar sin intentar leer respuestas
        return;
      }

      qwenBrowserViewReady = true;

      // Ahora intentar leer las respuestas y estados
      const response = await qwenBrowserView.webContents.executeJavaScript(`
        (function() {
          const lastResponse = window.qwenLastResponse || { 
            text: '', 
            state: 'idle', 
            images: [], 
            videos: [], 
            audio: [], 
            timestamp: 0 
          };
          
          // STREAMING: Si el estado es streaming, incluir información adicional
          if (lastResponse.state === 'streaming') {
            // En modo streaming, el response ya tiene la estructura correcta
            return lastResponse;
          }
          
          // Detectar estado actual si no está en lastResponse
          if (!lastResponse.state || lastResponse.state === 'idle') {
            const bodyText = (document.body.innerText || '').toLowerCase();
            if (bodyText.includes('pensando') || bodyText.includes('thinking')) {
              lastResponse.state = 'thinking';
            }
          }
          
          // Detectar si está ejecutando código
          const isExecutingCode = (function() {
            const codeBlocks = document.querySelectorAll('pre code, [class*="code"], [class*="syntax"]');
            if (codeBlocks.length > 0) {
              const hasExecution = Array.from(codeBlocks).some(block => {
                const text = block.textContent || '';
                return text.includes('>>>') || text.includes('$') || 
                       text.includes('Running') || text.includes('Executing');
              });
              if (hasExecution) return true;
            }
            const bodyText = document.body.innerText || '';
            if (bodyText.includes('Ejecutando') || bodyText.includes('Running') ||
                bodyText.includes('>>>') || bodyText.match(/\\$\\s+\\w+/)) {
              return true;
            }
            return false;
          })();
          
          // Obtener bloques de código del estado global
          const codeBlocks = window.qwenState?.lastCodeBlocks || [];
          const hasCode = window.qwenState?.hasCode || false;
          
          lastResponse.isExecutingCode = isExecutingCode;
          lastResponse.codeBlocks = codeBlocks;
          lastResponse.hasCode = hasCode;
          return lastResponse;
        })();
      `);

      if (response) {
        // Detectar cambios de estado
        const currentState = response.state || 'idle';
        const responseText = response.text || '';
        const executingCode = response.isExecutingCode || false;  // NUEVO según plan
        const codeBlocks = response.codeBlocks || [];  // NUEVO: bloques de código
        const hasCode = response.hasCode || false;  // NUEVO: flag de código

        // Si hay un cambio de estado, notificarlo
        if (currentState === 'thinking' && responseText === '') {
          // Qwen está pensando pero aún no hay respuesta
          if (lastState !== 'thinking') {
            console.log('[QWEN Capture] 🤔 Estado: Pensando...');
            lastState = 'thinking';

            // FIX PRIMER SALUDO: Detectar si es el primer mensaje y está atascado
            if (greetingRetryCount === 0 && captureCount < 30) { // Primeros 15 segundos
              if (firstGreetingTimeout) clearTimeout(firstGreetingTimeout);
              firstGreetingTimeout = setTimeout(() => {
                console.log('[QWEN Capture] ⚠️ Primer saludo atascado en "thinking", puede necesitar reintento');
                greetingRetryCount++;
                // Emitir evento de debug
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('qwen:observer:event', {
                    type: 'first_greeting_stuck',
                    retries: greetingRetryCount
                  });
                }
              }, 10000); // 10 segundos de timeout
            }
          }
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('qwen:response', {
              type: 'thinking',
              content: 'Pensando...',
              state: 'thinking'
            });
            // Emitir evento para el monitor
            mainWindow.webContents.send('qwen:observer:event', {
              type: 'state_change',
              data: { state: 'thinking' }
            });
          }
        } else if ((currentState === 'streaming' || hasCode) && (response.text || responseText)) {
          // ========= MODO STREAMING O CÓDIGO =========
          // En modo streaming o cuando hay código, enviar incluso si no está completamente estable
          const streamChunk = response.text || responseText;  // Chunk nuevo o texto completo
          const fullText = response.fullText || responseText;  // Texto completo

          // Si hay código pero no está en modo streaming, forzar streaming
          if (hasCode && currentState !== 'streaming') {
            console.log('[QWEN Capture] 💻 Código detectado, forzando modo streaming');
          }

          console.log('[QWEN Capture] 🌊 STREAMING/CODE - Chunk:', streamChunk?.length, 'chars, Total:', fullText?.length);

          // Enviar el chunk al renderer (SIEMPRE, incluso si código no está estable)
          if (mainWindow && !mainWindow.isDestroyed() && streamChunk && streamChunk.length > 0) {
            const payload = {
              type: response.hasCode ? 'code' : 'text',
              content: streamChunk,  // Solo el chunk nuevo
              fullText: fullText,  // Texto completo para referencia
              state: 'streaming',
              stream: true,
              isStreaming: true,  // Flag especial para streaming
              isCode: response.hasCode || executingCode,
              chunkIndex: response.chunkIndex || 0,
              isFirstChunk: response.isFirstChunk || false
            };

            // Si tiene código, incluir bloques
            if (response.codeBlocks && response.codeBlocks.length > 0) {
              payload.codeBlocks = response.codeBlocks;
            }

            mainWindow.webContents.send('qwen:response', payload);

            // Emitir evento de debug
            mainWindow.webContents.send('qwen:observer:event', {
              type: 'stream_chunk',
              data: {
                chunkSize: streamChunk.length,
                totalSize: fullText.length,
                hasCode: response.hasCode
              }
            });
          }

          // Actualizar variables para evitar duplicados
          lastCapturedText = fullText;
          lastState = 'streaming';

        } else if (responseText) {
          // ========= MODO NORMAL (NO STREAMING) =========
          // Limpiar timeout del primer saludo si hay respuesta
          if (firstGreetingTimeout) {
            clearTimeout(firstGreetingTimeout);
            firstGreetingTimeout = null;
            greetingRetryCount = 0;
          }

          // Solo procesar si NO estamos en streaming
          if (currentState !== 'streaming') {
            // Calcular hash para evitar duplicados
            const currentHash = enhancedHash(responseText, currentState);

            // Verificar si es contenido nuevo
            if (currentHash !== lastTextHash && currentHash !== lastSentHash) {
              const now = Date.now();
              if (now - lastSentTime < DEBOUNCE_MS) {
                console.log('[QWEN Capture] ⏸️ Debounce activo, esperando...');
                return;
              }

              console.log('[QWEN Capture] 📥 Nueva respuesta (no streaming):', responseText.length, 'chars');

              // Enviar respuesta completa
              if (responseText.length > lastCapturedText.length || currentHash !== enhancedHash(lastCapturedText, lastState)) {
                const newContent = responseText.length > lastCapturedText.length
                  ? responseText.slice(lastCapturedText.length)
                  : responseText;

                lastCapturedText = responseText;
                lastTextHash = currentHash;
                lastSentHash = currentHash;
                lastSentTime = now;
                lastState = currentState;
                consecutiveDuplicates = 0;

                console.log('[QWEN Capture] 📤 Enviando (no streaming):', newContent.substring(0, 50) + '...');

                if (mainWindow && !mainWindow.isDestroyed()) {
                  const payload = {
                    type: (executingCode || hasCode) ? 'code' : 'text',
                    content: newContent,
                    state: currentState,
                    stream: true,
                    isStreaming: false,  // NO es streaming
                    isCode: executingCode || hasCode
                  };

                  if (hasCode && codeBlocks.length > 0) {
                    payload.codeBlocks = codeBlocks;
                    const backtick = String.fromCharCode(96);
                    payload.codeContent = codeBlocks.map(block => {
                      if (block.format === 'markdown') {
                        return backtick + backtick + backtick + (block.language || '') + '\\n' + block.code + '\\n' + backtick + backtick + backtick;
                      } else {
                        return block.code;
                      }
                    }).join('\\n\\n');
                  }

                  mainWindow.webContents.send('qwen:response', payload);
                }
              }
            } else {
              consecutiveDuplicates++;
              if (consecutiveDuplicates > 5) {
                console.warn('[QWEN Capture] ⚠️ Múltiples duplicados detectados');
                consecutiveDuplicates = 0;
              }
            }
          }

          // Enviar media si existe (FILTRADO: NO imágenes de Alibaba)
          if (response.images && response.images.length > 0) {
            response.images.forEach(img => {
              // FILTRAR imágenes de Alibaba
              if (img && !img.includes('alicdn.com') && !img.includes('alibaba')) {
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('qwen:response', {
                    type: 'image',
                    content: img,
                    state: currentState
                  });
                }
              } else {
                console.log('[QWEN Capture] 🚫 Imagen de Alibaba filtrada:', img?.substring(0, 50));
              }
            });
          }
          if (response.videos && response.videos.length > 0) {
            response.videos.forEach(vid => {
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('qwen:response', {
                  type: 'video',
                  content: vid,
                  state: currentState
                });
              }
            });
          }
          if (response.audio && response.audio.length > 0) {
            response.audio.forEach(aud => {
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('qwen:response', {
                  type: 'audio',
                  content: aud,
                  state: currentState
                });
              }
            });
          }

          // Si el estado es 'complete', notificar que la respuesta terminó
          if (currentState === 'complete') {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('qwen:response', {
                type: 'complete',
                content: '',
                state: 'complete',
                fullText: responseText
              });
            }
          }
        }
      }
    } catch (error) {
      // Solo loggear errores que no sean de frame disposed
      if (!error.message || !error.message.includes('Render frame was disposed')) {
        // Ignorar errores silenciosamente (puede ser que el DOM no esté listo aún)
      }
      qwenBrowserViewReady = false;
    }
  }, 500); // Leer cada 500ms (más rápido para capturar respuestas)
}

function stopQwenResponseCapture() {
  // Detener interceptor WebSocket
  stopQwenInterceptor();

  // Detener polling del sistema legacy (si está activo)
  if (qwenResponseInterval) {
    clearInterval(qwenResponseInterval);
    qwenResponseInterval = null;
  }

  console.log('[QWEN Capture] ✅ Captura detenida (interceptor + legacy)');
}

// ============ QWEN: FUNCIÓN AUXILIAR - ESPERAR QUE BROWSERVIEW ESTÉ LISTO ============
async function waitForQWENReady(browserView, timeout = 10000) {
  if (!browserView || browserView.webContents.isDestroyed()) {
    throw new Error('BrowserView not available');
  }

  // Si está cargando, esperar a que termine
  if (browserView.webContents.isLoading()) {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting for page load')), timeout);
      browserView.webContents.once('did-finish-load', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  // Verificar DOM una sola vez (sin polling)
  try {
    const ready = await browserView.webContents.executeJavaScript(`
      document.readyState === 'complete' && 
      (document.querySelector('[contenteditable], textarea, input[type="text"]') !== null)
    `);
    if (!ready) {
      throw new Error('QWEN DOM not ready');
    }
    return true;
  } catch (error) {
    throw new Error(`QWEN not ready: ${error.message}`);
  }
}

// ============ QWEN: DIAGNÓSTICO DE EVENT LISTENERS ============
async function diagnoseQwenInputDetection(browserView) {
  if (!browserView || browserView.webContents.isDestroyed()) {
    return { success: false, error: 'BrowserView no disponible' };
  }

  const diagnoseCode = `
    (function() {
      const result = {
        eventListeners: [],
        inputEvents: [],
        buttonState: null
      };

      // Buscar input
      const input = document.querySelector('#chat-input') || 
                   document.querySelector('textarea[placeholder*="ayuda" i]') ||
                   document.querySelector('[contenteditable="true"]');
      
      if (!input) {
        return { success: false, error: 'Input no encontrado' };
      }

      // Interceptar addEventListener para ver qué eventos escucha Qwen
      const originalAddEventListener = input.addEventListener.bind(input);
      const events = [];
      
      input.addEventListener = function(type, listener, options) {
        events.push({
          type: type,
          hasOptions: !!options,
          listenerType: typeof listener,
          listenerString: listener.toString().substring(0, 150)
        });
        return originalAddEventListener(type, listener, options);
      };

      // Observar cambios en botones (micrófono/enviar)
      const buttonObserver = new MutationObserver((mutations) => {
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => {
          const hasMicrophone = btn.querySelector('svg[viewBox*="24"]') || 
                               btn.getAttribute('aria-label')?.toLowerCase().includes('mic') ||
                               btn.getAttribute('title')?.toLowerCase().includes('mic');
          const hasSend = btn.querySelector('svg[viewBox*="24"]') ||
                         btn.getAttribute('aria-label')?.toLowerCase().includes('send') ||
                         btn.getAttribute('title')?.toLowerCase().includes('send');
          
          if (hasMicrophone || hasSend) {
            result.buttonState = {
              visible: btn.offsetParent !== null,
              disabled: btn.disabled,
              hasMicrophone: hasMicrophone,
              hasSend: hasSend,
              ariaLabel: btn.getAttribute('aria-label') || '',
              className: btn.className || ''
            };
          }
        });
      });

      // Observar el contenedor del input
      const container = input.closest('form') || input.parentElement;
      if (container) {
        buttonObserver.observe(container, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class', 'aria-label', 'disabled', 'style']
        });
      }

      // Capturar eventos que se disparan
      const capturedEvents = [];
      ['input', 'beforeinput', 'change', 'keydown', 'keypress', 'keyup', 'focus', 'blur'].forEach(eventType => {
        input.addEventListener(eventType, (e) => {
          capturedEvents.push({
            type: e.type,
            inputType: e.inputType || null,
            data: e.data || null,
            bubbles: e.bubbles,
            cancelable: e.cancelable,
            target: e.target.tagName
          });
        }, true); // Usar capture phase
      });

      result.eventListeners = events;
      result.capturedEvents = capturedEvents;
      result.inputValue = input.value || input.textContent || '';
      result.inputType = input.tagName.toLowerCase();

      return result;
    })();
  `;

  try {
    const diagnosis = await browserView.webContents.executeJavaScript(diagnoseCode);
    console.log('[QWEN Event Listeners]', JSON.stringify(diagnosis, null, 2));
    return { success: true, data: diagnosis };
  } catch (error) {
    console.error('[QWEN Event Listeners] Error:', error.message);
    return { success: false, error: error.message };
  }
}

// ============ QWEN: DIAGNÓSTICO DEL DOM ============
async function diagnoseQwenDOM(browserView) {
  if (!browserView || browserView.webContents.isDestroyed()) {
    return { success: false, error: 'BrowserView no disponible' };
  }

  const diagnoseCode = `
    (function() {
      const result = {
        inputFound: false,
        inputType: null,
        inputSelector: null,
        sendButtonFound: false,
        sendButtonSelector: null,
        sendFunctions: [],
        hasSubmitForm: false,
        inputContainerSelector: null
      };

      // Buscar input con múltiples estrategias mejoradas
      const inputStrategies = [
        () => document.querySelector('[placeholder*="Cuéntame" i]'),
        () => document.querySelector('[placeholder*="pregunta" i]'),
        () => document.querySelector('[placeholder*="mensaje" i]'),
        () => document.querySelector('[placeholder*="ayuda" i]'),
        () => document.querySelector('[contenteditable="true"]'),
        () => document.querySelector('[contenteditable="true"][role="textbox"]'),
        () => document.querySelector('textarea:not([disabled]):not([readonly])'),
        () => document.querySelector('input[type="text"]:not([disabled]):not([readonly])'),
        () => Array.from(document.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]'))
          .filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 100 && rect.height > 20 && window.getComputedStyle(el).display !== 'none';
          })
          .sort((a, b) => {
            const rectA = a.getBoundingClientRect();
            const rectB = b.getBoundingClientRect();
            return (rectB.width * rectB.height) - (rectA.width * rectA.height);
          })[0]
      ];

      let inputElement = null;
      for (const strategy of inputStrategies) {
        try {
          const found = strategy();
          if (found && found.offsetParent !== null) { // Verificar que está visible
            inputElement = found;
            result.inputFound = true;
            result.inputType = found.tagName.toLowerCase();
            if (found.hasAttribute('contenteditable')) {
              result.inputType = 'contenteditable';
            }
            // Generar selector único (solo strings, no objetos)
            if (found.id) {
              result.inputSelector = '#' + found.id;
            } else if (found.className) {
              const firstClass = found.className.split(' ')[0];
              if (firstClass) {
                result.inputSelector = '.' + firstClass;
              }
            }
            break;
          }
        } catch (e) {}
      }

      if (inputElement) {
        // Buscar contenedor del input (solo guardar selector, no el objeto)
        const container = inputElement.closest('form') || 
                         inputElement.closest('[class*="input"]') ||
                         inputElement.closest('[class*="composer"]') ||
                         inputElement.closest('[class*="chat"]') ||
                         inputElement.parentElement;
        
        if (container) {
          if (container.id) {
            result.inputContainerSelector = '#' + container.id;
          } else if (container.className) {
            const firstClass = container.className.split(' ')[0];
            if (firstClass) {
              result.inputContainerSelector = '.' + firstClass;
            }
          }
        }

        // Buscar botón de envío con múltiples estrategias
        const buttonStrategies = [
          () => container?.querySelector('button[type="submit"]'),
          () => container?.querySelector('button[aria-label*="enviar" i]'),
          () => container?.querySelector('button[aria-label*="send" i]'),
          () => container?.querySelector('button[title*="enviar" i]'),
          () => container?.querySelector('button[title*="send" i]'),
          () => container?.querySelector('button:has(svg)'), // Botón con icono
          () => Array.from(container?.querySelectorAll('button') || [])
            .filter(btn => {
              const text = (btn.textContent || btn.innerText || '').toLowerCase();
              const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
              return text.includes('enviar') || text.includes('send') || 
                     aria.includes('enviar') || aria.includes('send') ||
                     btn.querySelector('svg[viewBox*="24"]'); // Iconos comunes
            })[0],
          () => {
            // Buscar botón cerca del input (mismo contenedor o siguiente hermano)
            const siblings = Array.from(inputElement.parentElement?.children || []);
            const inputIndex = siblings.indexOf(inputElement);
            return siblings[inputIndex + 1]?.tagName === 'BUTTON' ? siblings[inputIndex + 1] : null;
          },
          () => document.querySelector('button:not([disabled])[class*="send"]'),
          () => document.querySelector('button:not([disabled])[class*="submit"]')
        ];

        for (const strategy of buttonStrategies) {
          try {
            const found = strategy();
            if (found && found.offsetParent !== null && !found.disabled) {
              result.sendButtonFound = true;
              if (found.id) {
                result.sendButtonSelector = '#' + found.id;
              } else if (found.className) {
                const firstClass = found.className.split(' ')[0];
                if (firstClass) {
                  result.sendButtonSelector = '.' + firstClass;
                }
              }
              break;
            }
          } catch (e) {}
        }

        // Buscar formulario
        const form = inputElement.closest('form');
        if (form) {
          result.hasSubmitForm = true;
        }

        // Buscar funciones globales de envío
        const functionNames = ['sendMessage', 'submitChat', 'sendChat', 'submitMessage', 'handleSend'];
        for (const funcName of functionNames) {
          if (typeof window[funcName] === 'function') {
            result.sendFunctions.push(funcName);
          }
        }
      }

      return result;
    })();
  `;

  try {
    const diagnosis = await browserView.webContents.executeJavaScript(diagnoseCode);
    console.log('[QWEN Diagnóstico]', JSON.stringify(diagnosis, null, 2));
    return { success: true, data: diagnosis };
  } catch (error) {
    console.error('[QWEN Diagnóstico] Error:', error.message);
    return { success: false, error: error.message };
  }
}

// ============ QWEN: ENVIAR MENSAJE CON sendInputEvent (MÉTODO VS CODE) ============
// Este método simula teclas REALES que React SÍ detecta
ipcMain.handle('qwen:sendMessage', async (_e, { message }) => {
  try {
    // Verificar precondiciones
    if (!qwenBrowserView) {
      console.log('[QWEN] BrowserView no existe');
      return { success: false, error: 'QWEN BrowserView no disponible. Abre QWEN primero.' };
    }

    if (qwenBrowserView.webContents.isDestroyed()) {
      console.log('[QWEN] BrowserView fue destruido');
      return { success: false, error: 'QWEN BrowserView fue destruido. Abre QWEN nuevamente.' };
    }

    if (!message || typeof message !== 'string') {
      return { success: false, error: 'Mensaje inválido' };
    }

    const lineCount = (message.match(/\n/g) || []).length + 1;
    const isLongMessage = lineCount >= 2 || message.length > 100;
    console.log(`[QWEN] 📤 Enviando mensaje (${lineCount} líneas, ${message.length} chars): "${message.substring(0, 50)}..."`);

    const wc = qwenBrowserView.webContents;

    // ============ INTERCEPTOR DE COMANDOS - BOTONES MÁGICOS ============
    // Detecta intención y hace click en el botón correspondiente de QWEN
    const QWEN_BUTTONS = {
      video: {
        keywords: ['video', 'vídeo', 'graba', 'grabación', 'clip', 'película', 'anima', 'animación'],
        selectors: [
          'button[aria-label*="video" i]',
          'button[title*="video" i]',
          '[class*="video" i] button',
          'button:has(svg[class*="video" i])',
          // Por texto visible
          'button:contains("Video")',
          'button:contains("Generación de Video")'
        ],
        icon: '🎬'
      },
      imagen: {
        keywords: ['imagen', 'imágen', 'foto', 'fotografía', 'picture', 'image', 'dibuja', 'ilustra', 'genera imagen', 'crea imagen'],
        selectors: [
          'button[aria-label*="imagen" i]',
          'button[aria-label*="image" i]',
          'button[title*="imagen" i]',
          '[class*="image" i] button',
          'button:has(svg[class*="image" i])'
        ],
        icon: '🖼️'
      },
      edicion: {
        keywords: ['edita imagen', 'modifica imagen', 'retoca', 'editing', 'edición de imagen'],
        selectors: [
          'button[aria-label*="edición" i]',
          'button[aria-label*="editing" i]',
          'button[title*="edición" i]'
        ],
        icon: '✏️'
      },
      web: {
        keywords: ['web', 'página', 'website', 'sitio', 'landing', 'html', 'desarrollo web'],
        selectors: [
          'button[aria-label*="web" i]',
          'button[title*="web" i]',
          '[class*="web" i] button'
        ],
        icon: '🌐'
      },
      artefacto: {
        keywords: ['artefacto', 'artifact', 'componente', 'app', 'aplicación', 'código', 'code'],
        selectors: [
          'button[aria-label*="artefacto" i]',
          'button[aria-label*="artifact" i]',
          'button[title*="artefacto" i]',
          '[class*="artifact" i] button'
        ],
        icon: '⚡'
      }
    };

    // Detectar qué botón activar basado en el mensaje
    const messageLower = message.toLowerCase();
    let buttonToClick = null;

    for (const [buttonType, config] of Object.entries(QWEN_BUTTONS)) {
      for (const keyword of config.keywords) {
        if (messageLower.includes(keyword)) {
          buttonToClick = { type: buttonType, ...config };
          break;
        }
      }
      if (buttonToClick) break;
    }

    // Si detectamos un comando especial, intentar hacer click en el botón
    if (buttonToClick) {
      console.log(`[QWEN] ${buttonToClick.icon} Detectado comando: ${buttonToClick.type.toUpperCase()}`);

      const clickResult = await wc.executeJavaScript(`
        (function() {
          const buttonType = '${buttonToClick.type}';
          const keywords = ${JSON.stringify(buttonToClick.keywords)};
          
          // Buscar todos los botones en la barra de herramientas/chips
          const allButtons = document.querySelectorAll('button, [role="button"], [class*="chip"], [class*="tag"]');
          
          for (const btn of allButtons) {
            const text = (btn.textContent || btn.innerText || '').toLowerCase();
            const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
            const title = (btn.getAttribute('title') || '').toLowerCase();
            const className = (btn.className || '').toLowerCase();
            
            // Buscar coincidencia por texto o atributos
            const allText = text + ' ' + ariaLabel + ' ' + title + ' ' + className;
            
            // Mapeo específico para QWEN
            const matches = {
              'video': ['video', 'vídeo', 'generación de video', 'video generation'],
              'imagen': ['imagen', 'image', 'generación de imágenes', 'image generation'],
              'edicion': ['edición de imagen', 'image editing', 'edición'],
              'web': ['desarrollo web', 'web development', 'web'],
              'artefacto': ['artefactos', 'artifacts', 'artefacto']
            };
            
            const targetKeywords = matches[buttonType] || [];
            
            for (const kw of targetKeywords) {
              if (allText.includes(kw)) {
                console.log('[QWEN Buttons] ✅ Botón encontrado:', btn.textContent?.substring(0, 30));
                btn.click();
                return { success: true, clicked: buttonType, text: text.substring(0, 50) };
              }
            }
          }
          
          console.log('[QWEN Buttons] ⚠️ Botón no encontrado para:', buttonType);
          return { success: false, error: 'Botón no encontrado' };
        })();
      `);

      if (clickResult.success) {
        console.log(`[QWEN] ✅ Botón ${buttonToClick.type} activado`);
        // Esperar un momento para que QWEN procese el click
        await new Promise(r => setTimeout(r, 300));
      } else {
        console.log(`[QWEN] ⚠️ No se encontró el botón ${buttonToClick.type}, continuando sin él`);
      }
    }
    // ============ FIN INTERCEPTOR DE COMANDOS ============

    // PASO 1: Enfocar el input usando JavaScript
    const focusResult = await wc.executeJavaScript(`
      (function() {
        const selectors = [
          'textarea[placeholder*="ayuda" i]',
          'textarea[placeholder*="mensaje" i]',
          'textarea[placeholder*="pregunta" i]',
          'textarea[placeholder*="Cuéntame" i]',
          '#chat-input',
          'textarea:not([disabled])',
          'div[contenteditable="true"]',
          'textarea'
        ];
        
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el && el.offsetParent !== null) {
            el.focus();
            el.click();
            // Limpiar contenido existente
            if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
              el.value = '';
            } else {
              el.textContent = '';
            }
            return { success: true, selector: sel, tagName: el.tagName };
          }
        }
        return { success: false, error: 'No se encontró input visible' };
      })();
    `);

    if (!focusResult.success) {
      console.error('[QWEN] ❌ No se pudo enfocar el input:', focusResult.error);
      return { success: false, error: focusResult.error };
    }

    console.log(`[QWEN] ✅ Input enfocado: ${focusResult.selector}`);

    // Pequeña pausa para asegurar que el focus se aplicó
    await new Promise(r => setTimeout(r, 100));

    // PASO 2: Usar inserción en bloque si el mensaje es largo (ya calculado arriba)

    if (isLongMessage) {
      // ========= INSERCIÓN EN BLOQUE (RÁPIDO) =========
      console.log(`[QWEN] 📦 Mensaje largo detectado (${lineCount} líneas, ${message.length} chars) - Insertando en BLOQUE`);

      const insertResult = await wc.executeJavaScript(`
        (function() {
          const message = ${JSON.stringify(message)};
          const selectors = [
            'textarea[placeholder*="ayuda" i]',
            'textarea[placeholder*="mensaje" i]',
            'textarea[placeholder*="pregunta" i]',
            'textarea[placeholder*="Cuéntame" i]',
            '#chat-input',
            'textarea:not([disabled])',
            'div[contenteditable="true"]',
            'textarea'
          ];
          
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && el.offsetParent !== null) {
              // Método 1: Si es textarea/input, usar value
              if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
                // Usar el setter nativo para que React lo detecte
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                  window.HTMLTextAreaElement.prototype,
                  'value'
                )?.set;
                
                if (nativeInputValueSetter) {
                  nativeInputValueSetter.call(el, message);
                } else {
                  el.value = message;
                }
                
                // Disparar eventos para que React detecte el cambio
                el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                
                // También disparar eventos de React si están disponibles
                const reactEvent = new Event('input', { bubbles: true });
                Object.defineProperty(reactEvent, 'target', { value: el, enumerable: true });
                el.dispatchEvent(reactEvent);
                
                console.log('[QWEN Block Insert] ✅ Texto insertado en bloque:', message.length, 'chars');
                return { success: true, method: 'value', selector: sel };
              }
              // Método 2: Si es contenteditable, usar textContent/innerHTML
              else if (el.contentEditable === 'true' || el.getAttribute('contenteditable') === 'true') {
                el.textContent = message;
                el.innerHTML = message.replace(/\\n/g, '<br>');
                
                // Disparar eventos
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                
                console.log('[QWEN Block Insert] ✅ Texto insertado en contenteditable:', message.length, 'chars');
                return { success: true, method: 'contenteditable', selector: sel };
              }
            }
          }
          
          return { success: false, error: 'No se encontró input válido' };
        })();
      `);

      if (!insertResult.success) {
        console.error('[QWEN] ❌ Error insertando en bloque, fallback a carácter por carácter');
        // Fallback al método anterior si falla
        for (const char of message) {
          wc.sendInputEvent({
            type: 'char',
            keyCode: char
          });
          await new Promise(r => setTimeout(r, 5));
        }
      } else {
        console.log(`[QWEN] ✅ Mensaje insertado en BLOQUE usando método: ${insertResult.method}`);
        // Pequeña pausa para que React procese el cambio
        await new Promise(r => setTimeout(r, 150));
      }
    } else {
      // ========= MÉTODO CARÁCTER POR CARÁCTER (PARA MENSAJES CORTOS) =========
      console.log(`[QWEN] ⌨️ Mensaje corto (${lineCount} línea, ${message.length} chars) - Enviando carácter por carácter`);

      for (const char of message) {
        wc.sendInputEvent({
          type: 'char',
          keyCode: char
        });
        // Pequeña pausa entre caracteres para estabilidad
        await new Promise(r => setTimeout(r, 5));
      }
    }

    console.log(`[QWEN] ✅ Mensaje escrito (${message.length} caracteres, método: ${isLongMessage ? 'BLOQUE' : 'carácter por carácter'})`);

    // Pausa antes de enviar Enter (más corta si fue en bloque)
    await new Promise(r => setTimeout(r, isLongMessage ? 100 : 150));

    // PASO 3: Enviar Enter para enviar el mensaje
    wc.sendInputEvent({ type: 'keyDown', keyCode: 'Return' });
    wc.sendInputEvent({ type: 'keyUp', keyCode: 'Return' });

    console.log(`[QWEN] ✅ Enter enviado - Mensaje debería estar procesándose`);

    return {
      success: true,
      message: `Mensaje enviado (${isLongMessage ? 'BLOQUE' : 'carácter por carácter'})`,
      strategy: isLongMessage ? 'block-insert' : 'sendInputEvent-real-keys',
      method: isLongMessage ? 'block' : 'char-by-char',
      lineCount: lineCount,
      buttonActivated: buttonToClick?.type || null
    };

  } catch (error) {
    console.error(`[QWEN] ❌ Error en sendMessage:`, error.message);
    if (error.message.includes('disposed') || error.message.includes('destroyed')) {
      return { success: false, error: 'El panel de Qwen se cerró. Vuelve a abrirlo.' };
    }
    return { success: false, error: error.message };
  }
});

// ============ QWEN: CLICK EN BOTÓN ESPECÍFICO ============
ipcMain.handle('qwen:clickButton', async (_e, { buttonType }) => {
  try {
    if (!qwenBrowserView || qwenBrowserView.webContents.isDestroyed()) {
      return { success: false, error: 'QWEN no disponible' };
    }

    console.log(`[QWEN] 🔘 Activando botón: ${buttonType}`);

    const result = await qwenBrowserView.webContents.executeJavaScript(`
      (function() {
        const buttonType = '${buttonType}';
        const allButtons = document.querySelectorAll('button, [role="button"], [class*="chip"], [class*="tag"]');
        
        const matches = {
          'video': ['video', 'vídeo', 'generación de video', 'video generation'],
          'imagen': ['imagen', 'image', 'generación de imágenes', 'image generation'],
          'edicion': ['edición de imagen', 'image editing', 'edición'],
          'web': ['desarrollo web', 'web development', 'web'],
          'artefacto': ['artefactos', 'artifacts', 'artefacto'],
          'pensamiento': ['pensamiento', 'thinking'],
          'buscar': ['buscar', 'search']
        };
        
        const targetKeywords = matches[buttonType] || [buttonType];
        
        for (const btn of allButtons) {
          const text = (btn.textContent || btn.innerText || '').toLowerCase();
          const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
          const allText = text + ' ' + ariaLabel;
          
          for (const kw of targetKeywords) {
            if (allText.includes(kw)) {
              btn.click();
              return { success: true, clicked: buttonType, text: text.substring(0, 50) };
            }
          }
        }
        
        return { success: false, error: 'Botón no encontrado: ' + buttonType };
      })();
    `);

    if (result.success) {
      console.log(`[QWEN] ✅ Botón ${buttonType} activado`);
    }

    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Código de verificación eliminado - simplificado para mejor rendimiento

// ============ QWEN: CAMBIAR MODELO EN BROWSERVIEW (NUEVO) ============
ipcMain.handle('qwen:changeModel', async (_e, { model, provider }) => {
  try {
    if (provider !== 'qwen' || !qwenBrowserView) {
      return { success: false, error: 'QWEN not available' };
    }

    console.log(`[QWEN] Cambiando modelo a: ${model}`);

    // Verificar disponibilidad (usar nueva función basada en eventos)
    try {
      await waitForQWENReady(qwenBrowserView, 10000);
    } catch (error) {
      return { success: false, error: `QWEN not ready: ${error.message}` };
    }

    // Inyectar cambio de modelo
    const changeCode = `
      (function() {
        try {
          console.log('[QWEN Model Change] Buscando selector de modelo...');

          // Múltiples selectores posibles para el selector de modelo
          const modelSelectors = [
            '.model-selector',
            '[data-testid="model-selector"]',
            '.qwen-model-selector',
            'select.model',
            '[data-model-selector]',
            'button[data-model]',
            '.model-dropdown',
            '[role="combobox"][aria-label*="model"]'
          ];

          for (const selector of modelSelectors) {
            const elem = document.querySelector(selector);
            if (elem) {
              console.log('[QWEN Model Change] Elemento encontrado:', selector);
              elem.value = "${model}";
              elem.dispatchEvent(new Event('change', { bubbles: true }));
              console.log('[QWEN Model Change] ✅ Modelo cambiado');
              return { success: true };
            }
          }

          // Si no hay selector directo, intentar encontrar botones de modelo
          const modelButtons = document.querySelectorAll('button[data-model], [role="option"][data-model]');
          for (const btn of modelButtons) {
            if (btn.textContent.includes("${model}") || btn.getAttribute('data-model') === "${model}") {
              btn.click();
              console.log('[QWEN Model Change] ✅ Modelo cambiado (botón)');
              return { success: true };
            }
          }

          return { success: false, error: 'Model selector not found' };
        } catch (err) {
          return { success: false, error: err.message };
        }
      })();
    `;

    const result = await qwenBrowserView.webContents.executeJavaScript(changeCode);
    return result.success ? { success: true, model } : { success: false, error: result.error || 'Failed to change model' };
  } catch (error) {
    console.error(`[QWEN] Error al cambiar modelo:`, error.message);
    return { success: false, error: error.message };
  }
});

// ============ LOAD MODEL HANDLER ============
ipcMain.on('load-model', (event, model) => {
  try {
    console.log(`[IPC] Solicitud para cargar modelo: ${model}`);
    if (qwenBrowserView && qwenBrowserView.webContents) {
      const code = `
        (function() {
          try {
            // Buscar botón del modelo
            const buttons = document.querySelectorAll('button');
            let modelButton = null;

            for (const btn of buttons) {
              if (btn.textContent.includes('${model}') || btn.textContent.toLowerCase().includes('${model.toLowerCase()}')) {
                modelButton = btn;
                break;
              }
            }

            if (modelButton) {
              modelButton.click();
              return { success: true, message: 'Modelo cargado: ${model}' };
            }

            return { success: false, error: 'Botón del modelo no encontrado' };
          } catch (err) {
            return { success: false, error: err.message };
          }
        })();
      `;

      qwenBrowserView.webContents.executeJavaScript(code).then(result => {
        console.log(`[IPC] Resultado de cargar modelo:`, result);
      }).catch(err => {
        console.error(`[IPC] Error al cargar modelo:`, err);
      });
    }
  } catch (error) {
    console.error(`[IPC] Error en load-model handler:`, error.message);
  }
});

// ============ RESIZE SIDEBAR HANDLER ============
ipcMain.on('resize-sidebar', (event, width) => {
  try {
    console.log(`[IPC] Solicitud para redimensionar sidebar a ${width}px`);
    if (qwenBrowserView && mainWindow) {
      const [_, height] = mainWindow.getContentSize();
      qwenBrowserView.setBounds({ x: 0, y: 0, width: parseInt(width), height });
      console.log(`[IPC] Sidebar redimensionado: ${width}x${height}`);
    }
  } catch (error) {
    console.error(`[IPC] Error en resize-sidebar handler:`, error.message);
  }
});

ipcMain.handle('qwen:voiceChat', async (_e, { audioBase64, userId = 'default', text = '' }) => {
  try {
    const res = await fetch('http://localhost:8085/api/voice-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64, userId, text })
    });
    const data = await res.json();
    return data;
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ============ QWEN MCP BRIDGE - ELIMINADO (código corrupto) ============
// Función eliminada - sistema nuevo no la necesita
function injectMCPBridge_DELETED(browserView) {
  if (!browserView || !browserView.webContents) return;

  const bridgeCode = `
    (function() {
      if (window.mcpBridgeInjected) return;
      window.mcpBridgeInjected = true;
      
      // API para comunicarse con el servidor MCP (puerto 19875) - HERRAMIENTAS DIRECTAS
      const MCP_PORT = 19875;
      window.mcpBridge = {
        // Llamar a herramienta del servidor MCP (puerto 19875)
        callTool: async function(tool, params = {}) {
          try {
            const response = await fetch(\`http://localhost:\${MCP_PORT}/call\`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tool, params: params || {} })
            });
            const data = await response.json();
            return data;
          } catch (error) {
            console.error('[MCP Bridge] Error:', error);
            return { success: false, error: error.message };
          }
        },
        
        // ============ API para NEON (puerto 8765) - MEMORIA PERSISTENTE ============
        // Llamar a servidor MCP NEON para memoria persistente
        callNeon: async function(server, tool, arguments = {}) {
          try {
            const response = await fetch('http://localhost:8765/mcp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                mcp: true,
                calls: [{
                  server: server,
                  tool: tool,
                  arguments: arguments
                }]
              })
            });
            const result = await response.json();
            return result.results?.[0]?.result || result;
          } catch (error) {
            console.error('[MCP Bridge NEON] Error:', error);
            return { error: error.message };
          }
        },
        
        // Obtener memoria desde NEON
        getMemory: async function(sessionId = 'clay_main', key = 'core_identity') {
          return await this.callNeon('reina', 'get_memory', { session_id: sessionId, key: key });
        },
        
        // Guardar memoria en NEON
        setMemory: async function(sessionId = 'clay_main', key = 'core_identity', value = {}) {
          return await this.callNeon('reina', 'set_memory', { session_id: sessionId, key: key, value: value });
        },
        
        // Leer archivo - Usa servidor MCP puerto 19875
        readFile: async function(filePath) {
          return await this.callTool('read_file', { filePath });
        },
        
        // Escribir archivo - Usa servidor MCP puerto 19875
        writeFile: async function(filePath, content) {
          return await this.callTool('write_file', { filePath, content });
        },
        
        // Listar archivos - Usa servidor MCP puerto 19875
        listFiles: async function(dirPath) {
          return await this.callTool('list_files', { dirPath });
        },
        
        // Ejecutar comando - Usa servidor MCP puerto 19875
        executeCommand: async function(command) {
          return await this.callTool('execute_command', { command });
        },
        
        // Guardar en memoria local - Usa servidor MCP puerto 19875
        storeMemory: async function(key, value, tags = []) {
          return await this.callTool('memory_store', { key, value, tags });
        },
        
        // Obtener de memoria local - Usa servidor MCP puerto 19875
        getLocalMemory: async function(key) {
          return await this.callTool('memory_get', { key });
        },
        
        // Verificar disponibilidad del servidor MCP
        isAvailable: async function() {
          try {
            const response = await fetch(\`http://localhost:\${MCP_PORT}/tools\`);
            return { success: response.ok, available: response.ok };
          } catch (error) {
            return { success: false, available: false };
          }
        },
        
        // Verificar disponibilidad de NEON
        isNeonAvailable: async function() {
          try {
            const response = await fetch('http://localhost:8765/mcp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mcp: true, calls: [{ server: 'reina', tool: 'get_memory', arguments: { session_id: 'test', key: 'test' } }] })
            });
            return { success: true, available: true };
          } catch (error) {
            return { success: false, available: false };
          }
        }
// ============ QWEN MCP BRIDGE & SYSTEM PROMPT ============
// Funciones eliminadas (versiones _DELETED) por ser código muerto.
// La inyección y el manejo de memoria ahora se realizan a través de 
// qwen-auto-injector.js y qwen-mcp-preload.js de forma más robusta.

// IPC handlers para comunicación desde el BrowserView (usando servidor MCP puerto 19875)
ipcMain.handle('qwen:mcp:callTool', async (_e, { tool, ...params }) => {
  if (!mcpServer || !mcpServer.tools[tool]) {
    return { success: false, error: 'Tool ' + tool + ' not available' };
  }
  try {
    return await mcpServer.tools[tool](params || {});
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('qwen:mcp:listTools', async () => {
  if (!mcpServer) return { success: false, error: 'MCP server not available' };
  return { success: true, tools: Object.keys(mcpServer.tools) };
});

ipcMain.handle('qwen:mcp:available', async () => {
  try {
    const response = await fetch('http://localhost:19875/tools');
    return { success: response.ok, available: response.ok };
  } catch (error) {
    return { success: false, available: false };
  }
});

// ============ QWEN SYSTEM PROMPT & MEMORY INJECTION ============
let QwenMemoryManager, QwenAutoInjector, QwenSmartMemory;
try {
  QwenMemoryManager = require('./qwen-memory-manager');
  QwenAutoInjector = require('./qwen-auto-injector');
  QwenSmartMemory = require('./qwen-smart-memory');
  console.log('[Main] ✅ QWEN Memory Manager, Auto Injector y Smart Memory cargados');
} catch (e) {
  console.warn('[Main] QWEN Memory manager no disponible:', e.message);
}


    `;

  // Ejecutar script de inyección con NEON
  browserView.webContents.executeJavaScript(injectionScript).catch(err => {
    console.error('[QWEN] Error inyectando prompt y memoria NEON:', err);
  });

  // También usar el sistema de inyección existente como respaldo
  const script = injector.generateInjectionScript();
  browserView.webContents.executeJavaScript(script).catch(err => {
    console.error('[QWEN] Error inyectando script de respaldo:', err);
  });

  console.log('[QWEN] ✅ System prompt, memoria NEON e historial completo inyectados automáticamente');
} catch (error) {
  console.error('[QWEN] Error en inyección de prompt:', error);
}
}

// Función para guardar mensaje de la conversación actual
function saveQwenMessage(role, content) {
  if (!QwenMemoryManager) return;
  try {
    const memory = new QwenMemoryManager();
    memory.saveCurrentSessionMessage(role, content);
  } catch (error) {
    console.error('[QWEN] Error guardando mensaje:', error);
  }
}

// ============ AUTENTICACIÓN GOOGLE/GITHUB ============
let authWindow = null;

ipcMain.handle('auth:startGoogle', async () => {
  return { success: false, error: 'Autenticacion deshabilitada' };
  return new Promise((resolve) => {
    if (authWindow) {
      authWindow.focus();
      return resolve({ success: false, error: 'Auth window already open' });
    }

    authWindow = new BrowserWindow({
      width: 600,
      height: 700,
      parent: mainWindow,
      modal: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    // URL de login de QWEN con Google
    authWindow.loadURL('about:blank');

    authWindow.on('closed', () => {
      authWindow = null;
    });

    // Detectar cuando el login es exitoso
    authWindow.webContents.on('did-navigate', async (event, url) => {
      if (url && url !== 'about:blank') {
        // Login exitoso - obtener cookies de sesión
        const cookies = await authWindow.webContents.session.cookies.get({});
        if (mcpServer) {
          await mcpServer.tools.set_google_auth({
            token: JSON.stringify(cookies),
            email: 'authenticated'
          });
        }
        if (mainWindow) {
          mainWindow.webContents.send('auth:success', { provider: 'google' });
        }
        authWindow.close();
        resolve({ success: true, message: 'Autenticación exitosa' });
      }
    });
  });
});

ipcMain.handle('auth:startGithub', async () => {
  return { success: false, error: 'Autenticacion deshabilitada' };
  return new Promise((resolve) => {
    if (authWindow) {
      authWindow.focus();
      return resolve({ success: false, error: 'Auth window already open' });
    }

    authWindow = new BrowserWindow({
      width: 600,
      height: 700,
      parent: mainWindow,
      modal: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    authWindow.loadURL('about:blank');

    authWindow.on('closed', () => {
      authWindow = null;
    });

    authWindow.webContents.on('did-navigate', async (event, url) => {
      if (url && url !== 'about:blank') {
        const cookies = await authWindow.webContents.session.cookies.get({});
        if (mcpServer) {
          await mcpServer.tools.set_google_auth({
            token: JSON.stringify(cookies),
            email: 'github-authenticated'
          });
        }
        if (mainWindow) {
          mainWindow.webContents.send('auth:success', { provider: 'github' });
        }
        authWindow.close();
        resolve({ success: true, message: 'Autenticación GitHub exitosa' });
      }
    });
  });
});

ipcMain.handle('auth:getStatus', async () => {
  if (!mcpServer) return { success: false, authenticated: false };
  const result = await mcpServer.tools.get_google_auth();
  return {
    success: true,
    authenticated: !!result.auth,
    email: result.auth?.email || null
  };
});

ipcMain.handle('auth:logout', async () => {
  if (!mcpServer) return { success: false, error: 'MCP not available' };
  await mcpServer.tools.clear_google_auth();
  if (mainWindow) {
    mainWindow.webContents.send('auth:logout');
  }
  return { success: true };
});

// ============ NOTA: OAuth Anthropic/OpenAI REMOVIDOS ============
// Estos modelos ahora viven en iframes independientes con sus propias URLs públicas
// La autenticación se maneja completamente dentro de cada plataforma

// ============ HISTORIAL DE CHAT ============
ipcMain.handle('chat:addHistory', async (_e, { role, content }) => {
  if (!mcpServer) return { success: false, error: 'MCP not available' };
  return await mcpServer.tools.chat_history_add({ role, content });
});

ipcMain.handle('chat:getHistory', async (_e, { limit }) => {
  if (!mcpServer) return { success: false, error: 'MCP not available' };
  return await mcpServer.tools.chat_history_get({ limit });
});

// ============================================================================
// DEVTOOLS Y VENTANAS EXTERNAS
// ============================================================================
ipcMain.handle('devtools:open', async () => {
  if (mainWindow) {
    mainWindow.webContents.openDevTools();
    return { success: true, message: 'DevTools abierto' };
  }
  return { success: false, error: 'No main window' };
});

// Abrir en Opera - BLOQUEADO (no permitir ventanas externas)
ipcMain.handle('app:openInOpera', async (_e, { url }) => {
  console.log('[Main] 🚫 Bloqueando app:openInOpera:', url);
  // NO abrir ventanas externas - todo debe estar embebido
  return { success: false, error: 'Ventanas externas bloqueadas - use iframe embebido' };
});

// Abrir URL en navegador externo - BLOQUEADO (no permitir ventanas externas)
ipcMain.handle('shell:openExternal', async (_e, { url }) => {
  console.log('[Main] 🚫 Bloqueando shell.openExternal:', url);
  // NO abrir ventanas externas - todo debe estar embebido
  return { success: false, error: 'Ventanas externas bloqueadas - use iframe embebido' };
});

// ============================================================================
// MCP UNIVERSAL HANDLERS - Sincronización Multi-Agente
// ============================================================================

ipcMain.handle('mcp:sendProposal', async (_, data) => {
  if (!global.mcpUniversalClient) {
    return { success: false, error: 'MCP Client no inicializado' };
  }

  try {
    await global.mcpUniversalClient.sendProposal({
      title: data.title || 'Propuesta sin título',
      description: data.description || '',
      changes: data.changes || {},
      project: data.project || 'default'
    });
    return { success: true };
  } catch (error) {
    console.error('[MCP] Error enviando propuesta:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('mcp:sendReview', async (_, data) => {
  if (!global.mcpUniversalClient) {
    return { success: false, error: 'MCP Client no inicializado' };
  }

  try {
    await global.mcpUniversalClient.sendReview(data.proposalId, data.rating, data.feedback || '');
    return { success: true };
  } catch (error) {
    console.error('[MCP] Error enviando review:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.on('mcp:streamProgress', (_, data) => {
  if (!global.mcpUniversalClient) {
    console.warn('[MCP] Client no inicializado para streaming');
    return;
  }

  try {
    global.mcpUniversalClient.streamImplementation(data);
  } catch (error) {
    console.error('[MCP] Error streaming progreso:', error);
  }
});

ipcMain.handle('mcp:status', async () => {
  if (!global.mcpUniversalClient) {
    return { connected: false, error: 'MCP Client no inicializado' };
  }

  return {
    connected: global.mcpUniversalClient.isConnected,
    serverUrl: global.mcpUniversalClient.serverUrl,
    timestamp: Date.now()
  };
});

// ============================================================================
// AI MODELS HANDLERS - Controlar BrowserViews embebidos
// ============================================================================

// DESHABILITADO: ai-models-manager está deshabilitado para evitar conflictos con qwenBrowserView
ipcMain.handle('ai-models:show', async (_, { modelId, width }) => {
  return { success: false, error: 'AI Models Manager deshabilitado - usar qwen:toggle para Qwen' };
});

ipcMain.handle('ai-models:hide', async () => {
  return { success: false, error: 'AI Models Manager deshabilitado' };
});

ipcMain.handle('ai-models:send', async (_, { modelId, message }) => {
  return { success: false, error: 'AI Models Manager deshabilitado - usar qwen:sendMessage para Qwen' };
});

ipcMain.handle('ai-models:list', async () => {
  return { success: false, models: [], error: 'AI Models Manager deshabilitado' };
});

// ============ AUTO ORCHESTRATOR IPC HANDLERS ============
ipcMain.handle('auto:query', async (_, { message, selectedModels = [] }) => {
  if (!global.autoOrchestrator) {
    return { success: false, error: 'Auto Orchestrator no inicializado' };
  }

  if (!global.aiModelsManager) {
    return { success: false, error: 'AI Models Manager no inicializado' };
  }

  if (!global.mcpUniversalClient) {
    return { success: false, error: 'MCP Universal Client no inicializado' };
  }

  try {
    console.log('[AUTO IPC] Iniciando consulta multi-modelo con modelos:', selectedModels);
    const result = await global.autoOrchestrator.query(
      message,
      global.mcpUniversalClient,
      global.aiModelsManager,
      mainWindow,
      selectedModels
    );
    return { success: true, ...result };
  } catch (error) {
    console.error('[AUTO] Error en consulta:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('auto:getActiveQueries', async () => {
  if (!global.autoOrchestrator) {
    return { queries: [] };
  }

  try {
    const queries = global.autoOrchestrator.getActiveQueries();
    return { success: true, queries };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('auto:cancelQuery', async (_, { queryId }) => {
  if (!global.autoOrchestrator) {
    return { success: false, error: 'Auto Orchestrator no inicializado' };
  }

  try {
    const cancelled = global.autoOrchestrator.cancelQuery(queryId);
    return { success: cancelled };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============ API DISCOVERY IPC HANDLERS ============
ipcMain.handle('api:search', async (_, query) => {
  if (!global.apiDiscoveryService) {
    return { success: false, error: 'API Discovery no inicializado' };
  }

  try {
    const results = global.apiDiscoveryService.search(query);
    return { success: true, count: results.length, apis: results };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('api:getCategory', async (_, category) => {
  if (!global.apiDiscoveryService) {
    return { success: false, error: 'API Discovery no inicializado' };
  }

  try {
    const apis = global.apiDiscoveryService.getByCategory(category);
    return { success: true, category, count: apis.length, apis };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('api:recommend', async (_, task) => {
  if (!global.apiDiscoveryService) {
    return { success: false, error: 'API Discovery no inicializado' };
  }

  try {
    const recommendations = global.apiDiscoveryService.getRecommendations(task);
    return { success: true, task, count: recommendations.length, apis: recommendations };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('api:free', async () => {
  if (!global.apiDiscoveryService) {
    return { success: false, error: 'API Discovery no inicializado' };
  }

  try {
    const freeAPIs = global.apiDiscoveryService.getFreeAPIs();
    return { success: true, count: freeAPIs.length, apis: freeAPIs };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('api:stats', async () => {
  if (!global.apiDiscoveryService) {
    return { success: false, error: 'API Discovery no inicializado' };
  }

  try {
    const stats = global.apiDiscoveryService.getStats();
    return { success: true, stats };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('api:allCategories', async () => {
  if (!global.apiDiscoveryService) {
    return { success: false, error: 'API Discovery no inicializado' };
  }

  try {
    const categories = global.apiDiscoveryService.getAllCategories();
    return { success: true, count: categories.length, categories };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('api:systemInstruction', async () => {
  if (!global.apiDiscoveryService) {
    return { success: false, error: 'API Discovery no inicializado' };
  }

  try {
    const instruction = global.apiDiscoveryService.getSystemInstruction();
    return { success: true, instruction };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============ GROQ SERVICE IPC HANDLERS ============
ipcMain.handle('groq:chat', async (_, { message, model, temperature, maxTokens, systemPrompt }) => {
  if (!global.groqService) {
    return { success: false, error: 'Groq Service no inicializado' };
  }

  try {
    const result = await global.groqService.chat(message, {
      model: model || 'mixtral-8x7b-32768',
      temperature: temperature || 0.7,
      maxTokens: maxTokens || 1024,
      systemPrompt: systemPrompt || 'Eres un asistente IA útil y profesional.'
    });
    return { success: result.success, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('groq:chatMultiple', async (_, { messages, model, temperature, maxTokens }) => {
  if (!global.groqService) {
    return { success: false, error: 'Groq Service no inicializado' };
  }

  try {
    const result = await global.groqService.chatMultiple(messages, {
      model: model || 'mixtral-8x7b-32768',
      temperature: temperature || 0.7,
      maxTokens: maxTokens || 1024
    });
    return { success: result.success, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('groq:analyze', async (_, { text, type }) => {
  if (!global.groqService) {
    return { success: false, error: 'Groq Service no inicializado' };
  }

  try {
    const result = await global.groqService.analyzeText(text, type);
    return { success: result.success, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('groq:translate', async (_, { text, language }) => {
  if (!global.groqService) {
    return { success: false, error: 'Groq Service no inicializado' };
  }

  try {
    const result = await global.groqService.translate(text, language);
    return { success: result.success, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('groq:generateCode', async (_, { description, language }) => {
  if (!global.groqService) {
    return { success: false, error: 'Groq Service no inicializado' };
  }

  try {
    const result = await global.groqService.generateCode(description, language);
    return { success: result.success, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('groq:getModels', async () => {
  if (!global.groqService) {
    return { success: false, error: 'Groq Service no inicializado' };
  }

  try {
    const models = global.groqService.getAvailableModels();
    return { success: true, models };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('groq:getStats', async () => {
  if (!global.groqService) {
    return { success: false, error: 'Groq Service no inicializado' };
  }

  try {
    const stats = global.groqService.getStats();
    return { success: true, stats };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('groq:test', async () => {
  if (!global.groqService) {
    return { success: false, error: 'Groq Service no inicializado' };
  }

  try {
    const result = await global.groqService.testConnection();
    return { success: result.available, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============ GROQ MULTIMODAL IPC HANDLERS (Visión/Imagen/Audio) ============

ipcMain.handle('groq:chatWithVision', async (_, { textMessage, imageUrls, model, temperature, maxTokens }) => {
  if (!global.groqService) {
    return { success: false, error: 'Groq Service no inicializado' };
  }

  try {
    const result = await global.groqService.chatWithVision(textMessage, imageUrls, {
      model: model || 'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature: temperature || 0.7,
      maxTokens: maxTokens || 2048
    });
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('groq:analyzeImage', async (_, { imageUrl, analysisType, model, maxTokens }) => {
  if (!global.groqService) {
    return { success: false, error: 'Groq Service no inicializado' };
  }

  try {
    const result = await global.groqService.analyzeImage(imageUrl, analysisType || 'detailed', {
      model: model || 'meta-llama/llama-4-scout-17b-16e-instruct',
      maxTokens: maxTokens || 1024
    });
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('groq:autoMultimodal', async (_, { input, model, temperature, maxTokens }) => {
  if (!global.groqService) {
    return { success: false, error: 'Groq Service no inicializado' };
  }

  try {
    const result = await global.groqService.autoMultimodal(input, {
      model: model,
      temperature: temperature,
      maxTokens: maxTokens
    });
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============ AUDIT SYSTEM IPC HANDLERS ============
ipcMain.handle('audit:login', async (_, { username, password }) => {
  if (!global.auditSystem) {
    return { success: false, error: 'Audit System no inicializado' };
  }

  try {
    const result = global.auditSystem.login(username, password);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('audit:logout', async (_, { token }) => {
  if (!global.auditSystem) {
    return { success: false, error: 'Audit System no inicializado' };
  }

  try {
    const result = global.auditSystem.logout(token);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('audit:registerUser', async (_, { username, password, role }) => {
  if (!global.auditSystem) {
    return { success: false, error: 'Audit System no inicializado' };
  }

  try {
    const result = global.auditSystem.registerUser(username, password, role);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('audit:getLog', async (_, { token, type, user, limit }) => {
  if (!global.auditSystem) {
    return { success: false, error: 'Audit System no inicializado' };
  }

  try {
    const result = global.auditSystem.getAuditLog(token, { type, user, limit });
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============ CACHE IPC HANDLERS ============
ipcMain.handle('cache:get', async (_, { query, models }) => {
  if (!global.responseCache) {
    return { success: false, cached: false };
  }

  try {
    const result = global.responseCache.get(query, models);
    return { success: true, cached: result !== null, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('cache:set', async (_, { query, models, response }) => {
  if (!global.responseCache) {
    return { success: false };
  }

  try {
    global.responseCache.set(query, models, response);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('cache:stats', async () => {
  if (!global.responseCache) {
    return { success: false };
  }

  try {
    const stats = global.responseCache.getStats();
    return { success: true, stats };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('cache:clear', async () => {
  if (!global.responseCache) {
    return { success: false };
  }

  try {
    global.responseCache.clear();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============ TIMEOUT MANAGER IPC HANDLERS ============
ipcMain.handle('timeout:recordResponse', async (_, { modelId, responseTime, success }) => {
  if (!global.timeoutManager) {
    return { success: false };
  }

  try {
    global.timeoutManager.recordResponse(modelId, responseTime, success);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('timeout:getTimeouts', async () => {
  if (!global.timeoutManager) {
    return { success: false };
  }

  try {
    const timeouts = global.timeoutManager.getAllTimeouts();
    return { success: true, timeouts };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('timeout:getReport', async () => {
  if (!global.timeoutManager) {
    return { success: false };
  }

  try {
    const report = global.timeoutManager.getReport();
    return { success: true, report };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

console.log('✅ IPC Handlers AI Models registrados');
console.log('✅ IPC Handlers AUTO Orchestrator registrados');
console.log('✅ IPC Handlers Audit System registrados');
console.log('✅ IPC Handlers Cache registrados');
console.log('✅ IPC Handlers Timeout Manager registrados');
console.log('✅ IPC Handlers MCP Universal registrados');
console.log('✅ IPC Handlers Sandra IA (Groq) registrados');
console.log('📱 Arquitectura: Sandra IA (Groq) + iframes independientes para QWEN, Claude, GPT');
