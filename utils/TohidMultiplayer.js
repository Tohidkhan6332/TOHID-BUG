'use strict';

const crypto = require('crypto');
const pending = new Map();
const active = new Map();

function id(){ return crypto.randomBytes(5).toString('hex'); }
function key(jid){ return String(jid || ''); }
function challenge({from, challenger, challengerJid, opponentJid, game}){
  const session={id:id(),from:key(from),game:String(game),challenger:String(challenger||'Player'),challengerJid:key(challengerJid),opponentJid:key(opponentJid),status:'pending',createdAt:Date.now()};
  pending.set(session.id,session); return session;
}
function get(id){ return pending.get(String(id)) || active.get(String(id)) || null; }
function accept(id,opponentJid){ const s=pending.get(String(id)); if(!s||s.opponentJid!==key(opponentJid)) return null; s.status='active'; s.acceptedAt=Date.now(); pending.delete(s.id); active.set(s.id,s); return s; }
function reject(id,opponentJid){ const s=pending.get(String(id)); if(!s||s.opponentJid!==key(opponentJid)) return null; s.status='rejected'; pending.delete(s.id); return s; }
function finish(id,winnerJid){ const s=active.get(String(id)); if(!s)return null; s.status='finished'; s.winnerJid=key(winnerJid); s.finishedAt=Date.now(); active.delete(s.id); return s; }
function cancel(id,requesterJid){ const s=pending.get(String(id)); if(!s)return null;if(s.challengerJid!==key(requesterJid)&&s.opponentJid!==key(requesterJid))return null;pending.delete(s.id);s.status='cancelled';return s; }
function listFor(jid){ const k=key(jid); return [...pending.values(),...active.values()].filter(s=>s.challengerJid===k||s.opponentJid===k); }
setInterval(()=>{ const cutoff=Date.now()-15*60*1000; for(const [k,s] of pending){if(s.createdAt<cutoff)pending.delete(k);} },60000).unref();
module.exports={challenge,get,accept,reject,finish,cancel,listFor};