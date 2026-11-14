// Animated vertical sky-beam for Solo Slime summons. Procedural Three.js, no external assets.
import * as THREE from 'three';
import {groundHeight} from './Terrain';

const beamGeometry=new THREE.CylinderGeometry(.8,1.55,17,12,1,true);
const coreGeometry=new THREE.CylinderGeometry(.2,.62,17,10,1,true);
const haloGeometry=new THREE.CircleGeometry(2.5,32);
const ringGeometry=new THREE.RingGeometry(1.45,1.85,32);
const sparkleGeometry=new THREE.IcosahedronGeometry(.095,0);
const sparkleMaterial=new THREE.MeshBasicMaterial({color:'#e9fff0',transparent:true,opacity:.92,depthWrite:false});

export class SummoningLight{
  readonly x:number;
  readonly z:number;
  age=0;
  private readonly root=new THREE.Group();
  private readonly outer:THREE.Mesh<THREE.CylinderGeometry,THREE.MeshBasicMaterial>;
  private readonly core:THREE.Mesh<THREE.CylinderGeometry,THREE.MeshBasicMaterial>;
  private readonly halo:THREE.Mesh<THREE.CircleGeometry,THREE.MeshBasicMaterial>;
  private readonly ring:THREE.Mesh<THREE.RingGeometry,THREE.MeshBasicMaterial>;
  private readonly light:THREE.PointLight;
  private readonly motes:THREE.Mesh<THREE.IcosahedronGeometry,THREE.MeshBasicMaterial>[]=[];
  constructor(private readonly scene:THREE.Scene,x:number,z:number){
    this.x=x;this.z=z;
    this.root.position.set(x,groundHeight(x,z)+.05,z);
    this.outer=new THREE.Mesh(beamGeometry,new THREE.MeshBasicMaterial({
      color:'#9bead0',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,
      blending:THREE.AdditiveBlending,
    }));
    this.outer.position.y=8.5;
    this.core=new THREE.Mesh(coreGeometry,new THREE.MeshBasicMaterial({
      color:'#e4ffd0',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,
      blending:THREE.AdditiveBlending,
    }));
    this.core.position.y=8.5;
    this.halo=new THREE.Mesh(haloGeometry,new THREE.MeshBasicMaterial({
      color:'#79e9b5',transparent:true,opacity:0,depthWrite:false,
      blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
    }));
    this.halo.rotation.x=-Math.PI/2;
    this.halo.position.y=.03;
    this.ring=new THREE.Mesh(ringGeometry,new THREE.MeshBasicMaterial({
      color:'#ddffd6',transparent:true,opacity:0,depthWrite:false,
      blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
    }));
    this.ring.rotation.x=-Math.PI/2;
    this.ring.position.y=.055;
    this.light=new THREE.PointLight('#99ffcf',0,7);
    this.light.position.y=1.1;
    this.root.add(this.outer,this.core,this.halo,this.ring,this.light);
    for(let i=0;i<7;i++){
      const mote=new THREE.Mesh(sparkleGeometry,sparkleMaterial);
      this.root.add(mote);this.motes.push(mote);
    }
    this.scene.add(this.root);
  }
  update(dt:number):void{
    this.age+=dt;
    const opening=Math.min(1,this.age/.35);
    const closing=Math.min(1,Math.max(0,(3.5-this.age)/1.2));
    const fade=Math.max(0,Math.min(opening,closing));
    this.outer.material.opacity=.17*fade;
    this.core.material.opacity=.22*fade;
    this.halo.material.opacity=.27*fade;
    this.ring.material.opacity=.75*fade;
    this.light.intensity=1.25*fade;
    this.ring.rotation.z=this.age*.48;
    const expansion=1+Math.sin(this.age*5)*.075;
    this.halo.scale.setScalar(expansion);
    for(let i=0;i<this.motes.length;i++){
      const mote=this.motes[i]!;
      const t=this.age*.85+i*Math.PI*2/this.motes.length;
      const radius=.65+(i%3)*.35;
      mote.position.set(Math.cos(t)*radius,.25+(t*1.8+i*.9)%5,Math.sin(t)*radius);
      mote.scale.setScalar(Math.max(.01,fade*(.7+(i%3)*.2)));
    }
  }
  dispose():void{
    this.scene.remove(this.root);
    this.outer.material.dispose();
    this.core.material.dispose();
    this.halo.material.dispose();
    this.ring.material.dispose();
    this.root.clear();
  }
}
