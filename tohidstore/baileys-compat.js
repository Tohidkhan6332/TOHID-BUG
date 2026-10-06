'use strict';

/**
 * CommonJS compatibility bridge for the ESM-only PouCode Baileys fork.
 * The application remains CommonJS while Baileys is loaded through Jiti.
 */
const baileys = require('@pasqua-baileys/baileys');

if (!baileys.makeCacheableSignalKeyStore) {
    baileys.makeCacheableSignalKeyStore = (keys) => keys;
}

module.exports = baileys;
