'use strict';

/**
 * General fun, lookup and speech commands extracted from the main router.
 */
async function executeGeneralFun(command, context) {
    const {
        sock: devtrust, msg: m, reply, text, axios, tohidGpt4,
        googleTTS, addNewsletterContext
    } = context;

    switch (command) {
            case "mathfact": {
                await devtrust.sendPresenceUpdate("composing", m.chat);
                try {
                    const res = await axios.get("http://numbersapi.com/random/math?json");

                    const caption = `🧮 *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 Math Fact*
        
${res.data.text}

💡 *Random number knowledge, just for you*`;

                    await devtrust.sendMessage(m.chat,
                        addNewsletterContext({
                            text: caption,
                            mentions: [m.sender]
                        }),
                        { quoted: m }
                    );
                } catch {
                    reply("❌ *Math fact unavailable* • Numbers are being shy today");
                }
            }
                break;

            case "recipe-ingredient": {
                if (!text) return reply("🍳 *Example:* recipe-ingredient chicken");

                await devtrust.sendPresenceUpdate("composing", m.chat);

                try {
                    const res = await axios.get(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(text)}`);
                    if (!res.data.meals) return reply(`🍽️ *No recipes found* using "${text}"`);

                    const meals = res.data.meals
                        .slice(0, 5)
                        .map((m, i) => `${i + 1}. *${m.strMeal}*`)
                        .join("\n");

                    const caption = `🍳 *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 Recipes*
        
🔍 *Ingredient:* ${text}

${meals}

🔗 *View full recipes:* https://www.themealdb.com`;

                    await devtrust.sendMessage(m.chat,
                        addNewsletterContext({
                            text: caption,
                            mentions: [m.sender]
                        }),
                        { quoted: m }
                    );
                } catch {
                    reply("❌ *Recipe fetch failed* • Kitchen's closed, try again later");
                }
            }
                break;

            case 'ship': {
                if (!text) return reply(`💘 *Usage:* ${command} name1 & name2`);

                let names = text.split("&");
                if (names.length < 2) return reply("⚠️ Format: name1 & name2");

                let name1 = names[0].trim();
                let name2 = names[1].trim();

                let percentage = Math.floor(Math.random() * 100) + 1;
                let bar = "❤️".repeat(Math.floor(percentage / 10)) + "🤍".repeat(10 - Math.floor(percentage / 10));

                reply(`💞 *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 Ship*\n\n${name1} 💘 ${name2}\n\nCompatibility: *${percentage}%*\n${bar}`);
            }
                break;

            case 'rewrite': {
                if (!text) return reply(`✍️ *Usage:* ${command} your text here`);
                try {
                    const result = await tohidGpt4(`Rewrite this to be clear and grammatically correct:\n"${text}"`);
                    reply(`✍️ *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 Rewrite*\n\n${result}`);
                } catch (e) {
                    console.error(e);
                    reply("⚠️ *Rewrite failed* • Editor is on break");
                }
            }
                break;

            case 'rate': {
                if (!text) return reply(`📊 *Usage:* ${command} something to rate`);

                let percentage = Math.floor(Math.random() * 100) + 1;
                let bar = "⭐".repeat(Math.floor(percentage / 10)) + "✩".repeat(10 - Math.floor(percentage / 10));

                reply(`📊 *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 Rate*\n\n${text}\n\n*${percentage}%* ${bar}`);
            }
                break;

            case 'story': {
                if (!text) return reply(`📖 *Usage:* ${command} a brave warrior`);
                try {
                    const result = await tohidGpt4(`Write a short creative story about: ${text}`);
                    reply(`📖 *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 Story*\n\n${result}`);
                } catch (e) {
                    console.error(e);
                    reply("⚠️ *Storyteller is sleeping* • Try again later");
                }
            }
                break;

            case "coin": {
                const result = Math.random() < 0.5 ? "🪙 Heads" : "🪙 Tails";
                await devtrust.sendMessage(m.chat, addNewsletterContext({ text: `🎲 Coin Flip Result: ${result}` }), { quoted: m });
            }
                break;

            case "gamefact": {
                try {
                    const res = await axios.get("https://www.freetogame.com/api/games");
                    const games = res.data;
                    const game = games[Math.floor(Math.random() * games.length)];

                    reply(`🎮 *${game.title}*\n🎭 ${game.genre}\n📱 ${game.platform}\n🔗 ${game.game_url}`);
                } catch (e) {
                    console.error("GAMEFACT ERROR:", e);
                    reply("❌ *Game fact unavailable* • Server offline");
                }
            }
                break;

            case "fox": {
                try {
                    const res = await axios.get("https://randomfox.ca/floof/");
                    const img = res.data?.image;
                    if (!img) return reply("❌ *Fox ran away* • Try again");

                    await devtrust.sendMessage(m.chat,
                        addNewsletterContext({
                            image: { url: img },
                            caption: "🦊 *Random Fox*"
                        }),
                        { quoted: m }
                    );
                } catch (e) {
                    console.error("FOX ERROR:", e);
                    reply("❌ *Fox hunt failed* • API is sleeping");
                }
            }
                break;

            case "panda": {
                try {
                    const res = await axios.get("https://some-random-api.ml/img/panda");
                    const img = res.data?.link;

                    await devtrust.sendMessage(m.chat,
                        addNewsletterContext({
                            image: { url: img },
                            caption: "🐼 *Random Panda*"
                        }),
                        { quoted: m }
                    );
                } catch (e) {
                    console.error("PANDA ERROR:", e);
                    reply("❌ *Panda on vacation* • Try again");
                }
            }
                break;

            case "dog": {
                try {
                    const res = await axios.get("https://dog.ceo/api/breeds/image/random");
                    const img = res.data?.message;
                    if (!img) return reply("❌ *Dog ran away*");

                    await devtrust.sendMessage(m.chat,
                        addNewsletterContext({
                            image: { url: img },
                            caption: "🐶 *Random Dog*"
                        }),
                        { quoted: m }
                    );
                } catch (e) {
                    console.error("DOG ERROR:", e);
                    reply("❌ *Dog fetch failed* • On a walk");
                }
            }
                break;

            case 'kopi': {
                devtrust.sendMessage(m.chat,
                    addNewsletterContext({
                        image: { url: 'https://coffee.alexflipnote.dev/random' },
                        caption: "☕ *Fresh Coffee*"
                    }),
                    { quoted: m }
                );
            }
                break;

            case 'say':
            case 'tts':
            case 'gtts': {
                if (!text) return reply("🗣️ *What should I say?*");

                const ttsUrl = googleTTS.getAudioUrl(text, {
                    lang: "en",
                    slow: false,
                    host: "https://translate.google.com",
                });

                await devtrust.sendMessage(m.chat,
                    addNewsletterContext({
                        audio: { url: ttsUrl },
                        mimetype: "audio/mp4",
                        ptt: true,
                        fileName: `${text}.mp3`,
                        caption: `🔊 *Saying:* ${text}`
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

module.exports = { executeGeneralFun };
