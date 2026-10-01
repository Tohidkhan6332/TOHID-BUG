const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'channelreact.json');

function load() {
  try {
    if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {}
  return {};
}

function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function pickEmoji(emojis) {
  return emojis[Math.floor(Math.random() * emojis.length)];
}

async function resolveChannelJid(devtrust, input) {
  if (input.includes('@newsletter')) return input;
  if (/^\d{10,}$/.test(input)) return `${input}@newsletter`;

  const linkMatch = input.match(/whatsapp\.com\/channel\/([A-Za-z0-9_-]+)/);
  if (!linkMatch) return null;

  const inviteCode = linkMatch[1];

  try {
    const info = await devtrust.newsletterInfo({ inviteCode });
    if (info?.id) return info.id;
  } catch {}

  try {
    const result = await devtrust.newsletterFollow({ inviteCode });
    if (result?.id) return result.id;
  } catch {}

  return `${inviteCode}@newsletter`;
}

let _jobs = load();
let _attached = false;

// ✅ FIX: Tambah guard + retry kalau ev belum siap
function attach(devtrust) {
  if (_attached) return;

  // Guard: pastikan devtrust dan ev-nya ada
  if (!devtrust || !devtrust.ev || typeof devtrust.ev.on !== 'function') {
    console.warn('[CR] ⚠️ devtrust.ev belum siap, retry dalam 3 detik...');
    setTimeout(() => attach(devtrust), 3000);
    return;
  }

  _attached = true;

  devtrust.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      const jid = msg.key?.remoteJid;
      if (!jid?.includes('@newsletter')) continue;
      if (msg.key?.fromMe) continue;

      const job = _jobs[jid];
      if (!job) continue;

      const msgId = msg.key.id;
      const emoji = pickEmoji(job.emojis);

      setTimeout(async () => {
        try {
          await devtrust.sendMessage(jid, {
            react: {
              text: emoji,
              key: {
                remoteJid: jid,
                id: msgId,
                fromMe: false
              }
            }
          });
          console.log(`[CR] ✅ Reacted ${emoji} → ${jid} | ${msgId}`);
        } catch (e) {
          console.error(`[CR] ❌ Failed: ${e.message}`);
        }
      }, 1000 + Math.random() * 1500);
    }
  });

  console.log('[CR] ✅ Channel React listener attached.');
}

function addJob(jid, emojis) {
  _jobs[jid] = { emojis: emojis.slice(0, 10) };
  save(_jobs);
}

function removeJob(jid) {
  delete _jobs[jid];
  save(_jobs);
}

function listJobs() {
  return _jobs;
}

module.exports = { attach, addJob, removeJob, listJobs, resolveChannelJid };