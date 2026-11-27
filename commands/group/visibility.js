'use strict';

async function executeGroupVisibility(command, context = {}) {
  const {
    sock, msg, reply, args = [], text = '', q = '',
    isCreator, getGroupAdmins, addNewsletterContext
  } = context;
  switch (String(command || '').toLowerCase()) {
    case 'tagall': {
      if (!msg.isGroup) return reply('👥 *Groups only*');
      const metadata = await sock.groupMetadata(msg.chat).catch(() => null);
      const participants = metadata?.participants || [];
      const admins = getGroupAdmins(participants);
      const isAdmins = admins.includes(msg.sender);
      if (!isCreator && !isAdmins) return reply('🔒 *This feature is for Admins or Owner only*');
      const textMessage = args.join(' ') || 'No message';
      let output = `🏷️ *Tag All*\n\n📝 ${textMessage}\n\n`;
      for (const member of participants) output += `@${member.id.split('@')[0]}\n`;
      await sock.sendMessage(msg.chat, addNewsletterContext({
        text: output,
        mentions: participants.map(member => member.id)
      }), { quoted: msg });
      return true;
    }
    case 'hidetag': {
      if (!msg.isGroup) return reply('👥 *Groups only*');
      const metadata = await sock.groupMetadata(msg.chat).catch(() => null);
      const participants = metadata?.participants || [];
      const admins = getGroupAdmins(participants);
      const isAdmins = admins.includes(msg.sender);
      if (!isCreator && !isAdmins) return reply('🔒 *This feature is for Admins or Owner only*');
      await sock.sendMessage(msg.chat, addNewsletterContext({
        text: q || ' ',
        mentions: participants.map(member => member.id)
      }), { quoted: msg });
      return true;
    }
    default:
      return false;
  }
}

module.exports = { executeGroupVisibility };
