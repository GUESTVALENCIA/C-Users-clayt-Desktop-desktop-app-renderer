// 📄 PDF-MIN — parser ultra-ligero para extraer texto (sin dependencias)
// Basado en algoritmos de extracción de stream de PDF (solo texto plano)

function extractTextFromPDF(buffer) {
  const pdfData = new Uint8Array(buffer);
  let text = '';

  // Buscar streams de texto: /FlateDecode y contenido entre 'BT'...'ET'
  const decoder = new TextDecoder('utf-8');
  let i = 0;
  
  while (i < pdfData.length - 5) {
    // Buscar inicio de contenido: 'BT' (Begin Text)
    if (pdfData[i] === 66 && pdfData[i+1] === 84) { // 'B','T'
      i += 2;
      // Saltar operadores hasta encontrar texto
      while (i < pdfData.length) {
        // Detectar cadenas entre paréntesis: (Hola mundo)
        if (pdfData[i] === 40) { // '('
          i++;
          let str = '';
          let depth = 1;
          while (i < pdfData.length && depth > 0) {
            if (pdfData[i] === 40) depth++;       // '('
            else if (pdfData[i] === 41) depth--;  // ')'
            else if (depth === 1) {
              // Convertir byte a char (solo ASCII por ahora)
              if (pdfData[i] >= 32 && pdfData[i] <= 126) {
                str += String.fromCharCode(pdfData[i]);
              }
            }
            i++;
          }
          if (str.trim()) text += str + ' ';
        }
        // Fin de bloque de texto: 'ET'
        else if (pdfData[i] === 69 && pdfData[i+1] === 84) {
          break;
        }
        i++;
      }
    }
    i++;
  }

  // Limpiar texto: múltiples espacios, líneas vacías
  return text
    .replace(/\s+/g, ' ')
    .replace(/\\n/g, ' ')
    .trim();
}

// Export para Node/Electron
if (typeof module !== 'undefined') {
  module.exports = { extractTextFromPDF };
}