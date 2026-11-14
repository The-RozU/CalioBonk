import assert from 'node:assert/strict';
import {SOLO_WAVE_INTERVAL,SOLO_CLEAR_DELAY,SOFT_SLIME_DISTANCE,
  soloWaveSize,soloWaveCap,slimeSeparation} from '../src/game/SoloSurvival.mjs';

assert.equal(SOLO_WAVE_INTERVAL,25);
assert.ok(SOLO_CLEAR_DELAY>0);
assert.deepEqual([1,2,3,4,5,6].map(soloWaveSize),[7,10,13,16,19,22]);
assert.equal(soloWaveCap(1),20);
assert.equal(soloWaveCap(5),52);
assert.equal(soloWaveCap(30),120);
assert.equal(soloWaveSize(99),42);
assert.equal(soloWaveSize(0),0);

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
console.log('OK: Solo wave progression, caps, neighbor-based separation (250 mobs)');
