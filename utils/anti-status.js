/**
 * TOHID-AI AntiStatus / AntiGroupStatus
 *
 * Two independent protections:
 * 1. antistatus   -> personal WhatsApp status shared/mentioned into a group
 * 2. antigstatus  -> a group-status/story posted directly into the group
 */

const fs = require('fs');
const path = require('path');

const SETTINGS_FILE = path.join(process.cwd(), 'database', 'antistatus_settings.json');
const VALID_ACTIONS = new Set(['delete', 'warn', 'kick']);

function ensureFile() {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(SETTINGS_FILE)) {
        fs.writeFileSync(SETTINGS_FILE, '{}');
    }
}

function loadAll() {
    ensureFile();
    try {
        const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
        const data = JSON.parse(raw);
        return data && typeof data === 'object' ? data : {};
    } catch {
        return {};
    }
}

function saveAll(data) {
    ensureFile();
    const tmp = SETTINGS_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, SETTINGS_FILE);
}

function normalizeConfig(value) {
    const config = value && typeof value === 'object' ? value : {};
    const action = VALID_ACTIONS.has(config.action) ? config.action : 'delete';
    return {
        enabled: Boolean(config.enabled),
        action
    };
}

function getConfig(chatId, type) {
    const all = loadAll();
    return normalizeConfig(all?.[chatId]?.[type]);
}

function setConfig(chatId, type, patch) {
    const all = loadAll();
    if (!all[chatId] || typeof all[chatId] !== 'object') all[chatId] = {};

    const current = normalizeConfig(all[chatId][type]);
    const next = normalizeConfig({ ...current, ...patch });

    all[chatId][type] = next;
    saveAll(all);
    return next;
}

function getMessageType(message) {
    if (!message || typeof message !== 'object') return '';
    const keys = Object.keys(message);
    return keys[0] || '';
}

/**
 * Returns:
 * - "status" for a personal status mention delivered into a group
 * - "groupstatus" for a status/story posted directly into a group
 * - null for normal messages
 */
function detectType(m) {
    if (!m) return null;

    const message = m.message || m.msg || {};
    const mtype = m.mtype || getMessageType(message);

    // WhatsApp sends a status-mention pointer into the existing group chat.
    if (
        mtype === 'statusMentionMessage' ||
        message.statusMentionMessage ||
        message.groupStatusMentionMessage
    ) {
        return 'status';
    }

    // Group Status / Story sent directly to the group.
    if (
        mtype === 'groupStatusMessageV2' ||
        mtype === 'groupStatusMessage' ||
        message.groupStatusMessageV2 ||
        message.groupStatusMessage
    ) {
        return 'groupstatus';
    }

    return null;
}

function actionLabel(action) {
    if (action === 'kick') return 'Kick';
    if (action === 'warn') return 'Warn (3 warnings = kick)';
    return 'Delete';
}

function commandHelp(command) {
    return (
        `🛡️ *${command}*\n\n` +
        `• ${command} on\n` +
        `• ${command} off\n` +
        `• ${command} delete\n` +
        `• ${command} warn\n` +
        `• ${command} kick\n` +
        `• ${command} status`
    );
}

function configure(chatId, type, subcommand) {
    const sub = String(subcommand || '').toLowerCase();

    if (sub === 'on') return setConfig(chatId, type, { enabled: true });
    if (sub === 'off') return setConfig(chatId, type, { enabled: false });
    if (VALID_ACTIONS.has(sub)) {
        return setConfig(chatId, type, { enabled: true, action: sub });
    }
    return null;
}

async function enforce({ sock, message, config, handleWarn, reply }) {
    if (!config?.enabled || !message?.key) return false;

    const sender = message.sender || message.key.participant || message.participant;
    if (!sender) return false;

    // Never enforce against bot's own messages.
    if (message.key.fromMe) return false;

    try {
        await sock.sendMessage(message.chat, { delete: message.key });
    } catch (error) {
        console.log('[AntiStatus] Delete failed:', error?.message || error);
    }

    if (config.action === 'kick') {
        try {
            await sock.groupParticipantsUpdate(message.chat, [sender], 'remove');
            await reply(
                `🚫 @${sender.split('@')[0]} removed for posting a prohibited status.`,
                [sender]
            );
        } catch (error) {
            await reply(
                `⚠️ @${sender.split('@')[0]} posted a prohibited status, but I could not remove them. Make sure the bot is an admin.`,
                [sender]
            );
        }
        return true;
    }

    if (config.action === 'warn') {
        const result = await handleWarn(message.chat, sender, 'AntiStatus', 'warn');

        if (result?.kicked) {
            try {
                await sock.groupParticipantsUpdate(message.chat, [sender], 'remove');
                await reply(
                    `🚫 @${sender.split('@')[0]} was removed after 3 AntiStatus warnings.`,
                    [sender]
                );
            } catch {
                await reply(
                    `⚠️ @${sender.split('@')[0]} reached 3 AntiStatus warnings, but I could not remove them. Make sure the bot is an admin.`,
                    [sender]
                );
            }
        } else {
            await reply(
                `⚠️ @${sender.split('@')[0]} status posting is not allowed. Warning ${result?.warnCount || 1}/3.`,
                [sender]
            );
        }
        return true;
    }

    await reply(
        `🚫 @${sender.split('@')[0]} status posting is not allowed in this group.`,
        [sender]
    );
    return true;
}

module.exports = {
    VALID_ACTIONS,
    getConfig,
    setConfig,
    detectType,
    actionLabel,
    commandHelp,
    configure,
    enforce
};
