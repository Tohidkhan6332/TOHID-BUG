'use strict';

/**
 * Group information, invite, settings and poll commands.
 * Existing authorization and response behavior is preserved.
 */
async function executeGroupInfo(command, context) {
    const {
        sock: devtrust, msg: m, reply, text, prefix, isAdmins,
        isCreator, addNewsletterContext
    } = context;

    switch (command) {
            case 'groupjid':
            case 'gid': {
                if (!m.isGroup) return reply("👥 *Groups only*");
                reply(`📌 *Group JID:*\n\`${m.chat}\``);
            }
                break;

            case 'invite':
            case 'gclink': {
                if (!m.isGroup) return reply("👥 *Groups only*");
                if (!isAdmins && !isCreator) return reply("🔒 *Admins only*");

                try {
                    const code = await devtrust.groupInviteCode(m.chat);
                    const link = `https://chat.whatsapp.com/${code}`;
                    reply(`🔗 *Group Invite Link*\n\n${link}`);
                } catch (e) {
                    reply(`❌ *Cannot get invite link*\n\nReason: This group may have "Only admins can send invite links" enabled.`);
                }
            }
                break;

            case 'totalmembers':
            case 'members': {
                if (!m.isGroup) return reply("👥 *Groups only*");

                const groupMetadata = await devtrust.groupMetadata(m.chat).catch(() => null);
                const total = groupMetadata?.participants?.length || 0;
                const admins = groupMetadata?.participants?.filter(p => p.admin).length;

                reply(`👥 *Group Members*\n\n` +
                    `📊 *Total:* ${total}\n` +
                    `👑 *Admins:* ${admins}\n` +
                    `👤 *Members:* ${total - admins}`);
            }
                break;

            case 'revoke':
            case 'revokelink': {
                if (!m.isGroup) return reply("👥 *Groups only*");
                if (!isAdmins && !isCreator) return reply("🔒 *Admins only*");

                await devtrust.groupRevokeInvite(m.chat);
                const code = await devtrust.groupInviteCode(m.chat);
                reply(`✅ *Group link reset*\n🔗 https://chat.whatsapp.com/${code}`);
            }
                break;

            case 'groupinfo':
            case 'ginfo': {
                if (!m.isGroup) return reply("👥 *Groups only*");

                const metadata = await devtrust.groupMetadata(m.chat).catch(() => null);
                const participants = metadata?.participants || [];
                const admins = participants.filter(p => p.admin);
                const bots = participants.filter(p => p.id.includes('bot') || p.id.includes('lid'));

                const info = `📊 *Group Information*
    
📌 *Name:* ${metadata?.subject}
🆔 *ID:* ${metadata.id}
👑 *Owner:* @${metadata.owner?.split('@')[0] || 'Unknown'}
📅 *Created:* ${new Date(metadata.creation * 1000).toLocaleDateString()}
👥 *Members:* ${participants.length}
👮 *Admins:* ${admins.length}
🤖 *Bots:* ${bots.length}
🔒 *Restrict:* ${metadata.restrict ? 'Yes' : 'No'}
🔐 *Announce:* ${metadata.announce ? 'Yes' : 'No'}`;

                reply(info, metadata.owner ? [metadata.owner] : []);
            }
                break;

            case 'setname':
            case 'setgcname': {
                if (!m.isGroup) return reply("👥 *Groups only*");
                if (!isAdmins && !isCreator) return reply("🔒 *Admins only*");

                if (!text) return reply(`📝 *Usage:* ${prefix}setname New Group Name`);

                try {
                    await devtrust.groupUpdateSubject(m.chat, text);
                    reply(`✅ *Group name changed to:* ${text}`);
                } catch (e) {
                    reply(`❌ *Failed:* ${e.message}`);
                }
            }
                break;

            case 'setdesc':
            case 'setgcdesc': {
                if (!m.isGroup) return reply("👥 *Groups only*");
                if (!isAdmins && !isCreator) return reply("🔒 *Admins only*");

                if (!text) return reply(`📝 *Usage:* ${prefix}setdesc New group description`);

                try {
                    await devtrust.groupUpdateDescription(m.chat, text);
                    reply(`✅ *Group description updated*`);
                } catch (e) {
                    reply(`❌ *Failed:* ${e.message}`);
                }
            }
                break;

            case 'poll':
            case 'createpoll': {
                if (!m.isGroup) return reply("👥 *Groups only*");
                if (!isAdmins && !isCreator) return reply("🔒 *Admins only*");

                if (!text || !text.includes('|')) {
                    return reply(`📊 *Create a poll*\n\n` +
                        `📝 *Usage:* ${prefix}poll Question | Option1 | Option2\n` +
                        `💡 *Example:* ${prefix}poll Best color? | Red | Blue | Green`);
                }

                const parts = text.split('|');
                const question = parts[0].trim();
                const options = parts.slice(1).map(opt => opt.trim());

                if (options.length < 2) return reply("❌ *At least 2 options required*");
                if (options.length > 5) return reply("❌ *Maximum 5 options allowed*");

                await devtrust.sendMessage(m.chat, {
                    poll: {
                        name: question,
                        values: options,
                        selectableCount: 1
                    }
                });
            }
                break;

            case 'announce':
            case 'announcement': {
                if (!m.isGroup) return reply("👥 *Groups only*");
                if (!isAdmins && !isCreator) return reply("🔒 *Admins only*");

                if (!text) return reply(`📢 *Usage:* ${prefix}announce Your message here`);

                const groupMetadata = await devtrust.groupMetadata(m.chat).catch(() => null);
                const participants = groupMetadata?.participants || [];

                await devtrust.sendMessage(m.chat, addNewsletterContext({
                    image: { url: 'https://i.ibb.co/Jw3HdHnv/upload-1790713792397-6bec7590-jpg.jpg' },
                    caption: `📢 *GROUP ANNOUNCEMENT*\n\n${text}\n\n- @${m?.sender?.split('@')?.[0] || 'User'}`,
                    mentions: participants.map(p => p.id)
                }));
            }
                break;
        default:
            return false;
    }
    return true;
}

module.exports = { executeGroupInfo };
