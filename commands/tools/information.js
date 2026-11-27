'use strict';

/**
 * Information, dictionary, translation, recipe and QR-reading commands.
 */
async function executeInformation(command, context) {
    const {
        sock: devtrust, msg: m, reply, text, prefix, axios,
        addNewsletterContext
    } = context;

    switch (command) {
            case "define":
            case "dictionary": {
                if (!text) return reply("📖 *Example:* define computer");

                try {
                    const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${text}`);
                    const meanings = res.data[0].meanings[0].definitions[0].definition;
                    reply(`📖 *${text}*\n\n${meanings}`);
                } catch {
                    reply("❌ *Word not found*");
                }
            }
                break;

            case 'translate': {
                if (!text) return reply(`🌐 *Usage:* ${command} <text> | <language code>\nExample: ${command} hello | hi`);
                try {
                    const parts = text.split("|");
                    const sourceText = parts[0].trim();
                    const target = (parts[1] || "en").trim().toLowerCase();
                    if (!sourceText) return reply("❌ *Text is required*");
                    if (!/^[a-z]{2,10}(?:-[a-z]{2,10})?$/i.test(target)) {
                        return reply("❌ *Invalid language code*");
                    }
                    const { translate } = require("@vitalets/google-translate-api");
                    const result = await translate(sourceText, { to: target });
                    reply(`🌐 *TOHID-AI Translation*\n\n📝 *Original:* ${sourceText}\n\n🔤 *Translated (${target}):* ${result.text}`);
                } catch (error) {
                    console.error("TRANSLATE ERROR:", error);
                    reply("❌ *Translation failed* • Try again");
                }
            }
                break;

            case 'wiki':
            case 'wikipedia': {
                if (!text) {
                    return reply(`📚 *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 Wikipedia*\n\nUsage: ${prefix}${command} [search term]\nExample: ${prefix}${command} Albert Einstein`);
                }

                try {
                    await devtrust.sendMessage(m.chat, { react: { text: '📚', key: m.key } });

                    reply(`🔍 *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 Wikipedia*\n\nSearching: ${text}`);

                    const response = await axios.get(
                        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(text)}`,
                        { timeout: 10000 }
                    );

                    const data = response.data;

                    // Handle disambiguation pages (multiple results)
                    if (data.type === 'disambiguation') {
                        return reply(`❌ *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 Wikipedia*\n\n"${text}" is too broad. Please be more specific.`);
                    }

                    // Check if extract exists
                    if (!data.extract) {
                        return reply(`❌ *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 Wikipedia*\n\nNo results found for "${text}". Try a different term.`);
                    }

                    // Truncate long extracts
                    const extract = data.extract.length > 500
                        ? data.extract.substring(0, 500) + '...'
                        : data.extract;

                    const info = `📚 *${data.title}*\n\n${extract}\n\n🔗 ${data.content_urls.desktop.page}`;

                    // Send with thumbnail if available
                    if (data.thumbnail) {
                        await devtrust.sendMessage(m.chat,
                            addNewsletterContext({
                                image: { url: data.thumbnail.source },
                                caption: info
                            }),
                            { quoted: m }
                        );
                    } else {
                        reply(`📚 *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 Wikipedia*\n\n${info}`);
                    }

                    await devtrust.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

                } catch (error) {
                    console.error('Wiki Error:', error.response?.data || error.message);
                    await devtrust.sendMessage(m.chat, { react: { text: '❌', key: m.key } });

                    if (error.response?.status === 404) {
                        return reply(`❌ *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 Wikipedia*\n\nPage "${text}" not found. Try another term.`);
                    }

                    reply(`⚠️ *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 Wikipedia*\n\nWikipedia is taking a break. Try again later.`);
                }
            }
                break;

            case "sciencefact": {
                try {
                    const res = await axios.get("https://uselessfacts.jsph.pl/random.json?language=en");
                    reply(`🔬 *Science Fact*\n\n${res.data.text}`);
                } catch {
                    reply("❌ *Fact machine broke* • Try again later");
                }
            }
                break;

            case "book": {
                if (!text) return reply("📚 *Example:* book Harry Potter");

                try {
                    const res = await axios.get(`https://openlibrary.org/search.json?q=${encodeURIComponent(text)}&limit=3`);
                    if (!res.data.docs.length) return reply("❌ *No books found*");

                    const books = res.data.docs.map((b, i) =>
                        `${i + 1}. *${b.title}*\n👤 ${b.author_name?.[0] || "Unknown"}`
                    ).join("\n\n");

                    reply(`📚 *Book Search*\n\n${books}`);
                } catch {
                    reply("❌ *Search failed* • Library is closed");
                }
            }
                break;

            case "recipe": {
                if (!text) return reply("🍳 *Example:* recipe pancakes");

                try {
                    const res = await axios.get(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(text)}`);
                    if (!res.data.meals) return reply("❌ *No recipes found*");

                    const meal = res.data.meals[0];
                    const ingredients = Array.from({ length: 20 })
                        .map((_, i) => meal[`strIngredient${i + 1}`] ? `• ${meal[`strIngredient${i + 1}`]} - ${meal[`strMeasure${i + 1}`]}` : '')
                        .filter(Boolean)
                        .join("\n");

                    const msg = `🍽 *${meal.strMeal}*\n\n${ingredients}`;
                    reply(msg);
                } catch {
                    reply("❌ *Recipe fetch failed* • Kitchen's closed");
                }
            }
                break;

            case 'coffee': {
                devtrust.sendMessage(m.chat,
                    addNewsletterContext({
                        image: { url: 'https://coffee.alexflipnote.dev/random' },
                        caption: "☕ *Fresh coffee just for you*"
                    }),
                    { quoted: m }
                );
            }
                break;

            case "readqr": {
                if (!m.quoted || !m.quoted.image)
                    return reply("📱 *Reply to a QR code image*");

                const buffer = await m.quoted.download();

                try {
                    const res = await axios.post("https://api.qrserver.com/v1/read-qr-code/", buffer, {
                        headers: { "Content-Type": "multipart/form-data" }
                    });
                    const qrText = res.data[0].symbol[0].data;
                    reply(`📱 *QR Code Content*\n\n${qrText}`);
                } catch (e) {
                    reply("❌ *Failed to read QR code*");
                }
            }
                break;
        default:
            return false;
    }
    return true;
}

module.exports = { executeInformation };
