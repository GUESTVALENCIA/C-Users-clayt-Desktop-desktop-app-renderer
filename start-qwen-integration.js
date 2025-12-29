// start-qwen-integration.js - Archivo de inicio para la integración completa de Qwen

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

console.log('🚀 Iniciando StudioLab con integración completa de Qwen...');

// Verificar que Ollama esté corriendo
async function checkOllama() {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    return response.ok;
  } catch (error) {
    console.log('❌ Ollama no está corriendo. Iniciando Ollama...');
    return false;
  }
}

// Iniciar Ollama si no está corriendo
async function startOllama() {
  const ollamaPath = 'C:\\Users\\clayt\\AppData\\Local\\Programs\\Ollama\\ollama.exe';
  
  try {
    // Verificar si el archivo existe
    await fs.access(ollamaPath);
    
    // Iniciar Ollama como proceso en segundo plano
    const ollamaProcess = spawn(ollamaPath, ['serve'], {
      detached: true,
      stdio: 'ignore'
    });
    
    ollamaProcess.unref(); // Permitir que el proceso padre termine sin afectar a Ollama
    
    console.log('✅ Ollama iniciado en segundo plano');
    
    // Esperar un momento para que Ollama se inicie completamente
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return true;
  } catch (error) {
    console.error('❌ Error iniciando Ollama:', error.message);
    console.log('⚠️ Asegúrate de que Ollama esté instalado correctamente');
    return false;
  }
}

// Iniciar servidores MCP
async function startMCP() {
  console.log('🔌 Iniciando servidores MCP...');
  
  try {
    // Iniciar servidor MCP principal
    const mcpServer = require('./mcp-server.js');
    mcpServer.start();
    console.log('✅ Servidor MCP principal iniciado');
    
    // Iniciar servidor MCP NEON (Python)
    const pythonProcess = spawn('python', ['./mcp-server-neon.py'], {
      cwd: __dirname,
      detached: true,
      stdio: 'pipe'
    });
    
    pythonProcess.stdout.on('data', (data) => {
      console.log(`MCP NEON: ${data.toString()}`);
    });
    
    pythonProcess.stderr.on('data', (data) => {
      console.error(`MCP NEON Error: ${data.toString()}`);
    });
    
    pythonProcess.on('close', (code) => {
      console.log(`Servidor MCP NEON cerrado con código ${code}`);
    });
    
    pythonProcess.unref();
    
    console.log('✅ Servidor MCP NEON iniciado');
    return true;
  } catch (error) {
    console.error('❌ Error iniciando servidores MCP:', error.message);
    return false;
  }
}

// Función principal de inicio
async function startStudioLab() {
  console.log('\n🔍 Verificando configuración de StudioLab...');
  
  // Verificar Ollama
  let ollamaRunning = await checkOllama();
  if (!ollamaRunning) {
    ollamaRunning = await startOllama();
  }
  
  if (!ollamaRunning) {
    console.error('❌ No se pudo iniciar Ollama. Verifica la instalación.');
    process.exit(1);
  }
  
  // Iniciar servidores MCP
  const mcpStarted = await startMCP();
  if (!mcpStarted) {
    console.error('❌ No se pudieron iniciar los servidores MCP.');
    // Continuar de todas formas, ya que podrían estar corriendo
    console.log('⚠️ Continuando sin servidores MCP...');
  }
  
  // Iniciar la aplicación Electron
  console.log('\n🎮 Iniciando StudioLab con integración de Qwen...');
  console.log('✅ Todo listo. Abriendo la interfaz principal...');
  
  // Ejecutar npm start
  const electronProcess = spawn('npm', ['start'], {
    cwd: __dirname,
    stdio: 'inherit'
  });
  
  electronProcess.on('close', (code) => {
    console.log(`StudioLab cerrado con código ${code}`);
    process.exit(code);
  });
}

// Iniciar la aplicación
startStudioLab().catch(error => {
  console.error('❌ Error fatal iniciando StudioLab:', error);
  process.exit(1);
});