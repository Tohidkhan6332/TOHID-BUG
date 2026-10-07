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

    const formatGames = items =>
      items.map((g,i) => '┃ '+(i+1)+'. 🎮 .'+g.name+' — '+g.description).join('\n');

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

    // WhatsApp legacy button messages support a maximum of 3 buttons.
    // Keep the existing button style and send the complete game launcher
    // as consecutive 3-button groups so every game remains directly tappable.
    const buttonOrder = [
      ['snake','🎮 SNAKE'], ['sudoku','🧩 SUDOKU'], ['piano','🎹 PIANO'],
      ['cursedash','⚡ CURSEDASH'], ['2048','🔢 2048'], ['dangerdash','⚠️ DANGERDASH'],
      ['cursearena','⚔️ CURSEARENA'], ['scrabble','🔤 SCRABBLE'], ['wordscramble','🔀 WORDSCRAMBLE'],
      ['ttt','❌⭕ TTT'], ['matrix','🟩 MATRIX'], ['doom','☠️ DOOM'],
      ['vampire','🧛 VAMPIRE'], ['cyber','🌐 CYBER'], ['rps','✊ RPS'],
      ['quiz','🧠 QUIZ'], ['mathrush','🧮 MATH RUSH'], ['emojiguess','🎭 EMOJI GUESS'],
      ['truthordare','🎲 TRUTH OR DARE'], ['dicebattle','🎲 DICE BATTLE'], ['numberguess','🔢 NUMBER GUESS'],
      ['eye','🎯 WOULD YOU RATHER'], ['naijawhot','🎴 NAIJA WHOT'], ['challenge','🎮 CHALLENGE']
    ];

    const buttonGroups = [];
    for (let i = 0; i < buttonOrder.length; i += 3) {
      buttonGroups.push(buttonOrder.slice(i, i + 3));
    }

    try {
      if (sock) {
        for (let i = 0; i < buttonGroups.length; i++) {
          const buttons = buttonGroups[i].map(([id, label]) => ({
            buttonId: '.' + id,
            buttonText: { displayText: label },
            type: 1
          }));

          await sock.sendMessage(
            from,
            {
              text: i === 0 ? text : '🎮 *TOHID GAME CENTER*\n\nChoose a game:',
              footer: i === 0 ? 'TOHID-AI GAME CENTER' : 'TOHID-AI GAMES',
              buttons,
              headerType: 1
            },
            { quoted: i === 0 ? msg : undefined }
          );
        }
        return;
      }
    } catch (e) {
      console.error('[GAME CENTER BUTTONS]', e);
    }

    return reply(text);
  }
};