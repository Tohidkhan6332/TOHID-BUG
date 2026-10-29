'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const axios = require('axios');
const FileType = require('file-type');

const MAX_AUDIO_BYTES = 60 * 1024 * 1024;
const MIN_AUDIO_BYTES = 4096;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36';

function isAudioContentType(value) {
    return /^audio\//i.test(String(value || '')) || /mpeg|mp3|ogg|opus|webm|wav|aac|mp4/i.test(String(value || ''));
}

function looksLikeAudio(buffer, detected, contentType) {
    if (!Buffer.isBuffer(buffer) || buffer.length < MIN_AUDIO_BYTES) return false;
    if (detected?.mime && /^audio\//i.test(detected.mime)) return true;
    if (['audio/mp4', 'audio/x-m4a', 'video/mp4', 'application/mp4'].includes(detected?.mime)) return true;
    if (buffer.subarray(0, 3).toString('ascii') === 'ID3') return true;
    // MPEG audio frame sync; this also catches MP3 files without an ID3 tag.
    if (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) return true;
    return isAudioContentType(contentType);
}

function runFfmpeg(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        const child = spawn('ffmpeg', [
            '-hide_banner', '-loglevel', 'error', '-y',
            '-i', inputPath,
            '-vn', '-ac', '2', '-ar', '44100',
            '-c:a', 'libmp3lame', '-b:a', '128k',
            outputPath
        ], { stdio: ['ignore', 'ignore', 'pipe'] });
        let stderr = '';
        child.stderr.on('data', chunk => { stderr += chunk.toString(); });
        child.once('error', reject);
        child.once('close', code => {
            if (code === 0) return resolve();
            reject(new Error(`ffmpeg audio conversion failed (${code}): ${stderr.trim().slice(-500)}`));
        });
    });
}

async function downloadAudioAsMp3(url) {
    if (!/^https?:\/\//i.test(String(url || ''))) throw new Error('Provider returned an invalid audio URL');
    const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 120000,
        maxContentLength: MAX_AUDIO_BYTES,
        maxBodyLength: MAX_AUDIO_BYTES,
        headers: { 'User-Agent': USER_AGENT, Accept: 'audio/*,application/octet-stream,*/*' },
        validateStatus: () => true
    });
    if (response.status < 200 || response.status >= 300) {
        throw new Error(`Audio provider returned HTTP ${response.status}`);
    }

    const input = Buffer.from(response.data || []);
    const contentType = String(response.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (/text\/html|application\/json/i.test(contentType)) {
        throw new Error(`Audio provider returned ${contentType || 'non-audio content'}`);
    }
    let detected = null;
    try { detected = await FileType.fromBuffer(input); } catch (_) {}
    if (!looksLikeAudio(input, detected, contentType)) {
        throw new Error(`Downloaded response is not valid audio (${contentType || detected?.mime || 'unknown type'}, ${input.length} bytes)`);
    }

    const id = crypto.randomBytes(8).toString('hex');
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'tohid-audio-'));
    const inputExt = detected?.ext || (contentType.includes('webm') ? 'webm' : contentType.includes('ogg') ? 'ogg' : 'bin');
    const inputPath = path.join(dir, `input.${inputExt}`);
    const outputPath = path.join(dir, `output-${id}.mp3`);
    try {
        await fs.promises.writeFile(inputPath, input);
        await runFfmpeg(inputPath, outputPath);
        const output = await fs.promises.readFile(outputPath);
        if (!looksLikeAudio(output, { mime: 'audio/mpeg' }, 'audio/mpeg')) {
            throw new Error(`Normalized MP3 is invalid or empty (${output.length} bytes)`);
        }
        return { buffer: output, bytes: output.length, sourceBytes: input.length, detected, contentType };
    } finally {
        await fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
}

module.exports = { downloadAudioAsMp3, MIN_AUDIO_BYTES, MAX_AUDIO_BYTES };
