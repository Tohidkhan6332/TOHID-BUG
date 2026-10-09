const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const figlet = require('figlet');
const { runStartupDebug, attachGlobalHandlers, startSessionMonitor } = require('./debug.js');
const processGuard = require('./utils/process-guard');

// ─── SINGLE INSTANCE LOCK ──────────────────────────────────────────────
// Prevent duplicate Telegram polling and duplicate WhatsApp sessions when
// /update or a hosting supervisor starts a replacement process.
const RUNTIME_LOCK_FILE = path.join(__dirname, '.tohid-runtime.lock');
const WAITING_PARENT_PID = Number(process.env.TOHID_WAIT_FOR_PARENT_PID || 0);

function pidIsAlive(pid) {
    if (!Number.isInteger(pid) || pid <= 0) return false;
    try { process.kill(pid, 0); return true; }
    catch (error) { return error?.code === 'EPERM'; }
}

function readRuntimeLock() {
    try {
        return JSON.parse(fs.readFileSync(RUNTIME_LOCK_FILE, 'utf8'));
    } catch (_) {
        return null;
    }
}

function runtimePidIsThisProject(pid) {
    if (!pidIsAlive(pid)) return false;

    // Android/Termux can reuse PIDs. A live PID alone does not prove that
    // the process holding an old lock belongs to this bot.
    try {
        const commandLine = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').split(String.fromCharCode(0)).join(' ');
        return commandLine.includes(path.join(__dirname, 'index.js')) ||
            commandLine.includes(__dirname);
    } catch (_) {
        // If process details are unavailable, fail safely rather than
        // starting a second Telegram/WhatsApp instance.
        return true;
    }
}

function removeRuntimeLock() {
    try {
        const lock = readRuntimeLock();
        if (!lock || Number(lock.pid) === process.pid) fs.unlinkSync(RUNTIME_LOCK_FILE);
    } catch (_) {}
}

async function acquireRuntimeLock() {
    // During a controlled /update restart, the replacement process waits for
    // the old process to fully exit before it acquires the lock and starts
    // Telegram/WhatsApp. This removes the 409/440 handover race.
    if (WAITING_PARENT_PID && WAITING_PARENT_PID !== process.pid) {
        const deadline = Date.now() + 30000;
        while (pidIsAlive(WAITING_PARENT_PID) && Date.now() < deadline) {
            await new Promise(resolve => setTimeout(resolve, 250));
        }
        if (pidIsAlive(WAITING_PARENT_PID)) {
            throw new Error('Previous TOHID-AI process did not exit within 30 seconds. Refusing to start a duplicate instance.');
        }
    }

    try {
        fs.writeFileSync(RUNTIME_LOCK_FILE, JSON.stringify({
            pid: process.pid,
            startedAt: new Date().toISOString()
        }), { flag: 'wx' });
        return true;
    } catch (error) {
        if (error.code !== 'EEXIST') throw error;

        const existing = readRuntimeLock();
        const existingPid = Number(existing?.pid || 0);
        if (existingPid && existingPid !== process.pid && runtimePidIsThisProject(existingPid)) {
            throw new Error(`Another TOHID-AI instance is already running (PID ${existingPid}). Stopping this duplicate instance to prevent Telegram 409 / WhatsApp 440 conflicts.`);
        }

        // Stale lock left by a crashed process.
        try { fs.unlinkSync(RUNTIME_LOCK_FILE); } catch (_) {}
        fs.writeFileSync(RUNTIME_LOCK_FILE, JSON.stringify({
            pid: process.pid,
            startedAt: new Date().toISOString()
        }), { flag: 'wx' });
        return true;
    }
}

process.on('exit', removeRuntimeLock);
process.on('SIGINT', () => { removeRuntimeLock(); });
process.on('SIGTERM', () => { removeRuntimeLock(); });
attachGlobalHandlers();
processGuard.install();
startSessionMonitor();

// ─── AUTO RESTART ─────────────────────────────────────────────────────
// Disabled: a timed process.exit() can leave the Telegram bot offline when
// the hosting panel does not automatically restart the process.
function startAutoRestart() {
    console.log(chalk.cyan('⏱️  Scheduled auto-restart disabled — bot will stay online.'));
}
// ───────────────────────────────────────────────────────────────────────

const initializeBot = async () => {
    console.clear();
    console.log(chalk.cyan(figlet.textSync('ᴛᴏʜɪᴅ ᴀɪ ʙᴏᴛ ᴀᴄᴛɪᴠᴇ', {
        font: 'Standard',
        horizontalLayout: 'default',
        verticalLayout: 'default'
    })));

    console.log(chalk.yellow('\n⚄︎══════════════════════⚄︎'));
    console.log(chalk.green('𝐓𝐎𝐇𝐈𝐃-𝐀𝐈'));
    console.log(chalk.yellow('⚄︎═════════════════════⚄︎\n'));

    launchBot();
};

function launchBot() {
    console.clear();
    console.log(chalk.green('ᴛᴏʜɪᴅ ᴀɪ ᴛᴇʟᴇɢʀᴀᴍ ᴄᴏɴᴛʀᴏʟ ʟᴀʏᴇʀ....\\n'));

    // Telegram is the primary service.
    // WhatsApp is NEVER started here. It is started only by Telegram /pair.
    let telegramLoaded = false;

    try {
        const botPath = path.join(__dirname, 'Tohid.js');

        if (!fs.existsSync(botPath)) {
            throw new Error('Tohid.js not found in project root');
        }

        console.log(chalk.blue('📱 Loading Telegram bot...'));
        require('./Tohid.js');
        telegramLoaded = true;
        console.log(chalk.green('✅ Telegram bot module loaded successfully.'));
        console.log(chalk.cyan('⏳ Telegram polling is starting asynchronously...'));

        // Restore all previously paired WhatsApp sessions after a process restart/update.
        // Pairing credentials are stored on disk by pair.js, so users should not need
        // to pair again just because /update or the hosting panel restarted the process.
        try {
            const { autoLoadPairs } = require('./autoload');
            setTimeout(async () => {
                try {
                    console.log(chalk.cyan('🔄 Restoring saved WhatsApp sessions...'));
                    const result = await autoLoadPairs({ batchSize: 5 });
                    console.log(chalk.green(
                        `✅ WhatsApp session restore complete: ${result.successful || 0}/${result.total || 0} connected.`
                    ));
                } catch (error) {
                    console.log(chalk.red('❌ WhatsApp session restore failed:'), error.message);
                }
            }, 5000);
        } catch (error) {
            console.log(chalk.red('❌ Could not load WhatsApp auto-reconnect:'), error.message);
        }

        console.log(chalk.yellow('⏳ WhatsApp saved sessions are being restored...'));
    } catch (error) {
        console.log(chalk.red('❌ Telegram bot failed to load.'));
        console.log(chalk.red('   Error:'), error.message);
        if (error.stack) {
            console.log(chalk.gray(error.stack));
        }
        console.log(chalk.yellow('⚠️ Telegram service is NOT active. Fix the error above.'));
    }

    console.log(chalk.cyan('\\n⚄︎════════════════════════════════⚄︎'));
    console.log(telegramLoaded
        ? chalk.green('  ᴛᴇʟᴇɢʀᴀᴍ: ᴀᴄᴛɪᴠᴇ ✅')
        : chalk.red('  ᴛᴇʟᴇɢʀᴀᴍ: ɪɴᴀᴄᴛɪᴠᴇ ❌'));
    console.log(chalk.yellow('  ᴡʜᴀᴛsᴀᴘᴘ: ᴡᴀɪᴛɪɴɢ ғᴏʀ /ᴘᴀɪʀ'));
    console.log(chalk.cyan('⚄︎════════════════════════════════⚄︎\\n'));

    startAutoRestart();
    runStartupDebug();

    // Global handlers, process guard, and session monitor are installed once
    // during module initialization above. Re-installing the session monitor
    // here would create duplicate timers and duplicate diagnostics.
    const ignoredErrors = [
        'Socket connection timeout',
        'EKEYTYPE',
        'item-not-found',
        'rate-overlimit',
        'Connection Closed',
        'Timed Out',
        'Value not found'
    ];

    process.on('unhandledRejection', (reason) => {
        if (ignoredErrors.some(e => String(reason).includes(e))) return;
        console.log(chalk.red('\\n⚠️ Unhandled Promise Rejection:'));
        console.log(chalk.yellow('Reason:'), reason);
    });

    process.on('uncaughtException', (error) => {
        if (ignoredErrors.some(e => String(error).includes(e))) return;
        console.log(chalk.red('\\n❌ Uncaught Exception:'));
        console.log(chalk.yellow('Error:'), error.message);
        if (error.stack) console.log(chalk.gray(error.stack));
    });

    console.log(chalk.blue('📊 Telegram monitoring active...'));
    console.log(chalk.gray('Press Ctrl+C to stop the bot\\n'));
}

// Keep terminal output enabled so startup, pairing, and runtime errors remain visible in Termux and VPS logs.
// Graceful shutdown
process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\n⚠️  Shutting down gracefully...'));
    console.log(chalk.green('👋 Goodbye!'));
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log(chalk.yellow('\n\n⚠️  Received termination signal...'));
    process.exit(0);
});

acquireRuntimeLock()
    .then(() => initializeBot())
    .catch((error) => {
        console.log(chalk.red('\\n❌ Fatal error during initialization:'));
        console.log(chalk.yellow('Error:'), error.message);
        if (error.stack) console.log(chalk.gray(error.stack));
        removeRuntimeLock();
        process.exit(1);
    });