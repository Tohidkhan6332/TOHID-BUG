'use strict';

/** Owner-only WhatsApp channel metadata lookup. */
async function executeChannelInfo(command, context) {
    const { sock: devtrust, reply, text, isCreator } = context;
    switch (command) {
                    case 'idch': {
                        if (!isCreator) return reply("🔒 *Owner only*");
                        if (!text) return reply("🔗 *Example:* link channel");
                        if (!text.includes("https://whatsapp.com/channel/"))
                            return reply("❌ *Invalid channel link*");
        
                        let result = text.split('https://whatsapp.com/channel/')[1];
                        let res = await devtrust.newsletterMetadata("invite", result);
        
                        let teks = `📢 *Channel Info*\n\n` +
                            `🆔 ID: ${res.id}\n` +
                            `👤 Name: ${res.name}\n` +
                            `👥 Followers: ${res.subscribers}\n` +
                            `✔️ Verified: ${res.verification == "VERIFIED" ? "Yes" : "No"}`;
        
                        return reply(teks);
                    }
                        break;
        default:
            return false;
    }
}

module.exports = { executeChannelInfo };
