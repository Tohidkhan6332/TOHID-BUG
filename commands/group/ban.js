'use strict';

/**
 * Group-link join-and-ban workflow. The existing groupB operation is injected
 * from the main runtime so its behavior and dependencies remain unchanged.
 */
async function executeGroupBan(context = {}) {
    const { sock, msg: m, args = [], addNewsletterContext, groupB } = context;
    const link = args[0];

    if (!link || !link.includes('chat.whatsapp.com')) {
        return sock.sendMessage(m.chat, addNewsletterContext({
            text: '❌ *Invalid group link!*\n\nExample:\n*.groupban* https://chat.whatsapp.com/CodeUndanganGroup'
        }), { quoted: m });
    }

    await sock.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

    try {
        const inviteCode = link.split('chat.whatsapp.com/')[1].trim();
        const groupId = await sock.groupAcceptInvite(inviteCode);

        if (!groupId) {
            throw new Error('Failed to join the group. Make sure the link is active and valid.');
        }

        const targetJid = groupId.endsWith('@g.us') ? groupId : `${groupId}@g.us`;
        await groupB(sock, targetJid);

        await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
        await sock.sendMessage(m.chat, addNewsletterContext({
            text: `✅ *Successfully joined the group and executed the command:*\n\`${targetJid}\``
        }), { quoted: m });
    } catch (err) {
        console.error('[TESJOIN ERROR]', err.message);
        await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
        await sock.sendMessage(m.chat, addNewsletterContext({
            text: `❌ *Proses Gagal*\n${err.message || 'An error occurred'}`
        }), { quoted: m });
    }
    return true;
}

module.exports = { executeGroupBan };
