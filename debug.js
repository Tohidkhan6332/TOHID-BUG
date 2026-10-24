const fs = require('fs');
const path = require('path');
const os = require('os');
const { performance } = require('perf_hooks');
const chalk = require('chalk');

const START_TIME = Date.now();

const errorLog = [];
const MAX_ERROR_LOG = 200;

const CRITICAL_FILES = [
  { path: './setting/config.js', name: 'config.js' },
  { path: './setting/setting.json', name: 'setting.json' },
  { path: './tohidstore/token.js', name: 'token.js' },
  { path: './tohidstore/utils.js', name: 'utils.js' },
  { path: './autoload.js', name: 'autoload.js' },
  { path: './database/admintele.json', name: 'admintele.json' },
  { path: './database/users.json', name: 'users.json' },
  { path: './database/banned.json', name: 'banned.json' },
  { path: './database/settings.json', name: 'settings.json' },
];

const CRITICAL_DIRS = [
  { path: './database', name: 'database/' },
  { path: './tohidstore', name: 'tohidstore/' },
  { path: './allfunc', name: 'allfunc/' },
  { path: './setting', name: 'setting/' },
  { path: './tohidstore/pairing', name: 'tohidstore/pairing/' },
];

const OPTIONAL_DIRS = [
  { path: './axis_storage', name: 'axis_storage/' },
  { path: './axis_storage/sessions', name: 'axis_storage/sessions/' },
  { path: './logs', name: 'logs/' },
  { path: './tmp', name: 'tmp/' },
];

function trackError(type, error, source) {
  const entry = {
    time: new Date().toISOString(),
    type: type || 'UNKNOWN',
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? (error.stack || '').split('\n')[1]?.trim() : null,
    source: source || 'unknown',
  };
  errorLog.unshift(entry);
  if (errorLog.length > MAX_ERROR_LOG) errorLog.pop();
  return entry;
}

function getErrorSummary() {
  const counts = {};
  for (const e of errorLog) {
    counts[e.type] = (counts[e.type] || 0) + 1;
  }
  return counts;
}

function checkJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    JSON.parse(content);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

function getSessionInfo() {
  const result = { tohidstore: [], axis: [], total: 0 };

  const nexPath = './tohidstore/pairing';
  if (fs.existsSync(nexPath)) {
    try {
      const entries = fs.readdirSync(nexPath, { withFileTypes: true });
      result.tohidstore = entries
        .filter(d => d.isDirectory())
        .map(d => d.name)
        .filter(name => /^\d{7,15}$/.test(name) || name.endsWith('@s.whatsapp.net'))
        .map(name => name.replace(/@s\.whatsapp\.net$/i, ''));
    } catch (e) {
      result.tohidstoreError = e.message;
    }
  }

  const axisPath = './axis_storage/sessions';
  if (fs.existsSync(axisPath)) {
    try {
      const entries = fs.readdirSync(axisPath, { withFileTypes: true });
      result.axis = entries
        .filter(d => d.isDirectory())
        .map(d => {
          const credsPath = path.join(axisPath, d.name, 'creds.json');
          return {
            name: d.name,
            hasCreds: fs.existsSync(credsPath),
          };
        });
    } catch (e) {
      result.axisError = e.message;
    }
  }

  result.total = result.tohidstore.length + result.axis.length;
  return result;
}

function getMemoryInfo() {
  const mem = process.memoryUsage();
  const total = os.totalmem();
  const free = os.freemem();
  return {
    rss: (mem.rss / 1024 / 1024).toFixed(1),
    heapUsed: (mem.heapUsed / 1024 / 1024).toFixed(1),
    heapTotal: (mem.heapTotal / 1024 / 1024).toFixed(1),
    external: (mem.external / 1024 / 1024).toFixed(1),
    systemTotal: (total / 1024 / 1024).toFixed(0),
    systemFree: (free / 1024 / 1024).toFixed(0),
    systemUsedPercent: (((total - free) / total) * 100).toFixed(1),
  };
}

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${sec}s`);
  return parts.join(' ');
}

function runStartupDebug() {
  const t0 = performance.now();
  const issues = [];
  const warnings = [];

  console.log(chalk.cyan('\n╔══════════════════════════════════════╗'));
  console.log(chalk.cyan('║       🔍 DEBUG SYSTEM ACTIVE          ║'));
  console.log(chalk.cyan('╚══════════════════════════════════════╝\n'));

  for (const dir of CRITICAL_DIRS) {
    if (!fs.existsSync(dir.path)) {
      issues.push(`❌ DIR MISSING: ${dir.name}`);
      console.log(chalk.red(`  ❌ [DIR] ${dir.name} — MISSING`));
    } else {
      console.log(chalk.green(`  ✅ [DIR] ${dir.name}`));
    }
  }

  for (const dir of OPTIONAL_DIRS) {
    if (!fs.existsSync(dir.path)) {
      warnings.push(`⚠️  OPTIONAL DIR MISSING: ${dir.name}`);
      console.log(chalk.yellow(`  ⚠️  [DIR] ${dir.name} — missing (will be created automatically)`));
      try {
        fs.mkdirSync(dir.path, { recursive: true });
        console.log(chalk.blue(`     └─ Created: ${dir.name}`));
      } catch (e) {
        issues.push(`❌ Failed to create dir ${dir.name}: ${e.message}`);
      }
    } else {
      console.log(chalk.green(`  ✅ [DIR] ${dir.name}`));
    }
  }

  console.log('');

  for (const file of CRITICAL_FILES) {
    if (!fs.existsSync(file.path)) {
      issues.push(`❌ FILE MISSING: ${file.name}`);
      console.log(chalk.red(`  ❌ [FILE] ${file.name} — MISSING`));
      continue;
    }

    if (file.name.endsWith('.json')) {
      const check = checkJsonFile(file.path);
      if (!check.ok) {
        issues.push(`❌ CORRUPTED JSON: ${file.name} — ${check.reason}`);
        console.log(chalk.red(`  ❌ [JSON] ${file.name} — CORRUPTED: ${check.reason}`));
      } else {
        console.log(chalk.green(`  ✅ [JSON] ${file.name}`));
      }
    } else {
      console.log(chalk.green(`  ✅ [FILE] ${file.name}`));
    }
  }

  console.log('');

  const sessions = getSessionInfo();
  console.log(chalk.cyan(`  📦 Session tohidstore/pairing: ${sessions.tohidstore.length}`));
  console.log(chalk.cyan(`  📦 Session axis_storage:     ${sessions.axis.length}`));
  if (sessions.tohidstoreError) {
    warnings.push(`⚠️  Error reading tohidstore sessions: ${sessions.tohidstoreError}`);
    console.log(chalk.yellow(`  ⚠️  tohidstore session error: ${sessions.tohidstoreError}`));
  }
  if (sessions.axisError) {
    warnings.push(`⚠️  Error reading axis sessions: ${sessions.axisError}`);
    console.log(chalk.yellow(`  ⚠️  axis session error: ${sessions.axisError}`));
  }
  const brokenCreds = sessions.axis.filter(s => !s.hasCreds);
  if (brokenCreds.length > 0) {
    warnings.push(`⚠️  ${brokenCreds.length} axis_storage sessions without creds.json`);
    console.log(chalk.yellow(`  ⚠️  ${brokenCreds.length} sessions without creds.json (possibly corrupt)`));
  }

  console.log('');

  const mem = getMemoryInfo();
  console.log(chalk.magenta(`  🧠 Heap: ${mem.heapUsed} MB / ${mem.heapTotal} MB`));
  console.log(chalk.magenta(`  🧠 RSS:  ${mem.rss} MB`));
  console.log(chalk.magenta(`  💻 System: ${mem.systemFree} MB free / ${mem.systemTotal} MB total (${mem.systemUsedPercent}% used)`));
  if (parseFloat(mem.systemUsedPercent) > 85) {
    warnings.push(`⚠️  High system memory: ${mem.systemUsedPercent}% used`);
    console.log(chalk.yellow(`  ⚠️  HIGH system memory! (${mem.systemUsedPercent}%)`));
  }
  if (parseFloat(mem.heapUsed) > 500) {
    warnings.push(`⚠️  High JS heap: ${mem.heapUsed} MB`);
    console.log(chalk.yellow(`  ⚠️  High JS heap: ${mem.heapUsed} MB`));
  }

  console.log('');

  const elapsed = (performance.now() - t0).toFixed(0);

  console.log(chalk.cyan('╔══════════════════════════════════════╗'));
  if (issues.length === 0 && warnings.length === 0) {
    console.log(chalk.green('║  ✅ ALL CHECKS PASSED — No issues       ║'));
  } else {
    if (issues.length > 0) {
      console.log(chalk.red(`║  ❌ ${issues.length} CRITICAL ISSUES FOUND         ║`));
      for (const issue of issues) {
        console.log(chalk.red(`  ${issue}`));
      }
    }
    if (warnings.length > 0) {
      console.log(chalk.yellow(`║  ⚠️  ${warnings.length} WARNINGS                       ║`));
      for (const w of warnings) {
        console.log(chalk.yellow(`  ${w}`));
      }
    }
  }
  console.log(chalk.cyan(`║  ⏱️  Completed in ${elapsed}ms               ║`));
  console.log(chalk.cyan('╚══════════════════════════════════════╝\n'));

  return { issues, warnings };
}

function buildDebugReport() {
  const uptime = Date.now() - START_TIME;
  const mem = getMemoryInfo();
  const sessions = getSessionInfo();
  const errSummary = getErrorSummary();
  const recent = errorLog.slice(0, 10);

  const fileChecks = CRITICAL_FILES.map(f => {
    if (!fs.existsSync(f.path)) return `❌ ${f.name} — missing`;
    if (f.name.endsWith('.json')) {
      const r = checkJsonFile(f.path);
      return r.ok ? `✅ ${f.name}` : `❌ ${f.name} — corrupted JSON`;
    }
    return `✅ ${f.name}`;
  });

  const dirChecks = [...CRITICAL_DIRS, ...OPTIONAL_DIRS].map(d =>
    fs.existsSync(d.path) ? `✅ ${d.name}` : `⚠️ ${d.name} missing`
  );

  const brokenCreds = sessions.axis.filter(s => !s.hasCreds).length;

  let errLines = '';
  if (Object.keys(errSummary).length === 0) {
    errLines = '✅ No errors recorded yet';
  } else {
    errLines = Object.entries(errSummary)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `• ${k}: ${v}x`)
      .join('\n');
  }

  let recentLines = '';
  if (recent.length === 0) {
    recentLines = '✅ None';
  } else {
    recentLines = recent
      .map(e => `[${e.time.slice(11, 19)}] ${e.type} — ${e.message.slice(0, 60)}`)
      .join('\n');
  }

  const nodeVer = process.version;
  const platform = `${os.type()} ${os.arch()}`;
  const cpuLoad = os.loadavg().map(v => v.toFixed(2)).join(' / ');

  return `┌ ❏ ◆ *⌜🔍 DEBUG REPORT⌟* ◆
│
├◆ ⏱️ *Uptime:* ${formatUptime(uptime)}
├◆ 🟢 *Node:* ${nodeVer} | ${platform}
├◆ 📊 *CPU Load:* ${cpuLoad}
│
├─── 🧠 *MEMORY*
├◆ Heap: ${mem.heapUsed} MB / ${mem.heapTotal} MB
├◆ RSS: ${mem.rss} MB | External: ${mem.external} MB
├◆ System: ${mem.systemFree}/${mem.systemTotal} MB (${mem.systemUsedPercent}% used)
│
├─── 📦 *SESSION*
├◆ tohidstore/pairing: ${sessions.tohidstore.length} sessions
├◆ axis_storage: ${sessions.axis.length} sessions
${brokenCreds > 0 ? `├◆ ⚠️ ${brokenCreds} sessions without creds.json!\n` : ''}│
├─── 📁 *CRITICAL FILES*
${fileChecks.map(l => `├◆ ${l}`).join('\n')}
│
├─── 📂 *DIRECTORIES*
${dirChecks.map(l => `├◆ ${l}`).join('\n')}
│
├─── ⚠️ *ERROR SUMMARY* (total: ${errorLog.length})
${errLines.split('\n').map(l => `├◆ ${l}`).join('\n')}
│
├─── 🔴 *LAST 10 ERRORS*
${recentLines.split('\n').map(l => `├◆ ${l}`).join('\n')}
│
└ ❏`;
}

function initDebug(bot) {
  bot.on('polling_error', (error) => {
    const entry = trackError('POLLING_ERROR', error, 'telegram-polling');
    console.log(chalk.red(`[DEBUG] Polling error: ${error.message}`));
    if (error.code === 'EFATAL') {
      console.log(chalk.red('[DEBUG] EFATAL polling error — bot may need restart!'));
    }
  });

  bot.on('error', (error) => {
    trackError('BOT_ERROR', error, 'telegram-bot');
    console.log(chalk.red(`[DEBUG] Bot error: ${error.message}`));
  });

  bot.on('webhook_error', (error) => {
    trackError('WEBHOOK_ERROR', error, 'telegram-webhook');
    console.log(chalk.red(`[DEBUG] Webhook error: ${error.message}`));
  });

  bot.onText(/\/debug/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    let OWNERS_ALL;
    try {
      OWNERS_ALL = require('./tohidstore/token').BOT_TOKEN
        ? [8582350365]
        : [8582350365];
    } catch (e) {
      OWNERS_ALL = [];
    }

    const isOwner = OWNERS_ALL.includes(userId);
    const isAdmin = (() => {
      try {
        const adminFile = './database/admintele.json';
        if (fs.existsSync(adminFile)) {
          const data = JSON.parse(fs.readFileSync(adminFile, 'utf8'));
          const admins = Array.isArray(data) ? data : Object.keys(data);
          return admins.map(String).includes(String(userId));
        }
      } catch (e) {}
      return false;
    })();

    if (!isOwner && !isAdmin) {
      return bot.sendMessage(chatId,
        `┌ ❏ ◆ *⌜𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗⌟* ◆\n│\n├◆ ᴏɴʟʏ ᴏᴡɴᴇʀ/ᴀᴅᴍɪɴ\n│\n└ ❏`,
        { parse_mode: 'Markdown' }
      );
    }

    try {
      await bot.sendMessage(chatId, '🔍 Running debug...', { parse_mode: 'Markdown' });
      const report = buildDebugReport();
      await bot.sendMessage(chatId, report, { parse_mode: 'Markdown' });
    } catch (error) {
      trackError('DEBUG_CMD_ERROR', error, '/debug command');
      try {
        await bot.sendMessage(chatId, `❌ Debug error: ${error.message}`);
      } catch (e) {}
    }
  });

  bot.onText(/\/debugreset/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    let OWNERS_ALL;
    try { OWNERS_ALL = [8582350365]; } catch (e) { OWNERS_ALL = []; }

    if (!OWNERS_ALL.includes(userId)) {
      return bot.sendMessage(chatId,
        `┌ ❏ ◆ *⌜𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗⌟* ◆\n│\n├◆ ᴏᴡɴᴇʀ ᴏɴʟʏ\n│\n└ ❏`,
        { parse_mode: 'Markdown' }
      );
    }

    errorLog.length = 0;
    await bot.sendMessage(chatId,
      `┌ ❏ ◆ *⌜DEBUG RESET⌟* ◆\n│\n├◆ ✅ Error log successfully reset\n│\n└ ❏`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.onText(/\/debugsession/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    let OWNERS_ALL;
    try { OWNERS_ALL = [8582350365]; } catch (e) { OWNERS_ALL = []; }

    const isOwner = OWNERS_ALL.includes(userId);
    if (!isOwner) {
      return bot.sendMessage(chatId,
        `┌ ❏ ◆ *⌜𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗⌟* ◆\n│\n├◆ ᴏᴡɴᴇʀ ᴏɴʟʏ\n│\n└ ❏`,
        { parse_mode: 'Markdown' }
      );
    }

    const sessions = getSessionInfo();

    let nexLines = sessions.tohidstore.length === 0
      ? '├◆ No sessions'
      : sessions.tohidstore.slice(0, 20).map(s => `├◆ • ${s}`).join('\n');

    let axisLines = sessions.axis.length === 0
      ? '├◆ No sessions'
      : sessions.axis.slice(0, 20).map(s =>
          `├◆ • ${s.name}${!s.hasCreds ? ' ⚠️ NO CREDS' : ''}`
        ).join('\n');

    const report =
      `┌ ❏ ◆ *⌜📦 SESSION DEBUG⌟* ◆\n│\n` +
      `├─── tohidstore/pairing (${sessions.tohidstore.length})\n${nexLines}\n│\n` +
      `├─── axis_storage/sessions (${sessions.axis.length})\n${axisLines}\n│\n└ ❏`;

    await bot.sendMessage(chatId, report, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/debugerrors/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    let OWNERS_ALL;
    try { OWNERS_ALL = [8582350365]; } catch (e) { OWNERS_ALL = []; }

    if (!OWNERS_ALL.includes(userId)) {
      return bot.sendMessage(chatId,
        `┌ ❏ ◆ *⌜𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗⌟* ◆\n│\n├◆ ᴏᴡɴᴇʀ ᴏɴʟʏ\n│\n└ ❏`,
        { parse_mode: 'Markdown' }
      );
    }

    const recent = errorLog.slice(0, 25);
    if (recent.length === 0) {
      return bot.sendMessage(chatId,
        `┌ ❏ ◆ *⌜ERROR LOG⌟* ◆\n│\n├◆ ✅ No errors recorded\n│\n└ ❏`,
        { parse_mode: 'Markdown' }
      );
    }

    const lines = recent
      .map((e, i) =>
        `├◆ ${i + 1}. [${e.time.slice(11, 19)}] *${e.type}*\n├◆    ${e.message.slice(0, 80)}\n├◆    src: ${e.source}`
      )
      .join('\n│\n');

    const report = `┌ ❏ ◆ *⌜🔴 ERROR LOG (last ${recent.length})⌟* ◆\n│\n${lines}\n│\n└ ❏`;

    if (report.length > 4000) {
      const chunks = [];
      let current = '';
      for (const line of lines.split('\n')) {
        if ((current + line).length > 3800) {
          chunks.push(current);
          current = line + '\n';
        } else {
          current += line + '\n';
        }
      }
      if (current) chunks.push(current);
      for (const chunk of chunks) {
        await bot.sendMessage(chatId, `\`\`\`\n${chunk}\n\`\`\``, { parse_mode: 'Markdown' });
      }
    } else {
      await bot.sendMessage(chatId, report, { parse_mode: 'Markdown' });
    }
  });

  console.log(chalk.green('[DEBUG] ✅ Debug commands registered: /debug, /debugreset, /debugsession, /debugerrors'));
}

function attachGlobalHandlers() {
  const originalConsoleError = console.error;
  console.error = function (...args) {
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    trackError('CONSOLE_ERROR', new Error(msg), 'console.error');
    originalConsoleError.apply(console, args);
  };

  const originalWarn = console.warn;
  console.warn = function (...args) {
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    if (msg.includes('deprecated') || msg.includes('WARN')) {
      trackError('CONSOLE_WARN', new Error(msg), 'console.warn');
    }
    originalWarn.apply(console, args);
  };

  process.on('unhandledRejection', (reason) => {
    const msg = reason instanceof Error ? reason.message : String(reason);
    const ignoredPatterns = [
      'Socket connection timeout',
      'EKEYTYPE',
      'item-not-found',
      'rate-overlimit',
      'Connection Closed',
      'Timed Out',
      'Value not found',
    ];
    if (ignoredPatterns.some(p => msg.includes(p))) return;
    trackError('UNHANDLED_REJECTION', reason instanceof Error ? reason : new Error(msg), 'process');
  });

  process.on('uncaughtException', (error) => {
    const ignoredPatterns = [
      'Socket connection timeout',
      'EKEYTYPE',
    ];
    if (ignoredPatterns.some(p => error.message.includes(p))) return;
    trackError('UNCAUGHT_EXCEPTION', error, 'process');
  });

  console.log(chalk.green('[DEBUG] ✅ Global error handlers installed'));
}

function startSessionMonitor(intervalMs) {
  const interval = intervalMs || 5 * 60 * 1000;
  let lastCount = -1;

  setInterval(() => {
    const sessions = getSessionInfo();
    const current = sessions.total;

    if (lastCount > 0 && current < lastCount) {
      const lost = lastCount - current;
      trackError(
        'SESSION_CLOSE',
        new Error(`${lost} sessions lost/closed automatically (from ${lastCount} to ${current})`),
        'session-monitor'
      );
      console.log(chalk.yellow(`[DEBUG] ⚠️  Session drop: ${lastCount} → ${current} (${lost} lost)`));
    }

    if (current !== lastCount) {
      console.log(chalk.gray(`[DEBUG] Session monitor: ${current} active sessions`));
    }

    lastCount = current;

    const brokenCreds = sessions.axis.filter(s => !s.hasCreds);
    if (brokenCreds.length > 0) {
      trackError(
        'SESSION_NO_CREDS',
        new Error(`${brokenCreds.length} axis_storage sessions without creds.json`),
        'session-monitor'
      );
    }

    const mem = getMemoryInfo();
    if (parseFloat(mem.heapUsed) > 600) {
      trackError(
        'HIGH_MEMORY',
        new Error(`JS heap too high: ${mem.heapUsed} MB`),
        'memory-monitor'
      );
      console.log(chalk.red(`[DEBUG] 🚨 High memory: ${mem.heapUsed} MB heap`));
    }
  }, interval);

  console.log(chalk.green(`[DEBUG] ✅ Session monitor active (interval: ${interval / 60000} minutes)`));
}

module.exports = {
  runStartupDebug,
  initDebug,
  attachGlobalHandlers,
  startSessionMonitor,
  trackError,
  getErrorSummary,
  buildDebugReport,
  getSessionInfo,
  getMemoryInfo,
};