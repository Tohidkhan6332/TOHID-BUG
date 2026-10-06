'use strict';

const { createJiti } = require('jiti');
const jiti = createJiti(__filename);
const baileys = jiti('@whiskeysockets/baileys');

if (!baileys.makeCacheableSignalKeyStore) {
    baileys.makeCacheableSignalKeyStore = (keys) => keys;
}

module.exports = baileys;
