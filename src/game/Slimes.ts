import * as THREE from 'three';
import { groundHeight } from './Terrain';
import {SOLO_ATTACK_RANGE,SUMMON_DELAY,SUMMON_DURATION,SUMMON_MIN_DISTANCE,SUMMON_MAX_DISTANCE,
  soloThreatTier,soloBatchSize,soloActiveCap,soloBatchInterval,slimeSeparation} from './SoloSurvival.mjs';
import {SummoningLight} from './SummoningLight';
import {SLIME_TRAITS,TOXIC_POOL,slimeVariantForWave} from './SlimeVariants.mjs';
import type {SlimeKind} from './SlimeVariants.mjs';
import type { World } from './World';
import type { Player } from './Player';

const ARROW_DAMAGE = 18;
const CONTACT_DAMAGE = 12;
export type SlimeRenderMode='3d'|'sprite';
export const SLIME_RENDER_MODE:SlimeRenderMode=new URLSearchParams(location.search).get('slime')==='3d'?'3d':'sprite';
export const slimeSpriteTexture=(()=>{
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d')!;
  ctx.clearRect(0,0,128,128);ctx.beginPath();ctx.moveTo(17,72);ctx.quadraticCurveTo(12,42,37,32);ctx.quadraticCurveTo(62,10,91,32);ctx.quadraticCurveTo(116,47,111,76);ctx.quadraticCurveTo(105,111,65,114);ctx.quadraticCurveTo(25,111,17,72);ctx.closePath();
  ctx.fillStyle='#173a2b';ctx.fill();ctx.strokeStyle='#0a2018';ctx.lineWidth=8;ctx.stroke();
  const shine=ctx.createRadialGradient(53,45,4,65,72,55);shine.addColorStop(0,'#c4f2a1');shine.addColorStop(.35,'#70cf7b');shine.addColorStop(1,'#26764b');ctx.fillStyle=shine;ctx.fill();
  ctx.fillStyle='#f4efc9';ctx.beginPath();ctx.ellipse(48,67,8,12,0,0,Math.PI*2);ctx.ellipse(79,67,8,12,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#17251b';ctx.beginPath();ctx.arc(50,69,3.5,0,Math.PI*2);ctx.arc(81,69,3.5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(231,255,190,.55)';ctx.fillRect(37,43,12,4);ctx.fillRect(32,49,5,4);
  const texture=new THREE.CanvasTexture(canvas);texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;texture.colorSpace=THREE.SRGBColorSpace;return texture;
})();
// Type-specific textures are generated once; each sprite still shares its variant texture.
const slimeVariantTextures=new Map<SlimeKind,THREE.Texture>([['green',slimeSpriteTexture]]);
function slimeTexture(kind:SlimeKind):THREE.Texture{
  const cached=slimeVariantTextures.get(kind);
  if(cached)return cached;
  const tint:Record<'blue'|'red'|'toxic',[number,number,number]>={
    blue:[79,173,242],red:[225,104,93],toxic:[168,114,230],
  };
  if(kind==='green')return slimeSpriteTexture;
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
  const context=canvas.getContext('2d')!;
  context.drawImage(slimeSpriteTexture.image as HTMLCanvasElement,0,0);
  const pixels=context.getImageData(0,0,128,128);
  const color=tint[kind];
  for(let i=0;i<pixels.data.length;i+=4){
    if(pixels.data[i+3]===0)continue;
    const r=pixels.data[i]??0,g=pixels.data[i+1]??0,b=pixels.data[i+2]??0;
    if(g>r*1.09&&g>b*1.06){
      const strength=Math.min(1.55,Math.max(.17,(r*.3+g*.56+b*.14)/145));
      pixels.data[i]=Math.min(255,color[0]*strength);
      pixels.data[i+1]=Math.min(255,color[1]*strength);
      pixels.data[i+2]=Math.min(255,color[2]*strength);
    }
  }
  context.putImageData(pixels,0,0);
  const texture=new THREE.CanvasTexture(canvas);
  texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;
  texture.colorSpace=THREE.SRGBColorSpace;
  slimeVariantTextures.set(kind,texture);
  return texture;
}
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
  private health:number;
  private toxinCooldown=0;
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
    readonly kind:SlimeKind='green',
    private readonly onToxicLanding:((x:number,z:number)=>void)|null=null,
  ) {
    const traits=SLIME_TRAITS[kind];
    this.health=traits.hp;
    this.root.name=traits.name+' Slime';
    this.root.position.set(x, groundHeight(x, z), z);
    this.root.add(this.body);

    if(SLIME_RENDER_MODE==='3d'){
      const skin = new THREE.MeshStandardMaterial({
        color:traits.color,
        emissive:traits.color,emissiveIntensity:.18,
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
    this.billboard=new THREE.Sprite(new THREE.SpriteMaterial({map:slimeTexture(kind),transparent:true,depthWrite:false,alphaTest:.08}));
    this.billboard.position.set(0,.49,0);this.billboard.scale.set(.92,.96,1);this.root.add(this.billboard);
    this.billboard.visible=SLIME_RENDER_MODE==='sprite';
    this.scene.add(this.root, this.shadow);
    this.jumpDelay=(.27+variation*.65)*traits.jumpDelay;
  }

  get position(): THREE.Vector3 { return this.root.position; }
  get expValue():number{return SLIME_TRAITS[this.kind].exp;}
  get contactDamage():number{return SLIME_TRAITS[this.kind].contact;}

  applyPoison(damagePerSecond:number,duration:number):void { this.poisonDamage=Math.max(this.poisonDamage,damagePerSecond);this.poisonRemaining=Math.max(this.poisonRemaining,duration);this.poisonTick=Math.min(this.poisonTick||.5,.5); }

  takeHit(damage: number): boolean {
    if (this.dead) return false;
    this.health = Math.max(0, this.health - damage);
    this.hitFlash = .19;
    this.healthBar.visible = true;
    const fraction=this.health/SLIME_TRAITS[this.kind].hp;
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

    this.hitFlash=Math.max(0,this.hitFlash-dt);
    this.toxinCooldown=Math.max(0,this.toxinCooldown-dt);
    if(this.jelly){
      this.jelly.material.emissiveIntensity=this.hitFlash>0?1.2:this.poisonRemaining>0?.65:.18;
      this.jelly.material.emissive.set(this.poisonRemaining>0?'#34c96c':SLIME_TRAITS[this.kind].color);
    }
    this.billboard.material.color.set(this.hitFlash>0?'#ffcfaa':this.poisonRemaining>0?'#baffbc':'#ffffff');
    if(this.poisonRemaining>0){this.poisonRemaining=Math.max(0,this.poisonRemaining-dt);this.poisonTick-=dt;if(this.poisonTick<=0){this.health=Math.max(0,this.health-this.poisonDamage*.5);this.poisonTick=.5;if(this.health<=0)this.dead=true;}}
    this.jumpDelay -= dt;
    const dx = hero.x - this.root.position.x;
    const dz = hero.z - this.root.position.z;
    const distance = Math.hypot(dx, dz);
    const chasing=distance>.95;

    if (this.height <= 0 && this.verticalSpeed <= 0 && chasing && this.jumpDelay <= 0) {
      this.verticalSpeed=SLIME_TRAITS[this.kind].jumpPower;
      this.direction.set(dx / distance, dz / distance);
      this.root.rotation.y = Math.atan2(-this.direction.x, -this.direction.y);
    }

    if (this.height > 0 || this.verticalSpeed > 0) {
      if (chasing) {
        const speed=SLIME_TRAITS[this.kind].speed+this.variation*.45;
        const sideways=this.kind==='blue'?Math.sin(this.age*9+this.variation*8)*.24:0;
        const nextX=this.root.position.x+(this.direction.x-this.direction.y*sideways)*speed*dt;
        const nextZ=this.root.position.z+(this.direction.y+this.direction.x*sideways)*speed*dt;
        const wasX=this.root.position.x,wasZ=this.root.position.z;
        if(!world.collides(nextX,this.root.position.z,.24))this.root.position.x=nextX;
        if(!world.collides(this.root.position.x,nextZ,.24))this.root.position.z=nextZ;
        // Walk around trees and stones when a direct approach is blocked.
        if(Math.hypot(this.root.position.x-wasX,this.root.position.z-wasZ)<.025*dt){
          const side=Math.sin(this.age*.8+this.variation*13)>0?1:-1;
          const step=2.2*dt;
          const sidex=-this.direction.y*side*step;
          const sidez=this.direction.x*side*step;
          if(!world.collides(wasX+sidex,wasZ+sidez,.24)){
            this.root.position.x=wasX+sidex;
            this.root.position.z=wasZ+sidez;
          }
        }
      }
      this.verticalSpeed -= 17.5 * dt;
      this.height += this.verticalSpeed * dt;
      if (this.height <= 0) {
        this.height = 0;
        this.verticalSpeed = 0;
        this.jumpDelay=(.28+this.variation*.3)*SLIME_TRAITS[this.kind].jumpDelay;
        if(this.kind==='toxic'&&this.toxinCooldown<=0){
          this.onToxicLanding?.(this.root.position.x,this.root.position.z);
          this.toxinCooldown=TOXIC_POOL.cooldown;
        }
      }
    }

    const ground = groundHeight(this.root.position.x, this.root.position.z);
    this.root.position.y = ground + this.height;
    const rise = this.height > .01 ? Math.min(this.height / 1.0, 1) : 0;
    const squash = this.height < .01 ? Math.max(0, 1 - Math.max(this.jumpDelay, 0) * 2.5) : 0;
    this.body.scale.set(.52 * (1 + squash * .13 - rise * .13), .42 * (1 - squash * .16 + rise * .22), .52 * (1 + squash * .13 - rise * .13));
    this.root.scale.setScalar(Math.min(1,this.age*5)*SLIME_TRAITS[this.kind].scale);
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
type ToxicPool={
  root:THREE.Group;
  disc:THREE.Mesh<THREE.CircleGeometry,THREE.MeshBasicMaterial>;
  ring:THREE.Mesh<THREE.RingGeometry,THREE.MeshBasicMaterial>;
  age:number;
};
const toxicDiscGeometry=new THREE.CircleGeometry(1,24);
const toxicRingGeometry=new THREE.RingGeometry(.86,1,24);
type ExperienceGem = { root: THREE.Sprite; age: number; baseY: number; value: number; attracted: boolean };

// Shared transparent atlas for all collectible Essence Stars (no per-drop geometry or textures).
// A four-point silhouette with soft emerald glow stays legible in large hordes.
const essenceStarTexture=(()=>{
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
  const ctx=canvas.getContext('2d')!;
  const aura=ctx.createRadialGradient(64,64,5,64,64,58);
  aura.addColorStop(0,'rgba(235,255,223,.95)');
  aura.addColorStop(.2,'rgba(115,245,166,.65)');
  aura.addColorStop(.6,'rgba(47,182,113,.19)');
  aura.addColorStop(1,'rgba(27,125,73,0)');
  ctx.fillStyle=aura;ctx.fillRect(0,0,128,128);
  const star=(radius:number,inner:number)=>{
    ctx.beginPath();
    for(let i=0;i<8;i++){
      const angle=i*Math.PI/4-Math.PI/2;
      const r=i%2===0?radius:inner;
      const x=64+Math.cos(angle)*r,y=64+Math.sin(angle)*r;
      if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.closePath();
  };
  star(36,7);ctx.fillStyle='#b4ffcf';ctx.shadowColor='#65ed9c';ctx.shadowBlur=11;ctx.fill();
  star(24,4);ctx.fillStyle='#f8fff1';ctx.shadowBlur=4;ctx.fill();
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;
  return texture;
})();
const essenceStarMaterials={
  small:new THREE.SpriteMaterial({map:essenceStarTexture,color:'#ffffff',transparent:true,depthWrite:false,depthTest:true}),
  medium:new THREE.SpriteMaterial({map:essenceStarTexture,color:'#8fffb6',transparent:true,depthWrite:false,depthTest:true}),
  large:new THREE.SpriteMaterial({map:essenceStarTexture,color:'#ffe8a5',transparent:true,depthWrite:false,depthTest:true}),
};
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
  private readonly toxicPools:ToxicPool[]=[];
  private toxicDamageCooldown=0;
  private readonly arrows: ArrowFlight[] = [];
  private readonly arrowPool:THREE.Group[]=[];
  private debugLimit:number|null=null;
  private readonly summoning:Array<{light:SummoningLight;count:number;tier:number;released:boolean}>=[];
  private spawnCooldown=0;
  private lastAnnouncedTier=1;
  private readonly maxDamageNumbers=24;
  private readonly experienceGems: ExperienceGem[] = [];
  private readonly essenceStarPool: THREE.Sprite[] = [];
  experience = 0;
  level = 1;
  experienceProgress = 0;
  experienceRequired = 15;
  pendingLevelUps = 0;
  consumeLevelUp(): boolean { if(this.pendingLevelUps<=0)return false; this.pendingLevelUps--; return true; }
  grantSharedExperience(amount:number):void { this.gainExperience(amount); }
  private contactCooldown = 0;
  private tripleCooldown=1.5;
  private poisonCooldown=2.8;
  private pierceCooldown=2.2;
  private readonly damageNumbers: Array<{sprite:THREE.Sprite;age:number}> = [];
  private seed = 72819;
  private cooldown = 0;
  private started=false;
  runTime=0;
  onThreatUnlocked:(tier:number)=>void=()=>{};
  kills = 0;

  constructor(private readonly world: World) {}

  get alive(): number { return this.enemies.filter(enemy => !enemy.dead).length; }
  get renderMode():SlimeRenderMode { return SLIME_RENDER_MODE; }
  setTestLimit(limit:number,hero:THREE.Vector3):void {
    if(![25,50,100,200,300].includes(limit))return;
    this.debugLimit=limit;
    while(this.alive<limit){if(!this.spawn(hero))break;}
  }
  get nextBatchIn():number{return Math.max(0,Math.ceil(this.spawnCooldown));}
  get projectileCount():number { return this.arrows.length; }
  get effectCount():number { return this.effects.length+this.damageNumbers.length+this.toxicPools.length; }
  get crystalCount():number { return this.experienceGems.length; }

  private random(): number {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  start(hero:THREE.Vector3):void{
    if(this.started)return;
    this.started=true;
    this.scheduleBatch(hero);
    this.spawnCooldown=soloBatchInterval(this.runTime);
  }

  private spawnAt(x:number,z:number,tier:number):boolean{
    if(this.world.collides(x,z,.9))return false;
    if(this.enemies.some(enemy=>!enemy.dead&&
      (enemy.position.x-x)**2+(enemy.position.z-z)**2<.81))return false;
    const kind=slimeVariantForWave(tier,this.random());
    this.enemies.push(new Slime(this.world.scene,x,z,this.random(),kind,
      (px,pz)=>this.leaveToxicPool(px,pz)));
    return true;
  }

  // Debug stress tests still place enemies instantly, outside the normal summoning loop.
  private spawn(hero:THREE.Vector3):boolean{
    for(let i=0;i<40;i++){
      const angle=this.random()*Math.PI*2;
      const distance=SUMMON_MIN_DISTANCE+(SUMMON_MAX_DISTANCE-SUMMON_MIN_DISTANCE)*this.random();
      if(this.spawnAt(hero.x+Math.sin(angle)*distance,hero.z+Math.cos(angle)*distance,soloThreatTier(this.runTime)))return true;
    }
    return false;
  }

  private scheduleBatch(hero:THREE.Vector3):void{
    if(this.summoning.length>=2)return;
    const slots=soloActiveCap(this.runTime)-this.alive;
    if(slots<=0)return;
    for(let attempt=0;attempt<65;attempt++){
      const angle=this.random()*Math.PI*2;
      const distance=SUMMON_MIN_DISTANCE+(SUMMON_MAX_DISTANCE-SUMMON_MIN_DISTANCE)*this.random();
      const x=hero.x+Math.cos(angle)*distance,z=hero.z+Math.sin(angle)*distance;
      if(this.world.collides(x,z,2.2))continue;
      if(this.summoning.some(item=>Math.hypot(item.light.x-x,item.light.z-z)<7))continue;
      const count=Math.min(slots,soloBatchSize(this.runTime)+(this.random()<.35?1:0));
      this.summoning.push({light:new SummoningLight(this.world.scene,x,z),
        count,tier:soloThreatTier(this.runTime),released:false});
      return;
    }
  }

  private updateSummons(dt:number):void{
    for(let i=this.summoning.length-1;i>=0;i--){
      const batch=this.summoning[i]!;
      batch.light.update(dt);
      if(!batch.released&&batch.light.age>=SUMMON_DELAY){
        batch.released=true;
        let spawned=0;
        const count=Math.min(batch.count,Math.max(0,soloActiveCap(this.runTime)-this.alive));
        for(let n=0;n<count;n++){
          for(let attempt=0;attempt<24;attempt++){
            const angle=this.random()*Math.PI*2;
            const distance=.55+this.random()*3.6;
            const x=batch.light.x+Math.cos(angle)*distance;
            const z=batch.light.z+Math.sin(angle)*distance;
            if(this.spawnAt(x,z,batch.tier)){spawned++;break;}
          }
        }
        // If the terrain is very crowded, the next scheduled group can try another clearing.
        if(spawned===0)this.spawnCooldown=Math.min(this.spawnCooldown,1.3);
      }
      if(batch.light.age>=SUMMON_DURATION){
        batch.light.dispose();
        this.summoning.splice(i,1);
      }
    }
  }

  private removeToxicPool(index:number):void {
    const pool=this.toxicPools[index];
    if(!pool)return;
    this.world.scene.remove(pool.root);
    pool.disc.material.dispose();
    pool.ring.material.dispose();
    this.toxicPools.splice(index,1);
  }

  private leaveToxicPool(x:number,z:number):void {
    if(this.toxicPools.length>=TOXIC_POOL.maxActive)this.removeToxicPool(0);
    const root=new THREE.Group();
    const disc=new THREE.Mesh(toxicDiscGeometry,new THREE.MeshBasicMaterial({
      color:'#76db88',transparent:true,opacity:.36,depthWrite:false,side:THREE.DoubleSide,
    }));
    const ring=new THREE.Mesh(toxicRingGeometry,new THREE.MeshBasicMaterial({
      color:'#d0ff90',transparent:true,opacity:.72,depthWrite:false,side:THREE.DoubleSide,
    }));
    root.add(disc,ring);
    ring.position.z=.014;
    root.rotation.x=-Math.PI/2;
    root.scale.setScalar(TOXIC_POOL.radius);
    root.position.set(x,groundHeight(x,z)+.055,z);
    this.world.scene.add(root);
    this.toxicPools.push({root,disc,ring,age:0});
  }

  private updateToxicPools(dt:number,player:Player):void {
    this.toxicDamageCooldown=Math.max(0,this.toxicDamageCooldown-dt);
    const hero=player.root.position;
    const standing=hero.y-groundHeight(hero.x,hero.z)<.85;
    for(let i=this.toxicPools.length-1;i>=0;i--){
      const pool=this.toxicPools[i]!;
      pool.age+=dt;
      if(pool.age>=TOXIC_POOL.duration){this.removeToxicPool(i);continue;}
      const fade=Math.min(1,(TOXIC_POOL.duration-pool.age)/1.3);
      pool.disc.material.opacity=.36*fade;
      pool.ring.material.opacity=.7*fade;
      pool.root.scale.setScalar(TOXIC_POOL.radius*(1+Math.sin(pool.age*5)*.045));
      if(!player.defeated&&standing&&this.toxicDamageCooldown<=0&&
        Math.hypot(hero.x-pool.root.position.x,hero.z-pool.root.position.z)<TOXIC_POOL.radius*.85){
        if(player.takeDamage(TOXIC_POOL.damage))this.toxicDamageCooldown=.9;
      }
    }
  }

  private separateSlimes(dt:number):void {
    const active=this.enemies.filter(enemy=>!enemy.dead);
    if(active.length<2)return;
    const corrections=slimeSeparation(active.map(enemy=>enemy.position),dt);
    for(let i=0;i<active.length;i++){
      const enemy=active[i]!;
      const correction=corrections[i]!;
      if(Math.abs(correction.x)+Math.abs(correction.z)<.00001)continue;
      const position=enemy.position;
      const oldGround=groundHeight(position.x,position.z);
      const nextX=position.x+correction.x;
      const nextZ=position.z+correction.z;
      if(!this.world.collides(nextX,position.z,.23))position.x=nextX;
      if(!this.world.collides(position.x,nextZ,.23))position.z=nextZ;
      const ground=groundHeight(position.x,position.z);
      position.y+=ground-oldGround;
      enemy.shadow.position.set(position.x,ground+.025,position.z);
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

  private styleExperienceStar(pickup:ExperienceGem):void {
    const value=pickup.value;
    // Color encodes stacked EXP without needing extra textures or materials.
    pickup.root.material=value>=100?essenceStarMaterials.large:value>=25?essenceStarMaterials.medium:essenceStarMaterials.small;
    const size=value>=100?1.1:value>=25?.83:.64;
    pickup.root.scale.setScalar(size);
  }

  private dropExperience(enemy: Slime): void {
    const close=this.experienceGems.find(item=>item.root.position.distanceTo(enemy.position)<1.5 && !item.attracted);
    if(close){close.value+=enemy.expValue;this.styleExperienceStar(close);return;}
    const root=this.essenceStarPool.pop()??new THREE.Sprite(essenceStarMaterials.small);
    root.name='Gwiazda Esencji';
    root.position.copy(enemy.position);
    root.position.y+=.4;
    root.rotation.set(0,0,0);
    const pickup:ExperienceGem={root,age:0,baseY:root.position.y,value:enemy.expValue,attracted:false};
    this.styleExperienceStar(pickup);
    this.world.scene.add(root);
    this.experienceGems.push(pickup);
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
    const hero=player.root.position;
    this.runTime+=dt;
    const tier=soloThreatTier(this.runTime);
    if(tier>this.lastAnnouncedTier){
      this.lastAnnouncedTier=tier;
      if(tier===3||tier===5||tier===7)this.onThreatUnlocked(tier);
    }
    this.spawnCooldown=Math.max(0,this.spawnCooldown-dt);
    this.updateSummons(dt);
    this.contactCooldown=Math.max(0,this.contactCooldown-dt);

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i]!;
      enemy.update(dt, hero, this.world, camera);
      if(enemy.dead&&!enemy.counted)this.registerKill(enemy);
      if (enemy.finished) this.enemies.splice(i, 1);
    }
    this.separateSlimes(dt);
    this.updateToxicPools(dt,player);
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
      if(touching){
        const strongest=this.enemies.reduce((damage,enemy)=>!enemy.dead&&
          Math.hypot(enemy.position.x-hero.x,enemy.position.z-hero.z)<.9?
          Math.max(damage,enemy.contactDamage):damage,0);
        if(player.takeDamage(strongest||CONTACT_DAMAGE))this.contactCooldown=.24;
      }
    }
    for(let i=this.experienceGems.length-1;i>=0;i--){
      const pickup=this.experienceGems[i]!;
      pickup.age+=dt;
      pickup.root.material.rotation=0;
      pickup.root.rotation.z+=dt*.55;
      const pulse=1+Math.sin(pickup.age*5.2)*.09;
      const baseSize=pickup.value>=100?1.1:pickup.value>=25?.83:.64;
      pickup.root.scale.set(baseSize*pulse,baseSize*pulse,1);
      if(!pickup.attracted) pickup.root.position.y=pickup.baseY+Math.sin(pickup.age*2.8)*.1;
      const dx=hero.x-pickup.root.position.x,dy=hero.y+1-pickup.root.position.y,dz=hero.z-pickup.root.position.z;
      const distance=Math.hypot(dx,dy,dz);
      if(distance<5*player.stats.magnet)pickup.attracted=true;
      if(pickup.attracted){
        const pull=Math.min(1,dt*7.5);
        pickup.root.position.x+=dx*pull;pickup.root.position.y+=dy*pull;pickup.root.position.z+=dz*pull;
      }
      if(distance<.85){
        this.gainExperience(pickup.value);
        this.world.scene.remove(pickup.root);
        if(this.essenceStarPool.length<500)this.essenceStarPool.push(pickup.root);
        this.experienceGems.splice(i,1);
      }
    }

    for(let i=this.damageNumbers.length-1;i>=0;i--){const item=this.damageNumbers[i]!;item.age+=dt;item.sprite.position.y+=dt*.8;item.sprite.material.opacity=Math.max(0,1-item.age/.7);if(item.age>.7){this.world.scene.remove(item.sprite);item.sprite.material.map?.dispose();item.sprite.material.dispose();this.damageNumbers.splice(i,1);}}
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.cooldown <= 0) {
      let closest: Slime | undefined;
      let distanceSq=(SOLO_ATTACK_RANGE*player.stats.range)**2;
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

    const specialRangeSq=(SOLO_ATTACK_RANGE*player.stats.range)**2;
    const target=this.enemies.filter(e=>!e.dead&&
      (e.position.x-hero.x)**2+(e.position.z-hero.z)**2<specialRangeSq)
      .sort((a,b)=>a.position.distanceToSquared(hero)-b.position.distanceToSquared(hero))[0];
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
    // Continuous groups, not waves: schedule from the player's current position.
    if(this.spawnCooldown<=0){
      if(this.alive<soloActiveCap(this.runTime)&&this.summoning.length===0){
        this.scheduleBatch(hero);
      }
      this.spawnCooldown=soloBatchInterval(this.runTime);
    }
  }
}
