// 🛠️ setup-claude.js — ejecutar desde main process de Electron
// Uso: require('./tools/claude_local/setup-claude')(mainWindow)

const { BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

function setupClaude(mainWindow) {
  const secretsDir = path.join(__dirname, 'secrets');
  const secretsFile = path.join(secretsDir, 'claude_cookies.json');

  // Si ya existe, no hacer nada
  if (fs.existsSync(secretsFile)) {
    mainWindow.webContents.send('claude-setup', { status: 'already_setup' });
    return;
  }

  // Crear ventana oculta
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  win.loadURL('https://claude.ai/chats');

  win.webContents.on('did-finish-load', () => {
    setTimeout(() => {
      win.webContents.executeJavaScript(`
        new Promise((resolve) => {
          // Esperar a que cargue la API
          const checkOrg = () => {
            fetch('/api/organizations', { 
              headers: { 'Accept': 'application/json' } 
            })
            .then(r => r.json())
            .then(orgs => {
              if (Array.isArray(orgs) && orgs.length > 0) {
                const cookies = document.cookie;
                const ua = navigator.userAgent;
                const orgId = orgs[0].uuid;
                resolve({ cookies, ua, orgId });
              } else {
                setTimeout(checkOrg, 1000);
              }
            })
            .catch(() => setTimeout(checkOrg, 1000));
          };
          checkOrg();
        });
      `, true).then(data => {
        if (data && data.cookies) {
          const secrets = {
            cookie: data.cookies,
            user_agent: data.ua,
            organization_id: data.orgId
          };
          if (!fs.existsSync(secretsDir)) fs.mkdirSync(secretsDir, { recursive: true });
          fs.writeFileSync(secretsFile, JSON.stringify(secrets, null, 2));
          win.close();
          mainWindow.webContents.send('claude-setup', { status: 'success', file: secretsFile });
        } else {
          win.close();
          mainWindow.webContents.send('claude-setup', { status: 'failed', reason: 'No se obtuvieron cookies' });
        }
      }).catch(err => {
        win.close();
        mainWindow.webContents.send('claude-setup', { status: 'failed', reason: err.message });
      });
    }, 3000);
  });
}

module.exports = setupClaude;