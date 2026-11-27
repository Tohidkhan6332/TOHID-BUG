'use strict';

async function executeSimpleGame(command, context = {}) {
  const { text = '', reply } = context;
  switch (String(command || '').toLowerCase()) {
    case 'numbattle': {
      const userRoll = Math.floor(Math.random() * 100) + 1;
      const botRoll = Math.floor(Math.random() * 100) + 1;
      const result = userRoll > botRoll ? '🎉 *You win!*' :
        userRoll < botRoll ? '😢 *You lose!*' : "🤝 *It's a tie!*";
      await reply(`🎲 *Number Battle*\n\nYou: ${userRoll}\nBot: ${botRoll}\n\n${result}`);
      return true;
    }
    case 'coinbattle': {
      const userFlip = Math.random() < 0.5 ? 'Heads' : 'Tails';
      const botFlip = Math.random() < 0.5 ? 'Heads' : 'Tails';
      const result = userFlip === botFlip ? '🎉 *You win!*' : '😢 *You lose!*';
      await reply(`🪙 *Coin Battle*\n\nYou: ${userFlip}\nBot: ${botFlip}\n\n${result}`);
      return true;
    }
    case 'numberbattle': {
      if (!text) return reply('🎯 *Usage:* numberbattle 25');
      const number = Math.floor(Math.random() * 50) + 1;
      const guess = parseInt(text);
      const result = guess === number ? '🎉 *Perfect guess!*' :
        guess > number ? '⬇️ *Too high!*' : '⬆️ *Too low!*';
      await reply(`🎯 *Number Battle*\n\nYour guess: ${guess}\nTarget: ${number}\n\n${result}`);
      return true;
    }
    case 'dice': {
      const roll = Math.floor(Math.random() * 6) + 1;
      await reply(`🎲 *You rolled a ${roll}!* `);
      return true;
    }
    case 'rpsls': {
      if (!text) return reply('🪨 *Choose:* rock, paper, scissors, lizard, spock');
      const choices = ['rock', 'paper', 'scissors', 'lizard', 'spock'];
      const userChoice = text.toLowerCase();
      if (!choices.includes(userChoice)) {
        return reply('❌ *Invalid choice* • Use rock, paper, scissors, lizard, spock');
      }
      const botChoice = choices[Math.floor(Math.random() * choices.length)];
      const winMap = {
        rock: ['scissors', 'lizard'],
        paper: ['rock', 'spock'],
        scissors: ['paper', 'lizard'],
        lizard: ['spock', 'paper'],
        spock: ['scissors', 'rock']
      };
      const result = userChoice === botChoice ? "🤝 *It's a tie!*" :
        winMap[userChoice].includes(botChoice) ? '🎉 *You win!*' : '😢 *You lose!*';
      await reply(`🪨 *RPSLS*\n\nYou: ${userChoice}\nBot: ${botChoice}\n\n${result}`);
      return true;
    }
    default:
      return false;
  }
}

module.exports = { executeSimpleGame };
