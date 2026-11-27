'use strict';

/**
 * Command handlers for AntiStatus and AntiGroupStatus.
 * Persistence and message enforcement remain in utils/anti-status.js.
 */
async function executeAntiStatus(command, context = {}) {
    const {
        m, reply, args = [], prefix = '.', isAdmins = false, isCreator = false,
        getConfig, actionLabel, commandHelp, configure
    } = context;

    if (command !== 'antistatus' && command !== 'antigstatus') return false;
    if (!m?.isGroup) return reply('❌ This command can only be used in a group.');
    if (!isAdmins && !isCreator) return reply('🔒 *Admin only*');

    const settingType = command === 'antistatus' ? 'antistatus' : 'antigstatus';
    const label = command === 'antistatus'
        ? '🛡️ *ANTI-STATUS*'
        : '🛡️ *ANTI-GROUP-STATUS*';

    const sub = String(args[0] || '').toLowerCase();
    const current = getConfig(m.chat, settingType);

    if (!sub || sub === 'help') {
        return reply(
            commandHelp(prefix + command) +
            '\n\nCurrent: *' + (current.enabled ? 'ON' : 'OFF') +
            '*\nAction: *' + actionLabel(current.action) + '*'
        );
    }

    if (sub === 'status') {
        return reply(
            label +
            '\n\n⚡ Enabled: *' + (current.enabled ? 'YES' : 'NO') +
            '*\n🎯 Action: *' + actionLabel(current.action) + '*'
        );
    }

    const updated = configure(m.chat, settingType, sub);
    if (!updated) return reply(commandHelp(prefix + command));

    return reply(
        label +
        '\n\n⚡ Protection: *' + (updated.enabled ? 'ON' : 'OFF') +
        '*\n🎯 Action: *' + actionLabel(updated.action) + '*'
    );
}

module.exports = { executeAntiStatus };
