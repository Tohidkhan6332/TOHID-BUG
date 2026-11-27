'use strict';

/**
 * Safe group administration commands extracted from MrTohid.js.
 * Authorization checks and WhatsApp API calls intentionally retain
 * their original behavior.
 */
async function executeGroupAdmin(command, context) {
    const {
        sock: devtrust,
        msg: m,
        reply,
        text,
        isCreator,
        getGroupAdmins
    } = context;

    switch (command) {
            case 'promote': {
                if (!m.isGroup) return reply("👥 *Groups only*");
                const groupMetadata = await devtrust.groupMetadata(m.chat).catch(() => null);
                const participants = groupMetadata?.participants || [];
                const groupAdmins = getGroupAdmins(participants);
                const isAdmins = groupAdmins.includes(m.sender);
                if (!isCreator && !isAdmins) return reply("🔒 *This feature is for Admins or Owner only*");

                const botId = devtrust.user.id.split(':')[0] + '@s.whatsapp.net';
                const botIsAdmin = groupAdmins.includes(botId);
                if (!botIsAdmin) return reply("❌ *Bot is not an admin!* Unable to execute command.");

                let users = m.mentionedJid[0] || m.quoted?.sender || text.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                await devtrust.groupParticipantsUpdate(m.chat, [users], 'promote').catch(() => null);
                reply("👑 *User promoted to admin*");
            }
                break;

            case 'demote': {
                if (!m.isGroup) return reply("👥 *Groups only*");
                const groupMetadata = await devtrust.groupMetadata(m.chat).catch(() => null);
                const participants = groupMetadata?.participants || [];
                const groupAdmins = getGroupAdmins(participants);
                const isAdmins = groupAdmins.includes(m.sender);
                if (!isCreator && !isAdmins) return reply("🔒 *This feature is for Admins or Owner only*");

                const botId = devtrust.user.id.split(':')[0] + '@s.whatsapp.net';
                const botIsAdmin = groupAdmins.includes(botId);
                if (!botIsAdmin) return reply("❌ *Bot is not an admin!* Unable to execute command.");

                let users = m.mentionedJid[0] || m.quoted?.sender || text.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                await devtrust.groupParticipantsUpdate(m.chat, [users], 'demote').catch(() => null);
                reply("⬇️ *User demoted from admin*");
            }
                break;

            case 'mute': {
                if (!m.isGroup) return reply("👥 *Groups only*");
                const groupMetadata = await devtrust.groupMetadata(m.chat).catch(() => null);
                const participants = groupMetadata?.participants || [];
                const groupAdmins = getGroupAdmins(participants);
                const isAdmins = groupAdmins.includes(m.sender);
                if (!isCreator && !isAdmins) return reply("🔒 *This feature is for Admins or Owner only*");

                const botId = devtrust.user.id.split(':')[0] + '@s.whatsapp.net';
                const botIsAdmin = groupAdmins.includes(botId);
                if (!botIsAdmin) return reply("❌ *Bot is not an admin!* Unable to execute command.");

                await devtrust.groupSettingUpdate(m.chat, 'announcement').catch(() => null);
                reply("🔇 *Group muted* • Only admins can message");
            }
                break;

            case 'unmute': {
                if (!m.isGroup) return reply("👥 *Groups only*");
                const groupMetadata = await devtrust.groupMetadata(m.chat).catch(() => null);
                const participants = groupMetadata?.participants || [];
                const groupAdmins = getGroupAdmins(participants);
                const isAdmins = groupAdmins.includes(m.sender);
                if (!isCreator && !isAdmins) return reply("🔒 *This feature is for Admins or Owner only*");

                const botId = devtrust.user.id.split(':')[0] + '@s.whatsapp.net';
                const botIsAdmin = groupAdmins.includes(botId);
                if (!botIsAdmin) return reply("❌ *Bot is not an admin!* Unable to execute command.");

                await devtrust.groupSettingUpdate(m.chat, 'not_announcement').catch(() => null);
                reply("🔊 *Group unmuted* • Everyone can message");
            }
                break;

            case 'add': {
                if (!m.isGroup) return reply("👥 *Groups only*");
                const groupMetadata = await devtrust.groupMetadata(m.chat).catch(() => null);
                const participants = groupMetadata?.participants || [];
                const groupAdmins = getGroupAdmins(participants);
                const isAdmins = groupAdmins.includes(m.sender);
                if (!isCreator && !isAdmins) return reply("🔒 *This feature is for Admins or Owner only*");

                const botId = devtrust.user.id.split(':')[0] + '@s.whatsapp.net';
                const botIsAdmin = groupAdmins.includes(botId);
                if (!botIsAdmin) return reply("❌ *Bot is not an admin!* Unable to execute command.");

                let users = m.quoted?.sender || text.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                await devtrust.groupParticipantsUpdate(m.chat, [users], 'add').catch(() => null);
                reply("✅ *User added to group*");
            }
                break;
        default:
            return false;
    }
    return true;
}

module.exports = { executeGroupAdmin };
