const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('mcp-server tools: memory + fs + execute_code', async (t) => {
  const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'studiolab-mcp-'));
  const originalUserProfile = process.env.USERPROFILE;
  process.env.USERPROFILE = tmpHome;

  const mcp = require('../mcp-server');

  t.after(() => {
    if (originalUserProfile !== undefined) process.env.USERPROFILE = originalUserProfile;
    else delete process.env.USERPROFILE;
    try { fs.rmSync(tmpHome, { recursive: true, force: true }); } catch {}
  });

  // Memory
  const storeRes = await mcp.tools.memory_store({ key: 'k', value: { v: 1 }, tags: ['test'] });
  assert.equal(storeRes.success, true);

  const getRes = await mcp.tools.memory_get({ key: 'k' });
  assert.equal(getRes.success, true);
  assert.deepEqual(getRes.entry.value, { v: 1 });

  // FS
  const filePath = path.join(tmpHome, 'hello.txt');
  const writeRes = await mcp.tools.write_file({ filePath, content: 'hello' });
  assert.equal(writeRes.success, true);

  const readRes = await mcp.tools.read_file({ filePath });
  assert.equal(readRes.success, true);
  assert.equal(readRes.content, 'hello');

  // Code execution (JS)
  const codeRes = await mcp.tools.execute_code({ language: 'javascript', code: "console.log('ok')" });
  assert.equal(codeRes.success, true);
  assert.equal(codeRes.output, 'ok');
});
