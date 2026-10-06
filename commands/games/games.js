'use strict';
const { listGames } = require('./index');
const { profile, levelForXp, xpForNextLevel } = require('../../utils/TohidGameStats');

module.exports = {
  name: 'games',
  aliases: ['game', 'gamecenter', 'arcade'],
  description: 'Open the TOHID Game Center',
  category: 'games',
  async execute({ sock, from, reply, pushName, msg }) {
    const p = profile(from, pushName || msg?.pushName || 'Player');
    const games = listGames();
    const lines = games.map((g, i) => '┃ ' + (i + 1) + '. 🎮 .' + g.name + ' — ' + g.description).join('\n');
    const level = levelForXp(p.xp);
    const text =
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
      '💡 Neeche buttons se game directly open karo.';
    const preferred = games.filter(g => ['matrix', 'doom', 'vampire', 'cyber'].includes(g.name)).slice(0, 4);
    const buttons = preferred.map(g => ({
      buttonId: '.' + g.name,
      buttonText: { displayText: '🎮 ' + g.name.toUpperCase() },
      type: 1
    }));
    try {
      if (sock && buttons.length) {
        return await sock.sendMessage(from, {
          text,
          footer: 'TOHID-AI GAME CENTER',
          buttons,
          headerType: 1
        }, { quoted: msg });
      }
    } catch (error) {
      console.error('[GAME CENTER BUTTONS]', error.message);
    }
    return reply(text);
  }
};
