import * as THREE from 'three';
import './style.css';
import { World } from './game/World';
import { Input } from './game/Input';
import { Player } from './game/Player';
import { CameraController } from './game/CameraController';
import { SlimeHorde } from './game/Slimes';

const viewport=document.querySelector<HTMLDivElement>('#viewport')!;
const menu=document.querySelector<HTMLDivElement>('#menu')!;
const title=document.querySelector<HTMLElement>('#menu-title')!;
const desc=document.querySelector<HTMLElement>('#menu-desc')!;
const startButton=document.querySelector<HTMLButtonElement>('#start-button')!;
const startLabel=document.querySelector<HTMLElement>('#start-label')!;
const tip=document.querySelector<HTMLElement>('#menu-tip')!;
const state=document.querySelector<HTMLElement>('#movement-state')!;
const dashStatus=document.querySelector<HTMLElement>('#dash-status')!;
const velocityFill=document.querySelector<HTMLElement>('#velocity-fill')!;
const distanceText=document.querySelector<HTMLElement>('#goal-distance')!;
const goal=document.querySelector<HTMLElement>('#goal')!;
const notice=document.querySelector<HTMLElement>('#notice')!;
const reticle=document.querySelector<HTMLElement>('#reticle')!;
const slimeKills=document.querySelector<HTMLElement>('#slime-kills')!;
const slimeAlive=document.querySelector<HTMLElement>('#slime-alive')!;
const heroHealth=document.querySelector<HTMLElement>('#hero-health')!;
const heroHealthFill=document.querySelector<HTMLElement>('#hero-health-fill')!;
const damageFlash=document.querySelector<HTMLElement>('#damage-flash')!;
const gameOver=document.querySelector<HTMLElement>('#game-over')!;
const retryButton=document.querySelector<HTMLButtonElement>('#retry-button')!;

try {
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setSize(window.innerWidth,window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,1.65));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.17;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  viewport.appendChild(renderer.domElement);

  const world=new World();
  const player=new Player(world.scene);
  const horde=new SlimeHorde(world);
  const input=new Input(renderer.domElement);
  input.yaw=-.77;
  const camera=new CameraController(player,input,world);
  const clock=new THREE.Clock();
  let elapsed=0,started=false,foundGate=false,notificationUntil=0,gameOverShown=false;
  retryButton.addEventListener('click',()=>window.location.reload());

  const showMenu=(paused:boolean):void=>{
    menu.classList.remove('hidden');
    document.body.classList.remove('in-game');
    reticle.classList.remove('active');
    if(paused){
      title.innerHTML='WYPRAWA<span>WSTRZYMANA</span>';
      desc.textContent='Świat Calionu nigdzie nie ucieknie. Wróć na szlak, kiedy będziesz gotowy.';
      startLabel.textContent='WRÓĆ DO WYPRAWY';
    }else{
      title.innerHTML='CALIO<span>BONK</span>';
      desc.textContent='Na krańcu Calionu stoją zapomniane ruiny. Postaw pierwsze kroki w świecie, który dopiero budzi się do życia.';
      startLabel.textContent='ROZPOCZNIJ EKSPLORACJĘ';
    }
  };

  input.onLockChange=(active:boolean):void=>{
    if(active){
      started=true;
      horde.start(player.root.position);
      menu.classList.add('hidden');
      document.body.classList.add('in-game');
      reticle.classList.add('active');
    }else{
      showMenu(started);
    }
  };
  const start=async():Promise<void>=>{
    try{
      await input.lock();
      tip.textContent='Po rozpoczęciu kliknij Esc, aby zatrzymać grę i uwolnić kursor.';
    }catch{
      tip.textContent='Nie udało się przechwycić kursora. Kliknij ponownie lub sprawdź uprawnienia przeglądarki.';
    }
  };
  startButton.addEventListener('click',()=>{void start();});
  renderer.domElement.addEventListener('click',()=>{if(started&&!input.active) void start();});

  function updateHud():void {
    const distance=Math.hypot(player.root.position.x-world.ruin.x,player.root.position.z-world.ruin.y);
    if(!foundGate && distance<7.5){
      foundGate=true;
      goal.classList.add('completed');
      notice.innerHTML='<b>✦ ODKRYTO LOKACJĘ</b><span>Zapomniana Brama</span>';
      notificationUntil=elapsed+5;
      notice.classList.add('visible');
    }
    distanceText.textContent=foundGate?'Lokacja odkryta · dalsza eksploracja':`${Math.round(distance)} m do celu`;
    slimeKills.textContent=String(horde.kills);
    slimeAlive.textContent=String(horde.alive);
    heroHealth.textContent=`${player.health} / 100`;
    heroHealthFill.style.width=`${player.health}%`;
    if(player.health<35) heroHealthFill.classList.add('critical'); else heroHealthFill.classList.remove('critical');
    if(player.hitRecently) damageFlash.classList.add('visible'); else damageFlash.classList.remove('visible');
    if(player.defeated && !gameOverShown){gameOverShown=true;gameOver.classList.add('visible');reticle.classList.remove('active');if(document.pointerLockElement) document.exitPointerLock();}
    const motion=player.speed;
    state.textContent=player.dashing?'Doskok':motion<.3?'W spoczynku':motion>2?'W marszu':'Powolny krok';
    dashStatus.textContent=player.dashCooldown>0 ? `Doskok · ${player.dashCooldown.toFixed(1)} s` : 'Doskok · gotowy';
    velocityFill.style.width=`${Math.min(motion/4.7*100,100).toFixed(0)}%`;
    if(notificationUntil>0&&elapsed>notificationUntil){notice.classList.remove('visible');notificationUntil=0;}
  }

  function frame():void {
    requestAnimationFrame(frame);
    const dt=Math.min(clock.getDelta(),.045);
    elapsed+=dt;
    world.update(elapsed);
    if(input.active){
      if(!player.defeated){
        player.update(dt,input,world,elapsed);
        horde.update(dt,player,camera.camera);

      }
    }
    camera.update(dt);
    updateHud();
    renderer.render(world.scene,camera.camera);
  }
  frame();

  window.addEventListener('resize',()=>{
    renderer.setSize(window.innerWidth,window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.65));
    camera.resize();
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden&&document.pointerLockElement) document.exitPointerLock();
  });
}catch(error){
  console.error('CalioBonk initialization failed',error);
  title.innerHTML='NIE UDAŁO SIĘ<span>URUCHOMIĆ GRY</span>';
  desc.textContent='Przeglądarka nie uruchomiła silnika 3D. Włącz akcelerację sprzętową WebGL lub spróbuj w aktualnym Chrome lub Firefox.';
  startButton.disabled=true;
  startLabel.textContent='WEBGL NIEDOSTĘPNE';
  tip.textContent=String(error);
}
