const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function httpJson(port, method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: '127.0.0.1', port, path: urlPath, method, headers: { 'Content-Type': 'application/json' } },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, json: data ? JSON.parse(data) : null });
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

test('qwen-omni-server stores history and returns stub without API key', async (t) => {
  const originalKey = process.env.QWEN_API_KEY;
  delete process.env.QWEN_API_KEY;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studiolab-qwen-'));
  const historyFile = path.join(tmpDir, 'history.json');

  const { startQwenServer } = require('../qwen-omni-server');
  const server = startQwenServer({ port: 0, historyFile });

  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;

  t.after(() => {
    server.close();
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    if (originalKey !== undefined) process.env.QWEN_API_KEY = originalKey;
    else delete process.env.QWEN_API_KEY;
  });

  const chatRes = await httpJson(port, 'POST', '/api/chat', {
    userId: 'u1',
    message: 'hola',
    modelId: 'qwen3-max',
    mode: 'agente',
    features: ['web'],
    thinking: true,
    attachments: [{ name: 'a.txt', type: 'texto' }]
  });

  assert.equal(chatRes.status, 200);
  assert.equal(chatRes.json.success, true);
  assert.equal(chatRes.json.provider, 'stub');
  assert.ok(String(chatRes.json.response).includes('QWEN no está disponible'));

  const histRes = await httpJson(port, 'GET', '/api/conversation-history/u1');
  assert.equal(histRes.status, 200);
  assert.equal(histRes.json.success, true);
  assert.equal(Array.isArray(histRes.json.history), true);
  assert.equal(histRes.json.history.length, 1);
  assert.equal(histRes.json.history[0].userId, 'u1');
  assert.equal(histRes.json.history[0].model, 'qwen3-max');
});
