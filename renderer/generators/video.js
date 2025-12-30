/**
 * VIDEO GENERATOR — Cley | Sandra Studio Ultimate
 * ═══════════════════════════════════════════════════════════════════════════
 * Genera video desde imágenes + audio
 * ═══════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Pipeline de generación de video
 */
const pipeline = {
  name: 'video',
  steps: [
    'generate_frames',
    'compose',
    'add_audio',
    'render'
  ]
};

/**
 * Ejecutar pipeline de video
 */
async function execute(payload, callback) {
  const { text = 'un video corto', canvasData, frames = [] } = payload;

  try {
    console.log('[VIDEO GEN] 🎥 Iniciando pipeline de video...');

    const outputDir = path.join(__dirname, '../outputs');
    await fs.mkdir(outputDir, { recursive: true });

    const videoPath = path.join(outputDir, `video_${Date.now()}.mp4`);

    // Paso 1: Generar frames (si no vienen)
    let framePaths = frames;
    if (framePaths.length === 0) {
      framePaths = await generateFrames(text, canvasData);
    }

    // Paso 2: Componer video desde frames
    await composeVideo(framePaths, videoPath);

    // Paso 3: Añadir audio (opcional)
    if (payload.audioPath) {
      await addAudio(videoPath, payload.audioPath);
    }

    console.log('[VIDEO GEN] ✅ Video generado:', videoPath);

    callback({
      type: 'video',
      url: `file://${path.resolve(videoPath)}`,
      path: videoPath,
      action: 'download|play',
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('[VIDEO GEN] ❌ Error:', error.message);
    callback({
      error: 'Generación de video falló',
      detail: error.message
    });
  }
}

/**
 * Generar frames
 */
async function generateFrames(text, canvasData) {
  const framesDir = path.join(__dirname, '../temp/frames');
  await fs.mkdir(framesDir, { recursive: true });

  const framePaths = [];
  const numFrames = 30; // 30 frames para 1 segundo a 30fps

  // Generar frames (aquí usarías tu generador de imágenes)
  for (let i = 0; i < numFrames; i++) {
    const framePath = path.join(framesDir, `frame_${String(i).padStart(4, '0')}.png`);
    // TODO: Generar frame real
    framePaths.push(framePath);
  }

  return framePaths;
}

/**
 * Componer video desde frames usando FFmpeg
 */
async function composeVideo(framePaths, outputPath) {
  if (framePaths.length === 0) {
    throw new Error('No hay frames para componer');
  }

  const framesPattern = path.join(path.dirname(framePaths[0]), 'frame_%04d.png');
  
  try {
    // Verificar si FFmpeg está disponible
    await execAsync('ffmpeg -version');
  } catch (error) {
    throw new Error('FFmpeg no está instalado. Instálalo para generar videos.');
  }

  // Componer video
  const command = `ffmpeg -y -framerate 30 -i "${framesPattern}" -c:v libx264 -pix_fmt yuv420p "${outputPath}"`;
  
  await execAsync(command);
  console.log('[VIDEO GEN] ✅ Video compuesto');
}

/**
 * Añadir audio al video
 */
async function addAudio(videoPath, audioPath) {
  const outputPath = videoPath.replace('.mp4', '_with_audio.mp4');
  
  const command = `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac -shortest "${outputPath}"`;
  
  await execAsync(command);
  
  // Reemplazar video original
  await fs.rename(outputPath, videoPath);
  console.log('[VIDEO GEN] ✅ Audio añadido');
}

module.exports = {
  pipeline,
  execute,
  generateFrames,
  composeVideo,
  addAudio
};

