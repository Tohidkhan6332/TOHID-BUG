'use strict';

const { sendRichHtml } = require('../../utils/TohidGenai');

function ludoHtml() {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{box-sizing:border-box}body{margin:0;padding:8px;background:#071018;color:#eef;font-family:Arial,sans-serif}.card{padding:12px;border:2px solid #f59e0b;border-radius:18px;background:linear-gradient(145deg,#241308,#142536);text-align:center}.title{font-size:24px;font-weight:900;letter-spacing:2px;color:#ffd166}.sub{font:10px monospace;color:#cbd5e1;margin:5px}.status{min-height:38px;margin:8px auto;padding:8px;border-radius:10px;background:#182b3b;font:bold 12px monospace;color:#f8fafc}.track{display:grid;grid-template-columns:repeat(13,1fr);gap:3px;max-width:390px;margin:10px auto}.cell{aspect-ratio:1;display:grid;place-items:center;border-radius:5px;background:#26394a;font:bold 13px monospace;color:#dbeafe}.cell.home{background:#374151}.cell.goal{background:#f59e0b;color:#241308}.cell.p0{outline:2px solid #38bdf8}.cell.p1{outline:2px solid #fb7185}.tokens{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;max-width:390px;margin:8px auto}.tokens button,.roll{border:1px solid #fbbf24;border-radius:9px;background:#172b3b;color:#fef3c7;padding:9px 4px;font-weight:800}.tokens button:disabled{opacity:.45}.roll{width:100%;font-size:16px;background:#92400e}.hint{margin-top:8px;font:9px monospace;color:#94a3b8}</style></head><body><div class="card"><div class="title">🎲 TOHID LUDO</div><div class="sub">RACE FOUR TOKENS TO HOME · YOU VS BOT</div><div class="status" id="status">Roll the dice to start.</div><div class="track" id="track"></div><button class="roll" id="roll">🎲 ROLL DICE</button><div class="tokens" id="tokens"></div><div class="hint">Roll 6 to leave base. Choose a highlighted token after rolling.</div></div><script>
(function(){var track=document.getElementById('track'),tokensEl=document.getElementById('tokens'),status=document.getElementById('status'),rollBtn=document.getElementById('roll');var me=[-1,-1,-1,-1],bot=[-1,-1,-1,-1],die=0,waiting=true,finished=false;function label(v){return v<0?'BASE':v>=52?'HOME':String(v+1)}function draw(){track.innerHTML='';for(var i=0;i<52;i++){var d=document.createElement('div');d.className='cell';var mine=me.indexOf(i),theirs=bot.indexOf(i);if(mine>=0){d.className+=' p0';d.textContent='🔵'+(mine+1)}else if(theirs>=0){d.className+=' p1';d.textContent='🔴'+(theirs+1)}else d.textContent=i+1;track.appendChild(d)}tokensEl.innerHTML='';me.forEach(function(v,i){var b=document.createElement('button');b.textContent='🔵 '+(i+1)+' · '+label(v);b.disabled=finished||waiting||!canMove(v);b.onclick=function(){move(i)};tokensEl.appendChild(b)});rollBtn.disabled=finished||!waiting}function canMove(v){return die>0&&(v>=0||die===6)&&(v+die<=52)}function move(i){if(!canMove(me[i]))return;me[i]=me[i]<0?0:me[i]+die;var used=die;die=0;waiting=true;if(me[i]>=52){me[i]=52;status.textContent='🎉 Token '+(i+1)+' reached HOME!'}else status.textContent='You moved token '+(i+1)+' by '+used+'. Bot is thinking...';if(me.every(function(x){return x>=52})){finished=true;status.textContent='🏆 YOU WIN! All tokens reached HOME.';draw();return}draw();setTimeout(botTurn,450)}function botTurn(){if(finished)return;var d=Math.floor(Math.random()*6)+1;var movable=bot.map(function(v,i){return (v>=0||d===6)&&(v+d<=52)?i:-1}).filter(function(i){return i>=0});if(movable.length){var i=movable[Math.floor(Math.random()*movable.length)];bot[i]=bot[i]<0?0:bot[i]+d;if(bot[i]>=52)bot[i]=52;status.textContent='Bot rolled '+d+'. Roll again.'}else status.textContent='Bot rolled '+d+'. Your turn.';waiting=true;draw()}rollBtn.onclick=function(){if(!waiting||finished)return;die=Math.floor(Math.random()*6)+1;waiting=false;status.textContent='You rolled '+die+'. Choose a token.';if(!me.some(canMove)){status.textContent='You rolled '+die+'. No legal move; bot turn.';waiting=true;draw();return}draw()};draw()})();
</script></body></html>`;
}

module.exports = {
  name: 'ludo',
  aliases: ['ludogame'],
  description: 'Interactive HTML Ludo race against the bot',
  category: 'games',
  async execute({ sock, msg, from, reply }) {
    try {
      await sendRichHtml({ sock, jid: from, quoted: msg, html: ludoHtml() });
    } catch (error) {
      console.error('[LUDO HTML]', error.stack || error.message);
      await reply('🎲 Ludo could not open on this WhatsApp client. Please update WhatsApp and try `.ludo` again.');
    }
  },
};
