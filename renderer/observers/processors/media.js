// 📸 MEDIA PROCESSOR — descarga y prepara imágenes/vídeos/audios localmente
const fs = require('fs');
const path = require('path');

function processMediaItem(mediaItem) {
  const { url, type } = mediaItem;
  
  if (!url) return Promise.reject(new Error('No URL'));

  return new Promise((resolve, reject) => {
    // Soporte para data: URLs (imágenes base64 generadas en app)
    if (url.startsWith('data:image/')) {
      const ext = url.split(';')[0].split('/')[1] || 'png';
      const base64Data = url.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      
      const filename = `media-${Date.now()}.${ext}`;
      const outputPath = path.join(__dirname, '../../outputs', filename);
      
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, buffer);
      
      resolve({
        ...mediaItem,
        localPath: outputPath,
        size: buffer.length,
        format: ext
      });
    } else {
      // URLs externas → descarga con fetch (Electron soporta)
      fetch(url)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.arrayBuffer();
        })
        .then(arrayBuffer => {
          const buffer = Buffer.from(arrayBuffer);
          const ext = path.extname(new URL(url).pathname).slice(1) || 'bin';
          const filename = `media-${Date.now()}.${ext}`;
          const outputPath = path.join(__dirname, '../../outputs', filename);
          
          fs.mkdirSync(path.dirname(outputPath), { recursive: true });
          fs.writeFileSync(outputPath, buffer);
          
          resolve({
            ...mediaItem,
            localPath: outputPath,
            size: buffer.length,
            format: ext
          });
        })
        .catch(reject);
    }
  });
}

// Export
module.exports = { processMediaItem };
exports.processMediaItem = processMediaItem;