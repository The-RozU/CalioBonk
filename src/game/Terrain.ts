import * as THREE from 'three';

const WORLD_RADIUS = 112;

function fract(x: number): number { return x - Math.floor(x); }
function smooth(t: number): number { return t * t * (3 - 2 * t); }
function randomGrid(x: number, z: number): number {
  return fract(Math.sin(x * 127.1 + z * 311.7) * 43758.5453);
}
function noise(x: number, z: number): number {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = smooth(fract(x)), fz = smooth(fract(z));
  const a = THREE.MathUtils.lerp(randomGrid(ix, iz), randomGrid(ix + 1, iz), fx);
  const b = THREE.MathUtils.lerp(randomGrid(ix, iz + 1), randomGrid(ix + 1, iz + 1), fx);
  return THREE.MathUtils.lerp(a, b, fz);
}
function segmentDistance(x: number, z: number, ax: number, az: number, bx: number, bz: number): number {
  const abx = bx - ax, abz = bz - az;
  const t = THREE.MathUtils.clamp(((x - ax) * abx + (z - az) * abz) / (abx * abx + abz * abz), 0, 1);
  return Math.hypot(x - (ax + abx * t), z - (az + abz * t));
}

export const RUIN_LOCATION = new THREE.Vector2(34, -31);

export function trailDistance(x: number, z: number): number {
  return Math.min(
    segmentDistance(x, z, 1, -1, 14, -10),
    segmentDistance(x, z, 14, -10, 24, -21),
    segmentDistance(x, z, 24, -21, 34, -31),
  );
}

export function groundHeight(x: number, z: number): number {
  const rough = (noise(x * 0.057, z * 0.057) - 0.5) * 4.1 +
    (noise(x * 0.17, z * 0.17) - 0.5) * 0.7;
  const center = THREE.MathUtils.smoothstep(Math.hypot(x, z), 8, 20);
  const trail = THREE.MathUtils.smoothstep(trailDistance(x, z), 2.2, 6);
  const ruin = THREE.MathUtils.smoothstep(Math.hypot(x - RUIN_LOCATION.x, z - RUIN_LOCATION.y), 5.5, 14);
  return rough * Math.min(center, trail * 0.78 + 0.22, ruin * 0.8 + 0.2);
}

export function inWorld(x: number, z: number): boolean {
  return Math.hypot(x, z) < WORLD_RADIUS - 5;
}

export function createGround(): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial> {
  const geometry = new THREE.PlaneGeometry(WORLD_RADIUS * 2, WORLD_RADIUS * 2, 180, 180);
  geometry.rotateX(-Math.PI / 2);
  const pos = geometry.getAttribute('position');
  const color = new THREE.Color();
  const colors = new Float32Array(pos.count * 3);
  const dark = new THREE.Color('#26372f'), light = new THREE.Color('#435642');
  const path = new THREE.Color('#655944');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, groundHeight(x, z));
    const mix = noise(x * 0.2, z * 0.2) * 0.7 + noise(x * 0.64, z * 0.64) * 0.3;
    color.copy(dark).lerp(light, mix);
    const pathFactor = 1 - THREE.MathUtils.smoothstep(trailDistance(x, z), 1.3, 3.5);
    color.lerp(path, pathFactor * 0.87);
    const centralArea = 1 - THREE.MathUtils.smoothstep(Math.hypot(x, z), 5, 11);
    color.lerp(path, centralArea * 0.32);
    colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const groundTexture = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}assets/textures/ground.webp`);
  groundTexture.wrapS = THREE.RepeatWrapping;
  groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.magFilter = THREE.NearestFilter;
  groundTexture.minFilter = THREE.NearestMipmapNearestFilter;
  groundTexture.repeat.set(48, 48);
  groundTexture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({map: groundTexture, vertexColors: true, roughness: 1, metalness: 0, flatShading: true});
  const terrain = new THREE.Mesh(geometry, material);
  terrain.receiveShadow = true;
  terrain.name = 'Ground';
  return terrain;
}
