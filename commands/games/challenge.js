'use strict';
const { challenge, accept, reject, cancel } = require('../../utils/TohidMultiplayer');
function targetFrom(msg,args){ const mentioned=msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid || msg?.message?.contextInfo?.mentionedJid || []; return mentioned[0] || (args||[]).find(v=>/@/.test(v))?.replace(/[^0-9]/g,''); }
module.exports={name:'challenge',aliases:['duel','gamechallenge'],description:'Challenge another player to a multiplayer game',category:'games',async execute({sock,from,reply,pushName,msg,args}){const sub=String(args?.[0]||'').toLowerCase();const actor=msg?.key?.participant||msg?.participant||from;if(['accept','reject','cancel'].includes(sub)){const sid=args?.[1];if(!sid)return reply('🎮 TOHID AI\n\nUse .challenge '+sub+' <session-id>');const r=sub==='accept'?accept(sid,actor):sub==='reject'?reject(sid,actor):cancel(sid,actor);if(!r)return reply('❌ Session not found, expired, or you are not allowed.');return reply(sub==='accept'?'✅ Challenge accepted!\n🎯 Game: '+r.game+'\n🆔 Session: '+r.id+'\n\nStart the match using the game command with this session.':sub==='reject'?'❌ Challenge rejected.':'🛑 Challenge cancelled.');}
const game=String(args?.[0]||'ttt').toLowerCase(),opponent=targetFrom(msg,args?.slice(1)),allowed=['ttt','rps','quiz','numberguess','dicebattle'];
if(!opponent)return reply('🎮 TOHID AI MULTIPLAYER\n\nUse: .challenge <game> @user\nExample: .challenge ttt @user');
if(opponent===actor)return reply('❌ You cannot challenge yourself.');
if(!allowed.includes(game))return reply('❌ Multiplayer games: '+allowed.join(', '));
const s=challenge({from,challenger:pushName||'Player',challengerJid:actor,opponentJid:opponent,game});
const text='🎮 TOHID AI CHALLENGE\n\n👤 '+(pushName||'Player')+' challenged @'+String(opponent).split('@')[0]+'\n🎯 Game: '+game+'\n🆔 Session: '+s.id+'\n\n✅ Accept: .challenge accept '+s.id+'\n❌ Reject: .challenge reject '+s.id;
try{if(sock)return await sock.sendMessage(from,{text,footer:'TOHID AI MULTIPLAYER',buttons:[{buttonId:'.challenge accept '+s.id,buttonText:{displayText:'✅ ACCEPT'},type:1},{buttonId:'.challenge reject '+s.id,buttonText:{displayText:'❌ REJECT'},type:1}],headerType:1},{quoted:msg});}catch(e){console.error('[TOHID AI CHALLENGE BUTTONS]',e.message);}
await reply(text);}};
