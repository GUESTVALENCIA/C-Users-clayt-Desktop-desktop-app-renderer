// 📎 ATTACHMENT UI — para Sandra Studio
// Añade botón de adjuntar + drag & drop

function createAttachmentUI(containerSelector = '#input-area') {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  const html = `
    <div id="attachment-bar" style="
      display: flex; gap: 8px; margin-bottom: 12px;
      padding: 10px; background: #1a1a1a; border-radius: 8px;
    ">
      <label title="📎 Adjuntar archivo" style="
        display: inline-block; padding: 8px 16px;
        background: #2a2a2a; border: 1px solid #333;
        border-radius: 6px; cursor: pointer;
        color: #aaa; font-size: 14px;
      ">
        📎 Adjuntar
        <input type="file" id="file-input" multiple 
               accept=".pdf,.txt,.csv,.png,.jpg,.jpeg,.zip"
               style="display: none;">
      </label>
      <div id="attachment-preview" style="flex: 1; display: flex; gap: 6px; flex-wrap: wrap;"></div>
    </div>
  `;

  container.insertAdjacentHTML('beforebegin', html);

  const fileInput = document.getElementById('file-input');
  const preview = document.getElementById('attachment-preview');

  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => addAttachmentPreview(file, preview));
  });

  // Drag & drop
  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    container.style.borderColor = '#1e88e5';
  });
  container.addEventListener('dragleave', () => {
    container.style.borderColor = '#333';
  });
  container.addEventListener('drop', (e) => {
    e.preventDefault();
    container.style.borderColor = '#333';
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => addAttachmentPreview(file, preview));
  });
}

function addAttachmentPreview(file, container) {
  const div = document.createElement('div');
  div.style.cssText = `
    padding: 6px 10px; background: #2d2d2d; border-radius: 6px;
    display: flex; align-items: center; gap: 6px;
    font-size: 12px; color: #ddd;
  `;
  div.innerHTML = `
    <span>${getIcon(file.name)}</span>
    <span>${file.name}</span>
    <button class="remove-attach" style="
      background: none; border: none; color: #888; cursor: pointer;
    ">✕</button>
  `;
  container.appendChild(div);

  div.querySelector('.remove-attach').onclick = () => {
    container.removeChild(div);
  };

  // Procesar automáticamente
  processAttachment(file);
}

function getIcon(name) {
  if (/\.pdf$/i.test(name)) return '📄';
  if (/\.txt$/i.test(name)) return '🗒️';
  if (/\.csv$/i.test(name)) return '📊';
  if (/\.png|\.jpg|\.jpeg$/i.test(name)) return '🖼️';
  if (/\.zip$/i.test(name)) return '📁';
  return '📎';
}

async function processAttachment(file) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Guardar en outputs/
  const outputPath = `outputs/attach-${Date.now()}-${file.name}`;
  require('fs').writeFileSync(outputPath, buffer);

  // Detectar tipo
  const type = /\.pdf$/i.test(file.name) ? 'pdf' :
               /\.txt$/i.test(file.name) ? 'txt' :
               /\.csv$/i.test(file.name) ? 'csv' :
               /\.(png|jpg|jpeg)$/i.test(file.name) ? 'image' : 'other';

  const item = { 
    id: `attach-${Date.now()}`, 
    type, 
    label: file.name,
    localPath: outputPath,
    size: file.size
  };

  // Enviar a procesador
  if (type === 'image') {
    require('../observers/processors/media').processMediaItem(item)
      .then(res => console.log('🖼️ Imagen procesada:', res.localPath));
  } else {
    require('../observers/processors/documents').extractTextFromDocument(item)
      .then(res => {
        console.log('📄 Documento procesado:', res.extractedText?.slice(0,50));
        // Auto-enviar a Claude si es largo
        if (res.extractedText?.length > 300) {
          require('../observers/integrators/claude').autoClaudeHandler(res);
        }
      });
  }
}

// Export
module.exports = { createAttachmentUI };
exports.createAttachmentUI = createAttachmentUI;