// 🐳 MAIN PROCESS DOCKER — Control seguro desde Electron
const { app, ipcMain } = require('electron');
const { spawn, exec } = require('child_process');
const path = require('path');

class DockerManager {
  constructor() {
    this.projectPath = path.join(app.getAppPath(), '..', 'sandra-ai-docker');
    this.isWindows = process.platform === 'win32';
  }

  // 🚀 Iniciar Docker Compose
  start() {
    return new Promise((resolve, reject) => {
      const cmd = this.isWindows ? 'docker-compose up -d' : 'docker compose up -d';
      const child = exec(cmd, { cwd: this.projectPath, timeout: 60000 });

      child.stdout?.on('data', (data) => console.log('🐳 Docker:', data));
      child.stderr?.on('data', (data) => console.error('🐳 Docker error:', data));

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, message: 'Docker iniciado' });
        } else {
          reject(new Error(`Docker falló con código ${code}`));
        }
      });

      child.on('error', reject);
    });
  }

  // ⏹️ Detener Docker Compose
  stop() {
    return new Promise((resolve, reject) => {
      const cmd = this.isWindows ? 'docker-compose down' : 'docker compose down';
      const child = exec(cmd, { cwd: this.projectPath, timeout: 30000 });

      child.on('close', (code) => {
        resolve({ success: true, message: 'Docker detenido' });
      });

      child.on('error', (e) => {
        if (e.message.includes('ENOENT')) {
          resolve({ success: true, message: 'Docker ya estaba detenido' });
        } else {
          reject(e);
        }
      });
    });
  }

  // 📊 Estado de Docker
  async getStatus() {
    try {
      const { stdout } = await this.execPromise('docker ps --filter "name=sandra" --format "{{.Names}}"');
      const containers = stdout.trim().split('\n').filter(Boolean);
      return { running: containers.length > 0, containers };
    } catch (e) {
      return { running: false, error: e.message };
    }
  }

  execPromise(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) reject(error);
        else resolve({ stdout, stderr });
      });
    });
  }
}

// Registrar IPC handlers
const dockerManager = new DockerManager();

ipcMain.handle('docker:start', () => dockerManager.start());
ipcMain.handle('docker:stop', () => dockerManager.stop());
ipcMain.handle('docker:status', () => dockerManager.getStatus());

module.exports = { DockerManager };