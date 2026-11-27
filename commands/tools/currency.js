'use strict';

/**
 * Currency list and conversion commands.
 * Keeps network access injected by the main bot runtime.
 */
async function executeCurrency(command, context) {
    const { sock, msg: m, reply, text, prefix, axios } = context;

    switch (command) {
                    case "currencies":
                    case "currency": {
                        if (!text) {
                            return reply(`💱 *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 Currency*\n\nUsage: ${prefix}currency [amount] [from] [to]\nExample: ${prefix}currency 100 USD EUR\n\nOr use: ${prefix}currencies to see all available codes`);
                        }
        
                        const [amount, from, to] = text.split(" ");
        
                        // If all three arguments provided, do conversion
                        if (amount && from && to) {
                            try {
                                await devtrust.sendMessage(m.chat, { react: { text: '💱', key: m.key } });
        
                                const response = await axios.get(`https://api.exchangerate.host/convert?from=${from.toUpperCase()}&to=${to.toUpperCase()}&amount=${amount}`, {
                                    timeout: 10000
                                });
        
                                if (!response.data || !response.data.result) {
                                    throw new Error('Invalid response');
                                }
        
                                reply(`💱 *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 Currency*\n\n${amount} ${from.toUpperCase()} = ${response.data.result} ${to.toUpperCase()}`);
                                await devtrust.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
        
                            } catch (error) {
                                console.error('Currency error:', error.message);
                                await devtrust.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
                                reply(`⚠️ *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 Currency*\n\nExchange rates are sleeping. Try again later.`);
                            }
                            return;
                        }
        
                        // If no arguments or just "currencies", show available currencies
                        try {
                            await devtrust.sendMessage(m.chat, { react: { text: '💱', key: m.key } });
        
                            const response = await axios.get('https://apis.davidcyril.name.ng/tools/currencies', {
                                timeout: 10000
                            });
        
                            if (!response.data.success || !response.data.result) {
                                throw new Error('API Error');
                            }
        
                            let currencyList = `💱 *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 Currencies*\n\n`;
        
                            response.data.result.slice(0, 30).forEach((curr, i) => {
                                currencyList += `${i + 1}. *${curr.code}* - ${curr.name}\n`;
                            });
        
                            currencyList += `\n_Use ${prefix}currency [amount] [from] [to] to convert_`;
        
                            reply(currencyList);
                            await devtrust.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
        
                        } catch (err) {
                            console.error('Currencies error:', err.message);
                            await devtrust.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
                            reply(`⚠️ *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 Currencies*\n\nCurrency list is on vacation. Try again later.`);
                        }
                    }
                        break;
        default:
            return false;
    }
}

module.exports = { executeCurrency };
