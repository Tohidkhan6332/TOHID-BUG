'use strict';

/**
 * Group settings, avatar, invite-join and join-request management commands.
 * Existing checks, WhatsApp API calls, waits and reply text are preserved.
 */
async function executeGroupManagement(command, context = {}) {
    const { sock, msg: m, reply, text, prefix, isAdmins, isCreator, isSudo, sleep } = context;
    switch (String(command || '').toLowerCase()) {
        case 'gcsettings':
        case 'groupsettings': {
            if (!m.isGroup) return reply("👥 *Groups only*");
            if (!isAdmins && !isCreator) return reply("🔒 *Admins only*");
            const metadata = await sock.groupMetadata(m.chat).catch(() => null);
            const settings = `⚙️ *Group Settings*
    
🔇 *Announce:* ${metadata.announce ? 'ON (Admins only)' : 'OFF (Everyone)'}
🔒 *Restrict:* ${metadata.restrict ? 'ON (Admins only)' : 'OFF (Everyone)'}
👥 *Approve Mode:* ${metadata.approve ? 'ON' : 'OFF'}
📝 *Ephemeral:* ${metadata.ephemeralDuration ? metadata.ephemeralDuration + ' seconds' : 'OFF'}`;
            reply(settings);
        }
            break;

        case 'setgrouppp':
        case 'setgcpp': {
            if (!m.isGroup) return reply("👥 *Groups only*");
            if (!isAdmins && !isCreator) return reply("🔒 *Admins only*");
            const quoted = m.quoted ? m.quoted : m;
            const mime = (quoted.msg || quoted).mimetype || '';
            if (!/image/.test(mime)) return reply("🖼️ *Reply to an image*");
            try {
                const media = await quoted.download();
                await sock.updateProfilePicture(m.chat, media);
                reply('✅ *Group picture updated*');
            } catch (e) {
                reply(`❌ *Failed:* ${e.message}`);
            }
        }
            break;

        case 'join': {
            if (!isCreator && !isSudo) return reply("🔒 *Owner/Sudo only*");
            if (!text) return reply(`🔗 *Usage:* ${prefix}join https://chat.whatsapp.com/xxxxxx`);
            const inviteCode = text.match(/chat\.whatsapp\.com\/([a-zA-Z0-9_-]+)/);
            if (!inviteCode) return reply("❌ *Invalid group link*");
            try {
                await reply("🔄 *Joining group...");
                const result = await sock.groupAcceptInvite(inviteCode[1]);
                reply(`✅ *Joined successfully!*\n🆔 ${result}`);
            } catch (e) {
                reply(`❌ *Failed to join:* ${e.message}`);
            }
        }
            break;

        case 'acceptall': {
            if (!m.isGroup) return reply("👥 *Groups only*");
            if (!isAdmins && !isCreator) return reply("🔒 *Admins only*");
            try {
                const requests = await sock.groupRequestParticipantsList(m.chat);
                if (!requests || requests.length === 0) return reply("📭 *No pending join requests*");
                reply(`🔄 *Accepting ${requests.length} requests...*`);
                let accepted = 0;
                for (let req of requests) {
                    if (req.requestMethod === 'invite') {
                        await sock.groupRequestParticipantsUpdate(m.chat, [req.jid], 'accept');
                        accepted++;
                        await sleep(1000);
                    }
                }
                reply(`✅ *Accepted ${accepted} join requests*`);
            } catch (e) {
                reply(`❌ *Error:* ${e.message}`);
            }
        }
            break;

        case 'rejectall': {
            if (!m.isGroup) return reply("👥 *Groups only*");
            if (!isAdmins && !isCreator) return reply("🔒 *Admins only*");
            try {
                const requests = await sock.groupRequestParticipantsList(m.chat);
                if (!requests || requests.length === 0) return reply("📭 *No pending join requests*");
                reply(`🔄 *Rejecting ${requests.length} requests...*`);
                let rejected = 0;
                for (let req of requests) {
                    await sock.groupRequestParticipantsUpdate(m.chat, [req.jid], 'reject');
                    rejected++;
                    await sleep(1000);
                }
                reply(`❌ *Rejected ${rejected} join requests*`);
            } catch (e) {
                reply(`❌ *Error:* ${e.message}`);
            }
        }
            break;

        default:
            return false;
    }
    return true;
}

module.exports = { executeGroupManagement };
