'use strict';

const crypto = require('crypto');
const { generateWAMessageFromContent, proto } = require('../../tohidstore/baileys-compat');

function gameHtml(state = {}) {
    const score = Number(state.score || 0);
    const best = Number(state.best || 0);
    const streak = Number(state.streak || 0);
    const level = Number(state.level || 1);
    const lane = Math.max(0, Math.min(2, Number(state.lane ?? 1)));
    const message = String(state.message || 'Use the buttons below to start the run');
    const playerLeft = ['18%','50%','82%'][lane];
    const running = Boolean(state.running);
    const entities = Array.isArray(state.entities) ? state.entities : [];
    const entityHtml = entities.map(e => {
        const good = e.type === 'orb';
        const left = ['18%','50%','82%'][Math.max(0, Math.min(2, Number(e.lane || 0)))];
        return '<div class="entity '+(good?'orb':'rock')+'" style="left:'+left+';top:'+Math.max(15,Math.min(205,Number(e.top||80)))+'px">'+(good?'✦':'☠')+'</div>';
    }).join('');
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{box-sizing:border-box}html,body{margin:0;width:100%;overflow:hidden;background:transparent;font-family:Arial,sans-serif}body{padding:5px;background:radial-gradient(circle at 50% 8%,#3d174f,#10091b 68%)}.card{position:relative;padding:10px;border:2px solid #a65bdd;border-radius:22px;background:linear-gradient(145deg,#190d2e,#32134b 48%,#110818);color:#f1dcff;box-shadow:inset 0 0 0 3px #39155b,0 8px 18px #000b}.glow{height:7px;margin:0 18px 6px;border-radius:8px;background:repeating-linear-gradient(90deg,#70f0ff 0 8px,#35104b 8px 16px);box-shadow:0 0 12px #b55dff}.title{text-align:center;color:#f7d7ff;font:bold 22px Impact,Arial Black,sans-serif;letter-spacing:1px;text-shadow:0 0 10px #db63ff,0 2px #64118a}.sub{text-align:center;margin:1px 0 7px;color:#d8a9ef;font:11px monospace}.stats{display:flex;gap:5px;margin-bottom:7px}.stat{flex:1;padding:5px 2px;text-align:center;border:1px solid #713f95;border-radius:8px;background:#10091a;color:#bb8dce;font:bold 9px monospace}.stat b{display:block;margin-top:2px;color:#fff1ff;font-size:15px}.arena{position:relative;height:260px;overflow:hidden;border:3px solid #713f95;border-radius:14px;background:linear-gradient(#081529,#091d28 70%,#170c28);box-shadow:inset 0 0 28px #000,inset 0 -30px 30px #4b177044}.lanes{position:absolute;inset:0;display:grid;grid-template-columns:repeat(3,1fr)}.lane{border-right:1px solid #40b7c933;background:linear-gradient(90deg,transparent,#46d6dd0b 50%,transparent)}.lane:last-child{border:0}.grid{position:absolute;inset:0;background:linear-gradient(#6cecff16 1px,transparent 1px),linear-gradient(90deg,#6cecff12 1px,transparent 1px);background-size:100% 26px,33.33% 100%;opacity:.7}.hud{position:absolute;z-index:3;top:8px;left:10px;right:10px;display:flex;justify-content:space-between;color:#d4f9ff;font:bold 10px monospace;text-shadow:0 0 6px #47dfff}.entity{position:absolute;z-index:2;display:grid;place-items:center;width:42px;height:42px;transform:translateX(-50%);font-size:28px;filter:drop-shadow(0 0 6px #ff3cdb)}#player{bottom:18px;left:${playerLeft};font-size:34px}.rock{color:#ff658d}.orb{color:#fff37a;filter:drop-shadow(0 0 9px #ffe866)}.message{height:32px;margin:7px 2px 0;display:grid;place-items:center;border:1px solid #70458e;border-radius:8px;background:#0d0915;color:#f0c7ff;font:bold 12px monospace;text-shadow:0 0 7px #b454ff}.status{text-align:center;margin:6px 0 0;color:#b990c9;font:10px monospace}
</style></head><body><div class="card"><div class="glow"></div><div class="title">CURSED DASH</div><div class="sub">SURVIVE THE CURSE · COLLECT THE ORBS</div><div class="stats"><div class="stat">SCORE<b>${score}</b></div><div class="stat">BEST<b>${best}</b></div><div class="stat">STREAK<b>${streak}</b></div></div><div class="arena"><div class="lanes"><div class="lane"></div><div class="lane"></div><div class="lane"></div></div><div class="grid"></div><div class="hud"><span>LEVEL ${level}</span><span>SPEED ${(1+(level-1)*.15).toFixed(1)}x</span></div>${entityHtml}<div class="entity" id="player">🐺</div></div><div class="message">${message}</div><div class="status">${running ? 'RUNNING · use the buttons below' : 'Use START / LEFT / DASH / RIGHT buttons'}</div></div></body></html>`;
}

async function sendRichGame({ sock, jid, quoted, state }) {
    const data = Buffer.from(JSON.stringify({
        __typename: 'GenAIUnifiedResponse',
        response_id: crypto.randomUUID(),
        sections: [{
            __typename: 'GenAIUnifiedResponseSection',
            view_model: {
                __typename: 'GenAISingleLayoutViewModel',
                primitive: {
                    __typename: 'FOAHtmlPrimitiveDemoDONOTUSE',
                    trusted_sources: [],
                    payload: gameHtml(state),
                },
            },
        }],
    })).toString('base64');
    const quotedContext = quoted?.key ? {
        stanzaId: quoted.key.id,
        participant: quoted.key.participant || quoted.participant || quoted.key.remoteJid,
        quotedMessage: quoted.message,
    } : {};
    const content = proto.Message.fromObject({
        messageContextInfo: {
            threadId: [],
            deviceListMetadata: {
                senderKeyIndexes: [],
                recipientKeyIndexes: [],
                recipientKeyHash: '',
                recipientTimestamp: Math.floor(Date.now() / 1000),
            },
            deviceListMetadataVersion: 2,
            messageSecret: crypto.randomBytes(32),
        },
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    messageType: 1,
                    submessages: [],
                    unifiedResponse: { data },
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' },
                        forwardOrigin: 4,
                        ...quotedContext,
                    },
                },
            },
        },
    });
    const wrapped = generateWAMessageFromContent(jid, content, { userJid: sock.user?.id, quoted });
    await sock.relayMessage(jid, wrapped.message, { messageId: wrapped.key.id });
    return wrapped;
}

const sessions = new Map();

function getSession(jid) {
    if (!sessions.has(jid)) sessions.set(jid, { score: 0, best: 0, streak: 0, level: 1, lane: 1, running: false, message: 'Use START to enter the cursed zone', entities: [] });
    return sessions.get(jid);
}

function buttons() {
    return [
        { buttonId: '.cursedash left', buttonText: { displayText: '◀ LEFT' }, type: 1 },
        { buttonId: '.cursedash dash', buttonText: { displayText: '◆ DASH' }, type: 1 },
        { buttonId: '.cursedash right', buttonText: { displayText: 'RIGHT ▶' }, type: 1 },
        { buttonId: '.cursedash start', buttonText: { displayText: '🚀 START / STOP' }, type: 1 }
    ];
}

async function render(sock, from, msg, state) {
    await sendRichGame({ sock, jid: from, quoted: msg, state });
    await sock.sendMessage(from, {
        text: '🎮 CURSED DASH\n\n' + state.message + '\n\nUse the buttons to play.',
        footer: 'TOHID-AI · CURSED DASH',
        buttons: buttons(),
        headerType: 1
    }, { quoted: msg });
}

module.exports = {
    name: 'cursedash',
    aliases: ['dashgame', 'cursedashgame', 'ninjadash'],
    description: 'Play Cursed Dash with WhatsApp controls',
    category: 'games',
    async execute({ sock, msg, from, reply, args }) {
        try {
            const state = getSession(from);
            const action = String(args?.[0] || '').toLowerCase();

            if (!action) {
                state.message = 'Tap START to enter the cursed zone';
                return render(sock, from, msg, state);
            }

            if (action === 'start' || action === 'stop') {
                if (state.running) {
                    state.running = false;
                    state.message = 'Run ended — score ' + state.score + ' · tap START to try again';
                } else {
                    state.running = true;
                    state.score = 0;
                    state.streak = 0;
                    state.level = 1;
                    state.lane = 1;
                    state.entities = [];
                    state.message = 'Run started — dodge the curse';
                }
                return render(sock, from, msg, state);
            }

            if (!state.running) {
                state.message = 'Start the game first';
                return render(sock, from, msg, state);
            }

            if (action === 'left') state.lane = Math.max(0, state.lane - 1);
            else if (action === 'right') state.lane = Math.min(2, state.lane + 1);
            else if (action === 'dash') {
                state.score += 10;
                state.message = 'DASH BONUS +10';
            } else {
                state.message = 'Use LEFT, DASH, RIGHT or START';
                return render(sock, from, msg, state);
            }

            const spawn = Math.random() < 0.55;
            if (spawn) {
                const lane = Math.floor(Math.random() * 3);
                const good = Math.random() < 0.34;
                const hit = lane === state.lane;
                if (hit && !good) {
                    state.streak = 0;
                    state.score = Math.max(0, state.score - 30);
                    state.message = 'CURSE HIT — keep moving';
                } else if (hit && good) {
                    state.score += 25 * state.level;
                    state.streak += 1;
                    state.message = 'ORBITAL ENERGY +' + (25 * state.level);
                } else if (good) {
                    state.score += 5;
                    state.streak += 1;
                    state.message = 'ORB COLLECTED +5';
                }
                state.entities = [{ lane, type: good ? 'orb' : 'rock', top: 125 }];
            }

            state.score += 1;
            state.level = 1 + Math.floor(state.score / 250);
            state.best = Math.max(state.best, state.score);
            return render(sock, from, msg, state);
        } catch (error) {
            console.error('[CURSEDASH]', error);
            return reply('❌ Cursed Dash error: ' + error.message);
        }
    },
};