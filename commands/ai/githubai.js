'use strict';

const { execute: executeGitHubAgent } = require('../../utils/github-agent');

const name = 'githubai';
const aliases = ['github-ai'];
const description = 'Owner-only GitHub repository read, inspect, code-search and direct-push agent';

async function execute(context = {}) {
  const { sock, msg, from, reply, text, args, isOwner } = context;
  if (!isOwner) {
    if (typeof reply === 'function') await reply('🔒 *Owner only*');
    return true;
  }

  try {
    const input = String(text || (Array.isArray(args) ? args.join(' ') : '') || 'help').trim();
    const result = await executeGitHubAgent(input || 'help');
    const output = String(result || '').slice(0, 12000);
    const payload = { text: `🤖 *GitHub AI Agent — SAFE MODE*\n\n${output}` };
    if (typeof sock?.sendMessage === 'function' && from) {
      await sock.sendMessage(from, payload, { quoted: msg });
    } else if (typeof reply === 'function') {
      await reply(payload.text);
    }
  } catch (error) {
    const message = `❌ *GitHub AI failed*\n\n${String(error?.message || error).slice(0, 2500)}`;
    if (typeof sock?.sendMessage === 'function' && from) {
      await sock.sendMessage(from, { text: message }, { quoted: msg });
    } else if (typeof reply === 'function') {
      await reply(message);
    }
  }

  return true;
}

module.exports = { name, aliases, description, execute };
