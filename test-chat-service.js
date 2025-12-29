#!/usr/bin/env node

// ============================================================================
// TEST CHAT SERVICE - Validar integración de todos los proveedores
// ============================================================================

const path = require('path');
const fs = require('fs');

// Cargar variables de entorno
require('dotenv').config({
  path: path.join(__dirname, '..', 'IA-SANDRA', '.env.pro')
});

// Cargar chat service
const chatService = require('./chat-service');

// Colores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, ...args) {
  console.log(color + args.join(' ') + colors.reset);
}

async function testProvider(provider, message, role) {
  return new Promise(async (resolve) => {
    try {
      log(colors.blue, `\n[TEST] Testeando proveedor: ${provider.toUpperCase()}`);

      const apiKeys = {
        groq: process.env.GROQ_API_KEY,
        anthropic: process.env.ANTHROPIC_API_KEY,
        openai: process.env.OPENAI_API_KEY,
        qwen: process.env.QWEN_API_KEY
      };

      if (!apiKeys[provider]) {
        log(colors.yellow, `⚠️  API Key no configurada para ${provider}`);
        resolve({ success: false, error: 'API Key missing' });
        return;
      }

      log(colors.cyan, `📤 Enviando: [${role}] ${message.substring(0, 50)}...`);

      const startTime = Date.now();
      const result = await chatService.sendMessage(provider, message, role, apiKeys);
      const duration = Date.now() - startTime;

      if (result.success) {
        log(colors.green, `✅ ${provider.toUpperCase()} respondió en ${duration}ms`);
        log(colors.green, `📝 Respuesta: ${result.response.substring(0, 80)}...`);

        if (result.usage) {
          log(colors.cyan, `📊 Tokens: ${JSON.stringify(result.usage)}`);
        }

        resolve({ success: true, duration, provider });
      } else {
        log(colors.red, `❌ ${provider.toUpperCase()} error: ${result.error}`);
        resolve({ success: false, error: result.error, provider });
      }
    } catch (error) {
      log(colors.red, `❌ ${provider.toUpperCase()} excepción: ${error.message}`);
      resolve({ success: false, error: error.message, provider });
    }
  });
}

async function runAllTests() {
  log(colors.yellow, '\n' + '='.repeat(70));
  log(colors.yellow, '🧪 TESTING CHAT SERVICE - MULTI-PROVEEDOR');
  log(colors.yellow, '='.repeat(70));

  // Validar API keys
  log(colors.cyan, '\n📡 Validando API Keys...');
  const keys = {
    groq: process.env.GROQ_API_KEY ? '✅' : '❌',
    anthropic: process.env.ANTHROPIC_API_KEY ? '✅' : '❌',
    openai: process.env.OPENAI_API_KEY ? '✅' : '❌',
    qwen: process.env.QWEN_API_KEY ? '✅' : '❌'
  };

  Object.entries(keys).forEach(([k, v]) => {
    const color = v === '✅' ? colors.green : colors.red;
    log(color, `  ${k.toUpperCase()}: ${v}`);
  });

  // Pruebas
  const testMessage = '¿Cuál es tu nombre y qué puedes hacer?';
  const testRole = '🎯 Business Strategist';

  const results = [];

  // Test 1: Groq
  if (process.env.GROQ_API_KEY) {
    const result = await testProvider('groq', testMessage, testRole);
    results.push(result);
  }

  // Test 2: Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    const result = await testProvider('anthropic', testMessage, testRole);
    results.push(result);
  }

  // Test 3: OpenAI
  if (process.env.OPENAI_API_KEY) {
    const result = await testProvider('openai', testMessage, testRole);
    results.push(result);
  }

  // Test 4: QWEN
  if (process.env.QWEN_API_KEY) {
    const result = await testProvider('qwen', testMessage, testRole);
    results.push(result);
  }

  // Resumen
  log(colors.yellow, '\n' + '='.repeat(70));
  log(colors.yellow, '📊 RESUMEN DE PRUEBAS');
  log(colors.yellow, '='.repeat(70));

  const successful = results.filter(r => r.success).length;
  const total = results.length;

  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    const time = r.duration ? `(${r.duration}ms)` : '';
    log(colors.cyan, `${status} ${r.provider.toUpperCase()} ${time}`);
  });

  log(colors.yellow, '\n' + '='.repeat(70));
  if (successful === total) {
    log(colors.green, `🎉 ÉXITO: ${successful}/${total} proveedores respondieron correctamente`);
  } else if (successful > 0) {
    log(colors.yellow, `⚠️  PARCIAL: ${successful}/${total} proveedores funcionaron`);
  } else {
    log(colors.red, `❌ FALLA: Ningún proveedor respondió`);
  }
  log(colors.yellow, '='.repeat(70));

  process.exit(successful === total ? 0 : 1);
}

// Ejecutar
runAllTests().catch(error => {
  log(colors.red, `Fatal error: ${error.message}`);
  process.exit(1);
});
