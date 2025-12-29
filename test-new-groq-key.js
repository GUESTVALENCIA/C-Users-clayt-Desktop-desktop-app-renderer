#!/usr/bin/env node

require('dotenv').config();

console.log('\n🧪 TEST DE NUEVA GROQ API KEY\n');

const { GroqService } = require('./groq-service');
const { APIRotationSystem } = require('./api-rotation-system');

// Test 1: Groq Service directo
console.log('1️⃣ Test Groq Service Directo:');
const groq = new GroqService();
console.log(`   API disponible: ${groq.isAvailable ? '✅' : '❌'}`);
console.log(`   Modelos: ${groq.getAvailableModels().length}`);

// Test 2: API Rotation System
console.log('\n2️⃣ Test API Rotation System:');
const rotationSystem = new APIRotationSystem();
const stats = rotationSystem.getStats();
console.log(`   Groq APIs cargadas: ${stats.groq.total}`);
console.log(`   Groq APIs activas: ${stats.groq.active}`);

// Test 3: Obtener API actual
console.log('\n3️⃣ Obteniendo API actual:');
try {
  const api = rotationSystem.getAPI('groq');
  console.log(`   ✅ API obtenida correctamente`);
  console.log(`   Label: ${api.label}`);
  console.log(`   Clave primeros 10: ${api.apiKey.substring(0, 10)}...`);
} catch (e) {
  console.log(`   ❌ Error: ${e.message}`);
}

// Test 4: Connection test
console.log('\n4️⃣ Test de conexión a Groq API:');
groq.testConnection().then(result => {
  if (result.available) {
    console.log(`   ✅ CONEXIÓN EXITOSA`);
    console.log(`   Respuesta: ${result.response}`);
    console.log(`   Modelos disponibles: ${result.models}`);
  } else {
    console.log(`   ❌ Conexión fallida: ${result.error}`);
  }
  console.log('\n✅ TEST COMPLETADO\n');
});
