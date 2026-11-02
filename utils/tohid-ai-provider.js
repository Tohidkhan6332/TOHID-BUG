'use strict';

/**
 * TOHID-AI multi-provider text AI.
 * Credentials are read only from environment variables.
 * Provider failures are isolated so the next configured provider can run.
 */

const axios = require('axios');

// Optional local testing file. It is ignored by Git and must never be committed.
try {
  const localSecrets = require('./.local-ai-secrets');
  for (const name of [
    'AGNES_API_KEY', 'GROQ_API_KEY', 'GEMINI_API_KEY', 'OPENAI_API_KEY',
    'OPENROUTER_API_KEY', 'AI_GATEWAY_API_KEY', 'VERCEL_AI_GATEWAY_KEY',
    'OPENROUTER_NEURO_API_KEY', 'POLLINATIONS_API_KEY',
  ]) {
    if (!process.env[name] && localSecrets?.[name]) process.env[name] = String(localSecrets[name]);
  }
} catch (_) {
  // Local secrets file is optional; production uses hosting environment secrets.
}

const DEFAULT_TIMEOUT_MS = 20000;
const TIMEOUT_MS = clampNumber(process.env.TOHID_AI_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, 5000, 120000);

// Provider endpoints intentionally live in this file. Credentials remain env/secret-managed.
const PROVIDER_URLS = Object.freeze({
  agnes: 'https://apihub.agnes-ai.com/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  openai: 'https://api.openai.com/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  vercelGateway: 'https://ai-gateway.vercel.sh/v1/chat/completions',
  prexzy: 'https://prexzyapis.com/ai/ch',
  pollinations: 'https://text.pollinations.ai/openai',
  openrouterSite: 'https://github.com/Tohidkhan6332/TOHID-BUG',
});

function clampNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function env(name, fallback = '') {
  const value = process.env[name];
  return value == null ? fallback : String(value).trim();
}

function providerError(status, data) {
  const message = data?.error?.message || data?.message || data?.error;
  return new Error(message ? `${status}: ${String(message).slice(0, 240)}` : `HTTP ${status}`);
}

function extractAnswer(data) {
  if (typeof data === 'string') return data.trim() || null;
  const candidates = [
    data?.choices?.[0]?.message?.content,
    data?.choices?.[0]?.text,
    data?.candidates?.[0]?.content?.parts?.[0]?.text,
    data?.response,
    data?.answer,
    data?.message,
    data?.result,
    data?.text,
    data?.content,
    data?.output,
    data?.data?.response,
    data?.data?.answer,
    data?.data?.result,
    data?.data?.text,
    data?.data?.content,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function openAICompatible({ name, url, key, models, extraHeaders = {} }) {
  return {
    name,
    models: models.filter(Boolean),
    async call(model, messages) {
      const response = await axios.post(url, {
        model,
        messages,
        temperature: 0.8,
        max_tokens: 1200,
      }, {
        timeout: TIMEOUT_MS,
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'TOHID-AI',
          'X-Title': 'TOHID-AI',
          ...extraHeaders,
        },
        validateStatus: () => true,
      });

      if (response.status < 200 || response.status >= 300) {
        throw providerError(response.status, response.data);
      }

      const answer = extractAnswer(response.data);
      if (!answer) throw new Error('Provider returned no usable answer');
      return answer;
    },
  };
}

function geminiProvider(key) {
  return {
    name: 'gemini',
    models: [env('GEMINI_MODEL', 'gemini-2.5-flash'), 'gemini-2.0-flash'],
    async call(model, messages) {
      const system = messages
        .filter(message => message.role === 'system')
        .map(message => String(message.content || ''))
        .join('\n');

      const contents = messages
        .filter(message => message.role !== 'system')
        .map(message => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(message.content || '') }],
        }));

      const body = { contents };
      if (system) body.systemInstruction = { parts: [{ text: system }] };

      const baseUrl = PROVIDER_URLS.gemini;
      const response = await axios.post(
        `${baseUrl.replace(/\/$/, '')}/models/${encodeURIComponent(model)}:generateContent`,
        body,
        {
          timeout: TIMEOUT_MS,
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': key,
          },
          validateStatus: () => true,
        }
      );

      if (response.status < 200 || response.status >= 300) {
        throw providerError(response.status, response.data);
      }

      const answer = extractAnswer(response.data);
      if (!answer) throw new Error('Gemini returned no usable answer');
      return answer;
    },
  };
}

function buildProviders() {
  const providers = [];

  if (env('AGNES_API_KEY')) {
    providers.push(openAICompatible({
      name: 'agnes',
      url: PROVIDER_URLS.agnes,
      key: env('AGNES_API_KEY'),
      models: [env('AGNES_MODEL', 'agnes-2.5-flash')],
    }));
  }

  if (env('GROQ_API_KEY')) {
    providers.push(openAICompatible({
      name: 'groq',
      url: PROVIDER_URLS.groq,
      key: env('GROQ_API_KEY'),
      models: [env('GROQ_MODEL', 'llama-3.1-8b-instant'), 'llama-3.3-70b-versatile'],
    }));
  }

  if (env('GEMINI_API_KEY')) providers.push(geminiProvider(env('GEMINI_API_KEY')));

  if (env('OPENAI_API_KEY')) {
    providers.push(openAICompatible({
      name: 'openai',
      url: PROVIDER_URLS.openai,
      key: env('OPENAI_API_KEY'),
      models: [env('OPENAI_MODEL', 'gpt-4o-mini')],
    }));
  }

  if (env('OPENROUTER_API_KEY')) {
    providers.push(openAICompatible({
      name: 'openrouter',
      url: PROVIDER_URLS.openrouter,
      key: env('OPENROUTER_API_KEY'),
      models: [env('OPENROUTER_MODEL', 'openrouter/auto')],
      extraHeaders: {
        'HTTP-Referer': PROVIDER_URLS.openrouterSite,
        'X-Title': 'TOHID-AI',
      },
    }));
  }

  const gatewayKey = env('AI_GATEWAY_API_KEY') || env('VERCEL_AI_GATEWAY_KEY');
  if (gatewayKey) {
    providers.push(openAICompatible({
      name: 'vercel-ai-gateway',
      url: PROVIDER_URLS.vercelGateway,
      key: gatewayKey,
      models: [env('AI_GATEWAY_MODEL', env('VERCEL_AI_GATEWAY_MODEL', 'openai/gpt-4o-mini'))],
    }));
  }

  if (env('OPENROUTER_NEURO_API_KEY')) {
    providers.push(openAICompatible({
      name: 'openrouter-neuro',
      url: PROVIDER_URLS.openrouter,
      key: env('OPENROUTER_NEURO_API_KEY'),
      models: [env('OPENROUTER_NEURO_MODEL', 'openrouter/auto')],
      extraHeaders: {
        'HTTP-Referer': PROVIDER_URLS.openrouterSite,
        'X-Title': 'TOHID-AI Neuro',
      },
    }));
  }

  return providers;
}

async function keylessFallback(prompt, system) {
  const providers = [
    {
      name: 'prexzy-ch',
      run: async () => {
      const response = await axios.get(PROVIDER_URLS.prexzy, {
          params: { text: prompt, prompt, system: system || undefined },
          timeout: TIMEOUT_MS,
          validateStatus: () => true,
        });
        if (response.status < 200 || response.status >= 300) throw providerError(response.status, response.data);
        return response.data;
      },
    },
    {
      name: 'pollinations',
      run: async () => {
        const messages = [];
        if (system) messages.push({ role: 'system', content: system });
        messages.push({ role: 'user', content: prompt });
        const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
        if (env('POLLINATIONS_API_KEY')) headers.Authorization = `Bearer ${env('POLLINATIONS_API_KEY')}`;
        const response = await axios.post(PROVIDER_URLS.pollinations, {
          model: env('POLLINATIONS_MODEL', 'openai'),
          messages,
        }, { timeout: TIMEOUT_MS, headers, validateStatus: () => true });
        if (response.status < 200 || response.status >= 300) throw providerError(response.status, response.data);
        return response.data;
      },
    },
  ];

  let lastError = null;
  for (const provider of providers) {
    try {
      const answer = extractAnswer(await provider.run());
      if (answer) {
        console.log('[TOHID-AI] Fallback provider:', provider.name);
        return answer;
      }
      lastError = new Error(`${provider.name} returned empty response`);
    } catch (error) {
      lastError = error;
      console.error('[TOHID-AI] Fallback failed:', provider.name, 'request unsuccessful');
    }
  }

  throw lastError || new Error('All AI providers failed');
}

async function tohidAI(prompt, system = '') {
  const text = String(prompt || '').trim();
  if (!text) throw new Error('Empty AI prompt');

  const messages = [];
  if (system) messages.push({ role: 'system', content: String(system) });
  messages.push({ role: 'user', content: text });

  for (const provider of buildProviders()) {
    for (const model of provider.models || ['default']) {
      try {
        const answer = await provider.call(model, messages);
        if (answer) {
          console.log('[TOHID-AI] Provider succeeded:', provider.name);
          return answer;
        }
      } catch (error) {
        console.error('[TOHID-AI] Provider failed:', provider.name, 'model:', model);
      }
    }
  }

  return keylessFallback(text, String(system || ''));
}

function configuredProviders() {
  return [
    ['AGNES_API_KEY', env('AGNES_API_KEY')],
    ['GROQ_API_KEY', env('GROQ_API_KEY')],
    ['GEMINI_API_KEY', env('GEMINI_API_KEY')],
    ['OPENAI_API_KEY', env('OPENAI_API_KEY')],
    ['OPENROUTER_API_KEY', env('OPENROUTER_API_KEY')],
    ['AI_GATEWAY_API_KEY', env('AI_GATEWAY_API_KEY') || env('VERCEL_AI_GATEWAY_KEY')],
    ['OPENROUTER_NEURO_API_KEY', env('OPENROUTER_NEURO_API_KEY')],
  ].filter(([, value]) => Boolean(value)).map(([name]) => name);
}

module.exports = { tohidAI, configuredProviders };
