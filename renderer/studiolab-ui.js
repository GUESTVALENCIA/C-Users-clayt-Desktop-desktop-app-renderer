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
    const sidebarBtn = document.querySelector('.sidebar-btn[title="Historial"]');
    if (sidebarBtn) sidebarBtn.classList.toggle('active', state.historyPanelOpen);
}

export function toggleCanvasPanel() {
    state.canvasPanelOpen = !state.canvasPanelOpen;
    const panel = document.getElementById('canvasPanel');
    if (panel) panel.classList.toggle('open', state.canvasPanelOpen);

    const sidebarBtn = document.querySelector('.sidebar-btn[title="Canvas"]');
    if (sidebarBtn) sidebarBtn.classList.toggle('active', state.canvasPanelOpen);
}

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

// ============================================
// THEME SYSTEM
// ============================================

export function setTheme(themeName) {
    state.currentTheme = themeName;

    if (themeName === 'default') {
        document.body.removeAttribute('data-theme');
    } else {
        document.body.setAttribute('data-theme', themeName);
    }

    // Update UI indicators
    document.querySelectorAll('.theme-option').forEach(opt => {
        opt.classList.remove('active');
        if (opt.dataset.theme === themeName) {
            opt.classList.add('active');
        }
    });

    saveLocal('studiolab-theme', themeName);
    addTerminalLine(`Tema aplicado: ${themeName}`);
}

export function loadSavedTheme() {
    const saved = loadLocal('studiolab-theme') || 'default';
    setTheme(saved);
}

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
