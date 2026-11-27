'use strict';

/**
 * Group moderation utility commands extracted from MrTohid.js.
 * Existing authorization, global state, replies and persistence behavior
 * are intentionally kept unchanged.
 */
async function executeGroupModeration(command, context = {}) {
    const {
        msg: m, reply, isAdmins = false, isCreator = false,
        botNumber, saveMutedData
    } = context;

    switch (String(command || '').toLowerCase()) {
        case 'muteuser':
        case 'mutemember': {
            if (!m.isGroup) return reply("👥 *Groups only*");
            if (!isAdmins && !isCreator) return reply("🔒 *Admins only*");

            const user = m.mentionedJid[0] || m.quoted?.sender;
            if (!user) return reply("👤 *Mention user to mute*");

            if (user === m.sender) return reply("❌ *You cannot mute yourself*");

            if (isCreator && user === botNumber) return reply("❌ *Cannot mute the bot*");

            if (!global.muted) global.muted = {};
            if (!global.muted[m.chat]) global.muted[m.chat] = [];

            if (global.muted[m.chat].includes(user)) {
                return reply(`⚠️ *@${user.split('@')[0]} is already muted*\nUse .unmute to unmute`, [user]);
            }

            global.muted[m.chat].push(user);
            saveMutedData(global.muted);  // Persist the updated mute list.
            reply(`🔇 *@${user.split('@')[0]} has been muted*`, [user]);
        }
            break;

        case 'unmuteuser':
        case 'unmutemember': {
            if (!m.isGroup) return reply("👥 *Groups only*");
            if (!isAdmins && !isCreator) return reply("🔒 *Admins only*");

            const user = m.mentionedJid[0] || m.quoted?.sender;
            if (!user) return reply("👤 *Mention user to unmute*");

            if (!global.muted) global.muted = {};
            if (!global.muted[m.chat]) global.muted[m.chat] = [];

            if (!global.muted[m.chat].includes(user)) {
                return reply(`⚠️ *@${user.split('@')[0]} is not muted*`, [user]);
            }

            global.muted[m.chat] = global.muted[m.chat].filter(jid => jid !== user);
            saveMutedData(global.muted);  // Persist the updated mute list.
            reply(`🔊 *@${user.split('@')[0]} has been unmuted*`, [user]);
        }
            break;

        case 'warns':
        case 'checkwarns': {
            if (!m.isGroup) return reply("👥 *Groups only*");

            const user = m.mentionedJid[0] || m.quoted?.sender || m.sender;
            const warnCount = global.warns?.[m.chat]?.[user] || 0;

            reply(`⚠️ *@${user.split('@')[0]} has ${warnCount}/3 warnings*`, [user]);
        }
            break;

        case 'resetwarns': {
            if (!m.isGroup) return reply("👥 *Groups only*");
            if (!isAdmins && !isCreator) return reply("🔒 *Admins only*");

            const user = m.mentionedJid[0] || m.quoted?.sender;
            if (!user) return reply("👤 *Mention user to reset warnings*");

            if (global.warns?.[m.chat]?.[user]) {
                delete global.warns[m.chat][user];
                reply(`✅ *Warnings reset for @${user.split('@')[0]}*`, [user]);
            } else {
                reply(`⚠️ *@${user.split('@')[0]} has no warnings*`, [user]);
            }
        }
            break;

        default:
            return false;
    }
    return true;
}

module.exports = { executeGroupModeration };
