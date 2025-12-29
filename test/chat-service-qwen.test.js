const test = require('node:test');
const assert = require('node:assert/strict');

test('chat-service callQWEN supports model + messages options', async () => {
  const { callQWEN } = require('../chat-service');

  const originalFetch = global.fetch;
  let captured = null;

  global.fetch = async (url, opts) => {
    captured = { url, opts };
    return {
      ok: true,
      async json() {
        return { output: { text: 'ok' }, usage: { input_tokens: 3, output_tokens: 7 } };
      }
    };
  };

  try {
    const res = await callQWEN(
      'hello',
      'omni',
      'fake-key',
      {
        model: 'qwen-test',
        messages: [{ role: 'system', content: 'S' }, { role: 'user', content: 'U' }],
        max_tokens: 5,
        temperature: 0.1
      }
    );

    assert.equal(res.success, true);
    assert.equal(res.provider, 'qwen');
    assert.equal(res.response, 'ok');

    assert.ok(captured);
    assert.equal(captured.url, 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation');
    assert.equal(captured.opts.method, 'POST');

    const body = JSON.parse(captured.opts.body);
    assert.equal(body.model, 'qwen-test');
    assert.deepEqual(body.input.messages, [{ role: 'system', content: 'S' }, { role: 'user', content: 'U' }]);
    assert.equal(body.parameters.max_tokens, 5);
    assert.equal(body.parameters.temperature, 0.1);
  } finally {
    global.fetch = originalFetch;
  }
});

