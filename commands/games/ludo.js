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

function renderBoardState(room) {
  const players = Array.isArray(room?.players) ? room.players : [];
  const safePlayers = players.length ? players : [
    { name: 'YOU', tokens: [-1, -1, -1, -1], color: 'blue' },
    { name: 'BOT', tokens: [-1, -1, -1, -1], color: 'red' },
  ];

  const p1 = safePlayers[0] || { name: 'P1', tokens: [-1, -1, -1, -1], color: 'blue' };
  const p2 = safePlayers[1] || { name: 'P2', tokens: [-1, -1, -1, -1], color: 'red' };

  const current = room?.players?.[room.currentTurn]?.name || 'Player';
  const lastDice = room?.lastDice ?? '—';
  const status = room?.winner ? `${room.winner} wins` : room?.status || 'active';

  return {
    p1: { ...p1, tokens: p1.tokens || [-1, -1, -1, -1] },
    p2: { ...p2, tokens: p2.tokens || [-1, -1, -1, -1] },
    current,
    lastDice,
    status,
  };
}

function offlineHtml() {
  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
    <title>TOHID LUDO</title>
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: transparent; font-family: Arial, sans-serif; }
      body {
        background: radial-gradient(circle at top, #1e293b, #040a13 62%);
        padding: 12px;
        color: #ecf4ff;
      }
      .wrap {
        max-width: 480px;
        margin: 0 auto;
        border-radius: 22px;
        overflow: hidden;
        background: linear-gradient(180deg, rgba(15,23,42,.96), rgba(7,12,20,.98));
        border: 1px solid rgba(148,163,184,.22);
        box-shadow: 0 12px 30px rgba(0,0,0,.38);
      }
      .header {
        padding: 18px 16px 10px;
        background: linear-gradient(90deg, #0ea5e9, #8b5cf6 55%, #f59e0b);
        text-align: center;
        font-weight: 900;
        letter-spacing: .8px;
        font-size: 28px;
      }
      .sub {
        text-align: center;
        font-size: 10px;
        letter-spacing: 2px;
        color: rgba(255,255,255,.8);
        padding: 0 0 14px;
      }
      .panel {
        padding: 16px;
      }
      .cards {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-bottom: 14px;
      }
      .card {
        background: rgba(15,23,42,.9);
        border: 1px solid rgba(96,165,250,.3);
        border-radius: 14px;
        padding: 12px 10px;
        text-align: center;
      }
      .card .label {
        display: block;
        color: #93c5fd;
        font-size: 10px;
        letter-spacing: 1.5px;
        margin-bottom: 6px;
      }
      .card .value {
        font-size: 24px;
        font-weight: 900;
      }
      .buttons {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-top: 12px;
      }
      button {
        border: none;
        border-radius: 12px;
        font-weight: 800;
        font-size: 14px;
        padding: 12px 10px;
        cursor: pointer;
        transition: 0.2s ease;
      }
      button:active { transform: scale(0.98); }
      .primary {
        background: linear-gradient(90deg, #22c55e, #16a34a);
        color: #edfff3;
      }
      .accent {
        background: linear-gradient(90deg, #f59e0b, #f97316);
        color: #fffaf0;
      }
      .ghost {
        background: rgba(51,65,85,.95);
        color: #e2e8f0;
      }
      .info {
        margin-top: 14px;
        border-radius: 12px;
        background: rgba(30,41,59,.7);
        color: #cbd5e1;
        padding: 12px;
        font-size: 12px;
        line-height: 1.6;
        border: 1px solid rgba(148,163,184,.18);
      }
      .tiny {
        color: #7dd3fc;
        font-size: 11px;
        letter-spacing: 1px;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="header">🎲 LUDO</div>
      <div class="sub">TOHID CLASSIC MATCH</div>
      <div class="panel">
        <div class="cards">
          <div class="card">
            <span class="label">TURN</span>
            <div class="value" id="turnLabel">PLAYER</div>
          </div>
          <div class="card">
            <span class="label">DICE</span>
            <div class="value" id="diceLabel">—</div>
          </div>
        </div>

        <div class="buttons">
          <button class="primary" data-action="roll">🎲 Roll Dice</button>
          <button class="accent" data-action="reset">🔄 New Match</button>
          <button class="ghost" data-action="move0">🟦 Token 1</button>
          <button class="ghost" data-action="move1">🟩 Token 2</button>
          <button class="ghost" data-action="move2">🟥 Token 3</button>
          <button class="ghost" data-action="move3">🟨 Token 4</button>
        </div>

        <div class="info">
          <div class="tiny">STATUS</div>
          <div id="statusText">Tap the dice to begin. If your client does not support interactive HTML, use command shortcuts like .ludo roll and .ludo move 0.</div>
        </div>
      </div>
    </div>

    <script>
      const state = {
        turn: 'PLAYER',
        dice: '—',
        status: 'Tap the dice to begin.',
        tokens: [0, 0, 0, 0],
      };

      const turnLabel = document.getElementById('turnLabel');
      const diceLabel = document.getElementById('diceLabel');
      const statusText = document.getElementById('statusText');

      function setState(next) {
        Object.assign(state, next);
        turnLabel.textContent = state.turn;
        diceLabel.textContent = state.dice;
        statusText.textContent = state.status;
      }

      function rollRandom() {
        const value = 1 + Math.floor(Math.random() * 6);
        setState({
          dice: String(value),
          status: 'Dice landed on ' + value + '. Choose a token to move.',
        });
      }

      function moveToken(index) {
        const current = Number(state.tokens[index] || 0);
        const movement = Number(state.dice === '—' ? 0 : state.dice);
        if (state.dice === '—') {
          setState({ status: 'Roll the dice first.' });
          return;
        }
        const nextValue = current + movement;
        state.tokens[index] = nextValue;
        setState({
          status: 'Token ' + (index + 1) + ' moved to ' + nextValue + '. Turn passed to opponent.',
          dice: '—',
          turn: state.turn === 'PLAYER' ? 'BOT' : 'PLAYER',
        });
      }

      document.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-action');

        if (action === 'roll') rollRandom();
        else if (action === 'reset') {
          setState({
            turn: 'PLAYER',
            dice: '—',
            status: 'Match reset. Tap the dice to begin.',
            tokens: [0, 0, 0, 0],
          });
        } else if (action === 'move0') moveToken(0);
        else if (action === 'move1') moveToken(1);
        else if (action === 'move2') moveToken(2);
        else if (action === 'move3') moveToken(3);
      });
    </script>
  </body>
</html>`;
}

function boardHtml(room) {
  const state = renderBoardState(room);
  const currentTurn = state.current || 'Player';
  const lastDice = state.lastDice ?? '—';
  const status = room?.winner ? `${room.winner} wins` : room?.status || 'active';

  const p1Tokens = state.p1.tokens.map((pos, i) => {
    const val = pos >= 0 ? String(pos) : '•';
    return `<div class="token blue">${val}</div>`;
  }).join('');

  const p2Tokens = state.p2.tokens.map((pos, i) => {
    const val = pos >= 0 ? String(pos) : '•';
    return `<div class="token red">${val}</div>`;
  }).join('');

  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
    <title>TOHID LUDO</title>
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: transparent; font-family: Arial, sans-serif; }
      body {
        background: radial-gradient(circle at top, #312e81, #090d14 70%);
        padding: 12px;
        color: #eef6ff;
      }
      .board-shell {
        max-width: 520px;
        margin: 0 auto;
        border-radius: 26px;
        overflow: hidden;
        background: rgba(11,18,32,.96);
        border: 1px solid rgba(148,163,184,.25);
        box-shadow: 0 18px 36px rgba(0,0,0,.45);
      }
      .topbar {
        padding: 16px 18px 8px;
        background: linear-gradient(90deg, #0f766e, #2563eb, #7c3aed);
        text-align: center;
        font-weight: 900;
        font-size: 27px;
        letter-spacing: 1px;
      }
      .meta {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
        padding: 8px 16px 14px;
        background: rgba(15,23,42,.9);
      }
      .meta-box {
        background: rgba(30,41,59,.8);
        border: 1px solid rgba(148,163,184,.18);
        border-radius: 10px;
        padding: 10px 8px;
        text-align: center;
      }
      .meta-box .label {
        display: block;
        font-size: 9px;
        letter-spacing: 1.4px;
        color: #93c5fd;
      }
      .meta-box .text {
        display: block;
        font-weight: 900;
        margin-top: 5px;
        font-size: 16px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(15, 1fr);
        gap: 4px;
        padding: 12px;
        background: rgba(15,23,42,.9);
      }
      .cell {
        aspect-ratio: 1;
        border-radius: 6px;
        background: rgba(148,163,184,.12);
        border: 1px solid rgba(148,163,184,.18);
        display: grid;
        place-items: center;
        font-size: 8px;
        font-weight: 800;
      }
      .cell.blue { background: rgba(96,165,250,.28); }
      .cell.red { background: rgba(251,113,133,.28); }
      .cell.green { background: rgba(74,222,128,.23); }
      .cell.yellow { background: rgba(250,204,21,.24); }
      .cell.start { background: rgba(99,102,241,.42); }
      .cell.center { background: rgba(255,255,255,.18); }
      .token-zone {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        padding: 12px 14px 18px;
        background: rgba(15,23,42,.9);
      }
      .player-box {
        background: rgba(15,23,42,.8);
        border: 1px solid rgba(148,163,184,.18);
        border-radius: 14px;
        padding: 10px;
      }
      .player-name {
        font-weight: 900;
        font-size: 14px;
        margin-bottom: 8px;
        color: #f8fafc;
      }
      .tokens {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 8px;
      }
      .token {
        display: grid;
        place-items: center;
        border-radius: 12px;
        min-height: 38px;
        font-size: 12px;
        font-weight: 900;
        color: #0f172a;
      }
      .token.blue { background: linear-gradient(135deg, #93c5fd, #60a5fa); }
      .token.red { background: linear-gradient(135deg, #fda4af, #f87171); }
      .token.green { background: linear-gradient(135deg, #86efac, #4ade80); }
      .token.yellow { background: linear-gradient(135deg, #fde68a, #facc15); }
      .actions {
        display: grid;
        grid-template-columns: repeat(3, minmax(0,1fr));
        gap: 8px;
        padding: 0 14px 16px;
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
      .warning { background: linear-gradient(90deg, #f59e0b, #f97316); color: #fff7ed; }
      .muted { background: rgba(51,65,85,.9); color: #e2e8f0; }
      .status-bar {
        margin: 0 14px 16px;
        background: rgba(30,41,59,.8);
        border: 1px solid rgba(148,163,184,.2);
        border-radius: 12px;
        padding: 10px 12px;
        font-size: 12px;
        line-height: 1.6;
      }
      .tiny {
        color: #a5b4fc;
        font-size: 10px;
        letter-spacing: 1.5px;
      }
    </style>
  </head>
  <body>
    <div class="board-shell">
      <div class="topbar">🎲 TOHID LUDO</div>
      <div class="meta">
        <div class="meta-box"><span class="label">TURN</span><span class="text">${currentTurn}</span></div>
        <div class="meta-box"><span class="label">DICE</span><span class="text">${lastDice}</span></div>
        <div class="meta-box"><span class="label">STATE</span><span class="text">${status}</span></div>
      </div>

      <div class="grid">
        ${Array.from({ length: 225 }, (_, index) => {
          const row = Math.floor(index / 15);
          const col = index % 15;
          let cls = 'cell';
          if (row === 7 && col === 7) cls += ' center';
          if ((row >= 0 && row <= 5 && col >= 0 && col <= 5) || (row >= 9 && row <= 14 && col >= 9 && col <= 14)) cls += ' blue';
          if ((row >= 0 && row <= 5 && col >= 9 && col <= 14) || (row >= 9 && row <= 14 && col >= 0 && col <= 5)) cls += ' red';
          if (row >= 3 && row <= 7 && col >= 3 && col <= 7) cls += ' green';
          if (row >= 8 && row <= 12 && col >= 8 && col <= 12) cls += ' yellow';
          if ((row === 7 && col >= 0 && col <= 2) || (row >= 0 && row <= 2 && col === 7) || (row === 7 && col >= 12 && col <= 14) || (row >= 12 && row <= 14 && col === 7)) cls += ' start';
          return `<div class="${cls}"></div>`;
        }).join('')}
      </div>

      <div class="token-zone">
        <div class="player-box">
          <div class="player-name">${state.p1.name}</div>
          <div class="tokens">${p1Tokens}</div>
        </div>
        <div class="player-box">
          <div class="player-name">${state.p2.name}</div>
          <div class="tokens">${p2Tokens}</div>
        </div>
      </div>

      <div class="actions">
        <button class="primary" data-action="roll">🎲 Roll</button>
        <button class="warning" data-action="move">🔁 Move</button>
        <button class="muted" data-action="reset">🔄 Reset</button>
      </div>

      <div class="status-bar">
        <div class="tiny">ACTIONS</div>
        Use the on-screen buttons for a fast match flow. If your client blocks the HTML controls, use: .ludo roll or .ludo move 0
      </div>
    </div>

    <script>
      const state = {
        turn: '${currentTurn}',
        dice: '${lastDice}',
        status: '${status}',
      };

      function updateInfo() {
        const el = document.querySelector('.meta-box .text');
      }

      document.addEventListener('click', (event) => {
        const button = event.target.closest('[data-action]');
        if (!button) return;
        const action = button.getAttribute('data-action');
        const statusBox = document.querySelector('.status-bar');

        if (action === 'roll') {
          const dice = 1 + Math.floor(Math.random() * 6);
          state.dice = String(dice);
          state.status = 'Dice rolled: ' + dice + '. Choose a move.';
          statusBox.innerHTML = '<div class="tiny">ACTIONS</div>Dice rolled: ' + dice + '. Choose a move.';
        }

        if (action === 'move') {
          state.status = 'Move selected. Use the command fallback if your client blocks HTML controls.';
          statusBox.innerHTML = '<div class="tiny">ACTIONS</div>Move selected. Use .ludo move 0 / .ludo move 1 if needed.';
        }

        if (action === 'reset') {
          state.status = 'New match started.';
          statusBox.innerHTML = '<div class="tiny">ACTIONS</div>New match started. Tap Roll to begin again.';
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
  aliases: ['ludogame', 'ludoboard'],
  description: '2-player HTML Ludo with bot or human challenge',
  category: 'games',

  async execute({ sock, from, sender, reply, pushName, msg, args }) {
    const playerJid = sender || msg?.key?.participant || msg?.key?.remoteJid || from;
    const mentioned = getMentionedTarget(msg, args);
    const room = getRoomForJid(playerJid, from);

    if (!args || !args.length) {
      if (room && room.status === 'active') {
        try {
          await sendRichHtml({ sock, jid: from, quoted: msg, html: boardHtml(room), title: 'TOHID LUDO' });
          return;
        } catch (error) {
          return reply('Ludo board could not be opened.');
        }
      }

      try {
        await sendRichHtml({ sock, jid: from, quoted: msg, html: offlineHtml(), title: 'TOHID LUDO' });
        return;
      } catch (error) {
        return reply('Ludo HTML could not open. Use `.ludo bot` for command mode.');
      }
    }

    const first = String(args[0]).toLowerCase();

    if (first === 'html' || first === 'offline' || first === 'local') {
      try {
        await sendRichHtml({ sock, jid: from, quoted: msg, html: offlineHtml(), title: 'TOHID LUDO' });
        return;
      } catch (error) {
        return reply('Ludo HTML could not open.');
      }
    }

    if (first === 'bot') {
      const difficulty = normalizeDifficulty(args[1]);
      const botRoom = createBotRoom(playerJid, pushName || 'Player', from, difficulty);
      try {
        await sendRichHtml({ sock, jid: from, quoted: msg, html: boardHtml(botRoom), title: 'TOHID LUDO' });
        return reply(`🤖 Ludo vs BOT started (${difficulty}).\nUse .ludo roll\nDifficulty: easy / medium / hard`);
      } catch (error) {
        return reply('BOT Ludo could not start.');
      }
    }

    if (first === 'help') {
      return reply('🎲 LUDO COMMANDS\n\n.ludo - open HTML modes\n.ludo bot [easy|medium|hard] - play vs AI\n.ludo online @user - group challenge\n.ludo accept ROOM_ID - join challenge\n.ludo roll - roll the dice\n.ludo move 0..3 - move selected token\n.ludo status - view room details');
    }

    if (first === 'status') {
      const current = getRoomForJid(playerJid, from);
      if (!current) return reply('No active Ludo room in this chat.');
      const summary = roomSummary(current);
      const active = summary.players[summary.currentTurn];
      return reply(`🎲 LUDO STATUS\nRoom: ${summary.id}\nState: ${summary.status}\nTurn: ${active?.name || '—'}\nDice: ${summary.lastDice ?? '—'}\nPlayers: ${summary.players.map(p => `${p.name} (${p.color})`).join(', ')}`);
    }

    if (first === 'leave' || first === 'cancel' || first === 'close') {
      const current = getRoomForJid(playerJid, from);
      if (!current) return reply('No active Ludo room in this chat.');
      leaveRoom(current, playerJid);
      removeRoom(current.id);
      return reply('✅ You left the Ludo game.');
    }

    if (first === 'online' && !mentioned) {
      return reply('🌐 Group online Ludo usage:\n.ludo online @user\nOpponent: .ludo accept ROOM_ID');
    }

    if (first === 'accept' || first === 'join') {
      const targetRoomId = args[1] || null;
      const accepted = acceptChallenge(targetRoomId, playerJid, from);
      if (!accepted) return reply('No pending Ludo room to accept.');
      try {
        await sendRichHtml({ sock, jid: from, quoted: msg, html: boardHtml(accepted), title: 'TOHID LUDO' });
        return reply(`✅ Ludo challenge accepted.\nRoom: ${accepted.id}\n${accepted.players[accepted.currentTurn]?.name} turn.`);
      } catch (error) {
        return reply('Challenge accepted but board could not open.');
      }
    }

    if (first === 'roll') {
      const currentRoom = getRoomForJid(playerJid, from);
      if (!currentRoom) return reply('No active Ludo room. Start with .ludo or .ludo bot');

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
      const currentRoom = getRoomForJid(playerJid, from);
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
        chatId: from,
        challengerJid: playerJid,
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

    return reply('🎮 Use `.ludo help` for all Ludo commands.');
  },
};
