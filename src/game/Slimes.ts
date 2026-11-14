import * as THREE from 'three';
import { groundHeight } from './Terrain';
import type { World } from './World';
import type { Player } from './Player';

const MAX_HEALTH = 36;
const ARROW_DAMAGE = 18;
const CONTACT_DAMAGE = 12;
export type SlimeRenderMode='3d'|'sprite';
export const SLIME_RENDER_MODE:SlimeRenderMode=new URLSearchParams(location.search).get('slime')==='3d'?'3d':'sprite';
const slimeSpriteTexture=(()=>{
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d')!;
  ctx.clearRect(0,0,128,128);ctx.beginPath();ctx.moveTo(17,72);ctx.quadraticCurveTo(12,42,37,32);ctx.quadraticCurveTo(62,10,91,32);ctx.quadraticCurveTo(116,47,111,76);ctx.quadraticCurveTo(105,111,65,114);ctx.quadraticCurveTo(25,111,17,72);ctx.closePath();
  ctx.fillStyle='#173a2b';ctx.fill();ctx.strokeStyle='#0a2018';ctx.lineWidth=8;ctx.stroke();
  const shine=ctx.createRadialGradient(53,45,4,65,72,55);shine.addColorStop(0,'#c4f2a1');shine.addColorStop(.35,'#70cf7b');shine.addColorStop(1,'#26764b');ctx.fillStyle=shine;ctx.fill();
  ctx.fillStyle='#f4efc9';ctx.beginPath();ctx.ellipse(48,67,8,12,0,0,Math.PI*2);ctx.ellipse(79,67,8,12,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#17251b';ctx.beginPath();ctx.arc(50,69,3.5,0,Math.PI*2);ctx.arc(81,69,3.5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(231,255,190,.55)';ctx.fillRect(37,43,12,4);ctx.fillRect(32,49,5,4);
  const texture=new THREE.CanvasTexture(canvas);texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;texture.colorSpace=THREE.SRGBColorSpace;return texture;
})();
type AttackKind='bow'|'triple'|'poison'|'piercing';

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
  private readonly jelly: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial> | null;
  private readonly billboard:THREE.Sprite;
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
  private poisonRemaining=0;
  private poisonTick=0;
  private poisonDamage=0;
  counted=false;
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

    if(SLIME_RENDER_MODE==='3d'){
      const skin = new THREE.MeshStandardMaterial({
        color: variation > .6 ? '#5fbd70' : '#4e9c62',
        emissive: '#225d32', emissiveIntensity: .38,
        roughness: .38, metalness: .03, flatShading: true,
      });
      const jelly = addPart(this.body, new THREE.SphereGeometry(.66,8,6), skin, 0, .71, 0) as THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
      this.jelly = jelly;
      jelly.scale.set(1.05, .72, 1.0);
      const darker = new THREE.MeshStandardMaterial({color: '#306d49', roughness: .55, flatShading: true});
      const pale = new THREE.MeshStandardMaterial({color: '#e8e8b9', emissive: '#3b5340', roughness: .4});
      const pupil = new THREE.MeshStandardMaterial({color: '#101d19', roughness: .3});
      for (const side of [-1, 1]) {
        addPart(this.body, new THREE.IcosahedronGeometry(.15, 0), pale, side * .26, .94, -.58);
        addPart(this.body, new THREE.SphereGeometry(.075, 6, 4), pupil, side * .26, .94, -.72);
      }
      const mouth = addPart(this.body, new THREE.BoxGeometry(.25, .055, .07), darker, 0, .67, -.67);
      mouth.rotation.z = -.05;
    }else{this.jelly=null;}


    const barBack = new THREE.Mesh(
      new THREE.PlaneGeometry(.9, .13),
      new THREE.MeshBasicMaterial({color: '#13241b', side: THREE.DoubleSide, depthTest: false}),
    );
    this.healthBar.position.set(0, .98, 0);
    this.healthBar.add(barBack);
    this.healthFill = new THREE.Mesh(
      new THREE.PlaneGeometry(.82, .08),
      new THREE.MeshBasicMaterial({color: '#9ce88e', side: THREE.DoubleSide, depthTest: false}),
    );
    this.healthFill.position.z = .015;
    this.healthBar.add(this.healthFill);
    this.healthBar.visible = false;
    this.root.add(this.healthBar);

    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(.4, 16),
      new THREE.MeshBasicMaterial({color: '#07150d', transparent: true, opacity: .33, depthWrite: false}),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.body.visible=SLIME_RENDER_MODE==='3d';
    this.billboard=new THREE.Sprite(new THREE.SpriteMaterial({map:slimeSpriteTexture,transparent:true,depthWrite:false,alphaTest:.08}));
    this.billboard.position.set(0,.49,0);this.billboard.scale.set(.92,.96,1);this.root.add(this.billboard);
    this.billboard.visible=SLIME_RENDER_MODE==='sprite';
    this.scene.add(this.root, this.shadow);
    this.jumpDelay = .27 + variation * .65;
  }

  get position(): THREE.Vector3 { return this.root.position; }

  applyPoison(damagePerSecond:number,duration:number):void { this.poisonDamage=Math.max(this.poisonDamage,damagePerSecond);this.poisonRemaining=Math.max(this.poisonRemaining,duration);this.poisonTick=Math.min(this.poisonTick||.5,.5); }

  takeHit(damage: number): boolean {
    if (this.dead) return false;
    this.health = Math.max(0, this.health - damage);
    this.hitFlash = .19;
    this.healthBar.visible = true;
    const fraction = this.health / MAX_HEALTH;
    this.healthFill.scale.x = fraction;
    this.healthFill.position.x = -(1 - fraction) * .41;
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
    if(this.jelly){this.jelly.material.emissiveIntensity = this.hitFlash > 0 ? 2.5 : this.poisonRemaining>0 ? .9 : .38;this.jelly.material.emissive.set(this.poisonRemaining>0?'#34c96c':'#225d32');}
    this.billboard.material.color.set(this.hitFlash>0?'#ffb18f':this.poisonRemaining>0?'#8cff91':'#ffffff');
    if(this.poisonRemaining>0){this.poisonRemaining=Math.max(0,this.poisonRemaining-dt);this.poisonTick-=dt;if(this.poisonTick<=0){this.health=Math.max(0,this.health-this.poisonDamage*.5);this.poisonTick=.5;if(this.health<=0)this.dead=true;}}
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
        if (!world.collides(nextX, this.root.position.z, .24)) this.root.position.x = nextX;
        if (!world.collides(this.root.position.x, nextZ, .24)) this.root.position.z = nextZ;
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
    this.body.scale.set(.52 * (1 + squash * .13 - rise * .13), .42 * (1 - squash * .16 + rise * .22), .52 * (1 + squash * .13 - rise * .13));
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
    this.billboard.material.dispose();
  }
}

type StrikeEffect = { mesh: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>; age: number };
type ExperienceGem = { root: THREE.Group; age: number; baseY: number; value: number };
type ArrowFlight = { mesh: THREE.Group; target: Slime; age: number; damage:number; criticalChance:number; kind:AttackKind; pierce:number; hit:Set<Slime> };

function makeArrow(kind:AttackKind='bow'): THREE.Group {
  const arrow=new THREE.Group();
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.82,5),new THREE.MeshStandardMaterial({color:kind==='poison'?'#7de07c':kind==='piercing'?'#cad1dc':'#d8c28b',metalness:.35,roughness:.55}));
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
  private readonly arrowPool:THREE.Group[]=[];
  private maxAlive=6;
  private readonly maxDamageNumbers=24;
  private readonly experienceGems: ExperienceGem[] = [];
  experience = 0;
  level = 1;
  experienceProgress = 0;
  experienceRequired = 15;
  pendingLevelUps = 0;
  consumeLevelUp(): boolean { if(this.pendingLevelUps<=0)return false; this.pendingLevelUps--; return true; }
  private contactCooldown = 0;
  private tripleCooldown=1.5;
  private poisonCooldown=2.8;
  private pierceCooldown=2.2;
  private readonly damageNumbers: Array<{sprite:THREE.Sprite;age:number}> = [];
  private seed = 72819;
  private spawnDelay = 2.4;
  private cooldown = 0;
  private started = false;
  kills = 0;

  constructor(private readonly world: World) {}

  get alive(): number { return this.enemies.filter(enemy => !enemy.dead).length; }
  get renderMode():SlimeRenderMode { return SLIME_RENDER_MODE; }
  setTestLimit(limit:number,hero:THREE.Vector3):void { this.maxAlive=[25,50,100,200,300].includes(limit)?limit:6; while(this.alive<this.maxAlive){const before=this.enemies.length;this.spawn(hero);if(this.enemies.length===before)break;} }
  get projectileCount():number { return this.arrows.length; }
  get effectCount():number { return this.effects.length+this.damageNumbers.length; }
  get crystalCount():number { return this.experienceGems.length; }

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

  private acquireArrow(kind:AttackKind):THREE.Group {
    const arrow=this.arrowPool.pop()??makeArrow(kind);arrow.userData.kind=kind;
    const shaft=arrow.children[0];if(shaft instanceof THREE.Mesh && shaft.material instanceof THREE.MeshStandardMaterial)shaft.material.color.set(kind==='poison'?'#7de07c':kind==='piercing'?'#cad1dc':'#d8c28b');
    return arrow;
  }
  private releaseArrow(mesh:THREE.Group):void {this.world.scene.remove(mesh);if(this.arrowPool.length<120)this.arrowPool.push(mesh);}

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

  private registerKill(enemy:Slime):void { if(enemy.counted)return;enemy.counted=true;this.kills++;this.dropExperience(enemy); }

  private showDamage(enemy:Slime,amount:number,critical:boolean):void {
    if(this.damageNumbers.length>=this.maxDamageNumbers){const oldest=this.damageNumbers.shift()!;this.world.scene.remove(oldest.sprite);oldest.sprite.material.map?.dispose();oldest.sprite.material.dispose();}
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;const ctx=canvas.getContext('2d');if(!ctx)return;
    ctx.font='bold 34px system-ui';ctx.textAlign='center';ctx.fillStyle=critical?'#ffe36e': '#f3e8d4';ctx.strokeStyle='#182019';ctx.lineWidth=5;ctx.strokeText(String(Math.round(amount)),64,44);ctx.fillText(String(Math.round(amount)),64,44);
    const texture=new THREE.CanvasTexture(canvas);const material=new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false});const sprite=new THREE.Sprite(material);sprite.position.copy(enemy.position).add(new THREE.Vector3(0,1.8,0));sprite.scale.set(1.1,.55,1);this.world.scene.add(sprite);this.damageNumbers.push({sprite,age:0});
  }

  private dropExperience(enemy: Slime): void {
    const close=this.experienceGems.find(item=>item.root.position.distanceTo(enemy.position)<1.5);
    if(close){close.value+=5;close.root.scale.setScalar(Math.min(1.8,1+close.value*.025));return;}
    const root=new THREE.Group();
    const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.22,0),new THREE.MeshStandardMaterial({color:'#8de1b1',emissive:'#2b9b66',emissiveIntensity:1.2,metalness:.35,roughness:.25}));
    gem.rotation.z=Math.PI/4;
    root.add(gem);
    const glow=new THREE.Mesh(new THREE.OctahedronGeometry(.34,0),new THREE.MeshBasicMaterial({color:'#71e5ae',wireframe:true,transparent:true,opacity:.45,depthWrite:false}));
    root.add(glow);
    root.position.copy(enemy.position);
    root.position.y+=.45;
    this.world.scene.add(root);
    this.experienceGems.push({root,age:0,baseY:root.position.y,value:5});
  }

  private gainExperience(amount:number): void {
    this.experience+=amount;
    this.experienceProgress+=amount;
    while(this.experienceProgress>=this.experienceRequired){
      this.experienceProgress-=this.experienceRequired;
      this.level++;
      this.pendingLevelUps++;
      this.experienceRequired=15*this.level;
    }
  }

  update(dt: number, player: Player, camera: THREE.Camera): void {
    if (!this.started) return;
    const hero = player.root.position;
    this.contactCooldown=Math.max(0,this.contactCooldown-dt);

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i]!;
      enemy.update(dt, hero, this.world, camera);
      if(enemy.dead&&!enemy.counted)this.registerKill(enemy);
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
        this.releaseArrow(flight.mesh);
        this.arrows.splice(i,1); continue;
      }
      const origin=flight.mesh.position;
      const aimPosition=flight.target.position.clone().add(new THREE.Vector3(0,.4,0));
      const direction=aimPosition.clone().sub(origin).normalize();
      flight.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),direction);
      const step=22*dt;
      origin.addScaledVector(direction,step);
      if(origin.distanceTo(aimPosition)<step+.65){
        const critical=Math.random()<flight.criticalChance;
        const baseDamage=flight.kind==='triple'?10:flight.kind==='poison'?9:flight.kind==='piercing'?24:ARROW_DAMAGE;
        const damage=baseDamage*flight.damage*(critical?2:1);
        flight.target.takeHit(damage);this.showDamage(flight.target,damage,critical);
        if(flight.kind==='poison')flight.target.applyPoison(5+flight.damage*2,3+flight.damage);
        if(flight.kind==='piercing'&&flight.pierce>0){flight.hit.add(flight.target);flight.pierce--;const next=this.enemies.filter(e=>!e.dead&&!flight.hit.has(e)).sort((a,b)=>a.position.distanceToSquared(origin)-b.position.distanceToSquared(origin))[0];if(next){flight.target=next;continue;}}
        this.strikeEffect(flight.target);
        this.releaseArrow(flight.mesh);
        this.arrows.splice(i,1);
      }
    }
    if(this.contactCooldown<=0 && !player.defeated){
      const touching=this.enemies.some(enemy=>!enemy.dead && Math.hypot(enemy.position.x-hero.x,enemy.position.z-hero.z)<.9);
      if(touching && player.takeDamage(CONTACT_DAMAGE)) this.contactCooldown=.24;
    }
    for(let i=this.experienceGems.length-1;i>=0;i--){
      const pickup=this.experienceGems[i]!;
      pickup.age+=dt;
      pickup.root.rotation.y+=dt*1.6;
      pickup.root.position.y=pickup.baseY+Math.sin(pickup.age*2.8)*.12;
      const dx=hero.x-pickup.root.position.x,dy=hero.y+1-pickup.root.position.y,dz=hero.z-pickup.root.position.z;
      const distance=Math.hypot(dx,dy,dz);
      if(distance<5*player.stats.magnet){
        const pull=Math.min(1,dt*4.5);
        pickup.root.position.x+=dx*pull;pickup.root.position.y+=dy*pull;pickup.root.position.z+=dz*pull;
      }
      if(distance<.85){
        this.gainExperience(pickup.value);
        this.world.scene.remove(pickup.root);
        pickup.root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});
        this.experienceGems.splice(i,1);
      }
    }

    for(let i=this.damageNumbers.length-1;i>=0;i--){const item=this.damageNumbers[i]!;item.age+=dt;item.sprite.position.y+=dt*.8;item.sprite.material.opacity=Math.max(0,1-item.age/.7);if(item.age>.7){this.world.scene.remove(item.sprite);item.sprite.material.map?.dispose();item.sprite.material.dispose();this.damageNumbers.splice(i,1);}}
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.cooldown <= 0) {
      let closest: Slime | undefined;
      let distanceSq = (24*player.stats.range) ** 2;
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
        this.cooldown = .78/player.stats.attackSpeed;
        const arrow=this.acquireArrow('bow');
        arrow.position.copy(hero).add(new THREE.Vector3(0,1.25,0));
        const direction=closest.position.clone().add(new THREE.Vector3(0,.72,0)).sub(arrow.position).normalize();
        arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),direction);
        this.world.scene.add(arrow);
        this.arrows.push({mesh:arrow,target:closest,age:0,damage:player.stats.damage,criticalChance:player.stats.criticalChance,kind:'bow',pierce:0,hit:new Set()});
      }
    }

    const target=this.enemies.filter(e=>!e.dead).sort((a,b)=>a.position.distanceToSquared(hero)-b.position.distanceToSquared(hero))[0];
    const fire=(kind:AttackKind,count=1,pierce=0):void=>{
      if(!target)return;
      for(let n=0;n<count;n++){
        const arrow=this.acquireArrow(kind);arrow.position.copy(hero).add(new THREE.Vector3((n-(count-1)/2)*.22,1.45,0));
        const direction=target.position.clone().add(new THREE.Vector3(0,.72,0)).sub(arrow.position).normalize();
        arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),direction);this.world.scene.add(arrow);
        this.arrows.push({mesh:arrow,target,age:0,damage:player.stats.damage,criticalChance:player.stats.criticalChance,kind,pierce,hit:new Set()});
      }
    };
    this.tripleCooldown=Math.max(0,this.tripleCooldown-dt);
    this.poisonCooldown=Math.max(0,this.poisonCooldown-dt);
    this.pierceCooldown=Math.max(0,this.pierceCooldown-dt);
    if(player.stats.tripleLevel>0&&this.tripleCooldown===0){fire('triple',3);this.tripleCooldown=Math.max(1.1,2.2-player.stats.tripleLevel*.12);}
    if(player.stats.poisonLevel>0&&this.poisonCooldown===0){fire('poison');this.poisonCooldown=Math.max(1.8,3.3-player.stats.poisonLevel*.18);}
    if(player.stats.pierceLevel>0&&this.pierceCooldown===0){fire('piercing',1,player.stats.pierceLevel);this.pierceCooldown=Math.max(1.5,2.6-player.stats.pierceLevel*.15);}
    this.spawnDelay -= dt;
    if (this.spawnDelay <= 0 && this.alive < this.maxAlive) {
      this.spawn(hero);
      this.spawnDelay = 2.7;
    }
  }
}
