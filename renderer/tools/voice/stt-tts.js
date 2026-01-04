// 🎙️ STT/TTS NATIVO — todo local, sin APIs externas
// Usa whisper.cpp embebido y voz de Windows

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class VoiceEngine {
  constructor() {
    this.whisperPath = path.join(__dirname, 'whisper.exe');
    this.isBargeInEnabled = true;
    this.isSpeaking = false;
  }

  // 🎤 STT: graba audio y transcribe
  async transcribeAudio(audioPath, options = {}) {
    if (!fs.existsSync(this.whisperPath)) {
      throw new Error('whisper.exe no encontrado — instala con install-voice.bat');
    }

    const { model = 'base', language = 'es', threads = 2 } = options;
    const args = [
      '-m', `models/ggml-${model}.bin`,
      '-f', audioPath,
      '-l', language,
      '-t', threads.toString(),
      '--output-txt'
    ];

    return new Promise((resolve, reject) => {
      const child = spawn(this.whisperPath, args, { 
        cwd: path.dirname(this.whisperPath),
        timeout: 30000 
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => { stdout += data; });
      child.stderr.on('data', (data) => { stderr += data; });

      child.on('close', (code) => {
        if (code === 0) {
          const txtPath = audioPath.replace(/\.wav$/, '.txt');
          fs.readFile(txtPath, 'utf-8')
            .then(text => resolve(text.trim()))
            .catch(() => resolve(stdout.trim()));
        } else {
          reject(new Error(`Whisper falló: ${stderr || stdout}`));
        }
      });

      child.on('error', reject);
    });
  }

  // 🔊 TTS: sintetiza voz con Windows
  async speak(text, options = {}) {
    const { rate = 1, volume = 1, voice = 'es-ES-ElviraNeural' } = options;

    // Usar PowerShell + voz de Windows (rápido y local)
    const psScript = `
      Add-Type -AssemblyName System.Speech
      $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
      $synth.Volume = ${volume * 100}
      $synth.Rate = ${Math.max(-10, Math.min(10, (rate - 1) * 10))}
      $voices = $synth.GetInstalledVoices() | Where-Object {$_.VoiceInfo.Name -like "*${voice}*"}
      if ($voices.Count -gt 0) { $synth.SelectVoice($voices[0].VoiceInfo.Name) }
      $synth.Speak("${text.replace(/"/g, '`"')}")
      $synth.Dispose()
    `;

    return new Promise((resolve, reject) => {
      this.isSpeaking = true;
      
      const child = spawn('powershell', ['-Command', psScript], {
        timeout: 60000
      });

      child.on('close', (code) => {
        this.isSpeaking = false;
        if (code === 0) resolve();
        else reject(new Error(`TTS falló con código ${code}`));
      });

      child.on('error', (e) => {
        this.isSpeaking = false;
        reject(e);
      });
    });
  }

  // 🎧 Barge-in: detección de voz para interrumpir
  enableBargeIn() {
    this.isBargeInEnabled = true;
    console.log('🎤 Barge-in activado');
  }

  disableBargeIn() {
    this.isBargeInEnabled = false;
  }

  // 🔄 Integración con orquestación
  async processVoiceInput(audioPath) {
    const text = await this.transcribeAudio(audioPath);
    console.log('🗣️ STT:', text);

    // Enviar a orquestador
    const result = await window.orchestrationEngine?.process(text) || 
                   { success: false, error: 'Orquestador no disponible' };

    if (result.success) {
      // Hablar respuesta
      if (this.isBargeInEnabled) {
        await this.speak(result.answer);
      }
      return { ...result, inputText: text };
    }

    return result;
  }
}

// Instancia global
const voiceEngine = new VoiceEngine();

// Export
module.exports = { voiceEngine, VoiceEngine };
exports.voiceEngine = voiceEngine;