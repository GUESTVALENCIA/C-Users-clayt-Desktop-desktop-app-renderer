// StudioLab front controller
const CONFIG = {
  chatUrl: 'http://localhost:8085/api/chat',
  historyUrl: 'http://localhost:8085/api/conversation-history/clayt',
  healthUrl: 'http://localhost:8085/health',
  qwenWebUrl: 'http://localhost:4777',
  qwenLoginUrl: '',
  previewSeed: `<!doctype html>
<html>
<head>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; background:#0b1620; color:#e9f2ff;}
    .card { padding:24px 28px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:14px; box-shadow:0 10px 40px rgba(0,0,0,0.3);}
    .pill { display:inline-block; padding:4px 10px; border-radius:12px; background:#26e0ae; color:#06261d; font-weight:700; margin-bottom:10px;}
  </style>
</head>
<body>
  <div class="card">
    <div class="pill">StudioLab Lienzo</div>
    <h2>Listo para renderizar tu codigo</h2>
    <p>Edita el panel izquierdo y pulsa Render.</p>
  </div>
</body>
</html>`
};

const state = {
  sending: false,
  history: [],
  terminalOpen: false,
  canvasOpen: false,
  healthOk: false,
  model: 'qwen3-omni-flash',
  auto: false,
  tokens: 0,
  tokensMax: 65536,
  models: [],
  logged: false,
  category: 'artifact',
  mode: 'Agente'
};

const CATEGORY_CONFIG = {
  artifact: { label: 'Artefacto', mode: 'Agente', model: 'qwen3-vl-235b-a22b', requiresCanvas: false },
  'video-gen': { label: 'Generacion de video', mode: 'Agente', model: 'qwen3-omni-flash', requiresCanvas: false },
  'image-gen': { label: 'Generacion de imagen', mode: 'Agente', model: 'qwen3-vl-235b-a22b', requiresCanvas: false },
  'web-dev': { label: 'Desarrollo web', mode: 'Agente', model: 'qwen3-vl-235b-a22b', requiresCanvas: true },
  'deep-research': { label: 'Investigacion profunda', mode: 'Plan', model: 'qwen3-max', requiresCanvas: false },
  'image-edit': { label: 'Edicion de imagen', mode: 'Debug', model: 'qwen3-vl-235b-a22b', requiresCanvas: false }
};

const dom = (id) => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
  loadLocalState();
  bindUI();
  initCanvas();
  bootstrap();
});

async function bootstrap() {
  setStatus('Conectando...', false);
  await Promise.all([checkHealth(), loadHistory(), loadQwenState()]);
  handleCategory(state.category || 'artifact');
  setStatus(state.healthOk ? 'QWEN Omni listo' : 'Offline', state.healthOk);
}

function bindUI() {
  dom('btnSend')?.addEventListener('click', sendMessage);
  dom('input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  dom('btnTerminal')?.addEventListener('click', toggleTerminal);
  dom('btnCloseTerminal')?.addEventListener('click', toggleTerminal);
  dom('btnRunCmd')?.addEventListener('click', runCommand);
  dom('btnClearCmd')?.addEventListener('click', () => { dom('terminalOutput').textContent = ''; });
  dom('terminalInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runCommand();
    }
  });

  dom('btnCanvasRun')?.addEventListener('click', renderCanvas);
  dom('btnCanvasReset')?.addEventListener('click', initCanvas);
  dom('btnOpenLocalPreview')?.addEventListener('click', () => window.open(CONFIG.qwenWebUrl, '_blank'));
  dom('btnCloseCanvas')?.addEventListener('click', () => setCanvasVisibility(false));

  dom('btnAttach')?.addEventListener('click', () => addSystem('Adjunta archivos: arrástralos aquí para que QWEN Omni los procese.'));
  dom('btnImg')?.addEventListener('click', () => addSystem('Sube imágenes para análisis o generación.'));
  dom('btnVid')?.addEventListener('click', () => addSystem('Carga video o solicita generación de video.'));
  dom('btnCall')?.addEventListener('click', () => addSystem('Llamada conversacional: conecta con ws://localhost:8085 cuando el backend esté listo.'));
  dom('btnVoice')?.addEventListener('click', startVoiceStub);

  dom('btnAuto')?.addEventListener('click', toggleAutoMode);
  dom('btnOpenQwen')?.addEventListener('click', openQwenPortal);
  dom('modelChip')?.addEventListener('click', cycleModel);
  dom('btnLogin')?.addEventListener('click', loginQwen);
  dom('planChip')?.addEventListener('click', () => setMode('Plan'));
  dom('debugChip')?.addEventListener('click', () => setMode('Debug'));
  dom('agentChip')?.addEventListener('click', () => setMode('Agente'));
  dom('btnToggleTerminal')?.addEventListener('click', () => toggleTerminal(true));
  dom('btnThought')?.addEventListener('click', () => addSystem('Pensamiento profundo activable desde selector de modelo.'));
  dom('btnSearch')?.addEventListener('click', () => addSystem('Buscar: activa navegación y contexto web.'));
  dom('btnMcp')?.addEventListener('click', () => addSystem('MCP: herramientas disponibles listas.'));

  // Categorias
  dom('categoryBar')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.cat-chip');
    if (!btn) return;
    const cat = btn.dataset.category;
    handleCategory(cat);
  });

  // Menu superior
  document.querySelectorAll('nav.menu button').forEach((btn) => {
    const action = btn.dataset.action;
    if (!action) return;
    btn.addEventListener('click', () => handleMenuAction(action));
  });

  if (window.sandraAPI?.onAppStatus) {
    window.sandraAPI.onAppStatus(applyAppStatus);
  }
}

async function checkHealth() {
  try {
    const res = await fetch(CONFIG.healthUrl, { cache: 'no-store' });
    state.healthOk = res.ok;
  } catch {
    state.healthOk = false;
  }
}

async function loadHistory() {
  try {
    const res = await fetch(CONFIG.historyUrl);
    if (!res.ok) return;
    const data = await res.json();
    const history = data.history || [];
    history.forEach((entry) => {
      if (entry.message) addMessage('user', entry.message);
      if (entry.response) addMessage('bot', entry.response);
    });
  } catch {
    // silent
  }
}

function setStatus(text, online) {
  const dot = dom('statusDot');
  const label = dom('statusText');
  if (dot) dot.classList.toggle('offline', !online);
  if (label) label.textContent = text;
}

function addMessage(role, text) {
  const container = dom('messages');
  if (!container) return;
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function addSystem(text) { addMessage('system', text); }

async function sendMessage() {
  if (state.sending) return;
  const input = dom('input');
  if (!input) return;
  const text = (input.value || '').trim();
  if (!text) return;

  state.sending = true;
  dom('btnSend').disabled = true;
  addMessage('user', text);
  input.value = '';

  try {
    const responseText = await callQwen(text);
    addMessage('bot', responseText);
    reportUsageEstimate(text);
  } catch (err) {
    addMessage('system', `Error: ${err.message}`);
  } finally {
    state.sending = false;
    dom('btnSend').disabled = false;
  }
}

async function callQwen(message) {
  // Prefer local QWEN Omni server
  try {
    const res = await fetch(CONFIG.chatUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, userId: 'studiolab' })
    });
    if (res.ok) {
      const data = await res.json();
      return data.response || data.text || 'OK ejecutado (respuesta vacia)';
    }
  } catch (err) {
    console.warn('Local QWEN call failed, fallback to IPC', err);
  }

  // Fallback: IPC chatSend if available
  if (window.sandraAPI?.chatSend) {
    const resp = await window.sandraAPI.chatSend('qwen', message, 'omni');
    if (resp.success) return resp.response || resp.message || 'OK respondido';
    throw new Error(resp.error || 'Sin respuesta de QWEN');
  }

  throw new Error('No hay ruta de chat disponible');
}

function toggleTerminal() {
  state.terminalOpen = !state.terminalOpen;
  dom('terminalInline').style.display = state.terminalOpen ? 'block' : 'none';
  if (state.terminalOpen) {
    dom('terminalInput')?.focus();
    updateCwd();
  }
}

function toggleCanvas() {
  setCanvasVisibility(true);
}

async function loadQwenState() {
  if (window.sandraAPI?.qwenGetStateFull) {
    try {
      const res = await window.sandraAPI.qwenGetStateFull();
      if (res?.success) {
        applyAppStatus({ ...(res.state || {}), models: res.models || [] });
      }
    } catch (e) {
      console.warn('No se pudo cargar estado QWEN:', e.message);
    }
  }
}

function applyAppStatus(data = {}) {
  state.model = data.model || state.model;
  state.auto = data.auto ?? state.auto;
  state.tokens = data.tokens ?? state.tokens;
  state.tokensMax = data.tokensMax || state.tokensMax;
  state.logged = data.logged ?? state.logged;
  state.category = data.category || state.category;
  state.mode = data.mode || state.mode;
  if (data.models?.length) state.models = data.models;
  refreshModelUI();
  setMode(state.mode, true);
}

function refreshModelUI() {
  const meta = state.models.find(m => m.id === state.model) || { name: state.model, context: state.tokensMax };
  const usagePct = Math.min(100, Math.round((state.tokens / (state.tokensMax || 1)) * 100));
  const modelNameEl = dom('modelName');
  const modelInfoEl = dom('modelInfo');
  if (modelNameEl) modelNameEl.textContent = meta.name || state.model;
  if (modelInfoEl) modelInfoEl.textContent = `Auto ${state.auto ? 'ON' : 'OFF'} - Uso ${usagePct}%`;
  const bar = dom('usageBar');
  if (bar) bar.style.width = `${usagePct}%`;
  dom('modelChip').textContent = meta.name || state.model;
  const btnAuto = dom('btnAuto');
  if (btnAuto) {
    btnAuto.classList.toggle('on', !!state.auto);
    btnAuto.textContent = state.auto ? 'Auto ON' : 'Auto OFF';
  }
  const btnLogin = dom('btnLogin');
  if (btnLogin) {
    btnLogin.classList.toggle('on', !!state.logged);
    btnLogin.textContent = state.logged ? 'Logged' : 'Login';
  }
}

function setMode(mode, silent = false) {
  state.mode = mode;
  ['agentChip','planChip','debugChip'].forEach((id) => {
    const el = dom(id);
    if (el) {
      const match = (id === 'agentChip' && mode === 'Agente') ||
                    (id === 'planChip' && mode === 'Plan') ||
                    (id === 'debugChip' && mode === 'Debug');
      el.classList.toggle('on', match);
    }
  });
  if (!silent) addSystem(`Modo ${mode} activo`);
  persistLocalState();
}

function setModelId(modelId) {
  if (!modelId) return;
  state.model = modelId;
  refreshModelUI();
  if (window.sandraAPI?.qwenSetModel) {
    window.sandraAPI.qwenSetModel(modelId).catch(() => {});
  }
  persistLocalState();
}

function handleCategory(cat) {
  if (!cat) return;
  if (cat === 'more') {
    addSystem('Mas Categorias: planificar, analizar imagen, resumen, lluvia de ideas...');
    return;
  }
  state.category = cat;
  document.querySelectorAll('.cat-chip').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.category === cat);
  });
  const cfg = CATEGORY_CONFIG[cat] || {};
  if (cfg.mode) setMode(cfg.mode);
  if (cfg.model) setModelId(cfg.model);
  if (cfg.requiresCanvas) {
    setCanvasVisibility(true);
    focusCanvas();
  } else {
    setCanvasVisibility(false);
  }
  const label = cfg.label || cat;
  const heroTitle = document.querySelector('.hero h1');
  if (heroTitle) heroTitle.textContent = label;
  dom('sectionTitle')?.textContent = cfg.requiresCanvas ? `Lienzo - ${label}` : 'Lienzo';
  addSystem(`Categoria: ${label}`);
  persistLocalState();
}

function handleMenuAction(action) {
  switch (action) {
    case 'open-file':
      selectAndLoadFile();
      break;
    case 'run-canvas':
      setCanvasVisibility(true);
      renderCanvas();
      break;
    case 'open-terminal':
      toggleTerminal();
      break;
    case 'view':
    case 'edit':
    case 'select':
      addSystem(`Accion ${action} lista (stub UI)`);
      break;
    default:
      break;
  }
}

async function toggleAutoMode() {
  state.auto = !state.auto;
  refreshModelUI();
  if (window.sandraAPI?.qwenSetAutoMode) {
    try { await window.sandraAPI.qwenSetAutoMode(state.auto); } catch {}
  }
}

async function openQwenPortal() {
  // Usar el sistema BrowserView embebido (estilo VS Code extension)
  if (window.sandraAPI?.qwenToggle) {
    try {
      const result = await window.sandraAPI.qwenToggle(true);
      if (result && result.success) {
        addSystem('QWEN abierto en panel lateral (estilo VS Code)');
        return;
      }
    } catch (e) {
      console.error('Error abriendo Qwen:', e);
      addSystem(`Error al abrir Qwen: ${e.message || 'Error desconocido'}`);
      return;
    }
  }
  // Fallback: si no hay API disponible, intentar abrir en navegador
  if (CONFIG.qwenLoginUrl) {
    window.open(CONFIG.qwenLoginUrl, '_blank');
  } else {
    addSystem('QWEN: URL no configurada. Usa el botón de la toolbar para abrir Qwen embebido.');
  }
}

async function loginQwen() {
  if (window.sandraAPI?.qwenLogin) {
    try {
      await window.sandraAPI.qwenLogin();
      state.logged = true;
      refreshModelUI();
      addSystem('Login QWEN iniciado en Opera/ventana embebida');
      return;
    } catch (e) {
      addSystem(`Login QWEN fallo: ${e.message}`);
    }
  }
  addSystem('IPC de login no disponible');
}

async function cycleModel() {
  if (!state.models.length) return;
  const idx = state.models.findIndex(m => m.id === state.model);
  const next = state.models[(idx + 1) % state.models.length];
  state.model = next.id;
  state.tokensMax = next.context;
  refreshModelUI();
  if (window.sandraAPI?.qwenSetModel) {
    try { await window.sandraAPI.qwenSetModel(next.id); } catch {}
  }
}

function reportUsageEstimate(text) {
  const est = Math.ceil((text.length || 0) / 4);
  if (window.sandraAPI?.qwenReportUsage) {
    window.sandraAPI.qwenReportUsage(est).catch(() => {});
  }
}

function focusCanvas() {
  const card = dom('canvasCard');
  if (card && card.style.display !== 'none') {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.style.outline = '1px solid rgba(38,224,174,0.5)';
    setTimeout(() => { card.style.outline = 'none'; }, 1200);
  }
}

function setCanvasVisibility(visible) {
  state.canvasOpen = visible;
  const card = dom('canvasCard');
  if (card) {
    card.style.display = visible ? 'flex' : 'none';
  }
}

function selectAndLoadFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.html,.htm,.css,.js,.txt,.md';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const code = reader.result;
      const area = dom('canvasCode');
      if (area) area.value = code;
      renderCanvas();
      addSystem(`Archivo cargado en lienzo: ${file.name}`);
    };
    reader.readAsText(file);
  };
  input.click();
}

function persistLocalState() {
  try {
    const payload = {
      category: state.category,
      mode: state.mode,
      model: state.model
    };
    localStorage.setItem('studiolab-ui', JSON.stringify(payload));
  } catch {}
}

function loadLocalState() {
  try {
    const saved = localStorage.getItem('studiolab-ui');
    if (!saved) return;
    const data = JSON.parse(saved);
    if (data.category) state.category = data.category;
    if (data.mode) state.mode = data.mode;
    if (data.model) state.model = data.model;
  } catch {}
}

async function runCommand() {
  const input = dom('terminalInput');
  const out = dom('terminalOutput');
  if (!input || !out) return;
  const cmd = input.value.trim();
  if (!cmd) return;
  out.textContent += `\n$ ${cmd}\n`;
  input.value = '';

  try {
    if (window.sandraAPI?.executeCommand) {
      const res = await window.sandraAPI.executeCommand(cmd);
      out.textContent += (res.output || res.error || 'OK') + '\n';
    } else {
      out.textContent += 'IPC no disponible; comando no ejecutado.\n';
    }
  } catch (err) {
    out.textContent += `Error: ${err.message}\n`;
  }
  out.scrollTop = out.scrollHeight;
  updateCwd();
}

async function updateCwd() {
  if (!window?.sandraAPI?.executeCommand) return;
  const cmds = ['cd', 'pwd'];
  for (const cmd of cmds) {
    try {
      const res = await window.sandraAPI.executeCommand(cmd);
      if (res?.output) {
        dom('cwdLabel').textContent = `cwd: ${res.output.trim()}`;
        return;
      }
    } catch {
      // try next
    }
  }
}

function initCanvas() {
  const code = dom('canvasCode');
  if (code) code.value = CONFIG.previewSeed;
  renderCanvas();
}

function renderCanvas() {
  const code = dom('canvasCode')?.value || CONFIG.previewSeed;
  const preview = dom('canvasPreview');
  if (preview) {
    preview.srcdoc = code;
  }
}

function startVoiceStub() {
  addSystem('Entrada de voz: conectara a ws://localhost:8085 cuando el backend este listo. De momento usa texto.');
}






