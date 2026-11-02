'use strict';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const css = `*{box-sizing:border-box}body{margin:0;padding:10px;background:#071018;color:#eef;font-family:Arial,sans-serif}.card{max-width:430px;margin:auto;padding:18px;border:1px solid rgba(255,255,255,.14);border-radius:22px;background:linear-gradient(145deg,#111827,#172b3b);box-shadow:0 18px 45px rgba(0,0,0,.35)}.brand{display:flex;align-items:center;gap:10px}.logo{width:42px;height:42px;display:grid;place-items:center;border-radius:14px;background:linear-gradient(135deg,#22c55e,#0ea5e9);font-size:22px}.eyebrow{font:10px monospace;letter-spacing:2px;color:#93c5fd}.title{margin:3px 0 0;font-size:24px;font-weight:900;color:#f8fafc}.subtitle{margin:16px 0 10px;color:#cbd5e1;font-size:13px;line-height:1.5}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.metric{padding:11px;border:1px solid rgba(255,255,255,.09);border-radius:13px;background:rgba(255,255,255,.055)}.label{font:9px monospace;letter-spacing:1px;color:#94a3b8}.value{margin-top:4px;font-size:15px;font-weight:800;color:#f8fafc;word-break:break-word}.ok{color:#86efac}.accent{color:#fcd34d}.line{height:1px;margin:15px 0;background:rgba(255,255,255,.1)}.footer{font:10px monospace;color:#94a3b8;text-align:center}.link{display:block;margin-top:8px;padding:11px;border-radius:12px;background:rgba(14,165,233,.18);color:#bae6fd;text-decoration:none;font-weight:800;text-align:center}.owner{background:linear-gradient(145deg,#21152f,#132b3d)}.crown{font-size:38px}.owner-name{font-size:25px;font-weight:900;color:#fde68a}.small{font-size:12px;color:#cbd5e1}`;

function card({ icon, eyebrow, title, subtitle, body, footer = '© TOHID-AI · Professional Bot System', className = '' }) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><section class="card ${className}"><div class="brand"><div class="logo">${icon}</div><div><div class="eyebrow">${escapeHtml(eyebrow)}</div><div class="title">${escapeHtml(title)}</div></div></div>${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}${body}<div class="line"></div><div class="footer">${escapeHtml(footer)}</div></section></body></html>`;
}

function metric(label, value, tone = '') {
  return `<div class="metric"><div class="label">${escapeHtml(label)}</div><div class="value ${tone}">${escapeHtml(value)}</div></div>`;
}

function pingHtml({ latency, mode, nodeVersion, platform, timestamp }) {
  return card({
    icon: '⚡',
    eyebrow: 'TOHID-AI · LIVE DIAGNOSTICS',
    title: 'Pong — System Online',
    subtitle: 'Real-time connection check completed successfully. All primary bot services are responding.',
    body: `<div class="grid">${metric('RESPONSE TIME', `${latency} ms`, 'ok')}${metric('BOT MODE', mode, 'accent')}${metric('RUNTIME', 'Node.js', 'ok')}${metric('PLATFORM', platform)}${metric('ENGINE', nodeVersion)}${metric('CHECKED AT', timestamp)}</div>`,
  });
}

function aliveHtml({ uptime, mode, memory, version, platform, timestamp }) {
  return card({
    icon: '🟢',
    eyebrow: 'TOHID-AI · SERVICE MONITOR',
    title: 'Bot Is Alive',
    subtitle: 'The bot is active, connected and ready to process your commands.',
    body: `<div class="grid">${metric('UPTIME', uptime, 'ok')}${metric('STATUS', 'OPERATIONAL', 'ok')}${metric('MODE', mode, 'accent')}${metric('VERSION', version)}${metric('MEMORY', memory)}${metric('PLATFORM', platform)}${metric('LAST CHECK', timestamp)}</div>`,
  });
}

function ownerHtml({ number, name, telegram, channel }) {
  const wa = `https://wa.me/${encodeURIComponent(number)}`;
  return card({
    icon: '👑',
    eyebrow: 'TOHID-AI · OFFICIAL CONTACT',
    title: 'Owner & Support',
    subtitle: '<span class="crown">👑</span><br><span class="owner-name">' + escapeHtml(name) + '</span><br><span class="small">Official developer and support contact</span>',
    className: 'owner',
    body: `${metric('WHATSAPP', `+${number}`, 'accent')}<a class="link" href="${wa}">💬 Contact on WhatsApp</a><a class="link" href="${escapeHtml(telegram)}">✈️ Telegram Support</a><a class="link" href="${escapeHtml(channel)}">📢 Official Channel</a>`,
    footer: 'For support, feature requests and bot assistance',
  });
}

module.exports = { escapeHtml, pingHtml, aliveHtml, ownerHtml };
