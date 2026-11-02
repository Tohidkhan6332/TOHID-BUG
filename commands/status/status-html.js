'use strict';

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const css = `
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:#071018;color:#eef2ff;font-family:Arial,Helvetica,sans-serif}
body{padding:12px}
.card{width:100%;max-width:460px;margin:0 auto;padding:20px;border:1px solid rgba(148,163,184,.22);border-radius:22px;background:linear-gradient(145deg,#101827 0%,#172b3b 55%,#102332 100%);box-shadow:0 18px 45px rgba(0,0,0,.38)}
.brand{display:flex;align-items:center;gap:12px}
.logo{width:48px;height:48px;display:grid;place-items:center;border-radius:15px;background:linear-gradient(135deg,#22c55e,#0ea5e9);font-size:24px}
.eyebrow{font:700 10px monospace;letter-spacing:1.8px;color:#93c5fd}
.title{margin:4px 0 0;font-size:23px;line-height:1.2;font-weight:900;color:#f8fafc}
.subtitle{margin:17px 0 13px;color:#cbd5e1;font-size:13px;line-height:1.6}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
.metric{min-width:0;padding:12px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(255,255,255,.055)}
.label{font:700 9px monospace;letter-spacing:1px;color:#94a3b8}
.value{margin-top:6px;font-size:15px;line-height:1.35;font-weight:800;color:#f8fafc;overflow-wrap:anywhere}
.ok{color:#86efac}.accent{color:#fcd34d}
.line{height:1px;margin:17px 0;background:rgba(255,255,255,.12)}
.footer{font:10px monospace;line-height:1.5;color:#94a3b8;text-align:center}
`;

function metric(label, value, tone = '') {
  return `<div class="metric"><div class="label">${escapeHtml(label)}</div><div class="value ${escapeHtml(tone)}">${escapeHtml(value)}</div></div>`;
}

function card(icon, eyebrow, title, subtitle, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><style>${css}</style></head><body><main class="card"><header class="brand"><div class="logo">${escapeHtml(icon)}</div><div><div class="eyebrow">${escapeHtml(eyebrow)}</div><h1 class="title">${escapeHtml(title)}</h1></div></header><div class="subtitle">${subtitle}</div>${body}<div class="line"></div><footer class="footer">© TOHID-AI · Professional Bot System</footer></main></body></html>`;
}

function pingHtml({ latency = '—', mode = 'UNKNOWN', nodeVersion = process.version, platform = process.platform, timestamp = new Date().toLocaleTimeString() } = {}) {
  const ms = Number(latency);
  const tone = Number.isFinite(ms) && ms < 500 ? 'ok' : 'accent';
  const status = Number.isFinite(ms) ? (ms < 500 ? 'EXCELLENT' : ms < 1000 ? 'GOOD' : 'SLOW') : 'CHECKED';
  return card('⚡', 'TOHID-AI · LIVE DIAGNOSTICS', 'Pong — System Online', 'WhatsApp command received and processed successfully.', `<div class="grid">${metric('RESPONSE TIME', latency + ' ms', tone)}${metric('CONNECTION', status, 'ok')}${metric('BOT MODE', mode, 'accent')}${metric('RUNTIME', 'Node.js', 'ok')}${metric('NODE VERSION', nodeVersion)}${metric('PLATFORM', platform)}${metric('CHECKED AT', timestamp)}</div>`);
}

function aliveHtml({ uptime = '—', mode = 'UNKNOWN', memory = '—', version = '—', platform = process.platform, timestamp = new Date().toLocaleTimeString() } = {}) {
  return card('🟢', 'TOHID-AI · SERVICE MONITOR', 'Bot Is Alive', 'The WhatsApp bot process is running and ready to handle commands.', `<div class="grid">${metric('UPTIME', uptime, 'ok')}${metric('SERVICE STATUS', 'OPERATIONAL', 'ok')}${metric('BOT MODE', mode, 'accent')}${metric('VERSION', version)}${metric('MEMORY USAGE', memory)}${metric('PLATFORM', platform)}${metric('LAST CHECK', timestamp)}</div>`);
}

module.exports = { pingHtml, aliveHtml };
