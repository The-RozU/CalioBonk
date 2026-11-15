// Server-owned Slimes and client-only effects for local cooperative mode.
import * as THREE from 'three';
import {groundHeight} from '../game/Terrain';
import {slimeSpriteTexture} from '../game/Slimes';

export type SharedEnemy={id:number;x:number;z:number;hp:number};
export type SharedArrow={
  by:string;targetId:number;x:number;y:number;z:number;tx:number;tz:number;duration:number;
};
type EnemyVisual={sprite:THREE.Sprite;shadow:THREE.Mesh;destination:THREE.Vector3;hp:number;age:number};
type ArrowVisual={
  mesh:THREE.Group;from:THREE.Vector3;fallback:THREE.Vector3;
  targetId:number;age:number;duration:number;
};
const shadowGeo=new THREE.CircleGeometry(.37,12);
const shadowMat=new THREE.MeshBasicMaterial({color:'#06140c',transparent:true,opacity:.25,depthWrite:false});
const shaftGeo=new THREE.CylinderGeometry(.025,.025,.79,5);
const shaftMat=new THREE.MeshStandardMaterial({color:'#e4bc80',roughness:.6,metalness:.1});
const tipGeo=new THREE.ConeGeometry(.07,.19,5);
const tipMat=new THREE.MeshStandardMaterial({color:'#b8c3ae',roughness:.4,metalness:.5});
const UP=new THREE.Vector3(0,1,0);
const WHITE=new THREE.Color('#ffffff');
const FLASH=new THREE.Color('#ffb2a4');

function createArrow():THREE.Group{
  const arrow=new THREE.Group();
  const shaft=new THREE.Mesh(shaftGeo,shaftMat);
  const tip=new THREE.Mesh(tipGeo,tipMat);
  tip.position.y=.47;
  arrow.add(shaft,tip);
  return arrow;
}
export class SharedHorde{
  private readonly models=new Map<number,EnemyVisual>();
  private readonly arrows:ArrowVisual[]=[];
  private readonly arrowPool:THREE.Group[]=[];
  kills=0;
  wave=0;
  constructor(private readonly scene:THREE.Scene){}
  get alive():number{return this.models.size;}
  get projectileCount():number{return this.arrows.length;}

  sync(enemies:SharedEnemy[],kills:number,wave=0):void{
    this.kills=kills;this.wave=wave;
    const known=new Set<number>();
    for(const enemy of enemies){
      known.add(enemy.id);
      const y=groundHeight(enemy.x,enemy.z);
      const position=new THREE.Vector3(enemy.x,y+.48,enemy.z);
      let model=this.models.get(enemy.id);
      if(!model){
        const sprite=new THREE.Sprite(new THREE.SpriteMaterial({
          map:slimeSpriteTexture,transparent:true,depthWrite:false,alphaTest:.08,
        }));
        sprite.scale.set(.9,.95,1);
        const shadow=new THREE.Mesh(shadowGeo,shadowMat);
        shadow.rotation.x=-Math.PI/2;
        sprite.position.copy(position);
        shadow.position.set(enemy.x,y+.025,enemy.z);
        this.scene.add(sprite,shadow);
        model={sprite,shadow,destination:position.clone(),hp:enemy.hp,age:0};
        this.models.set(enemy.id,model);
      }
      if(enemy.hp<model.hp)model.sprite.material.color.copy(FLASH);
      model.hp=enemy.hp;
      model.destination.copy(position);
    }
    for(const id of this.models.keys())if(!known.has(id))this.remove(id);
  }

  showHit(id:number):void{
    const model=this.models.get(id);
    if(model)model.sprite.material.color.copy(FLASH);
  }

  shoot(data:SharedArrow):void{
    if(this.arrows.length>=160)return;
    const arrow=this.arrowPool.pop()??createArrow();
    const from=new THREE.Vector3(data.x,data.y+1.32,data.z);
    const fallback=new THREE.Vector3(data.tx,groundHeight(data.tx,data.tz)+.56,data.tz);
    arrow.position.copy(from);
    this.scene.add(arrow);
    this.arrows.push({
      mesh:arrow,from,fallback,targetId:data.targetId,age:0,
      duration:Math.max(.12,data.duration),
    });
  }

  private remove(id:number):void{
    const model=this.models.get(id);if(!model)return;
    this.models.delete(id);
    this.scene.remove(model.sprite,model.shadow);
    model.sprite.material.dispose();
  }

  private releaseArrow(i:number):void{
    const shot=this.arrows[i]!;
    this.scene.remove(shot.mesh);
    if(this.arrowPool.length<160)this.arrowPool.push(shot.mesh);
    this.arrows.splice(i,1);
  }

  update(dt:number):void{
    for(const model of this.models.values()){
      model.age+=dt;
      model.sprite.position.lerp(model.destination,Math.min(1,dt*13));
      model.shadow.position.x=model.sprite.position.x;
      model.shadow.position.z=model.sprite.position.z;
      model.shadow.position.y=groundHeight(model.sprite.position.x,model.sprite.position.z)+.025;
      model.sprite.material.color.lerp(WHITE,Math.min(1,dt*7));
    }
    for(let i=this.arrows.length-1;i>=0;i--){
      const shot=this.arrows[i]!;
      shot.age+=dt;
      const t=Math.min(1,shot.age/shot.duration);
      const target=this.models.get(shot.targetId)?.sprite.position??shot.fallback;
      shot.mesh.position.copy(shot.from).lerp(target,t);
      const direction=target.clone().sub(shot.from);
      if(direction.lengthSq()>0.0001)shot.mesh.quaternion.setFromUnitVectors(UP,direction.normalize());
      if(t>=1)this.releaseArrow(i);
    }
  }

  clear():void{
    for(const id of this.models.keys())this.remove(id);
    for(let i=this.arrows.length-1;i>=0;i--)this.releaseArrow(i);
    this.kills=0;this.wave=0;
  }
}
