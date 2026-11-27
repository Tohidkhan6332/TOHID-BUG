'use strict';

/** Small offline games and a meme lookup command. */
async function executeMiniGames(command, context) {
    const { sock: devtrust, msg: m, reply, text, axios, addNewsletterContext } = context;
    switch (command) {
                    case "math": {
                        const a = Math.floor(Math.random() * 50) + 1;
                        const b = Math.floor(Math.random() * 50) + 1;
        
                        reply(`➕ *Math Quiz*\n\n${a} + ${b} = ?\nReply: mathanswer number`);
                    }
                        break;
        
                    case "emojiquiz": {
                        const quizzes = [
                            { emoji: "🐍", answer: "snake" },
                            { emoji: "🍎", answer: "apple" },
                            { emoji: "🏎️", answer: "car" },
                            { emoji: "🎸", answer: "guitar" },
                            { emoji: "☕", answer: "coffee" }
                        ];
        
                        const quiz = quizzes[Math.floor(Math.random() * quizzes.length)];
                        reply(`🧩 *Emoji Quiz*\n\n${quiz.emoji}\nReply: emojianswer your guess`);
                    }
                        break;
        
                    case "rps": {
                        if (!text) return reply("🪨 *Choose:* rock, paper, scissors");
        
                        const choices = ["rock", "paper", "scissors"];
                        const userChoice = text.toLowerCase();
                        if (!choices.includes(userChoice))
                            return reply("❌ *Invalid choice* • Use rock, paper, scissors");
        
                        const botChoice = choices[Math.floor(Math.random() * choices.length)];
        
                        let result = userChoice === botChoice ? "🤝 *Tie!*" :
                            (userChoice === "rock" && botChoice === "scissors") ||
                                (userChoice === "paper" && botChoice === "rock") ||
                                (userChoice === "scissors" && botChoice === "paper")
                                ? "🎉 *You win!*" : "😢 *You lose!*";
        
                        reply(`🪨 *RPS*\n\nYou: ${userChoice}\nBot: ${botChoice}\n${result}`);
                    }
                        break;
        
                    case "meme": {
                        try {
                            const res = await axios.get("https://meme-api.com/gimme");
                            const meme = res.data;
                            if (!meme?.url) return reply("❌ *Meme ran away*");
        
                            await devtrust.sendMessage(m.chat,
                                addNewsletterContext({
                                    image: { url: meme.url },
                                    caption: `😂 *${meme.title}*`
                                }),
                                { quoted: m }
                            );
                        } catch (e) {
                            console.error("MEME ERROR:", e);
                            reply("❌ *Meme factory closed*");
                        }
                    }
                        break;
        default:
            return false;
    }
}

module.exports = { executeMiniGames };
