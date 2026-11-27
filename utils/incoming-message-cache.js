'use strict';

function createIncomingMessageCache({ getCachedDeleteSession, moment, scheduleDeleteSessionFlush }) {
  if (typeof getCachedDeleteSession !== 'function' || typeof scheduleDeleteSessionFlush !== 'function') {
    throw new TypeError('Incoming message cache dependencies must be functions');
  }
  if (!moment || typeof moment !== 'function') {
    throw new TypeError('A moment-compatible date formatter is required');
  }
  return function cacheIncomingMessage(jid, msg, msgType) {
      try {
          // Skip messages from the bot itself & status broadcast
          if (msg.key?.fromMe) return;
          if (jid === 'status@broadcast') return;
          // Skip types that don't need to be cached
          if (!msg.message || !msgType) return;
          if (msgType === 'protocolMessage' || msgType === 'senderKeyDistributionMessage') return;
  
          // Use in-memory cache — not loading the file on every message (much faster
          // saat spam banyak pesan beruntun, semua diproses di RAM dulu)
          let db = getCachedDeleteSession();
          let sessionIndex = db.findIndex(s => s.sesi === jid);
  
          // Only cache if the session already exists and is active
          // (don't auto-create a new session — avoid caching before antidelete-on)
          if (sessionIndex === -1) return;
  
          const session = db[sessionIndex];
          if (session.Aktif !== 'yes') return;
  
          // Make sure the limit1000 array is valid
          if (!Array.isArray(session.limit1000)) session.limit1000 = [];
  
          // Check for duplicates — don't cache the same message twice
          const alreadyCached = session.limit1000.some(chatObj => {
              const chatKey = Object.keys(chatObj).find(k => k.startsWith('chat'));
              return chatKey && chatObj[chatKey]?.key?.id === msg.key?.id;
          });
          if (alreadyCached) return;
  
          // FIFO — drop the oldest entry once it reaches 1000
          if (session.limit1000.length >= 1000) {
              session.limit1000.shift();
          }
  
          const idx = session.limit1000.length + 1;
          session.limit1000.push({
              [`chat${idx}`]: msg,
              [`date${idx}`]: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss'),
              isDelete: 'no',
              sendAgainAfterDelete: 'no'
          });
  
          session.Datenow = moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss');
  
          // Tulis ke disk secara debounced (auto-flush ~300ms),
          // sehingga banyak pesan beruntun cuma 1x write ke JSON.
          scheduleDeleteSessionFlush();
  
      } catch (e) {
          console.error('[cacheIncomingMessage] Error:', e.message);
      }
  }
}

module.exports = { createIncomingMessageCache };
