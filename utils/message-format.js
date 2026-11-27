'use strict';

// Pure message formatting helpers shared by the WhatsApp message handler.
function tohidExtractMediaFromText(text) {
    const media = [];
    const urlRegex = /https?:\/\/[^\s)<>"']+/gi;
    const matches = text.match(urlRegex) || [];
    for (const u of matches) {
        const low = u.toLowerCase().split('?')[0];
        if (/\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(low)) media.push({ type: 'photo', url: u });
        else if (/\.(mp4|mov|webm|mkv|avi)$/i.test(low)) media.push({ type: 'video', url: u });
        else if (/\.(mp3|wav|ogg|m4a|flac)$/i.test(low)) media.push({ type: 'audio', url: u });
        else if (/\.(pdf|docx?|xlsx?|pptx?|zip|rar|txt|csv|json)$/i.test(low)) media.push({ type: 'document', url: u });
    }
    let cleaned = text;
    for (const m of media) cleaned = cleaned.split(m.url).join('');
    return { media, cleaned: cleaned.replace(/\n{3,}/g, '\n\n').trim() };
}

function tohidSplitMessage(text, limit = 4000) {
    if (!text) return [];
    const chunks = [];
    let remaining = text;
    while (remaining.length > limit) {
        let cut = remaining.lastIndexOf('\n', limit);
        if (cut < limit * 0.5) cut = remaining.lastIndexOf(' ', limit);
        if (cut < limit * 0.5) cut = limit;
        chunks.push(remaining.slice(0, cut));
        remaining = remaining.slice(cut).trim();
    }
    if (remaining) chunks.push(remaining);
    return chunks;
}

module.exports = { tohidExtractMediaFromText, tohidSplitMessage };
