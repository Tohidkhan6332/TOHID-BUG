'use strict';

// Compatibility bridge: the HTML rich-game transport uses the same
// Baileys fork/version as SUKUNA_MD (2.8.8).
const baileys = require('@pasqua-baileys/baileys');

if (!baileys.makeCacheableSignalKeyStore) {
    baileys.makeCacheableSignalKeyStore = (keys) => keys;
}

module.exports = baileys;
