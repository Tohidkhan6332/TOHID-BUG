'use strict';

/** Fetch and display a WhatsApp user's public profile details. */
async function executeProfile(command, context) {
    const { sock, msg: m, addNewsletterContext } = context;
    switch (command) {
                    case 'whois':
                    case 'profile': {
                        const user = m.mentionedJid[0] || m.quoted?.sender || m.sender;
        
                        let pp;
                        try {
                            pp = await devtrust.profilePictureUrl(user, 'image');
                        } catch {
                            pp = 'https://i.ibb.co/Jw3HdHnv/upload-1790713792397-6bec7590-jpg.jpg';
                        }
        
                        let name = await devtrust.getName(user);
                        let about = await devtrust.fetchStatus(user).catch(() => ({ status: 'No bio' }));
        
                        await devtrust.sendMessage(m.chat, addNewsletterContext({
                            image: { url: pp },
                            caption: `👤 *User Profile*\n\n` +
                                `📛 *Name:* ${name}\n` +
                                `📱 *Number:* ${user.split('@')[0]}\n` +
                                `📝 *Bio:* ${about.status || 'No bio'}\n` +
                                `🆔 *JID:* ${user}`
                        }), { quoted: m });
                    }
                        break;
        
                    // ======================[ 👥 TOTAL MEMBERS ]======================
        default:
            return false;
    }
}

module.exports = { executeProfile };
