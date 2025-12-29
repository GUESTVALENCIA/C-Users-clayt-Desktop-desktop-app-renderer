// Basic smoke test for MCP gateway (8085) and QWEN chat stub
// Usage: node scripts/mcp-smoke.js
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args)).catch(() => global.fetch(...args));

async function run() {
  console.log('--- MCP/QWEN smoke ---');
  await check('Health', 'http://localhost:8085/health');
  await chat('Hola, prueba automatica desde smoke-test');
}

async function check(label, url) {
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log(`${label}:`, data);
  } catch (e) {
    console.error(`${label} error:`, e.message);
  }
}

async function chat(text) {
  try {
    const res = await fetch('http://localhost:8085/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, userId: 'smoke' })
    });
    const data = await res.json();
    console.log('Chat response:', data);
  } catch (e) {
    console.error('Chat error:', e.message);
  }
}

run();
