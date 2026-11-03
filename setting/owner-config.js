'use strict';

/**
 * Single source of truth for owner authorization.
 *
 * WhatsApp identifies the owner by phone number/JID, while Telegram uses a
 * numeric user ID. They intentionally remain separate fields because they are
 * different platform identifiers for the same owner.
 */
const DEFAULT_WHATSAPP_OWNER_NUMBER = '917849917350';
const DEFAULT_TELEGRAM_OWNER_IDS = ['8582350365'];

function normalizeWhatsAppNumber(value) {
  const number = String(value || '').replace(/\D/g, '');
  if (!/^\d{7,15}$/.test(number)) {
    throw new Error('WHATSAPP_OWNER_NUMBER must contain 7-15 digits.');
  }
  return number;
}

function normalizeTelegramIds(value) {
  const raw = Array.isArray(value) ? value : String(value || '').split(',');
  const ids = [...new Set(raw.map(id => String(id).trim()).filter(Boolean))];
  if (!ids.length || ids.some(id => !/^-?\d+$/.test(id))) {
    throw new Error('TELEGRAM_OWNER_IDS must be a comma-separated list of numeric Telegram IDs.');
  }
  return ids.map(Number);
}

const WHATSAPP_OWNER_NUMBER = normalizeWhatsAppNumber(
  process.env.WHATSAPP_OWNER_NUMBER || DEFAULT_WHATSAPP_OWNER_NUMBER
);
const WHATSAPP_OWNER_JID = `${WHATSAPP_OWNER_NUMBER}@s.whatsapp.net`;
const TELEGRAM_OWNER_IDS = normalizeTelegramIds(
  process.env.TELEGRAM_OWNER_IDS || DEFAULT_TELEGRAM_OWNER_IDS
);

function isWhatsAppOwner(value) {
  const normalized = String(value || '').replace(/\D/g, '');
  return normalized === WHATSAPP_OWNER_NUMBER;
}

function isTelegramOwner(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && TELEGRAM_OWNER_IDS.includes(id);
}

module.exports = {
  WHATSAPP_OWNER_NUMBER,
  WHATSAPP_OWNER_JID,
  TELEGRAM_OWNER_IDS,
  isWhatsAppOwner,
  isTelegramOwner
};
