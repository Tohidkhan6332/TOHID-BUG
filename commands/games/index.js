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
        return null;
    }
}

async function executeGame(command, context) {
    const requested = normalize(command);
    const mod = loadGame(requested);
    if (!mod) return false;

    console.log('[GAME] Executing:', requested, '=>', mod.name || requested);

    try {
        recordPlay(
            context?.from,
            context?.pushName || context?.msg?.pushName || 'Player',
            mod.name || requested
        );
    } catch (error) {
        console.error('[GAME STATS] Failed to record play:', error.message);
    }

    await mod.execute(context);
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
