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

function boardCellMarkup() {
  const cells = [];
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      let className = 'cell';
      const center = row === 7 && col === 7;
      const isBlueBase = (row < 6 && col < 6) || (row > 8 && col > 8);
      const isRedBase = (row < 6 && col > 8) || (row > 8 && col < 6);
      const isGreenTrack = row >= 3 && row <= 11 && col >= 3 && col <= 11;
      const isPath = (row === 7 && col >= 0 && col <= 14) || (col === 7 && row >= 0 && row <= 14);

      if (center) className += ' center';
      if (isBlueBase) className += ' blue';
      if (isRedBase) className += ' red';
      if (isGreenTrack) className += ' green';
      if (isPath) className += ' path';
      if (row === 6 && col === 7) className += ' start-blue';
      if (row === 8 && col === 7) className += ' start-red';
      if (row === 7 && col === 6) className += ' start-green';
      if (row === 7 && col === 8) className += ' start-yellow';
      cells.push(`<div class="${className}"></div>`);
    }
  }
  return cells.join('');
}

function offlineHtml() {
  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
    <title>TOHID LUDO</title>
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; width: 100%; background: transparent; font-family: Arial, sans-serif; }
      body {
        background: radial-gradient(circle at top, #172554 8%, #090d14 58%, #02050c 100%);
        padding: 12px;
        color: #edf6ff;
      }
      .shell {
        max-width: 470px;
        margin: 0 auto;
        border-radius: 24px;
        overflow: hidden;
        background: rgba(8, 14, 24, 0.96);
        border: 1px solid rgba(148, 163, 184, 0.24);
        box-shadow: 0 18px 42px rgba(0,0,0,0.38);
      }
      .top {
        padding: 20px 16px 8px;
        text-align: center;
        background: linear-gradient(90deg, #0ea5e9, #8b5cf6, #f59e0b);
        font-size: 30px;
        font-weight: 900;
        letter-spacing: 1px;
      }
      .sub {
        text-align: center;
        padding-bottom: 18px;
        font-size: 10px;
        letter-spacing: 2px;
        color: rgba(255,255,255,0.8);
        background: linear-gradient(90deg, #0ea5e9, #8b5cf6, #f59e0b);
      }
      .panel { padding: 18px 16px 20px; }
      .mini {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-bottom: 16px;
      }
      .mini-box {
        background: rgba(15, 23, 42, 0.9);
        border-radius: 14px;
        padding: 12px 10px;
        border: 1px solid rgba(96, 165, 250, 0.28);
        text-align: center;
      }
      .mini-box span {
        display: block;
        color: #93c5fd;
        font-size: 10px;
        letter-spacing: 1.4px;
        margin-bottom: 6px;
      }
      .mini-box strong {
        font-size: 24px;
      }
      .button-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      button {
        border: none;
        border-radius: 12px;
        padding: 13px 10px;
        font-weight: 900;
        font-size: 13px;
        cursor: pointer;
        transition: transform 0.2s ease, opacity 0.2s ease;
      }
      button:active { transform: scale(0.98); }
      .primary { background: linear-gradient(90deg, #22c55e, #16a34a); color: #ecfdf5; }
      .gold { background: linear-gradient(90deg, #f59e0b, #f97316); color: #fff7ed; }
      .muted { background: rgba(51, 65, 85, 0.92); color: #e2e8f0; }
      .info {
        margin-top: 16px;
        background: rgba(15, 23, 42, 0.9);
        border: 1px solid rgba(148, 163, 184, 0.15);
        border-radius: 14px;
        padding: 12px 13px;
        color: #dbeafe;
        font-size: 12px;
        line-height: 1.7;
      }
      .tiny {
        color: #7dd3fc;
        font-size: 10px;
        letter-spacing: 1.5px;
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="top">🎲 LUDO</div>
      <div class="sub">TOHID SINGLE FRAME</div>
      <div class="panel">
        <div class="mini">
          <div class="mini-box"><span>TURN</span><strong id="turnValue">PLAYER</strong></div>
          <div class="mini-box"><span>DICE</span><strong id="diceValue">—</strong></div>
        </div>

        <div class="button-grid">
          <button class="primary" data-action="roll">🎲 Roll Dice</button>
          <button class="gold" data-action="reset">🔄 Reset</button>
          <button class="muted" data-action="move0">🟦 Token 1</button>
          <button class="muted" data-action="move1">🟩 Token 2</button>
          <button class="muted" data-action="move2">🟥 Token 3</button>
          <button class="muted" data-action="move3">🟨 Token 4</button>
        </div>

        <div class="info">
          <div class="tiny">STATUS</div>
          <div id="statusText">Use only .ludo. All actions work from this one frame — roll, move, reset, and bot mode are inside the board.</div>
        </div>
      </div>
    </div>

    <script>
      const state = { turn: 'PLAYER', dice: '—', tokens: [0, 0, 0, 0], status: 'Use only .ludo. All actions work from this one frame.' };
      const turnValue = document.getElementById('turnValue');
      const diceValue = document.getElementById('diceValue');
      const statusText = document.getElementById('statusText');

      function syncUI() {
        turnValue.textContent = state.turn;
        diceValue.textContent = state.dice;
        statusText.textContent = state.status;
      }

      function rollDice() {
        const value = 1 + Math.floor(Math.random() * 6);
        state.dice = String(value);
        state.status = 'Dice rolled: ' + value + '. Choose a token.';
        syncUI();
      }

      function moveToken(index) {
        if (state.dice === '—') {
          state.status = 'Roll the dice before moving.';
          syncUI();
          return;
        }
        const current = Number(state.tokens[index] || 0);
        const next = current + Number(state.dice);
        state.tokens[index] = next;
        state.status = 'Token ' + (index + 1) + ' moved to ' + next + '. Turn passed to opponent.';
        state.dice = '—';
        state.turn = state.turn === 'PLAYER' ? 'BOT' : 'PLAYER';
        syncUI();
      }

      document.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        if (action === 'roll') rollDice();
        else if (action === 'reset') {
          state.turn = 'PLAYER';
          state.dice = '—';
          state.tokens = [0, 0, 0, 0];
          state.status = 'Match reset. Use the same single frame to play again.';
          syncUI();
        } else if (action === 'move0') moveToken(0);
        else if (action === 'move1') moveToken(1);
        else if (action === 'move2') moveToken(2);
        else if (action === 'move3') moveToken(3);
      });
    </script>
  </body>
</html>`;
}

function renderPlayerState(player, accent) {
  const tokens = (player?.tokens || [-1, -1, -1, -1]).map((pos, idx) => {
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

function boardHtml(room) {
  const players = Array.isArray(room?.players) ? room.players : [];
  const p1 = players[0] || { name: 'P1', tokens: [-1, -1, -1, -1], color: 'blue' };
  const p2 = players[1] || { name: 'P2', tokens: [-1, -1, -1, -1], color: 'red' };
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
        gap: 4px;
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
      }
      .cell.blue { background: rgba(96, 165, 250, 0.25); }
      .cell.red { background: rgba(251, 113, 133, 0.25); }
      .cell.green { background: rgba(74, 222, 128, 0.18); }
      .cell.yellow { background: rgba(250, 204, 21, 0.18); }
      .cell.center { background: rgba(255, 255, 255, 0.18); }
      .cell.path { background: rgba(203, 213, 225, 0.1); }
      .cell.start-blue { background: rgba(96, 165, 250, 0.48); }
      .cell.start-red { background: rgba(251, 113, 133, 0.48); }
      .cell.start-green { background: rgba(74, 222, 128, 0.45); }
      .cell.start-yellow { background: rgba(250, 204, 21, 0.45); }
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
        <div class="tiny">ONE FRAME MODE</div>
        Use only .ludo. All controls are inside this board — roll, move, reset, and bot actions happen from this UI.
      </div>
    </div>

    <script>
      const boardState = {
        turn: '${turnName}',
        dice: '${lastDice}',
        status: '${status}',
        tick: 0,
      };

      function updateStatus(msg) {
        const info = document.querySelector('.info');
        if (info) {
          info.innerHTML = '<div class="tiny">ONE FRAME MODE</div>' + msg;
        }
      }

      document.addEventListener('click', (event) => {
        const button = event.target.closest('[data-action]');
        if (!button) return;
        const action = button.getAttribute('data-action');

        if (action === 'roll') {
          const value = 1 + Math.floor(Math.random() * 6);
          boardState.dice = String(value);
          boardState.status = 'Dice rolled: ' + value + '. Choose a move.';
          updateStatus('Dice rolled: ' + value + '. Choose a move from the same single frame.');
        }

        if (action === 'move') {
          boardState.status = 'Move selected. Use the board controls in this same frame.';
          updateStatus('Move selected. This is a single-frame Ludo UI — no extra commands are needed.');
        }

        if (action === 'reset') {
          boardState.dice = '—';
          boardState.status = 'New match started.';
          updateStatus('New match started. Use only .ludo and the board controls in this frame.');
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
    await sendRichHtml({ sock, jid: from, quoted: msg, html: boardHtml(updatedRoom || room), title: 'TOHID LUDO' });
  } catch (error) {}

  if (updatedRoom?.winner) {
    return `🤖 Bot moved. ${updatedRoom.winner} wins!`;
  }

  return '🤖 Bot turn complete.';
}

module.exports = {
  name: 'ludo',
  aliases: [],
  description: 'Single-frame Ludo board with all controls in one UI',
  category: 'games',

  async execute({ sock, from, sender, reply, pushName, msg, args }) {
    const playerJid = sender || msg?.key?.participant || msg?.key?.remoteJid || from;
    const room = getRoomForJid(playerJid, from);

    if (args && args.length) {
      const requested = String(args[0]).toLowerCase();
      if (requested === 'bot') {
        const botRoom = createBotRoom(playerJid, pushName || 'Player', from, normalizeDifficulty(args[1] || 'medium'));
        try {
          await sendRichHtml({ sock, jid: from, quoted: msg, html: boardHtml(botRoom), title: 'TOHID LUDO' });
          return reply('🎲 Ludo board opened in one frame. Use only .ludo and the UI buttons inside the board.');
        } catch (error) {
          return reply('Ludo board could not open.');
        }
      }
      return reply('Use only .ludo. All actions must be done from the same board UI.');
    }

    if (room && room.status === 'active') {
      try {
        await sendRichHtml({ sock, jid: from, quoted: msg, html: boardHtml(room), title: 'TOHID LUDO' });
        return;
      } catch (error) {
        return reply('Ludo board could not be opened.');
      }
    }

    const botRoom = createBotRoom(playerJid, pushName || 'Player', from, 'medium');
    try {
      await sendRichHtml({ sock, jid: from, quoted: msg, html: boardHtml(botRoom), title: 'TOHID LUDO' });
      return reply('🎲 Ludo opened in one frame. Use only .ludo and the buttons inside the board.');
    } catch (error) {
      try {
        await sendRichHtml({ sock, jid: from, quoted: msg, html: offlineHtml(), title: 'TOHID LUDO' });
        return reply('🎲 Ludo frame opened in offline mode. Use only .ludo and the built-in controls.');
      } catch (offlineError) {
        return reply('Ludo UI could not open.');
      }
    }
  },
};
