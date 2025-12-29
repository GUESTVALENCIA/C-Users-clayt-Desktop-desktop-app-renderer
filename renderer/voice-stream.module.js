// Reproductor de audio en streaming (dúplex) con pink-noise y compresor
(function () {
  if (window.__voiceStreamLoaded) return;
  window.__voiceStreamLoaded = true;

  let audioCtx;
  let pinkNoiseGain;
  let masterGain;
  let compressor;

  function ensureContext() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // Compresor para ducking/consistencia
    compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -30; // dB
    compressor.knee.value = 20;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    masterGain = audioCtx.createGain();
    masterGain.gain.value = 1.0;

    // Pink noise de fondo muy bajo para evitar vacío (≈ -55 dB)
    pinkNoiseGain = audioCtx.createGain();
    // Desactivado por defecto para evitar sensación de "viento"
    pinkNoiseGain.gain.value = 0.0;
    const noiseSrc = createPinkNoise(audioCtx);
    noiseSrc.connect(pinkNoiseGain).connect(compressor);

    compressor.connect(audioCtx.destination);

    try { noiseSrc.start(); } catch {}
  }

  function createPinkNoise(ctx) {
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.11;
      b6 = white * 0.115926;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    return noise;
  }

  // Cola de reproducción por trozos WAV
  let playQueue = Promise.resolve();
  // Volumen base validado en el workflow (voz clara pero sin agresividad)
  let currentVolume = 0.45;
  function playWavChunkBase64(b64) {
    ensureContext();
    const arrayBuffer = Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
    // Creamos un objeto URL y reproducimos con <audio> para evitar decodeAudioData costoso en micro-chunks
    const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    playQueue = playQueue.then(() => {
      return new Promise((resolve) => {
        const el = new Audio(url);
        el.volume = currentVolume;
        el.addEventListener('ended', () => {
          URL.revokeObjectURL(url);
          resolve();
        });
        el.addEventListener('error', () => {
          URL.revokeObjectURL(url);
          resolve();
        });
        el.play().catch(() => resolve());
      });
    });
  }

  // Recibir chunks desde el backend
  if (window.sandraAPI?.onAudioChunk) {
    window.sandraAPI.onAudioChunk(({ type, data }) => {
      if (type === 'wav' && data) {
        playWavChunkBase64(data);
      }
    });
  }

  // Control público sencillo
  window.voiceStream = {
    ensure: ensureContext,
    setMasterGain: (v) => { try { ensureContext(); masterGain.gain.value = v; } catch {} },
    setPinkGain: (v) => { try { ensureContext(); pinkNoiseGain.gain.value = v; } catch {} },
    setVolume: (v) => { currentVolume = Math.max(0, Math.min(1, Number(v) || 0)); },
    resume: () => { try { ensureContext(); audioCtx.resume(); } catch {} },
    suspend: () => { try { audioCtx?.suspend(); } catch {} }
  };

})(); 

