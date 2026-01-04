# ✅ Claude Local — Integrado en Sandra Studio

Este módulo permite usar **Claude.ai GRATIS y localmente** desde tu app de escritorio.

---

## 🔑 Paso 1: Obtener tus credenciales (solo 1 vez)

1. Abre Chrome/Firefox y ve a: https://claude.ai/chats  
   → Asegúrate de estar logueado.

2. Abre DevTools → Network → recarga la página.

3. Busca una petición a: `https://claude.ai/api/organizations`

4. En Headers → Request Headers → copia:
   - **Cookie**: todo el valor (es largo)
   - **User-Agent**: la línea completa

5. Pega ambos en:  
   `secrets/claude_cookies.json`

> ✅ El `organization_id` se obtiene automáticamente si lo dejas como `null`.

---

## 🧪 Paso 2: Probar desde terminal

```bash
cd "C:\Users\clayt\Desktop\desktop-app\renderer\tools\claude_local"
python -m pip install -r requirements.txt
python claude_wrapper.py create_chat
# → devuelve {"chat_id": "xxx"}
python claude_wrapper.py send_message <chat_id> "Hola, ¿quién eres?"
```

---

## ⚡ Paso 3: Integrar en tu app Electron

Desde Node.js (main/renderer):
```js
const { exec } = require('child_process');

function callClaude(cmd, args = []) {
  return new Promise((resolve, reject) => {
    const py = `"${__dirname}/tools/claude_local/claude_wrapper.py"`;
    const fullCmd = `python ${py} ${cmd} ${args.map(JSON.stringify).join(' ')}`;
    exec(fullCmd, (err, stdout) => {
      if (err) return reject(err);
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(new Error(`JSON parse failed: ${stdout}`));
      }
    });
  });
}

// Ejemplo:
callClaude("create_chat").then(res => {
  const chatId = res.chat_id;
  return callClaude("send_message", [chatId, "Resume este código: console.log('Hola')"]);
}).then(res => {
  console.log("✅ Claude dice:", res.answer);
});
```

---

## ✅ Ventajas para Sandra
- Sin API key, sin coste.
- Todo corre local → sin fugas.
- Compatible con tu flujo actual (Qwen, DeepSeek, etc.).
- Puedes usarlo como **modelo de respaldo o especializado** (ej: análisis de PDFs largos).

---

## ❗ Notas
- Si falla por `403`, probablemente tu cookie expiró → actualízala.
- Soporte básico de archivos: `.txt` por ahora (puedo añadir PDF/PNG si necesitas).
- No usa Selenium → más estable y rápido.

¿Necesitas que genere el script de Node.js listo para `chat-handler.js` o `orchestrator/`?