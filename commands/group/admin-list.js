'use strict';

/**
 * Owner-only group admin listing command.
 */
async function executeAdminList(context) {
    const {
        sock: devtrust, msg: m, reply, participants,
        groupMetadata, addNewsletterContext, isCreator
    } = context;

    if (!isCreator) return reply("🔒 *Owner only*");
    if (!m.isGroup) return reply("👥 *Groups only*");

    const groupAdmins = (participants || []).filter(p => p.admin);
    const listAdmin = groupAdmins.map((v, i) => `${i + 1}. @${v.id.split('@')[0]}`).join('\n');
    const owner = groupMetadata?.owner ||
        groupAdmins.find(p => p.admin === 'superadmin')?.id ||
        m.chat.split`-`[0] + '@s.whatsapp.net';

    const messageText = `👑 *Admins*\n\n${listAdmin}`;
    await devtrust.sendMessage(m.chat, addNewsletterContext({
        text: messageText,
        mentions: [...groupAdmins.map(v => v.id), owner]
    }), { quoted: m });
}

module.exports = { executeAdminList };
