// ============================================
// UTILITIES & HELPERS
// ============================================

/**
 * Escapes HTML special characters to prevent XSS.
 */
export function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Formats a message content using marked and applies DOMPurify.
 * Includes custom syntax highlighting preparation.
 */
export function formatMessageHtml(text) {
    if (typeof marked === 'undefined') return escapeHtml(text).replace(/\n/g, '<br>');

    const rawHtml = marked.parse(text);
    if (typeof DOMPurify !== 'undefined') {
        return DOMPurify.sanitize(rawHtml);
    }
    return rawHtml;
}

/**
 * Scrolls the chat container to the bottom smoothly.
 */
export function scrollChatToBottom(immediate = false) {
    const container = document.getElementById('chatScrollArea') || document.getElementById('messagesContainer')?.parentElement;
    if (!container) return;

    if (immediate) {
        container.scrollTop = container.scrollHeight;
    } else {
        container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
        });
    }
}

/**
 * Updates a message div with new content and handles syntax highlighting.
 */
export function updateMessageDiv(div, text) {
    if (!div) return;
    const contentEl = div.querySelector('.message-content');
    if (!contentEl) return;

    contentEl.innerHTML = formatMessageHtml(text);

    if (typeof Prism !== 'undefined') {
        contentEl.querySelectorAll('pre code').forEach((block) => {
            const pre = block.parentElement;
            if (pre && !pre.classList.contains('line-numbers')) {
                pre.classList.add('line-numbers');
            }
        });
        try {
            Prism.highlightAllUnder(contentEl);
        } catch (e) {
            console.warn('[Utils] Error in Prism highlighting:', e);
        }
    }
    scrollChatToBottom();
}

/**
 * Extracts HTML code blocks from text.
 */
export function extractHtmlFromText(text) {
    const t = String(text ?? '');
    const m = t.match(/```(?:html)?\s*([\s\S]*?)```/i);
    if (m?.[1]) return m[1].trim();
    if (/(<!doctype html|<html[\s>])/i.test(t)) return t.trim();
    return null;
}

/**
 * Adds a line to the terminal.
 */
export function addTerminalLine(text) {
    const terminal = document.getElementById('terminalContent');
    if (!terminal) return;

    const line = document.createElement('div');
    line.className = 'terminal-line';
    line.innerHTML = `<span class="terminal-timestamp">[${new Date().toLocaleTimeString()}]</span> ${escapeHtml(text)}`;
    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
    console.log('[Terminal]', text);
}

/**
 * Sleeps for N milliseconds.
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
