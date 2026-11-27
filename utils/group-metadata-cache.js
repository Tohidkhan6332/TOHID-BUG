'use strict';

// Cache group metadata per WhatsApp socket to avoid repeated group IQ requests
// triggering Baileys rate-overlimit errors during message bursts.
const groupMetadataCacheBySocket = new WeakMap();

function installGroupMetadataCache(sock) {
    if (!sock || (typeof sock !== 'object' && typeof sock !== 'function')) return;
    if (groupMetadataCacheBySocket.has(sock)) return;
    if (typeof sock.groupMetadata !== 'function') return;

    const originalGroupMetadata = sock.groupMetadata.bind(sock);
    const cache = new Map();
    const inFlight = new Map();
    const cacheTtlMs = Math.max(10000, Number(process.env.WA_GROUP_METADATA_CACHE_MS) || 60000);
    const maxEntries = 500;

    sock.groupMetadata = async (jid, ...args) => {
        const now = Date.now();
        const cached = cache.get(jid);
        if (cached && now - cached.savedAt < cacheTtlMs) return cached.value;
        if (inFlight.has(jid)) return inFlight.get(jid);

        const request = originalGroupMetadata(jid, ...args).then((value) => {
            cache.set(jid, { value, savedAt: Date.now() });
            if (cache.size > maxEntries) {
                const oldestKey = cache.keys().next().value;
                if (oldestKey !== undefined) cache.delete(oldestKey);
            }
            return value;
        }).catch((error) => {
            const message = String(error?.message || error);
            // If WhatsApp throttles a refresh, use stale metadata when available
            // instead of immediately repeating the same network request.
            if (/rate.?over.?limit|too many requests|429/i.test(message) && cached) {
                console.warn('[WhatsApp] Group metadata rate-limited; using cached metadata for', jid);
                return cached.value;
            }
            throw error;
        }).finally(() => {
            inFlight.delete(jid);
        });

        inFlight.set(jid, request);
        return request;
    };

    groupMetadataCacheBySocket.set(sock, true);
}

module.exports = { installGroupMetadataCache };
