const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('renderer/studiolab-final-v2.html contains required UI hooks', () => {
  const htmlPath = path.join(__dirname, '..', 'renderer', 'studiolab-final-v2.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Model selector + auto toggle
  assert.ok(html.includes('id="modelSelector"'));
  assert.ok(html.includes('id="modelAutoToggle"'));
  assert.ok(html.includes('id="modelListPrimary"'));
  assert.ok(html.includes('id="modelListMore"'));
  assert.ok(html.includes('overflow: visible'));

  // Canvas panel hooks
  assert.ok(html.includes('id="canvasPanel"'));
  assert.ok(html.includes('id="canvasCode"'));
  assert.ok(html.includes('id="canvasPreview"'));

  // Terminal hooks
  assert.ok(html.includes('id="terminalPanel"'));
  assert.ok(html.includes('id="terminalInput"'));
  assert.ok(html.includes('id="terminalRunBtn"'));

  // Templates
  assert.ok(html.includes('id="templateTray"'));

  // No QWEN portal (embedded)
  assert.ok(!html.includes('id="qwenWebview"'));
  assert.ok(!html.includes('id="qwenPortalToggle"'));
  assert.ok(!html.includes('chat.qwen.ai'));
  assert.ok(!html.includes('qwenlm.ai'));
});
