'use strict';

const path = require('path');
const fs = require('fs');

const GAME_DIR = __dirname;
const SKIP = new Set(['join.js']);

let registry = null;

function buildRegistry() {
  const map = new Map();
  for (const file of fs.readdirSync(GAME_DIR)) {
    if (!file.endsWith('.js') || SKIP.has(file)) continue;
    try {
      const mod = require(path.join(GAME_DIR, file));
      if (!mod?.name || typeof mod.execute !== 'function') continue;
      const names = [mod.name, ...(Array.isArray(mod.aliases) ? mod.aliases : [])]
        .map(v => String(v).trim().toLowerCase())
        .filter(Boolean);
      for (const name of names) map.set(name, mod);
    } catch (error) {
      console.error('[GAME LOADER] Failed to load ' + file + ':', error.message);
    }
  }
  return map;
}

function getRegistry() {
  if (!registry) registry = buildRegistry();
  return registry;
}

async function executeGame(command, context) {
  const mod = getRegistry().get(String(command || '').toLowerCase());
  if (!mod) return false;
  await mod.execute(context);
  return true;
}

function listGames() {
  const seen = new Set();
  return [...getRegistry().values()]
    .filter(mod => !seen.has(mod.name) && seen.add(mod.name))
    .map(mod => ({ name: mod.name, aliases: mod.aliases || [], description: mod.description || '' }));
}

module.exports = { executeGame, listGames };
