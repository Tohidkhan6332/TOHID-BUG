'use strict';

// Per-group mention digest. Messages are collected during the configured
// daily IST window and forwarded to the configured owner at the window end.
const fs = require('fs');
const path = require('path');
const CONFIG_FILE = path.join(process.cwd(), 'tohidstore', 'mention-digest.json');
const COMMANDS = new Set(['mentionon', 'mentionoff', 'mentiontime', 'mentionstatus']);
const queues = new Map();
const seen = new Set();
const attached = new WeakSet();
const IST = 'Asia/Kolkata';

function readConfig() {
  try {
    const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) { return {}; }
}
function writeConfig(config) {
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
  const temp = CONFIG_FILE + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(config, null, 2));
  fs.renameSync(temp, CONFIG_FILE);
}
function getClock(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(date);
  const hour = Number(parts.find(p => p.type === 'hour')?.value || 0);
  const minute = Number(parts.find(p => p.type === 'minute')?.value || 0);
  return hour * 60 + minute;
}
function parseTime(value) {
  if (!/^([01]\\d|2[0-3]):[0-5]\\d$/.test(String(value || ''))) return null;
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}
function isMentioned(message) {
  const visited = new Set();
  function scan(value, depth = 0) {
    if (!value || typeof value !== 'object' || depth > 8 || visited.has(value)) return false;
    visited.add(value);
    if (Array.isArray(value.mentionedJid) && value.mentionedJid.length) return true;
    for (const [key, child] of Object.entries(value)) {
      if (key === 'contextInfo' && child && Array.isArray(child.mentionedJid) && child.mentionedJid.length) return true;
      if (child && typeof child === 'object' && scan(child, depth + 1)) return true;
    }
    return false;
  }
  return scan(message);
}
function isWithinWindow(settings, now) {
  const start = parseTime(settings.start);
  const end = parseTime(settings.end);
  if (start === null || end === null || start >= end) return false;
  return now >= start && now < end;
}
function enqueue(groupId, message) {
  const id = message.key?.id;
  if (!id) return;
  const dedupeKey = groupId + ':' + id;
  if (seen.has(dedupeKey)) return;
  seen.add(dedupeKey);
  if (seen.size > 10000) seen.clear();
  if (!queues.has(groupId)) queues.set(groupId, []);
  queues.get(groupId).push(message);
}
async function flushDue(sock, ownerJid) {
  const config = readConfig();
  const now = getClock();
  for (const [groupId, settings] of Object.entries(config)) {
    if (!settings?.enabled) continue;
    const end = parseTime(settings.end);
    if (end === null || now < end) continue;
    const pending = queues.get(groupId) || [];
    if (!pending.length) continue;
    // Remove from memory only after successful forwarding; failures retain the batch.
    try {
      for (const original of pending) {
        if (typeof sock.copyNForward === 'function') {
          await sock.copyNForward(ownerJid, original, true);
        } else {
          await sock.sendMessage(ownerJid, { forward: original });
        }
        await new Promise(resolve => setTimeout(resolve, 250));
      }
      queues.set(groupId, []);
      console.log('[MENTION DIGEST] Delivered', pending.length, 'message(s) from an enabled group.');
    } catch (error) {
      console.error('[MENTION DIGEST] Batch delivery failed; keeping remaining batch:', error.message);
    }
  }
}
function attachMentionDigest(sock, ownerJid) {
  if (!sock?.ev || attached.has(sock) || !ownerJid) return;
  attached.add(sock);
  sock.ev.on('messages.upsert', async update => {
    try {
      if (update?.type && update.type !== 'notify') return;
      for (const message of update?.messages || []) {
        const groupId = message?.key?.remoteJid;
        if (!groupId?.endsWith('@g.us') || message.key?.fromMe || !message.message) continue;
        const settings = readConfig()[groupId];
        if (!settings?.enabled || !isMentioned(message.message)) continue;
        if (!isWithinWindow(settings, getClock())) continue;
        enqueue(groupId, message);
      }
    } catch (error) {
      console.error('[MENTION DIGEST] Incoming message handler failed:', error.message);
    }
  });
  const timer = setInterval(() => flushDue(sock, ownerJid).catch(error =>
    console.error('[MENTION DIGEST] Scheduler error:', error.message)
  ), 15000);
  timer.unref?.();
  sock.ev.on('connection.update', update => {
    if (update?.connection === 'close') clearInterval(timer);
  });
}
async function executeGroup(command, context = {}) {
  const name = String(command || '').toLowerCase();
  if (!COMMANDS.has(name)) return false;
  const { msg, from, reply, args = [], isOwner, isAdmin } = context;
  if (!msg?.key?.remoteJid?.endsWith('@g.us')) {
    await reply('👥 Ye command sirf group mein use karein.');
    return true;
  }
  if (!isOwner && !isAdmin) {
    await reply('🔒 Sirf group admins ya bot owner is setting ko change kar sakte hain.');
    return true;
  }
  const config = readConfig();
  const groupId = from || msg.key.remoteJid;
  const current = config[groupId] || { enabled: false, start: '09:00', end: '18:00' };
  if (name === 'mentionon') {
    config[groupId] = { ...current, enabled: true };
    writeConfig(config);
    await reply('✅ Mention digest ON. Mentioned messages roz set kiye gaye time window mein collect honge aur end time par owner DM mein bheje jayenge.');
  } else if (name === 'mentionoff') {
    config[groupId] = { ...current, enabled: false };
    writeConfig(config);
    queues.delete(groupId);
    await reply('⏹️ Mention digest OFF. Is group ke pending messages bhi clear kar diye gaye.');
  } else if (name === 'mentiontime') {
    const start = args[0];
    const end = args[1];
    const startMinutes = parseTime(start);
    const endMinutes = parseTime(end);
    if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) {
      await reply('⏰ Format: .mentiontime 09:00 18:00\\nStart aur end 24-hour IST format mein hon; end time start se baad hona chahiye.');
      return true;
    }
    config[groupId] = { ...current, start, end };
    writeConfig(config);
    await reply('✅ Daily timing set: ' + start + ' se ' + end + ' IST. End time par collected mentions owner DM mein batch mein bheje jayenge.');
  } else {
    await reply('📋 *Mention Digest Status*\\nStatus: ' + (current.enabled ? 'ON' : 'OFF') + '\\nDaily time: ' + current.start + ' - ' + current.end + ' IST\\nPending messages: ' + (queues.get(groupId)?.length || 0));
  }
  return true;
}
module.exports = { executeGroup, attachMentionDigest };
