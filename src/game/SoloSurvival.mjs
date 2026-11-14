// SOLO pacing and movement constants. Time is active gameplay time only.
export const SOLO_ATTACK_RANGE=13.5;
export const SUMMON_DELAY=1.3;
export const SUMMON_DURATION=3.5;
export const SOFT_SLIME_DISTANCE=.72;
export const SUMMON_MIN_DISTANCE=21;
export const SUMMON_MAX_DISTANCE=29;

export function soloThreatTier(seconds){
  if(!Number.isFinite(seconds)||seconds<0)return 1;
  return Math.min(7,1+Math.floor(seconds/19));
}
export function soloBatchSize(seconds){
  if(!Number.isFinite(seconds)||seconds<0)return 4;
  return Math.min(10,4+Math.floor(seconds/38));
}
export function soloActiveCap(seconds){
  if(!Number.isFinite(seconds)||seconds<0)return 16;
  return Math.min(115,16+Math.floor(seconds/24)*6);
}
export function soloBatchInterval(seconds){
  if(!Number.isFinite(seconds)||seconds<0)return 6.5;
  return Math.max(3.6,6.5-seconds/135);
}

// Spatial buckets compare only nearby Slimes, not every possible pair.
export function slimeSeparation(positions,dt){
  const offsets=Array.from({length:positions.length},()=>({x:0,z:0}));
  if(positions.length<2||dt<=0)return offsets;
  const cell=.9;
  const buckets=new Map();
  for(let i=0;i<positions.length;i++){
    const p=positions[i];
    const key=Math.floor(p.x/cell)+','+Math.floor(p.z/cell);
    let list=buckets.get(key);
    if(!list){list=[];buckets.set(key,list);}
    list.push(i);
  }
  const minSq=SOFT_SLIME_DISTANCE*SOFT_SLIME_DISTANCE;
  const tension=Math.min(.75,dt*18);
  for(let i=0;i<positions.length;i++){
    const p=positions[i],cx=Math.floor(p.x/cell),cz=Math.floor(p.z/cell);
    for(let gx=cx-1;gx<=cx+1;gx++){
      for(let gz=cz-1;gz<=cz+1;gz++){
        for(const j of buckets.get(gx+','+gz)??[]){
          if(j<=i)continue;
          const other=positions[j];
          let dx=other.x-p.x,dz=other.z-p.z;
          const sq=dx*dx+dz*dz;
          if(sq>=minSq)continue;
          let dist=Math.sqrt(sq);
          if(dist<.0001){
            const angle=((i*131+j*67)%360)*Math.PI/180;
            dx=Math.cos(angle);dz=Math.sin(angle);dist=1;
            const force=SOFT_SLIME_DISTANCE*tension*.5;
            offsets[i].x-=dx*force;offsets[i].z-=dz*force;
            offsets[j].x+=dx*force;offsets[j].z+=dz*force;
            continue;
          }
          const force=(SOFT_SLIME_DISTANCE-dist)*tension*.5/dist;
          const sx=dx*force,sz=dz*force;
          offsets[i].x-=sx;offsets[i].z-=sz;
          offsets[j].x+=sx;offsets[j].z+=sz;
        }
      }
    }
  }
  const maxStep=Math.min(.17,dt*8);
  for(const delta of offsets){
    const length=Math.hypot(delta.x,delta.z);
    if(length>maxStep){delta.x*=maxStep/length;delta.z*=maxStep/length;}
  }
  return offsets;
}
