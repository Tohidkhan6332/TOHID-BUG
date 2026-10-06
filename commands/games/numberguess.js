'use strict';
const { sendRichHtml } = require('../../utils/TohidGenai');
const { numberGuess } = require('../../utils/TohidHtmlGames');
module.exports={name:'numberguess',aliases:['guessnumber','guess'],description:'HTML Number Guess',category:'games',async execute({sock,msg,from,reply}){try{return await sendRichHtml({sock,jid:from,quoted:msg,html:numberGuess()})}catch(e){console.error('[NUMBERGUESS HTML]',e.message);return reply('🔢 TOHID NUMBER GUESS\nUse .numberguess again.')}}};