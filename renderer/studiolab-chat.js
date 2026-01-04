import { state, PROVIDERS } from './studiolab-state.js';
import {
    addTerminalLine,
    scrollChatToBottom,
    formatMessageHtml,
    updateMessageDiv,
    extractHtmlFromText,
    escapeHtml
} from './studiolab-utils.js';
import { toggleCanvasPanel, updateModelUI } from './studiolab-ui.js';

/**
 * Global function to send a message.
 * Attached to window for HTML event handlers.
 */
window.sendMessage = async function () {
    const input = document.getElementById('messageInput');
    const message = (input?.value || '').trim();
    if (!message) return;

    if (state.planModeActive) {
        addTerminalLine('⛔ MODO PLAN ACTIVO: Solo se presentan planes.');
        return;
    }

    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn && sendBtn.classList.contains('loading')) return;

    if (!state.currentProvider) {
        addTerminalLine('⚠️ ERROR: Selecciona un proveedor');
        return;
    }

    try {
        // UI Updates
        const welcomeScreen = document.getElementById('welcomeScreen');
        if (welcomeScreen) welcomeScreen.style.display = 'none';

        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) messagesContainer.classList.add('visible');

        // Add user message
        addMessage('user', message);

        // Reset input
        if (input) {
            input.value = '';
            input.style.height = 'auto';
        }
        window.updateSendButton();

        // Show assistant is "thinking"
        const assistantDiv = addMessage('assistant', 'Pensando…');

        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.classList.add('loading');
        }

        const provider = PROVIDERS[state.currentProvider];
        const modelId = state.currentModel || provider?.defaultModel;

        addTerminalLine(`→ ${state.currentProvider.toUpperCase()}: ${modelId}`);

        // Call integration layer
        try {
            const response = await callAssistant({
                message,
                modelId,
                provider: state.currentProvider,
                mode: state.currentMode,
                attachments: state.attachments
            });

            if (state.currentProvider === 'qwen') {
                // Qwen logic: clear "thinking" as the onQwenResponse listener handles real streaming
                if (assistantDiv) assistantDiv.remove();
            } else if (response?.text) {
                // Standard streaming/updating for other providers
                await streamMessage(assistantDiv, response.text);
                maybeApplyCanvas(response.text);
            }
        } catch (e) {
            updateMessageDiv(assistantDiv, `Error: ${e.message}`);
        }
    } catch (e) {
        console.error('[Chat] Error sending message:', e);
    } finally {
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.classList.remove('loading');
        }
        window.updateSendButton();
    }
};

/**
 * Adds a message to the chat container.
 * Returns the created element.
 */
export function addMessage(role, content) {
    const container = document.getElementById('messagesContainer');
    if (!container) return null;

    const roleName = role === 'user' ? 'Tú' : (state.currentModel || 'Asistente');
    const avatarText = role === 'user' ? 'U' : 'A';

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    messageDiv.innerHTML = `
    <div class="message-avatar">${avatarText}</div>
    <div class="message-body">
      <div class="message-header">${escapeHtml(roleName)}</div>
      <div class="message-content">${formatMessageHtml(content)}</div>
    </div>
  `;

    container.appendChild(messageDiv);
    scrollChatToBottom(true);

    state.messages.push({ role, content, timestamp: new Date() });
    return messageDiv;
}

/**
 * Simulated/Actual call to assistant backend.
 */
async function callAssistant(payload) {
    // Integration with sandraAPI or fetch
    if (state.currentProvider === 'qwen') {
        // For Qwen, we just signal the intent, the actual response comes via onQwenResponse
        return { silent: true };
    }

    // Placeholder for orchestration logic
    if (window.orchestrationEngine) {
        return await window.orchestrationEngine.process(payload);
    }

    return { text: "No orchestration engine found." };
}

/**
 * Handles typing effect for messages.
 */
async function streamMessage(div, text) {
    const contentEl = div.querySelector('.message-content');
    if (!contentEl) return;

    const speed = 20; // ms per word approx
    const words = text.split(' ');
    let currentText = '';

    for (const word of words) {
        currentText += (currentText ? ' ' : '') + word;
        contentEl.innerHTML = formatMessageHtml(currentText);
        scrollChatToBottom();
        await new Promise(r => setTimeout(r, speed));
    }
}

/**
 * Detects HTML in response and applies to canvas if needed.
 */
function maybeApplyCanvas(text) {
    if (!state.activeFeatures.has('web')) return;
    const html = extractHtmlFromText(text);
    if (html) {
        // Global setCanvasCode should be in studiolab-ui or similar
        window.setCanvasCode?.(html);
        if (!state.canvasPanelOpen) toggleCanvasPanel();
        addTerminalLine('Canvas actualizado');
    }
}

// Global input handlers
window.handleKeyDown = function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        window.sendMessage();
    }
};

window.autoResize = function (el) {
    el.style.height = 'auto';
    el.style.height = (el.scrollHeight) + 'px';
};

window.updateSendButton = function () {
    const input = document.getElementById('messageInput');
    const btn = document.getElementById('sendBtn');
    if (input && btn) {
        btn.disabled = !input.value.trim();
    }
};
