'use strict';

/**
 * Owner contact and repository information commands.
 */
async function executeOwnerInfo(command, context) {
    const {
        sock: devtrust, msg: m, WHATSAPP_OWNER_NUMBER,
        sendRichHtml, ownerHtml, addNewsletterContext
    } = context;

    switch (command) {
            case "owner": {
                const ownerNumber = WHATSAPP_OWNER_NUMBER;
                await sendRichHtml({
                    sock: devtrust,
                    jid: m.chat,
                    quoted: m,
                    title: 'TOHID-AI OWNER',
                    html: ownerHtml({
                        number: ownerNumber,
                        name: 'MR TOHID',
                        telegram: 'https://t.me/Tohidkhan6332',
                        channel: 'https://t.me/Tohidtech6332',
                    }),
                });
            }
                break;

            case "repo": {
                const tgUsername = "t.me/Tohidkhan6332";
                const tgChannel = "https://t.me/Tohidtech6332";
                const waChannel = "https://whatsapp.com/channel/0029VaGyP933bbVC7G0x0i2T";

                let caption = `📂 * 𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 Repository *\n\n` +
                    `🤖 Telegram: https://t.me/TohidAi_bot\n` +
                    `👨‍💻 Developer: @Tohidkhan6332\n` +
                    `📢 Updates:\n${tgChannel}\n${waChannel}`;

                await devtrust.sendMessage(m.chat,
                    addNewsletterContext({
                        text: caption,
                        mentions: [m.sender]
                    }),
                    { quoted: m }
                );
            }
                break;
        default:
            return false;
    }
    return true;
}

module.exports = { executeOwnerInfo };
