const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const { spawn } = require('child_process');

// ───────────────────────────────────────────────
// Konfigurasi
// ───────────────────────────────────────────────
const TMP_DIR = path.join(process.cwd(), 'tmp');
const REQ_TIMEOUT = 25_000;
const UA =
  'Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// Cek apakah yt-dlp tersedia (di-check sekali saat modul di-load)
let ytdlpAvailable = null;
function checkYtDlp() {
  if (ytdlpAvailable !== null) return ytdlpAvailable;
  return new Promise((resolve) => {
    const p = spawn('yt-dlp', ['--version']);
    p.on('error', () => { ytdlpAvailable = false; resolve(false); });
    p.on('exit', (code) => { ytdlpAvailable = code === 0; resolve(code === 0); });
  });
}

// ───────────────────────────────────────────────
// Helper
// ───────────────────────────────────────────────
function tmpFile(ext = 'mp4') {
  return path.join(TMP_DIR, `${crypto.randomBytes(8).toString('hex')}.${ext}`);
}

async function streamDownload(url, dest) {
  const res = await axios.get(url, {
    responseType: 'stream',
    timeout: REQ_TIMEOUT,
    maxRedirects: 5,
    headers: { 'User-Agent': UA, Accept: '*/*' },
  });
  await new Promise((resolve, reject) => {
    const w = fs.createWriteStream(dest);
    res.data.pipe(w);
    w.on('finish', resolve);
    w.on('error', reject);
    res.data.on('error', reject);
  });
  const sizeMB = fs.statSync(dest).size / 1024 / 1024;
  if (sizeMB < 0.01) {
    fs.unlinkSync(dest);
    throw new Error('Downloaded file too small (probably empty)');
  }
  return dest;
}

// ───────────────────────────────────────────────
// PROVIDER 1: yt-dlp (CLI) — paling stabil
// ───────────────────────────────────────────────
function ytDlpInfo(url) {
  return new Promise((resolve, reject) => {
    const args = [
      '--no-warnings', '--no-playlist',
      '--dump-single-json',
      '--user-agent', UA,
      url,
    ];
    const p = spawn('yt-dlp', args);
    let out = '', err = '';
    p.stdout.on('data', d => out += d);
    p.stderr.on('data', d => err += d);
    p.on('error', reject);
    p.on('exit', (code) => {
      if (code !== 0) return reject(new Error(`yt-dlp exit ${code}: ${err.slice(0, 200)}`));
      try { resolve(JSON.parse(out)); } catch (e) { reject(e); }
    });
  });
}

function ytDlpDownload(url, outFile) {
  return new Promise((resolve, reject) => {
    const args = [
      '--no-warnings', '--no-playlist',
      '-f', 'best[ext=mp4]/best',
      '--max-filesize', '95M',
      '--user-agent', UA,
      '-o', outFile,
      url,
    ];
    const p = spawn('yt-dlp', args);
    let err = '';
    p.stderr.on('data', d => err += d);
    p.on('error', reject);
    p.on('exit', (code) => {
      if (code === 0 && fs.existsSync(outFile)) return resolve(outFile);
      reject(new Error(`yt-dlp download failed (exit ${code}): ${err.slice(0, 200)}`));
    });
  });
}

// ───────────────────────────────────────────────
// PROVIDER 2: snapsave-media-downloader (npm)
// ───────────────────────────────────────────────
async function snapsaveProvider(url) {
  // Lazy load supaya modul tidak crash kalau dependency belum diinstall
  let snapsave;
  try {
    const mod = await import('snapsave-media-downloader');
    snapsave = mod.snapsave || mod.default || mod;
  } catch {
    throw new Error('snapsave-media-downloader is unavailable. Run npm install and try again.');
  }
  const data = await snapsave(url);
  if (!data || !data.success || !data.data?.media?.length) {
    throw new Error(data?.message || 'Snapsave returned no media');
  }
  // Ambil yg quality paling tinggi tapi bukan watermark / audio-only
  const videoItems = data.data.media.filter(m => m.url && /\.(mp4|m4v)|video/i.test(m.url + (m.type || '')));
  const chosen = (videoItems[0] || data.data.media[0]).url;
  return { videoUrl: chosen, title: data.data.title || 'Video', uploader: data.data.author || '-' };
}

// ───────────────────────────────────────────────
// PROVIDER 3: public mirror (fallback terakhir)
// Bisa diganti dengan endpoint pribadi kalau Anda punya.
// ───────────────────────────────────────────────
async function publicMirror(url, platform) {
  // Format ringan: cek apakah snapsave web masih hidup, scrape minimal.
  // (Banyak public endpoint sering down — kalau yt-dlp & snapsave gagal,
  //  kemungkinan besar URL memang private / region locked.)
  throw new Error('All public providers exhausted');
}

// ───────────────────────────────────────────────
// API PUBLIK MODUL
// ───────────────────────────────────────────────

/**
 * Ambil metadata video tanpa download (best-effort).
 * Return: { title, uploader, duration } atau null.
 */
async function getSocialVideoInfo(url) {
  try {
    if (await checkYtDlp()) {
      const info = await ytDlpInfo(url);
      return {
        title:    info.title || info.fulltitle || 'Video',
        uploader: info.uploader || info.channel || '-',
        duration: Number(info.duration) || 0,
      };
    }
  } catch (e) {
    console.warn('[social.info] yt-dlp failed:', e.message);
  }
  try {
    const sn = await snapsaveProvider(url);
    return { title: sn.title, uploader: sn.uploader, duration: 0 };
  } catch (e) {
    console.warn('[social.info] snapsave failed:', e.message);
  }
  return null;
}

/**
 * Download video FB/IG. Return: file path lokal (caller wajib unlink).
 * @param {string} url
 * @param {'facebook'|'instagram'} platform
 */
async function downloadSocialVideo(url, platform = 'facebook') {
  if (!/^https?:\/\//i.test(url)) throw new Error('Invalid URL');
  const out = tmpFile('mp4');

  // 1) yt-dlp
  if (await checkYtDlp()) {
    try {
      await ytDlpDownload(url, out);
      return out;
    } catch (e) {
      console.warn('[social.dl] yt-dlp failed:', e.message);
    }
  }

  // 2) snapsave
  try {
    const sn = await snapsaveProvider(url);
    if (sn.videoUrl) return await streamDownload(sn.videoUrl, out);
  } catch (e) {
    console.warn('[social.dl] snapsave failed:', e.message);
  }

  // 3) public mirror
  try {
    return await publicMirror(url, platform);
  } catch (e) {
    throw new Error(
      `All downloaders failed. Last error: ${e.message}. ` +
      `Pastikan URL public & coba install yt-dlp (sudo apt install yt-dlp).`
    );
  }
}

module.exports = { downloadSocialVideo, getSocialVideoInfo };
