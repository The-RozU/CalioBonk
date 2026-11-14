// Cooperative alpha combat: server owns positions, HP, deaths and the shared kill counter.
// Fixed-rate snapshots keep Three.js/particles exclusively on the clients.
export function createHorde(room){
  const horde={enemies:new Map(),nextId:1,nextSpawn:0,elapsed:0,kills:0};
  for(let i=0;i<3;i++)spawn(horde,0,4,i);
  return horde;
}
function spawn(horde,x,z,seed=0){
  const id=horde.nextId++;
  const angle=(id*2.39996+seed)% (Math.PI*2);
  const distance=8+(id%4);
  const enemy={id,x:x+Math.sin(angle)*distance,z:z+Math.cos(angle)*distance,hp:36,age:0};
  horde.enemies.set(id,enemy);return enemy;
}
export function hordeSnapshot(horde){
  return {type:'enemies',kills:horde.kills,enemies:Array.from(horde.enemies.values(),e=>({id:e.id,x:+e.x.toFixed(2),z:+e.z.toFixed(2),hp:e.hp}))};
}
export function stepHorde(room,dt,sendToRoom){
  const horde=room.horde;
  const active=Array.from(room.players.values()).filter(p=>p.ready);
  if(!active.length)return;
  horde.elapsed+=dt;horde.nextSpawn-=dt;
  if(horde.nextSpawn<=0&&horde.enemies.size<Math.min(60,6+Math.max(0,active.length-1)*4)){
    const focus=active[horde.nextId%active.length];
    spawn(horde,focus.x,focus.z);horde.nextSpawn=2.7;
  }
  for(const enemy of horde.enemies.values()){
    enemy.age+=dt;
    let target=null,closest=38*38;
    for(const player of active){
      const dx=player.x-enemy.x,dz=player.z-enemy.z;
      const d=dx*dx+dz*dz;
      if(d<closest){closest=d;target=player;}
    }
    if(target&&closest>0.85*0.85){
      const distance=Math.sqrt(closest);
      const speed=2.3*dt;
      enemy.x+=((target.x-enemy.x)/distance)*speed;
      enemy.z+=((target.z-enemy.z)/distance)*speed;
    }
  }
  for(const player of active){
    player.attackCooldown=(player.attackCooldown??0)-dt;
    if(player.attackCooldown<=0){
      let victim=null,dist=24*24;
      for(const enemy of horde.enemies.values()){
        const dx=enemy.x-player.x,dz=enemy.z-player.z;
        const d=dx*dx+dz*dz;
        if(d<dist){dist=d;victim=enemy;}
      }
      if(victim){
        victim.hp=Math.max(0,victim.hp-18);
        sendToRoom({type:'enemyHit',id:victim.id,damage:18,by:player.id});
        if(victim.hp<=0){
          horde.enemies.delete(victim.id);horde.kills++;
          sendToRoom({type:'enemyKilled',id:victim.id,kills:horde.kills,x:victim.x,z:victim.z,exp:5});
        }
        player.attackCooldown=.78;
      }else player.attackCooldown=.12;
    }
    player.hurtCooldown=(player.hurtCooldown??0)-dt;
    if(player.hurtCooldown<=0){
      let touching=false;
      for(const enemy of horde.enemies.values()){
        const dx=enemy.x-player.x,dz=enemy.z-player.z;
        if(dx*dx+dz*dz<.8*.8){touching=true;break;}
      }
      if(touching){
        player.health=Math.max(0,player.health-12);
        player.hurtCooldown=.85;
        sendToRoom({type:'playerHealth',id:player.id,hp:player.health});
        if(player.health<=0){player.ready=false;sendToRoom({type:'playerDown',id:player.id});}
      }
    }
  }
}
