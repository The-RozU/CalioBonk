import * as THREE from 'three';
import { createGround, groundHeight, inWorld, RUIN_LOCATION, trailDistance } from './Terrain';

interface Obstacle { x: number; z: number; radius: number }
interface Flicker { light: THREE.PointLight; base: number; seed: number; flame: THREE.Object3D }

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}

export class World {
  readonly scene = new THREE.Scene();
  readonly terrain = createGround();
  readonly obstacles: Obstacle[] = [];
  readonly ruin = RUIN_LOCATION;
  private readonly clock = new THREE.Clock();
  private readonly beacon = new THREE.Group();
  private readonly flickers: Flicker[] = [];
  private readonly fireflies: THREE.Points;
  private readonly fireflyPositions: Float32Array;
  private readonly fireflyBases: Float32Array;
  private collisionGrid:Map<string,Obstacle[]>|null=null;
  private readonly collisionCell=8;

  constructor() {
    this.scene.background = new THREE.Color('#0b1719');
    this.scene.fog = new THREE.FogExp2('#152320', 0.014);
    this.addSky();
    this.addLights();
    this.scene.add(this.terrain);
    this.addTrees();
    this.addRocks();
    this.addRuin();
    this.addCamp();
    this.addMountains();
    const particleData = this.addFireflies();
    this.fireflies = particleData.points;
    this.fireflyPositions = particleData.positions;
    this.fireflyBases = particleData.bases;
  }

  private addSky(): void {
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(380, 32, 18),
      new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false,
        vertexShader: 'varying vec3 vPos; void main(){vPos=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
        fragmentShader: `varying vec3 vPos; void main(){float t=clamp(normalize(vPos).y*.55+.35,0.,1.); vec3 horizon=vec3(.19,.24,.22); vec3 upper=vec3(.025,.06,.085); vec3 ground=vec3(.07,.12,.115); vec3 c=mix(horizon,upper,smoothstep(.18,.85,t)); c=mix(ground,c,smoothstep(-.25,.2,normalize(vPos).y)); gl_FragColor=vec4(c,1.);}`,
      }),
    );
    atmosphere.name = 'Night sky';
    this.scene.add(atmosphere);

    const moon = new THREE.Mesh(new THREE.SphereGeometry(6.5, 28, 16), new THREE.MeshBasicMaterial({color: '#c6d9c5', fog: false}));
    moon.position.set(-112, 102, -190);
    this.scene.add(moon);

    const rng = seededRandom(442);
    const positions: number[] = [];
    for (let i = 0; i < 600; i++) {
      const angle = rng() * Math.PI * 2, altitude = rng() * 1.12 + 0.1;
      const r = 320;
      positions.push(Math.cos(angle) * Math.cos(altitude) * r, Math.sin(altitude) * r, Math.sin(angle) * Math.cos(altitude) * r);
    }
    const starsGeometry = new THREE.BufferGeometry();
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const stars = new THREE.Points(starsGeometry, new THREE.PointsMaterial({color:'#b8c9ae',size:1.1,sizeAttenuation:false,transparent:true,opacity:.72,depthWrite:false,fog:false}));
    this.scene.add(stars);
  }

  private addLights(): void {
    const ambient = new THREE.HemisphereLight('#b8e0d3', '#17221a', 1.6);
    this.scene.add(ambient);
    const moonlight = new THREE.DirectionalLight('#d8ddc9', 2.0);
    moonlight.position.set(-32, 62, -21);
    moonlight.castShadow = true;
    moonlight.shadow.mapSize.set(2048, 2048);
    moonlight.shadow.camera.left = -58;
    moonlight.shadow.camera.right = 58;
    moonlight.shadow.camera.top = 58;
    moonlight.shadow.camera.bottom = -58;
    moonlight.shadow.camera.near = 1;
    moonlight.shadow.camera.far = 125;
    moonlight.shadow.bias = -0.0003;
    this.scene.add(moonlight);
  }

  private addTrees(): void {
    const rng = seededRandom(1170);
    const samples: {x:number;z:number;s:number;kind:number}[] = [];
    let attempts = 0;
    while (samples.length < 155 && attempts++ < 1000) {
      const angle = rng() * Math.PI * 2;
      const radius = 14 + Math.sqrt(rng()) * 98;
      const x = Math.cos(angle)*radius, z = Math.sin(angle)*radius;
      if (trailDistance(x,z) < 6.5 || Math.hypot(x-RUIN_LOCATION.x,z-RUIN_LOCATION.y) < 13) continue;
      const s = .74 + rng() * 1.4;
      samples.push({x,z,s,kind:rng()});
      this.obstacles.push({x,z,radius:0.35*s});
    }
    const wood = new THREE.MeshStandardMaterial({color:'#302a24',roughness:1,flatShading:true});
    const pines = [new THREE.MeshStandardMaterial({color:'#263e37',roughness:1,flatShading:true}),new THREE.MeshStandardMaterial({color:'#344f41',roughness:1,flatShading:true})];
    const bark = new THREE.InstancedMesh(new THREE.CylinderGeometry(.26,.36,2.6,6),wood,samples.length);
    const top = new THREE.InstancedMesh(new THREE.ConeGeometry(1.75,3.0,7),pines[0],samples.length);
    const middle = new THREE.InstancedMesh(new THREE.ConeGeometry(2.05,3.2,7),pines[1],samples.length);
    const lower = new THREE.InstancedMesh(new THREE.ConeGeometry(2.15,3.0,7),pines[0],samples.length);
    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();
    samples.forEach((tree,i) => {
      const y = groundHeight(tree.x,tree.z);
      const s = tree.s;
      dummy.position.set(tree.x, y+1.3*s, tree.z); dummy.scale.set(s,s,s); dummy.rotation.y = tree.kind*7;
      dummy.updateMatrix(); bark.setMatrixAt(i,dummy.matrix);
      dummy.position.y = y+4.45*s; dummy.scale.set(s*.8,s*.8,s*.8); dummy.updateMatrix(); top.setMatrixAt(i,dummy.matrix);
      dummy.position.y = y+3.48*s; dummy.scale.set(s*.88,s*.85,s*.88); dummy.updateMatrix(); middle.setMatrixAt(i,dummy.matrix);
      dummy.position.y = y+2.54*s; dummy.scale.set(s,s*.9,s); dummy.updateMatrix(); lower.setMatrixAt(i,dummy.matrix);
      tint.setHSL(.35 + tree.kind*.06,.19,.62 + tree.kind*.13);
      top.setColorAt(i,tint); middle.setColorAt(i,tint); lower.setColorAt(i,tint);
    });
    for(const mesh of [bark,top,middle,lower]) {mesh.castShadow=true; mesh.receiveShadow=true;mesh.instanceMatrix.needsUpdate=true;this.scene.add(mesh);}
  }

  private addRocks(): void {
    const rng = seededRandom(717);
    const count = 220;
    const material = new THREE.MeshStandardMaterial({color:'#62645b',roughness:1,metalness:.02,flatShading:true});
    const mesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),material,count);
    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();
    for (let i=0;i<count;i++) {
      const x = (rng()-.5)*205, z = (rng()-.5)*205;
      const s = .25 + rng()*1.25;
      const y = groundHeight(x,z);
      dummy.position.set(x,y + .15*s,z);
      dummy.rotation.set(rng()*1.2,rng()*6,rng()*.5);
      dummy.scale.set(s*1.4,s*.65,s);
      dummy.updateMatrix(); mesh.setMatrixAt(i,dummy.matrix);
      tint.setHSL(.15,.07,.45 + rng()*.18); mesh.setColorAt(i,tint);
      if (s > .94 && Math.hypot(x,z)>10 && trailDistance(x,z)>3.2) this.obstacles.push({x,z,radius:s*.92});
    }
    mesh.castShadow=true;mesh.receiveShadow=true;
    this.scene.add(mesh);
  }

  private addRuin(): void {
    const stoneTexture = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}assets/textures/stone.webp`);
    stoneTexture.magFilter = THREE.NearestFilter;
    stoneTexture.minFilter = THREE.NearestMipmapNearestFilter;
    stoneTexture.colorSpace = THREE.SRGBColorSpace;
    const stones = new THREE.MeshStandardMaterial({color:'#77786b',map:stoneTexture,roughness:1,flatShading:true});
    const dark = new THREE.MeshStandardMaterial({color:'#4b5148',roughness:1,flatShading:true});
    const stoneGeo = new THREE.BoxGeometry(1,1,1);
    const makeStone = (x:number,z:number,w:number,h:number,d:number,material=stones,rotation=0) => {
      const o=new THREE.Mesh(stoneGeo,material); o.position.set(x, groundHeight(x,z)+h/2, z); o.scale.set(w,h,d);o.rotation.y=rotation;o.castShadow=true;o.receiveShadow=true;this.scene.add(o);
      this.obstacles.push({x,z,radius:Math.max(w,d)*.45});
      return o;
    };
    const cx=RUIN_LOCATION.x, cz=RUIN_LOCATION.y;
    // Three fractured columns frame the target area; the entrance remains accessible.
    makeStone(cx-4.5,cz,.95,5.0,1.25,stones,-.1);
    makeStone(cx+4.5,cz,1.2,4.15,1.35,stones,.07);
    makeStone(cx-5,cz-1,2,1.05,2,dark,.1);
    makeStone(cx+5,cz-.5,2.0,1.25,2,dark,-.1);
    const lintel=new THREE.Mesh(stoneGeo,stones); lintel.position.set(cx-.22,groundHeight(cx,cz)+5.03,cz);lintel.scale.set(9.4,1.1,1.4);lintel.rotation.z=-.07;lintel.castShadow=true; this.scene.add(lintel);
    const rng=seededRandom(911);
    for(let i=0;i<27;i++){
      const angle = rng()*Math.PI*2, rad=7+rng()*13;
      const x=cx+Math.cos(angle)*rad,z=cz+Math.sin(angle)*rad;
      makeStone(x,z,.55+rng()*.8,.35+rng()*1.1,.5+rng()*.8,i%3===0?dark:stones,rng()*Math.PI);
    }
    this.addBeacon(cx,cz);
  }

  private addBeacon(x:number,z:number): void {
    this.beacon.position.set(x,groundHeight(x,z)+4,z);
    const gold = new THREE.MeshStandardMaterial({color:'#b5ad7e',emissive:'#978044',emissiveIntensity:1.5,metalness:.75,roughness:.3});
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0,.06,6,48),gold); ring.rotation.x=.2;
    const rune = new THREE.Mesh(new THREE.OctahedronGeometry(.43),gold);
    this.beacon.add(ring,rune);
    const point=new THREE.PointLight('#e6bf71',7,17,2); point.position.set(0,0,0);this.beacon.add(point);
    this.scene.add(this.beacon);
  }

  private addCamp(): void {
    const wood=new THREE.MeshStandardMaterial({color:'#3b2921',roughness:1,flatShading:true});
    const metal=new THREE.MeshStandardMaterial({color:'#333a36',metalness:.5,roughness:.7,flatShading:true});
    const ember=new THREE.MeshBasicMaterial({color:'#ffa75d'});
    const makeTorch=(x:number,z:number)=>{
      const y=groundHeight(x,z);
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(.1,.14,2.5,6),wood);pole.position.set(x,y+1.25,z);pole.castShadow=true;this.scene.add(pole);
      const basket=new THREE.Mesh(new THREE.CylinderGeometry(.26,.18,.43,6),metal);basket.position.set(x,y+2.52,z);basket.castShadow=true;this.scene.add(basket);
      const flame=new THREE.Mesh(new THREE.ConeGeometry(.24,.8,5),ember);flame.position.set(x,y+2.98,z);this.scene.add(flame);
      const light=new THREE.PointLight('#ff9a4e',13,20,2);light.position.set(x,y+3,z);this.scene.add(light);
      this.flickers.push({light,base:13,seed:x*13+z*29,flame});
      this.obstacles.push({x,z,radius:.28});
    };
    makeTorch(-4,-5);makeTorch(5,-7);
    // Stone circle and weathered waystones suggest a game world without creating extra mechanics.
    const stone = new THREE.MeshStandardMaterial({color:'#78776d',roughness:1,flatShading:true});
    for(let i=0;i<10;i++){
      const a=i*Math.PI*2/10;
      const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.65,0),stone);
      const x=Math.cos(a)*6,z=Math.sin(a)*6;
      rock.position.set(x,groundHeight(x,z)+.13,z);rock.scale.set(.95,.36,.56);rock.rotation.y=a;
      rock.receiveShadow=true;rock.castShadow=true;this.scene.add(rock);
    }
    const statue = new THREE.Group();
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.72,.92,.6,6),stone);base.position.y=.3;statue.add(base);
    const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.31,.4,2.25,6),stone);shaft.position.y=1.7;statue.add(shaft);
    const top=new THREE.Mesh(new THREE.OctahedronGeometry(.57),new THREE.MeshStandardMaterial({color:'#818d75',emissive:'#263b33',emissiveIntensity:.4,roughness:.9}));top.position.y=3.05;statue.add(top);
    statue.position.set(-8,groundHeight(-8,4),4);statue.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});
    this.scene.add(statue);this.obstacles.push({x:-8,z:4,radius:.85});
  }

  private addMountains(): void {
    const rng=seededRandom(2000);
    const peaks=new THREE.Group();
    const materials=[new THREE.MeshStandardMaterial({color:'#25382f',roughness:1,flatShading:true}),new THREE.MeshStandardMaterial({color:'#2c413a',roughness:1,flatShading:true})];
    for(let i=0;i<40;i++){
      const a=i/40*Math.PI*2, r=126+rng()*38;
      const height=23+rng()*47;
      const mesh=new THREE.Mesh(new THREE.ConeGeometry(12+rng()*19,height,4+rng()*3),materials[i%2]);
      mesh.position.set(Math.sin(a)*r,height*.43-5,Math.cos(a)*r);mesh.rotation.y=rng()*3;
      peaks.add(mesh);
    }
    this.scene.add(peaks);
  }

  private addFireflies(): {points:THREE.Points;positions:Float32Array;bases:Float32Array} {
    const rng=seededRandom(300);
    const count=145;
    const positions=new Float32Array(count*3),bases=new Float32Array(count*3);
    for(let i=0;i<count;i++){
      const x=(rng()-.5)*108,z=(rng()-.5)*108;
      bases[i*3]=x;bases[i*3+1]=groundHeight(x,z)+1+rng()*4.5;bases[i*3+2]=z;
      positions.set(bases.slice(i*3,i*3+3),i*3);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
    const points=new THREE.Points(geometry,new THREE.PointsMaterial({color:'#b7d9a1',size:.08,transparent:true,opacity:.55,depthWrite:false}));
    this.scene.add(points);return {points,positions,bases};
  }

  collides(x:number,z:number,radius=.39): boolean {
    if(!inWorld(x,z)) return true;
    if(!this.collisionGrid){this.collisionGrid=new Map();for(const obstacle of this.obstacles){const key=this.collisionKey(obstacle.x,obstacle.z),cell=this.collisionGrid.get(key)??[];cell.push(obstacle);this.collisionGrid.set(key,cell);}}
    const cx=Math.floor(x/this.collisionCell),cz=Math.floor(z/this.collisionCell);
    for(let gx=cx-1;gx<=cx+1;gx++)for(let gz=cz-1;gz<=cz+1;gz++)for(const o of this.collisionGrid.get(gx+','+gz)??[]){if(Math.hypot(x-o.x,z-o.z)<radius+o.radius)return true;}
    return false;
  }
  private collisionKey(x:number,z:number):string{return Math.floor(x/this.collisionCell)+','+Math.floor(z/this.collisionCell);}

  update(elapsed?:number): void {
    const t=elapsed??this.clock.getElapsedTime();
    this.beacon.rotation.y=t*.5;
    this.beacon.position.y=groundHeight(this.ruin.x,this.ruin.y)+4+Math.sin(t*1.6)*.32;
    for(const f of this.flickers){
      const k=.9+Math.sin(t*13+f.seed)*.08+Math.sin(t*22+f.seed*.3)*.055;
      f.light.intensity=f.base*k;
      f.flame.scale.y=k;
    }
    for(let i=0;i<this.fireflyBases.length/3;i++){
      this.fireflyPositions[i*3]=this.fireflyBases[i*3]!+Math.sin(t*.7+i)*.35;
      this.fireflyPositions[i*3+1]=this.fireflyBases[i*3+1]!+Math.sin(t*1.5+i*.6)*.3;
      this.fireflyPositions[i*3+2]=this.fireflyBases[i*3+2]!+Math.cos(t*.5+i)*.25;
    }
    (this.fireflies.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate=true;
  }
}
