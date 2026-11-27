'use strict';

/**
 * Lightweight lookup and casual game commands extracted from MrTohid.js.
 * Network and WhatsApp dependencies are injected by the caller.
 */
async function executeLookupGames(command, context) {
    const { sock: devtrust, msg: m, reply, text, axios, addNewsletterContext, tohidGpt4 } = context;
    switch (command) {
                    case "urban": {
                        if (!text) return reply("📚 *Example:* urban sus");
        
                        try {
                            const res = await axios.get(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(text)}`);
                            const defs = res.data?.list;
                            if (!defs || !defs.length) return reply(`🔍 No definitions found for "${text}"`);
        
                            const top = defs[0];
                            const msg = `📖 *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 Urban*\n\n📌 *${top.word}*\n\n${top.definition}\n\n💬 *Example:* ${top.example}`;
                            reply(msg);
                        } catch (e) {
                            console.error("URBAN ERROR:", e);
                            reply("❌ *Dictionary is offline* • Try again later");
                        }
                    }
                        break;
        
                    case "solve": {
                        const a = Math.floor(Math.random() * 50) + 1;
                        const b = Math.floor(Math.random() * 50) + 1;
                        const answer = a + b;
        
                        reply(`➕ *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 Math*\n\nSolve: ${a} + ${b}\nReply with: mathanswer ${answer}`);
                    }
                        break;
        
                    case 'wouldyou': {
                        try {
                            const questions = [
                                "Fly 🕊️ or be invisible 👻?",
                                "Always 10 minutes late ⏰ or 20 minutes early ⌛?",
                                "Live without music 🎶 or without movies 🎥?",
                                "Be rich 💰 and sad 😢, or poor 💸 but happy 😁?",
                                "Eat pizza 🍕 forever or rice 🍚 forever?",
                                "Time travel to past ⏳ or future 🚀?",
                                "Fight 1 horse-sized duck 🦆 or 100 duck-sized horses 🐴?",
                                "Never use social media 📵 or never watch TV 📺?",
                                "Have super strength 💪 or super intelligence 🧠?",
                                "Speak in rhymes 🎤 or sing instead of talk 🎶?"
                            ];
        
                            const randomQ = questions[Math.floor(Math.random() * questions.length)];
                            reply(`🤔 *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 Would You Rather*\n\nWould you rather ${randomQ}`);
                        } catch (e) {
                            console.error(e);
                            reply("⚠️ *Question generator failed* • Try again later");
                        }
                    }
                        break;
        
                    case 'github': {
                        if (!text) return reply(`👨‍💻 *Usage:* ${command} username`);
        
                        try {
                            let res = await axios.get(`https://api.github.com/users/${encodeURIComponent(text)}`);
                            let user = res.data;
        
                            if (!user || !user.login) return reply("🔍 *User not found*");
        
                            let profileInfo = `👨‍💻 *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 GitHub*\n\n` +
                                `📌 *${user.name || user.login}*\n` +
                                `📍 ${user.location || "Location hidden"}\n` +
                                `📦 Repos: ${user.public_repos} | 👥 Followers: ${user.followers}\n` +
                                `🔗 ${user.html_url}`;
        
                            await devtrust.sendMessage(m.chat,
                                addNewsletterContext({
                                    image: { url: user.avatar_url },
                                    caption: profileInfo
                                }),
                                { quoted: m }
                            );
                        } catch (e) {
                            console.error(e);
                            reply("⚠️ *GitHub fetch failed* • Try again later");
                        }
                    }
                        break;
        
                    case 'npm': {
                        if (!text) return reply(`📦 *Usage:* ${command} package-name`);
        
                        try {
                            let res = await axios.get(`https://registry.npmjs.org/${encodeURIComponent(text)}`);
                            let data = res.data;
        
                            if (!data.name) return reply("🔍 *Package not found*");
        
                            let latestVersion = data['dist-tags']?.latest;
                            let info = data.versions[latestVersion];
        
                            let npmInfo = `📦 *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 NPM*\n\n` +
                                `📌 *${data.name}* v${latestVersion}\n` +
                                `📝 ${data.description || "No description"}\n` +
                                `👤 ${info?.author?.name || "Unknown author"}\n` +
                                `📦 License: ${info?.license || "Unknown"}\n` +
                                `🔗 https://www.npmjs.com/package/${data.name}`;
        
                            reply(npmInfo);
                        } catch (e) {
                            console.error(e);
                            reply("⚠️ *NPM fetch failed* • Registry might be down");
                        }
                    }
                        break;
        default:
            return false;
    }
}

module.exports = { executeLookupGames };
