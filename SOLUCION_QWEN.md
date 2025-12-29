# SOLUCIÓN QWEN - Problema Real

## El Problema
`chat.qwen.ai` está bloqueando iframes con `X-Frame-Options: sameorigin`. Esto significa que **NO podemos usar iframe ni webview tag**.

## Solución: BrowserView de Electron

En lugar de usar `<webview>` o `<iframe>` en el HTML, necesitamos usar `BrowserView` en el proceso principal de Electron.

### Pasos:
1. Crear un BrowserView cuando el usuario haga clic en QWEN
2. Adjuntar el BrowserView a la ventana principal
3. Cargar `https://qwenlm.ai/` en el BrowserView
4. Mostrar/ocultar el BrowserView según el estado

Esto es lo que hace VS Code internamente - usa su propio sistema de webview que es similar a BrowserView.

