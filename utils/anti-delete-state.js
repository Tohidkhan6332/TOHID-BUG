'use strict';

// Keep the existing global Set contract used by MrTohid.js.
function markAndCheckDeleteNotified(jid, msgId) {
    const key = `${jid}_${msgId}`;
    if (global.notifiedDeletes.has(key)) return true; // already notified
    global.notifiedDeletes.add(key);
    if (global.notifiedDeletes.size > 3000) {
        const first = global.notifiedDeletes.values().next().value;
        global.notifiedDeletes.delete(first);
    }
    return false;
}

module.exports = { markAndCheckDeleteNotified };
