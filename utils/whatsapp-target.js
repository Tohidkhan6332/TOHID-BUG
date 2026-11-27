'use strict';

async function resolveTarget(input, devtrust) {
  if (input.includes('@s.whatsapp.net') || input.includes('@g.us') || input.includes('@newsletter')) return input;

  const channelLink = input.match(/whatsapp\.com\/channel\/([A-Za-z0-9_-]+)/);
  if (channelLink) return `${channelLink[1]}@newsletter`;

  const groupLink = input.match(/chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/);
  if (groupLink) {
    try {
      const info = await devtrust.groupGetInviteInfo(groupLink[1]);
      return info.id;
    } catch (e) {
      throw new Error(`Cannot get group info: ${e.message}`);
    }
  }

  const digits = input.replace(/[^0-9]/g, '');
  if (digits.length > 5) return `${digits}@s.whatsapp.net`;
  return null;
}

module.exports = { resolveTarget };
