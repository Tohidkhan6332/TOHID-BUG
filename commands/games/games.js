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
    const htmlGames = new Set([
      'snake', '2048', 'matrix', 'doom', 'vampire', 'cyber',
      'cursedash', 'dangerdash', 'cursearena', 'piano', 'scrabble',
      'sudoku', 'wordscramble'
    ]);
    const interactive = games.filter(g => htmlGames.has(g.name));
    const simple = games.filter(g => !htmlGames.has(g.name));
    const formatGames = (items, offset) => items.map((g, i) =>
      '┃ ' + (offset + i + 1) + '. 🎮 .' + g.name + ' — ' + g.description
    ).join('\n');
    const level = levelForXp(p.xp);
    const text =
      '╭━━〔 🎮 TOHID GAME CENTER 〕━━╮\n' +
      '┃ 👤 ' + p.name + '\n' +
      '┃ ⚡ Level: ' + level + ' • XP: ' + p.xp + '/' + xpForNextLevel(level) + '\n' +
      '┃ 💰 Coins: ' + p.coins + '\n' +
      '┃ 🏆 Best Score: ' + p.bestScore + '\n' +
      '┃ 🎮 Games: ' + games.length + '\n' +
      '╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n' +
      '🔥 POPULAR\n' +
      '┃ .snake • .2048 • .ttt\n' +
      '┃ .rps • .quiz • .mathrush\n' +
      '┃ .emojiguess • .truthordare\n' +
      '┃ .dicebattle • .numberguess\n\n' +
      '📚 ALL GAMES\n' +
      '✨ HTML / INTERACTIVE\n' +
      (formatGames(interactive, 0) || '┃ No HTML games loaded') + '\n\n' +
      '🎯 SIMPLE / TEXT\n' +
      (formatGames(simple, interactive.length) || '┃ No simple games loaded') + '\n\n' +
      '╭━━〔 QUICK ACTIONS 〕━━╮\n' +
      '┃ 🏆 .gameleaderboard\n' +
      '┃ 👤 .gameprofile\n' +
      '┃ 🎁 .gamedaily\n' +
      '┃ 💰 .gamescore <game> <score>\n' +
      '╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n' +
      '👥 MULTIPLAYER\n' +
      '┃ .challenge ttt @user\n' +
      '┃ .challenge rps @user\n' +
      '┃ .challenge dicebattle @user\n' +
      '┃ .challenge quiz @user\n\n' +
      '💡 Buttons se popular games direct open karo.';
    const preferred = ['snake', '2048', 'ttt']
      .map(name => games.find(g => g.name === name))
      .filter(Boolean);
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