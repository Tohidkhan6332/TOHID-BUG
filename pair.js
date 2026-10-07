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
  fetchLatestWaWebVersion,
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
const useMobile = process.argv.includes("--mobile");
const readline = require("readline");
const pino = require('pino')
const FileType = require('file-type')
const fs = require('fs')
const os = require('os')
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
const pendingConnections = new Map();
let activeConnections = 0;

function processQueue() {
    while (activeConnections < MAX_CONCURRENT_CONNECTIONS && connectionQueue.length > 0) {
        activeConnections++;
        const item = connectionQueue.shift();
        const { tohidDevNumber, customPairingCode, enablePairingCode, resolve, reject, promise } = item;

        startpairing(tohidDevNumber, customPairingCode, enablePairingCode)
            .then(result => {
                resolve(result);
            })
            .catch(error => {
                reject(error);
            })
            .finally(() => {
                activeConnections--;
                if (pendingConnections.get(tohidDevNumber) === promise) {
                    pendingConnections.delete(tohidDevNumber);
                }
                setTimeout(processQueue, CONNECTION_DELAY);
            });
    }
}

function queuePairing(tohidDevNumber, customPairingCode = null, enablePairingCode = false) {
    const key = String(tohidDevNumber || '').replace(/[^0-9@.]/g, '');
    const pending = pendingConnections.get(key);
    if (pending) return pending;

    let resolvePromise;
    let rejectPromise;
    const promise = new Promise((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
    });

    pendingConnections.set(key, promise);
    connectionQueue.push({
        tohidDevNumber: key,
        customPairingCode,
        enablePairingCode,
        resolve: resolvePromise,
        reject: rejectPromise,
        promise
    });
    processQueue();
    return promise;
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
    const sessionKey = String(tohidDevNumber).replace(/[^0-9@.]/g, '');
    const sessionPath = `./tohidstore/pairing/${sessionKey}`;
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
    const sessionKey = String(tohidDevNumber).replace(/[^0-9@.]/g, '');
    const sessionPath = `./tohidstore/pairing/${sessionKey}`;

    try {
        if (fs.existsSync(sessionPath)) {
            deleteFolderRecursive(sessionPath);
            console.log(chalk.red(`🗑️ Force cleaned: ${tohidDevNumber}`));
        }

        const tracker = rentbotTracker.get(tohidDevNumber);
        if (tracker?.healthCheckInterval) {
            clearInterval(tracker.healthCheckInterval);
            tracker.healthCheckInterval = null;
        }
        if (tracker?.connection) {
            try {
                tracker.connection.end();
                tracker.connection.ws?.close();
            } catch (e) {}
        }

        rentbotTracker.delete(tohidDevNumber);
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
                // Never delete a valid registered WhatsApp session just because its
                // directory has not changed recently. Auth files may remain unchanged
                // for days while the socket is healthy.
                const credsPath = path.join(folderPath, 'creds.json');
                const stats = fs.statSync(folderPath);
                const hasCreds = fs.existsSync(credsPath);

                // Only clean abandoned, incomplete folders that are both missing
                // credentials and older than one day.
                if (!hasCreds && stats.mtimeMs < oneDayAgo) {
                    console.log(chalk.yellow(`🗑️ Cleaning abandoned session folder: ${folder}`));
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

async function startpairing(tohidDevNumber, customPairingCode = null, enablePairingCode = false) {
    // Keep one canonical session key for every entry point (number or JID).
    tohidDevNumber = String(tohidDevNumber || '').replace(/[^0-9]/g, '');
    const sessionKey = tohidDevNumber;

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
            groupsJoined: false, // Track if groups already joined
            healthCheckInterval: null
        });
    }
    
    const tracker = rentbotTracker.get(tohidDevNumber);

    // A reconnect creates a new socket. Keep exactly one health monitor per
    // WhatsApp session so repeated reconnects do not leak timers.
    if (tracker.healthCheckInterval) {
        clearInterval(tracker.healthCheckInterval);
        tracker.healthCheckInterval = null;
    }

    tracker.retryCount++;
    tracker.disconnected = false;
    tracker.reconnectPending = false;
    tracker.pairingRequested = false;
    tracker.pairingCode = null;
    tracker.pairingMode = enablePairingCode ? 'code' : 'session';
    tracker.customPairingCode = customPairingCode || null;
    tracker.enablePairingCode = Boolean(enablePairingCode);
    tracker.lastActivity = Date.now();

    // Reconnects that happen while a pairing-code flow is still unregistered
    // must keep the same pairing mode and custom code. A plain queuePairing()
    // call defaults to session mode and can leave Telegram waiting forever.
    const requeueCurrentSession = () => queuePairing(
        tohidDevNumber,
        tracker.enablePairingCode && !state.creds.registered ? tracker.customPairingCode : null,
        tracker.enablePairingCode && !state.creds.registered
    );

    // Resolve the live WhatsApp Web client revision. The Baileys repository
    // revision can lag behind Meta's current server requirement and cause
    // immediate connection/login failures.
    let version;
    let isLatest = false;
    try {
        const liveVersion = await fetchLatestWaWebVersion();
        version = liveVersion?.version;
        isLatest = !!liveVersion?.isLatest;
        if (!Array.isArray(version) || version.length !== 3) {
            throw new Error('Invalid live WhatsApp Web version');
        }
        console.log(chalk.cyan(`🌐 WhatsApp Web version: ${version.join('.')} (live: ${isLatest})`));
    } catch (liveVersionError) {
        console.log(chalk.yellow(`⚠️ Live WhatsApp version lookup failed: ${liveVersionError?.message || liveVersionError}`));
        const fallbackVersion = await fetchLatestBaileysVersion();
        version = fallbackVersion.version;
        isLatest = !!fallbackVersion.isLatest;
        console.log(chalk.yellow(`↩️ Using Baileys fallback version: ${version.join('.')}`));
    }
    
    // Ensure session directory exists
    const sessionPath = `./tohidstore/pairing/${sessionKey}`;
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
    browser: Browsers.macOS('Chrome'),
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
    tracker.state = 'connecting';
    tracker.lastConnectedAt = tracker.lastConnectedAt || null;
    tracker.lastDisconnectedAt = null;
    tracker.lastError = null;
    
    if (store) store.bind(tohid.ev);

    // Pairing code is requested from connection.update below, after WhatsApp
    // has entered the connecting/QR phase. This avoids a startup timing race.
    const pairingNumber = sessionKey.replace(/[^0-9]/g, '');
    let pairingRetryTimer = null;
    let pairingRequestInFlight = false;
    let pairingRetryCount = 0;
    const MAX_PAIRING_RETRIES = 10;

    const savePairingCode = (code) => {
        const userPairingDir = path.join('./tohidstore/pairing', pairingNumber);
        ensureDirectoryExists(userPairingDir);
        const userPairingFile = path.join(userPairingDir, 'pairing.json');

        fs.writeFileSync(
            userPairingFile,
            JSON.stringify({
                number: tohidDevNumber,
                code,
                timestamp: new Date().toISOString()
            }, null, 2),
            'utf8'
        );

        tracker.pairingCode = code;
        tracker.lastError = null;
        console.log(chalk.green(`✓ Pairing code saved for +${pairingNumber}`));
    };

    const requestPairingCodeWithRetry = async () => {
        if (!enablePairingCode || state.creds.registered || tracker.disconnected) return;
        if (tracker.connection !== tohid) return;
        if (tracker.pairingRequested || pairingRequestInFlight) return;
        if (pairingRetryCount >= MAX_PAIRING_RETRIES) {
            console.log(chalk.red(`❌ Pairing code retries exhausted for +${pairingNumber}`));
            return;
        }

        pairingRequestInFlight = true;
        pairingRetryCount++;

        try {
            // Baileys expects this request from connection.update
            // (connecting/qr phase), not from a WebSocket readyState poll.
            const requestPromise = tohid.requestPairingCode(
                pairingNumber,
                customPairingCode || undefined
            );
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Pairing code request timed out')), 10000)
            );
            const codeRaw = await Promise.race([requestPromise, timeoutPromise]);
            const code = codeRaw?.match(/.{1,4}/g)?.join("-") || codeRaw;

            tracker.pairingRequested = true;
            tracker.pairingCode = code;

            console.log(
                chalk.bgGreen.black(
                    `📱 Pairing code for ${tohidDevNumber}: ${chalk.white.bold(code)}`
                )
            );

            savePairingCode(code);
        } catch (err) {
            tracker.pairingRequested = false;
            tracker.lastError = err?.message || String(err);
            console.log(
                chalk.red(
                    `❌ Pairing code attempt ${pairingRetryCount}/${MAX_PAIRING_RETRIES} for +${pairingNumber}: ${tracker.lastError}`
                )
            );

            if (!state.creds.registered && !tracker.disconnected && pairingRetryCount < MAX_PAIRING_RETRIES) {
                clearTimeout(pairingRetryTimer);
                pairingRetryTimer = setTimeout(() => {
                    pairingRetryTimer = null;
                    void requestPairingCodeWithRetry();
                }, 1500);
            }
        } finally {
            pairingRequestInFlight = false;
        }
    };

    if (enablePairingCode && !state.creds.registered && useMobile) {
        throw new Error('Cannot use pairing code with mobile API');
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
    
    // WhatsApp can deliver more than one message in a single upsert.
    // Process every message instead of only messages[0]. This is important after
    // reconnect/update because queued messages may arrive together.
    tohid.ev.on('messages.upsert', async (chatUpdate = {}) => {
        const messages = Array.isArray(chatUpdate.messages) ? chatUpdate.messages : [];
        if (!messages.length) return;

        const tracker = rentbotTracker.get(tohidDevNumber);
        if (tracker) {
            tracker.lastMessageAt = Date.now();
            tracker.lastActivity = Date.now();
        }

        console.log(chalk.gray(
            `📩 WhatsApp upsert: ${messages.length} message(s), type=${chatUpdate.type || 'unknown'}`
        ));

        for (const tohidMessage of messages) {
            try {
                if (!tohidMessage?.message || !Object.keys(tohidMessage.message).length) continue;

                const messageKeys = Object.keys(tohidMessage.message);
                if (messageKeys[0] === 'ephemeralMessage') {
                    tohidMessage.message = tohidMessage.message.ephemeralMessage.message || {};
                }

                if (tohidMessage.key?.id?.startsWith('BAE5') && tohidMessage.key.id.length === 16) continue;

                const mek = smsg(tohid, tohidMessage, store);
                if (!mek?.chat) continue;

                await require('./MrTohid')(tohid, mek, chatUpdate, store);
            } catch (err) {
                console.error(
                    `❌ WhatsApp message handler error [${tohidDevNumber}]:`,
                    err?.stack || err?.message || err
                );
            }
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

    // Restore the persisted bot visibility mode instead of resetting every new/restarted session to public.\n    let persistedPublic = false;\n    try {\n        const modeFile = './database/bot-mode.json';\n        if (fs.existsSync(modeFile)) {\n            const savedMode = JSON.parse(fs.readFileSync(modeFile, 'utf8'));\n            persistedPublic = savedMode?.mode === 'public';\n        }\n    } catch (modeError) {\n        console.error('⚠️ Could not read persisted bot mode:', modeError.message);\n    }\n    tohid.public = persistedPublic;

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
        try {
            const { connection, lastDisconnect } = update;
            const tracker = rentbotTracker.get(tohidDevNumber);

            // Isolate a missing tracker before touching pairing state.
            if (!tracker) {
                console.log(chalk.yellow(`⚠️ Tracker missing for ${tohidDevNumber}; ignoring WhatsApp update.`));
                return;
            }

            // Ignore events from an older socket after a fresh socket replaces it.
            if (tracker.connection && tracker.connection !== tohid) {
                console.log(chalk.gray(`ℹ️ Ignoring stale socket update for ${tohidDevNumber}`));
                return;
            }

            // Request pairing code only after the WhatsApp socket is ready for
            // pairing. The QR event also fires in pairing-code mode.
            if (update.qr &&
                enablePairingCode &&
                !state.creds.registered &&
                !tracker.pairingRequested &&
                tracker.pairingMode === 'code') {
                void requestPairingCodeWithRetry();
            }
        if (connection === "close") {
            // A manual/health-monitor restart already owns the reconnect flow.
            // Do not enqueue a second socket from the close event.
            if (tracker.reconnectPending) {
                tracker.state = 'reconnecting';
                tracker.lastDisconnectedAt = Date.now();
                tracker.lastError = lastDisconnect?.error?.message || String(lastDisconnect?.error || '');
                return;
            }

            tracker.state = 'reconnecting';
            tracker.lastDisconnectedAt = Date.now();
            tracker.lastError = lastDisconnect?.error?.message || String(lastDisconnect?.error || '');
            let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
            console.log(chalk.yellow(`🔌 Connection closed for ${tohidDevNumber}, reason: ${reason}`));

            if (reason === 405) {
                console.log(chalk.red.bold(`❌ Error 405 for ${tohidDevNumber}: Session logged out or invalid`));
                console.log(chalk.yellow(`🗑️ Force cleaning session for ${tohidDevNumber}...`));
                
                forceCleanupSession(tohidDevNumber);
                
                tracker.disconnected = true;
                tracker.state = 'logged_out';
                tracker.connection = null;
                
                console.log(chalk.red(`🚫 ${tohidDevNumber} will NOT reconnect. User must re-pair.`));
                return;
            } else if (reason === 440) {
                if (tracker.retryCount < MAX_RETRIES_440) {
                    console.warn(chalk.yellow(`⚠️ Error 440 for ${tohidDevNumber}. Retry ${tracker.retryCount}/${MAX_RETRIES_440}...`));
                    await sleep(3000);
                    await requeueCurrentSession();
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
                    await requeueCurrentSession();
                } else {
                    console.log(chalk.red(`❌ Invalid session for ${tohidDevNumber}`));
                    tracker.disconnected = true;
                }
            } else if (reason === DisconnectReason.restartRequired) {
                console.log(chalk.blue(`🔄 Restart required for ${tohidDevNumber}`));
                await sleep(2000);
                await requeueCurrentSession();
            } else {
                console.log(chalk.magenta(`❓ Unknown DisconnectReason ${reason} for ${tohidDevNumber}`));
                if (tracker.retryCount < 2) {
                    await sleep(5000);
                    await requeueCurrentSession();
                } else {
                    console.log(chalk.red(`❌ Max retries for ${tohidDevNumber}`));
                    tracker.disconnected = true;
                }
            }
        } else if (connection === "open") {
            console.log(chalk.bgGreen.black(`✅ Connected: ${tracker.actualNumber ? tracker.actualNumber : tohidDevNumber}`));
            tracker.retryCount = 0;
            tracker.disconnected = false;
            tracker.state = 'online';
            tracker.lastActivity = Date.now();
            tracker.lastConnectedAt = Date.now();
            tracker.lastError = null;
            // Pairing mode is no longer needed once WhatsApp is registered.
            // This also makes later manual/health restarts use normal session auth.
            tracker.enablePairingCode = false;
            tracker.customPairingCode = null;
            
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
                    
                    // Mark auto-actions complete only after the deployment notification
                    // is successfully delivered. Previously this flag was set BEFORE the
                    // DM send, so one transient send failure permanently suppressed the
                    // "DEPLOYMENT SUCCESSFUL" message for that process.
                    let deploymentNoticeSent = false;
                    const ownerJid = tohid.decodeJid(
                        tohidDevNumber.includes('@')
                            ? tohidDevNumber
                            : tohidDevNumber + '@s.whatsapp.net'
                    );
                    // Restore the persisted bot mode so the deployment notice
                    // always tells the owner whether TOHID-AI is PRIVATE or PUBLIC.
                    let botMode = 'PRIVATE';
                    try {
                        const modeFile = './database/bot-mode.json';
                        if (fs.existsSync(modeFile)) {
                            const savedMode = JSON.parse(fs.readFileSync(modeFile, 'utf8'));
                            botMode = savedMode?.mode === 'public' ? 'PUBLIC' : 'PRIVATE';
                        }
                    } catch (modeError) {
                        console.log(chalk.yellow('⚠️ Could not read bot mode for deployment notice:', modeError.message));
                    }

                    const packageInfo = (() => {
                        try { return JSON.parse(fs.readFileSync('./package.json', 'utf8')); }
                        catch (_) { return {}; }
                    })();
                    const runtimeSeconds = Math.floor(process.uptime());
                    const runtimeDays = Math.floor(runtimeSeconds / 86400);
                    const runtimeHours = Math.floor((runtimeSeconds % 86400) / 3600);
                    const runtimeMinutes = Math.floor((runtimeSeconds % 3600) / 60);
                    const runtimeSecs = runtimeSeconds % 60;
                    const runtimeText =
                        (runtimeDays ? runtimeDays + 'd ' : '') +
                        String(runtimeHours).padStart(2, '0') + ':' +
                        String(runtimeMinutes).padStart(2, '0') + ':' +
                        String(runtimeSecs).padStart(2, '0');
                    const ramUsed = Math.round((os.totalmem() - os.freemem()) / 1024 / 1024);
                    const ramTotal = Math.round(os.totalmem() / 1024 / 1024);
                    const ramText = ramUsed + 'MB / ' + ramTotal + 'MB';
                    const platformText = process.platform + ' • Node ' + process.versions.node;
                    const prefixText = '.';

                    const commandCount = (() => {
                        try {
                            const root = path.join(process.cwd(), 'commands');
                            let count = 0;
                            const walk = dir => {
                                for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                                    const full = path.join(dir, entry.name);
                                    if (entry.isDirectory()) walk(full);
                                    else if (entry.isFile() && entry.name.endsWith('.js')) count++;
                                }
                            };
                            walk(root);
                            return count;
                        } catch (_) { return 0; }
                    })();

                    const deploymentText = `╭━━━〔 🤖 TOHID-AI 〕━━━╮
┃
┃ ✅ DEPLOYMENT SUCCESSFUL
┃
┃ 📦 Repository : TOHID-BUG
┃ 🌿 Branch     : main
┃ 🟢 Status     : ACTIVE
┃ 📱 WhatsApp   : CONNECTED
┃ 🤖 Bot        : TOHID-AI
┃ ⚙️ Mode       : ${botMode}
┃
┃ Your bot is now online and ready.
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯

©𝙿𝙾𝚆𝙴𝚁𝙴𝙳 𝙱𝚈 𝚃𝙾𝙷𝙸𝙳-𝙰𝙸`;

                    // Send the deployment status as a real multi-line WhatsApp
                    // interactive message. Do not build this text with escaped
                    // "\\n" sequences; WhatsApp would display them literally.
                    const deploymentContent = {
                        viewOnceMessage: {
                            message: {
                                interactiveMessage: {
                                    body: { text: deploymentText },
                                    footer: { text: 'TOHID-AI • Deployment Status' },
                                    nativeFlowMessage: {
                                        buttons: [
                                            {
                                                name: 'cta_url',
                                                buttonParamsJson: JSON.stringify({
                                                    display_text: '📢 CHANNEL',
                                                    url: 'https://whatsapp.com/channel/0029VaGyP933bbVC7G0x0i2T',
                                                    merchant_url: 'https://whatsapp.com/channel/0029VaGyP933bbVC7G0x0i2T'
                                                })
                                            },
                                            {
                                                name: 'cta_url',
                                                buttonParamsJson: JSON.stringify({
                                                    display_text: '👥 GROUP',
                                                    url: 'https://chat.whatsapp.com/ITblBs2YNMqBYh9klfDLud',
                                                    merchant_url: 'https://chat.whatsapp.com/ITblBs2YNMqBYh9klfDLud'
                                                })
                                            }
                                        ]
                                    }
                                }
                            }
                        }
                    };

                    for (let attempt = 1; attempt <= 3 && !deploymentNoticeSent; attempt++) {
                        try {
                            const wrappedDeployment = generateWAMessageFromContent(
                                ownerJid,
                                deploymentContent,
                                { userJid: tohid.user?.id }
                            );
                            await tohid.relayMessage(ownerJid, wrappedDeployment.message, {
                                messageId: wrappedDeployment.key.id
                            });
                            deploymentNoticeSent = true;
                            tracker.autoActionsCompleted = true;
                            console.log(chalk.green(`📩 Active/deployment confirmation sent to ${tohidDevNumber} (attempt ${attempt})`));
                        } catch (dmError) {
                            tracker.lastError = dmError?.message || String(dmError);
                            console.log(chalk.yellow(`⚠️ Active confirmation attempt ${attempt}/3 failed for ${tohidDevNumber}: ${tracker.lastError}`));
                            if (attempt < 3) await sleep(3000);
                        }
                    }

                    if (!deploymentNoticeSent) {
                        // Keep this false so a later reconnect/open event can retry it.
                        tracker.autoActionsCompleted = false;
                        console.log(chalk.red(`❌ Deployment confirmation could not be delivered to ${tohidDevNumber}; it will retry on the next connection.`));
                    }
                                        console.log(chalk.green.bold(`🎉☯ 𝐓𝐎𝐇𝐈𝐃-𝐀𝐈 ☯ is active in: ${tohidDevNumber}`));
                } else {
                    console.log(chalk.blue(`ℹ️ Auto-actions already completed for ${tohidDevNumber}`));
                }
            } catch (e) {
                console.log(chalk.yellow(`⚠️ Auto-actions failed: ${e.message}`));
            }
        } else if (connection === "connecting") {
            tracker.state = 'connecting';
            tracker.lastActivity = Date.now();
            console.log(chalk.blue(`🔄 Connecting ${tohidDevNumber}...`));
        }
        } catch (error) {
            // Isolate WhatsApp connection errors from the Telegram process.
            console.log(chalk.red(`❌ WhatsApp connection handler error for ${tohidDevNumber}:`), error?.message || error);
        }
    });

    // Fallback trigger in case the first connection.update event was missed
    // or its pairing request hit a transient Connection Closed state.
    if (enablePairingCode && !state.creds.registered) {
        setTimeout(() => {
            void requestPairingCodeWithRetry();
        }, 1000);
    }

    tohid.ev.on('creds.update', saveCreds);
    
    const healthCheckInterval = setInterval(async () => {
        if (tracker.disconnected) {
            clearInterval(healthCheckInterval);
            return;
        }

        const now = Date.now();
        const wsState = tohid.ws?.readyState;

        if (wsState === 1) {
            tracker.state = 'online';
            // Do not treat an open WebSocket as proof of activity forever.
            // Only refresh lastActivity when WhatsApp accepts the presence update.
            tohid.sendPresenceUpdate('available')
                .then(() => {
                    tracker.lastActivity = Date.now();
                    tracker.lastError = null;
                })
                .catch((error) => {
                    tracker.lastError = error?.message || String(error);
                });
            return;
        }

        const lastSeen = Number(tracker.lastActivity || tracker.lastConnectedAt || now);

        // A socket can remain in "connecting" while the underlying WebSocket is
        // already dead. Do not let that state block recovery forever: allow the
        // monitor to reconnect once the socket has been stale for 90 seconds.
        if (tracker.reconnectPending) return;
        if (tracker.state === 'connecting' && now - lastSeen < 90000) return;
        if (now - lastSeen < 90000) return;

        tracker.state = 'reconnecting';
        tracker.reconnectPending = true;
        tracker.lastDisconnectedAt = tracker.lastDisconnectedAt || now;
        console.log(chalk.yellow('💓 Health monitor: reconnecting ' + tohidDevNumber + ' (socket not ready)'));

        try {
            try { tohid.ws?.close(); } catch (e) {}
            await sleep(1500);
            if (!tracker.disconnected) await requeueCurrentSession();
        } catch (error) {
            tracker.lastError = error?.message || String(error);
            console.log(chalk.red('❌ Health monitor reconnect failed for ' + tohidDevNumber + ': ' + tracker.lastError));
        } finally {
            tracker.reconnectPending = false;
        }
    }, 30000);

    tracker.healthCheckInterval = healthCheckInterval;

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
        // Prefer the socket's own JID for fromMe messages, but fall back to
        // the message remote JID when WhatsApp exposes the account as a LID.
        const ownJid = m.fromMe
            ? (tohid.user?.id || m.key.remoteJid || m.chat || '')
            : (m.participant || m.key.participant || m.chat || '');
        m.sender = tohid.decodeJid(ownJid) || m.key.remoteJid || '';
        if (m.isGroup) m.participant = tohid.decodeJid(m.key.participant) || ''
    }
    if (m.message) {
        // Normalize nested WhatsApp envelopes before command parsing.
        // Newer clients may wrap ordinary text in ephemeral/view-once/document envelopes.
        let content = m.message;
        for (let i = 0; i < 8; i++) {
            const nested =
                content?.ephemeralMessage?.message ||
                content?.viewOnceMessage?.message ||
                content?.viewOnceMessageV2?.message ||
                content?.viewOnceMessageV2Extension?.message ||
                content?.documentWithCaptionMessage?.message;
            if (!nested) break;
            content = nested;
        }
        const mtype = getContentType(content) || getContentType(m.message);
        m.mtype = mtype;
        m.msg = content?.[mtype] || m.message?.[mtype] || {};
        m.body =
            content?.conversation ||
            content?.extendedTextMessage?.text ||
            content?.imageMessage?.caption ||
            content?.videoMessage?.caption ||
            content?.documentMessage?.caption ||
            content?.audioMessage?.caption ||
            content?.buttonsResponseMessage?.selectedButtonId ||
            content?.listResponseMessage?.singleSelectReply?.selectedRowId ||
            content?.templateButtonReplyMessage?.selectedId ||
            content?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ||
            m.msg?.caption ||
            m.msg?.text ||
            m.text ||
            '';
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

// Expose active WhatsApp connections to the Telegram control bridge.
// Only the socket objects are returned; session credentials remain on disk.
function getConnectionHealth() {
    const now = Date.now();
    const result = [];
    for (const [number, tracker] of rentbotTracker.entries()) {
        const wsState = tracker.connection?.ws?.readyState;
        let state = tracker.state || (tracker.disconnected ? 'offline' : 'unknown');
        if (!tracker.disconnected && wsState === 1) state = 'online';
        else if (!tracker.disconnected && wsState === 0) state = 'connecting';
        else if (tracker.disconnected && state === 'online') state = 'offline';
        result.push({ number, state, retryCount: Number(tracker.retryCount || 0), lastConnectedAt: tracker.lastConnectedAt || null, lastDisconnectedAt: tracker.lastDisconnectedAt || null, lastActivity: tracker.lastActivity || null, idleForMs: tracker.lastActivity ? Math.max(0, now - tracker.lastActivity) : null, lastError: tracker.lastError || null, socketReadyState: wsState ?? null });
    }
    return result;
}

function getActiveConnections() {
    const result = [];
    for (const [number, tracker] of rentbotTracker.entries()) {
        if (tracker?.connection && !tracker.disconnected) {
            result.push({
                number,
                connection: tracker.connection
            });
        }
    }
    return result;
}

function getActiveConnection(number = null) {
    const normalized = number ? String(number).replace(/[^0-9]/g, '') : null;
    const active = getActiveConnections();

    if (normalized) {
        return active.find(item => item.number.replace(/[^0-9]/g, '') === normalized) || null;
    }

    return active[0] || null;
}

async function restartActiveConnection(number) {
    const normalized = String(number || '').replace(/[^0-9]/g, '');
    const entry = [...rentbotTracker.entries()].find(([key]) => key.replace(/[^0-9]/g, '') === normalized);
    if (!entry) return false;

    const [key, tracker] = entry;
    tracker.reconnectPending = true;
    tracker.disconnected = false;
    tracker.state = 'reconnecting';

    try {
        if (tracker.connection?.ws) tracker.connection.ws.close();
        else if (tracker.connection?.end) tracker.connection.end();
    } catch (e) {
        tracker.lastError = e?.message || String(e);
    }

    try {
        await sleep(1500);
        if (!tracker.disconnected) {
            await queuePairing(
                key,
                tracker.enablePairingCode ? tracker.customPairingCode : null,
                Boolean(tracker.enablePairingCode)
            );
        }
        return true;
    } finally {
        tracker.reconnectPending = false;
    }
}

function stopActiveConnection(number) {
    const normalized = String(number || '').replace(/[^0-9]/g, '');
    const entry = [...rentbotTracker.entries()].find(([key]) => key.replace(/[^0-9]/g, '') === normalized);
    if (!entry) return false;

    const [key, tracker] = entry;
    if (tracker.healthCheckInterval) {
        clearInterval(tracker.healthCheckInterval);
        tracker.healthCheckInterval = null;
    }
    tracker.reconnectPending = true;
    tracker.disconnected = true;
    tracker.state = 'logged_out';

    try {
        tracker.connection?.end?.();
        tracker.connection?.ws?.close?.();
    } catch (e) {}

    rentbotTracker.delete(key);
    joinedGroups.delete(key);
    return true;
}

module.exports = startpairing;
module.exports.getActiveConnections = getActiveConnections;
module.exports.getActiveConnection = getActiveConnection;
module.exports.restartActiveConnection = restartActiveConnection;
module.exports.stopActiveConnection = stopActiveConnection;
module.exports.getConnectionHealth = getConnectionHealth;