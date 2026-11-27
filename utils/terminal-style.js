'use strict';

async function styletext(text) {
  return [
    { name: 'Normal', result: text },
    { name: 'Bold', result: '**' + text + '**' },
    { name: 'Italic', result: '*' + text + '*' },
    { name: 'Strikethrough', result: '~' + text + '~' },
    { name: 'Monospace', result: '```' + text + '```' }
  ];
}

module.exports = { styletext };
