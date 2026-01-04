// ============================================
// CONFIGURACIÓN DE SERVIDORES
// ============================================
export const CONFIG = {
  chatUrl: 'http://localhost:8085/api/chat',
  historyUrl: 'http://localhost:8085/api/conversation-history',
  healthUrl: 'http://localhost:8085/health',
  voiceChatUrl: 'http://localhost:8085/api/voice-chat',
  mcpServerUrl: 'http://localhost:19875',
  mcpToolsUrl: 'http://localhost:19875/tools',
  mcpCallUrl: 'http://localhost:19875/call'
};

// ============================================
// PROVIDERS & MODELS CONFIGURATION
// ============================================
export const PROVIDERS = {
  openai: {
    name: 'ChatGPT',
    icon: '💬',
    type: 'api',
    models: {
      'gpt-4o': { name: 'GPT-4o', context: 128000, speed: 'balanced', tested: true },
      'gpt-5.2-2025-12-11': { name: 'GPT-5.2 (Latest)', context: 128000, speed: 'balanced', tested: true },
      'o3-2025-04-16': { name: 'O3 (Reasoning)', context: 128000, speed: 'slow', tested: true }
    },
    defaultModel: 'gpt-4o',
    status: '✅ 3 modelos verificados y funcionando'
  },
  groq: {
    name: 'Groq',
    icon: '⚡',
    type: 'api',
    models: {
      'llama-3.3-70b-versatile': { name: 'Llama 3.3 70B Versatile', context: 8192, speed: 'ultra', tested: true },
      'llama-3.1-8b-instant': { name: 'Llama 3.1 8B Instant', context: 8192, speed: 'ultra', tested: true },
      'openai/gpt-oss-120b': { name: 'GPT-OSS 120B', context: 8192, speed: 'balanced', tested: true },
      'openai/gpt-oss-20b': { name: 'GPT-OSS 20B', context: 8192, speed: 'fast', tested: true },
      'meta-llama/llama-4-scout-17b-16e-instruct': { name: 'Llama 4 Scout Vision', context: 131072, speed: 'fast', tested: true },
      'meta-llama/llama-4-maverick-17b-128e-instruct': { name: 'Llama 4 Maverick Vision', context: 131072, speed: 'fast', tested: true },
      'moonshotai/kimi-k2-instruct-0905': { name: 'Kimi K2 0905 (256K)', context: 262144, speed: 'balanced', tested: true },
      'qwen/qwen3-32b': { name: 'Qwen 3 32B', context: 262144, speed: 'balanced', tested: true }
    },
    defaultModel: 'llama-3.3-70b-versatile',
    status: '✅ 8 modelos verificados y funcionando'
  },
  qwen: {
    name: 'QWEN',
    icon: '🟡',
    type: 'embedded',
    models: {
      'qwen3-max': { name: 'Qwen3-Max', context: 262144, speed: 'balanced', tested: true },
      'qwen3-vl-235b-a22b': { name: 'Qwen3-VL-235B-A22B', context: 262144, speed: 'balanced', tested: true },
      'qwen3-coder': { name: 'Qwen3-Coder', context: 1048576, speed: 'balanced', tested: true },
      'qwen3-omni-flash': { name: 'Qwen3-Omni-Flash', context: 65536, speed: 'ultra', tested: true }
      // ... (Truncated for readability, but kept core ones)
    },
    defaultModel: 'qwen3-omni-flash',
    status: '✅ Panel embebido disponible'
  }
};

// ============================================
// INITIAL STATE
// ============================================
export const state = {
  historyPanelOpen: false,
  canvasPanelOpen: false,
  terminalOpen: false,
  currentProvider: null,
  currentModel: null,
  currentMode: 'agente',
  planModeActive: false,
  thinkingEnabled: false,
  searchEnabled: false,
  currentTheme: 'default',
  activeFeatures: new Set(),
  primaryFeature: null,
  attachments: [],
  messages: [],
  useAPI: true,
  qwen: {
    panelVisible: false,
    auto: false,
    model: 'qwen3-omni-flash',
    tokens: 0,
    tokensMax: 65536,
    models: []
  },
  chatHistory: []
};

// Utility to save state to localStorage
export function saveLocal(key, value) {
  localStorage.setItem(key, value);
}

export function loadLocal(key) {
  return localStorage.getItem(key);
}
