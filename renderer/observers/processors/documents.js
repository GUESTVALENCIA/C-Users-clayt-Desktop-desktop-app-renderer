// 📄 DOCUMENTS PROCESSOR — versión ligera (sin pdfjs)
const fs = require('fs').promises;
const path = require('path');
const { extractTextFromPDF } = require('../../tools/pdf-extract/pdf-min.js');

async function extractTextFromDocument(docItem) {
  const { type, localPath, label } = docItem;

  if (!localPath || !await fileExists(localPath)) {
    return { ...docItem, error: 'Archivo no encontrado', extractedText: '' };
  }

  try {
    switch (type) {
      case 'txt':
        const txt = await fs.readFile(localPath, 'utf-8');
        return { ...docItem, extractedText: cleanText(txt) };

      case 'csv':
        const csv = await fs.readFile(localPath, 'utf-8');
        return { ...docItem, extractedText: `CSV (${csv.split('\n').length} líneas):\n` + cleanText(csv) };

      case 'pdf':
        const buffer = await fs.readFile(localPath);
        const pdfText = extractTextFromPDF(buffer);
        return { ...docItem, extractedText: cleanText(pdfText || '[PDF sin texto detectado]') };

      case 'zip':
        return { ...docItem, extractedText: '[Archivo ZIP — contenido binario]' };

      default:
        const raw = await fs.readFile(localPath, 'utf-8').catch(() => '[binario]');
        return { ...docItem, extractedText: cleanText(raw.slice(0, 1000)) + '...' };
    }
  } catch (e) {
    return { ...docItem, error: e.message, extractedText: '' };
  }
}

async function fileExists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

function cleanText(text) {
  return text
    .replace(/\u0000/g, '')          // null bytes
    .replace(/\s+/g, ' ')            // múltiples espacios
    .replace(/[^\x20-\x7E\n\r\t]/g, '') // solo ASCII imprimible
    .trim();
}

// Export
module.exports = { extractTextFromDocument };
exports.extractTextFromDocument = extractTextFromDocument;