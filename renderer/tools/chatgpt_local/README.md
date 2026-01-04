# 🤖 ChatGPT Local — Integración no oficial

Igual que Claude, pero para ChatGPT.

## Estructura
```
chatgpt_local/
├── chatgpt_api/       ← Core (client, session, errors)
├── chatgpt_wrapper.py ← Bridge Python
├── chatgpt-integration.js ← Bridge Node
└── secrets/
    └── chatgpt_cookies.json
```

## Uso
```js
const { useChatGPT } = await import('./tools/chatgpt_local/chatgpt-integration.js');
const res = await useChatGPT("Hola");
```

## Auto-ruteo
El orquestador ya lo incluye:
- Si `strategy.primary === 'chatgpt'` → usa este módulo
- Fallback automático si falla

➡️ **Para activarlo, solo crea la carpeta y añade tus cookies.**