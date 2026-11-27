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

function randomColor(chalk) {
  const colors = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'greenBright', 'yellowBright'];
  const colorName = colors[Math.floor(Math.random() * colors.length)];
  return typeof chalk[colorName] === 'function' ? chalk[colorName] : chalk.white;
}

module.exports = { styletext, randomColor };
