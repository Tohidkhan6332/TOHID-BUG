'use strict';

/**
 * Safe fun, response, quote and fact commands.
 */
async function executeFunReplies(command, context) {
    const {
        sock: devtrust, msg: m, reply, text, command: commandName,
        axios, tohidGpt4, isCreator, addNewsletterContext
    } = context;

    switch (command) {
            case "ascii": {
                if (!text) return reply("✏️ *Example:* ascii Hello World");

                try {
                    const res = await axios.get(`https://artii.herokuapp.com/make?text=${encodeURIComponent(text)}`);
                    const ascii = res.data || text;

                    await devtrust.sendMessage(m.chat,
                        addNewsletterContext({
                            text: `🎨 *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 ASCII*\n\n\`\`\`${ascii}\`\`\``
                        }),
                        { quoted: m }
                    );
                } catch (e) {
                    console.error("ASCII ERROR:", e);
                    reply("❌ *ASCII generation failed*");
                }
            }
                break;

            case 'roast': {
                const target = m.mentionedJid?.[0]
                    ? '@' + m.mentionedJid[0].split('@')[0]
                    : text || '@' + m?.sender?.split('@')?.[0] || 'User';
                try {
                    const roast = await tohidGpt4(`Roast this person in a funny but savage way (1-2 lines): ${target}`);
                    reply(`🔥 *Roast for ${target}:*\n\n${roast}`);
                } catch (e) {
                    console.error(e);
                    reply("⚠️ *Roast failed* • The burn machine needs repairs");
                }
            }
                break;

            case 'compliment': {
                const target = m.mentionedJid?.[0]
                    ? '@' + m.mentionedJid[0].split('@')[0]
                    : text || '@' + m?.sender?.split('@')?.[0] || 'User';
                try {
                    const compliment = await tohidGpt4(`Give a sweet, kind compliment to this person (1-2 lines max): ${target}`);
                    reply(`💫 *Compliment for ${target}:*\n\n${compliment}`);
                } catch (e) {
                    console.error(e);
                    reply("⚠️ *Compliment failed* • The kindness machine is broken");
                }
            }
                break;

            case "advice": {
                try {
                    const res = await axios.get("https://api.adviceslip.com/advice");
                    const advice = res.data?.slip?.advice || "Keep going!";
                    reply(`💭 *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 Advice*\n\n"${advice}"`);
                } catch (e) {
                    console.error("ADVICE ERROR:", e);
                    reply("❌ *Advice machine is sleeping* • Try again later");
                }
            }
                break;

            case 'poem': {
                if (!text) return reply(`📝 *Usage:* ${command} love under stars`);
                try {
                    const result = await tohidGpt4(`Write a beautiful, original poem about: ${text}`);
                    reply(`📝 *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 Poem*\n\n${result}`);
                } catch (e) {
                    console.error(e);
                    reply("⚠️ *Poet is on strike* • Try again later");
                }
            }
                break;

            case 'truth': {
                try {
                    let res = await fetch('https://api.truthordarebot.xyz/v1/truth');
                    let data = await res.json();

                    await devtrust.sendMessage(m.chat,
                        addNewsletterContext({
                            image: { url: 'https://i.ibb.co/Jw3HdHnv/upload-1790713792397-6bec7590-jpg.jpg' },
                            caption: `😳 *Truth*\n\n❖ ${data.question}`
                        }),
                        { quoted: m }
                    );
                } catch (err) {
                    reply('❌ *Truth failed*');
                }
            }
                break;

            case 'dare': {
                try {
                    let res = await fetch('https://api.truthordarebot.xyz/v1/dare');
                    let data = await res.json();

                    await devtrust.sendMessage(m.chat,
                        addNewsletterContext({
                            image: { url: 'https://i.ibb.co/Jw3HdHnv/upload-1790713792397-6bec7590-jpg.jpg' },
                            caption: `😈 *Dare*\n\n❖ ${data.question}`
                        }),
                        { quoted: m }
                    );
                } catch (err) {
                    reply('❌ *Dare failed*');
                }
            }
                break;

            case 'fact': {
                if (!isCreator) return reply("🔒 *Owner only*");

                try {
                    const nyash = await axios.get("https://apis.davidcyriltech.my.id/fact");
                    const ilovedavid = nyash.data.fact;

                    await devtrust.sendMessage(m.chat,
                        addNewsletterContext({
                            image: { url: 'https://i.ibb.co/Jw3HdHnv/upload-1790713792397-6bec7590-jpg.jpg' },
                            caption: ilovedavid
                        }),
                        { quoted: m }
                    );
                } catch (error) {
                    reply("❌ *Fact unavailable*");
                }
                break;
            }

            case "8ball": {
                const answers = [
                    "It is certain ✅", "Without a doubt ✅", "Ask again later 🤔",
                    "Cannot predict now 🤷", "𝐓𝐎𝐇𝐈𝐃 𝐀𝐈't count on it ❌", "Very doubtful ❌"
                ];
                if (!text) return reply("🎱 *Ask me a question*");

                const answer = answers[Math.floor(Math.random() * answers.length)];
                reply(`🎱 *Question:* ${text}\n\n${answer}`);
            }
                break;

            case "trivia": {
                try {
                    const res = await axios.get("https://opentdb.com/api.php?amount=1&type=multiple");
                    const trivia = res.data.results[0];
                    const options = [...trivia.incorrect_answers, trivia.correct_answer]
                        .sort(() => Math.random() - 0.5);

                    reply(`❓ *${trivia.question}*\n\n${options.map((o, i) => `${i + 1}. ${o}`).join("\n")}`);
                } catch (e) {
                    console.error("TRIVIA ERROR:", e);
                    reply("❌ *Trivia unavailable*");
                }
            }
                break;

            case "funfact": {
                try {
                    const res = await axios.get("https://uselessfacts.jsph.pl/random.json?language=en");
                    const fact = res.data?.text || "Bots are awesome!";
                    reply(`💡 *Fun Fact*\n\n${fact}`);
                } catch (e) {
                    console.error("FUNFACT ERROR:", e);
                    reply("❌ *Fact machine broke* • Try again later");
                }
            }
                break;

            case "dadjoke": {
                try {
                    const res = await axios.get("https://icanhazdadjoke.com/", { headers: { Accept: "application/json" } });
                    const joke = res.data?.joke || "I'm still working on it!";
                    reply(`👴 *Dad Joke*\n\n${joke}`);
                } catch (e) {
                    console.error("DAD JOKE ERROR:", e);
                    reply("❌ *Dad left for milk* • Try later");
                }
            }
                break;

            case "progquote": {
                try {
                    const res = await axios.get("https://hdramming-quotes-api.herokuapp.com/quotes/random");
                    const quote = res.data?.en || "Talk is cheap. Show me the code.";
                    const author = res.data?.author || "Linus Torvalds";
                    reply(`💻 *"${quote}"*\n— ${author}`);
                } catch (e) {
                    console.error("PROGQUOTE ERROR:", e);
                    reply("❌ *Quote not found* • 404 error");
                }
            }
                break;

            case "moviequote": {
                try {
                    const res = await axios.get("https://movie-quote-api.herokuapp.com/v1/quote/");
                    const quote = res.data?.quote || "May the Force be with you.";
                    const movie = res.data?.show || "Unknown";
                    reply(`🎬 *"${quote}"*\n— ${movie}`);
                } catch (e) {
                    console.error("MOVIE QUOTE ERROR:", e);
                    reply("❌ *Movie quote unavailable* • Cinema closed");
                }
            }
                break;

            case "triviafact": {
                try {
                    const res = await axios.get("https://uselessfacts.jsph.pl/random.json?language=en");
                    const fact = res.data?.text || "You're awesome!";
                    reply(`🧠 *Trivia Fact*\n\n${fact}`);
                } catch (e) {
                    console.error("TRIVIA FACT ERROR:", e);
                    reply("❌ *Trivia machine broke*");
                }
            }
                break;
        default:
            return false;
    }
    return true;
}

module.exports = { executeFunReplies };
