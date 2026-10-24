'use strict';
const { sendRichHtml } = require('../../utils/TohidGenai');
const { diceBattle } = require('../../utils/TohidHtmlGames');
module.exports={name:'dicebattle',aliases:['dice','roll'],description:'HTML Dice Battle vs TOHID',category:'games',async execute({sock,msg,from,reply}){try{return await sendRichHtml({sock,jid:from,quoted:msg,html:diceBattle()})}catch(e){console.error('[DICE HTML]',e.message);return reply('🎲 TOHID DICE BATTLE\nUse .dicebattle again.')}}};