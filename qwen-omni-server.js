// Minimal QWEN Omni local gateway (HTTP) for StudioLab
// Endpoints:
//  - GET  /health
//  - GET  /api/conversation-history/:userId
//  - POST /api/chat { message, userId }
//  - POST /api/voice-chat { audioBase64, userId } (stub)

const http = require('http');
const fs = require('fs');
const path = require('path');
const { callQWEN } = require('./chat-service');

const PORT = process.env.QWEN_PORT || 8085;
const HISTORY_FILE = path.join(process.env.USERPROFILE || 'C:\\Users\\clayt', '.studiolab-history.json');
let historyFilePath = HISTORY_FILE;

function loadHistory() {
  try {
    if (fs.existsSync(historyFilePath)) {
      return JSON.parse(fs.readFileSync(historyFilePath, 'utf8'));
    }
  } catch (e) {
    console.warn('[QWEN] No se pudo leer historial:', e.message);
  }
  return [];
}

function saveHistory(history) {
  try {
    fs.writeFileSync(historyFilePath, JSON.stringify(history, null, 2), 'utf8');
  } catch (e) {
    console.warn('[QWEN] No se pudo guardar historial:', e.message);
  }
}

function buildSystemPrompt(meta = {}) {
  const mode = meta.mode || 'agente';
  const features = Array.isArray(meta.features) ? meta.features : [];
  const thinking = !!meta.thinking;
  const search = !!meta.search;

  const lines = [
    'Eres StudioLab: un asistente multimodal con foco en productividad.',
    `Modo: ${mode}.`,
    features.length ? `Features activas: ${features.join(', ')}.` : null,
    thinking ? 'Pensamiento: ACTIVADO (explica con claridad y pasos).' : null,
    search ? 'Búsqueda web: ACTIVADA (si no tienes acceso, indica supuestos).' : null
  ].filter(Boolean);

  if (features.includes('web') || features.includes('artefactos')) {
    lines.push('Si generas una web o artefacto, devuelve el resultado en un bloque ```html``` autocontenido.');
  }

  if (mode === 'plan') {
    lines.push('En modo Plan: entrega un plan claro sin ejecutar acciones ni asumir ejecución.');
  }

  if (mode === 'debug') {
    lines.push('En modo Debug: diagnostica y propone pasos de verificación.');
  }

  return lines.join('\n');
}

function mapModelId(modelId) {
  if (!modelId || typeof modelId !== 'string') return 'qwen-plus';
  const map = {
    'qwen25-plus': 'qwen-plus',
    'qwen25-turbo': 'qwen-turbo',
    'qwen25-72b-instruct': 'qwen-max',
    'qwen25-vl-32b-instruct': 'qwen-vl-plus'
  };
  return map[modelId] || modelId;
}

async function handleChat({ message, userId, modelId, meta = {}, attachments = [] }) {
  const history = loadHistory();
  const ts = new Date().toISOString();

  const systemPrompt = buildSystemPrompt(meta);
  const recent = history.filter(h => h.userId === userId).slice(-8);
  const messages = [{ role: 'system', content: systemPrompt }];
  for (const h of recent) {
    if (h?.message) messages.push({ role: 'user', content: String(h.message) });
    if (h?.response) messages.push({ role: 'assistant', content: String(h.response) });
  }

  const attachNote = Array.isArray(attachments) && attachments.length
    ? `\n\nAdjuntos:\n${attachments.map(a => `- ${a.name || 'archivo'} (${a.type || a.mime || 'unknown'})`).join('\n')}`
    : '';

  messages.push({ role: 'user', content: String(message || '') + attachNote });

  // Llamar al modelo QWEN si hay API Key
  let responseText = null;
  let provider = 'qwen';
  const apiKey = process.env.QWEN_API_KEY;
  const model = mapModelId(modelId);

  try {
    if (apiKey) {
      let result = await callQWEN(message, 'omni', apiKey, { model, messages });
      if (!result.success) {
        // Fallback seguro a qwen-plus si el modelo no existe/está bloqueado
        if (model !== 'qwen-plus') {
          result = await callQWEN(message, 'omni', apiKey, { model: 'qwen-plus', messages });
        }
      }

      if (result.success) {
        responseText = result.response;
      } else {
        responseText = `Error QWEN: ${result.error || 'sin detalle'}`;
      }
    }
  } catch (e) {
    responseText = `Fallo QWEN: ${e.message}`;
  }

  // Fallback local si no hay key o fallo
  if (!responseText) {
    responseText = `QWEN no está disponible por el gateway local. Usa la vista QWEN embebida (URL) para chatear con QWEN.`;
    provider = 'stub';
  }

  history.push({ userId, message, response: responseText, provider, model, meta, ts });
  saveHistory(history);

  return { success: true, response: responseText, provider, model, ts };
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(payload));
}

function startQwenServer(options = {}) {
  const server = http.createServer(async (req, res) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end();
      return;
    }

    // Routing
    if (req.method === 'GET' && req.url === '/health') {
      return sendJson(res, 200, { status: 'ok', clients: 0, model: 'qwen-omni-local' });
    }

    if (req.method === 'GET' && req.url.startsWith('/api/conversation-history/')) {
      const userId = decodeURIComponent(req.url.split('/').pop() || 'default');
      const history = loadHistory().filter(h => h.userId === userId);
      return sendJson(res, 200, { success: true, history });
    }

    if (req.method === 'POST' && (req.url === '/api/chat' || req.url === '/api/voice-chat')) {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        try {
          const payload = body ? JSON.parse(body) : {};
          const message = payload.message || payload.text || '';
          const userId = payload.userId || 'default';
          const modelId = payload.modelId || payload.model || null;
          const meta = payload.meta || { mode: payload.mode, features: payload.features, thinking: payload.thinking, search: payload.search };
          const attachments = payload.attachments || [];

          // voice-chat stub: si viene audioBase64, marcamos nota
          const note = payload.audioBase64 ? ' (audio recibido, transcripcion pendiente)' : '';
          const result = await handleChat({ message: (message || 'Mensaje vacio') + note, userId, modelId, meta, attachments });
          return sendJson(res, 200, result);
        } catch (e) {
          return sendJson(res, 400, { success: false, error: e.message });
        }
      });
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  });

  if (options.historyFile) {
    historyFilePath = options.historyFile;
  }

  const port = options.port ?? PORT;

  server.listen(port, () => {
    console.log(`[QWEN-OMNI] Gateway HTTP en puerto ${port}`);
  });

  return server;
}

module.exports = {
  startQwenServer,
  HISTORY_FILE,
  PORT
};
