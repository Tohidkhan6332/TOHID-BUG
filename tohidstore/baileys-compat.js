'use strict';

// TOHID-AI uses the PouCode Baileys build because it contains the
// WhatsApp rich-response schema required by the interactive HTML games.
// Keeping one Baileys implementation for the socket + message builders is
// important; mixing proto objects from different Baileys builds can make
// relayMessage silently reject/drop the rich message.
const baileys = require('@whiskeysockets/baileys');

if (!baileys.makeCacheableSignalKeyStore) {
    baileys.makeCacheableSignalKeyStore = (keys) => keys;
}

module.exports = baileys;
