import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {WebSocket} from 'ws';

const processServer=spawn(process.execPath,['server/index.mjs'],{
  env:{...process.env,HOST:'127.0.0.1',PORT:'0'},stdio:['ignore','pipe','pipe'],
});
let serverError='';
processServer.stderr.on('data',chunk=>{serverError+=String(chunk);});
const port=await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Server start timeout: '+serverError)),10000);
  processServer.stdout.on('data',data=>{
    const match=String(data).match(/CALIOBONK_SERVER 127\.0\.0\.1:(\d+)/);
    if(match){clearTimeout(timer);resolve(Number(match[1]));}
  });
  processServer.once('exit',code=>{clearTimeout(timer);reject(Error('Server stopped: '+code+' '+serverError));});
});
const sockets=[];
const open=()=>new Promise((resolve,reject)=>{
  const ws=new WebSocket('ws://127.0.0.1:'+port);sockets.push(ws);
  ws.once('open',()=>resolve(ws));ws.once('error',reject);
});
function wait(ws,type){
  return new Promise((resolve,reject)=>{
    const handler=data=>{
      const message=JSON.parse(String(data));
      if(message.type!==type)return;
      clearTimeout(timer);ws.off('message',handler);resolve(message);
    };
    const timer=setTimeout(()=>{ws.off('message',handler);reject(Error('Missing message '+type));},3500);
    ws.on('message',handler);
  });
}
try{
  const one=await open();
  const created=wait(one,'joined');one.send(JSON.stringify({type:'create',name:'Łucznik'}));
  const joinedOne=await created;
  assert.match(joinedOne.room,/^[A-Z2-9]{5}$/);assert.equal(joinedOne.players.length,0);

  const two=await open();
  const joined=wait(two,'joined'), entered=wait(one,'playerJoined');
  two.send(JSON.stringify({type:'join',room:joinedOne.room,name:'Mag'}));
  const [joinedTwo,newPlayer]=await Promise.all([joined,entered]);
  assert.equal(joinedTwo.room,joinedOne.room);
  assert.equal(joinedTwo.players.length,1);assert.equal(joinedTwo.players[0].name,'Łucznik');
  assert.equal(newPlayer.player.name,'Mag');

  const moving=wait(one,'move');two.send(JSON.stringify({type:'move',x:8,y:1,z:2,yaw:1.2}));
  const movement=await moving;assert.equal(movement.id,joinedTwo.playerId);assert.equal(movement.x,8);
  const leaving=wait(one,'playerLeft');two.close();
  assert.equal((await leaving).id,joinedTwo.playerId);
  console.log('OK: join, room code, remote movement and disconnect');
}finally{
  for(const ws of sockets)ws.terminate();
  processServer.kill('SIGTERM');
}
