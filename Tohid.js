/**
 * © 2026 MR TOHID — TOHID-AI
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ⚠️ COPYRIGHT NOTICE
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * This source code is the property of
 * MR TOHID / TOHID-AI.
 *
 * Unauthorized copying, modifying, reselling,
 * leaking or redistributing this source code
 * without permission is strictly prohibited.
 *
 * Do not claim this project as your own.
 * Proper credit is required for permitted use.
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 🔗 OFFICIAL
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * WhatsApp : MR TOHID
 * Telegram : TOHID-AI
 *
 * Built with ❤️❤️ by MR TOHID
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

require('dotenv').config();
require('./setting/config');
const TelegramBot = require('node-telegram-bot-api');
const { execFile, spawn } = require('child_process');
const { restartProcess, updateFromGitHub, detectPlatform, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH } = require('./utils/runtime-manager');
const fsSync = require('fs');
const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const { performance } = require('perf_hooks');
const os = require('os');
const { BOT_TOKEN } = require('./tohidstore/token');
const { sleep } = require('./tohidstore/utils');
const { autoLoadPairs } = require('./autoload');
const { getActiveConnection, getActiveConnections, restartActiveConnection } = require('./pair');
const TUTORIAL_CONFIG_FILE = path.join(__dirname, 'tohidstore', 'tutorial.json');

function getTutorialVideoUrl() {
  try {
    if (!fsSync.existsSync(TUTORIAL_CONFIG_FILE)) return '';
    const data = JSON.parse(fsSync.readFileSync(TUTORIAL_CONFIG_FILE, 'utf8'));
    return typeof data.url === 'string' ? data.url.trim() : '';
  } catch (error) {
    console.error('[TUTORIAL] Config read failed:', error.message);
    return '';
  }
}

function saveTutorialVideoUrl(url) {
  const dir = path.dirname(TUTORIAL_CONFIG_FILE);
  if (!fsSync.existsSync(dir)) fsSync.mkdirSync(dir, { recursive: true });
  fsSync.writeFileSync(TUTORIAL_CONFIG_FILE, JSON.stringify({
    url: url || '',
    updatedAt: new Date().toISOString()
  }, null, 2));
}

function isValidTelegramUrl(value) {
  try {
    const parsed = new URL(String(value).trim());

    // Only HTTPS Telegram links are accepted.
    if (parsed.protocol !== 'https:') return false;

    const hostname = parsed.hostname.toLowerCase().replace(/^www\\./, '');
    if (!['t.me', 'telegram.me'].includes(hostname)) return false;

    // Tutorial must point to a specific Telegram message/post,
    // not just a channel/group home page.
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return false;

    // Private channel/group post:
    // https://t.me/c/1234567890/123
    if (parts[0].toLowerCase() === 'c') {
      return parts.length >= 3 &&
        /^\\d+$/.test(parts[1]) &&
        /^\\d+$/.test(parts[2]);
    }

    // Public channel/group post:
    // https://t.me/ChannelUsername/123
    return /^[A-Za-z0-9_]{5,32}$/.test(parts[0]) &&
      /^\\d+$/.test(parts[1]);
  } catch {
    return false;
  }
}

// ==================== SYSTEM CONFIGURATION ====================
const SYSTEM = {
  name: "𝐓𝐎𝐇𝐈𝐃-𝐀𝐈",
  shortName: "𝐓𝐎𝐇𝐈𝐃-𝐀𝐈",
  creator: "𝕄ℝ 𝕋𝕆ℍ𝕀𝔻",
  version: "4.0.0",
  environment: process.env.NODE_ENV || "production",
  sessionLimit: 100,
  codeExpiry: 300000, // 5 minutes
  broadcastDelay: 100,
  maxLogs: 1000
};

// Owner Configuration
const OWNERS = {
  primary: 8582350365,
  secondary: 8582350365,
  dev: 8582350365,
  all: [8582350365]
};

// Developer Contact Information
const DEVELOPER_CONTACTS = {
  telegram: 'https://t.me/Tohidkhan6332',
  whatsapp: 'https://wa.me/message/O6KWTGOGTVTYO1',
  email: 'Tohidkhan9050482152@gmail.com',
  support: '@Tohidkhan6332'
};

// File System Structure
const PATHS = {
  base: path.join(__dirname, 'axis_storage'),
  admin: path.join(__dirname, 'axis_storage', 'admin.json'),
  users: path.join(__dirname, 'axis_storage', 'users.json'),
  userDetails: path.join(__dirname, 'axis_storage', 'userdetails.json'),
  stats: path.join(__dirname, 'axis_storage', 'stats.json'),
  banned: path.join(__dirname, 'axis_storage', 'banned.json'),
  reports: path.join(__dirname, 'axis_storage', 'reports.json'),
  sessions: path.join(__dirname, 'axis_storage', 'sessions'),
  audit: path.join(__dirname, 'axis_storage', 'audit.json'),
  maintenance: path.join(__dirname, 'axis_storage', 'maintenance.json'),
  backups: path.join(__dirname, 'axis_storage', 'backups'),
  // NEW: Premium system paths
  premium: path.join(__dirname, 'axis_storage', 'premium.json'),
  referrals: path.join(__dirname, 'axis_storage', 'referrals.json'),
  coupons: path.join(__dirname, 'axis_storage', 'coupons.json')
};

// Media Assets
const ASSETS = {
  menuImages: [
    'https://github.com/Tohidkhan6332.png',
  ],
  pairingVideos: [
    'https://h.uguu.se/qWcJAzsK.mp4',
    'https://h.uguu.se/ANUyTwpB.mp4'
  ],
  // Telegram post URL used by the tutorial "WATCH NOW" button.
  // Example: https://t.me/TohidChannel/123 or https://t.me/c/1234567890/123
  tutorialVideo: process.env.TUTORIAL_VIDEO_URL || '',
};

// Channel Requirements
const REQUIRED_CHANNELS = [
  { id: -1003686512726, name: 'Primary Channel', link: 'https://t.me/Tohidtech6332' },
  { id: -1003867874741, name: 'Community Group', link: 'https://t.me/Tohidtech6333' },
];

// Social Links
const SOCIAL = {
  whatsapp: 'https://whatsapp.com/channel/0029VaGyP933bbVC7G0x0i2T',
  telegram: {
    primary: 'https://t.me/Tohidtech6332',
    group: 'https://t.me/Tohidtech6333',
  },
  developer: 'https://t.me/Tohidkhan6332'
};

// Rate Limiting
const RATE_LIMIT = {
  window: 60000, // 1 minute
  max: 15 // requests per minute
};

// ==================== INITIALIZATION ====================
if (!BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN is not configured. Set it in the environment before starting the Telegram component.");
}
// Telegram polling is started explicitly after clearing any stale webhook.
// This prevents Telegram from remaining in webhook mode and makes polling errors visible.
const bot = new TelegramBot(BOT_TOKEN, { polling: false });
const { initDebug } = require('./debug.js');
initDebug(bot);

let telegramPollingStarted = false;

async function startTelegramPolling() {
  if (telegramPollingStarted) return;
  telegramPollingStarted = true;

  try {
    await bot.deleteWebHook({ drop_pending_updates: false });
    const me = await bot.getMe();
    console.log(`[TELEGRAM] Connected as @${me.username || me.first_name} (${me.id})`);

    await bot.startPolling({
      restart: true,
      params: {
        timeout: 30,
        limit: 100,
        allowed_updates: ['message', 'callback_query']
      }
    });

    console.log('[TELEGRAM] Polling started successfully — waiting for messages...');
  } catch (error) {
    telegramPollingStarted = false;
    console.error('[TELEGRAM] Polling startup failed:', error.message);
    if (error.response?.body) {
      console.error('[TELEGRAM] API response:', JSON.stringify(error.response.body));
    }
  }
}

// Data Stores
let database = {
  admins: [...OWNERS.all.map(id => id.toString())],
  users: new Set(),
  userDetails: {},
  banned: {},
  stats: {
    startTime: Date.now(),
    totalConnections: 0,
    dailyConnections: 0,
    totalUsers: 0,
    totalMessages: 0,
    groupMessages: 0,
    privateMessages: 0,
    failures: 0,
    pairingSpeed: [],
    lastReset: new Date().toDateString()
  },
  reports: [],
  audit: [],
  activeSessions: new Map(),
  maintenance: false,
  // NEW: Premium system stores
  premium: {}, // Format: { "user_id": { expiry, addedBy, addedAt, slots } }
  referrals: {}, // { userId: { code, referredBy, successful, bonusDays } }
  coupons: {} // { CODE: { days, maxUses, uses, createdBy, createdAt } }
};

// Rate Limit Store
const rateLimit = new Map();

// ==================== UTILITY FUNCTIONS ====================

/**
 * Format uptime from milliseconds
 */
const formatUptime = (ms) => {
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const parts = [];
  if (days > 0) parts.push(`${days}ᴅ`);
  if (hours > 0) parts.push(`${hours}ʜ`);
  if (minutes > 0) parts.push(`${minutes}ᴍ`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
};

/**
 * Parse duration string (e.g., "3 days", "1 week", "24 hours")
 */
const parseDuration = (durationStr) => {
  const match = durationStr.match(/^(\d+)\s*(second|minute|hour|day|week|month)s?$/i);
  if (!match) return null;
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  const multipliers = {
    second: 1000,
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000
  };
  
  return value * (multipliers[unit] || multipliers.day);
};

/**
 * Format duration for display
 */
const formatDuration = (ms) => {
  if (ms < 0) return 'Expired';
  
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (minutes > 0 && days === 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
  
  return parts.join(', ') || 'Less than a minute';
};

/**
 * Format number with commas
 */
const formatNumber = (num) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Get time-based greeting
 */
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'ᴍᴏʀɴɪɴɢ', emoji: '🌅' };
  if (hour < 17) return { text: 'ᴀғᴛᴇʀɴᴏᴏɴ', emoji: '☀️' };
  if (hour < 20) return { text: 'ᴇᴠᴇɴɪɴɢ', emoji: '🌆' };
  return { text: 'ɴɪɢʜᴛ', emoji: '🌙' };
};

/**
 * Sanitize user input
 */
const sanitizeInput = (input) => {
  if (!input || typeof input !== 'string') return '';
  return input.replace(/[<>[\]{}()\\;'"`]/g, '').substring(0, 500);
};

/**
 * Validate phone number
 */
const validatePhone = (number) => {
  if (!number || number.trim() === '') {
    return { valid: false, error: 'ᴘʟᴇᴀsᴇ ᴘʀᴏᴠɪᴅᴇ ᴀ ɴᴜᴍʙᴇʀ' };
  }
  
  if (/[a-z]/i.test(number)) {
    return { valid: false, error: 'ʟᴇᴛᴛᴇʀs ɴᴏᴛ ᴀʟʟᴏᴡᴇᴅ' };
  }
  
  if (!/^\d{7,15}$/.test(number.split('|')[0])) {
    return { valid: false, error: 'ɪɴᴠᴀʟɪᴅ ғᴏʀᴍᴀᴛ' };
  }
  
  if (number.startsWith('0')) {
    return { valid: false, error: 'ɴᴏ ʟᴇᴀᴅɪɴɢ ᴢᴇʀᴏ' };
  }
  
  const restricted = ['252', '201', '202'];
  if (restricted.includes(number.slice(0, 3))) {
    return { valid: false, error: 'ᴄᴏᴜɴᴛʀʏ ɴᴏᴛ sᴜᴘᴘᴏʀᴛᴇᴅ' };
  }
  
  return { valid: true };
};

/**
 * Check rate limit
 */
const checkRateLimit = (userId) => {
  const now = Date.now();
  const userLimit = rateLimit.get(userId) || { count: 0, reset: now + RATE_LIMIT.window };
  
  if (now > userLimit.reset) {
    userLimit.count = 0;
    userLimit.reset = now + RATE_LIMIT.window;
  }
  
  if (userLimit.count >= RATE_LIMIT.max) return false;
  
  userLimit.count++;
  rateLimit.set(userId, userLimit);
  return true;
};

/**
 * Permission checks
 */
const isOwner = (userId) => OWNERS.all.includes(Number(userId));
const isAdmin = (userId) => database.admins.includes(userId.toString());

// ==================== PREMIUM SYSTEM FUNCTIONS ====================

const isPremium = (userId) => {
  const userIdStr = userId.toString();
  const premiumData = database.premium[userIdStr];

  if (!premiumData) return false;

  if (premiumData.expiry < Date.now()) {
    delete database.premium[userIdStr];
    saveData();
    return false;
  }

  return true;
};

const hasAccess = (userId) => {
  return isAdmin(userId.toString()) || isOwner(userId) || isPremium(userId);
};

// ==================== PREMIUM-ONLY SERVICE ====================
const getPlanStatus = (userId) => {
  const id = userId.toString();

  if (isOwner(userId)) {
    return { plan: 'owner', active: true, expiry: null, remaining: null };
  }

  if (isAdmin(id)) {
    return { plan: 'admin', active: true, expiry: null, remaining: null };
  }

  if (isPremium(userId)) {
    const expiry = database.premium[id]?.expiry || null;
    return {
      plan: 'premium',
      active: true,
      expiry,
      remaining: expiry ? Math.max(0, expiry - Date.now()) : null
    };
  }

  return { plan: 'premium_required', active: false, expiry: null, remaining: null };
};

const canStartPairing = (userId) => {
  const status = getPlanStatus(userId);
  return status.plan === 'owner' || status.plan === 'admin' || status.plan === 'premium';
};

const formatPlanExpiry = (expiry) => expiry ? new Date(expiry).toLocaleString() : 'N/A';

const sendPlans = async (chatId, userId) => {
  const status = getPlanStatus(userId);
  const current = status.plan === 'premium'
    ? '👑 PREMIUM • EXPIRES: ' + formatPlanExpiry(status.expiry)
    : status.plan === 'owner'
      ? '👑 OWNER'
      : status.plan === 'admin'
        ? '🛡️ ADMIN'
        : '🔒 PREMIUM REQUIRED';

  let planDetails;
  if (status.plan === 'owner') {
    planDetails = `├◆ 👑 *OWNER ACCESS*
├◆ Full system access
├◆ No subscription required
├◆ Owner privileges enabled`;
  } else if (status.plan === 'admin') {
    planDetails = `├◆ 🛡️ *ADMIN ACCESS*
├◆ Full administrative access
├◆ No subscription required
├◆ Admin privileges enabled`;
  } else if (status.plan === 'premium') {
    planDetails = `├◆ 👑 *PREMIUM ONLY*
├◆ Full WhatsApp service access
├◆ Active until: ${formatPlanExpiry(status.expiry)}
├◆ No free or trial access
│
├◆ 💳 Payment is manually verified.
├◆ 📩 Contact: @Tohidkhan6332`;
  } else {
    planDetails = `├◆ 🔒 *PREMIUM REQUIRED*
├◆ Purchase Premium to access the WhatsApp service
├◆ 📩 Contact: @Tohidkhan6332`;
  }

  const text = `┌ ❏ ◆ *⌜𝗧𝗢𝗛𝗜𝗗-𝗕𝗨𝗚 𝗦𝗘𝗥𝗩𝗜𝗖𝗘⌟* ◆
│
├◆ ʏᴏᴜʀ ᴘʟᴀɴ: ${current}
│
${planDetails}
│
└ ❏`;

  return bot.sendMessage(chatId, text, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '👑 ᴘʀᴇᴍɪᴜᴍ', callback_data: 'premium_plans' }],
        [{ text: '🏠 ᴍᴇɴᴜ', callback_data: 'show_main' }]
      ]
    }
  });
};

const grantPremium = async (userId, durationMs, adminId) => {
  const id = userId.toString();
  const currentExpiry = Number(database.premium[id]?.expiry || 0);
  const base = currentExpiry > Date.now() ? currentExpiry : Date.now();

  database.premium[id] = {
    expiry: base + durationMs,
    addedBy: adminId.toString(),
    addedAt: Date.now(),
    slots: Number(database.premium[id]?.slots || 3)
  };

  await saveData();
  addAuditLog('ᴘʀᴇᴍɪᴜᴍ_ᴀᴅᴅ', adminId, id, {
    durationMs,
    expiry: database.premium[id].expiry
  });

  return database.premium[id];
};

/**
 * Send access denied message
 */
const sendAccessDenied = async (chatId) => {
  const message = `┌ ❏ ◆ *⌜𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗⌟* ◆
│
├◆ ⚠️ ᴘʀᴇᴍɪᴜᴍ ᴀᴄᴄᴇss ʀᴇǫᴜɪʀᴇᴅ
├◆ 👑 ᴘᴜʀᴄʜᴀsᴇ ᴘʀᴇᴍɪᴜᴍ ғᴏʀ ғᴜʟʟ ᴀᴄᴄᴇss
├◆
├◆ 📞 ᴄᴏɴᴛᴀᴄᴛ: @Tohidkhan6332
├◆ 📱 ᴛᴇʟᴇɢʀᴀᴍ: ${DEVELOPER_CONTACTS.telegram}
├◆ 💬 ᴡʜᴀᴛsᴀᴘᴘ: ${DEVELOPER_CONTACTS.whatsapp}
│
└ ❏`;

  await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
};

// ==================== FILE OPERATIONS ====================

/**
 * Ensure directories exist
 */
const ensureDirectories = async () => {
  const dirs = [
    PATHS.base,
    PATHS.sessions,
    PATHS.backups,
    path.join(__dirname, 'tohidstore', 'pairing'),
    path.join(__dirname, 'allfunc')
  ];
  
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (err) {
      console.error(`ᴅɪʀᴇᴄᴛᴏʀʏ ᴇʀʀᴏʀ: ${dir}`, err.message);
    }
  }
};

/**
 * Check if file exists
 */
const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

/**
 * Load database
 */
const loadDatabase = async () => {
  // Load admins
  if (await fileExists(PATHS.admin)) {
    try {
      const data = await fs.readFile(PATHS.admin, 'utf8');
      database.admins = [...new Set([...OWNERS.all.map(id => id.toString()), ...JSON.parse(data)])];
    } catch (err) {
      console.error('ᴀᴅᴍɪɴ ʟᴏᴀᴅ ᴇʀʀᴏʀ:', err.message);
    }
  } else {
    await fs.writeFile(PATHS.admin, JSON.stringify(database.admins, null, 2));
  }

  // Load users
  if (await fileExists(PATHS.users)) {
    try {
      const data = await fs.readFile(PATHS.users, 'utf8');
      database.users = new Set(JSON.parse(data));
      database.stats.totalUsers = database.users.size;
    } catch (err) {
      console.error('ᴜsᴇʀs ʟᴏᴀᴅ ᴇʀʀᴏʀ:', err.message);
    }
  }

  // Load user details
  if (await fileExists(PATHS.userDetails)) {
    try {
      database.userDetails = JSON.parse(await fs.readFile(PATHS.userDetails, 'utf8'));
    } catch (err) {
      console.error('ᴜsᴇʀ ᴅᴇᴛᴀɪʟs ʟᴏᴀᴅ ᴇʀʀᴏʀ:', err.message);
    }
  }

  // Load banned
  if (await fileExists(PATHS.banned)) {
    try {
      database.banned = JSON.parse(await fs.readFile(PATHS.banned, 'utf8'));
    } catch (err) {
      console.error('ʙᴀɴɴᴇᴅ ʟᴏᴀᴅ ᴇʀʀᴏʀ:', err.message);
    }
  }

  // Load stats
  if (await fileExists(PATHS.stats)) {
    try {
      database.stats = JSON.parse(await fs.readFile(PATHS.stats, 'utf8'));
      const today = new Date().toDateString();
      if (database.stats.lastReset !== today) {
        database.stats.dailyConnections = 0;
        database.stats.lastReset = today;
      }
    } catch (err) {
      console.error('sᴛᴀᴛs ʟᴏᴀᴅ ᴇʀʀᴏʀ:', err.message);
    }
  }

  // Load maintenance
  if (await fileExists(PATHS.maintenance)) {
    try {
      database.maintenance = JSON.parse(await fs.readFile(PATHS.maintenance, 'utf8')).enabled || false;
    } catch (err) {
      console.error('ᴍᴀɪɴᴛᴇɴᴀɴᴄᴇ ʟᴏᴀᴅ ᴇʀʀᴏʀ:', err.message);
    }
  }

  // Load reports
  if (await fileExists(PATHS.reports)) {
    try {
      database.reports = JSON.parse(await fs.readFile(PATHS.reports, 'utf8'));
    } catch (err) {
      console.error('ʀᴇᴘᴏʀᴛs ʟᴏᴀᴅ ᴇʀʀᴏʀ:', err.message);
    }
  }

  // Load audit
  if (await fileExists(PATHS.audit)) {
    try {
      database.audit = JSON.parse(await fs.readFile(PATHS.audit, 'utf8'));
    } catch (err) {
      console.error('ᴀᴜᴅɪᴛ ʟᴏᴀᴅ ᴇʀʀᴏʀ:', err.message);
    }
  }

  // NEW: Load premium data
  if (await fileExists(PATHS.premium)) {
    try {
      database.premium = JSON.parse(await fs.readFile(PATHS.premium, 'utf8'));
    } catch (err) {
      console.error('ᴘʀᴇᴍɪᴜᴍ ʟᴏᴀᴅ ᴇʀʀᴏʀ:', err.message);
      database.premium = {};
    }
  } else {
    await fs.writeFile(PATHS.premium, JSON.stringify(database.premium, null, 2));
  }

  // Premium-only service; no free/trial mode.

  // Load referral data
  if (await fileExists(PATHS.referrals)) {
    try { database.referrals = JSON.parse(await fs.readFile(PATHS.referrals, 'utf8')); } catch { database.referrals = {}; }
  }
  if (await fileExists(PATHS.coupons)) {
    try { database.coupons = JSON.parse(await fs.readFile(PATHS.coupons, 'utf8')); } catch { database.coupons = {}; }
  }



};

/**
 * Save database
 */
const saveData = async () => {
  try {
    await Promise.all([
      fs.writeFile(PATHS.admin, JSON.stringify(database.admins, null, 2)),
      fs.writeFile(PATHS.users, JSON.stringify([...database.users], null, 2)),
      fs.writeFile(PATHS.userDetails, JSON.stringify(database.userDetails, null, 2)),
      fs.writeFile(PATHS.banned, JSON.stringify(database.banned, null, 2)),
      fs.writeFile(PATHS.stats, JSON.stringify(database.stats, null, 2)),
      fs.writeFile(PATHS.maintenance, JSON.stringify({ enabled: database.maintenance }, null, 2)),
      fs.writeFile(PATHS.reports, JSON.stringify(database.reports, null, 2)),
      fs.writeFile(PATHS.audit, JSON.stringify(database.audit.slice(-SYSTEM.maxLogs), null, 2)),
      // Save premium, referral and coupon data
      fs.writeFile(PATHS.premium, JSON.stringify(database.premium, null, 2)),
      fs.writeFile(PATHS.referrals, JSON.stringify(database.referrals, null, 2)),
      fs.writeFile(PATHS.coupons, JSON.stringify(database.coupons, null, 2))
    ]);
  } catch (err) {
    console.error('sᴀᴠᴇ ᴇʀʀᴏʀ:', err.message);
  }
};

// ==================== USER TRACKING ====================

/**
 * Track user activity
 */
const trackUser = async (userId, userName = 'ᴜsᴇʀ', isGroup = false) => {
  const userIdStr = userId.toString();
  
  if (!database.users.has(userIdStr)) {
    database.users.add(userIdStr);
    database.stats.totalUsers = database.users.size;
    
    database.userDetails[userIdStr] = {
      name: userName,
      joined: new Date().toISOString(),
      messages: 1,
      lastActive: new Date().toISOString(),
      pairs: 0,
      groupMessages: isGroup ? 1 : 0,
      privateMessages: isGroup ? 0 : 1,
      // NEW: Track premium status in user details
      premium: isPremium(userIdStr),
      bots: []
    };
    
    console.log(chalk.green(`➕ ɴᴇᴡ ᴜsᴇʀ: ${userName} (${userIdStr})`));
  } else {
    if (database.userDetails[userIdStr]) {
      database.userDetails[userIdStr].messages++;
      database.userDetails[userIdStr].lastActive = new Date().toISOString();
      if (isGroup) {
        database.userDetails[userIdStr].groupMessages++;
      } else {
        database.userDetails[userIdStr].privateMessages++;
      }
      // Update premium status
      database.userDetails[userIdStr].premium = isPremium(userIdStr);
    }
  }
  
  database.stats.totalMessages++;
  if (isGroup) database.stats.groupMessages++;
  else database.stats.privateMessages++;
  
  await saveData();
};

// ==================== BAN CHECK ====================

/**
 * Check if user is banned
 */
const checkBanned = async (userId, chatId = null) => {
  const userIdStr = userId.toString();
  
  if (database.banned[userIdStr]) {
    if (chatId) {
      await bot.sendMessage(chatId, 
        `┌ ❏ ◆ *⌜𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗⌟* ◆\n│\n├◆ ʏᴏᴜ ʜᴀᴠᴇ ʙᴇᴇɴ ʙᴀɴɴᴇᴅ\n├◆ ʀᴇᴀsᴏɴ: ${database.banned[userIdStr].reason || 'ᴠɪᴏʟᴀᴛɪᴏɴ ᴏғ ᴛᴇʀᴍs'}\n│\n└ ❏`,
        { parse_mode: 'Markdown' }
      );
    }
    return true;
  }
  return false;
};

// ==================== MEMBERSHIP VERIFICATION ====================

/**
 * Verify channel membership
 */
const verifyMembership = async (userId) => {
  try {
    const result = {
      verified: true,
      missing: []
    };
    
    for (const channel of REQUIRED_CHANNELS) {
      try {
        const member = await bot.getChatMember(channel.id, userId);
        const valid = ['member', 'administrator', 'creator'].includes(member.status);
        if (!valid) {
          result.verified = false;
          result.missing.push(channel.name);
        }
      } catch {
        result.verified = false;
        result.missing.push(channel.name);
      }
    }
    
    return result;
  } catch (error) {
    console.error('ᴍᴇᴍʙᴇʀsʜɪᴘ ᴄʜᴇᴄᴋ ᴇʀʀᴏʀ:', error.message);
    return {
      verified: false,
      missing: REQUIRED_CHANNELS.map(c => c.name)
    };
  }
};

// ==================== SESSION MANAGEMENT ====================

/**
 * Get all sessions
 */
const getSessions = async () => {
  try {
    const entries = await fs.readdir(PATHS.sessions, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory() && entry.name.includes('@s.whatsapp.net'))
      .map(entry => entry.name);
  } catch {
    return [];
  }
};

/**
 * Get detailed session information with status
 */
const getSessionDetails = async () => {
  try {
    const entries = await fs.readdir(PATHS.sessions, { withFileTypes: true });
    const sessions = [];
    
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.includes('@s.whatsapp.net')) continue;
      
      const sessionPath = path.join(PATHS.sessions, entry.name);
      const credsPath = path.join(sessionPath, 'creds.json');
      
      let status = 'ɪɴᴀᴄᴛɪᴠᴇ';
      let name = 'ᴜɴᴋɴᴏᴡɴ';
      let lastActive = null;
      
      if (await fileExists(credsPath)) {
        try {
          const creds = JSON.parse(await fs.readFile(credsPath, 'utf8'));
          if (creds.me && creds.me.id) {
            status = 'ᴀᴄᴛɪᴠᴇ ✅';
            name = creds.me.name || 'ᴜɴᴋɴᴏᴡɴ';
            lastActive = creds.lastActive || null;
          } else {
            status = 'ᴄᴏʀʀᴜᴘᴛᴇᴅ ❌';
          }
        } catch (e) {
          status = 'ᴄᴏʀʀᴜᴘᴛᴇᴅ ❌';
        }
      } else {
        status = 'ɪɴᴄᴏᴍᴘʟᴇᴛᴇ ⚠️';
      }
      
      sessions.push({
        jid: entry.name,
        number: entry.name.split('@')[0],
        name,
        status,
        lastActive,
        path: sessionPath
      });
    }
    
    return sessions;
  } catch (error) {
    console.error('sᴇssɪᴏɴ ᴅᴇᴛᴀɪʟs ᴇʀʀᴏʀ:', error.message);
    return [];
  }
};

/**
 * Delete session
 */
const deleteSession = async (phone) => {
  const sessionPath = path.join(PATHS.sessions, `${phone}@s.whatsapp.net`);
  try {
    if (await fileExists(sessionPath)) {
      await fs.rm(sessionPath, { recursive: true, force: true });
      return true;
    }
  } catch (err) {
    console.error('sᴇssɪᴏɴ ᴅᴇʟᴇᴛɪᴏɴ ᴇʀʀᴏʀ:', err.message);
  }
  return false;
};

// ==================== AUDIT LOGGING ====================

/**
 * Add audit log entry
 */
const addAuditLog = (action, userId, target = null, details = {}) => {
  database.audit.push({
    timestamp: new Date().toISOString(),
    action,
    userId,
    target,
    details
  });
  
  if (database.audit.length > SYSTEM.maxLogs) {
    database.audit = database.audit.slice(-SYSTEM.maxLogs);
  }
  
  saveData();
};

// ==================== GROUP MESSAGE HANDLER ====================

/**
 * Handle group messages
 */
const handleGroupMessage = async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const mention = msg.from.username ? `@${msg.from.username}` : `[${msg.from.first_name}](tg://user?id=${userId})`;
  
  await bot.sendMessage(chatId, 
    `${mention} ┌ ❏ ◆ *⌜𝗗𝗠 𝗥𝗘𝗤𝗨𝗜𝗥𝗘𝗗⌟* ◆\n│\n├◆ ᴘʟᴇᴀsᴇ ᴜsᴇ ᴍᴇ ɪɴ ᴘʀɪᴠᴀᴛᴇ ᴄʜᴀᴛ\n├◆ ғᴏʀ ғᴜʟʟ ғᴜɴᴄᴛɪᴏɴᴀʟɪᴛʏ\n│\n└ ❏`,
    {
      parse_mode: 'Markdown',
      reply_to_message_id: msg.message_id,
      reply_markup: {
        inline_keyboard: [
          [{ text: '💬 ᴄʜᴀᴛ ᴘʀɪᴠᴀᴛᴇʟʏ', url: `https://t.me/${(await bot.getMe()).username}` }]
        ]
      }
    }
  );
};

// ==================== MAIN MENU ====================

/**
 * Send main menu
 */
async function sendMainMenu(chatId, userId, userName, isAdminUser = false, isOwnerUser = false) {
  let menu = '';
  let keyboard = { inline_keyboard: [] };

  try {
    const greeting = getGreeting();
    const uptime = formatUptime(Date.now() - database.stats.startTime);
    const sessions = await getSessions();
    const userPremium = isPremium(userId);

    // === MENU BASE ===
    menu = `┌ ❏ ◆ *⌜𝗠𝗔𝗜𝗡 𝗠𝗘𝗡𝗨⌟* ◆
│
├◆ ${greeting.emoji} ɢᴏᴏᴅ ${greeting.text}, ${userName}
├◆ ᴛᴏʜɪᴅ-ᴀɪ • ᴡʜᴀᴛsᴀᴘᴘ ᴘᴀɪʀɪɴɢ sʏsᴛᴇᴍ
├◆ ᴏᴡɴᴇʀ: 𝕄ℝ 𝕋𝕆ℍ𝕀𝔻
├◆ ᴅᴇᴠᴇʟᴏᴘᴇʀ: 𝕄ℝ 𝕋𝕆ℍ𝕀𝔻
├◆ sᴜᴘᴘᴏʀᴛ: @Tohidkhan6332
├◆ sᴇᴄᴜʀᴇ • ғᴀsᴛ • ʀᴇʟɪᴀʙʟᴇ
│
└ ❏
┌ ❏ ◆ *⌜𝗦𝗬𝗦𝗧𝗘𝗠 𝗜𝗡𝗙𝗢⌟* ◆
│
├◆ ᴜᴘᴛɪᴍᴇ: ${uptime}
├◆ ᴜsᴇʀs: ${formatNumber(database.stats.totalUsers)}
├◆ sᴇssɪᴏɴs: ${sessions.length}/${SYSTEM.sessionLimit}
├◆ ᴛᴏᴅᴀʏ: ${formatNumber(database.stats.dailyConnections)}`;

    // === PREMIUM STATUS ===
    if (!isAdminUser && !isOwnerUser) {
      const premData = database.premium?.[userId.toString()];
      if (userPremium && premData?.expiry) {
        menu += `\n├◆ 👑 ᴘʀᴇᴍɪᴜᴍ: ᴀᴄᴛɪᴠᴇ (ᴇxᴘɪʀᴇs: ${new Date(premData.expiry).toLocaleDateString()})`;
      } else {
        menu += '\n├◆ 🔒 ᴘʀᴇᴍɪᴜᴍ: ʀᴇǫᴜɪʀᴇᴅ';
      }
    }

    // === QUICK ACTION ===
    menu += `
│
└ ❏
┌ ❏ ◆ *⌜𝗤𝗨𝗜𝗖𝗞 𝗔𝗖𝗧𝗜𝗢𝗡𝗦⌟* ◆
│
├◆ /pair    - ᴘᴀɪʀ ᴡʜᴀᴛsᴀᴘᴘ
├◆ /unpair  - ʀᴇᴍᴏᴠᴇ sᴇssɪᴏɴ
├◆ /restartbot NUMBER - ʀᴇsᴛᴀʀᴛ ʏᴏᴜʀ ʙᴏᴛ
├◆ /ping    - ʟᴀᴛᴇɴᴄʏ ᴄʜᴇᴄᴋ
├◆ /runtime - sʏsᴛᴇᴍ ᴜᴘᴛɪᴍᴇ
├◆ /stats   - ʙᴏᴛ sᴛᴀᴛɪsᴛɪᴄs
├◆ /report  - ᴄᴏɴᴛᴀᴄᴛ sᴜᴘᴘᴏʀᴛ
├◆ /plans   - ᴘʀᴇᴍɪᴜᴍ sᴇʀᴠɪᴄᴇ ᴘʟᴀɴ
├◆ /myplan  - ʏᴏᴜʀ ᴘʟᴀɴ
├◆ /tutorial - ᴠɪᴅᴇᴏ ɢᴜɪᴅᴇ
├◆ /dashboard - ᴜsᴇʀ ᴅᴀsʜʙᴏᴀʀᴅ
├◆ /restartbot NUMBER - ʀᴇsᴛᴀʀᴛ ʏᴏᴜʀ ʙᴏᴛ
├◆ /referral - ʀᴇғᴇʀʀᴀʟ ᴄᴏᴅᴇ
├◆ /coupon CODE - ʀᴇᴅᴇᴇᴍ ᴄᴏᴜᴘᴏɴ
├◆ /help    - ᴄᴏᴍᴍᴀɴᴅ ʟɪsᴛ
│
└ ❏`;

    // === ADMIN ===
    if (isAdminUser || isOwnerUser) {
      menu += `
┌ ❏ ◆ *⌜𝗔𝗗𝗠𝗜𝗡 𝗖𝗢𝗡𝗧𝗥𝗢𝗟⌟* ◆
│
├◆ /users
├◆ /listpair
├◆ /broadcast
├◆ /clean
├◆ /ban
├◆ /unban
├◆ /checkuser
├◆ /addpremium USER_ID 30 days
├◆ /delpremium USER_ID
├◆ /premiumusers
├◆ /maintenance
├◆ /logs
├◆ /announce
│
└ ❏`;
    }

    // === OWNER ===
    if (isOwnerUser) {
      menu += `
┌ ❏ ◆ *⌜𝗢𝗪𝗡𝗘𝗥 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦⌟* ◆
│
├◆ /addadmin
├◆ /removeadmin
├◆ /settutorial <ᴛᴇʟᴇɢʀᴀᴍ ᴘᴏsᴛ ʟɪɴᴋ>
├◆ /tutorialstatus
├◆ /deltutorial
├◆ /restart
├◆ /update

│
└ ❏`;
    }

    // === FOOTER ===
    menu += `
┌ ❏ ◆ *⌜𝗣𝗢𝗪𝗘𝗥𝗘𝗗 𝗕𝗬⌟* ◆
│
├◆ ${SYSTEM.creator}
│
└ ❏`;

    // === SAFE URL FUNCTION ===
    const safeUrl = (url) => {
      if (!url) return null;
      return url.startsWith('http') ? url : `https://${url}`;
    };

    // === KEYBOARD FIX ===
    keyboard.inline_keyboard = [
      [
        { text: '🔗 ᴘᴀɪʀ', callback_data: 'pair_guide' },
        { text: '📖 ᴛᴜᴛᴏʀɪᴀʟ', callback_data: 'show_tutorial' },
        { text: '📊 sᴛᴀᴛs', callback_data: 'bot_stats' }
      ],
      [
        { text: '👑 ᴘʟᴀɴs', callback_data: 'premium_plans' },
        { text: '🐞 ʙᴜɢ ᴍᴇɴᴜ', callback_data: 'show_bug_menu' },
        { text: '⚙️ ᴍɪsᴄ ᴍᴇɴᴜ', callback_data: 'misc_menu' },
        { text: '📊 ᴅᴀsʜʙᴏᴀʀᴅ', callback_data: 'user_dashboard' }
      ],
      [
        ...(safeUrl(SOCIAL?.telegram?.primary) ? [{
          text: '📢 ᴄʜᴀɴɴᴇʟ 1',
          url: safeUrl(SOCIAL.telegram.primary)
        }] : [])
      ],
      [
        ...(safeUrl(SOCIAL?.telegram?.group) ? [{
          text: '👥 ɢʀᴏᴜᴘ',
          url: safeUrl(SOCIAL.telegram.group)
        }] : [])
      ],
      [
        { text: '👨‍💻 ᴅᴇᴠᴇʟᴏᴘᴇʀ', url: 'https://t.me/Tohidkhan6332' }
      ]
    ];

    const randomImage = ASSETS.menuImages[Math.floor(Math.random() * ASSETS.menuImages.length)];

    await bot.sendPhoto(chatId, randomImage, {
      caption: menu,
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

  } catch (err) {
    console.error('[sendMainMenu ERROR]:', err);

    // Keep the inline keyboard even if Telegram cannot fetch the remote menu image.
    await bot.sendMessage(chatId, menu || '⚠️ Menu gagal dimuat', {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }
}

// ==================== MEMBERSHIP REQUIREMENT ====================

/**
 * Send membership required message
 */
const sendMembershipRequired = async (chatId, verification, userName) => {
  const greeting = getGreeting();
  
  const missingList = verification.missing.map(ch => `├◆ ❌ ${ch}`).join('\n');
  
  const message = `┌ ❏ ◆ *⌜𝗩𝗘𝗥𝗜𝗙𝗜𝗖𝗔𝗧𝗜𝗢𝗡 𝗥𝗘𝗤𝗨𝗜𝗥𝗘𝗗⌟* ◆
│
├◆ ${greeting.emoji} ʜᴇʟʟᴏ, ${userName}
├◆ ᴊᴏɪɴ ᴀʟʟ ᴄʜᴀɴɴᴇʟs ᴛᴏ ᴘʀᴏᴄᴇᴇᴅ
│
└ ❏
┌ ❏ ◆ *⌜𝗠𝗜𝗦𝗦𝗜𝗡𝗚 𝗖𝗛𝗔𝗡𝗡𝗘𝗟𝗦⌟* ◆
│
${missingList}
│
└ ❏
┌ ❏ ◆ *⌜𝗜𝗡𝗦𝗧𝗥𝗨𝗖𝗧𝗜𝗢𝗡𝗦⌟* ◆
│
├◆ ᴊᴏɪɴ ᴀʟʟ ᴄʜᴀɴɴᴇʟs ᴀʙᴏᴠᴇ
├◆ ᴛʜᴇɴ ᴄʟɪᴄᴋ ᴠᴇʀɪғʏ ʙᴇʟᴏᴡ
│
└ ❏`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '📢 ᴄʜᴀɴɴᴇʟ 1', url: SOCIAL.telegram.primary },
      ],
      [
        { text: '👥 ɢʀᴏᴜᴘ', url: SOCIAL.telegram.group },
      ],
      [{ text: '✅ ᴠᴇʀɪғʏ', callback_data: 'verify_membership' }]
    ]
  };

  try {
    await bot.sendPhoto(chatId, "https://i.ibb.co/Jw3HdHnv/upload-1790713792397-6bec7590-jpg.jpg", {
      caption: message,
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } catch {
    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }
};

// ==================== PREMIUM SERVICE DASHBOARD ====================

const getUserBots = (userId) => {
  const details = database.userDetails[userId.toString()] || {};
  return Array.isArray(details.bots) ? details.bots : [];
};

const getSlotLimit = (userId) => {
  const id = userId.toString();
  if (isOwner(userId) || isAdmin(id)) return 100;
  return Number(database.premium[id]?.slots || 3);
};

const sendDashboard = async (chatId, userId) => {
  const id = userId.toString();
  const status = getPlanStatus(userId);
  const bots = getUserBots(userId);
  const active = bots.filter(number => Boolean(getActiveConnection(number))).length;
  const slotLimit = getSlotLimit(userId);
  const privileged = isOwner(userId) || isAdmin(id);
  const globalBots = getActiveConnections().length;

  let text = `┌ ❏ ◆ *⌜𝗨𝗦𝗘𝗥 𝗗𝗔𝗦𝗛𝗕𝗢𝗔𝗥𝗗⌟* ◆
│
├◆ 👤 ᴜsᴇʀ: ${id}
├◆ 👑 ᴘʟᴀɴ: ${status.plan.toUpperCase()}
├◆ 🤖 ʙᴏᴛs: ${active}/${slotLimit}
`;

  if (status.expiry) {
    text += `├◆ ⏳ ᴇxᴘɪʀʏ: ${formatPlanExpiry(status.expiry)}
├◆ 🕐 ʀᴇᴍᴀɪɴɪɴɢ: ${formatDuration(status.remaining)}
`;
  } else {
    text += `├◆ 🔐 ᴀᴄᴄᴇss: ${status.plan === 'premium_required' ? 'PREMIUM REQUIRED' : 'FULL ACCESS'}
`;
  }

  text += '│\\n└ ❏';

  return bot.sendMessage(chatId, text, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📱 ᴍʏ ʙᴏᴛs', callback_data: 'my_bots' }],
        [{ text: '👑 ᴍʏ ᴘʟᴀɴ', callback_data: 'premium_plans' }, { text: '🏠 ᴍᴇɴᴜ', callback_data: 'show_main' }]
      ]
    }
  });
};

const sendMyBots = async (chatId, userId) => {
  const bots = getUserBots(userId);
  if (!bots.length) {
    return bot.sendMessage(chatId,
      '┌ ❏ ◆ *⌜𝗠𝗬 𝗕𝗢𝗧𝗦⌟* ◆\\n│\\n├◆ ɴᴏ ʙᴏᴛs ᴀssɪɢɴᴇᴅ ʏᴇᴛ\\n├◆ ᴜsᴇ /pair NUMBER ᴛᴏ ᴀᴅᴅ ᴀ ʙᴏᴛ\\n│\\n└ ❏',
      { parse_mode: 'Markdown' }
    );
  }

  const lines = bots.map((number, index) => {
    const connected = Boolean(getActiveConnection(number));
    return `├◆ ${index + 1}. +${number} — ${connected ? '🟢 ᴏɴʟɪɴᴇ' : '🔴 ᴏғғʟɪɴᴇ'}`;
  }).join('\\n');

  return bot.sendMessage(chatId,
    `┌ ❏ ◆ *⌜𝗠𝗬 𝗕𝗢𝗧𝗦⌟* ◆
│
${lines}
│
└ ❏`,
    { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '📊 ᴅᴀsʜʙᴏᴀʀᴅ', callback_data: 'user_dashboard' }]] } }
  );
};

bot.onText(/^\/dashboard(?:@[\w_]+)?$/i, async (msg) => {
  if (msg.chat.type !== 'private') return bot.sendMessage(msg.chat.id, '💬 Please use /dashboard in private chat.');
  if (await checkBanned(msg.from.id, msg.chat.id)) return;
  return sendDashboard(msg.chat.id, msg.from.id);
});

bot.onText(/^\/referral(?:@[\w_]+)?$/i, async (msg) => {
  const id = msg.from.id.toString();
  if (!database.referrals[id]) {
    database.referrals[id] = { code: 'TOHID-' + id, referredBy: null, successful: 0, bonusDays: 0 };
    await saveData();
  }
  const data = database.referrals[id];
  return bot.sendMessage(msg.chat.id,
    `🎁 *REFERRAL*
\n\nYour code: \`ref_${data.code}\`
\nShare it with new users. Successful paid activations can be credited by the owner.`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/^\/coupon(?:@[\w_]+)?(?:\s+(.+))?$/i, async (msg, match) => {
  const id = msg.from.id.toString();
  const code = String(match?.[1] || '').trim().toUpperCase();
  if (!code) return bot.sendMessage(msg.chat.id, 'Usage: /coupon CODE');
  const coupon = database.coupons[code];
  if (!coupon || Number(coupon.uses || 0) >= Number(coupon.maxUses || 1)) {
    return bot.sendMessage(msg.chat.id, '❌ Invalid or already used coupon.');
  }
  if (isOwner(msg.from.id) || isAdmin(id)) return bot.sendMessage(msg.chat.id, 'ℹ️ Admin accounts do not need coupons.');
  const current = Number(database.premium[id]?.expiry || 0);
  const base = current > Date.now() ? current : Date.now();
  database.premium[id] = {
    ...(database.premium[id] || {}),
    expiry: base + Number(coupon.days) * 86400000,
    slots: Number(database.premium[id]?.slots || 3),
    addedBy: database.premium[id]?.addedBy || 'coupon',
    addedAt: database.premium[id]?.addedAt || Date.now()
  };
  coupon.uses = Number(coupon.uses || 0) + 1;
  await saveData();
  return bot.sendMessage(msg.chat.id, `✅ Coupon applied.\\n👑 Premium bonus: ${coupon.days} day(s)\\n📅 Expiry: ${formatPlanExpiry(database.premium[id].expiry)}`);
});

bot.onText(/^\/createcoupon(?:@[\w_]+)?(?:\s+(.+))?$/i, async (msg, match) => {
  if (!isAdmin(msg.from.id.toString()) && !isOwner(msg.from.id)) return bot.sendMessage(msg.chat.id, '❌ Admin only.');
  const args = String(match?.[1] || '').trim().split(/\\s+/);
  const code = String(args.shift() || '').toUpperCase();
  const days = Number(args.shift());
  const maxUses = Number(args.shift() || 1);
  if (!/^[A-Z0-9_-]{3,32}$/.test(code) || !Number.isFinite(days) || days <= 0 || !Number.isFinite(maxUses) || maxUses <= 0) {
    return bot.sendMessage(msg.chat.id, 'Usage: /createcoupon CODE DAYS MAX_USES');
  }
  database.coupons[code] = { days, maxUses, uses: 0, createdBy: msg.from.id.toString(), createdAt: Date.now() };
  await saveData();
  return bot.sendMessage(msg.chat.id, `✅ Coupon created: ${code}\\n🎁 ${days} day(s)\\n🔢 Uses: ${maxUses}`);
});

bot.onText(/^\/coupons(?:@[\w_]+)?$/i, async (msg) => {
  if (!isAdmin(msg.from.id.toString()) && !isOwner(msg.from.id)) return bot.sendMessage(msg.chat.id, '❌ Admin only.');
  const entries = Object.entries(database.coupons);
  if (!entries.length) return bot.sendMessage(msg.chat.id, '🎟️ No coupons.');
  return bot.sendMessage(msg.chat.id, '🎟️ *COUPONS*\\n\\n' + entries.map(([code, d]) => `${code} — ${d.days}d — ${d.uses}/${d.maxUses}`).join('\\n'), { parse_mode: 'Markdown' });
});

// // ==================== SERVICE PLAN COMMANDS ====================
bot.onText(/\/plans/, async (msg) => {
  const userId = msg.from.id;
  if (msg.chat.type !== 'private') return bot.sendMessage(msg.chat.id, '💬 Please use /plans in private chat.');
  if (await checkBanned(userId, msg.chat.id)) return;
  return sendPlans(msg.chat.id, userId);
});

bot.onText(/\/myplan/, async (msg) => {
  const userId = msg.from.id;
  if (msg.chat.type !== 'private') return bot.sendMessage(msg.chat.id, '💬 Please use /myplan in private chat.');
  if (await checkBanned(userId, msg.chat.id)) return;
  const status = getPlanStatus(userId);
  const pairsUsed = Number(database.userDetails[userId.toString()]?.pairs || 0);
  let text = `┌ ❏ ◆ *⌜𝗠𝗬 𝗣𝗟𝗔𝗡⌟* ◆
│
├◆ ᴘʟᴀɴ: ${status.plan.toUpperCase()}
├◆ ᴘᴀɪʀɪɴɢs ᴜsᴇᴅ: ${pairsUsed}`;
  if (status.expiry) text += `├◆ ᴇxᴘɪʀʏ: ${formatPlanExpiry(status.expiry)}
├◆ ʀᴇᴍᴀɪɴɪɴɢ: ${formatDuration(status.remaining)}`;
  else if (status.plan === 'premium_required') text += '├◆ ᴘʀᴇᴍɪᴜᴍ: ʀᴇǫᴜɪʀᴇᴅ\\n';
  text += '│\\n└ ❏';
  return bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '👑 ᴜᴘɢʀᴀᴅᴇ', callback_data: 'premium_plans' }]] } });
});
// ==================== COMMAND: START ====================

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userName = msg.from.first_name || 'ᴜsᴇʀ';
  const isGroup = msg.chat.type !== 'private';

  if (!checkRateLimit(userId)) {
    return bot.sendMessage(chatId, `┌ ❏ ◆ *⌜𝗥𝗔𝗧𝗘 𝗟𝗜𝗠𝗜𝗧⌟* ◆\n│\n├◆ ᴛᴏᴏ ᴍᴀɴʏ ʀᴇǫᴜᴇsᴛs\n├◆ ᴘʟᴇᴀsᴇ ᴡᴀɪᴛ\n│\n└ ❏`, { parse_mode: 'Markdown' });
  }

  if (await checkBanned(userId, chatId)) return;
  await trackUser(userId, userName, isGroup);

  if (isGroup) {
    return handleGroupMessage(msg);
  }

  // Check channel membership for non-admin users
  if (!isAdmin(userId.toString()) && !isOwner(userId)) {
    const verification = await verifyMembership(userId);
    if (!verification.verified) {
      return sendMembershipRequired(chatId, verification, userName);
    }
  }

  await sendMainMenu(chatId, userId, userName, isAdmin(userId.toString()), isOwner(userId));
});

// ==================== BUG MENU HELPERS ====================
const BUG_MENU_IMAGE = ASSETS.menuImages?.[0] || "https://github.com/Tohidkhan6332.png";

const BUG_MENU_TEXT = `┏━◆𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 - 𝐁𝐔𝐆◆━┓
│❖ /tohid-invis 9178xxxxxxx
│❖ /tohid-fcnew 9178xxxxxxx
│❖ /tohid-bulldozer 9178xxxxxx
│❖ /tohid-ios 9178xxxxxxxx
│❖ /tohid-iosnew 9178xxxxx
│❖ /tohid-delay 9178xxxxxxx
│❖ /tohid-andro 9178xxxxxxx
│❖ /tohid-blank 9178xxxxxxxx
│❖ /tohid-visibale 9178xxxxxx
│❖ /xgroup link
│❖ /groupban link
┗━━━━━━━━━━━━━━┛`;

async function sendBugMenu(chatId) {
  const target = getActiveConnection();

  if (!target) {
    return bot.sendPhoto(chatId, BUG_MENU_IMAGE, {
      caption: `┌ ❏ ◆ *⌜𝗪𝗛𝗔𝗧𝗦𝗔𝗣𝗣 𝗡𝗢𝗧 𝗖𝗢𝗡𝗡𝗘𝗖𝗧𝗘𝗗⌟* ◆
│
├◆ ❌ WhatsApp is not connected yet
├◆ 🔗 Please connect WhatsApp first
│
├◆ ᴜsᴇ: /pair 917849917350
│
└ ❏`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔗 ᴄᴏɴɴᴇᴄᴛ ᴡʜᴀᴛsᴀᴘᴘ', callback_data: 'pair_guide' }]
        ]
      }
    });
  }

  return bot.sendPhoto(chatId, BUG_MENU_IMAGE, {
    caption: BUG_MENU_TEXT,
    parse_mode: 'Markdown'
  });
}

// ==================== TELEGRAM → WHATSAPP BUG COMMAND BRIDGE ====================
// Owner-only. These are the only WhatsApp BUG commands exposed directly on Telegram.
const TELEGRAM_BUG_COMMANDS = new Set([
  'tohid-invis',
  'tohid-fcnew',
  'tohid-bulldozer',
  'tohid-ios',
  'tohid-iosnew',
  'tohid-delay',
  'tohid-andro',
  'tohid-blank',
  'tohid-visibale',
  'xgroup',
  'groupban'
]);

const TELEGRAM_NATIVE_COMMANDS = new Set([
  'start', 'pair', 'unpair', 'listpair', 'addadmin', 'deladmin',
  'admins', 'users', 'broadcast', 'help', 'menu', 'allmenu',
  'plans', 'myplan', 'addpremium', 'delpremium', 'premiumusers',
  'misc', 'dashboard', 'referral', 'coupon', 'createcoupon', 'coupons', 'restartbot'
]);

bot.onText(/^\/([a-zA-Z0-9_-]+)(?:@[^\s]+)?(?:\s+([\s\S]+))?$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  const commandName = (match?.[1] || '').toLowerCase();
  const args = (match?.[2] || '').trim();

  if (TELEGRAM_NATIVE_COMMANDS.has(commandName)) return;
  if (!TELEGRAM_BUG_COMMANDS.has(commandName)) return;

  if (!isOwner(userId)) {
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗⌟* ◆
│
├◆ ᴏᴡɴᴇʀ ᴏɴʟʏ
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  const target = getActiveConnection();

  // Every BUG command requires an active WhatsApp connection first.
  if (!target) {
    return bot.sendMessage(chatId,
      `❌ WhatsApp is not connected yet.
🔗 Please connect WhatsApp first.

Use: /pair 9178XXXXXXXXX`,
      { parse_mode: 'Markdown' }
    );
  }

  // If WhatsApp is connected but the command arguments are missing,
  // show the correct usage example for that specific command.
  if (!args) {
    const examples = {
      'tohid-invis': '/tohid-invis 9178XXXXXXXXX',
      'tohid-fcnew': '/tohid-fcnew 9178XXXXXXXXX',
      'tohid-bulldozer': '/tohid-bulldozer 9178XXXXXXXXX',
      'tohid-ios': '/tohid-ios 9178XXXXXXXXX',
      'tohid-iosnew': '/tohid-iosnew 9178XXXXXXXXX',
      'tohid-delay': '/tohid-delay 9178XXXXXXXXX',
      'tohid-andro': '/tohid-andro 9178XXXXXXXXX',
      'tohid-blank': '/tohid-blank 9178XXXXXXXXX',
      'tohid-visibale': '/tohid-visibale 9178XXXXXXXXX',
      'xgroup': '/xgroup https://chat.whatsapp.com/XXXXXXXXXXXX',
      'groupban': '/groupban https://chat.whatsapp.com/XXXXXXXXXXXX'
    };

    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗖𝗢𝗠𝗠𝗔𝗡𝗗 𝗨𝗦𝗔𝗚𝗘⌟* ◆
│
├◆ ᴜsᴀɢᴇ: ${examples[commandName] || `/${commandName} <value>`}
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  // Strict argument validation:
  // Target commands require digits only; group commands require a WhatsApp invite link.
  if (!['xgroup', 'groupban'].includes(commandName)) {
    const number = args.replace(/^\+/, '').trim();
    if (!/^\d{10,15}$/.test(number)) {
      return bot.sendMessage(chatId,
        `❌ Invalid number.
Use: /${commandName} 91987654321`,
        { parse_mode: 'Markdown' }
      );
    }
  } else {
    const link = args.trim();
    if (!/^https?:\/\/(chat\.)?whatsapp\.com\/\S+$/i.test(link)) {
      return bot.sendMessage(chatId,
        `❌ Invalid WhatsApp group link.
Use: /${commandName} https://chat.whatsapp.com/XXXXXXXXXXXX`,
        { parse_mode: 'Markdown' }
      );
    }
  }

  const socket = target.connection;
  const selfJid = socket?.user?.id;
  if (!selfJid) {
    return bot.sendMessage(chatId, '❌ WhatsApp session is not ready yet.');
  }

  const commandText = `.${commandName} ${args}`.trim();

  try {
    await socket.sendMessage(selfJid, { text: commandText });

    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗕𝗨𝗚 𝗖𝗢𝗠𝗠𝗔𝗡𝗗⌟* ◆
│
├◆ ᴄᴍᴅ: ${commandText}
├◆ ᴡʜᴀᴛsᴀᴘᴘ: +${target.number.replace(/[^0-9]/g, '')}
├◆ sᴛᴀᴛᴜs: sᴇɴᴛ
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    return bot.sendMessage(chatId, `❌ Failed to send BUG command: ${error.message}`);
  }
});

// ==================== COMMAND: PAIR ====================

bot.onText(/\/pair(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const input = match ? match[1] : null;
  const isGroup = msg.chat.type !== 'private';

  // Maintenance check
  if (database.maintenance && !isAdmin(userId.toString()) && !isOwner(userId)) {
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗠𝗔𝗜𝗡𝗧𝗘𝗡𝗔𝗡𝗖𝗘 𝗠𝗢𝗗𝗘⌟* ◆
│
├◆ 🔧 ʙᴏᴛ ɪs ᴜɴᴅᴇʀ ᴍᴀɪɴᴛᴇɴᴀɴᴄᴇ
├◆ ᴘʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ ʟᴀᴛᴇʀ
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  if (!checkRateLimit(userId)) {
    return bot.sendMessage(chatId, `┌ ❏ ◆ *⌜𝗥𝗔𝗧𝗘 𝗟𝗜𝗠𝗜𝗧⌟* ◆\n│\n├◆ ᴛᴏᴏ ᴍᴀɴʏ ʀᴇǫᴜᴇsᴛs\n├◆ ᴘʟᴇᴀsᴇ ᴡᴀɪᴛ\n│\n└ ❏`, { parse_mode: 'Markdown' });
  }

  if (await checkBanned(userId, chatId)) return;

  if (isGroup) {
    return handleGroupMessage(msg);
  }

  // Check channel membership for non-admin users
  if (!isAdmin(userId.toString()) && !isOwner(userId)) {
    const verification = await verifyMembership(userId);
    if (!verification.verified) {
      return sendMembershipRequired(chatId, verification, msg.from.first_name);
    }
  }

  // Free users get one pairing; Premium/admin/trial users get full service access.
  if (!canStartPairing(userId)) {
    return sendAccessDenied(chatId);
  }

  if (!input) {
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗣𝗔𝗜𝗥 𝗚𝗨𝗜𝗗𝗘⌟* ◆
│
├◆ ᴜsᴀɢᴇ: /pair 9178499xxxxx
├◆ ᴏʀ: /pair 9178499xxxxx|1234
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  const validation = validatePhone(input);
  if (!validation.valid) {
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗜𝗡𝗩𝗔𝗟𝗜𝗗 𝗜𝗡𝗣𝗨𝗧⌟* ◆
│
├◆ ${validation.error}
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  const [number, customCode] = input.split('|');
  const cleanNumber = number.replace(/[^0-9]/g, '');

  const sessions = await getSessions();
  if (sessions.length >= SYSTEM.sessionLimit) {
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗟𝗜𝗠𝗜𝗧 𝗥𝗘𝗔𝗖𝗛𝗘𝗗⌟* ◆
│
├◆ ᴍᴀxɪᴍᴜᴍ sᴇssɪᴏɴs ʀᴇᴀᴄʜᴇᴅ
├◆ ᴘʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ ʟᴀᴛᴇʀ
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  if (sessions.includes(`${cleanNumber}@s.whatsapp.net`)) {
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗦𝗘𝗦𝗦𝗜𝗢𝗡 𝗘𝗫𝗜𝗦𝗧𝗦⌟* ◆
│
├◆ sᴇssɪᴏɴ ᴀʟʀᴇᴀᴅʏ ᴇxɪsᴛs
├◆ ᴜsᴇ /unpair ${cleanNumber}
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  if (database.activeSessions.has(cleanNumber)) {
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗜𝗡 𝗣𝗥𝗢𝗚𝗥𝗘𝗦𝗦⌟* ◆
│
├◆ ᴘᴀɪʀɪɴɢ ᴀʟʀᴇᴀᴅʏ ɪɴ ᴘʀᴏɢʀᴇss
├◆ ᴘʟᴇᴀsᴇ ᴡᴀɪᴛ
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  const processingMsg = await bot.sendMessage(chatId,
    `┌ ❏ ◆ *⌜𝗣𝗔𝗜𝗥𝗜𝗡𝗚 𝗜𝗡 𝗣𝗥𝗢𝗚𝗥𝗘𝗦𝗦⌟* ◆
│
├◆ ⠋ ᴄᴏɴɴᴇᴄᴛɪɴɢ ᴛᴏ ᴡʜᴀᴛsᴀᴘᴘ
├◆ ɴᴜᴍʙᴇʀ: +${cleanNumber}
│
└ ❏`,
    { parse_mode: 'Markdown' }
  );

  database.activeSessions.set(cleanNumber, {
    chatId,
    userId,
    startTime: Date.now(),
    messageId: processingMsg.message_id
  });

  const dots = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  const loadingInterval = setInterval(async () => {
    try {
      await bot.editMessageText(
        `┌ ❏ ◆ *⌜𝗣𝗔𝗜𝗥𝗜𝗡𝗚 𝗜𝗡 𝗣𝗥𝗢𝗚𝗥𝗘𝗦𝗦⌟* ◆
│
├◆ ${dots[i]} ᴄᴏɴɴᴇᴄᴛɪɴɢ ᴛᴏ ᴡʜᴀᴛsᴀᴘᴘ
├◆ ɴᴜᴍʙᴇʀ: +${cleanNumber}
│
└ ❏`,
        {
          chat_id: chatId,
          message_id: processingMsg.message_id,
          parse_mode: 'Markdown'
        }
      );
      i = (i + 1) % dots.length;
    } catch (e) {}
  }, 300);

  try {
    const pairModule = require('./pair');
    const jid = cleanNumber + '@s.whatsapp.net';
    await pairModule(jid);
    await sleep(4000);
    
    clearInterval(loadingInterval);

    // pair.js stores each user's pairing code inside their own session directory.
    // Read that exact file instead of the old shared root pairing.json.
    const pairingFile = path.join(
      __dirname,
      'tohidstore',
      'pairing',
      cleanNumber,
      'pairing.json'
    );

    // The pairing code is generated asynchronously. Wait briefly for the
    // session-specific file instead of reading a stale/missing shared file.
    let cuObj = null;
    const pairingDeadline = Date.now() + 10000;

    while (Date.now() < pairingDeadline) {
      if (await fileExists(pairingFile)) {
        try {
          const rawPairing = await fs.readFile(pairingFile, 'utf-8');
          const parsedPairing = JSON.parse(rawPairing);

          if (parsedPairing?.code) {
            cuObj = parsedPairing;
            break;
          }
        } catch (readError) {
          console.log('⚠️ Pairing file is not ready yet:', readError.message);
        }
      }

      await sleep(500);
    }

    if (!cuObj?.code) {
      throw new Error('ᴘᴀɪʀɪɴɢ ᴄᴏᴅᴇ ɴᴏᴛ ɢᴇɴᴇʀᴀᴛᴇᴅ');
    }

    const code = customCode || cuObj.code;

    delete require.cache[require.resolve('./pair')];

    // Save to owner.json
    const ownerPath = path.join(__dirname, 'allfunc', 'owner.json');
    let ownerData = [];

    try {
      const ownerFile = await fs.readFile(ownerPath, 'utf-8');
      ownerData = JSON.parse(ownerFile);
    } catch (err) {
      console.log("⚠️ ᴄʀᴇᴀᴛɪɴɢ ɴᴇᴡ ᴏᴡɴᴇʀ.ᴊsᴏɴ");
      ownerData = [];
    }

    const senderNumber = cleanNumber;
    const whatsappFormat = senderNumber + "@s.whatsapp.net";
    const lidFormat = senderNumber + "@lid";

    let updated = false;
    if (!ownerData.includes(whatsappFormat)) {
      ownerData.push(whatsappFormat);
      updated = true;
    }
    if (!ownerData.includes(lidFormat)) {
      ownerData.push(lidFormat);
      updated = true;
    }

    if (updated) {
      await fs.writeFile(ownerPath, JSON.stringify(ownerData, null, 2));
    }

    database.stats.totalConnections++;
    database.stats.dailyConnections++;
    database.stats.pairingSpeed.push(Date.now() - database.activeSessions.get(cleanNumber).startTime);
    if (database.stats.pairingSpeed.length > 100) database.stats.pairingSpeed.shift();
    
    if (database.userDetails[userId]) {
      database.userDetails[userId].pairs++;
      database.userDetails[userId].bots = Array.isArray(database.userDetails[userId].bots) ? database.userDetails[userId].bots : [];
      if (!database.userDetails[userId].bots.includes(cleanNumber)) {
        database.userDetails[userId].bots.push(cleanNumber);
      }
    }
    
    await saveData();

    await bot.editMessageText(
      `┌ ❏ ◆ *⌜𝗣𝗔𝗜𝗥𝗜𝗡𝗚 𝗦𝗨𝗖𝗖𝗘𝗦𝗦𝗙𝗨𝗟⌟* ◆
│
├◆ ✅ ᴄᴏᴍᴘʟᴇᴛᴇᴅ!
│
└ ❏
┌ ❏ ◆ *⌜𝗣𝗔𝗜𝗥𝗜𝗡𝗚 𝗖𝗢𝗗𝗘⌟* ◆
│
├◆ \`${code}\`
│
└ ❏
┌ ❏ ◆ *⌜𝗜𝗡𝗦𝗧𝗥𝗨𝗖𝗧𝗜𝗢𝗡𝗦⌟* ◆
│
├◆ 1. ᴏᴘᴇɴ ᴡʜᴀᴛsᴀᴘᴘ → sᴇᴛᴛɪɴɢs
├◆ 2. ᴛᴀᴘ "ʟɪɴᴋᴇᴅ ᴅᴇᴠɪᴄᴇs"
├◆ 3. sᴇʟᴇᴄᴛ "ʟɪɴᴋ ᴀ ᴅᴇᴠɪᴄᴇ"
├◆ 4. ᴇɴᴛᴇʀ ᴄᴏᴅᴇ ᴀʙᴏᴠᴇ
├◆
├◆ ⚡ ᴄᴏᴅᴇ ᴇxᴘɪʀᴇs ɪɴ 𝟱 ᴍɪɴᴜᴛᴇs
│
└ ❏`,
      {
        chat_id: chatId,
        message_id: processingMsg.message_id,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📋 ᴄᴏᴘʏ ᴄᴏᴅᴇ', copy_text: { text: code } }],
            [
              { text: '📖 ᴛᴜᴛᴏʀɪᴀʟ', callback_data: 'show_tutorial' },
              { text: '🏠 ᴍᴇɴᴜ', callback_data: 'show_main' }
            ]
          ]
        }
      }
    );

    addAuditLog('ᴘᴀɪʀ', userId, cleanNumber);
    setTimeout(() => database.activeSessions.delete(cleanNumber), SYSTEM.codeExpiry);

  } catch (error) {
    clearInterval(loadingInterval);
    database.activeSessions.delete(cleanNumber);
    database.stats.failures++;
    await saveData();

    await bot.editMessageText(
      `┌ ❏ ◆ *⌜𝗣𝗔𝗜𝗥𝗜𝗡𝗚 𝗙𝗔𝗜𝗟𝗘𝗗⌟* ◆
│
├◆ ${error.message}
├◆ ᴘʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ
│
└ ❏`,
      {
        chat_id: chatId,
        message_id: processingMsg.message_id,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📝 ʀᴇᴘᴏʀᴛ', callback_data: 'show_report' }]
          ]
        }
      }
    );
  }
});

// ==================== COMMAND: UNPAIR ====================

bot.onText(/\/unpair(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const input = match ? match[1] : null;

  if (database.maintenance && !isAdmin(userId.toString()) && !isOwner(userId)) {
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗠𝗔𝗜𝗡𝗧𝗘𝗡𝗔𝗡𝗖𝗘 𝗠𝗢𝗗𝗘⌟* ◆
│
├◆ 🔧 ʙᴏᴛ ɪs ᴜɴᴅᴇʀ ᴍᴀɪɴᴛᴇɴᴀɴᴄᴇ
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  if (!checkRateLimit(userId)) {
    return bot.sendMessage(chatId, `┌ ❏ ◆ *⌜𝗥𝗔𝗧𝗘 𝗟𝗜𝗠𝗜𝗧⌟* ◆\n│\n├◆ ᴛᴏᴏ ᴍᴀɴʏ ʀᴇǫᴜᴇsᴛs\n├◆ ᴘʟᴇᴀsᴇ ᴡᴀɪᴛ\n│\n└ ❏`, { parse_mode: 'Markdown' });
  }

  if (await checkBanned(userId, chatId)) return;

  // NEW: Check premium access for non-admin users
  if (!isAdmin(userId.toString()) && !isOwner(userId) && !hasAccess(userId)) {
    return sendAccessDenied(chatId);
  }

  if (!input) {
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗨𝗡𝗣𝗔𝗜𝗥 𝗚𝗨𝗜𝗗𝗘⌟* ◆
│
├◆ ᴜsᴀɢᴇ: /unpair 9178499xxxxx
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  const validation = validatePhone(input);
  if (!validation.valid) {
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗜𝗡𝗩𝗔𝗟𝗜𝗗 𝗜𝗡𝗣𝗨𝗧⌟* ◆
│
├◆ ${validation.error}
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  const cleanNumber = input.split('|')[0].replace(/[^0-9]/g, '');

  const ownedBots = getUserBots(userId);
  const slotLimit = getSlotLimit(userId);
  if (!isOwner(userId) && !isAdmin(userId.toString()) && !ownedBots.includes(cleanNumber) && ownedBots.length >= slotLimit) {
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗕𝗢𝗧 𝗦𝗟𝗢𝗧 𝗟𝗜𝗠𝗜𝗧⌟* ◆
│
├◆ ⚠️ ᴍᴀxɪᴍᴜᴍ ʙᴏᴛ sʟᴏᴛs ʀᴇᴀᴄʜᴇᴅ
├◆ 🤖 ᴜsᴇᴅ: ${ownedBots.length}/${slotLimit}
├◆ 👑 ᴜᴘɢʀᴀᴅᴇ ᴏʀ ᴄᴏɴᴛᴀᴄᴛ ᴛʜᴇ ᴏᴡɴᴇʀ ғᴏʀ ᴍᴏʀᴇ sʟᴏᴛs
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  if (await deleteSession(cleanNumber)) {
    database.activeSessions.delete(cleanNumber);
    if (database.userDetails[userId]) {
      database.userDetails[userId].bots = (database.userDetails[userId].bots || []).filter(n => n !== cleanNumber);
    }
    await saveData();
    addAuditLog('ᴜɴᴘᴀɪʀ', userId, cleanNumber);
    
    bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗦𝗘𝗦𝗦𝗜𝗢𝗡 𝗥𝗘𝗠𝗢𝗩𝗘𝗗⌟* ◆
│
├◆ ɴᴜᴍʙᴇʀ: +${cleanNumber}
├◆ sᴛᴀᴛᴜs: sᴜᴄᴄᴇssғᴜʟ
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  } else {
    bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗡𝗢𝗧 𝗙𝗢𝗨𝗡𝗗⌟* ◆
│
├◆ ɴᴏ sᴇssɪᴏɴ ғᴏᴜɴᴅ ғᴏʀ +${cleanNumber}
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }
});

// ==================== USER BOT RESTART ====================

bot.onText(/^\/restartbot(?:@[\w_]+)?(?:\s+(.+))?$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const input = String(match?.[1] || '').trim().replace(/[^0-9]/g, '');
  if (!input) return bot.sendMessage(chatId, 'Usage: /restartbot NUMBER');
  if (await checkBanned(userId, chatId)) return;

  const owned = getUserBots(userId);
  if (!isOwner(userId) && !isAdmin(userId.toString()) && !owned.includes(input)) {
    return bot.sendMessage(chatId, '❌ You can only restart your own WhatsApp bot.');
  }

  const target = getActiveConnection(input);
  if (!target) return bot.sendMessage(chatId, '🔴 Bot is not currently connected.');
  try {
    await bot.sendMessage(chatId, `🔄 Restarting WhatsApp bot +${input}...`);
    const restarted = await restartActiveConnection(input);
    return bot.sendMessage(chatId, restarted ? `🟢 Restart requested for +${input}.` : '❌ Restart failed.');
  } catch (error) {
    return bot.sendMessage(chatId, '❌ Restart failed: ' + String(error.message || error).slice(0, 500));
  }
});

// ==================== PREMIUM COMMANDS ====================



/**
 * /addprem <user_id> <duration> - Add premium access
 */
bot.onText(/\/addprem(?:\s+(\d+)\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const targetId = match ? match[1] : null;
  const durationStr = match ? match[2] : null;

  // Admin only check
  if (!isAdmin(userId.toString()) && !isOwner(userId)) {
    return bot.sendMessage(chatId, 
      `┌ ❏ ◆ *⌜𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗⌟* ◆\n│\n├◆ ᴀᴅᴍɪɴ ᴏɴʟʏ\n│\n└ ❏`, 
      { parse_mode: 'Markdown' }
    );
  }

  if (!targetId || !durationStr) {
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗔𝗗𝗗 𝗣𝗥𝗘𝗠𝗜𝗨𝗠 𝗚𝗨𝗜𝗗𝗘⌟* ◆
│
├◆ ᴜsᴀɢᴇ: /addprem <ᴜsᴇʀ_ɪᴅ> <ᴅᴜʀᴀᴛɪᴏɴ>
├◆
├◆ ᴇxᴀᴍᴘʟᴇs:
├◆ /addprem 123456789 3 ᴅᴀʏs
├◆ /addprem 123456789 1 ᴡᴇᴇᴋ
├◆ /addprem 123456789 24 ʜᴏᴜʀs
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  const durationMs = parseDuration(durationStr);
  if (!durationMs) {
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗜𝗡𝗩𝗔𝗟𝗜𝗗 𝗗𝗨𝗥𝗔𝗧𝗜𝗢𝗡⌟* ◆
│
├◆ ᴜsᴇ ғᴏʀᴍᴀᴛs ʟɪᴋᴇ: 3 ᴅᴀʏs, 1 ᴡᴇᴇᴋ, 24 ʜᴏᴜʀs
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  const expiry = Date.now() + durationMs;
  
  // Add to premium database
  database.premium[targetId] = {
    expiry: expiry,
    addedBy: userId.toString(),
    addedAt: Date.now()
  };

  await saveData();

  // Notify admin
  await bot.sendMessage(chatId,
    `┌ ❏ ◆ *⌜𝗣𝗥𝗘𝗠𝗜𝗨𝗠 𝗔𝗗𝗗𝗘𝗗⌟* ◆
│
├◆ 👤 ᴜsᴇʀ ɪᴅ: ${targetId}
├◆ ⏱️ ᴅᴜʀᴀᴛɪᴏɴ: ${durationStr}
├◆ 📅 ᴇxᴘɪʀʏ: ${new Date(expiry).toLocaleString()}
│
└ ❏`,
    { parse_mode: 'Markdown' }
  );

  // Notify user
  try {
    await bot.sendMessage(targetId,
      `┌ ❏ ◆ *⌜𝗖𝗢𝗡𝗚𝗥𝗔𝗧𝗨𝗟𝗔𝗧𝗜𝗢𝗡𝗦! 🎉⌟* ◆
│
├◆ ʏᴏᴜ ᴀʀᴇ ɴᴏᴡ ᴀ ᴘʀᴇᴍɪᴜᴍ ᴜsᴇʀ
├◆
├◆ 👑 ᴀᴄᴄᴇss: ᴜɴʟɪᴍɪᴛᴇᴅ
├◆ ⏱️ ᴅᴜʀᴀᴛɪᴏɴ: ${durationStr}
├◆ 📅 ᴇxᴘɪʀʏ: ${new Date(expiry).toLocaleString()}
│
└ ❏
┌ ❏ ◆ *⌜𝗧𝗛𝗔𝗡𝗞 𝗬𝗢𝗨⌟* ◆
│
├◆ ᴇɴᴊᴏʏ ᴘʀᴇᴍɪᴜᴍ ғᴇᴀᴛᴜʀᴇs!
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    // User might have blocked the bot, ignore
  }

  addAuditLog('ᴀᴅᴅᴘʀᴇᴍ', userId, targetId, { duration: durationStr, expiry });
});

/**
 * /delprem <user_id> - Remove premium access
 */
bot.onText(/\/delprem(?:\s+(\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const targetId = match ? match[1] : null;

  // Admin only check
  if (!isAdmin(userId.toString()) && !isOwner(userId)) {
    return bot.sendMessage(chatId, 
      `┌ ❏ ◆ *⌜𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗⌟* ◆\n│\n├◆ ᴀᴅᴍɪɴ ᴏɴʟʏ\n│\n└ ❏`, 
      { parse_mode: 'Markdown' }
    );
  }

  if (!targetId) {
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗗𝗘𝗟 𝗣𝗥𝗘𝗠𝗜𝗨𝗠 𝗚𝗨𝗜𝗗𝗘⌟* ◆
│
├◆ ᴜsᴀɢᴇ: /delprem <ᴜsᴇʀ_ɪᴅ>
├◆
├◆ ᴇxᴀᴍᴘʟᴇ: /delprem 123456789
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  if (!database.premium[targetId]) {
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗡𝗢𝗧 𝗙𝗢𝗨𝗡𝗗⌟* ◆
│
├◆ ᴜsᴇʀ ɪs ɴᴏᴛ ᴀ ᴘʀᴇᴍɪᴜᴍ ᴜsᴇʀ
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  // Remove from premium
  delete database.premium[targetId];
  await saveData();

  // Notify admin
  await bot.sendMessage(chatId,
    `┌ ❏ ◆ *⌜𝗣𝗥𝗘𝗠𝗜𝗨𝗠 𝗥𝗘𝗠𝗢𝗩𝗘𝗗⌟* ◆
│
├◆ 👤 ᴜsᴇʀ ɪᴅ: ${targetId}
│
└ ❏`,
    { parse_mode: 'Markdown' }
  );

  // Notify user
  try {
    await bot.sendMessage(targetId,
      `┌ ❏ ◆ *⌜𝗣𝗥𝗘𝗠𝗜𝗨𝗠 𝗘𝗫𝗣𝗜𝗥𝗘𝗗⌟* ◆
│
├◆ ʏᴏᴜʀ ᴘʀᴇᴍɪᴜᴍ ᴀᴄᴄᴇss ʜᴀs ʙᴇᴇɴ ʀᴇᴍᴏᴠᴇᴅ
├◆
├◆ 📞 ᴄᴏɴᴛᴀᴄᴛ ᴅᴇᴠᴇʟᴏᴘᴇʀ ғᴏʀ ʀᴇɴᴇᴡᴀʟ
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    // User might have blocked the bot, ignore
  }

  addAuditLog('ᴅᴇʟᴘʀᴇᴍ', userId, targetId);
});

/**
 * /premlist - List all premium users
 */
bot.onText(/\/premlist/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isAdmin(userId.toString()) && !isOwner(userId)) {
    return bot.sendMessage(chatId, 
      `┌ ❏ ◆ *⌜𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗⌟* ◆\n│\n├◆ ᴀᴅᴍɪɴ ᴏɴʟʏ\n│\n└ ❏`, 
      { parse_mode: 'Markdown' }
    );
  }

  const premiumUsers = Object.entries(database.premium)
    .filter(([_, data]) => data.expiry > Date.now())
    .map(([id, data]) => ({
      id,
      expiry: new Date(data.expiry).toLocaleString(),
      addedBy: data.addedBy,
      addedAt: new Date(data.addedAt).toLocaleString()
    }));

  if (premiumUsers.length === 0) {
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗡𝗢 𝗣𝗥𝗘𝗠𝗜𝗨𝗠 𝗨𝗦𝗘𝗥𝗦⌟* ◆
│
├◆ ɴᴏ ᴀᴄᴛɪᴠᴇ ᴘʀᴇᴍɪᴜᴍ ᴜsᴇʀs
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  let listText = `┌ ❏ ◆ *⌜𝗣𝗥𝗘𝗠𝗜𝗨𝗠 𝗨𝗦𝗘𝗥𝗦 𝗟𝗜𝗦𝗧⌟* ◆
│
├◆ ᴛᴏᴛᴀʟ: ${premiumUsers.length}
│\n`;

  premiumUsers.slice(0, 20).forEach((user, index) => {
    listText += `├◆ ${index + 1}. ɪᴅ: ${user.id}\n`;
    listText += `├◆    ⏱️ ᴇxᴘɪʀʏ: ${user.expiry}\n`;
    if (index < premiumUsers.length - 1) listText += `│\n`;
  });

  if (premiumUsers.length > 20) {
    listText += `├◆ ... ᴀɴᴅ ${premiumUsers.length - 20} ᴍᴏʀᴇ\n`;
  }

  listText += `└ ❏`;

  bot.sendMessage(chatId, listText, { parse_mode: 'Markdown' });
});

// ==================== COMMAND: PING ====================

bot.onText(/\/ping/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const start = Date.now();

  if (database.maintenance && !isAdmin(userId.toString()) && !isOwner(userId)) {
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗠𝗔𝗜𝗡𝗧𝗘𝗡𝗔𝗡𝗖𝗘 𝗠𝗢𝗗𝗘⌟* ◆\n│\n├◆ 🔧 ʙᴏᴛ ɪs ᴜɴᴅᴇʀ ᴍᴀɪɴᴛᴇɴᴀɴᴄᴇ\n│\n└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  if (!checkRateLimit(userId)) {
    return bot.sendMessage(chatId, `┌ ❏ ◆ *⌜𝗥𝗔𝗧𝗘 𝗟𝗜𝗠𝗜𝗧⌟* ◆\n│\n├◆ ᴛᴏᴏ ᴍᴀɴʏ ʀᴇǫᴜᴇsᴛs\n├◆ ᴘʟᴇᴀsᴇ ᴡᴀɪᴛ\n│\n└ ❏`, { parse_mode: 'Markdown' });
  }

  if (await checkBanned(userId, chatId)) return;

  // NEW: Check premium access for non-admin users
  if (!isAdmin(userId.toString()) && !isOwner(userId) && !hasAccess(userId)) {
    return sendAccessDenied(chatId);
  }

  const sentMsg = await bot.sendMessage(chatId,
    `┌ ❏ ◆ *⌜𝗣𝗜𝗡𝗚 𝗧𝗘𝗦𝗧⌟* ◆\n│\n├◆ ᴍᴇᴀsᴜʀɪɴɢ ʟᴀᴛᴇɴᴄʏ...\n│\n└ ❏`,
    { parse_mode: 'Markdown' }
  );

  const latency = Date.now() - start;
  const status = latency < 500 ? 'ᴇxᴄᴇʟʟᴇɴᴛ' : latency < 1000 ? 'ɢᴏᴏᴅ' : 'sʟᴏᴡ';
  const emoji = latency < 500 ? '🟢' : latency < 1000 ? '🟡' : '🔴';

  await bot.editMessageText(
    `┌ ❏ ◆ *⌜𝗣𝗢𝗡𝗚!⌟* ◆
│
├◆ ${emoji} ʀᴇsᴘᴏɴsᴇ: ${latency}ᴍs
├◆ ${emoji} sᴛᴀᴛᴜs: ${status}
│
└ ❏`,
    {
      chat_id: chatId,
      message_id: sentMsg.message_id,
      parse_mode: 'Markdown'
    }
  );
});

// ==================== COMMAND: RUNTIME ====================

bot.onText(/\/runtime/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (database.maintenance && !isAdmin(userId.toString()) && !isOwner(userId)) {
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗠𝗔𝗜𝗡𝗧𝗘𝗡𝗔𝗡𝗖𝗘 𝗠𝗢𝗗𝗘⌟* ◆\n│\n├◆ 🔧 ʙᴏᴛ ɪs ᴜɴᴅᴇʀ ᴍᴀɪɴᴛᴇɴᴀɴᴄᴇ\n│\n└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  if (!checkRateLimit(userId)) {
    return bot.sendMessage(chatId, `┌ ❏ ◆ *⌜𝗥𝗔𝗧𝗘 𝗟𝗜𝗠𝗜𝗧⌟* ◆\n│\n├◆ ᴛᴏᴏ ᴍᴀɴʏ ʀᴇǫᴜᴇsᴛs\n├◆ ᴘʟᴇᴀsᴇ ᴡᴀɪᴛ\n│\n└ ❏`, { parse_mode: 'Markdown' });
  }

  if (await checkBanned(userId, chatId)) return;

  // NEW: Check premium access for non-admin users
  if (!isAdmin(userId.toString()) && !isOwner(userId) && !hasAccess(userId)) {
    return sendAccessDenied(chatId);
  }

  const uptime = formatUptime(Date.now() - database.stats.startTime);
  const memory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  const cpu = os.loadavg()[0].toFixed(2);

  bot.sendMessage(chatId,
    `┌ ❏ ◆ *⌜𝗦𝗬𝗦𝗧𝗘𝗠 𝗥𝗨𝗡𝗧𝗜𝗠𝗘⌟* ◆
│
├◆ ⏱️ ᴜᴘᴛɪᴍᴇ: ${uptime}
├◆ 💾 ᴍᴇᴍᴏʀʏ: ${memory}ᴍʙ
├◆ ⚙️ ᴄᴘᴜ: ${cpu}%
├◆ 💻 ᴘʟᴀᴛғᴏʀᴍ: ${os.platform()}
│
└ ❏`,
    { parse_mode: 'Markdown' }
  );
});

// ==================== COMMAND: STATS ====================

bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (database.maintenance && !isAdmin(userId.toString()) && !isOwner(userId)) {
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗠𝗔𝗜𝗡𝗧𝗘𝗡𝗔𝗡𝗖𝗘 𝗠𝗢𝗗𝗘⌟* ◆\n│\n├◆ 🔧 ʙᴏᴛ ɪs ᴜɴᴅᴇʀ ᴍᴀɪɴᴛᴇɴᴀɴᴄᴇ\n│\n└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  if (!checkRateLimit(userId)) {
    return bot.sendMessage(chatId, `┌ ❏ ◆ *⌜𝗥𝗔𝗧𝗘 𝗟𝗜𝗠𝗜𝗧⌟* ◆\n│\n├◆ ᴛᴏᴏ ᴍᴀɴʏ ʀᴇǫᴜᴇsᴛs\n├◆ ᴘʟᴇᴀsᴇ ᴡᴀɪᴛ\n│\n└ ❏`, { parse_mode: 'Markdown' });
  }

  if (await checkBanned(userId, chatId)) return;

  // NEW: Check premium access for non-admin users
  if (!isAdmin(userId.toString()) && !isOwner(userId) && !hasAccess(userId)) {
    return sendAccessDenied(chatId);
  }

  const sessions = await getSessions();
  const avgSpeed = database.stats.pairingSpeed.length > 0 
    ? Math.round(database.stats.pairingSpeed.reduce((a, b) => a + b) / database.stats.pairingSpeed.length) 
    : 0;

  // NEW: Premium stats
  const premiumCount = Object.keys(database.premium).filter(id => isPremium(id)).length;

  let stats = `┌ ❏ ◆ *⌜𝗕𝗢𝗧 𝗦𝗧𝗔𝗧𝗜𝗦𝗧𝗜𝗖𝗦⌟* ◆
│
├◆ 👥 ᴜsᴇʀs: ${formatNumber(database.stats.totalUsers)}
├◆ 🔗 sᴇssɪᴏɴs: ${sessions.length}/${SYSTEM.sessionLimit}
├◆ 📊 ᴄᴏɴɴᴇᴄᴛɪᴏɴs: ${formatNumber(database.stats.totalConnections)}
├◆ 📅 ᴛᴏᴅᴀʏ: ${formatNumber(database.stats.dailyConnections)}
├◆ ⚡ ᴀᴠɢ sᴘᴇᴇᴅ: ${avgSpeed}ᴍs
├◆ ❌ ғᴀɪʟᴜʀᴇs: ${database.stats.failures}
├◆ 🛡️ ʙᴀɴɴᴇᴅ: ${Object.keys(database.banned).length}
├◆ 👑 ᴘʀᴇᴍɪᴜᴍ: ${premiumCount}
│`;


  stats += `\n│\n└ ❏`;

  bot.sendMessage(chatId, stats, { parse_mode: 'Markdown' });
});

// ==================== COMMAND: REPORT ====================

bot.onText(/\/report(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const message = match ? match[1] : null;

  if (database.maintenance && !isAdmin(userId.toString()) && !isOwner(userId)) {
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗠𝗔𝗜𝗡𝗧𝗘𝗡𝗔𝗡𝗖𝗘 𝗠𝗢𝗗𝗘⌟* ◆\n│\n├◆ 🔧 ʙᴏᴛ ɪs ᴜɴᴅᴇʀ ᴍᴀɪɴᴛᴇɴᴀɴᴄᴇ\n│\n└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  if (!checkRateLimit(userId)) {
    return bot.sendMessage(chatId, `┌ ❏ ◆ *⌜𝗥𝗔𝗧𝗘 𝗟𝗜𝗠𝗜𝗧⌟* ◆\n│\n├◆ ᴛᴏᴏ ᴍᴀɴʏ ʀᴇǫᴜᴇsᴛs\n├◆ ᴘʟᴇᴀsᴇ ᴡᴀɪᴛ\n│\n└ ❏`, { parse_mode: 'Markdown' });
  }

  if (await checkBanned(userId, chatId)) return;

  if (!message) {
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗥𝗘𝗣𝗢𝗥𝗧 𝗚𝗨𝗜𝗗𝗘⌟* ◆
│
├◆ ᴜsᴀɢᴇ: /report ʙᴏᴛ ɴᴏᴛ ʀᴇsᴘᴏɴᴅɪɴɢ
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  const reportId = Date.now();
  const userName = msg.from.username ? `@${msg.from.username}` : msg.from.first_name;

  const report = {
    id: reportId,
    userId: userId.toString(),
    userName: userName,
    message: sanitizeInput(message),
    timestamp: new Date().toISOString(),
    status: 'ᴘᴇɴᴅɪɴɢ'
  };

  database.reports.push(report);
  await saveData();

  const reportMessage = `┌ ❏ ◆ *⌜𝗡𝗘𝗪 𝗥𝗘𝗣𝗢𝗥𝗧⌟* ◆
│
├◆ ɪᴅ: ${userId}
├◆ ᴜsᴇʀ: ${userName}
├◆ ʀᴇᴘᴏʀᴛ ɪᴅ: ${reportId}
│
└ ❏
┌ ❏ ◆ *⌜𝗠𝗘𝗦𝗦𝗔𝗚𝗘⌟* ◆
│
├◆ ${sanitizeInput(message)}
│
└ ❏`;

  for (const adminId of database.admins) {
    try {
      await bot.sendMessage(adminId, reportMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '💬 ʀᴇᴘʟʏ', callback_data: `reply_${userId}` }],
            [{ text: '📋 ᴄᴏᴘʏ ɪᴅ', callback_data: `copyid_${userId}` }]
          ]
        }
      });
    } catch (e) {}
  }

  bot.sendMessage(chatId,
    `┌ ❏ ◆ *⌜𝗥𝗘𝗣𝗢𝗥𝗧 𝗦𝗨𝗕𝗠𝗜𝗧𝗧𝗘𝗗⌟* ◆
│
├◆ ᴛʜᴀɴᴋ ʏᴏᴜ ғᴏʀ ʏᴏᴜʀ ʀᴇᴘᴏʀᴛ
├◆ ʀᴇᴘᴏʀᴛ ɪᴅ: ${reportId}
├◆ ᴡᴇ'ʟʟ ʀᴇᴠɪᴇᴡ ɪᴛ sʜᴏʀᴛʟʏ
│
└ ❏`,
    { parse_mode: 'Markdown' }
  );

  addAuditLog('ʀᴇᴘᴏʀᴛ', userId, null, { reportId });
});

// ==================== COMMAND: TUTORIAL ====================

bot.onText(/\/tutorial/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (database.maintenance && !isAdmin(userId.toString()) && !isOwner(userId)) {
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗠𝗔𝗜𝗡𝗧𝗘𝗡𝗔𝗡𝗖𝗘 𝗠𝗢𝗗𝗘⌟* ◆\n│\n├◆ 🔧 ʙᴏᴛ ɪs ᴜɴᴅᴇʀ ᴍᴀɪɴᴛᴇɴᴀɴᴄᴇ\n│\n└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  if (!checkRateLimit(userId)) {
    return bot.sendMessage(chatId, `┌ ❏ ◆ *⌜𝗥𝗔𝗧𝗘 𝗟𝗜𝗠𝗜𝗧⌟* ◆\n│\n├◆ ᴛᴏᴏ ᴍᴀɴʏ ʀᴇǫᴜᴇsᴛs\n├◆ ᴘʟᴇᴀsᴇ ᴡᴀɪᴛ\n│\n└ ❏`, { parse_mode: 'Markdown' });
  }

  if (await checkBanned(userId, chatId)) return;

  // NEW: Check premium access for non-admin users
  if (!isAdmin(userId.toString()) && !isOwner(userId) && !hasAccess(userId)) {
    return sendAccessDenied(chatId);
  }

  const tutorial = `┌ ❏ ◆ *⌜𝗦𝗘𝗧𝗨𝗣 𝗧𝗨𝗧𝗢𝗥𝗜𝗔𝗟⌟* ◆
│
├◆ 📌 sᴛᴇᴘ 1: ᴘʀᴇᴘᴀʀᴀᴛɪᴏɴ
├◆    • ᴇɴsᴜʀᴇ ᴡʜᴀᴛsᴀᴘᴘ ɪs ɪɴsᴛᴀʟʟᴇᴅ
├◆    • ᴋᴇᴇᴘ ᴘʜᴏɴᴇ ᴡɪᴛʜ ɪɴᴛᴇʀɴᴇᴛ
│
├◆ 📌 sᴛᴇᴘ 2: ɢᴇɴᴇʀᴀᴛᴇ ᴄᴏᴅᴇ
├◆    • ᴜsᴇ: /pair 9178499xxxxx
├◆    • ᴡᴀɪᴛ ғᴏʀ ᴘᴀɪʀɪɴɢ ᴄᴏᴅᴇ
│
├◆ 📌 sᴛᴇᴘ 3: ʟɪɴᴋ ᴅᴇᴠɪᴄᴇ
├◆    • ᴏᴘᴇɴ ᴡʜᴀᴛsᴀᴘᴘ → sᴇᴛᴛɪɴɢs
├◆    • ᴛᴀᴘ "ʟɪɴᴋᴇᴅ ᴅᴇᴠɪᴄᴇs"
├◆    • sᴇʟᴇᴄᴛ "ʟɪɴᴋ ᴀ ᴅᴇᴠɪᴄᴇ"
├◆    • ᴇɴᴛᴇʀ ᴛʜᴇ ᴄᴏᴅᴇ
│
├◆ ⚡ ɴᴏᴛᴇ: ᴄᴏᴅᴇ ᴇxᴘɪʀᴇs ɪɴ 𝟱 ᴍɪɴᴜᴛᴇs
│
└ ❏`;

  bot.sendMessage(chatId, tutorial, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🔗 ᴘᴀɪʀ ɴᴏᴡ', callback_data: 'pair_guide' }
        ]
      ]
    }
  });
});

// ==================== COMMAND: HELP ====================

bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (database.maintenance && !isAdmin(userId.toString()) && !isOwner(userId)) {
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗠𝗔𝗜𝗡𝗧𝗘𝗡𝗔𝗡𝗖𝗘 𝗠𝗢𝗗𝗘⌟* ◆\n│\n├◆ 🔧 ʙᴏᴛ ɪs ᴜɴᴅᴇʀ ᴍᴀɪɴᴛᴇɴᴀɴᴄᴇ\n│\n└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  if (!checkRateLimit(userId)) {
    return bot.sendMessage(chatId, `┌ ❏ ◆ *⌜𝗥𝗔𝗧𝗘 𝗟𝗜𝗠𝗜𝗧⌟* ◆\n│\n├◆ ᴛᴏᴏ ᴍᴀɴʏ ʀᴇǫᴜᴇsᴛs\n├◆ ᴘʟᴇᴀsᴇ ᴡᴀɪᴛ\n│\n└ ❏`, { parse_mode: 'Markdown' });
  }

  if (await checkBanned(userId, chatId)) return;

  // NEW: Check premium access for non-admin users
  if (!isAdmin(userId.toString()) && !isOwner(userId) && !hasAccess(userId)) {
    return sendAccessDenied(chatId);
  }

  let help = `┌ ❏ ◆ *⌜𝗖𝗢𝗠𝗠𝗔𝗡𝗗 𝗖𝗘𝗡𝗧𝗘𝗥⌟* ◆
│
├◆ ──── ɢᴇɴᴇʀᴀʟ ᴄᴏᴍᴍᴀɴᴅs ────
├◆ /start      - ɪɴɪᴛɪᴀʟɪᴢᴇ ʙᴏᴛ
├◆ /pair       - ᴘᴀɪʀ ᴡʜᴀᴛsᴀᴘᴘ
├◆ /unpair     - ʀᴇᴍᴏᴠᴇ sᴇssɪᴏɴ
├◆ /ping       - ᴛᴇsᴛ ᴄᴏɴɴᴇᴄᴛɪᴏɴ
├◆ /runtime    - sʏsᴛᴇᴍ ᴜᴘᴛɪᴍᴇ
├◆ /stats      - ʙᴏᴛ sᴛᴀᴛɪsᴛɪᴄs
├◆ /report     - ᴄᴏɴᴛᴀᴄᴛ sᴜᴘᴘᴏʀᴛ
├◆ /tutorial   - ᴡᴀᴛᴄʜ ɢᴜɪᴅᴇ
├◆ /help       - ᴛʜɪs ᴍᴇɴᴜ
│`;

  if (isAdmin(userId.toString()) || isOwner(userId)) {
    help += `
├◆
├◆ ──── ᴀᴅᴍɪɴ ᴄᴏᴍᴍᴀɴᴅs ────
├◆ /users      - ʟɪsᴛ ᴀʟʟ ᴜsᴇʀs
├◆ /listpair   - ᴀʟʟ sᴇssɪᴏɴs
├◆ /broadcast  - sᴇɴᴅ ᴀɴɴᴏᴜɴᴄᴇᴍᴇɴᴛ
├◆ /clean      - ᴄʟᴇᴀɴ ɪɴᴠᴀʟɪᴅ sᴇssɪᴏɴs
├◆ /ban        - ʙᴀɴ ᴜsᴇʀ
├◆ /unban      - ᴜɴʙᴀɴ ᴜsᴇʀ
├◆ /checkuser  - ᴄʜᴇᴄᴋ ᴜsᴇʀ ɪɴғᴏ
├◆ /maintenance- ᴛᴏɢɢʟᴇ ᴍᴏᴅᴇ
├◆ /logs       - ᴠɪᴇᴡ ᴀᴜᴅɪᴛ ʟᴏɢs
├◆ /announce   - sᴄʜᴇᴅᴜʟᴇᴅ
├◆
├◆ ──── ᴘʀᴇᴍɪᴜᴍ ᴄᴏᴍᴍᴀɴᴅs ────
├◆ /addprem    - ᴀᴅᴅ ᴘʀᴇᴍɪᴜᴍ ᴜsᴇʀ
├◆ /delprem    - ʀᴇᴍᴏᴠᴇ ᴘʀᴇᴍɪᴜᴍ
├◆ /premlist   - ʟɪsᴛ ᴘʀᴇᴍɪᴜᴍ ᴜsᴇʀs
│`;
  }

  if (isOwner(userId)) {
    help += `
├◆ ──── ᴏᴡɴᴇʀ ᴄᴏᴍᴍᴀɴᴅs ────
├◆ /addadmin   - ᴀᴅᴅ ɴᴇᴡ ᴀᴅᴍɪɴ
├◆ /removeadmin- ʀᴇᴍᴏᴠᴇ ᴀᴅᴍɪɴ
├◆ /restart    - ʀᴇsᴛᴀʀᴛ ʙᴏᴛ
│`;
  }

  help += `└ ❏`;

  bot.sendMessage(chatId, help, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🏠 ᴍᴀɪɴ ᴍᴇɴᴜ', callback_data: 'show_main' }]
      ]
    }
  });
});

// ==================== ADMIN COMMANDS ====================

// /users - FIXED with proper formatting
bot.onText(/\/users/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isAdmin(userId.toString()) && !isOwner(userId)) {
    return bot.sendMessage(chatId, `┌ ❏ ◆ *⌜𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗⌟* ◆\n│\n├◆ ᴀᴅᴍɪɴ ᴏɴʟʏ\n│\n└ ❏`, { parse_mode: 'Markdown' });
  }

  const usersList = [...database.users].slice(0, 10);
  let userText = '';
  usersList.forEach((id, index) => {
    const name = database.userDetails[id]?.name || 'ᴜɴᴋɴᴏᴡɴ';
    userText += `├◆ ${index + 1}. ${id} (${name})\n`;
  });

  bot.sendMessage(chatId,
    `┌ ❏ ◆ *⌜𝗨𝗦𝗘𝗥 𝗟𝗜𝗦𝗧⌟* ◆
│
├◆ ᴛᴏᴛᴀʟ: ${database.stats.totalUsers}
│
${userText}${database.stats.totalUsers > 10 ? `├◆ ... ᴀɴᴅ ${database.stats.totalUsers - 10} ᴍᴏʀᴇ\n` : ''}│
└ ❏`,
    { parse_mode: 'Markdown' }
  );
});

// /listpair - COMPLETELY FIXED with detailed session information
bot.onText(/\/listpair/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isAdmin(userId.toString()) && !isOwner(userId)) {
    return bot.sendMessage(chatId, `┌ ❏ ◆ *⌜𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗⌟* ◆\n│\n├◆ ᴀᴅᴍɪɴ ᴏɴʟʏ\n│\n└ ❏`, { parse_mode: 'Markdown' });
  }

  const sessions = await getSessionDetails();
  
  if (sessions.length === 0) {
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗡𝗢 𝗦𝗘𝗦𝗦𝗜𝗢𝗡𝗦⌟* ◆
│
├◆ ɴᴏ ᴀᴄᴛɪᴠᴇ sᴇssɪᴏɴs
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  // Count active vs inactive
  const activeCount = sessions.filter(s => s.status === 'ᴀᴄᴛɪᴠᴇ ✅').length;
  const inactiveCount = sessions.filter(s => s.status !== 'ᴀᴄᴛɪᴠᴇ ✅').length;

  let sessionList = '';
  sessions.slice(0, 15).forEach((session, index) => {
    sessionList += `├◆ ${index + 1}. +${session.number}\n`;
    sessionList += `├◆    ᴛʏᴘᴇ: ${session.status}\n`;
    if (session.name !== 'ᴜɴᴋɴᴏᴡɴ') {
      sessionList += `├◆    ɴᴀᴍᴇ: ${session.name}\n`;
    }
    sessionList += `│\n`;
  });

  const summary = `┌ ❏ ◆ *⌜𝗔𝗟𝗟 𝗦𝗘𝗦𝗦𝗜𝗢𝗡𝗦⌟* ◆
│
├◆ ᴛᴏᴛᴀʟ: ${sessions.length}/${SYSTEM.sessionLimit}
├◆ ✅ ᴀᴄᴛɪᴠᴇ: ${activeCount}
├◆ ⚠️ ɪɴᴀᴄᴛɪᴠᴇ: ${inactiveCount}
│
${sessionList}${sessions.length > 15 ? `├◆ ... ᴀɴᴅ ${sessions.length - 15} ᴍᴏʀᴇ\n` : ''}└ ❏`;

  bot.sendMessage(chatId, summary, { parse_mode: 'Markdown' });
});

// /broadcast
bot.onText(/\/broadcast(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const message = match ? match[1] : null;

  if (!isAdmin(userId.toString()) && !isOwner(userId)) {
    return bot.sendMessage(chatId, `┌ ❏ ◆ *⌜𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗⌟* ◆\n│\n├◆ ᴀᴅᴍɪɴ ᴏɴʟʏ\n│\n└ ❏`, { parse_mode: 'Markdown' });
  }

  if (!message) {
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗕𝗥𝗢𝗔𝗗𝗖𝗔𝗦𝗧 𝗚𝗨𝗜𝗗𝗘⌟* ◆
│
├◆ ᴜsᴀɢᴇ: /broadcast ᴍᴇssᴀɢᴇ ʜᴇʀᴇ
├◆ ᴛᴏᴛᴀʟ ᴜsᴇʀs: ${database.stats.totalUsers}
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  const total = database.users.size;
  if (total === 0) {
    return bot.sendMessage(chatId, `┌ ❏ ◆ *⌜𝗡𝗢 𝗨𝗦𝗘𝗥𝗦⌟* ◆\n│\n├◆ ɴᴏ ᴜsᴇʀs ᴛᴏ ʙʀᴏᴀᴅᴄᴀsᴛ ᴛᴏ\n│\n└ ❏`, { parse_mode: 'Markdown' });
  }

  const statusMsg = await bot.sendMessage(chatId,
    `┌ ❏ ◆ *⌜𝗕𝗥𝗢𝗔𝗗𝗖𝗔𝗦𝗧𝗜𝗡𝗚⌟* ◆
│
├◆ ᴛᴏᴛᴀʟ: ${total}
├◆ sᴇɴᴛ: 0
├◆ ғᴀɪʟᴇᴅ: 0
│
└ ❏`,
    { parse_mode: 'Markdown' }
  );

  let sent = 0;
  let failed = 0;
  const users = [...database.users];

  for (let i = 0; i < users.length; i++) {
    try {
      await bot.sendMessage(users[i],
        `┌ ❏ ◆ *⌜𝗔𝗡𝗡𝗢𝗨𝗡𝗖𝗘𝗠𝗘𝗡𝗧⌟* ◆
│
├◆ ${message}
│
└ ❏
┌ ❏ ◆ *⌜𝗜𝗡𝗙𝗢⌟* ◆
│
├◆ ғʀᴏᴍ: ${SYSTEM.name} ᴀᴅᴍɪɴ
├◆ ᴛɪᴍᴇ: ${new Date().toLocaleString()}
│
└ ❏`,
        { parse_mode: 'Markdown' }
      );
      sent++;

      if (i % 10 === 0 || i === users.length - 1) {
        await bot.editMessageText(
          `┌ ❏ ◆ *⌜𝗕𝗥𝗢𝗔𝗗𝗖𝗔𝗦𝗧𝗜𝗡𝗚⌟* ◆
│
├◆ ᴘʀᴏɢʀᴇss: ${Math.round((i + 1) / total * 100)}%
├◆ sᴇɴᴛ: ${sent}
├◆ ғᴀɪʟᴇᴅ: ${failed}
│
└ ❏`,
          {
            chat_id: chatId,
            message_id: statusMsg.message_id,
            parse_mode: 'Markdown'
          }
        );
      }

      await sleep(SYSTEM.broadcastDelay);
    } catch (error) {
      failed++;
      if (error.response?.body?.error_code === 403) {
        database.users.delete(users[i]);
      }
    }
  }

  await bot.editMessageText(
    `┌ ❏ ◆ *⌜𝗕𝗥𝗢𝗔𝗗𝗖𝗔𝗦𝗧 𝗖𝗢𝗠𝗣𝗟𝗘𝗧𝗘𝗗⌟* ◆
│
├◆ sᴇɴᴛ: ${sent}
├◆ ғᴀɪʟᴇᴅ: ${failed}
├◆ sᴜᴄᴄᴇss: ${Math.round(sent / total * 100)}%
│
└ ❏`,
    {
      chat_id: chatId,
      message_id: statusMsg.message_id,
      parse_mode: 'Markdown'
    }
  );

  await saveData();
  addAuditLog('ʙʀᴏᴀᴅᴄᴀsᴛ', userId, null, { sent, failed, total });
});

// /clean
bot.onText(/\/clean/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isAdmin(userId.toString()) && !isOwner(userId)) {
    return bot.sendMessage(chatId, `┌ ❏ ◆ *⌜𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗⌟* ◆\n│\n├◆ ᴀᴅᴍɪɴ ᴏɴʟʏ\n│\n└ ❏`, { parse_mode: 'Markdown' });
  }

  const sessions = await getSessions();
  let cleaned = 0;
  let kept = 0;

  for (const session of sessions) {
    const sessionPath = path.join(PATHS.sessions, session);
    const credsPath = path.join(sessionPath, 'creds.json');
    
    let isValid = false;
    if (await fileExists(credsPath)) {
      try {
        const creds = JSON.parse(await fs.readFile(credsPath, 'utf8'));
        isValid = !!(creds.me && creds.me.id);
      } catch (e) {}
    }
    
    if (!isValid) {
      await fs.rm(sessionPath, { recursive: true, force: true });
      cleaned++;
    } else {
      kept++;
    }
  }

  bot.sendMessage(chatId,
    `┌ ❏ ◆ *⌜𝗖𝗟𝗘𝗔𝗡 𝗨𝗣 𝗖𝗢𝗠𝗣𝗟𝗘𝗧𝗘𝗗⌟* ◆
│
├◆ ʀᴇᴍᴏᴠᴇᴅ: ${cleaned}
├◆ ᴋᴇᴘᴛ: ${kept}
│
└ ❏`,
    { parse_mode: 'Markdown' }
  );

  addAuditLog('ᴄʟᴇᴀɴ', userId, null, { cleaned, kept });
});

// /ban
bot.onText(/\/ban(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const input = match ? match[1] : null;

  if (!isAdmin(userId.toString()) && !isOwner(userId)) {
    return bot.sendMessage(chatId, `┌ ❏ ◆ *⌜𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗⌟* ◆\n│\n├◆ ᴀᴅᴍɪɴ ᴏɴʟʏ\n│\n└ ❏`, { parse_mode: 'Markdown' });
  }

  if (!input) {
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗕𝗔𝗡 𝗚𝗨𝗜𝗗𝗘⌟* ◆
│
├◆ ᴜsᴀɢᴇ: /ban 123456789 sᴘᴀᴍᴍɪɴɢ
├◆ ᴏʀ: /ban 123456789
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  const parts = input.split(' ');
  const targetId = parts[0];
  const reason = parts.slice(1).join(' ') || 'ᴠɪᴏʟᴀᴛɪᴏɴ ᴏғ ᴛᴇʀᴍs';

  if (isOwner(parseInt(targetId))) {
    return bot.sendMessage(chatId, `┌ ❏ ◆ *⌜𝗘𝗥𝗥𝗢𝗥⌟* ◆\n│\n├◆ ᴄᴀɴɴᴏᴛ ʙᴀɴ ᴀɴ ᴏᴡɴᴇʀ\n│\n└ ❏`, { parse_mode: 'Markdown' });
  }

  database.banned[targetId] = {
    reason,
    date: new Date().toISOString(),
    bannedBy: userId.toString()
  };

  await saveData();

  bot.sendMessage(chatId,
    `┌ ❏ ◆ *⌜𝗨𝗦𝗘𝗥 𝗕𝗔𝗡𝗡𝗘𝗗⌟* ◆
│
├◆ ᴜsᴇʀ ɪᴅ: ${targetId}
├◆ ʀᴇᴀsᴏɴ: ${reason}
│
└ ❏`,
    { parse_mode: 'Markdown' }
  );

  addAuditLog('ʙᴀɴ', userId, targetId, { reason });
});

// /unban
bot.onText(/\/unban(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const input = match ? match[1] : null;

  if (!isAdmin(userId.toString()) && !isOwner(userId)) {
    return bot.sendMessage(chatId, `┌ ❏ ◆ *⌜𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗⌟* ◆\n│\n├◆ ᴀᴅᴍɪɴ ᴏɴʟʏ\n│\n└ ❏`, { parse_mode: 'Markdown' });
  }

  if (!input) {
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗨𝗡𝗕𝗔𝗡 𝗚𝗨𝗜𝗗𝗘⌟* ◆
│
├◆ ᴜsᴀɢᴇ: /unban 123456789
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  const targetId = input.trim();

  if (!database.banned[targetId]) {
    return bot.sendMessage(chatId, `┌ ❏ ◆ *⌜𝗜𝗡𝗙𝗢⌟* ◆\n│\n├◆ ᴜsᴇʀ ɪs ɴᴏᴛ ʙᴀɴɴᴇᴅ\n│\n└ ❏`, { parse_mode: 'Markdown' });
  }

  delete database.banned[targetId];
  await saveData();

  bot.sendMessage(chatId,
    `┌ ❏ ◆ *⌜𝗨𝗦𝗘𝗥 𝗨𝗡𝗕𝗔𝗡𝗡𝗘𝗗⌟* ◆
│
├◆ ᴜsᴇʀ ɪᴅ: ${targetId}
│
└ ❏`,
    { parse_mode: 'Markdown' }
  );

  addAuditLog('ᴜɴʙᴀɴ', userId, targetId);
});

// /checkuser
bot.onText(/\/checkuser(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const targetId = match ? match[1] : null;

  if (!isAdmin(userId.toString()) && !isOwner(userId)) {
    return bot.sendMessage(chatId, `┌ ❏ ◆ *⌜𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗⌟* ◆\n│\n├◆ ᴀᴅᴍɪɴ ᴏɴʟʏ\n│\n└ ❏`, { parse_mode: 'Markdown' });
  }

  if (!targetId) {
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗖𝗛𝗘𝗖𝗞 𝗨𝗦𝗘𝗥 𝗚𝗨𝗜𝗗𝗘⌟* ◆
│
├◆ ᴜsᴀɢᴇ: /checkuser 123456789
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  const user = database.userDetails[targetId] || {};
  const isBanned = database.banned[targetId] ? 'ʏᴇs' : 'ɴᴏ';
  const banReason = database.banned[targetId] ? database.banned[targetId].reason : 'ɴ/ᴀ';
  const premiumStatus = isPremium(targetId) ? 'ᴀᴄᴛɪᴠᴇ ✅' : 'ɪɴᴀᴄᴛɪᴠᴇ ❌';
  const premiumExpiry = database.premium[targetId] ? new Date(database.premium[targetId].expiry).toLocaleString() : 'ɴ/ᴀ';
  
  bot.sendMessage(chatId,
    `┌ ❏ ◆ *⌜𝗨𝗦𝗘𝗥 𝗜𝗡𝗙𝗢⌟* ◆
│
├◆ 🆔 ɪᴅ: ${targetId}
├◆ 👤 ɴᴀᴍᴇ: ${user.name || 'ɴ/ᴀ'}
├◆ 📅 ᴊᴏɪɴᴇᴅ: ${user.joined ? new Date(user.joined).toLocaleDateString() : 'ɴ/ᴀ'}
├◆ 💬 ᴍsɢs: ${user.messages || 0}
├◆ 🔗 ᴘᴀɪʀs: ${user.pairs || 0}
├◆ 🔒 ʙᴀɴɴᴇᴅ: ${isBanned}
├◆ 📝 ʀᴇᴀsᴏɴ: ${banReason}
├◆ 👑 ᴘʀᴇᴍɪᴜᴍ: ${premiumStatus}
├◆ ⏱️ ᴘʀᴇᴍɪᴜᴍ ᴇxᴘ: ${premiumExpiry}
│
└ ❏`,
    { parse_mode: 'Markdown' }
  );
});

// /maintenance
bot.onText(/\/maintenance(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const mode = match ? match[1] : null;

  if (!isAdmin(userId.toString()) && !isOwner(userId)) {
    return bot.sendMessage(chatId, `┌ ❏ ◆ *⌜𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗⌟* ◆\n│\n├◆ ᴀᴅᴍɪɴ ᴏɴʟʏ\n│\n└ ❏`, { parse_mode: 'Markdown' });
  }

  if (!mode) {
    const status = database.maintenance ? 'ᴇɴᴀʙʟᴇᴅ 🔧' : 'ᴅɪsᴀʙʟᴇᴅ ✅';
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗠𝗔𝗜𝗡𝗧𝗘𝗡𝗔𝗡𝗖𝗘 𝗠𝗢𝗗𝗘⌟* ◆
│
├◆ ᴄᴜʀʀᴇɴᴛ sᴛᴀᴛᴜs: ${status}
├◆
├◆ ᴜsᴀɢᴇ: /maintenance ᴏɴ
├◆ ᴜsᴀɢᴇ: /maintenance ᴏғғ
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  if (!['ᴏɴ', 'ᴏғғ'].includes(mode.toLowerCase())) {
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗜𝗡𝗩𝗔𝗟𝗜𝗗⌟* ◆\n│\n├◆ ᴜsᴇ /maintenance ᴏɴ ᴏʀ /maintenance ᴏғғ\n│\n└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  database.maintenance = mode.toLowerCase() === 'ᴏɴ';
  await saveData();

  bot.sendMessage(chatId,
    `┌ ❏ ◆ *⌜𝗠𝗔𝗜𝗡𝗧𝗘𝗡𝗔𝗡𝗖𝗘 𝗠𝗢𝗗𝗘⌟* ◆
│
├◆ sᴛᴀᴛᴜs: ${database.maintenance ? 'ᴇɴᴀʙʟᴇᴅ 🔧' : 'ᴅɪsᴀʙʟᴇᴅ ✅'}
│
└ ❏`,
    { parse_mode: 'Markdown' }
  );

  addAuditLog('ᴍᴀɪɴᴛᴇɴᴀɴᴄᴇ', userId, null, { enabled: database.maintenance });
});

// /logs
bot.onText(/\/logs/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isAdmin(userId.toString()) && !isOwner(userId)) {
    return bot.sendMessage(chatId, `┌ ❏ ◆ *⌜𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗⌟* ◆\n│\n├◆ ᴀᴅᴍɪɴ ᴏɴʟʏ\n│\n└ ❏`, { parse_mode: 'Markdown' });
  }

  const recentLogs = database.audit.slice(-5).reverse();
  
  if (recentLogs.length === 0) {
    return bot.sendMessage(chatId, `┌ ❏ ◆ *⌜𝗡𝗢 𝗟𝗢𝗚𝗦⌟* ◆\n│\n├◆ ɴᴏ ʟᴏɢs ᴀᴠᴀɪʟᴀʙʟᴇ\n│\n└ ❏`, { parse_mode: 'Markdown' });
  }

  let logText = `┌ ❏ ◆ *⌜𝗥𝗘𝗖𝗘𝗡𝗧 𝗟𝗢𝗚𝗦⌟* ◆\n│\n`;
  recentLogs.forEach((log, index) => {
    const time = new Date(log.timestamp).toLocaleString();
    logText += `├◆ ${index + 1}. ${log.action}\n├◆    ᴜsᴇʀ: ${log.userId}\n├◆    ᴛɪᴍᴇ: ${time}\n`;
    if (log.target) logText += `├◆    ᴛᴀʀɢᴇᴛ: ${log.target}\n`;
    logText += `│\n`;
  });
  logText += `└ ❏`;

  bot.sendMessage(chatId, logText, { parse_mode: 'Markdown' });
});

// /announce
bot.onText(/\/announce(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const input = match ? match[1] : null;

  if (!isAdmin(userId.toString()) && !isOwner(userId)) {
    return bot.sendMessage(chatId, `┌ ❏ ◆ *⌜𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗⌟* ◆\n│\n├◆ ᴀᴅᴍɪɴ ᴏɴʟʏ\n│\n└ ❏`, { parse_mode: 'Markdown' });
  }

  if (!input) {
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗔𝗡𝗡𝗢𝗨𝗡𝗖𝗘 𝗚𝗨𝗜𝗗𝗘⌟* ◆
│
├◆ ᴜsᴀɢᴇ: /announce 10ᴍ ᴜᴘᴅᴀᴛᴇ ᴍᴇssᴀɢᴇ
├◆ ᴇxᴀᴍᴘʟᴇ: /announce 1ʜ sʏsᴛᴇᴍ ᴜᴘᴅᴀᴛᴇ
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  const parts = input.split(' ');
  const timeArg = parts[0];
  const message = parts.slice(1).join(' ');

  if (!message) {
    return bot.sendMessage(chatId, `┌ ❏ ◆ *⌜𝗘𝗥𝗥𝗢𝗥⌟* ◆\n│\n├◆ ᴘʟᴇᴀsᴇ ᴘʀᴏᴠɪᴅᴇ ᴀ ᴍᴇssᴀɢᴇ\n│\n└ ❏`, { parse_mode: 'Markdown' });
  }

  let delay = 0;
  if (timeArg.endsWith('ᴍ')) {
    delay = parseInt(timeArg) * 60 * 1000;
  } else if (timeArg.endsWith('ʜ')) {
    delay = parseInt(timeArg) * 60 * 60 * 1000;
  } else {
    return bot.sendMessage(chatId, `┌ ❏ ◆ *⌜𝗜𝗡𝗩𝗔𝗟𝗜𝗗⌟* ◆\n│\n├◆ ᴜsᴇ 10ᴍ ᴏʀ 1ʜ\n│\n└ ❏`, { parse_mode: 'Markdown' });
  }

  const scheduleTime = new Date(Date.now() + delay);

  bot.sendMessage(chatId,
    `┌ ❏ ◆ *⌜𝗔𝗡𝗡𝗢𝗨𝗡𝗖𝗘𝗠𝗘𝗡𝗧 𝗦𝗖𝗛𝗘𝗗𝗨𝗟𝗘𝗗⌟* ◆
│
├◆ ᴛɪᴍᴇ: ${scheduleTime.toLocaleString()}
├◆ ᴍᴇssᴀɢᴇ: ${message}
│
└ ❏`,
    { parse_mode: 'Markdown' }
  );

  setTimeout(async () => {
    let sent = 0;
    let failed = 0;
    
    for (const user of [...database.users]) {
      try {
        await bot.sendMessage(user,
          `┌ ❏ ◆ *⌜𝗦𝗖𝗛𝗘𝗗𝗨𝗟𝗘𝗗 𝗔𝗡𝗡𝗢𝗨𝗡𝗖𝗘𝗠𝗘𝗡𝗧⌟* ◆
│
├◆ ${message}
│
└ ❏
┌ ❏ ◆ *⌜𝗜𝗡𝗙𝗢⌟* ◆
│
├◆ 🕒 ${new Date().toLocaleString()}
│
└ ❏`,
          { parse_mode: 'Markdown' }
        );
        sent++;
        await sleep(SYSTEM.broadcastDelay);
      } catch {
        failed++;
      }
    }

    bot.sendMessage(userId,
      `┌ ❏ ◆ *⌜𝗔𝗡𝗡𝗢𝗨𝗡𝗖𝗘𝗠𝗘𝗡𝗧 𝗖𝗢𝗠𝗣𝗟𝗘𝗧𝗘𝗗⌟* ◆
│
├◆ sᴇɴᴛ: ${sent}
├◆ ғᴀɪʟᴇᴅ: ${failed}
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }, delay);

  addAuditLog('ᴀɴɴᴏᴜɴᴄᴇ', userId, null, { time: timeArg, message });
});

// ==================== OWNER COMMANDS ====================

// /addadmin
bot.onText(/\/addadmin(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const targetId = match ? match[1] : null;

  if (!isOwner(userId)) {
    return bot.sendMessage(chatId, `┌ ❏ ◆ *⌜𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗⌟* ◆\n│\n├◆ ᴏᴡɴᴇʀ ᴏɴʟʏ\n│\n└ ❏`, { parse_mode: 'Markdown' });
  }

  if (!targetId) {
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗔𝗗𝗗 𝗔𝗗𝗠𝗜𝗡 𝗚𝗨𝗜𝗗𝗘⌟* ◆
│
├◆ ᴜsᴀɢᴇ: /addadmin 123456789
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  if (database.admins.includes(targetId)) {
    return bot.sendMessage(chatId, `┌ ❏ ◆ *⌜𝗜𝗡𝗙𝗢⌟* ◆\n│\n├◆ ᴜsᴇʀ ɪs ᴀʟʀᴇᴀᴅʏ ᴀɴ ᴀᴅᴍɪɴ\n│\n└ ❏`, { parse_mode: 'Markdown' });
  }

  database.admins.push(targetId);
  await saveData();

  bot.sendMessage(chatId,
    `┌ ❏ ◆ *⌜𝗔𝗗𝗠𝗜𝗡 𝗔𝗗𝗗𝗘𝗗⌟* ◆
│
├◆ ᴜsᴇʀ ɪᴅ: ${targetId}
│
└ ❏`,
    { parse_mode: 'Markdown' }
  );

  addAuditLog('ᴀᴅᴅᴀᴅᴍɪɴ', userId, targetId);
});

// /removeadmin
bot.onText(/\/removeadmin(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const targetId = match ? match[1] : null;

  if (!isOwner(userId)) {
    return bot.sendMessage(chatId, `┌ ❏ ◆ *⌜𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗⌟* ◆\n│\n├◆ ᴏᴡɴᴇʀ ᴏɴʟʏ\n│\n└ ❏`, { parse_mode: 'Markdown' });
  }

  if (!targetId) {
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗥𝗘𝗠𝗢𝗩𝗘 𝗔𝗗𝗠𝗜𝗡 𝗚𝗨𝗜𝗗𝗘⌟* ◆
│
├◆ ᴜsᴀɢᴇ: /removeadmin 123456789
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  if (isOwner(parseInt(targetId))) {
    return bot.sendMessage(chatId, `┌ ❏ ◆ *⌜𝗘𝗥𝗥𝗢𝗥⌟* ◆\n│\n├◆ ᴄᴀɴɴᴏᴛ ʀᴇᴍᴏᴠᴇ ᴀɴ ᴏᴡɴᴇʀ\n│\n└ ❏`, { parse_mode: 'Markdown' });
  }

  const index = database.admins.indexOf(targetId);
  if (index === -1) {
    return bot.sendMessage(chatId, `┌ ❏ ◆ *⌜𝗜𝗡𝗙𝗢⌟* ◆\n│\n├◆ ᴜsᴇʀ ɪs ɴᴏᴛ ᴀɴ ᴀᴅᴍɪɴ\n│\n└ ❏`, { parse_mode: 'Markdown' });
  }

  database.admins.splice(index, 1);
  await saveData();

  bot.sendMessage(chatId,
    `┌ ❏ ◆ *⌜𝗔𝗗𝗠𝗜𝗡 𝗥𝗘𝗠𝗢𝗩𝗘𝗗⌟* ◆
│
├◆ ᴜsᴇʀ ɪᴅ: ${targetId}
│
└ ❏`,
    { parse_mode: 'Markdown' }
  );

  addAuditLog('ʀᴇᴍᴏᴠᴇᴀᴅᴍɪɴ', userId, targetId);
});

bot.onText(/\/status/, (msg) => {
    const chatId = msg.chat.id;
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    bot.sendMessage(chatId,
        `*📊 Bot Status*\n\n` +
        `✅ Status: *Online*\n` +
        `⏱️ Uptime: *${hours}h ${minutes}m ${seconds}s*\n` +
        `🗓️ Node.js: *${process.version}*\n` +
        `💾 Memory: *${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB*`,
        { parse_mode: 'Markdown' }
    );
});

// ==================== MANUAL PREMIUM ADMIN CONTROLS ====================
bot.onText(/\/addpremium(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id, adminId = msg.from.id;
  if (!isAdmin(adminId.toString()) && !isOwner(adminId)) return bot.sendMessage(chatId, '❌ Admin only.');
  const args = String(match?.[1] || '').trim().split(/\s+/);
  const targetId = args.shift(), duration = args.join(' ');
  if (!/^\d+$/.test(targetId || '') || !duration) return bot.sendMessage(chatId, 'Usage: /addpremium USER_ID 30 days');
  const durationMs = parseDuration(duration);
  if (!durationMs || durationMs <= 0) return bot.sendMessage(chatId, '❌ Invalid duration. Example: 30 days or 1 month.');
  const premium = await grantPremium(targetId, durationMs, adminId);
  await bot.sendMessage(chatId, '✅ Premium activated for ' + targetId + '\\nExpiry: ' + formatPlanExpiry(premium.expiry));
  try { await bot.sendMessage(targetId, '👑 TOHID-BUG PREMIUM ACTIVATED\\nExpiry: ' + formatPlanExpiry(premium.expiry)); } catch (e) {}
});

bot.onText(/\/delpremium(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id, adminId = msg.from.id, targetId = String(match?.[1] || '').trim();
  if (!isAdmin(adminId.toString()) && !isOwner(adminId)) return bot.sendMessage(chatId, '❌ Admin only.');
  if (!/^\d+$/.test(targetId)) return bot.sendMessage(chatId, 'Usage: /delpremium USER_ID');
  if (!database.premium[targetId]) return bot.sendMessage(chatId, '❌ User is not Premium.');
  delete database.premium[targetId]; await saveData(); addAuditLog('ᴘʀᴇᴍɪᴜᴍ_ʀᴇᴍᴏᴠᴇ', adminId, targetId);
  return bot.sendMessage(chatId, '✅ Premium removed from ' + targetId + '.');
});

bot.onText(/\/premiumusers/, async (msg) => {
  const chatId = msg.chat.id, adminId = msg.from.id;
  if (!isAdmin(adminId.toString()) && !isOwner(adminId)) return bot.sendMessage(chatId, '❌ Admin only.');
  const entries = Object.entries(database.premium).filter(([, d]) => Number(d?.expiry) > Date.now());
  if (!entries.length) return bot.sendMessage(chatId, '👑 No active Premium users.');
  const lines = entries.slice(0, 50).map(([id, d], i) => (i + 1) + '. ' + id + ' — ' + formatPlanExpiry(d.expiry));
  return bot.sendMessage(chatId, '👑 *PREMIUM USERS*\\n\\n' + lines.join('\\n'), { parse_mode: 'Markdown' });
});
// ==================== TELEGRAM TUTORIAL CONTROLS ====================
bot.onText(/^\/settutorial(?:@[\w_]+)?(?:\s+(.+))?$/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  if (!isOwner(userId)) return bot.sendMessage(chatId, '❌ *Access denied!*\\nOnly the owner can use this command.', { parse_mode: 'Markdown' });

  const url = String(match?.[1] || '').trim();
  if (!url) {
    return bot.sendMessage(chatId,
      '┌ ❏ ◆ *⌜𝗦𝗘𝗧 𝗧𝗨𝗧𝗢𝗥𝗜𝗔𝗟 𝗚𝗨𝗜𝗗𝗘⌟* ◆\\n│\\n' +
      '├◆ ᴜsᴀɢᴇ: /settutorial <ᴛᴇʟᴇɢʀᴀᴍ ᴘᴏsᴛ ʟɪɴᴋ>\\n│\\n' +
      '├◆ ᴘᴜʙʟɪᴄ ᴇxᴀᴍᴘʟᴇ:\\n' +
      '├◆ /settutorial https://t.me/TohidChannel/123\\n│\\n' +
      '├◆ ᴘʀɪᴠᴀᴛᴇ ᴇxᴀᴍᴘʟᴇ:\\n' +
      '├◆ /settutorial https://t.me/c/1234567890/123\\n│\\n' +
      '├◆ ⚠️ ᴜsᴇ ᴛʜᴇ ʟɪɴᴋ ᴏғ ᴛʜᴇ ᴇxᴀᴄᴛ ᴠɪᴅᴇᴏ/ᴘᴏsᴛ\\n│\\n' +
      '└ ❏',
      { parse_mode: 'Markdown' }
    );
  }

  if (!isValidTelegramUrl(url)) {
    return bot.sendMessage(chatId,
      '❌ *Invalid Telegram post link.*\\n\\n' +
      'Please use the exact video/post link.\\n\\n' +
      '✅ Public example:\\n' +
      'https://t.me/TohidChannel/123\\n\\n' +
      '✅ Private example:\\n' +
      'https://t.me/c/1234567890/123',
      { parse_mode: 'Markdown' }
    );
  }

  saveTutorialVideoUrl(url);
  return bot.sendMessage(chatId,
    '✅ *Tutorial video link updated.*\\n\\n' +
    '🎬 ' + url + '\\n\\n' +
    'The *WATCH NOW* button will open this exact Telegram post.',
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/^\/deltutorial(?:@[\w_]+)?$/i, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  if (!isOwner(userId)) return bot.sendMessage(chatId, '❌ *Access denied!*\\nOnly the owner can use this command.', { parse_mode: 'Markdown' });

  saveTutorialVideoUrl('');
  return bot.sendMessage(chatId, '🗑️ *Tutorial video link removed.*\\n\\nWATCH NOW will stay unavailable until you add a new link.', { parse_mode: 'Markdown' });
});

bot.onText(/^\/tutorialstatus(?:@[\w_]+)?$/i, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from?.id;
  if (!isOwner(userId)) return bot.sendMessage(chatId, '❌ *Access denied!*\\nOnly the owner can use this command.', { parse_mode: 'Markdown' });

  const url = getTutorialVideoUrl();
  if (!url) {
    return bot.sendMessage(chatId,
      '❌ *No tutorial video link is configured.*\\n\\nUse /settutorial followed by a Telegram video/post link.',
      { parse_mode: 'Markdown' }
    );
  }

  return bot.sendMessage(chatId,
    '🎬 *Current Tutorial Video*\\n\\n' +
    'The button below opens the exact Telegram video/post.',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '▶️ ᴏᴘᴇɴ ᴠɪᴅᴇᴏ', url }]
        ]
      }
    }
  );
});

bot.onText(/^\/restart(?:@[\w_]+)?$/i, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    if (!isOwner(userId)) return bot.sendMessage(chatId, '❌ *Access denied!*\nOnly the owner can use this command.', { parse_mode: 'Markdown' });
    try {
        const platform = detectPlatform();
        await bot.sendMessage(chatId, '🔄 *Restarting TOHID-AI...*\n\n🖥️ Platform: *' + platform + '*\n⏳ Restarting safely...', { parse_mode: 'Markdown' });
        console.log('[RESTART] Owner requested restart on ' + platform + '.');
        const result = await restartProcess();
        console.log('[RESTART] ' + result.platform + ' via ' + result.method + '.');
    } catch (error) {
        console.error('[RESTART] Failed:', error);
        await bot.sendMessage(chatId, '❌ *Restart failed.*\n\n' + String(error.message || error).slice(0, 2500), { parse_mode: 'Markdown' });
    }
});

// ==================== GITHUB UPDATE ====================
bot.onText(/^\/update(?:@[\w_]+)?$/i, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    if (!isOwner(userId)) return bot.sendMessage(chatId, '❌ *Access denied!*\nOnly the owner can use this command.', { parse_mode: 'Markdown' });
    try {
        const platform = detectPlatform();
        await bot.sendMessage(chatId, '⬆️ *Updating TOHID-AI...*\n\n📦 Source: *' + GITHUB_OWNER + '/' + GITHUB_REPO + ':' + GITHUB_BRANCH + '*\n🖥️ Platform: *' + platform + '*\n⏳ Getting the latest version...', { parse_mode: 'Markdown' });
        console.log('[UPDATE] Owner requested update on ' + platform + '.');
        const result = await updateFromGitHub();
        await bot.sendMessage(chatId, '✅ *Update started successfully.*\n\n📦 Latest GitHub version is being applied.\n🔄 Restarting with the updated version...', { parse_mode: 'Markdown' });
        console.log('[UPDATE] Completed via ' + result.method + '.');
        if (!result.restartHandled) setTimeout(() => restartProcess().catch(error => console.error('[UPDATE] Restart after update failed:', error)), 1200);
    } catch (error) {
        console.error('[UPDATE] Failed:', error);
        const details = String(error.stderr || error.stdout || error.message || 'Unknown error').trim();
        await bot.sendMessage(chatId, '❌ *Update failed.*\n\n' + details.slice(-3000), { parse_mode: 'Markdown' });
    }
});
// ==================== CALLBACK HANDLER ====================
bot.on('callback_query', async (query) => {
  const msg = query.message;
  const data = query.data;
  const userId = query.from.id;
  const chatId = msg.chat.id;
  const userName = query.from.first_name || 'ᴜsᴇʀ';

  await trackUser(userId, userName);

  if (data === 'verify_membership') {
    await bot.answerCallbackQuery(query.id, { text: 'ᴠᴇʀɪғʏɪɴɢ...' });
    
    const verification = await verifyMembership(userId);
    
    if (verification.verified) {
      await bot.editMessageText(
        `┌ ❏ ◆ *⌜𝗩𝗘𝗥𝗜𝗙𝗜𝗖𝗔𝗧𝗜𝗢𝗡 𝗦𝗨𝗖𝗖𝗘𝗦𝗦⌟* ◆
│
├◆ ᴀᴄᴄᴇss ɢʀᴀɴᴛᴇᴅ
├◆ ᴄʟɪᴄᴋ ʙᴇʟᴏᴡ ᴛᴏ ᴄᴏɴᴛɪɴᴜᴇ
│
└ ❏`,
        {
          chat_id: chatId,
          message_id: msg.message_id,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🚀 ᴄᴏɴᴛɪɴᴜᴇ', callback_data: 'show_main' }]
            ]
          }
        }
      );
    } else {
      await bot.answerCallbackQuery(query.id, {
        text: 'ᴘʟᴇᴀsᴇ ᴊᴏɪɴ ᴀʟʟ ᴄʜᴀɴɴᴇʟs ғɪʀsᴛ',
        show_alert: true
      });
    }
  }

  else if (data === 'premium_plans') {
    await bot.answerCallbackQuery(query.id);
    return sendPlans(chatId, userId);
  }

  else if (data === 'show_main') {
    await bot.answerCallbackQuery(query.id);
    await sendMainMenu(chatId, userId, userName, isAdmin(userId.toString()), isOwner(userId));
  }

  else if (data === 'show_bug_menu') {
    await bot.answerCallbackQuery(query.id, { text: 'ʙᴜɢ ᴍᴇɴᴜ' });
    return sendBugMenu(chatId);
  }

  else if (data === 'user_dashboard') {
    await bot.answerCallbackQuery(query.id, { text: 'ᴅᴀsʜʙᴏᴀʀᴅ' });
    return sendDashboard(chatId, userId);
  }

  else if (data === 'my_bots') {
    await bot.answerCallbackQuery(query.id, { text: 'ᴍʏ ʙᴏᴛs' });
    return sendMyBots(chatId, userId);
  }

  else if (data === 'misc_menu') {
    await bot.answerCallbackQuery(query.id, { text: 'ᴍɪsᴄ ᴍᴇɴᴜ' });

    const isOwnerUser = isOwner(userId);
    const isAdminUser = isAdmin(userId.toString());

    let miscText = `┌ ❏ ◆ *⌜𝗠𝗜𝗦𝗖 𝗠𝗘𝗡𝗨⌟* ◆
│
├◆ *⌜𝗤𝗨𝗜𝗖𝗞 𝗔𝗖𝗧𝗜𝗢𝗡𝗦⌟*
│
├◆ /pair    - ᴘᴀɪʀ ᴡʜᴀᴛsᴀᴘᴘ
├◆ /unpair  - ʀᴇᴍᴏᴠᴇ sᴇssɪᴏɴ
├◆ /ping    - ʟᴀᴛᴇɴᴄʏ ᴄʜᴇᴄᴋ
├◆ /runtime - sʏsᴛᴇᴍ ᴜᴘᴛɪᴍᴇ
├◆ /stats   - ʙᴏᴛ sᴛᴀᴛɪsᴛɪᴄs
├◆ /report  - ᴄᴏɴᴛᴀᴄᴛ sᴜᴘᴘᴏʀᴛ
├◆ /plans   - ᴘʀᴇᴍɪᴜᴍ sᴇʀᴠɪᴄᴇ ᴘʟᴀɴ
├◆ /myplan  - ʏᴏᴜʀ ᴘʟᴀɴ
├◆ /tutorial - ᴠɪᴅᴇᴏ ɢᴜɪᴅᴇ
├◆ /help    - ᴄᴏᴍᴍᴀɴᴅ ʟɪsᴛ`;

    if (isAdminUser || isOwnerUser) {
      miscText += `\n│
└ ❏
┌ ❏ ◆ *⌜𝗔𝗗𝗠𝗜𝗡 𝗖𝗢𝗡𝗧𝗥𝗢𝗟⌟* ◆
│
├◆ /users
├◆ /listpair
├◆ /broadcast
├◆ /clean
├◆ /ban
├◆ /unban
├◆ /checkuser
├◆ /addpremium USER_ID 30 days
├◆ /delpremium USER_ID
├◆ /premiumusers
├◆ /maintenance
├◆ /logs
├◆ /announce
├◆ /createcoupon CODE DAYS MAX_USES
├◆ /coupons`;
    }

    if (isOwnerUser) {
      miscText += `\n│
└ ❏
┌ ❏ ◆ *⌜𝗢𝗪𝗡𝗘𝗥 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦⌟* ◆
│
├◆ /addadmin
├◆ /removeadmin
├◆ /setchannels
├◆ /settutorial
├◆ /restart
├◆ /update`;
    }

    miscText += `
│
└ ❏`;

    return bot.sendMessage(chatId, miscText, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '👑 ᴘʟᴀɴs', callback_data: 'premium_plans' }],
          [{ text: '🏠 ᴍᴇɴᴜ', callback_data: 'show_main' }]
        ]
      }
    });
  }

  else if (data === 'show_tutorial') {
    await bot.answerCallbackQuery(query.id);

    const tutorialVideo = getTutorialVideoUrl();

    if (!tutorialVideo) {
      return bot.sendMessage(chatId,
        `┌ ❏ ◆ *⌜𝗩𝗜𝗗𝗘𝗢 𝗧𝗨𝗧𝗢𝗥𝗜𝗔𝗟⌟* ◆
│
├◆ ❌ ᴠɪᴅᴇᴏ ʟɪɴᴋ ɪs ɴᴏᴛ ᴄᴏɴғɪɢᴜʀᴇᴅ
├◆ 👑 ᴏᴡɴᴇʀ: ᴜsᴇ /settutorial
│
└ ❏`,
        { parse_mode: 'Markdown' }
      );
    }

    // Use a URL button directly so one tap opens the exact Telegram post.
    return bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗩𝗜𝗗𝗘𝗢 𝗧𝗨𝗧𝗢𝗥𝗜𝗔𝗟⌟* ◆
│
├◆ ᴡᴀᴛᴄʜ ᴛʜᴇ ᴄᴏᴍᴘʟᴇᴛᴇ sᴇᴛᴜᴘ ɢᴜɪᴅᴇ
│
└ ❏`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '▶️ ᴡᴀᴛᴄʜ ɴᴏᴡ', url: tutorialVideo }]
          ]
        }
      }
    );
  }

  else if (data === 'watch_tutorial') {
    const tutorialVideo = getTutorialVideoUrl();

    if (!tutorialVideo) {
      await bot.answerCallbackQuery(query.id, { text: 'Tutorial link is not configured', show_alert: true });
      return bot.sendMessage(chatId,
        `┌ ❏ ◆ *⌜𝗧𝗨𝗧𝗢𝗥𝗜𝗔𝗟 𝗩𝗜𝗗𝗘𝗢⌟* ◆\\n│\\n├◆ ❌ ᴠɪᴅᴇᴏ ʟɪɴᴋ ɪs ɴᴏᴛ ᴄᴏɴғɪɢᴜʀᴇᴅ\\n├◆ 👑 ᴏᴡɴᴇʀ: ᴜsᴇ /settutorial\\n│\\n└ ❏`,
        { parse_mode: 'Markdown' }
      );
    }

    await bot.answerCallbackQuery(query.id, { text: 'Opening tutorial...' });
    return bot.sendMessage(chatId,
      `🎬 *${SYSTEM.name} SETUP GUIDE*\\n\\n👇 Tap below to watch the tutorial video.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '▶️ ᴡᴀᴛᴄʜ ᴠɪᴅᴇᴏ', url: tutorialVideo }]]
        }
      }
    );
  }

  else if (data === 'pair_guide') {
    await bot.answerCallbackQuery(query.id);
    
    bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗣𝗔𝗜𝗥 𝗚𝗨𝗜𝗗𝗘⌟* ◆
│
├◆ ᴜsᴇ: /pair 9178499xxxxx
├◆ ᴏʀ: /pair 9178499xxxxx|1234
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );
  }

  else if (data === 'bot_stats') {
    await bot.answerCallbackQuery(query.id, { text: 'ʟᴏᴀᴅɪɴɢ...' });
    
    const sessions = await getSessions();
    const avgSpeed = database.stats.pairingSpeed.length > 0 
      ? Math.round(database.stats.pairingSpeed.reduce((a, b) => a + b) / database.stats.pairingSpeed.length) 
      : 0;
    const premiumCount = Object.keys(database.premium).filter(id => isPremium(id)).length;

    let stats = `┌ ❏ ◆ *⌜𝗕𝗢𝗧 𝗦𝗧𝗔𝗧𝗜𝗦𝗧𝗜𝗖𝗦⌟* ◆
│
├◆ 👥 ᴜsᴇʀs: ${formatNumber(database.stats.totalUsers)}
├◆ 🔗 sᴇssɪᴏɴs: ${sessions.length}/${SYSTEM.sessionLimit}
├◆ 📊 ᴄᴏɴɴᴇᴄᴛɪᴏɴs: ${formatNumber(database.stats.totalConnections)}
├◆ 📅 ᴛᴏᴅᴀʏ: ${formatNumber(database.stats.dailyConnections)}
├◆ ⚡ ᴀᴠɢ sᴘᴇᴇᴅ: ${avgSpeed}ᴍs
├◆ 👑 ᴘʀᴇᴍɪᴜᴍ: ${premiumCount}`;


    stats += `\n│\n└ ❏`;

    // The main menu is sent as a photo, so edit the caption rather than
    // trying to edit it as a text message.
    await bot.editMessageCaption(stats, {
      chat_id: chatId,
      message_id: msg.message_id,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 ʀᴇғʀᴇsʜ', callback_data: 'bot_stats' }],
          [{ text: '🏠 ᴍᴀɪɴ ᴍᴇɴᴜ', callback_data: 'show_main' }]
        ]
      }
    });
  }

  else if (data.startsWith('copy_')) {
    const code = data.replace('copy_', '');
    await bot.answerCallbackQuery(query.id, {
      text: `ᴄᴏᴅᴇ: ${code}`,
      show_alert: true
    });
  }

  else if (data.startsWith('copyid_')) {
    const id = data.replace('copyid_', '');
    await bot.answerCallbackQuery(query.id, {
      text: `ᴜsᴇʀ ɪᴅ: ${id}`,
      show_alert: true
    });
  }

  else if (data.startsWith('reply_')) {
    const targetId = data.replace('reply_', '');
    
    await bot.answerCallbackQuery(query.id, {
      text: 'ʀᴇᴘʟʏ ᴛᴏ ᴛʜɪs ᴍᴇssᴀɢᴇ',
      show_alert: true
    });
    
    bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗥𝗘𝗣𝗟𝗬 𝗠𝗢𝗗𝗘⌟* ◆
│
├◆ ᴛᴀʀɢᴇᴛ: ${targetId}
├◆ ᴜsᴇ: /reply ${targetId} ʏᴏᴜʀ ᴍᴇssᴀɢᴇ
│
└ ❏`,
      {
        parse_mode: 'Markdown',
        reply_to_message_id: msg.message_id
      }
    );
  }
});

// ==================== ADMIN REPLY COMMAND ====================
bot.onText(/\/reply (\d+) (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const targetId = match[1];
  const replyMessage = match[2];

  if (!isAdmin(userId.toString()) && !isOwner(userId)) {
    return bot.sendMessage(chatId, `┌ ❏ ◆ *⌜𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗⌟* ◆\n│\n├◆ ᴀᴅᴍɪɴ ᴏɴʟʏ\n│\n└ ❏`, { parse_mode: 'Markdown' });
  }

  try {
    await bot.sendMessage(targetId,
      `┌ ❏ ◆ *⌜𝗔𝗗𝗠𝗜𝗡 𝗥𝗘𝗦𝗣𝗢𝗡𝗦𝗘⌟* ◆
│
├◆ ${replyMessage}
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );

    bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜𝗥𝗘𝗣𝗟𝗬 𝗦𝗘𝗡𝗧⌟* ◆
│
├◆ ᴛᴏ: ${targetId}
├◆ ᴍᴇssᴀɢᴇ: ${replyMessage}
│
└ ❏`,
      { parse_mode: 'Markdown' }
    );

    addAuditLog('ᴀᴅᴍɪɴ_ʀᴇᴘʟʏ', userId, targetId, { message: replyMessage });
  } catch (error) {
    bot.sendMessage(chatId, `┌ ❏ ◆ *⌜𝗘𝗥𝗥𝗢𝗥⌟* ◆\n│\n├◆ ғᴀɪʟᴇᴅ ᴛᴏ sᴇɴᴅ ʀᴇᴘʟʏ\n│\n└ ❏`, { parse_mode: 'Markdown' });
  }
});

// ==================== GROUP MESSAGE HANDLER ====================
bot.on('message', async (msg) => {
  if (msg.chat.type === 'private') return;
  
  if (msg.text && msg.text.includes(`@${(await bot.getMe()).username}`)) {
    await handleGroupMessage(msg);
  }
});

// ==================== AUTO-REPLY SYSTEM ====================
bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/') || msg.chat.type === 'private') return;

  const text = msg.text.toLowerCase();
  const chatId = msg.chat.id;

  const responses = {
    'how to pair': '┌ ❏ ◆ *⌜𝗜𝗡𝗙𝗢⌟* ◆\n│\n├◆ ᴜsᴇ /pair ғᴏʟʟᴏᴡᴇᴅ ʙʏ ʏᴏᴜʀ ɴᴜᴍʙᴇʀ\n│\n└ ❏',
    'how to connect': '┌ ❏ ◆ *⌜𝗜𝗡𝗙𝗢⌟* ◆\n│\n├◆ ᴜsᴇ /pair ᴄᴏᴍᴍᴀɴᴅ ᴛᴏ ᴄᴏɴɴᴇᴄᴛ\n│\n└ ❏',
    'what is axis': `┌ ❏ ◆ *⌜𝗜𝗡𝗙𝗢⌟* ◆\n│\n├◆ ${SYSTEM.name} ɪs ᴀ ᴘʀᴏғᴇssɪᴏɴᴀʟ ᴘᴀɪʀɪɴɢ sʏsᴛᴇᴍ\n│\n└ ❏`,
    'help': '┌ ❏ ◆ *⌜𝗜𝗡𝗙𝗢⌟* ◆\n│\n├◆ ᴜsᴇ /help ғᴏʀ ᴄᴏᴍᴍᴀɴᴅ ʟɪsᴛ\n│\n└ ❏',
    'tutorial': '┌ ❏ ◆ *⌜𝗜𝗡𝗙𝗢⌟* ◆\n│\n├◆ ᴜsᴇ /tutorial ғᴏʀ ᴠɪᴅᴇᴏ ɢᴜɪᴅᴇ\n│\n└ ❏',
    'premium': `┌ ❏ ◆ *⌜𝗣𝗥𝗘𝗠𝗜𝗨𝗠 𝗜𝗡𝗙𝗢⌟* ◆
│
├◆ ᴛᴏ ɢᴇᴛ ᴘʀᴇᴍɪᴜᴍ ᴀᴄᴄᴇss:
├◆
├◆ 📞 ᴄᴏɴᴛᴀᴄᴛ: @Tohidkhan6332
├◆ 💬 ᴏʀ ᴠɪsɪᴛ: ${DEVELOPER_CONTACTS.telegram}
│
└ ❏`
  };

  for (const [key, response] of Object.entries(responses)) {
    if (text.includes(key)) {
      await bot.sendMessage(chatId, response, {
        parse_mode: 'Markdown',
        reply_to_message_id: msg.message_id
      });
      break;
    }
  }
});

// ==================== PREMIUM EXPIRY CHECKER ====================
// Run every hour to check and remove expired premium users
setInterval(async () => {
  let expired = 0;
  const now = Date.now();
  
  for (const [userId, data] of Object.entries(database.premium)) {
    const remaining = Number(data.expiry) - now;
    const warningDays = [7, 3, 1];
    if (remaining > 0 && warningDays.includes(Math.ceil(remaining / 86400000)) && data.lastWarningDay !== Math.ceil(remaining / 86400000)) {
      const warningDay = Math.ceil(remaining / 86400000);
      data.lastWarningDay = warningDay;
      try {
        await bot.sendMessage(userId,
          `⚠️ *PREMIUM EXPIRY WARNING*\\n\\nYour TOHID-BUG Premium expires in *${warningDay} day(s)*.\\n📅 ${formatPlanExpiry(data.expiry)}\\n\\nContact @Tohidkhan6332 for renewal.`,
          { parse_mode: 'Markdown' }
        );
      } catch (e) {}
    }

    if (data.expiry < now) {
      delete database.premium[userId];
      expired++;
      
      // Notify user about expiry
      try {
        await bot.sendMessage(userId,
          `┌ ❏ ◆ *⌜𝗣𝗥𝗘𝗠𝗜𝗨𝗠 𝗘𝗫𝗣𝗜𝗥𝗘𝗗⌟* ◆
│
├◆ ʏᴏᴜʀ ᴘʀᴇᴍɪᴜᴍ sᴜʙsᴄʀɪᴘᴛɪᴏɴ ʜᴀs ᴇɴᴅᴇᴅ
├◆
├◆ 📞 ᴄᴏɴᴛᴀᴄᴛ ᴅᴇᴠᴇʟᴏᴘᴇʀ ғᴏʀ ʀᴇɴᴇᴡᴀʟ
│
└ ❏`,
          { parse_mode: 'Markdown' }
        );
      } catch (e) {}
    }
  }
  
  if (expired > 0) {
    console.log(`🧹 ᴄʟᴇᴀɴᴇᴅ ${expired} ᴇxᴘɪʀᴇᴅ ᴘʀᴇᴍɪᴜᴍ ᴜsᴇʀs`);
    await saveData();
  }
}, 60 * 60 * 1000); // Check every hour

// ==================== INITIALIZATION ====================
(async () => {
  console.clear();
  
  await ensureDirectories();
  await loadDatabase();
  
  console.log(chalk.cyan(`
╔══════════════════════════════════════╗
║     ${SYSTEM.name} v${SYSTEM.version}          ║
║     ${SYSTEM.creator}              ║
║     ᴇɴᴛᴇʀᴘʀɪsᴇ ᴘᴀɪʀɪɴɢ sʏsᴛᴇᴍ        ║
║     ᴘʀᴇᴍɪᴜᴍ ᴇᴅɪᴛɪᴏɴ                 ║
╚══════════════════════════════════════╝
  `));

  console.log(chalk.green('✅ sʏsᴛᴇᴍ ɪɴɪᴛɪᴀʟɪᴢᴇᴅ'));
  console.log(chalk.blue(`👥 ᴜsᴇʀs: ${formatNumber(database.stats.totalUsers)}`));
  console.log(chalk.yellow(`🔗 ᴀᴅᴍɪɴs: ${database.admins.length}`));
  console.log(chalk.magenta(`👑 ᴘʀᴇᴍɪᴜᴍ: ${Object.keys(database.premium).length}`));
  console.log(chalk.cyan(`⏱️ ᴜᴘᴛɪᴍᴇ: ${formatUptime(Date.now() - database.stats.startTime)}`));
  console.log(chalk.white('\n📢 ᴍᴏɴɪᴛᴏʀɪɴɢ ғᴏʀ ᴄᴏᴍᴍᴀɴᴅs...\n'));
})();

// Telegram must start polling only after all handlers above are registered.
startTelegramPolling();

// ==================== SHUTDOWN HANDLERS ====================
const shutdown = async (signal) => {
  console.log(`\n🛑 ʀᴇᴄᴇɪᴠᴇᴅ ${signal}. sᴀᴠɪɴɢ ᴅᴀᴛᴀ...`);
  await saveData();
  console.log('✅ ᴅᴀᴛᴀ sᴀᴠᴇᴅ. sʜᴜᴛᴛɪɴɢ ᴅᴏᴡɴ...');
  bot.stopPolling();
  process.exit(0);
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
process.on('message', (msg) => {
  if (msg === 'shutdown') shutdown('PM2_SHUTDOWN');
});

module.exports = { bot };
