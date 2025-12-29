// ============ MCP SERVER UNIFICADO MULTI-PROVEEDOR ============
// Servidor HTTP para Groq, QWEN, Anthropic, OpenAI
// Soporta: memoria, archivos, comandos, código, streaming, imágenes, audio, video

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const MEMORY_FILE = path.join(process.env.USERPROFILE || 'C:\\Users\\clayt', '.sandra-memory.json');
const STATE_FILE = path.join(process.env.USERPROFILE || 'C:\\Users\\clayt', '.sandra-state.json');
const MCP_PORT = 19875;

// ============ MODELOS GROQ ============
const GROQ_MODELS = {
  'llama-3.1-70b-versatile': { context: 8000, type: 'text', tier: 'llama-3.1', priority: 1 },
  'llama-3.1-8b-instant': { context: 8000, type: 'text', tier: 'llama-3.1', priority: 2 },
  'mixtral-8x7b-32768': { context: 32768, type: 'text', tier: 'mixtral', priority: 3 },
  'gemma-7b-it': { context: 8000, type: 'text', tier: 'gemma', priority: 4 }
};

// ============ MODELOS QWEN CON VENTANAS DE CONTEXTO ============
const QWEN_MODELS = {
  'qwen-max-latest': { context: 32000, type: 'text', tier: 'max', priority: 1 },
  'qwen-max': { context: 32000, type: 'text', tier: 'max', priority: 2 },
  'qwen-plus-latest': { context: 131000, type: 'text', tier: 'plus', priority: 3 },
  'qwen-plus': { context: 131000, type: 'text', tier: 'plus', priority: 4 },
  'qwen-turbo-latest': { context: 1000000, type: 'text', tier: 'turbo', priority: 5 },
  'qwen-turbo': { context: 1000000, type: 'text', tier: 'turbo', priority: 6 },
  'qwen-long': { context: 10000000, type: 'text', tier: 'long', priority: 7 },
  'qwen-vl-max-latest': { context: 32000, type: 'vision', tier: 'max', priority: 8 },
  'qwen-vl-max': { context: 32000, type: 'vision', tier: 'max', priority: 9 },
  'qwen-vl-plus-latest': { context: 131000, type: 'vision', tier: 'plus', priority: 10 },
  'qwen-vl-plus': { context: 131000, type: 'vision', tier: 'plus', priority: 11 },
  'qwen-omni-turbo': { context: 131000, type: 'omni', tier: 'turbo', priority: 12, capabilities: ['text', 'vision', 'audio', 'video'] },
  'qwen3-235b-a22b': { context: 131000, type: 'vision', tier: 'qwen3', priority: 13 },
  'qwen3-32b': { context: 131000, type: 'text', tier: 'qwen3', priority: 14 },
  'qwen3-30b-a3b': { context: 131000, type: 'text', tier: 'qwen3', priority: 15 },
  'qwen3-14b': { context: 131000, type: 'text', tier: 'qwen3', priority: 16 },
  'qwen3-8b': { context: 131000, type: 'text', tier: 'qwen3', priority: 17 },
  'qwen3-4b': { context: 32000, type: 'text', tier: 'qwen3', priority: 18 },
  'qwen3-1.7b': { context: 32000, type: 'text', tier: 'qwen3', priority: 19 },
  'qwen3-0.6b': { context: 32000, type: 'text', tier: 'qwen3', priority: 20 },
  'qwen2.5-vl-72b-instruct': { context: 128000, type: 'vision', tier: 'qwen2.5', priority: 21 },
  'qwen2.5-vl-32b-instruct': { context: 128000, type: 'vision', tier: 'qwen2.5', priority: 22 },
  'qwen2.5-vl-7b-instruct': { context: 128000, type: 'vision', tier: 'qwen2.5', priority: 23 },
  'qwen2.5-vl-3b-instruct': { context: 128000, type: 'vision', tier: 'qwen2.5', priority: 24 },
  'qwen2.5-coder-32b-instruct': { context: 128000, type: 'code', tier: 'qwen2.5-coder', priority: 25 },
  'qwen2.5-coder-14b-instruct': { context: 128000, type: 'code', tier: 'qwen2.5-coder', priority: 26 },
  'qwen2.5-coder-7b-instruct': { context: 128000, type: 'code', tier: 'qwen2.5-coder', priority: 27 },
  'qwen2.5-72b-instruct': { context: 128000, type: 'text', tier: 'qwen2.5', priority: 28 },
  'qwen2.5-32b-instruct': { context: 128000, type: 'text', tier: 'qwen2.5', priority: 29 },
  'qwen2.5-14b-instruct': { context: 128000, type: 'text', tier: 'qwen2.5', priority: 30 },
  'qwen2.5-7b-instruct': { context: 128000, type: 'text', tier: 'qwen2.5', priority: 31 },
  'qwq-plus': { context: 131000, type: 'reasoning', tier: 'qwq', priority: 32 },
  'qwq-32b': { context: 32000, type: 'reasoning', tier: 'qwq', priority: 33 }
};

// ============ MODELOS ANTHROPIC (CLAUDE) ============
const ANTHROPIC_MODELS = {
  'claude-opus-4-5': { context: 200000, type: 'text', tier: 'opus', priority: 1 },
  'claude-sonnet-4': { context: 200000, type: 'text', tier: 'sonnet', priority: 2 },
  'claude-haiku-4': { context: 200000, type: 'text', tier: 'haiku', priority: 3 },
  'claude-opus': { context: 200000, type: 'text', tier: 'opus', priority: 4 },
  'claude-sonnet': { context: 200000, type: 'text', tier: 'sonnet', priority: 5 },
  'claude-haiku': { context: 200000, type: 'text', tier: 'haiku', priority: 6 }
};

// ============ MODELOS OPENAI (GPT) ============
const OPENAI_MODELS = {
  'gpt-4o': { context: 128000, type: 'text', tier: 'gpt-4o', priority: 1 },
  'gpt-4o-mini': { context: 128000, type: 'text', tier: 'gpt-4o-mini', priority: 2 },
  'gpt-4-turbo': { context: 128000, type: 'text', tier: 'gpt-4-turbo', priority: 3 },
  'gpt-4': { context: 8192, type: 'text', tier: 'gpt-4', priority: 4 },
  'gpt-3.5-turbo': { context: 16000, type: 'text', tier: 'gpt-3.5', priority: 5 }
};

// ============ ESTADO DE LA APLICACIÓN UNIFICADO ============
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) { console.error('Error loading state:', e); }

  // Estado inicial para sistema multi-proveedor
  return {
    version: '8.0.0',
    currentProvider: 'groq',
    lastUpdated: new Date().toISOString(),
    providers: {
      groq: {
        enabled: true,
        currentModel: 'llama-3.1-70b-versatile',
        tokensUsed: 0,
        autoMode: false,
        lastUsed: null,
        auth: { type: 'api_key', validated: false }
      },
      qwen: {
        enabled: true,
        currentModel: 'qwen-plus-latest',
        tokensUsed: 0,
        autoMode: false,
        lastUsed: null,
        auth: { type: 'oauth', provider: 'google', cookies: null }
      },
      anthropic: {
        enabled: true,
        currentModel: 'claude-sonnet-4',
        tokensUsed: 0,
        autoMode: false,
        lastUsed: null,
        auth: { type: 'oauth', cookies: null }
      },
      openai: {
        enabled: true,
        currentModel: 'gpt-4o',
        tokensUsed: 0,
        autoMode: false,
        lastUsed: null,
        auth: { type: 'oauth', cookies: null }
      }
    },
    preferences: {
      defaultProvider: 'groq',
      enableGlobalAutoSwitch: false,
      theme: 'dark'
    }
  };
}

function saveState(state) {
  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

// ============ MEMORIA PERSISTENTE ============
function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    }
  } catch (e) { console.error('Error loading memory:', e); }
  return { entries: [], context: '', chatHistory: [], lastUpdated: new Date().toISOString() };
}

function saveMemory(memory) {
  memory.lastUpdated = new Date().toISOString();
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2), 'utf8');
}

// ============ AUTO-SWITCH INTELIGENTE POR PROVEEDOR ============
function getNextModel(provider, currentModel, tokensUsed) {
  const modelsMap = {
    groq: GROQ_MODELS,
    qwen: QWEN_MODELS,
    anthropic: ANTHROPIC_MODELS,
    openai: OPENAI_MODELS
  };

  const models = modelsMap[provider];
  if (!models || !models[currentModel]) return currentModel;

  const current = models[currentModel];
  const contextLimit = current.context;
  const usagePercent = (tokensUsed / contextLimit) * 100;

  // Si uso > 85%, buscar modelo con mayor contexto
  if (usagePercent > 85) {
    const sortedModels = Object.entries(models)
      .filter(([name, info]) => info.context > contextLimit && info.type === current.type)
      .sort((a, b) => a[1].priority - b[1].priority);

    if (sortedModels.length > 0) {
      return sortedModels[0][0];
    }
  }

  return currentModel;
}

// ============ HERRAMIENTAS MCP COMPLETAS ============
const tools = {
  // ======= GESTIÓN DE MODELOS =======
  get_models: async ({ provider }) => {
    const modelsMap = {
      groq: GROQ_MODELS,
      qwen: QWEN_MODELS,
      anthropic: ANTHROPIC_MODELS,
      openai: OPENAI_MODELS
    };
    return { success: true, models: modelsMap[provider] || {} };
  },

  set_model: async ({ provider, model }) => {
    const modelsMap = {
      groq: GROQ_MODELS,
      qwen: QWEN_MODELS,
      anthropic: ANTHROPIC_MODELS,
      openai: OPENAI_MODELS
    };

    const models = modelsMap[provider];
    if (!models || !models[model]) {
      return { success: false, error: `Modelo no encontrado: ${model}` };
    }

    const state = loadState();
    state.providers[provider].currentModel = model;
    state.providers[provider].tokensUsed = 0;
    state.currentProvider = provider;
    saveState(state);
    return { success: true, model, context: models[model].context };
  },

  get_current_model: async ({ provider }) => {
    const modelsMap = {
      groq: GROQ_MODELS,
      qwen: QWEN_MODELS,
      anthropic: ANTHROPIC_MODELS,
      openai: OPENAI_MODELS
    };

    const state = loadState();
    const providerState = state.providers[provider];
    const models = modelsMap[provider];

    return {
      success: true,
      model: providerState.currentModel,
      info: models[providerState.currentModel],
      tokensUsed: providerState.tokensUsed
    };
  },

  set_auto_mode: async ({ provider, enabled }) => {
    const state = loadState();
    state.providers[provider].autoMode = !!enabled;
    saveState(state);
    return { success: true, autoMode: state.providers[provider].autoMode };
  },

  update_tokens: async ({ provider, tokens }) => {
    const state = loadState();
    const providerState = state.providers[provider];
    providerState.tokensUsed = tokens;

    // Auto-switch si está habilitado
    if (providerState.autoMode) {
      const nextModel = getNextModel(provider, providerState.currentModel, tokens);
      if (nextModel !== providerState.currentModel) {
        providerState.currentModel = nextModel;
        providerState.tokensUsed = 0;
        saveState(state);
        return {
          success: true,
          switched: true,
          newModel: nextModel,
          provider
        };
      }
    }

    saveState(state);
    return { success: true, tokensUsed: providerState.tokensUsed };
  },

  // ======= MEMORIA PERSISTENTE =======
  memory_store: async ({ key, value, tags }) => {
    const memory = loadMemory();
    const entry = { key, value, timestamp: new Date().toISOString(), tags: tags || [] };
    const idx = memory.entries.findIndex(e => e.key === key);
    if (idx >= 0) memory.entries[idx] = entry;
    else memory.entries.push(entry);
    saveMemory(memory);
    return { success: true, message: `Guardado: ${key}` };
  },

  memory_get: async ({ key }) => {
    const memory = loadMemory();
    const entry = memory.entries.find(e => e.key === key);
    return entry ? { success: true, entry } : { success: false, message: 'No encontrado' };
  },

  memory_list: async () => {
    const memory = loadMemory();
    return { success: true, entries: memory.entries, context: memory.context, total: memory.entries.length };
  },

  memory_search: async ({ query }) => {
    const memory = loadMemory();
    const q = query.toLowerCase();
    const results = memory.entries.filter(e =>
      e.key.toLowerCase().includes(q) ||
      e.value.toLowerCase().includes(q) ||
      e.tags?.some(t => t.toLowerCase().includes(q))
    );
    return { success: true, results, count: results.length };
  },

  memory_delete: async ({ key }) => {
    const memory = loadMemory();
    const idx = memory.entries.findIndex(e => e.key === key);
    if (idx >= 0) {
      memory.entries.splice(idx, 1);
      saveMemory(memory);
      return { success: true };
    }
    return { success: false, message: 'No encontrado' };
  },

  memory_set_context: async ({ context }) => {
    const memory = loadMemory();
    memory.context = context;
    saveMemory(memory);
    return { success: true };
  },

  memory_clear: async () => {
    saveMemory({ entries: [], context: '', chatHistory: [], lastUpdated: new Date().toISOString() });
    return { success: true, message: 'Memoria limpiada' };
  },

  // ======= HISTORIAL DE CHAT =======
  chat_history_add: async ({ role, content, provider }) => {
    const memory = loadMemory();
    if (!memory.chatHistory) memory.chatHistory = [];
    memory.chatHistory.push({
      role,
      content,
      provider: provider || loadState().currentProvider,
      timestamp: new Date().toISOString()
    });
    if (memory.chatHistory.length > 100) {
      memory.chatHistory = memory.chatHistory.slice(-100);
    }
    saveMemory(memory);
    return { success: true };
  },

  chat_history_get: async ({ limit }) => {
    const memory = loadMemory();
    const history = memory.chatHistory || [];
    const result = limit ? history.slice(-limit) : history;
    return { success: true, history: result, total: history.length };
  },

  // ======= SISTEMA DE ARCHIVOS =======
  read_file: async ({ filePath, encoding }) => {
    try {
      const content = fs.readFileSync(filePath, encoding || 'utf8');
      const stats = fs.statSync(filePath);
      return {
        success: true,
        content,
        size: stats.size,
        modified: stats.mtime.toISOString()
      };
    } catch (e) { return { success: false, error: e.message }; }
  },

  write_file: async ({ filePath, content, encoding }) => {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, content, encoding || 'utf8');
      return { success: true, message: `Archivo escrito: ${filePath}` };
    } catch (e) { return { success: false, error: e.message }; }
  },

  list_files: async ({ dirPath }) => {
    try {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });
      const list = items.map(i => ({
        name: i.name,
        isDir: i.isDirectory(),
        path: path.join(dirPath, i.name)
      }));
      return { success: true, files: list, count: list.length };
    } catch (e) { return { success: false, error: e.message }; }
  },

  // ======= EJECUCIÓN DE COMANDOS =======
  execute_command: async ({ command, cwd, timeout }) => {
    try {
      const options = {
        shell: 'powershell.exe',
        timeout: timeout || 30000,
        cwd: cwd || process.cwd()
      };
      const { stdout, stderr } = await execAsync(command, options);
      return { success: true, stdout: stdout.trim(), stderr: stderr.trim() };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  // ======= EJECUCIÓN DE CÓDIGO =======
  execute_code: async ({ code, language }) => {
    try {
      const tempFile = path.join(process.env.TEMP || 'C:\\Temp', `code_${Date.now()}.${language === 'python' ? 'py' : 'js'}`);
      fs.writeFileSync(tempFile, code, 'utf8');
      const { stdout, stderr } = await execAsync(
        language === 'python' ? `python "${tempFile}"` : `node "${tempFile}"`,
        { shell: 'powershell.exe', timeout: 60000 }
      );
      fs.unlinkSync(tempFile);
      return { success: true, output: stdout.trim(), stderr: stderr.trim() };
    } catch (e) { return { success: false, error: e.message }; }
  },

  // ======= UTILIDADES =======
  get_system_info: async () => {
    const os = require('os');
    return {
      success: true,
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      cpus: os.cpus().length,
      memory: {
        total: Math.round(os.totalmem() / 1024 / 1024 / 1024) + ' GB',
        free: Math.round(os.freemem() / 1024 / 1024 / 1024) + ' GB'
      }
    };
  },

  get_env: async ({ key }) => {
    return { success: true, value: process.env[key] || null };
  },

  // ======= ESTADO DE LA APP =======
  get_state: async () => {
    return { success: true, state: loadState() };
  },

  get_provider_state: async ({ provider }) => {
    const state = loadState();
    return { success: true, state: state.providers[provider] };
  },

  set_provider_state: async ({ provider, newState }) => {
    const state = loadState();
    Object.assign(state.providers[provider], newState);
    saveState(state);
    return { success: true, state: state.providers[provider] };
  },

  // ======= AUTENTICACIÓN =======
  set_provider_auth: async ({ provider, auth }) => {
    const state = loadState();
    state.providers[provider].auth = { ...state.providers[provider].auth, ...auth, timestamp: new Date().toISOString() };
    saveState(state);
    return { success: true, message: 'Auth guardada' };
  },

  get_provider_auth: async ({ provider }) => {
    const state = loadState();
    return { success: true, auth: state.providers[provider].auth };
  },

  clear_provider_auth: async ({ provider }) => {
    const state = loadState();
    state.providers[provider].auth = { cookies: null };
    saveState(state);
    return { success: true, message: 'Auth eliminada' };
  }
};

// ============ SERVIDOR HTTP ============
let server = null;

function startMCPServer() {
  if (server) return MCP_PORT;

  server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // GET /models - Lista de modelos
    if (req.method === 'GET' && req.url.includes('/models')) {
      const provider = new URL(req.url, 'http://localhost').searchParams.get('provider') || 'groq';
      const modelsMap = {
        groq: GROQ_MODELS,
        qwen: QWEN_MODELS,
        anthropic: ANTHROPIC_MODELS,
        openai: OPENAI_MODELS
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, models: modelsMap[provider] || {} }));
      return;
    }

    // GET /state - Estado actual
    if (req.method === 'GET' && req.url.includes('/state')) {
      const provider = new URL(req.url, 'http://localhost').searchParams.get('provider');
      const state = loadState();
      if (provider) {
        res.end(JSON.stringify({ success: true, state: state.providers[provider] }));
      } else {
        res.end(JSON.stringify({ success: true, state }));
      }
      return;
    }

    // GET /health - Salud del servidor
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        status: 'healthy',
        providers: ['groq', 'qwen', 'anthropic'],
        timestamp: new Date().toISOString()
      }));
      return;
    }

    // POST /call - Ejecutar herramienta
    if (req.method === 'POST' && req.url === '/call') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const { tool, params } = JSON.parse(body);
          if (!tools[tool]) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: `Tool not found: ${tool}` }));
            return;
          }
          const result = await tools[tool](params || {});
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  server.listen(MCP_PORT, '127.0.0.1', () => {
    const state = loadState();
    console.log(`✅ MCP Server running on http://127.0.0.1:${MCP_PORT}`);
    console.log(`📊 ${Object.keys(tools).length} herramientas disponibles`);
    console.log(`🤖 Proveedores:`);
    console.log(`   - Groq: ${Object.keys(GROQ_MODELS).length} modelos`);
    console.log(`   - QWEN: ${Object.keys(QWEN_MODELS).length} modelos`);
    console.log(`   - Anthropic: ${Object.keys(ANTHROPIC_MODELS).length} modelos`);
    console.log(`   - OpenAI: ${Object.keys(OPENAI_MODELS).length} modelos`);
    console.log(`🔗 Proveedor actual: ${state.currentProvider.toUpperCase()}`);
  });

  return MCP_PORT;
}

function stopMCPServer() {
  if (server) {
    server.close();
    server = null;
    console.log('❌ MCP Server detenido');
  }
}

module.exports = {
  startMCPServer,
  stopMCPServer,
  tools,
  GROQ_MODELS,
  QWEN_MODELS,
  ANTHROPIC_MODELS,
  OPENAI_MODELS,
  loadState,
  saveState,
  loadMemory,
  saveMemory,
  getNextModel,
  MCP_PORT
};
