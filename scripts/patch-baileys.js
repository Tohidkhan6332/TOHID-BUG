'use strict';

const fs = require('fs');
const path = require('path');

function resolveBaileysFile(relativePath) {
  const candidates = [
    path.join(process.cwd(), 'node_modules', '@whiskeysockets', 'baileys', 'lib', relativePath),
    path.join(process.cwd(), 'node_modules', '@poucode', 'baileys', 'lib', relativePath),
  ];
  return candidates.find(file => fs.existsSync(file)) || null;
}

function patchFile(relativePath, replacements) {
  const file = resolveBaileysFile(relativePath);
  if (!file) throw new Error('Baileys file not found: ' + relativePath);

  let source = fs.readFileSync(file, 'utf8');
  let changed = false;

  for (const [from, to] of replacements) {
    if (source.includes(from)) {
      source = source.split(from).join(to);
      changed = true;
    }
  }

  fs.writeFileSync(file, source, 'utf8');
  return { file, changed };
}

const validate = patchFile('Utils/validate-connection.js', [
  ['passive: true,', 'passive: false,'],
  ['        // TODO: investigate (hard set as false atm)\n        lidDbMigrated: false', ''],
  ['        lidDbMigrated: false', '']
]);

const socket = patchFile('Socket/socket.js', [
  ['await noise.finishInit();', 'noise.finishInit();']
]);

console.log('[BAILEYS PATCH] validate-connection:', validate.changed ? 'patched' : 'already patched');
console.log('[BAILEYS PATCH] socket handshake timing:', socket.changed ? 'patched' : 'already patched');
