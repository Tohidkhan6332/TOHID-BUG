'use strict';

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'channel-status.json');
const COMMANDS = new Set(['cstatus', 'channelstatus', 'channelpost', 'cpost', 'cp']);

function readConfig() {
    try {
        const value = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        return value && typeof value === 'object' ? value : {};
    } catch {
        return {};
    }
}

function writeConfig(value) {
    fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
    const temporaryFile = CONFIG_FILE + '.tmp';
    fs.writeFileSync(temporaryFile, JSON.stringify(value, null, 2));
    fs.renameSync(temporaryFile, CONFIG_FILE);
}

function isChannelTarget(value) {
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
        throw new Error('The installed Baileys version does not provide newsletterInfo().');
    }

    const channelInfo = await sock.newsletterInfo({ inviteCode: match[1] });
    if (!channelInfo?.id || !String(channelInfo.id).endsWith('@newsletter')) {
        throw new Error('The channel link did not return a valid channel ID.');
    }

    return channelInfo.id;
}

function getQuotedMime(quoted) {
    return String((quoted?.msg || quoted)?.mimetype || '').toLowerCase();
}

async function downloadQuotedMedia(quoted) {
    if (!quoted || typeof quoted.download !== 'function') {
        throw new Error('Unable to download the media. Reply directly to an image, video, or audio message.');
    }

    const buffer = await quoted.download();
    if (!buffer || !buffer.length) {
        throw new Error('The replied media is empty or could not be downloaded.');
    }

    return buffer;
}

function getHelpText() {
    return [
        'CHANNEL POSTING COMMANDS',
        '',
        '• .cstatus <text> — Post text to the saved default channel.',
        '• .cstatus <channel link> <text> — Post text to a selected channel.',
        '• Reply to media with .cstatus — Post media to the default channel.',
        '• Reply to media with .cstatus <channel link> — Post media to a selected channel.',
        '• .cstatus set <channel link or ID> — Save the default channel.',
        '• .cstatus default — Show the saved default channel.',
        '• .cstatus clear — Remove the saved default channel.',
        '',
        'Aliases: .channelstatus, .channelpost, .cpost, .cp',
        '',
        'The bot must have permission to publish in the target channel. Actual publishing support depends on the installed Baileys build.'
    ].join('\n');
}

async function executeChannelStatus(command, context = {}) {
    const commandName = String(command || '').toLowerCase();
    if (!COMMANDS.has(commandName)) return false;

    const { sock, msg, args = [], text = '', reply } = context;
    const respond = typeof reply === 'function'
        ? reply
        : async message => sock.sendMessage(msg.chat, { text: message }, { quoted: msg });

    if (!sock || !msg?.key || typeof sock.sendMessage !== 'function') {
        await respond('The Channel Posting system is not initialized.');
        return true;
    }

    const parameters = [...args];
    const firstParameter = String(parameters[0] || '').toLowerCase();

    try {
        if (firstParameter === 'help') {
            await respond(getHelpText());
            return true;
        }

        const config = readConfig();

        if (firstParameter === 'set') {
            const channelTarget = parameters.slice(1).join(' ').trim();
            if (!isChannelTarget(channelTarget)) {
                await respond('Usage: .cstatus set <WhatsApp channel link or channel ID>');
                return true;
            }

            const channelJid = await resolveChannelJid(sock, channelTarget);
            if (!channelJid) throw new Error('Unable to identify the channel from the supplied link or ID.');

            config.defaultChannel = channelJid;
            writeConfig(config);
            await respond('Default channel saved:\n' + channelJid);
            return true;
        }

        if (firstParameter === 'clear') {
            delete config.defaultChannel;
            writeConfig(config);
            await respond('The saved default channel has been removed.');
            return true;
        }

        if (firstParameter === 'default') {
            await respond(config.defaultChannel
                ? 'Saved default channel:\n' + config.defaultChannel
                : 'No default channel is saved. Use: .cstatus set <channel link>');
            return true;
        }

        let channelInput = '';
        let postText = String(text || parameters.join(' ')).trim();

        if (parameters.length && isChannelTarget(parameters[0])) {
            channelInput = parameters.shift();
            postText = parameters.join(' ').trim();
        }

        const targetJid = channelInput
            ? await resolveChannelJid(sock, channelInput)
            : config.defaultChannel;

        if (!targetJid) {
            await respond(
                'No target channel is selected.\n\n' +
                'Save a default channel: .cstatus set <channel link>\n' +
                'Or provide a channel link: .cstatus <channel link> <text>\n' +
                'Help: .cstatus help'
            );
            return true;
        }

        const quotedMessage = msg.quoted || null;
        let payload;

        if (quotedMessage) {
            const mimeType = getQuotedMime(quotedMessage);
            const mediaBuffer = await downloadQuotedMedia(quotedMessage);
            const quotedCaption = String((quotedMessage.msg || quotedMessage)?.caption || '').trim();
            const caption = postText || quotedCaption;

            if (mimeType.startsWith('image/')) {
                payload = { image: mediaBuffer, caption };
            } else if (mimeType.startsWith('video/')) {
                payload = { video: mediaBuffer, caption };
            } else if (mimeType.startsWith('audio/')) {
                payload = {
                    audio: mediaBuffer,
                    mimetype: mimeType || 'audio/mpeg',
                    ptt: false
                };
            } else {
                const quotedText = String(
                    quotedMessage.text ||
                    quotedMessage.body ||
                    quotedMessage.conversation ||
                    (quotedMessage.msg || {}).text ||
                    ''
                ).trim();

                if (!quotedText && !postText) {
                    await respond('Unsupported message type. Reply to an image, video, audio, or text message.');
                    return true;
                }

                payload = { text: postText || quotedText };
            }
        } else if (postText) {
            payload = { text: postText };
        } else {
            await respond('Enter text or reply to an image, video, or audio message with .cstatus. Use .cstatus help for examples.');
            return true;
        }

        await sock.sendMessage(targetJid, payload);
        await respond('The channel post was accepted by the WhatsApp send function.\nChannel: ' + targetJid);
    } catch (error) {
        console.error('[CHANNEL POSTING] Publish failed:', error?.stack || error);
        await respond(
            'Unable to publish the channel post.\n' +
            (error?.message || 'Unknown error') +
            '\n\nCheck the bot channel permissions and confirm that the installed Baileys build supports channel publishing.'
        );
    }

    return true;
}

module.exports = { executeChannelStatus, COMMANDS, resolveChannelJid };
