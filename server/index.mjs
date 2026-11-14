// Server-authoritative basic Slime combat for cooperative alpha v0.0.16.
import {createHorde,hordeSnapshot,stepHorde} from './horde.mjs';
import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {WebSocketServer,WebSocket} from 'ws';
const host=process.env.HOST||'127.0.0.1';
const port=Number(process.env.PORT??2567);
if(!Number.isInteger(port)||port<0||port>65535)throw Error('Invalid PORT');
const rooms=new Map(), sessions=new Map();
const http=createServer((req,res)=>{
  if(req.url==='/health'){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({status:'ok',rooms:rooms.size,players:sessions.size}));return;}
  res.writeHead(404);res.end('CalioBonk LAN server');
});
const wss=new WebSocketServer({server:http,maxPayload:4096});
function send(ws,value){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(value));}
function broadcast(room,value,exclude){for(const socket of room.players.keys())if(socket!==exclude)send(socket,value);}
function state(player){return {id:player.id,name:player.name,x:player.x,y:player.y,z:player.z,yaw:player.yaw};}
function remove(ws){
  const player=sessions.get(ws);if(!player)return;
  sessions.delete(ws);const room=rooms.get(player.room);if(!room)return;
  room.players.delete(ws);broadcast(room,{type:'playerLeft',id:player.id});
  if(room.players.size===0)rooms.delete(player.room);
}
function makeCode(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let result;
  do{result=Array.from(randomBytes(5),b=>chars[b%chars.length]).join('');}while(rooms.has(result));
  return result;
}
function join(ws,room,name){
  if(sessions.has(ws)){send(ws,{type:'error',message:'Jesteś już w pokoju.'});return;}
  if(!room){send(ws,{type:'error',message:'Nie znaleziono pokoju.'});return;}
  if(room.players.size>=4){send(ws,{type:'error',message:'Pokój jest pełny (4 graczy).'});return;}
  const nickname=typeof name==='string'?name.trim().replace(/[<>]/g,'').slice(0,18):'';
  const player={id:randomBytes(8).toString('hex'),name:nickname||'Odkrywca',room:room.code,x:0,y:0,z:4,yaw:0,lastMove:0,ready:false,health:100,attackCooldown:0,hurtCooldown:0};
  const others=Array.from(room.players.values(),state);
  room.players.set(ws,player);sessions.set(ws,player);
  send(ws,{type:'joined',room:room.code,playerId:player.id,players:others});
  send(ws,hordeSnapshot(room.horde));
  send(ws,{type:'playerHealth',id:player.id,hp:player.health});
  broadcast(room,{type:'playerJoined',player:state(player)},ws);
}
wss.on('connection',ws=>{
  ws.on('message',payload=>{
    let msg;try{msg=JSON.parse(String(payload));}catch{send(ws,{type:'error',message:'Nieprawidłowa wiadomość.'});return;}
    if(!msg||typeof msg!=='object')return;
    if(msg.type==='create'){
      if(sessions.has(ws))return send(ws,{type:'error',message:'Już jesteś w pokoju.'});
      const room={code:makeCode(),players:new Map()};room.horde=createHorde(room);rooms.set(room.code,room);join(ws,room,msg.name);
    }else if(msg.type==='join'){
      const code=String(msg.room||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5);
      join(ws,rooms.get(code),msg.name);
    }else if(msg.type==='move'){
      const player=sessions.get(ws);if(!player)return;
      const now=Date.now();if(now-player.lastMove<35)return;
      const {x,y,z,yaw}=msg;
      if(![x,y,z,yaw].every(n=>typeof n==='number'&&Number.isFinite(n)))return;
      if(Math.abs(x)>108||Math.abs(z)>108||y < -15||y > 45||Math.abs(yaw)>7)return;
      player.x=x;player.y=y;player.z=z;player.yaw=yaw;player.lastMove=now;
      const room=rooms.get(player.room);if(room)broadcast(room,{type:'move',id:player.id,x,y,z,yaw},ws);
    }else if(msg.type==='ready'){
      const player=sessions.get(ws);if(!player)return;
      player.ready=!!msg.ready&&player.health>0;
    }else if(msg.type==='leave'){remove(ws);ws.close(1000,'left');}
  });
  ws.on('close',()=>remove(ws));ws.on('error',()=>remove(ws));
});
// Single room tick; no per-room timers to leak after all players disconnect.
const tick=setInterval(()=>{
  for(const room of rooms.values()){
    stepHorde(room,.1,msg=>broadcast(room,msg));
    if(Array.from(room.players.values()).some(p=>p.ready))broadcast(room,hordeSnapshot(room.horde));
  }
},100);
tick.unref();
http.listen(port,host,()=>{
  const addr=http.address();if(!addr||typeof addr==='string')throw Error('No address');
  console.log('CALIOBONK_SERVER '+host+':'+addr.port);
});
function shutdown(){clearInterval(tick);for(const ws of wss.clients)ws.terminate();wss.close(()=>http.close(()=>process.exit(0)));}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
