import assert from 'node:assert/strict';
import {CARD_RARITIES,rollRarity,drawUpgradeCards} from '../src/game/UpgradeDraft.mjs';
assert.deepEqual(CARD_RARITIES.map(r=>r.ranks),[1,2,3,4]);
assert.equal(rollRarity(1,()=>0).id,'common');
assert.equal(rollRarity(1,()=>.66).id,'rare');
assert.equal(rollRarity(1,()=>.94).id,'epic');
assert.equal(rollRarity(1,()=>.999).id,'legendary');
assert.equal(rollRarity(16,()=>.5).id,'rare');
const defs=[
  {id:'damage'},{id:'speed'},{id:'range'},{id:'health'},{id:'magnet'},
  {id:'attack-triple'},{id:'attack-poison'},{id:'attack-pierce'},
  {id:'provision',maxRank:Infinity},
];
const ranks={'damage':4,'attack-triple':1,'attack-poison':1};
const offered=drawUpgradeCards(defs,ranks,12,[],()=>.9999);
assert.equal(offered.length,3);
assert.equal(new Set(offered.map(c=>c.id)).size,3);
assert.ok(!offered.some(c=>c.id==='attack-pierce'),'third new active attack must remain locked');
assert.ok(offered.every(c=>c.gains>=1));
for(const card of offered)if(card.id==='damage')assert.equal(card.gains,1,'cap at rank 5');
const first=drawUpgradeCards(defs,{},1,[],()=>0);
const second=drawUpgradeCards(defs,{},1,first.map(x=>x.id),()=>0);
assert.equal(second.length,3);
assert.ok(!second.some(x=>first.map(y=>y.id).includes(x.id)),'reroll replaces current cards when possible');
const end=drawUpgradeCards(defs,{
  damage:5,speed:5,range:5,health:5,magnet:5,'attack-triple':5,'attack-poison':5,'attack-pierce':0,
},30,[],()=>.9999);
assert.equal(end.length,1,'repeatable heal remains if normal cards are maxed');
assert.equal(end[0].id,'provision');
console.log('OK: rarity odds, ranks, distinct cards, rerolls, attack limit and late-game fallback');
