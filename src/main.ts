import * as THREE from 'three';
import './style.css';
import { World } from './game/World';
import { Input } from './game/Input';
import { Player } from './game/Player';
import { CameraController } from './game/CameraController';
import { SlimeHorde } from './game/Slimes';
import { Multiplayer } from './network/Multiplayer';
import { SharedHorde } from './network/SharedHorde';
import {drawUpgradeCards} from './game/UpgradeDraft.mjs';
import type {DraftOffer} from './game/UpgradeDraft.mjs';

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
const rerollUpgrades=document.querySelector<HTMLButtonElement>('#reroll-upgrades')!;
const rerollsRemaining=document.querySelector<HTMLElement>('#rerolls-remaining')!;
const activeAttacks=document.querySelector<HTMLElement>('#active-attacks')!;
const performanceOverlay=document.querySelector<HTMLElement>('#performance-overlay')!;
const performanceText=document.querySelector<HTMLElement>('#performance-values')!;
const hordeButtons=[...document.querySelectorAll<HTMLButtonElement>('[data-horde-limit]')];
const multiplayerToggle=document.querySelector<HTMLButtonElement>('#multiplayer-toggle')!;
const multiplayerPanel=document.querySelector<HTMLElement>('#multiplayer-panel')!;
const multiplayerName=document.querySelector<HTMLInputElement>('#mp-name')!;
const multiplayerCode=document.querySelector<HTMLInputElement>('#mp-code')!;
const multiplayerCreate=document.querySelector<HTMLButtonElement>('#mp-create')!;
const multiplayerJoin=document.querySelector<HTMLButtonElement>('#mp-join')!;
const multiplayerStatus=document.querySelector<HTMLElement>('#mp-status')!;
const multiplayerRoom=document.querySelector<HTMLElement>('#mp-room')!;
const multiplayerPlay=document.querySelector<HTMLButtonElement>('#mp-play')!;
const multiplayerLeave=document.querySelector<HTMLButtonElement>('#mp-leave')!;
const multiplayerIndicator=document.querySelector<HTMLElement>('#mp-indicator')!;
const waveHud=document.querySelector<HTMLElement>('#wave-hud')!;
const waveBanner=document.querySelector<HTMLElement>('#wave-banner')!;
const runTimer=document.querySelector<HTMLElement>('#run-timer')!;
const runResult=document.querySelector<HTMLElement>('#run-result')!;

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
  const multiplayer=new Multiplayer(world.scene);
  const sharedHorde=new SharedHorde(world.scene);
  multiplayer.onEnemies=(enemies,kills,wave)=>sharedHorde.sync(enemies,kills,wave);
  multiplayer.onArrow=(shot,local)=>{
    sharedHorde.shoot(shot);
    if(local)player.startAttack(new THREE.Vector3(shot.tx,0,shot.tz));
  };
  multiplayer.onEnemyHit=id=>sharedHorde.showHit(id);
  multiplayer.onWave=(wave,spawned)=>{
    waveBanner.textContent='FALA '+wave+' · +'+spawned+' SLIME’ÓW';
    waveBanner.classList.add('visible');
    waveBannerUntil=elapsed+3;
  };
  multiplayer.onEnemyKilled=(exp)=>horde.grantSharedExperience(exp);
  multiplayer.onHealth=(hp)=>{player.health=hp;};
  const input=new Input(renderer.domElement);
  input.yaw=-.77;
  const camera=new CameraController(player,input,world);
  const clock=new THREE.Clock();
  let elapsed=0,started=false,foundGate=false,notificationUntil=0,gameOverShown=false,lastLevel=1,levelNoticeUntil=0,choosingUpgrade=false,waveBannerUntil=0;
  const formatRunTime=(seconds:number):string=>{
    const whole=Math.floor(seconds);
    return String(Math.floor(whole/60)).padStart(2,'0')+':'+String(whole%60).padStart(2,'0');
  };
  horde.onThreatUnlocked=tier=>{
    if(multiplayer.connected)return;
    const warning=tier===3?'SZYBKIE SLIME’Y NADCHODZĄ':
      tier===5?'PANCERNE SLIME’Y NADCHODZĄ':'TOKSYCZNE SLIME’Y NADCHODZĄ';
    waveBanner.textContent=warning;
    waveBanner.classList.add('visible');
    waveBannerUntil=elapsed+4;
  };
  const debugEnabled=new URLSearchParams(location.search).get('debug')==='1';
  performanceOverlay.hidden=!debugEnabled;
  hordeButtons.forEach(button=>button.addEventListener('click',()=>{
    if(!multiplayer.connected)horde.setTestLimit(Number(button.dataset.hordeLimit),player.root.position);
  }));
  let fpsFrames=0,fpsElapsed=0,fpsValue=0;
  retryButton.addEventListener('click',()=>window.location.reload());
type UpgradeDefinition={
  id:string;name:string;icon:string;desc:string;maxRank?:number;apply:(player:Player)=>void;
};
const upgradeDefinitions:UpgradeDefinition[]=[
  {id:'damage',name:'Wzmocnione Strzały',icon:'➶',desc:'+20% obrażeń łuku',apply:p=>{p.stats.damage+=.2;}},
  {id:'speed',name:'Szybkie Dłonie',icon:'⌁',desc:'+12% szybkości ataku',apply:p=>{p.stats.attackSpeed+=.12;}},
  {id:'step',name:'Lekki Krok',icon:'➤',desc:'+10% szybkości poruszania',apply:p=>{p.stats.moveSpeed+=.1;}},
  {id:'health',name:'Żelazna Kondycja',icon:'✚',desc:'+20 maks. HP i +20 aktualnego HP',apply:p=>{p.stats.maxHealth+=20;p.health=Math.min(p.stats.maxHealth,p.health+20);}},
  {id:'range',name:'Sokole Oko',icon:'◎',desc:'+15% zasięgu ataku',apply:p=>{p.stats.range+=.15;}},
  {id:'magnet',name:'Magnetyzm',icon:'✧',desc:'+25% promienia zbierania EXP',apply:p=>{p.stats.magnet+=.25;}},
  {id:'crit',name:'Szczęśliwy Traf',icon:'✦',desc:'+8% szansy na podwójne obrażenia',apply:p=>{p.stats.criticalChance+=.08;}},
  {id:'resolve',name:'Hart Ducha',icon:'⬟',desc:'−10% otrzymywanych obrażeń',apply:p=>{p.stats.damageReduction=Math.min(.7,p.stats.damageReduction+.1);}},
  {id:'attack-triple',name:'Potrójny Strzał',icon:'➶',desc:'Trzy strzały z osobnym odnowieniem, szybciej na wyższej randze',apply:p=>{p.stats.tripleLevel++;}},
  {id:'attack-poison',name:'Zatruta Strzała',icon:'☠',desc:'Zatrucie celu, mocniejsze na wyższej randze',apply:p=>{p.stats.poisonLevel++;}},
  {id:'attack-pierce',name:'Przebijająca Strzała',icon:'↠',desc:'Przebija przeciwników, więcej celów na wyższej randze',apply:p=>{p.stats.pierceLevel++;}},
  {id:'provision',name:'Zapas Bandaży',icon:'❖',desc:'+5 maksymalnego HP i uzdrawia 10 HP',maxRank:Infinity,
    apply:p=>{p.stats.maxHealth+=5;p.health=Math.min(p.stats.maxHealth,p.health+10);}},
];
const upgradeRanks:Record<string,number>={};
let rerollsLeft=1;
let draftOptions:DraftOffer[]=[];

function displayDraft():void{
  upgradeCards.forEach((button,index)=>{
    const offer=draftOptions[index];
    button.hidden=!offer;
    if(!offer)return;
    const card=upgradeDefinitions.find(item=>item.id===offer.id);
    if(!card)return;
    button.dataset.upgrade=offer.id;
    button.dataset.rarity=offer.rarity;
    button.querySelector<HTMLElement>('.card-rarity')!.textContent=offer.rarityName;
    button.querySelector<HTMLElement>('.card-icon')!.textContent=card.icon;
    button.querySelector<HTMLElement>('.card-name')!.textContent=card.name;
    button.querySelector<HTMLElement>('.card-description')!.textContent=
      card.desc+(offer.gains>1?' · efekt ×'+offer.gains:'');
    button.querySelector<HTMLElement>('.card-rank')!.textContent=
      'RANGA '+offer.from+' → '+offer.to;
  });
  rerollsRemaining.textContent=String(rerollsLeft);
  rerollUpgrades.disabled=rerollsLeft<=0;
}
function openUpgradeChoice():void{
  if(!horde.consumeLevelUp())return;
  choosingUpgrade=true;
  draftOptions=drawUpgradeCards(upgradeDefinitions,upgradeRanks,horde.level);
  displayDraft();
  upgradeScreen.classList.add('visible');
  if(document.pointerLockElement)document.exitPointerLock();
}
rerollUpgrades.addEventListener('click',()=>{
  if(!choosingUpgrade||rerollsLeft<=0)return;
  const previous=draftOptions.map(offer=>offer.id);
  draftOptions=drawUpgradeCards(upgradeDefinitions,upgradeRanks,horde.level,previous);
  rerollsLeft--;
  displayDraft();
});
upgradeCards.forEach(button=>button.addEventListener('click',()=>{
  if(!choosingUpgrade)return;
  const offer=draftOptions.find(item=>item.id===button.dataset.upgrade);
  if(!offer)return;
  const card=upgradeDefinitions.find(item=>item.id===offer.id);
  if(!card)return;
  for(let i=0;i<offer.gains;i++)card.apply(player);
  upgradeRanks[offer.id]=offer.to;
  document.querySelector<HTMLElement>('#build-summary')!.textContent=
    Object.entries(upgradeRanks).filter(([,rank])=>rank>0)
      .map(([id,rank])=>upgradeDefinitions.find(item=>item.id===id)!.name+' '+rank).join(' · ')||'Brak';
  if(horde.pendingLevelUps>0){openUpgradeChoice();return;}
  choosingUpgrade=false;
  upgradeScreen.classList.remove('visible');
  void input.lock();
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
      if(!multiplayer.connected)horde.start(player.root.position);
      multiplayer.setReady(true);
      menu.classList.add('hidden');
      document.body.classList.add('in-game');
      reticle.classList.add('active');
    }else{
      // Online rooms keep simulating when a browser tab loses focus. Escape is a local menu, not a global pause.
      if(!choosingUpgrade && !gameOverShown) showMenu(started);
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
  multiplayer.onStatus=message=>{
    multiplayerStatus.textContent=message;
    multiplayerRoom.textContent=multiplayer.connected?'POKÓJ: '+multiplayer.roomCode:'';
    multiplayerPlay.disabled=!multiplayer.connected;
    multiplayerLeave.hidden=!multiplayer.connected;
    multiplayerIndicator.hidden=!multiplayer.connected;
    waveHud.hidden=!multiplayer.connected;
    if(!multiplayer.connected)waveBanner.classList.remove('visible');
    if(!multiplayer.connected && !started)startLabel.textContent='ROZPOCZNIJ EKSPLORACJĘ';
  };
  multiplayer.onPresence=count=>{multiplayerIndicator.textContent='POKÓJ '+multiplayer.roomCode+' · '+count+'/4';};
  multiplayerToggle.addEventListener('click',()=>{multiplayerPanel.hidden=!multiplayerPanel.hidden;});
  const connectRoom=async(action:'create'|'join'):Promise<void>=>{
    multiplayerStatus.textContent='Łączenie z lokalnym serwerem...';
    multiplayerCreate.disabled=true;multiplayerJoin.disabled=true;
    try{
      await multiplayer.connect(action,multiplayerName.value,multiplayerCode.value);
      multiplayerCode.value=multiplayer.roomCode;
      multiplayerStatus.textContent='Połączono! Podaj kod pokoju drugiemu graczowi.';
      multiplayerRoom.textContent='POKÓJ: '+multiplayer.roomCode;
      multiplayerPlay.disabled=false;multiplayerLeave.hidden=false;
      multiplayerIndicator.hidden=false;
      startLabel.textContent='WEJDŹ DO WSPÓLNEJ WYPRAWY';
    }catch(error){multiplayerStatus.textContent=error instanceof Error?error.message:String(error);}
    finally{multiplayerCreate.disabled=false;multiplayerJoin.disabled=false;}
  };
  multiplayerCreate.addEventListener('click',()=>{void connectRoom('create');});
  multiplayerJoin.addEventListener('click',()=>{void connectRoom('join');});
  multiplayerPlay.addEventListener('click',()=>{if(multiplayer.connected)void start();});
  multiplayerLeave.addEventListener('click',()=>{multiplayer.leave();startLabel.textContent='ROZPOCZNIJ EKSPLORACJĘ';});
  window.addEventListener('pagehide',()=>multiplayer.leave());
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
    slimeKills.textContent=String(multiplayer.connected?sharedHorde.kills:horde.kills);
    slimeAlive.textContent=String(multiplayer.connected?sharedHorde.alive:horde.alive);
    if(multiplayer.connected){
      waveHud.hidden=false;
      waveHud.textContent=sharedHorde.wave?'FALA '+sharedHorde.wave+' · '+sharedHorde.alive+' WROGÓW':'FALA: OCZEKIWANIE';
    }else{
      waveHud.hidden=!started;
      if(started)waveHud.textContent='KOLEJNA SERIA ZA '+horde.nextBatchIn+' s';
    }
    runTimer.hidden=multiplayer.connected||!started;
    if(!runTimer.hidden)runTimer.textContent='CZAS '+formatRunTime(horde.runTime);
    if(waveBannerUntil>0&&elapsed>waveBannerUntil){waveBanner.classList.remove('visible');waveBannerUntil=0;}
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
    if(player.defeated && !gameOverShown){
      gameOverShown=true;
      if(multiplayer.connected)runResult.hidden=true;
      else {
        runResult.hidden=false;
        runResult.textContent='Czas: '+formatRunTime(horde.runTime)+' · Pokonane Slime’y: '+horde.kills+' · Poziom: '+horde.level;
      }
      gameOver.classList.add('visible');
      reticle.classList.remove('active');
      if(document.pointerLockElement)document.exitPointerLock();
    }
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
    if(debugEnabled) performanceText.textContent='FPS '+fpsValue+' · WROGOWIE '+(multiplayer.connected?sharedHorde.alive:horde.alive)+' · POCISKI '+(multiplayer.connected?sharedHorde.projectileCount:horde.projectileCount)+' · EFEKTY '+horde.effectCount+' · EXP '+horde.crystalCount+' · MOB '+horde.renderMode+' · DRAW '+renderer.info.render.calls;
    world.update(elapsed);
    if(input.active){
      if(!player.defeated && !choosingUpgrade){
        player.update(dt,input,world,elapsed);
        if(!multiplayer.connected)horde.update(dt,player,camera.camera);
        if(horde.pendingLevelUps>0) openUpgradeChoice();
      }
    }
    multiplayer.update(dt,player.root.position,input.active&&!player.defeated&&!choosingUpgrade);
    sharedHorde.update(dt);
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
