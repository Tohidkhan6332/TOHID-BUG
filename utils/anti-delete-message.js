'use strict';

// Message-unwrapping and lookup helpers used by anti-delete handling.
const WRAPPER_TYPES = [
  'ephemeralMessage', 'viewOnceMessage', 'viewOnceMessageV2',
  'viewOnceMessageV2Extension', 'documentWithCaptionMessage',
  'editedMessage', 'botInvokeMessage', 'futureProofMessage',
  'messageContextInfo'
];

function unwrapMessage(content) {
            if (!content || typeof content !== 'object') return content;
            const topKey = Object.keys(content)[0];
            if (!topKey) return content;
            if (WRAPPER_TYPES.includes(topKey)) {
                const inner = content[topKey]?.message || content[topKey];
                if (inner && typeof inner === 'object' && Object.keys(inner).length > 0) {
                    return unwrapMessage(inner); // rekursif
                }
            }
            return content;
        }

function findOriginalMsg(db, jid, msgId) {
    if (!jid || !msgId) return null;

    // 1. Cek in-memory store (paling cepat)
    const storeKey = `${jid}_${msgId}`;
    if (global.msgUpsertStore?.has(storeKey)) {
        return global.msgUpsertStore.get(storeKey);
    }

    // 2. Fallback ke JSON
    if (!Array.isArray(db)) return null;
    const session = db.find(s => s.sesi === jid);
    if (!session || !Array.isArray(session.limit1000)) return null;

    for (const chatObj of session.limit1000) {
        const chatKey = Object.keys(chatObj).find(k => k.startsWith('chat'));
        if (chatKey && chatObj[chatKey]?.key?.id === msgId) {
            return chatObj[chatKey];
        }
    }

    return null;
}

function isAntiDeleteActive(db, jid) {
    if (!jid) return false;
    if (global.antidelete?.[jid] === true) return true;
    if (!Array.isArray(db)) return false;
    const session = db.find(s => s.sesi === jid);
    return session?.Aktif === 'yes';
}

module.exports = { unwrapMessage, findOriginalMsg, isAntiDeleteActive };
