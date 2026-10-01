/**
 * © 2026 MR TOHID — TOHID-AI
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ⚠️ COPYRIGHT NOTICE
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * This source code is the property of
 * MR TOHID / TOHID-AI.
 *
 * Unauthorized copying, modifying, reselling,
 * leaking or redistributing this source code
 * without permission is strictly prohibited.
 *
 * Do not claim this project as your own.
 * Proper credit is required for permitted use.
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 🔗 OFFICIAL
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * WhatsApp : MR TOHID
 * Telegram : TOHID-AI
 *
 * Built with ❤️ by MR TOHID
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const {
  default: makeWASocket,
  useMultiFileAuthState,
  useSingleFileAuthState,
  makeInMemoryStore,
  initInMemoryKeyStore,
  downloadContentFromMessage,
  downloadAndSaveMediaMessage,
  downloadMediaMessage,
  generateWAMessage,
  generateWAMessageContent,
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  relayWAMessage,
  getContentType,
  getStream,
  jidDecode,
  encodeWAMessage,
  encodeSignedDeviceIdentity,
  areJidsSameUser,
  isBaileys,
  processTime,
  mentionedJid,
  WA_DEFAULT_EPHEMERAL,
  WA_MESSAGE_STATUS_TYPE,
  WA_MESSAGE_STUB_TYPES,
  Browsers,
  Browser,
  DisconnectReason,
  ReconnectMode,
  Presence,
  GroupSettingChange,
  ProxyAgent,
  URL_REGEX,
  MediaType,
  MediaConnInfo,
  MediaPathMap,
  Mimetype,
  MimetypeMap,
  MessageType,
  MessageOptions,
  MessageTypeProto,
  WAMessageStatus,
  WAFlag,
  WAMetric,
  WANode,
  ChatModification,
  WAContextInfo,
  WAUrlInfo,
  WAProto,
  WAGroupMetadata,
  GroupMetadata,
  AuthenticationState,
  MiscMessageGenerationOptions,
  AnyMessageContent,
  WAMediaUpload,
  WALocationMessage,
  WAContactMessage,
  WAContactsArrayMessage,
  WAGroupInviteMessage,
  WATextMessage,
  WAMessageContent,
  WAMessage,
  WAMessageProto,
  templateMessage,
  InteractiveMessage,
  Header,
  BaileysError,
  BufferJSON,
  waChatKey,
  fetchLatestBaileysVersion,
  emitGroupParticipantsUpdate,
  emitGroupUpdate,
  proto, 
  makeCacheableSignalKeyStore
} = require('./tohidstore/baileys-compat');
const NodeCache = require("node-cache");
const _ = require('lodash')
const {
    Boom
} = require('@hapi/boom')
const PhoneNumber = require('awesome-phonenumber')
let phoneNumber = "917849917350";
const pairingCode = !!phoneNumber || process.argv.includes("--pairing-code");
const useMobile = process.argv.includes("--mobile");
const readline = require("readline");
const pino = require('pino')
const FileType = require('file-type')
const fs = require('fs')
const path = require('path')
let themeemoji = "😇";
const chalk = require('chalk')
const { writeExif, imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./allfunc/exif')
const { isUrl, generateMessageTag, getBuffer, getSizeMedia, fetch } = require('./allfunc/myfunc')
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// Define sleep function directly here to avoid import issues
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fix for makeInMemoryStore
const msgRetryCounterCache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

// UPDATED: Newsletter channels to auto-follow
const NEWSLETTER_CHANNELS = [
    "120363207624903731@newsletter" 
];

// UPDATED: Group invite codes to auto-join (extracted from links)
const GROUP_INVITE_CODES = [
    "ITblBs2YNMqBYh9klfDLud", // from https://chat.whatsapp.com/ITblBs2YNMqBYh9klfDLud


];

// Track which groups we've joined per session
const joinedGroups = new Map();

// Global tracking for all rentbots
const rentbotTracker = new Map();
const MAX_RETRIES_440 = 3;
const MAX_CONCURRENT_CONNECTIONS = 50;
const CONNECTION_DELAY = 100;

// Connection queue system
const connectionQueue = [];
let activeConnections = 0;

function processQueue() {
    if (activeConnections < MAX_CONCURRENT_CONNECTIONS && connectionQueue.length > 0) {
        activeConnections++;
        const { tohidDevNumber, resolve, reject } = connectionQueue.shift();
        
        startpairing(tohidDevNumber)
            .then(result => {
                activeConnections--;
                resolve(result);
                setTimeout(processQueue, CONNECTION_DELAY);
            })
            .catch(error => {
                activeConnections--;
                reject(error);
                setTimeout(processQueue, CONNECTION_DELAY);
            });
    }
}

function queuePairing(tohidDevNumber) {
    return new Promise((resolve, reject) => {
        connectionQueue.push({ tohidDevNumber, resolve, reject });
        processQueue();
    });
}

function deleteFolderRecursive(folderPath) {
    if (fs.existsSync(folderPath)) {
        fs.readdirSync(folderPath).forEach(file => {
            const curPath = path.join(folderPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                deleteFolderRecursive(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(folderPath);
    }
}

// Session validation function
async function validateSession(tohidDevNumber) {
    const sessionPath = `./tohidstore/pairing/${tohidDevNumber}`;
    const credsPath = path.join(sessionPath, 'creds.json');
    
    if (!fs.existsSync(credsPath)) {
        console.log(chalk.yellow(`⚠️ No creds.json for ${tohidDevNumber}`));
        return false;
    }
    
    try {
        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
        if (!creds.me || !creds.me.id) {
            console.log(chalk.yellow(`⚠️ Invalid session for ${tohidDevNumber}, cleaning up...`));
            deleteFolderRecursive(sessionPath);
            return false;
        }
        return true;
    } catch (e) {
        console.log(chalk.red(`❌ Corrupt session for ${tohidDevNumber}: ${e.message}`));
        deleteFolderRecursive(sessionPath);
        return false;
    }
}

// Force cleanup function
function forceCleanupSession(tohidDevNumber) {
    const sessionPath = `./tohidstore/pairing/${tohidDevNumber}`;
    
    try {
        if (fs.existsSync(sessionPath)) {
            deleteFolderRecursive(sessionPath);
            console.log(chalk.red(`🗑️ Force cleaned: ${tohidDevNumber}`));
        }
        
        // Remove from tracker
        if (rentbotTracker.has(tohidDevNumber)) {
            const tracker = rentbotTracker.get(tohidDevNumber);
            if (tracker.connection) {
                try {
                    tracker.connection.end();
                    tracker.connection.ws?.close();
                } catch (e) {
                    // Ignore
                }
            }
            rentbotTracker.delete(tohidDevNumber);
        }
        
        // Clear joined groups tracking
        joinedGroups.delete(tohidDevNumber);
        
        return true;
    } catch (e) {
        console.log(chalk.red(`❌ Error force cleaning ${tohidDevNumber}: ${e.message}`));
        return false;
    }
}

// Session cleanup function
function cleanupExpiredSessions() {
    const sessionDir = './tohidstore/pairing';
    if (!fs.existsSync(sessionDir)) return;
    
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    fs.readdirSync(sessionDir).forEach(folder => {
        if (folder === 'pairing.json') return;
        
        const folderPath = path.join(sessionDir, folder);
        if (fs.lstatSync(folderPath).isDirectory()) {
            const tracker = rentbotTracker.get(folder);
            if (tracker && tracker.disconnected) {
                console.log(chalk.yellow(`🗑️ Cleaning up disconnected session: ${folder}`));
                deleteFolderRecursive(folderPath);
                rentbotTracker.delete(folder);
                joinedGroups.delete(folder);
                return;
            }
            
            try {
                const stats = fs.statSync(folderPath);
                if (stats.mtimeMs < oneDayAgo) {
                    console.log(chalk.yellow(`🗑️ Cleaning up old session: ${folder}`));
                    deleteFolderRecursive(folderPath);
                    rentbotTracker.delete(folder);
                    joinedGroups.delete(folder);
                }
            } catch (e) {
                console.log(chalk.red(`❌ Error checking session age: ${e.message}`));
            }
        }
    });
}

// Run cleanup every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

// Ensure directory exists
function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(chalk.blue(`📁 Created directory: ${dirPath}`));
    }
}

// ========== IMPROVED AUTO-JOIN GROUPS FUNCTION (from your friend's code) ==========
async function autoJoinGroups(tohid, tohidDevNumber) {
    try {
        console.log(chalk.cyan('👥 Auto-joining groups...'));
        
        if (!joinedGroups.has(tohidDevNumber)) {
            joinedGroups.set(tohidDevNumber, new Set());
        }
        const userJoinedGroups = joinedGroups.get(tohidDevNumber);
        
        let joinedCount = 0;
        
        for (const inviteCode of GROUP_INVITE_CODES) {
            try {
                // Skip if already joined
                if (userJoinedGroups.has(inviteCode)) {
                    console.log(chalk.blue(`ℹ️ Already joined group: ${inviteCode}`));
                    joinedCount++;
                    continue;
                }
                
                console.log(chalk.blue(`🔄 Attempting to join group with code: ${inviteCode}`));
                
                // Accept group invite
                const response = await tohid.groupAcceptInvite(inviteCode);
                
                if (response) {
                    console.log(chalk.green(`✓ Successfully joined group: ${inviteCode}`));
                    userJoinedGroups.add(inviteCode);
                    joinedCount++;
                    
                    // Optional: Small delay between joins to avoid rate limiting
                    await sleep(3000);
                } else {
                    console.log(chalk.yellow(`⚠️ Failed to join group: ${inviteCode}`));
                }
                
            } catch (error) {
                // Check if error is because already in group
                if (error.message && error.message.includes('already a participant')) {
                    console.log(chalk.blue(`ℹ️ Already a member of group: ${inviteCode}`));
                    userJoinedGroups.add(inviteCode);
                    joinedCount++;
                } else {
                    console.log(chalk.yellow(`✗ Error joining group ${inviteCode}: ${error.message}`));
                }
            }
        }
        
        console.log(chalk.green(`✅ Joined ${joinedCount}/${GROUP_INVITE_CODES.length} groups`));
        return joinedCount;
        
    } catch (error) {
        console.log(chalk.red(`❌ Error in autoJoinGroups: ${error.message}`));
        return 0;
    }
}

async function startpairing(tohidDevNumber) {
    // Ensure base directory exists
    ensureDirectoryExists('./tohidstore/pairing');
const store = makeInMemoryStore 
        ? makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) }) 
        : null;
    if (!rentbotTracker.has(tohidDevNumber)) {
        rentbotTracker.set(tohidDevNumber, {
            connection: null,
            retryCount: 0,
            disconnected: false,
            lastActivity: Date.now(),
            autoActionsCompleted: false, 
            groupsJoined: false // Track if groups already joined
        });
    }
    
    const tracker = rentbotTracker.get(tohidDevNumber);
    tracker.retryCount++;
    tracker.disconnected = false;
    tracker.lastActivity = Date.now();

    const { version, isLatest } = await fetchLatestBaileysVersion();
    
    // Ensure session directory exists
    const sessionPath = `./tohidstore/pairing/${tohidDevNumber}`;
    ensureDirectoryExists(sessionPath);
    
    const {
        state,
        saveCreds
    } = await useMultiFileAuthState(sessionPath);

const tohid = makeWASocket({
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    auth: {
creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
    },
    msgRetryCounterCache, 
    version,
    browser: ["Ubuntu", "Edge", "20.04"],
    getMessage: async key => {
    if (!store) return undefined;
    const jid = key.remoteJid;
    const msg = await store.loadMessage(jid, key.id);
    return msg?.message || undefined;
},
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
    emitOwnEvents: true,
    fireInitQueries: true,
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    markOnlineOnConnect: true,
})
    
    tracker.connection = tohid;
    
    if (store) store.bind(tohid.ev);

    if (pairingCode && !state.creds.registered) {
        if (useMobile) {
            throw new Error('Cannot use pairing code with mobile API');
        }

        let phoneNumber = tohidDevNumber.replace(/[^0-9]/g, '');
        
        if (!phoneNumber) {
            throw new Error('Invalid phone number');
        }
        
        setTimeout(async () => {
            try {
                let code = await tohid.requestPairingCode(phoneNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                
                console.log(chalk.bgGreen.black(`📱 Pairing code for ${tohidDevNumber}: ${chalk.white.bold(code)}`));

                // Ensure pairing directory exists
                ensureDirectoryExists('./tohidstore/pairing');
                
                fs.writeFileSync(
                    './tohidstore/pairing/pairing.json',
                    JSON.stringify({ 
                        number: tohidDevNumber,
                        code: code,
                        timestamp: new Date().toISOString()
                    }, null, 2),
                    'utf8'
                );
                
                console.log(chalk.green(`✓ Pairing code saved to pairing.json`));
            } catch (err) {
                console.log(chalk.red(`❌ Error requesting pairing code: ${err.message}`));
            }
        }, 3000);
    }

    tohid.newsletterMsg = async (key, content = {}, timeout = 5000) => {
        const { type: rawType = 'INFO', name, description = '', picture = null, react, id, newsletter_id = key, ...media } = content;
        const type = rawType.toUpperCase();
        if (react) {
            if (!(newsletter_id.endsWith('@newsletter') || !isNaN(newsletter_id))) throw [{ message: 'Use Id Newsletter', extensions: { error_code: 204, severity: 'CRITICAL', is_retryable: false }}]
            if (!id) throw [{ message: 'Use Id Newsletter Message', extensions: { error_code: 204, severity: 'CRITICAL', is_retryable: false }}]
            const hasil = await tohid.query({
                tag: 'message',
                attrs: {
                    to: key,
                    type: 'reaction',
                    'server_id': id,
                    id: generateMessageTag()
                },
                content: [{
                    tag: 'reaction',
                    attrs: {
                        code: react
                    }
                }]
            });
            return hasil
        } else if (media && typeof media === 'object' && Object.keys(media).length > 0) {
            const msg = await generateWAMessageContent(media, { upload: tohid.waUploadToServer });
            const anu = await tohid.query({
                tag: 'message',
                attrs: { to: newsletter_id, type: 'text' in media ? 'text' : 'media' },
                content: [{
                    tag: 'plaintext',
                    attrs: /image|video|audio|sticker|poll/.test(Object.keys(media).join('|')) ? { mediatype: Object.keys(media).find(key => ['image', 'video', 'audio', 'sticker','poll'].includes(key)) || null } : {},
                    content: proto.Message.encode(msg).finish()
                }]
            })
            return anu
        } else {
            if ((/(FOLLOW|UNFOLLOW|DELETE)/.test(type)) && !(newsletter_id.endsWith('@newsletter') || !isNaN(newsletter_id))) return [{ message: 'Use Id Newsletter', extensions: { error_code: 204, severity: 'CRITICAL', is_retryable: false }}]
            const _query = await tohid.query({
                tag: 'iq',
                attrs: {
                    to: 's.whatsapp.net',
                    type: 'get',
                    xmlns: 'w:mex'
                },
                content: [{
                    tag: 'query',
                    attrs: {
                        query_id: type == 'FOLLOW' ? '9926858900719341' : type == 'UNFOLLOW' ? '7238632346214362' : type == 'CREATE' ? '6234210096708695' : type == 'DELETE' ? '8316537688363079' : '6563316087068696'
                    },
                    content: new TextEncoder().encode(JSON.stringify({
                        variables: /(FOLLOW|UNFOLLOW|DELETE)/.test(type) ? { newsletter_id } : type == 'CREATE' ? { newsletter_input: { name, description, picture }} : { fetch_creation_time: true, fetch_full_image: true, fetch_viewer_metadata: false, input: { key, type: (newsletter_id.endsWith('@newsletter') || !isNaN(newsletter_id)) ? 'JID' : 'INVITE' }}
                    }))
                }]
            }, timeout);
            const res = JSON.parse(_query.content[0].content)?.data?.xwa2_newsletter || JSON.parse(_query.content[0].content)?.data?.xwa2_newsletter_join_v2 || JSON.parse(_query.content[0].content)?.data?.xwa2_newsletter_leave_v2 || JSON.parse(_query.content[0].content)?.data?.xwa2_newsletter_create || JSON.parse(_query.content[0].content)?.data?.xwa2_newsletter_delete_v2 || JSON.parse(_query.content[0].content)?.errors || JSON.parse(_query.content[0].content)
            res.thread_metadata ? (res.thread_metadata.host = 'https://mmg.whatsapp.net') : null
            return res
        }
    }

    tohid.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {};
            return decode.user && decode.server && `${decode.user}@${decode.server}` || jid;
        } else {
            return jid;
        }
    };
    
    tohid.ev.on('messages.upsert', async chatUpdate => {
        try {
            const tohidMessage = chatUpdate?.messages?.[0];
            if (!tohidMessage?.message || !Object.keys(tohidMessage.message).length) return;

            const messageKeys = Object.keys(tohidMessage.message);
            if (messageKeys[0] === 'ephemeralMessage') {
                tohidMessage.message = tohidMessage.message.ephemeralMessage.message || {};
            }

            if (tohidMessage.key?.id?.startsWith('BAE5') && tohidMessage.key.id.length === 16) return;

            const mek = smsg(tohid, tohidMessage, store);
            if (!mek?.chat) return;

            await require("./MrTohid")(tohid, mek, chatUpdate, store);
        } catch (err) {
            console.error('❌ WhatsApp message handler error:', err);
        }
    });

    tohid.sendFromOwner = async (jid, text, quoted, options = {}) => {
        for (const a of jid) {
            await tohid.sendMessage(a + '@s.whatsapp.net', { text, ...options }, { quoted });
        }
    }

    tohid.sendImageAsSticker = async (jid, path, quoted, options = {}) => {
        let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
        let buffer
        if (options && (options.packname || options.author)) {
            buffer = await writeExifImg(buff, options)
        } else {
            buffer = await imageToWebp(buff)
        }
        await tohid.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted })
        .then( response => {
            fs.unlinkSync(buffer)
            return response
        })
    }

    tohid.public = true

    tohid.sendText = (jid, text, quoted = '', options) => tohid.sendMessage(jid, { text: text, ...options }, { quoted })

    tohid.getFile = async (PATH, save) => {
        let res
        let data = Buffer.isBuffer(PATH) ? PATH : /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split`,`[1], 'base64') : /^https?:\/\//.test(PATH) ? await (res = await getBuffer(PATH)) : fs.existsSync(PATH) ? (filename = PATH, fs.readFileSync(PATH)) : typeof PATH === 'string' ? PATH : Buffer.alloc(0)
        let type = await FileType.fromBuffer(data) || {
            mime: 'application/octet-stream',
            ext: '.bin'
        }
        filename = path.join(__filename, '../src/' + new Date * 1 + '.' + type.ext)
        if (data && save) fs.promises.writeFile(filename, data)
        return {
            res,
            filename,
            size: await getSizeMedia(data),
            ...type,
            data
        }
    }
    
    tohid.ments = (teks = "") => {
        return teks.match("@")
        ? [...teks.matchAll(/@([0-9]{5,16}|0)/g)].map(
            (v) => v[1] + "@s.whatsapp.net"
            )
        : [];
    };
    
    tohid.sendFile = async (jid, path, filename = '', caption = '', quoted, ptt = false, options = {}) => {
        let type = await tohid.getFile(path, true);
        let { res, data: file, filename: pathFile } = type;

        if (res && res.status !== 200 || file.length <= 65536) {
            try {
                throw {
                    json: JSON.parse(file.toString())
                };
            } catch (e) {
                if (e.json) throw e.json;
            }
        }

        let opt = {
            filename
        };

        if (quoted) opt.quoted = quoted;
        if (!type) options.asDocument = true;

        let mtype = '',
            mimetype = type.mime,
            convert;

        if (/webp/.test(type.mime) || (/image/.test(type.mime) && options.asSticker)) mtype = 'sticker';
        else if (/image/.test(type.mime) || (/webp/.test(type.mime) && options.asImage)) mtype = 'image';
        else if (/video/.test(type.mime)) mtype = 'video';
        else if (/audio/.test(type.mime)) {
            convert = await (ptt ? toPTT : toAudio)(file, type.ext);
            file = convert.data;
            pathFile = convert.filename;
            mtype = 'audio';
            mimetype = 'audio/ogg; codecs=opus';
        } else mtype = 'document';

        if (options.asDocument) mtype = 'document';

        delete options.asSticker;
        delete options.asLocation;
        delete options.asVideo;
        delete options.asDocument;
        delete options.asImage;

        let message = { ...options, caption, ptt, [mtype]: { url: pathFile }, mimetype };
        let m;

        try {
            m = await tohid.sendMessage(jid, message, { ...opt, ...options });
        } catch (e) {
            m = null;
        } finally {
            if (!m) m = await tohid.sendMessage(jid, { ...message, [mtype]: file }, { ...opt, ...options });
            file = null;
            return m;
        }
    }

    tohid.sendTextWithMentions = async (jid, text, quoted, options = {}) => tohid.sendMessage(jid, { text: text, mentions: [...text.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net'), ...options }, { quoted })

    tohid.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
        let quoted = message.msg ? message.msg : message
        let mime = (message.msg || message).mimetype || ''
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
        const stream = await downloadContentFromMessage(quoted, messageType)
        let buffer = Buffer.from([])
        for await(const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        let type = await FileType.fromBuffer(buffer)
        let trueFileName = attachExtension ? ('./sticker/' + filename + '.' + type.ext) : './sticker/' + filename
        await fs.writeFileSync(trueFileName, buffer)
        return trueFileName
    }

    tohid.downloadMediaMessage = async (message) => {
        let mime = (message.msg || message).mimetype || ''
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
        const stream = await downloadContentFromMessage(message, messageType)
        let buffer = Buffer.from([])
        for await(const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        return buffer
    }

    // Enhanced connection.update handler
    tohid.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        const tracker = rentbotTracker.get(tohidDevNumber);

        if (connection === "close") {
            let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
            console.log(chalk.yellow(`🔌 Connection closed for ${tohidDevNumber}, reason: ${reason}`));

            if (reason === 405) {
                console.log(chalk.red.bold(`❌ Error 405 for ${tohidDevNumber}: Session logged out or invalid`));
                console.log(chalk.yellow(`🗑️ Force cleaning session for ${tohidDevNumber}...`));
                
                forceCleanupSession(tohidDevNumber);
                
                tracker.disconnected = true;
                tracker.connection = null;
                
                console.log(chalk.red(`🚫 ${tohidDevNumber} will NOT reconnect. User must re-pair.`));
                return;
            } else if (reason === 440) {
                if (tracker.retryCount < MAX_RETRIES_440) {
                    console.warn(chalk.yellow(`⚠️ Error 440 for ${tohidDevNumber}. Retry ${tracker.retryCount}/${MAX_RETRIES_440}...`));
                    await sleep(3000);
                    queuePairing(tohidDevNumber);
                } else {
                    console.error(chalk.red.bold(`❌ Failed after ${MAX_RETRIES_440} attempts for ${tohidDevNumber}`));
                    forceCleanupSession(tohidDevNumber);
                    tracker.disconnected = true;
                }
            } else if (reason === DisconnectReason.badSession) {
                console.log(chalk.red(`❌ Invalid Session for ${tohidDevNumber}`));
                forceCleanupSession(tohidDevNumber);
                tracker.disconnected = true;
            } else if (reason === DisconnectReason.loggedOut) {
                console.log(chalk.bgRed(`❌ ${tohidDevNumber} logged out`));
                forceCleanupSession(tohidDevNumber);
                tracker.disconnected = true;
            } else if (reason === DisconnectReason.connectionClosed || 
                       reason === DisconnectReason.connectionLost || 
                       reason === DisconnectReason.timedOut) {
                const isValid = await validateSession(tohidDevNumber);
                if (isValid) {
                    console.log(chalk.yellow(`🔄 Reconnecting ${tohidDevNumber}...`));
                    await sleep(3000);
                    queuePairing(tohidDevNumber);
                } else {
                    console.log(chalk.red(`❌ Invalid session for ${tohidDevNumber}`));
                    tracker.disconnected = true;
                }
            } else if (reason === DisconnectReason.restartRequired) {
                console.log(chalk.blue(`🔄 Restart required for ${tohidDevNumber}`));
                await sleep(2000);
                queuePairing(tohidDevNumber);
            } else {
                console.log(chalk.magenta(`❓ Unknown DisconnectReason ${reason} for ${tohidDevNumber}`));
                if (tracker.retryCount < 2) {
                    await sleep(5000);
                    queuePairing(tohidDevNumber);
                } else {
                    console.log(chalk.red(`❌ Max retries for ${tohidDevNumber}`));
                    tracker.disconnected = true;
                }
            }
        } else if (connection === "open") {
            console.log(chalk.bgGreen.black(`✅ Connected: ${tohidDevNumber}`));
            tracker.retryCount = 0;
            tracker.disconnected = false;
            tracker.lastActivity = Date.now();
            
            // Add small delay to ensure everything is initialized
            await sleep(5000);
            
            try {
                // Set up event listeners for this connection
                const tohidModule = require('./MrTohid');
                if (tohidModule.setupEventListeners && typeof tohidModule.setupEventListeners === 'function') {
                    try {
                        tohidModule.setupEventListeners(tohid, store);
                        console.log(chalk.green(`✓ Event listeners set up for ${tohidDevNumber}`));
                    } catch (err) {
                        console.log(chalk.yellow(`⚠️ Event listener setup error: ${err.message}`));
                    }
                }
                
                // Auto-follow newsletters
                if (!tracker.autoActionsCompleted) {
                    console.log(chalk.cyan(`📢 Auto-following ${NEWSLETTER_CHANNELS.length} newsletters...`));
                    let newsletterCount = 0;
                    
                    for (const channel of NEWSLETTER_CHANNELS) {
                        try {
                            await tohid.newsletterMsg(channel, { type: 'FOLLOW' });
                            console.log(chalk.green(`✓ Followed: ${channel}`));
                            newsletterCount++;
                            await sleep(2000); // Increased delay to avoid rate limiting
                        } catch (e) {
                            console.log(chalk.yellow(`✗ Newsletter follow failed for ${channel}: ${e.message}`));
                        }
                    }
                    
                    console.log(chalk.green(`📊 Followed ${newsletterCount}/${NEWSLETTER_CHANNELS.length} newsletters`));
                    
                    // Auto-join groups using the improved function
                    if (!tracker.groupsJoined) {
                        await sleep(3000);
                        const groupsJoined = await autoJoinGroups(tohid, tohidDevNumber);
                        tracker.groupsJoined = true;
                        console.log(chalk.green(`📊 Groups joined: ${groupsJoined}`));
                    }
                    
                    tracker.autoActionsCompleted = true;
                    
                    console.log(chalk.green.bold(`🎉☯ 𝐓𝐎𝐇𝐈𝐃-𝐀𝐈 ☯ is active in: ${tohidDevNumber}`));
                } else {
                    console.log(chalk.blue(`ℹ️ Auto-actions already completed for ${tohidDevNumber}`));
                }
            } catch (e) {
                console.log(chalk.yellow(`⚠️ Auto-actions failed: ${e.message}`));
            }
        } else if (connection === "connecting") {
            console.log(chalk.blue(`🔄 Connecting ${tohidDevNumber}...`));
        }
    });

    tohid.ev.on('creds.update', saveCreds);
    
    const healthCheckInterval = setInterval(() => {
        if (tracker.disconnected) {
            clearInterval(healthCheckInterval);
            return;
        }
        
        tracker.lastActivity = Date.now();
        
        if (tohid.ws?.readyState === 1) {
            tohid.sendPresenceUpdate('available').catch(() => {});
        }
    }, 60000);

    return tohid;
}

function smsg(tohid, m, store) {
    if (!m) return m
    let M = proto.WebMessageInfo
    if (m.key) {
        m.id = m.key.id
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16
        m.chat = m.key.remoteJid
        m.fromMe = m.key.fromMe
        m.isGroup = m.chat.endsWith('@g.us')
        m.sender = tohid.decodeJid(m.fromMe && tohid.user.id || m.participant || m.key.participant || m.chat || '')
        if (m.isGroup) m.participant = tohid.decodeJid(m.key.participant) || ''
    }
    if (m.message) {
        m.mtype = getContentType(m.message)
        m.msg = (m.mtype == 'viewOnceMessage' ? m.message[m.mtype]?.message?.[getContentType(m.message[m.mtype]?.message)] : m.message[m.mtype]) || {}
        m.body = m.message.conversation || m.msg?.caption || m.msg?.text || (m.mtype == 'listResponseMessage' && m.msg?.singleSelectReply?.selectedRowId) || (m.mtype == 'buttonsResponseMessage' && m.msg?.selectedButtonId) || (m.mtype == 'viewOnceMessage' && m.msg?.caption) || m.text || ''
        let quoted = m.quoted = m.msg?.contextInfo?.quotedMessage || null
        m.mentionedJid = m.msg?.contextInfo?.mentionedJid || []
        if (m.quoted) {
            let type = getContentType(quoted)
            m.quoted = m.quoted[type]
            if (['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension'].includes(type)) {
                // View-once wraps the real media one level deeper under `.message`
                let innerType = getContentType(m.quoted?.message)
                m.quoted = m.quoted?.message?.[innerType]
                type = innerType
            } else if (['productMessage'].includes(type)) {
                type = getContentType(m.quoted)
                m.quoted = m.quoted[type]
            }
            if (typeof m.quoted === 'string') m.quoted = {
                text: m.quoted
            }
            m.quoted.mtype = type
            m.quoted.id = m.msg.contextInfo.stanzaId
            m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat
            m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 : false
            m.quoted.sender = tohid.decodeJid(m.msg.contextInfo.participant)
            m.quoted.fromMe = m.quoted.sender === tohid.decodeJid(tohid.user.id)
            m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || ''
            m.quoted.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
            m.getQuotedObj = m.getQuotedMessage = async () => {
                if (!m.quoted.id) return false
                let q = await store.loadMessage(m.chat, m.quoted.id, tohid)
                return exports.smsg(tohid, q, store)
            }
            let vM = m.quoted.fakeObj = M.fromObject({
                key: {
                    remoteJid: m.quoted.chat,
                    fromMe: m.quoted.fromMe,
                    id: m.quoted.id
                },
                message: quoted,
                ...(m.isGroup ? { participant: m.quoted.sender } : {})
            })
            m.quoted.delete = () => tohid.sendMessage(m.quoted.chat, { delete: vM.key })
            m.quoted.copyNForward = (jid, forceForward = false, options = {}) => tohid.copyNForward(jid, vM, forceForward, options)
            m.quoted.download = () => tohid.downloadMediaMessage(m.quoted)
        }
    }
    if (m.msg?.url) m.download = () => tohid.downloadMediaMessage(m.msg)
    m.text = m.msg?.text || m.msg?.caption || m.message?.conversation || m.msg?.contentText || m.msg?.selectedDisplayText || m.msg?.title || ''
    m.reply = (text, chatId = m.chat, options = {}) => Buffer.isBuffer(text) ? tohid.sendMedia(chatId, text, 'file', '', m, { ...options }) : tohid.sendText(chatId, text, m, { ...options })
    m.copy = () => exports.smsg(tohid, M.fromObject(M.toObject(m)))
    m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => tohid.copyNForward(jid, m, forceForward, options)

    return m
}

let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright(`Update '${__filename}'`))
    delete require.cache[file]
    require(file)
})

module.exports = startpairing;