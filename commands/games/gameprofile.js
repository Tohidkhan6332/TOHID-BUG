'use strict';
const { profile, levelForXp, xpForNextLevel } = require('../../utils/TohidGameStats');
module.exports = {
  name: 'gameprofile',
  aliases: ['gprofile', 'gamerprofile'],
  description: 'Show your TOHID Game profile',
  category: 'games',
  async execute({ from, reply, pushName, msg }) {
    const p = profile(from, pushName || msg?.pushName || 'Player');
    const level = levelForXp(p.xp);
    return reply(
      '╭━━〔 👤 TOHID GAMER PROFILE 〕━━╮\n' +
      '┃ 👤 ' + p.name + '\n┃ ⚡ Level: ' + level + '\n┃ 📈 XP: ' + p.xp + '/' + xpForNextLevel(level) +
      '\n┃ 💰 Coins: ' + p.coins + '\n┃ 🎮 Games: ' + p.gamesPlayed + '\n┃ 🏆 Best Score: ' + p.bestScore +
      '\n┃ ⭐ Records: ' + p.wins + '\n┃ 🔥 Daily Streak: ' + p.streak + '\n╰━━━━━━━━━━━━━━━━━━━━━━╯'
    );
  }
};
