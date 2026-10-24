'use strict';
const { sendRichHtml } = require('../../utils/TohidGenai');
const { truthOrDare } = require('../../utils/TohidHtmlGames');
const truths=['What is your biggest goal right now?','What was your funniest mistake?','Who makes you laugh the most?','What is one skill you want to learn?'];
const dares=['Send a funny voice note.','Change your status for 10 minutes.','Send the last emoji you used.','Type a message using only emojis.'];
module.exports={name:'truthordare',aliases:['tod','truthdare'],description:'HTML Truth or Dare',category:'games',async execute({sock,msg,from,reply}){try{return await sendRichHtml({sock,jid:from,quoted:msg,html:truthOrDare(truths,dares)})}catch(e){console.error('[TOD HTML]',e.message);return reply('🎭 TOHID TRUTH OR DARE\nUse .truthordare again.')}}};