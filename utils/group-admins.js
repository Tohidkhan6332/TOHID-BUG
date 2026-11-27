/**
 * Return WhatsApp group admin JIDs from a participants list.
 * Pure helper: does not mutate the supplied participants.
 */
function getGroupAdmins(participants = []) {
    const admins = [];
    for (const participant of participants) {
        if (participant.admin === "admin" || participant.admin === "superadmin") {
            admins.push(participant.id);
        }
    }
    return admins;
}

module.exports = { getGroupAdmins };
