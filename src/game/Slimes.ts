import * as THREE from 'three';
import { groundHeight } from './Terrain';
import type { World } from './World';
import type { Player } from './Player';

const MAX_HEALTH = 36;
const ARROW_DAMAGE = 18;
const CONTACT_DAMAGE = 12;

function addPart(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number, y: number, z: number,
): THREE.Mesh {
  const piece = new THREE.Mesh(geometry, material);
  piece.position.set(x, y, z);
  piece.castShadow = true;
  parent.add(piece);
  return piece;
}

class Slime {
  readonly root = new THREE.Group();
  readonly shadow: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  private readonly body = new THREE.Group();
  private readonly jelly: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshStandardMaterial>;
  private readonly healthBar = new THREE.Group();
  private readonly healthFill: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private health = MAX_HEALTH;
  private age = 0;
  private height = 0;
  private verticalSpeed = 0;
  private jumpDelay: number;
  private readonly direction = new THREE.Vector2();
  private hitFlash = 0;
  private deathTime = 0;
  dead = false;
  finished = false;

  constructor(
    private readonly scene: THREE.Scene,
    x: number,
    z: number,
    private readonly variation: number,
  ) {
    this.root.name = 'Slime';
    this.root.position.set(x, groundHeight(x, z), z);
    this.root.add(this.body);

    const skin = new THREE.MeshStandardMaterial({
      color: variation > .6 ? '#5fbd70' : '#4e9c62',
      emissive: '#225d32', emissiveIntensity: .38,
      roughness: .38, metalness: .03, flatShading: true,
    });
    this.jelly = addPart(this.body, new THREE.IcosahedronGeometry(.76, 1), skin, 0, .71, 0) as typeof this.jelly;
    this.jelly.scale.set(1.03, .83, .91);
    const darker = new THREE.MeshStandardMaterial({color: '#306d49', roughness: .55, flatShading: true});
    const pale = new THREE.MeshStandardMaterial({color: '#e8e8b9', emissive: '#3b5340', roughness: .4});
    const pupil = new THREE.MeshStandardMaterial({color: '#101d19', roughness: .3});
    for (const side of [-1, 1]) {
      addPart(this.body, new THREE.IcosahedronGeometry(.15, 0), pale, side * .26, .94, -.58);
      addPart(this.body, new THREE.SphereGeometry(.075, 6, 4), pupil, side * .26, .94, -.72);
      addPart(this.body, new THREE.IcosahedronGeometry(.18, 0), skin.clone(), side * .48, 1.13, .13);
    }
    const mouth = addPart(this.body, new THREE.BoxGeometry(.25, .055, .07), darker, 0, .67, -.67);
    mouth.rotation.z = -.05;

    const barBack = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, .18),
      new THREE.MeshBasicMaterial({color: '#13241b', side: THREE.DoubleSide, depthTest: false}),
    );
    this.healthBar.position.set(0, 1.8, 0);
    this.healthBar.add(barBack);
    this.healthFill = new THREE.Mesh(
      new THREE.PlaneGeometry(1.22, .105),
      new THREE.MeshBasicMaterial({color: '#9ce88e', side: THREE.DoubleSide, depthTest: false}),
    );
    this.healthFill.position.z = .015;
    this.healthBar.add(this.healthFill);
    this.healthBar.visible = false;
    this.root.add(this.healthBar);

    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(.73, 16),
      new THREE.MeshBasicMaterial({color: '#07150d', transparent: true, opacity: .33, depthWrite: false}),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.scene.add(this.root, this.shadow);
    this.jumpDelay = .27 + variation * .65;
  }

  get position(): THREE.Vector3 { return this.root.position; }

  takeHit(damage: number): boolean {
    if (this.dead) return false;
    this.health = Math.max(0, this.health - damage);
    this.hitFlash = .19;
    this.healthBar.visible = true;
    const fraction = this.health / MAX_HEALTH;
    this.healthFill.scale.x = fraction;
    this.healthFill.position.x = -(1 - fraction) * .61;
    if (this.health === 0) {
      this.dead = true;
      return true;
    }
    return false;
  }

  update(dt: number, hero: THREE.Vector3, world: World, camera: THREE.Camera): void {
    this.age += dt;
    if (this.dead) {
      this.deathTime += dt;
      this.root.scale.setScalar(Math.max(.001, 1 - this.deathTime / .36));
      this.shadow.scale.setScalar(Math.max(.001, 1 - this.deathTime / .36));
      if (this.deathTime >= .36) this.dispose();
      return;
    }

    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.jelly.material.emissiveIntensity = this.hitFlash > 0 ? 2.5 : .38;
    this.jumpDelay -= dt;
    const dx = hero.x - this.root.position.x;
    const dz = hero.z - this.root.position.z;
    const distance = Math.hypot(dx, dz);
    const chasing = distance > .95 && distance < 38;

    if (this.height <= 0 && this.verticalSpeed <= 0 && chasing && this.jumpDelay <= 0) {
      this.verticalSpeed = 5.2;
      this.direction.set(dx / distance, dz / distance);
      this.root.rotation.y = Math.atan2(-this.direction.x, -this.direction.y);
    }

    if (this.height > 0 || this.verticalSpeed > 0) {
      if (chasing) {
        const speed = 3.0 + this.variation * .7;
        const nextX = this.root.position.x + this.direction.x * speed * dt;
        const nextZ = this.root.position.z + this.direction.y * speed * dt;
        if (!world.collides(nextX, this.root.position.z, .43)) this.root.position.x = nextX;
        if (!world.collides(this.root.position.x, nextZ, .43)) this.root.position.z = nextZ;
      }
      this.verticalSpeed -= 17.5 * dt;
      this.height += this.verticalSpeed * dt;
      if (this.height <= 0) {
        this.height = 0;
        this.verticalSpeed = 0;
        this.jumpDelay = .28 + this.variation * .3;
      }
    }

    const ground = groundHeight(this.root.position.x, this.root.position.z);
    this.root.position.y = ground + this.height;
    const rise = this.height > .01 ? Math.min(this.height / 1.0, 1) : 0;
    const squash = this.height < .01 ? Math.max(0, 1 - Math.max(this.jumpDelay, 0) * 2.5) : 0;
    this.body.scale.set(1 + squash * .06 - rise * .08, 1 - squash * .08 + rise * .12, 1 + squash * .06 - rise * .08);
    this.root.scale.setScalar(Math.min(1, this.age * 5));
    this.healthBar.quaternion.copy(this.root.quaternion).invert().multiply(camera.quaternion);
    this.shadow.position.set(this.root.position.x, ground + .025, this.root.position.z);
    this.shadow.scale.setScalar(1 + this.height * .16);
    this.shadow.material.opacity = .31 - Math.min(.2, this.height * .1);
  }

  private dispose(): void {
    if (this.finished) return;
    this.finished = true;
    this.scene.remove(this.root, this.shadow);
    this.root.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const item of materials) item.dispose();
    });
    this.shadow.geometry.dispose();
    this.shadow.material.dispose();
  }
}

type StrikeEffect = { mesh: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>; age: number };
type ArrowFlight = { mesh: THREE.Group; target: Slime; age: number };

function makeArrow(): THREE.Group {
  const arrow=new THREE.Group();
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.82,5),new THREE.MeshStandardMaterial({color:'#d8c28b',metalness:.35,roughness:.55}));
  shaft.rotation.x=-Math.PI/2; arrow.add(shaft);
  const tip=new THREE.Mesh(new THREE.ConeGeometry(.075,.22,5),new THREE.MeshStandardMaterial({color:'#bbc4b5',metalness:.7,roughness:.3}));
  tip.rotation.x=-Math.PI/2; tip.position.z=-.5; arrow.add(tip);
  for(const side of [-1,1]){const feather=new THREE.Mesh(new THREE.BoxGeometry(.055,.12,.16),new THREE.MeshBasicMaterial({color:'#b66d4c'}));feather.position.set(side*.035,0,.35);arrow.add(feather);}
  return arrow;
}

export class SlimeHorde {
  private readonly enemies: Slime[] = [];
  private readonly effects: StrikeEffect[] = [];
  private readonly arrows: ArrowFlight[] = [];
  private contactCooldown = 0;
  private seed = 72819;
  private spawnDelay = 2.4;
  private cooldown = 0;
  private started = false;
  kills = 0;

  constructor(private readonly world: World) {}

  get alive(): number { return this.enemies.filter(enemy => !enemy.dead).length; }

  private random(): number {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  start(hero: THREE.Vector3): void {
    if (this.started) return;
    this.started = true;
    for (let i = 0; i < 3; i++) this.spawn(hero);
  }

  private spawn(hero: THREE.Vector3): void {
    for (let attempt = 0; attempt < 28; attempt++) {
      const angle = this.random() * Math.PI * 2;
      const distance = 7.2 + this.random() * 4.5;
      const x = hero.x + Math.sin(angle) * distance;
      const z = hero.z + Math.cos(angle) * distance;
      if (this.world.collides(x, z, 1.1)) continue;
      this.enemies.push(new Slime(this.world.scene, x, z, this.random()));
      return;
    }
  }

  private strikeEffect(enemy: Slime): void {
    const material = new THREE.MeshBasicMaterial({
      color: '#f0d49c', side: THREE.DoubleSide, transparent: true,
      opacity: .85, depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(.52, .075, 4, 20, Math.PI * 1.55), material);
    mesh.position.copy(enemy.position);
    mesh.position.y += .75;
    mesh.rotation.y = this.random() * Math.PI * 2;
    this.world.scene.add(mesh);
    this.effects.push({mesh, age: 0});
  }

  update(dt: number, player: Player, camera: THREE.Camera): void {
    if (!this.started) return;
    const hero = player.root.position;
    this.contactCooldown=Math.max(0,this.contactCooldown-dt);

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i]!;
      enemy.update(dt, hero, this.world, camera);
      if (enemy.finished) this.enemies.splice(i, 1);
    }
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i]!;
      effect.age += dt;
      effect.mesh.scale.setScalar(1 + effect.age * 2);
      effect.mesh.material.opacity = .85 * Math.max(0, 1 - effect.age / .26);
      if (effect.age >= .26) {
        this.world.scene.remove(effect.mesh);
        effect.mesh.geometry.dispose();
        effect.mesh.material.dispose();
        this.effects.splice(i, 1);
      }
    }

    for(let i=this.arrows.length-1;i>=0;i--){
      const flight=this.arrows[i]!;
      flight.age+=dt;
      if(flight.target.dead || flight.age>2.5){
        this.world.scene.remove(flight.mesh); flight.mesh.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});
        this.arrows.splice(i,1); continue;
      }
      const origin=flight.mesh.position;
      const aimPosition=flight.target.position.clone().add(new THREE.Vector3(0,.72,0));
      const direction=aimPosition.clone().sub(origin).normalize();
      flight.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),direction);
      const step=22*dt;
      origin.addScaledVector(direction,step);
      if(origin.distanceTo(aimPosition)<step+.65){
        if(flight.target.takeHit(ARROW_DAMAGE)) this.kills++;
        this.strikeEffect(flight.target);
        this.world.scene.remove(flight.mesh);
        flight.mesh.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});
        this.arrows.splice(i,1);
      }
    }
    if(this.contactCooldown<=0 && !player.defeated){
      const touching=this.enemies.some(enemy=>!enemy.dead && Math.hypot(enemy.position.x-hero.x,enemy.position.z-hero.z)<1.35);
      if(touching && player.takeDamage(CONTACT_DAMAGE)) this.contactCooldown=.24;
    }
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.cooldown <= 0) {
      let closest: Slime | undefined;
      let distanceSq = 24 * 24;
      for (const enemy of this.enemies) {
        if (enemy.dead) continue;
        const dx = enemy.position.x - hero.x;
        const dz = enemy.position.z - hero.z;
        const current = dx * dx + dz * dz;
        if (current < distanceSq) {
          closest = enemy;
          distanceSq = current;
        }
      }
      if (closest && player.startAttack(closest.position)) {
        this.cooldown = .78;
        const arrow=makeArrow();
        arrow.position.copy(hero).add(new THREE.Vector3(0,1.45,0));
        const direction=closest.position.clone().add(new THREE.Vector3(0,.72,0)).sub(arrow.position).normalize();
        arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),direction);
        this.world.scene.add(arrow);
        this.arrows.push({mesh:arrow,target:closest,age:0});
      }
    }

    this.spawnDelay -= dt;
    if (this.spawnDelay <= 0 && this.alive < 6) {
      this.spawn(hero);
      this.spawnDelay = 2.7;
    }
  }
}
