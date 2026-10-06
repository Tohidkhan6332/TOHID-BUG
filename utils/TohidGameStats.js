'use strict';

const fs = require('fs');
const path = require('path');
const DB_DIR = path.join(__dirname, '..', 'database');
const DB_FILE = path.join(DB_DIR, 'game-stats.json');

function load() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '{}');
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) || {}; } catch { return {}; }
}
function save(db) {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}
function userId(jid) { return String(jid || '').split(':')[0]; }
function levelForXp(xp) { return Math.max(1, Math.floor(Math.sqrt(Math.max(0, Number(xp) || 0) / 100)) + 1); }
function xpForNextLevel(level) { return Math.pow(Number(level) || 1, 2) * 100; }
function getPlayer(jid, name) {
  const db = load(), id = userId(jid);
  if (!db[id]) db[id] = { name: String(name || 'Player').slice(0, 40), coins: 0, xp: 0, gamesPlayed: 0, wins: 0, bestScore: 0, streak: 0, lastDaily: null, gameScores: {} };
  if (name) db[id].name = String(name).slice(0, 40);
  return { db, id, player: db[id] };
}
function recordPlay(jid, name, game) {
  const x = getPlayer(jid, name);
  x.player.gamesPlayed++;
  x.player.xp += 10;
  x.player.coins += 2;
  x.player.lastGame = String(game || 'unknown');
  save(x.db);
  return x.player;
}
function recordScore(jid, name, game, score) {
  const value = Math.max(0, Math.floor(Number(score) || 0));
  const x = getPlayer(jid, name), key = String(game || 'unknown').toLowerCase();
  const old = Number(x.player.gameScores[key] || 0);
  const improved = value > old;
  x.player.gameScores[key] = Math.max(old, value);
  x.player.bestScore = Math.max(Number(x.player.bestScore || 0), value);
  x.player.xp += Math.min(250, Math.max(5, Math.floor(value / 10)));
  x.player.coins += Math.min(500, Math.max(5, Math.floor(value / 20)));
  if (improved && value > 0) x.player.wins++;
  save(x.db);
  return { player: x.player, improved, score: value };
}
function claimDaily(jid, name, challenge) {
  const x = getPlayer(jid, name), today = new Date().toISOString().slice(0, 10);
  if (x.player.lastDaily === today) return { claimed: false, player: x.player };
  x.player.lastDaily = today;
  x.player.streak = Number(x.player.streak || 0) + 1;
  x.player.coins += Number(challenge.coins || 100);
  x.player.xp += Number(challenge.xp || 50);
  save(x.db);
  return { claimed: true, player: x.player };
}
function leaderboard(limit) {
  return Object.values(load()).sort((a, b) => Number(b.bestScore || 0) - Number(a.bestScore || 0) || Number(b.xp || 0) - Number(a.xp || 0)).slice(0, limit || 10);
}
function profile(jid, name) { return getPlayer(jid, name).player; }
module.exports = { userId, levelForXp, xpForNextLevel, recordPlay, recordScore, claimDaily, leaderboard, profile };
