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
const levelText=document.querySelector<HTMLElement>('#hero-level')!;
const expText=document.querySelector<HTMLElement>('#hero-exp')!;
const expFill=document.querySelector<HTMLElement>('#hero-exp-fill')!;
const levelUp=document.querySelector<HTMLElement>('#level-up')!;
const heroHealth=document.querySelector<HTMLElement>('#hero-health')!;
const heroHealthFill=document.querySelector<HTMLElement>('#hero-health-fill')!;
const damageFlash=document.querySelector<HTMLElement>('#damage-flash')!;
const gameOver=document.querySelector<HTMLElement>('#game-over')!;
const retryButton=document.querySelector<HTMLButtonElement>('#retry-button')!;
const upgradeScreen=document.querySelector<HTMLElement>('#upgrade-screen')!;
const upgradeCards=[...document.querySelectorAll<HTMLButtonElement>('.upgrade-card')];
const activeAttacks=document.querySelector<HTMLElement>('#active-attacks')!;
const performanceOverlay=document.querySelector<HTMLElement>('#performance-overlay')!;
const performanceText=document.querySelector<HTMLElement>('#performance-values')!;

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
  let elapsed=0,started=false,foundGate=false,notificationUntil=0,gameOverShown=false,lastLevel=1,levelNoticeUntil=0,choosingUpgrade=false;
  const debugEnabled=new URLSearchParams(location.search).get('debug')==='1';
  performanceOverlay.hidden=!debugEnabled;
  let fpsFrames=0,fpsElapsed=0,fpsValue=0;
  retryButton.addEventListener('click',()=>window.location.reload());
const upgradeDefinitions:Array<{id:string,name:string,icon:string,desc:string,apply:(player:Player)=>void}>=[
  {id:'damage',name:'Wzmocnione Strzały',icon:'➶',desc:'+20% obrażeń łuku',apply:p=>{p.stats.damage+=.2;}},
  {id:'speed',name:'Szybkie Dłonie',icon:'⌁',desc:'+12% szybkości ataku',apply:p=>{p.stats.attackSpeed+=.12;}},
  {id:'step',name:'Lekki Krok',icon:'➤',desc:'+10% szybkości poruszania',apply:p=>{p.stats.moveSpeed+=.1;}},
  {id:'health',name:'Żelazna Kondycja',icon:'✚',desc:'+20 maks. HP i +20 aktualnego HP',apply:p=>{p.stats.maxHealth+=20;p.health=Math.min(p.stats.maxHealth,p.health+20);}},
  {id:'range',name:'Sokole Oko',icon:'◎',desc:'+15% zasięgu ataku',apply:p=>{p.stats.range+=.15;}},
  {id:'magnet',name:'Magnetyzm',icon:'✧',desc:'+25% promienia zbierania EXP',apply:p=>{p.stats.magnet+=.25;}},
  {id:'crit',name:'Szczęśliwy Traf',icon:'✦',desc:'+8% szansy na podwójne obrażenia',apply:p=>{p.stats.criticalChance+=.08;}},
  {id:'resolve',name:'Hart Ducha',icon:'⬟',desc:'−10% otrzymywanych obrażeń',apply:p=>{p.stats.damageReduction=Math.min(.7,p.stats.damageReduction+.1);}},
  {id:'attack-triple',name:'Potrójny Strzał',icon:'➶',desc:'Odblokuj trzy równoległe strzały z osobnym odnowieniem',apply:p=>{p.stats.tripleLevel++;}},
  {id:'attack-poison',name:'Zatruta Strzała',icon:'☠',desc:'Strzała zatruwa cel przez kilka sekund',apply:p=>{p.stats.poisonLevel++;}},
  {id:'attack-pierce',name:'Przebijająca Strzała',icon:'↠',desc:'Strzała przebija kolejnych przeciwników',apply:p=>{p.stats.pierceLevel++;}}
];
const upgradeRanks:Record<string,number>={};
function openUpgradeChoice():void{
  if(!horde.consumeLevelUp())return;
  choosingUpgrade=true;
  const available=upgradeDefinitions.filter(card=>(upgradeRanks[card.id]??0)<5 && (!card.id.startsWith('attack-') || (upgradeRanks[card.id]??0)>0 || player.stats.tripleLevel+player.stats.poisonLevel+player.stats.pierceLevel<2)).sort(()=>Math.random()-.5).slice(0,3);
  upgradeCards.forEach((button,index)=>{
    const card=available[index];
    button.hidden=!card;
    if(!card)return;
    button.dataset.upgrade=card.id;
    button.querySelector<HTMLElement>('.card-icon')!.textContent=card.icon;
    button.querySelector<HTMLElement>('.card-name')!.textContent=card.name;
    button.querySelector<HTMLElement>('.card-description')!.textContent=card.desc;
    button.querySelector<HTMLElement>('.card-rank')!.textContent='POZIOM '+(upgradeRanks[card.id]??0)+' → '+((upgradeRanks[card.id]??0)+1);
  });
  upgradeScreen.classList.add('visible');
  if(document.pointerLockElement)document.exitPointerLock();
}
upgradeCards.forEach(button=>button.addEventListener('click',()=>{
  const card=upgradeDefinitions.find(item=>item.id===button.dataset.upgrade);
  if(!card)return;
  card.apply(player);
  upgradeRanks[card.id]=(upgradeRanks[card.id]??0)+1;
  document.querySelector<HTMLElement>('#build-summary')!.textContent=Object.entries(upgradeRanks).filter(([,rank])=>rank>0).map(([id,rank])=>upgradeDefinitions.find(item=>item.id===id)!.name+' '+rank).join(' · ')||'Brak';
  if(horde.pendingLevelUps>0){openUpgradeChoice();return;}
  choosingUpgrade=false;upgradeScreen.classList.remove('visible');void input.lock();
}));


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
      if(!choosingUpgrade) showMenu(started);
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
    levelText.textContent=`POZIOM ${horde.level}`;
    const attackNames=['🏹 Łuk',...(player.stats.tripleLevel?['➶ Potrójny']:[]),...(player.stats.poisonLevel?['☠ Trucizna']:[]),...(player.stats.pierceLevel?['↠ Przebicie']:[])];
    activeAttacks.textContent=attackNames.join('  ·  ');
    expText.textContent=`${horde.experienceProgress} / ${horde.experienceRequired} EXP`;
    expFill.style.width=`${(horde.experienceProgress/horde.experienceRequired*100).toFixed(0)}%`;
    if(horde.level>lastLevel){lastLevel=horde.level;levelNoticeUntil=elapsed+2;levelUp.classList.add('visible');}
    if(levelNoticeUntil>0&&elapsed>levelNoticeUntil){levelUp.classList.remove('visible');levelNoticeUntil=0;}
    heroHealth.textContent=`${player.health} / ${player.stats.maxHealth}`;
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
    const rawDt=clock.getDelta();
    const dt=Math.min(rawDt,.045);
    elapsed+=dt;
    fpsFrames++;fpsElapsed+=rawDt;
    if(fpsElapsed>=.5){fpsValue=Math.round(fpsFrames/fpsElapsed);fpsFrames=0;fpsElapsed=0;}
    if(debugEnabled) performanceText.textContent='FPS '+fpsValue+' · WROGOWIE '+horde.alive+' · POCISKI '+horde.projectileCount+' · EFEKTY '+horde.effectCount+' · EXP '+horde.crystalCount+' · DRAW '+renderer.info.render.calls;
    world.update(elapsed);
    if(input.active){
      if(!player.defeated && !choosingUpgrade){
        player.update(dt,input,world,elapsed);
        horde.update(dt,player,camera.camera);
        if(horde.pendingLevelUps>0) openUpgradeChoice();
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
