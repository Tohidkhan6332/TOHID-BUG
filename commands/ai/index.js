'use strict';

const path = require('path');
const fs = require('fs');

const COMMAND_FILES = {
  githubai: 'githubai.js',
};

const ALIASES = {
  'github-ai': 'githubai',
};

const loaded = new Map();

function normalize(command) {
  return String(command || '').trim().toLowerCase();
}

function loadCommand(command) {
  const requested = normalize(command);
  const name = ALIASES[requested] || requested;
  const file = COMMAND_FILES[name];
  if (!file) return null;
  if (loaded.has(name)) return loaded.get(name);

  const fullPath = path.join(__dirname, file);
  if (!fs.existsSync(fullPath)) throw new Error(`Missing AI command module: ${file}`);
  const mod = require(fullPath);
  if (!mod || typeof mod.execute !== 'function') {
    throw new Error(`Invalid AI command module: ${file}`);
  }
  loaded.set(name, mod);
  return mod;
}

async function executeAi(command, context = {}) {
  const requested = normalize(command);
  const name = ALIASES[requested] || requested;
  if (!COMMAND_FILES[name]) return false;
  const mod = loadCommand(name);
  await mod.execute({ ...context, command: name });
  return true;
}

module.exports = { executeAi, loadCommand };
