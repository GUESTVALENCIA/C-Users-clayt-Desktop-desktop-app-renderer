import { state, PROVIDERS } from './studiolab-state.js';
import {
    addTerminalLine,
    scrollChatToBottom,
    formatMessageHtml,
    escapeHtml
} from './studiolab-utils.js';

/**
 * Initializes Qwen response interception.
 */
export function initQwenIntegration() {
    if (!window.sandraAPI?.onQwenResponse) {
        console.warn('[Qwen] window.sandraAPI.onQwenResponse no disponible');
        return;
    }

    let lastProcessedMessageId = null;
    let qwenMessages = new Map();

    window.sandraAPI.onQwenResponse((data) => {
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return;

        const messageId = data.messageId || 'default-qwen';
        const isNew = data.isNewMessage || (messageId !== lastProcessedMessageId);

        if (isNew) {
            // Create new message bubble for Qwen
            const msgDiv = createQwenMessageBubble(messageId);
            messagesContainer.appendChild(msgDiv);
            qwenMessages.set(messageId, { text: '', element: msgDiv });
            lastProcessedMessageId = messageId;
        }

        const msgData = qwenMessages.get(messageId);
        if (!msgData) return;

        if (data.content !== undefined) {
            msgData.text = data.isPartial ? (msgData.text + data.content) : data.content;
            const contentEl = msgData.element.querySelector('.message-content');
            if (contentEl) {
                contentEl.innerHTML = formatMessageHtml(msgData.text);

                // Handle PrismJS if available
                if (typeof Prism !== 'undefined' && !data.isPartial) {
                    Prism.highlightAllUnder(contentEl);
                }
            }
        }

        if (!data.isPartial) {
            // Mark as complete and add action buttons
            msgData.element.classList.add('complete');
            addQwenActionButtons(msgData.element);
        }

        scrollChatToBottom();
    });
}

/**
 * Creates a message bubble for Qwen responses.
 */
function createQwenMessageBubble(id) {
    const modelName = state.qwen?.model || 'Qwen';
    const div = document.createElement('div');
    div.className = 'message assistant qwen-response';
    div.dataset.messageId = id;
    div.innerHTML = `
    <div class="message-avatar">Q</div>
    <div class="message-body">
      <div class="message-header">${escapeHtml(modelName)}</div>
      <div class="message-content">...</div>
    </div>
  `;
    return div;
}

/**
 * Adds action buttons to a completed Qwen message.
 */
function addQwenActionButtons(element) {
    const body = element.querySelector('.message-body');
    if (!body || body.querySelector('.message-actions')) return;

    const actions = document.createElement('div');
    actions.className = 'message-actions';
    actions.innerHTML = `
    <button class="message-action-btn" onclick="studiolab.qwen.copyMessage(this)">Copy</button>
    <button class="message-action-btn" onclick="studiolab.qwen.regenerateMessage(this)">Retry</button>
  `;
    body.appendChild(actions);
}

/**
 * Global helpers for Qwen actions.
 */
window.qwenCopyMessage = function (btn) {
    const content = btn.closest('.message-body').querySelector('.message-content').textContent;
    navigator.clipboard.writeText(content);
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy', 2000);
};
