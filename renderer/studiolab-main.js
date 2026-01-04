import { state, PROVIDERS } from './studiolab-state.js';
import {
    loadSavedTheme,
    updateGreeting,
    setupComposerDock,
    toggleHistoryPanel,
    toggleCanvasPanel,
    toggleTerminal
} from './studiolab-ui.js';
import { addTerminalLine } from './studiolab-utils.js';
import { initQwenIntegration } from './studiolab-qwen.js';

/**
 * Main Initialization
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 StudioLab 8.0 Pro Initializing...');

    // 1. Load Theme & UI
    loadSavedTheme();
    updateGreeting();
    setupComposerDock();

    // 2. Initialize Panels
    initPanelControls();

    // 3. Initialize Integrations
    initQwenIntegration();

    // 4. Set Default Provider
    state.currentProvider = 'groq';
    state.currentModel = PROVIDERS.groq.defaultModel;

    addTerminalLine('Sistema StudioLab listo.');
});

/**
 * Binds side bar and menu buttons to their respective actions.
 */
function initPanelControls() {
    // Sidebar buttons
    document.querySelector('.sidebar-btn[title="Historial"]')?.addEventListener('click', toggleHistoryPanel);
    document.querySelector('.sidebar-btn[title="Canvas"]')?.addEventListener('click', toggleCanvasPanel);
    document.querySelector('.sidebar-btn[title="Terminal"]')?.addEventListener('click', toggleTerminal);

    // Model selector trigger
    document.getElementById('modelTrigger')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('modelSelector')?.classList.toggle('active');
    });

    // Close dropdowns on outside click
    document.addEventListener('click', () => {
        document.getElementById('modelSelector')?.classList.remove('active');
    });
}

// Export some things to window for legacy inline handlers if any remain
window.studiolab = {
    state,
    toggleHistoryPanel,
    toggleCanvasPanel,
    toggleTerminal
};
