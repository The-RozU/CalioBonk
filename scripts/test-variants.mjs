import assert from 'node:assert/strict';
import {SLIME_TRAITS,TOXIC_POOL,slimeVariantForWave} from '../src/game/SlimeVariants.mjs';
for(const wave of [1,2]){
  for(let n=0;n<100;n++)assert.equal(slimeVariantForWave(wave,n/100),'green');
}
assert.equal(slimeVariantForWave(3,.64),'green');
assert.equal(slimeVariantForWave(3,.65),'blue');
assert.equal(slimeVariantForWave(4,.99),'blue');
assert.equal(slimeVariantForWave(5,.46),'green');
assert.equal(slimeVariantForWave(5,.47),'blue');
assert.equal(slimeVariantForWave(6,.78),'red');
assert.equal(slimeVariantForWave(7,.82),'red');
assert.equal(slimeVariantForWave(7,.83),'toxic');
for(const wave of [1,3,5,7,30]){
 const types=new Set(Array.from({length:1000},(_,i)=>slimeVariantForWave(wave,i/1000)));
 assert.equal(types.size,[1,3,5,7,30].indexOf(wave)===0?1:wave<=4?2:wave<=6?3:4);
}
assert.ok(SLIME_TRAITS.blue.speed>SLIME_TRAITS.green.speed);
assert.ok(SLIME_TRAITS.blue.hp<SLIME_TRAITS.green.hp);
assert.ok(SLIME_TRAITS.red.hp>2*SLIME_TRAITS.green.hp);
assert.ok(SLIME_TRAITS.red.contact>SLIME_TRAITS.green.contact);
assert.ok(SLIME_TRAITS.red.exp>SLIME_TRAITS.green.exp);
assert.ok(TOXIC_POOL.duration>TOXIC_POOL.cooldown);
assert.ok(TOXIC_POOL.maxActive<=32);
console.log('OK: four Slime variants unlock gradually, speeds/HP/EXP and toxic pool balance');
