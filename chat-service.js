// ============================================================================
// CHAT SERVICE - Integración directa de APIs (Groq, OpenAI, Anthropic, QWEN)
// ============================================================================

const Anthropic = require('@anthropic-ai/sdk');
// OpenAI removido - usar QWEN3 embebido en su lugar

// Groq
async function callGroq(message, role, apiKey, options = {}) {
  const model = options.model || 'llama-3.3-70b-versatile'; // Modelo por defecto de Groq
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'user', content: `[${role}] ${message}` }
        ],
        max_tokens: options.max_tokens || 1024,
        temperature: options.temperature || 0.7
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        provider: 'groq',
        error: data.error?.message || `HTTP ${response.status}`
      };
    }

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return {
        success: false,
        provider: 'groq',
        error: `Invalid response structure: ${JSON.stringify(data)}`
      };
    }

    return {
      success: true,
      provider: 'groq',
      response: data.choices[0].message.content,
      usage: data.usage
    };
  } catch (error) {
    return {
      success: false,
      provider: 'groq',
      error: error.message
    };
  }
}

// Anthropic (Claude)
async function callAnthropic(message, role, apiKey) {
  try {
    const client = new Anthropic({
      apiKey: apiKey
    });

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `[${role}] ${message}`
        }
      ]
    });

    return {
      success: true,
      provider: 'anthropic',
      response: response.content[0].type === 'text' ? response.content[0].text : '',
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens
      }
    };
  } catch (error) {
    return {
      success: false,
      provider: 'anthropic',
      error: error.message
    };
  }
}

// OpenAI (ChatGPT)
async function callOpenAI(message, role, apiKey, options = {}) {
  try {
    const model = options.model || 'gpt-4o'; // Modelo por defecto
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'user', content: `[${role}] ${message}` }
        ],
        max_tokens: options.max_tokens || 1024,
        temperature: options.temperature || 0.7
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        provider: 'openai',
        error: data.error?.message || `HTTP ${response.status}`
      };
    }

    return {
      success: true,
      provider: 'openai',
      response: data.choices[0].message.content,
      usage: data.usage
    };
  } catch (error) {
    return {
      success: false,
      provider: 'openai',
      error: error.message
    };
  }
}

// QWEN (Alibaba - usando API HTTP)
async function callQWEN(message, role, apiKey, options = {}) {
  try {
    const model = options.model || 'qwen-plus';
    const messages = Array.isArray(options.messages) && options.messages.length
      ? options.messages
      : [
        {
          role: 'user',
          content: `[${role}] ${message}`
        }
      ];

    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        input: {
          messages
        },
        parameters: {
          max_tokens: options.max_tokens ?? 1024,
          temperature: options.temperature ?? 0.7
        }
      })
    });

    const data = await response.json();

    if (data.output && data.output.text) {
      return {
        success: true,
        provider: 'qwen',
        response: data.output.text,
        usage: {
          input_tokens: data.usage?.input_tokens || 0,
          output_tokens: data.usage?.output_tokens || 0
        }
      };
    } else {
      return {
        success: false,
        provider: 'qwen',
        error: data.message || 'Unknown error'
      };
    }
  } catch (error) {
    return {
      success: false,
      provider: 'qwen',
      error: error.message
    };
  }
}

// Router principal
async function sendMessage(provider, message, role, apiKeys, options = {}) {
  console.log(`[Chat Service] Enviando a ${provider}: "${message.substring(0, 50)}..."`);

  switch (provider) {
    case 'groq':
      return await callGroq(message, role, apiKeys.groq, options);
    case 'anthropic':
      return await callAnthropic(message, role, apiKeys.anthropic, options);
    case 'openai':
      return await callOpenAI(message, role, apiKeys.openai, options);
    case 'qwen':
      // QWEN solo en modo local (Ollama), no usar API
      return { success: false, error: 'QWEN funciona solo en modo local (Ollama). Usa el panel embebido.' };
    default:
      return {
        success: false,
        error: `Provider no soportado: ${provider}`
      };
  }
}

module.exports = {
  sendMessage,
  callGroq,
  callAnthropic,
  callOpenAI,
  callQWEN
};
