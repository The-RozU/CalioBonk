// Pure draft logic for upgrade cards. No rendering or Three.js dependency.
export const CARD_RARITIES=Object.freeze([
  Object.freeze({id:'common',name:'ZWYKŁA',ranks:1}),
  Object.freeze({id:'rare',name:'RZADKA',ranks:2}),
  Object.freeze({id:'epic',name:'EPICKA',ranks:3}),
  Object.freeze({id:'legendary',name:'LEGENDARNA',ranks:4}),
]);

export function rollRarity(level,rng=Math.random){
  // Slightly better odds as the run progresses, but never guaranteed.
  const boost=Math.min(1,Math.max(0,(level-1)/15));
  const common=65-20*boost;
  const rare=27+9*boost;
  const epic=7+9*boost;
  const roll=Math.min(.999999,Math.max(0,rng()))*100;
  const id=roll<common?0:roll<common+rare?1:roll<common+rare+epic?2:3;
  return CARD_RARITIES[id];
}

export function drawUpgradeCards(cards,ranks,level,previousIds=[],rng=Math.random){
  const ownedAttacks=cards.filter(card=>card.id.startsWith('attack-')&&(ranks[card.id]??0)>0).length;
  const available=cards.filter(card=>{
    const rank=ranks[card.id]??0;
    if(rank>=(card.maxRank??5))return false;
    if(card.id.startsWith('attack-')&&rank===0&&ownedAttacks>=2)return false;
    return true;
  });
  const preferred=available.filter(card=>!previousIds.includes(card.id));
  // Avoid showing the same options twice when sufficient alternatives exist.
  const pool=preferred.length>=3?preferred.slice():available.slice();
  const offers=[];
  while(pool.length>0&&offers.length<3){
    const roll=Math.max(0,Math.min(.999999,rng()));
    const [card]=pool.splice(Math.floor(roll*pool.length),1);
    const rarity=rollRarity(level,rng);
    const rank=ranks[card.id]??0;
    const limit=card.maxRank??5;
    const gains=Math.min(rarity.ranks,limit-rank);
    // Display the actual strength when a card reaches its rank cap.
    const effective=CARD_RARITIES.find(item=>item.ranks===gains)??rarity;
    offers.push({id:card.id,rarity:effective.id,rarityName:effective.name,gains,from:rank,to:rank+gains});
  }
  return offers;
}
