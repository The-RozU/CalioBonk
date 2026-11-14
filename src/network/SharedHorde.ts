// Shared online Slimes are server-owned. The client only interpolates their sprites.
import * as THREE from 'three';
import {groundHeight} from '../game/Terrain';
import {slimeSpriteTexture} from '../game/Slimes';

export type SharedEnemy={id:number;x:number;z:number;hp:number};
type EnemyVisual={
  sprite:THREE.Sprite;
  shadow:THREE.Mesh;
  destination:THREE.Vector3;
  hp:number;
  age:number;
};
const shadowGeo=new THREE.CircleGeometry(.37,12);
const shadowMat=new THREE.MeshBasicMaterial({color:'#06140c',transparent:true,opacity:.25,depthWrite:false});

export class SharedHorde{
  private readonly models=new Map<number,EnemyVisual>();
  kills=0;
  constructor(private readonly scene:THREE.Scene){}
  get alive():number{return this.models.size;}

  sync(enemies:SharedEnemy[],kills:number):void{
    this.kills=kills;
    const known=new Set<number>();
    for(const enemy of enemies){
      known.add(enemy.id);
      const position=new THREE.Vector3(enemy.x,groundHeight(enemy.x,enemy.z)+.48,enemy.z);
      let model=this.models.get(enemy.id);
      if(!model){
        const sprite=new THREE.Sprite(new THREE.SpriteMaterial({
          map:slimeSpriteTexture,transparent:true,depthWrite:false,alphaTest:.08,
        }));
        sprite.scale.set(.9,.95,1);
        const shadow=new THREE.Mesh(shadowGeo,shadowMat);
        shadow.rotation.x=-Math.PI/2;
        sprite.position.copy(position);
        shadow.position.set(enemy.x,position.y-.46,enemy.z);
        this.scene.add(sprite,shadow);
        model={sprite,shadow,destination:position.clone(),hp:enemy.hp,age:0};
        this.models.set(enemy.id,model);
      }
      if(enemy.hp<model.hp)model.sprite.material.color.set('#ffb2a4');
      model.hp=enemy.hp;
      model.destination.copy(position);
    }
    for(const id of this.models.keys())if(!known.has(id))this.remove(id);
  }
  private remove(id:number):void{
    const model=this.models.get(id);if(!model)return;
    this.models.delete(id);
    this.scene.remove(model.sprite,model.shadow);
    model.sprite.material.dispose();
  }
  update(dt:number):void{
    for(const model of this.models.values()){
      model.age+=dt;
      model.sprite.position.lerp(model.destination,Math.min(1,dt*13));
      model.sprite.position.y+=Math.sin(model.age*10)*.004;
      model.shadow.position.x=model.sprite.position.x;
      model.shadow.position.z=model.sprite.position.z;
      model.shadow.position.y=groundHeight(model.sprite.position.x,model.sprite.position.z)+.025;
      model.sprite.material.color.lerp(new THREE.Color('#ffffff'),Math.min(1,dt*9));
    }
  }
  clear():void{for(const id of this.models.keys())this.remove(id);}
}
