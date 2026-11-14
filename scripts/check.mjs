import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=(name)=>readFileSync(join(root,name),'utf8');
const required=[
  'index.html','src/main.ts','src/style.css','src/game/CameraController.ts',
  'src/game/Input.ts','src/game/Player.ts','src/game/Terrain.ts','src/game/World.ts',
  'src/game/Slimes.ts',
  'public/assets/textures/ground.webp','public/assets/textures/stone.webp',
  'public/assets/textures/noise.webp','.github/workflows/pages.yml',
];
for(const path of required) assert(existsSync(join(root,path)),`Brakuje pliku: ${path}`);
const pkg=JSON.parse(read('package.json'));
assert.equal(pkg.version,'0.0.11','Nieprawidłowa wersja gry');
assert.match(read('src/game/Input.ts'),/requestPointerLock/);
assert.match(read('src/game/Player.ts'),/ShiftLeft/);
assert.match(read('src/game/Player.ts'),/dashCooldown/);
assert.match(read('src/game/Input.ts'),/consumePress/);
assert.match(read('src/game/CameraController.ts'),/this.camera.position.copy\(this.desired\)/);
assert.match(read('src/game/CameraController.ts'),/addEventListener\('wheel'/);
assert.match(read('src/game/CameraController.ts'),/this.distance=THREE.MathUtils.clamp/);
assert.match(read('src/game/CameraController.ts'),/3\.2,14/);
assert.match(read('src/game/Player.ts'),/this.leftArm.rotation.x=\.95/);
assert.match(read('src/game/Player.ts'),/this.rightArm.rotation.x=\.62/);
assert.match(read('src/game/Player.ts'),/CubicBezierCurve3/);
assert.match(read('src/game/Slimes.ts'),/aimPosition.clone\(\).sub\(origin\)/);
assert.match(read('src/game/Slimes.ts'),/origin.distanceTo\(aimPosition\)/);
assert.match(read('src/game/Player.ts'),/Space/);
assert.match(read('src/game/Player.ts'),/startAttack/);
assert.match(read('src/game/Slimes.ts'),/class Slime/);
assert.match(read('src/game/Slimes.ts'),/takeHit/);
assert.match(read('src/game/Slimes.ts'),/ARROW_DAMAGE/);
assert.match(read('src/game/Slimes.ts'),/dropExperience/);
assert.match(read('src/game/Slimes.ts'),/pendingLevelUps/);
assert.match(read('src/game/Slimes.ts'),/type AttackKind/);
assert.match(read('src/game/Slimes.ts'),/new THREE.SphereGeometry\(\.66,8,6\)/);
assert.match(read('src/game/Slimes.ts'),/projectileCount/);
assert.match(read('src/game/Slimes.ts'),/crystalCount/);
assert.match(read('src/main.ts'),/renderer.info.render.calls/);
assert.match(read('index.html'),/performance-overlay/);
assert.match(read('src/game/Slimes.ts'),/applyPoison/);
assert.match(read('src/game/Slimes.ts'),/showDamage/);
assert.match(read('src/main.ts'),/attack-triple/);
assert.match(read('src/main.ts'),/activeAttacks/);
assert.match(read('src/game/Player.ts'),/tripleLevel:0/);
assert.match(read('src/game/Player.ts'),/readonly stats=/);
assert.match(read('src/main.ts'),/openUpgradeChoice/);
assert.match(read('index.html'),/upgrade-screen/);
assert.match(read('src/game/Slimes.ts'),/type AttackKind/);
assert.match(read('src/game/Slimes.ts'),/applyPoison/);
assert.match(read('src/game/Slimes.ts'),/showDamage/);
assert.match(read('src/main.ts'),/attack-triple/);
assert.match(read('src/main.ts'),/activeAttacks/);
assert.match(read('src/game/Slimes.ts'),/gainExperience/);
assert.match(read('src/game/Slimes.ts'),/experienceRequired=15\*this.level/);
assert.match(read('src/main.ts'),/hero-exp-fill/);
assert.match(read('index.html'),/level-up/);
assert.match(read('src/game/Slimes.ts'),/makeArrow/);
assert.match(read('src/game/Slimes.ts'),/CONTACT_DAMAGE/);
assert.match(read('src/game/Player.ts'),/takeDamage/);
assert.match(read('src/game/Player.ts'),/health = 100/);
assert.match(read('index.html'),/hero-health-fill/);
assert.match(read('index.html'),/retry-button/);
assert.match(read('src/main.ts'),/horde.update/);
assert.match(read('.github/workflows/pages.yml'),/branches: \[dev-mode\]/);
const html=read('index.html');
const code=read('src/main.ts');
for(const match of code.matchAll(/querySelector<[^>]+>\('#([^']+)'\)/g)) {
  assert(html.includes(`id="${match[1]}"`),`Brakuje elementu HTML #${match[1]}`);
}
console.log(`OK: ${required.length} plików, interfejs, sterowanie, v${pkg.version}, GitHub Pages/dev-mode`);
