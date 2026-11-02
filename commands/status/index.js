'use strict';

const { sendRichHtml } = require('../../utils/TohidGenai');
const { pingHtml, aliveHtml, ownerHtml, statusHtml } = require('./status-html');

async function sendPing({ sock, msg, latency }) {
    return sendRichHtml({
        sock, jid: msg.chat, quoted: msg, title: 'TOHID-AI PING',
        html: pingHtml({
            latency: Math.max(0, Number(latency) || 0).toFixed(2),
            mode: sock.public ? 'PUBLIC' : 'PRIVATE',
            nodeVersion: process.version, platform: process.platform,
            timestamp: new Date().toLocaleTimeString()
        })
    });
}

async function sendAlive({ sock, msg, runtime }) {
    return sendRichHtml({
        sock, jid: msg.chat, quoted: msg, title: 'TOHID-AI ALIVE',
        html: aliveHtml({
            uptime: runtime(process.uptime()),
            mode: sock.public ? 'PUBLIC' : 'PRIVATE',
            memory: (process.memoryUsage().rss / 1024 / 1024).toFixed(1) + ' MB RSS',
            version: require('../../package.json').version,
            platform: process.platform,
            timestamp: new Date().toLocaleTimeString()
        })
    });
}

async function sendOwner({ sock, msg, number }) {
    return sendRichHtml({
        sock, jid: msg.chat, quoted: msg, title: 'TOHID-AI OWNER',
        html: ownerHtml({ number, name: 'MR TOHID' })
    });
}

async function sendStatus({ sock, msg, runtime }) {
    return sendRichHtml({
        sock, jid: msg.chat, quoted: msg, title: 'TOHID-AI STATUS',
        html: statusHtml({
            uptime: runtime(process.uptime()),
            mode: sock.public ? 'PUBLIC' : 'PRIVATE',
            memory: (process.memoryUsage().rss / 1024 / 1024).toFixed(1) + ' MB RSS',
            version: require('../../package.json').version,
            platform: process.platform,
            timestamp: new Date().toLocaleTimeString()
        })
    });
}

module.exports = { sendPing, sendAlive, sendOwner, sendStatus };
