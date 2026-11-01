'use strict';

const { sendRichHtml } = require('../../utils/TohidGenai');
const {
  createBotRoom,
  createChallengeRoom,
  getRoomForJid,
  acceptChallenge,
  rollDice,
  moveToken,
  removeRoom,
  botTurn,
} = require('../../utils/TohidLudo');

function getMentionedTarget(msg, args) {
  const mentioned = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
    msg?.message?.contextInfo?.mentionedJid ||
    [];

  if (Array.isArray(mentioned) && mentioned.length) return mentioned[0];
  const match = (args || []).find(v => String(v).includes('@'));
  return match || null;
}

function offlineHtml() {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{box-sizing:border-box}body{margin:0;padding:8px;background:#071018;color:#eef;font-family:Arial,sans-serif}.card{max-width:440px;margin:auto;padding:14px;border:2px solid #f59e0b;border-radius:18px;background:linear-gradient(145deg,#241308,#142536);text-align:center}.title{font-size:25px;font-weight:900;color:#ffd166}.sub{font:10px monospace;color:#cbd5e1;margin:5px}.mode,.roll,.token{border:1px solid #fbbf24;border-radius:10px;background:#172b3b;color:#fef3c7;padding:10px;margin:4px;font-weight:800}.mode{width:46%;min-height:54px}.mode.online{border-color:#60a5fa}.hide{display:none}.status{min-height:38px;margin:9px 0;padding:9px;border-radius:10px;background:#182b3b;font:bold 12px monospace}.hud{display:flex;gap:7px}.hud div{flex:1;padding:8px;border-radius:9px;background:#20394d;font:bold 11px monospace}.board{display:grid;grid-template-columns:repeat(15,1fr);gap:2px;margin:10px auto;max-width:410px;padding:5px;border-radius:10px;background:#111827}.cell{aspect-ratio:1;display:grid;place-items:center;border-radius:3px;background:#eef2f7;color:#64748b;font:bold 8px monospace}.cell.path{background:#fff}.cell.bluebase{background:#67b7ff}.cell.redbase{background:#ff8792}.cell.blue{background:#38a9f5;color:#06213a;outline:1px solid #bde8ff}.cell.red{background:#ff6474;color:#3b0710;outline:1px solid #ffd1d6}.cell.home{background:#fbbf24;color:#432006;font-size:12px}.tokens{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}.token{width:100%;margin:0;padding:8px 2px;font-size:11px}.token.blue{border-color:#38bdf8}.token.red{border-color:#fb7185}.token:disabled{opacity:.35}.roll{width:100%;font-size:16px;background:#92400e}.hint{margin-top:8px;font:9px monospace;color:#94a3b8}.online{line-height:1.4}
</style></head><body><div class="card"><div class="title">🎲 TOHID LUDO</div><div class="sub">CLASSIC 2-PLAYER BOARD</div><div id="chooser"><button class="mode" id="local">👥 2 OFFLINE</button><button class="mode" id="bot">🤖 VS BOT</button><button class="mode online" id="online">🌐 2 ONLINE</button><div class="hint">Four tokens, dice, BASE, path and HOME.</div></div><div id="game" class="hide"><div class="status" id="status"></div><div class="hud"><div>TURN<br><span id="turn"></span></div><div>DICE<br><span id="die">—</span></div></div><div class="board" id="board"></div><button class="roll" id="roll">🎲 ROLL DICE</button><div class="tokens" id="tokens"></div><button class="mode" id="restart">↻ RESTART</button><div class="hint">Roll 6 to leave BASE. Tap a legal token to move.</div></div><div id="onlineHelp" class="hide"><div class="status online">🌐 Online mode uses a shared WhatsApp room.<br><br>Start: <b>.ludo online @user</b><br>Join: <b>.ludo accept ROOM_ID</b><br>Play: <b>.ludo roll</b> then <b>.ludo move 0</b> to <b>3</b></div><button class="mode" id="back">← BACK</button></div></div><script>
(function(){var chooser=document.getElementById('chooser'),game=document.getElementById('game'),help=document.getElementById('onlineHelp'),board=document.getElementById('board'),tokensEl=document.getElementById('tokens'),status=document.getElementById('status'),turnEl=document.getElementById('turn'),dieEl=document.getElementById('die'),rollBtn=document.getElementById('roll'),mode='';var route=[[6,0],[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[8,8],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,6],[8,5],[8,4],[8,3],[8,2]],pathIndex={};route.forEach(function(p,i){pathIndex[p[0]+','+p[1]]=i});var players=[],turn=0,die=null,done=false;function start(kind){mode=kind;players=[{name:'PLAYER 1',color:'blue',start:0,tokens:[-1,-1,-1,-1]},{name:kind==='bot'?'TOHID-BOT':'PLAYER 2',color:'red',start:26,tokens:[-1,-1,-1,-1]}];turn=0;die=null;done=false;chooser.className='hide';help.className='hide';game.className='';status.textContent='Roll the dice to start.';draw()}function posLabel(v){return v<0?'BASE':v>=57?'HOME':String(v+1)}function legal(v){return !done&&die!==null&&(v>=0||die===6)&&v+die<=57}function winner(p){return p.tokens.every(function(v){return v>=57})}function draw(){board.innerHTML='';for(var r=0;r<15;r++)for(var c=0;c<15;c++){var d=document.createElement('div'),key=r+','+c,idx=pathIndex[key];d.className='cell';if(r<6&&c<6)d.className+=' bluebase';if(r>8&&c<6)d.className+=' redbase';if(idx!==undefined)d.className+=' path';if((r===6&&c>=6&&c<=8)||(r===7&&c===7)||(r===8&&c>=6&&c<=8))d.className+=' home';players.forEach(function(p,pi){p.tokens.forEach(function(v,ti){if(v>=0&&v<57&&idx!==undefined&&((p.start+v)%52)===idx){d.className+=' '+p.color;d.textContent=(pi?'🔴':'🔵')+(ti+1)}})});if(!d.textContent&&((r===2&&c===2)||(r===2&&c===11)||(r===11&&c===2)||(r===11&&c===11))){d.textContent='●'}board.appendChild(d)}turnEl.textContent=players[turn]?players[turn].name:'—';dieEl.textContent=die===null?'—':die;tokensEl.innerHTML='';var p=players[turn];if(!p)return;p.tokens.forEach(function(v,i){var b=document.createElement('button');b.className='token '+p.color;b.textContent=(turn?'🔴':'🔵')+(i+1)+' · '+posLabel(v);b.disabled=!legal(v);b.onclick=function(){move(i)};tokensEl.appendChild(b)});rollBtn.disabled=done||die!==null||players[turn].name==='TOHID-BOT'}function nextTurn(){die=null;turn=(turn+1)%2;draw();if(mode==='bot'&&turn===1&&!done)setTimeout(botTurn,500)}function roll(){if(done||die!==null||players[turn].name==='TOHID-BOT')return;die=Math.floor(Math.random()*6)+1;status.textContent=players[turn].name+' rolled '+die+'. Choose a token.';if(!players[turn].tokens.some(legal)){status.textContent+=' No legal move.';draw();setTimeout(nextTurn,650);return}draw()}function move(i){var p=players[turn];if(!legal(p.tokens[i]))return;var rolled=die;p.tokens[i]=p.tokens[i]<0?0:p.tokens[i]+rolled;var landing=(p.start+p.tokens[i])%52;var safe={0:true,8:true,13:true,21:true,26:true,34:true,39:true,47:true};var other=players[1-turn];if(p.tokens[i]<57&&!safe[landing])other.tokens.forEach(function(v,j){if(v>=0&&v<57&&(other.start+v)%52===landing)other.tokens[j]=-1});status.textContent=p.name+' moved token '+(i+1)+(rolled===6?' and gets another turn.':'');if(winner(p)){done=true;status.textContent='🏆 '+p.name+' WINS!';draw();return}if(rolled===6){die=null;draw()}else nextTurn()}function botTurn(){if(done||mode!=='bot'||turn!==1)return;die=Math.floor(Math.random()*6)+1;var choices=players[1].tokens.map(function(v,i){return legal(v)?i:-1}).filter(function(i){return i>=0});if(choices.length){var i=choices[Math.floor(Math.random()*choices.length)];players[1].tokens[i]=players[1].tokens[i]<0?0:players[1].tokens[i]+die;status.textContent='🤖 Bot rolled '+die+' and moved token '+(i+1)+'.'}else status.textContent='🤖 Bot rolled '+die+' and had no legal move.';if(winner(players[1])){done=true;status.textContent='🤖 BOT WINS!';draw();return}nextTurn()}document.getElementById('local').onclick=function(){start('local')};document.getElementById('bot').onclick=function(){start('bot')};document.getElementById('online').onclick=function(){chooser.className='hide';help.className='';game.className='hide'};document.getElementById('back').onclick=function(){help.className='hide';chooser.className=''};rollBtn.onclick=roll;document.getElementById('restart').onclick=function(){start(mode)};})();
</script></body></html>`;
}

function boardHtml(room) {
  const players = Array.isArray(room?.players) ? room.players : [];
  const p1 = players[0] || { name: 'P1', tokens: [-1, -1, -1, -1], color: 'blue' };
  const p2 = players[1] || { name: 'P2', tokens: [-1, -1, -1, -1], color: 'red' };

  const turnName = players[room?.currentTurn]?.name || 'Unknown';
  const lastDice = room?.lastDice ?? '—';

  const renderTokens = (tokens, color) => tokens.map((pos) => {
    const value = pos >= 0 ? String(pos) : '•';
    return `<div class="token ${color}">${value}</div>`;
  }).join('');

  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    *{box-sizing:border-box}html,body{margin:0;background:transparent;font-family:Arial,sans-serif}body{padding:8px;background:radial-gradient(circle at 50% 0%,#4d285a,#05080d 70%);color:#edf5ff}.card{max-width:420px;margin:0 auto;border-radius:18px;padding:14px;background:rgba(16,19,26,.88);border:1px solid rgba(255,255,255,.08);box-shadow:0 16px 40px rgba(0,0,0,.35)}.title{font-size:24px;font-weight:700;text-align:center;margin-bottom:4px}.sub{text-align:center;font-size:12px;color:#9ab5d8;letter-spacing:2px;margin-bottom:12px}.hud{display:flex;gap:10px;margin-bottom:12px}.hud-box{flex:1;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.05);text-align:center;font-size:12px;font-weight:700;color:#dfeaff}.board{display:grid;grid-template-columns:repeat(9, 1fr);gap:4px;background:#121922;border-radius:12px;padding:8px;border:1px solid rgba(255,255,255,.06)}.cell{aspect-ratio:1;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);border-radius:6px}.cell.center{background:rgba(255,205,86,.15);border-color:rgba(255,205,86,.5)}.cell.blue{background:rgba(30,120,255,.18)}.cell.red{background:rgba(255,70,87,.18)}.cell.green{background:rgba(66,204,146,.18)}.cell.yellow{background:rgba(244,208,63,.18)}.players{display:flex;gap:10px;margin-top:12px}.player-box{flex:1;padding:8px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.05)}.player-name{font-size:13px;font-weight:700;margin-bottom:6px}.tokens{display:flex;flex-wrap:wrap;gap:6px}.token{width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:50%;font-size:12px;font-weight:700;color:#08121a;box-shadow:inset 0 1px 2px rgba(255,255,255,.3)}.token.blue{background:#5ab2ff}.token.red{background:#ff7c8b}.token.green{background:#68f0b6}.token.yellow{background:#ffd75a}.token.default{background:#dfeaff}
  </style></head><body><div class="card"><div class="title">🎲 LUDO</div><div class="sub">2 PLAYER · HTML MODE</div><div class="hud"><div class="hud-box">TURN<br>${turnName}</div><div class="hud-box">DICE<br>${lastDice}</div></div><div class="board">${Array.from({ length: 81 }, (_, i) => {
    const row = Math.floor(i / 9);
    const col = i % 9;
    let className = 'cell';
    if (row === 4 && col === 4) className += ' center';
    if (row < 3 && col < 3) className += ' blue';
    if (row > 5 && col < 3) className += ' red';
    if (row < 3 && col > 5) className += ' green';
    if (row > 5 && col > 5) className += ' yellow';
    return `<div class="${className}"></div>`;
  }).join('')}</div><div class="players"><div class="player-box"><div class="player-name">${p1.name}</div><div class="tokens">${renderTokens(p1.tokens, p1.color)}</div></div><div class="player-box"><div class="player-name">${p2.name}</div><div class="tokens">${renderTokens(p2.tokens, p2.color)}</div></div></div></div></body></html>`;
}

async function handleBotTurn(sock, from, msg, room) {
  if (!room || room.players?.[room.currentTurn]?.type !== 'bot') return null;

  const updatedRoom = botTurn(room);
  try {
    await sendRichHtml({ sock, jid: from, quoted: msg, html: boardHtml(updatedRoom || room), title: 'TOHID LUDO' });
  } catch (error) {}

  if (updatedRoom?.winner) {
    return `🤖 Bot moved. ${updatedRoom.winner} wins!`;
  }

  return '🤖 Bot turn complete.';
}

module.exports = {
  name: 'ludo',
  aliases: ['ludogame', 'ludoboard'],
  description: '2-player HTML Ludo with bot or human challenge',
  category: 'games',

  async execute({ sock, from, reply, pushName, msg, args }) {
    const mentioned = getMentionedTarget(msg, args);
    const room = getRoomForJid(from);

    if (!args || !args.length) {
      if (room && room.status === 'active') {
        try {
          await sendRichHtml({ sock, jid: from, quoted: msg, html: boardHtml(room), title: 'TOHID LUDO' });
          return;
        } catch (error) {
          return reply('Ludo board could not be opened.');
        }
      }

      try {
        await sendRichHtml({ sock, jid: from, quoted: msg, html: offlineHtml(), title: 'TOHID LUDO' });
        return;
      } catch (error) {
        return reply('Ludo HTML could not open. Use `.ludo bot` for command mode.');
      }
    }

    const first = String(args[0]).toLowerCase();

    if (first === 'html' || first === 'offline' || first === 'local') {
      try {
        await sendRichHtml({ sock, jid: from, quoted: msg, html: offlineHtml(), title: 'TOHID LUDO' });
        return;
      } catch (error) {
        return reply('Ludo HTML could not open.');
      }
    }

    if (first === 'bot') {
      const botRoom = createBotRoom(from, pushName || 'Player');
      try {
        await sendRichHtml({ sock, jid: from, quoted: msg, html: boardHtml(botRoom), title: 'TOHID LUDO' });
        return reply('🤖 Ludo vs BOT started.\nUse .ludo roll');
      } catch (error) {
        return reply('BOT Ludo could not start.');
      }
    }

    if (first === 'accept') {
      const targetRoomId = args[1] || null;
      const accepted = acceptChallenge(targetRoomId, from);
      if (!accepted) return reply('No pending Ludo room to accept.');
      try {
        await sendRichHtml({ sock, jid: from, quoted: msg, html: boardHtml(accepted), title: 'TOHID LUDO' });
        return reply(`✅ Ludo challenge accepted.\nRoom: ${accepted.id}\n${accepted.players[accepted.currentTurn]?.name} turn.`);
      } catch (error) {
        return reply('Challenge accepted but board could not open.');
      }
    }

    if (first === 'roll') {
      const currentRoom = getRoomForJid(from);
      if (!currentRoom) return reply('No active Ludo room. Start with .ludo or .ludo @user');

      if (currentRoom.players[currentRoom.currentTurn]?.type === 'bot') {
        const botReply = await handleBotTurn(sock, from, msg, currentRoom);
        return reply(botReply || '🤖 Bot turn complete.');
      }

      const rolled = rollDice(currentRoom);
      if (!rolled.ok) return reply(rolled.message);

      try {
        await sendRichHtml({ sock, jid: from, quoted: msg, html: boardHtml(currentRoom), title: 'TOHID LUDO' });
        return reply(`🎲 Dice: ${rolled.dice}\nUse: .ludo move 0 / .ludo move 1 / .ludo move 2 / .ludo move 3`);
      } catch (error) {
        return reply(`🎲 Dice: ${rolled.dice}. Use .ludo move 0..3`);
      }
    }

    if (first === 'move') {
      const currentRoom = getRoomForJid(from);
      if (!currentRoom) return reply('No active game room.');
      const tokenIndex = Number(args[1]);
      if (!Number.isInteger(tokenIndex) || tokenIndex < 0 || tokenIndex > 3) {
        return reply('Choose a token 0-3: .ludo move 0');
      }

      const activePlayer = currentRoom.players[currentRoom.currentTurn];
      const result = moveToken(currentRoom, activePlayer?.jid || from, tokenIndex);
      if (!result.ok) return reply(result.message);

      if (currentRoom.players[currentRoom.currentTurn]?.type === 'bot') {
        const botReply = await handleBotTurn(sock, from, msg, currentRoom);
        return reply(`${result.message || 'Move made.'}\n${botReply || '🤖 Bot turn complete.'}`);
      }

      try {
        await sendRichHtml({ sock, jid: from, quoted: msg, html: boardHtml(currentRoom), title: 'TOHID LUDO' });
      } catch (error) {}

      return reply(result.message || 'Move made.');
    }

    if (mentioned) {
      const room = createChallengeRoom({
        challengerJid: from,
        challengerName: pushName || 'Player',
        opponentJid: mentioned,
        opponentName: 'Opponent',
      });
      try {
        await sendRichHtml({ sock, jid: from, quoted: msg, html: boardHtml(room), title: 'TOHID LUDO' });
        return reply(`🎮 Ludo challenge sent to ${mentioned}.\nRoom ID: ${room.id}\nOpponent use: .ludo accept ${room.id}`);
      } catch (error) {
        return reply(`Ludo challenge sent to ${mentioned}. Room ID: ${room.id}`);
      }
    }

    if (first === 'cancel' || first === 'close') {
      const currentRoom = getRoomForJid(from);
      if (!currentRoom) return reply('No active Ludo room.');
      removeRoom(currentRoom.id);
      return reply('Ludo room closed.');
    }

    return reply('🎮 LUDO COMMANDS\n.ludo -> start bot match\n.ludo bot -> play vs BOT\n.ludo @user -> challenge user\n.ludo accept <roomid> -> accept challenge\n.ludo roll -> roll dice\n.ludo move 0..3 -> move token');
  },
};
