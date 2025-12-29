const { contextBridge, ipcRenderer } = require('electron');

// ============ PUENTE PARA QWEN EMBEBIDO ============
contextBridge.exposeInMainWorld('electronAPI', {
  loadModel: (model) => ipcRenderer.send('load-model', model),
  resizeSidebar: (width) => ipcRenderer.send('resize-sidebar', width),
  onModelLoaded: (callback) => ipcRenderer.on('model-loaded', (event, model) => callback(model))
});

contextBridge.exposeInMainWorld('sandraAPI', {
  // ==================== CHAT Y MENSAJES ====================
  sendMessage: (message, role, mode = 'text') => ipcRenderer.invoke('send-message', { message, role, mode }),
  chatSend: (provider, message, role, model, options) => ipcRenderer.invoke('chat:send', { provider, message, role, model, options }),
  
  // ==================== ROLES ====================
  getAllRoles: () => ipcRenderer.invoke('get-all-roles'),
  activateRole: (roleName) => ipcRenderer.invoke('activate-role', { roleName }),
  deactivateRole: (roleName) => ipcRenderer.invoke('deactivate-role', { roleName }),
  getActiveRoles: () => ipcRenderer.invoke('get-active-roles'),
  executeWithRole: (roleName, task) => ipcRenderer.invoke('execute-with-role', { roleName, task }),
  
  // ==================== MCP (MODULAR CONTROL PANEL) ====================
  mcpDeploy: (projectConfig) => ipcRenderer.invoke('mcp-deploy', { projectConfig }),
  mcpGenerateCode: (task, role, language) => ipcRenderer.invoke('mcp-generate-code', { task, role, language }),
  mcpSyncGitHub: () => ipcRenderer.invoke('mcp-sync-github'),
  mcpExecuteCommand: (command, cwd) => ipcRenderer.invoke('mcp-execute-command', { command, cwd }),
  mcpSpawnAgent: (role, config) => ipcRenderer.invoke('mcp-spawn-agent', { role, config }),
  mcpGetAgents: () => ipcRenderer.invoke('mcp-get-agents'),
  
  // ==================== LIVE UPDATER ====================
  checkUpdates: () => ipcRenderer.invoke('check-updates'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  
  // ==================== TAREAS ====================
  executeTask: (task, role) => ipcRenderer.invoke('execute-task', { task, role }),
  validateRole: (role, task) => ipcRenderer.invoke('validate-role', { role, task }),
  
  // ==================== NEGOCIACIÓN ====================
  negotiateAccommodation: (accommodationData) => ipcRenderer.invoke('negotiate-accommodation', { accommodationData }),
  
  // ==================== BÚSQUEDA ====================
  searchAccommodations: (destination, checkIn, checkOut, guests) => ipcRenderer.invoke('search-accommodations', { destination, checkIn, checkOut, guests }),
  getMyAccommodations: (checkIn, checkOut, guests) => ipcRenderer.invoke('get-my-accommodations', { checkIn, checkOut, guests }),
  
  // ==================== VENTAS ====================
  processSale: (saleData) => ipcRenderer.invoke('process-sale', { saleData }),
  
  // ==================== LLAMADAS ====================
  makePhoneCall: (phoneNumber, message) => ipcRenderer.invoke('make-phone-call', { phoneNumber, message }),
  
  // ==================== ESTADÍSTICAS ====================
  getStats: () => ipcRenderer.invoke('get-stats'),
  
  // ==================== PROVEEDOR LLM ====================
  getCurrentProvider: () => ipcRenderer.invoke('get-current-provider'),
  getAvailableProviders: () => ipcRenderer.invoke('get-available-providers'),
  setProvider: (provider) => ipcRenderer.invoke('set-provider', { provider }),
  
  // ==================== MULTIMODAL ====================
  transcribeAudio: (audioPath) => ipcRenderer.invoke('transcribe-audio', { audioPath }),
  transcribeBuffer: (audioBuffer, mimeType) => ipcRenderer.invoke('transcribe-buffer', { audioBuffer, mimeType }),
  generateSpeech: (text, options) => ipcRenderer.invoke('generate-speech', { text, options }),
  
  // Conversación multimodal completa
  startMultimodalConversation: (options = {}) => ipcRenderer.invoke('start-multimodal-conversation', options),
  stopMultimodalConversation: () => ipcRenderer.invoke('stop-multimodal-conversation'),
  
  // Envío de mensajes
  multimodalSendText: (text, userId) => ipcRenderer.invoke('multimodal-send-text', { text, userId }),
  multimodalSendVoice: (audioBuffer, userId) => ipcRenderer.invoke('multimodal-send-voice', { audioBuffer, userId }),
  
  // Streaming de audio
  sendAudioStream: (audioData) => ipcRenderer.invoke('send-audio-stream', { audioData }),
  
  // Control de modos
  setBargeIn: (enabled) => ipcRenderer.invoke('set-barge-in', { enabled }),
  setContinuousMode: (enabled) => ipcRenderer.invoke('set-continuous-mode', { enabled }),
  getMultimodalStatus: () => ipcRenderer.invoke('get-multimodal-status'),

  // SOS
  triggerSOS: () => ipcRenderer.invoke('trigger-sos'),

  // Sistema
  getSystemStatus: () => ipcRenderer.invoke('get-system-status'),
  
  // Avatar
  avatarSpeak: (text) => ipcRenderer.invoke('avatar-speak', { text }),
  createAvatarSession: () => ipcRenderer.invoke('create-avatar-session'),
  stopAvatar: () => ipcRenderer.invoke('stop-avatar'),
  
  // ==================== OPERA / NAVEGADOR EXTERNO ====================
  openInOpera: (url) => ipcRenderer.invoke('app:openInOpera', { url }),
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', { url })
  },
  
  // ==================== EVENTOS ====================
  onServicesReady: (callback) => ipcRenderer.on('services-ready', (event, data) => callback(data)),
  onServicesError: (callback) => ipcRenderer.on('services-error', (event, data) => callback(data)),
  
  // Eventos multimodales
  onTranscriptUpdate: (callback) => ipcRenderer.on('transcript-update', (event, data) => callback(data)),
  onResponseReady: (callback) => ipcRenderer.on('response-ready', (event, data) => callback(data)),
  onAvatarSpeaking: (callback) => ipcRenderer.on('avatar-speaking', (event, data) => callback(data)),
  onLipSyncFrame: (callback) => ipcRenderer.on('lip-sync-frame', (event, data) => callback(data)),
  onMultimodalSessionState: (callback) => ipcRenderer.on('multimodal-session-state', (event, data) => callback(data)),
  onMultimodalError: (callback) => ipcRenderer.on('multimodal-error', (event, data) => callback(data)),
  
  // Eventos de actualización
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (event, data) => callback(data)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (event, data) => callback(data))
,

  // ==================== LIPSYNC SOURCE ====================
  setLipSyncSourceVideo: (filePath) => ipcRenderer.invoke('set-lipsync-source-video', { filePath }),
  registerLipSyncSourceVideo: (name, base64) => ipcRenderer.invoke('register-lipsync-source-video', { name, base64 }),

  // ==================== GREETING ====================
  multimodalGreet: (text) => ipcRenderer.invoke('multimodal-greet', { text }),

  // ==================== TTS STREAM (DÚPLEX) ====================
  startTTSStream: (text, options) => ipcRenderer.invoke('start-tts-stream', { text, options }),
  stopTTSStream: () => ipcRenderer.invoke('stop-tts-stream'),
  onAudioChunk: (callback) => ipcRenderer.on('audio-chunk', (event, data) => callback(data)),

  // ==================== MCP/QWEN TOOLS ====================
  mcpCall: (tool, params) => ipcRenderer.invoke('mcp:call', { tool, params }),
  mcpListTools: () => ipcRenderer.invoke('mcp:listTools'),
  mcpGetPort: () => ipcRenderer.invoke('mcp:getPort'),
  
  // Memoria persistente
  memoryList: () => ipcRenderer.invoke('memory:list'),
  memoryStore: (key, value, tags) => ipcRenderer.invoke('memory:store', { key, value, tags }),
  memoryGet: (key) => ipcRenderer.invoke('memory:get', { key }),
  memorySearch: (query) => ipcRenderer.invoke('memory:search', { query }),
  
  // Sistema de archivos
  fsRead: (filePath) => ipcRenderer.invoke('fs:read', { filePath }),
  fsWrite: (filePath, content) => ipcRenderer.invoke('fs:write', { filePath, content }),
  fsList: (dirPath) => ipcRenderer.invoke('fs:list', { dirPath }),
  
  // Comandos
  cmdExecute: (command) => ipcRenderer.invoke('cmd:execute', { command }),
  executeCommand: (command) => ipcRenderer.invoke('cmd:execute', { command }),
  codeExecute: (code, language) => ipcRenderer.invoke('code:execute', { code, language }),
  executeCode: (code, language = 'javascript') => ipcRenderer.invoke('code:execute', { code, language }),

  // DevTools
  openDevTools: () => ipcRenderer.invoke('devtools:open'),

  // Open in Opera
  openInOpera: (url) => ipcRenderer.invoke('app:openInOpera', { url }),

  // ==================== QWEN MODELS ====================
  qwenGetModels: () => ipcRenderer.invoke('qwen:getModels'),
  qwenGetCurrentModel: () => ipcRenderer.invoke('qwen:getCurrentModel'),
  qwenSetModel: (modelId, options = {}) => ipcRenderer.invoke('qwen:setModel', { modelId, ...options }),
  qwenSetAutoMode: (enabled) => ipcRenderer.invoke('qwen:setAutoMode', { enabled }),
  qwenUpdateTokens: (tokens) => ipcRenderer.invoke('qwen:updateTokens', { tokens }),
  qwenGetState: () => ipcRenderer.invoke('qwen:getState'),
  qwenGetStateFull: () => ipcRenderer.invoke('qwen:getState'),
  qwenReportUsage: (tokens) => ipcRenderer.invoke('qwen:contextUsage', { tokens }),
  // QWEN - BrowserView
  qwenToggle: (show) => ipcRenderer.invoke('qwen:toggle', show),
  qwenSendMessage: (message) => ipcRenderer.invoke('qwen:sendMessage', { message }),
  qwenChangeModel: (modelId) => ipcRenderer.invoke('qwen:changeModel', { modelId, provider: 'qwen' }),
  qwenOpenPortal: () => Promise.resolve({ success: true }),
  qwenVoiceChat: (audioBase64, userId, text) => ipcRenderer.invoke('qwen:voiceChat', { audioBase64, userId, text }),
  qwenLogin: () => Promise.resolve({ success: true }),

  // Funciones de streaming de Qwen (mantener solo para funcionalidad adicional)
  qwenStartAudioStream: (options = {}) => ipcRenderer.invoke('qwen:startAudioStream', options),
  qwenStartVideoStream: (options = {}) => ipcRenderer.invoke('qwen:startVideoStream', options),
  qwenStartImageStream: (options = {}) => ipcRenderer.invoke('qwen:startImageStream', options),
  qwenStartTextStream: (options = {}) => ipcRenderer.invoke('qwen:startTextStream', options),

  // Eventos de modelos
  onModelChanged: (callback) => ipcRenderer.on('qwen:modelChanged', (event, data) => callback(data)),
  onAutoModeChanged: (callback) => ipcRenderer.on('qwen:autoModeChanged', (event, data) => callback(data)),
  onModelSwitched: (callback) => ipcRenderer.on('qwen:modelSwitched', (event, data) => callback(data)),
  onAppStatus: (callback) => ipcRenderer.on('app-status', (_event, data) => callback(data)),
  onQwenResponse: (callback) => ipcRenderer.on('qwen:response', (_event, data) => callback(data)),

  // ==================== AUTENTICACIÓN ====================
  authStartGoogle: () => ipcRenderer.invoke('auth:startGoogle'),
  authStartGithub: () => ipcRenderer.invoke('auth:startGithub'),
  authGetStatus: () => ipcRenderer.invoke('auth:getStatus'),
  authLogout: () => ipcRenderer.invoke('auth:logout'),
  
  // Eventos de auth
  onAuthSuccess: (callback) => ipcRenderer.on('auth:success', (event, data) => callback(data)),
  onAuthLogout: (callback) => ipcRenderer.on('auth:logout', (event) => callback()),

  // ==================== HISTORIAL DE CHAT ====================
  chatAddHistory: (role, content) => ipcRenderer.invoke('chat:addHistory', { role, content }),
  chatGetHistory: (limit) => ipcRenderer.invoke('chat:getHistory', { limit }),

  // ==================== MCP TOOLS - HERRAMIENTAS GENÉRICAS ====================
  tools: {
    memoryStore: (key, value, tags) => ipcRenderer.invoke('memory:store', { key, value, tags }),
    memoryGet: (key) => ipcRenderer.invoke('memory:get', { key }),
    memorySearch: (query) => ipcRenderer.invoke('memory:search', { query }),
    memoryList: () => ipcRenderer.invoke('memory:list'),

    fsRead: (filePath) => ipcRenderer.invoke('fs:read', { filePath }),
    fsWrite: (filePath, content) => ipcRenderer.invoke('fs:write', { filePath, content }),
    fsList: (dirPath) => ipcRenderer.invoke('fs:list', { dirPath }),

    cmdExecute: (command) => ipcRenderer.invoke('cmd:execute', { command }),
    codeExecute: (code, language) => ipcRenderer.invoke('code:execute', { code, language })
  }
});

// ============================================================================
// AI MODELS API - Controlar modelos embebidos
// ============================================================================
contextBridge.exposeInMainWorld('aiModels', {
  // Mostrar un modelo específico como panel lateral
  show: (modelId, width) => ipcRenderer.invoke('ai-models:show', { modelId, width }),

  // Ocultar todos los modelos
  hide: () => ipcRenderer.invoke('ai-models:hide'),

  // Enviar mensaje a un modelo
  send: (modelId, message) => ipcRenderer.invoke('ai-models:send', { modelId, message }),

  // Obtener lista de modelos disponibles
  list: () => ipcRenderer.invoke('ai-models:list'),

  // Escuchar respuestas interceptadas de modelos
  onResponse: (callback) =>
    ipcRenderer.on('ai-models:response', (_, data) => callback(data))
});

// ============================================================================
// MCP UNIVERSAL API - Sincronización Multi-Agente
// ============================================================================
contextBridge.exposeInMainWorld('mcpAPI', {
  // Enviar propuesta de cambios al MCP Universal
  sendProposal: (data) => ipcRenderer.invoke('mcp:sendProposal', {
    title: data.title,
    description: data.description,
    changes: data.changes,
    project: data.project || 'default'
  }),

  // Enviar review de una propuesta
  sendReview: (proposalId, rating, feedback) =>
    ipcRenderer.invoke('mcp:sendReview', { proposalId, rating, feedback }),

  // Transmitir progreso de implementación en tiempo real
  streamProgress: (data) => ipcRenderer.send('mcp:streamProgress', data),

  // Verificar estado de conexión MCP
  getStatus: () => ipcRenderer.invoke('mcp:status'),

  // Escuchar nuevas propuestas de otros agentes
  onNewProposal: (callback) =>
    ipcRenderer.on('mcp:newProposal', (_, data) => callback(data)),

  // Escuchar actualizaciones de implementación
  onImplementationUpdate: (callback) =>
    ipcRenderer.on('mcp:implementationUpdate', (_, data) => callback(data)),

  // Escuchar reviews
  onReviewReceived: (callback) =>
    ipcRenderer.on('mcp:reviewReceived', (_, data) => callback(data)),

  // Escuchar cualquier evento MCP
  onMCPEvent: (callback) =>
    ipcRenderer.on('mcp:event', (_, event) => callback(event))
});

// ============================================================================
// AUTO ORCHESTRATOR API - Multi-Agent Consensus System
// ============================================================================
contextBridge.exposeInMainWorld('autoAPI', {
  // Ejecutar consulta multi-modelo (AUTO button)
  query: (message, selectedModels = []) => ipcRenderer.invoke('auto:query', { message, selectedModels }),

  // Obtener consultas activas
  getActiveQueries: () => ipcRenderer.invoke('auto:getActiveQueries'),

  // Cancelar una consulta
  cancelQuery: (queryId) => ipcRenderer.invoke('auto:cancelQuery', { queryId }),

  // Escuchar inicio de consulta
  onQueryStarted: (callback) =>
    ipcRenderer.on('auto:queryStarted', (_, data) => callback(data)),

  // Escuchar completación de consulta
  onQueryCompleted: (callback) =>
    ipcRenderer.on('auto:queryCompleted', (_, data) => callback(data))
});

// ============================================================================
// AUDIT SYSTEM API - Auditoría y Login
// ============================================================================
contextBridge.exposeInMainWorld('auditAPI', {
  // Login con credenciales
  login: (username, password) => ipcRenderer.invoke('audit:login', { username, password }),

  // Logout
  logout: (token) => ipcRenderer.invoke('audit:logout', { token }),

  // Registrar nuevo usuario (solo admin)
  registerUser: (username, password, role) =>
    ipcRenderer.invoke('audit:registerUser', { username, password, role }),

  // Obtener log de auditoría
  getLog: (token, options = {}) =>
    ipcRenderer.invoke('audit:getLog', { token, ...options })
});

// ============================================================================
// CACHE API - Optimización de respuestas
// ============================================================================
contextBridge.exposeInMainWorld('cacheAPI', {
  // Obtener respuesta cacheada
  get: (query, models) => ipcRenderer.invoke('cache:get', { query, models }),

  // Guardar respuesta en cache
  set: (query, models, response) =>
    ipcRenderer.invoke('cache:set', { query, models, response }),

  // Obtener estadísticas
  getStats: () => ipcRenderer.invoke('cache:stats'),

  // Limpiar cache
  clear: () => ipcRenderer.invoke('cache:clear')
});

// ============================================================================
// TIMEOUT MANAGER API - Timeouts dinámicos
// ============================================================================
contextBridge.exposeInMainWorld('timeoutAPI', {
  // Registrar tiempo de respuesta
  recordResponse: (modelId, responseTime, success) =>
    ipcRenderer.invoke('timeout:recordResponse', { modelId, responseTime, success }),

  // Obtener timeouts actuales
  getTimeouts: () => ipcRenderer.invoke('timeout:getTimeouts'),

  // Obtener reporte de rendimiento
  getReport: () => ipcRenderer.invoke('timeout:getReport')
});

// ============================================================================
// API DISCOVERY SERVICE - Descubrimiento de APIs Gratuitas
// ============================================================================
contextBridge.exposeInMainWorld('apiDiscovery', {
  // Buscar APIs por consulta
  search: (query) => ipcRenderer.invoke('api:search', query),

  // Obtener APIs de una categoría
  getCategory: (category) => ipcRenderer.invoke('api:getCategory', category),

  // Obtener todas las categorías
  getAllCategories: () => ipcRenderer.invoke('api:allCategories'),

  // Obtener recomendaciones para una tarea
  recommend: (task) => ipcRenderer.invoke('api:recommend', task),

  // Obtener APIs completamente gratuitas
  getFreeAPIs: () => ipcRenderer.invoke('api:free'),

  // Obtener estadísticas
  getStats: () => ipcRenderer.invoke('api:stats'),

  // Obtener instrucciones del sistema para modelos IA
  getSystemInstruction: () => ipcRenderer.invoke('api:systemInstruction')
});

// ============================================================================
// GROQ SERVICE - API Ultra Rápida y Gratuita
// ============================================================================
contextBridge.exposeInMainWorld('groq', {
  // Chat simple
  chat: (message, options) => ipcRenderer.invoke('groq:chat', { message, ...options }),

  // Chat múltiple (conversación)
  chatMultiple: (messages, options) => ipcRenderer.invoke('groq:chatMultiple', { messages, ...options }),

  // Análisis de texto
  analyze: (text, type) => ipcRenderer.invoke('groq:analyze', { text, type }),

  // Traducción
  translate: (text, language) => ipcRenderer.invoke('groq:translate', { text, language }),

  // Generación de código
  generateCode: (description, language) => ipcRenderer.invoke('groq:generateCode', { description, language }),

  // Obtener modelos disponibles
  getModels: () => ipcRenderer.invoke('groq:getModels'),

  // Obtener estadísticas
  getStats: () => ipcRenderer.invoke('groq:getStats'),

  // Test de conexión
  test: () => ipcRenderer.invoke('groq:test'),

  // ============= MULTIMODAL (VISIÓN/IMAGEN/AUDIO) =============

  // Chat con visión - procesa imágenes + texto
  chatWithVision: (textMessage, imageUrls, options) =>
    ipcRenderer.invoke('groq:chatWithVision', { textMessage, imageUrls, ...options }),

  // Análisis visual de imagen
  analyzeImage: (imageUrl, analysisType, options) =>
    ipcRenderer.invoke('groq:analyzeImage', { imageUrl, analysisType, ...options }),

  // AUTO Multimodal - elige modelo automáticamente según tipo de entrada
  autoMultimodal: (input, options) =>
    ipcRenderer.invoke('groq:autoMultimodal', { input, ...options })
});

// QWEN - Solo QWEN embebido
console.log('✅ MCP Universal API expuesta');
console.log('✅ AUTO Orchestrator API expuesta');
console.log('✅ Audit System API expuesta');
console.log('✅ Cache API expuesta');
console.log('✅ Timeout Manager API expuesta');
console.log('✅ API Discovery Service expuesta');
console.log('✅ QWEN disponible');
