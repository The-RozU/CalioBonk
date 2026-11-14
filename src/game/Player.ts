import * as THREE from 'three';
import { groundHeight } from './Terrain';
import {SOLO_ATTACK_RANGE} from './SoloSurvival.mjs';
import type { Input } from './Input';
import type { World } from './World';

function material(color:string,metalness=0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({color,roughness: metalness ? .54 : .95,metalness,flatShading:true});
}
function mesh(geometry:THREE.BufferGeometry, mat:THREE.Material, parent:THREE.Object3D,x=0,y=0,z=0):THREE.Mesh {
  const o=new THREE.Mesh(geometry,mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
}
function angularDifference(a:number,b:number):number { return Math.atan2(Math.sin(b-a),Math.cos(b-a)); }

export class Player {
  readonly root = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly leftLeg = new THREE.Group();
  private readonly rightLeg = new THREE.Group();
  private readonly leftArm = new THREE.Group();
  private readonly rightArm = new THREE.Group();
  private readonly bow = new THREE.Group();
  private readonly shadow: THREE.Mesh;
  private vx=0;
  private vz=0;
  private vy=0;
  private airborne=false;
  private animTime=0;
  readonly spawn = new THREE.Vector3(0,groundHeight(0,4),4);
  speed = 0;
  dashing = false;
  dashCooldown = 0;
  readonly dashCooldownDuration = 1.4;
  private dashRemaining = 0;
  private readonly dashDuration = 0.23;
  health = 100;
  readonly stats={damage:1,attackSpeed:1,moveSpeed:1,maxHealth:100,range:1,magnet:1,criticalChance:0,damageReduction:0,tripleLevel:0,poisonLevel:0,pierceLevel:0};
  private damageCooldown = 0;
  private hitFlash = 0;
  private attackTime = 0;
  private readonly attackDuration = .43;
  private attackHeading = 0;
  private dashX = 0;
  private dashZ = 0;

  constructor(private readonly scene:THREE.Scene) {
    this.root.position.copy(this.spawn);
    this.root.name='Calion Wanderer';
    this.root.add(this.body);
    const cloth=material('#334d43');
    const armor=material('#424a43',.45);
    const iron=material('#8a9385',.7);
    const leather=material('#362e28');
    const trim=material('#b4a472',.65);
    const skin=material('#b9a38b');
    const hood=material('#293c36');
    // Waist and torso are deliberately low-poly: readable in third person.
    mesh(new THREE.CylinderGeometry(.36,.48,.86,7),cloth,this.body,0,.84,0);
    mesh(new THREE.BoxGeometry(.75,.84,.46),armor,this.body,0,1.34,0);
    mesh(new THREE.BoxGeometry(.51,.12,.50),trim,this.body,0,1.04,0);
    // A full hood encloses the skull. Only the small forward face opening is exposed.
    // The previous bare head sphere protruded through a half-cap, resembling a helmet.
    mesh(new THREE.CylinderGeometry(.19,.22,.23,6),hood,this.body,0,1.82,-.02);
    const hoodShell=mesh(new THREE.SphereGeometry(.245,8,6),hood,this.body,0,2.035,-.015);
    hoodShell.scale.set(1.04,1.03,1.07);
    mesh(new THREE.BoxGeometry(.30,.245,.035),leather,this.body,0,1.992,-.264);
    mesh(new THREE.BoxGeometry(.205,.157,.039),skin,this.body,0,1.982,-.288);
    // Hood brim and cloth cheeks frame the opening without hiding the face.
    mesh(new THREE.BoxGeometry(.35,.085,.11),hood,this.body,0,2.15,-.26);
    for(const side of [-1,1]){
      mesh(new THREE.BoxGeometry(.087,.27,.105),hood,this.body,side*.165,1.97,-.254);
    }
    mesh(new THREE.BoxGeometry(.155,.025,.036),leather,this.body,0,2.024,-.316);
    // Short field mantle leaves the belt and legs clearly visible.
    mesh(new THREE.BoxGeometry(.78,.58,.12),cloth,this.body,0,.68,.31);
    // Utility belt and a small metal clasp.
    mesh(new THREE.BoxGeometry(.88,.13,.52),leather,this.body,0,.91,0);
    mesh(new THREE.BoxGeometry(.13,.16,.08),trim,this.body,0,.91,-.28);
    mesh(new THREE.BoxGeometry(.14,.16,.16),trim,this.body,-.39,1.51,-.05);
    mesh(new THREE.BoxGeometry(.14,.16,.16),trim,this.body,.39,1.51,-.05);

    this.leftLeg.position.set(-.21,.82,0);
    this.rightLeg.position.set(.21,.82,0);
    this.body.add(this.leftLeg,this.rightLeg);
    for(const leg of [this.leftLeg,this.rightLeg]){
      mesh(new THREE.BoxGeometry(.29,.72,.31),leather,leg,0,-.35,0);
      mesh(new THREE.BoxGeometry(.32,.22,.46),armor,leg,0,-.74,-.1);
    }
    this.leftArm.position.set(-.53,1.62,-.07);
    this.rightArm.position.set(.48,1.62,-.03);
    this.body.add(this.leftArm,this.rightArm);
    for(const arm of [this.leftArm,this.rightArm]){
      mesh(new THREE.BoxGeometry(.29,.63,.35),armor,arm,0,-.33,0);
      mesh(new THREE.BoxGeometry(.23,.2,.23),skin,arm,0,-.73,0);
    }
    // The bow grip is centered exactly on the left hand, ahead and to the side of the torso.
    // Its parent follows the arm, while the animation counter-rotates its pitch so it stays upright.
    this.bow.position.set(-.015,-.73,-.055);
    this.leftArm.add(this.bow);
    const woodBow=material('#8c6339',.2), string=material('#d8ceb0');
    const bowCurve=new THREE.CubicBezierCurve3(
      new THREE.Vector3(-.32,.59,0),new THREE.Vector3(.17,.54,0),
      new THREE.Vector3(.17,-.54,0),new THREE.Vector3(-.32,-.59,0),
    );
    mesh(new THREE.TubeGeometry(bowCurve,24,.037,5,false),woodBow,this.bow);
    // The string stays on the outside of the bow, not across the hero's chest.
    mesh(new THREE.CylinderGeometry(.009,.009,1.18,5),string,this.bow,-.32,0,-.025);
    mesh(new THREE.CylinderGeometry(.055,.055,.22,6),leather,this.bow,0,0,-.022);
    const quiver=mesh(new THREE.CylinderGeometry(.13,.18,.72,7),leather,this.body,.3,1.12,.34);
    quiver.rotation.x=-.18; quiver.rotation.z=-.28;
    for(let i=0;i<3;i++){
      const shaft=mesh(new THREE.CylinderGeometry(.012,.012,.56,4),iron,this.body,.3+i*.045,1.56,.31);
      shaft.rotation.z=-.08;
      mesh(new THREE.BoxGeometry(.07,.09,.035),material('#a65c3d'),this.body,.3+i*.045,1.79,.31);
    }
    // Bracer on the bow arm reads as practical field gear.
    mesh(new THREE.BoxGeometry(.34,.29,.39),leather,this.leftArm,0,-.47,-.02);
    mesh(new THREE.BoxGeometry(.36,.08,.41),trim,this.leftArm,0,-.35,-.02);
    // Idle: the bow arm is extended forward; the drawing hand rests lower near the chest.
    this.leftArm.rotation.x=.68;
    this.leftArm.rotation.z=-.12;
    this.rightArm.rotation.x=.24;
    this.bow.rotation.x=-this.leftArm.rotation.x;
    this.bow.rotation.z=-this.leftArm.rotation.z;

    this.scene.add(this.root);
    const shadowMaterial=new THREE.MeshBasicMaterial({color:'#101715',transparent:true,opacity:.3,depthWrite:false});
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(.64,24),shadowMaterial);
    this.shadow.rotation.x=-Math.PI/2;
    this.shadow.position.copy(this.spawn);this.shadow.position.y+=.025;
    this.scene.add(this.shadow);
  }

  get defeated():boolean { return this.health <= 0; }
  get hitRecently():boolean { return this.hitFlash > 0; }

  takeDamage(amount:number):boolean {
    if(this.defeated || this.damageCooldown>0) return false;
    this.health=Math.max(0,this.health-amount*(1-this.stats.damageReduction));
    this.damageCooldown=.85;
    this.hitFlash=.28;
    return true;
  }

  startAttack(target:THREE.Vector3):boolean {
    if (this.dashing || this.attackTime > 0) return false;
    const dx=target.x-this.root.position.x;
    const dz=target.z-this.root.position.z;
    if(Math.hypot(dx,dz)>SOLO_ATTACK_RANGE*this.stats.range)return false;
    this.attackHeading=Math.atan2(-dx,-dz);
    this.attackTime=this.attackDuration;
    return true;
  }

  update(dt:number,input:Input,world:World,elapsed:number):void {
    this.attackTime=Math.max(0,this.attackTime-dt);
    this.damageCooldown=Math.max(0,this.damageCooldown-dt);
    this.hitFlash=Math.max(0,this.hitFlash-dt);
    const axes=input.getAxes();
    const dx = -Math.sin(input.yaw)*axes.forward + Math.cos(input.yaw)*axes.right;
    const dz = -Math.cos(input.yaw)*axes.forward - Math.sin(input.yaw)*axes.right;
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    const leftShift = input.consumePress('ShiftLeft');
    const rightShift = input.consumePress('ShiftRight');
    if ((leftShift || rightShift) && this.dashCooldown <= 0) {
      // If moving, dash in movement direction; otherwise, dash straight ahead
      // relative to the current camera. A short hop gives the move weight.
      const moving = Math.hypot(dx, dz) > .01;
      this.dashX = moving ? dx : -Math.sin(input.yaw);
      this.dashZ = moving ? dz : -Math.cos(input.yaw);
      this.dashRemaining = this.dashDuration;
      this.dashCooldown = this.dashCooldownDuration;
      if (!this.airborne) {
        this.vy = 4.4;
        this.airborne = true;
      }
    }

    this.dashing = this.dashRemaining > 0;
    if (this.dashing) {
      const progress = 1 - this.dashRemaining / this.dashDuration;
      const dashSpeed = THREE.MathUtils.lerp(23, 12, progress);
      this.vx = this.dashX * dashSpeed;
      this.vz = this.dashZ * dashSpeed;
      this.dashRemaining = Math.max(0, this.dashRemaining - dt);
    } else {
      // Normal walking speed, with just enough damping for a natural stop.
      const damping = 1 - Math.exp(-13 * dt);
      this.vx = THREE.MathUtils.lerp(this.vx, dx * 4.7 * this.stats.moveSpeed, damping);
      this.vz = THREE.MathUtils.lerp(this.vz, dz * 4.7 * this.stats.moveSpeed, damping);
    }
    const xx=this.root.position.x+this.vx*dt;
    const zz=this.root.position.z+this.vz*dt;
    let blocked = false;
    if(!world.collides(xx,this.root.position.z)) this.root.position.x=xx;
    else { this.vx=0; blocked=true; }
    if(!world.collides(this.root.position.x,zz)) this.root.position.z=zz;
    else { this.vz=0; blocked=true; }
    if (blocked && this.dashing) {
      this.dashRemaining = 0; // no dashing through walls/rocks
      this.dashing = false;
    }
    if (this.dashing && this.dashRemaining <= 0) {
      // End the dash cleanly without carrying sprint-like momentum.
      this.vx = dx * 4.7;
      this.vz = dz * 4.7;
    }
    this.speed=Math.hypot(this.vx,this.vz);

    if(this.attackTime>0){
      this.body.rotation.y+=angularDifference(this.body.rotation.y,this.attackHeading)*(1-Math.exp(-23*dt));
    }else if(this.speed>.15){
      const desiredHeading=Math.atan2(-this.vx,-this.vz);
      this.body.rotation.y+=angularDifference(this.body.rotation.y,desiredHeading)*(1-Math.exp(-13*dt));
    }

    const ground=groundHeight(this.root.position.x,this.root.position.z);
    if(!this.airborne && input.down('Space')){this.vy=8.1;this.airborne=true;}
    this.vy-=22*dt;
    this.root.position.y+=this.vy*dt;
    if(this.root.position.y<=ground){this.root.position.y=ground;this.vy=0;this.airborne=false;}

    this.animTime+=dt*8.5*Math.min(1,this.speed/3.7);
    const walk=Math.min(1,this.speed/4);
    const swing=Math.sin(this.animTime)*.62*walk;
    this.leftLeg.rotation.x=this.dashing?-.44:this.airborne?-.15:swing;
    this.rightLeg.rotation.x=this.dashing?.52:this.airborne?.28:-swing;
    // Keep the grip attached to the left hand and the limbs above/below it.
    this.leftArm.rotation.x=this.dashing?.44:this.airborne?.55:.68-swing*.10;
    this.rightArm.rotation.x=this.dashing?.12:this.airborne?.2:.24+swing*.08;
    this.leftArm.rotation.z=-.12;
    this.rightArm.rotation.z=0;
    let draw=0;
    if(this.attackTime>0){
      const progress=1-this.attackTime/this.attackDuration;
      draw=Math.sin(progress*Math.PI);
      // Lift the bow away from the torso and bring the drawing hand toward the string.
      this.leftArm.rotation.x=.68+draw*.38;
      this.rightArm.rotation.x=.24+draw*.55;
      this.rightArm.rotation.z=-draw*.48;
    }
    // Compensate for arm pitch and roll: the bow must not rotate across the chest.
    this.bow.rotation.x=-this.leftArm.rotation.x;
    this.bow.rotation.z=-this.leftArm.rotation.z+draw*.08;
    this.bow.rotation.y=-.15+draw*.13;
    this.bow.position.set(-.015,-.73,-.055-draw*.075);
    this.body.position.y=(this.airborne?0:Math.abs(Math.sin(this.animTime))*walk*.05) + Math.sin(elapsed*1.9)*.01;
    this.body.rotation.z=Math.sin(this.animTime)*.028*walk;
    this.body.rotation.x=THREE.MathUtils.lerp(this.body.rotation.x,this.dashing?-.33:-.055,1-Math.exp(-17*dt));

    this.shadow.position.set(this.root.position.x,ground+.035,this.root.position.z);
    const height=this.root.position.y-ground;
    this.shadow.scale.setScalar(1+height*.15);
    (this.shadow.material as THREE.MeshBasicMaterial).opacity=.32-Math.min(height*.065,.22);
  }
}
