'use strict';

/**
 * Small standalone utility commands.
 */
async function executeTextUtilities(command, context) {
    const {
        sock: devtrust, msg: m, reply, text, args, from,
        addNewsletterContext
    } = context;

    switch (command) {
            case 'jid': {
                reply(from);
            }
                break;

            case "genpass": {
                const length = parseInt(text) || 12;
                const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
                let pass = "";
                for (let i = 0; i < length; i++)
                    pass += chars.charAt(Math.floor(Math.random() * chars.length));

                reply(`🔑 *Generated Password*\n\n${pass}`);
            }
                break;

            case "qrcode": {
                if (!text) return reply(`📱 *Usage:* ${command} your text or link`);
                try {
                    const QRCode = require("qrcode");
                    const buffer = await QRCode.toBuffer(text, {
                        errorCorrectionLevel: "M",
                        type: "png",
                        margin: 2,
                        width: 800
                    });
                    await devtrust.sendMessage(
                        m.chat,
                        addNewsletterContext({
                            image: buffer,
                            caption: `📱 *TOHID-AI QR Code*\n\n${text}`
                        }),
                        { quoted: m }
                    );
                } catch (error) {
                    console.error("QR CODE ERROR:", error);
                    reply("❌ *QR code generation failed* • Try again");
                }
            }
                break;

            case 'shorturl': {
                if (!text) return reply('🔗 *Provide a URL*');

                try {
                    let shortUrl1 = await (await fetch(`https://tinyurl.com/api-create.php?url=${args[0]}`)).text();
                    if (!shortUrl1) return reply(`❌ *Failed to shorten URL*`);

                    reply(`🔗 *Shortened*\n${shortUrl1}`);
                } catch (e) {
                    reply('❌ *Error*');
                }
            }
                break;

            case 'quote': {
                try {
                    const res = await fetch('https://zenquotes.io/api/random');
                    const json = await res.json();
                    const quote = json[0].q;
                    const author = json[0].a;

                    const quoteImg = `https://dummyimage.com/600x400/000/fff.png&text=${encodeURIComponent(`"${quote}"\n\n- ${author}`)}`;

                    await devtrust.sendMessage(m.chat,
                        addNewsletterContext({
                            image: { url: quoteImg },
                            caption: `_"${quote}"_\n— *${author}*`
                        }),
                        { quoted: m }
                    );
                } catch (err) {
                    reply('❌ *Quote failed*');
                }
            }
                break;

            case 'joke': {
                try {
                    let res = await fetch('https://v2.jokeapi.dev/joke/Any?type=single');
                    let data = await res.json();

                    await devtrust.sendMessage(m.chat,
                        addNewsletterContext({
                            image: { url: 'https://i.ibb.co/Jw3HdHnv/upload-1790713792397-6bec7590-jpg.jpg' },
                            caption: `😂 *Joke*\n\n${data.joke}`
                        }),
                        { quoted: m }
                    );
                } catch (err) {
                    reply('❌ *Joke failed*');
                }
            }
                break;
        default:
            return false;
    }
    return true;
}

module.exports = { executeTextUtilities };
