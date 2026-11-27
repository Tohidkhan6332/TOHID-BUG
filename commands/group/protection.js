'use strict';

/**
 * Group anti-abuse configuration commands.
 * The persistent settings store remains owned by MrTohid.js / setting modules;
 * this module receives those functions and the live Anti-Link settings object.
 */
async function executeGroupProtection(command, context = {}) {
    const {
        msg: m, reply, args = [], prefix = '.', isAdmins = false, isCreator = false,
        antilinkSettings = {}, saveAntilinkSettings = () => false,
        getSetting, setSetting
    } = context;

    switch (String(command || '').toLowerCase()) {
        case 'antilink': {
            if (!m.isGroup) return reply("👥 *Groups only*");
            if (!isAdmins && !isCreator) return reply("🔒 *Admins only*");

            if (!args[0]) {
                const groupSettings = antilinkSettings[m.chat] || { enabled: false, action: 'delete' };
                const status = groupSettings.enabled ? 'ON ✅' : 'OFF ❌';
                const action = groupSettings.enabled ? groupSettings.action : '-';

                return reply(`🔗 *Anti-Link*\n\n` +
                    `📌 *Usage:*\n` +
                    `▸ ${prefix}antilink on - Enable (delete mode)\n` +
                    `▸ ${prefix}antilink delete - Enable delete mode\n` +
                    `▸ ${prefix}antilink kick - Enable kick mode\n` +
                    `▸ ${prefix}antilink off - Disable\n\n` +
                    `⚙️ *Status:* ${status}\n` +
                    `⚙️ *Action:* ${action}\n\n` +
                    `_When enabled, links will be ${groupSettings.action === 'kick' ? 'deleted and user kicked' : 'deleted'}_`);
            }

            if (args[0].toLowerCase() === 'on') {
                antilinkSettings[m.chat] = { enabled: true, action: 'delete' };
                saveAntilinkSettings(antilinkSettings);
                reply(`✅ *Anti-Link enabled (Delete mode)*\nLinks will be deleted automatically.`);
            } else if (args[0].toLowerCase() === 'delete') {
                antilinkSettings[m.chat] = { enabled: true, action: 'delete' };
                saveAntilinkSettings(antilinkSettings);
                reply(`✅ *Anti-Link set to DELETE mode*\nLinks will be deleted.`);
            } else if (args[0].toLowerCase() === 'kick') {
                antilinkSettings[m.chat] = { enabled: true, action: 'kick' };
                saveAntilinkSettings(antilinkSettings);
                reply(`✅ *Anti-Link set to KICK mode*\nUsers who post links will be kicked.`);
            } else if (args[0].toLowerCase() === 'off') {
                if (antilinkSettings[m.chat]) {
                    antilinkSettings[m.chat].enabled = false;
                    saveAntilinkSettings(antilinkSettings);
                    reply(`❌ *Anti-Link disabled for this group*`);
                } else {
                    reply(`⚠️ *Anti-Link is already disabled*`);
                }
            } else {
                reply(`❌ *Invalid option. Use: on, delete, kick, or off*`);
            }
        }
            break;

        case 'antitag':
        case 'antispam':
        case 'antibot':
        case 'antibeg': {
            if (!m.isGroup) return reply("👥 *Groups only*");
            if (!isAdmins && !isCreator) return reply("🔒 *Admins only*");

            const labels = {
                antitag: { title: '🏷️ *Anti-Tag*', detail: 'Mass tagging will be deleted', kick: 'Users who mass tag will be kicked', off: 'Anti-Tag disabled' },
                antispam: { title: '🚫 *Anti-Spam*', detail: 'Spam messages will be deleted', kick: 'Users who spam will be kicked', off: 'Anti-Spam disabled' },
                antibot: { title: '🤖 *Anti-Bot*', detail: 'Bot messages will be deleted', kick: 'Bots will be kicked', off: 'Anti-Bot disabled' },
                antibeg: { title: '💰 *Anti-Beg (Nigerian Style)*', detail: 'Begging messages will be deleted', kick: 'Users who beg will be kicked', off: 'Anti-Beg disabled' }
            };
            const configName = String(command || '').toLowerCase();
            const label = labels[configName];
            if (!label) return false;

            if (!args[0]) {
                const config = getSetting(m.chat, configName, { enabled: false, action: 'delete' });
                const usage = `📌 *Usage:*\n` +
                    `▸ .${configName} on - Enable (delete mode)\n` +
                    `▸ .${configName} delete - Enable delete mode\n` +
                    `▸ .${configName} kick - Enable kick mode\n` +
                    `▸ .${configName} off - Disable\n\n`;
                const suffix = configName === 'antibeg' ? '\n\n_Detects "send me money", "I dey suffer", etc_' : '';
                return reply(label + `\n\n` + usage +
                    `⚙️ *Status:* ${config.enabled ? 'ON ✅' : 'OFF ❌'}\n` +
                    `⚙️ *Action:* ${config.enabled ? config.action : '-'}` + suffix);
            }

            if (args[0] === 'on' || args[0] === 'delete') {
                setSetting(m.chat, configName, { enabled: true, action: 'delete' });
                reply(`✅ *${label.replace(/\*/g, '')} enabled (Delete mode)*\n${label.detail || ({
                    antitag: 'Mass tagging will be deleted',
                    antispam: 'Spam messages will be deleted',
                    antibot: 'Bot messages will be deleted',
                    antibeg: 'Begging messages will be deleted'
                })[configName]}`);
            } else if (args[0] === 'kick') {
                setSetting(m.chat, configName, { enabled: true, action: 'kick' });
                reply(`✅ *${label.replace(/\*/g, '')} enabled (Kick mode)*\n${label.kick}`);
            } else if (args[0] === 'off') {
                setSetting(m.chat, configName, { enabled: false, action: 'delete' });
                reply(`❌ *${label.off || labels[configName].off || ({
                    antitag: 'Anti-Tag disabled',
                    antispam: 'Anti-Spam disabled',
                    antibot: 'Anti-Bot disabled',
                    antibeg: 'Anti-Beg disabled'
                })[configName]}*`);
            }
        }
            break;

        default:
            return false;
    }
    return true;
}

module.exports = { executeGroupProtection };
