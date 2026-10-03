const fs = require('fs');
const path = require('path');
const readline = require('readline');
const chalk = require('chalk');
const figlet = require('figlet');
const { startupPassword } = require('./tohidstore/token');
const AUTH_FILE = './auth.json';
const PAIRING_DIR = './tohidstore/pairing/';
const startpairing = require('./pair');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
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
    console.log(chalk.green('ᴛᴏʜɪᴅ ᴀɪ sᴏʟᴏs ᴀʟʟ....\n'));

    let telegramLoaded = false;
    let whatsappLoaded = false;

    // Load Telegram bot (Tohid.js)
    const botPath = path.join(__dirname, 'Tohid.js');
    if (fs.existsSync(botPath)) {
        try {
            console.log(chalk.blue('📱 Loading Telegram pairing system...'));
            require('./Tohid.js');
            telegramLoaded = true;
            console.log(chalk.green('✅ ᴛᴏʜɪᴅ ᴀɪ ɪs sᴜᴄᴄᴇssғᴜʟʟʏ ᴀᴄᴛɪᴠᴇ'));
        } catch (error) {
            console.log(chalk.red('❌ Failed to load Telegram bot (Tohid.js):'));
            console.log(chalk.red('   Error:', error.message));
            if (error.stack) {
                console.log(chalk.gray('   Stack:', error.stack.split('\n')[1].trim()));
            }
            console.log(chalk.yellow('⚠️  Continuing without Telegram bot...\n'));
        }
    } else {
        console.log(chalk.yellow('⚠️  Tohid.js not found, skipping Telegram bot...\n'));
    }

    // WhatsApp is intentionally NOT started during deployment.\n    // It becomes active only after the owner uses /pair from Telegram.\n    console.log(chalk.gray('💬 WhatsApp: waiting for Telegram /pair command...'));\n
    // Summary
    console.log(chalk.cyan('\n⚄︎═══════════════════════════════⚄︎'));
    console.log(chalk.bold.white('  ʙᴏᴛ ɪɴɪᴛɪᴀʟɪᴢᴀᴛɪᴏɴ sᴜᴍᴍᴀʀʏ        '));
    console.log(chalk.cyan('⚄︎════════════════════════════════⚄︎'));
    console.log(telegramLoaded ? chalk.green('ᴛᴏʜɪᴅ ᴀɪ: ᴀᴄᴛɪᴠᴇ ✅') : chalk.red('❌ ᴛᴏʜɪᴅ ᴀɪ 2026'));
    console.log(chalk.yellow('⏳ ᴡʜᴀᴛsᴀᴘᴘ: ᴡᴀɪᴛɪɴɢ ғᴏʀ /ᴘᴀɪʀ ᴏɴ ᴛᴇʟᴇɢʀᴀᴍ'));
    console.log(chalk.cyan('⚄︎════════════════════════════════⚄︎\n'));

    if (!telegramLoaded) {
        console.log(chalk.red('⚠️  Warning: No bot systems loaded! Check your files.\n'));
    } else {
        console.log(chalk.green('✅ ᴛᴏʜɪᴅ ᴀɪ ᴀᴄᴛɪᴠᴇ!\n'));
    }

    // Keep the bot running continuously.
    startAutoRestart();
    runStartupDebug();
    startSessionMonitor();
    processGuard.install(); // restart otomatis: RAM > 10GB atau CPU > 90% (sustained)

    // Error handlers
    const ignoredErrors = [
        'Socket connection timeout',
        'EKEYTYPE',
        'item-not-found',
        'rate-overlimit',
        'Connection Closed',
        'Timed Out',
        'Value not found'
    ];

    process.on('unhandledRejection', (reason, promise) => {
        if (ignoredErrors.some(e => String(reason).includes(e))) return;
        console.log(chalk.red('\n⚠️  Unhandled Promise Rejection:'));
        console.log(chalk.yellow('Reason:'), reason);
    });

    process.on('uncaughtException', (error) => {
        if (ignoredErrors.some(e => String(error).includes(e))) return;
        console.log(chalk.red('\n❌ Uncaught Exception:'));
        console.log(chalk.yellow('Error:'), error.message);
        if (error.stack) {
            console.log(chalk.gray(error.stack));
        }
    });

    const originalConsoleError = console.error;
    console.error = function (message, ...optionalParams) {
        if (typeof message === 'string' && ignoredErrors.some(e => message.includes(e))) return;
        originalConsoleError.apply(console, [message, ...optionalParams]);
    };

    const originalStderrWrite = process.stderr.write;
    process.stderr.write = function (message, encoding, fd) {
        if (typeof message === 'string' && ignoredErrors.some(e => message.includes(e))) return;
        originalStderrWrite.apply(process.stderr, arguments);
    };

    console.log(chalk.blue('📊 Bot monitoring active...'));
    console.log(chalk.gray('Press Ctrl+C to stop the bot\n'));
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