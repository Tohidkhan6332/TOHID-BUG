'use strict';
const { sendRichHtml } = require('../../utils/TohidGenai');
const { emojiGuess } = require('../../utils/TohidHtmlGames');
const qs=[['🦁👑','lion king'],['🕷️🧑','spider man'],['🚢🧊','titanic'],['🧙‍♂️💍','lord of the rings'],['🦈🌊','jaws']];
module.exports={name:'emojiguess',aliases:['emojigame','guessemoji'],description:'HTML Emoji Movie Guess',category:'games',async execute({sock,msg,from,reply}){try{const q=qs[Math.floor(Math.random()*qs.length)];return await sendRichHtml({sock,jid:from,quoted:msg,html:emojiGuess(q)})}catch(e){console.error('[EMOJI HTML]',e.message);return reply('🎭 TOHID EMOJI GUESS\nUse .emojiguess again.')}}};