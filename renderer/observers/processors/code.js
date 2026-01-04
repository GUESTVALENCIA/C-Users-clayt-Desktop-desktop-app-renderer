// 🧩 CODE PROCESSOR — limpia, clasifica y normaliza bloques de código
// Detecta lenguajes, elimina basura, y prepara para Qwen.

function cleanCodeBlock(rawCode, detectedLang = 'plaintext') {
  // Paso 1: Eliminar comillas de apertura/cierre típicas de LLMs
  let code = rawCode
    .replace(/^```[a-z]*\n?/i, '')   // ```js, ```python, etc.
    .replace(/^```\s*$/gm, '')       // líneas con solo ```
    .replace(/```$/, '')             // cierre final
    .replace(/^["']|["']$/g, '');    // comillas al inicio/fin

  // Paso 2: Detectar lenguaje si no se dio
  const lang = detectedLang !== 'plaintext' 
    ? detectedLang 
    : detectLanguage(code);

  // Paso 3: Normalizar indentación (evita mezclas de tabs/spaces)
  const lines = code.split('\n').filter(l => l.trim() !== '');
  if (lines.length > 0) {
    const minIndent = Math.min(...lines.map(l => l.search(/\S|$/)));
    code = lines.map(l => l.slice(minIndent)).join('\n');
  }

  return { code: code.trim(), lang };
}

function detectLanguage(code) {
  const lower = code.toLowerCase();
  
  if (/import.*from|export.*from|const\s+\w+\s*=\s*require|console\.log|=>/.test(lower)) return 'javascript';
  if (/def\s+\w+\(|import\s+\w+|print\(|class\s+\w+:/.test(lower)) return 'python';
  if (/^\s*#include\s*<|int\s+main\s*\(/.test(lower)) return 'cpp';
  if (/^\s*using\s+System;|public\s+class\s+\w+/.test(lower)) return 'csharp';
  if (/^\s*package\s+\w+;|public\s+class\s+\w+\s*\{/.test(lower)) return 'java';
  if (/^\s*<\?php|echo\s+|function\s+\w+\s*\(/.test(lower)) return 'php';
  if (/^\s*SELECT\s+.*FROM\s+/i.test(lower)) return 'sql';

  return 'plaintext';
}

// Export
module.exports = { cleanCodeBlock, detectLanguage };
exports.cleanCodeBlock = cleanCodeBlock;