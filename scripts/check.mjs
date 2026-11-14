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
assert.equal(pkg.version,'0.0.6','Nieprawidłowa wersja gry');
assert.match(read('src/game/Input.ts'),/requestPointerLock/);
assert.match(read('src/game/Player.ts'),/ShiftLeft/);
assert.match(read('src/game/Player.ts'),/dashCooldown/);
assert.match(read('src/game/Input.ts'),/consumePress/);
assert.match(read('src/game/CameraController.ts'),/this.camera.position.copy\(this.desired\)/);
assert.match(read('src/game/Player.ts'),/Space/);
assert.match(read('src/game/Player.ts'),/startAttack/);
assert.match(read('src/game/Slimes.ts'),/class Slime/);
assert.match(read('src/game/Slimes.ts'),/takeHit/);
assert.match(read('src/game/Slimes.ts'),/ATTACK_DAMAGE/);
assert.match(read('src/main.ts'),/horde.update/);
assert.match(read('.github/workflows/pages.yml'),/branches: \[dev-mode\]/);
const html=read('index.html');
const code=read('src/main.ts');
for(const match of code.matchAll(/querySelector<[^>]+>\('#([^']+)'\)/g)) {
  assert(html.includes(`id="${match[1]}"`),`Brakuje elementu HTML #${match[1]}`);
}
console.log(`OK: ${required.length} plików, interfejs, sterowanie, v${pkg.version}, GitHub Pages/dev-mode`);
