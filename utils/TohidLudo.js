'use strict';

const crypto = require('crypto');

const rooms = new Map();
const TRACK_LENGTH = 52;
const FINISH_POS = 57;
const ROOM_TTL_MS = 30 * 60 * 1000;
const SAFE_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

function normalizeJid(jid) {
  return String(jid || '').trim().toLowerCase();
}

function normalizeDifficulty(value) {
  const difficulty = String(value || 'medium').toLowerCase();
  return DIFFICULTIES.has(difficulty) ? difficulty : 'medium';
}

function isExpired(room) {
  return Boolean(room && Date.now() - room.lastActivity > ROOM_TTL_MS);
}

function touchRoom(room) {
  if (room) room.lastActivity = Date.now();
  return room;
}

function createPlayer({ jid, name, type = 'human', color = 'blue', start = 0 }) {
  return {
    jid: normalizeJid(jid),
    name: String(name || 'Player'),
    type,
    color,
    start,
    tokens: [-1, -1, -1, -1],
    finished: 0,
  };
}

function makeRoomId() {
  return `ludo_${crypto.randomBytes(4).toString('hex')}`;
}

function getRoomById(roomId, chatId) {
  const room = roomId ? rooms.get(String(roomId)) : null;
  if (!room || isExpired(room)) {
    if (room) rooms.delete(room.id);
    return null;
  }
  if (chatId && room.chatId && room.chatId !== String(chatId)) return null;
  return touchRoom(room);
}

function getRoomForJid(jid, chatId) {
  const target = normalizeJid(jid);
  for (const room of rooms.values()) {
    if (isExpired(room)) {
      rooms.delete(room.id);
      continue;
    }
    if (chatId && room.chatId && room.chatId !== String(chatId)) continue;
    if (room.players.some(player => player.jid === target)) return touchRoom(room);
  }
  return null;
}

function listRooms() {
  for (const room of rooms.values()) if (isExpired(room)) rooms.delete(room.id);
  return [...rooms.values()];
}

function removeRoom(roomId) {
  return rooms.delete(String(roomId));
}

function createRoom({ chatId, players, status = 'active', difficulty = null }) {
  const room = {
    id: makeRoomId(),
    chatId: chatId ? String(chatId) : null,
    status,
    currentTurn: 0,
    lastDice: null,
    winner: null,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    difficulty: difficulty ? normalizeDifficulty(difficulty) : null,
    players,
  };
  rooms.set(room.id, room);
  return room;
}

function createChallengeRoom({ chatId, challengerJid, challengerName, opponentJid, opponentName }) {
  return createRoom({
    chatId,
    status: 'waiting',
    players: [
      createPlayer({ jid: challengerJid, name: challengerName || 'Player 1', color: 'blue', start: 0 }),
      createPlayer({ jid: opponentJid, name: opponentName || 'Player 2', color: 'red', start: 26 }),
    ],
  });
}

function createBotRoom(challengerJid, challengerName, chatId, difficulty = 'medium') {
  return createRoom({
    chatId,
    difficulty,
    players: [
      createPlayer({ jid: challengerJid, name: challengerName || 'Player', type: 'human', color: 'blue', start: 0 }),
      createPlayer({ jid: 'bot', name: `TOHID-BOT (${normalizeDifficulty(difficulty)})`, type: 'bot', color: 'red', start: 26 }),
    ],
  });
}

function acceptChallenge(roomId, accepterJid, chatId) {
  const room = getRoomById(roomId, chatId);
  if (!room || room.status !== 'waiting') return null;
  const normalized = normalizeJid(accepterJid);
  if (!room.players.some(player => player.jid === normalized)) return null;
  room.status = 'active';
  room.currentTurn = 0;
  return touchRoom(room);
}

function leaveRoom(room, jid) {
  if (!room) return false;
  const index = room.players.findIndex(player => player.jid === normalizeJid(jid));
  if (index < 0) return false;
  room.status = 'abandoned';
  room.winner = room.players[1 - index]?.name || 'Opponent';
  room.lastActivity = Date.now();
  return true;
}

function getCurrentPlayer(room) {
  if (!room || !Array.isArray(room.players) || room.players.length < 2) return null;
  return room.players[room.currentTurn] || null;
}

function getPlayerIndex(room, jid) {
  const target = normalizeJid(jid);
  return room?.players?.findIndex(player => player.jid === target) ?? -1;
}

function isPlayerTurn(room, jid) {
  return Boolean(room && room.status === 'active' && getPlayerIndex(room, jid) === room.currentTurn);
}

function globalPosition(player, tokenPosition) {
  if (!player || tokenPosition < 0 || tokenPosition >= FINISH_POS) return -1;
  return (player.start + tokenPosition) % TRACK_LENGTH;
}

function availableMoves(room, playerIndex) {
  const player = room?.players?.[playerIndex];
  if (!player || room.winner || room.status !== 'active' || room.lastDice == null) return [];
  const dice = Number(room.lastDice);
  const moves = [];
  player.tokens.forEach((tokenPos, tokenIndex) => {
    if (tokenPos === -1) {
      if (dice === 6) moves.push({ tokenIndex, from: -1, to: 0, isEntry: true });
      return;
    }
    if (tokenPos >= 0 && tokenPos + dice <= FINISH_POS) {
      moves.push({ tokenIndex, from: tokenPos, to: tokenPos + dice });
    }
  });
  return moves;
}

function captureOpponentTokens(room, playerIndex, targetPosition) {
  if (targetPosition < 0 || SAFE_SQUARES.has(targetPosition)) return false;
  let captured = false;
  room.players.forEach((player, index) => {
    if (index === playerIndex) return;
    player.tokens = player.tokens.map(tokenPos => {
      if (globalPosition(player, tokenPos) === targetPosition) {
        captured = true;
        return -1;
      }
      return tokenPos;
    });
  });
  return captured;
}

function moveToken(room, actorJid, tokenIndex) {
  if (!room || room.status !== 'active') return { ok: false, message: 'No active Ludo room found.' };
  const actorIndex = getPlayerIndex(room, actorJid);
  if (actorIndex < 0) return { ok: false, message: 'You are not part of this Ludo room.' };
  if (actorIndex !== room.currentTurn) return { ok: false, message: 'It is not your turn yet.' };
  if (room.lastDice == null) return { ok: false, message: 'Roll the dice first.' };
  const move = availableMoves(room, actorIndex).find(item => item.tokenIndex === Number(tokenIndex));
  if (!move) return { ok: false, message: 'That token cannot move with the current dice.' };

  const player = room.players[actorIndex];
  const dice = Number(room.lastDice);
  player.tokens[move.tokenIndex] = move.to;
  if (move.to >= FINISH_POS) player.finished += 1;
  const captured = captureOpponentTokens(room, actorIndex, globalPosition(player, move.to));
  const message = `${player.name} moved token ${Number(tokenIndex) + 1}${captured ? ' and captured an opponent token' : ''}.`;

  if (player.tokens.every(position => position === FINISH_POS)) {
    room.winner = player.name;
    room.status = 'finished';
    room.lastDice = null;
    touchRoom(room);
    return { ok: true, room, winner: player.name, captured, message: `${player.name} wins the Ludo match!` };
  }

  room.lastDice = null;
  if (dice !== 6) room.currentTurn = (room.currentTurn + 1) % room.players.length;
  touchRoom(room);
  return { ok: true, room, captured, extraTurn: dice === 6, message: dice === 6 ? `${message} Roll again.` : message };
}

function rollDice(room) {
  if (!room || room.status !== 'active') return { ok: false, message: 'Game is not active.' };
  if (room.lastDice != null) return { ok: false, message: 'You already rolled this turn.' };
  const player = getCurrentPlayer(room);
  const value = 1 + Math.floor(Math.random() * 6);
  room.lastDice = value;
  touchRoom(room);
  const moves = availableMoves(room, room.currentTurn);
  if (!moves.length && value !== 6) {
    room.lastDice = null;
    room.currentTurn = (room.currentTurn + 1) % room.players.length;
    touchRoom(room);
    return { ok: true, room, dice: value, botPassed: player?.type === 'bot', message: `${player?.name || 'Player'} rolled ${value}; no legal move.` };
  }
  return { ok: true, room, dice: value, message: `${player?.name || 'Player'} rolled ${value}.` };
}

function scoreBotMove(room, playerIndex, move, difficulty) {
  const player = room.players[playerIndex];
  const opponent = room.players[1 - playerIndex];
  const target = globalPosition(player, move.to);
  const captures = target >= 0 && !SAFE_SQUARES.has(target) && opponent.tokens.some(token => globalPosition(opponent, token) === target);
  const finishes = move.to >= FINISH_POS;
  const safe = SAFE_SQUARES.has(target);
  if (difficulty === 'easy') return Math.random();
  let score = move.to;
  if (finishes) score += difficulty === 'hard' ? 1000 : 250;
  if (captures) score += difficulty === 'hard' ? 800 : 200;
  if (safe) score += difficulty === 'hard' ? 80 : 25;
  if (move.isEntry) score += difficulty === 'hard' ? 35 : 10;
  return score + Math.random();
}

function botTurn(room, requestedDifficulty) {
  if (!room || room.status !== 'active' || room.players?.[room.currentTurn]?.type !== 'bot') return room;
  const difficulty = normalizeDifficulty(requestedDifficulty || room.difficulty);
  const rolled = rollDice(room);
  if (!rolled.ok) return room;
  const moves = availableMoves(room, room.currentTurn);
  if (!moves.length) return room;
  moves.sort((a, b) => scoreBotMove(room, room.currentTurn, b, difficulty) - scoreBotMove(room, room.currentTurn, a, difficulty));
  moveToken(room, 'bot', moves[0].tokenIndex);
  return room;
}

function roomSummary(room) {
  if (!room) return null;
  return {
    id: room.id,
    chatId: room.chatId,
    status: room.status,
    currentTurn: room.currentTurn,
    lastDice: room.lastDice,
    winner: room.winner,
    difficulty: room.difficulty,
    players: room.players.map(player => ({ name: player.name, jid: player.jid, type: player.type, color: player.color, tokens: player.tokens, finished: player.finished })),
  };
}

module.exports = {
  rooms,
  TRACK_LENGTH,
  FINISH_POS,
  SAFE_SQUARES,
  ROOM_TTL_MS,
  normalizeJid,
  normalizeDifficulty,
  getRoomById,
  getRoomForJid,
  listRooms,
  removeRoom,
  touchRoom,
  createChallengeRoom,
  createBotRoom,
  acceptChallenge,
  leaveRoom,
  getCurrentPlayer,
  getPlayerIndex,
  isPlayerTurn,
  globalPosition,
  availableMoves,
  moveToken,
  rollDice,
  botTurn,
  roomSummary,
};
