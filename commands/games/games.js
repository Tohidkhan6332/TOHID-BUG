'use strict';

const { listGames } = require('./index');
const { profile, levelForXp, xpForNextLevel } = require('../../utils/TohidGameStats');

const GAME_ROWS = [
  ['snake', '🎮 SNAKE', 'Classic HTML snake game'],
  ['sudoku', '🧩 SUDOKU', 'Interactive Sudoku game'],
  ['piano', '🎹 PIANO', 'Interactive piano game'],
  ['cursedash', '⚡ CURSEDASH', 'Interactive HTML dash game'],
  ['2048', '🔢 2048', 'Interactive number merge game'],
  ['dangerdash', '⚠️ DANGERDASH', 'Interactive HTML dash game'],
  ['cursearena', '⚔️ CURSEARENA', 'Interactive battle arena'],
  ['scrabble', '🔤 SCRABBLE', 'Interactive word game'],
  ['wordscramble', '🔀 WORDSCRAMBLE', 'Interactive word scramble'],
  ['ttt', '❌⭕ TTT', 'Tic Tac Toe'],
  ['matrix', '🟩 MATRIX', 'Matrix shooter'],
  ['doom', '☠️ DOOM', 'Doom arcade game'],
  ['vampire', '🧛 VAMPIRE', 'Vampire arcade game'],
  ['cyber', '🌐 CYBER', 'Cyber arcade runner'],
  ['rps', '✊ RPS', 'Rock Paper Scissors'],
  ['quiz', '🧠 QUIZ', 'Quiz game'],
  ['mathrush', '🧮 MATH RUSH', 'Fast math challenge'],
  ['emojiguess', '🎭 EMOJI GUESS', 'Guess the emoji'],
  ['truthordare', '🎲 TRUTH OR DARE', 'Truth or Dare'],
  ['dicebattle', '🎲 DICE BATTLE', 'Dice battle game'],
  ['numberguess', '🔢 NUMBER GUESS', 'Guess the number'],
  ['eye', '🎯 WOULD YOU RATHER', 'Would You Rather'],
  ['naijawhot', '🎴 NAIJA WHOT', 'Naija Whot card game'],
  ['challenge', '🎮 CHALLENGE', 'Challenge another player']
];

module.exports = {
  name: 'games',
  aliases: ['game', 'games', 'gamemenu', 'gamecenter', 'arcade'],
  description: 'Open the TOHID Game Center',
  category: 'games',

  async execute({ sock, from, reply, pushName, msg }) {
    const p = profile(from, pushName || msg?.pushName || 'Player');
    const games = listGames();
    const level = levelForXp(p.xp);
    const text =
      '╭━━〔 🎮 TOHID GAME CENTER 〕━━╮\n' +
      '┃ 👤 ' + p.name + '\n' +
      '┃ ⚡ Level: ' + level + ' • XP: ' + p.xp + '/' + xpForNextLevel(level) + '\n' +
      '┃ 💰 Coins: ' + p.coins + '\n' +
      '┃ 🏆 Best Score: ' + p.bestScore + '\n' +
      '┃ 🎮 Games: ' + games.filter(g => !['games','gamedaily','gameleaderboard','gameprofile','gamescore'].includes(g.name)).length + '\n' +
      '╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n' +
      '🔥 Tap OPEN GAMES and choose any game.\n' +
      '👥 Multiplayer: .challenge ttt @user\n\n' +
      '⚡ All game buttons are inside one native WhatsApp menu.';

    try {
      if (!sock?.relayMessage) return reply(text);

      const imageUrl = 'https://raw.githubusercontent.com/Tohidkhan6332/TOHID-BUG/main/media/Tohid.jpg';
      let media = {};
      try {
        const { prepareWAMessageMedia } = require('../../tohidstore/baileys-compat');
        media = await prepareWAMessageMedia(
          { image: { url: imageUrl } },
          { upload: sock.waUploadToServer }
        );
      } catch (mediaError) {
        console.log('[GAME CENTER] Image preparation failed:', mediaError.message);
      }

      const rows = GAME_ROWS.map(([id, title, description]) => ({
        title, description, id: '.' + id
      }));

      await sock.relayMessage(from, {
        interactiveMessage: {
          header: {
            title: '🎮 TOHID-AI',
            subtitle: 'TOHID GAME CENTER',
            hasMediaAttachment: Boolean(media?.imageMessage),
            ...media
          },
          body: { text },
          nativeFlowMessage: {
            buttons: [
              {
                name: 'single_select',
                buttonParamsJson: JSON.stringify({
                  title: '🎮 OPEN GAMES',
                  sections: [{
                    title: '✨ TOHID-AI ALL GAMES',
                    highlight_label: 'TOHID-AI',
                    rows
                  }]
                })
              },
              {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                  display_text: '📢 CHANNEL',
                  url: 'https://whatsapp.com/channel/0029VaGyP933bbVC7G0x0i2T',
                  merchant_url: 'https://whatsapp.com/channel/0029VaGyP933bbVC7G0x0i2T'
                })
              },
              {
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                  display_text: '👥 GROUP',
                  url: 'https://chat.whatsapp.com/ITblBs2YNMqBYh9klfDLud',
                  merchant_url: 'https://chat.whatsapp.com/ITblBs2YNMqBYh9klfDLud'
                })
              }
            ]
          },
          contextInfo: {
            mentionedJid: msg?.key?.participant ? [msg.key.participant] : [],
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363207624903731@newsletter',
              newsletterName: 'ＴＯＨＩＤ ＴＥＣＨ',
              serverMessageId: -1
            },
            externalAdReply: {
              showAdAttribution: true,
              title: '© 𝐓𝐎𝐇𝐈𝐃-𝐀𝐈',
              body: 'Tap OPEN GAMES to play',
              thumbnailUrl: imageUrl,
              mediaUrl: imageUrl,
              sourceUrl: 'https://whatsapp.com/channel/0029VaGyP933bbVC7G0x0i2T',
              mediaType: 1,
              renderLargerThumbnail: true
            }
          }
        }
      }, {});
      return;
    } catch (error) {
      console.error('[GAME CENTER NATIVE FLOW]', error.stack || error.message);
      return reply(text + '\n\n⚠️ Interactive menu failed, but the game commands remain available.');
    }
  }
};