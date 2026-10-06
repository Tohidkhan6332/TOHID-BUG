'use strict';
const { recordScore } = require('../../utils/TohidGameStats');
const ALLOWED = new Set(['matrix','doom','vampire','cyber','cursedash','dangerdash','cursearena','eye','piano','scrabble','snake','sudoku','wordscramble','naijawhot']);
module.exports = {
  name: 'gamescore',
  aliases: ['scoregame', 'submitscore'],
  description: 'Submit a game score to your TOHID profile',
  category: 'games',
  async execute({ from, reply, pushName, msg, args = [] }) {
    const game = String(args[0] || '').toLowerCase().replace(/^\./, '');
    const value = Number(args[1]);
    if (!ALLOWED.has(game) || !Number.isFinite(value) || value < 0) return reply('❌ Usage: .gamescore <game> <score>\nExample: .gamescore matrix 1250');
    const result = recordScore(from, pushName || msg?.pushName || 'Player', game, value);
    const xp = Math.min(250, Math.max(5, Math.floor(result.score / 10)));
    const coins = Math.min(500, Math.max(5, Math.floor(result.score / 20)));
    return reply('🎮 ' + game.toUpperCase() + ' SCORE SAVED\n\n🏆 Score: ' + result.score + '\n' +
      (result.improved ? '🔥 New personal record!' : '📊 Personal record unchanged.') +
      '\n⚡ XP +' + xp + '\n💰 Coins +' + coins);
  }
};
