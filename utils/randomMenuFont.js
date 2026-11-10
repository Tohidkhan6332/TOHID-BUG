'use strict';

// Ten Unicode text styles for WhatsApp menu descriptions.
// Command tokens and URLs stay unchanged so users can still copy commands.
const FONT_STYLES = [
  { upper: 0x1D400, lower: 0x1D41A }, // bold
  { upper: 0x1D434, lower: 0x1D44E, lowerOverrides: { 7: '\u210E' } }, // italic
  { upper: 0x1D468, lower: 0x1D482 }, // bold italic
  { upper: 0x1D5A0, lower: 0x1D5BA }, // sans serif
  { upper: 0x1D5D4, lower: 0x1D5EE }, // sans serif bold
  { upper: 0x1D608, lower: 0x1D622 }, // sans serif italic
  { upper: 0x1D670, lower: 0x1D68A }, // monospace
  {
    upper: 0x1D538,
    lower: 0x1D552,
    upperOverrides: {
      2: '\u2102', 7: '\u210D', 13: '\u2115',
      15: '\u2119', 16: '\u211A', 17: '\u211D', 25: '\u2124'
    }
  }, // double-struck
  { upper: 0x1D4D0, lower: 0x1D4EA }, // bold script
  { upper: 0x1D56C, lower: 0x1D586 } // bold fraktur
];

let lastFontIndex = -1;

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function randomizeMenuFont(value, prefix = '.') {
  const source = String(value ?? '');
  if (!source) return source;

  // Avoid using the same style twice in a row during this process lifetime.
  let fontIndex = Math.floor(Math.random() * FONT_STYLES.length);
  if (FONT_STYLES.length > 1 && fontIndex === lastFontIndex) {
    fontIndex = (fontIndex + 1 + Math.floor(Math.random() * (FONT_STYLES.length - 1))) % FONT_STYLES.length;
  }
  lastFontIndex = fontIndex;

  const style = FONT_STYLES[fontIndex];
  const protectedParts = [];
  const escapedPrefix = escapeRegex(prefix || '.');
  const protectedPattern = new RegExp(
    'https?:\\/\\/[^\\s]+|(?:^|\\s)' + escapedPrefix + '[A-Za-z0-9][A-Za-z0-9_-]*',
    'g'
  );

  // Keep URLs intact; menu commands (including their dot prefix) are styled too.
  const urlPattern = /https?:\\/\\/[^\\s]+/g;
  let output = source.replace(urlPattern, (match) => {
    const index = protectedParts.push(match) - 1;
    return '\uE000' + index + '\uE001';
  });

  output = Array.from(output, (character) => {
    const code = character.codePointAt(0);
    if (code >= 65 && code <= 90) {
      const index = code - 65;
      return style.upperOverrides?.[index] || String.fromCodePoint(style.upper + index);
    }
    if (code >= 97 && code <= 122) {
      const index = code - 97;
      return style.lowerOverrides?.[index] || String.fromCodePoint(style.lower + index);
    }
    return character;
  }).join('');

  return output.replace(/\uE000(\d+)\uE001/g, (_, index) => protectedParts[Number(index)]);
}

function normalizeStyledMenuText(value) {
  const reverseRanges = [
    [0x1D400, 0x1D419], [0x1D41A, 0x1D433],
    [0x1D434, 0x1D44D], [0x1D44E, 0x1D467],
    [0x1D468, 0x1D481], [0x1D482, 0x1D49B],
    [0x1D5A0, 0x1D5B9], [0x1D5BA, 0x1D5D3],
    [0x1D5D4, 0x1D5ED], [0x1D5EE, 0x1D607],
    [0x1D608, 0x1D621], [0x1D622, 0x1D63B],
    [0x1D670, 0x1D689], [0x1D68A, 0x1D6A3],
    [0x1D4D0, 0x1D4E9], [0x1D4EA, 0x1D503],
    [0x1D56C, 0x1D585], [0x1D586, 0x1D59F],
    [0x1D538, 0x1D551], [0x1D552, 0x1D56B]
  ];
  const special = new Map([
    [0x210E, 'h'], [0x2102, 'C'], [0x210D, 'H'],
    [0x2115, 'N'], [0x2119, 'P'], [0x211A, 'Q'],
    [0x211D, 'R'], [0x2124, 'Z']
  ]);
  return Array.from(String(value ?? ''), (character) => {
    const code = character.codePointAt(0);
    if (special.has(code)) return special.get(code);
    for (const [start, end] of reverseRanges) {
      if (code >= start && code <= end) {
        const offset = code - start;
        return String.fromCharCode((start === 0x1D400 || start === 0x1D434 ||
          start === 0x1D468 || start === 0x1D5A0 || start === 0x1D5D4 ||
          start === 0x1D608 || start === 0x1D670 || start === 0x1D4D0 ||
          start === 0x1D56C || start === 0x1D538) ? 65 + offset : 97 + offset);
      }
    }
    return character;
  }).join('');
}

module.exports = { randomizeMenuFont, normalizeStyledMenuText };
