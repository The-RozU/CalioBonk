// Pure SOLO enemy rules: progression and balance stay testable without WebGL.
export const SLIME_TRAITS=Object.freeze({
  green: Object.freeze({name:'Zielony',hp:36,speed:3.0,scale:1,exp:5,contact:12,jumpPower:5.2,jumpDelay:1,color:'#74d58c'}),
  blue: Object.freeze({name:'Niebieski',hp:24,speed:4.8,scale:.88,exp:5,contact:9,jumpPower:6.5,jumpDelay:.52,color:'#65baf5'}),
  red: Object.freeze({name:'Czerwony',hp:96,speed:2.0,scale:1.36,exp:12,contact:18,jumpPower:4.2,jumpDelay:1.4,color:'#e17a68'}),
  toxic: Object.freeze({name:'Toksyczny',hp:48,speed:2.7,scale:1.06,exp:8,contact:10,jumpPower:5.0,jumpDelay:1.2,color:'#b28bf1'}),
});
export const TOXIC_POOL=Object.freeze({damage:7,radius:1.35,duration:4.2,cooldown:3.1,maxActive:28});
export function slimeVariantForWave(wave,roll){
  if(wave<3)return 'green';
  const r=Math.max(0,Math.min(.999999,Number.isFinite(roll)?roll:0));
  if(wave<5)return r<.65?'green':'blue';
  if(wave<7)return r<.47?'green':r<.78?'blue':'red';
  return r<.38?'green':r<.63?'blue':r<.83?'red':'toxic';
}
