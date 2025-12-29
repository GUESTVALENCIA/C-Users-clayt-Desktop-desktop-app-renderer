// Call Center Module (no intrusivo, solo añade feedback y saludo)
(function () {
  if (window.__callCenterModuleLoaded) return;
  window.__callCenterModuleLoaded = true;

  const log = (...args) => console.log('📞 [CallCenterMod]', ...args);

  let pollIntervalId = null;
  let previousSessionActive = null;
  let previousIsSpeaking = null;
  let previousIsListening = null;
  let previousIsThinking = null;

  let ringAudioContext = null;
  let ringGainNode = null;
  let ringTimeouts = [];
  let greetingHasPlayed = false;
  let idleTimeoutId = null;
  let flowRunning = false;
  let noBargeUntilTs = 0;

  function scheduleRingtoneFlow() {
    if (flowRunning) return;
    flowRunning = true;
    stopRingtone();
    greetingHasPlayed = false;
    try {
      ringAudioContext = new (window.AudioContext || window.webkitAudioContext)();
      ringGainNode = ringAudioContext.createGain();
      ringGainNode.gain.value = 0.28;
      ringGainNode.connect(ringAudioContext.destination);
    } catch (e) {
      console.warn('No se pudo inicializar AudioContext para ringtone:', e);
      return;
    }

    const t0 = ringAudioContext.currentTime + 2.5; // 2.5s delay inicial
    ringOnce(t0);           // 1er timbre (~2.0s)
    ringOnce(t0 + 3.2);     // pausa ~1.2s y 2º timbre

    // Parar tono y descolgar + saludo 1s después del 2º timbre
    const totalBeforeGreetMs = 2500 + 2000 + 1200 + 2000 + 1000;
    ringTimeouts.push(setTimeout(() => {
      stopRingtone();
      playAnswerClick().then(() => setTimeout(playGreetingDirect, 150));
    }, totalBeforeGreetMs));
  }

  function ringOnce(startAt) {
    try {
      const osc = ringAudioContext.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(425, startAt);
      const g = ringAudioContext.createGain();
      g.gain.setValueAtTime(0.0001, startAt);
      g.gain.linearRampToValueAtTime(0.18, startAt + 0.04);
      g.gain.setValueAtTime(0.18, startAt + 1.9);
      g.gain.exponentialRampToValueAtTime(0.0001, startAt + 2.0);
      osc.connect(g).connect(ringGainNode);
      osc.start(startAt);
      osc.stop(startAt + 2.05);
    } catch (e) {
      console.warn('Error generando timbre:', e);
    }
  }

  function stopRingtone() {
    try { ringTimeouts.forEach(clearTimeout); } catch {}
    ringTimeouts = [];
    try {
      if (ringAudioContext && ringAudioContext.state !== 'closed') {
        ringAudioContext.close().catch(() => {});
      }
    } catch {}
    ringAudioContext = null;
    ringGainNode = null;
    flowRunning = false;
  }

  async function playAnswerClick() {
    try {
      const clickCtx = new (window.AudioContext || window.webkitAudioContext)();
      const clickGain = clickCtx.createGain();
      clickGain.connect(clickCtx.destination);
      const makeClick = (freq, startTime, duration) => {
        const osc = clickCtx.createOscillator();
        const g = clickCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, startTime);
        g.gain.linearRampToValueAtTime(0.08, startTime + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        osc.connect(g).connect(clickGain);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.01);
      };
      const now = clickCtx.currentTime;
      makeClick(800, now, 0.04);
      makeClick(1200, now + 0.02, 0.03);
      setTimeout(() => {
        try { clickCtx.close().catch(() => {}); } catch {}
      }, 150);
    } catch (e) {
      console.warn('Error sonido descolgar:', e);
    }
  }

  async function playHangupClunk() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const master = ctx.createGain();
      master.connect(ctx.destination);
      const burst = (freq, offset, dur, vol) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, ctx.currentTime + offset);
        g.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
        g.gain.linearRampToValueAtTime(vol, ctx.currentTime + offset + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + dur);
        o.connect(g).connect(master);
        o.start(ctx.currentTime + offset);
        o.stop(ctx.currentTime + offset + dur + 0.02);
      };
      burst(600, 0.00, 0.07, 0.22);
      burst(400, 0.03, 0.09, 0.18);
      burst(300, 0.08, 0.12, 0.16);
      setTimeout(() => {
        try { ctx.close().catch(() => {}); } catch {}
      }, 320);
    } catch (e) {
      console.warn('Error sonido colgar:', e);
    }
  }

  async function playGreetingDirect() {
    if (greetingHasPlayed) return;
    greetingHasPlayed = true;
    const greeting = 'Hola, soy Sandra. ¿En qué puedo ayudarte?';
    try {
      // Desactivar barge-in temporalmente
      try { window.sandraAPI?.setBargeIn?.(false); } catch {}
      // Ventana mínima para evitar que se re-habilite barge-in demasiado pronto
      noBargeUntilTs = Date.now() + 6000;

      if (!window.sandraAPI || !window.sandraAPI.generateSpeech) {
        console.warn('generateSpeech no disponible');
        return;
      }
      // Volver a TTS fiable para el saludo inmediato
      const res = await window.sandraAPI.generateSpeech(greeting, {
        speed: 0.75,
        emotion: [{ id: 'warm', strength: 0.5 }]
      });
      if (res && res.success && res.audioBuffer) {
        let u8;
        if (res.audioBuffer.data && Array.isArray(res.audioBuffer.data)) {
          u8 = new Uint8Array(res.audioBuffer.data);
        } else if (res.audioBuffer.buffer) {
          u8 = new Uint8Array(res.audioBuffer.buffer);
        } else {
          u8 = new Uint8Array(res.audioBuffer);
        }
        const blob = new Blob([u8], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        // Volumen ideal recuperado del saludo original
        audio.volume = 0.45;
        audio.addEventListener('play', () => {
          if (typeof window.startMouthSyncForAudio === 'function') {
            try { window.startMouthSyncForAudio(audio); } catch {}
          }
        });
        audio.addEventListener('ended', () => {
          if (typeof window.stopMouthSync === 'function') {
            try { window.stopMouthSync(); } catch {}
          }
          // Reactivar barge-in respetando ventana mínima
          try {
            const now = Date.now();
            const delay = Math.max(0, noBargeUntilTs - now);
            if (delay === 0) {
              window.sandraAPI?.setBargeIn?.(true);
            } else {
              setTimeout(() => { try { window.sandraAPI?.setBargeIn?.(true); } catch {} }, delay);
            }
          } catch {}
        });
        await audio.play();
        // Fallback: si por alguna razón no llega 'ended', reactivar barge-in tras 3s
        setTimeout(() => {
          try {
            if (Date.now() >= noBargeUntilTs) {
              window.sandraAPI?.setBargeIn?.(true);
            }
          } catch {}
        }, 3000);
      } else {
        console.warn('TTS sin audio:', res);
      }
      // Nota: ya no reactivamos barge-in por tiempo corto; se hace al 'ended' o fallback 3s
    } catch (e) {
      console.error('Error generando/reproduciendo saludo (stream):', e);
      try { window.sandraAPI?.setBargeIn?.(true); } catch {}
    }
  }

  function resetIdleTimer() {
    try { clearTimeout(idleTimeoutId); } catch {}
    idleTimeoutId = setTimeout(() => {
      const st = window.multimodalState || {};
      if (st.sessionActive) {
        log('Inactividad detectada. Colgando llamada.');
        hangUpCall();
      }
    }, 30000);
  }

  function hangUpCall() {
    try {
      if (typeof window.stopConversationalCall === 'function') {
        window.stopConversationalCall();
      } else {
        const btn = document.getElementById('conversational-call-btn') ||
                    document.querySelector('[data-call-button]');
        if (btn && btn.classList.contains('active')) btn.click();
      }
    } catch {}
  }

  function onStateUpdate(s) {
    // Inicio de llamada
    if (s.sessionActive && previousSessionActive !== true) {
      log('Llamada detectada: inicio');
      scheduleRingtoneFlow();
      resetIdleTimer();
    }
    // Fin de llamada
    if (!s.sessionActive && previousSessionActive === true) {
      log('Llamada detectada: fin');
      stopRingtone();
      playHangupClunk();
      try { window.sandraAPI?.stopTTSStream?.(); } catch {}
      try {
        if (window.__callCenterSilenceCtx && window.__callCenterSilenceCtx.state !== 'closed') {
          window.__callCenterSilenceCtx.close().catch(() => {});
        }
      } catch {}
      window.__callCenterSilenceCtx = null;
      try { window.voiceStream?.suspend?.(); } catch {}
      try { clearTimeout(idleTimeoutId); } catch {}
      noBargeUntilTs = 0;
    }
    // Actividad durante la llamada
    if (s.sessionActive) {
      if (previousIsSpeaking !== s.isSpeaking ||
          previousIsListening !== s.isListening ||
          previousIsThinking !== s.isThinking) {
        resetIdleTimer();
      }
    }
    previousSessionActive = s.sessionActive;
    previousIsListening = s.isListening;
    previousIsSpeaking = s.isSpeaking;
    previousIsThinking = s.isThinking;
  }

  function startPolling() {
    if (pollIntervalId) return;
    pollIntervalId = setInterval(() => {
      const state = window.multimodalState || {};
      onStateUpdate(state);
    }, 250);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') resetIdleTimer();
  });

  // Limpia cualquier indicador superior 'Llamada Inactiva' añadido por código previo
  function cleanupForeignUI() {
    try {
      document.querySelectorAll('#call-status.status-indicator, .status-indicator').forEach(el => {
        el.remove();
      });
    } catch {}
  }
  // Observa y elimina futuros indicadores no deseados
  function observeForeignIndicators() {
    try {
      const obs = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const n of m.addedNodes) {
            if (!(n instanceof HTMLElement)) continue;
            if (n.id === 'call-status' && n.classList.contains('status-indicator')) {
              try { n.remove(); } catch {}
            } else if (n.classList && n.classList.contains('status-indicator')) {
              try { n.remove(); } catch {}
            }
          }
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
    } catch {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(cleanupForeignUI, 50);
      observeForeignIndicators();
    });
  } else {
    setTimeout(cleanupForeignUI, 50);
    observeForeignIndicators();
  }

  startPolling();
  log('Módulo cargado');

  // Compatibilidad: exponer funciones si la UI existente las llama
  try {
    if (!window.startRingtone) {
      window.startRingtone = () => {
        try { scheduleRingtoneFlow(); } catch (e) { console.warn('startRingtone shim error:', e); }
      };
    }
    if (!window.stopRingtone) {
      window.stopRingtone = () => {
        try { stopRingtone(); } catch (e) { console.warn('stopRingtone shim error:', e); }
      };
    }
    if (!window.playGreetingDirect) {
      window.playGreetingDirect = () => {
        try { return playGreetingDirect(); } catch (e) { console.warn('playGreetingDirect shim error:', e); }
      };
    }
  } catch {}
})();


