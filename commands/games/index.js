'use strict';

const path = require('path');
const fs = require('fs');
const { recordPlay } = require('../../utils/TohidGameStats');

const GAME_DIR = __dirname;

// Load game modules lazily. The old registry required every JS file in this
// directory on the first game command; one broken/slow module could prevent
// ALL games from ever reaching execute().
const GAME_FILES = {
    snake: 'snake.js',
    '2048': 'game2048.js',
    matrix: 'matrix.js',
    doom: 'doom.js',
    vampire: 'vampire.js',
    cyber: 'cyber.js',
    cursedash: 'cursedash.js',
    dangerdash: 'dangerdash.js',
    cursearena: 'cursearena.js',
    piano: 'piano.js',
    scrabble: 'scrabble.js',
    sudoku: 'sudoku.js',
    wordscramble: 'wordscramble.js',
    ttt: 'ttt.js',
    rps: 'rps.js',
    quiz: 'quiz.js',
    mathrush: 'mathrush.js',
    emojiguess: 'emojiguess.js',
    truthordare: 'truthordare.js',
    dicebattle: 'dicebattle.js',
    numberguess: 'numberguess.js',
    eye: 'eye.js',
    naijawhot: 'naijawhot.js',
    challenge: 'challenge.js',
    games: 'games.js',
    gamedaily: 'gamedaily.js',
    gameleaderboard: 'gameleaderboard.js',
    gameprofile: 'gameprofile.js',
    gamescore: 'gamescore.js',
};

const ALIASES = {
    bluesnake: 'snake',
    snakegame: 'snake',
    twenty48: '2048',
    matrixgame: 'matrix',
    spaceshooter: 'matrix',
    vampiregame: 'vampire',
    nightvamp: 'vampire',
    cybergame: 'cyber',
    neonrunner: 'cyber',
    cyberrun: 'cyber',
    dashgame: 'cursedash',
    cursedashgame: 'cursedash',
    ninjadash: 'cursedash',
    dangergame: 'dangerdash',
    danger: 'dangerdash',
    curse: 'cursearena',
    cursearenagame: 'cursearena',
    keyboard: 'piano',
    keys: 'piano',
    pianokeyboard: 'piano',
    scrabblegame: 'scrabble',
    sudokugame: 'sudoku',
    wordscramblegame: 'wordscramble',
    tictactoe: 'ttt',
    tic: 'ttt',
    rockpaperscissors: 'rps',
    quizgame: 'quiz',
    mathgame: 'mathrush',
    emoji: 'emojiguess',
    tod: 'truthordare',
    dice: 'dicebattle',
    guessnumber: 'numberguess',
    naijawhotgame: 'naijawhot',
    game: 'games',
    gamemenu: 'games',
    gamecenter: 'games',
    arcade: 'games',
    dailygame: 'gamedaily',
    gamestats: 'gamescore',
    gamechallenge: 'challenge',
    challengegame: 'challenge',
};

const loaded = new Map();

function normalize(command) {
    return String(command || '').trim().toLowerCase();
}

function loadGame(command) {
    const requested = normalize(command);
    const name = ALIASES[requested] || requested;
    const file = GAME_FILES[name];
    if (!file) return null;

    if (loaded.has(name)) return loaded.get(name);

    const fullPath = path.join(GAME_DIR, file);
    if (!fs.existsSync(fullPath)) {
        console.error('[GAME LOADER] Missing game file:', fullPath);
        return null;
    }

    try {
        const mod = require(fullPath);
        if (!mod || typeof mod.execute !== 'function') {
            console.error('[GAME LOADER] Invalid game module:', file);
            return null;
        }
        loaded.set(name, mod);
        console.log('[GAME LOADER] Loaded:', name, '->', file);
        return mod;
    } catch (error) {
        console.error('[GAME LOADER] Failed to load ' + file + ':', error.stack || error.message);
        // Keep the exact loader error available to executeGame(), so a broken
        // dependency cannot look like a mysterious "game not found" failure.
        loadGame.lastError = error;
        return null;
    }
}

async function executeGame(command, context) {
    const requested = normalize(command);
    const fileName = GAME_FILES[ALIASES[requested] || requested];

    // IMPORTANT: only commands registered in GAME_FILES are game commands.
    // Unknown bot commands must fall through to MrTohid.js.
    if (!fileName) return false;

    // Send a plain WhatsApp acknowledgement BEFORE loading any game module.
    // This isolates command routing from HTML/Baileys/game-module failures.
    const ackText = `🎮 *TOHID-AI GAME*\\n\\n⏳ Opening *.${requested}*...`;
    try {
        if (typeof context?.sock?.sendMessage === 'function' && context?.from) {
            await context.sock.sendMessage(
                context.from,
                { text: ackText },
                { quoted: context.msg }
            );
        } else if (typeof context?.reply === 'function') {
            await context.reply(ackText);
        }
    } catch (ackError) {
        console.error('[GAME ACK] Failed for ' + requested + ':', ackError.stack || ackError.message);
    }

    loadGame.lastError = null;
    const mod = loadGame(requested);
    if (!mod) {
        const detail = loadGame.lastError?.message || 'Unknown module loading error';
        console.error('[GAME LOADER] Command failed:', requested, detail);
        const errorText =
            `❌ Game *.${requested}* could not be loaded.\\n\\n` +
            `⚠️ Loader error: ${detail}`;
        try {
            await context.sock.sendMessage(context.from, { text: errorText }, { quoted: context.msg });
        } catch (replyError) {
            console.error('[GAME LOAD ERROR REPLY] Failed:', replyError.stack || replyError.message);
        }
        return true;
    }

    console.log('[GAME] Executing:', requested, '=>', mod.name || requested);

    // Stats must never delay or block the actual game.
    try {
        recordPlay(
            context?.from,
            context?.pushName || context?.msg?.pushName || 'Player',
            mod.name || requested
        );
    } catch (error) {
        console.error('[GAME STATS] Failed to record play:', error.message);
    }

    try {
        await Promise.race([
            Promise.resolve().then(() => mod.execute(context)),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Game execution timeout after 15000ms')), 15000)
            ),
        ]);
    } catch (error) {
        console.error('[GAME] Failed:', requested, error.stack || error.message);
        try {
            await context.sock.sendMessage(
                context.from,
                { text: `⚠️ *${mod.name || requested}* could not open.\\n\\n${error.message || 'Unknown error'}` },
                { quoted: context.msg }
            );
        } catch (replyError) {
            console.error('[GAME ERROR REPLY] Failed:', replyError.stack || replyError.message);
        }
    }

    console.log('[GAME] Finished:', requested);
    return true;
}

function listGames() {
    return Object.keys(GAME_FILES).map(name => {
        const mod = loadGame(name);
        return {
            name: mod?.name || name,
            aliases: mod?.aliases || [],
            description: mod?.description || '',
        };
    });
}

module.exports = { executeGame, listGames };
