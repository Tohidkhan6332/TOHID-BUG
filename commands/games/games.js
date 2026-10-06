'use strict';
const { listGames } = require('./index');
const { profile, levelForXp, xpForNextLevel } = require('../../utils/TohidGameStats');

module.exports = {
  name: 'games',
  aliases: ['game', 'games', 'gamemenu', 'gamecenter', 'arcade'],
  description: 'Open the TOHID Game Center',
  category: 'games',
  async execute({ sock, from, reply, pushName, msg }) {
    const p = profile(from, pushName || msg?.pushName || 'Player');
    const games = listGames();
    const utility = new Set(['games','gamedaily','gameleaderboard','gameprofile','gamescore']);
    const htmlGames = games.filter(g => !utility.has(g.name));
    const simple = games.filter(g => utility.has(g.name));
    const formatGames = items => items.map((g,i) => '┃ '+(i+1)+'. 🎮 .'+g.name+' — '+g.description).join('\n');
    const level = levelForXp(p.xp);
    const text =
      '╭━━〔 🎮 TOHID GAME CENTER 〕━━╮\n' +
      '┃ 👤 '+p.name+'\n' +
      '┃ ⚡ Level: '+level+' • XP: '+p.xp+'/'+xpForNextLevel(level)+'\n' +
      '┃ 💰 Coins: '+p.coins+'\n' +
      '┃ 🏆 Best Score: '+p.bestScore+'\n' +
      '┃ 🎮 Games: '+htmlGames.length+'\n' +
      '╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n' +
      '🔥 ALL GAMES — HTML / INTERACTIVE\n' +
      (formatGames(htmlGames)||'┃ No games loaded')+'\n\n' +
      '🛠 GAME TOOLS\n' +
      (formatGames(simple)||'┃ No tools loaded')+'\n\n' +
      '💡 Ab har actual game HTML card ke form me open hoga.\n' +
      '👥 Multiplayer: .challenge ttt @user';
    try {
      if (sock) {
        return await sock.sendMessage(from,{text,footer:'TOHID-AI GAME CENTER',buttons:[
          {buttonId:'.snake',buttonText:{displayText:'🎮 SNAKE'},type:1},
          {buttonId:'.2048',buttonText:{displayText:'🔢 2048'},type:1},
          {buttonId:'.ttt',buttonText:{displayText:'❌⭕ TTT'},type:1}
        ],headerType:1},{quoted:msg});
      }
    } catch(e){console.error('[GAME CENTER BUTTONS]',e.message)}
    return reply(text);
  }
};