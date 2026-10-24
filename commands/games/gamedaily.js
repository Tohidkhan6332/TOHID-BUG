'use strict';
const { claimDaily } = require('../../utils/TohidGameStats');
function challengeForToday() {
  const games = ['matrix', 'doom', 'vampire', 'cyber'];
  const day = Math.floor(Date.now() / 86400000);
  return { game: games[day % games.length], target: 500 + (day % 5) * 250, coins: 100 + (day % 3) * 50, xp: 50 + (day % 4) * 25 };
}
module.exports = {
  name: 'gamedaily',
  aliases: ['dailygame', 'dailychallenge', 'gchallenge'],
  description: 'Claim the TOHID daily game challenge reward',
  category: 'games',
  async execute({ from, reply, pushName, msg }) {
    const c = challengeForToday();
    const result = claimDaily(from, pushName || msg?.pushName || 'Player', c);
    if (!result.claimed) return reply('🎁 DAILY CHALLENGE\n\nAlready claimed today.\n\n🎮 .' + c.game + '\n🎯 Target: ' + c.target + '+');
    return reply(
      '╭━━〔 🎁 TOHID DAILY CHALLENGE 〕━━╮\n┃ 🎮 Game: ' + c.game.toUpperCase() +
      '\n┃ 🎯 Target: ' + c.target + '+\n┃ 💰 Reward: +' + c.coins + ' coins\n┃ ⚡ Reward: +' + c.xp +
      ' XP\n╰━━━━━━━━━━━━━━━━━━━━━━╯\n\nChallenge active: .' + c.game + '\nScore submit: .gamescore ' + c.game + ' <score>'
    );
  }
};
