'use strict';

/**
 * TOHID-AI multi-provider text AI.
 * Secrets are read only from environment variables.
 *
 * Priority:
 * 1. AGNES_API_KEY
 * 2. GROQ_API_KEY
 * 3. GEMINI_API_KEY
 * 4. OPENAI_API_KEY
 * 5. OPENROUTER_API_KEY
 * 6. Prexzy keyless fallback
 * 7. Pollinations keyless fallback
 */

const axios = require('axios');

const TIMEOUT_MS = Number(process.env.TOHID_AI_TIMEOUT_MS || 20000);

function openAICompatible({ name, url, key, models }) {
  return {
    name,
    async call(model, messages) {
      const response = await axios.post(url, {
        model,
        messages,
        temperature: 0.8,
        max_tokens: 1200,
      }, {
        timeout: TIMEOUT_MS,
        headers: {
          Authorization: 'Bearer ' + key,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'TOHID-AI',
          'X-Title': 'TOHID-AI',
        },
        validateStatus: () => true,
      });

      if (response.status < 200 || response.status >= 300) {
        throw new Error(response.data?.error?.message || 'HTTP ' + response.status);
      }

      const answer =
        response.data?.choices?.[0]?.message?.content ??
        response.data?.choices?.[0]?.text ??
        response.data?.response ??
        response.data?.result;

      if (!answer) throw new Error('Provider returned no usable answer');
      return typeof answer === 'string' ? answer.trim() : JSON.stringify(answer);
    },
    models,
  };
}

function geminiProvider(key) {
  return {
    name: 'gemini',
    models: ['gemini-2.5-flash', 'gemini-2.0-flash'],
    async call(model, messages) {
      const system = messages
        .filter(m => m.role === 'system')
        .map(m => m.content)
        .join('\n');

      const contents = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(m.content || '') }],
        }));

      const body = { contents };
      if (system) body.systemInstruction = { parts: [{ text: system }] };

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
        body,
        {
          timeout: TIMEOUT_MS,
          headers: { 'Content-Type': 'application/json' },
          validateStatus: () => true,
        }
      );

      if (response.status < 200 || response.status >= 300) {
        throw new Error(response.data?.error?.message || 'HTTP ' + response.status);
      }

      const answer = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!answer) throw new Error('Gemini returned no usable answer');
      return String(answer).trim();
    },
  };
}

function buildProviders() {
  const providers = [];

  if (process.env.AGNES_API_KEY) {
    providers.push(openAICompatible({
      name: 'agnes',
      url: 'https://apihub.agnes-ai.com/v1/chat/completions',
      key: process.env.AGNES_API_KEY,
      models: [process.env.AGNES_MODEL || 'agnes-2.5-flash'],
    }));
  }

  if (process.env.GROQ_API_KEY) {
    providers.push(openAICompatible({
      name: 'groq',
      url: 'https://api.groq.com/openai/v1/chat/completions',
      key: process.env.GROQ_API_KEY,
      models: [process.env.GROQ_MODEL || 'llama-3.1-8b-instant', 'llama-3.3-70b-versatile'],
    }));
  }

  if (process.env.GEMINI_API_KEY) {
    providers.push(geminiProvider(process.env.GEMINI_API_KEY));
  }

  if (process.env.OPENAI_API_KEY) {
    providers.push(openAICompatible({
      name: 'openai',
      url: 'https://api.openai.com/v1/chat/completions',
      key: process.env.OPENAI_API_KEY,
      models: [process.env.OPENAI_MODEL || 'gpt-4o-mini'],
    }));
  }

  if (process.env.OPENROUTER_API_KEY) {
    providers.push(openAICompatible({
      name: 'openrouter',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      key: process.env.OPENROUTER_API_KEY,
      models: [process.env.OPENROUTER_MODEL || 'openrouter/auto'],
    }));
  }

  return providers;
}

async function keylessFallback(prompt, system) {
  try {
    const response = await axios.get('https://apis.prexzyvilla.site/ai/gpt4', {
      params: { text: prompt },
      timeout: TIMEOUT_MS,
    });
    const answer =
      response.data?.data ??
      response.data?.result ??
      response.data?.response ??
      response.data?.answer ??
      response.data?.message ??
      (typeof response.data === 'string' ? response.data : null);

    if (answer) return typeof answer === 'string' ? answer.trim() : JSON.stringify(answer);
  } catch {}

  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });

  const response = await axios.post('https://text.pollinations.ai/openai', {
    model: 'openai',
    messages,
  }, {
    timeout: TIMEOUT_MS,
    headers: { 'Content-Type': 'application/json' },
    validateStatus: () => true,
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error('All keyless AI providers failed');
  }

  const answer = typeof response.data === 'string'
    ? response.data
    : response.data?.choices?.[0]?.message?.content;

  if (!answer) throw new Error('All AI providers returned empty responses');
  return String(answer).trim();
}

async function tohidAI(prompt, system = '') {
  const text = String(prompt || '').trim();
  if (!text) throw new Error('Empty AI prompt');

  const messages = [];
  if (system) messages.push({ role: 'system', content: String(system) });
  messages.push({ role: 'user', content: text });

  const providers = buildProviders();

  for (const provider of providers) {
    for (const model of provider.models || ['default']) {
      try {
        const answer = await provider.call(model, messages);
        if (answer) {
          console.log('[TOHID-AI] Provider:', provider.name, 'Model:', model);
          return answer;
        }
      } catch (error) {
        console.error('[TOHID-AI] Provider failed:', provider.name, error?.message || error);
      }
    }
  }

  return keylessFallback(text, system);
}

function configuredProviders() {
  return [
    ['AGNES_API_KEY', Boolean(process.env.AGNES_API_KEY)],
    ['GROQ_API_KEY', Boolean(process.env.GROQ_API_KEY)],
    ['GEMINI_API_KEY', Boolean(process.env.GEMINI_API_KEY)],
    ['OPENAI_API_KEY', Boolean(process.env.OPENAI_API_KEY)],
    ['OPENROUTER_API_KEY', Boolean(process.env.OPENROUTER_API_KEY)],
  ].filter(([, configured]) => configured).map(([name]) => name);
}

module.exports = { tohidAI, configuredProviders };
