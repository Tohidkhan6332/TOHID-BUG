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

// ─── AUTO RESTART CONFIG ───────────────────────────────────────────────
const AUTO_RESTART_INTERVAL = 15 * 60 * 1000; // 15 minutes (ms)

function startAutoRestart() {
    console.log(chalk.cyan('⏱️  Auto restart active — bot will restart every 15 minutes.'));

    setTimeout(() => {
        console.log(chalk.yellow('\n🔄 Scheduled auto restart... Bot will restart now.'));
        console.log(chalk.gray('   Pterodactyl panel will restart the process automatically.\n'));
        setTimeout(() => process.exit(0), 2000); // 2-second delay so logs are readable
    }, AUTO_RESTART_INTERVAL);
}
// ───────────────────────────────────────────────────────────────────────

function isAuthenticated() {
    return fs.existsSync(AUTH_FILE) && JSON.parse(fs.readFileSync(AUTH_FILE)).authenticated;
}

function setAuthenticated(value) {
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ authenticated: value }));
}

const autoLoadPairs = async () => {
    console.log(chalk.cyan('🔄 Auto-loading all paired users...'));

    if (!fs.existsSync(PAIRING_DIR)) {
        console.log(chalk.red('❌ Pairing directory not found.'));
        return;
    }

    const pairedUsers = fs.readdirSync(PAIRING_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
        .filter(name => name.endsWith('@s.whatsapp.net'));

    if (pairedUsers.length === 0) {
        console.log(chalk.yellow('ℹ️  No paired users found.'));
        return;
    }

    console.log(chalk.green(`✅ Found ${pairedUsers.length} paired users. Starting connections...`));
    console.log(chalk.blue('⏳ Waiting 4 seconds before starting connections...'));
    await delay(4000);

    for (let i = 0; i < pairedUsers.length; i++) {
        const userNumber = pairedUsers[i];

        try {
            console.log(chalk.blue(`🔄 Connecting user ${i + 1}/${pairedUsers.length}: ${userNumber}`));
            await startpairing(userNumber);
            console.log(chalk.green(`✅ Connected successfully: ${userNumber}`));

            if (i < pairedUsers.length - 1) {
                console.log(chalk.blue('⏳ Waiting 4 seconds before next connection...'));
                await delay(4000);
            }
        } catch (error) {
            console.log(chalk.red(`❌ Failed for ${userNumber}: ${error.message}`));

            if (i < pairedUsers.length - 1) {
                console.log(chalk.blue('⏳ Waiting 4 seconds before retry...'));
                await delay(4000);
            }
        }
    }

    console.log(chalk.green('✅ All paired users processed.'));
    console.log(chalk.blue('⏳ Waiting 4 seconds before continuing...'));
    await delay(4000);
};

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

    await autoLoadPairs();

    if (isAuthenticated()) {
        console.log(chalk.green('✅ Welcome back! Skipping password...'));
        launchBot();
    } else {
        if (!startupPassword) {
            console.log(chalk.red('❌ STARTUP_PASSWORD is not configured. Set it in the environment before starting the bot.'));
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
                console.log(chalk.red('\n❌ Incorrect password. Exiting...'));
                process.exit(1);
            }

            console.log(chalk.green('\n✅ Password correct. Starting bot system...'));
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
    }
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

    // Load WhatsApp commands (MrTohid.js)
    const tohidPath = path.join(__dirname, 'MrTohid.js');
    if (fs.existsSync(tohidPath)) {
        try {
            console.log(chalk.blue('💬 Loading WhatsApp commands system...'));
            require('./MrTohid.js');
            whatsappLoaded = true;
            console.log(chalk.green('✅ WhatsApp commands loaded successfully!'));
        } catch (error) {
            console.log(chalk.red('❌ Failed to load WhatsApp commands (MrTohid.js):'));
            console.log(chalk.red('   Error:', error.message));
            if (error.stack) {
                console.log(chalk.gray('   Stack:', error.stack.split('\n')[1].trim()));
            }
            console.log(chalk.yellow('⚠️  Continuing without WhatsApp commands...\n'));
        }
    } else {
        console.log(chalk.yellow('⚠️  MrTohid.js not found, skipping WhatsApp commands...\n'));
    }

    // Summary
    console.log(chalk.cyan('\n⚄︎═══════════════════════════════⚄︎'));
    console.log(chalk.bold.white('  ʙᴏᴛ ɪɴɪᴛɪᴀʟɪᴢᴀᴛɪᴏɴ sᴜᴍᴍᴀʀʏ        '));
    console.log(chalk.cyan('⚄︎════════════════════════════════⚄︎'));
    console.log(telegramLoaded ? chalk.green('ᴛᴏʜɪᴅ ᴀɪ: ᴀᴄᴛɪᴠᴇ ✅') : chalk.red('❌ ᴛᴏʜɪᴅ ᴀɪ 2026'));
    console.log(whatsappLoaded ? chalk.green('✅ ᴡʜᴀᴛsᴀᴘᴘ ᴄᴏᴍᴍᴀɴᴅs: ᴀᴄᴛɪᴠᴇ') : chalk.red('❌ ᴡʜᴀᴛsᴀᴘᴘ ᴄᴏᴍᴍᴀᴍᴅs : ɪɴᴀᴄᴛɪᴠᴇ'));
    console.log(chalk.cyan('⚄︎════════════════════════════════⚄︎\n'));

    if (!telegramLoaded && !whatsappLoaded) {
        console.log(chalk.red('⚠️  Warning: No bot systems loaded! Check your files.\n'));
    } else {
        console.log(chalk.green('✅ ᴛᴏʜɪᴅ ᴀɪ ᴀᴄᴛɪᴠᴇ!\n'));
    }

    // ── Start auto restart timer after bot is active ──
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