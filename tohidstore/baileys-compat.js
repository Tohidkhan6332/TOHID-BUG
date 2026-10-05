'use strict';

/**
 * CommonJS compatibility bridge for the ESM-only PouCode Baileys fork.
 * The application remains CommonJS while Baileys is loaded through Jiti.
 */
const { createJiti } = require('jiti');

const jiti = createJiti(__filename);
const baileys = jiti('@xbibzlibrary/whatsbibz');

if (!baileys.makeCacheableSignalKeyStore) {
    baileys.makeCacheableSignalKeyStore = (keys) => keys;
}

module.exports = baileys;
