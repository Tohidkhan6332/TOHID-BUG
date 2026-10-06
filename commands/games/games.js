'use strict';
const { listGames } = require('./index');
const { profile, levelForXp, xpForNextLevel } = require('../../utils/TohidGameStats');

module.exports = {
  name: 'games',
  aliases: ['game', 'gamecenter', 'arcade'],
  description: 'Open the TOHID Game Center',
  category: 'games',
  async execute({ from, reply, pushName, msg }) {
    const p = profile(from, pushName || msg?.pushName || 'Player');
    const games = listGames();
    const lines = games.map((g, i) => '┃ ' + (i + 1) + '. 🎮 .' + g.name + ' — ' + g.description).join('\n');
    const level = levelForXp(p.xp);
    return reply(
      '╭━━〔 🎮 TOHID GAME CENTER 〕━━╮\n' +
      '┃ 👤 ' + p.name + '\n' +
      '┃ ⚡ Level: ' + level + ' • XP: ' + p.xp + '/' + xpForNextLevel(level) + '\n' +
      '┃ 💰 Coins: ' + p.coins + '\n' +
      '┃ 🏆 Best Score: ' + p.bestScore + '\n' +
      '╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n' +
      lines + '\n\n' +
      '╭━━〔 QUICK ACTIONS 〕━━╮\n' +
      '┃ 🏆 .gameleaderboard\n' +
      '┃ 👤 .gameprofile\n' +
      '┃ 🎁 .gamedaily\n' +
      '┃ 💰 .gamescore <game> <score>\n' +
      '╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n' +
      '💡 Games ke andar touch/keyboard buttons available hain.'
    );
  }
};
