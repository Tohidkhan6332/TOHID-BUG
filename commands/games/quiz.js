'use strict';
const { sendRichHtml } = require('../../utils/TohidGenai');
const { quiz } = require('../../utils/TohidHtmlGames');
const qs=[['What is the capital of India?','delhi'],['2 + 8 × 2 = ?','18'],['Which planet is known as the Red Planet?','mars'],['How many days are in a leap year?','366'],['What does CPU stand for?','central processing unit']];
module.exports={name:'quiz',aliases:['quizgame'],description:'HTML Quick Knowledge Quiz',category:'games',async execute({sock,msg,from,reply}){try{const q=qs[Math.floor(Math.random()*qs.length)];return await sendRichHtml({sock,jid:from,quoted:msg,html:quiz(q)})}catch(e){console.error('[QUIZ HTML]',e.message);return reply('🧠 TOHID QUIZ\nUse .quiz again.')}}};