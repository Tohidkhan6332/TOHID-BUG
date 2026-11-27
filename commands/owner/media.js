'use strict';

/** Owner-only profile and media lookup commands. */
async function executeOwnerMedia(command, context) {
    const { sock: devtrust, msg: m, reply, text, prefix, axios, isCreator, addNewsletterContext } = context;
    switch (command) {
                    case 'getpp': {
                        if (!isCreator) return reply("🔒 *Owner only*");
        
                        let userss = m.mentionedJid[0] ? m.mentionedJid[0] :
                            m.quoted ? m.quoted.sender :
                                text.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        
                        try {
                            var ppuser = await devtrust.profilePictureUrl(userss, 'image');
                        } catch (err) {
                            var ppuser = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';
                        }
        
                        await devtrust.sendMessage(m.chat,
                            addNewsletterContext({
                                image: { url: ppuser },
                                caption: `👤 *Profile Picture*`
                            }),
                            { quoted: m }
                        );
                    }
                        break;
        
                    case 'yts':
                    case 'ytsearch': {
                        if (!isCreator) return reply(`🔒 *Owner only*`);
                        if (!text) return reply(`🔍 *Example:* ${prefix + command} anime music`);
        
                        let yts = require("yt-search");
                        let search = await yts(text);
        
                        let teks = `📺 *YouTube Search*\n\n"${text}"\n\n`;
                        let no = 1;
        
                        for (let i of search.all.slice(0, 5)) {
                            teks += `${no++}. *${i.title}*\n⏱️ ${i.timestamp} | 👀 ${i.views}\n🔗 ${i.url}\n\n`;
                        }
        
                        await devtrust.sendMessage(m.chat,
                            addNewsletterContext({
                                image: { url: search.all[0].thumbnail },
                                caption: teks
                            }),
                            { quoted: m }
                        );
                    }
                        break;
        
                    case 'animewlp': {
                        if (!isCreator) return reply(`🔒 *Owner only*`);
        
                        try {
                            const waifudd = await axios.get(`https://nekos.life/api/v2/img/wallpaper`);
                            await devtrust.sendMessage(m.chat,
                                addNewsletterContext({
                                    image: { url: waifudd.data.url },
                                    caption: "🖼️ *Anime Wallpaper*"
                                }),
                                { quoted: m }
                            );
                        } catch (err) {
                            reply('❌ *Error fetching wallpaper*');
                        }
                    }
                        break;
        default:
            return false;
    }
}

module.exports = { executeOwnerMedia };
