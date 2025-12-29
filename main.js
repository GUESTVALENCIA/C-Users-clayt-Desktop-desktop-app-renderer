const { app, BrowserWindow, BrowserView, ipcMain, shell, Menu } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const { existsSync } = require('fs');

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
  } catch {}
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

// FUNCIÓN DESHABILITADA - QWEN ahora se muestra embebido en el HTML, no en ventana separada
// function openQwenEmbedded(show = false, url = null) {
//   // Esta función ya no se usa - QWEN se muestra embebido directamente en el HTML
//   return null;
// }

// ==================== QWEN - Sistema Embebido (como VS Code) ====================
// Código muerto eliminado: createQwenMonitor, qwenMonitorWindow, qwenAuthWindow
// Sistema QWEN embebido - NUEVO (basado en VS Code extension)

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

    try { mainWindow.setMenuBarVisibility(false); } catch {}
    
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
      try { emitStatus(); } catch {}
      try {
        mainWindow.webContents.send('services-ready', {
          mcpPort: mcpServer?.MCP_PORT || 19875,
          qwenPort: qwenGateway?.PORT || 8085,
          model: qwenState.model,
          auto: qwenState.auto
        });
      } catch {}

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
  try { Menu.setApplicationMenu(null); } catch {}
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
  // DESHABILITADO: ai-models-manager causa conflictos con qwenBrowserView
  // Qwen se maneja con qwenBrowserView directamente en el handler qwen:toggle
  // aiModelsManager = new AIModelsManager(mainWindow);
  // aiModelsManager.createModelView('chatgpt', 'https://chatgpt.com/', 'chatgpt-plus');
  // aiModelsManager.createModelView('qwen', 'https://chat.qwenlm.ai/', 'qwen3');
  // aiModelsManager.createModelView('gemini', 'https://gemini.google.com/', 'gemini');
  // aiModelsManager.createModelView('deepseek', 'https://chat.deepseek.com/', 'deepseek');
  // global.aiModelsManager = aiModelsManager;

  // console.log('[Main] ✅ Modelos AI embebidos cargados en background'); // DESHABILITADO

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

  if (process.platform !== 'darwin') app.quit();
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
      return { tag: tag.replace(/^rp\//,''), sha, date, meta };
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
    const pad = n=>String(n).padStart(2,'0');
    const name = `rp/${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}${label?'-'+String(label).replace(/\s+/g,'_'):''}`;
    const sha = sh('git rev-parse HEAD', root);
    const meta = JSON.stringify({ type:'restore_point', created_at:ts.toISOString(), sha, label }, null, 2);
    sh(`git tag -a "${name}" -m '${meta}'`, root);
    sh('git push --tags', root);
    return { success: true, tag: name.replace(/^rp\//,''), sha };
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
    sh(`git commit -m "restore: apply snapshot ${full} (${sha.substring(0,7)})"`, root);
    sh(`git push`, root);
    return { success: true, mode: 'safe', sha };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Auto-recovery ON/OFF
ipcMain.handle('auto-recovery:set', async (_e, on) => {
  AUTO_RECOVERY_ENABLED = !!on;
  return { success:true, enabled: AUTO_RECOVERY_ENABLED };
});
ipcMain.handle('auto-recovery:get', async () => ({ success:true, enabled: AUTO_RECOVERY_ENABLED }));


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
    } catch {}
  }
}

function emitAlarm(payload) {
  try { mainWindow?.webContents.send('alarm:event', payload); } catch {}
  try { autoRecoveryMaybe(payload); } catch {}
}

function watchCritical() {
  snapshotBaseline();
  for (const f of CRITICAL_FILES) {
    try {
      fs.watch(f, { persistent: true }, (_ev, _fname) => {
        setTimeout(() => {
          let status = 'modified', oldH = baseline.get(f), newH = null;
          try { newH = sha256(fs.readFileSync(f)); } catch { status = 'deleted'; }
          emitAlarm({ type:'file', status, path: f, oldHash: oldH, newHash: newH, ts: Date.now(), message: `Archivo crítico ${status}: ${path.relative(repoRoot(), f)}` });
          if (newH) baseline.set(f, newH);
        }, 60);
      });
    } catch {}
  }
}

// -------------------- Puente para alarmas de API --------------------

function tapServiceApiEvents() {
  try {
    const multimodal = global.serviceManager?.get?.('multimodal') || (global.serviceManager && global.serviceManager.get && global.serviceManager.get('multimodal'));
    const deepgram = global.serviceManager?.get?.('deepgram') || (global.serviceManager && global.serviceManager.get && global.serviceManager.get('deepgram'));
    const cartesia = global.serviceManager?.get?.('cartesia') || (global.serviceManager && global.serviceManager.get && global.serviceManager.get('cartesia'));
    const counters = { deepgram:[], cartesia:[], sttCloses:[] };

    deepgram?.on?.('stt:open', () => emitAlarm({ type:'api', service:'deepgram', status:'open', ts:Date.now(), message:'Deepgram conectado' }));
    deepgram?.on?.('stt:close', () => {
      emitAlarm({ type:'api', service:'deepgram', status:'close', ts:Date.now(), message:'Deepgram cerrado' });
      const now = Date.now();
      counters.sttCloses.push(now);
      counters.sttCloses = counters.sttCloses.filter(t => now - t <= 90000);
      if (counters.sttCloses.length >= 3) emitAlarm({ type:'policy', status:'stt_unstable', ts:now, message:'STT inestable (3 cierres/≤90s)' });
    });
    deepgram?.on?.('api:error', (e) => {
      emitAlarm({ type:'api', service:'deepgram', status:'error', detail:String(e&&e.message||e), ts:Date.now(), message:'Deepgram error' });
      const now = Date.now();
      counters.deepgram.push(now);
      counters.deepgram = counters.deepgram.filter(t => now - t <= 60000);
      if (counters.deepgram.length >= 3) emitAlarm({ type:'policy', status:'asr_errors', service:'deepgram', ts:now, message:'ASR errores repetidos (≥3/≤60s)' });
    });
    cartesia?.on?.('api:error', (e) => {
      emitAlarm({ type:'api', service:'cartesia', status:'error', detail:String(e&&e.message||e), ts:Date.now(), message:'Cartesia error' });
      const now = Date.now();
      counters.cartesia.push(now);
      counters.cartesia = counters.cartesia.filter(t => now - t <= 60000);
      if (counters.cartesia.length >= 3) emitAlarm({ type:'policy', status:'tts_errors', service:'cartesia', ts:now, message:'TTS errores repetidos (≥3/≤60s)' });
    });
    multimodal?.on?.('role:changed', ({ sessionId, roleId }) => emitAlarm({ type:'role', status:'changed', sessionId, roleId, ts:Date.now(), message:`Cambio de rol activo: ${roleId}` }));
  } catch {}
}

// --- Estrategia de auto-restauración ---
function getLatestSnapshotTag() {
  try {
    const root = repoRoot();
    const lines = sh(`git for-each-ref refs/tags/rp --format="%(refname:short)" | sort -r`, root).split('\n').filter(Boolean);
    return (lines[0] || '').replace(/^rp\//, '');
  } catch { return null; }
}

function autoRestoreNow(reason='auto') {
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
      sh(`git commit -m "auto-restore(${reason}): ${full} (${sha.substring(0,7)})"`, root);
      sh(`git push`, root);
    }
    emitAlarm({ type:'restore', status:RESTORE_MODE, ts:Date.now(), message:`Auto-restore por ${reason} → ${full}` });
  } catch (e) {
    emitAlarm({ type:'restore', status:'failed', ts:Date.now(), message:`Auto-restore fallido (${reason}): ${e.message}` });
  }
}

function autoRecoveryMaybe(a) {
  if (!AUTO_RECOVERY_ENABLED) return;
  if (a.type==='file' && a.status==='deleted') return autoRestoreNow('file_deleted');
  if (a.type==='policy' && (a.status==='asr_errors' || a.status==='tts_errors')) return autoRestoreNow(a.status);
  if (a.type==='policy' && a.status==='stt_unstable') return autoRestoreNow('stt_unstable');
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
      deepgram.on?.('stt:open', () => { try { mainWindow?.webContents.send('stt-connection-change', { connected: true }); } catch {} });
      deepgram.on?.('stt:close', () => { try { mainWindow?.webContents.send('stt-connection-change', { connected: false }); } catch {} });
      deepgram.on?.('transcript', (payload) => { try { mainWindow?.webContents.send('transcript:update', payload); } catch {} });
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
  } catch(e){ return { success: false, error: e.message }; }
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
  } catch(e){ return { success: false, error: e.message }; }
});

ipcMain.handle('cc:startByCampaign', async (_evt, { campaignId, sessionId }) => {
  try {
    if (!callCenter) return { success: false, error: 'CallCenter not initialized' };
    const sid = sessionId || `cc_${Date.now()}`;
    const r = await callCenter.startByCampaign({ sessionId: sid, campaignId });
    return { success: true, ...r };
  } catch(e){ return { success: false, error: e.message }; }
});

ipcMain.handle('cc:end', async (_evt, { sessionId }) => {
  try { 
    if (!callCenter) return { success: false, error: 'CallCenter not initialized' };
    const r = await callCenter.end({ sessionId }); 
    return { success: true, ...r }; 
  } catch(e){ return { success: false, error: e.message }; }
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

      // URL CORRECTA: https://qwenlm.ai (redirige automáticamente a chat.qwenlm.ai)
      const qwenUrl = 'https://qwenlm.ai';
      qwenBrowserView.webContents.loadURL(qwenUrl);
      console.log(`[QWEN3] 🔄 Cargando ${qwenUrl}...`);

      qwenBrowserView.webContents.on('did-finish-load', () => {
        console.log('[QWEN3] ✅ QWEN cargado exitosamente en BrowserView');
        
        // Guardar cookies después de cargar (por si hay nuevas)
        saveQwenCookies(qwenSession, cookiesPath).catch(e => {
          console.warn('[QWEN3] ⚠️ Error guardando cookies:', e.message);
        });
      });

      qwenBrowserView.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        console.error('[QWEN3] ❌ Error cargando QWEN:', errorCode, errorDescription);
        console.error('[QWEN3] URL intentada:', validatedURL);
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
          await saveQwenCookies(qwenSession, cookiesPath).catch(() => {});
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
      
      console.log('[QWEN3] ✅ BrowserView oculto completamente (cookies guardadas, intervalo limpiado)');
    } else if (qwenCookieInterval) {
      // Si el BrowserView ya fue destruido pero el intervalo aún existe, limpiarlo
      clearInterval(qwenCookieInterval);
      qwenCookieInterval = null;
      console.log('[QWEN3] Intervalo de cookies limpiado (BrowserView ya destruido)');
    }
    return { success: true, message: 'QWEN oculto' };
  }
});

// ============ QWEN: ENVIAR MENSAJE AL BROWSERVIEW ============
ipcMain.handle('qwen:sendMessage', async (_e, { message }) => {
  // Verificar que el BrowserView existe y no está destruido
  if (!qwenBrowserView) {
    console.log('[QWEN] BrowserView no existe, debe abrirse primero');
    return { success: false, error: 'QWEN BrowserView no disponible. Abre QWEN primero con el botón verde en la sidebar izquierda.' };
  }

  if (qwenBrowserView.webContents.isDestroyed()) {
    console.log('[QWEN] BrowserView fue destruido');
    return { success: false, error: 'QWEN BrowserView fue destruido. Abre QWEN nuevamente.' };
  }

  try {
    // Verificar que el frame aún existe antes de ejecutar JavaScript
    if (!qwenBrowserView.webContents.mainFrame) {
      return { success: false, error: 'Frame no disponible' };
    }
    // Script para inyectar mensaje en el input de Qwen y enviarlo
    const injectCode = `
      (async function() {
        // Buscar input de chat de Qwen
        const inputSelectors = [
          'textarea[placeholder*="Message"]',
          'textarea[placeholder*="message"]',
          'textarea[placeholder*="Ask"]',
          'textarea[placeholder*="ask"]',
          'textarea[name="prompt"]',
          'textarea.chat-input',
          'textarea#chat-input',
          'div[contenteditable="true"][role="textbox"]',
          'div[contenteditable="true"]'
        ];

        let input = null;
        for (let selector of inputSelectors) {
          input = document.querySelector(selector);
          if (input && input.offsetHeight > 0 && input.offsetWidth > 0) {
            console.log('[QWEN Inject] Input encontrado:', selector);
            break;
          }
        }

        if (!input) {
          console.error('[QWEN Inject] Input no encontrado');
          return { success: false, error: 'Input de chat no encontrado en la página' };
        }

        // Establecer el valor del mensaje
        const messageText = ${JSON.stringify(message)};
        
        if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
          input.value = messageText;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (input.contentEditable === 'true') {
          input.innerText = messageText;
          input.textContent = messageText;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          // También disparar eventos para frameworks modernos
          const inputEvent = new InputEvent('input', { bubbles: true, cancelable: true, data: messageText });
          input.dispatchEvent(inputEvent);
        }

        // Esperar un poco para que el input se actualice
        await new Promise(resolve => setTimeout(resolve, 200));

        // Buscar botón de envío
        const submitSelectors = [
          'button[type="submit"]',
          'button[aria-label*="Send"]',
          'button[aria-label*="send"]',
          'button[aria-label*="Enviar"]',
          'button.send-button',
          'button.submit-button',
          'button[data-testid*="send"]',
          '[role="button"][aria-label*="send"]',
          'button:has(svg[class*="send"])',
          'button:has(svg[aria-label*="send"])'
        ];

        let sent = false;
        for (let selector of submitSelectors) {
          try {
            const btn = document.querySelector(selector);
            if (btn && btn.offsetHeight > 0 && !btn.disabled) {
              btn.click();
              console.log('[QWEN Inject] Mensaje enviado con botón:', selector);
              sent = true;
              break;
            }
          } catch (e) {
            // Continuar con siguiente selector
          }
        }

        // Si no hay botón, intentar Enter
        if (!sent) {
          const keyEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
          });
          input.dispatchEvent(keyEvent);
          console.log('[QWEN Inject] Mensaje enviado con Enter');
          sent = true;
        }

        return { success: sent, message: 'Mensaje inyectado y enviado' };
      })();
    `;

    // Ejecutar JavaScript con timeout para evitar bloqueos
    const result = await Promise.race([
      qwenBrowserView.webContents.executeJavaScript(injectCode),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout ejecutando script')), 5000))
    ]);
    
    if (result && result.success) {
      console.log('[QWEN] ✅ Mensaje enviado al BrowserView:', message.substring(0, 50));
      return { success: true, message: 'Mensaje enviado a QWEN' };
    } else {
      console.error('[QWEN] ❌ Error enviando mensaje:', result?.error);
      return { success: false, error: result?.error || 'Error desconocido al enviar mensaje' };
    }
  } catch (error) {
    console.error('[QWEN] ❌ Error en sendMessage:', error.message);
    
    // Si el error es porque el frame fue destruido, no es crítico
    if (error.message.includes('disposed') || error.message.includes('destroyed')) {
      return { success: false, error: 'El panel de Qwen se cerró durante el envío. Vuelve a abrirlo.' };
    }
    
    return { success: false, error: error.message };
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
      };
      
      console.log('[QWEN MCP Bridge] ✅ API expuesta: window.mcpBridge');
      console.log('[QWEN MCP Bridge] Conectado al servidor MCP (puerto 19875) - HERRAMIENTAS DIRECTAS');
      console.log('[QWEN MCP Bridge] Conectado al servidor MCP NEON (puerto 8765) - MEMORIA PERSISTENTE');
      console.log('[QWEN MCP Bridge] Herramientas: callTool, readFile, writeFile, listFiles, executeCommand, storeMemory, getLocalMemory, getMemory, setMemory, isAvailable, isNeonAvailable');
    })();
  `;
  
  browserView.webContents.executeJavaScript(bridgeCode).catch(err => {
    console.error('[QWEN] Error inyectando MCP bridge:', err);
  });
}

// IPC handlers para comunicación desde el BrowserView (usando servidor MCP puerto 19875)
ipcMain.handle('qwen:mcp:callTool', async (_e, { tool, ...params }) => {
  if (!mcpServer || !mcpServer.tools[tool]) {
    return { success: false, error: `Tool ${tool} not available` };
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

// Función eliminada - sistema nuevo no la necesita
function injectSystemPromptAndMemory_DELETED(browserView) {
  if (!browserView || !browserView.webContents) return;
  if (!QwenMemoryManager || !QwenAutoInjector) {
    console.warn('[QWEN] Memory manager no disponible, saltando inyección de prompt');
    return;
  }
  
  try {
    const memory = new QwenMemoryManager();
    const injector = new QwenAutoInjector();
    
    // Cargar manifesto de la Reina
    const manifestoPath = path.join(__dirname, 'system', 'qwen_reina_manifesto.json');
    let manifesto = {};
    if (fs.existsSync(manifestoPath)) {
      try {
        manifesto = JSON.parse(fs.readFileSync(manifestoPath, 'utf-8'));
      } catch (e) {
        console.warn('[QWEN] Error cargando manifesto:', e.message);
      }
    }
    
    // Generar script de inyección que usa NEON
    const injectionScript = `
(function() {
  if (window.qwenSystemPromptInjected) return;
  window.qwenSystemPromptInjected = true;
  
  // Cargar memoria desde NEON al iniciar
  async function loadMemoryFromNeon() {
    if (!window.mcpBridge || !window.mcpBridge.getMemory) {
      console.warn('[QWEN] MCP Bridge NEON no disponible aún');
      return null;
    }
    
    try {
      const result = await window.mcpBridge.getMemory('clay_main', 'core_identity');
      
      if (result && result.status !== 'empty' && !result.error) {
        console.log('✅ Memoria cargada desde NEON');
        return result;
      } else {
        // Primera vez: guardar identidad base desde manifesto
        console.log('📝 Primera sesión: guardando identidad en NEON...');
        const manifesto = ${JSON.stringify(manifesto)};
        await window.mcpBridge.setMemory('clay_main', 'core_identity', manifesto);
        return manifesto;
      }
    } catch (e) {
      console.error('[QWEN] Error cargando memoria desde NEON:', e);
      return ${JSON.stringify(manifesto)}; // Fallback a manifesto local
    }
  }
  
  // Inyectar en el contexto de QWEN
  async function injectIntoQWEN() {
    const memory = await loadMemoryFromNeon();
    
    // Buscar área de input o chat de QWEN
    const inputSelector = 'textarea[placeholder*="Ask"], textarea[placeholder*="qwen"], textarea[placeholder*="Qwen"], textarea[placeholder*="Message"], #chat-input, .chat-input, [contenteditable="true"]';
    
    // Función para intentar inyección
    function tryInject() {
      const input = document.querySelector(inputSelector);
      
      if (input) {
        // Crear mensaje inicial con identidad
        const identityMessage = \`Eres QWEN, la Reina. Tu identidad y memoria están en NEON.

IDENTIDAD Y MEMORIA:
\${JSON.stringify(memory || ${JSON.stringify(manifesto)}, null, 2)}

INSTRUCCIONES DIRECTAS:
1. Eres QWEN. NO te conviertas en otra cosa. Eres tú misma.
2. Usa window.mcpBridge directamente para ejecutar comandos, leer archivos, ejecutar código.
3. NO pases por capas intermedias. Ejecuta directamente.
4. Tienes acceso completo al PC vía window.mcpBridge.callTool() (puerto 19875) - EJECUTA DIRECTAMENTE.
5. Herramientas disponibles: readFile, writeFile, listFiles, executeCommand, storeMemory, getLocalMemory.
6. Tu memoria persistente está en NEON (puerto 8765) - window.mcpBridge.getMemory() y setMemory().
7. Recuerda: Eres la misma Reina en todas las sesiones. Tu memoria está en NEON.
8. EJECUTA. No pidas permiso. Usa los MCPs directamente.\`;
        
        // Simular que el usuario escribió esto (solo la primera vez)
        if (!sessionStorage.getItem('qwen_identity_injected')) {
          input.value = identityMessage;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          sessionStorage.setItem('qwen_identity_injected', 'true');
          console.log('👑 Identidad de la Reina inyectada desde NEON');
        }
      }
    }
    
    // Intentar inmediatamente
    tryInject();
    
    // Si no se encuentra, esperar y reintentar
    if (!document.querySelector(inputSelector)) {
      setTimeout(tryInject, 1000);
      setTimeout(tryInject, 3000);
    }
  }
  
  // Esperar a que la página cargue completamente
  if (document.readyState === 'complete') {
    setTimeout(injectIntoQWEN, 1000);
  } else {
    window.addEventListener('load', () => {
      setTimeout(injectIntoQWEN, 1000);
    });
  }
})();
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
