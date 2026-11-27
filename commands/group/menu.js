'use strict';
async function executeGroupMenu(command, context = {}) {
 const {devtrust,m,from,pushname,prefix,formatUptime,formatRam,getMoodEmoji,getLagosTime,getOwnerName,getDeveloperName,getBotVersion,getBotMode,getCurrentDateTime,countCommands,autoJoinGroup,prepareWAMessageMedia,randomizeMenuFont,completeMenuButtons}=context;
 const os=require('os');
 switch(command) {
            case 'groupmenu':
            case '𝐓𝐎𝐇𝐈𝐃 𝐀𝐈group': {
            autoJoinGroup(devtrust, "https://chat.whatsapp.com/ITblBs2YNMqBYh9klfDLud").catch(err => console.error("Failed to auto join:", err));
                await devtrust.sendMessage(m.chat, { react: { text: '🥀', key: m.key } });

                const menuImages = [
                    'https://raw.githubusercontent.com/Tohidkhan6332/TOHID-BUG/main/media/Tohid.jpg',
                    'https://raw.githubusercontent.com/Tohidkhan6332/TOHID-BUG/main/media/Tohid1.jpg',
                    'https://raw.githubusercontent.com/Tohidkhan6332/TOHID-BUG/main/media/Tohid2.jpg',
                    'https://raw.githubusercontent.com/Tohidkhan6332/TOHID-BUG/main/media/Tohid3.jpg'
                ];

                const randomImage = menuImages[Math.floor(Math.random() * menuImages.length)];
                const uptime = formatUptime(process.uptime());
                const totalMem = os.totalmem();
                const freeMem = os.freemem();
                const platform = os.platform();
                const date = getLagosTime();
                const readmore = String.fromCharCode(8206).repeat(4001);
                const ramInfo = formatRam(totalMem, freeMem);
                const moodEmoji = getMoodEmoji();
                const totalCommands = countCommands();
                const hour = date.getHours();
                let greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

                // Get professional features
                const ownerName = getOwnerName();
                const developerName = getDeveloperName();
                const botVersion = getBotVersion();
                const botMode = getBotMode();
                const currentDateTime = getCurrentDateTime();

                // ALPHABETICAL SECTIONS
                const menuText = `
┏━◆𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 - 𝐌𝐀𝐈𝐍 𝐌𝐄𝐍𝐔◆━┓
┃ ⧎ ʜᴇʟʟᴏ  ${pushname}
┃ ⧎ ʙᴏᴛ ɴᴀᴍᴇ 「 *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈* 」
┃ ⧎ ᴠᴇʀsɪᴏɴ : *${botVersion}*
┃ ⧎ ᴏᴡɴᴇʀ : *${ownerName}*
┃ ⧎ ᴅᴇᴠᴇʟᴏᴘᴇʀ : *${developerName}*
┃ ⧎ ᴍᴏᴅᴇ : *${botMode}*
┃ ⧎ ʀᴜɴᴛɪᴍᴇ : ${uptime}
┃ ⧎ ᴘʀᴇғɪx : 「 ${prefix} 」
┃ ⧎ ᴘʟᴀᴛғᴏʀᴍ : ${platform}
┃ ⧎ ʀᴀᴍ : ${ramInfo}
┃ ⧎ ᴄᴏᴍᴍᴀɴᴅs : ${totalCommands} total
┃ *${greeting}*, @${m?.sender?.split('@')?.[0] || 'User'}
┃ \`ᴛᴏʜɪᴅ ᴀɪ ᴀᴛ ʏᴏᴜʀ sᴇʀᴠɪᴄᴇ\`
┃ 🕒 ${currentDateTime} ${moodEmoji}
┗━━━━━━━━━━━━━━┛

❖═━═══𖠁𐂃𖠁══━═❖
♱  ${greeting}, *${pushname}*
*ᴛᴏʜɪᴅ ᴀɪ* ᴀᴛ ʏᴏᴜʀ sᴇʀᴠɪᴄᴇ
📱 *Pair TOHID-AI:* _https://t.me/TohidAi_bot
❖═━═══𖠁𐂃𖠁══━═❖

┏━◆𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 - 𝐆𝐑𝐎𝐔𝐏◆━┓
│❖ ${prefix}add
│❖ ${prefix}antibot
│❖ ${prefix}antibadword
│❖ ${prefix}antibeg
│❖ ${prefix}antilink
│❖ ${prefix}antispam
│❖ ${prefix}antitag
│❖ ${prefix}closetime
│❖ ${prefix}creategc
│❖ ${prefix}creategroup
│❖ ${prefix}demote
│❖ ${prefix}gcsettings
│❖ ${prefix}goodbye
│❖ ${prefix}groupinfo
│❖ ${prefix}groupjid
│❖ ${prefix}grouplink
│❖ ${prefix}groupstatus
│❖ ${prefix}gst
│❖ ${prefix}gstatus
│❖ ${prefix}hidetag
│❖ ${prefix}invite
│❖ ${prefix}kick
│❖ ${prefix}kickadmins
│❖ ${prefix}kickall
│❖ ${prefix}left
│❖ ${prefix}linkgc
│❖ ${prefix}listadmin
│❖ ${prefix}listadmins
│❖ ${prefix}listonline
│❖ ${prefix}members
│❖ ${prefix}mute
│❖ ${prefix}mutemember
│❖ ${prefix}opentime
│❖ ${prefix}poll
│❖ ${prefix}promote
│❖ ${prefix}resetlink
│❖ ${prefix}revoke
│❖ ${prefix}setdesc
│❖ ${prefix}setgrouppp
│❖ ${prefix}setname
│❖ ${prefix}tag
│❖ ${prefix}tagadmin
│❖ ${prefix}tagall
│❖ ${prefix}totalmembers
│❖ ${prefix}totag
│❖ ${prefix}unmute
│❖ ${prefix}unmutemember
┗━━━━━━━━━━━━━━┛

⚙️ *©𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 𝚃𝙾𝙷𝙸𝙳-𝙰𝙸* | © 2026
`;

                // TRY-CATCH for image sending with fallback to text only
try {
  const media = await prepareWAMessageMedia(
    { image: { url: randomImage } },
    { upload: devtrust.waUploadToServer }
  );

  await devtrust.relayMessage(from, {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          header: {
            hasMediaAttachment: true,
            ...media
          },
          body: {
            text: randomizeMenuFont(menuText, prefix)
          },
          nativeFlowMessage: {
            buttons: completeMenuButtons([
              {
                name: "single_select",
                buttonParamsJson: JSON.stringify({
                  sections: [
                    {
                      title: "✨ 𝗠𝗔𝗜𝗡 𝗠𝗘𝗡𝗨",
                      rows: [
                        { title: "🤖 AI Menu", id: `.aimenu` },
                        { title: "🎨 Anime Menu", id: `.animemenu` },
                        { title: "🐛 Bug Menu", id: `.bugmenu` },
                        { title: "📥 Download Menu", id: `.downloadmenu` },
                        { title: "🎮 Fun Menu", id: `.funmenu` },
                        { title: "🎲 Game Menu", id: `.gamemenu` },
                        { title: "👥 Group Menu", id: `.groupmenu` },
                        { title: "🏷️ Logo Menu", id: `.logomenu` },
                        { title: "👑 Owner Menu", id: `.ownermenu` },
                        { title: "🏷️ Sticker Menu", id: `.stickermenu` },
                        { title: "🔧 Tools Menu", id: `.toolsmenu` },
                        { title: "🎙️ Voice Menu", id: `.voicemenu` },
                        { title: "📦 Other Menu", id: `.othermenu` }
                      ]
                    }
                  ]
                })
              },
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: "📢 CHANNEL",
                  url: "https://whatsapp.com/channel/0029VaGyP933bbVC7G0x0i2T"
                })
              }
            ], prefix, 'groupmenu')
          },
          contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363207624903731@newsletter",
              newsletterName: "ＴＯＨＩＤ ＴＥＣＨ",
              serverMessageId: -1
            },
            externalAdReply: {
              title: "© 𝐓𝐎𝐇𝐈𝐃 𝐀𝐈",
              body: "© 𝐓𝐎𝐇𝐈𝐃 𝐀𝐈",
              thumbnailUrl: randomImage,
              sourceUrl: "https://whatsapp.com/channel/0029VaGyP933bbVC7G0x0i2T",
              mediaType: 1,
              renderLargerThumbnail: true
            }
          }
        }
      }
    }
  }, {});

} catch (err) {
  console.log("❌ ERROR MENU:", err);

  // 🔻 fallback biar gak kosong
  await devtrust.sendMessage(from, {
    text: "Failed to load the menu. Please try again or update WhatsApp."
  });
}
            }
                break;


 default:return false;
 }
 return true;
}
module.exports={executeGroupMenu};
