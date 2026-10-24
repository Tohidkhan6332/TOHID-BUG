'use strict';
const { leaderboard, levelForXp } = require('../../utils/TohidGameStats');
module.exports = {
  name: 'gameleaderboard',
  aliases: ['gleaderboard', 'gamelb', 'topgames'],
  description: 'Show the TOHID Game leaderboard',
  category: 'games',
  async execute({ reply }) {
    const rows = leaderboard(10);
    if (!rows.length) return reply('🏆 TOHID GAME LEADERBOARD\n\nAbhi koi score record nahi hua.');
    const lines = rows.map((p, i) => {
      const medal = ['🥇', '🥈', '🥉'][i] || ('#' + (i + 1));
      return medal + ' ' + p.name + ' — ' + p.bestScore + ' pts · Lv ' + levelForXp(p.xp);
    });
    return reply('╭━━〔 🏆 TOHID GAME LEADERBOARD 〕━━╮\n┃ Best Score Rankings\n╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n' + lines.join('\n'));
  }
};
