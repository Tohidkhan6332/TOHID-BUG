'use strict';
async function executeGroupAdvanced(command, c = {}) {
 const {sock,msg:m,reply,args=[],text='',prefix='.',isCreator=false,isSudo=false,isAdmins=false,botNumber,sleep=ms=>new Promise(r=>setTimeout(r,ms)),addNewsletterContext=v=>v,participants=[]}=c;
 switch(String(command||'').toLowerCase()) {
 case 'kickadmins':
 case 'kickall': {
  if(!m.isGroup)return reply(m.group);
  if(!isCreator&&!isSudo)return reply('🔒 *Owner/Sudo only*');
  const metadata=await sock.groupMetadata(m.chat).catch(()=>null), members=metadata?.participants||[];
  let kicked=0;
  for(const member of members){
   if(member.id===botNumber|| (command==='kickadmins'&&member.id===m.sender))continue;
   const admin=member.admin==='superadmin'||member.admin==='admin';
   if(command==='kickadmins'&&!admin)continue;
   if(command==='kickall'&&admin)continue;
   await sock.groupParticipantsUpdate(m.chat,[member.id],'remove');kicked++;await sleep(1500);
  }
  reply(command==='kickadmins'?\`✅ *\${kicked} admins removed*\`:\`✅ *\${kicked} members removed*\`);return true;
 }
 case 'creategc': case 'creategroup': {
  if(!isCreator)return reply('🔒 *Owner only*');
  const name=args.join(' ');if(!name)return reply(\`📝 *Usage:* \${prefix+command} Group Name\`);
  try{const created=await sock.groupCreate(name,[]),code=await sock.groupInviteCode(created.id),link=\`https://chat.whatsapp.com/\${code}\`;
   sock.sendMessage(m.chat,addNewsletterContext({text:\`✅ *Group Created*\\n\\n💳 Name: \${created.subject}\\n👤 Owner: @\${created.owner.split('@')[0]}\\n🔗 \${link}\`,mentions:[created.owner]}),{quoted:m});
  }catch(_){reply('❌ *Failed to create group*');}return true;
 }
 case 'linkgc': case 'grouplink': {
  if(!m.isGroup)return reply('👥 *Groups only*');if(!isCreator&&!isSudo)return reply('🔒 *Owner/Sudo only*');
  const code=await sock.groupInviteCode(m.chat);reply(\`🔗 *Group Link*\\nhttps://chat.whatsapp.com/\${code}\`);return true;
 }
 case 'kick': {
  if(!isCreator)return reply('🔒 *Owner only*');if(!m.quoted)return reply('👤 *Tag or quote user to kick*');if(!m.isGroup)return reply('👥 *Groups only*');
  const user=m.mentionedJid[0]||m.quoted?.sender||text.replace(/[^0-9]/g,'')+'@s.whatsapp.net';
  await sock.groupParticipantsUpdate(m.chat,[user],'remove');reply('✅ *User kicked*');return true;
 }
 case 'tag': case 'totag': {
  if(!isCreator)return reply('🔒 *Owner only*');if(!m.isGroup)return reply('👥 *Groups only*');if(!isAdmins)return reply('👑 *Admin only*');
  if(!m.quoted)return reply(\`💬 *Reply to a message with \${prefix+command}*\`);
  sock.sendMessage(m.chat,{forward:m.quoted.fakeObj,mentions:participants.map(a=>a.id)});return true;
 }
 case 'groupstatus': case 'gstatus': case 'gst': {
  if(!m.isGroup)return reply('👥 *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 Group Status*\\n\\nThis command can only be used in groups.');
  try{
   await sock.sendMessage(m.chat,{react:{text:'📢',key:m.key}});
   const quoted=m.quoted,input=text;
   if(!quoted&&!input)return reply(\`📢 *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 Group Status*\\n\\nReply to an image/video/audio or provide text to post as group status.\\n\\nExample: \${prefix}gstatus Hello group!\`);
   const id=()=> '3EB0'+Math.random().toString(36).substring(2,15)+Math.random().toString(36).substring(2,15);
   const relay=async(content)=>sock.relayMessage(m.chat,{groupStatusMessageV2:{message:content}},{messageId:id()});
   if(!quoted&&input){
    await relay({extendedTextMessage:{text:input,backgroundArgb:0xFF000000,textArgb:0xFFFFFFFF,font:1,contextInfo:{mentionedJid:[],isGroupStatus:true}}});
    await sock.sendMessage(m.chat,{react:{text:'✅',key:m.key}});return reply('📢 *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 Group Status*\\n\\nText status posted!');
   }
   if(quoted){
    const mime=(quoted.msg||quoted).mimetype||'';
    if(/image/.test(mime)){const media=await quoted.download();await sock.sendMessage(m.chat,{image:media,caption:input||quoted.caption||'',contextInfo:{isGroupStatus:true}});}
    else if(/video/.test(mime)){const media=await quoted.download();await sock.sendMessage(m.chat,{video:media,caption:input||quoted.caption||'',contextInfo:{isGroupStatus:true}});}
    else if(/audio/.test(mime)){const media=await quoted.download();await sock.sendMessage(m.chat,{audio:media,mimetype:'audio/mpeg',ptt:false,contextInfo:{isGroupStatus:true}});}
    else if(quoted.conversation||quoted.text){const value=quoted.conversation||quoted.text||input;await relay({extendedTextMessage:{text:value,backgroundArgb:0xFF000000,textArgb:0xFFFFFFFF,font:2,contextInfo:{mentionedJid:[],isGroupStatus:true}}});}
    else return reply('❌ *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 Group Status*\\n\\nUnsupported media type. Reply to image, video, audio, or text only.');
    await sock.sendMessage(m.chat,{react:{text:'✅',key:m.key}});reply('📢 *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 Group Status*\\n\\nStatus posted!');
   }
  }catch(error){console.error('Group Status Error:',error);await sock.sendMessage(m.chat,{react:{text:'❌',key:m.key}});reply(\`⚠️ *𝐓𝐎𝐇𝐈𝐃 𝐀𝐈 Group Status*\\n\\nFailed: \${error.message}\`);}
  return true;
 }
 default:return false;
 }
}
module.exports={executeGroupAdvanced};
