const fs = require('fs')

global.status = false //"self/public" section of the bot
global.owner = ['917849917350']
global.xprefix = '.'
global.gambar = "https://cdn.jsdelivr.net/gh/Tohidkhan6332/TOHID-BUG@main/media/Tohid.jpg"
global.OWNER_NAME = "@Tohidkhan6332" //
global.DEVELOPER = ["917849917350"] //
global.BOT_NAME = "𝐓𝐎𝐇𝐈𝐃-𝐀𝐈"
global.bankowner = "𝐓𝐎𝐇𝐈𝐃-𝐀𝐈"
global.creatorName = "𝕄ℝ 𝕋𝕆ℍ𝕀𝔻™"
global.ownernumber = '917849917350'  //creator number
global.location = "Asia/Kolkata"
global.prefa = ['','!','.','#','&']
// Config - TOHID-AI Official
global.footer = "𝐓𝐎𝐇𝐈𝐃-𝐀𝐈" //footer section
global.link = "https://whatsapp.com/channel/0029VaGyP933bbVC7G0x0i2T"
global.botName = "𝐓𝐎𝐇𝐈𝐃-𝐀𝐈"
global.version = "1.0.1"
global.botname = "𝐓𝐎𝐇𝐈𝐃-𝐀𝐈"
global.themeemoji = "🥷"
global.wagc = 'https://chat.whatsapp.com/ITblBs2YNMqBYh9klfDLud'
global.thumbnail = 'https://cdn.jsdelivr.net/gh/Tohidkhan6332/TOHID-BUG@main/media/Tohid1.jpg'
global.richpp = ' '
global.packname = "ꜱᴛɪᴄᴋᴇʀ ʙʏ ᴛᴏʜɪᴅ ᴀɪ"
global.author = "𝐓𝐎𝐇𝐈𝐃-𝐀𝐈"
global.creator = "917849917350@s.whatsapp.net"
global.ownername = '𝕄ℝ 𝕋𝕆ℍ𝕀𝔻' 
global.onlyowner = `Only Tohid dev can use this Command 🥶🥷`
  // reply 
global.database = `*To Exist In The Database Contact The Owner of this bot*`
  global.mess = {
wait: "*Configurating.......*",
   success: "*Successfully acknowledged ☑️*",
   on: "*Activated ✅*", 
   prem: "*Feature For Premium Users only*", 
   off: "*Deactivated 📛*",
   query: {
       text: "*Please, Provide A Text Query 📑*",
       link: "Please, provide a valid link 🔗*",
   },
   error: {
       fitur: "*Status 🌐: Feature Or Command error ❌*",
   },
   only: {
       group: "*Group only feature ❌*",
private: "*Private chat feature only ❌*",
       owner: "*Owner feature only ❌*",
       admin: "*bot owner feature only ❌*",
       badmin: "*Seek admin privilege's to use this command ❌*",
       premium: "*Availabe for premium users only ❌*",
   }
}

global.hituet = 0
//false=disable and true=enable
global.autoviewstatus = true
global.autoread = true //auto read messages
global.autobio = true // auto update bio
global.anti92 = false //auto block +92 
global.autoswview = true //auto view status/story

let file = require.resolve(__filename)
require('fs').watchFile(file, () => {
  require('fs').unwatchFile(file)
  console.log('\x1b[0;32m'+__filename+' \x1b[1;32mupdated!\x1b[0m')
  delete require.cache[file]
  require(file)
})


