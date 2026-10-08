'use strict';

const axios = require('axios');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36';

async function jsonGet(url, params = {}, timeout = 60000) {
  const r = await axios.get(url, { params, timeout, headers: { 'User-Agent': UA, Accept: 'application/json, text/plain, */*' }, validateStatus: () => true });
  if (r.status < 200 || r.status >= 300) throw new Error('HTTP ' + r.status);
  if (typeof r.data === 'string' && /^\s*</.test(r.data)) throw new Error('Provider returned HTML');
  return r.data;
}

function urls(value, out = []) {
  if (!value) return out;
  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value)) out.push(value);
    return out;
  }
  if (Array.isArray(value)) { for (const x of value) urls(x, out); return out; }
  if (typeof value === 'object') { for (const x of Object.values(value)) urls(x, out); }
  return out;
}

function firstMedia(data) {
  const all = urls(data);
  const preferred = all.filter(u => !/thumbnail|avatar|profile|\.jpg(?:[?&]|$)|\.jpeg(?:[?&]|$)|\.png(?:[?&]|$)/i.test(u));
  return preferred.find(u => /\.mp4(?:[?&]|$)|video|download|media/i.test(u)) || preferred[0] || null;
}

async function facebook(url) {
  const providers = [
    ['eliteprotech', () => jsonGet('https://eliteprotech-apis.zone.id/download/facebook', { url }, 30000)],
    ['prexzy', () => jsonGet('https://prexzyapis.com/download/facebook', { url }, 30000)],
    ['prexzy-v2', () => jsonGet('https://prexzyapis.com/download/facebookv2', { url }, 30000)],
    ['maher', () => jsonGet('https://api.maher-zubair.tech/download/facebook', { url }, 25000)],
    ['siputzx', () => jsonGet('https://api.siputzx.my.id/api/d/facebook', { url }, 25000)],
    ['vreden', () => jsonGet('https://api.vreden.my.id/api/facebook', { url }, 25000)],
  ];
  let last;
  for (const [name, fn] of providers) {
    try { const data = await fn(); const media = firstMedia(data); if (media) return { media, provider: name, data }; }
    catch (e) { last = e; console.error('[TOHID-AI FB]', name, e.message); }
  }
  throw last || new Error('All Facebook providers failed');
}

async function instagram(url) {
  const providers = [
    ['instagram-page', async () => {
      const r = await axios.get(url, { timeout: 25000, headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' } });
      const html = String(r.data || '');
      const m = html.match(/<meta[^>]+(?:property|name)=["']og:video["'][^>]+content=["']([^"']+)/i)
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:video/i);
      if (!m) throw new Error('No public video metadata');
      return m[1].replace(/&amp;/g, '&');
    }],
    ['vercel', async () => {
      const d = await jsonGet('https://instagram-reels-downloader-tau.vercel.app/api/video', { postUrl: url, url, enhanced: 'true' }, 40000);
      return d?.data?.videoUrl || d?.data?.medias?.find(x => x?.url)?.url;
    }],
    ['reel-api', async () => {
      const d = await jsonGet('https://instagram-reel-api.onrender.com/', { url }, 55000);
      return d?.download_link;
    }],
    ['alwayscodex', async () => {
      const r = await axios.post('https://api.alwayscodex.eu.cc/api/downloader/allinone', { url }, { timeout: 40000, headers: { 'Content-Type': 'application/json', 'User-Agent': UA } });
      return firstMedia(r.data);
    }],
  ];
  let last;
  for (const [name, fn] of providers) {
    try { const media = await fn(); if (media) return { media, provider: name }; }
    catch (e) { last = e; console.error('[TOHID-AI IG]', name, e.message); }
  }
  throw last || new Error('All Instagram providers failed');
}

async function tiktok(url) {
  const providers = [
    ['alwayscodex', async () => {
      const r = await axios.post('https://api.alwayscodex.eu.cc/api/downloader/tiktokv2', { url }, { timeout: 40000, headers: { 'Content-Type': 'application/json', 'User-Agent': UA } });
      return firstMedia(r.data);
    }],
    ['tiklydown', async () => {
      const d = await jsonGet('https://api.tiklydown.eu.org/api/download', { url }, 40000);
      return firstMedia(d);
    }],
    ['prexzy', async () => {
      const d = await jsonGet('https://prexzyapis.com/download/tiktok', { url }, 30000);
      return firstMedia(d);
    }],
  ];
  let last;
  for (const [name, fn] of providers) {
    try { const media = await fn(); if (media) return { media, provider: name }; }
    catch (e) { last = e; console.error('[TOHID-AI TT]', name, e.message); }
  }
  throw last || new Error('All TikTok providers failed');
}

function youtubeId(url) {
  try { const u = new URL(url); return u.hostname === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v') || u.pathname.match(/\/(?:shorts|embed|live)\/([^/]+)/)?.[1]; }
  catch { return null; }
}

async function youtube(url) {
  const providers = [
    ['official-hector', () => jsonGet('https://yt-dl.officialhectormanuel.workers.dev/', { url })],
    ['david-cyril', () => jsonGet('https://apis.davidcyril.name.ng/download/ytmp4', { url })],
    ['eliteprotech', () => jsonGet('https://eliteprotech-apis.zone.id/ytmp4', { url })],
    ['agatz', () => jsonGet('https://api.agatz.xyz/api/ytmp4', { url })],
    ['prexzy', () => jsonGet('https://prexzyapis.com/download/youtube-video', { url })],
  ];
  let last;
  for (const [name, fn] of providers) {
    try { const d = await fn(); const media = firstMedia(d); if (media) return { media, provider: name }; }
    catch (e) { last = e; console.error('[TOHID-AI YT]', name, e.message); }
  }
  throw last || new Error('All YouTube providers failed');
}

async function play(query) {
  const providers = [
    ['david-cyril', () => jsonGet('https://apis.davidcyril.name.ng/play', { query })],
    ['prexzy', () => jsonGet('https://prexzyapis.com/download/youtube-music', { query })],
  ];
  let last;
  for (const [name, fn] of providers) {
    try {
      const d = await fn();
      const result = d?.result || d?.data || d;
      const media = result?.download_url || result?.downloadUrl || firstMedia(result);
      if (media) return { media, provider: name, data: result };
    } catch (e) { last = e; console.error('[TOHID-AI PLAY]', name, e.message); }
  }
  throw last || new Error('All music providers failed');
}

module.exports = { facebook, instagram, tiktok, youtube, play };
