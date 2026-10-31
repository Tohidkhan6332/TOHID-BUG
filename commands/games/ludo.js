'use strict';

const { sendRichHtml } = require('../../utils/TohidGenai');
const {
  createBotRoom,
  createChallengeRoom,
  getRoomForJid,
  acceptChallenge,
  rollDice,
  moveToken,
  removeRoom,
  botTurn,
} = require('../../utils/TohidLudo');

function getMentionedTarget(msg, args) {
  const mentioned = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
    msg?.message?.contextInfo?.mentionedJid ||
    [];

  if (Array.isArray(mentioned) && mentioned.length) return mentioned[0];
  const match = (args || []).find(v => String(v).includes('@'));
  return match || null;
}

function boardHtml(room) {
  const players = Array.isArray(room?.players) ? room.players : [];
  const p1 = players[0] || { name: 'P1', tokens: [-1, -1, -1, -1], color: 'blue' };
  const p2 = players[1] || { name: 'P2', tokens: [-1, -1, -1, -1], color: 'red' };

  const turnName = players[room?.currentTurn]?.name || 'Unknown';
  const lastDice = room?.lastDice ?? '—';

  const renderTokens = (tokens, color) => tokens.map((pos) => {
    const value = pos >= 0 ? String(pos) : '•';
    return `<div class="token ${color}">${value}</div>`;
  }).join('');

  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    *{box-sizing:border-box}html,body{margin:0;background:transparent;font-family:Arial,sans-serif}body{padding:8px;background:radial-gradient(circle at 50% 0%,#4d285a,#05080d 70%);color:#edf5ff}.card{max-width:420px;margin:0 auto;border-radius:18px;padding:14px;background:rgba(16,19,26,.88);border:1px solid rgba(255,255,255,.08);box-shadow:0 16px 40px rgba(0,0,0,.35)}.title{font-size:24px;font-weight:700;text-align:center;margin-bottom:4px}.sub{text-align:center;font-size:12px;color:#9ab5d8;letter-spacing:2px;margin-bottom:12px}.hud{display:flex;gap:10px;margin-bottom:12px}.hud-box{flex:1;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.05);text-align:center;font-size:12px;font-weight:700;color:#dfeaff}.board{display:grid;grid-template-columns:repeat(9, 1fr);gap:4px;background:#121922;border-radius:12px;padding:8px;border:1px solid rgba(255,255,255,.06)}.cell{aspect-ratio:1;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);border-radius:6px}.cell.center{background:rgba(255,205,86,.15);border-color:rgba(255,205,86,.5)}.cell.blue{background:rgba(30,120,255,.18)}.cell.red{background:rgba(255,70,87,.18)}.cell.green{background:rgba(66,204,146,.18)}.cell.yellow{background:rgba(244,208,63,.18)}.players{display:flex;gap:10px;margin-top:12px}.player-box{flex:1;padding:8px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.05)}.player-name{font-size:13px;font-weight:700;margin-bottom:6px}.tokens{display:flex;flex-wrap:wrap;gap:6px}.token{width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:50%;font-size:12px;font-weight:700;color:#08121a;box-shadow:inset 0 1px 2px rgba(255,255,255,.3)}.token.blue{background:#5ab2ff}.token.red{background:#ff7c8b}.token.green{background:#68f0b6}.token.yellow{background:#ffd75a}.token.default{background:#dfeaff}
  </style></head><body><div class="card"><div class="title">🎲 LUDO</div><div class="sub">2 PLAYER · HTML MODE</div><div class="hud"><div class="hud-box">TURN<br>${turnName}</div><div class="hud-box">DICE<br>${lastDice}</div></div><div class="board">${Array.from({ length: 81 }, (_, i) => {
    const row = Math.floor(i / 9);
    const col = i % 9;
    let className = 'cell';
    if (row === 4 && col === 4) className += ' center';
    if (row < 3 && col < 3) className += ' blue';
    if (row > 5 && col < 3) className += ' red';
    if (row < 3 && col > 5) className += ' green';
    if (row > 5 && col > 5) className += ' yellow';
    return `<div class="${className}"></div>`;
  }).join('')}</div><div class="players"><div class="player-box"><div class="player-name">${p1.name}</div><div class="tokens">${renderTokens(p1.tokens, p1.color)}</div></div><div class="player-box"><div class="player-name">${p2.name}</div><div class="tokens">${renderTokens(p2.tokens, p2.color)}</div></div></div></div></body></html>`;
}

async function handleBotTurn(sock, from, msg, room) {
  if (!room || room.players?.[room.currentTurn]?.type !== 'bot') return null;

  const updatedRoom = botTurn(room);
  try {
    await sendRichHtml({ sock, jid: from, quoted: msg, html: boardHtml(updatedRoom || room), title: 'TOHID LUDO' });
  } catch (error) {}

  if (updatedRoom?.winner) {
    return `🤖 Bot moved. ${updatedRoom.winner} wins!`;
  }

  return '🤖 Bot turn complete.';
}

module.exports = {
  name: 'ludo',
  aliases: ['ludogame', 'ludoboard'],
  description: '2-player HTML Ludo with bot or human challenge',
  category: 'games',

  async execute({ sock, from, reply, pushName, msg, args }) {
    const mentioned = getMentionedTarget(msg, args);
    const room = getRoomForJid(from);

    if (!args || !args.length) {
      if (room && room.status === 'active') {
        try {
          await sendRichHtml({ sock, jid: from, quoted: msg, html: boardHtml(room), title: 'TOHID LUDO' });
          return;
        } catch (error) {
          return reply('Ludo board could not be opened.');
        }
      }

      const botRoom = createBotRoom(from, pushName || 'Player');
      try {
        await sendRichHtml({ sock, jid: from, quoted: msg, html: boardHtml(botRoom), title: 'TOHID LUDO' });
        return reply('🎮 Ludo started against TOHID-BOT.\nUse: .ludo roll\nUse: .ludo move 2');
      } catch (error) {
        return reply('Cannot start Ludo right now.');
      }
    }

    const first = String(args[0]).toLowerCase();

    if (first === 'bot') {
      const botRoom = createBotRoom(from, pushName || 'Player');
      try {
        await sendRichHtml({ sock, jid: from, quoted: msg, html: boardHtml(botRoom), title: 'TOHID LUDO' });
        return reply('🤖 Ludo vs BOT started.\nUse .ludo roll');
      } catch (error) {
        return reply('BOT Ludo could not start.');
      }
    }

    if (first === 'accept') {
      const targetRoomId = args[1] || null;
      const accepted = acceptChallenge(targetRoomId, from);
      if (!accepted) return reply('No pending Ludo room to accept.');
      try {
        await sendRichHtml({ sock, jid: from, quoted: msg, html: boardHtml(accepted), title: 'TOHID LUDO' });
        return reply(`✅ Ludo challenge accepted.\nRoom: ${accepted.id}\n${accepted.players[accepted.currentTurn]?.name} turn.`);
      } catch (error) {
        return reply('Challenge accepted but board could not open.');
      }
    }

    if (first === 'roll') {
      const currentRoom = getRoomForJid(from);
      if (!currentRoom) return reply('No active Ludo room. Start with .ludo or .ludo @user');

      if (currentRoom.players[currentRoom.currentTurn]?.type === 'bot') {
        const botReply = await handleBotTurn(sock, from, msg, currentRoom);
        return reply(botReply || '🤖 Bot turn complete.');
      }

      const rolled = rollDice(currentRoom);
      if (!rolled.ok) return reply(rolled.message);

      try {
        await sendRichHtml({ sock, jid: from, quoted: msg, html: boardHtml(currentRoom), title: 'TOHID LUDO' });
        return reply(`🎲 Dice: ${rolled.dice}\nUse: .ludo move 0 / .ludo move 1 / .ludo move 2 / .ludo move 3`);
      } catch (error) {
        return reply(`🎲 Dice: ${rolled.dice}. Use .ludo move 0..3`);
      }
    }

    if (first === 'move') {
      const currentRoom = getRoomForJid(from);
      if (!currentRoom) return reply('No active game room.');
      const tokenIndex = Number(args[1]);
      if (!Number.isInteger(tokenIndex) || tokenIndex < 0 || tokenIndex > 3) {
        return reply('Choose a token 0-3: .ludo move 0');
      }

      const activePlayer = currentRoom.players[currentRoom.currentTurn];
      const result = moveToken(currentRoom, activePlayer?.jid || from, tokenIndex);
      if (!result.ok) return reply(result.message);

      if (currentRoom.players[currentRoom.currentTurn]?.type === 'bot') {
        const botReply = await handleBotTurn(sock, from, msg, currentRoom);
        return reply(`${result.message || 'Move made.'}\n${botReply || '🤖 Bot turn complete.'}`);
      }

      try {
        await sendRichHtml({ sock, jid: from, quoted: msg, html: boardHtml(currentRoom), title: 'TOHID LUDO' });
      } catch (error) {}

      return reply(result.message || 'Move made.');
    }

    if (mentioned) {
      const room = createChallengeRoom({
        challengerJid: from,
        challengerName: pushName || 'Player',
        opponentJid: mentioned,
        opponentName: 'Opponent',
      });
      try {
        await sendRichHtml({ sock, jid: from, quoted: msg, html: boardHtml(room), title: 'TOHID LUDO' });
        return reply(`🎮 Ludo challenge sent to ${mentioned}.\nRoom ID: ${room.id}\nOpponent use: .ludo accept ${room.id}`);
      } catch (error) {
        return reply(`Ludo challenge sent to ${mentioned}. Room ID: ${room.id}`);
      }
    }

    if (first === 'cancel' || first === 'close') {
      const currentRoom = getRoomForJid(from);
      if (!currentRoom) return reply('No active Ludo room.');
      removeRoom(currentRoom.id);
      return reply('Ludo room closed.');
    }

    return reply('🎮 LUDO COMMANDS\n.ludo -> start bot match\n.ludo bot -> play vs BOT\n.ludo @user -> challenge user\n.ludo accept <roomid> -> accept challenge\n.ludo roll -> roll dice\n.ludo move 0..3 -> move token');
  },
};
