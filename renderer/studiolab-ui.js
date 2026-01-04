import { state, saveLocal, loadLocal } from './studiolab-state.js';
import { addTerminalLine } from './studiolab-utils.js';

// ============================================
// UI PANEL TOGGLES
// ============================================

export function toggleHistoryPanel() {
    state.historyPanelOpen = !state.historyPanelOpen;
    const panel = document.getElementById('historyPanel');
    if (panel) panel.classList.toggle('open', state.historyPanelOpen);

    // Track state change
    const sidebarBtn = document.querySelector('.sidebar-btn[title="Historial de Chats"]');
    if (sidebarBtn) sidebarBtn.classList.toggle('active', state.historyPanelOpen);
}
window.toggleHistoryPanel = toggleHistoryPanel;

export function toggleCanvasPanel() {
    state.canvasPanelOpen = !state.canvasPanelOpen;
    const panel = document.getElementById('canvasPanel');
    if (panel) panel.classList.toggle('open', state.canvasPanelOpen);

    const sidebarBtn = document.querySelector('.sidebar-btn[title="Canvas"]');
    if (sidebarBtn) sidebarBtn.classList.toggle('active', state.canvasPanelOpen);
}
window.toggleCanvasPanel = toggleCanvasPanel;

export function toggleTerminal() {
    state.terminalOpen = !state.terminalOpen;
    const panel = document.getElementById('terminalPanel');
    if (panel) panel.classList.toggle('open', state.terminalOpen);

    const sidebarBtn = document.querySelector('.sidebar-btn[title="Terminal"]');
    if (sidebarBtn) sidebarBtn.classList.toggle('active', state.terminalOpen);

    if (state.terminalOpen) {
        setTimeout(() => document.getElementById('terminalInput')?.focus(), 100);
    }
}
window.toggleTerminal = toggleTerminal;

// ============================================
// THEME SYSTEM
// ============================================

export function setTheme(themeName) {
    state.currentTheme = themeName;

    if (themeName === 'default') document.body.removeAttribute('data-theme');
    else document.body.setAttribute('data-theme', themeName);

    // Update UI indicators
    document.querySelectorAll('.theme-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.theme === themeName);
    });

    saveLocal('studiolab-theme', themeName);
    addTerminalLine(`Tema: ${themeName}`);
}
window.setTheme = setTheme;

export function loadSavedTheme() {
    const saved = loadLocal('studiolab-theme') || 'default';
    setTheme(saved);
}
window.loadSavedTheme = loadSavedTheme;

// ============================================
// MISC UI
// ============================================

export function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Buenos días';
    if (hour >= 12 && hour < 20) greeting = 'Buenas tardes';
    else if (hour >= 20) greeting = 'Buenas noches';

    const welcomeEl = document.querySelector('.welcome-greeting');
    if (welcomeEl) {
        welcomeEl.innerHTML = `${greeting}, <strong>Cley</strong>`;
    }
}

export function setupComposerDock() {
    const composer = document.getElementById('composer');
    if (!composer) return;

    const updateHeight = () => {
        const chatArea = document.querySelector('.chat-area');
        if (!chatArea) return;
        const rect = composer.getBoundingClientRect();
        const height = Math.ceil(rect.height + 28);
        chatArea.style.setProperty('--composer-height', `${height}px`);
    };

    updateHeight();

    if (window.ResizeObserver) {
        const observer = new ResizeObserver(() => updateHeight());
        observer.observe(composer);
    }

    window.addEventListener('resize', updateHeight);
}

// Global functions for HTML
window.loadChat = function (chatId) {
    state.chatHistory.forEach(chat => {
        chat.active = chat.id === chatId;
    });
    renderChatHistory();
    addTerminalLine(`Cargando chat #${chatId}...`);
};

window.newChat = function () {
    document.getElementById('welcomeScreen').style.display = 'flex';
    document.getElementById('messagesContainer').classList.remove('visible');
    document.getElementById('messagesContainer').innerHTML = '';
    state.messages = [];
    state.qwen.tokens = 0;
    updateModelUI();
    document.getElementById('messageInput').value = '';
    document.getElementById('messageInput').focus();
    addTerminalLine('Nuevo chat iniciado');
};

export function renderChatHistory() {
    const container = document.getElementById('chatList');
    if (!container) return;
    container.innerHTML = state.chatHistory.map(chat => `
    <div class="chat-item ${chat.active ? 'active' : ''}" onclick="loadChat(${chat.id})">
      <div class="chat-item-icon">${chat.icon}</div>
      <div class="chat-item-content">
        <div class="chat-item-title">${chat.title}</div>
        <div class="chat-item-preview">${chat.preview}</div>
      </div>
      <div class="chat-item-time">${chat.time}</div>
    </div>
  `).join('');
}

// ============================================
// DROPDOWNS & MENUS
// ============================================

window.toggleAttachMenu = function (e) {
    e.stopPropagation();
    const btn = document.getElementById('attachBtn');
    if (btn) btn.classList.toggle('active');
};

window.toggleModeMenu = function (e) {
    e.stopPropagation();
    const dropdown = document.getElementById('modeDropdown');
    if (dropdown) dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
};

window.selectMode = function (modeId, name, icon) {
    state.currentMode = modeId;
    const nameEl = document.getElementById('currentModeName');
    const iconEl = document.getElementById('modeIcon');
    if (nameEl) nameEl.textContent = name;
    if (iconEl) iconEl.textContent = icon;

    const dropdown = document.getElementById('modeDropdown');
    if (dropdown) dropdown.style.display = 'none';

    // Highlight checkmark
    document.querySelectorAll('.cursor-mode-option').forEach(opt => {
        const check = opt.querySelector('.cursor-mode-check');
        if (check) check.textContent = opt.innerText.includes(name) ? '✓' : '';
    });

    addTerminalLine(`Modo seleccionado: ${name}`);
};

window.toggleProviderDropdown = function (providerId, e) {
    e.stopPropagation();
    document.querySelectorAll('.provider-dropdown').forEach(d => {
        if (d.id !== `dropdown-${providerId}`) d.style.display = 'none';
    });
    const current = document.getElementById(`dropdown-${providerId}`);
    if (current) current.style.display = current.style.display === 'none' ? 'block' : 'none';
};

window.selectProviderModel = function (providerId, modelId) {
    state.currentProvider = providerId;
    state.currentModel = modelId;

    // Update UI indicators
    if (typeof updateModelUI === 'function') updateModelUI();

    // Close dropdown
    const dropdown = document.getElementById(`dropdown-${providerId}`);
    if (dropdown) dropdown.style.display = 'none';

    addTerminalLine(`Proveedor: ${providerId}, Modelo: ${modelId}`);
};

window.toggleAutoMenu = function (e) {
    e.stopPropagation();
    const dropdown = document.getElementById('autoDropdown');
    if (dropdown) dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
};

window.executeAutoFunction = function (func) {
    addTerminalLine(`Ejecutando función AUTO: ${func}`);
    const dropdown = document.getElementById('autoDropdown');
    if (dropdown) dropdown.style.display = 'none';
    // Trigger orchestration logic
    if (func === 'multiple') {
        window.triggerAutoOrchestrator?.();
    }
};

window.toggleVoiceMenu = function (e) {
    e.stopPropagation();
    const btn = document.getElementById('voiceBtn');
    if (btn) btn.classList.toggle('active');
};

window.startVoice = function (type) {
    addTerminalLine(`Iniciando voz: ${type}`);
    const btn = document.getElementById('voiceBtn');
    if (btn) btn.classList.remove('active');
    if (window.sandraAPI?.startMultimodalConversation) {
        window.sandraAPI.startMultimodalConversation({ mode: type });
    }
};

window.toggleThinking = function () {
    state.thinkingEnabled = !state.thinkingEnabled;
    const btn = document.getElementById('thinkingBtn');
    if (btn) btn.classList.toggle('active', state.thinkingEnabled);
    addTerminalLine(`Pensamiento: ${state.thinkingEnabled ? 'ON' : 'OFF'}`);
};

window.openQwenEmbedded = function () {
    if (window.toggleQwen) window.toggleQwen();
};

window.executeCode = function () {
    addTerminalLine('Interpretando Canvas...');
};

window.toggleSearch = function () {
    state.searchEnabled = !state.searchEnabled;
    const btn = document.getElementById('searchBtn');
    if (btn) btn.classList.toggle('active', state.searchEnabled);
    addTerminalLine(`Búsqueda: ${state.searchEnabled ? 'ON' : 'OFF'}`);
};

window.setCanvasTab = function (tab) {
    state.activeCanvasTab = tab;
    document.querySelectorAll('.canvas-tab').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.toLowerCase().includes(tab));
    });

    const codePane = document.getElementById('canvasPaneCode');
    const previewPane = document.getElementById('canvasPanePreview');

    if (tab === 'code') {
        codePane?.classList.remove('hidden');
        previewPane?.classList.add('hidden');
    } else {
        codePane?.classList.add('hidden');
        previewPane?.classList.remove('hidden');
        // Trigger render logic
        if (window.renderCanvas) window.renderCanvas();
    }
};

window.setCanvasCode = function (code) {
    const textarea = document.getElementById('canvasCode');
    if (textarea) textarea.value = code;
    state.canvasCode = code;
};

// Global click handler to close dropdowns
document.addEventListener('click', () => {
    const dropdowns = ['modeDropdown', 'autoDropdown'];
    dropdowns.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    document.querySelectorAll('.provider-dropdown').forEach(el => el.style.display = 'none');
    document.getElementById('attachBtn')?.classList.remove('active');
    document.getElementById('voiceBtn')?.classList.remove('active');
});
