'use strict';

const { styletext } = require('../../utils/terminal-style');
const { sendPing, sendAlive } = require('../status');

async function executeCore(command, context = {}) {
  const {
    sock, msg, reply, text = '', args = [], speed, runtime,
    tohidGpt4, addNewsletterContext
  } = context;
  switch (String(command || '').toLowerCase()) {
    case 'gpt':
    case 'gpt4': {
      const chatId = msg.key.remoteJid;
      let query = args.join(' ').trim();
      try {
        if (!query && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
          const quoted = msg.message.extendedTextMessage.contextInfo.quotedMessage;
          if (quoted.conversation) query = quoted.conversation;
          else if (quoted.extendedTextMessage?.text) query = quoted.extendedTextMessage.text;
        }
        if (!query) return reply('🤖 *Usage:* gpt4 your question');
        const answer = await tohidGpt4(query, 'You are TOHID-AI GPT-4 assistant. Give accurate, useful answers.');
        const chunks = String(answer).match(/[\\s\\S]{1,3000}/g) || [String(answer)];
        for (let i = 0; i < chunks.length; i++) {
          const header = i === 0 ? '🤖 *GPT-4*\\n\\n' : '';
          await sock.sendMessage(chatId, addNewsletterContext({ text: header + chunks[i] }));
        }
      } catch (err) {
        console.error('gpt4 command error:', err);
        reply('⚠️ *GPT-4 unavailable* • ' + (err?.message || 'Try later'));
      }
      return true;
    }
    case 'mode':
      await reply(`🔹 *Mode:* ${sock.public ? 'Public' : 'Private'}`);
      return true;
    case 'ping':
    case 'speed': {
      const { performance } = require('node:perf_hooks');
      const timestamp = performance.now();
      const latency = speed() - timestamp;
      await reply(`⚡ TOHID-AI Ping\\n\\n📡 ${latency.toFixed(2)} ms`);
      try {
        await sendPing({ sock, msg, latency });
      } catch (error) {
        console.error('[STATUS HTML] Ping card failed:', error.stack || error.message);
      }
      return true;
    }
    case 'runtime':
    case 'alive': {
      await reply(`⚡ TOHID-AI Uptime\\n\\n⏱️ ${runtime(process.uptime())}`);
      try {
        await sendAlive({ sock, msg, runtime });
      } catch (error) {
        console.error('[STATUS HTML] Alive card failed:', error.stack || error.message);
      }
      return true;
    }
    case 'supportgroup':
      await sock.sendMessage(msg.chat, {
        text: '👥 *TOHID-AI SUPPORT GROUP*\\n\\nhttps://chat.whatsapp.com/ITblBs2YNMqBYh9klfDLud'
      }, { quoted: msg });
      return true;
    case 'officialchannel':
      await sock.sendMessage(msg.chat, {
        text: '📢 *TOHID-AI OFFICIAL CHANNEL*\\n\\nhttps://whatsapp.com/channel/0029VaGyP933bbVC7G0x0i2T'
      }, { quoted: msg });
      return true;
    case 'gxhxhxh':
    case 'styletext': {
      if (!text) return reply('✏️ *Example:* styletext Hello');
      const styles = await styletext(text);
      let output = `🎨 *Style Text*\\n\\n"${text}"\\n\\n`;
      for (let i = 0; i < styles.length; i++) {
        output += `${i + 1}. ${styles[i].name} : ${styles[i].result}\\n\\n`;
      }
      await reply(output);
      return true;
    }
    default:
      return false;
  }
}

module.exports = { executeCore };
