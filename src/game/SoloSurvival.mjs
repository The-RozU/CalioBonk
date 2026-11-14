// Shared pure rules for SOLO waves and soft Slime separation.
// Keep this module independent from Three.js so it can be tested under Node.js.
export const SOLO_WAVE_INTERVAL=25;
export const SOLO_CLEAR_DELAY=3.5;
export const SOFT_SLIME_DISTANCE=.72;

export function soloWaveSize(wave){
  if(!Number.isFinite(wave)||wave<1)return 0;
  return Math.min(42,4+Math.floor(wave)*3);
}
export function soloWaveCap(wave){
  if(!Number.isFinite(wave)||wave<1)return 0;
  return Math.min(120,12+Math.floor(wave)*8);
}

// Spatial buckets limit comparisons to nearby neighbors, rather than all pairs.
// Return per-enemy corrections: geometry, physics, and map collisions remain client-owned.
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
            // Deterministic fallback when two mobs have identical coordinates.
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
