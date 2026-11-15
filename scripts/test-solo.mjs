import assert from 'node:assert/strict';
import {SOLO_ATTACK_RANGE,SUMMON_DELAY,SUMMON_DURATION,SUMMON_MIN_DISTANCE,SUMMON_MAX_DISTANCE,
  SOFT_SLIME_DISTANCE,soloThreatTier,soloBatchSize,soloActiveCap,soloBatchInterval,
  slimeSeparation} from '../src/game/SoloSurvival.mjs';

assert.equal(SOLO_ATTACK_RANGE,13.5);
assert.ok(SUMMON_DURATION>SUMMON_DELAY);
assert.ok(SUMMON_MIN_DISTANCE>SOLO_ATTACK_RANGE);
assert.ok(SUMMON_MAX_DISTANCE>SUMMON_MIN_DISTANCE);
assert.equal(soloThreatTier(0),1);
assert.equal(soloThreatTier(38),3); // Blue slime unlock.
assert.equal(soloThreatTier(76),5); // Red slime unlock.
assert.equal(soloThreatTier(114),7); // Toxic slime unlock.
for(let time=0;time<1200;time+=8){
  assert.ok(soloBatchSize(time)>=4&&soloBatchSize(time)<=10);
  assert.ok(soloActiveCap(time)>=soloBatchSize(time)&&soloActiveCap(time)<=115);
  assert.ok(soloBatchInterval(time)>=3.6&&soloBatchInterval(time)<=6.5);
}
assert.ok(soloBatchSize(240)>soloBatchSize(0));
assert.ok(soloBatchInterval(240)<soloBatchInterval(0));
const separated=slimeSeparation([{x:0,z:0},{x:2,z:0}],.016);
assert.deepEqual(separated,[{x:0,z:0},{x:0,z:0}]);
const near=[{x:0,z:0},{x:.18,z:0}];
for(let i=0;i<45;i++){
  const delta=slimeSeparation(near,.016);
  for(let j=0;j<near.length;j++){near[j].x+=delta[j].x;near[j].z+=delta[j].z;}
}
assert.ok(Math.abs(near[1].x-near[0].x)>=SOFT_SLIME_DISTANCE-.005,
  'two touching Slimes separate smoothly');
const packed=Array.from({length:250},()=>({x:0,z:0}));
for(let tick=0;tick<30;tick++){
  const deltas=slimeSeparation(packed,.016);
  for(let i=0;i<packed.length;i++){
    assert.ok(Number.isFinite(deltas[i].x)&&Number.isFinite(deltas[i].z));
    assert.ok(Math.hypot(deltas[i].x,deltas[i].z)<=.129);
    packed[i].x+=deltas[i].x;packed[i].z+=deltas[i].z;
  }
}
assert.ok(packed.some(p=>Math.hypot(p.x,p.z)>.3),'dense crowd begins to spread');
console.log('OK: continuous short bursts, distant summoning, short attack range and separation');
