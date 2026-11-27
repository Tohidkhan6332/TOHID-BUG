'use strict';

/** Informational commands for bot access and connectivity checks. */
async function executeDeploymentInfo(command, context) {
    const { reply, prefix } = context;
    switch (command) {
                    case 'getbot':
                    case 'gellltbot':
                    case 'freebot': {
                        let botInfo =
                            `*𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 — Bot Deployment*
        
        Interested in deploying your own WhatsApp bot?
        The process is simple and takes less than 2 minutes.
        
        ▸ Choose a bot from the available instances:
          • https://t.me/TohidAi_bot
          • https://t.me/TohidAi_bot
        
        ▸ Start the bot and use:
          /connect [your-number]
        
        ▸ Your instance will be ready immediately.
        
        Use *${prefix}𝐓𝐎𝐇𝐈𝐃 𝐀𝐈* to see all menu.`;
        
                        reply(botInfo);
                    }
                        break;
                    case 'test': {
                        let botInfo =
                            '*ᴛᴏʜɪᴅ ᴀɪ ᴀʟᴡᴀʏs ᴛʜᴇʀᴇ ғᴏʀ ʏᴏᴜ 🚀🔥*'
        
                        reply(botInfo);
                    }
        
                        break;
        default:
            return false;
    }
}

module.exports = { executeDeploymentInfo };
