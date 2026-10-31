'use strict';

const crypto = require('crypto');

const rooms = new Map();
const FINISH_POS = 57;
const SAFE_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

function normalizeJid(jid) {
    return String(jid || '').trim().toLowerCase();
}

function createPlayer({ jid, name, type = 'human', color = 'blue' }) {
    return {
        jid: normalizeJid(jid),
        name: String(name || 'Player'),
        type,
        color,
        tokens: [-1, -1, -1, -1],
        finished: 0,
    };
}

function makeRoomId() {
    return `ludo_${crypto.randomBytes(4).toString('hex')}`;
}

function getRoomById(roomId) {
    if (!roomId) return null;
    return rooms.get(String(roomId));
}

function getRoomForJid(jid) {
    const target = normalizeJid(jid);
    for (const room of rooms.values()) {
        if (room.players.some(player => player.jid === target)) return room;
    }
    return null;
}

function listRooms() {
    return [...rooms.values()];
}

function removeRoom(roomId) {
    rooms.delete(String(roomId));
}

function createChallengeRoom({ challengerJid, challengerName, opponentJid, opponentName }) {
    const roomId = makeRoomId();
    const room = {
        id: roomId,
        status: 'waiting',
        currentTurn: 0,
        lastDice: null,
        winner: null,
        createdAt: Date.now(),
        players: [
            createPlayer({ jid: challengerJid, name: challengerName || 'Player 1', type: 'human', color: 'blue' }),
            createPlayer({ jid: opponentJid, name: opponentName || 'Player 2', type: 'human', color: 'red' }),
        ],
    };
    rooms.set(roomId, room);
    return room;
}

function createBotRoom(challengerJid, challengerName) {
    const roomId = makeRoomId();
    const room = {
        id: roomId,
        status: 'active',
        currentTurn: 0,
        lastDice: null,
        winner: null,
        createdAt: Date.now(),
        players: [
            createPlayer({ jid: challengerJid, name: challengerName || 'Player', type: 'human', color: 'blue' }),
            createPlayer({ jid: 'bot', name: 'TOHID-BOT', type: 'bot', color: 'red' }),
        ],
    };
    rooms.set(roomId, room);
    return room;
}

function acceptChallenge(roomId, accepterJid) {
    const room = getRoomById(roomId);
    if (!room || room.status !== 'waiting') return null;
    const normalized = normalizeJid(accepterJid);
    if (!room.players.some(player => player.jid === normalized)) return null;
    room.status = 'active';
    room.currentTurn = 0;
    return room;
}

function getCurrentPlayer(room) {
    if (!room || !Array.isArray(room.players) || room.players.length < 2) return null;
    return room.players[room.currentTurn] || null;
}

function getPlayerIndex(room, jid) {
    const target = normalizeJid(jid);
    const index = room.players.findIndex(player => player.jid === target);
    return index >= 0 ? index : -1;
}

function availableMoves(room, playerIndex) {
    const player = room.players[playerIndex];
    if (!player || room.winner) return [];
    if (room.lastDice == null) return [];

    const dice = Number(room.lastDice);
    const moves = [];

    player.tokens.forEach((tokenPos, tokenIndex) => {
        if (tokenPos === -1) {
            if (dice === 6) {
                moves.push({ tokenIndex, from: -1, to: 0, isEntry: true });
            }
            return;
        }

        if (tokenPos >= 0 && tokenPos + dice <= FINISH_POS) {
            moves.push({ tokenIndex, from: tokenPos, to: tokenPos + dice });
        }
    });

    return moves;
}

function isPlayerTurn(room, jid) {
    if (!room || !room.players || room.players.length < 2) return false;
    const current = getCurrentPlayer(room);
    if (!current) return false;
    return current.jid === normalizeJid(jid);
}

function captureOpponentTokens(room, playerIndex, targetSquare) {
    if (targetSquare < 0 || targetSquare === FINISH_POS) return;
    if (SAFE_SQUARES.has(targetSquare)) return;

    const currentPlayer = room.players[playerIndex];
    room.players.forEach((player, index) => {
        if (index === playerIndex) return;
        player.tokens = player.tokens.map((tokenPos, tokenIndex) => {
            if (tokenPos === targetSquare) {
                player.finished = Math.max(0, player.finished);
                return -1;
            }
            return tokenPos;
        });
    });

    if (currentPlayer && currentPlayer.name) {
        currentPlayer.lastCapture = targetSquare;
    }
}

function hasWinner(room) {
    return room.players.some(player => player.tokens.every(tokenPos => tokenPos === FINISH_POS));
}

function finishTurn(room) {
    if (!room || room.winner) return room;
    room.lastDice = null;
    room.currentTurn = (room.currentTurn + 1) % room.players.length;
    return room;
}

function moveToken(room, actorJid, tokenIndex) {
    if (!room || room.status !== 'active') {
        return { ok: false, message: 'No active game room found.' };
    }

    const actorIndex = getPlayerIndex(room, actorJid);
    if (actorIndex < 0) {
        return { ok: false, message: 'You are not part of this Ludo room.' };
    }

    if (actorIndex !== room.currentTurn) {
        return { ok: false, message: 'It is not your turn yet.' };
    }

    if (room.lastDice == null) {
        return { ok: false, message: 'Roll the dice first.' };
    }

    const moves = availableMoves(room, actorIndex);
    const move = moves.find(item => item.tokenIndex === Number(tokenIndex));
    if (!move) {
        return { ok: false, message: 'That token cannot move with the current dice.' };
    }

    const player = room.players[actorIndex];
    const prevVal = player.tokens[tokenIndex];
    const nextVal = move.to;
    player.tokens[tokenIndex] = nextVal;

    if (nextVal >= FINISH_POS) {
        player.finished += 1;
    }

    captureOpponentTokens(room, actorIndex, nextVal);

    if (player.tokens.filter(pos => pos >= FINISH_POS).length >= 4 || player.tokens.every(pos => pos === FINISH_POS)) {
        room.winner = player.name;
        room.status = 'finished';
        room.lastDice = null;
        return {
            ok: true,
            room,
            winner: player.name,
            message: `${player.name} wins the Ludo match!`,
        };
    }

    finishTurn(room);
    return {
        ok: true,
        room,
        previous: prevVal,
        next: nextVal,
        message: `${player.name} moved token ${tokenIndex + 1} to square ${nextVal}.`,
    };
}

function rollDice(room) {
    if (!room || room.status !== 'active') {
        return { ok: false, message: 'Game is not active.' };
    }

    if (room.lastDice != null) {
        return { ok: false, message: 'You already rolled this turn.' };
    }

    const value = 1 + Math.floor(Math.random() * 6);
    room.lastDice = value;
    const player = room.players[room.currentTurn];

    if (player && player.type === 'bot') {
        const options = availableMoves(room, room.currentTurn);
        if (!options.length && value !== 6) {
            room.lastDice = null;
            room.currentTurn = (room.currentTurn + 1) % room.players.length;
            return { ok: true, room, botPassed: true, dice: value, message: `Bot rolled ${value}, but no legal move.` };
        }
    }

    return { ok: true, room, dice: value, message: `${player ? player.name : 'Player'} rolled ${value}.` };
}

function botTurn(room) {
    if (!room || room.status !== 'active') return room;
    if (room.players[room.currentTurn]?.type !== 'bot') return room;

    const rollResult = rollDice(room);
    if (!rollResult.ok) return room;

    const options = availableMoves(room, room.currentTurn);
    if (!options.length) {
        room.lastDice = null;
        room.currentTurn = (room.currentTurn + 1) % room.players.length;
        return room;
    }

    const chosen = options[Math.floor(Math.random() * options.length)];
    const moveResult = moveToken(room, 'bot', chosen.tokenIndex);
    return moveResult.room || room;
}

function roomSummary(room) {
    if (!room) return null;
    return {
        id: room.id,
        status: room.status,
        currentTurn: room.currentTurn,
        lastDice: room.lastDice,
        winner: room.winner,
        players: room.players.map(player => ({
            name: player.name,
            type: player.type,
            color: player.color,
            tokens: player.tokens,
            finished: player.finished,
        })),
    };
}

module.exports = {
    rooms,
    getRoomById,
    getRoomForJid,
    listRooms,
    removeRoom,
    createChallengeRoom,
    createBotRoom,
    acceptChallenge,
    getCurrentPlayer,
    getPlayerIndex,
    isPlayerTurn,
    availableMoves,
    moveToken,
    rollDice,
    botTurn,
    roomSummary,
    FINISH_POS,
    SAFE_SQUARES,
    normalizeJid,
};
