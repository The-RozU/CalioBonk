import * as THREE from 'three';
import type { World } from './World';
import type { Player } from './Player';
import type { Input } from './Input';

export class CameraController {
  readonly camera:THREE.PerspectiveCamera;
  private readonly ray = new THREE.Raycaster();
  private readonly target = new THREE.Vector3();
  private readonly followTarget = new THREE.Vector3();
  private readonly desired = new THREE.Vector3();
  private readonly direction = new THREE.Vector3();
  private started = false;
  private distance = 6.1;

  constructor(private readonly player:Player,private readonly input:Input,private readonly world:World) {
    this.camera=new THREE.PerspectiveCamera(64,window.innerWidth/window.innerHeight,.06,480);
    window.addEventListener('wheel',(event)=>{
      if(!this.input.active) return;
      event.preventDefault();
      this.distance=THREE.MathUtils.clamp(this.distance+Math.sign(event.deltaY)*.7,3.2,10.5);
    },{passive:false});
    this.update(1);
  }
  update(dt:number):void {
    this.target.copy(this.player.root.position).add(new THREE.Vector3(0,1.64,0));
    // Follow the player's position smoothly, but NEVER smooth mouse rotation.
    // The old .lerp(camera.position, 11*dt) added noticeable input latency.
    if (!this.started) this.followTarget.copy(this.target);
    else this.followTarget.lerp(this.target, 1 - Math.exp(-22 * dt));
    const distance=this.distance, horizontal=Math.cos(this.input.pitch)*distance;
    this.desired.set(
      this.followTarget.x+Math.sin(this.input.yaw)*horizontal,
      this.followTarget.y+1.05+Math.sin(this.input.pitch)*distance,
      this.followTarget.z+Math.cos(this.input.yaw)*horizontal,
    );
    this.direction.copy(this.desired).sub(this.followTarget);
    const maxDistance=this.direction.length();
    this.ray.set(this.followTarget,this.direction.normalize());
    this.ray.far=maxDistance;
    // A low third-person camera cannot be allowed to sink under hills.
    const hits=this.ray.intersectObject(this.world.terrain,false);
    if(hits.length && hits[0]!.distance<maxDistance){
      this.desired.copy(this.followTarget).addScaledVector(this.direction,Math.max(1,hits[0]!.distance-.3));
    }
    this.camera.position.copy(this.desired);
    this.camera.lookAt(this.followTarget);
    this.started=true;
  }
  resize():void {
    this.camera.aspect=window.innerWidth/window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
}
