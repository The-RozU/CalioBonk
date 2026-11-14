// Cooperative alpha v0.0.17. Server owns waves, enemy positions, shot timing and damage.
// Clients render arrows and hit effects from events; they never decide whether a hit lands.
export const WAVE_INTERVAL=16;
export const MAX_HORDE=80;
export const SHOT_TRAVEL=.3;
const FIRST_WAVE=18;
const ATTACK_RANGE_SQ=24*24;
const SLIME_HP=36;

export function createHorde(){
  return {enemies:new Map(),nextId:1,elapsed:0,kills:0,wave:0,nextWave:0,shots:[]};
}
function spawn(horde,focus){
  const id=horde.nextId++;
  const angle=(id*2.399963229728653+horde.wave*.19)%(Math.PI*2);
  const distance=10+(id%7)*.85;
  const enemy={id,x:focus.x+Math.sin(angle)*distance,z:focus.z+Math.cos(angle)*distance,hp:SLIME_HP};
  horde.enemies.set(id,enemy);
}
function spawnWave(room,active,emit){
  const horde=room.horde;
  horde.wave++;
  const count=horde.wave===1?FIRST_WAVE:Math.min(38,10+horde.wave*4);
  let spawned=0;
  for(let i=0;i<count&&horde.enemies.size<MAX_HORDE;i++){
    const focus=active[(horde.nextId+i)%active.length];
    spawn(horde,focus);spawned++;
  }
  horde.nextWave=WAVE_INTERVAL;
  emit({type:'waveStarted',wave:horde.wave,spawned,alive:horde.enemies.size});
}
export function hordeSnapshot(horde){
  return {type:'enemies',kills:horde.kills,wave:horde.wave,
    enemies:Array.from(horde.enemies.values(),e=>({id:e.id,x:+e.x.toFixed(2),z:+e.z.toFixed(2),hp:e.hp}))};
}
export function stepHorde(room,dt,emit){
  const horde=room.horde;
  const active=Array.from(room.players.values()).filter(p=>p.ready&&p.health>0);
  if(!active.length)return;
  horde.elapsed+=dt;
  horde.nextWave-=dt;
  if(horde.wave===0||horde.nextWave<=0||(horde.enemies.size===0&&horde.nextWave<9)){
    spawnWave(room,active,emit);
  }

  // Complete server-owned arrows before scheduling new attacks.
  for(let i=horde.shots.length-1;i>=0;i--){
    const shot=horde.shots[i];
    shot.remaining-=dt;
    if(shot.remaining>0)continue;
    horde.shots.splice(i,1);
    const enemy=horde.enemies.get(shot.targetId);
    if(!enemy)continue;
    enemy.hp=Math.max(0,enemy.hp-shot.damage);
    emit({type:'enemyHit',id:enemy.id,damage:shot.damage,by:shot.by});
    if(enemy.hp===0){
      horde.enemies.delete(enemy.id);
      horde.kills++;
      emit({type:'enemyKilled',id:enemy.id,kills:horde.kills,x:enemy.x,z:enemy.z,exp:5});
    }
  }
  for(const enemy of horde.enemies.values()){
    let target=null,closest=38*38;
    for(const player of active){
      const dx=player.x-enemy.x,dz=player.z-enemy.z;
      const squared=dx*dx+dz*dz;
      if(squared<closest){closest=squared;target=player;}
    }
    if(target&&closest>.85*.85){
      const dist=Math.sqrt(closest);
      const speed=2.05*dt;
      enemy.x+=(target.x-enemy.x)/dist*speed;
      enemy.z+=(target.z-enemy.z)/dist*speed;
    }
  }
  for(const player of active){
    player.attackCooldown=(player.attackCooldown??0)-dt;
    if(player.attackCooldown<=0){
      let victim=null,closest=ATTACK_RANGE_SQ;
      for(const enemy of horde.enemies.values()){
        const dx=enemy.x-player.x,dz=enemy.z-player.z;
        const dist=dx*dx+dz*dz;
        if(dist<closest){closest=dist;victim=enemy;}
      }
      if(victim){
        horde.shots.push({by:player.id,targetId:victim.id,damage:18,remaining:SHOT_TRAVEL});
        emit({type:'arrowFired',by:player.id,targetId:victim.id,
          x:player.x,y:player.y,z:player.z,
          tx:victim.x,tz:victim.z,duration:SHOT_TRAVEL});
        player.attackCooldown=.78;
      }else player.attackCooldown=.15;
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
        emit({type:'playerHealth',id:player.id,hp:player.health});
        if(player.health===0){player.ready=false;emit({type:'playerDown',id:player.id});}
      }
    }
  }
}
