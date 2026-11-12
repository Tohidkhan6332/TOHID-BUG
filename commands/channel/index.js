'use strict';

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'channel-status.json');
const COMMANDS = new Set(['cstatus', 'channelstatus', 'channelpost', 'cpost', 'cp']);

function readConfig() {
  try {
    const value = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    return value && typeof value === 'object' ? value : {};
  } catch (_) {
    return {};
  }
}

function writeConfig(value) {
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
  const temp = CONFIG_FILE + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(value, null, 2));
  fs.renameSync(temp, CONFIG_FILE);
}

function looksLikeChannelTarget(value) {
  const input = String(value || '').trim();
  return input.includes('@newsletter') ||
    /^\d{10,}$/.test(input) ||
    /(?:https?:\/\/)?(?:www\.)?whatsapp\.com\/channel\/[A-Za-z0-9_-]+/i.test(input);
}

async function resolveChannelJid(sock, input) {
  const value = String(input || '').trim();
  if (!value) return null;
  if (value.endsWith('@newsletter')) return value;
  if (/^\d{10,}$/.test(value)) return value + '@newsletter';

  const match = value.match(/whatsapp\.com\/channel\/([A-Za-z0-9_-]+)/i);
  if (!match) return null;

  if (typeof sock.newsletterInfo !== 'function') {
    throw new Error('Is Baileys build mein newsletterInfo() available nahi hai.');
  }

  const info = await sock.newsletterInfo({ inviteCode: match[1] });
  if (!info?.id || !String(info.id).endsWith('@newsletter')) {
    throw new Error('Channel link se valid Channel ID nahi mili.');
  }
  return info.id;
}

function getQuotedMime(quoted) {
  return String((quoted?.msg || quoted)?.mimetype || '').toLowerCase();
}

async function downloadQuoted(quoted) {
  if (!quoted || typeof quoted.download !== 'function') {
    throw new Error('Media download nahi ho paya. Image/video/audio par direct reply karke command bhejo.');
  }
  const buffer = await quoted.download();
  if (!buffer || !buffer.length) throw new Error('Quoted media empty hai ya download fail hua.');
  return buffer;
}

async function executeChannelStatus(command, context = {}) {
  const name = String(command || '').toLowerCase();
  if (!COMMANDS.has(name)) return false;

  const { sock, msg, args = [], text = '', reply } = context;
  const respond = typeof reply === 'function'
    ? reply
    : async value => sock.sendMessage(msg.chat, { text: value }, { quoted: msg });

  if (!sock || !msg?.key || typeof sock.sendMessage !== 'function') {
    await respond('⚠️ Channel Status system initialize nahi hua.');
    return true;
  }

  const parts = [...args];
  const first = String(parts[0] || '').toLowerCase();

  try {
    if (first === 'help') {
      await respond(
        '*📢 CHANNEL STATUS HELP*\n\n' +
        '• .cstatus <text> — default channel par text post\n' +
        '• .cstatus <channel link> <text> — selected channel par text post\n' +
        '• Media par reply karke .cstatus — default channel par media post\n' +
        '• Media par reply karke .cstatus <channel link> — selected channel par media post\n' +
        '• .cstatus set <channel link/ID> — default channel set\n' +
        '• .cstatus default — saved default channel dekho\n' +
        '• .cstatus clear — saved default channel hatao\n\n' +
        'Aliases: .channelstatus, .channelpost, .cpost, .cp\n\n' +
        'Note: Bot ko target channel ka admin hona chahiye. WhatsApp/Baileys permissions ke hisaab se post accept ya reject hogi.'
      );
      return true;
    }

    const config = readConfig();

    if (first === 'set') {
      const target = parts.slice(1).join(' ').trim();
      if (!looksLikeChannelTarget(target)) {
        await respond('❌ Format: .cstatus set <WhatsApp channel link ya channel ID>');
        return true;
      }
      const jid = await resolveChannelJid(sock, target);
      config.defaultChannel = jid;
      writeConfig(config);
      await respond('✅ Default Channel save ho gaya:\n' + jid);
      return true;
    }

    if (first === 'clear') {
      delete config.defaultChannel;
      writeConfig(config);
      await respond('✅ Default Channel remove kar diya.');
      return true;
    }

    if (first === 'default') {
      await respond(config.defaultChannel
        ? '📢 Saved default channel:\n' + config.defaultChannel
        : '⚠️ Default channel set nahi hai.\nUse: .cstatus set <channel link>');
      return true;
    }

    let targetInput = '';
    let caption = String(text || parts.join(' ')).trim();

    if (parts.length && looksLikeChannelTarget(parts[0])) {
      targetInput = parts.shift();
      caption = parts.join(' ').trim();
    }

    const targetJid = targetInput
      ? await resolveChannelJid(sock, targetInput)
      : config.defaultChannel;

    if (!targetJid) {
      await respond(
        '⚠️ Channel select nahi hai.\n\n' +
        'Pehle default set karo: .cstatus set <channel link>\n' +
        'Ya direct target do: .cstatus <channel link> <text>\n' +
        'Help: .cstatus help'
      );
      return true;
    }

    const quoted = msg.quoted || null;
    let payload;

    if (quoted) {
      const mime = getQuotedMime(quoted);
      const media = await downloadQuoted(quoted);
      const quotedCaption = String((quoted.msg || quoted)?.caption || '').trim();
      const finalCaption = caption || quotedCaption;

      if (mime.startsWith('image/')) {
        payload = { image: media, caption: finalCaption };
      } else if (mime.startsWith('video/')) {
        payload = { video: media, caption: finalCaption };
      } else if (mime.startsWith('audio/')) {
        payload = {
          audio: media,
          mimetype: mime || 'audio/mpeg',
          ptt: false
        };
      } else {
        const quotedText = String(
          quoted.text ||
          quoted.body ||
          quoted.conversation ||
          (quoted.msg || {}).text ||
          ''
        ).trim();
        if (!quotedText && !caption) {
          await respond('❌ Unsupported media. Image, video, audio ya text par reply karo.');
          return true;
        }
        payload = { text: caption || quotedText };
      }
    } else if (caption) {
      payload = { text: caption };
    } else {
      await respond('📢 Text likho ya image/video/audio par reply karke .cstatus bhejo.\nUse .cstatus help for examples.');
      return true;
    }

    await sock.sendMessage(targetJid, payload);
    await respond('✅ Channel post WhatsApp server ko successfully send ho gayi.\nChannel: ' + targetJid);
  } catch (error) {
    console.error('[CHANNEL STATUS] Publish failed:', error?.stack || error);
    await respond(
      '❌ Channel post nahi ho saki.\n' +
      (error?.message || 'Unknown error') +
      '\n\nCheck karo ki bot target channel ka admin hai aur Baileys build newsletter posting support karta hai.'
    );
  }

  return true;
}

module.exports = { executeChannelStatus, COMMANDS, resolveChannelJid };
