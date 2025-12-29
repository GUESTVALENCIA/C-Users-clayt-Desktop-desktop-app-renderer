const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sandraAPI', {
  // ==================== CHAT Y MENSAJES ====================
  sendMessage: (message, role, mode = 'text') => ipcRenderer.invoke('send-message', { message, role, mode }),
  chatSend: (provider, message, role) => ipcRenderer.invoke('chat:send', { provider, message, role }),
  
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
  qwenToggle: (show) => ipcRenderer.invoke('qwen:toggle', { show }),
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

// QWEN - Solo QWEN embebido
console.log('✅ QWEN disponible');
