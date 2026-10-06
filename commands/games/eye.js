'use strict';
const { sendRichHtml } = require('../../utils/TohidGenai');
const { wyr } = require('../../utils/TohidHtmlGames');
const QUESTIONS = [
{a:'Know when you will die',b:'Know how you will die',c:'Know who will be with you'},
{a:'Read minds',b:'See the future',c:'See 10 seconds into the past'},
{a:'Be famous but hated',b:'Be unknown but loved',c:'Be forgotten completely'},
{a:'Lose all your memories',b:'Lose the ability to make new ones',c:'Lose the ability to dream'},
{a:'Live 500 years alone',b:'Live 50 years with loved ones',c:'Live forever watching everyone leave'},
{a:'Be the smartest person alive',b:'Be the happiest person alive',c:'Be the richest person alive'},
{a:'Erase one regret',b:'Relive one memory',c:'Preview one future moment'},
{a:'Never feel physical pain',b:'Never feel emotional pain',c:'Never feel fear'},
{a:'Be able to fly',b:'Be able to teleport',c:'Be able to breathe underwater'},
{a:'Be a superhero',b:'Be a wizard',c:'Be a genius inventor'}
];
module.exports={name:'eye',aliases:['wouldyourather','wyr','rather'],category:'games',description:'HTML Would You Rather',async execute({sock,msg,from,reply}){try{const q=QUESTIONS[Math.floor(Math.random()*QUESTIONS.length)];return await sendRichHtml({sock,jid:from,quoted:msg,html:wyr(q)})}catch(e){console.error('[WYR HTML]',e.message);return reply('🎯 Would You Rather\nUse .eye again.')}}};