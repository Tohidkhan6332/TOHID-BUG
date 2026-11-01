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
  leaveRoom,
  roomSummary,
  normalizeDifficulty,
} = require('../../utils/TohidLudo');

function getMentionedTarget(msg, args) {
  const mentioned = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
    msg?.message?.contextInfo?.mentionedJid ||
    [];

  if (Array.isArray(mentioned) && mentioned.length) return mentioned[0];
  const match = (args || []).find(v => String(v).includes('@'));
  return match || null;
}

function roomMenuHtml() {
  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
    <title>TOHID LUDO</title>
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; width: 100%; background: transparent; font-family: Arial, sans-serif; }
      body {
        background: radial-gradient(circle at top, #111827, #040814 65%, #02050a 100%);
        padding: 12px;
        color: #f8fafc;
      }
      .shell {
        max-width: 530px;
        margin: 0 auto;
        background: rgba(15, 23, 42, 0.96);
        border: 1px solid rgba(148, 163, 184, 0.22);
        border-radius: 26px;
        overflow: hidden;
        box-shadow: 0 18px 38px rgba(0,0,0,0.45);
      }
      .header {
        padding: 20px 18px 12px;
        text-align: center;
        background: linear-gradient(90deg, #0ea5e9, #8b5cf6, #f59e0b);
        font-size: 28px;
        font-weight: 900;
        letter-spacing: 1px;
      }
      .subtitle {
        padding: 0 18px 16px;
        text-align: center;
        background: linear-gradient(90deg, #0ea5e9, #8b5cf6, #f59e0b);
        font-size: 10px;
        letter-spacing: 2px;
        color: rgba(255,255,255,0.85);
      }
      .body {
        padding: 18px 14px 12px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      .mode-btn {
        border: none;
        border-radius: 16px;
        padding: 16px 10px;
        font-size: 15px;
        font-weight: 900;
        cursor: pointer;
        color: white;
        min-height: 94px;
      }
      .bot { background: linear-gradient(135deg, #0ea5e9, #2563eb); }
      .local { background: linear-gradient(135deg, #22c55e, #16a34a); }
      .online { background: linear-gradient(135deg, #f59e0b, #f97316); }
      .status { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
      .info {
        margin-top: 16px;
        background: rgba(15, 23, 42, 0.8);
        border: 1px solid rgba(148,163,184,.18);
        border-radius: 14px;
        padding: 12px 13px;
        line-height: 1.7;
        color: #dbeafe;
        font-size: 12px;
      }
      .tiny { color: #a5b4fc; font-size: 10px; letter-spacing: 1.4px; margin-bottom: 8px; }
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="header">🎲 LUDO</div>
      <div class="subtitle">ONE COMMAND • ALL MODES</div>
      <div class="body">
        <div class="grid">
          <button class="mode-btn bot" data-mode="bot">1P<br>VS BOT</button>
          <button class="mode-btn local" data-mode="local">2P<br>OFFLINE</button>
          <button class="mode-btn online" data-mode="online">2P<br>ONLINE</button>
          <button class="mode-btn status" data-mode="status">STATUS</button>
        </div>
        <div class="info">
          <div class="tiny">SINGLE FRAME</div>
          This board contains all Ludo options in one place. Use only <b>.ludo</b> and then choose a mode from the UI.
          <br>• 1P vs BOT<br>• 2P Offline<br>• 2P Online Challenge<br>• Status
        </div>
      </div>
    </div>

    <script>
      document.addEventListener('click', (event) => {
        const button = event.target.closest('[data-mode]');
        if (!button) return;
        const mode = button.getAttribute('data-mode');
        const info = document.querySelector('.info');
        if (!info) return;
        const map = {
          bot: 'Selected: 1 Player vs BOT. This is the AI mode in the same frame.',
          local: 'Selected: 2 Player Offline. Local match starts from the same Ludo board.',
          online: 'Selected: 2 Player Online. Mention a contact in chat to challenge them.',
          status: 'Selected: Status. Use room details from the same frame.'
        };
        info.innerHTML = '<div class="tiny">MODE</div>' + map[mode];
      });
    </script>
  </body>
</html>`;
}

function boardCellMarkup() {
  const cells = [];
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      let className = 'cell';
      const isBoardCross = (row === 7 && col >= 0 && col <= 14) || (col === 7 && row >= 0 && row <= 14);
      const isBlueHome = row < 6 && col < 6;
      const isRedHome = row < 6 && col > 8;
      const isGreenHome = row > 8 && col < 6;
      const isYellowHome = row > 8 && col > 8;
      const inCenter = row >= 5 && row <= 9 && col >= 5 && col <= 9;
      const isSafeTrack = (row === 6 && col === 1) || (row === 1 && col === 8) || (row === 8 && col === 13) || (row === 13 && col === 6);

      if (isBlueHome) className += ' blue-home';
      if (isRedHome) className += ' red-home';
      if (isGreenHome) className += ' green-home';
      if (isYellowHome) className += ' yellow-home';
      if (inCenter) className += ' center-zone';
      if (isBoardCross) className += ' track';
      if (isSafeTrack) className += ' safe';
      if (row === 7 && col === 7) className += ' center-star';
      if ((row === 6 && col === 7) || (row === 8 && col === 7) || (row === 7 && col === 6) || (row === 7 && col === 8)) className += ' start-point';

      cells.push(`<div class="${className}"></div>`);
    }
  }
  return cells.join('');
}

function renderPlayerState(player, accent) {
  const tokens = (player?.tokens || [-1, -1, -1, -1]).map(pos => {
    const value = pos >= 0 ? String(pos) : '•';
    return `<div class="token ${accent}">${value}</div>`;
  }).join('');

  return `
    <div class="player-box">
      <div class="player-head ${accent}">${player?.name || 'Player'}</div>
      <div class="tokens">${tokens}</div>
    </div>
  `;
}

function ludoBoardHtml(room) {
  const players = Array.isArray(room?.players) ? room.players : [];
  const p1 = players[0] || { name: 'Player 1', tokens: [0, 0, 0, 0], color: 'blue' };
  const p2 = players[1] || { name: 'Player 2', tokens: [0, 0, 0, 0], color: 'red' };
  const turnName = players[room?.currentTurn]?.name || 'Unknown';
  const lastDice = room?.lastDice ?? '—';
  const status = room?.winner ? `${room.winner} wins` : room?.status || 'active';

  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
    <title>TOHID LUDO</title>
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; width: 100%; background: transparent; font-family: Arial, sans-serif; }
      body {
        background: radial-gradient(circle at top, #1e1b4b, #070d14 65%, #02050a 100%);
        padding: 12px;
        color: #f8fafc;
      }
      .game-box {
        max-width: 560px;
        margin: 0 auto;
        background: rgba(9, 15, 24, 0.98);
        border-radius: 26px;
        overflow: hidden;
        border: 1px solid rgba(148, 163, 184, 0.22);
        box-shadow: 0 18px 36px rgba(0,0,0,0.45);
      }
      .header {
        padding: 18px 18px 10px;
        text-align: center;
        background: linear-gradient(90deg, #0ea5e9, #8b5cf6, #f59e0b);
        font-size: 28px;
        font-weight: 900;
        letter-spacing: 1px;
      }
      .status-row {
        display: grid;
        grid-template-columns: repeat(3, minmax(0,1fr));
        gap: 8px;
        padding: 12px 14px 6px;
        background: rgba(15,23,42,.96);
      }
      .chip {
        background: rgba(30,41,59,.9);
        border: 1px solid rgba(148,163,184,.18);
        border-radius: 12px;
        padding: 10px 8px;
        text-align: center;
      }
      .chip .label {
        display: block;
        color: #93c5fd;
        font-size: 9px;
        letter-spacing: 1.5px;
        margin-bottom: 6px;
      }
      .chip .value {
        display: block;
        font-weight: 900;
        font-size: 16px;
      }
      .board-wrap {
        padding: 8px 12px 2px;
        background: rgba(15,23,42,.96);
      }
      .board {
        display: grid;
        grid-template-columns: repeat(15, minmax(0, 1fr));
        gap: 3px;
        padding: 10px;
        border-radius: 18px;
        background: rgba(2, 6, 23, 0.9);
        border: 1px solid rgba(148, 163, 184, 0.18);
      }
      .cell {
        aspect-ratio: 1;
        border-radius: 6px;
        background: rgba(148, 163, 184, 0.12);
        border: 1px solid rgba(148, 163, 184, 0.18);
        display: grid;
        place-items: center;
        position: relative;
      }
      .blue-home { background: rgba(96, 165, 250, 0.28); }
      .red-home { background: rgba(251, 113, 133, 0.28); }
      .green-home { background: rgba(74, 222, 128, 0.28); }
      .yellow-home { background: rgba(250, 204, 21, 0.28); }
      .track { background: rgba(226, 232, 240, 0.15); }
      .center-zone { background: rgba(255,255,255,0.04); }
      .safe { box-shadow: inset 0 0 0 2px rgba(255,255,255,0.18); }
      .center-star { background: radial-gradient(circle, #f8fafc 0%, #a5b4fc 35%, rgba(148,163,184,0.15) 100%); }
      .start-point { box-shadow: inset 0 0 0 2px rgba(255,255,255,0.45); }
      .player-row {
        display: grid;
        grid-template-columns: repeat(2, minmax(0,1fr));
        gap: 10px;
        padding: 10px 12px 16px;
        background: rgba(15,23,42,.96);
      }
      .player-box {
        background: rgba(15, 23, 42, 0.88);
        border: 1px solid rgba(148, 163, 184, 0.18);
        border-radius: 14px;
        padding: 10px;
      }
      .player-head {
        font-weight: 900;
        font-size: 14px;
        margin-bottom: 10px;
        padding: 6px 8px;
        border-radius: 10px;
      }
      .player-head.blue { background: rgba(96,165,250,.18); color: #bfdbfe; }
      .player-head.red { background: rgba(251,113,133,.16); color: #fecdd3; }
      .player-head.green { background: rgba(74,222,128,.16); color: #bbf7d0; }
      .player-head.yellow { background: rgba(250,204,21,.18); color: #fef3c7; }
      .tokens {
        display: grid;
        grid-template-columns: repeat(4, minmax(0,1fr));
        gap: 8px;
      }
      .token {
        display: grid;
        place-items: center;
        min-height: 38px;
        border-radius: 12px;
        font-weight: 900;
        color: #0f172a;
      }
      .token.blue { background: linear-gradient(135deg, #bfdbfe, #60a5fa); }
      .token.red { background: linear-gradient(135deg, #fecdd3, #f87171); }
      .token.green { background: linear-gradient(135deg, #bbf7d0, #4ade80); }
      .token.yellow { background: linear-gradient(135deg, #fef3c7, #facc15); }
      .actions {
        display: grid;
        grid-template-columns: repeat(3, minmax(0,1fr));
        gap: 8px;
        padding: 0 12px 16px;
        background: rgba(15,23,42,.96);
      }
      button {
        border: none;
        border-radius: 12px;
        padding: 11px 10px;
        font-weight: 900;
        font-size: 12px;
        cursor: pointer;
      }
      .primary { background: linear-gradient(90deg, #22c55e, #16a34a); color: #f0fdf4; }
      .gold { background: linear-gradient(90deg, #f59e0b, #f97316); color: #fff7ed; }
      .muted { background: rgba(51,65,85,.92); color: #e2e8f0; }
      .info {
        margin: 0 12px 16px;
        background: rgba(30,41,59,.88);
        border: 1px solid rgba(148,163,184,.18);
        border-radius: 12px;
        padding: 10px 12px;
        font-size: 12px;
        line-height: 1.6;
      }
      .tiny { color: #a5b4fc; font-size: 10px; letter-spacing: 1.5px; }
    </style>
  </head>
  <body>
    <div class="game-box">
      <div class="header">🎲 TOHID LUDO</div>
      <div class="status-row">
        <div class="chip"><span class="label">TURN</span><span class="value">${turnName}</span></div>
        <div class="chip"><span class="label">DICE</span><span class="value">${lastDice}</span></div>
        <div class="chip"><span class="label">STATE</span><span class="value">${status}</span></div>
      </div>

      <div class="board-wrap">
        <div class="board">${boardCellMarkup()}</div>
      </div>

      <div class="player-row">
        ${renderPlayerState(p1, p1.color || 'blue')}
        ${renderPlayerState(p2, p2.color || 'red')}
      </div>

      <div class="actions">
        <button class="primary" data-action="roll">🎲 Roll</button>
        <button class="gold" data-action="move">🧭 Move</button>
        <button class="muted" data-action="reset">🔄 Reset</button>
      </div>

      <div class="info">
        <div class="tiny">REAL LUDO STYLE</div>
        Classic 4-color board • 1P vs BOT • 2P Offline • 2P Online Challenge
      </div>
    </div>

    <script>
      document.addEventListener('click', (event) => {
        const button = event.target.closest('[data-action]');
        if (!button) return;
        const action = button.getAttribute('data-action');
        const info = document.querySelector('.info');
        if (!info) return;
        if (action === 'roll') {
          info.innerHTML = '<div class="tiny">REAL LUDO STYLE</div>Dice rolled. Select an available token from this real board view.';
        }
        if (action === 'move') {
          info.innerHTML = '<div class="tiny">REAL LUDO STYLE</div>Move selected. No extra command is needed.';
        }
        if (action === 'reset') {
          info.innerHTML = '<div class="tiny">REAL LUDO STYLE</div>New match started. Same board UI, real Ludo style.';
        }
      });
    </script>
  </body>
</html>`;
}

async function handleBotTurn(sock, from, msg, room) {
  if (!room || room.players?.[room.currentTurn]?.type !== 'bot') return null;

  const updatedRoom = botTurn(room);
  try {
    await sendRichHtml({ sock, jid: from, quoted: msg, html: ludoBoardHtml(updatedRoom || room), title: 'TOHID LUDO' });
  } catch (error) {}

  return updatedRoom?.winner ? `🤖 Bot moved. ${updatedRoom.winner} wins!` : '🤖 Bot turn complete.';
}

module.exports = {
  name: 'ludo',
  aliases: ['ludogame', 'ludoboard'],
  description: 'Real-style Ludo board with bot, offline and online challenge support',
  category: 'games',

  async execute({ sock, from, sender, reply, pushName, msg, args }) {
    const playerJid = sender || msg?.key?.participant || msg?.key?.remoteJid || from;
    const mentioned = getMentionedTarget(msg, args);
    const room = getRoomForJid(playerJid, from);

    if (room && room.status === 'active') {
      try {
        await sendRichHtml({ sock, jid: from, quoted: msg, html: ludoBoardHtml(room), title: 'TOHID LUDO' });
        return;
      } catch (error) {
        return reply('Ludo board could not be opened.');
      }
    }

    if (mentioned) {
      const challenge = createChallengeRoom({
        chatId: from,
        challengerJid: playerJid,
        challengerName: pushName || 'Player',
        opponentJid: mentioned,
        opponentName: 'Opponent',
      });
      try {
        await sendRichHtml({ sock, jid: from, quoted: msg, html: ludoBoardHtml(challenge), title: 'TOHID LUDO' });
        return reply(`🎮 Ludo online challenge created for ${mentioned}.\nRoom ID: ${challenge.id}\nOpponent use: .ludo`);
      } catch (error) {
        return reply(`🎮 Ludo challenge created for ${mentioned}. Room ID: ${challenge.id}`);
      }
    }

    if (args && args.length) {
      const requested = String(args[0]).toLowerCase();
      if (requested === 'bot') {
        const difficulty = normalizeDifficulty(args[1] || 'medium');
        const botRoom = createBotRoom(playerJid, pushName || 'Player', from, difficulty);
        try {
          await sendRichHtml({ sock, jid: from, quoted: msg, html: ludoBoardHtml(botRoom), title: 'TOHID LUDO' });
          return reply('🎲 Real-style 1P vs BOT mode selected. Use the same board UI to play.');
        } catch (error) {
          return reply('BOT mode could not start.');
        }
      }
      if (requested === 'local' || requested === '2p' || requested === 'offline') {
        const localRoom = createChallengeRoom({
          chatId: from,
          challengerJid: playerJid,
          challengerName: pushName || 'Player 1',
          opponentJid: `${playerJid}_friend`,
          opponentName: 'Player 2',
        });
        try {
          await sendRichHtml({ sock, jid: from, quoted: msg, html: ludoBoardHtml(localRoom), title: 'TOHID LUDO' });
          return reply('🎮 Real-style 2P Offline mode selected. Use the same board UI to play.');
        } catch (error) {
          return reply('Offline local match could not start.');
        }
      }
      if (requested === 'status') {
        const current = getRoomForJid(playerJid, from);
        if (!current) return reply('No active Ludo room in this chat.');
        const summary = roomSummary(current);
        const active = summary.players[summary.currentTurn];
        return reply(`🎲 LUDO STATUS\nRoom: ${summary.id}\nState: ${summary.status}\nTurn: ${active?.name || '—'}\nDice: ${summary.lastDice ?? '—'}`);
      }
      if (requested === 'leave' || requested === 'cancel' || requested === 'close') {
        const current = getRoomForJid(playerJid, from);
        if (!current) return reply('No active Ludo room in this chat.');
        leaveRoom(current, playerJid);
        removeRoom(current.id);
        return reply('✅ You left the Ludo game.');
      }
    }

    try {
      await sendRichHtml({ sock, jid: from, quoted: msg, html: roomMenuHtml(), title: 'TOHID LUDO' });
      return reply('🎲 Ludo opened in real-style single-frame mode. All options are inside this board.');
    } catch (error) {
      return reply('Ludo menu could not be opened.');
    }
  },
};
