import assert from 'node:assert/strict';
import {createHorde,hordeSnapshot,stepHorde,MAX_HORDE,WAVE_INTERVAL} from './horde.mjs';

const player={id:'tester',x:0,y:0,z:4,ready:true,health:100,
  // Deliberately disable outgoing shots and damage for an isolated wave test.
  attackCooldown:Infinity,hurtCooldown:Infinity};
const room={players:new Map([['one',player]]),horde:createHorde()};
const events=[];
stepHorde(room,.1,msg=>events.push(msg));
assert.equal(room.horde.wave,1,'first ready player starts the first wave');
assert.equal(room.horde.enemies.size,18,'first wave contains 18 slimes');
assert.equal(events.filter(x=>x.type==='waveStarted').length,1,'wave event broadcast');
assert.equal(hordeSnapshot(room.horde).enemies.length,18);
for(let i=0;i<Math.ceil(WAVE_INTERVAL/.1)+1;i++)stepHorde(room,.1,msg=>events.push(msg));
assert.ok(room.horde.wave>=2,'second wave spawns after a fixed interval');
assert.ok(room.horde.enemies.size>18,'second wave arrives in a group');
assert.ok(room.horde.enemies.size<=MAX_HORDE,'active wave cap');

const fighter={id:'archer',x:0,y:0,z:4,ready:true,health:100,
  attackCooldown:0,hurtCooldown:Infinity};
const battle={players:new Map([['archer',fighter]]),horde:createHorde()};
const battleEvents=[];
stepHorde(battle,.1,msg=>battleEvents.push(msg));
assert.ok(battleEvents.some(e=>e.type==='arrowFired'),'server broadcasts visible arrow event');
assert.ok(!battleEvents.some(e=>e.type==='enemyHit'),'shot does not hit instantly');
for(let i=0;i<4;i++)stepHorde(battle,.1,msg=>battleEvents.push(msg));
assert.ok(battleEvents.some(e=>e.type==='enemyHit'),'server resolves arrow on arrival');
console.log('OK: grouped Slime waves, hard cap, visual arrow event and delayed server hit');
