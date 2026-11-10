'use strict';

// Ten Unicode alphabets. A random alphabet is used for each menu message.
const ALPHABETS = [
  ['𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙','𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳'],
  ['𝐴𝐵𝐶𝐷𝐸𝐹𝐺𝐻𝐼𝐽𝐾𝐿𝑀𝑁𝑂𝑃𝑄𝑅𝑆𝑇𝑈𝑉𝑊𝑋𝑌𝑍','𝑎𝑏𝑐𝑑𝑒𝑓𝑔ℎ𝑖𝑗𝑘𝑙𝑚𝑛𝑜𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑤𝑥𝑦𝑧'],
  ['𝑨𝑩𝑪𝑫𝑬𝑭𝑮𝑯𝑰𝑱𝑲𝑳𝑴𝑵𝑶𝑷𝑸𝑹𝑺𝑻𝑼𝑽𝑾𝑿𝒀𝒁','𝒂𝒃𝒄𝒅𝒆𝒇𝒈𝒉𝒊𝒋𝒌𝒍𝒎𝒏𝒐𝒑𝒒𝒓𝒔𝒕𝒖𝒗𝒘𝒙𝒚𝒛'],
  ['𝖠𝖡𝖢𝖣𝖤𝖥𝖦𝖧𝖨𝖩𝖪𝖫𝖬𝖭𝖮𝖯𝖰𝖱𝖲𝖳𝖴𝖵𝖶𝖷𝖸𝖹','𝖺𝖻𝖼𝖽𝖾𝖿𝗀𝗁𝗂𝗃𝗄𝗅𝗆𝗇𝗈𝗉𝗊𝗋𝗌𝗍𝗎𝗏𝗐𝗑𝗒𝗓'],
  ['𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭','𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇'],
  ['𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡','𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻'],
  ['𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉','𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣'],
  ['𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ','𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫'],
  ['𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩','𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃'],
  ['𝕬𝕭𝕮𝕯𝕰𝕱𝕲𝕳𝕴𝕵𝕶𝕷𝕸𝕹𝕺𝕻𝕼𝕽𝕾𝕿𝖀𝖁𝖂𝖃𝖄𝖅','𝖆𝖇𝖈𝖉𝖊𝖋𝖌𝖍𝖎𝖏𝖐𝖑𝖒𝖓𝖔𝖕𝖖𝖗𝖘𝖙𝖚𝖛𝖜𝖝𝖞𝖟']
];

const NORMAL_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NORMAL_LOWER = 'abcdefghijklmnopqrstuvwxyz';
const TO_NORMAL = new Map();
for (const [upper, lower] of ALPHABETS) {
  Array.from(upper).forEach((ch, i) => TO_NORMAL.set(ch, NORMAL_UPPER[i]));
  Array.from(lower).forEach((ch, i) => TO_NORMAL.set(ch, NORMAL_LOWER[i]));
}

let lastFontIndex = -1;

function randomizeMenuFont(value) {
  const source = String(value ?? '');
  if (!source) return source;

  let index = Math.floor(Math.random() * ALPHABETS.length);
  if (index === lastFontIndex) index = (index + 1) % ALPHABETS.length;
  lastFontIndex = index;

  const [upper, lower] = ALPHABETS[index];
  const upperMap = new Map(Array.from(NORMAL_UPPER, (ch, i) => [ch, Array.from(upper)[i]]));
  const lowerMap = new Map(Array.from(NORMAL_LOWER, (ch, i) => [ch, Array.from(lower)[i]]));

  // URLs are left untouched. Dot-prefixed command names are styled too.
  return source.replace(/https?:\/\/[^\s]+|[A-Za-z]/g, (token) => {
    if (/^https?:\/\//i.test(token)) return token;
    return upperMap.get(token) || lowerMap.get(token) || token;
  });
}

function normalizeStyledMenuText(value) {
  return Array.from(String(value ?? ''), (character) => TO_NORMAL.get(character) || character).join('');
}


function completeMenuButtons(existingButtons, prefix = '.', menuType = '') {
  const original = Array.isArray(existingButtons) ? existingButtons : [];
  const selectors = original.filter(button => button?.name === 'single_select');
  const makeList = (title, sectionTitle, rows) => ({
    name: 'single_select',
    buttonParamsJson: JSON.stringify({ title, sections: [{ title: sectionTitle, rows }] })
  });

  const categorySelector = selectors[0] || makeList('📂 CATEGORY SELECTION', 'BOT CATEGORIES', [
    { title: '📚 ALL MENU', id: prefix + 'allmenu' },
    { title: '🎮 GAME MENU', id: prefix + 'gamemenu' },
    { title: '👥 GROUP MENU', id: prefix + 'groupmenu' }
  ]);

  const developerSelector = makeList('👨‍💻 DEVELOPER CONTACT', 'CONTACT MR TOHID', [
    { title: '👨‍💻 OPEN DEVELOPER CONTACT', description: 'Developer profiles and contact', id: prefix + 'developercontact' }
  ]);

  const linksSelector = makeList('🔗 SUPPORT & OFFICIAL LINKS', 'TOHID-AI LINKS', [
    { title: '👥 SUPPORT GROUP', description: 'Join the official support group', id: 'https://chat.whatsapp.com/ITblBs2YNMqBYh9klfDLud' },
    { title: '📢 OFFICIAL CHANNEL', description: 'Follow the official WhatsApp channel', id: 'https://whatsapp.com/channel/0029VaGyP933bbVC7G0x0i2T' }
  ]);

  if (menuType === 'gamemenu') {
    const gameSelector = makeList('🎮 GAME SELECTION', 'CHOOSE A GAME', [
      { title: '🐍 Snake', description: 'Interactive Snake game', id: prefix + 'snake' },
      { title: '🔢 2048', description: 'Number merge game', id: prefix + '2048' },
      { title: '⭕ Tic Tac Toe', description: 'Classic game', id: prefix + 'ttt' },
      { title: '✊ Rock Paper Scissors', description: 'Quick game', id: prefix + 'rps' },
      { title: '🧠 Quiz', description: 'Knowledge quiz', id: prefix + 'quiz' },
      { title: '🎯 Guess', description: 'Guessing game', id: prefix + 'guess' },
      { title: '🪢 Hangman', description: 'Word guessing game', id: prefix + 'hangman' },
      { title: '🎲 Dice', description: 'Roll the dice', id: prefix + 'dice' }
    ]);
    return [gameSelector, categorySelector, linksSelector];
  }

  return [categorySelector, developerSelector, linksSelector];
}

module.exports = { randomizeMenuFont, normalizeStyledMenuText, completeMenuButtons };
