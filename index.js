const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const figlet = require('figlet');
const { runStartupDebug, attachGlobalHandlers, startSessionMonitor } = require('./debug.js');
const processGuard = require('./utils/process-guard');
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

initializeBot().catch((error) => {
    console.log(chalk.red('\n❌ Fatal error during initialization:'));
    console.log(chalk.yellow('Error:'), error.message);
    if (error.stack) {
        console.log(chalk.gray(error.stack));
    }
    process.exit(1);
});