const fs = require('fs');
const path = require('path');
const readline = require('readline');
const chalk = require('chalk');
const figlet = require('figlet');
const { startupPassword } = require('./tohidstore/token');
const AUTH_FILE = './auth.json';
const { runStartupDebug, attachGlobalHandlers, startSessionMonitor } = require('./debug.js');
const processGuard = require('./utils/process-guard');
attachGlobalHandlers();

// ─── AUTO RESTART ─────────────────────────────────────────────────────
// Disabled: a timed process.exit() can leave the Telegram bot offline when
// the hosting panel does not automatically restart the process.
function startAutoRestart() {
    console.log(chalk.cyan('⏱️  Scheduled auto-restart disabled — bot will stay online.'));
}
// ───────────────────────────────────────────────────────────────────────

function isAuthenticated() {
    return fs.existsSync(AUTH_FILE) && JSON.parse(fs.readFileSync(AUTH_FILE)).authenticated;
}

function setAuthenticated(value) {
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ authenticated: value }));
}

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

    if (isAuthenticated()) {
        console.log(chalk.green('✅ Welcome back! Skipping password...'));
        launchBot();
        return;
    }

    if (!startupPassword) {
        console.log(chalk.red('❌ STARTUP_PASSWORD is not configured. Set it in the environment before starting the bot.'));
        return;
    }

    // Hosted workers/panels normally do not provide an interactive TTY.
    // Never block the Telegram/WhatsApp services waiting for stdin in that case.
    // Local Termux/terminal sessions still keep the startup password prompt.
    const nonInteractive = !process.stdin.isTTY || !!process.env.CI ||
        !!process.env.RENDER || !!process.env.HEROKU_APP_NAME ||
        !!process.env.PTERODACTYL;

    if (nonInteractive) {
        console.log(chalk.yellow('⚙️ Non-interactive environment detected — starting bot automatically.'));
        setAuthenticated(true);
        launchBot();
        return;
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.stdoutMuted = true;
    console.log(chalk.bold.yellow('🔐 Enter password to start bot:'));

    rl.question(chalk.green('Password: '), function (input) {
        if (input !== startupPassword) {
            console.log(chalk.red('\\n❌ Incorrect password. Exiting...'));
            rl.close();
            process.exit(1);
        }

        console.log(chalk.green('\\n✅ Password correct. Starting bot system...'));
        setAuthenticated(true);
        rl.close();
        launchBot();
    });

    rl._writeToOutput = function _writeToOutput(stringToWrite) {
        if (rl.stdoutMuted) {
            rl.output.write(chalk.cyan('*'));
        } else {
            rl.output.write(stringToWrite);
        }
    };
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
    startSessionMonitor();
    processGuard.install();

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

// Keep terminal output enabled so startup, password prompts, pairing,
// and runtime errors remain visible in Termux and VPS logs.
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

initializeBot().catch((error) => {
    console.log(chalk.red('\n❌ Fatal error during initialization:'));
    console.log(chalk.yellow('Error:'), error.message);
    if (error.stack) {
        console.log(chalk.gray(error.stack));
    }
    process.exit(1);
});